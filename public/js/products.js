/**
 * Products Module
 * Handles product listing, filtering, search, and CRUD operations
 */

const Products = {
  items: [],
  pagination: null,
  currentCategory: 'All',
  searchQuery: '',
  currentSort: 'newest',
  currentPage: 1,
  selectedProduct: null,
  isEditMode: false,

  async init() {
    await this.fetchProducts();
    this.setupListeners();
  },

  async fetchProducts() {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 0; color: var(--text-muted);">
          <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid rgba(99,102,241,0.2); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 1rem; font-size: 0.9rem;">Loading products...</p>
        </div>
      `;
    }

    try {
      const params = new URLSearchParams();
      params.append('page', this.currentPage);
      params.append('limit', 12);
      if (this.currentCategory && this.currentCategory !== 'All') {
        params.append('category', this.currentCategory);
      }
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        params.append('search', this.searchQuery.trim());
      }
      if (this.currentSort) {
        params.append('sort', this.currentSort);
      }

      const res = await window.apiClient.get(`/products?${params.toString()}`);
      if (res.success && res.data) {
        this.items = res.data.products;
        this.pagination = res.data.pagination;
        this.renderProducts();
        this.updateStats();
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      if (grid) {
        grid.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-title">Could not load products</h3>
            <p class="empty-text">${err.message || 'Please check your connection and try again.'}</p>
            <button class="btn btn-secondary" onclick="Products.fetchProducts()">Retry</button>
          </div>
        `;
      }
    }
  },

  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!this.items || this.items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <h3 class="empty-title">No products found</h3>
          <p class="empty-text">No items matched your current filter criteria. Try adjusting your search query or category.</p>
          <button class="btn btn-secondary" onclick="Products.resetFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    const isAuth = window.Auth && window.Auth.isAuthenticated();

    grid.innerHTML = this.items.map((product) => {
      const inStock = product.stock > 0;
      const stockBadge = inStock
        ? `<span class="card-stock stock-in">${product.stock} in stock</span>`
        : `<span class="card-stock stock-out">Out of stock</span>`;

      const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80';
      const imgSrc = product.imageUrl || fallbackImg;

      return `
        <div class="product-card" data-id="${product._id}">
          <div class="card-img-wrapper" onclick="Products.viewDetails('${product._id}')" style="cursor: pointer;">
            <img src="${imgSrc}" alt="${this.escapeHtml(product.title)}" class="card-img" onerror="this.src='${fallbackImg}'">
            <span class="card-badge">${this.escapeHtml(product.category)}</span>
            ${stockBadge}
          </div>
          <div class="card-body">
            <div class="card-rating">
              <svg viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
              <span class="card-rating-num">${(product.rating || 4.5).toFixed(1)}</span>
            </div>
            <h3 class="card-title" onclick="Products.viewDetails('${product._id}')" style="cursor: pointer;">${this.escapeHtml(product.title)}</h3>
            <p class="card-desc">${this.escapeHtml(product.description)}</p>
            <div class="card-footer">
              <div class="card-price"><span>$</span>${Number(product.price).toFixed(2)}</div>
              <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick="Products.viewDetails('${product._id}')" title="View details">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                ${
                  isAuth
                    ? `
                  <button class="btn btn-secondary btn-sm" onclick="Products.openEditModal('${product._id}')" title="Edit product">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="Products.confirmDelete('${product._id}', '${this.escapeHtml(product.title)}')" title="Delete product">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  updateStats() {
    const totalCountEl = document.getElementById('stat-total-products');
    const inStockEl = document.getElementById('stat-instock');
    if (totalCountEl && this.pagination) {
      totalCountEl.textContent = this.pagination.total || this.items.length;
    }
    if (inStockEl) {
      const inStockCount = this.items.filter((p) => p.stock > 0).length;
      inStockEl.textContent = inStockCount;
    }
  },

  async viewDetails(id) {
    try {
      const res = await window.apiClient.get(`/products/${id}`);
      if (res.success && res.data) {
        const p = res.data.product;
        const modal = document.getElementById('product-detail-modal');
        const content = document.getElementById('product-detail-content');

        const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80';
        const imgSrc = p.imageUrl || fallbackImg;

        content.innerHTML = `
          <div class="detail-modal-grid">
            <img src="${imgSrc}" alt="${this.escapeHtml(p.title)}" class="detail-img" onerror="this.src='${fallbackImg}'">
            <div class="detail-info">
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span class="card-badge" style="position: static;">${this.escapeHtml(p.category)}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Stock: <strong>${p.stock}</strong> units</span>
              </div>
              <h2 style="font-size: 1.4rem; line-height: 1.3;">${this.escapeHtml(p.title)}</h2>
              <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--warning); font-size: 0.9rem;">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                <span><strong>${(p.rating || 4.5).toFixed(1)}</strong> / 5.0</span>
              </div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #fff; font-family: var(--font-heading);">
                <span style="color: var(--accent-primary); font-size: 1rem;">$</span>${Number(p.price).toFixed(2)}
              </div>
              <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); padding: 0.8rem 0;">
                ${this.escapeHtml(p.description)}
              </p>
              <div style="font-size: 0.75rem; color: var(--text-dim);">
                Created by: <strong>${p.createdBy?.name || 'Authorized Seller'}</strong> • ID: <code>${p._id}</code>
              </div>
            </div>
          </div>
        `;

        modal.classList.add('active');
      }
    } catch (err) {
      window.Toast.error('Error', err.message || 'Failed to fetch product details');
    }
  },

  openAddModal() {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
      window.Toast.info('Authentication Required', 'Please sign in or create an account to add products.');
      document.getElementById('auth-modal').classList.add('active');
      return;
    }

    this.isEditMode = false;
    this.selectedProduct = null;
    const form = document.getElementById('product-form');
    if (form) form.reset();
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-submit-btn').textContent = 'Create Product';
    this.updateImagePreview('');
    this.clearValidationErrors();
    document.getElementById('product-modal').classList.add('active');
  },

  async openEditModal(id) {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
      window.Toast.info('Authentication Required', 'Please sign in to edit products.');
      document.getElementById('auth-modal').classList.add('active');
      return;
    }

    try {
      const res = await window.apiClient.get(`/products/${id}`);
      if (res.success && res.data) {
        const p = res.data.product;
        this.isEditMode = true;
        this.selectedProduct = p;

        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-submit-btn').textContent = 'Save Changes';

        document.getElementById('prod-title').value = p.title;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-rating').value = p.rating || 4.5;
        document.getElementById('prod-image').value = p.imageUrl || '';
        document.getElementById('prod-desc').value = p.description;

        this.updateImagePreview(p.imageUrl || '');
        this.clearValidationErrors();
        document.getElementById('product-modal').classList.add('active');
      }
    } catch (err) {
      window.Toast.error('Error', err.message || 'Failed to load product for editing');
    }
  },

  async saveProduct(e) {
    e.preventDefault();
    this.clearValidationErrors();

    const title = document.getElementById('prod-title').value.trim();
    const category = document.getElementById('prod-category').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const rating = parseFloat(document.getElementById('prod-rating').value) || 4.5;
    const imageUrl = document.getElementById('prod-image').value.trim();
    const description = document.getElementById('prod-desc').value.trim();

    const payload = {
      title,
      category,
      price,
      stock,
      rating,
      imageUrl,
      description
    };

    const submitBtn = document.getElementById('product-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
      if (this.isEditMode && this.selectedProduct) {
        const res = await window.apiClient.put(`/products/${this.selectedProduct._id}`, payload);
        if (res.success) {
          window.Toast.success('Updated!', 'Product updated successfully.');
          document.getElementById('product-modal').classList.remove('active');
          await this.fetchProducts();
        }
      } else {
        const res = await window.apiClient.post('/products', payload);
        if (res.success) {
          window.Toast.success('Created!', 'Product created successfully.');
          document.getElementById('product-modal').classList.remove('active');
          await this.fetchProducts();
        }
      }
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        this.showValidationErrors(err.errors);
        window.Toast.error('Validation Error', 'Please correct the highlighted fields.');
      } else {
        window.Toast.error('Failed', err.message || 'Could not save product.');
      }
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  },

  confirmDelete(id, title) {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
      window.Toast.info('Authentication Required', 'Please sign in to delete products.');
      document.getElementById('auth-modal').classList.add('active');
      return;
    }

    const modal = document.getElementById('delete-modal');
    document.getElementById('delete-product-title').textContent = title;
    const confirmBtn = document.getElementById('btn-confirm-delete');

    // Remove previous listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      newConfirmBtn.textContent = 'Deleting...';
      newConfirmBtn.disabled = true;

      try {
        const res = await window.apiClient.delete(`/products/${id}`);
        if (res.success) {
          window.Toast.success('Deleted', 'Product was removed successfully.');
          modal.classList.remove('active');
          await this.fetchProducts();
        }
      } catch (err) {
        window.Toast.error('Delete Failed', err.message || 'Could not delete product.');
      } finally {
        newConfirmBtn.textContent = 'Delete Product';
        newConfirmBtn.disabled = false;
      }
    });

    modal.classList.add('active');
  },

  updateImagePreview(url) {
    const container = document.getElementById('image-preview');
    if (!container) return;
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
      container.innerHTML = `<img src="${url}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'image-preview-placeholder\\'>Failed to load image</span>'">`;
    } else {
      container.innerHTML = `<span class="image-preview-placeholder">Live preview will appear here</span>`;
    }
  },

  showValidationErrors(errors) {
    errors.forEach((err) => {
      const fieldId = `prod-${err.field === 'title' ? 'title' : err.field === 'category' ? 'category' : err.field === 'price' ? 'price' : err.field === 'stock' ? 'stock' : err.field === 'description' ? 'desc' : err.field === 'imageUrl' ? 'image' : err.field}`;
      const input = document.getElementById(fieldId);
      const errorMsgEl = document.getElementById(`${fieldId}-error`);
      if (input) input.classList.add('is-invalid');
      if (errorMsgEl) errorMsgEl.textContent = err.message;
    });
  },

  clearValidationErrors() {
    document.querySelectorAll('#product-form .form-control').forEach((el) => {
      el.classList.remove('is-invalid');
    });
    document.querySelectorAll('#product-form .field-error').forEach((el) => {
      el.textContent = '';
    });
  },

  resetFilters() {
    this.searchQuery = '';
    this.currentCategory = 'All';
    this.currentSort = 'newest';
    this.currentPage = 1;

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'newest';

    document.querySelectorAll('.category-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.category === 'All');
    });

    this.fetchProducts();
  },

  setupListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.currentPage = 1;
          this.fetchProducts();
        }, 300);
      });
    }

    // Sort selector
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.currentPage = 1;
        this.fetchProducts();
      });
    }

    // Category pills
    document.querySelectorAll('.category-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.dataset.category;
        this.currentPage = 1;
        this.fetchProducts();
      });
    });

    // Image URL preview listener
    const imgInput = document.getElementById('prod-image');
    if (imgInput) {
      imgInput.addEventListener('input', (e) => {
        this.updateImagePreview(e.target.value.trim());
      });
    }

    // Product form submission
    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', (e) => this.saveProduct(e));
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Products = Products;
