/**
 * Authentication module
 * Manages user state, login, registration, logout, and navbar UI
 */

const Auth = {
  user: null,

  async init() {
    // Listen for auth expired event from apiClient
    window.addEventListener('auth:expired', () => {
      this.user = null;
      this.updateUI();
      window.Toast.info('Session Expired', 'Please sign in again to continue.');
    });

    // Check if token exists or attempt to fetch /api/auth/me
    if (window.apiClient.getAccessToken()) {
      try {
        await this.fetchCurrentUser();
      } catch (err) {
        // If access token failed, try silent refresh
        try {
          await window.apiClient.post('/auth/refresh-token', {});
          await this.fetchCurrentUser();
        } catch (refreshErr) {
          window.apiClient.setAccessToken(null);
          this.user = null;
        }
      }
    } else {
      // Even without access token in localStorage, we can try to exchange refresh token cookie
      try {
        const res = await window.apiClient.post('/auth/refresh-token', {});
        if (res.success && res.data && res.data.accessToken) {
          window.apiClient.setAccessToken(res.data.accessToken);
          await this.fetchCurrentUser();
        }
      } catch (e) {
        // No active session cookie
      }
    }

    this.updateUI();
  },

  async fetchCurrentUser() {
    try {
      const res = await window.apiClient.get('/auth/me');
      if (res.success && res.data) {
        this.user = res.data.user;
        this.updateUI();
        return this.user;
      }
    } catch (err) {
      this.user = null;
      this.updateUI();
      throw err;
    }
  },

  async login(email, password) {
    try {
      const res = await window.apiClient.post('/auth/login', { email, password });
      if (res.success && res.data) {
        window.apiClient.setAccessToken(res.data.accessToken);
        this.user = res.data.user;
        this.updateUI();
        window.Toast.success('Welcome back!', `Signed in as ${this.user.name}`);
        return res;
      }
    } catch (err) {
      throw err;
    }
  },

  async register(name, email, password, confirmPassword) {
    try {
      const res = await window.apiClient.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword
      });
      if (res.success) {
        window.Toast.success('Account Created', 'Registration successful! Please sign in.');
        return res;
      }
    } catch (err) {
      throw err;
    }
  },

  async logout() {
    try {
      await window.apiClient.post('/auth/logout', {});
    } catch (err) {
      console.warn('Logout endpoint warning:', err);
    } finally {
      window.apiClient.setAccessToken(null);
      this.user = null;
      this.updateUI();
      window.Toast.info('Signed Out', 'You have been safely signed out.');
      // Refresh products or reset UI permissions
      if (window.Products) {
        window.Products.renderProducts();
      }
    }
  },

  isAuthenticated() {
    return !!this.user;
  },

  getUser() {
    return this.user;
  },

  updateUI() {
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userNameEl = document.getElementById('nav-user-name');
    const userRoleEl = document.getElementById('nav-user-role');
    const userAvatarEl = document.getElementById('nav-user-avatar');
    const addProductBtn = document.getElementById('btn-add-product');

    if (this.user) {
      if (guestNav) guestNav.style.display = 'none';
      if (userNav) userNav.style.display = 'flex';
      if (userNameEl) userNameEl.textContent = this.user.name;
      if (userRoleEl) userRoleEl.textContent = this.user.role || 'user';
      if (userAvatarEl) {
        userAvatarEl.textContent = (this.user.name || 'U').charAt(0).toUpperCase();
      }
      if (addProductBtn) {
        addProductBtn.style.display = 'inline-flex';
      }
    } else {
      if (guestNav) guestNav.style.display = 'flex';
      if (userNav) userNav.style.display = 'none';
      if (addProductBtn) {
        addProductBtn.style.display = 'inline-flex'; // Still clickable, will prompt login if not authenticated
      }
    }

    // Update edit/delete buttons on product cards if already rendered
    if (window.Products && window.Products.items) {
      window.Products.renderProducts();
    }
  }
};

window.Auth = Auth;
