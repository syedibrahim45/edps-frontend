import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BlockchainPage,
  ExplainabilityPage,
  FederatedLearningPage,
  HistoryPage,
  PatientsPage,
  ServiceHealthPage,
} from "./WorkspacePages";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    getAuditRecords: vi.fn(),
    getBackendHealth: vi.fn(),
    getFederatedResults: vi.fn(),
    getGlobalExplainability: vi.fn(),
    getIndividualExplainability: vi.fn(),
    hasCredentials: vi.fn(() => false),
    authenticate: vi.fn(),
    verifyIntegrity: vi.fn(),
  },
  probabilityPercent: (value) => value == null ? null : Math.round(Number(value) <= 1 ? Number(value) * 100 : Number(value)),
}));

const patient = {
  id: 12,
  name: "Synthetic Patient",
  age: 45,
  gender: "Female",
  bloodPressure: 122,
  glucose: 105,
  bmi: 24.5,
  heartRate: 72,
  cholesterol: 185,
};

describe("EDPS workspace pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAuditRecords.mockResolvedValue([]);
    api.getBackendHealth.mockResolvedValue({ status: "UP" });
  });

  it("creates and updates patient records through the supplied backend handlers", async () => {
    const onAddPatient = vi.fn().mockResolvedValue(true);
    const onUpdatePatient = vi.fn().mockResolvedValue(true);
    const props = {
      patients: [patient],
      loading: false,
      error: "",
      actionError: "",
      actionLoading: false,
      onRetry: vi.fn(),
      onAddPatient,
      onUpdatePatient,
      onDeletePatient: vi.fn(),
    };
    const { rerender } = render(<PatientsPage {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Add patient/i }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Synthetic" } });
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "38" } });
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Female" } });
    fireEvent.change(screen.getByLabelText("Blood pressure (mmHg)"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Glucose (mg/dL)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("BMI"), { target: { value: "23.5" } });
    fireEvent.change(screen.getByLabelText("Heart rate (bpm)"), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText("Cholesterol (mg/dL)"), { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Save patient" }));
    await waitFor(() => expect(onAddPatient).toHaveBeenCalledOnce());
    expect(onAddPatient.mock.calls[0][0]).toMatchObject({
      name: "New Synthetic", age: 38, gender: "Female", bloodPressure: 120, glucose: 100,
    });

    rerender(<PatientsPage {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Updated Synthetic" } });
    fireEvent.click(screen.getByRole("button", { name: "Update patient" }));
    await waitFor(() => expect(onUpdatePatient).toHaveBeenCalledWith(12, expect.objectContaining({ name: "Updated Synthetic" })));
  });

  it("shows persisted history details when a record is opened", () => {
    render(
      <HistoryPage
        history={[{ id: 5, patientId: 12, patient: { name: "Synthetic Patient" }, riskLevel: "High Risk", probability: 0.81, createdAt: "2026-10-14T09:00:00Z" }]}
        loading={false}
        error=""
        actionError=""
        actionLoading={false}
        onRetry={vi.fn()}
        onClearHistory={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByText("Prediction details")).not.toBeNull();
    expect(screen.getAllByText("81%").length).toBeGreaterThan(0);
  });

  it("renders global and patient-specific explanations with distinct scopes", async () => {
    api.getGlobalExplainability.mockResolvedValue({
      scope: "global",
      method: "permutation_importance",
      sample_count: 20,
      description: "Global model measure",
      feature_importance: [{ feature: "glucose", mean_importance: 0.12, std_importance: 0.02 }],
    });
    api.getIndividualExplainability.mockResolvedValue({
      scope: "individual",
      method: "single_feature_replacement_sensitivity",
      reference_population: "synthetic reference data",
      note: "Sensitivity only",
      prediction: { probability: 0.72 },
      feature_effects: [{
        feature: "glucose",
        input_value: 105,
        reference_value: 100,
        probability_with_input: 0.72,
        probability_with_reference: 0.5,
        probability_delta: 0.22,
      }],
    });
    render(<ExplainabilityPage patients={[patient]} />);
    expect(await screen.findByText("Global feature importance")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Backend patient record"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Request individual explanation" }));
    await waitFor(() => expect(api.getIndividualExplainability).toHaveBeenCalledWith({
      age: 45,
      gender: 1,
      blood_pressure: 122,
      glucose: 105,
      bmi: 24.5,
      heart_rate: 72,
      cholesterol: 185,
    }));
    expect(await screen.findByText(/Sensitivity only/)).not.toBeNull();
  });

  it("renders actual FedAvg responses and explicitly labels synthetic clients", async () => {
    api.getFederatedResults.mockResolvedValue({
      status: "completed",
      method: "FedAvg",
      model: "binary logistic regression",
      simulation_data: "synthetic",
      client_count: 3,
      rounds: 1,
      local_epochs: 5,
      aggregation: "weighted average",
      client_rows: [6, 5, 5],
      per_round_metrics: [{ round: 1, accuracy: 0.5 }],
      final_evaluation_metrics: { accuracy: 0.5, precision_class_1: 0.5, recall_class_1: 1, f1_class_1: 0.67 },
      interpretation: "Simulation only",
    });
    render(<FederatedLearningPage />);
    expect(await screen.findByText("FedAvg results")).not.toBeNull();
    expect(screen.getAllByText("Simulated").length).toBe(3);
    expect(screen.getAllByText("50.0%").length).toBeGreaterThan(0);
    expect(screen.getByText("Experimental federated learning simulation using synthetic data. This is not a live hospital network and provides no clinical or privacy guarantee.")).not.toBeNull();
  });

  it("does not show audit verification as passed until the backend response arrives", async () => {
    let resolveVerification;
    api.verifyIntegrity.mockReturnValue(new Promise((resolve) => { resolveVerification = resolve; }));
    render(<BlockchainPage history={[]} onExport={vi.fn()} />);
    await waitFor(() => expect(api.getAuditRecords).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Verify integrity" }));
    expect(screen.queryByText("Backend integrity check passed")).toBeNull();
    resolveVerification({ valid: true, checkedRecords: 3, verifiedAt: "2026-10-14T09:00:00Z" });
    expect(await screen.findByText("Backend integrity check passed")).not.toBeNull();
  });

  it("reports backend service health and authenticates using the memory-only credential flow", async () => {
    api.authenticate.mockResolvedValue(undefined);
    const onAuthenticated = vi.fn();
    render(<ServiceHealthPage onAuthenticated={onAuthenticated} />);
    expect(await screen.findByText("UP")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Backend administrator username"), { target: { value: "demo-admin" } });
    fireEvent.change(screen.getByLabelText("Backend administrator password"), { target: { value: "temporary-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Authenticate with backend" }));
    await waitFor(() => expect(api.authenticate).toHaveBeenCalledWith("demo-admin", "temporary-password"));
    expect(onAuthenticated).toHaveBeenCalledOnce();
    expect(await screen.findByText(/credentials accepted for this tab/i)).not.toBeNull();
  });
});
