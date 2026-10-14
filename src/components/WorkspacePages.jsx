import { useCallback, useEffect, useMemo, useState } from "react";
import { api, probabilityPercent } from "../api";

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="page-empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function normalizeGender(gender) {
  const value = String(gender || "").trim().toLowerCase();
  if (["male", "m", "0"].includes(value)) return "Male";
  if (["female", "f", "1"].includes(value)) return "Female";
  return "";
}

export function PatientsPage({ patients, loading, error, actionError, actionLoading, onRetry, onAddPatient, onUpdatePatient, onDeletePatient }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    bloodPressure: "",
    glucose: "",
    bmi: "",
    heartRate: "",
    cholesterol: "",
  });
  const filteredPatients = patients.filter((patient) =>
    `${patient.name || ""} ${patient.email || ""} ${patient.phone || ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "",
      email: "",
      phone: "",
      bloodPressure: "",
      glucose: "",
      bmi: "",
      heartRate: "",
      cholesterol: "",
    });
    setEditingPatient(null);
    setShowForm(false);
  };

  const submitPatient = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    const wasEditing = Boolean(editingPatient);
    const patientData = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      bloodPressure: form.bloodPressure ? Number(form.bloodPressure) : null,
      glucose: form.glucose ? Number(form.glucose) : null,
      bmi: form.bmi ? Number(form.bmi) : null,
      heartRate: form.heartRate ? Number(form.heartRate) : null,
      cholesterol: form.cholesterol ? Number(form.cholesterol) : null,
    };
    const saved = editingPatient
      ? await onUpdatePatient(editingPatient.id, patientData)
      : await onAddPatient(patientData);
    if (saved) {
      resetForm();
      setSuccessMessage(wasEditing ? "Patient record updated in the backend." : "Patient record created in the backend.");
    }
  };

  const startEditing = (patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name || "",
      age: patient.age == null ? "" : String(patient.age),
      gender: normalizeGender(patient.gender),
      email: patient.email || "",
      phone: patient.phone || "",
      bloodPressure: patient.bloodPressure == null ? "" : String(patient.bloodPressure),
      glucose: patient.glucose == null ? "" : String(patient.glucose),
      bmi: patient.bmi == null ? "" : String(patient.bmi),
      heartRate: patient.heartRate == null ? "" : String(patient.heartRate),
      cholesterol: patient.cholesterol == null ? "" : String(patient.cholesterol),
    });
    setShowForm(true);
  };

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="PATIENT DIRECTORY"
        title="Patients"
        description="Manage patient records from the configured Spring Boot backend. Patient data is not stored in this browser."
        action={<button className="primary-action" type="button" onClick={() => { if (showForm) resetForm(); else { setSuccessMessage(""); setShowForm(true); } }}>{showForm ? "Cancel" : "+ Add patient"}</button>}
      />
      {successMessage && <div className="inline-notice" role="status">{successMessage}</div>}
      {showForm && (
        <form className="inline-form" onSubmit={submitPatient}>
          <h2>{editingPatient ? "Update patient record" : "Add a patient record"}</h2>
          {actionError && <div className="page-error" role="alert">{actionError}</div>}
          <div className="inline-form-grid">
            <label>Full name<input required pattern=".*\S.*" title="Enter a name with at least one non-space character." maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Patient name" /></label>
            <label>Age<input required min="1" max="120" step="1" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="Age" /></label>
            <label>Gender<select required value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select</option><option>Female</option><option>Male</option></select></label>
            <label>Phone<input type="tel" maxLength="30" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" /></label>
            <label>Email<input type="email" maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" /></label>
            <label>Blood pressure (mmHg)<input required type="number" min="40" max="300" value={form.bloodPressure} onChange={(event) => setForm({ ...form, bloodPressure: event.target.value })} placeholder="e.g. 120" /></label>
            <label>Glucose (mg/dL)<input required type="number" min="20" max="1000" value={form.glucose} onChange={(event) => setForm({ ...form, glucose: event.target.value })} placeholder="e.g. 100" /></label>
            <label>BMI<input required type="number" min="5" max="100" step="0.1" value={form.bmi} onChange={(event) => setForm({ ...form, bmi: event.target.value })} placeholder="e.g. 24.5" /></label>
            <label>Heart rate (bpm)<input required type="number" min="20" max="250" value={form.heartRate} onChange={(event) => setForm({ ...form, heartRate: event.target.value })} placeholder="e.g. 72" /></label>
            <label>Cholesterol (mg/dL)<input required type="number" min="50" max="1000" value={form.cholesterol} onChange={(event) => setForm({ ...form, cholesterol: event.target.value })} placeholder="e.g. 180" /></label>
          </div>
          <button className="primary-action" type="submit" disabled={actionLoading}>{actionLoading ? "Saving…" : editingPatient ? "Update patient" : "Save patient"}</button>
        </form>
      )}
      {actionError && !showForm && <div className="page-error" role="alert">{actionError}</div>}
      <div className="page-toolbar">
        <label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" /></label>
        <span>{filteredPatients.length} {filteredPatients.length === 1 ? "record" : "records"}</span>
      </div>
      {error ? (
        <div className="page-error" role="alert"><div><strong>Patient records could not be loaded.</strong><p>{error}</p></div><button className="secondary-action" type="button" onClick={onRetry}>Retry</button></div>
      ) : loading ? (
        <div className="page-loading" role="status">Loading backend patient records…</div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState icon="♙" title={search ? "No matching patients" : "No patient records yet"} description={search ? "Try a different name, email, or phone number." : "Add a patient here or save one when a prediction is completed."} />
      ) : (
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Patient ID</th><th>Age</th><th>Gender</th><th>Contact</th><th>Actions</th></tr></thead><tbody>
          {filteredPatients.map((patient, index) => <tr key={patient.id ?? `${patient.name}-${index}`}><td><strong>{patient.name || "Unnamed patient"}</strong></td><td>{patient.id ?? "—"}</td><td>{patient.age ?? "—"}</td><td>{normalizeGender(patient.gender) || patient.gender || "—"}</td><td>{patient.email || patient.phone || "—"}</td><td><div className="row-actions"><button className="text-action" type="button" disabled={actionLoading || patient.id == null} onClick={() => startEditing(patient)}>Edit</button><button className="text-action danger-action" type="button" disabled={actionLoading || patient.id == null} onClick={() => { if (window.confirm(`Delete the patient record for ${patient.name || "this patient"}? This cannot be undone.`)) onDeletePatient(patient.id); }} aria-label={`Delete ${patient.name || "patient"}`}>Delete</button></div></td></tr>)}
        </tbody></table></div>
      )}
    </section>
  );
}

export function HistoryPage({ history, loading, error, actionError, actionLoading, onRetry, onClearHistory, onExport }) {
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const filteredHistory = history.filter((record) =>
    `${record.patient?.name || ""} ${record.diseaseType || ""} ${record.riskLevel || ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="MODEL ACTIVITY" title="Prediction history" description="Review completed prediction responses loaded from the backend." action={<div className="heading-actions"><button className="secondary-action" type="button" onClick={() => onExport(filteredHistory, "prediction-history.csv")} disabled={!filteredHistory.length}>Export CSV</button><button className="secondary-action danger-action" type="button" onClick={() => { if (window.confirm("Delete all prediction history from the backend? This cannot be undone.")) onClearHistory(); }} disabled={!history.length || actionLoading}>Clear history</button><button className="secondary-action" type="button" onClick={onRetry}>↻ Refresh</button></div>} />
      {actionError && <div className="page-error" role="alert">{actionError}</div>}
      {error && <div className="page-error" role="alert"><div><strong>Prediction history could not be loaded.</strong><p>{error}</p></div><button className="secondary-action" type="button" onClick={onRetry}>Retry</button></div>}
      <div className="page-toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, disease, or risk" /></label><span>{filteredHistory.length} predictions</span></div>
      {loading ? <div className="page-loading" role="status">Loading backend prediction history…</div> : error ? null : filteredHistory.length === 0 ? <EmptyState icon="◷" title={search ? "No matching predictions" : "No predictions recorded"} description={search ? "Try another search term." : "Completed predictions will appear here after the prediction service responds."} /> : (
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Patient</th><th>Disease</th><th>Result</th><th>Risk</th><th>Probability</th><th>Details</th></tr></thead><tbody>
          {filteredHistory.map((record, index) => { const probability = probabilityPercent(record.probability); const probabilityText = probability == null ? "—" : `${probability}%`; const risk = String(record.riskLevel || "Unknown"); const riskClass = risk.toLowerCase().includes("high") ? "status-danger" : risk.toLowerCase().includes("low") ? "status-success" : "status-warning"; return <tr key={record.id ?? record.predictionId ?? index}><td>{record.createdAt || record.timestamp || record.predictedAt ? new Date(record.createdAt || record.timestamp || record.predictedAt).toLocaleString() : "—"}</td><td>{record.patient?.name || record.patientName || "—"}</td><td>{record.diseaseType || "—"}</td><td>{record.predictionResult || "—"}</td><td><span className={`status-pill ${riskClass}`}>{risk}</span></td><td>{probabilityText}</td><td><button className="text-action" type="button" onClick={() => setSelectedRecord(record)}>View</button></td></tr>; })}
        </tbody></table></div>
      )}
      {selectedRecord && <section className="history-detail-card" aria-label="Selected prediction details"><div className="section-title"><div><h2>Prediction details</h2><p>Values returned by the backend and saved in prediction history.</p></div><button className="text-action" type="button" onClick={() => setSelectedRecord(null)}>Close</button></div><dl className="settings-list"><div><dt>Prediction ID</dt><dd>{selectedRecord.id ?? selectedRecord.predictionId ?? "Not returned"}</dd></div><div><dt>Patient ID</dt><dd>{selectedRecord.patient?.id ?? selectedRecord.patientId ?? "Not returned"}</dd></div><div><dt>Patient</dt><dd>{selectedRecord.patient?.name || selectedRecord.patientName || "Not returned"}</dd></div><div><dt>Disease / result</dt><dd>{selectedRecord.diseaseType || "Not returned"} / {selectedRecord.predictionResult || "Not returned"}</dd></div><div><dt>Risk probability</dt><dd>{probabilityPercent(selectedRecord.probability) == null ? "Not returned" : `${probabilityPercent(selectedRecord.probability)}%`}</dd></div><div><dt>Recorded</dt><dd>{selectedRecord.createdAt || selectedRecord.timestamp || selectedRecord.predictedAt || "Not returned"}</dd></div></dl></section>}
    </section>
  );
}

