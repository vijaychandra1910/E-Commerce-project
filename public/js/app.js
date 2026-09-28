/**
 * Application Coordinator & UI Utilities
 */

// Toast notification manager
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(type, title, message, duration = 4000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  success(title, message) {
    this.show('success', title, message);
  },

  error(title, message) {
    this.show('error', title, message);
  },

  info(title, message) {
    this.show('info', title, message);
  }
};

window.Toast = Toast;

// App initialization
document.addEventListener('DOMContentLoaded', async () => {
  Toast.init();

  // Setup modal close handlers (backdrop click & close buttons)
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
  });

  // Setup Auth Modal Tabs
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      clearAuthValidationErrors();
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
      clearAuthValidationErrors();
    });
  }

  // Auth button triggers
  const btnSignIn = document.getElementById('btn-sign-in');
  const btnRegister = document.getElementById('btn-register');
  const btnLogout = document.getElementById('btn-logout');
  const authModal = document.getElementById('auth-modal');

  if (btnSignIn) {
    btnSignIn.addEventListener('click', () => {
      tabLogin.click();
      authModal.classList.add('active');
    });
  }

  if (btnRegister) {
    btnRegister.addEventListener('click', () => {
      tabRegister.click();
      authModal.classList.add('active');
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await window.Auth.logout();
    });
  }

  // Quick Demo Autofill button
  const btnFillDemo = document.getElementById('btn-fill-demo');
  if (btnFillDemo) {
    btnFillDemo.addEventListener('click', () => {
      document.getElementById('login-email').value = 'demo@example.com';
      document.getElementById('login-password').value = 'Password@123';
      Toast.info('Credentials Filled', 'Demo account credentials entered.');
    });
  }

  const btnFillAdmin = document.getElementById('btn-fill-admin');
  if (btnFillAdmin) {
    btnFillAdmin.addEventListener('click', () => {
      document.getElementById('login-email').value = 'admin@example.com';
      document.getElementById('login-password').value = 'Password@123';
      Toast.info('Credentials Filled', 'Admin account credentials entered.');
    });
  }

  // Handle Login form submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthValidationErrors();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-submit-login');

      submitBtn.textContent = 'Signing in...';
      submitBtn.disabled = true;

      try {
        await window.Auth.login(email, password);
        authModal.classList.remove('active');
        formLogin.reset();
      } catch (err) {
        if (err.errors && Array.isArray(err.errors)) {
          showAuthValidationErrors(err.errors, 'login');
        } else {
          const generalErr = document.getElementById('login-general-error');
          if (generalErr) generalErr.textContent = err.message || 'Login failed';
        }
      } finally {
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
      }
    });
  }

  // Handle Register form submit
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthValidationErrors();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const submitBtn = document.getElementById('btn-submit-register');

      submitBtn.textContent = 'Creating Account...';
      submitBtn.disabled = true;

      try {
        await window.Auth.register(name, email, password, confirmPassword);
        // Switch to login tab and prefill email
        tabLogin.click();
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').focus();
        formRegister.reset();
      } catch (err) {
        if (err.errors && Array.isArray(err.errors)) {
          showAuthValidationErrors(err.errors, 'reg');
        } else {
          const generalErr = document.getElementById('reg-general-error');
          if (generalErr) generalErr.textContent = err.message || 'Registration failed';
        }
      } finally {
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
      }
    });
  }

  // Trigger Add Product modal
  const btnAddProduct = document.getElementById('btn-add-product');
  if (btnAddProduct) {
    btnAddProduct.addEventListener('click', () => {
      window.Products.openAddModal();
    });
  }

  // Initialize Auth & Products
  await window.Auth.init();
  await window.Products.init();
});

function showAuthValidationErrors(errors, prefix) {
  errors.forEach((err) => {
    let field = err.field;
    if (field === 'confirmPassword') field = 'confirm-password';
    const input = document.getElementById(`${prefix}-${field}`);
    const errEl = document.getElementById(`${prefix}-${field}-error`);
    if (input) input.classList.add('is-invalid');
    if (errEl) errEl.textContent = err.message;
  });
}

function clearAuthValidationErrors() {
  document.querySelectorAll('#auth-modal .form-control').forEach((el) => el.classList.remove('is-invalid'));
  document.querySelectorAll('#auth-modal .field-error').forEach((el) => (el.textContent = ''));
}
