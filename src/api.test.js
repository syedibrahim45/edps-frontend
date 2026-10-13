import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, probabilityPercent } from "./api";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
  };
}

describe("EDPS API client", () => {
  beforeEach(() => {
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
      .mockResolvedValueOnce(response({ valid: true, checkedRecords: 2, verifiedAt: "now" }));

    await api.getPatients();
    await api.createPatient({ name: "Synthetic Demo", age: 40 });
    await api.updatePatient(12, { name: "Synthetic Demo Updated" });
    await api.deletePatient(12);
    await api.getPredictions();
    await api.createPrediction({ patientId: 12, patient: { id: 12, gender: "Female" } });
    await api.verifyIntegrity();

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method || "GET"])).toEqual([
      ["http://localhost:8080/patients", "GET"],
      ["http://localhost:8080/patients", "POST"],
      ["http://localhost:8080/patients/12", "PUT"],
      ["http://localhost:8080/patients/12", "DELETE"],
      ["http://localhost:8080/predictions", "GET"],
      ["http://localhost:8080/predictions", "POST"],
      ["http://localhost:8080/integrity/audit/verify", "GET"],
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

  it("surfaces network downtime instead of converting it to success", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.getPatients()).rejects.toThrow("Cannot reach the configured service");
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
      .mockResolvedValueOnce(response({ client_count: 0, rounds: 10, accuracy: 1 }));

    await expect(api.verifyIntegrity()).rejects.toThrow("unexpected response");
    await expect(api.getGlobalExplainability()).rejects.toThrow("unexpected global explainability response");
    await expect(api.getFederatedResults()).rejects.toThrow("not configured");
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
