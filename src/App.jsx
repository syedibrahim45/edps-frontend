import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { api, probabilityPercent } from "./api";
import PredictionForm from "./components/PredictionForm";
import {
  AboutPage,
  AnalyticsPage,
  BlockchainPage,
  HistoryPage,
  HospitalNodesPage,
  PatientsPage,
} from "./components/WorkspacePages";

const navigationItems = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "prediction", icon: "♡", label: "Disease Prediction" },
  { id: "patients", icon: "♙", label: "Patients" },
  { id: "history", icon: "◷", label: "Prediction History" },
  { id: "nodes", icon: "▦", label: "Hospital Nodes" },
  { id: "blockchain", icon: "⬡", label: "Blockchain Audit" },
  { id: "analytics", icon: "▥", label: "Analytics" },
  { id: "about", icon: "ⓘ", label: "About EDPS" },
];

function App() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadPatients = useCallback(async () => {
    setPatientLoading(true);
    setPatientError("");
    try {
      setPatients(await api.getPatients());
      return true;
    } catch (error) {
      setPatientError(error.message || "Patient records could not be loaded.");
      return false;
    } finally {
      setPatientLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      setHistory(await api.getPredictions());
      return true;
    } catch (error) {
      setHistoryError(error.message || "Prediction history could not be loaded.");
      return false;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api.getPatients()
      .then((records) => {
        if (active) setPatients(records);
      })
      .catch((error) => {
        if (active) setPatientError(error.message || "Patient records could not be loaded.");
      })
      .finally(() => {
        if (active) setPatientLoading(false);
      });

    api.getPredictions()
      .then((records) => {
        if (active) setHistory(records);
      })
      .catch((error) => {
        if (active) setHistoryError(error.message || "Prediction history could not be loaded.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handlePredictionComplete = (result) => {
    setPrediction(result);
    setLoading(false);
    loadHistory();
    loadPatients();
  };

  const handlePredictionStart = () => {
    setLoading(true);
  };

  const handlePredictionError = () => {
    setLoading(false);
  };

  const formatGender = (gender) => {
    const normalized = String(gender || "").trim().toLowerCase();
    if (["male", "m", "0"].includes(normalized)) return "Male";
    if (["female", "f", "1"].includes(normalized)) return "Female";
    return gender || "Not provided";
  };

  const probability = probabilityPercent(prediction?.probability);
  const riskLevel = String(prediction?.riskLevel || prediction?.predictionResult || "");
  const isHighRisk = riskLevel.toLowerCase().includes("high");
  const isLowRisk = riskLevel.toLowerCase().includes("low");
  const explainability = prediction?.explainability
    ?? prediction?.explanation
    ?? prediction?.featureContributions
    ?? prediction?.featureImportance
    ?? prediction?.feature_importance;
  const explainabilityEntries = typeof explainability === "string"
    ? [["Model explanation", explainability]]
    : Array.isArray(explainability)
      ? explainability.map((item, index) => {
        const value = item.contribution
          ?? item.impact
          ?? item.importance
          ?? item.mean_importance
          ?? item.value;
        const formattedValue = value === undefined
          ? "Available"
          : typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value);
        const deviation = item.std_importance == null ? "" : ` ± ${item.std_importance}`;
        return [item.feature || item.name || `Factor ${index + 1}`, `${formattedValue}${deviation}`];
      })
      : explainability && typeof explainability === "object"
        ? Object.entries(explainability).map(([label, value]) => [
          label,
          typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
        ])
        : [];

  const withAction = async (action) => {
    setActionLoading(true);
    setActionError("");
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error.message || "The requested action could not be completed.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const addPatient = (patient) => withAction(async () => {
    await api.createPatient(patient);
    await loadPatients();
  });

  const updatePatient = (id, patient) => withAction(async () => {
    await api.updatePatient(id, patient);
    await loadPatients();
  });

  const deletePatient = (id) => withAction(async () => {
    await api.deletePatient(id);
    await loadPatients();
    await loadHistory();
  });

  const clearHistory = () => withAction(async () => {
    if (history.some((record) => record.id == null)) {
      throw new Error("The backend history response is missing record IDs, so it cannot be safely cleared.");
    }
    const results = await Promise.allSettled(
      history.map((record) => api.deletePrediction(record.id)),
    );
    await loadHistory();
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount) {
      throw new Error(`${failedCount} prediction record${failedCount === 1 ? "" : "s"} could not be deleted. The history has been refreshed.`);
    }
  });

  const exportCsv = (records, filename) => {
    if (!records.length) return;
    const columns = ["createdAt", "patient", "diseaseType", "predictionResult", "riskLevel", "probability"];
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = records.map((record) => [
      record.createdAt || record.timestamp || record.predictedAt,
      record.patient?.name,
      record.diseaseType,
      record.predictionResult,
      record.riskLevel,
      record.probability,
    ]);
    const csv = [columns.map(escapeCsv), ...rows.map((row) => row.map(escapeCsv))].map((row) => row.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderActivePage = () => {
    switch (activeSection) {
      case "patients":
        return <PatientsPage patients={patients} loading={patientLoading} error={patientError} actionError={actionError} actionLoading={actionLoading} onRetry={loadPatients} onAddPatient={addPatient} onUpdatePatient={updatePatient} onDeletePatient={deletePatient} />;
      case "history":
        return <HistoryPage history={history} loading={historyLoading} error={historyError} actionError={actionError} actionLoading={actionLoading} onRetry={loadHistory} onClearHistory={clearHistory} onExport={exportCsv} />;
      case "nodes":
        return <HospitalNodesPage />;
      case "blockchain":
        return <BlockchainPage history={history} onExport={exportCsv} />;
      case "analytics":
        return <AnalyticsPage patients={patients} history={history} loading={patientLoading || historyLoading} patientError={patientError} historyError={historyError} onRetry={() => { loadPatients(); loadHistory(); }} />;
      case "about":
        return <AboutPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-logo">

          <div className="logo-icon">
            ✚
          </div>

          <div>
            <h2>EDPS</h2>
            <p>Early Disease Prediction System</p>
            <small>Sri Siddhartha School of Engineering</small>
          </div>

        </div>

        <nav className="sidebar-menu" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              className={`menu-item ${activeSection === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              title={item.label}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => {
                setActiveSection(item.id);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="secure-box">

            <div className="secure-icon">⬡</div>

            <h3>Secure & Trusted</h3>

            <p>
              Blockchain-based
              <br />
              Health Data Integrity
            </p>

          </div>

          <div className="project-footer">
            © 2026 EDPS Project
            <br />
            Computer Science & Engineering
          </div>

        </div>

      </aside>


      {/* MAIN */}
      <main className="main-content">

        {/* TOP HEADER */}

        <header className="top-header">

          <div className="technology-info institution-info">
            <strong>Sri Siddhartha School of Engineering</strong>
            <span>Computer Science & Engineering · Academic Project</span>
          </div>

          <div className="header-right">

            <div className="system-online" title={`Configured API: ${api.baseUrl}`}>
              <span></span>
              API configured
            </div>

            <div className="header-menu-wrap">
              <button
                className="notification"
                type="button"
                aria-label="Show system notifications"
                aria-expanded={showNotifications}
                onClick={() => {
                  setShowNotifications((visible) => !visible);
                  setShowProfileMenu(false);
                }}
              >
                ♧<sup>{history.length ? Math.min(history.length, 9) : "!"}</sup>
              </button>
              {showNotifications && (
                <div className="header-popover">
                  <strong>System notifications</strong>
                  <p>{history.length ? `${history.length} prediction record${history.length === 1 ? "" : "s"} returned by the backend.` : historyLoading ? "Loading backend prediction activity…" : historyError || "No backend prediction records yet."}</p>
                  <button type="button" className="text-action" onClick={() => { setActiveSection("history"); setShowNotifications(false); }}>View prediction history</button>
                </div>
              )}
            </div>

            <div className="header-menu-wrap">
              <button
                className="admin-user"
                type="button"
                aria-expanded={showProfileMenu}
                onClick={() => {
                  setShowProfileMenu((visible) => !visible);
                  setShowNotifications(false);
                }}
              >
                <span className="avatar">✚</span>
                <span className="admin-user-copy"><strong>Demo Workspace</strong><small>Authentication pending</small></span>
                <span aria-hidden="true">⌄</span>
              </button>
              {showProfileMenu && (
                <div className="header-popover profile-popover">
                  <strong>Authentication pending</strong>
                  <p>This academic demo has no backend authentication.</p>
                  <button type="button" className="text-action" onClick={() => { setActiveSection("about"); setShowProfileMenu(false); }}>About this project</button>
                </div>
              )}
            </div>

          </div>

        </header>


        <div className="dashboard-content">

          {activeSection === "dashboard" && <>
          {/* HERO */}

          <section className="hero-section">

            <div className="hero-content">

              <div className="hero-badge">
                Academic project · Sri Siddhartha School of Engineering
              </div>

              <h1>
                Early Disease Prediction System
              </h1>

              <h2>
                Predict Health Risks
                <span> Before They Become Serious</span>
              </h2>

              <p>
                Exploring disease-risk prediction, privacy-aware healthcare data,
                and responsible use of machine-learning concepts.
              </p>

              <div className="hero-features">

                <div>◉ Risk awareness</div>
                <div>◇ Privacy-conscious concept</div>
                <div>↗ Earlier review support</div>

              </div>

            </div>


            <div className="hero-medical">

              <div className="doctor-circle doctor-one">
                👨‍⚕️
              </div>

              <div className="doctor-circle doctor-two">
                👩‍⚕️
              </div>

              <div className="medical-text">
                AI
                <br />
                HEALTH
              </div>

            </div>


            <div className="hero-trust">

              <p>ACADEMIC PROJECT</p>

              <h2>EDPS</h2>

              <span>Computer Science & Engineering</span>

              <div className="trust-divider"></div>

              <div className="trust-stats">

                <div>
                  <strong>Backend</strong>
                  <small>Authoritative records</small>
                </div>

                <div>
                  <strong>API</strong>
                  <small>Connection not health-checked</small>
                </div>

              </div>

            </div>

          </section>


          {/* STATS */}

          <section className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon blue">♙</div>

              <div>
                <h3>{patientLoading ? "…" : patientError ? "—" : patients.length}</h3>
                <p>Patient Records</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon green">♡</div>

              <div>
                <h3>{historyLoading ? "…" : historyError ? "—" : history.length}</h3>
                <p>Saved Predictions</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon purple">▦</div>

              <div>
                <h3>{historyLoading ? "…" : historyError ? "—" : history.filter((record) => String(record.riskLevel || "").toLowerCase().includes("high")).length}</h3>
                <p>High-risk Results</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon teal">⬡</div>

              <div>
                <h3>4</h3>
                <p>Simulated nodes</p>
              </div>
            </div>

          </section>

          {(patientError || historyError) && (
            <div className="page-error dashboard-api-error" role="alert">
              <div>
                <strong>Some dashboard data is unavailable.</strong>
                {patientError && <p>{patientError}</p>}
                {historyError && <p>{historyError}</p>}
              </div>
              <button className="secondary-action" type="button" onClick={() => { loadPatients(); loadHistory(); }}>Retry</button>
            </div>
          )}

          <section className="dashboard-recent">
            <div className="dashboard-section-heading">
              <div>
                <span className="page-eyebrow">WORKSPACE SNAPSHOT</span>
                <h2>Recent prediction activity</h2>
              </div>
              <button className="text-action" type="button" onClick={() => setActiveSection("history")}>View history</button>
            </div>
            {historyLoading ? (
              <div className="page-loading" role="status">Loading backend prediction activity…</div>
            ) : history.length ? (
              <div className="dashboard-activity-list">
                {history.slice(0, 4).map((record) => {
                  const riskLevel = String(record.riskLevel || "Unknown");
                  const riskClass = riskLevel.toLowerCase().includes("high")
                    ? "status-danger"
                    : riskLevel.toLowerCase().includes("low")
                      ? "status-success"
                      : "status-warning";
                  return (
                    <article className="dashboard-activity-row" key={record.id}>
                      <div><strong>{record.patient?.name || "Patient record"}</strong><span>{record.diseaseType || "Prediction"}</span></div>
                      <span className={`status-pill ${riskClass}`}>{riskLevel}</span>
                      <time>{record.createdAt || record.timestamp || record.predictedAt ? new Date(record.createdAt || record.timestamp || record.predictedAt).toLocaleDateString() : "Date unavailable"}</time>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty">
                <div><strong>No prediction activity yet</strong><p>Start a prediction to see saved responses summarized here.</p></div>
                <button className="primary-action" type="button" onClick={() => setActiveSection("prediction")}>Start prediction</button>
              </div>
            )}
          </section>

          </>}

          {activeSection === "prediction" && <div className="prediction-page-heading">
            <span className="page-eyebrow">PREDICTION WORKSPACE</span>
            <h1>Disease Prediction</h1>
            <p>Enter patient information to request a response from the configured prediction service.</p>
            <p className="disclaimer-note">Academic demonstration only. Predictions are not medical diagnoses and must not guide treatment or emergency decisions.</p>
          </div>}

          {activeSection === "prediction" && <section className="dashboard-grid">

            {/* FORM */}

            <div className="prediction-panel">
              <PredictionForm
                onPredictionComplete={handlePredictionComplete}
                onPredictionStart={handlePredictionStart}
                onPredictionError={handlePredictionError}
                patients={patients}
                loading={loading}
              />
            </div>


            {/* RESULTS */}

            <div className="result-column">

              <div className="result-card">

                <div className="result-header">

                  <h2>
                    🤖 AI Prediction Result
                  </h2>

                  {prediction && (
                    <span className="completed">
                      Prediction Completed ✓
                    </span>
                  )}

                </div>


                {!prediction && (

                  <div className="empty-result">

                    <div className="empty-icon">
                      🤖
                    </div>

                    <h3>No Prediction Yet</h3>

                    <p role={loading ? "status" : undefined}>
                      {loading
                        ? "Sending the patient features to the Spring Boot prediction endpoint…"
                        : "Enter patient information and request a prediction from the backend."}
                    </p>

                  </div>

                )}


                {prediction && (

                  <>

                    <div className="prediction-main">

                      <div
                        className={`confidence-circle ${
                          isHighRisk ? "high-risk-circle" : isLowRisk ? "low-risk-circle" : "unknown-risk-circle"
                        }`}
                        style={{ "--probability-angle": `${(probability ?? 0) * 3.6}deg` }}
                        role="img"
                        aria-label={probability == null ? "Risk probability not provided" : `Risk probability ${probability}%`}
                      >

                        <strong>{probability == null ? "—" : `${probability}%`}</strong>

                        <span>Risk probability</span>

                      </div>


                      <div
                        className={`risk-message ${
                          isHighRisk
                            ? "high-risk"
                            : isLowRisk
                              ? "low-risk"
                              : "unclassified-risk"
                        }`}
                      >

                        <h1>
                          {isHighRisk ? "⚠ High Risk" : isLowRisk ? "✓ Low Risk" : "Risk Unclassified"}
                        </h1>

                        <h3>
                          {isHighRisk
                            ? "Potential Disease Risk Detected"
                            : isLowRisk
                              ? "Health Risk Appears Low"
                              : "The backend did not return a recognized risk category"}
                        </h3>

                        <p>
                          Result returned by the configured Spring Boot and ML service for this submission.
                        </p>

                      </div>

                    </div>


                    <div className="result-details">

                      <div>
                        <span>Disease Type</span>
                        <strong>{prediction.diseaseType || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Prediction</span>
                        <strong>{prediction.predictionResult || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Risk Level</span>
                        <strong
                          className={isHighRisk ? "red-text" : isLowRisk ? "green-text" : ""}
                        >
                          {prediction.riskLevel || "Unclassified"}
                        </strong>
                      </div>

                      <div>
                        <span>Probability</span>
                        <strong>{probability == null ? "Not provided" : `${probability}%`}</strong>
                      </div>

                    </div>

                    {probability != null && (
                      <div className="probability-meter">
                        <div className="probability-meter-label"><span>Estimated risk probability</span><strong>{probability}%</strong></div>
                        <div className="probability-track" role="progressbar" aria-label="Estimated risk probability" aria-valuemin="0" aria-valuemax="100" aria-valuenow={probability}>
                          <span className={isHighRisk ? "probability-fill probability-fill-high" : isLowRisk ? "probability-fill" : "probability-fill probability-fill-unknown"} style={{ width: `${probability}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="prediction-provenance">
                      <span>Patient: <strong>{prediction.patient?.name || "Not returned"}</strong></span>
                      {prediction.patient?.id != null && <span>Patient ID: <strong>{prediction.patient.id}</strong></span>}
                      {prediction.patient?.age != null && <span>Age: <strong>{prediction.patient.age}</strong></span>}
                      {prediction.patient?.gender && <span>Gender: <strong>{formatGender(prediction.patient.gender)}</strong></span>}
                      <span>Recorded: <strong>{prediction.createdAt || prediction.timestamp || prediction.predictedAt ? new Date(prediction.createdAt || prediction.timestamp || prediction.predictedAt).toLocaleString() : "Timestamp unavailable"}</strong></span>
                    </div>

                    <div className="reported-symptoms-card">
                      <div className="symptoms-result-heading">
                        <div>
                          <h3>Patient-reported symptoms</h3>
                          <p>Local page context only; not sent to the model or saved by the backend.</p>
                        </div>
                        {prediction.reportedSymptoms?.temperatureC != null && (
                          <span className="temperature-badge">🌡 {prediction.reportedSymptoms.temperatureC} °C</span>
                        )}
                      </div>
                      {prediction.reportedSymptoms?.groups?.length ? (
                        <div className="reported-symptom-groups">
                          {prediction.reportedSymptoms.groups.map((group) => (
                            <div className="reported-symptom-group" key={group.category}>
                              <strong>{group.category}</strong>
                              <div className="symptom-tags">
                                {group.items.map((symptom) => <span key={symptom}>{symptom}</span>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-symptoms">No symptoms were selected for this assessment.</p>
                      )}
                      {prediction.reportedSymptoms?.temperatureC >= 39 && (
                        <p className="temperature-warning" role="note">A recorded temperature of 39 °C or higher is high. Seek prompt advice from a qualified healthcare professional, especially if symptoms are severe or persistent.</p>
                      )}
                      <p className="symptoms-disclaimer">Symptoms alone do not confirm heart, kidney, or other disease. Seek urgent medical care for chest pain, severe difficulty breathing, fainting, confusion, or other severe symptoms; do not wait for an app result.</p>
                    </div>


                    <div className="ai-insight">
                      <h3>Model response</h3>
                      <p>
                        {prediction.modelExplanation
                          || (explainability
                            ? "The backend returned additional explainability information below."
                            : null)
                          || "The backend returned the classification and probability above. Feature-level explainability is not included in this prediction response."}
                        {" "}This academic result is not a medical diagnosis.
                      </p>
                    </div>

                    {explainabilityEntries.length > 0 && (
                      <section className="explainability-card" aria-labelledby="explainability-title">
                        <h3 id="explainability-title">Model explainability returned by the service</h3>
                        <dl>
                          {explainabilityEntries.map(([label, value], index) => (
                            <div key={`${label}-${index}`}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    )}


                    <div className="technology-result">

                      <div>
                        ⚙
                        <span>Machine Learning</span>
                      </div>

                      <div>
                        ⬡
                        <span>Hash-chain audit</span>
                      </div>

                      <div>
                        ⚡
                        <span>Real-Time Prediction</span>
                      </div>

                    </div>

                  </>

                )}

              </div>


              {/* BLOCKCHAIN */}

              <div className="blockchain-card">

                <div className="blockchain-header">

                  <h2>
                    🛡 Blockchain Security
                  </h2>

                  <span>Not connected</span>

                </div>

                <p>
                  The backend maintains a MySQL-backed SHA-256 audit hash chain. This academic demo does not connect to a distributed blockchain network.
                </p>

                <div className="blockchain-status">

                  <div>
                    <small>Security Status</small>
                    <strong>Demo only</strong>
                  </div>

                  <div>
                    <small>Data Integrity</small>
                    <strong>Not available</strong>
                  </div>

                </div>

              </div>

            </div>

          </section>}

          {!['dashboard', 'prediction'].includes(activeSection) && renderActivePage()}

        </div>

      </main>

    </div>
  );
}

export default App;