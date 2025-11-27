const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }
    
    const payload = await response.json().catch(() => ({}));
    return payload;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Ensure the server is running on port 5000.');
    }
    throw error;
  }
}

export const api = {
  getParams: () => request('/params'),
  register: (body) => request('/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/login', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body) => request('/password/change', { method: 'POST', body: JSON.stringify(body) })
};

