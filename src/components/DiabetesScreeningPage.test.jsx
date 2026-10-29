import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiabetesScreeningPage from "./DiabetesScreeningPage";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    createDiabetesScreening: vi.fn(),
  },
}));

const expectedRequest = {
  HighBP: 1,
  HighChol: 0,
  CholCheck: 1,
  Smoker: 0,
  Stroke: 0,
  HeartDiseaseorAttack: 0,
  PhysActivity: 1,
  Fruits: 1,
  Veggies: 1,
  HvyAlcoholConsump: 0,
  AnyHealthcare: 1,
  NoDocbcCost: 0,
  DiffWalk: 0,
  Sex: 0,
  BMI: 0.5,
  GenHlth: 3,
  MentHlth: 0,
  PhysHlth: 7,
  Age: 1,
  Education: 1,
  Income: 1,
};

const response = {
  predicted_class: 1,
  predicted_label: "Prediabetes or diabetes reported in dataset label",
  positive_class_score: 0.72,
  threshold: 0.6447012298480324,
  model_id: "logistic_regression_balanced",
  model_version: "cdc-brfss2015-binary-v1",
  disclaimer: "Experimental screening output for a survey dataset label only; not a clinical diagnosis.",
};

function completeSurvey() {
  for (const [name, value] of Object.entries(expectedRequest)) {
    const element = name === "BMI"
      ? screen.getByLabelText(/^BMI/)
      : screen.getByLabelText(new RegExp(`^${name === "Sex" ? "Dataset-coded sex" : nameToLabel(name)}`));
    fireEvent.change(element, { target: { value: String(value) } });
  }
}

function nameToLabel(name) {
  return ({
    HighBP: "High blood pressure",
    HighChol: "High cholesterol",
    CholCheck: "Cholesterol check",
    Smoker: "Smoking history",
    Stroke: "Stroke history",
    HeartDiseaseorAttack: "Heart disease or heart attack",
    PhysActivity: "Physical activity",
    Fruits: "Daily fruit consumption",
    Veggies: "Daily vegetable consumption",
    HvyAlcoholConsump: "Heavy alcohol consumption",
    AnyHealthcare: "Health-care coverage",
    NoDocbcCost: "Could not see a doctor due to cost",
    DiffWalk: "Difficulty walking",
    GenHlth: "General health",
    MentHlth: "Days of poor mental health",
    PhysHlth: "Days of poor physical health",
    Age: "Age category code",
    Education: "Education category code",
    Income: "Income category code",
  })[name];
}