function simulationFeatureValue(patient) {
  const gender = String(patient.gender || "").trim().toLowerCase();
  const genderCode = ["male", "m", "0"].includes(gender)
    ? 0
    : ["female", "f", "1"].includes(gender)
      ? 1
      : null;
  const values = {
    age: Number(patient.age),
    gender: genderCode,
    blood_pressure: Number(patient.bloodPressure),
    glucose: Number(patient.glucose),
    bmi: Number(patient.bmi),
    heart_rate: Number(patient.heartRate),
    cholesterol: Number(patient.cholesterol),
  };
  if (Object.values(values).some((value) => value === null || !Number.isFinite(value))) return null;
  return values;
}

export function ExplainabilityPage({ patients }) {
  const [globalResults, setGlobalResults] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [individualResults, setIndividualResults] = useState(null);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [individualError, setIndividualError] = useState("");

  const loadGlobalResults = async () => {
    setGlobalLoading(true);
    setGlobalError("");
    try {
      setGlobalResults(await api.getGlobalExplainability());
    } catch (error) {
      setGlobalResults(null);
      setGlobalError(error.message || "Global explainability could not be loaded.");
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.getGlobalExplainability()
      .then((result) => {
        if (active) {
          setGlobalResults(result);
          setGlobalError("");
        }
      })
      .catch((error) => {
        if (active) {
          setGlobalResults(null);
          setGlobalError(error.message || "Global explainability could not be loaded.");
        }
      })
      .finally(() => { if (active) setGlobalLoading(false); });
    return () => { active = false; };
  }, []);

  const explainPatient = async (event) => {
    event.preventDefault();
    const patient = patients.find((item) => String(item.id) === selectedPatientId);
    const features = patient && simulationFeatureValue(patient);
    setIndividualError("");
    setIndividualResults(null);
    if (!features) {
      setIndividualError("Select a patient with all seven valid model features before requesting an explanation.");
      return;
    }
    setIndividualLoading(true);
    try {
      setIndividualResults(await api.getIndividualExplainability(features));
    } catch (error) {
      setIndividualError(error.message || "Individual explanation could not be loaded.");
    } finally {
      setIndividualLoading(false);
    }
  };

  const maxImportance = Math.max(
    0.000001,
    ...(globalResults?.feature_importance || []).map((item) => Math.abs(item.mean_importance)),
  );
  const maxEffect = Math.max(
    0.000001,
    ...(individualResults?.feature_effects || []).map((item) => Math.abs(item.probability_delta)),
  );

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="MODEL INTERPRETABILITY" title="Explainable AI" description="Explore model-level feature importance and request a separate sensitivity explanation for a selected backend patient." />
      <section className="analytics-panel" aria-labelledby="global-explainability-heading">
        <div className="section-title">
          <div><h2 id="global-explainability-heading">Global feature importance</h2><p>Across the synthetic model evaluation dataset; not specific to any patient.</p></div>
          <button className="secondary-action" type="button" onClick={loadGlobalResults} disabled={globalLoading}>{globalLoading ? "Loading…" : "Refresh"}</button>
        </div>
        {globalLoading ? (
          <div className="page-loading" role="status">Loading global feature importance from the backend…</div>
        ) : globalError ? (
          <div className="page-error" role="alert"><div><strong>Global explanation unavailable.</strong><p>{globalError}</p></div><button className="secondary-action" type="button" onClick={loadGlobalResults}>Retry</button></div>
        ) : (
          <>
            <div className="overview-cards">
              <article><span>Scope</span><strong>Global</strong></article>
              <article><span>Evaluation samples</span><strong>{globalResults.sample_count}</strong></article>
              <article><span>Method</span><strong>{globalResults.method.replaceAll("_", " ")}</strong></article>
            </div>
            <div className="global-importance-chart" aria-label="Global feature importance chart">
              {globalResults.feature_importance.map((item) => {
                const width = Math.max(0, Math.min(100, Math.abs(item.mean_importance) / maxImportance * 100));
                return <div className="global-importance-row" key={item.feature}><span>{item.feature.replaceAll("_", " ")}</span><div className="bar-track" role="img" aria-label={`${item.feature} relative importance ${item.mean_importance}`}><div className="bar-fill" style={{ width: `${width}%` }} /></div><strong>{item.mean_importance.toFixed(4)} ± {item.std_importance.toFixed(4)}</strong></div>;
              })}
            </div>
            <p className="disclaimer-note">{globalResults.note || globalResults.description} This is not a causal or clinical explanation.</p>
          </>
        )}
      </section>
      <section className="analytics-panel" aria-labelledby="individual-explainability-heading">
        <div className="section-title"><div><h2 id="individual-explainability-heading">Individual sensitivity explanation</h2><p>Compares a patient's model output with one-feature-at-a-time synthetic reference substitutions.</p></div></div>
        <form className="explanation-form" onSubmit={explainPatient}>
          <label htmlFor="explanation-patient">Backend patient record</label>
          <select id="explanation-patient" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)} required>
            <option value="">Select a patient</option>
            {patients.filter((patient) => patient.id != null).map((patient) => <option key={patient.id} value={patient.id}>{patient.name || "Unnamed patient"} · ID {patient.id}</option>)}
          </select>
          <button className="primary-action" type="submit" disabled={!selectedPatientId || individualLoading}>{individualLoading ? "Explaining…" : "Request individual explanation"}</button>
        </form>
        {individualError && <div className="page-error" role="alert"><div><strong>Individual explanation unavailable.</strong><p>{individualError}</p></div></div>}
        {individualResults && (
          <>
            <div className="inline-notice">{individualResults.note} Reference population: {individualResults.reference_population}.</div>
            <div className="global-importance-chart" aria-label="Individual feature sensitivity chart">
              {individualResults.feature_effects.map((effect) => {
                const width = Math.max(0, Math.min(100, Math.abs(effect.probability_delta) / maxEffect * 100));
                return <div className="global-importance-row" key={effect.feature}><span>{effect.feature.replaceAll("_", " ")}</span><div className="bar-track" role="img" aria-label={`${effect.feature} probability delta ${effect.probability_delta}`}><div className={effect.probability_delta < 0 ? "bar-fill bar-fill-danger" : "bar-fill"} style={{ width: `${width}%` }} /></div><strong>{(effect.probability_delta * 100).toFixed(2)} pp · input {effect.input_value} / ref {effect.reference_value}</strong></div>;
              })}
            </div>
            <p className="disclaimer-note">Sensitivity values are non-additive and non-causal; they are not SHAP values or medical explanations.</p>
          </>
        )}
      </section>
      <p className="disclaimer-note">Both results are retrieved through the Spring Boot proxy at <code>/api/ml/explainability/…</code>. No direct browser-to-ML-service request is made.</p>
    </section>
  );
}

