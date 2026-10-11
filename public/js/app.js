// public/js/app.js - Main Client Application Orchestrator & Router

// Active View Router
function navigate(viewName) {
  AppState.currentView = viewName;

  // Update active class on nav links
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const container = document.getElementById('mainAppContainer');
  if (!container) return;

  switch (viewName) {
    case 'dashboard':
      DashboardView.render(container);
      break;
    case 'books':
      BooksView.render(container);
      break;
    case 'members':
      MembersView.render(container);
      break;
    case 'circulation':
      CirculationView.render(container);
      break;
    case 'reservations':
      ReservationsView.render(container);
      break;
    case 'fines':
      FinesView.render(container);
      break;
    case 'taxonomy':
      TaxonomyView.render(container);
      break;
    case 'reports':
      ReportsView.render(container);
      break;
    case 'settings':
      SettingsView.render(container);
      break;
    default:
      DashboardView.render(container);
      break;
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Dynamic Navigation renderer according to role
function renderNavigation() {
  const navContainer = document.getElementById('sidebarNavContainer');
  if (!navContainer) return;

  const isStaff = AppState.isStaff();
  const isAdmin = AppState.isAdmin();
  const isMember = AppState.isMember();

  if (isMember) {
    navContainer.innerHTML = `
      <div class="nav-section-title">Member Portal</div>
      <a class="nav-link ${AppState.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard" onclick="navigate('dashboard')">
        <span>📊</span> Dashboard
      </a>
      <a class="nav-link ${AppState.currentView === 'books' ? 'active' : ''}" data-view="books" onclick="navigate('books')">
        <span>📚</span> Browse Catalog
      </a>
      <a class="nav-link ${AppState.currentView === 'circulation' ? 'active' : ''}" data-view="circulation" onclick="navigate('circulation')">
        <span>📖</span> My Borrowings
      </a>
      <a class="nav-link ${AppState.currentView === 'reservations' ? 'active' : ''}" data-view="reservations" onclick="navigate('reservations')">
        <span>🔖</span> My Reservations
      </a>
      <a class="nav-link ${AppState.currentView === 'fines' ? 'active' : ''}" data-view="fines" onclick="navigate('fines')">
        <span>💰</span> Fines &amp; Receipts
      </a>
    `;
  } else {
    navContainer.innerHTML = `
      <div class="nav-section-title">Main</div>
      <a class="nav-link ${AppState.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard" onclick="navigate('dashboard')">
        <span>📊</span> Dashboard
      </a>

      <div class="nav-section-title">Catalog &amp; Readers</div>
      <a class="nav-link ${AppState.currentView === 'books' ? 'active' : ''}" data-view="books" onclick="navigate('books')">
        <span>📚</span> Books Catalog
      </a>
      <a class="nav-link ${AppState.currentView === 'members' ? 'active' : ''}" data-view="members" onclick="navigate('members')">
        <span>👥</span> Member Directory
      </a>
      <a class="nav-link ${AppState.currentView === 'taxonomy' ? 'active' : ''}" data-view="taxonomy" onclick="navigate('taxonomy')">
        <span>🏷️</span> Authors &amp; Genres
      </a>

      <div class="nav-section-title">Circulation Operations</div>
      <a class="nav-link ${AppState.currentView === 'circulation' ? 'active' : ''}" data-view="circulation" onclick="navigate('circulation')">
        <span>🔄</span> Issue &amp; Return
      </a>
      <a class="nav-link ${AppState.currentView === 'reservations' ? 'active' : ''}" data-view="reservations" onclick="navigate('reservations')">
        <span>🔖</span> Book Holds &amp; Queues
      </a>
      <a class="nav-link ${AppState.currentView === 'fines' ? 'active' : ''}" data-view="fines" onclick="navigate('fines')">
        <span>💰</span> Overdue &amp; Fines
      </a>

      <div class="nav-section-title">Analytics &amp; System</div>
      <a class="nav-link ${AppState.currentView === 'reports' ? 'active' : ''}" data-view="reports" onclick="navigate('reports')">
        <span>📈</span> Reports &amp; Exports
      </a>
      ${isAdmin ? `
        <a class="nav-link ${AppState.currentView === 'settings' ? 'active' : ''}" data-view="settings" onclick="navigate('settings')">
          <span>⚙️</span> Settings &amp; Accounts
        </a>
      ` : ''}
    `;
  }
}

// Notifications Manager
async function loadNotifications() {
  try {
    const params = {};
    if (AppState.currentUser) {
      if (AppState.currentUser.id) params.user_id = AppState.currentUser.id;
      if (AppState.currentUser.memberId) params.member_id = AppState.currentUser.memberId;
    }
    const notifs = await API.getNotifications(params);
    AppState.notifications = notifs;

    const badge = document.getElementById('notifBadgeDot');
    const unread = notifs.filter(n => !n.is_read).length;
    if (badge) {
      badge.style.display = unread > 0 ? 'block' : 'none';
    }

    const list = document.getElementById('notificationList');
    if (list) {
      if (notifs.length === 0) {
        list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--slate-500); font-size: 13px;">No notifications.</div>`;
      } else {
        list.innerHTML = notifs.map(n => `
          <div class="notification-item ${n.is_read ? '' : 'unread'}">
            <span style="font-size: 18px;">${n.type.includes('Overdue') ? '⚠️' : n.type.includes('Ready') ? '🎉' : '🔔'}</span>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 700; color: var(--slate-900);">${escapeHTML(n.title)}</div>
              <div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">${escapeHTML(n.message)}</div>
              <div style="font-size: 11px; color: var(--slate-400); margin-top: 4px;">${n.created_at}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  }
}

async function markAllNotificationsAsRead() {
  try {
    await API.markAllNotificationsRead();
    await loadNotifications();
    showToast('All notifications marked as read', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Global Search Overlay & Modal
async function openGlobalSearchModal() {
  const input = document.getElementById('globalSearchQuery');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
  document.getElementById('globalSearchResults').innerHTML = '<div style="padding: 30px; text-align: center; color: var(--slate-400);">Type keywords to search books, ISBNs, authors, or members...</div>';
  openModal('globalSearchModal');
}

let searchDebounceTimer = null;
function handleGlobalSearchInput(val) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;

    if (!val || val.trim().length < 2) {
      resultsContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--slate-400);">Type at least 2 characters...</div>';
      return;
    }

    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--slate-500);">Searching database...</div>';

    try {
      const [books, members] = await Promise.all([
        API.getBooks({ search: val.trim() }),
        AppState.isStaff() ? API.getMembers({ search: val.trim() }) : Promise.resolve([])
      ]);

      if (books.length === 0 && members.length === 0) {
        resultsContainer.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--slate-500);">No results found for "${escapeHTML(val)}".</div>`;
        return;
      }

      let html = '';

      if (books.length > 0) {
        html += `<div style="font-size: 12px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; margin-bottom: 8px;">Books (${books.length})</div>`;
        html += books.slice(0, 5).map(b => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" 
               onmouseover="this.style.background='var(--slate-100)'" onmouseout="this.style.background='transparent'"
               onclick="closeModal('globalSearchModal'); openBookDetailsModal(${b.id});">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${escapeHTML(b.cover_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=80&q=80')}" style="width: 32px; height: 42px; object-fit: cover; border-radius: 4px;">
              <div>
                <div style="font-weight: 600; font-size: 13.5px; color: var(--slate-900);">${escapeHTML(b.title)}</div>
                <div style="font-size: 11.5px; color: var(--slate-500);">by ${escapeHTML(b.author_name || 'Unknown')} &bull; ISBN: ${escapeHTML(b.isbn)}</div>
              </div>
            </div>
            <span class="badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}">${b.available_copies} avail</span>
          </div>
        `).join('');
      }

      if (members.length > 0) {
        html += `<div style="font-size: 12px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; margin: 16px 0 8px;">Members (${members.length})</div>`;
        html += members.slice(0, 4).map(m => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;"
               onmouseover="this.style.background='var(--slate-100)'" onmouseout="this.style.background='transparent'"
               onclick="closeModal('globalSearchModal'); openMemberProfileModal(${m.id});">
            <div>
              <div style="font-weight: 600; font-size: 13.5px; color: var(--slate-900);">${escapeHTML(m.name)}</div>
              <div style="font-size: 11.5px; color: var(--primary); font-family: monospace;">${escapeHTML(m.member_code)} &bull; ${escapeHTML(m.email)}</div>
            </div>
            <span class="badge badge-secondary">${escapeHTML(m.member_type)}</span>
          </div>
        `).join('');
      }

      resultsContainer.innerHTML = html;
    } catch (err) {
      resultsContainer.innerHTML = `<div style="padding: 20px; color: var(--danger);">Search error: ${err.message}</div>`;
    }
  }, 250);
}

// Role Switcher Event
function onRoleSwitcherChanged(selectEl) {
  const index = parseInt(selectEl.value, 10);
  AppState.setUser(index);
  showToast(`Switched active user to ${AppState.currentUser.fullName}`, 'primary');
}

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  AppState.init();

  // Populate persona dropdown
  const roleSelect = document.getElementById('roleSwitcherSelect');
  if (roleSelect) {
    roleSelect.innerHTML = AppState.personas.map((p, idx) => `
      <option value="${idx}" ${AppState.currentUser && AppState.currentUser.id === p.id ? 'selected' : ''}>
        ${p.role === 'Admin' ? '👑' : p.role === 'Librarian' ? '📖' : '🎓'} ${p.fullName}
      </option>
    `).join('');
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    const notifBtn = document.getElementById('notifBellBtn');
    const notifDropdown = document.getElementById('notificationDropdown');
    if (notifDropdown && notifBtn && !notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
      notifDropdown.classList.remove('active');
    }
  });

  // Global keyboard shortcut '/' for search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openGlobalSearchModal();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
        modal.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  // Load system settings
  try {
    const settings = await API.getSettings();
    AppState.systemSettings = settings;
    const brandTitle = document.getElementById('brandInstitutionTitle');
    if (brandTitle && settings.library_name) {
      brandTitle.textContent = settings.library_name;
    }
  } catch (e) {
    console.warn('Using default settings');
  }

  // Update role and render initial view
  AppState.updateRoleView();
});
