import { useRef, useState } from "react";
import { api } from "../api";

const binaryFields = [
  { name: "HighBP", label: "High blood pressure", helper: "Ever told by a health professional that you have high blood pressure." },
  { name: "HighChol", label: "High cholesterol", helper: "Ever told by a health professional that you have high cholesterol." },
  { name: "CholCheck", label: "Cholesterol check", helper: "Cholesterol checked within the prior five years." },
  { name: "Smoker", label: "Smoking history", helper: "Smoked at least 100 cigarettes in your lifetime." },
  { name: "Stroke", label: "Stroke history", helper: "Ever told that you had a stroke." },
  { name: "HeartDiseaseorAttack", label: "Heart disease or heart attack", helper: "Reported coronary heart disease or myocardial infarction." },
  { name: "PhysActivity", label: "Physical activity", helper: "Physical activity in the prior 30 days, outside regular work." },
  { name: "Fruits", label: "Daily fruit consumption", helper: "Consumed fruit at least once per day." },
  { name: "Veggies", label: "Daily vegetable consumption", helper: "Consumed vegetables at least once per day." },
  { name: "HvyAlcoholConsump", label: "Heavy alcohol consumption", helper: "Dataset-coded heavy alcohol consumption indicator." },
  { name: "AnyHealthcare", label: "Health-care coverage", helper: "Any health-care coverage." },
  { name: "NoDocbcCost", label: "Could not see a doctor due to cost", helper: "Unable to see a doctor due to cost in the prior 12 months." },
  { name: "DiffWalk", label: "Difficulty walking", helper: "Serious difficulty walking or climbing stairs." },
  {
    name: "Sex",
    label: "Dataset-coded sex",
    helper: "Use the category recorded for the survey: 0 = female, 1 = male.",
    options: [
      { value: 0, label: "0 — Female" },
      { value: 1, label: "1 — Male" },
    ],
  },
];

const ordinalFields = [
  {
    name: "GenHlth",
    label: "General health",
    helper: "Survey self-rating, ordered from best (1) to worst (5).",
    min: 1,
    max: 5,
  },
  {
    name: "MentHlth",
    label: "Days of poor mental health",
    helper: "Number of days during the last 30 days.",
    min: 0,
    max: 30,
  },
  {
    name: "PhysHlth",
    label: "Days of poor physical health",
    helper: "Number of days during the last 30 days.",
    min: 0,
    max: 30,
  },
  {
    name: "Age",
    label: "Age category code",
    helper: "Choose the survey's category code, not an exact age. Category meanings are not expanded here.",
    min: 1,
    max: 13,
  },
  {
    name: "Education",
    label: "Education category code",
    helper: "Choose the survey's category code. Category meanings are not expanded here.",
    min: 1,
    max: 6,
  },
  {
    name: "Income",
    label: "Income category code",
    helper: "Choose the survey's category code. Category meanings are not expanded here.",
    min: 1,
    max: 8,
  },
];

const featureNames = [
  ...binaryFields.map(({ name }) => name),
  "BMI",
  ...ordinalFields.map(({ name }) => name),
];

const initialForm = Object.fromEntries(featureNames.map((name) => [name, ""]));
const datasetLabels = {
  0: "No diabetes reported in dataset label",
  1: "Prediabetes or diabetes reported in dataset label",
};

function validateForm(form) {
  const errors = {};
  const payload = {};

  for (const field of binaryFields) {
    const rawValue = form[field.name];
    const options = field.options || [
      { value: 0, label: "No" },
      { value: 1, label: "Yes" },
    ];
    const numericValue = Number(rawValue);
    if (rawValue === "" || !Number.isInteger(numericValue)
        || !options.some((option) => option.value === numericValue)) {
      errors[field.name] = "Choose one of the listed survey responses.";
    } else {
      payload[field.name] = numericValue;
    }
  }

  const bmiText = form.BMI.trim();
  const bmiPattern = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  const bmi = Number(bmiText);
  if (!bmiText || !bmiPattern.test(bmiText) || !Number.isFinite(bmi)) {
    errors.BMI = "Enter a finite numeric BMI value.";
  } else {
    payload.BMI = bmi;
  }

  for (const field of ordinalFields) {
    const rawValue = form[field.name];
    const numericValue = Number(rawValue);
    if (rawValue === "" || !/^-?\d+$/.test(rawValue)
        || !Number.isInteger(numericValue)
        || numericValue < field.min || numericValue > field.max) {
      errors[field.name] = `Choose an integer category from ${field.min} to ${field.max}.`;
    } else {
      payload[field.name] = numericValue;
    }
  }

  return { errors, payload };
}

