import { useCallback, useEffect, useMemo, useState } from "react";
import { api, probabilityPercent } from "../api";

const hospitalNodes = [
  { id: "HSP-001", name: "Central General Hospital", location: "Bengaluru, Karnataka", specialty: "General Medicine", status: "Online", lastSync: "Just now" },
  { id: "HSP-002", name: "Northside Medical Centre", location: "Mysuru, Karnataka", specialty: "Cardiology", status: "Online", lastSync: "2 min ago" },
  { id: "HSP-003", name: "City Teaching Hospital", location: "Hubballi, Karnataka", specialty: "Endocrinology", status: "Online", lastSync: "5 min ago" },
  { id: "HSP-004", name: "Community Health Network", location: "Mangaluru, Karnataka", specialty: "Primary Care", status: "Maintenance", lastSync: "18 min ago" },
];

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
            <label>Blood pressure (mmHg)<input required type="number" min="1" max="400" value={form.bloodPressure} onChange={(event) => setForm({ ...form, bloodPressure: event.target.value })} placeholder="e.g. 120" /></label>
            <label>Glucose (mg/dL)<input required type="number" min="1" max="1000" value={form.glucose} onChange={(event) => setForm({ ...form, glucose: event.target.value })} placeholder="e.g. 100" /></label>
            <label>BMI<input required type="number" min="0.1" max="100" step="0.1" value={form.bmi} onChange={(event) => setForm({ ...form, bmi: event.target.value })} placeholder="e.g. 24.5" /></label>
            <label>Heart rate (bpm)<input required type="number" min="1" max="300" value={form.heartRate} onChange={(event) => setForm({ ...form, heartRate: event.target.value })} placeholder="e.g. 72" /></label>
            <label>Cholesterol (mg/dL)<input required type="number" min="1" max="1000" value={form.cholesterol} onChange={(event) => setForm({ ...form, cholesterol: event.target.value })} placeholder="e.g. 180" /></label>
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
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Patient</th><th>Disease</th><th>Result</th><th>Risk</th><th>Probability</th></tr></thead><tbody>
          {filteredHistory.map((record, index) => { const probability = probabilityPercent(record.probability); const probabilityText = probability == null ? "—" : `${probability}%`; const risk = String(record.riskLevel || "Unknown"); const riskClass = risk.toLowerCase().includes("high") ? "status-danger" : risk.toLowerCase().includes("low") ? "status-success" : "status-warning"; return <tr key={record.id ?? record.predictionId ?? index}><td>{record.createdAt || record.timestamp || record.predictedAt ? new Date(record.createdAt || record.timestamp || record.predictedAt).toLocaleString() : "—"}</td><td>{record.patient?.name || record.patientName || "—"}</td><td>{record.diseaseType || "—"}</td><td>{record.predictionResult || "—"}</td><td><span className={`status-pill ${riskClass}`}>{risk}</span></td><td>{probabilityText}</td></tr>; })}
        </tbody></table></div>
      )}
    </section>
  );
}

