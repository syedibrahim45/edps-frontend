import { useState } from "react";
import { api } from "../api";

const symptomGroups = [
  {
    label: "Heart / breathing symptoms",
    symptoms: ["Chest discomfort", "Shortness of breath", "Palpitations", "Leg swelling"],
  },
  {
    label: "Kidney / urinary symptoms",
    symptoms: ["Reduced or changed urination", "Foamy or bloody urine", "Swelling around eyes or ankles", "Lower back / flank discomfort"],
  },
  {
    label: "Fever / infection symptoms",
    symptoms: ["Fever", "Chills", "Persistent cough", "Sore throat"],
  },
  {
    label: "Other symptoms",
    symptoms: ["Severe headache", "Dizziness or fainting", "Unusual fatigue", "Nausea or vomiting"],
  },
];

function PredictionForm({
  onPredictionComplete,
  onPredictionStart,
  onPredictionError,
  patients,
  loading,
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [temperature, setTemperature] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    bloodPressure: "",
    glucose: "",
    bmi: "",
    heartRate: "",
    cholesterol: "",
  });

  const handleChange = (e) => {
    if (["name", "age", "gender", "phone", "email"].includes(e.target.name)) {
      setSelectedPatientId("");
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePatientSelect = (event) => {
    const id = event.target.value;
    setSelectedPatientId(id);
    if (!id) return;

    const patient = patients.find((item) => String(item.id) === id);
    if (!patient) return;

    const gender = String(patient.gender || "").toLowerCase();
    setFormData((current) => ({
      ...current,
      name: patient.name || current.name,
      age: patient.age == null ? current.age : String(patient.age),
      gender: gender === "male" || gender === "m" || gender === "0"
        ? "Male"
        : gender === "female" || gender === "f" || gender === "1"
          ? "Female"
          : "",
      phone: patient.phone || "",
      email: patient.email || "",
      bloodPressure: patient.bloodPressure == null ? "" : String(patient.bloodPressure),
      glucose: patient.glucose == null ? "" : String(patient.glucose),
      bmi: patient.bmi == null ? "" : String(patient.bmi),
      heartRate: patient.heartRate == null ? "" : String(patient.heartRate),
      cholesterol: patient.cholesterol == null ? "" : String(patient.cholesterol),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setErrorMessage("");
      onPredictionStart?.();

      const patient = patients.find((item) => String(item.id) === selectedPatientId);
      const patientData = {
        ...(patient?.id == null ? {} : { id: patient.id }),
        name: formData.name.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        bloodPressure: Number(formData.bloodPressure),
        glucose: Number(formData.glucose),
        bmi: Number(formData.bmi),
        heartRate: Number(formData.heartRate),
        cholesterol: Number(formData.cholesterol),
      };
      const result = await api.createPrediction({
        ...(patient?.id == null ? {} : { patientId: patient.id }),
        patient: patientData,
      });

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The prediction service returned an invalid response.");
      }

      onPredictionComplete({
        ...result,
        patient: result.patient ?? patientData,
        reportedSymptoms: {
          items: selectedSymptoms,
          groups: symptomGroups
            .map((group) => ({
              category: group.label,
              items: group.symptoms.filter((symptom) => selectedSymptoms.includes(symptom)),
            }))
            .filter((group) => group.items.length > 0),
          temperatureC: temperature ? Number(temperature) : null,
        },
      });
    } catch (error) {
      const message = error.message || "An unexpected error occurred while requesting a prediction.";
      setErrorMessage(message);
      onPredictionError?.();
    }
  };

  const resetForm = () => {
    setSelectedSymptoms([]);
    setTemperature("");
    setSelectedPatientId("");
    setFormData({
      name: "",
      age: "",
      gender: "",
      phone: "",
      email: "",
      bloodPressure: "",
      glucose: "",
      bmi: "",
      heartRate: "",
      cholesterol: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="prediction-form">

      <div className="form-section-header">
        <div className="section-icon">♙</div>
        <div>
          <h2>Patient Health Information</h2>
          <p>Enter patient details for AI-based disease prediction</p>
        </div>
      </div>

      {errorMessage && <div className="prediction-error" role="alert">{errorMessage}</div>}

      <div className="form-grid">

        {/* PATIENT DETAILS */}
        <div className="form-card">

          <h3>
            <span>♙</span>
            Patient Details
          </h3>

          <div className="input-group full">
            <label htmlFor="existing-patient">Use a backend patient record (optional)</label>
            <select id="existing-patient" value={selectedPatientId} onChange={handlePatientSelect}>
              <option value="">Enter patient details manually</option>
              {patients.filter((patient) => patient.id != null).map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name || "Unnamed patient"}{patient.id != null ? ` · ID ${patient.id}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group full">
            <label htmlFor="prediction-patient-name">Patient Name</label>
            <input
              id="prediction-patient-name"
              type="text"
              name="name"
              placeholder="Enter patient name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="two-column">

            <div className="input-group">
              <label htmlFor="prediction-patient-age">Age</label>
              <input
                id="prediction-patient-age"
                type="number"
                min="1"
                max="120"
                step="1"
                name="age"
                placeholder="Enter age"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="prediction-patient-gender">Gender</label>

              <select
                id="prediction-patient-gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male (model code 0)</option>
                <option value="Female">Female (model code 1)</option>
              </select>
            </div>

          </div>

          <div className="input-group full">
            <label htmlFor="prediction-patient-phone">Phone Number</label>
            <input
              id="prediction-patient-phone"
              type="text"
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="input-group full">
            <label htmlFor="prediction-patient-email">Email Address</label>
            <input
              id="prediction-patient-email"
              type="email"
              name="email"
              placeholder="patient@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* HEALTH PARAMETERS */}
        <div className="form-card">

          <h3>
            <span>♡</span>
            Health Parameters
          </h3>

          <div className="two-column">

            <div className="input-group">
              <label htmlFor="prediction-blood-pressure">Blood Pressure (mmHg)</label>
              <input
                id="prediction-blood-pressure"
                type="number"
                min="40"
                max="300"
                name="bloodPressure"
                placeholder="e.g. 120"
                value={formData.bloodPressure}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="prediction-glucose">Glucose (mg/dL)</label>
              <input
                id="prediction-glucose"
                type="number"
                min="20"
                max="1000"
                name="glucose"
                placeholder="e.g. 100"
                value={formData.glucose}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="two-column">

            <div className="input-group">
              <label htmlFor="prediction-bmi">BMI</label>
              <input
                id="prediction-bmi"
                type="number"
                min="5"
                max="100"
                step="0.1"
                name="bmi"
                placeholder="e.g. 24.5"
                value={formData.bmi}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="prediction-heart-rate">Heart Rate (bpm)</label>
              <input
                id="prediction-heart-rate"
                type="number"
                min="20"
                max="250"
                name="heartRate"
                placeholder="e.g. 72"
                value={formData.heartRate}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="input-group full">
            <label htmlFor="prediction-cholesterol">Cholesterol (mg/dL)</label>
            <input
              id="prediction-cholesterol"
              type="number"
              min="50"
              max="1000"
              name="cholesterol"
              placeholder="e.g. 180"
              value={formData.cholesterol}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ai-note">
            🤖 Health features are sent to the configured Spring Boot API, which forwards them to the Python model. Avoid real identifying data in this academic demonstration.
          </div>

        </div>

      </div>

      <section className="symptom-form-section" aria-labelledby="symptom-form-title">
        <div className="symptom-section-heading">
          <div>
            <h3 id="symptom-form-title">Patient-reported symptoms <span>Optional</span></h3>
            <p>Optional local context only. Symptoms and temperature are not sent to the backend, analyzed by the model, or saved in prediction history.</p>
          </div>
          <label className="temperature-field">
            Temperature (°C)
            <input
              type="number"
              min="30"
              max="45"
              step="0.1"
              placeholder="e.g. 38.5"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
            />
          </label>
        </div>
        <div className="symptom-groups">
          {symptomGroups.map((group) => (
            <fieldset className="symptom-group" key={group.label}>
              <legend>{group.label}</legend>
              <div className="symptom-options">
                {group.symptoms.map((symptom) => (
                  <label className="symptom-option" key={symptom}>
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(symptom)}
                      onChange={(event) => setSelectedSymptoms((current) => (
                        event.target.checked
                          ? [...current, symptom]
                          : current.filter((item) => item !== symptom)
                      ))}
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="form-buttons">

        <button
          type="button"
          className="reset-btn"
          onClick={resetForm}
        >
          ↻ Reset
        </button>

        <button
          type="submit"
          className="analyze-btn"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "⌕ Analyze Health Risk"}
        </button>

      </div>

    </form>
  );
}

export default PredictionForm;