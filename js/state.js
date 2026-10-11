// public/js/state.js - Global App State & UI Utilities
const AppState = {
  // Preset demo personas for instant evaluation & testing
  personas: [
    {
      id: 1,
      username: 'admin',
      fullName: 'Victoria Sterling (Admin)',
      role: 'Admin',
      memberId: null,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 2,
      username: 'librarian',
      fullName: 'Marcus Thorne (Librarian)',
      role: 'Librarian',
      memberId: null,
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 3,
      username: 'emily',
      fullName: 'Emily Watson (Student)',
      role: 'Member',
      memberId: 1, // LIB-1001
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 4,
      username: 'alex',
      fullName: 'Dr. Alexander Vance (Faculty)',
      role: 'Member',
      memberId: 2, // LIB-1002
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
    }
  ],

  currentUser: null,
  currentView: 'dashboard',
  systemSettings: {
    currency_symbol: '$',
    fine_per_day: '1.00',
    loan_period_days: '14'
  },
  notifications: [],

  init() {
    // Restore or set default user
    const savedUserIndex = localStorage.getItem('athena_user_idx');
    const idx = savedUserIndex !== null ? parseInt(savedUserIndex, 10) : 0;
    this.currentUser = this.personas[idx] || this.personas[0];
  },

  setUser(personaIndex) {
    this.currentUser = this.personas[personaIndex];
    localStorage.setItem('athena_user_idx', personaIndex);
    this.updateRoleView();
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'Admin';
  },

  isStaff() {
    return this.currentUser && (this.currentUser.role === 'Admin' || this.currentUser.role === 'Librarian');
  },

  isMember() {
    return this.currentUser && this.currentUser.role === 'Member';
  },

  updateRoleView() {
    // Re-render navigation according to current persona
    renderNavigation();
    // Switch to appropriate view if restricted
    if (this.isMember() && (this.currentView === 'members' || this.currentView === 'settings')) {
      navigate('books');
    } else {
      navigate(this.currentView);
    }
    // Update user display badge
    const nameEl = document.getElementById('topUserFullname');
    const roleEl = document.getElementById('topUserRoleBadge');
    const avatarEl = document.getElementById('topUserAvatar');
    if (nameEl) nameEl.textContent = this.currentUser.fullName;
    if (roleEl) roleEl.textContent = this.currentUser.role;
    if (avatarEl) avatarEl.src = this.currentUser.avatar;

    loadNotifications();
  }
};

// UI Notifications (Toasts)
function showToast(message, type = 'primary') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  if (type === 'warning') icon = '🔔';

  toast.innerHTML = `
    <span style="font-size: 16px;">${icon}</span>
    <span style="flex: 1;">${escapeHTML(message)}</span>
    <span style="cursor: pointer; opacity: 0.6;" onclick="this.parentElement.remove()">&times;</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount) {
  const symbol = AppState.systemSettings.currency_symbol || '$';
  const val = parseFloat(amount || 0);
  return `${symbol}${val.toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}