export function HospitalNodesPage() {
  const [lastChecked, setLastChecked] = useState(null);
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
    let mounted = true;

    const syncResults = async () => {
      if (!mounted) return;
      await loadFederatedResults();
    };

    syncResults();

    return () => {
      mounted = false;
    };
  }, [loadFederatedResults]);

  const roundMetrics = federatedResults?.round_metrics
    || federatedResults?.round_history
    || federatedResults?.round_results
    || [];
  const progress = federatedResults
    ? Math.round(Math.min(1, Number(federatedResults.rounds_completed ?? federatedResults.rounds) / federatedResults.rounds) * 100)
    : 0;

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="FEDERATED NETWORK" title="Hospital nodes" description="Illustrative node cards for the academic federated-learning concept; no live hospital clients are connected." action={<button className="secondary-action" type="button" onClick={() => setLastChecked(new Date())}>↻ Refresh sample</button>} />
      {lastChecked && <div className="inline-notice" role="status">Sample node list refreshed locally at {lastChecked.toLocaleTimeString()}. This does not check live connectivity.</div>}
      <div className="overview-cards"><article><span>Simulated nodes</span><strong>{hospitalNodes.length}</strong></article><article><span>Live federated clients</span><strong>Not connected</strong></article><article><span>Network status</span><strong>Academic demo</strong></article></div>
      <div className="node-grid">{hospitalNodes.map((node) => <article className="node-card" key={node.id}><div className="node-card-top"><span className="node-icon">▦</span><span className="status-pill status-warning">Simulated</span></div><span className="page-eyebrow">{node.id}</span><h2>{node.name}</h2><p>{node.location}</p><div className="node-meta"><span>Specialty (sample)</span><strong>{node.specialty}</strong></div><div className="node-meta"><span>Last sync (sample)</span><strong>{node.lastSync}</strong></div></article>)}</div>
      <section className="federated-results" aria-labelledby="federated-results-title">
        <div className="section-title">
          <div>
            <span className="page-eyebrow">EXPERIMENTAL SIMULATION</span>
            <h2 id="federated-results-title">FedAvg results</h2>
            <p>Python simulation output on synthetic data. These are not live hospital training metrics.</p>
          </div>
          <button className="secondary-action" type="button" onClick={loadFederatedResults} disabled={federatedLoading}>
            {federatedLoading ? "Loading…" : "Refresh results"}
          </button>
        </div>
        {federatedError ? (
          <div className="page-error" role="alert">
            <div><strong>Simulation results are unavailable.</strong><p>{federatedError}</p></div>
            <button className="secondary-action" type="button" onClick={loadFederatedResults} disabled={federatedLoading}>Retry</button>
          </div>
        ) : federatedLoading ? (
          <div className="page-loading" role="status">Loading versioned Python simulation results…</div>
        ) : federatedResults ? (
          <>
            <div className="federated-metrics">
              <article><span>Simulated clients</span><strong>{federatedResults.client_count}</strong></article>
              <article><span>Communication rounds</span><strong>{federatedResults.rounds}</strong></article>
              <article><span>Training status</span><strong>{federatedResults.status || "Completed snapshot"}</strong></article>
              <article><span>Evaluation accuracy</span><strong>{(federatedResults.accuracy * 100).toFixed(1)}%</strong></article>
              <article><span>Precision (class 1)</span><strong>{Number.isFinite(federatedResults.precision_class_1) ? `${(federatedResults.precision_class_1 * 100).toFixed(1)}%` : "Not reported"}</strong></article>
              <article><span>Recall (class 1)</span><strong>{Number.isFinite(federatedResults.recall_class_1) ? `${(federatedResults.recall_class_1 * 100).toFixed(1)}%` : "Not reported"}</strong></article>
              <article><span>F1 (class 1)</span><strong>{Number.isFinite(federatedResults.f1_class_1) ? `${(federatedResults.f1_class_1 * 100).toFixed(1)}%` : "Not reported"}</strong></article>
            </div>
            <div className="federated-progress">
              <div><span>Round completion in this results snapshot</span><strong>{federatedResults.rounds_completed ?? federatedResults.rounds} / {federatedResults.rounds}</strong></div>
              <div className="probability-track" role="progressbar" aria-label="Federated simulation round completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                <span className="probability-fill" style={{ width: `${progress}%` }} />
              </div>
              <small>A saved simulation result represents a completed run; this is not a live training-progress stream.</small>
            </div>
            <div className="analytics-panel">
              <div className="section-title"><div><h3>Per-round performance</h3><p>Only metrics emitted by the configured result file are plotted.</p></div></div>
              {roundMetrics.length ? (
                <div className="bar-chart" aria-label="Per-round federated performance">
                  {roundMetrics.map((round, index) => {
                    const accuracy = Number(round.accuracy);
                    const value = Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy <= 1 ? accuracy * 100 : accuracy)) : 0;
                    return <div className="bar-row" key={round.round ?? index}><span>Round {round.round ?? index + 1}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div><strong>{Number.isFinite(accuracy) ? `${value.toFixed(1)}%` : "—"}</strong></div>;
                  })}
                </div>
              ) : (
                <EmptyState icon="▥" title="Per-round metrics not included" description="The current Python simulator writes final evaluation metrics only. No per-round scores are fabricated; the result producer must add round_metrics to populate this chart." />
              )}
            </div>
            <p className="disclaimer-note">{federatedResults.interpretation || "Experimental simulation on synthetic data only. Results are descriptive, not clinical evidence or a privacy guarantee."}</p>
          </>
        ) : null}
      </section>
    </section>
  );
}

export function BlockchainPage({ history, onExport }) {
  const [verification, setVerification] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);

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
      <p className="disclaimer-note">Verification uses GET /integrity/audit/verify. The backend currently returns an integrity summary rather than a list of individually verified prediction records.</p>
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
