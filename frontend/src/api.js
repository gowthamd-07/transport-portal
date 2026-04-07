const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 30000;

function getToken() { return localStorage.getItem('token'); }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getProfile: () => request('/auth/me'),
  updateProfile: (data) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  getTrips: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/trips${qs ? `?${qs}` : ''}`);
  },
  getTrip: (id) => request(`/trips/${id}`),
  getStats: () => request('/trips/stats'),
  createTrip: (data) =>
    request('/trips', { method: 'POST', body: JSON.stringify(data) }),
  updateTrip: (id, data) =>
    request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTripStatus: (id, status) =>
    request(`/trips/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTrip: (id) =>
    request(`/trips/${id}`, { method: 'DELETE' }),

  getVehicleTypes: () => request('/masters/vehicle-types'),
  getVendors: () => request('/masters/vendors'),
  getPlants: () => request('/masters/plants'),
  getLocations: () => request('/masters/locations'),
  getBranches: () => request('/masters/branches'),
  getTripBases: () => request('/masters/trip-bases'),
  getTripTypes: () => request('/masters/trip-types'),

  getVehicles: () => request('/masters/vehicles'),
  createVehicle: (data) =>
    request('/masters/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id, data) =>
    request(`/masters/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVehicle: (id) =>
    request(`/masters/vehicles/${id}`, { method: 'DELETE' }),

  getDrivers: () => request('/masters/drivers'),
  createDriver: (data) =>
    request('/masters/drivers', { method: 'POST', body: JSON.stringify(data) }),
  updateDriver: (id, data) =>
    request(`/masters/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDriver: (id) =>
    request(`/masters/drivers/${id}`, { method: 'DELETE' }),

  addVehicleType: (name) =>
    request('/masters/vehicle-types', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteVehicleType: (id) =>
    request(`/masters/vehicle-types/${id}`, { method: 'DELETE' }),
  addVendor: (name) =>
    request('/masters/vendors', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteVendor: (id) =>
    request(`/masters/vendors/${id}`, { method: 'DELETE' }),
  addPlant: (name) =>
    request('/masters/plants', { method: 'POST', body: JSON.stringify({ name }) }),
  deletePlant: (id) =>
    request(`/masters/plants/${id}`, { method: 'DELETE' }),
  addLocation: (name) =>
    request('/masters/locations', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteLocation: (id) =>
    request(`/masters/locations/${id}`, { method: 'DELETE' }),
  addBranch: (name) =>
    request('/masters/branches', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteBranch: (id) =>
    request(`/masters/branches/${id}`, { method: 'DELETE' }),
  addTripBase: (name) =>
    request('/masters/trip-bases', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTripBase: (id) =>
    request(`/masters/trip-bases/${id}`, { method: 'DELETE' }),
  addTripType: (name) =>
    request('/masters/trip-types', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTripType: (id) =>
    request(`/masters/trip-types/${id}`, { method: 'DELETE' }),

  getExpiryAlerts: () => request('/masters/expiry-alerts'),

  getUsers: () => request('/users'),
  createUser: (data) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),

  getDownloadUrl: (format, params = {}) => {
    const token = getToken();
    const qs = new URLSearchParams({ ...params, token }).toString();
    return `${API_BASE}/downloads/${format}?${qs}`;
  },
};
