import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PredictionForm from "./PredictionForm";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    createPrediction: vi.fn(),
  },
}));

const existingPatient = {
  id: 17,
  name: "Synthetic Demo",
  age: 45,
  gender: "Female",
  bloodPressure: 124,
  glucose: 108,
  bmi: 25.6,
  heartRate: 74,
  cholesterol: 188,
};

describe("PredictionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects a backend patient, retains their ID, and submits the seven numeric model fields", async () => {
    api.createPrediction.mockResolvedValue({
      id: 51,
      predictionResult: "1",
      riskLevel: "High Risk",
      probability: 0.82,
      patient: existingPatient,
    });
    const onPredictionComplete = vi.fn();
    render(
      <PredictionForm
        patients={[existingPatient]}
        loading={false}
        onPredictionComplete={onPredictionComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Use a backend patient record (optional)"), {
      target: { value: "17" },
    });
    fireEvent.change(screen.getByLabelText("Patient Name"), {
      target: { value: "Synthetic Demo Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyze Health Risk/i }));

    await waitFor(() => expect(api.createPrediction).toHaveBeenCalledOnce());
    const request = api.createPrediction.mock.calls[0][0];
    expect(request.patientId).toBe(17);
    expect(request.patient).toMatchObject({
      id: 17,
      age: 45,
      gender: "Female",
      bloodPressure: 124,
      glucose: 108,
      bmi: 25.6,
      heartRate: 74,
      cholesterol: 188,
      name: "Synthetic Demo Updated",
    });
    expect(onPredictionComplete).toHaveBeenCalledWith(expect.objectContaining({
      riskLevel: "High Risk",
      probability: 0.82,
    }));
  });

  it("surfaces a prediction service failure and resets the loading callback", async () => {
    api.createPrediction.mockRejectedValue(new Error("ML service unavailable"));
    const onPredictionError = vi.fn();
    render(
      <PredictionForm
        patients={[existingPatient]}
        loading={false}
        onPredictionError={onPredictionError}
      />,
    );
    fireEvent.change(screen.getByLabelText("Use a backend patient record (optional)"), {
      target: { value: "17" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyze Health Risk/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("ML service unavailable");
    expect(onPredictionError).toHaveBeenCalledOnce();
  });
});
