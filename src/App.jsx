import { useEffect, useState } from "react";
import "./App.css";
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

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function App() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [patients, setPatients] = useState(() => readStoredList("edps-patients"));
  const [history, setHistory] = useState(() => readStoredList("edps-prediction-history"));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem("edps-patients", JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem("edps-prediction-history", JSON.stringify(history));
  }, [history]);

  const handlePredictionComplete = (result) => {
    setPrediction(result);
    setLoading(false);
    const savedRecord = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setHistory((records) => [savedRecord, ...records]);
    if (result.patient?.name) {
      setPatients((records) => {
        const alreadySaved = records.some((patient) => patient.name.toLowerCase() === result.patient.name.toLowerCase());
        return alreadySaved ? records : [{ ...result.patient, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...records];
      });
    }
  };

  const handlePredictionStart = () => {
    setLoading(true);
  };

  const handlePredictionError = () => {
    setLoading(false);
  };

  const getProbability = () => {
    if (!prediction) return 0;

    const value = Number(prediction.probability);

    return value <= 1
      ? Math.round(value * 100)
      : Math.round(value);
  };

  const probability = getProbability();

  const isHighRisk =
    prediction?.riskLevel?.toLowerCase().includes("high");

  const addPatient = (patient) => setPatients((records) => [patient, ...records]);

  const exportCsv = (records, filename) => {
    if (!records.length) return;
    const columns = ["createdAt", "patient", "diseaseType", "predictionResult", "riskLevel", "probability"];
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = records.map((record) => [
      record.createdAt,
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
        return <PatientsPage patients={patients} onAddPatient={addPatient} onDeletePatient={(id) => setPatients((records) => records.filter((patient) => patient.id !== id))} />;
      case "history":
        return <HistoryPage history={history} onClearHistory={() => setHistory([])} onExport={exportCsv} />;
      case "nodes":
        return <HospitalNodesPage />;
      case "blockchain":
        return <BlockchainPage history={history} onExport={exportCsv} />;
      case "analytics":
        return <AnalyticsPage patients={patients} history={history} />;
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

            <div className="system-online">
              <span></span>
              System Online
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
                  <p>{history.length ? `${history.length} prediction record${history.length === 1 ? "" : "s"} saved locally.` : "No prediction records yet. Complete a prediction to see activity here."}</p>
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
                <span className="avatar">👨‍⚕️</span>
                <span className="admin-user-copy"><strong>Admin User</strong><small>Administrator</small></span>
                <span aria-hidden="true">⌄</span>
              </button>
              {showProfileMenu && (
                <div className="header-popover profile-popover">
                  <strong>Administrator</strong>
                  <p>EDPS project workspace</p>
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
                  <strong>Local</strong>
                  <small>Browser-based records</small>
                </div>

                <div>
                  <strong>Demo</strong>
                  <small>Connected service required</small>
                </div>

              </div>

            </div>

          </section>


          {/* STATS */}

          <section className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon blue">♙</div>

              <div>
                <h3>{patients.length}</h3>
                <p>Patient Records</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon green">♡</div>

              <div>
                <h3>{history.length}</h3>
                <p>Saved Predictions</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon purple">▦</div>

              <div>
                <h3>{history.filter((record) => String(record.riskLevel || "").toLowerCase().includes("high")).length}</h3>
                <p>High-risk Results</p>
              </div>
            </div>


            <div className="stat-card">
              <div className="stat-icon teal">⬡</div>

              <div>
                <h3>4</h3>
                <p>Sample Hospital Nodes</p>
              </div>
            </div>

          </section>

          <section className="dashboard-recent">
            <div className="dashboard-section-heading">
              <div>
                <span className="page-eyebrow">WORKSPACE SNAPSHOT</span>
                <h2>Recent prediction activity</h2>
              </div>
              <button className="text-action" type="button" onClick={() => setActiveSection("history")}>View history</button>
            </div>
            {history.length ? (
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
                      <time>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "Date unavailable"}</time>
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
          </div>}

          {activeSection === "prediction" && <section className="dashboard-grid">

            {/* FORM */}

            <div className="prediction-panel">
              <PredictionForm
                onPredictionComplete={handlePredictionComplete}
                onPredictionStart={handlePredictionStart}
                onPredictionError={handlePredictionError}
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

                    <p>
                      Enter patient information and click
                      Analyze Health Risk.
                    </p>

                  </div>

                )}


                {prediction && (

                  <>

                    <div className="prediction-main">

                      <div
                        className={`confidence-circle ${
                          isHighRisk
                            ? "high-risk-circle"
                            : "low-risk-circle"
                        }`}
                      >

                        <strong>{probability}%</strong>

                        <span>Confidence</span>

                      </div>


                      <div
                        className={`risk-message ${
                          isHighRisk
                            ? "high-risk"
                            : "low-risk"
                        }`}
                      >

                        <h1>
                          {isHighRisk
                            ? "⚠ High Risk"
                            : "✓ Low Risk"}
                        </h1>

                        <h3>
                          {isHighRisk
                            ? "Potential Disease Risk Detected"
                            : "Health Risk Appears Low"}
                        </h3>

                        <p>
                          AI model analysis completed based on the
                          patient's health parameters.
                        </p>

                      </div>

                    </div>


                    <div className="result-details">

                      <div>
                        <span>Disease Type</span>
                        <strong>
                          {prediction.diseaseType}
                        </strong>
                      </div>

                      <div>
                        <span>Prediction</span>
                        <strong>
                          {prediction.predictionResult}
                        </strong>
                      </div>

                      <div>
                        <span>Risk Level</span>
                        <strong
                          className={
                            isHighRisk
                              ? "red-text"
                              : "green-text"
                          }
                        >
                          {prediction.riskLevel}
                        </strong>
                      </div>

                      <div>
                        <span>Probability</span>
                        <strong>
                          {probability}%
                        </strong>
                      </div>

                    </div>

                    <div className="reported-symptoms-card">
                      <div className="symptoms-result-heading">
                        <div>
                          <h3>Patient-reported symptoms</h3>
                          <p>Context recorded from the form; not analyzed by the AI model.</p>
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

                      <h3>💡 AI Insight</h3>

                      <p>
                        Based on the provided health parameters,
                        the Machine Learning model has analyzed
                        the patient's potential disease risk.
                        Further medical consultation is recommended
                        for high-risk predictions.
                      </p>

                    </div>


                    <div className="technology-result">

                      <div>
                        ⚙
                        <span>Machine Learning</span>
                      </div>

                      <div>
                        ⬡
                        <span>Blockchain</span>
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
                  Blockchain is an architectural concept in this project; this demo does not connect to a blockchain network.
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