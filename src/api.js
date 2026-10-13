const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the EDPS API at ${API_BASE_URL}. Check that the Spring Boot backend is running and CORS allows this frontend origin.`,
        { cause: error },
      );
    }
    throw error;
  }

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
    const fieldDetails = Object.entries(result?.fieldErrors || {})
      .map(([field, message]) => `${field}: ${message}`)
      .join("; ");
    const detail = [result?.message || result?.error || result?.detail, fieldDetails]
      .filter(Boolean)
      .join(" ");
    throw new Error(`EDPS API request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return result;
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
    return unwrapRecord(await request("/integrity/audit/verify"));
  },
};

export function probabilityPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const percent = numericValue <= 1 ? numericValue * 100 : numericValue;
  return Math.round(Math.max(0, Math.min(100, percent)));
}
