/**
 * API Client with automatic JWT Bearer insertion and automatic Refresh-Token interceptor
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('lumen_access_token') || null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  setAccessToken(token) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('lumen_access_token', token);
    } else {
      localStorage.removeItem('lumen_access_token');
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  onRefreshed(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Sends httpOnly refreshToken cookie automatically
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 Unauthorized with automatic token refresh
      // Avoid infinite loop if refresh token itself failed or if calling /api/auth/login or /api/auth/refresh-token
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/refresh-token');
      
      if (response.status === 401 && !isAuthEndpoint) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include'
            });

            const refreshData = await refreshRes.json();

            if (refreshRes.ok && refreshData.data && refreshData.data.accessToken) {
              const newToken = refreshData.data.accessToken;
              this.setAccessToken(newToken);
              this.isRefreshing = false;
              this.onRefreshed(newToken);

              // Retry original request with new token
              config.headers['Authorization'] = `Bearer ${newToken}`;
              return fetch(url, config);
            } else {
              // Refresh failed - session expired
              this.isRefreshing = false;
              this.setAccessToken(null);
              window.dispatchEvent(new CustomEvent('auth:expired'));
              return response;
            }
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.setAccessToken(null);
            window.dispatchEvent(new CustomEvent('auth:expired'));
            return response;
          }
        } else {
          // If already refreshing, wait for new token then retry
          return new Promise((resolve) => {
            this.addRefreshSubscriber((newToken) => {
              config.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(fetch(url, config));
            });
          });
        }
      }

      return response;
    } catch (err) {
      console.error('[API Request Error]', err);
      throw err;
    }
  }

  // Convenience helper methods
  async get(endpoint, options = {}) {
    const res = await this.request(endpoint, { ...options, method: 'GET' });
    return this.parseResponse(res);
  }

  async post(endpoint, body, options = {}) {
    const res = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
    return this.parseResponse(res);
  }

  async put(endpoint, body, options = {}) {
    const res = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return this.parseResponse(res);
  }

  async delete(endpoint, options = {}) {
    const res = await this.request(endpoint, { ...options, method: 'DELETE' });
    return this.parseResponse(res);
  }

  async parseResponse(res) {
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { message: res.statusText };
    }

    if (!res.ok) {
      const error = new Error(data.message || 'Request failed');
      error.status = res.status;
      error.data = data;
      error.errors = data.errors;
      throw error;
    }

    return data;
  }
}

window.apiClient = new ApiClient();
