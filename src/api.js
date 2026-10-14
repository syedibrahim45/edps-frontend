const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 12000;
let authorizationHeader = "";
let csrfToken = "";

function encodeBasicCredentials(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `Basic ${btoa(binary)}`;
}

async function loadCsrfToken() {
  const result = await request("/csrf", {}, API_BASE_URL, { csrf: false });
  if (typeof result?.token !== "string" || !result.token) {
    throw new Error("The backend did not return a CSRF token. Check the production security configuration.");
  }
  csrfToken = result.token;
  return result;
}

async function request(path, options = {}, baseUrl = API_BASE_URL, settings = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isWrite = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (isWrite && authorizationHeader && settings.csrf !== false && !csrfToken) {
    await loadCsrfToken();
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestUrl = /^https?:\/\//i.test(path)
      ? path
      : new URL(path, `${baseUrl}/`).toString();
    const response = await fetch(requestUrl, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
        ...(isWrite && csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        ...options.headers,
      },
    });
    const responseText = await response.text();
    let result = null;

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = response.ok ? responseText : { message: responseText };
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required or credentials were rejected. Enter the backend administrator credentials in Service health & settings; credentials are kept only in this tab.");
      }
      if (response.status === 403) {
        throw new Error("The backend denied this request. In production, refresh authentication and CSRF state in Service health & settings.");
      }
      const fieldDetails = Object.entries(result?.fieldErrors || {})
        .map(([field, message]) => `${field}: ${message}`)
        .join("; ");
      const responseDetail = Array.isArray(result?.detail)
        ? result.detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
        : result?.detail;
      const detail = [result?.message || result?.error || responseDetail, fieldDetails]
        .filter(Boolean)
        .join(" ");
      throw new Error(`EDPS API request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    return result;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `EDPS API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds: ${path}`,
        { cause: error },
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the configured service at ${baseUrl}. Check that it is running and CORS allows this frontend origin.`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function unwrapList(result, resourceName) {
  const candidates = [
    result,
    result?.content,
    result?.data,
    result?.data?.content,
  ];
  const records = candidates.find(Array.isArray);

  if (!records) {
    throw new Error(`The EDPS API returned an unexpected ${resourceName} response. Expected an array of records.`);
  }

  return records;
}

function unwrapRecord(result) {
  return result?.data && !Array.isArray(result.data) ? result.data : result;
}

export const api = {
  baseUrl: API_BASE_URL,

  setCredentials(username, password) {
    if (!username || !password) {
      throw new Error("Enter both the backend username and password.");
    }
    authorizationHeader = encodeBasicCredentials(username, password);
    csrfToken = "";
  },

  clearCredentials() {
    authorizationHeader = "";
    csrfToken = "";
  },

  hasCredentials() {
    return Boolean(authorizationHeader);
  },

  async authenticate(username, password) {
    this.setCredentials(username, password);
    try {
      await loadCsrfToken();
      await this.getPatients();
    } catch (error) {
      this.clearCredentials();
      throw error;
    }
  },

  async getBackendHealth() {
    const result = unwrapRecord(await request("/actuator/health"));
    if (!result || typeof result.status !== "string") {
      throw new Error("The backend health endpoint returned an unexpected response.");
    }
    return result;
  },

  async getMlHealth() {
    const result = await request("/api/ml/health");
    if (!result || !["UP", "DEGRADED"].includes(result.status)
        || typeof result.service !== "string"
        || typeof result.model_status !== "string") {
      throw new Error("The backend ML health proxy returned an unexpected response.");
    }
    return result;
  },

  async getPatients() {
    return unwrapList(await request("/patients"), "patient");
  },

  async createPatient(patient) {
    return unwrapRecord(await request("/patients", {
      method: "POST",
      body: JSON.stringify(patient),
    }));
  },

  async updatePatient(id, patient) {
    return unwrapRecord(await request(`/patients/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patient),
    }));
  },

  async deletePatient(id) {
    return request(`/patients/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async getPredictions() {
    return unwrapList(await request("/predictions"), "prediction history");
  },

  async createPrediction(prediction) {
    return unwrapRecord(await request("/predictions", {
      method: "POST",
      body: JSON.stringify(prediction),
    }));
  },

  async deletePrediction(id) {
    return request(`/predictions/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async verifyIntegrity() {
    const result = unwrapRecord(await request("/integrity/audit/verify"));
    if (!result || typeof result.valid !== "boolean") {
      throw new Error("The integrity API returned an unexpected response. Expected a boolean 'valid' status.");
    }
    return result;
  },

  async getAuditRecords() {
    return unwrapList(await request("/integrity/audit/records"), "audit record");
  },

  async getGlobalExplainability() {
    const result = await request("/api/ml/explainability/global");
    if (result?.scope !== "global" || !Array.isArray(result.feature_importance)
        || !Number.isInteger(result.sample_count)
        || typeof result.method !== "string"
        || result.feature_importance.some((item) => typeof item.feature !== "string"
          || !Number.isFinite(item.mean_importance)
          || !Number.isFinite(item.std_importance))) {
      throw new Error("The backend explainability proxy returned an unexpected global explainability response.");
    }
    return result;
  },

  async getIndividualExplainability(features) {
    const result = await request("/api/ml/explainability/individual", {
      method: "POST",
      body: JSON.stringify(features),
    });
    if (result?.scope !== "individual" || !Array.isArray(result.feature_effects)
        || !result.prediction || typeof result.reference_population !== "string"
        || result.feature_effects.some((item) => typeof item.feature !== "string"
          || !Number.isFinite(item.input_value)
          || !Number.isFinite(item.reference_value)
          || !Number.isFinite(item.probability_with_input)
          || !Number.isFinite(item.probability_with_reference)
          || !Number.isFinite(item.probability_delta))) {
      throw new Error("The backend explainability proxy returned an unexpected individual explanation response.");
    }
    return result;
  },

  async getFederatedResults() {
    const result = await request("/api/ml/federated/results");
    if (result?.status !== "completed" || result?.method !== "FedAvg"
        || result?.simulation_data !== "synthetic"
        || !Number.isInteger(result.client_count) || result.client_count < 1
        || !Number.isInteger(result.rounds) || result.rounds < 1
        || !Array.isArray(result.per_round_metrics)
        || !result.final_evaluation_metrics
        || !Number.isFinite(result.final_evaluation_metrics.accuracy)) {
      throw new Error("The backend federated-results proxy returned an unexpected simulation response.");
    }
    return result;
  },
};

export function probabilityPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const percent = numericValue <= 1 ? numericValue * 100 : numericValue;
  return Math.round(Math.max(0, Math.min(100, percent)));
}
