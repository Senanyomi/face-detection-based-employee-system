import axios from 'axios';

// Base URLs for each microservice
// In production these come from environment variables (VITE_ prefix)
const SERVICE_URLS = {
  auth:       import.meta.env.VITE_AUTH_SERVICE_URL       || 'http://localhost:8001',
  attendance: import.meta.env.VITE_ATTENDANCE_SERVICE_URL || 'http://localhost:8002',
  analytics:  import.meta.env.VITE_ANALYTICS_SERVICE_URL  || 'http://localhost:8003',
  device:     import.meta.env.VITE_DEVICE_SERVICE_URL     || 'http://localhost:8004',
  audit:      import.meta.env.VITE_AUDIT_SERVICE_URL      || 'http://localhost:8005',
};

function makeClient(baseURL: string) {
  const client = axios.create({ baseURL });

  // Attach JWT token from localStorage on every request
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('emprod_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // On 401, clear auth and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onLoginPage = window.location.pathname === '/login';
      const token = localStorage.getItem('emprod_token');
      // Only redirect if we have no token OR we are not on login page
      // This prevents redirect loops when a protected endpoint fails
      if (!onLoginPage && !token) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
  return client;
}

export const authClient       = makeClient(SERVICE_URLS.auth);
export const attendanceClient = makeClient(SERVICE_URLS.attendance);
export const analyticsClient  = makeClient(SERVICE_URLS.analytics);
export const deviceClient     = makeClient(SERVICE_URLS.device);
export const auditClient      = makeClient(SERVICE_URLS.audit);
