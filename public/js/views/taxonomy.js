// public/js/views/taxonomy.js - Authors & Categories Management
const TaxonomyView = {
  currentTab: 'authors', // 'authors' or 'categories'
  cachedAuthors: [],
  cachedCategories: [],

  async render(container) {
    if (AppState.isMember()) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
            <h3 style="color: var(--slate-800);">Staff Access Required</h3>
            <p style="color: var(--slate-500); font-size: 13.5px; margin-top: 6px;">Author and Category administration is reserved for librarians.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 260px;">
        <div style="font-size: 15px; color: var(--slate-500);">Loading taxonomy data...</div>
      </div>
    `;

    try {
      const [authors, categories] = await Promise.all([
        API.getAuthors(),
        API.getCategories()
      ]);

      this.cachedAuthors = authors;
      this.cachedCategories = categories;

      this.renderTaxonomyDashboard(container);
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="card-body" style="color: var(--danger);">Failed to load taxonomy: ${err.message}</div></div>`;
    }
  },

  renderTaxonomyDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Authors &amp; Category Classification</h1>
          <p class="page-description">Maintain bibliographic metadata, author biographies, subject genres, and book categorization.</p>
        </div>
        <div class="page-actions">
          ${this.currentTab === 'authors' ? `
            <button class="btn btn-primary" onclick="openAddAuthorModal()">
              <span>➕</span> Add New Author
            </button>
          ` : `
            <button class="btn btn-primary" onclick="openAddCategoryModal()">
              <span>➕</span> Add New Category
            </button>
          `}
        </div>
      </div>

      <!-- Tabs -->
      <div class="nav-tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${this.currentTab === 'authors' ? 'active' : ''}" onclick="TaxonomyView.switchTab('authors')">
          ✍️ Authors Directory (${this.cachedAuthors.length})
        </button>
        <button class="tab-btn ${this.currentTab === 'categories' ? 'active' : ''}" onclick="TaxonomyView.switchTab('categories')">
          🏷️ Categories &amp; Genres (${this.cachedCategories.length})
        </button>
      </div>

      <!-- Tab Content -->
      ${this.currentTab === 'authors' ? this.renderAuthorsContent() : this.renderCategoriesContent()}
    `;
  },

  renderAuthorsContent() {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${this.cachedAuthors.map(author => `
          <div class="card" style="margin-bottom: 0;">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-900);">${escapeHTML(author.name)}</h3>
                  <div style="font-size: 12px; color: var(--slate-500); margin-top: 2px;">
                    ${author.nationality ? `<span>${escapeHTML(author.nationality)}</span> &bull; ` : ''}
                    <span>${author.birth_year ? `${author.birth_year} &ndash; ${author.death_year || 'Present'}` : 'Dates unrecorded'}</span>
                  </div>
                </div>
                <span class="badge badge-primary">${author.book_count} books</span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHTML(author.biography || 'No biography recorded.')}
              </p>
              <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--slate-100); padding-top: 12px;">
                <button class="btn btn-secondary btn-sm" onclick="openEditAuthorModal(${author.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteAuthorRecord(${author.id})">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderCategoriesContent() {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
        ${this.cachedCategories.map(cat => `
          <div class="card" style="margin-bottom: 0; border-top: 4px solid ${cat.color || 'var(--primary)'};">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${cat.color};"></span>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-900);">${escapeHTML(cat.name)}</h3>
                </div>
                <span class="badge" style="background: ${cat.color}20; color: ${cat.color}; font-weight: 700;">
                  ${cat.book_count} titles
                </span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); line-height: 1.5; margin-bottom: 16px;">
                ${escapeHTML(cat.description || 'No description entered.')}
              </p>
              <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--slate-100); padding-top: 12px;">
                <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal(${cat.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCategoryRecord(${cat.id})">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.renderTaxonomyDashboard(document.getElementById('mainAppContainer'));
  }
};

// Author modal helpers
function openAddAuthorModal() {
  document.getElementById('authorForm').reset();
  document.getElementById('authorFormId').value = '';
  document.getElementById('authorModalTitle').textContent = 'Add Author';
  openModal('authorEditModal');
}

function openEditAuthorModal(authorId) {
  const author = TaxonomyView.cachedAuthors.find(a => a.id === authorId);
  if (!author) return;

  document.getElementById('authorFormId').value = author.id;
  document.getElementById('authorModalTitle').textContent = 'Edit Author: ' + author.name;
  document.getElementById('authorNameInput').value = author.name || '';
  document.getElementById('authorNationalityInput').value = author.nationality || '';
  document.getElementById('authorBirthYearInput').value = author.birth_year || '';
  document.getElementById('authorDeathYearInput').value = author.death_year || '';
  document.getElementById('authorBioInput').value = author.biography || '';

  openModal('authorEditModal');
}

async function saveAuthorForm(e) {
  e.preventDefault();
  const id = document.getElementById('authorFormId').value;
  const payload = {
    name: document.getElementById('authorNameInput').value.trim(),
    nationality: document.getElementById('authorNationalityInput').value.trim(),
    birth_year: parseInt(document.getElementById('authorBirthYearInput').value, 10) || null,
    death_year: parseInt(document.getElementById('authorDeathYearInput').value, 10) || null,
    biography: document.getElementById('authorBioInput').value.trim(),
    userName: AppState.currentUser.fullName
  };

  try {
    if (id) {
      await API.updateAuthor(id, payload);
      showToast('Author updated successfully!', 'success');
    } else {
      await API.createAuthor(payload);
      showToast('Author added successfully!', 'success');
    }
    closeModal('authorEditModal');
    navigate('taxonomy');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteAuthorRecord(authorId) {
  if (!confirm('Delete this author from directory? Associated books will remain in catalog.')) return;
  try {
    await API.deleteAuthor(authorId);
    showToast('Author removed', 'warning');
    navigate('taxonomy');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Category modal helpers
function openAddCategoryModal() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryFormId').value = '';
  document.getElementById('categoryModalTitle').textContent = 'Add Category / Genre';
  document.getElementById('categoryColorInput').value = '#4f46e5';
  openModal('categoryEditModal');
}

function openEditCategoryModal(catId) {
  const cat = TaxonomyView.cachedCategories.find(c => c.id === catId);
  if (!cat) return;

  document.getElementById('categoryFormId').value = cat.id;
  document.getElementById('categoryModalTitle').textContent = 'Edit Category: ' + cat.name;
  document.getElementById('categoryNameInput').value = cat.name || '';
  document.getElementById('categoryColorInput').value = cat.color || '#4f46e5';
  document.getElementById('categoryDescInput').value = cat.description || '';

  openModal('categoryEditModal');
}

async function saveCategoryForm(e) {
  e.preventDefault();
  const id = document.getElementById('categoryFormId').value;
  const payload = {
    name: document.getElementById('categoryNameInput').value.trim(),
    color: document.getElementById('categoryColorInput').value,
    description: document.getElementById('categoryDescInput').value.trim(),
    userName: AppState.currentUser.fullName
  };

  try {
    if (id) {
      await API.updateCategory(id, payload);
      showToast('Category updated!', 'success');
    } else {
      await API.createCategory(payload);
      showToast('Category created!', 'success');
    }
    closeModal('categoryEditModal');
    navigate('taxonomy');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategoryRecord(catId) {
  if (!confirm('Delete this category?')) return;
  try {
    await API.deleteCategory(catId);
    showToast('Category deleted', 'warning');
    navigate('taxonomy');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
