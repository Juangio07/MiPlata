/**
 * MiPlata - Main Application Controller
 * Complete Vanilla HTML5 + CSS3 + ES6 JavaScript Architecture
 * Faithfully matches original MiPla design, features, and workflows
 */

import { api } from './api.js';
import { 
  formatCOP, 
  formatCompactCOP, 
  getCurrentTimeString, 
  getTodayISODate, 
  getInitials, 
  getCurrentMonthKey, 
  formatMonthKeyToLabel, 
  getAvailableMonthsList 
} from './formatters.js';
import { 
  getLogoSvg, 
  getLogoIcon,
  getImagotipoHorizontal,
  getIconSvg, 
  getCategoryIconSvg 
} from './icons.js';
import { 
  getFinancialAlerts, 
  getFinancialTips, 
  getSortedPendingObligations, 
  getObligationUrgency,
  getDynamicGreetingStatus,
  getTimeSlotInfo 
} from './insights.js';

// Global Application State
const state = {
  currentUser: null,
  activeTab: 'inicio', // 'inicio' | 'ingresos' | 'gastos' | 'obligaciones' | 'metas' | 'perfil'
  selectedMonth: getCurrentMonthKey(),
  hideBalance: false,
  transactions: [],
  fixedObligations: [],
  savingsGoals: [],
  goalContributions: [],
  categoryBudgets: [],

  // View specific filters
  filterExpensesCategory: 'Todos',
  filterIncomesCategory: 'Todos',
  filterObligationsStatus: 'all', // 'all' | 'pending' | 'paid'
  pastMonthFilterType: 'all', // 'all' | 'gasto' | 'ingreso'
  pastMonthSearchQuery: '',

  // Quick Add State (<10s Keypad)
  quickAdd: {
    isOpen: false,
    type: 'gasto', // 'gasto' | 'ingreso'
    rawValue: '0',
    category: 'Alimentación',
    description: '',
    isRecurrent: false,
    date: getTodayISODate(),
  },

  // Carousel & UI states
  activeTipIndex: 0,
};

// Initial DOM Selectors
const DOM = {
  app: document.getElementById('app'),
  headerContainer: document.getElementById('header-container'),
  headerBrand: document.getElementById('header-brand'),
  headerSearchBtn: document.getElementById('header-search-btn'),
  headerProfileBtn: document.getElementById('header-profile-btn'),
  mainContent: document.getElementById('main-content'),
  fabContainer: document.getElementById('fab-container'),
  fabBtn: document.getElementById('fab-button'),
  bottomNav: document.getElementById('bottom-nav'),
  navItemsContainer: document.getElementById('nav-items-container'),

  // Views
  viewAuth: document.getElementById('view-auth'),
  tabInicio: document.getElementById('tab-inicio'),
  tabIngresos: document.getElementById('tab-ingresos'),
  tabGastos: document.getElementById('tab-gastos'),
  tabObligaciones: document.getElementById('tab-obligaciones'),
  tabMetas: document.getElementById('tab-metas'),
  tabPerfil: document.getElementById('tab-perfil'),

  // Modals
  modalQuickAdd: document.getElementById('modal-quick-add'),
  modalSearch: document.getElementById('modal-search'),
  searchInput: document.getElementById('search-input'),
  searchInputIcon: document.getElementById('search-input-icon'),
  searchCloseBtn: document.getElementById('search-close-btn'),
  searchResultsList: document.getElementById('search-results-list'),
  modalCashDetail: document.getElementById('modal-cash-detail'),
  modalFixedObligation: document.getElementById('modal-fixed-obligation'),
  modalSavingsGoal: document.getElementById('modal-savings-goal'),
  modalAporteGoal: document.getElementById('modal-aporte-goal'),
  modalEditTransaction: document.getElementById('modal-edit-transaction'),
  modalEditProfile: document.getElementById('modal-edit-profile'),
  modalEditBudget: document.getElementById('modal-edit-budget'),
  modalConfirmDelete: document.getElementById('modal-confirm-delete'),

  // Toast
  toastContainer: document.getElementById('toast-container'),
  toastPill: document.getElementById('toast-pill'),
  toastIcon: document.getElementById('toast-icon'),
  toastText: document.getElementById('toast-text'),
};

// Toast Helper
let toastTimeout = null;
export function showToast(message, type = 'success') {
  if (toastTimeout) clearTimeout(toastTimeout);

  DOM.toastText.textContent = message;
  let iconHtml = getIconSvg('checkCircle2', 'w-5 h-5 text-[#6cf8bb] shrink-0');
  if (type === 'error') {
    iconHtml = getIconSvg('alertCircle', 'w-5 h-5 text-rose-400 shrink-0');
  } else if (type === 'info') {
    iconHtml = getIconSvg('info', 'w-5 h-5 text-sky-400 shrink-0');
  }
  DOM.toastIcon.innerHTML = iconHtml;

  DOM.toastContainer.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    DOM.toastContainer.classList.add('hidden');
  }, 3200);
}

// Avatar Helper
function renderAvatarHtml(name, avatarUrl, size = 'md', showBadge = false) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs font-semibold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const badgeSizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  const initials = getInitials(name);
  const palettes = [
    'from-[#0058bc] to-[#0070eb] text-white',
    'from-[#006c49] to-[#10b981] text-white',
    'from-[#4f46e5] to-[#7c3aed] text-white',
    'from-[#0284c7] to-[#0ea5e9] text-white',
    'from-[#0f766e] to-[#14b8a6] text-white',
  ];
  const charCode = ((name || 'A').charCodeAt(0) || 65) + ((name || 'B').charCodeAt(1) || 66);
  const gradClass = palettes[charCode % palettes.length];

  const hasImg = Boolean(avatarUrl);
  const inner = hasImg
    ? `<img src="${avatarUrl}" alt="${name}" class="w-full h-full object-cover" onerror="this.style.display='none'" />`
    : `<span class="tracking-tight select-none font-bold uppercase">${initials}</span>`;

  const badge = showBadge
    ? `<span class="absolute bottom-0 right-0 rounded-full bg-[#006c49] ring-2 ring-white flex items-center justify-center text-white ${badgeSizeClasses[size] || 'w-3 h-3'}">${getIconSvg('check', 'w-2 h-2')}</span>`
    : '';

  return `
    <div class="relative inline-block">
      <div class="rounded-full overflow-hidden flex items-center justify-center select-none shadow-sm transition-transform ${sizeClasses[size] || sizeClasses.md} ${hasImg ? 'bg-slate-100 ring-2 ring-[#0058bc]/20' : `bg-gradient-to-br ${gradClass}`}">
        ${inner}
      </div>
      ${badge}
    </div>
  `;
}

