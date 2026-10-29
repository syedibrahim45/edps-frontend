import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, probabilityPercent } from "./api";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
  };
}

function diabetesResponse() {
  return {
    predicted_class: 1,
    predicted_label: "Prediabetes or diabetes reported in dataset label",
    positive_class_score: 0.72,
    threshold: 0.6447012298480324,
    model_id: "logistic_regression_balanced",
    model_version: "cdc-brfss2015-binary-v1",
    disclaimer: "Experimental screening output; not a clinical diagnosis.",
  };
}

function diabetesFeatures() {
  return {
    HighBP: 1, HighChol: 0, CholCheck: 1, Smoker: 0, Stroke: 0,
    HeartDiseaseorAttack: 0, PhysActivity: 1, Fruits: 1, Veggies: 1,
    HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, DiffWalk: 0,
    Sex: 0, BMI: 0.5, GenHlth: 3, MentHlth: 0, PhysHlth: 7,
    Age: 1, Education: 1, Income: 1,
  };
}

describe("EDPS API client", () => {
  beforeEach(() => {
    api.clearCredentials();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses the configured backend routes and preserves request DTO fields", async () => {
    fetch
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 12 }))
      .mockResolvedValueOnce(response({ id: 12 }))
      .mockResolvedValueOnce(response("deleted"))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 8 }))
      .mockResolvedValueOnce(response({ valid: true, checkedRecords: 2, verifiedAt: "now" }))
      .mockResolvedValueOnce(response([{ id: 1, reference: "PATIENT:1", timestamp: "now" }]))
      .mockResolvedValueOnce(response({ status: "UP", service: "EDPS ML Service", model_status: "ready" }))
      .mockResolvedValueOnce(response({
        scope: "global",
        method: "permutation_importance",
        sample_count: 20,
        feature_importance: [{ feature: "glucose", mean_importance: 0.1, std_importance: 0.02 }],
      }))
      .mockResolvedValueOnce(response({
        scope: "individual",
        reference_population: "synthetic median/mode",
        prediction: { prediction: 1, disease: "High Risk", probability: 0.82 },
        feature_effects: [{
          feature: "glucose",
          input_value: 140,
          reference_value: 100,
          probability_with_input: 0.82,
          probability_with_reference: 0.5,
          probability_delta: 0.32,
        }],
      }))
      .mockResolvedValueOnce(response({
        status: "completed",
        method: "FedAvg",
        simulation_data: "synthetic",
        client_count: 3,
        rounds: 1,
        per_round_metrics: [{ round: 1, accuracy: 0.5 }],
        final_evaluation_metrics: { accuracy: 0.5 },
      }));

    await api.getPatients();
    await api.createPatient({ name: "Synthetic Demo", age: 40 });
    await api.updatePatient(12, { name: "Synthetic Demo Updated" });
    await api.deletePatient(12);
    await api.getPredictions();
    await api.createPrediction({ patientId: 12, patient: { id: 12, gender: "Female" } });
    await api.verifyIntegrity();
    await api.getAuditRecords();
    await api.getMlHealth();
    await api.getGlobalExplainability();
    await api.getIndividualExplainability({ age: 40, gender: 1, blood_pressure: 120, glucose: 100, bmi: 24, heart_rate: 72, cholesterol: 180 });
    await api.getFederatedResults();

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method || "GET"])).toEqual([
      ["http://localhost:8080/patients", "GET"],
      ["http://localhost:8080/patients", "POST"],
      ["http://localhost:8080/patients/12", "PUT"],
      ["http://localhost:8080/patients/12", "DELETE"],
      ["http://localhost:8080/predictions", "GET"],
      ["http://localhost:8080/predictions", "POST"],
      ["http://localhost:8080/integrity/audit/verify", "GET"],
      ["http://localhost:8080/integrity/audit/records", "GET"],
      ["http://localhost:8080/api/ml/health", "GET"],
      ["http://localhost:8080/api/ml/explainability/global", "GET"],
      ["http://localhost:8080/api/ml/explainability/individual", "POST"],
      ["http://localhost:8080/api/ml/federated/results", "GET"],
    ]);
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual({
      patientId: 12,
      patient: { id: 12, gender: "Female" },
    });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("surfaces backend validation details and HTTP status", async () => {
    fetch.mockResolvedValue(response({
      message: "Patient details are invalid.",
      fieldErrors: { "patient.age": "must be greater than or equal to 1" },
    }, 400));

    await expect(api.createPatient({ age: 0 })).rejects.toThrow(
      "EDPS API request failed (400): Patient details are invalid. patient.age: must be greater than or equal to 1",
    );
  });

  it("posts diabetes survey features only to the Spring Boot route", async () => {
    const features = diabetesFeatures();
    fetch.mockResolvedValue(response(diabetesResponse()));

    await expect(api.createDiabetesScreening(features)).resolves.toEqual(diabetesResponse());

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/diabetes-screenings");
    expect(fetch.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(features);
    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body))).toHaveLength(21);
    expect(fetch.mock.calls[0][0]).not.toContain(":8000");
  });

  it("validates the diabetes response class semantics and score ranges", async () => {
    fetch.mockResolvedValue(response({
      ...diabetesResponse(),
      predicted_label: "Confirmed diabetes",
    }));

    await expect(api.createDiabetesScreening(diabetesFeatures())).rejects.toThrow(
      "The diabetes screening endpoint returned an unexpected response.",
    );
  });

  it("rejects malformed or out-of-range survey payloads before sending", async () => {
    const incomplete = diabetesFeatures();
    delete incomplete.Income;
    await expect(api.createDiabetesScreening(incomplete)).rejects.toThrow("exactly the 21 survey features");

    const invalidCategory = { ...diabetesFeatures(), Age: 1.5 };
    await expect(api.createDiabetesScreening(invalidCategory)).rejects.toThrow("accepted integer survey codes");

    const invalidBmi = { ...diabetesFeatures(), BMI: Infinity };
    await expect(api.createDiabetesScreening(invalidBmi)).rejects.toThrow("finite JSON number");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the existing Basic authentication and CSRF flow for diabetes POST", async () => {
    fetch
      .mockResolvedValueOnce(response({ token: "diabetes-csrf-token", headerName: "X-XSRF-TOKEN" }))
      .mockResolvedValueOnce(response(diabetesResponse()));
    api.setCredentials("demo-admin", "temporary-secret");

    await api.createDiabetesScreening(diabetesFeatures());

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8080/csrf",
      "http://localhost:8080/diabetes-screenings",
    ]);
    expect(fetch.mock.calls[1][1].headers.Authorization).toMatch(/^Basic /);
    expect(fetch.mock.calls[1][1].headers["X-XSRF-TOKEN"]).toBe("diabetes-csrf-token");
    expect(fetch.mock.calls[1][1].credentials).toBe("include");
  });

  it("surfaces network downtime instead of converting it to success", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.getPatients()).rejects.toThrow("Cannot reach the configured service");
  });

  it("rejects an unexpected ML health proxy response", async () => {
    fetch.mockResolvedValue(response({ status: "UP" }));

    await expect(api.getMlHealth()).rejects.toThrow(
      "The backend ML health proxy returned an unexpected response.",
    );
  });

  it("times out a stalled request", async () => {
    vi.useFakeTimers();
    fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }));

    const pending = api.getPatients();
    const assertion = expect(pending).rejects.toThrow("timed out after 12 seconds");
    await vi.advanceTimersByTimeAsync(12000);
    await assertion;
    vi.useRealTimers();
  });

  it("validates optional audit, explainability, and simulation response schemas", async () => {
    fetch
      .mockResolvedValueOnce(response({ valid: "yes" }))
      .mockResolvedValueOnce(response({ scope: "patient", feature_importance: [], sample_count: 20 }))
      .mockResolvedValueOnce(response({ status: "completed", method: "FedAvg", simulation_data: "synthetic", client_count: 0, rounds: 10, per_round_metrics: [], final_evaluation_metrics: { accuracy: 1 } }));

    await expect(api.verifyIntegrity()).rejects.toThrow("unexpected response");
    await expect(api.getGlobalExplainability()).rejects.toThrow("unexpected global explainability response");
    await expect(api.getFederatedResults()).rejects.toThrow("unexpected simulation response");
  });

  it("keeps Basic credentials in memory and obtains a CSRF token for protected writes", async () => {
    fetch
      .mockResolvedValueOnce(response({ token: "csrf-token", headerName: "X-XSRF-TOKEN" }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 9 }));

    await api.authenticate("demo-admin", "temporary-secret");
    await api.createPatient({ name: "Synthetic Sample" });

    expect(api.hasCredentials()).toBe(true);
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(fetch.mock.calls[1][1].headers.Authorization).toMatch(/^Basic /);
    expect(fetch.mock.calls[2][1].headers["X-XSRF-TOKEN"]).toBe("csrf-token");
    api.clearCredentials();
    expect(api.hasCredentials()).toBe(false);
  });

  it("reports rejected authentication without treating it as a successful response", async () => {
    fetch.mockResolvedValue(response({ status: 401, error: "Unauthorized" }, 401));
    await expect(api.getPatients()).rejects.toThrow("Authentication required");
  });

  it("normalizes finite model probabilities", () => {
    expect(probabilityPercent(0.82)).toBe(82);
    expect(probabilityPercent(82)).toBe(82);
    expect(probabilityPercent(-0.1)).toBe(0);
    expect(probabilityPercent(120)).toBe(100);
    expect(probabilityPercent("not-a-number")).toBeNull();
    expect(probabilityPercent(null)).toBeNull();
  });
});