function validateResponse(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)
      || !Number.isInteger(result.predicted_class)
      || !Object.hasOwn(datasetLabels, result.predicted_class)
      || result.predicted_label !== datasetLabels[result.predicted_class]
      || !Number.isFinite(result.positive_class_score)
      || result.positive_class_score < 0 || result.positive_class_score > 1
      || !Number.isFinite(result.threshold)
      || result.threshold < 0 || result.threshold > 1
      || typeof result.model_id !== "string" || !result.model_id.trim()
      || typeof result.model_version !== "string" || !result.model_version.trim()
      || typeof result.disclaimer !== "string" || !result.disclaimer.trim()) {
    throw new Error("The diabetes screening service returned an unexpected response.");
  }
  return result;
}

function SelectField({ name, label, helper, value, options, error, disabled, onChange }) {
  const helperId = `${name}-helper`;
  const errorId = `${name}-error`;
  return (
    <div className={`diabetes-field${error ? " diabetes-field-invalid" : ""}`}>
      <label htmlFor={`diabetes-${name}`}>{label} <span aria-hidden="true">*</span></label>
      <select
        id={`diabetes-${name}`}
        name={name}
        value={value}
        required
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={`${helperId}${error ? ` ${errorId}` : ""}`}
        onChange={onChange}
      >
        <option value="">Select a response</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <small id={helperId}>{helper}</small>
      {error && <span className="diabetes-field-error" id={errorId}>{error}</span>}
    </div>
  );
}

