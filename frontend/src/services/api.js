// const API_BASE_URL = (
//   import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
// ).replace(/\/$/, "");
const API_BASE_URL = window.location.pathname.startsWith("/waterman")
  ? "/waterman"
  : "";


export async function apiRequest(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((issue) => issue.msg).join("; ")
      : detail ?? "The request could not be completed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}