export function HospitalNodesPage() {
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="ACADEMIC DEMONSTRATION" title="Simulated client nodes" description="These generic client slots illustrate data partitions in the simulation only; none is a hospital or connected device." />
      <div className="simulated-client-grid">
        {[1, 2, 3].map((client) => <article className="simulated-client" key={client}><span className="status-pill status-warning">Simulated</span><strong>Client {client}</strong><small>Not connected · synthetic data only</small></article>)}
      </div>
      <p className="disclaimer-note">View the Federated Learning page for actual experiment metrics when the backend proxy exposes them.</p>
    </section>
  );
}

export function FederatedLearningPage() {
  const [federatedResults, setFederatedResults] = useState(null);
  const [federatedLoading, setFederatedLoading] = useState(true);
  const [federatedError, setFederatedError] = useState("");

  const loadFederatedResults = useCallback(async () => {
    setFederatedLoading(true);
    setFederatedError("");
    try {
      setFederatedResults(await api.getFederatedResults());
    } catch (error) {
      setFederatedResults(null);
      setFederatedError(error.message || "Federated simulation results could not be loaded.");
    } finally {
      setFederatedLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getFederatedResults()
      .then((result) => {
        if (active) {
          setFederatedResults(result);
          setFederatedError("");
        }
      })
      .catch((error) => {
        if (active) {
          setFederatedResults(null);
          setFederatedError(error.message || "Federated simulation results could not be loaded.");
        }
      })
      .finally(() => { if (active) setFederatedLoading(false); });
    return () => { active = false; };
  }, [loadFederatedResults]);

  const progress = federatedResults ? 100 : 0;

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="FEDERATED NETWORK" title="Federated learning" description="Experimental federated learning simulation using synthetic data. These clients are not live hospitals." action={<button className="secondary-action" type="button" onClick={loadFederatedResults} disabled={federatedLoading}>{federatedLoading ? "Loading…" : "Refresh results"}</button>} />
      <div className="simulated-client-grid" aria-label="Simulated federated clients">
        {[1, 2, 3].map((client) => <article className="simulated-client" key={client}><span className="status-pill status-warning">Simulated</span><strong>Client {client}</strong><small>Synthetic data partition{federatedResults?.client_rows?.[client - 1] == null ? "" : ` · ${federatedResults.client_rows[client - 1]} rows`}</small></article>)}
      </div>
      <div className="inline-notice">Experimental federated learning simulation using synthetic data. This is not a live hospital network and provides no clinical or privacy guarantee.</div>
      <section className="federated-results" aria-labelledby="federated-results-title">
        <div className="section-title"><div><span className="page-eyebrow">EXPERIMENTAL SIMULATION</span><h2 id="federated-results-title">FedAvg results</h2><p>Metrics appear only after a successful Spring Boot proxy response.</p></div></div>
        {federatedError ? (
          <div className="page-error" role="alert"><div><strong>Simulation results are unavailable.</strong><p>{federatedError}</p></div><button className="secondary-action" type="button" onClick={loadFederatedResults} disabled={federatedLoading}>Retry</button></div>
        ) : federatedLoading ? (
          <div className="page-loading" role="status">Loading simulation results from the backend…</div>
        ) : federatedResults ? (
          <>
            <div className="federated-metrics">
              <article><span>Simulated clients</span><strong>{federatedResults.client_count}</strong></article>
              <article><span>Communication rounds</span><strong>{federatedResults.rounds}</strong></article>
              <article><span>Training status</span><strong>{federatedResults.status}</strong></article>
              <article><span>Evaluation accuracy</span><strong>{(federatedResults.final_evaluation_metrics.accuracy * 100).toFixed(1)}%</strong></article>
              <article><span>Precision (class 1)</span><strong>{(federatedResults.final_evaluation_metrics.precision_class_1 * 100).toFixed(1)}%</strong></article>
              <article><span>Recall (class 1)</span><strong>{(federatedResults.final_evaluation_metrics.recall_class_1 * 100).toFixed(1)}%</strong></article>
              <article><span>F1 (class 1)</span><strong>{(federatedResults.final_evaluation_metrics.f1_class_1 * 100).toFixed(1)}%</strong></article>
            </div>
            <div className="federated-progress"><div><span>Completed communication rounds</span><strong>{federatedResults.rounds} / {federatedResults.rounds}</strong></div><div className="probability-track" role="progressbar" aria-label="Federated simulation round completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span className="probability-fill" style={{ width: `${progress}%` }} /></div><small>This is a completed simulation result, not a live training-progress stream.</small></div>
            <div className="analytics-panel">
              <div className="section-title"><div><h3>Per-round performance</h3><p>Metrics returned by the simulation for each communication round.</p></div></div>
              {federatedResults.per_round_metrics.length ? <div className="bar-chart" aria-label="Per-round federated performance">{federatedResults.per_round_metrics.map((round) => <div className="bar-row" key={round.round}><span>Round {round.round}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, round.accuracy * 100))}%` }} /></div><strong>{(round.accuracy * 100).toFixed(1)}%</strong></div>)}</div> : <EmptyState icon="▥" title="Per-round metrics not included" description="The backend returned no per-round values; none are fabricated." />}
              <p>Model: {federatedResults.model}; local epochs: {federatedResults.local_epochs}; aggregation: {federatedResults.aggregation}.</p>
            </div>
            <p className="disclaimer-note">{federatedResults.interpretation}</p>
          </>
        ) : null}
      </section>
      <p className="disclaimer-note">Results come from the Spring Boot proxy at <code>GET /api/ml/federated/results</code>. No direct browser-to-ML-service request is made.</p>
    </section>
  );
}

export function BlockchainPage({ history, onExport }) {
  const [verification, setVerification] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [auditRecords, setAuditRecords] = useState([]);
  const [auditRecordsError, setAuditRecordsError] = useState("");
  const [auditRecordsLoading, setAuditRecordsLoading] = useState(true);

  useEffect(() => {
    api.getAuditRecords()
      .then(setAuditRecords)
      .catch((error) => setAuditRecordsError(error.message || "Audit history could not be loaded."))
      .finally(() => setAuditRecordsLoading(false));
  }, []);

  const verifyIntegrity = async () => {
    setVerifying(true);
    setVerification(null);
    setVerificationError("");
    try {
      setVerification(await api.verifyIntegrity());
    } catch (error) {
      setVerification(null);
      setVerificationError(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="AUDIT & INTEGRITY"
        title="Blockchain audit"
        description="Verify the backend's MySQL-backed SHA-256 hash chain. This is an academic integrity demonstration, not a distributed blockchain network."
        action={<div className="heading-actions"><button className="secondary-action" type="button" onClick={() => onExport(history, "edps-prediction-history.csv")} disabled={!history.length}>Export history CSV</button><button className="primary-action" type="button" onClick={verifyIntegrity} disabled={verifying}>{verifying ? "Verifying…" : "Verify integrity"}</button></div>}
      />
      {verificationError ? (
        <div className="page-error" role="alert">
          <div><strong>Integrity verification could not be completed.</strong><p>{verificationError}</p></div>
          <button className="secondary-action" type="button" onClick={verifyIntegrity} disabled={verifying}>Retry verification</button>
        </div>
      ) : verification ? (
        <>
          <div className={`audit-banner ${verification.valid ? "audit-verified" : "audit-invalid"}`} role="status">
            <span aria-hidden="true">{verification.valid ? "✓" : "!"}</span>
            <div>
              <strong>{verification.valid ? "Backend integrity check passed" : "Backend integrity check failed"}</strong>
              <p>{verification.valid
                ? "The backend verified the hash chain for all records checked."
                : `The backend reported a broken or invalid chain${verification.brokenReference ? ` at ${verification.brokenReference}` : ""}.`}</p>
            </div>
          </div>
          <div className="overview-cards">
            <article><span>Backend prediction records</span><strong>{history.length}</strong></article>
            <article><span>Audit records checked</span><strong>{verification.checkedRecords ?? "—"}</strong></article>
            <article><span>Verification time</span><strong>{verification.verifiedAt ? new Date(verification.verifiedAt).toLocaleString() : "Not provided"}</strong></article>
          </div>
          {verification.brokenReference && <p className="disclaimer-note">Backend-reported broken reference: <code>{verification.brokenReference}</code></p>}
        </>
      ) : (
        <>
          <div className="audit-banner" role="status">
            <span aria-hidden="true">⬡</span>
            <div><strong>Verification not run</strong><p>Prediction history is backend data, but it is not proof of integrity until the verification endpoint confirms the hash chain.</p></div>
          </div>
          <div className="overview-cards">
            <article><span>Backend prediction records</span><strong>{history.length}</strong></article>
            <article><span>Audit records checked</span><strong>—</strong></article>
            <article><span>Verification endpoint</span><strong>Not checked</strong></article>
          </div>
        </>
      )}
      <section className="analytics-panel" aria-labelledby="audit-history-heading">
        <div className="section-title"><div><h2 id="audit-history-heading">Audit history</h2><p>Backend audit records contain event and record-reference metadata, not patient details.</p></div></div>
        {auditRecordsLoading ? <div className="page-loading" role="status">Loading backend audit history…</div> : auditRecordsError ? <div className="page-error" role="alert"><div><strong>Audit history is unavailable.</strong><p>{auditRecordsError}</p></div><button className="secondary-action" type="button" onClick={() => { setAuditRecordsLoading(true); setAuditRecordsError(""); api.getAuditRecords().then(setAuditRecords).catch((error) => setAuditRecordsError(error.message || "Audit history could not be loaded.")).finally(() => setAuditRecordsLoading(false)); }}>Retry</button></div> : auditRecords.length === 0 ? <EmptyState icon="⬡" title="No audit records returned" description="The backend has not returned audit history records." /> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Timestamp</th><th>Reference</th><th>Event metadata</th><th>Chain hash</th></tr></thead><tbody>{auditRecords.map((record) => <tr key={record.id ?? record.reference}><td>{record.timestamp ? new Date(record.timestamp).toLocaleString() : "—"}</td><td>{record.reference || "—"}</td><td>{record.payload || "—"}</td><td><code>{record.currentHash ? `${record.currentHash.slice(0, 12)}…` : "—"}</code></td></tr>)}</tbody></table></div>
        )}
      </section>
      <p className="disclaimer-note">Verification uses GET /integrity/audit/verify. The backend currently returns an integrity summary rather than a list of individually verified prediction records.</p>
    </section>
  );
}

export function ServiceHealthPage({ onAuthenticated }) {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [mlHealth, setMlHealth] = useState(null);
  const [mlHealthLoading, setMlHealthLoading] = useState(true);
  const [mlHealthError, setMlHealthError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticated, setAuthenticated] = useState(api.hasCredentials());

  const applyHealthResults = useCallback(([backendResult, mlResult]) => {
    if (backendResult.status === "fulfilled") setHealth(backendResult.value);
    else {
      setHealth(null);
      setHealthError(backendResult.reason.message || "Backend health could not be checked.");
    }
    if (mlResult.status === "fulfilled") setMlHealth(mlResult.value);
    else {
      setMlHealth(null);
      setMlHealthError(mlResult.reason.message || "ML service health could not be checked.");
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError("");
    setMlHealthLoading(true);
    setMlHealthError("");
    applyHealthResults(await Promise.allSettled([
      api.getBackendHealth(),
      api.getMlHealth(),
    ]));
    setHealthLoading(false);
    setMlHealthLoading(false);
  }, [applyHealthResults]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.getBackendHealth(),
      api.getMlHealth(),
    ])
      .then((results) => { if (active) applyHealthResults(results); })
      .finally(() => {
        if (active) {
          setHealthLoading(false);
          setMlHealthLoading(false);
        }
      });
    return () => { active = false; };
  }, [applyHealthResults]);

  const submitCredentials = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");
    try {
      await api.authenticate(username, password);
      setAuthenticated(true);
      setPassword("");
      setAuthMessage("Backend credentials accepted for this tab. The password is not persisted.");
      await onAuthenticated?.();
    } catch (error) {
      setAuthenticated(false);
      setAuthError(error.message || "Backend authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const clearCredentials = () => {
    api.clearCredentials();
    setAuthenticated(false);
    setPassword("");
    setAuthMessage("Credentials cleared from this tab.");
    setAuthError("");
  };

  const databaseHealth = health?.components?.db?.status || health?.components?.database?.status;

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="SYSTEM CONFIGURATION" title="Service health & settings" description="Check the backend health endpoint and manage the existing HTTP Basic authentication flow for this browser tab." action={<button className="secondary-action" type="button" onClick={refreshHealth} disabled={healthLoading}>{healthLoading ? "Checking…" : "Refresh status"}</button>} />
      {healthError && <div className="page-error" role="alert"><div><strong>Backend health is unavailable.</strong><p>{healthError}</p></div><button className="secondary-action" type="button" onClick={refreshHealth}>Retry</button></div>}
      <div className="service-status-grid">
        <article><span>Frontend</span><strong className="service-state service-up">Running</strong><small>Vite application loaded</small></article>
        <article><span>Spring Boot API</span><strong className={`service-state ${health?.status === "UP" ? "service-up" : "service-down"}`}>{healthLoading ? "Checking…" : health?.status || "Disconnected"}</strong><small>{api.baseUrl}/actuator/health</small></article>
        <article><span>MySQL database</span><strong className="service-state">{databaseHealth || "Not reported"}</strong><small>{databaseHealth ? "Reported by Spring Boot health details" : "Backend health response does not expose component details"}</small></article>
        <article><span>FastAPI ML</span><strong className={`service-state ${mlHealth?.status === "UP" ? "service-up" : mlHealthError || mlHealth?.status === "DEGRADED" ? "service-down" : ""}`}>{mlHealthLoading ? "Checking…" : mlHealth?.status || "Disconnected"}</strong><small>{mlHealth?.model_status || mlHealthError || "GET /api/ml/health through Spring Boot"}</small></article>
      </div>
      <section className="analytics-panel auth-settings-panel" aria-labelledby="auth-settings-heading">
        <div className="section-title"><div><h2 id="auth-settings-heading">Backend authentication</h2><p>Spring Boot production mode uses one configured HTTP Basic administrator and requires a CSRF token for write operations.</p></div><span className={`status-pill ${authenticated ? "status-success" : "status-warning"}`}>{authenticated ? "Credentials set in this tab" : "No credentials in memory"}</span></div>
        {authMessage && <div className="inline-notice" role="status">{authMessage}</div>}
        {authError && <div className="page-error" role="alert">{authError}</div>}
        <form className="auth-form" onSubmit={submitCredentials}>
          <label htmlFor="backend-username">Backend administrator username<input id="backend-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label htmlFor="backend-password">Backend administrator password<input id="backend-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <div className="heading-actions"><button className="primary-action" type="submit" disabled={authLoading}>{authLoading ? "Checking credentials…" : "Authenticate with backend"}</button><button className="secondary-action" type="button" onClick={clearCredentials} disabled={!authenticated}>Clear credentials</button></div>
        </form>
        <p className="disclaimer-note">Credentials and the CSRF token are held in JavaScript memory only and are cleared on reload or when you choose Clear credentials. The backend uses HTTP Basic, so use HTTPS for private deployments; this frontend does not write credentials to browser storage.</p>
      </section>
      <section className="analytics-panel">
        <div className="section-title"><div><h2>Proxy and configuration status</h2><p>Configuration is limited to service URLs and does not reveal secrets.</p></div></div>
        <dl className="settings-list">
          <div><dt>Backend base URL</dt><dd>{api.baseUrl}</dd></div>
          <div><dt>Backend health</dt><dd>GET /actuator/health (public, response details depend on backend configuration)</dd></div>
          <div><dt>ML proxy</dt><dd>GET /api/ml/health, GET /api/ml/explainability/global, POST /api/ml/explainability/individual, and GET /api/ml/federated/results.</dd></div>
          <div><dt>Database connectivity</dt><dd>{databaseHealth || "Not separately exposed by the current health response."}</dd></div>
        </dl>
      </section>
    </section>
  );
}

export function AnalyticsPage({ patients, history, loading, patientError, historyError, onRetry }) {
  const riskCounts = useMemo(() => history.reduce((counts, item) => {
    const key = String(item.riskLevel || "Unknown").toLowerCase().includes("high") ? "High risk" : "Low / other";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { "High risk": 0, "Low / other": 0 }), [history]);
  const total = history.length;
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="OVERVIEW & TRENDS" title="Analytics" description="A summary of patient and prediction records returned by the backend. No clinical conclusions are generated here." />
      {(patientError || historyError) && <div className="page-error" role="alert"><div><strong>Analytics data could not be fully loaded.</strong>{patientError && <p>{patientError}</p>}{historyError && <p>{historyError}</p>}</div><button className="secondary-action" type="button" onClick={onRetry}>Retry</button></div>}
      {loading && <div className="page-loading" role="status">Loading backend data…</div>}
      <div className="overview-cards"><article><span>Patient records</span><strong>{patients.length}</strong></article><article><span>Completed predictions</span><strong>{total}</strong></article><article><span>High-risk results</span><strong>{riskCounts["High risk"]}</strong></article></div>
      <div className="analytics-panel"><div className="section-title"><div><h2>Prediction outcomes</h2><p>Counts from saved service responses only</p></div><span>{total} total</span></div>{total === 0 ? <EmptyState icon="▥" title="Not enough data yet" description="Run a prediction with the connected service to populate these summaries." /> : <div className="bar-chart" aria-label="Prediction outcome counts">{Object.entries(riskCounts).map(([label, count]) => <div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><div className={label === "High risk" ? "bar-fill bar-fill-danger" : "bar-fill"} style={{ width: `${Math.max((count / total) * 100, 3)}%` }} /></div><strong>{count}</strong></div>)}</div>}</div>
      <p className="disclaimer-note">This dashboard is operational reporting only and is not a substitute for professional medical advice.</p>
    </section>
  );
}

export function AboutPage() {
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="ABOUT THE PROJECT" title="About EDPS" description="Early Disease Prediction System · VTU Final Year CSE Project" />
      <div className="about-card"><div className="about-mark">✚</div><div><h2>Early Disease Prediction System</h2><p>EDPS is an academic demonstration interface for a connected disease-risk prediction service, patient record management, and federated healthcare concepts.</p><div className="about-feature-list"><span>Spring Boot API and Python ML service integration</span><span>Patient records managed by backend endpoints</span><span>Simulated hospital-node directory</span><span>Backend prediction activity and integrity verification view</span></div></div></div>
      <div className="inline-notice">Authentication is pending backend support; this interface does not provide a secure login. Predictions are educational only, are not medical diagnoses, and must not be used for treatment decisions or emergencies.</div>
    </section>
  );
}
