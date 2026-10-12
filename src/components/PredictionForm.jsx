import { useState } from "react";

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
  loading,
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [temperature, setTemperature] = useState("");
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requestData = {
      diseaseType: "",
      predictionResult: "",
      riskLevel: "",
      probability: 0,
      patient: {
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        bloodPressure: Number(formData.bloodPressure),
        glucose: Number(formData.glucose),
        bmi: Number(formData.bmi),
        heartRate: Number(formData.heartRate),
        cholesterol: Number(formData.cholesterol),
      },
    };

    try {
      setErrorMessage("");
      onPredictionStart?.();

      const response = await fetch("http://localhost:8080/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      let result;

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { message: responseText };
      }

      if (!response.ok) {
        const detail = result.message || result.error || result.detail;
        throw new Error(`Prediction service returned ${response.status}${detail ? `: ${detail}` : ""}`);
      }

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The prediction service returned an invalid response.");
      }

      onPredictionComplete({
        ...result,
        patient: result.patient ?? requestData.patient,
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
      console.error(error);
      const message = error instanceof TypeError
        ? "Cannot reach the prediction API at http://localhost:8080. Make sure the EDPS backend is running."
        : error.message || "An unexpected error occurred while requesting a prediction.";
      setErrorMessage(message);
      onPredictionError?.();
    }
  };

  const resetForm = () => {
    setSelectedSymptoms([]);
    setTemperature("");
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
            <label>Patient Name</label>
            <input
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
              <label>Age</label>
              <input
                type="number"
                name="age"
                placeholder="Enter age"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Gender</label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="1">Male</option>
                <option value="0">Female</option>
              </select>
            </div>

          </div>

          <div className="input-group full">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="input-group full">
            <label>Email Address</label>
            <input
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
              <label>Blood Pressure (mmHg)</label>
              <input
                type="number"
                name="bloodPressure"
                placeholder="e.g. 120"
                value={formData.bloodPressure}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Glucose (mg/dL)</label>
              <input
                type="number"
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
              <label>BMI</label>
              <input
                type="number"
                step="0.1"
                name="bmi"
                placeholder="e.g. 24.5"
                value={formData.bmi}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Heart Rate (bpm)</label>
              <input
                type="number"
                name="heartRate"
                placeholder="e.g. 72"
                value={formData.heartRate}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="input-group full">
            <label>Cholesterol (mg/dL)</label>
            <input
              type="number"
              name="cholesterol"
              placeholder="e.g. 180"
              value={formData.cholesterol}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ai-note">
            🤖 Your health parameters will be securely analyzed using
            our Machine Learning prediction model.
          </div>

        </div>

      </div>

      <section className="symptom-form-section" aria-labelledby="symptom-form-title">
        <div className="symptom-section-heading">
          <div>
            <h3 id="symptom-form-title">Patient-reported symptoms <span>Optional</span></h3>
            <p>Record what the patient is experiencing. These symptoms are shown as context and are not analyzed by the prediction model.</p>
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