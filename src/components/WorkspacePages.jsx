import { useMemo, useState } from "react";

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

export function PatientsPage({ patients, onAddPatient, onDeletePatient }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", gender: "", email: "", phone: "" });
  const filteredPatients = patients.filter((patient) =>
    `${patient.name} ${patient.email} ${patient.phone}`.toLowerCase().includes(search.toLowerCase()),
  );

  const submitPatient = (event) => {
    event.preventDefault();
    onAddPatient({ ...form, age: Number(form.age), id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    setForm({ name: "", age: "", gender: "", email: "", phone: "" });
    setShowForm(false);
  };

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="PATIENT DIRECTORY"
        title="Patients"
        description="Manage the patient records saved on this device. Records are stored locally in this browser."
        action={<button className="primary-action" onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Cancel" : "+ Add patient"}</button>}
      />
      {showForm && (
        <form className="inline-form" onSubmit={submitPatient}>
          <h2>Add a patient record</h2>
          <div className="inline-form-grid">
            <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Patient name" /></label>
            <label>Age<input required min="0" max="120" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="Age" /></label>
            <label>Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></label>
            <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" /></label>
          </div>
          <button className="primary-action" type="submit">Save patient</button>
        </form>
      )}
      <div className="page-toolbar">
        <label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" /></label>
        <span>{filteredPatients.length} {filteredPatients.length === 1 ? "record" : "records"}</span>
      </div>
      {filteredPatients.length === 0 ? (
        <EmptyState icon="♙" title={search ? "No matching patients" : "No patient records yet"} description={search ? "Try a different name, email, or phone number." : "Add a patient here or save one when a prediction is completed."} />
      ) : (
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Age</th><th>Gender</th><th>Contact</th><th>Added</th><th>Action</th></tr></thead><tbody>
          {filteredPatients.map((patient) => <tr key={patient.id}><td><strong>{patient.name}</strong></td><td>{patient.age || "—"}</td><td>{patient.gender || "—"}</td><td>{patient.email || patient.phone || "—"}</td><td>{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : "—"}</td><td><button className="text-action danger-action" onClick={() => onDeletePatient(patient.id)} aria-label={`Delete ${patient.name}`}>Remove</button></td></tr>)}
        </tbody></table></div>
      )}
    </section>
  );
}

export function HistoryPage({ history, onClearHistory, onExport }) {
  const [search, setSearch] = useState("");
  const filteredHistory = history.filter((record) =>
    `${record.patient?.name || ""} ${record.diseaseType || ""} ${record.riskLevel || ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="workspace-page">
      <PageHeading eyebrow="MODEL ACTIVITY" title="Prediction history" description="Review completed prediction responses returned by the connected service." action={<div className="heading-actions"><button className="secondary-action" onClick={() => onExport(filteredHistory, "prediction-history.csv")}>Export CSV</button><button className="secondary-action danger-action" onClick={onClearHistory} disabled={!history.length}>Clear history</button></div>} />
      <div className="page-toolbar"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, disease, or risk" /></label><span>{filteredHistory.length} predictions</span></div>
      {filteredHistory.length === 0 ? <EmptyState icon="◷" title={search ? "No matching predictions" : "No predictions recorded"} description={search ? "Try another search term." : "Completed predictions will appear here after the prediction service responds."} /> : (
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Patient</th><th>Disease</th><th>Result</th><th>Risk</th><th>Probability</th></tr></thead><tbody>
          {filteredHistory.map((record) => <tr key={record.id}><td>{new Date(record.createdAt).toLocaleString()}</td><td>{record.patient?.name || "—"}</td><td>{record.diseaseType || "—"}</td><td>{record.predictionResult || "—"}</td><td><span className={`status-pill ${String(record.riskLevel).toLowerCase().includes("high") ? "status-danger" : "status-success"}`}>{record.riskLevel || "Unknown"}</span></td><td>{Number(record.probability) <= 1 ? `${Math.round(Number(record.probability) * 100)}%` : `${Math.round(Number(record.probability))}%`}</td></tr>)}
        </tbody></table></div>
      )}
    </section>
  );
}

export function HospitalNodesPage() {
  const [lastChecked, setLastChecked] = useState(null);
  const onlineCount = hospitalNodes.filter((node) => node.status === "Online").length;
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="FEDERATED NETWORK" title="Hospital nodes" description="View the sample hospital network configured for federated learning." action={<button className="secondary-action" onClick={() => setLastChecked(new Date())}>↻ Refresh status</button>} />
      {lastChecked && <div className="inline-notice" role="status">Node list refreshed locally at {lastChecked.toLocaleTimeString()}. Live connectivity requires a configured backend.</div>}
      <div className="overview-cards"><article><span>Configured nodes</span><strong>{hospitalNodes.length}</strong></article><article><span>Online in sample data</span><strong>{onlineCount}</strong></article><article><span>Network coverage</span><strong>Federated</strong></article></div>
      <div className="node-grid">{hospitalNodes.map((node) => <article className="node-card" key={node.id}><div className="node-card-top"><span className="node-icon">▦</span><span className={`status-pill ${node.status === "Online" ? "status-success" : "status-warning"}`}>{node.status}</span></div><span className="page-eyebrow">{node.id}</span><h2>{node.name}</h2><p>{node.location}</p><div className="node-meta"><span>Specialty</span><strong>{node.specialty}</strong></div><div className="node-meta"><span>Last sync (sample)</span><strong>{node.lastSync}</strong></div></article>)}</div>
      <p className="disclaimer-note">Node names and statuses shown here are illustrative sample data; no live hospital connections are configured.</p>
    </section>
  );
}

export function BlockchainPage({ history, onExport }) {
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="AUDIT & INTEGRITY" title="Blockchain audit" description="Local audit view for prediction records saved by this browser." action={<button className="secondary-action" onClick={() => onExport(history, "edps-audit-records.csv")}>Export audit CSV</button>} />
      <div className="audit-banner"><span>⬡</span><div><strong>Local audit log</strong><p>This interface does not connect to a blockchain network. Entries below are browser records, not on-chain proofs.</p></div></div>
      <div className="overview-cards"><article><span>Saved records</span><strong>{history.length}</strong></article><article><span>Integrity proof</span><strong>Not connected</strong></article><article><span>Storage</span><strong>This browser</strong></article></div>
      {history.length === 0 ? <EmptyState icon="⬡" title="No audit entries yet" description="Prediction responses saved to history will be listed here." /> : <div className="audit-list">{history.map((record) => <article className="audit-entry" key={record.id}><div className="audit-marker">✓</div><div><strong>{record.patient?.name || "Patient record"} · {record.diseaseType || "Prediction"}</strong><p>{record.riskLevel || "Result saved"} · {new Date(record.createdAt).toLocaleString()}</p><code>{record.id}</code></div></article>)}</div>}
    </section>
  );
}

export function AnalyticsPage({ patients, history }) {
  const riskCounts = useMemo(() => history.reduce((counts, item) => {
    const key = String(item.riskLevel || "Unknown").toLowerCase().includes("high") ? "High risk" : "Low / other";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { "High risk": 0, "Low / other": 0 }), [history]);
  const total = history.length;
  return (
    <section className="workspace-page">
      <PageHeading eyebrow="OVERVIEW & TRENDS" title="Analytics" description="A summary of locally saved patient and prediction records. No clinical conclusions are generated here." />
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
      <div className="about-card"><div className="about-mark">✚</div><div><h2>Early Disease Prediction System</h2><p>EDPS is a project interface for exploring a connected disease-risk prediction service, patient record management, and federated healthcare concepts.</p><div className="about-feature-list"><span>AI / machine-learning service integration</span><span>Patient records saved locally in this browser</span><span>Sample hospital-node directory</span><span>Local prediction activity and audit views</span></div></div></div>
      <div className="inline-notice">Predictions require the configured backend service. This application is a project demonstration and does not provide medical diagnosis or emergency care.</div>
    </section>
  );
}
