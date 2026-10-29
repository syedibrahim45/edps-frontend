import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api";

vi.mock("./api", () => ({
  api: {
    baseUrl: "http://localhost:8080",
    getPatients: vi.fn(),
    getPredictions: vi.fn(),
    getBackendHealth: vi.fn(),
    getMlHealth: vi.fn(),
    verifyIntegrity: vi.fn(),
    hasCredentials: vi.fn(() => false),
    createPrediction: vi.fn(),
  },
  probabilityPercent: (value) => value == null ? null : Math.round(Number(value) * 100),
}));

describe("EDPS application navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPatients.mockResolvedValue([]);
    api.getPredictions.mockResolvedValue([]);
    api.getBackendHealth.mockResolvedValue({ status: "UP" });
    api.getMlHealth.mockResolvedValue({
      status: "UP",
      service: "EDPS ML Service",
      model_status: "ready",
    });
    api.verifyIntegrity.mockResolvedValue({ valid: true, checkedRecords: 0 });
  });

  it("adds diabetes screening near the unchanged generic prediction page", () => {
    render(<App />);

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    fireEvent.click(screen.getByRole("button", { name: "Disease Prediction" }));
    expect(screen.getByRole("heading", { name: "Disease Prediction" })).not.toBeNull();
    expect(api.createPrediction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Diabetes Screening" }));
    expect(screen.getByRole("heading", { name: "Diabetes Screening" })).not.toBeNull();
    expect(navigation.querySelector('[aria-current="page"]').textContent).toContain("Diabetes Screening");
  });
});