// Obligation Context Icon Resolver
function getObligationContextIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('arriendo') || lower.includes('casa') || lower.includes('apartamento')) {
    return `<span class="text-[#0058bc]">${getIconSvg('home', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('internet') || lower.includes('fibra') || lower.includes('claro') || lower.includes('wifi')) {
    return `<span class="text-indigo-600">${getIconSvg('wifi', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('servicios') || lower.includes('agua') || lower.includes('luz') || lower.includes('epm') || lower.includes('energía')) {
    return `<span class="text-[#006c49]">${getIconSvg('droplet', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('crédito') || lower.includes('prestamo') || lower.includes('banco') || lower.includes('cuota') || lower.includes('tarjeta')) {
    return `<span class="text-amber-700">${getIconSvg('landmark', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('streaming') || lower.includes('hbo') || lower.includes('disney')) {
    return `<span class="text-purple-600">${getIconSvg('tv', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('celular') || lower.includes('tigo') || lower.includes('movistar') || lower.includes('plan')) {
    return `<span class="text-teal-600">${getIconSvg('smartphone', 'w-5 h-5')}</span>`;
  }
  return `<span class="text-slate-600">${getIconSvg('creditCard', 'w-5 h-5')}</span>`;
}

// Computed Financial Metrics
function computeMetrics() {
  const { transactions, fixedObligations, savingsGoals, currentUser, selectedMonth } = state;

  // Filter transactions for the selected month
  const monthTransactions = transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const fixedTotal = fixedObligations.reduce((sum, o) => sum + o.amount, 0);
  const fixedPaid = fixedObligations
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);
  const fixedCommitted = fixedObligations
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + o.amount, 0);

  const fixedPaidCount = fixedObligations.filter((o) => o.status === 'paid').length;
  const fixedPendingCount = fixedObligations.filter((o) => o.status === 'pending').length;

  const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  const baseBalance = currentUser?.initialBalance || 0;
  const availableCash = Math.max(0, baseBalance + totalIncome - totalExpenses - fixedCommitted);

  // The budget limit is an explicit planning value. It must not silently fall
  // back to the salary when the user has configured a different limit.
  const monthlyBudgetLimit = currentUser ? (currentUser.monthlyBudgetLimit || currentUser.monthlySalary || 0) : 0;
  const monthlyBudgetSpent = totalExpenses;
  const monthlyBudgetRemaining = Math.max(0, monthlyBudgetLimit - monthlyBudgetSpent);
  const monthlyBudgetPercent = monthlyBudgetLimit > 0 ? Math.min(100, Math.round((monthlyBudgetSpent / monthlyBudgetLimit) * 100)) : 0;

  return {
    totalIncome,
    totalExpenses,
    fixedTotal,
    fixedPaid,
    fixedCommitted,
    fixedPaidCount,
    fixedPendingCount,
    totalSavings,
    totalSavingsTarget,
    availableCash,
    monthlyBudgetLimit,
    monthlyBudgetSpent,
    monthlyBudgetRemaining,
    monthlyBudgetPercent,
    monthTransactions,
  };
}

// Navigation Handler
function switchTab(tabId) {
  state.activeTab = tabId;
  const tabs = ['inicio', 'ingresos', 'gastos', 'obligaciones', 'metas', 'perfil'];

  tabs.forEach((tab) => {
    const pane = document.getElementById(`tab-${tab}`);
    if (pane) {
      if (tab === tabId || (tabId === 'fijos' && tab === 'obligaciones')) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    }
  });

  renderHeader();
  renderBottomNav();
  renderActiveView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Data Fetcher from Python Flask Backend
async function refreshAllData() {
  if (!state.currentUser) return;
  try {
    const [txs, fixed, goals, contribs, budgets] = await Promise.all([
      api.getTransactions(),
      api.getFixedObligations(),
      api.getSavingsGoals(),
      api.getGoalContributions(),
      api.getCategoryBudgets(),
    ]);
    state.transactions = txs || [];
    state.fixedObligations = fixed || [];
    state.savingsGoals = goals || [];
    state.goalContributions = contribs || [];
    state.categoryBudgets = budgets || [];
  } catch (err) {
    console.error('Error fetching data from backend', err);
  }
}

// --- RENDER APP & VIEWS ---
export function renderApp() {
  const isAuth = Boolean(state.currentUser);

  if (!isAuth) {
    DOM.headerContainer.classList.add('hidden');
    DOM.bottomNav.classList.add('hidden');
    DOM.fabContainer.classList.add('hidden');
    DOM.viewAuth.classList.remove('hidden');

    ['inicio', 'ingresos', 'gastos', 'obligaciones', 'metas', 'perfil'].forEach((tab) => {
      const pane = document.getElementById(`tab-${tab}`);
      if (pane) pane.classList.add('hidden');
    });

    renderAuth();
    return;
  }

  DOM.headerContainer.classList.remove('hidden');
  DOM.bottomNav.classList.remove('hidden');
  DOM.fabContainer.classList.remove('hidden');
  DOM.viewAuth.classList.add('hidden');

  renderHeader();
  renderBottomNav();
  switchTab(state.activeTab);
}

function renderHeader() {
  DOM.headerBrand.innerHTML = getImagotipoHorizontal('h-7 w-auto object-contain select-none');

  DOM.headerSearchBtn.innerHTML = getIconSvg(state.activeTab === 'perfil' ? 'settings' : 'search', 'w-5 h-5 text-slate-600');
  DOM.headerSearchBtn.setAttribute('aria-label', state.activeTab === 'perfil' ? 'Configuración' : 'Buscar movimientos');

  const isProfileActive = state.activeTab === 'perfil';
  DOM.headerProfileBtn.className = `flex items-center justify-center rounded-full transition-all group p-0.5 cursor-pointer ${
    isProfileActive ? 'ring-2 ring-[#0058bc]' : 'hover:opacity-90'
  }`;
  DOM.headerProfileBtn.innerHTML = renderAvatarHtml(state.currentUser?.name, state.currentUser?.avatarUrl, 'sm');
}

function renderBottomNav() {
  // The reference navigation has five destinations. Incomes remain available
  // through the dashboard quick action and the history/search flows.
  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'gastos', label: 'Gastos', icon: 'receiptText' },
    { id: 'obligaciones', label: 'Fijos', icon: 'calendarCheck' },
    { id: 'metas', label: 'Metas', icon: 'flag' },
    { id: 'perfil', label: 'Perfil', icon: 'sliders' },
  ];

  DOM.navItemsContainer.innerHTML = navItems
    .map((item) => {
      const isActive = state.activeTab === item.id || (item.id === 'obligaciones' && state.activeTab === 'fijos');
      const iconWrapperClass = item.id === 'metas'
        ? `w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#dce8ff] text-[#0058bc]' : 'bg-slate-100 text-slate-500'}`
        : `p-1 rounded-xl transition-all ${isActive ? 'bg-[#0058bc]/10 text-[#0058bc] scale-105' : ''}`;
      return `
        <button
          id="nav-tab-${item.id}"
          data-tab="${item.id}"
          class="nav-tab-action flex-1 flex flex-col items-center justify-center min-w-0 h-12 gap-0.5 transition-all select-none active:scale-95 cursor-pointer ${
            isActive ? 'text-[#0058bc] font-bold' : 'text-slate-400 hover:text-slate-700 font-medium'
          }"
        >
          <div class="${iconWrapperClass}">
            ${getIconSvg(item.icon, 'w-5 h-5')}
          </div>
          <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-[58px]">
            ${item.label}
          </span>
        </button>
      `;
    })
    .join('');

  DOM.navItemsContainer.querySelectorAll('.nav-tab-action').forEach((btn) => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
}

function renderActiveView() {
  switch (state.activeTab) {
    case 'inicio':
      renderDashboard();
      break;
    case 'ingresos':
      renderIncomes();
      break;
    case 'gastos':
      renderExpenses();
      break;
    case 'obligaciones':
    case 'fijos':
      renderObligations();
      break;
    case 'metas':
      renderGoals();
      break;
    case 'perfil':
      renderProfile();
      break;
  }
}

// -------------------------------------------------------------
// VIEW 1: DASHBOARD (INICIO) & PAST MONTH SUMMARY VIEW
// -------------------------------------------------------------
function renderDashboardLegacy() {
  const isPastMonth = state.selectedMonth !== getCurrentMonthKey();

  if (isPastMonth) {
    renderPastMonthSummaryView(state.selectedMonth);
    return;
  }

  const metrics = computeMetrics();
  const contextData = { ...state, ...metrics };
  const greeting = getDynamicGreetingStatus(contextData);
  const alerts = getFinancialAlerts(contextData);
  const tips = getFinancialTips(contextData);
  const months = getAvailableMonthsList(6);
  const currentMonthLabel = formatMonthKeyToLabel(state.selectedMonth);
  const currentTip = tips.length > 0 ? tips[state.activeTipIndex % tips.length] : null;

  DOM.tabInicio.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Greeting & Period Switcher -->
      <div class="flex items-center justify-between pt-1">
        <div class="flex flex-col">
          <h1 class="text-2xl font-bold tracking-tight text-[#0b1c30]">
            ${greeting.title}
          </h1>
          <span class="text-xs font-medium ${greeting.statusColor}">
            ${greeting.subtitle}
          </span>
        </div>

        <!-- Period Switcher Dropdown -->
        <div class="relative">
          <button
            id="month-dropdown-btn"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-sm active:scale-95 transition-all text-xs font-semibold cursor-pointer"
          >
            ${getIconSvg('calendarDays', 'w-3.5 h-3.5 text-[#0058bc]')}
            <span>${currentMonthLabel}</span>
          </button>
          <div id="month-dropdown-menu" class="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 hidden animate-in fade-in duration-150">
            ${months
              .map(
                (m) => `
              <button
                data-month="${m.key}"
                class="month-select-item w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                  state.selectedMonth === m.key ? 'text-[#0058bc] font-semibold bg-blue-50/50' : 'text-slate-700'
                }"
              >
                ${m.label}
                ${state.selectedMonth === m.key ? '<span class="w-1.5 h-1.5 rounded-full bg-[#0058bc]"></span>' : ''}
              </button>
            `
              )
              .join('')}
        </div>
        </div>

      <!-- Main Available Balance Hero Card (Apple Wallet aesthetic) -->
      <div class="hero-card-dark">
        <div class="hero-glow-1"></div>
        <div class="hero-glow-2"></div>

        <div class="relative z-10 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Dinero Disponible
                </span>
                <button id="btn-toggle-hide-balance" class="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer" title="Ocultar saldo">
                  ${getIconSvg(state.hideBalance ? 'eyeOff' : 'eye', 'w-3.5 h-3.5')}
                </button>
              </div>
              <span class="text-[11px] text-slate-400">Libre para gastar hoy</span>
            </div>

            <button
              id="btn-open-cash-modal"
              class="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/15 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver cálculo</span>
              ${getIconSvg('chevronRight', 'w-3 h-3')}
            </button>
          </div>

          <!-- Main Amount Display -->
          <div id="hero-cash-display" class="flex items-baseline gap-2 cursor-pointer group">
            <span class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#6cf8bb] tabular-nums group-hover:scale-[1.01] transition-transform">
              ${state.hideBalance ? '••••••••' : formatCOP(metrics.availableCash)}
            </span>
            <span class="text-xs font-bold text-slate-300 uppercase">COP</span>
          </div>

          <!-- 3 Sub-pills (Ingresos, Gastado, Fijos) -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <div id="dash-pill-ingresos" class="flex flex-col p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <span class="text-[10px] text-slate-400 font-medium">Ingresos Mes</span>
              <span class="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5">
                ${state.hideBalance ? '••••' : formatCOP(metrics.totalIncome, true)}
              </span>
            </div>

            <div id="dash-pill-gastado" class="flex flex-col p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <span class="text-[10px] text-slate-400 font-medium">Gastado Hoy</span>
              <span class="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5">
                ${state.hideBalance ? '••••' : formatCOP(metrics.totalExpenses, true)}
              </span>
            </div>

            <div id="dash-pill-fijos" class="flex flex-col p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <span class="text-[10px] text-slate-400 font-medium">Fijos Pendientes</span>
              <span class="text-xs sm:text-sm font-bold text-rose-300 tabular-nums mt-0.5">
                ${state.hideBalance ? '••••' : formatCOP(metrics.fixedCommitted, true)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Action Shortcuts Bar -->
      <div class="grid grid-cols-4 gap-2">
        <button id="btn-quick-gasto" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm active:scale-95 transition-all cursor-pointer">
          <div class="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
            ${getIconSvg('receiptText', 'w-4 h-4')}
          </div>
          <span class="text-[11px] font-semibold text-slate-700">Gasto</span>
        </button>

        <button id="btn-quick-ingreso" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm active:scale-95 transition-all cursor-pointer">
          <div class="w-9 h-9 rounded-full bg-emerald-50 text-[#006c49] flex items-center justify-center mb-1">
            ${getIconSvg('trendingUp', 'w-4 h-4')}
          </div>
          <span class="text-[11px] font-semibold text-slate-700">Ingreso</span>
        </button>

        <button id="btn-quick-obligaciones" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm active:scale-95 transition-all cursor-pointer">
          <div class="w-9 h-9 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center mb-1">
            ${getIconSvg('calendarCheck', 'w-4 h-4')}
          </div>
          <span class="text-[11px] font-semibold text-slate-700">Fijos</span>
        </button>

        <button id="btn-quick-metas" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm active:scale-95 transition-all cursor-pointer">
          <div class="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
            ${getIconSvg('flag', 'w-4 h-4')}
          </div>
          <span class="text-[11px] font-semibold text-slate-700">Metas</span>
        </button>
      </div>

      <!-- Financial Alerts & Tips Feed -->
      ${alerts
        .map(
          (alert) => `
        <div class="rounded-2xl p-3 border flex items-center justify-between ${
          alert.type === 'danger'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : alert.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="shrink-0">${getIconSvg(alert.icon, 'w-4 h-4')}</div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold truncate">${alert.title}</span>
              <span class="text-[11px] opacity-80 truncate">${alert.message}</span>
            </div>
          </div>
          <button data-tab="${alert.actionTab || 'gastos'}" class="insight-alert-action shrink-0 px-2.5 py-1 rounded-full bg-white text-xs font-semibold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer">
            ${alert.actionLabel || 'Ver'}
          </button>
        </div>
      `
        )
        .join('')}

      <!-- Dynamic Financial Tip Carousel -->
      ${
        currentTip
          ? `
        <div class="rounded-3xl bg-white p-4 border border-slate-200/60 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
                ${getIconSvg(currentTip.icon, 'w-3.5 h-3.5')}
              </div>
              <span class="text-[10px] font-bold text-[#0058bc] uppercase tracking-wider">${currentTip.tag}</span>
            </div>
            <div class="flex items-center gap-1">
              <button id="tip-prev-btn" class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer">
                ${getIconSvg('chevronLeft', 'w-3.5 h-3.5')}
              </button>
              <button id="tip-next-btn" class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer">
                ${getIconSvg('chevronRight', 'w-3.5 h-3.5')}
              </button>
            </div>
          </div>
          <div>
            <h4 class="text-xs font-bold text-[#0b1c30]">${currentTip.title}</h4>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${currentTip.message}</p>
          </div>
        </div>
      `
          : ''
      }

      <!-- Fixed Obligations Progress Widget -->
      <div class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
              ${getIconSvg('calendarCheck', 'w-4 h-4')}
            </div>
            <div class="flex flex-col">
              <h3 class="text-xs font-bold text-[#0b1c30]">Gastos Fijos del Mes</h3>
              <span class="text-[11px] text-slate-500">
                ${metrics.fixedPaidCount} de ${state.fixedObligations.length} pagados (${metrics.fixedTotal > 0 ? Math.round((metrics.fixedPaid / metrics.fixedTotal) * 100) : 0}%)
              </span>
            </div>
          </div>
          <button id="dash-ver-fijos-btn" class="text-xs font-semibold text-[#0058bc] hover:underline flex items-center gap-0.5 cursor-pointer">
            Administrar ${getIconSvg('chevronRight', 'w-3.5 h-3.5')}
          </button>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="h-full rounded-full bg-[#006c49] transition-all duration-500"
            style="width: ${metrics.fixedTotal > 0 ? (metrics.fixedPaid / metrics.fixedTotal) * 100 : 0}%"
          ></div>
        </div>
      </div>

      <!-- Active Goals Preview -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-1.5">
            <h3 class="font-semibold text-sm text-[#0b1c30]">Metas Activas</h3>
            <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center">
              ${state.savingsGoals.length}
            </span>
          </div>
          <button id="dash-ver-metas-btn" class="text-xs font-semibold text-[#0058bc] flex items-center gap-0.5 hover:underline cursor-pointer">
            ${state.savingsGoals.length > 0 ? 'Explorar' : 'Crear meta'} ${getIconSvg('chevronRight', 'w-3.5 h-3.5')}
          </button>
        </div>

        ${
          state.savingsGoals.length === 0
            ? `
          <div id="dash-empty-goals" class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/60 flex items-center justify-between gap-3 cursor-pointer hover:border-[#0058bc]/40 transition-all active:scale-[0.99]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-[#006c49] flex items-center justify-center shrink-0">
                ${getIconSvg('flag', 'w-5 h-5')}
              </div>
              <div class="flex flex-col">
                <p class="text-xs font-semibold text-[#0b1c30]">Empieza a ahorrar para tus sueños</p>
                <p class="text-[11px] text-slate-500">Crea tu primera meta (ej. Fondo de emergencia o vacaciones)</p>
              </div>
            </div>
            <span class="text-xs font-semibold text-[#0058bc] shrink-0">Crear</span>
          </div>
        `
            : `
          <div class="grid grid-cols-2 gap-2.5">
            ${state.savingsGoals
              .slice(0, 2)
              .map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return `
                <div data-goal="${goal.id}" class="dash-goal-card rounded-3xl bg-white p-3.5 shadow-sm border border-slate-200/60 flex flex-col justify-between gap-2.5 cursor-pointer hover:border-[#0058bc]/40 transition-all active:scale-[0.98]">
                  <div class="flex items-center justify-between">
                    <div class="${goal.imageUrl ? 'w-8 h-8 flex items-center justify-center overflow-hidden' : 'w-8 h-8 rounded-2xl flex items-center justify-center'}" style="${goal.imageUrl ? '' : `background-color: ${goal.color}20; color: ${goal.color}`}" >
                      ${renderGoalMedia(goal, 'w-full h-full object-contain', 'w-4 h-4')}
                    </div>
                    <span class="text-xs font-bold" style="color: ${goal.color}">${percent}%</span>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-[#0b1c30] truncate">${goal.name}</p>
                    <p class="text-[11px] text-slate-500 font-medium tabular-nums mt-0.5">
                      ${formatCompactCOP(goal.currentAmount)} / ${formatCompactCOP(goal.targetAmount)}
                    </p>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${percent}%; background-color: ${goal.color}"></div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Recent Movements List -->
      <div class="flex flex-col gap-2 pt-1">
        <div class="flex items-center justify-between px-1">
          <h3 class="font-semibold text-sm text-[#0b1c30]">Movimientos Recientes</h3>
          <button id="dash-ver-historial-btn" class="text-xs font-semibold text-[#0058bc] flex items-center gap-0.5 hover:underline cursor-pointer">
            Ver historial ${getIconSvg('chevronRight', 'w-3.5 h-3.5')}
          </button>
        </div>

        ${
          metrics.monthTransactions.length === 0
            ? `
          <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center gap-2">
            <div class="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-[#0058bc]">
              ${getIconSvg('plusCircle', 'w-6 h-6')}
            </div>
            <div>
              <p class="text-xs font-semibold text-[#0b1c30]">Sin movimientos en este período</p>
              <p class="text-[11px] text-slate-500 max-w-xs mt-0.5">
                Registra tu primer ingreso o gasto con el botón de abajo en menos de 10 segundos.
              </p>
            </div>
            <button id="dash-empty-first-btn" class="mt-1 px-4 py-2 rounded-full bg-[#0058bc] text-white text-xs font-semibold shadow-sm hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Registrar primer movimiento
            </button>
          </div>
        `
            : `
          <div class="rounded-3xl bg-white shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
            ${metrics.monthTransactions
              .slice(0, 5)
              .map(
                (tx) => `
              <div data-tx-id="${tx.id}" class="dash-tx-row flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    ${tx.type === 'ingreso' ? `<span class="text-[#006c49]">${getIconSvg('arrowUpRight', 'w-5 h-5')}</span>` : getCategoryIconSvg(tx.category)}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <p class="text-xs font-semibold text-[#0b1c30] truncate">${tx.description}</p>
                    <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.accountMethod || tx.category}</p>
                  </div>
                </div>
                <div class="flex flex-col items-end shrink-0 pl-2">
                  <span class="text-xs sm:text-sm font-bold tabular-nums ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-[#0b1c30]'}">
                    ${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)}
                  </span>
                  <span class="text-[10px] text-slate-400 font-medium">COP</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  // Attach Dashboard Events
  const monthBtn = document.getElementById('month-dropdown-btn');
  const monthMenu = document.getElementById('month-dropdown-menu');
  if (monthBtn && monthMenu) {
    monthBtn.onclick = (e) => {
      e.stopPropagation();
      monthMenu.classList.toggle('hidden');
    };
    document.addEventListener('click', () => monthMenu.classList.add('hidden'), { once: true });
    monthMenu.querySelectorAll('.month-select-item').forEach((item) => {
      item.onclick = (e) => {
        e.stopPropagation();
        state.selectedMonth = item.dataset.month;
        monthMenu.classList.add('hidden');
        renderDashboard();
      };
    });
  }

  const btnToggleHide = document.getElementById('btn-toggle-hide-balance');
  if (btnToggleHide) {
    btnToggleHide.onclick = () => {
      state.hideBalance = !state.hideBalance;
      renderDashboard();
    };
  }

  const btnCashModal = document.getElementById('btn-open-cash-modal');
  const heroCash = document.getElementById('hero-cash-display');
  if (btnCashModal) btnCashModal.onclick = openCashDetailModal;
  if (heroCash) heroCash.onclick = openCashDetailModal;

  const pillIngresos = document.getElementById('dash-pill-ingresos');
  const pillGastado = document.getElementById('dash-pill-gastado');
  const pillFijos = document.getElementById('dash-pill-fijos');
  if (pillIngresos) pillIngresos.onclick = () => switchTab('ingresos');
  if (pillGastado) pillGastado.onclick = () => switchTab('gastos');
  if (pillFijos) pillFijos.onclick = () => switchTab('obligaciones');

  const btnQuickGasto = document.getElementById('btn-quick-gasto');
  const btnQuickIngreso = document.getElementById('btn-quick-ingreso');
  const btnQuickOblig = document.getElementById('btn-quick-obligaciones');
  const btnQuickMetas = document.getElementById('btn-quick-metas');
  if (btnQuickGasto) btnQuickGasto.onclick = () => openQuickAddModal('gasto');
  if (btnQuickIngreso) btnQuickIngreso.onclick = () => openQuickAddModal('ingreso');
  if (btnQuickOblig) btnQuickOblig.onclick = () => switchTab('obligaciones');
  if (btnQuickMetas) btnQuickMetas.onclick = () => switchTab('metas');

  const verFijosBtn = document.getElementById('dash-ver-fijos-btn');
  const verMetasBtn = document.getElementById('dash-ver-metas-btn');
  const verHistorialBtn = document.getElementById('dash-ver-historial-btn');
  const emptyFirstBtn = document.getElementById('dash-empty-first-btn');
  const emptyGoals = document.getElementById('dash-empty-goals');

  if (verFijosBtn) verFijosBtn.onclick = () => switchTab('obligaciones');
  if (verMetasBtn) verMetasBtn.onclick = () => switchTab('metas');
  if (verHistorialBtn) verHistorialBtn.onclick = () => switchTab('gastos');
  if (emptyFirstBtn) emptyFirstBtn.onclick = () => openQuickAddModal('ingreso');
  if (emptyGoals) emptyGoals.onclick = () => switchTab('metas');

  document.querySelectorAll('.dash-goal-card').forEach((card) => {
    card.onclick = () => switchTab('metas');
  });

  document.querySelectorAll('.dash-tx-row').forEach((row) => {
    row.onclick = () => {
      const tx = state.transactions.find((t) => t.id === row.dataset.txId);
      if (tx) openEditTransactionModal(tx);
    };
  });

  document.querySelectorAll('.insight-alert-action').forEach((btn) => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  const tipPrev = document.getElementById('tip-prev-btn');
  const tipNext = document.getElementById('tip-next-btn');
  if (tipPrev && tips.length > 0) {
    tipPrev.onclick = () => {
      state.activeTipIndex = (state.activeTipIndex - 1 + tips.length) % tips.length;
      renderDashboard();
    };
  }
  if (tipNext && tips.length > 0) {
    tipNext.onclick = () => {
      state.activeTipIndex = (state.activeTipIndex + 1) % tips.length;
      renderDashboard();
    };
  }
}

// Reference dashboard: compact mobile-first hierarchy used by the supplied
// mockup. The legacy dashboard remains below for historical-month summaries.
function renderDashboard() {
  if (state.selectedMonth !== getCurrentMonthKey()) {
    renderPastMonthSummaryView(state.selectedMonth);
    return;
  }

  const metrics = computeMetrics();
  const user = state.currentUser || {};
  const firstName = (user.name || 'Camila').split(' ')[0];
  const monthLabel = formatMonthKeyToLabel(state.selectedMonth);
  const months = getAvailableMonthsList(6);
  const pending = state.fixedObligations.filter((o) => o.status === 'pending');
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0);
  const budgetLimit = metrics.monthlyBudgetLimit;
  const budgetPercent = budgetLimit > 0 ? Math.min(100, Math.round((metrics.monthlyBudgetSpent / budgetLimit) * 100)) : 0;
  const goals = state.savingsGoals.slice(0, 2);
  const recent = metrics.monthTransactions.slice(0, 5);
  const tips = getFinancialTips({ ...state, ...metrics });
  const tipIndex = tips.length ? state.activeTipIndex % tips.length : 0;
  const activeTip = tips[tipIndex] || null;
  const timeSlot = getTimeSlotInfo();

  DOM.tabInicio.innerHTML = `
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-[27px] leading-none font-extrabold tracking-tight text-[#0b1c30]">Hola, ${firstName} 👋</h1>
          <p class="text-sm text-slate-600 mt-1">Tus finanzas van sobre ruedas<br class="sm:hidden" /> este mes</p>
        </div>
        <div class="relative shrink-0">
          <button id="month-dropdown-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#dce8ff] text-[#0b1c30] text-xs font-semibold cursor-pointer">
            ${getIconSvg('calendarDays', 'w-4 h-4 text-[#0058bc]')}
            <span>${monthLabel}</span>
            ${getIconSvg('chevronDown', 'w-3.5 h-3.5 text-slate-500')}
          </button>
          <div id="month-dropdown-menu" class="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 hidden">
            ${months.map((m) => `<button data-month="${m.key}" class="month-select-item w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 ${state.selectedMonth === m.key ? 'text-[#0058bc] bg-blue-50/50' : 'text-slate-700'}">${m.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="hero-card-dark mockup-home-hero p-5">
        <div class="hero-glow-1"></div><div class="hero-glow-2"></div>
        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
              ${getIconSvg('shieldCheck', 'w-4 h-4 text-[#6cf8bb]')} DINERO DISPONIBLE
            </span>
            <button id="btn-toggle-hide-balance" aria-label="${state.hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}" title="${state.hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer">
              ${getIconSvg(state.hideBalance ? 'eyeOff' : 'eye', 'w-4 h-4')}
            </button>
          </div>
          <div id="hero-cash-display" class="flex items-baseline gap-2 cursor-pointer">
            <span class="text-[38px] leading-none font-extrabold tracking-tight text-white tabular-nums">${state.hideBalance ? '••••••••' : formatCOP(metrics.availableCash)}</span>
            <span class="text-xs font-semibold text-slate-300">COP</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <div id="dash-pill-ingresos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-[#6cf8bb] font-semibold">• Ingresos</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(metrics.totalIncome, true)}</strong></div>
            <div id="dash-pill-gastado" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-rose-200 font-semibold">• Gastado</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(metrics.totalExpenses, true)}</strong></div>
            <div id="dash-pill-fijos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-slate-300 font-semibold">• Compromet.</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(pendingAmount, true)}</strong></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button id="btn-quick-gasto" class="mockup-quick-action active flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#0058bc] text-white py-3 cursor-pointer">${getIconSvg('plusCircle', 'w-5 h-5')}<span class="text-[11px] font-semibold">Gasto</span></button>
        <button id="btn-quick-ingreso" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#006c49] py-3 border border-slate-100 cursor-pointer">${getIconSvg('arrowDownCircle', 'w-5 h-5')}<span class="text-[11px] font-semibold">Ingreso</span></button>
        <button id="btn-quick-obligaciones" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#0058bc] py-3 border border-slate-100 cursor-pointer">${getIconSvg('calendar', 'w-5 h-5')}<span class="text-[11px] font-semibold">Pagar Fijo</span></button>
        <button id="btn-quick-metas" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-rose-600 py-3 border border-slate-100 cursor-pointer">${getIconSvg('flag', 'w-5 h-5')}<span class="text-[11px] font-semibold">Nueva Meta</span></button>
      </div>

      <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${getIconSvg('pieChart', 'w-5 h-5')}</div>
            <div class="min-w-0"><h2 class="font-semibold text-base text-[#0b1c30]">Presupuesto del Mes</h2><p class="text-xs text-slate-500">Límite mensual responsable</p></div>
          </div>
          <span class="rounded-full bg-[#c7f7e3] px-3 py-1 text-xs font-semibold text-[#006c49] whitespace-nowrap">${budgetPercent}% en regla</span>
        </div>
        <div class="mt-4 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc] transition-all duration-500" style="width:${budgetPercent}%"></div></div>
        <div class="flex items-center justify-between gap-3 mt-3 text-sm"><span class="text-slate-600">Gastado: <strong class="text-[#0b1c30]">${formatCOP(metrics.monthlyBudgetSpent)} COP</strong></span><span class="text-right text-[#006c49]">Restante: <strong>${formatCOP(metrics.monthlyBudgetRemaining)} COP</strong></span></div>
      </div>

      ${pending.length ? `
        <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-full bg-[#ffe1e7] text-[#f3194d] flex items-center justify-center shrink-0">${getIconSvg('bellRing', 'w-5 h-5')}</div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#0b1c30]">${pending.length} ${pending.length === 1 ? 'fijo' : 'fijos'} por pagar</p>
              <p class="text-sm font-bold text-[#f3194d]">${formatCOP(metrics.fixedCommitted)} COP este mes</p>
            </div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver fijos</button>
        </div>
      ` : `
        <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${getIconSvg('calendarCheck', 'w-5 h-5')}</div>
            <div class="min-w-0"><p class="text-sm font-semibold text-[#0b1c30]">Gastos fijos del mes</p><p class="text-xs text-slate-500">¡Todo al día este mes!</p></div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver obligaciones</button>
        </div>
      `}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Metas Activas <span class="ml-1 rounded-full bg-[#dce8ff] px-2 py-0.5 text-xs">${state.savingsGoals.length}</span></h2><button id="dash-ver-metas-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Explorar ${getIconSvg('chevronRight', 'w-3 h-3 inline')}</button></div>
        <div class="grid grid-cols-2 gap-2.5">
          ${goals.map((goal) => { const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0; return `<div data-goal="${goal.id}" class="dash-goal-card rounded-3xl bg-white p-3.5 shadow-sm border border-slate-100 cursor-pointer"><div class="flex items-center justify-between"><div class="w-9 h-9 rounded-full flex items-center justify-center" style="background-color:${goal.color}25;color:${goal.color}">${getIconSvg(goal.icon === 'laptop' ? 'laptop' : goal.icon === 'plane' ? 'plane' : 'shield', 'w-4 h-4')}</div><span class="text-xs font-bold" style="color:${goal.color}">${percent}%</span></div><p class="mt-2 text-xs font-semibold truncate">${goal.name}</p><p class="text-[11px] text-slate-600 tabular-nums">${formatCompactCOP(goal.currentAmount)} / ${formatCompactCOP(goal.targetAmount)}</p><div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${percent}%;background:${goal.color}"></div></div></div>`; }).join('')}
        </div>
      </div>

      ${tips.length ? `
        <section class="financial-tips-shell rounded-[26px] border border-[#c6dcff] bg-gradient-to-br from-[#eef5ff] to-[#dceaff] p-4 shadow-sm overflow-hidden">
          <div id="financial-tips-scroll" class="financial-tips-scroll no-scrollbar">
            ${tips.map((tip, index) => {
              const tipIcon = {
                goal: 'flag',
                budget: 'pieChart',
                fixed: 'calendarCheck',
                category: 'receiptText',
                daily: 'calendarDays',
                safety: 'shieldCheck',
                review: 'fileText',
                income: 'trendingUp',
              }[tip.iconType] || 'lightbulb';
              return `
                <article class="financial-tip-card snap-start min-w-full flex flex-col gap-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${getIconSvg(tipIcon, 'w-5 h-5')}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-extrabold tracking-wide text-[#0058bc] uppercase truncate">Impulso inteligente <span class="text-[10px] font-semibold tracking-normal text-amber-600 normal-case">☀️ ${timeSlot.slot === 'morning' ? 'Mañana' : 'Tarde/Noche'}</span></p>
                        <p class="text-[11px] text-[#496b9d] truncate">Calculado con tu salario y gastos reales • ${timeSlot.label} • Rota 2 veces/día</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 rounded-full bg-white/75 px-1.5 py-1 shadow-sm">
                      <button type="button" data-tip-direction="-1" aria-label="Consejo anterior" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${getIconSvg('chevronLeft', 'w-4 h-4')}</button>
                      <span class="financial-tip-count text-xs font-bold text-[#0b1c30] tabular-nums">${index + 1}/${tips.length}</span>
                      <button type="button" data-tip-direction="1" aria-label="Siguiente consejo" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${getIconSvg('chevronRight', 'w-4 h-4')}</button>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-[17px] leading-tight font-bold text-[#0b1c30]">${tip.title}</h3>
                    <p class="mt-2 text-sm leading-relaxed text-[#365579]">${tip.message}</p>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-t border-[#b9d2fa] pt-2">
                    <button type="button" data-tip-next class="text-sm font-medium text-[#1a4b89] flex items-center gap-1 cursor-pointer">${getIconSvg('rotateCcw', 'w-4 h-4')} Ver otro consejo</button>
                    <button type="button" data-tip-action data-tip-tab="${tip.actionTab || 'inicio'}" class="text-sm font-bold text-[#0058bc] flex items-center gap-1 cursor-pointer whitespace-nowrap">${tip.actionLabel || 'Ver detalle'} ${getIconSvg('chevronRight', 'w-4 h-4')}</button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Movimientos Recientes</h2><button id="dash-ver-historial-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Ver historial</button></div>
        <div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          ${recent.map((tx) => `<div data-tx-id="${tx.id}" class="dash-tx-row flex items-center justify-between py-3 cursor-pointer"><div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-full bg-[#dce8ff] flex items-center justify-center shrink-0">${tx.type === 'ingreso' ? getIconSvg('trendingUp', 'w-4 h-4 text-[#006c49]') : getCategoryIconSvg(tx.category, 'w-4 h-4')}</div><div class="min-w-0"><p class="text-xs font-semibold truncate">${tx.description}</p><p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.time || tx.accountMethod || tx.category}</p></div></div><div class="text-right shrink-0"><strong class="text-sm tabular-nums ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-[#0b1c30]'}">${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)}</strong><span class="block text-[10px] ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-slate-500'}">${tx.type === 'ingreso' ? 'Ingreso' : tx.accountMethod || 'COP'}</span></div></div>`).join('')}
        </div>
      </div>
    </div>
  `;

  const monthBtn = document.getElementById('month-dropdown-btn');
  const monthMenu = document.getElementById('month-dropdown-menu');
  if (monthBtn && monthMenu) {
    monthBtn.onclick = (event) => { event.stopPropagation(); monthMenu.classList.toggle('hidden'); };
    monthMenu.querySelectorAll('.month-select-item').forEach((item) => { item.onclick = () => { state.selectedMonth = item.dataset.month; renderDashboard(); }; });
  }
  const tipScroller = document.getElementById('financial-tips-scroll');
  if (tipScroller && tips.length) {
    const scrollToTip = (offset) => {
      const nextIndex = (state.activeTipIndex + offset + tips.length) % tips.length;
      state.activeTipIndex = nextIndex;
      tipScroller.scrollTo({ left: nextIndex * tipScroller.clientWidth, behavior: 'smooth' });
    };
    tipScroller.querySelectorAll('[data-tip-direction]').forEach((button) => {
      button.onclick = () => scrollToTip(Number(button.dataset.tipDirection) || 1);
    });
    tipScroller.querySelectorAll('[data-tip-next]').forEach((button) => {
      button.onclick = () => scrollToTip(1);
    });
    tipScroller.querySelectorAll('[data-tip-action]').forEach((button) => {
      button.onclick = () => switchTab(button.dataset.tipTab || 'inicio');
    });
    tipScroller.addEventListener('scroll', () => {
      const width = Math.max(1, tipScroller.clientWidth);
      state.activeTipIndex = Math.max(0, Math.min(tips.length - 1, Math.round(tipScroller.scrollLeft / width)));
    }, { passive: true });
    requestAnimationFrame(() => {
      tipScroller.scrollLeft = tipIndex * tipScroller.clientWidth;
    });
  }
  document.getElementById('btn-toggle-hide-balance')?.addEventListener('click', () => { state.hideBalance = !state.hideBalance; renderDashboard(); });
  document.getElementById('hero-cash-display')?.addEventListener('click', openCashDetailModal);
  document.getElementById('dash-pill-ingresos')?.addEventListener('click', () => switchTab('ingresos'));
  document.getElementById('dash-pill-gastado')?.addEventListener('click', () => switchTab('gastos'));
  document.getElementById('dash-pill-fijos')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('btn-quick-gasto')?.addEventListener('click', () => openQuickAddModal('gasto'));
  document.getElementById('btn-quick-ingreso')?.addEventListener('click', () => openQuickAddModal('ingreso'));
  document.getElementById('btn-quick-obligaciones')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('btn-quick-metas')?.addEventListener('click', () => openAddOrEditGoalModal(null));
  document.getElementById('dash-ver-fijos-btn')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('dash-ver-metas-btn')?.addEventListener('click', () => switchTab('metas'));
  document.getElementById('dash-ver-historial-btn')?.addEventListener('click', () => switchTab('gastos'));
  DOM.tabInicio.querySelectorAll('.dash-goal-card').forEach((card) => { card.onclick = () => switchTab('metas'); });
  DOM.tabInicio.querySelectorAll('.dash-tx-row').forEach((row) => { row.onclick = () => { const tx = state.transactions.find((item) => item.id === row.dataset.txId); if (tx) openEditTransactionModal(tx); }; });
}

// -------------------------------------------------------------
// PAST MONTH SUMMARY VIEW (Mes Cerrado / Histórico Consolidado)
// -------------------------------------------------------------
function renderPastMonthSummaryView(monthKey) {
  const monthLabel = formatMonthKeyToLabel(monthKey);
  const currentMonthLabel = formatMonthKeyToLabel(getCurrentMonthKey());

  const monthTransactions = state.transactions.filter((t) => t.date && t.date.startsWith(monthKey));

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const monthlySalary = state.currentUser?.monthlySalary || state.currentUser?.monthlyBudgetLimit || totalIncome || 0;
  const budgetConsumedPercent = monthlySalary > 0
    ? Math.min(100, Math.round((totalExpenses / monthlySalary) * 100))
    : 0;

  // Category breakdown for expenses
  const expenseMap = {};
  monthTransactions
    .filter((t) => t.type === 'gasto')
    .forEach((t) => {
      if (!expenseMap[t.category]) expenseMap[t.category] = { amount: 0, count: 0 };
      expenseMap[t.category].amount += t.amount;
      expenseMap[t.category].count += 1;
    });

  const categoryBreakdown = Object.entries(expenseMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Income sources breakdown
  const incomeMap = {};
  monthTransactions
    .filter((t) => t.type === 'ingreso')
    .forEach((t) => {
      if (!incomeMap[t.category]) incomeMap[t.category] = { amount: 0, count: 0 };
      incomeMap[t.category].amount += t.amount;
      incomeMap[t.category].count += 1;
    });

  const incomeBreakdown = Object.entries(incomeMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Filtered transactions for the table
  const displayedTransactions = monthTransactions.filter((tx) => {
    const matchesType = state.pastMonthFilterType === 'all' || tx.type === state.pastMonthFilterType;
    const matchesSearch =
      !state.pastMonthSearchQuery.trim() ||
      tx.description.toLowerCase().includes(state.pastMonthSearchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(state.pastMonthSearchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  DOM.tabInicio.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Return to Current Month Notice Bar -->
      <div class="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/70 text-slate-800 shadow-sm">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#0058bc] text-white flex items-center justify-center shrink-0 shadow-sm">
            ${getIconSvg('calendar', 'w-4 h-4')}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-[#0058bc] truncate">Mes Cerrado • ${monthLabel}</p>
            <p class="text-[11px] text-slate-500 truncate">Visualizando balance consolidado e histórico</p>
          </div>
        </div>

        <button
          id="btn-back-current-month"
          class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100/50 text-[#0058bc] text-xs font-semibold border border-blue-200 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          ${getIconSvg('arrowLeft', 'w-3.5 h-3.5')}
          <span>Volver a ${currentMonthLabel}</span>
        </button>
      </div>

      <!-- Main Executive Summary Card (Apple Wallet aesthetic) -->
      <div class="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0c1f38] via-[#0f2a4d] to-[#071526] text-white p-5 shadow-xl border border-slate-700/60">
        <div class="absolute -right-10 -bottom-10 w-52 h-52 rounded-full bg-[#0058bc]/25 blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#3cd59c]/15 blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#6cf8bb] text-[10px] font-bold uppercase tracking-wider mb-1">
                <span class="w-1.5 h-1.5 rounded-full bg-[#6cf8bb] animate-pulse"></span>
                Balance Consolidado
              </div>
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Resumen de ${monthLabel}
              </h2>
            </div>

          </div>

          <!-- 4 Core Financial Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Ingresos Totales</span>
                <span class="text-[#6cf8bb]">${getIconSvg('trendingUp', 'w-3.5 h-3.5')}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${formatCOP(totalIncome)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${monthTransactions.filter((t) => t.type === 'ingreso').length} transacciones</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Gastos Totales</span>
                <span class="text-rose-400">${getIconSvg('trendingDown', 'w-3.5 h-3.5')}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${formatCOP(totalExpenses)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${monthTransactions.filter((t) => t.type === 'gasto').length} consumos</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Ahorro Neto</span>
                <span class="text-emerald-400">${getIconSvg('piggyBank', 'w-3.5 h-3.5')}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold ${netSavings >= 0 ? 'text-[#6cf8bb]' : 'text-rose-400'} tabular-nums tracking-tight">
                  ${netSavings >= 0 ? '+' : ''}${formatCOP(netSavings)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${netSavings >= 0 ? 'Superávit mensual' : 'Déficit mensual'}</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Tasa de Ahorro</span>
                <span class="text-sky-300">${getIconSvg('pieChart', 'w-3.5 h-3.5')}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${savingsRate.toFixed(1)}%
                </p>
                <span class="text-[10px] text-slate-400 font-medium">Meta ideal: ≥20%</span>
              </div>
            </div>
          </div>

          <!-- Budget Consumed Progress Bar -->
          <div class="pt-2 border-t border-white/10 flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs text-slate-300">
              <span>Presupuesto Consumido</span>
              <span class="font-bold text-white tabular-nums">${budgetConsumedPercent}% del salario</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500 ${budgetConsumedPercent > 100 ? 'bg-rose-500' : budgetConsumedPercent > 80 ? 'bg-amber-400' : 'bg-[#6cf8bb]'}"
                style="width: ${budgetConsumedPercent}%"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports are available only from Inicio when viewing a closed month. -->
      <section class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/60">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">
              ${getIconSvg('fileSpreadsheet', 'w-5 h-5')}
            </div>
            <div class="min-w-0">
              <h3 class="font-bold text-sm text-[#0b1c30]">Reportes</h3>
              <p class="text-xs text-slate-500 truncate">Resumen de ${monthLabel}</p>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-[#0058bc]">Mes anterior</span>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <button id="btn-past-export-csv" class="h-10 rounded-2xl bg-[#eef3ff] text-[#0058bc] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#dce8ff] transition-colors">
            ${getIconSvg('download', 'w-3.5 h-3.5')}
            <span>CSV</span>
          </button>
          <button id="btn-past-print-pdf" class="h-10 rounded-2xl bg-[#eef3ff] text-[#0058bc] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#dce8ff] transition-colors">
            ${getIconSvg('printer', 'w-3.5 h-3.5')}
            <span>PDF</span>
          </button>
          <button id="btn-past-copy-summary" class="h-10 rounded-2xl bg-[#eef3ff] text-[#0058bc] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#dce8ff] transition-colors" title="Copiar texto resumen">
            ${getIconSvg('copy', 'w-3.5 h-3.5')}
            <span>Copiar</span>
          </button>
        </div>
      </section>

      <!-- Expense Categories Breakdown -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <h3 class="font-bold text-sm text-[#0b1c30]">Distribución de Gastos por Categoría</h3>
        ${
          categoryBreakdown.length === 0
            ? '<p class="text-xs text-slate-400">Sin gastos en este período.</p>'
            : `
          <div class="flex flex-col gap-2.5">
            ${categoryBreakdown
              .map(
                (item) => `
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#0058bc]"></span>
                    <span class="font-semibold text-slate-800">${item.category}</span>
                    <span class="text-[11px] text-slate-400">(${item.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 tabular-nums">${formatCOP(item.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#0058bc]" style="width: ${item.percentage}%"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Income Sources Breakdown -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <h3 class="font-bold text-sm text-[#0b1c30]">Fuentes de Ingreso</h3>
        ${
          incomeBreakdown.length === 0
            ? '<p class="text-xs text-slate-400">Sin ingresos en este período.</p>'
            : `
          <div class="flex flex-col gap-2.5">
            ${incomeBreakdown
              .map(
                (item) => `
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#006c49]"></span>
                    <span class="font-semibold text-slate-800">${item.category}</span>
                    <span class="text-[11px] text-slate-400">(${item.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[#006c49] tabular-nums">+${formatCOP(item.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#006c49]" style="width: ${item.percentage}%"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Transaction Log for the Past Month with Search & Filter -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-[#0b1c30]">Movimientos Registrados</h3>
          <span class="text-xs text-slate-400">${displayedTransactions.length} de ${monthTransactions.length}</span>
        </div>

        <!-- Filter Segmented Control & Search -->
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="bg-slate-100 p-1 rounded-full flex items-center shrink-0">
            <button id="filter-pm-all" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${state.pastMonthFilterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}">Todos</button>
            <button id="filter-pm-gasto" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${state.pastMonthFilterType === 'gasto' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}">Gastos</button>
            <button id="filter-pm-ingreso" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${state.pastMonthFilterType === 'ingreso' ? 'bg-white text-[#006c49] shadow-sm' : 'text-slate-500'}">Ingresos</button>
          </div>

          <div class="relative flex-1">
            <input
              id="search-pm-input"
              type="text"
              placeholder="Buscar en este mes..."
              value="${state.pastMonthSearchQuery}"
              class="w-full px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]"
            />
          </div>
        </div>

        <!-- List -->
        <div class="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          ${
            displayedTransactions.length === 0
              ? '<p class="text-xs text-slate-400 py-4 text-center">No hay movimientos que coincidan con la búsqueda.</p>'
              : displayedTransactions
                  .map(
                    (tx) => `
                <div data-tx-id="${tx.id}" class="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      ${tx.type === 'ingreso' ? `<span class="text-[#006c49]">${getIconSvg('arrowUpRight', 'w-4 h-4')}</span>` : getCategoryIconSvg(tx.category, 'w-4 h-4')}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-slate-800 truncate">${tx.description}</span>
                      <span class="text-[10px] text-slate-400">${tx.date} • ${tx.category}</span>
                    </div>
                  </div>
                  <span class="font-bold tabular-nums ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-slate-800'}">
                    ${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)} COP
                  </span>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    </div>
  `;

  // Past Month Event Handlers
  document.getElementById('btn-back-current-month').onclick = () => {
    state.selectedMonth = getCurrentMonthKey();
    renderDashboard();
  };

  document.getElementById('btn-past-export-csv').onclick = () => {
    window.location.href = `/api/export/csv?month=${monthKey}`;
  };

  document.getElementById('btn-past-print-pdf').onclick = () => {
    window.print();
  };

  document.getElementById('btn-past-copy-summary').onclick = async () => {
    const summaryText = `Resumen Financiero MiPlata - ${monthLabel}\n-----------------------------\nIngresos: ${formatCOP(totalIncome)} COP\nGastos: ${formatCOP(totalExpenses)} COP\nAhorro Neto: ${formatCOP(netSavings)} COP\nTasa de Ahorro: ${savingsRate.toFixed(1)}%\nPresupuesto consumido: ${budgetConsumedPercent}%`;
    try {
      await navigator.clipboard.writeText(summaryText);
      showToast(`Resumen de ${monthLabel} copiado al portapapeles`);
    } catch {
      showToast('No se pudo copiar al portapapeles', 'info');
    }
  };

  document.getElementById('filter-pm-all').onclick = () => {
    state.pastMonthFilterType = 'all';
    renderPastMonthSummaryView(monthKey);
  };
  document.getElementById('filter-pm-gasto').onclick = () => {
    state.pastMonthFilterType = 'gasto';
    renderPastMonthSummaryView(monthKey);
  };
  document.getElementById('filter-pm-ingreso').onclick = () => {
    state.pastMonthFilterType = 'ingreso';
    renderPastMonthSummaryView(monthKey);
  };

  const pmSearchInput = document.getElementById('search-pm-input');
  if (pmSearchInput) {
    pmSearchInput.oninput = (e) => {
      state.pastMonthSearchQuery = e.target.value;
      renderPastMonthSummaryView(monthKey);
    };
  }

  DOM.tabInicio.querySelectorAll('[data-tx-id]').forEach((row) => {
    row.onclick = () => {
      const tx = state.transactions.find((t) => t.id === row.dataset.txId);
      if (tx) openEditTransactionModal(tx);
    };
  });
}

// -------------------------------------------------------------
// VIEW 2: INGRESOS
// -------------------------------------------------------------
function renderIncomes() {
  const allIncomes = state.transactions.filter((t) => t.type === 'ingreso');
  const totalIncome = allIncomes.reduce((sum, t) => sum + t.amount, 0);
  const salary = state.currentUser?.monthlySalary || state.currentUser?.monthlyBudgetLimit || 0;

  const categories = ['Todos', 'Nómina', 'Honorarios', 'Negocio', 'Inversión', 'Otros'];

  const filteredIncomes =
    state.filterIncomesCategory === 'Todos'
      ? allIncomes
      : allIncomes.filter((t) => t.category === state.filterIncomesCategory);

  const percentSalary = salary > 0 ? Math.round((totalIncome / salary) * 100) : 0;

  DOM.tabIngresos.innerHTML = `
    <div class="max-w-xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
      <!-- View Header -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#006c49] bg-[#006c49]/10 px-2.5 py-0.5 rounded-full">
            Dinero Recibido
          </span>
          <h1 class="text-2xl font-black text-[#0b1c30] mt-1 tracking-tight">Ingresos</h1>
          <p class="text-xs text-slate-500">Registra tu salario, honorarios o dinero recibido</p>
        </div>

        <button
          id="btn-incomes-add"
          class="flex items-center gap-1.5 px-4 py-2 bg-[#006c49] text-white rounded-full font-semibold text-xs shadow-md shadow-[#006c49]/20 hover:bg-[#00583b] active:scale-95 transition-all cursor-pointer"
        >
          ${getIconSvg('plusCircle', 'w-4 h-4')}
          <span>Registrar Ingreso</span>
        </button>
      </div>

      <!-- Main Income Hero Card -->
      <div class="bg-gradient-to-br from-[#006c49] to-[#0b422a] rounded-3xl p-5 text-white shadow-lg shadow-[#006c49]/15 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-3">
          <div class="flex items-center justify-between text-white/80">
            <span class="text-xs font-medium flex items-center gap-1.5">
              ${getIconSvg('trendingUp', 'w-4 h-4')}
              Total Ingresos Registrados
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/15 font-semibold">Pesos Colombianos (COP)</span>
          </div>

          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
              ${formatCOP(totalIncome)}
            </span>
            <span class="text-xs font-semibold text-emerald-200">COP</span>
          </div>

          <div class="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-white/90">
            <div>
              <span class="opacity-75">Salario base: </span>
              <span class="font-semibold">${salary > 0 ? formatCOP(salary) : '$0 COP'}</span>
            </div>
            <div>
              <span class="opacity-75">Movimientos: </span>
              <span class="font-semibold">${allIncomes.length} registros</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real Income Insights Banner -->
      ${
        salary > 0
          ? `
        <div class="rounded-2xl p-3.5 bg-[#eff4ff] border border-blue-100 flex items-center justify-between shadow-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#006c49] shadow-xs shrink-0">
              ${getIconSvg('trendingUp', 'w-4 h-4')}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-[#0b1c30]">
                ${totalIncome >= salary ? '¡Salario proyectado cubierto al 100%!' : `${percentSalary}% de tu salario registrado`}
              </span>
              <span class="text-[11px] text-slate-600">
                ${
                  totalIncome >= salary
                    ? `Has completado o superado tu base de ${formatCOP(salary)} COP.`
                    : `Faltan ${formatCOP(salary - totalIncome, true)} para completar tu base.`
                }
              </span>
            </div>
          </div>
        </div>
      `
          : `
        <div class="rounded-2xl p-3 bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-600 text-xs">
          ${getIconSvg('sparkles', 'w-4 h-4 text-[#0058bc] shrink-0')}
          <span>Configura tu salario en Perfil para comparar en tiempo real el cumplimiento de tus ingresos.</span>
        </div>
      `
      }

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        ${categories
          .map((cat) => {
            const count = cat === 'Todos' ? allIncomes.length : allIncomes.filter((t) => t.category === cat).length;
            const isActive = state.filterIncomesCategory === cat;
            return `
            <button
              data-cat="${cat}"
              class="income-cat-pill shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive ? 'bg-[#006c49] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
              }"
            >
              ${cat} (${count})
            </button>
          `;
          })
          .join('')}
      </div>

      <!-- Incomes List -->
      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <h3 class="font-bold text-sm text-[#0b1c30]">Historial de Ingresos</h3>
          <span class="text-xs text-slate-500">${filteredIncomes.length} registros</span>
        </div>

        ${
          filteredIncomes.length === 0
            ? `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-emerald-50 text-[#006c49] flex items-center justify-center">
              ${getIconSvg('trendingUp', 'w-6 h-6')}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Sin ingresos registrados</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">Registra tu nómina o pagos recibidos para calcular tu dinero disponible.</p>
            </div>
            <button id="btn-incomes-empty-add" class="px-4 py-2 bg-[#006c49] text-white rounded-full text-xs font-semibold active:scale-95 transition-all cursor-pointer">
              Registrar primer ingreso
            </button>
          </div>
        `
            : `
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
            ${filteredIncomes
              .map(
                (tx) => `
              <div data-tx-id="${tx.id}" class="income-row-item flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-[#006c49] flex items-center justify-center shrink-0">
                    ${getCategoryIconSvg(tx.category)}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <p class="text-xs font-semibold text-[#0b1c30] truncate">${tx.description}</p>
                    <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category} • ${tx.accountMethod || 'Bancolombia'}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs sm:text-sm font-bold text-[#006c49] tabular-nums">
                    +${formatCOP(tx.amount)}
                  </span>
                  ${getIconSvg('chevronRight', 'w-4 h-4 text-slate-300')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  const btnAdd = document.getElementById('btn-incomes-add');
  const btnEmptyAdd = document.getElementById('btn-incomes-empty-add');
  if (btnAdd) btnAdd.onclick = () => openQuickAddModal('ingreso');
  if (btnEmptyAdd) btnEmptyAdd.onclick = () => openQuickAddModal('ingreso');

  DOM.tabIngresos.querySelectorAll('.income-cat-pill').forEach((btn) => {
    btn.onclick = () => {
      state.filterIncomesCategory = btn.dataset.cat;
      renderIncomes();
    };
  });

  DOM.tabIngresos.querySelectorAll('.income-row-item').forEach((row) => {
    row.onclick = () => {
      const tx = state.transactions.find((t) => t.id === row.dataset.txId);
      if (tx) openEditTransactionModal(tx);
    };
  });
}

// -------------------------------------------------------------
// VIEW 3: GASTOS
// -------------------------------------------------------------
function renderExpenses() {
  // The expenses module is a monthly view in the reference design. Historical
  // transactions are available through the month selector on Inicio/search,
  // but must not inflate the current month's totals here.
  const expenseTxs = state.transactions.filter((t) => t.type === 'gasto' && t.date?.startsWith(state.selectedMonth));
  const totalExpenses = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  // Compute category spent map
  const categorySpentMap = {};
  expenseTxs.forEach((t) => {
    categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + t.amount;
  });

  // Top spending category
  let topName = '';
  let topAmount = 0;
  Object.entries(categorySpentMap).forEach(([cat, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topName = cat;
    }
  });
  const topPercent = totalExpenses > 0 ? Math.round((topAmount / totalExpenses) * 100) : 0;

  // Categories exceeding limit
  const exceededCategories = state.categoryBudgets.filter(
    (b) => b.limit > 0 && (categorySpentMap[b.category] || 0) > b.limit
  );

  // Filtered transactions
  const filteredTxs =
    state.filterExpensesCategory === 'Todos'
      ? expenseTxs
      : expenseTxs.filter((t) => t.category === state.filterExpensesCategory);

  // Date grouping
  const today = getTodayISODate();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const groupedTxs = {};
  filteredTxs.forEach((tx) => {
    let label = tx.date;
    if (tx.date === today) label = 'Hoy';
    else if (tx.date === yesterday) label = 'Ayer';
    if (!groupedTxs[label]) groupedTxs[label] = [];
    groupedTxs[label].push(tx);
  });

  const categoriesList = ['Todos', 'Alimentación', 'Transporte', 'Compras', 'Servicios', 'Salud', 'Entretenimiento', 'Educación', 'Otros'];

  const metrics = computeMetrics();

  DOM.tabGastos.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Header Metric Card -->
      <div class="flex flex-col w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 gap-3">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700">
            ${getIconSvg('calendar', 'w-3.5 h-3.5 text-[#0058bc]')}
             <span>Gastos de ${formatMonthKeyToLabel(state.selectedMonth)}</span>
          </div>
          ${
            metrics.monthlyBudgetLimit > 0
              ? `
            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              metrics.monthlyBudgetPercent <= 80
                ? 'bg-emerald-50 text-[#006c49]'
                : metrics.monthlyBudgetPercent <= 100
                ? 'bg-amber-50 text-amber-800'
                : 'bg-rose-50 text-rose-700'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${
                metrics.monthlyBudgetPercent <= 80
                  ? 'bg-[#006c49]'
                  : metrics.monthlyBudgetPercent <= 100
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }"></span>
              <span>${metrics.monthlyBudgetPercent <= 100 ? `${metrics.monthlyBudgetPercent}% presupuesto` : `Excedido (+${metrics.monthlyBudgetPercent - 100}%)`}</span>
            </div>
          `
              : `
            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <span>${expenseTxs.length} registros</span>
            </div>
          `
          }
        </div>

        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-500 font-medium">Total desembolsado en el mes</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl sm:text-4xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
              ${formatCOP(totalExpenses)}
            </span>
            <span class="text-xs font-semibold text-slate-500">COP</span>
          </div>
          <div class="flex items-center gap-1 mt-1 text-slate-500 text-xs">
            ${
              topName
                ? `<span>Mayor gasto: <strong class="font-semibold text-slate-800">${topName}</strong> (${formatCOP(topAmount, true)} • ${topPercent}%)</span>`
                : '<span>Sin gastos registrados todavía</span>'
            }
          </div>
        </div>

        <!-- Micro CTA Fast Register -->
        <button
          id="btn-expenses-hero-add"
          class="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#0058bc] text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#0058bc]/25 active:scale-[0.98] transition-all cursor-pointer hover:bg-[#004bb0]"
        >
          ${getIconSvg('zap', 'w-4 h-4')}
          <span>Registrar Gasto</span>
        </button>
      </div>

      <!-- Exceeded Category Budgets Alert Box -->
      ${
        exceededCategories.length > 0
          ? `
        <div class="rounded-2xl p-3.5 bg-rose-50 border border-rose-200 flex items-center gap-2.5 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            ${getIconSvg('alertTriangle', 'w-4 h-4')}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-rose-700">
              Límite excedido en ${exceededCategories.length} ${exceededCategories.length === 1 ? 'categoría' : 'categorías'}
            </p>
            <p class="text-xs text-rose-800 truncate">
              ${exceededCategories.map((c) => `${c.category} (${formatCOP(categorySpentMap[c.category] || 0)})`).join(', ')}
            </p>
          </div>
        </div>
      `
          : ''
      }

      <!-- Category Budgets (Traffic Light Progress Meters) -->
      <div class="flex flex-col w-full gap-2.5">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="font-semibold text-sm text-[#0b1c30]">Presupuestos por Categoría</h2>
            <p class="text-[11px] text-slate-500">Límites activos en seguimiento</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          ${state.categoryBudgets
            .slice(0, 4)
            .map((catBudget) => {
              const spent = categorySpentMap[catBudget.category] || 0;
              const percent = catBudget.limit > 0 ? Math.round((spent / catBudget.limit) * 100) : 0;
              const isWarning = percent >= 75 && percent <= 100;
              const isExceeded = percent > 100;

              return `
              <div class="flex flex-col bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/60 gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                      ${getCategoryIconSvg(catBudget.category, 'w-4 h-4')}
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1">
                        <span class="text-xs font-semibold text-[#0b1c30]">${catBudget.category}</span>
                        ${isExceeded ? `<span class="text-rose-500">${getIconSvg('alertTriangle', 'w-3.5 h-3.5')}</span>` : ''}
                      </div>
                      <span class="text-[11px] text-slate-500 tabular-nums">
                        ${formatCOP(spent)} de ${formatCOP(catBudget.limit)} COP
                      </span>
                    </div>
                  </div>

                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isExceeded ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-[#006c49]'
                  }">
                    ${percent}%
                  </span>
                </div>

                <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-[#006c49]'
                    }"
                    style="width: ${Math.min(100, percent)}%"
                  ></div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Filter Horizontal Category Chips -->
      <div class="flex flex-col w-full gap-1.5 pt-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
          Filtrar por categoría
        </span>
        <div class="flex overflow-x-auto no-scrollbar gap-1.5 py-1">
          ${categoriesList
            .map((cat) => {
              const isActive = state.filterExpensesCategory === cat;
              return `
              <button
                data-cat="${cat}"
                class="expense-cat-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive ? 'bg-[#0058bc] text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }"
              >
                ${cat}
              </button>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Expenses Grouped List -->
      <div class="space-y-4">
        ${
          filteredTxs.length === 0
            ? `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
              ${getIconSvg('receiptText', 'w-6 h-6')}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Sin gastos encontrados</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">No hay gastos para este filtro de categoría.</p>
            </div>
            <button id="btn-expenses-empty-add" class="px-4 py-2 bg-[#0058bc] text-white rounded-full text-xs font-semibold active:scale-95 transition-all cursor-pointer">
              Registrar gasto
            </button>
          </div>
        `
            : Object.entries(groupedTxs)
                .map(([dateLabel, items]) => {
                  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
                  return `
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
                    <span>${dateLabel}</span>
                    <span class="tabular-nums font-bold text-slate-700">-${formatCOP(subtotal)}</span>
                  </div>

                  <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
                    ${items
                      .map(
                        (tx) => `
                      <div data-tx-id="${tx.id}" class="expense-row-item flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                            ${getCategoryIconSvg(tx.category)}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <p class="text-xs font-semibold text-[#0b1c30] truncate">${tx.description}</p>
                            <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category} • ${tx.accountMethod || 'Efectivo'}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-xs sm:text-sm font-bold text-[#0b1c30] tabular-nums">
                            -${formatCOP(tx.amount)}
                          </span>
                          ${getIconSvg('chevronRight', 'w-4 h-4 text-slate-300')}
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `;
                })
                .join('')
        }
      </div>
    </div>
  `;

  const btnHeroAdd = document.getElementById('btn-expenses-hero-add');
  const btnEmptyAdd = document.getElementById('btn-expenses-empty-add');
  if (btnHeroAdd) btnHeroAdd.onclick = () => openQuickAddModal('gasto');
  if (btnEmptyAdd) btnEmptyAdd.onclick = () => openQuickAddModal('gasto');

  DOM.tabGastos.querySelectorAll('.expense-cat-chip').forEach((btn) => {
    btn.onclick = () => {
      state.filterExpensesCategory = btn.dataset.cat;
      renderExpenses();
    };
  });

  DOM.tabGastos.querySelectorAll('.expense-row-item').forEach((row) => {
    row.onclick = () => {
      const tx = state.transactions.find((t) => t.id === row.dataset.txId);
      if (tx) openEditTransactionModal(tx);
    };
  });
}

// -------------------------------------------------------------
// VIEW 4: OBLIGACIONES FIJAS
// -------------------------------------------------------------
function renderObligations() {
  const metrics = computeMetrics();
  const sorted = getSortedPendingObligations(state.fixedObligations);
  const urgent = sorted.length > 0 ? sorted[0] : null;

  const percentSettled = metrics.fixedTotal > 0 ? Math.round((metrics.fixedPaid / metrics.fixedTotal) * 100) : 0;
  const baseIncome = metrics.totalIncome > 0 ? metrics.totalIncome : metrics.monthlyBudgetLimit;
  const fixedRatio = baseIncome > 0 ? Math.round((metrics.fixedTotal / baseIncome) * 100) : 0;

  const filteredObligations = state.fixedObligations.filter((o) => {
    if (state.filterObligationsStatus === 'pending') return o.status === 'pending';
    if (state.filterObligationsStatus === 'paid') return o.status === 'paid';
    return true;
  });

  DOM.tabObligaciones.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-3.5 animate-in fade-in duration-200">
      <!-- Header -->
      <div style="display:none" class="flex items-center justify-between pt-1">
        <div>
          <span class="text-[11px] text-[#0058bc] uppercase tracking-wider font-semibold">Compromisos Recurrentes</span>
          <h1 class="text-2xl font-bold tracking-tight text-[#0b1c30]">Gastos Fijos</h1>
        </div>

        <button
          id="btn-add-obligation"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d8e2ff] text-[#001a41] hover:bg-[#c1d3fe] transition-transform active:scale-95 text-xs font-semibold shadow-sm cursor-pointer"
        >
          ${getIconSvg('plusCircle', 'w-4 h-4 text-[#0058bc]')}
          <span>Nuevo</span>
        </button>
      </div>

      <!-- Hero Card: Cupertino Glassmorphism Metrics -->
      <div style="display:none" class="relative overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col gap-3">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs text-slate-500 font-medium">Total Obligaciones Mes</p>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-3xl sm:text-4xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
                ${formatCOP(metrics.fixedTotal)}
              </span>
              <span class="text-xs text-slate-500 uppercase font-semibold">COP</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#0058bc]">
            ${getIconSvg('calendar', 'w-5 h-5')}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="flex flex-col gap-1 mt-0.5">
          <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              class="bg-[#006c49] h-full rounded-full transition-all duration-500 ease-out"
              style="width: ${percentSettled}%"
            ></div>
          </div>
          <div class="flex justify-between items-center text-slate-500 text-[11px] font-medium">
            <span>${percentSettled}% liquidado</span>
            <span>${state.fixedObligations.length} compromisos</span>
          </div>
        </div>

        <!-- Dual Metric Pills -->
        <div class="grid grid-cols-2 gap-2 pt-0.5">
          <div class="flex flex-col p-2.5 rounded-2xl bg-[#6cf8bb]/20 border border-[#6cf8bb]/30">
            <div class="flex items-center gap-1.5 text-[#006c49]">
              ${getIconSvg('checkCircle2', 'w-3.5 h-3.5')}
              <span class="text-[11px] font-semibold">Pagado este mes</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${formatCOP(metrics.fixedPaid)}
            </span>
            <span class="text-[10px] text-[#00714d] font-medium mt-0.5">
              ${metrics.fixedPaidCount} obligaciones
            </span>
          </div>

          <div class="flex flex-col p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
            <div class="flex items-center gap-1.5 text-rose-600">
              ${getIconSvg('clock', 'w-3.5 h-3.5')}
              <span class="text-[11px] font-semibold">Por pagar</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${formatCOP(metrics.fixedCommitted)}
            </span>
            <span class="text-[10px] text-rose-600 font-medium mt-0.5">
              ${metrics.fixedPendingCount} pendientes
            </span>
          </div>
        </div>

        <!-- Urgent Notification Banner -->
        ${
          urgent
            ? `
          <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border ${
            urgent.status === 'overdue'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : urgent.status === 'today'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-blue-50 border-blue-200 text-[#0b1c30]'
          }">
            <div class="w-2.5 h-2.5 rounded-full shrink-0 ${
              urgent.status === 'overdue' ? 'bg-rose-600 animate-ping' : urgent.status === 'today' ? 'bg-amber-500 animate-ping' : 'bg-[#0058bc]'
            }"></div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-bold truncate ${
                urgent.status === 'overdue' ? 'text-rose-700' : urgent.status === 'today' ? 'text-amber-800' : 'text-[#0058bc]'
              }">
                ${urgent.label}
              </p>
              <p class="text-xs text-slate-700 font-medium truncate">
                ${urgent.obligation.name} • ${formatCOP(urgent.obligation.amount, true)}
              </p>
            </div>
            <button data-pay-id="${urgent.obligation.id}" class="obligation-toggle-btn px-2.5 py-1 rounded-full bg-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer">
              Pagar
            </button>
          </div>
        `
            : ''
        }

        <!-- 50/30/20 Rule Financial Tip -->
        ${
          metrics.fixedTotal > 0 && baseIncome > 0
            ? `
          <div class="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600 text-xs">
            ${getIconSvg('info', 'w-4 h-4 text-[#0058bc] shrink-0')}
            <p class="leading-tight">
              Tus gastos fijos (${formatCOP(metrics.fixedTotal)}) ocupan el <strong>${fixedRatio}%</strong> de tus ingresos ${
                fixedRatio > 50 ? '(recomendado: máx. 50%)' : '(dentro del rango ideal 50/30/20)'
              }.
            </p>
          </div>
        `
            : ''
        }
      </div>

      <!-- Segmented Control Tabs -->
      <div class="w-full bg-slate-200/80 p-1 rounded-full flex items-center shadow-inner">
        <button
          data-status="all"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
            state.filterObligationsStatus === 'all' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }"
        >
          Todos (${state.fixedObligations.length})
        </button>
        <button
          data-status="pending"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
            state.filterObligationsStatus === 'pending' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }"
        >
          Pendientes (${metrics.fixedPendingCount})
        </button>
        <button
          data-status="paid"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
            state.filterObligationsStatus === 'paid' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }"
        >
          Pagados (${metrics.fixedPaidCount})
        </button>
      </div>

      <!-- Synchronisation Hint -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eff4ff] text-slate-600 border border-slate-200/50">
        ${getIconSvg('info', 'w-4 h-4 text-[#0058bc] shrink-0')}
        <p class="text-[11px] leading-tight">
          Los pagos marcados se sincronizan en los gastos del mes sin duplicar valores.
        </p>
      </div>

      <!-- Obligations List -->
      <div class="flex flex-col gap-2.5">
        ${
          filteredObligations.length === 0
            ? `
          <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0058bc]">
              ${getIconSvg('calendar', 'w-6 h-6')}
            </div>
            <div>
              <h3 class="font-semibold text-sm text-[#0b1c30]">
                ${
                  state.filterObligationsStatus === 'all'
                    ? 'Sin gastos fijos registrados'
                    : state.filterObligationsStatus === 'pending'
                    ? 'No tienes pagos pendientes'
                    : 'Aún no has marcado pagos como realizados'
                }
              </h3>
              <p class="text-xs text-slate-500 max-w-xs mt-1">
                Registra tus compromisos que se repiten cada mes (arriendo, internet, celular, servicios) para controlarlos con tranquilidad.
              </p>
            </div>
            <button id="btn-add-obligation-empty" class="px-4 py-2 rounded-full bg-[#0058bc] text-white text-xs font-semibold shadow-sm hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Registrar primer gasto fijo
            </button>
          </div>
        `
            : `
          <div class="flex flex-col gap-3">
            ${filteredObligations
              .map((item) => {
                const isPaid = item.status === 'paid';
                const urgency = isPaid ? null : getObligationUrgency(item);
                const statusBadge = isPaid
                  ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#c7f7e3] px-3 py-1 text-[11px] font-semibold text-[#00714d] whitespace-nowrap">${getIconSvg('check', 'w-3 h-3')}Pagado</span>`
                  : `<span class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${urgency?.status === 'overdue' ? 'border-[#ffc3cf] bg-[#ffe1e7] text-[#db2548]' : urgency?.status === 'today' ? 'border-[#ffd48a] bg-[#fff0d2] text-[#9a5b00]' : 'border-[#dce8ff] bg-[#eef4ff] text-[#0058bc]'}">${urgency?.label || `Vence Día ${item.dueDay}`}</span>`;
                return `
                <div class="rounded-[22px] bg-white border border-slate-200/70 shadow-sm overflow-hidden">
                  <div class="p-4 pb-3 flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                        ${getObligationContextIcon(item.name)}
                      </div>
                      <div class="flex flex-col min-w-0 pt-0.5">
                        <p class="text-base font-semibold text-[#0b1c30] truncate">${item.name}</p>
                        <p class="text-xs text-[#607797] mt-1">Vence Día ${item.dueDay} del mes</p>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 shrink-0">
                      <span class="text-base font-bold tabular-nums ${isPaid ? 'text-slate-700' : 'text-[#0b1c30]'}">${formatCOP(item.amount)}</span>
                      ${statusBadge}
                    </div>
                  </div>
                  <div class="mx-4 border-t border-slate-100"></div>
                  <div class="px-4 py-3 flex items-center justify-between gap-2">
                    <button data-edit-ob="${item.id}" class="obligation-edit-trigger inline-flex items-center gap-1.5 text-sm text-[#607797] cursor-pointer hover:text-[#0058bc]">
                      ${getIconSvg('sliders', 'w-4 h-4')}<span>${isPaid ? 'Detalles' : 'Editar día o valor'}</span>
                    </button>
                    <button data-pay-id="${item.id}" class="obligation-toggle-btn inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95 ${isPaid ? 'bg-[#e7eefb] text-[#50627b] hover:bg-[#dce8ff]' : 'bg-[#0058bc] text-white shadow-sm hover:bg-[#004aa0]'}" title="${isPaid ? 'Marcar como pendiente' : 'Marcar como pagada'}">
                      ${getIconSvg(isPaid ? 'rotateCcw' : 'creditCard', 'w-4 h-4')}<span>${isPaid ? 'Desmarcar' : 'Pagar'}</span>
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>
      <button id="btn-add-obligation-bottom" class="w-full rounded-full bg-[#eff4f8] text-[#0058bc] py-3.5 text-sm font-semibold cursor-pointer hover:bg-[#e4edf7] transition-colors">${getIconSvg('plusCircle', 'w-4 h-4 inline mr-1')}Agregar Gasto Fijo</button>
    </div>
  `;

  const btnAdd = document.getElementById('btn-add-obligation');
  const btnEmptyAdd = document.getElementById('btn-add-obligation-empty');
  const btnBottomAdd = document.getElementById('btn-add-obligation-bottom');
  if (btnAdd) btnAdd.onclick = () => openAddOrEditObligationModal(null);
  if (btnEmptyAdd) btnEmptyAdd.onclick = () => openAddOrEditObligationModal(null);
  if (btnBottomAdd) btnBottomAdd.onclick = () => openAddOrEditObligationModal(null);

  DOM.tabObligaciones.querySelectorAll('.ob-status-tab').forEach((btn) => {
    btn.onclick = () => {
      state.filterObligationsStatus = btn.dataset.status;
      renderObligations();
    };
  });

  DOM.tabObligaciones.querySelectorAll('.obligation-toggle-btn').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const res = await api.togglePayFixedObligation(btn.dataset.payId);
      await refreshAllData();
      renderObligations();
      showToast(res.message);
    };
  });

  DOM.tabObligaciones.querySelectorAll('.obligation-edit-trigger').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const ob = state.fixedObligations.find((o) => o.id === btn.dataset.editOb);
      if (ob) openAddOrEditObligationModal(ob);
    };
  });
}

// -------------------------------------------------------------
// VIEW 5: METAS DE AHORRO
// -------------------------------------------------------------
function renderGoalsLegacy() {
  const metrics = computeMetrics();
  const activeIncompleteGoal = state.savingsGoals.find((g) => g.currentAmount < g.targetAmount) || state.savingsGoals[0];

  // Dynamic real-data smart goal advice
  const smartGoalAdvice = (() => {
    if (state.savingsGoals.length === 0) {
      return {
        tag: 'Consejo Inteligente',
        title: 'Crea tu primera meta',
        message: 'No tienes metas de ahorro registradas aún. Crear un objetivo personal te ayuda a reservar dinero de forma disciplinada.',
      };
    }
    if (!activeIncompleteGoal || activeIncompleteGoal.currentAmount >= activeIncompleteGoal.targetAmount) {
      return {
        tag: '¡Meta Alcanzada!',
        title: '¡Felicitaciones por tus logros!',
        message: 'Has completado al 100% tus metas de ahorro registradas. Puedes crear un nuevo objetivo para continuar haciendo crecer tu patrimonio.',
      };
    }
    const remaining = activeIncompleteGoal.targetAmount - activeIncompleteGoal.currentAmount;
    const salary = state.currentUser?.monthlySalary || state.currentUser?.monthlyBudgetLimit || metrics.totalIncome || 0;
    const savingsRulePercent = (state.currentUser?.budgetRule?.savings || 20) / 100;
    const realisticMonthlySavings = salary > 0 ? Math.round(salary * savingsRulePercent) : Math.max(50000, Math.round(metrics.availableCash * 0.2));
    const realisticQuincenalCap = Math.max(50000, Math.round(realisticMonthlySavings / 2 / 10000) * 10000);
    const suggestedQuincenal = Math.min(remaining, realisticQuincenalCap);
    const quincenasNeeded = Math.max(1, Math.ceil(remaining / suggestedQuincenal));
    const mesesNeeded = Math.ceil(quincenasNeeded / 2);
    const tiempoTexto =
      quincenasNeeded === 1
        ? 'en tu próxima quincena'
        : mesesNeeded === 1
        ? 'en aproximadamente 1 mes (2 quincenas)'
        : `en aproximadamente ${mesesNeeded} meses (${quincenasNeeded} quincenas)`;

    if (metrics.availableCash >= 50000) {
      const suggested = Math.min(remaining, Math.max(50000, Math.round((metrics.availableCash * 0.15) / 10000) * 10000), realisticQuincenalCap);
      return {
        tag: 'Consejo Inteligente',
        title: `Impulso para "${activeIncompleteGoal.name}"`,
        message: `Cuentas con ${formatCOP(metrics.availableCash)} libres hoy. Si apartas ${formatCOP(suggested, true)} (acorde a tu capacidad mensual), tu meta avanzará con rapidez sin comprometer tus gastos fijos.`,
      };
    }
    const salaryPercentNote = salary > 0 ? ` (el ${Math.round((suggestedQuincenal / salary) * 200)}% de tu quincena)` : '';
    return {
      tag: 'Consejo Inteligente',
      title: `Plan para "${activeIncompleteGoal.name}"`,
      message: `Te faltan ${formatCOP(remaining, true)} para completarla. Si programas ${formatCOP(suggestedQuincenal, true)} quincenales${salaryPercentNote}, la alcanzarás ${tiempoTexto}.`,
    };
  })();

  DOM.tabMetas.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Header -->
      <div class="flex items-center justify-between pt-1">
        <div>
          <span class="text-[11px] text-[#006c49] uppercase tracking-wider font-semibold">Ahorro con Propósito</span>
          <h1 class="text-2xl font-bold tracking-tight text-[#0b1c30]">Metas de Ahorro</h1>
          <p class="text-xs text-slate-500">Reserva dinero para tus proyectos y sueños</p>
        </div>

        <button
          id="btn-add-goal"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#006c49] text-white text-xs font-semibold hover:bg-[#00583b] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          ${getIconSvg('plus', 'w-4 h-4')}
          <span>Nueva Meta</span>
        </button>
      </div>

      <!-- KPI Summary Card -->
      <div class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-500">Total Ahorrado en Metas</span>
            <p class="text-2xl font-extrabold text-[#006c49] tabular-nums mt-0.5">${formatCOP(metrics.totalSavings)}</p>
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold text-slate-400">Objetivo Global</span>
            <p class="text-sm font-bold text-slate-700 tabular-nums mt-0.5">${formatCOP(metrics.totalSavingsTarget)}</p>
          </div>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            class="h-full rounded-full bg-[#006c49] transition-all duration-500"
            style="width: ${metrics.totalSavingsTarget > 0 ? (metrics.totalSavings / metrics.totalSavingsTarget) * 100 : 0}%"
          ></div>
        </div>
      </div>

      <!-- Smart Advice Banner -->
      <div class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/60 flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-emerald-50 text-[#006c49] flex items-center justify-center">
            ${getIconSvg('lightbulb', 'w-3.5 h-3.5')}
          </div>
          <span class="text-[10px] font-bold text-[#006c49] uppercase tracking-wider">${smartGoalAdvice.tag}</span>
        </div>
        <h4 class="text-xs font-bold text-[#0b1c30]">${smartGoalAdvice.title}</h4>
        <p class="text-[11px] text-slate-500 leading-relaxed">${smartGoalAdvice.message}</p>
      </div>

      <!-- Goals Grid -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="font-bold text-sm text-[#0b1c30]">Tus Objetivos</h3>
          <span class="text-xs text-slate-500">${state.savingsGoals.length} metas</span>
        </div>

        ${
          state.savingsGoals.length === 0
            ? `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-emerald-50 text-[#006c49] flex items-center justify-center">
              ${getIconSvg('flag', 'w-6 h-6')}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Aún no tienes metas creadas</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">Define tu fondo de emergencia, vacaciones o compras deseadas.</p>
            </div>
            <button id="btn-add-goal-empty" class="px-4 py-2 bg-[#006c49] text-white rounded-full text-xs font-semibold active:scale-95 transition-all cursor-pointer">
              Crear primera meta
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${state.savingsGoals
              .map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return `
                <div class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/60 flex flex-col justify-between gap-3 relative overflow-hidden">
                  ${
                    goal.imageUrl
                      ? `<div class="h-24 -mx-4 -mt-4 mb-1 overflow-hidden relative"><img src="${goal.imageUrl}" alt="${goal.name}" class="w-full h-full object-cover" /></div>`
                      : ''
                  }

                  <div class="flex items-center justify-between">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center" style="background-color: ${goal.color}20; color: ${goal.color}">
                      ${getIconSvg(goal.icon === 'security' ? 'shield' : goal.icon === 'laptop' ? 'laptop' : goal.icon === 'plane' ? 'plane' : goal.icon === 'car' ? 'car' : goal.icon === 'home' ? 'home' : 'star', 'w-5 h-5')}
                    </div>
                    <span class="text-xs font-bold" style="color: ${goal.color}">${percent}%</span>
                  </div>

                  <div>
                    <h4 class="font-bold text-sm text-[#0b1c30] truncate">${goal.name}</h4>
                    <p class="text-xs text-slate-500 mt-0.5 tabular-nums">
                      ${formatCOP(goal.currentAmount)} / ${formatCOP(goal.targetAmount)}
                    </p>
                    ${goal.deadline ? `<p class="text-[11px] text-slate-400 mt-0.5">Fecha: ${goal.deadline}</p>` : ''}
                  </div>

                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${percent}%; background-color: ${goal.color}"></div>
                  </div>

                  <div class="flex items-center gap-2 pt-1">
                    <button data-aporte-id="${goal.id}" class="goal-aporte-btn flex-1 py-1.5 rounded-full bg-[#006c49] text-white text-xs font-semibold hover:bg-[#00583b] active:scale-95 transition-all cursor-pointer text-center">
                      Aportar
                    </button>
                    <button data-edit-goal="${goal.id}" class="goal-edit-btn p-1.5 text-slate-400 hover:text-[#0058bc] rounded-full hover:bg-slate-100 transition-colors cursor-pointer" title="Ajustar Meta">
                      ${getIconSvg('sliders', 'w-4 h-4')}
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Contributions History -->
      ${
        state.goalContributions.length > 0
          ? `
        <div class="space-y-2 pt-2">
          <h3 class="font-bold text-sm text-[#0b1c30] px-1">Aportes Recientes</h3>
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
            ${state.goalContributions
              .slice(0, 5)
              .map(
                (c) => `
              <div class="p-3 flex items-center justify-between text-xs">
                <div>
                  <p class="font-semibold text-slate-800">${c.goalName}</p>
                  <p class="text-[11px] text-slate-400">${c.date} • ${c.type}</p>
                </div>
                <span class="font-bold text-[#006c49] tabular-nums">+${formatCOP(c.amount)} COP</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  const btnAdd = document.getElementById('btn-add-goal');
  const btnEmptyAdd = document.getElementById('btn-add-goal-empty');
  if (btnAdd) btnAdd.onclick = () => openAddOrEditGoalModal(null);
  if (btnEmptyAdd) btnEmptyAdd.onclick = () => openAddOrEditGoalModal(null);

  DOM.tabMetas.querySelectorAll('.goal-aporte-btn').forEach((btn) => {
    btn.onclick = () => openAporteModal(btn.dataset.aporteId);
  });

  DOM.tabMetas.querySelectorAll('.goal-edit-btn').forEach((btn) => {
    btn.onclick = () => {
      const g = state.savingsGoals.find((goal) => goal.id === btn.dataset.editGoal);
      if (g) openAddOrEditGoalModal(g);
    };
  });
}

// -------------------------------------------------------------
function getGoalIconName(goal) {
  const iconMap = {
    security: 'shield',
    laptop: 'laptop',
    plane: 'plane',
    car: 'car',
    home: 'home',
    star: 'star',
  };
  return iconMap[goal?.icon] || 'shield';
}

function renderGoalMedia(goal, imageClass = 'w-full h-full object-cover', fallbackIconClass = 'w-5 h-5') {
  const imageUrl = String(goal?.imageUrl || '').trim();
  const fallbackIcon = getIconSvg(getGoalIconName(goal), fallbackIconClass);

  if (!imageUrl) {
    return `<span class="w-full h-full flex items-center justify-center">${fallbackIcon}</span>`;
  }

  const safeUrl = imageUrl.replace(/"/g, '&quot;');
  return `<img src="${safeUrl}" alt="${String(goal?.name || 'Imagen de meta').replace(/"/g, '&quot;')}" class="${imageClass}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');" /><span class="hidden w-full h-full items-center justify-center">${fallbackIcon}</span>`;
}

function renderGoals() {
  const metrics = computeMetrics();
  const totalPercent = metrics.totalSavingsTarget > 0 ? Math.min(100, Math.round((metrics.totalSavings / metrics.totalSavingsTarget) * 100)) : 0;
  const activeGoals = state.savingsGoals.filter((goal) => goal.currentAmount < goal.targetAmount);
  const activeGoal = activeGoals[0] || state.savingsGoals[0];
  const remaining = activeGoal ? Math.max(0, activeGoal.targetAmount - activeGoal.currentAmount) : 0;
  const suggestedContribution = activeGoal ? Math.min(remaining, 500000) : 0;
  const tipTitle = activeGoal ? `Impulso para "${activeGoal.name}"` : 'Crea tu primera meta';
  const tip = activeGoal
    ? `Cuentas con ${formatCOP(metrics.availableCash)} libres hoy. Si apartas ${formatCOP(suggestedContribution, true)} (acorde a tu capacidad mensual), tu meta avanzará con rapidez sin comprometer tus gastos fijos.`
    : 'Crea una meta para empezar a reservar dinero de forma automática.';

  DOM.tabMetas.innerHTML = `
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between"><div><span class="text-[11px] font-semibold uppercase tracking-wider text-[#006c49]">Tus sueños en marcha</span><h1 class="text-[25px] leading-tight font-extrabold">Mis Metas de Ahorro</h1></div><button id="btn-add-goal" class="w-10 h-10 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center cursor-pointer">${getIconSvg('flag', 'w-5 h-5')}</button></div>
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between"><span class="text-xs font-medium flex items-center gap-2">${getIconSvg('flag', 'w-4 h-4 text-[#0058bc]')} Total Acumulado Protegido</span><span class="rounded-full bg-[#6cf8bb] px-2.5 py-1 text-[10px] font-semibold text-[#006c49]">${totalPercent}% global</span></div>
        <p class="text-[34px] leading-none font-extrabold mt-4 tabular-nums">${formatCOP(metrics.totalSavings)} <span class="text-xs font-semibold text-slate-500">COP</span></p>
        <p class="text-xs mt-2">Objetivo: ${formatCOP(metrics.totalSavingsTarget)} <span class="font-semibold text-[#006c49]">Faltan ${formatCOP(Math.max(0, metrics.totalSavingsTarget - metrics.totalSavings), true)}</span></p>
        <div class="mt-4 h-2.5 rounded-full bg-[#dce8ff] overflow-hidden"><div class="h-full rounded-full bg-[#006c49]" style="width:${totalPercent}%"></div></div>
        <div class="mt-4 rounded-3xl bg-[#eef3ff] p-3 text-xs text-slate-600 flex gap-2">${getIconSvg('shield', 'w-4 h-4 text-[#0058bc] shrink-0')}<span>Dinero reservado de forma autónoma. No computable como gasto para proteger tu balance diario.</span></div>
      </div>
      <button id="btn-add-goal-large" class="w-full h-12 rounded-full bg-[#0058bc] text-white font-semibold text-sm shadow-md cursor-pointer">${getIconSvg('plusCircle', 'w-4 h-4 inline mr-1')} Crear Nueva Meta</button>
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">Metas Activas</h2><span class="text-sm font-semibold text-[#0058bc]">${activeGoals.length} en curso</span></div>
        <div class="flex flex-col gap-3">
          ${activeGoals.length ? activeGoals.map((goal) => {
            const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            const goalRemaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            return `<article class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="${goal.imageUrl ? 'w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden' : 'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0'}" style="${goal.imageUrl ? '' : `background:${goal.color}20;color:${goal.color}`}" >${renderGoalMedia(goal, 'w-full h-full object-contain', 'w-7 h-7')}</div>
                  <div class="min-w-0"><h3 class="font-semibold text-base truncate">${goal.name}</h3><p class="text-xs text-slate-500 mt-0.5">${goal.deadline ? `Límite: ${goal.deadline}` : 'Sin fecha límite'}</p></div>
                </div>
                <span class="shrink-0 rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#0058bc]">${percent}%</span>
              </div>
              <div class="mt-3 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc]" style="width:${percent}%"></div></div>
              <div class="flex items-center justify-between gap-3 mt-2 text-sm"><span><strong>${formatCOP(goal.currentAmount)}</strong> <span class="text-slate-500">de ${formatCOP(goal.targetAmount)} COP</span></span><span class="font-semibold text-[#0058bc] text-right">Faltan ${formatCOP(goalRemaining)}</span></div>
              <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100"><button data-aporte-id="${goal.id}" class="goal-aporte-btn flex-1 h-12 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer">${getIconSvg('plus', 'w-5 h-5')} Aportar dinero</button><button data-edit-goal="${goal.id}" class="goal-edit-btn w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" title="Ajustar meta">${getIconSvg('sliders', 'w-5 h-5')}</button></div>
            </article>`;
          }).join('') : `<div class="rounded-3xl bg-white p-6 text-center border border-slate-200/80"><p class="text-sm font-semibold">No tienes metas activas</p><p class="text-xs text-slate-500 mt-1">Crea una meta para comenzar a ahorrar.</p></div>`}
        </div>
      </section>
      <div class="rounded-3xl bg-[#eef3ff] border border-[#cfe0ff] p-4 flex gap-3"><div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${getIconSvg('lightbulb', 'w-7 h-7')}</div><div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><p class="text-sm font-bold text-[#0058bc]">Consejo Inteligente</p><span class="text-[11px] text-slate-500">• Basado en tus datos</span></div><p class="text-sm font-semibold text-[#0b1c30] mt-1">${tipTitle}</p><p class="text-sm text-slate-600 leading-relaxed mt-1">${tip}</p></div></div>
      <section class="flex flex-col gap-2"><div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">Últimos Aportes</h2><span class="text-sm font-semibold text-[#0058bc]">Registro protegido</span></div><div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-200/80 divide-y divide-slate-100">${state.goalContributions.length ? state.goalContributions.slice(0, 3).map((c) => `<div class="flex items-center justify-between gap-3 py-3"><div class="flex items-center gap-3 min-w-0"><div class="w-11 h-11 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center shrink-0">${getIconSvg('wallet', 'w-5 h-5')}</div><div class="min-w-0"><p class="text-sm font-semibold truncate">${c.goalName}</p><p class="text-xs text-slate-500 mt-0.5">${c.date} • ${c.type}</p></div></div><div class="text-right shrink-0"><span class="text-base font-bold text-[#006c49]">+${formatCOP(c.amount)}</span><small class="block text-[10px] text-slate-500">COP</small></div></div>`).join('') : `<p class="py-5 text-center text-sm text-slate-500">Aún no hay aportes registrados.</p>`}</div></section>
    </div>
  `;
  document.getElementById('btn-add-goal')?.addEventListener('click', () => openAddOrEditGoalModal(null));
  document.getElementById('btn-add-goal-large')?.addEventListener('click', () => openAddOrEditGoalModal(null));
  DOM.tabMetas.querySelectorAll('.goal-aporte-btn').forEach((btn) => { btn.onclick = () => openAporteModal(btn.dataset.aporteId); });
  DOM.tabMetas.querySelectorAll('.goal-edit-btn').forEach((btn) => { btn.onclick = () => { const goal = state.savingsGoals.find((item) => item.id === btn.dataset.editGoal); if (goal) openAddOrEditGoalModal(goal); }; });
}

// VIEW 6: PERFIL
// -------------------------------------------------------------
function renderProfile() {
  const user = state.currentUser;
  if (!user) return;

  const salary = user.monthlyBudgetLimit || user.monthlySalary || 5800000;
  const needs = Math.round(salary * ((user.budgetRule?.needs || 50) / 100));
  const wants = Math.round(salary * ((user.budgetRule?.wants || 30) / 100));
  const savings = Math.round(salary * ((user.budgetRule?.savings || 20) / 100));
  const alert80Amount = Math.round(salary * 0.8);

  DOM.tabPerfil.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- User Card -->
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative group">
              ${renderAvatarHtml(user.name, user.avatarUrl, 'lg', true)}
            </div>
            <div class="flex flex-col">
              <h2 class="text-lg font-bold text-[#0b1c30] leading-tight">${user.name}</h2>
              <p class="text-xs text-slate-500">${user.email}</p>
              <div class="mt-1">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006c49] text-[10px] font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#006c49]"></span>
                  ${user.plan}
                </span>
              </div>
            </div>
          </div>

          <button id="btn-edit-profile" class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#0058bc] active:scale-90 transition-transform cursor-pointer">
            ${getIconSvg('edit3', 'w-4 h-4')}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${getIconSvg('shieldCheck', 'w-4 h-4 text-[#0058bc] shrink-0')}
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-medium">Miembro activo</span>
              <span class="text-xs font-semibold text-slate-700">${user.memberSince || 'Activo'}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${getIconSvg('lock', 'w-4 h-4 text-[#006c49] shrink-0')}
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-medium">Privacidad</span>
              <span class="text-xs font-semibold text-slate-700">100% Local</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Salary & 50/30/20 Rule Card -->
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[#0058bc]">
              ${getIconSvg('pieChart', 'w-4 h-4')}
            </div>
             <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Presupuesto Mensual</span>
          </div>

          <button id="btn-edit-salary" class="text-xs font-semibold text-[#0058bc] hover:underline flex items-center gap-0.5 cursor-pointer">
             Modificar Límite ${getIconSvg('chevronRight', 'w-3.5 h-3.5')}
          </button>
        </div>

        <!-- Inner Budget Box -->
        <div class="rounded-2xl bg-[#eff4ff] p-4 flex flex-col gap-2.5 border border-blue-100">
          <div>
             <span class="text-[11px] text-slate-500 font-medium">Límite Mensual Asignado</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-2xl sm:text-3xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
                ${formatCOP(salary)}
              </span>
              <span class="text-xs font-bold text-slate-500">COP</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5">
               Distribuido bajo la regla inteligente MiPlata 50/30/20:
            </p>
          </div>

          <!-- 50/30/20 Progress Bar Strip -->
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-700 pt-1">
            <span>Distribución Estratégica</span>
            <span>100% Planificado</span>
          </div>

          <div class="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 gap-0.5">
            <div class="bg-[#0058bc] h-full" style="width: 50%" title="50% Necesidades"></div>
            <div class="bg-[#0070eb] h-full" style="width: 30%" title="30% Estilo de vida"></div>
            <div class="bg-[#006c49] h-full" style="width: 20%" title="20% Ahorro"></div>
          </div>

          <!-- Breakdown Rows -->
          <div class="flex flex-col gap-2 pt-1 text-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#0058bc]"></span>
                <div>
                  <p class="font-semibold text-slate-800">50% Gastos Fijos & Necesidades</p>
                  <p class="text-[10px] text-slate-500">Arriendo, servicios y mercado</p>
                </div>
              </div>
              <span class="font-bold text-slate-800 tabular-nums">${formatCOP(needs)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#0070eb]"></span>
                <div>
                  <p class="font-semibold text-slate-800">30% Ocasionales & Estilo de Vida</p>
                  <p class="text-[10px] text-slate-500">Salidas, compras y ocio</p>
                </div>
              </div>
              <span class="font-bold text-slate-800 tabular-nums">${formatCOP(wants)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#006c49]"></span>
                <div>
                  <p class="font-semibold text-slate-800">20% Metas de Ahorro & Futuro</p>
                  <p class="text-[10px] text-slate-500">Fondo de emergencia e inversión</p>
                </div>
              </div>
              <span class="font-bold text-[#006c49] tabular-nums">${formatCOP(savings)}</span>
            </div>
          </div>
        </div>

        <!-- Toggles -->
        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div>
              <p class="text-xs font-semibold text-slate-800">Alerta preventiva al 80%</p>
              <p class="text-[11px] text-slate-500">Notificar al consumir ${formatCOP(alert80Amount)}</p>
            </div>
            <button
              id="toggle-alert-80"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${
                user.alert80Percent ? 'bg-[#0058bc]' : 'bg-slate-300'
              }"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                user.alert80Percent ? 'translate-x-5' : 'translate-x-0'
              }"></div>
            </button>
          </div>

          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div>
              <p class="text-xs font-semibold text-slate-800">Ajuste por ingresos variables</p>
              <p class="text-[11px] text-slate-500">Recalcular límites automáticamente</p>
            </div>
            <button
              id="toggle-variable-income"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${
                user.autoAdjustVariable ? 'bg-[#0058bc]' : 'bg-slate-300'
              }"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                user.autoAdjustVariable ? 'translate-x-5' : 'translate-x-0'
              }"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Preferencias del Sistema -->
      <div class="flex flex-col gap-2">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Preferencias del Sistema</span>
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/60 flex flex-col divide-y divide-slate-100">
          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                ${getIconSvg('coins', 'w-4 h-4')}
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800">Moneda Principal</p>
                <p class="text-[11px] text-slate-500">Formato estándar de visualización</p>
              </div>
            </div>
            <span class="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full">COP ($)</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                ${getIconSvg('keyboard', 'w-4 h-4')}
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800">Teclado numérico al abrir</p>
                <p class="text-[11px] text-slate-500">Agilizar registro inmediato</p>
              </div>
            </div>
            <button
              id="toggle-quick-keypad"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${
                user.quickKeypad ? 'bg-[#0058bc]' : 'bg-slate-300'
              }"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                user.quickKeypad ? 'translate-x-5' : 'translate-x-0'
              }"></div>
            </button>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#0058bc]">${getIconSvg('calendar', 'w-4 h-4')}</div>
              <div><p class="text-xs font-semibold text-slate-800">Reinicio mensual</p><p class="text-[11px] text-slate-500">Corte y balance periódico</p></div>
            </div>
            <span class="text-xs font-semibold text-slate-700">Día ${user.resetDay || 1} de cada mes</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                ${getIconSvg('sparkles', 'w-4 h-4')}
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800">Categorización inteligente</p>
                <p class="text-[11px] text-slate-500">Sugerir según conceptos habituales</p>
              </div>
            </div>
            <button
              id="toggle-smart-cat"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${
                user.smartCategorization ? 'bg-[#0058bc]' : 'bg-slate-300'
              }"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                user.smartCategorization ? 'translate-x-5' : 'translate-x-0'
              }"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="flex flex-col gap-2 pt-2">
        <button id="btn-logout" class="w-full h-12 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold active:scale-95 transition-all cursor-pointer">
          ${getIconSvg('logOut', 'w-4 h-4')}
          <span>Cerrar sesión</span>
        </button>

        <button id="btn-delete-account" class="w-full h-11 rounded-full text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 text-xs font-medium active:scale-95 transition-all cursor-pointer">
          ${getIconSvg('trash2', 'w-3.5 h-3.5')}
          <span>Eliminar cuenta y datos locales</span>
        </button>

        <button id="btn-reset-data" class="text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors py-1 underline cursor-pointer">
          Restaurar datos demo originales
        </button>
      </div>

      <!-- App Branding Footer -->
      <div class="flex flex-col items-center justify-center gap-1.5 py-4 text-center select-none">
        ${getImagotipoHorizontal('h-6 w-auto opacity-70 hover:opacity-100 transition-opacity')}
        <p class="text-[11px] text-slate-400 font-medium">Control de finanzas personales 100% privado y local</p>
      </div>
    </div>
  `;

  document.getElementById('btn-edit-profile').onclick = openEditProfileModal;
  document.getElementById('btn-edit-salary').onclick = openEditBudgetModal;

  document.getElementById('toggle-alert-80').onclick = async () => {
    const res = await api.updateProfile({ alert80Percent: !user.alert80Percent });
    state.currentUser = res.user;
    renderProfile();
    showToast('Preferencia actualizada');
  };

  document.getElementById('toggle-variable-income').onclick = async () => {
    const res = await api.updateProfile({ autoAdjustVariable: !user.autoAdjustVariable });
    state.currentUser = res.user;
    renderProfile();
    showToast('Preferencia actualizada');
  };

  document.getElementById('toggle-quick-keypad').onclick = async () => {
    const res = await api.updateProfile({ quickKeypad: !user.quickKeypad });
    state.currentUser = res.user;
    renderProfile();
    showToast('Preferencia actualizada');
  };

  document.getElementById('toggle-smart-cat').onclick = async () => {
    const res = await api.updateProfile({ smartCategorization: !user.smartCategorization });
    state.currentUser = res.user;
    renderProfile();
    showToast('Preferencia actualizada');
  };

  document.getElementById('btn-reset-data').onclick = async () => {
    if (confirm('¿Restablecer todos los datos al estado de demostración?')) {
      await api.resetUserData();
      await refreshAllData();
      renderProfile();
      showToast('Datos de prueba restablecidos');
    }
  };

  document.getElementById('btn-logout').onclick = async () => {
    await api.logout();
    state.currentUser = null;
    renderApp();
    showToast('Sesión cerrada');
  };

  document.getElementById('btn-delete-account').onclick = () => {
    DOM.modalConfirmDelete.classList.remove('hidden');
    DOM.modalConfirmDelete.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          ${getIconSvg('alertTriangle', 'w-6 h-6')}
        </div>
        <div>
          <h3 class="font-bold text-base text-[#0b1c30]">¿Eliminar cuenta y datos?</h3>
          <p class="text-xs text-slate-500 mt-1">Esta acción borrará todas tus transacciones, metas y gastos fijos de forma irreversible.</p>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <button id="btn-cancel-delete" class="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer">Cancelar</button>
          <button id="btn-confirm-delete" class="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer">Sí, eliminar</button>
        </div>
      </div>
    `;
    document.getElementById('btn-cancel-delete').onclick = () => DOM.modalConfirmDelete.classList.add('hidden');
    document.getElementById('btn-confirm-delete').onclick = async () => {
      await api.deleteAccount();
      state.currentUser = null;
      DOM.modalConfirmDelete.classList.add('hidden');
      renderApp();
      showToast('Cuenta eliminada');
    };
  };
}

// -------------------------------------------------------------
// VIEW 7: AUTH (LOGIN & REGISTER)
// -------------------------------------------------------------
let isRegisterMode = true;
let registerAvatarUrl = '';

function renderAuth() {
  DOM.viewAuth.innerHTML = `
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <!-- Brand Header with Official Logo & Imagotipo -->
      <div class="flex flex-col items-center text-center gap-2">
        <div class="p-2 rounded-3xl bg-white shadow-sm border border-slate-100">
          ${getLogoIcon('w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-sm')}
        </div>
        ${getImagotipoHorizontal('h-9 sm:h-10 w-auto object-contain')}
        <p class="text-sm font-semibold text-[#0058bc] tracking-wide mt-1">
          Tu dinero claro, tus metas cerca.
        </p>
        <p class="text-xs text-slate-500 max-w-xs leading-relaxed">
          Organiza tus finanzas personales, controla tus gastos fijos y cumple tus metas de ahorro sin conectar bancos.
        </p>
      </div>

      <!-- Main Form Card -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <!-- Segmented Control -->
        <div class="w-full bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <button
            id="auth-tab-register"
            type="button"
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isRegisterMode ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }"
          >
            Crear Cuenta
          </button>
          <button
            id="auth-tab-login"
            type="button"
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !isRegisterMode ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }"
          >
            Ya tengo cuenta
          </button>
        </div>

        ${
          isRegisterMode
            ? `
          <!-- Registration Form -->
          <form id="form-register" class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-[#eff4ff] border border-blue-100">
              <div class="flex items-center gap-3">
                <div id="auth-avatar-preview">${renderAvatarHtml('Tu Nombre', registerAvatarUrl, 'lg')}</div>
                <div class="flex flex-col">
                  <span id="auth-preview-name" class="text-xs font-bold text-[#0b1c30]">Tu perfil</span>
                  <span class="text-[11px] text-slate-500">Se usarán las iniciales de tu nombre</span>
                </div>
              </div>

              <label class="px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-blue-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all">
                ${getIconSvg('camera', 'w-3.5 h-3.5')}
                <span>Foto</span>
                <input id="input-avatar-file" type="file" accept="image/*" class="sr-only" />
              </label>
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Nombre completo</label>
              <input id="reg-name" type="text" placeholder="ej. Camila Restrepo" required class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electrónico</label>
              <input id="reg-email" type="email" placeholder="ej. camila@email.com" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Salario o ingreso mensual estimado (COP)</label>
              <input id="reg-salary" type="text" placeholder="ej. 5.800.000" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc] tabular-nums" />
            </div>

            <button type="submit" class="w-full py-3 mt-2 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Comenzar a usar MiPlata
            </button>
          </form>
        `
            : `
          <!-- Login Form -->
          <form id="form-login" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electrónico</label>
              <input id="login-email" type="email" placeholder="camila.restrepo@email.com" required class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Contraseña</label>
              <input id="login-pass" type="password" placeholder="demo" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <button type="submit" class="w-full py-3 mt-2 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Iniciar Sesión
            </button>
          </form>
        `
        }

        <!-- Demo Account Instant Shortcut -->
        <div class="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
          <span class="text-[11px] text-slate-400 font-medium">¿Quieres probar la app de inmediato?</span>
          <button
            id="btn-login-demo"
            type="button"
            class="w-full py-2.5 px-4 rounded-2xl bg-[#eff4ff] hover:bg-blue-100 text-[#0058bc] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            ${getIconSvg('sparkles', 'w-4 h-4 text-[#0058bc]')}
            <span>Entrar con cuenta de demostración (Camila Restrepo)</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Auth listeners
  document.getElementById('auth-tab-register').onclick = () => {
    isRegisterMode = true;
    renderAuth();
  };
  document.getElementById('auth-tab-login').onclick = () => {
    isRegisterMode = false;
    renderAuth();
  };

  const btnDemo = document.getElementById('btn-login-demo');
  if (btnDemo) {
    btnDemo.onclick = async () => {
      try {
        const res = await api.loginDemo();
        state.currentUser = res.user;
        await refreshAllData();
        renderApp();
        showToast(res.message);
      } catch (err) {
        showToast('Error al conectar con la demo', 'error');
      }
    };
  }

  const formReg = document.getElementById('form-register');
  if (formReg) {
    const regName = document.getElementById('reg-name');
    const regSalary = document.getElementById('reg-salary');
    const avatarInput = document.getElementById('input-avatar-file');
    const previewName = document.getElementById('auth-preview-name');
    const avatarPreview = document.getElementById('auth-avatar-preview');

    regName.oninput = () => {
      previewName.textContent = regName.value.trim() || 'Tu perfil';
      avatarPreview.innerHTML = renderAvatarHtml(regName.value || 'Tu', registerAvatarUrl, 'lg');
    };

    regSalary.oninput = () => {
      const num = parseInt(regSalary.value.replace(/\D/g, ''), 10);
      regSalary.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
    };

    avatarInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        registerAvatarUrl = evt.target.result;
        avatarPreview.innerHTML = renderAvatarHtml(regName.value || 'Tu', registerAvatarUrl, 'lg');
      };
      reader.readAsDataURL(file);
    };

    formReg.onsubmit = async (e) => {
      e.preventDefault();
      const name = regName.value.trim();
      const email = document.getElementById('reg-email').value.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@miplata.local`;
      const salary = parseInt(regSalary.value.replace(/\D/g, ''), 10) || 0;

      try {
        const res = await api.register(name, email, '123456', salary, registerAvatarUrl);
        state.currentUser = res.user;
        await refreshAllData();
        renderApp();
        showToast(res.message);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  const formLog = document.getElementById('form-login');
  if (formLog) {
    formLog.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;

      try {
        const res = await api.login(email, pass);
        state.currentUser = res.user;
        await refreshAllData();
        renderApp();
        showToast(res.message);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}

// -------------------------------------------------------------
// MODALS LOGIC
// -------------------------------------------------------------

// Quick Add Transaction Modal (<10s Keypad)
function formatQuickAddDateLabel(dateISO) {
  const selectedDate = dateISO || getTodayISODate();
  const [, month, day] = selectedDate.split('-').map(Number);
  const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const isToday = selectedDate === getTodayISODate();
  const prefix = isToday ? 'Hoy, ' : '';
  const mode = isToday ? 'Automática' : 'Manual';
  return `${prefix}${day} ${shortMonths[month - 1] || ''} (${mode})`;
}

function openQuickAddModal(type = 'gasto') {
  state.quickAdd.isOpen = true;
  state.quickAdd.type = type;
  state.quickAdd.rawValue = '0';
  state.quickAdd.category = type === 'ingreso' ? 'Nómina' : 'Alimentación';
  state.quickAdd.description = '';
  state.quickAdd.isRecurrent = false;
  state.quickAdd.date = getTodayISODate();

  DOM.modalQuickAdd.classList.remove('hidden');
  renderQuickAddModalContent();
}

function renderQuickAddModalContent() {
  const { type, rawValue, category, description, isRecurrent, date } = state.quickAdd;
  const numVal = parseInt(rawValue, 10) || 0;

  const expenseCategories = [
    { name: 'Alimentación', label: 'Comida', icon: 'forkKnife' },
    { name: 'Transporte', label: 'Transporte', icon: 'car' },
    { name: 'Compras', label: 'Compras', icon: 'shoppingBag' },
    { name: 'Servicios', label: 'Servicios', icon: 'zap' },
    { name: 'Salud', label: 'Salud', icon: 'heartPulse' },
    { name: 'Entretenimiento', label: 'Ocio', icon: 'gamepad2' },
    { name: 'Educación', label: 'Educación', icon: 'graduationCap' },
    { name: 'Otros', label: 'Otros', icon: 'moreHorizontal' },
  ];

  const incomeCategories = [
    { name: 'Nómina', label: 'Nómina', icon: 'briefcase' },
    { name: 'Honorarios', label: 'Honorarios', icon: 'dollarSign' },
    { name: 'Negocio', label: 'Negocio', icon: 'building2' },
    { name: 'Inversión', label: 'Inversión', icon: 'trendingUp' },
    { name: 'Otros', label: 'Otros', icon: 'moreHorizontal' },
  ];

  const categories = type === 'ingreso' ? incomeCategories : expenseCategories;

  DOM.modalQuickAdd.innerHTML = `
    <div class="quick-add-page w-full max-w-[460px] min-h-screen bg-[#f8f9ff] overflow-y-auto px-4 pt-5 pb-6">
      <div class="flex items-center justify-between mb-5">
        <button id="qa-close-btn" aria-label="Volver" class="w-9 h-9 flex items-center justify-center text-[#0058bc] cursor-pointer">${getIconSvg('arrowLeft', 'w-7 h-7')}</button>
        <div class="flex items-center gap-2"><img src="assets/Logo.png" alt="MiPlata" class="w-10 h-10 rounded-xl" /><h1 class="text-xl font-semibold">Nuevo Registro</h1></div>
        ${renderAvatarHtml(state.currentUser?.name, state.currentUser?.avatarUrl, 'sm')}
      </div>
      <div class="h-1.5 w-16 rounded-full bg-[#dce8ff] mx-auto mb-4"></div>

      <div class="flex items-center bg-[#dce8ff] p-1 rounded-full mb-6">
        <button id="qa-type-gasto" class="flex-1 py-3 rounded-full text-base font-semibold transition-all cursor-pointer ${type === 'gasto' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600'}">Gasto</button>
        <button id="qa-type-ingreso" class="flex-1 py-3 rounded-full text-base font-semibold transition-all cursor-pointer ${type === 'ingreso' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600'}">Ingreso</button>
      </div>

      <div class="text-center mb-5"><div class="flex items-baseline justify-center gap-1"><span class="text-5xl font-extrabold text-[#0b1c30] tabular-nums"><span class="text-slate-300">$</span>${formatCOP(numVal).replace('$', '')}</span><span class="text-xl font-medium text-slate-500">COP</span></div><p class="mt-2 text-sm font-semibold text-[#0058bc]"><span class="inline-block w-3 h-3 rounded-full bg-[#006c49] mr-1"></span>${type === 'ingreso' ? 'Registrando ingreso inmediato' : 'Registrando egreso inmediato'}</p></div>

      <div class="flex items-center justify-between mb-3"><h2 class="text-lg font-semibold uppercase tracking-wide text-slate-600">Categoría</h2><span class="text-lg font-semibold text-[#0058bc]">${category}</span></div>
      <div id="qa-categories-scroll" class="qa-categories-scroll flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-5" role="listbox" aria-label="Categorías de ${type === 'ingreso' ? 'ingreso' : 'gasto'}">
        ${categories.map((c) => `<button type="button" data-cat="${c.name}" role="option" aria-selected="${category === c.name}" class="qa-cat-btn shrink-0 w-[84px] flex flex-col items-center gap-2 cursor-pointer"><span class="w-[72px] h-[72px] rounded-3xl flex items-center justify-center ${category === c.name ? 'bg-[#0058bc] text-white shadow-md' : 'bg-[#dce8ff] text-slate-600'}">${getIconSvg(c.icon, 'w-8 h-8')}</span><span class="text-sm whitespace-nowrap ${category === c.name ? 'text-[#0058bc] font-semibold' : 'text-slate-700'}">${c.label}</span></button>`).join('')}
      </div>

      <div class="rounded-3xl bg-white p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${getIconSvg('fileText', 'w-5 h-5')}</span><input id="qa-description-input" type="text" placeholder="${type === 'ingreso' ? 'Concepto del ingreso' : 'Café y empanada Juan Valdez'}" value="${description}" class="flex-1 text-lg bg-transparent focus:outline-none" /></div>
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${getIconSvg('calendar', 'w-5 h-5')}</span><div><p class="text-sm font-semibold text-slate-500">Fecha</p><p class="text-base font-semibold">${formatQuickAddDateLabel(date)}</p></div></div><div class="relative"><button id="qa-change-date-btn" type="button" class="rounded-full bg-[#dce8ff] px-3 py-2 text-sm font-semibold text-[#0058bc] cursor-pointer">Cambiar</button><input id="qa-date-input" type="date" value="${date}" aria-label="Cambiar fecha del registro" class="absolute inset-0 h-full w-full opacity-0 pointer-events-none" /></div></div>
        ${type === 'gasto' ? `<div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100"><span class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${getIconSvg('repeat', 'w-5 h-5')}</span><span><span class="block text-sm font-semibold text-slate-500">Gasto recurrente</span><span class="block text-base">Fijo cada mes</span></span></span><button id="qa-recurrent-toggle" type="button" role="switch" aria-checked="${isRecurrent}" aria-label="Gasto recurrente" class="w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${isRecurrent ? 'bg-[#0058bc]' : 'bg-[#dce8ff]'}"><span class="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isRecurrent ? 'translate-x-5' : 'translate-x-0'}"></span></button></div>` : ''}
      </div>

      <div class="keypad-grid gap-3 mb-6">
        <button data-key="1" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">1</button><button data-key="2" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">2</button><button data-key="3" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">3</button>
        <button data-key="4" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">4</button><button data-key="5" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">5</button><button data-key="6" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">6</button>
        <button data-key="7" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">7</button><button data-key="8" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">8</button><button data-key="9" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">9</button>
        <button data-key="000" class="keypad-btn bg-[#eef3ff] border-0 text-[#0058bc] h-[72px] rounded-full">+000</button><button data-key="0" class="keypad-btn bg-white border-0 shadow-sm h-[72px] rounded-full">0</button><button data-key="backspace" class="keypad-btn bg-[#eef3ff] border-0 h-[72px] rounded-full">${getIconSvg('deleteKey', 'w-7 h-7')}</button>
      </div>
      <button id="qa-submit-btn" class="w-full h-16 rounded-full ${numVal > 0 ? (type === 'ingreso' ? 'bg-[#006c49]' : 'bg-[#0058bc]') : 'bg-slate-300 pointer-events-none'} text-white font-bold text-xl shadow-md cursor-pointer flex items-center justify-center gap-2">${getIconSvg('checkCircle2', 'w-7 h-7')}<span>Guardar ${type === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></button>
    </div>
  `;

  // Attach Keypad Listeners
  document.getElementById('qa-type-gasto').onclick = () => {
    state.quickAdd.type = 'gasto';
    state.quickAdd.category = 'Alimentación';
    renderQuickAddModalContent();
  };
  document.getElementById('qa-type-ingreso').onclick = () => {
    state.quickAdd.type = 'ingreso';
    state.quickAdd.category = 'Nómina';
    renderQuickAddModalContent();
  };
  document.getElementById('qa-close-btn').onclick = () => {
    DOM.modalQuickAdd.classList.add('hidden');
    state.quickAdd.isOpen = false;
  };

  DOM.modalQuickAdd.querySelectorAll('.qa-cat-btn').forEach((btn) => {
    btn.onclick = () => {
      state.quickAdd.category = btn.dataset.cat;
      renderQuickAddModalContent();
    };
  });

  const descInput = document.getElementById('qa-description-input');
  if (descInput) {
    descInput.oninput = (e) => {
      state.quickAdd.description = e.target.value;
    };
  }

  const changeDateBtn = document.getElementById('qa-change-date-btn');
  const dateInput = document.getElementById('qa-date-input');
  if (changeDateBtn && dateInput) {
    changeDateBtn.onclick = () => {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.click();
      }
    };
    dateInput.onchange = (e) => {
      if (e.target.value) {
        state.quickAdd.date = e.target.value;
        renderQuickAddModalContent();
      }
    };
  }

  const recurrentToggle = document.getElementById('qa-recurrent-toggle');
  if (recurrentToggle) {
    recurrentToggle.onclick = () => {
      state.quickAdd.isRecurrent = !state.quickAdd.isRecurrent;
      renderQuickAddModalContent();
    };
  }

  DOM.modalQuickAdd.querySelectorAll('.keypad-btn').forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.key;
      if (k === 'backspace') {
        if (state.quickAdd.rawValue.length <= 1) {
          state.quickAdd.rawValue = '0';
        } else {
          state.quickAdd.rawValue = state.quickAdd.rawValue.slice(0, -1);
        }
      } else if (k === '000') {
        if (state.quickAdd.rawValue !== '0' && state.quickAdd.rawValue.length < 8) {
          state.quickAdd.rawValue += '000';
        }
      } else {
        if (state.quickAdd.rawValue === '0') {
          state.quickAdd.rawValue = k;
        } else if (state.quickAdd.rawValue.length < 10) {
          state.quickAdd.rawValue += k;
        }
      }
      renderQuickAddModalContent();
    };
  });

  const submitBtn = document.getElementById('qa-submit-btn');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const amount = parseInt(state.quickAdd.rawValue, 10) || 0;
      if (amount <= 0) return;

      const desc =
        state.quickAdd.description.trim() ||
        (state.quickAdd.type === 'ingreso' ? 'Ingreso recibido' : 'Gasto ocasional');

      const tx = {
        type: state.quickAdd.type,
        amount,
        category: state.quickAdd.category,
        description: desc,
        date: state.quickAdd.date,
        time: getCurrentTimeString(),
        accountMethod: state.quickAdd.type === 'ingreso' ? 'Bancolombia' : 'Bancolombia Débito',
        isRecurring: state.quickAdd.isRecurrent,
      };

      await api.addTransaction(tx);

      // If recurrent was checked, also register fixed obligation
      if (state.quickAdd.isRecurrent && state.quickAdd.type === 'gasto') {
        const todayDay = new Date().getDate();
        await api.addFixedObligation({
          name: desc,
          amount,
          dueDay: todayDay,
          category: state.quickAdd.category,
          status: 'pending',
          notes: `Vence Día ${todayDay} del mes`,
        });
      }

      await refreshAllData();
      DOM.modalQuickAdd.classList.add('hidden');
      state.quickAdd.isOpen = false;
      renderActiveView();
      showToast(`${state.quickAdd.type === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${formatCOP(amount)} guardado`);
    };
  }
}

// Edit / Delete Transaction Modal
function openEditTransactionModal(tx) {
  if (!tx) return;

  const categories =
    tx.type === 'ingreso'
      ? ['Nómina', 'Honorarios', 'Negocio', 'Inversión', 'Otros']
      : ['Alimentación', 'Transporte', 'Compras', 'Servicios', 'Salud', 'Entretenimiento', 'Educación', 'Otros'];

  DOM.modalEditTransaction.classList.remove('hidden');
  DOM.modalEditTransaction.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Modificar Movimiento</h3>
        <button id="edit-tx-close" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <form id="form-edit-tx" class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Concepto</label>
          <input id="edit-tx-desc" type="text" value="${tx.description}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Monto (COP)</label>
          <input id="edit-tx-amount" type="text" value="${tx.amount.toLocaleString('es-CO')}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Categoría</label>
            <select id="edit-tx-category" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]">
              ${categories
                .map((c) => `<option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>`)
                .join('')}
            </select>
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Fecha</label>
            <input id="edit-tx-date" type="date" value="${tx.date}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
          </div>
        </div>

        <button type="submit" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar Cambios
        </button>

        <button type="button" id="btn-delete-tx" class="w-full py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5">
          ${getIconSvg('trash2', 'w-4 h-4')}
          <span>Eliminar este movimiento</span>
        </button>
      </form>
    </div>
  `;

  document.getElementById('edit-tx-close').onclick = () => DOM.modalEditTransaction.classList.add('hidden');

  const amountInput = document.getElementById('edit-tx-amount');
  amountInput.oninput = () => {
    const num = parseInt(amountInput.value.replace(/\D/g, ''), 10);
    amountInput.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
  };

  document.getElementById('form-edit-tx').onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById('edit-tx-desc').value.trim();
    const amt = parseInt(amountInput.value.replace(/\D/g, ''), 10) || 0;
    const cat = document.getElementById('edit-tx-category').value;
    const date = document.getElementById('edit-tx-date').value;

    if (!desc || amt <= 0) return;

    await api.updateTransaction(tx.id, {
      description: desc,
      amount: amt,
      category: cat,
      date,
    });

    await refreshAllData();
    DOM.modalEditTransaction.classList.add('hidden');
    renderActiveView();
    showToast('Movimiento actualizado');
  };

  document.getElementById('btn-delete-tx').onclick = async () => {
    if (confirm('¿Deseas eliminar este movimiento permanentemente?')) {
      await api.deleteTransaction(tx.id);
      await refreshAllData();
      DOM.modalEditTransaction.classList.add('hidden');
      renderActiveView();
      showToast('Movimiento eliminado');
    }
  };
}

// Cash Detail & Adjust Balance Modal
function openCashDetailModal() {
  const metrics = computeMetrics();
  DOM.modalCashDetail.classList.remove('hidden');

  DOM.modalCashDetail.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-2xl bg-[#eff4ff] text-[#0058bc] flex items-center justify-center font-bold">
            ${getIconSvg('shieldCheck', 'w-5 h-5 text-[#0058bc]')}
          </div>
          <div>
            <h3 class="font-bold text-sm text-[#0b1c30]">Dinero Disponible</h3>
            <p class="text-[11px] text-slate-500">Cálculo real y gestión de saldo</p>
          </div>
        </div>
        <button id="cash-modal-close" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="p-4 rounded-2xl bg-gradient-to-br from-[#0b1c30] to-[#182739] text-white flex flex-col gap-1 shadow-inner">
        <span class="text-[11px] text-slate-300 font-medium">Disponible para gastar hoy con tranquilidad:</span>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold tracking-tight text-[#6cf8bb] tabular-nums">
            ${formatCOP(metrics.availableCash)}
          </span>
          <span class="text-xs font-semibold text-slate-400">COP</span>
        </div>
      </div>

      <!-- Real-time formula breakdown -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 divide-y divide-slate-200/70 text-xs flex flex-col gap-2">
        <div class="flex items-center justify-between pt-1">
          <span class="text-slate-600 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#006c49]"></span>
            Ingresos recibidos:
          </span>
          <span class="font-bold text-[#006c49] tabular-nums">+${formatCOP(metrics.totalIncome)}</span>
        </div>

        <div class="flex items-center justify-between pt-2">
          <span class="text-slate-600 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-700"></span>
            Gastos ejecutados del mes:
          </span>
          <span class="font-bold text-slate-800 tabular-nums">-${formatCOP(metrics.totalExpenses)}</span>
        </div>

        <div class="flex items-center justify-between pt-2">
          <span class="text-slate-600 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            Gastos fijos comprometidos (pendientes):
          </span>
          <span class="font-bold text-rose-600 tabular-nums">-${formatCOP(metrics.fixedCommitted)}</span>
        </div>

        <div class="flex items-center justify-between pt-2 font-bold text-[#0058bc]">
          <span>Total Disponible:</span>
          <span class="tabular-nums">${formatCOP(metrics.availableCash)} COP</span>
        </div>
      </div>

      <!-- Adjust Initial Balance -->
      <div class="flex flex-col gap-2 pt-1 border-t border-slate-100">
        <label class="text-xs font-bold text-[#0b1c30]">Ajustar saldo base en cuenta</label>
        <p class="text-[11px] text-slate-500 leading-snug">Si tienes dinero adicional inicial en tu cuenta, puedes ajustarlo aquí:</p>
        <div class="flex items-center gap-2 mt-0.5">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
            <input
              id="cash-adjust-input"
              type="text"
              placeholder="0"
              value="${state.currentUser?.initialBalance ? state.currentUser.initialBalance.toLocaleString('es-CO') : ''}"
              class="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc] tabular-nums"
            />
          </div>
          <button id="cash-adjust-save-btn" class="px-3.5 py-2 rounded-xl bg-[#0058bc] text-white text-xs font-semibold hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
            Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cash-modal-close').onclick = () => DOM.modalCashDetail.classList.add('hidden');

  const adjustInput = document.getElementById('cash-adjust-input');
  adjustInput.oninput = () => {
    const num = parseInt(adjustInput.value.replace(/\D/g, ''), 10);
    adjustInput.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
  };

  document.getElementById('cash-adjust-save-btn').onclick = async () => {
    const parsed = parseInt(adjustInput.value.replace(/\D/g, ''), 10) || 0;
    await api.updateInitialBalance(parsed);
    await refreshAllData();
    DOM.modalCashDetail.classList.add('hidden');
    renderActiveView();
    showToast('Saldo disponible base actualizado');
  };
}

// Add or Edit Fixed Obligation Modal
function openAddOrEditObligationModal(obligation = null) {
  DOM.modalFixedObligation.classList.remove('hidden');

  const isEdit = Boolean(obligation);
  const title = isEdit ? 'Modificar Gasto Fijo' : 'Nuevo Gasto Fijo Recurrente';

  DOM.modalFixedObligation.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">${title}</h3>
        <button id="ob-modal-close" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <form id="form-obligation" class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Nombre o concepto</label>
          <input id="ob-input-name" type="text" placeholder="ej. Arriendo o Internet Fibra" value="${isEdit ? obligation.name : ''}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Monto a pagar (COP)</label>
          <input id="ob-input-amount" type="text" placeholder="ej. 450.000" value="${isEdit ? obligation.amount.toLocaleString('es-CO') : ''}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc] tabular-nums" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Día de vencimiento (1-31)</label>
            <input id="ob-input-day" type="number" min="1" max="31" value="${isEdit ? obligation.dueDay : 5}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Categoría</label>
            <select id="ob-input-category" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]">
              <option value="Servicios" ${isEdit && obligation.category === 'Servicios' ? 'selected' : ''}>Servicios</option>
              <option value="Otros" ${isEdit && obligation.category === 'Otros' ? 'selected' : ''}>Vivienda / Arriendo</option>
              <option value="Entretenimiento" ${isEdit && obligation.category === 'Entretenimiento' ? 'selected' : ''}>Suscripciones</option>
              <option value="Salud" ${isEdit && obligation.category === 'Salud' ? 'selected' : ''}>Salud & Seguros</option>
              <option value="Transporte" ${isEdit && obligation.category === 'Transporte' ? 'selected' : ''}>Transporte</option>
            </select>
          </div>
        </div>

        <button type="submit" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          ${isEdit ? 'Guardar Cambios' : 'Guardar Obligación'}
        </button>

        ${
          isEdit
            ? `
          <button type="button" id="ob-delete-btn" class="w-full py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5">
            ${getIconSvg('trash2', 'w-4 h-4')}
            <span>Eliminar obligación</span>
          </button>
        `
            : ''
        }
      </form>
    </div>
  `;

  document.getElementById('ob-modal-close').onclick = () => DOM.modalFixedObligation.classList.add('hidden');

  const amountInput = document.getElementById('ob-input-amount');
  amountInput.oninput = () => {
    const num = parseInt(amountInput.value.replace(/\D/g, ''), 10);
    amountInput.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
  };

  document.getElementById('form-obligation').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('ob-input-name').value.trim();
    const amount = parseInt(amountInput.value.replace(/\D/g, ''), 10) || 0;
    const dueDay = parseInt(document.getElementById('ob-input-day').value, 10) || 1;
    const category = document.getElementById('ob-input-category').value;

    if (!name || amount <= 0) return;

    if (isEdit) {
      await api.updateFixedObligation(obligation.id, {
        name,
        amount,
        dueDay,
        category,
        notes: `Vence Día ${dueDay} del mes`,
      });
      showToast('Obligación actualizada');
    } else {
      await api.addFixedObligation({
        name,
        amount,
        dueDay,
        category,
        status: 'pending',
        notes: `Vence Día ${dueDay} del mes`,
      });
      showToast('Gasto fijo agregado');
    }

    await refreshAllData();
    DOM.modalFixedObligation.classList.add('hidden');
    renderActiveView();
  };

  const deleteBtn = document.getElementById('ob-delete-btn');
  if (deleteBtn && isEdit) {
    deleteBtn.onclick = async () => {
      if (confirm('¿Deseas eliminar este gasto fijo?')) {
        await api.deleteFixedObligation(obligation.id);
        await refreshAllData();
        DOM.modalFixedObligation.classList.add('hidden');
        renderActiveView();
        showToast('Obligación eliminada');
      }
    };
  }
}

// Add or Edit Savings Goal Modal
function openAddOrEditGoalModal(goal = null) {
  DOM.modalSavingsGoal.classList.remove('hidden');

  const isEdit = Boolean(goal);
  let customGoalImage = isEdit ? goal.imageUrl || '' : '';
  let selectedIcon = isEdit ? goal.icon || 'security' : 'security';
  const goalIconOptions = [
    { value: 'security', icon: 'shield' },
    { value: 'laptop', icon: 'laptop' },
    { value: 'plane', icon: 'plane' },
    { value: 'home', icon: 'home' },
    { value: 'car', icon: 'car' },
    { value: 'star', icon: 'star' },
  ];
  const goalIconButtons = goalIconOptions.map(({ value, icon }) => `
    <button type="button" data-goal-icon="${value}" class="goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${selectedIcon === value ? 'bg-[#0058bc] text-white' : 'bg-[#f0f4f9] text-[#657993]'}">
      ${getIconSvg(icon, 'w-5 h-5')}
    </button>
  `).join('');

  DOM.modalSavingsGoal.innerHTML = `
    <div class="bg-white rounded-[26px] p-6 max-w-md w-full max-h-[calc(100vh-24px)] overflow-y-auto shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-[18px] text-[#0b1c30]">${isEdit ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}</h3>
        <button id="goal-modal-close" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <form id="form-goal" class="flex flex-col gap-4">
        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Nombre de la meta</label>
          <input id="goal-input-name" type="text" placeholder="ej. Fondo de Emergencia o Vacaciones" value="${isEdit ? goal.name : ''}" required class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30" />
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Valor objetivo en COP</label>
          <input id="goal-input-target" type="text" inputmode="numeric" placeholder="30000000" value="${isEdit ? goal.targetAmount : ''}" required class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-bold text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30 tabular-nums" />
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Fecha límite opcional</label>
          <input id="goal-input-deadline" type="text" placeholder="ej. Diciembre 2026" value="${isEdit ? goal.deadline || '' : 'Diciembre 2026'}" class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30" />
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="text-[15px] font-medium text-[#6b7d98]">Cargar imagen de la meta</label>
            <button type="button" id="goal-remove-image" class="${customGoalImage ? '' : 'hidden'} text-xs font-semibold text-rose-600 cursor-pointer">Quitar foto</button>
          </div>
          <div class="flex items-center gap-3 mt-2">
            <div id="goal-img-preview" class="w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden">
              ${customGoalImage ? `<img src="${customGoalImage}" class="max-w-full max-h-full object-contain" />` : getIconSvg('flag', 'w-7 h-7 text-[#0058bc]')}
            </div>
            <label class="flex-1 h-11 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[#0058bc] text-[15px] font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#eef3ff] transition-colors">
              ${getIconSvg('camera', 'w-5 h-5')}
              <span>Cambiar foto</span>
              <input id="input-goal-file" type="file" accept="image/*" class="sr-only" />
            </label>
          </div>
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">O elige un icono</label>
          <div class="flex items-center gap-2 mt-2">${goalIconButtons}</div>
        </div>

        <button type="submit" class="w-full h-11 mt-2 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer">
          ${isEdit ? 'Guardar Cambios' : 'Crear Meta'}
        </button>

        ${
          isEdit
            ? `
          <button type="button" id="goal-delete-btn" class="w-full h-11 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5">
            ${getIconSvg('trash2', 'w-4 h-4')}
            <span>Eliminar Meta</span>
          </button>
        `
            : ''
        }
      </form>
    </div>
  `;

  document.getElementById('goal-modal-close').onclick = () => DOM.modalSavingsGoal.classList.add('hidden');

  const fileInput = document.getElementById('input-goal-file');
  const previewDiv = document.getElementById('goal-img-preview');
  const removeImageBtn = document.getElementById('goal-remove-image');
  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        customGoalImage = evt.target.result;
        previewDiv.innerHTML = `<img src="${customGoalImage}" class="max-w-full max-h-full object-contain" />`;
        removeImageBtn?.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    };
  }

  if (removeImageBtn) {
    removeImageBtn.onclick = () => {
      customGoalImage = '';
      previewDiv.innerHTML = getIconSvg('flag', 'w-7 h-7 text-[#0058bc]');
      removeImageBtn.classList.add('hidden');
      if (fileInput) fileInput.value = '';
    };
  }

  const targetInput = document.getElementById('goal-input-target');
  targetInput.oninput = () => {
    targetInput.value = targetInput.value.replace(/\D/g, '');
  };

  DOM.modalSavingsGoal.querySelectorAll('.goal-icon-choice').forEach((button) => {
    button.onclick = () => {
      selectedIcon = button.dataset.goalIcon;
      DOM.modalSavingsGoal.querySelectorAll('.goal-icon-choice').forEach((item) => {
        const active = item.dataset.goalIcon === selectedIcon;
        item.className = `goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${active ? 'bg-[#0058bc] text-white' : 'bg-[#f0f4f9] text-[#657993]'}`;
      });
    };
  });

  document.getElementById('form-goal').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-input-name').value.trim();
    const targetAmount = parseInt(targetInput.value.replace(/\D/g, ''), 10) || 0;
    const deadline = document.getElementById('goal-input-deadline').value.trim() || 'Diciembre 2026';
    const icon = selectedIcon;

    if (!name || targetAmount <= 0) return;

    const colors = {
      security: '#006c49',
      laptop: '#0058bc',
      plane: '#00838f',
      car: '#0284c7',
      home: '#4f46e5',
      star: '#d97706',
    };

    if (isEdit) {
      await api.updateSavingsGoal(goal.id, {
        name,
        targetAmount,
        deadline,
        icon,
        color: colors[icon] || '#006c49',
        imageUrl: customGoalImage,
      });
      showToast(`Meta "${name}" actualizada`);
    } else {
      await api.addSavingsGoal({
        name,
        targetAmount,
        currentAmount: 0,
        deadline,
        icon,
        color: colors[icon] || '#006c49',
        imageUrl: customGoalImage,
      });
      showToast(`Meta "${name}" creada`);
    }

    await refreshAllData();
    DOM.modalSavingsGoal.classList.add('hidden');
    renderActiveView();
  };

  const deleteBtn = document.getElementById('goal-delete-btn');
  if (deleteBtn && isEdit) {
    deleteBtn.onclick = async () => {
      if (confirm(`¿Deseas eliminar la meta "${goal.name}"?`)) {
        await api.deleteSavingsGoal(goal.id);
        await refreshAllData();
        DOM.modalSavingsGoal.classList.add('hidden');
        renderActiveView();
        showToast('Meta eliminada');
      }
    };
  }
}

// Aporte Goal Modal
function openAporteModal(goalId) {
  const goal = state.savingsGoals.find((g) => g.id === goalId);
  if (!goal) return;

  DOM.modalAporteGoal.classList.remove('hidden');
  DOM.modalAporteGoal.innerHTML = `
    <div class="bg-white rounded-[28px] p-6 max-w-lg w-full shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">
            ${getIconSvg('plus', 'w-5 h-5')}
          </div>
          <h3 class="font-bold text-[18px] text-[#0b1c30] truncate">Aportar a ${goal.name}</h3>
        </div>
        <button id="aporte-modal-close" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer shrink-0">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="mt-7 text-center">
        <label class="block text-sm font-semibold tracking-wide text-[#6b7d98]">MONTO A RESERVAR</label>
        <div class="flex items-baseline justify-center gap-3 mt-2 text-[#0058bc]">
          <span class="text-[34px] font-bold leading-none">$</span>
          <input id="aporte-input" type="text" inputmode="numeric" value="100000" placeholder="100000" class="w-44 bg-transparent text-center text-[38px] font-extrabold leading-none tabular-nums focus:outline-none" />
          <span class="text-sm font-semibold text-[#6b7d98]">COP</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5 mt-7">
        <button type="button" data-quick="50000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$50k</button>
        <button type="button" data-quick="100000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$100k</button>
        <button type="button" data-quick="200000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$200k</button>
      </div>

      <button id="aporte-submit-btn" class="w-full h-14 mt-6 rounded-full bg-[#0058bc] text-white font-bold text-[17px] shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
        ${getIconSvg('checkCircle2', 'w-5 h-5')}
        <span>Confirmar Aporte</span>
      </button>
      <button id="aporte-cancel-btn" type="button" class="w-full mt-3 text-[#6b7d98] font-medium text-base cursor-pointer hover:text-[#0058bc]">Cancelar</button>
    </div>
  `;

  document.getElementById('aporte-modal-close').onclick = () => DOM.modalAporteGoal.classList.add('hidden');
  document.getElementById('aporte-cancel-btn').onclick = () => DOM.modalAporteGoal.classList.add('hidden');

  const aporteInput = document.getElementById('aporte-input');
  DOM.modalAporteGoal.querySelectorAll('.aporte-quick-btn').forEach((btn) => {
    btn.onclick = () => {
      const amt = parseInt(btn.dataset.quick, 10);
      aporteInput.value = String(amt);
    };
  });

  aporteInput.oninput = () => {
    aporteInput.value = aporteInput.value.replace(/\D/g, '');
  };

  document.getElementById('aporte-submit-btn').onclick = async () => {
    const amt = parseInt(aporteInput.value.replace(/\D/g, ''), 10) || 0;
    if (amt <= 0) return;

    await api.contributeToGoal(goalId, amt, 'Manual');
    await refreshAllData();
    DOM.modalAporteGoal.classList.add('hidden');
    renderActiveView();
    showToast(`¡Aporte de ${formatCOP(amt)} registrado para ${goal.name}!`);
  };
}

// Edit Profile Modal with Avatar File Upload
function openEditProfileModal() {
  const user = state.currentUser;
  if (!user) return;

  let tempAvatarUrl = user.avatarUrl || '';

  DOM.modalEditProfile.classList.remove('hidden');
  DOM.modalEditProfile.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Editar Perfil</h3>
        <button id="edit-profile-close" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <!-- Avatar Preview & Change -->
      <div class="flex items-center justify-between p-3 rounded-2xl bg-[#eff4ff] border border-blue-100">
        <div class="flex items-center gap-3">
          <div id="profile-modal-avatar-preview">${renderAvatarHtml(user.name, tempAvatarUrl, 'lg')}</div>
          <div class="flex flex-col">
            <span class="text-xs font-bold text-[#0b1c30]">Foto de perfil</span>
            <span class="text-[11px] text-slate-500">Haz clic para cambiar</span>
          </div>
        </div>
        <label class="px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-blue-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all">
          ${getIconSvg('camera', 'w-3.5 h-3.5')}
          <span>Subir</span>
          <input id="input-profile-avatar" type="file" accept="image/*" class="sr-only" />
        </label>
      </div>

      <div class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Nombre completo</label>
          <input id="edit-name-input" type="text" value="${user.name}" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Correo electrónico</label>
          <input id="edit-email-input" type="email" value="${user.email}" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <button id="edit-profile-save-btn" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar Cambios
        </button>
      </div>
    </div>
  `;

  document.getElementById('edit-profile-close').onclick = () => DOM.modalEditProfile.classList.add('hidden');

  const avatarInput = document.getElementById('input-profile-avatar');
  const avatarPreview = document.getElementById('profile-modal-avatar-preview');
  if (avatarInput) {
    avatarInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        tempAvatarUrl = evt.target.result;
        avatarPreview.innerHTML = renderAvatarHtml(document.getElementById('edit-name-input').value || user.name, tempAvatarUrl, 'lg');
      };
      reader.readAsDataURL(file);
    };
  }

  document.getElementById('edit-profile-save-btn').onclick = async () => {
    const name = document.getElementById('edit-name-input').value.trim();
    const email = document.getElementById('edit-email-input').value.trim();
    if (!name) return;

    const res = await api.updateProfile({ name, email, avatarUrl: tempAvatarUrl });
    state.currentUser = res.user;
    DOM.modalEditProfile.classList.add('hidden');
    renderProfile();
    renderHeader();
    showToast('Perfil actualizado');
  };
}

// Edit Budget / Salary Modal
function openEditBudgetModal() {
  const user = state.currentUser;
  if (!user) return;
  const currentSalary = user.monthlySalary || user.monthlyBudgetLimit || 5800000;

  DOM.modalEditBudget.classList.remove('hidden');
  DOM.modalEditBudget.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Ajustar Salario Mensual</h3>
        <button id="edit-budget-close" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">Este valor se utiliza para calcular automáticamente tu regla 50/30/20 y límites del mes.</p>
        
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Salario mensual (COP)</label>
          <input id="edit-salary-input" type="text" value="${currentSalary.toLocaleString('es-CO')}" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <button id="edit-budget-save-btn" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar Salario
        </button>
      </div>
    </div>
  `;

  document.getElementById('edit-budget-close').onclick = () => DOM.modalEditBudget.classList.add('hidden');

  const salaryInput = document.getElementById('edit-salary-input');
  salaryInput.oninput = () => {
    const num = parseInt(salaryInput.value.replace(/\D/g, ''), 10);
    salaryInput.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
  };

  document.getElementById('edit-budget-save-btn').onclick = async () => {
    const salary = parseInt(salaryInput.value.replace(/\D/g, ''), 10) || 0;
    const res = await api.updateProfile({ monthlySalary: salary, monthlyBudgetLimit: salary });
    state.currentUser = res.user;
    DOM.modalEditBudget.classList.add('hidden');
    renderActiveView();
    showToast('Salario mensual actualizado');
  };
}

// Global Search Overlay Handlers
function setupSearchOverlay() {
  DOM.searchInputIcon.innerHTML = getIconSvg('search', 'w-4 h-4 text-slate-400');
  DOM.searchCloseBtn.innerHTML = getIconSvg('x', 'w-4 h-4');

  DOM.headerSearchBtn.onclick = () => {
    DOM.modalSearch.classList.remove('hidden');
    DOM.searchInput.value = '';
    DOM.searchInput.focus();
    renderSearchResults('');
  };

  DOM.searchCloseBtn.onclick = () => {
    DOM.modalSearch.classList.add('hidden');
  };

  DOM.searchInput.oninput = (e) => {
    renderSearchResults(e.target.value);
  };
}

function renderSearchResults(query) {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    DOM.searchResultsList.innerHTML = `
      <p class="text-xs text-slate-400 py-4 text-center">
        Escribe para buscar cualquier movimiento registrado...
      </p>
    `;
    return;
  }

  const results = state.transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(clean) ||
      t.category.toLowerCase().includes(clean) ||
      String(t.amount).includes(clean)
  );

  if (results.length === 0) {
    DOM.searchResultsList.innerHTML = `
      <p class="text-xs text-slate-400 py-4 text-center">
        No se encontraron movimientos con "${query}"
      </p>
    `;
    return;
  }

  DOM.searchResultsList.innerHTML = `
    <div class="divide-y divide-slate-100">
      ${results
        .map(
          (tx) => `
        <div data-search-tx="${tx.id}" class="search-item-row py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
          <div>
            <p class="font-semibold text-slate-800">${tx.description}</p>
            <p class="text-[11px] text-slate-500">${tx.category} • ${tx.date}</p>
          </div>
          <span class="font-semibold tabular-nums ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-slate-800'}">
            ${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)} COP
          </span>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  DOM.searchResultsList.querySelectorAll('.search-item-row').forEach((row) => {
    row.onclick = () => {
      DOM.modalSearch.classList.add('hidden');
      const tx = state.transactions.find((t) => t.id === row.dataset.searchTx);
      if (tx) openEditTransactionModal(tx);
    };
  });
}

// Physical Keyboard Listener for desktop
function setupKeyboardListeners() {
  window.addEventListener('keydown', (e) => {
    if (!state.quickAdd.isOpen) return;

    // If focused on input element, don't hijack unless Enter or Esc
    const active = document.activeElement;
    if (active && active.tagName.toLowerCase() === 'input' && active.type === 'text') {
      if (e.key === 'Escape') {
        DOM.modalQuickAdd.classList.add('hidden');
        state.quickAdd.isOpen = false;
      }
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      if (state.quickAdd.rawValue === '0') {
        state.quickAdd.rawValue = e.key;
      } else if (state.quickAdd.rawValue.length < 10) {
        state.quickAdd.rawValue += e.key;
      }
      renderQuickAddModalContent();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.quickAdd.rawValue.length <= 1) {
        state.quickAdd.rawValue = '0';
      } else {
        state.quickAdd.rawValue = state.quickAdd.rawValue.slice(0, -1);
      }
      renderQuickAddModalContent();
    } else if (e.key === 'Escape') {
      DOM.modalQuickAdd.classList.add('hidden');
      state.quickAdd.isOpen = false;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const submitBtn = document.getElementById('qa-submit-btn');
      if (submitBtn) submitBtn.click();
    }
  });
}

// --- BOOTSTRAP INITIALIZATION ---
async function init() {
  DOM.fabBtn.innerHTML = getIconSvg('plus', 'w-7 h-7 text-white');
  DOM.fabBtn.onclick = () => openQuickAddModal('gasto');

  DOM.headerBrand.onclick = () => switchTab('inicio');
  DOM.headerProfileBtn.onclick = () => switchTab('perfil');

  setupSearchOverlay();
  setupKeyboardListeners();

  // Load initial user session
  try {
    const user = await api.getCurrentUser();
    state.currentUser = user;
    if (user) {
      await refreshAllData();
    }
  } catch (e) {
    console.warn('Initial session check error', e);
  }

  renderApp();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