describe("DiabetesScreeningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createDiabetesScreening.mockReset();
  });

  it("renders exactly the 21 survey fields with blank initial answers", () => {
    render(<DiabetesScreeningPage />);

    expect(document.querySelectorAll(".diabetes-screening-form select")).toHaveLength(20);
    expect(document.querySelectorAll(".diabetes-screening-form input")).toHaveLength(1);
    expect(document.getElementById("diabetes-Age").tagName).toBe("SELECT");
    expect(screen.getByText(/survey's category code, not an exact age/i)).not.toBeNull();
    expect(document.getElementById("diabetes-Sex").options[1].textContent).toBe("0 — Female");
    expect(document.getElementById("diabetes-Sex").options[2].textContent).toBe("1 — Male");
    expect(screen.getByText(/survey responses, not laboratory measurements or a clinical diagnosis/i)).not.toBeNull();
  });

  it("requires all fields and sends exactly the validated numeric survey payload", async () => {
    api.createDiabetesScreening.mockResolvedValue(response);
    render(<DiabetesScreeningPage />);

    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(screen.getByRole("alert").textContent).toContain("Complete each field");
    expect(api.createDiabetesScreening).not.toHaveBeenCalled();

    completeSurvey();
    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));

    await waitFor(() => expect(api.createDiabetesScreening).toHaveBeenCalledOnce());
    const payload = api.createDiabetesScreening.mock.calls[0][0];
    expect(payload).toEqual(expectedRequest);
    expect(Object.keys(payload)).toHaveLength(21);
    expect(Object.values(payload).every((value) => typeof value === "number")).toBe(true);
    expect(payload.BMI).toBe(0.5);
    expect(await screen.findByText(response.predicted_label)).not.toBeNull();
    expect(screen.getByText("Positive-class model score")).not.toBeNull();
    expect(screen.getByText("0.7200")).not.toBeNull();
    expect(screen.getByText("0.6447")).not.toBeNull();
    expect(screen.getByText(response.model_id)).not.toBeNull();
    expect(screen.getByText(response.model_version, { exact: false })).not.toBeNull();
    expect(screen.getByText(response.disclaimer)).not.toBeNull();
    expect(screen.getByText(/not saved to patient records, prediction history, MySQL, or integrity audit logs/i)).not.toBeNull();
  });

  it("rejects fractional and unsupported categories and non-finite BMI before the API call", () => {
    render(<DiabetesScreeningPage />);
    completeSurvey();

    fireEvent.change(document.getElementById("diabetes-Age"), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(screen.getByText(/choose an integer category from 1 to 13/i)).not.toBeNull();

    fireEvent.change(document.getElementById("diabetes-Age"), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(screen.getByText(/choose an integer category from 1 to 13/i)).not.toBeNull();

    fireEvent.change(document.getElementById("diabetes-BMI"), { target: { value: "Infinity" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(screen.getByText(/enter a finite numeric BMI value/i)).not.toBeNull();
    expect(api.createDiabetesScreening).not.toHaveBeenCalled();
  });

  it("shows loading state, prevents duplicate submission, and preserves input on failure", async () => {
    let resolveRequest;
    api.createDiabetesScreening.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    render(<DiabetesScreeningPage />);
    completeSurvey();

    const submit = screen.getByRole("button", { name: "Submit diabetes screening" });
    fireEvent.click(submit);
    expect(screen.getByRole("status").textContent).toContain("Sending survey responses");
    expect(screen.getByRole("button", { name: "Submitting screening…" }).disabled).toBe(true);
    fireEvent.submit(document.querySelector(".diabetes-screening-form"));
    expect(api.createDiabetesScreening).toHaveBeenCalledOnce();

    const requestError = new Error("EDPS API request failed (503): service unavailable");
    requestError.status = 503;
    api.createDiabetesScreening.mockRejectedValueOnce(requestError);
    resolveRequest(response);
    await waitFor(() => expect(screen.getByText(response.predicted_label)).not.toBeNull());

    fireEvent.change(document.getElementById("diabetes-PhysHlth"), { target: { value: "8" } });
    api.createDiabetesScreening.mockRejectedValueOnce(requestError);
    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(await screen.findByText("The screening service is unavailable.")).not.toBeNull();
    expect(document.getElementById("diabetes-PhysHlth").value).toBe("8");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api.createDiabetesScreening).toHaveBeenCalledTimes(3));
  });

  it.each([
    [400, "The screening request needs correction."],
    [502, "The screening service returned an invalid response."],
    [503, "The screening service is unavailable."],
  ])("presents the appropriate HTTP %i error", async (status, title) => {
    const error = new Error(`EDPS API request failed (${status}): request failed`);
    error.status = status;
    api.createDiabetesScreening.mockRejectedValue(error);
    render(<DiabetesScreeningPage />);
    completeSurvey();

    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(await screen.findByText(title)).not.toBeNull();
    expect(screen.queryByText(response.predicted_label)).toBeNull();
  });

  it.each([
    ["EDPS API request timed out after 12 seconds: /diabetes-screenings", "The screening request timed out."],
    ["Cannot reach the configured service at http://localhost:8080.", "The backend could not be reached."],
  ])("presents retry for timeout/network failure", async (message, title) => {
    api.createDiabetesScreening.mockRejectedValue(new Error(message));
    render(<DiabetesScreeningPage />);
    completeSurvey();

    fireEvent.click(screen.getByRole("button", { name: "Submit diabetes screening" }));
    expect(await screen.findByText(title)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull();
  });
});
