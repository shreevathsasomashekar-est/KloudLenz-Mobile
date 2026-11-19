import axios from "axios";

// ── Backend URL: change ONLY this line (must end with /api/v1) ──
// USB-connected phone: "http://localhost:8081/api/v1" with `adb reverse tcp:8081 tcp:8081`
// Real device over the internet: the ngrok https URL, e.g. "https://<id>.ngrok-free.app/api/v1"
// Android emulator: "http://10.0.2.2:8081/api/v1"
export const BASE_URL = "http://localhost:8081/api/v1";

export const API_CONFIG = {
  BASE_URL,
  // Approving runs the change in Zuora; the first call after a backend restart also
  // fetches a Zuora OAuth token, which can take well over 10 s.
  TIMEOUT: 30000,
  USE_MOCK: false,
};

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Every rejection is a plain, user-readable string. Failures are logged with console.log,
// not console.error: in dev builds console.error raises a red LogBox toast that covers the
// bottom action bar and looks like a crash.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url;
    if (error.response) {
      const { status, data } = error.response;
      console.log(`API ${status} on ${url}:`, JSON.stringify(data));
      return Promise.reject(
        data?.data?.reasons?.[0]?.message || data?.message || data?.error || `Server error (${status})`,
      );
    }
    if (error.code === "ECONNABORTED") {
      console.log(`API timeout on ${url}`);
      return Promise.reject("The server took too long to respond. Pull to refresh to check the latest status.");
    }
    if (error.request) {
      console.log(`API unreachable on ${url}:`, error.message);
      return Promise.reject("Can't reach the KloudLenz server. Check your connection and try again.");
    }
    return Promise.reject(error.message || "Something went wrong");
  },
);