export default function DiabetesScreeningPage() {
  const formRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError(null);
    setResult(null);
  };

  const submitScreening = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const validation = validateForm(form);
    setFieldErrors(validation.errors);
    setFormError(null);
    if (Object.keys(validation.errors).length) {
      setResult(null);
      setFormError({
        title: "Check the required survey responses.",
        message: "Complete each field using an available value before submitting.",
      });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await api.createDiabetesScreening(validation.payload);
      setResult(validateResponse(response));
    } catch (error) {
      const status = error.status;
      const title = status === 400
        ? "The screening request needs correction."
        : status === 502
          ? "The screening service returned an invalid response."
          : status === 503
            ? "The screening service is unavailable."
            : error.message?.includes("timed out")
              ? "The screening request timed out."
              : error.message?.includes("Cannot reach")
                ? "The backend could not be reached."
                : "Screening could not be completed.";
      setFormError({
        title,
        message: error.message || "Try again when the service is available.",
        fieldErrors: error.fieldErrors || {},
        status,
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setFormError(null);
    setResult(null);
  };

  const classDescription = result
    ? result.predicted_class === 1
      ? "The survey dataset label is in the prediabetes-or-diabetes group."
      : "The survey dataset label is in the no-diabetes-reported group."
    : "";

  return (
    <section className="workspace-page diabetes-screening-page">
      <header className="diabetes-page-heading">
        <div>
          <span className="page-eyebrow">EXPERIMENTAL SURVEY MODEL</span>
          <h1>Diabetes Screening</h1>
          <p>Explore a separate model trained on CDC survey responses.</p>
        </div>
        <span className="diabetes-experiment-badge">Academic demonstration</span>
      </header>

      <div className="diabetes-context-banner" role="note">
        <span aria-hidden="true">ⓘ</span>
        <p>
          This screening is based on survey responses, not laboratory measurements or a clinical diagnosis.
          It is separate from the existing EDPS patient and prediction workflow.
        </p>
      </div>

      {formError && (
        <div className="page-error diabetes-form-error" role="alert">
          <div>
            <strong>{formError.title}</strong>
            <p>{formError.message}</p>
            {Object.keys(formError.fieldErrors || {}).length > 0 && (
              <ul>
                {Object.entries(formError.fieldErrors).map(([field, message]) => (
                  <li key={field}>{field}: {message}</li>
                ))}
              </ul>
            )}
          </div>
          {formError.status === 502
            || formError.status === 503
            || formError.message.toLowerCase().includes("timed out")
            || formError.message.toLowerCase().includes("cannot reach")
            || formError.message.toLowerCase().includes("unavailable") ? (
              <button
                className="secondary-action"
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={submitting}
              >
                Retry
              </button>
            ) : null}
        </div>
      )}

      <form ref={formRef} className="diabetes-screening-form" onSubmit={submitScreening} noValidate>
        <section className="diabetes-form-section" aria-labelledby="diabetes-survey-heading">
          <div className="diabetes-section-heading">
            <span className="diabetes-section-number">01</span>
            <div>
              <h2 id="diabetes-survey-heading">Survey responses</h2>
              <p>Required dataset-coded answers. Select a response for every question.</p>
            </div>
          </div>
          <div className="diabetes-field-grid">
            {binaryFields.map((field) => (
              <SelectField
                key={field.name}
                {...field}
                value={form[field.name]}
                options={field.options || [
                  { value: 0, label: "0 — No" },
                  { value: 1, label: "1 — Yes" },
                ]}
                error={fieldErrors[field.name]}
                disabled={submitting}
                onChange={updateField}
              />
            ))}
          </div>
        </section>

        <section className="diabetes-form-section" aria-labelledby="diabetes-health-heading">
          <div className="diabetes-section-heading">
            <span className="diabetes-section-number">02</span>
            <div>
              <h2 id="diabetes-health-heading">Health and demographic categories</h2>
              <p>Use the survey categories shown; do not substitute unrelated patient measurements.</p>
            </div>
          </div>
          <div className="diabetes-field-grid diabetes-field-grid-secondary">
            <div className={`diabetes-field${fieldErrors.BMI ? " diabetes-field-invalid" : ""}`}>
              <label htmlFor="diabetes-BMI">BMI <span aria-hidden="true">*</span></label>
              <input
                id="diabetes-BMI"
                name="BMI"
                type="number"
                inputMode="decimal"
                step="any"
                required
                value={form.BMI}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.BMI)}
                aria-describedby={`BMI-helper${fieldErrors.BMI ? " BMI-error" : ""}`}
                onChange={updateField}
              />
              <small id="BMI-helper">Finite numeric survey value; no BMI range restriction is applied.</small>
              {fieldErrors.BMI && <span className="diabetes-field-error" id="BMI-error">{fieldErrors.BMI}</span>}
            </div>
            {ordinalFields.map((field) => (
              <SelectField
                key={field.name}
                {...field}
                value={form[field.name]}
                options={Array.from(
                  { length: field.max - field.min + 1 },
                  (_unused, index) => {
                    const value = field.min + index;
                    return { value, label: String(value) };
                  },
                )}
                error={fieldErrors[field.name]}
                disabled={submitting}
                onChange={updateField}
              />
            ))}
          </div>
        </section>

        <div className="diabetes-form-footer">
          <p><span aria-hidden="true">*</span> All survey fields are required.</p>
          <div>
            <button className="secondary-action" type="button" onClick={clearForm} disabled={submitting}>
              Clear responses
            </button>
            <button className="primary-action diabetes-submit" type="submit" disabled={submitting}>
              {submitting ? "Submitting screening…" : "Submit diabetes screening"}
            </button>
          </div>
        </div>
      </form>

      <section className="diabetes-result-section" aria-labelledby="diabetes-result-heading" aria-live="polite">
        <div className="diabetes-section-heading">
          <span className="diabetes-section-number">03</span>
          <div>
            <h2 id="diabetes-result-heading">Screening result</h2>
            <p>A response is shown here after the service returns successfully.</p>
          </div>
        </div>
        {submitting && (
          <div className="page-loading" role="status">Sending survey responses to the Spring Boot screening endpoint…</div>
        )}
        {!submitting && !result && (
          <div className="diabetes-result-empty">
            Complete the survey and submit it to view an experimental dataset-label result.
          </div>
        )}
        {!submitting && result && (
          <div className="diabetes-result-card">
            <div className="diabetes-result-main">
              <span className={`diabetes-class-badge diabetes-class-${result.predicted_class}`}>
                Dataset label class {result.predicted_class}
              </span>
              <h3>{result.predicted_label}</h3>
              <p>{classDescription}</p>
            </div>
            <dl className="diabetes-result-metrics">
              <div>
                <dt>Positive-class model score</dt>
                <dd>{result.positive_class_score.toFixed(4)}</dd>
                <small>Not a clinically calibrated probability</small>
              </div>
              <div>
                <dt>Classification threshold</dt>
                <dd>{result.threshold.toFixed(4)}</dd>
                <small>Threshold returned by the model service</small>
              </div>
              <div>
                <dt>Model identifier</dt>
                <dd>{result.model_id}</dd>
                <small>Version: {result.model_version}</small>
              </div>
            </dl>
            <p className="diabetes-result-disclaimer">{result.disclaimer}</p>
          </div>
        )}
        <p className="diabetes-stateless-note">
          This screening result is displayed for this session only. It is not saved to patient records,
          prediction history, MySQL, or integrity audit logs.
        </p>
      </section>
    </section>
  );
}
