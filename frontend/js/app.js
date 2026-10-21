/**
 * MiPlata - Main Application Controller
 * Complete Vanilla HTML5 + CSS3 + ES6 JavaScript Architecture
 * Faithfully matches original MiPla design, features, and workflows
 */

import { api, isDemoUser } from './api.js';
import { 
  formatCOP, 
  formatCompactCOP, 
  getCurrentTimeString, 
  getTodayISODate, 
  getInitials, 
  parseRawNumber,
  SPANISH_MONTHS,
  getCurrentMonthKey, 
  formatMonthKeyToLabel
} from './formatters.js';
import { 
  getLogoSvg, 
  getLogoIcon,
  getImagotipoHorizontal,
  getFixelarImagotipo,
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
  activeTab: 'inicio', // 'inicio' | 'gastos' | 'obligaciones' | 'metas' | 'perfil'
  selectedMonth: getCurrentMonthKey(),
  hideBalance: false,
  transactions: [],
  fixedObligations: [],
  savingsGoals: [],
  goalContributions: [],
  categoryBudgets: [],
  availableMonths: [],
  monthlyReports: {},

  // View specific filters
  filterRecordsType: 'all', // 'all' | 'gasto' | 'ingreso'
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
    categoryManuallySelected: false,
    smartSuggestion: '',
    description: '',
    date: getTodayISODate(),
  },

  // Carousel & UI states
  activeTipIndex: 0,
};

// Only ordinary, variable expenses participate in the monthly category
// budgets. Fixed obligations and goal contributions have their own modules
// and must not trigger a category-budget alert.
const CATEGORY_BUDGET_CATEGORIES = [
  'Alimentación',
  'Compras',
  'Educación',
  'Entretenimiento',
  'Transporte',
];

let lastLoadedMonthKey = getCurrentMonthKey();
let monthlyRolloverTimer = null;
let mutationReconcileTimer = null;
let localMutationVersion = 0;

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

window.addEventListener('miplata:auth-expired', () => {
  state.currentUser = null;
  state.transactions = [];
  state.fixedObligations = [];
  state.savingsGoals = [];
  state.goalContributions = [];
  state.categoryBudgets = [];
  state.availableMonths = [];
  state.monthlyReports = {};
  [
    DOM.modalQuickAdd,
    DOM.modalSearch,
    DOM.modalFixedObligation,
    DOM.modalSavingsGoal,
    DOM.modalAporteGoal,
    DOM.modalEditTransaction,
    DOM.modalEditProfile,
    DOM.modalEditBudget,
    DOM.modalConfirmDelete,
  ].forEach((modal) => modal?.classList.add('hidden'));
  renderApp();
  showToast('Tu sesión expiró. Ingresa nuevamente para continuar.', 'error');
});

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

function openDeleteConfirmationModal({ title, message, successMessage, errorMessage, onConfirm }) {
  DOM.modalConfirmDelete.classList.remove('hidden');
  DOM.modalConfirmDelete.innerHTML = `
    <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
        ${getIconSvg('alertTriangle', 'w-6 h-6')}
      </div>
      <div>
        <h3 id="delete-confirm-title" class="font-bold text-base text-[#0b1c30]"></h3>
        <p id="delete-confirm-message" class="text-xs text-slate-500 mt-1"></p>
      </div>
      <div class="flex items-center gap-2 pt-2">
        <button id="btn-cancel-delete" type="button" class="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer">Cancelar</button>
        <button id="btn-confirm-delete" type="button" class="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer">Sí, eliminar</button>
      </div>
    </div>
  `;

  document.getElementById('delete-confirm-title').textContent = title;
  document.getElementById('delete-confirm-message').textContent = message;

  const close = () => DOM.modalConfirmDelete.classList.add('hidden');
  document.getElementById('btn-cancel-delete').onclick = close;
  document.getElementById('btn-confirm-delete').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.classList.add('opacity-60', 'cursor-wait');
    try {
      await onConfirm();
      close();
      showToast(successMessage);
    } catch (error) {
      button.disabled = false;
      button.classList.remove('opacity-60', 'cursor-wait');
      showToast(error.message || errorMessage, 'error');
    }
  };
}

// Avatar Helper
function renderAvatarHtml(name, avatarUrl, size = 'md', showBadge = false) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs font-semibold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
    profile: 'w-24 h-24 text-2xl font-bold',
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
  const fallbackInitials = `<span class="tracking-tight select-none font-bold uppercase">${initials}</span>`;
  const inner = hasImg
    ? `<img src="${avatarUrl}" alt="${name}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.classList.remove('bg-slate-100'); this.parentElement.classList.add('bg-gradient-to-br', '${gradClass}'); this.nextElementSibling.style.display='flex'" /><span style="display:none" class="w-full h-full items-center justify-center tracking-tight select-none font-bold uppercase">${initials}</span>`
    : fallbackInitials;

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

const FIXED_OBLIGATION_CATEGORIES = [
  'Vivienda',
  'Servicios públicos',
  'Internet y telefonía',
  'Transporte',
  'Deudas y créditos',
  'Salud y seguros',
  'Suscripciones y membresías',
  'Educación y familia',
  'Otros',
];

const FIXED_OBLIGATION_CATEGORY_OPTIONS = [
  { name: 'Vivienda', label: 'Vivienda', icon: 'home' },
  { name: 'Servicios públicos', label: 'Servicios', icon: 'droplet' },
  { name: 'Internet y telefonía', label: 'Internet', icon: 'wifi' },
  { name: 'Transporte', label: 'Transporte', icon: 'car' },
  { name: 'Deudas y créditos', label: 'Créditos', icon: 'creditCard' },
  { name: 'Salud y seguros', label: 'Salud', icon: 'heartPulse' },
  { name: 'Suscripciones y membresías', label: 'Suscripciones', icon: 'tv' },
  { name: 'Educación y familia', label: 'Educación', icon: 'graduationCap' },
  { name: 'Otros', label: 'Otros', icon: 'banknote' },
];

function normalizeFixedObligationCategory(category) {
  const aliases = {
    Servicios: 'Servicios públicos',
    'Servicios Públicos': 'Servicios públicos',
    Entretenimiento: 'Suscripciones y membresías',
    Salud: 'Salud y seguros',
    Educación: 'Educación y familia',
  };
  const value = String(category || '').trim();
  return aliases[value] || (FIXED_OBLIGATION_CATEGORIES.includes(value) ? value : 'Otros');
}

function inferFixedObligationCategory(category, name = '') {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('arriendo') || lower.includes('casa') || lower.includes('apartamento')) return 'Vivienda';
  if (lower.includes('internet') || lower.includes('fibra') || lower.includes('wifi') || lower.includes('claro') || lower.includes('celular') || lower.includes('tigo') || lower.includes('movistar')) return 'Internet y telefonía';
  if (lower.includes('servicios') || lower.includes('agua') || lower.includes('luz') || lower.includes('epm') || lower.includes('energía')) return 'Servicios públicos';
  if (lower.includes('transporte') || lower.includes('parqueadero') || lower.includes('soat') || lower.includes('vehículo')) return 'Transporte';
  if (lower.includes('crédito') || lower.includes('prestamo') || lower.includes('banco') || lower.includes('cuota') || lower.includes('tarjeta')) return 'Deudas y créditos';
  if (lower.includes('salud') || lower.includes('seguro') || lower.includes('eps') || lower.includes('medicina')) return 'Salud y seguros';
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('streaming') || lower.includes('hbo') || lower.includes('disney') || lower.includes('gimnasio')) return 'Suscripciones y membresías';
  if (lower.includes('educación') || lower.includes('colegio') || lower.includes('universidad') || lower.includes('guardería')) return 'Educación y familia';
  return normalizeFixedObligationCategory(category);
}

// Obligation Context Icon Resolver
function getObligationContextIcon(name, category = '') {
  const categoryKey = inferFixedObligationCategory(category, name).toLowerCase();
  const lower = (name || '').toLowerCase();
  if (categoryKey === 'vivienda' || lower.includes('arriendo') || lower.includes('casa') || lower.includes('apartamento')) {
    return `<span class="text-[#0058bc]">${getIconSvg('home', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'internet y telefonía' || lower.includes('internet') || lower.includes('fibra') || lower.includes('claro') || lower.includes('wifi')) {
    return `<span class="text-indigo-600">${getIconSvg('wifi', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'servicios públicos' || lower.includes('servicios') || lower.includes('agua') || lower.includes('luz') || lower.includes('epm') || lower.includes('energía')) {
    return `<span class="text-[#006c49]">${getIconSvg('droplet', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'transporte' || lower.includes('transporte') || lower.includes('parqueadero') || lower.includes('soat') || lower.includes('vehículo')) {
    return `<span class="text-[#00826a]">${getIconSvg('car', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'deudas y créditos' || lower.includes('crédito') || lower.includes('prestamo') || lower.includes('banco') || lower.includes('cuota') || lower.includes('tarjeta')) {
    return `<span class="text-amber-700">${getIconSvg('creditCard', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'salud y seguros' || lower.includes('salud') || lower.includes('seguro') || lower.includes('eps') || lower.includes('medicina')) {
    return `<span class="text-rose-600">${getIconSvg('heartPulse', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'suscripciones y membresías' || lower.includes('netflix') || lower.includes('spotify') || lower.includes('streaming') || lower.includes('hbo') || lower.includes('disney') || lower.includes('gimnasio')) {
    return `<span class="text-purple-600">${getIconSvg('tv', 'w-5 h-5')}</span>`;
  }
  if (categoryKey === 'educación y familia' || lower.includes('educación') || lower.includes('colegio') || lower.includes('universidad') || lower.includes('guardería')) {
    return `<span class="text-[#0058bc]">${getIconSvg('graduationCap', 'w-5 h-5')}</span>`;
  }
  if (lower.includes('celular') || lower.includes('tigo') || lower.includes('movistar') || lower.includes('plan')) {
    return `<span class="text-teal-600">${getIconSvg('smartphone', 'w-5 h-5')}</span>`;
  }
  return `<span class="text-slate-600">${getIconSvg('banknote', 'w-5 h-5')}</span>`;
}

// Computed Financial Metrics
function normalizeRecordTimestamp(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 100000000000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecordSortParts(record) {
  const date = String(record.date || '').slice(0, 10);
  const time = String(record.time || '').trim();
  const dayTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? Date.parse(`${date}T00:00:00`)
    : 0;
  const hasTime = /^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i.test(time);
  const explicitTimestamp = hasTime && dayTimestamp
    ? (Date.parse(`${date}T${time}`) || Date.parse(`${date} ${time}`))
    : 0;
  const createdAt = normalizeRecordTimestamp(record.createdAt);
  const createdAtDate = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : '';
  const executionTimestamp = explicitTimestamp || (createdAt && createdAtDate === date ? createdAt : dayTimestamp) || createdAt;

  return {
    dayTimestamp: dayTimestamp || executionTimestamp,
    executionTimestamp,
    createdAt,
  };
}

function compareRecordsByRecency(left, right) {
  const leftParts = getRecordSortParts(left);
  const rightParts = getRecordSortParts(right);
  return rightParts.dayTimestamp - leftParts.dayTimestamp
    || rightParts.executionTimestamp - leftParts.executionTimestamp
    || rightParts.createdAt - leftParts.createdAt;
}

function getRecordIcon(tx, className = 'w-5 h-5') {
  if (tx.isGoalContribution) {
    return `<span class="text-[#0058bc]">${getIconSvg('flag', className)}</span>`;
  }
  if (tx.fixedObligationId) {
    return `<span class="text-[#0058bc]">${getIconSvg('calendarCheck', className)}</span>`;
  }
  if (tx.type === 'ingreso') {
    return `<span class="text-[#006c49]">${getIconSvg('arrowUpRight', className)}</span>`;
  }
  return getCategoryIconSvg(tx.category, className);
}

function getGoalContributionRecords(monthKey = null, contributions = state.goalContributions) {
  return contributions
    .filter((contribution) => !monthKey || String(contribution.date || '').startsWith(monthKey))
    .map((contribution) => {
      const createdAt = normalizeRecordTimestamp(contribution.timestamp);
      const timestampDate = createdAt ? new Date(createdAt) : null;
      const fallbackDate = timestampDate ? timestampDate.toISOString().slice(0, 10) : '';
      const fallbackTime = timestampDate
        ? timestampDate.toTimeString().slice(0, 8)
        : '';

      return {
        id: `goal-contribution-${contribution.id}`,
        type: 'gasto',
        amount: Number(contribution.amount) || 0,
        category: 'Ahorro / Metas',
        description: `Aporte a meta: ${contribution.goalName || 'Meta de ahorro'}`,
        date: contribution.date || fallbackDate,
        time: contribution.time || fallbackTime,
        createdAt,
        accountMethod: 'Meta de ahorro',
        isRecurring: false,
        fixedObligationId: null,
        isGoalContribution: true,
        goalId: contribution.goalId || null,
      };
    });
}

function getMonthlyRecords(monthKey) {
  const report = state.monthlyReports[monthKey];
  const transactions = report
    ? (report.transactions || [])
    : state.transactions.filter((transaction) => transaction.date && transaction.date.startsWith(monthKey));
  const contributions = report ? (report.goalContributions || []) : state.goalContributions;
  return [
    ...transactions,
    ...getGoalContributionRecords(monthKey, contributions),
  ].sort(compareRecordsByRecency);
}

function getConfiguredMonthlyIncome(user = state.currentUser) {
  return Number(user?.monthlySalary) || Number(user?.monthlyBudgetLimit) || 0;
}

function getConfiguredMonthlyBudget(user = state.currentUser) {
  return Number(user?.monthlyBudgetLimit) || Number(user?.monthlySalary) || 0;
}

function getMonthlyIncomeTotal(monthKey) {
  return getMonthlyRecords(monthKey)
    .filter((transaction) => transaction.type === 'ingreso')
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
}

function getBudgetAdjustment(monthKey = state.selectedMonth, user = state.currentUser) {
  const configuredIncome = getConfiguredMonthlyIncome(user);
  const configuredBudget = getConfiguredMonthlyBudget(user);
  const recordedIncome = getMonthlyIncomeTotal(monthKey);

  if (!user?.autoAdjustVariable || recordedIncome <= 0) {
    return {
      configuredIncome,
      recordedIncome,
      effectiveIncome: configuredIncome,
      monthlyBudgetLimit: configuredBudget,
      categoryScale: 1,
      isAdjusted: false,
    };
  }

  // Keep the user's chosen budget share. For example, a $4M budget on a
  // $5M configured income becomes $4.8M when the month receives $6M.
  if (configuredIncome <= 0) {
    return {
      configuredIncome,
      recordedIncome,
      effectiveIncome: recordedIncome,
      monthlyBudgetLimit: recordedIncome,
      categoryScale: 1,
      isAdjusted: true,
    };
  }

  const categoryScale = recordedIncome / configuredIncome;
  return {
    configuredIncome,
    recordedIncome,
    effectiveIncome: recordedIncome,
    monthlyBudgetLimit: Math.max(0, Math.round(configuredBudget * categoryScale)),
    categoryScale,
    isAdjusted: Math.round(recordedIncome) !== Math.round(configuredIncome),
  };
}

function getEffectiveCategoryBudgets(monthKey = state.selectedMonth) {
  const adjustment = getBudgetAdjustment(monthKey);
  return state.categoryBudgets
    .filter((budget) => CATEGORY_BUDGET_CATEGORIES.includes(budget.category))
    .sort((left, right) => CATEGORY_BUDGET_CATEGORIES.indexOf(left.category) - CATEGORY_BUDGET_CATEGORIES.indexOf(right.category))
    .map((budget) => ({
      ...budget,
      limit: Math.max(0, Math.round((Number(budget.limit) || 0) * adjustment.categoryScale)),
    }));
}

function computeMetrics() {
  const { transactions, fixedObligations, savingsGoals, currentUser, selectedMonth } = state;

  // Contributions are virtual expense records: they appear in egresos and
  // history, but remain separate from transactions to avoid duplicate data.
  const monthTransactions = getMonthlyRecords(selectedMonth);

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
  const totalGoalContributions = monthTransactions
    .filter((transaction) => transaction.isGoalContribution)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  // Goal contributions are virtual expense records in monthTransactions, so
  // they are already included in totalExpenses. The same real available
  // balance is used by the dashboard, goal contributions and smart advice.
  // Pending fixed obligations do not reduce this value until they are paid
  // and their expense is registered.
  const availableCash = Math.max(0, totalIncome - totalExpenses);

  const budgetAdjustment = getBudgetAdjustment(selectedMonth, currentUser);
  const monthlyBudgetLimit = budgetAdjustment.monthlyBudgetLimit;
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
    totalGoalContributions,
    availableCash,
    monthlyBudgetLimit,
    monthlyBudgetSpent,
    monthlyBudgetRemaining,
    monthlyBudgetPercent,
    effectiveMonthlyIncome: budgetAdjustment.effectiveIncome,
    budgetAdjustment,
    monthTransactions,
  };
}

function getRecordMonthsList() {
  const monthKeys = new Set([
    ...state.availableMonths,
    ...state.transactions.map((transaction) => String(transaction.date || '').slice(0, 7)),
    ...state.goalContributions.map((contribution) => String(contribution.date || '').slice(0, 7)),
  ].filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey)));
  monthKeys.add(getCurrentMonthKey());

  return [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: formatMonthKeyToLabel(key) }));
}

// Navigation Handler
function switchTab(tabId) {
  // Incomes and expenses now live together in the Registros module.
  if (tabId === 'ingresos') tabId = 'gastos';
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
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function handleInsightAlertAction(button) {
  const targetTab = button.dataset.tab || 'gastos';
  const focusTarget = button.dataset.focus;

  if (focusTarget === 'balance') {
    const focusBalance = () => {
      document.getElementById('dashboard-balance-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (state.activeTab !== 'inicio') {
      switchTab(targetTab);
      requestAnimationFrame(focusBalance);
    } else {
      focusBalance();
    }
    return;
  }

  switchTab(targetTab);
}

function restoreCachedState() {
  try {
    const cached = JSON.parse(localStorage.getItem('miplata_bootstrap_cache') || 'null');
    const cachedUser = cached?.user;
    const sessionUser = JSON.parse(localStorage.getItem('miplata_user_cache') || 'null');
    if (!cachedUser?.id || cachedUser.id !== sessionUser?.id) return false;
    state.currentUser = cachedUser;
    state.transactions = cached.transactions || [];
    state.fixedObligations = cached.fixedObligations || [];
    state.goalContributions = cached.goalContributions || [];
    state.savingsGoals = cached.savingsGoals || [];
    state.categoryBudgets = cached.categoryBudgets || [];
    state.availableMonths = cached.availableMonths || [];
    state.monthlyReports = {};
    return true;
  } catch (_error) {
    localStorage.removeItem('miplata_bootstrap_cache');
    return false;
  }
}

// Data Fetcher from Python Flask Backend
function applyBootstrapData(data) {
  if (!data?.user) return false;
  state.currentUser = data.user;
  state.transactions = data.transactions || [];
  state.fixedObligations = data.fixedObligations || [];
  state.goalContributions = data.goalContributions || [];
  // Goal progress is cumulative and is already synchronized by the backend;
  // this bootstrap intentionally contains only current-month contributions.
  state.savingsGoals = data.savingsGoals || [];
  state.categoryBudgets = data.categoryBudgets || [];
  state.availableMonths = data.availableMonths || [];
  state.monthlyReports = {};
  state.selectedMonth = getCurrentMonthKey();
  return true;
}

function syncGoalAmountsWithContributions(goals, contributions) {
  const totals = new Map();
  contributions.forEach((contribution) => {
    const goalId = String(contribution?.goalId || '');
    if (!goalId) return;
    totals.set(goalId, (totals.get(goalId) || 0) + (Number(contribution.amount) || 0));
  });

  return goals.map((goal) => ({
    ...goal,
    currentAmount: totals.get(String(goal.id)) || 0,
  }));
}

async function refreshAllData(expectedMutationVersion = null) {
  try {
    const data = await api.getBootstrap();
    if (!data?.user) {
      state.currentUser = null;
      renderApp();
      return false;
    }
    if (expectedMutationVersion !== null && expectedMutationVersion !== localMutationVersion) return false;
    lastLoadedMonthKey = getCurrentMonthKey();
    return applyBootstrapData(data);
  } catch (err) {
    console.error('Error fetching data from backend', err);
    return false;
  }
}

function registerLocalMutation(...records) {
  localMutationVersion += 1;
  state.monthlyReports = {};
  const monthKeys = new Set([getCurrentMonthKey(), ...(state.availableMonths || [])]);
  records.flat().forEach((record) => {
    const monthKey = String(record?.date || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(monthKey)) monthKeys.add(monthKey);
  });
  state.availableMonths = [...monthKeys].sort((left, right) => right.localeCompare(left));
  // Demo data is intentionally session-scoped. Its API client already keeps
  // mutations in memory, so reconciling with the seed would undo the user's
  // changes before the page is reloaded or the session ends.
  if (isDemoAccountState()) return;
  scheduleMutationReconcile();
}

function scheduleMutationReconcile() {
  if (mutationReconcileTimer) window.clearTimeout(mutationReconcileTimer);
  const expectedMutationVersion = localMutationVersion;
  mutationReconcileTimer = window.setTimeout(async () => {
    mutationReconcileTimer = null;
    const refreshed = await refreshAllData(expectedMutationVersion);
    if (refreshed) renderActiveView();
    else if (expectedMutationVersion !== localMutationVersion) scheduleMutationReconcile();
  }, 1500);
}

function applyLocalTransaction(tx, response = {}) {
  const transaction = {
    ...tx,
    id: response.id || tx.id || `tx_local_${Date.now()}`,
    userId: state.currentUser?.id,
    amount: Number(tx.amount) || 0,
    createdAt: tx.createdAt || Date.now(),
  };
  state.transactions = [...state.transactions.filter((item) => item.id !== transaction.id), transaction];
  registerLocalMutation(transaction);
  return transaction;
}

function updateLocalTransaction(id, updates) {
  state.transactions = state.transactions.map((item) => item.id === id ? { ...item, ...updates } : item);
  registerLocalMutation();
}

function upsertLocalFixedObligation(item, id = null) {
  const obligation = {
    ...item,
    id: id || item.id || `fix_local_${Date.now()}`,
    userId: state.currentUser?.id,
    amount: Number(item.amount) || 0,
    paidDate: item.paidDate || null,
  };
  state.fixedObligations = [...state.fixedObligations.filter((entry) => entry.id !== obligation.id), obligation];
  registerLocalMutation();
  return obligation;
}

function updateLocalFixedObligation(id, updates) {
  state.fixedObligations = state.fixedObligations.map((item) => item.id === id ? { ...item, ...updates } : item);
  registerLocalMutation();
}

function removeLocalFixedObligation(id) {
  state.fixedObligations = state.fixedObligations.filter((item) => item.id !== id);
  state.transactions = state.transactions.filter((item) => item.fixedObligationId !== id);
  registerLocalMutation();
}

function applyLocalFixedToggle(id, result = {}) {
  const obligation = state.fixedObligations.find((item) => item.id === id);
  if (!obligation) return;
  const isPaid = Boolean(result.isPaid);
  const paidDate = isPaid ? getTodayISODate() : null;
  state.fixedObligations = state.fixedObligations.map((item) => item.id === id
    ? { ...item, status: isPaid ? 'paid' : 'pending', paidDate }
    : item);
  if (isPaid && !state.transactions.some((item) => item.fixedObligationId === id)) {
    state.transactions = [...state.transactions, {
      id: result.transactionId || `tx_fix_${id}_local_${Date.now()}`,
      userId: state.currentUser?.id,
      type: 'gasto',
      amount: Number(obligation.amount) || 0,
      category: obligation.category,
      description: `${obligation.name} (Gasto Fijo)`,
      date: paidDate,
      time: getCurrentTimeString(),
      accountMethod: 'Fijo Mensual',
      isRecurring: true,
      fixedObligationId: id,
      createdAt: Date.now(),
    }];
  } else if (!isPaid) {
    state.transactions = state.transactions.filter((item) => item.fixedObligationId !== id);
  }
  registerLocalMutation();
}

function upsertLocalSavingsGoal(goal, id = null) {
  const savedGoal = {
    ...goal,
    id: id || goal.id || `goal_local_${Date.now()}`,
    userId: state.currentUser?.id,
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    imageUrl: goal.imageUrl || '',
  };
  state.savingsGoals = [...state.savingsGoals.filter((item) => item.id !== savedGoal.id), savedGoal];
  registerLocalMutation();
  return savedGoal;
}

function updateLocalSavingsGoal(id, updates) {
  state.savingsGoals = state.savingsGoals.map((item) => item.id === id ? { ...item, ...updates } : item);
  registerLocalMutation();
}

function isDemoAccountState() {
  return isDemoUser(state.currentUser)
    || String(state.currentUser?.name || '').trim().toLowerCase() === 'fixelar';
}

function removeLocalSavingsGoal(id) {
  state.savingsGoals = state.savingsGoals.filter((item) => item.id !== id);
  state.goalContributions = state.goalContributions.filter((item) => item.goalId !== id);
  if (isDemoAccountState()) {
    localMutationVersion += 1;
    state.monthlyReports = {};
    return;
  }
  registerLocalMutation();
}

function applyLocalGoalContribution(goalId, amount, type, response = {}) {
  const goal = state.savingsGoals.find((item) => item.id === goalId);
  if (!goal) return;
  const result = response.result || {};
  const contribution = {
    id: result.contributionId || `contrib_local_${Date.now()}`,
    userId: state.currentUser?.id,
    goalId,
    goalName: goal.name,
    amount: Number(amount) || 0,
    date: getTodayISODate(),
    type,
    timestamp: Date.now(),
  };
  const newAmount = Number(result.newAmount);
  state.goalContributions = [contribution, ...state.goalContributions.filter((item) => item.id !== contribution.id)];
  state.savingsGoals = state.savingsGoals.map((item) => item.id === goalId
    ? { ...item, currentAmount: Number.isFinite(newAmount) ? newAmount : (Number(item.currentAmount) || 0) + contribution.amount }
    : item);
  registerLocalMutation(contribution);
}

function setupMonthlyRolloverWatcher() {
  if (monthlyRolloverTimer) return;
  monthlyRolloverTimer = window.setInterval(async () => {
    if (!state.currentUser) return;
    const currentMonth = getCurrentMonthKey();
    if (currentMonth === lastLoadedMonthKey) return;
    state.selectedMonth = currentMonth;
    const refreshed = await refreshAllData();
    if (refreshed) renderApp();
  }, 60000);
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

  DOM.headerSearchBtn.innerHTML = getIconSvg('search', 'w-5 h-5 text-slate-600');
  DOM.headerSearchBtn.setAttribute('aria-label', 'Buscar movimientos');

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
    { id: 'gastos', label: 'Registros', icon: 'receiptText' },
    { id: 'obligaciones', label: 'Fijos', icon: 'calendarCheck' },
    { id: 'metas', label: 'Metas', icon: 'flag' },
    { id: 'perfil', label: 'Perfil', icon: 'sliders' },
  ];

  DOM.navItemsContainer.innerHTML = navItems
    .map((item) => {
      const isActive = state.activeTab === item.id || (item.id === 'obligaciones' && state.activeTab === 'fijos');
      const iconWrapperClass = `p-1 rounded-xl transition-all ${isActive ? 'bg-[#0058bc]/10 text-[#0058bc] scale-105' : ''}`;
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
      renderExpenses();
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
function renderSystemAlertCard(alert) {
  const alertIcon = alert.icon || (alert.type === 'danger' ? 'alertTriangle' : alert.type === 'warning' ? 'alertCircle' : 'info');
  const iconTone = alert.type === 'danger'
    ? 'bg-[#ffe1e7] text-[#f3194d]'
    : alert.type === 'warning'
    ? 'bg-[#fff0d7] text-[#b45309]'
    : 'bg-[#dce8ff] text-[#0058bc]';
  const messageTone = alert.type === 'danger'
    ? 'text-[#f3194d]'
    : alert.type === 'warning'
    ? 'text-[#b45309]'
    : 'text-[#0058bc]';
  const description = alert.description || alert.message || '';

  return `
    <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-full ${iconTone} flex items-center justify-center shrink-0">${getIconSvg(alertIcon, 'w-5 h-5')}</div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[#0b1c30]">${alert.title}</p>
          <p class="text-[11px] font-semibold ${messageTone}">${description}</p>
        </div>
      </div>
      <button data-tab="${alert.actionTab || 'gastos'}" data-focus="${alert.actionFocus || ''}" class="insight-alert-action rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">
        ${alert.actionLabel || 'Ver'}
      </button>
    </div>
  `;
}

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
  const months = getRecordMonthsList();
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
      <div id="dashboard-balance-card" class="hero-card-dark">
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

          </div>

          <!-- Main Amount Display -->
          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#6cf8bb] tabular-nums">
              ${state.hideBalance ? '••••••••' : formatCOP(metrics.availableCash)}
            </span>
            <span class="text-xs font-bold text-slate-300 uppercase">COP</span>
          </div>

          <!-- 3 Sub-pills (Ingresos, Egresos, Por Pagar) -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <div id="dash-pill-ingresos" class="flex flex-col p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <span class="text-[10px] text-slate-400 font-medium">Ingresos Mes</span>
              <span class="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5">
                ${state.hideBalance ? '••••' : formatCOP(metrics.totalIncome, true)}
              </span>
            </div>

            <div id="dash-pill-gastado" class="flex flex-col p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <span class="text-[10px] text-rose-400 font-medium">Egresos Hoy</span>
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
      ${alerts.map((alert) => renderSystemAlertCard(alert)).join('')}

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
              <div data-tx-id="${tx.isGoalContribution ? '' : tx.id}" data-goal-contribution="${tx.isGoalContribution ? 'true' : 'false'}" class="dash-tx-row flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors ${tx.isGoalContribution ? 'cursor-default' : 'cursor-pointer'}">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    ${getRecordIcon(tx, 'w-5 h-5')}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <p class="text-xs font-semibold text-[#0b1c30] truncate">${tx.description}</p>
                    <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category}</p>
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

  const pillIngresos = document.getElementById('dash-pill-ingresos');
  const pillGastado = document.getElementById('dash-pill-gastado');
  const pillFijos = document.getElementById('dash-pill-fijos');
  if (pillIngresos) pillIngresos.onclick = () => switchTab('gastos');
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
    btn.onclick = () => handleInsightAlertAction(btn);
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
  const months = getRecordMonthsList();
  const pending = state.fixedObligations.filter((o) => o.status === 'pending');
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0);
  const budgetLimit = metrics.monthlyBudgetLimit;
  const budgetPercent = budgetLimit > 0 ? Math.min(100, Math.round((metrics.monthlyBudgetSpent / budgetLimit) * 100)) : 0;
  const goals = state.savingsGoals.slice(0, 2);
  const recent = metrics.monthTransactions.slice(0, 5);
  const financialAlerts = getFinancialAlerts({ ...state, ...metrics, alert80Percent: user.alert80Percent !== false });
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

      <div id="dashboard-balance-card" class="hero-card-dark mockup-home-hero p-5">
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
          <div class="flex items-baseline gap-2">
            <span class="text-[38px] leading-none font-extrabold tracking-tight text-white tabular-nums">${state.hideBalance ? '••••••••' : formatCOP(metrics.availableCash)}</span>
            <span class="text-xs font-semibold text-slate-300">COP</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <div id="dash-pill-ingresos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-[#6cf8bb] font-semibold">• Ingresos</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(metrics.totalIncome, true)}</strong></div>
            <div id="dash-pill-gastado" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-rose-400 font-semibold">• Egresos</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(metrics.totalExpenses, true)}</strong></div>
            <div id="dash-pill-fijos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-slate-300 font-semibold">• Por Pagar</span><strong class="block text-sm text-white tabular-nums">${state.hideBalance ? '••••' : formatCOP(pendingAmount, true)}</strong></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button id="btn-quick-gasto" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-rose-600 py-3 border border-slate-100 cursor-pointer">${getIconSvg('plusCircle', 'w-5 h-5')}<span class="text-[11px] font-semibold">Gasto</span></button>
        <button id="btn-quick-ingreso" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#006c49] py-3 border border-slate-100 cursor-pointer">${getIconSvg('arrowDownCircle', 'w-5 h-5')}<span class="text-[11px] font-semibold">Ingreso</span></button>
        <button id="btn-quick-obligaciones" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#0058bc] py-3 border border-slate-100 cursor-pointer">${getIconSvg('calendar', 'w-5 h-5')}<span class="text-[11px] font-semibold">Pagar Fijo</span></button>
        <button id="btn-quick-metas" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-amber-600 py-3 border border-slate-100 cursor-pointer">${getIconSvg('flag', 'w-5 h-5')}<span class="text-[11px] font-semibold">Nueva Meta</span></button>
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
        <div class="flex items-center justify-between gap-3 mt-3 text-sm"><span class="text-slate-600">Egresos: <strong class="text-[#0b1c30]">${formatCOP(metrics.monthlyBudgetSpent)} COP</strong></span><span class="text-right text-[#006c49]">Restante: <strong>${formatCOP(metrics.monthlyBudgetRemaining)} COP</strong></span></div>
      </div>

      ${financialAlerts.length ? `
        <div class="flex flex-col gap-2">
          ${financialAlerts.map((alert) => renderSystemAlertCard(alert)).join('')}
        </div>
      ` : ''}

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
            <div class="min-w-0"><p class="text-sm font-semibold text-[#0b1c30]">Gastos fijos del mes</p><p class="text-xs text-slate-500">${state.fixedObligations.length ? '¡Todo al día este mes!' : 'No tienes gastos fijos registrados'}</p></div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver obligaciones</button>
        </div>
      `}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Metas Activas <span class="ml-1 rounded-full bg-[#dce8ff] px-2 py-0.5 text-xs">${state.savingsGoals.length}</span></h2><button id="dash-ver-metas-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Explorar ${getIconSvg('chevronRight', 'w-3 h-3 inline')}</button></div>
        <div class="grid grid-cols-2 gap-2.5">
          ${goals.map((goal) => { const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0; const mediaClass = goal.imageUrl ? 'w-9 h-9 flex items-center justify-center overflow-hidden' : 'w-9 h-9 rounded-full flex items-center justify-center'; return `<div data-goal="${goal.id}" class="dash-goal-card rounded-3xl bg-white p-3.5 shadow-sm border border-slate-100 cursor-pointer"><div class="flex items-center justify-between"><div class="${mediaClass}" style="${goal.imageUrl ? '' : `background-color:${goal.color}25;color:${goal.color}`}" >${renderGoalMedia(goal, 'w-full h-full object-contain', 'w-4 h-4')}</div><span class="text-xs font-bold" style="color:${goal.color}">${percent}%</span></div><p class="mt-2 text-xs font-semibold truncate">${goal.name}</p><p class="text-[11px] text-slate-600 tabular-nums">${formatCompactCOP(goal.currentAmount)} / ${formatCompactCOP(goal.targetAmount)}</p><div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${percent}%;background:${goal.color}"></div></div></div>`; }).join('')}
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
      ${recent.map((tx) => `<div data-tx-id="${tx.isGoalContribution ? '' : tx.id}" data-goal-contribution="${tx.isGoalContribution ? 'true' : 'false'}" class="dash-tx-row flex items-center justify-between py-3 ${tx.isGoalContribution ? 'cursor-default' : 'cursor-pointer'}"><div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-2xl ${tx.type === 'ingreso' ? 'bg-emerald-50 text-[#006c49]' : 'bg-slate-100 text-slate-600'} flex items-center justify-center shrink-0">${getRecordIcon(tx, 'w-5 h-5')}</div><div class="min-w-0"><p class="text-xs font-semibold truncate">${tx.description}</p><p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category}</p></div></div><div class="text-right shrink-0"><strong class="text-sm tabular-nums ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-[#0b1c30]'}">${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)}</strong><span class="block text-[10px] ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-slate-500'}">${tx.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></div></div>`).join('')}
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
    const tipCards = Array.from(tipScroller.querySelectorAll('.financial-tip-card'));
    const syncTipHeight = (index = state.activeTipIndex) => {
      const activeCard = tipCards[index] || tipCards[0];
      if (!activeCard) return;
      tipScroller.style.height = `${activeCard.offsetHeight}px`;
    };

    const syncTipFromScroll = () => {
      const nextIndex = Math.max(0, Math.min(tips.length - 1, Math.round(tipScroller.scrollLeft / Math.max(tipScroller.clientWidth, 1))));
      state.activeTipIndex = nextIndex;
      syncTipHeight(nextIndex);
    };

    const scrollToTip = (offset) => {
      const nextIndex = (state.activeTipIndex + offset + tips.length) % tips.length;
      state.activeTipIndex = nextIndex;
      syncTipHeight(nextIndex);
      tipScroller.scrollTo({ left: nextIndex * tipScroller.clientWidth, behavior: 'smooth' });
    };

    tipScroller.addEventListener('scroll', syncTipFromScroll, { passive: true });
    syncTipHeight();
    window.setTimeout(() => syncTipHeight(), 0);

    tipScroller.querySelectorAll('[data-tip-direction]').forEach((button) => {
      button.onclick = () => scrollToTip(Number(button.dataset.tipDirection) || 1);
    });
    tipScroller.querySelectorAll('[data-tip-next]').forEach((button) => {
      button.onclick = () => scrollToTip(1);
    });
    tipScroller.querySelectorAll('[data-tip-action]').forEach((button) => {
      button.onclick = () => switchTab(button.dataset.tipTab || 'inicio');
    });
    requestAnimationFrame(() => {
      tipScroller.scrollLeft = tipIndex * tipScroller.clientWidth;
    });
  }
  document.getElementById('btn-toggle-hide-balance')?.addEventListener('click', () => { state.hideBalance = !state.hideBalance; renderDashboard(); });
  document.getElementById('dash-pill-ingresos')?.addEventListener('click', () => switchTab('gastos'));
  document.getElementById('dash-pill-gastado')?.addEventListener('click', () => switchTab('gastos'));
  document.getElementById('dash-pill-fijos')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('btn-quick-gasto')?.addEventListener('click', () => openQuickAddModal('gasto'));
  document.getElementById('btn-quick-ingreso')?.addEventListener('click', () => openQuickAddModal('ingreso'));
  document.getElementById('btn-quick-obligaciones')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('btn-quick-metas')?.addEventListener('click', () => openAddOrEditGoalModal(null));
  document.getElementById('dash-ver-fijos-btn')?.addEventListener('click', () => switchTab('obligaciones'));
  document.getElementById('dash-ver-metas-btn')?.addEventListener('click', () => switchTab('metas'));
  document.getElementById('dash-ver-historial-btn')?.addEventListener('click', () => switchTab('gastos'));
  document.querySelectorAll('.insight-alert-action').forEach((button) => {
    button.onclick = () => handleInsightAlertAction(button);
  });
  DOM.tabInicio.querySelectorAll('.dash-goal-card').forEach((card) => { card.onclick = () => switchTab('metas'); });
  DOM.tabInicio.querySelectorAll('.dash-tx-row').forEach((row) => { row.onclick = () => { if (row.dataset.goalContribution === 'true') return; const tx = state.transactions.find((item) => item.id === row.dataset.txId); if (tx) openEditTransactionModal(tx); }; });
}

// -------------------------------------------------------------
// PAST MONTH SUMMARY VIEW (Mes Cerrado / Histórico Consolidado)
// -------------------------------------------------------------
function escapeReportHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatReportDate(value) {
  const raw = String(value ?? '').trim();
  const datePart = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return raw || 'Sin fecha';

  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function renderPastMonthSummaryView(monthKey) {
  if (!state.monthlyReports[monthKey]) {
    DOM.tabInicio.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
        <div class="w-10 h-10 rounded-full border-4 border-blue-100 border-t-[#0058bc] animate-spin"></div>
        <p class="text-sm font-semibold text-slate-600">Cargando reporte de ${formatMonthKeyToLabel(monthKey)}…</p>
      </div>
    `;
    api.getMonthlyReport(monthKey)
      .then((report) => {
        state.monthlyReports[monthKey] = report;
        if (state.selectedMonth === monthKey) renderPastMonthSummaryView(monthKey);
      })
      .catch((error) => {
        console.error('Error loading monthly report', error);
        DOM.tabInicio.innerHTML = `
          <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
            <p class="text-sm font-semibold text-rose-600">No se pudo cargar este reporte.</p>
            <button id="retry-month-report" type="button" class="px-4 py-2 rounded-full bg-[#0058bc] text-white text-xs font-semibold cursor-pointer">Reintentar</button>
          </div>
        `;
        document.getElementById('retry-month-report')?.addEventListener('click', () => renderPastMonthSummaryView(monthKey));
      });
    return;
  }
  const monthLabel = formatMonthKeyToLabel(monthKey);
  const currentMonthLabel = formatMonthKeyToLabel(getCurrentMonthKey());

  const monthTransactions = getMonthlyRecords(monthKey);

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const budgetAdjustment = getBudgetAdjustment(monthKey);
  const monthlyBudgetLimit = budgetAdjustment.monthlyBudgetLimit || totalIncome || 0;
  const budgetConsumedPercent = monthlyBudgetLimit > 0
    ? Math.min(100, Math.round((totalExpenses / monthlyBudgetLimit) * 100))
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
    const description = String(tx.description || '');
    const category = String(tx.category || '');
    const matchesSearch =
      !state.pastMonthSearchQuery.trim() ||
      description.toLowerCase().includes(state.pastMonthSearchQuery.toLowerCase()) ||
      category.toLowerCase().includes(state.pastMonthSearchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  DOM.tabInicio.innerHTML = `
    <div id="past-month-report" class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
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
          class="no-print flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100/50 text-[#0058bc] text-xs font-semibold border border-blue-200 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
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
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
                <span class="text-[11px] font-medium">Egresos Totales</span>
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
                <span class="text-emerald-400">${getIconSvg('banknote', 'w-3.5 h-3.5')}</span>
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
        <div class="mt-3">
          <button id="btn-past-print-pdf" type="button" aria-label="Descargar reporte mensual en PDF" class="no-print w-full h-10 rounded-2xl bg-[#eef3ff] text-[#0058bc] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#dce8ff] transition-colors">
            ${getIconSvg('printer', 'w-3.5 h-3.5')}
            <span>Descargar PDF</span>
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
                    <span class="font-semibold text-slate-800">${escapeReportHtml(item.category)}</span>
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
                    <span class="font-semibold text-slate-800">${escapeReportHtml(item.category)}</span>
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
      <div class="past-month-report__transactions-card bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-[#0b1c30]">Movimientos Registrados</h3>
          <span class="text-xs text-slate-400">${displayedTransactions.length} de ${monthTransactions.length}</span>
        </div>

        <!-- Filter Segmented Control & Search -->
        <div class="past-month-report__filters flex flex-col sm:flex-row gap-2 no-print">
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
        <div class="past-month-report__transaction-list divide-y divide-slate-100 max-h-80 overflow-y-auto no-scrollbar">
          ${
            displayedTransactions.length === 0
              ? '<p class="text-xs text-slate-400 py-4 text-center">No hay movimientos que coincidan con la búsqueda.</p>'
              : displayedTransactions
                  .map(
                    (tx) => `
                <div data-tx-id="${escapeReportHtml(tx.id)}" class="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      ${getRecordIcon(tx, 'w-4 h-4')}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-slate-800 truncate">${escapeReportHtml(tx.description || 'Sin descripción')}</span>
                      <span class="text-[10px] text-slate-400">${formatReportDate(tx.date)} • ${escapeReportHtml(tx.category || 'Sin categoría')}</span>
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

  document.getElementById('btn-past-print-pdf').onclick = () => {
    const previousTitle = document.title;
    let restored = false;
    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
    };

    document.title = `MiPlata - Reporte ${monthLabel}`;
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 15000);
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
  const allIncomes = state.transactions
    .filter((t) => t.type === 'ingreso')
    .sort(compareRecordsByRecency);
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
                    <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category}</p>
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
// VIEW 3: REGISTROS
// -------------------------------------------------------------
function renderExpenses() {
  // Expenses and incomes share one monthly history. Fixed recurring expenses
  // remain isolated in the Fijos module.
  const monthlyTxs = getMonthlyRecords(state.selectedMonth);
  const expenseTxs = monthlyTxs.filter((t) => t.type === 'gasto');
  const incomeTxs = monthlyTxs.filter((t) => t.type === 'ingreso');
  const totalExpenses = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const metrics = computeMetrics();
  const effectiveCategoryBudgets = getEffectiveCategoryBudgets(state.selectedMonth);

  // Category budgets cover only normal expenses. Fixed payments and goal
  // contributions remain visible in the general expense total/history, but
  // they are tracked separately and cannot consume a normal category limit.
  const budgetExpenseTxs = expenseTxs.filter((transaction) => (
    !transaction.fixedObligationId
    && String(transaction.accountMethod || '').trim().toLowerCase() !== 'fijo mensual'
    && !transaction.isGoalContribution
    && CATEGORY_BUDGET_CATEGORIES.includes(transaction.category)
  ));

  // Compute category spent map from the same source used by the alert/cards.
  const categorySpentMap = {};
  budgetExpenseTxs.forEach((t) => {
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
  const budgetExpenseTotal = budgetExpenseTxs.reduce((sum, transaction) => sum + transaction.amount, 0);
  const topPercent = budgetExpenseTotal > 0 ? Math.round((topAmount / budgetExpenseTotal) * 100) : 0;

  // Categories exceeding limit
  const exceededCategories = effectiveCategoryBudgets.filter(
    (b) => b.limit > 0 && (categorySpentMap[b.category] || 0) > b.limit
  );

  // Filtered transactions
  const typeFilteredTxs =
    state.filterRecordsType === 'all'
      ? monthlyTxs
      : monthlyTxs.filter((t) => t.type === state.filterRecordsType);
  const filteredTxs =
    state.filterExpensesCategory === 'Todos'
      ? typeFilteredTxs
      : typeFilteredTxs.filter((t) => t.category === state.filterExpensesCategory);

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

  const expenseCategoriesList = ['Alimentación', 'Transporte', 'Compras', 'Servicios', 'Salud', 'Entretenimiento', 'Educación', 'Ahorro / Metas', 'Otros'];
  const incomeCategoriesList = ['Nómina', 'Honorarios', 'Negocio', 'Inversión', 'Otros'];
  const categoriesList = [
    'Todos',
    ...(state.filterRecordsType === 'gasto'
      ? expenseCategoriesList
      : state.filterRecordsType === 'ingreso'
      ? incomeCategoriesList
      : [...new Set([...expenseCategoriesList, ...incomeCategoriesList])]),
  ];

  DOM.tabGastos.innerHTML = `
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Header Metric Card -->
      <div class="flex flex-col w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 gap-3">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700">
            ${getIconSvg('calendar', 'w-3.5 h-3.5 text-[#0058bc]')}
             <span>Registros de ${formatMonthKeyToLabel(state.selectedMonth)}</span>
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
              <span>${monthlyTxs.length} registros</span>
            </div>
          `
          }
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs text-slate-500 font-medium">Resumen del mes</span>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-rose-50 px-3 py-2.5">
              <span class="block text-[11px] font-semibold text-rose-600">Egresos</span>
              <span class="block text-lg font-bold text-[#0b1c30] tabular-nums">-${formatCOP(totalExpenses, true)}</span>
            </div>
            <div class="rounded-2xl bg-emerald-50 px-3 py-2.5">
              <span class="block text-[11px] font-semibold text-[#006c49]">Ingresos</span>
              <span class="block text-lg font-bold text-[#006c49] tabular-nums">+${formatCOP(totalIncome, true)}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 mt-1 text-slate-500 text-xs">
            ${
              topName
                ? `<span>Mayor gasto: <strong class="font-semibold text-slate-800">${topName}</strong> (${formatCOP(topAmount, true)} • ${topPercent}%)</span>`
                : '<span>Aún no hay gastos registrados</span>'
            }
          </div>
        </div>

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
             <p class="text-[11px] text-slate-500">${metrics.budgetAdjustment.isAdjusted ? 'Límites ajustados al ingreso del mes' : 'Límites activos en seguimiento'}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          ${effectiveCategoryBudgets
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

                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isExceeded ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-[#006c49]'
                    }">
                      ${percent}%
                    </span>
                    <button
                      type="button"
                      data-edit-category-budget="${catBudget.category}"
                      class="category-budget-edit-btn w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-[#dce8ff] hover:text-[#0058bc] flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Modificar límite de ${catBudget.category}"
                      title="Modificar límite"
                    >
                      ${getIconSvg('sliders', 'w-3.5 h-3.5')}
                    </button>
                  </div>
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

      <!-- Record filters -->
      <div class="flex flex-col w-full gap-2 pt-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
          Filtrar registros
        </span>
        <div class="flex overflow-x-auto no-scrollbar gap-1.5 py-1">
          ${[
            { key: 'all', label: 'Todos', count: monthlyTxs.length },
            { key: 'gasto', label: 'Gastos', count: expenseTxs.length },
            { key: 'ingreso', label: 'Ingresos', count: incomeTxs.length },
          ]
            .map(
              (item) => `
              <button
                data-type="${item.key}"
                class="record-type-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  state.filterRecordsType === item.key
                    ? 'bg-[#0058bc] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }"
              >
                ${item.label} (${item.count})
              </button>
            `
            )
            .join('')}
        </div>
        <span class="text-[11px] text-slate-500 px-1">Por categoría</span>
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

      <!-- Records Grouped List -->
      <div class="space-y-4">
        ${
          filteredTxs.length === 0
            ? `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
              ${getIconSvg('receiptText', 'w-6 h-6')}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Sin registros encontrados</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">No hay movimientos para los filtros seleccionados.</p>
            </div>
          </div>
        `
            : Object.entries(groupedTxs)
                .map(([dateLabel, items]) => {
                  const dayExpenses = items.filter((item) => item.type === 'gasto').reduce((sum, item) => sum + item.amount, 0);
                  const dayIncome = items.filter((item) => item.type === 'ingreso').reduce((sum, item) => sum + item.amount, 0);
                  const daySummary = [
                    dayExpenses > 0 ? `-${formatCOP(dayExpenses, true)}` : '',
                    dayIncome > 0 ? `+${formatCOP(dayIncome, true)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' • ');
                  return `
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
                    <span>${dateLabel}</span>
                    <span class="tabular-nums font-bold text-slate-700">${daySummary}</span>
                  </div>

                  <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
                    ${items
                      .map(
                        (tx) => `
                          <div data-tx-id="${tx.isGoalContribution ? '' : tx.id}" data-goal-contribution="${tx.isGoalContribution ? 'true' : 'false'}" class="record-row-item flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors ${tx.isGoalContribution ? 'cursor-default' : 'cursor-pointer'}">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-2xl ${tx.type === 'ingreso' ? 'bg-emerald-50 text-[#006c49]' : 'bg-slate-100 text-slate-600'} flex items-center justify-center shrink-0">
                            ${getRecordIcon(tx, 'w-5 h-5')}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <p class="text-xs font-semibold text-[#0b1c30] truncate">${tx.description}</p>
                            <p class="text-[11px] text-slate-500 truncate">${tx.date} • ${tx.category}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-xs sm:text-sm font-bold ${tx.type === 'ingreso' ? 'text-[#006c49]' : 'text-[#0b1c30]'} tabular-nums">
                            ${tx.type === 'ingreso' ? '+' : '-'}${formatCOP(tx.amount)}
                          </span>
                          ${tx.isGoalContribution ? '' : getIconSvg('chevronRight', 'w-4 h-4 text-slate-300')}
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

  DOM.tabGastos.querySelectorAll('.record-type-chip').forEach((btn) => {
    btn.onclick = () => {
      state.filterRecordsType = btn.dataset.type;
      state.filterExpensesCategory = 'Todos';
      renderExpenses();
    };
  });

  DOM.tabGastos.querySelectorAll('.expense-cat-chip').forEach((btn) => {
    btn.onclick = () => {
      state.filterExpensesCategory = btn.dataset.cat;
      renderExpenses();
    };
  });

  DOM.tabGastos.querySelectorAll('.category-budget-edit-btn').forEach((btn) => {
    btn.onclick = () => {
      const category = btn.dataset.editCategoryBudget;
      const budget = state.categoryBudgets.find((item) => item.category === category);
      if (budget) openCategoryBudgetModal(budget);
    };
  });

  DOM.tabGastos.querySelectorAll('.record-row-item').forEach((row) => {
    row.onclick = () => {
      if (row.dataset.goalContribution === 'true') return;
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
  const baseIncome = metrics.effectiveMonthlyIncome || metrics.monthlyBudgetLimit || metrics.totalIncome;
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
                        ${getObligationContextIcon(item.name, item.category)}
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
  const btnBottomAdd = document.getElementById('btn-add-obligation-bottom');
  if (btnAdd) btnAdd.onclick = () => openAddOrEditObligationModal(null);
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
        const obligation = state.fixedObligations.find((item) => item.id === btn.dataset.payId);
        const isPaying = obligation?.status !== 'paid';
        const availableCash = computeMetrics().availableCash;
        if (isPaying && Number(obligation?.amount) > availableCash) {
          showToast(`No tienes suficiente dinero disponible para pagar este gasto fijo. Te quedan ${formatCOP(availableCash, true)} COP`, 'error');
          return;
        }
      try {
        const res = await api.togglePayFixedObligation(btn.dataset.payId);
        applyLocalFixedToggle(btn.dataset.payId, res.result);
        renderObligations();
        showToast(res.message);
      } catch (error) {
        showToast(error.message || 'No se pudo actualizar el gasto fijo', 'error');
      }
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
    const salary = metrics.effectiveMonthlyIncome || state.currentUser?.monthlySalary || state.currentUser?.monthlyBudgetLimit || metrics.totalIncome || 0;
    const savingsRulePercent = (state.currentUser?.budgetRule?.savings || 20) / 100;
    const availableForGoals = Math.max(0, metrics.availableCash);
    const realisticMonthlySavings = salary > 0
      ? Math.min(Math.round(salary * savingsRulePercent), availableForGoals)
      : Math.round(availableForGoals * 0.2);
    const realisticQuincenalCap = Math.min(
      availableForGoals,
      Math.max(1000, Math.round(realisticMonthlySavings / 2 / 10000) * 10000),
    );
    const suggestedQuincenal = Math.min(remaining, realisticQuincenalCap);
    const quincenasNeeded = suggestedQuincenal > 0 ? Math.max(1, Math.ceil(remaining / suggestedQuincenal)) : 0;
    const mesesNeeded = quincenasNeeded > 0 ? Math.ceil(quincenasNeeded / 2) : 0;
    const tiempoTexto =
      quincenasNeeded === 0
        ? 'cuando tengas dinero disponible'
        : quincenasNeeded === 1
        ? 'en tu próxima quincena'
        : mesesNeeded === 1
        ? 'en aproximadamente 1 mes (2 quincenas)'
        : `en aproximadamente ${mesesNeeded} meses (${quincenasNeeded} quincenas)`;

    if (availableForGoals > 0) {
      const suggested = Math.min(
        remaining,
        availableForGoals,
        Math.max(1000, Math.round((availableForGoals * 0.15) / 10000) * 10000),
        realisticQuincenalCap || availableForGoals,
      );
      return {
        tag: 'Consejo Inteligente',
        title: `Impulso para "${activeIncompleteGoal.name}"`,
        message: `Tienes ${formatCOP(availableForGoals)} disponibles. Puedes aportar ${formatCOP(suggested, true)} sin superar tu saldo disponible.`,
      };
    }
    if (availableForGoals === 0) {
      return {
        tag: 'Consejo Inteligente',
        title: `Plan para "${activeIncompleteGoal.name}"`,
        message: 'No tienes dinero disponible para aportar a una meta en este momento.',
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
                      ? `<div class="h-24 -mx-4 -mt-4 mb-1 overflow-hidden relative"><img src="${goal.imageUrl}" alt="${goal.name}" loading="lazy" decoding="async" class="w-full h-full object-cover" /></div>`
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
                    ${goal.deadline ? `<p class="text-[11px] text-slate-400 mt-0.5">Fecha: ${formatGoalDeadline(goal.deadline)}</p>` : ''}
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
  return `<img src="${safeUrl}" alt="${String(goal?.name || 'Imagen de meta').replace(/"/g, '&quot;')}" loading="lazy" decoding="async" class="${imageClass}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');" /><span class="hidden w-full h-full items-center justify-center">${fallbackIcon}</span>`;
}

function renderGoals() {
  const metrics = computeMetrics();
  const totalPercent = metrics.totalSavingsTarget > 0 ? Math.min(100, Math.round((metrics.totalSavings / metrics.totalSavingsTarget) * 100)) : 0;
  const activeGoals = state.savingsGoals.filter((goal) => goal.currentAmount < goal.targetAmount);
  const activeGoal = activeGoals[0] || state.savingsGoals[0];
  const remaining = activeGoal ? Math.max(0, activeGoal.targetAmount - activeGoal.currentAmount) : 0;
  const availableForGoals = Math.max(0, metrics.availableCash);
  const suggestedContribution = activeGoal
    ? Math.min(
        remaining,
        availableForGoals,
        availableForGoals > 0 ? Math.max(1000, Math.round((availableForGoals * 0.15) / 10000) * 10000) : 0,
      )
    : 0;
  const tipTitle = activeGoal ? `Impulso para "${activeGoal.name}"` : 'Crea tu primera meta';
  const tip = activeGoal
    ? suggestedContribution > 0
      ? `Tienes ${formatCOP(availableForGoals)} disponibles. Puedes aportar ${formatCOP(suggestedContribution, true)} sin superar tu saldo disponible.`
      : 'No tienes dinero disponible para aportar a una meta en este momento.'
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
                  <div class="min-w-0"><h3 class="font-semibold text-base truncate">${goal.name}</h3><p class="text-xs text-slate-500 mt-0.5">${goal.deadline ? `Límite: ${formatGoalDeadline(goal.deadline)}` : 'Sin fecha límite'}</p></div>
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

  const budgetAdjustment = getBudgetAdjustment(getCurrentMonthKey(), user);
  const salary = budgetAdjustment.monthlyBudgetLimit || user.monthlyBudgetLimit || user.monthlySalary || 5800000;
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
               ${budgetAdjustment.isAdjusted ? `Ajustado al ingreso registrado de ${formatCOP(budgetAdjustment.effectiveIncome)} bajo la regla 50/30/20:` : 'Distribuido bajo la regla inteligente MiPlata 50/30/20:'}
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
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[#0058bc]">
              ${getIconSvg('sliders', 'w-4 h-4')}
            </div>
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Preferencias del Sistema</span>
          </div>
        </div>

        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${getIconSvg('coins', 'w-4 h-4')}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800">Moneda Principal</p>
                <p class="text-[11px] text-slate-500">Formato estándar de visualización</p>
              </div>
            </div>
            <span class="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-full shrink-0">COP ($)</span>
          </div>

          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0058bc] shrink-0">${getIconSvg('calendar', 'w-4 h-4')}</div>
              <div class="min-w-0"><p class="text-xs font-semibold text-slate-800">Reinicio mensual</p><p class="text-[11px] text-slate-500">Corte y balance periódico</p></div>
            </div>
            <span class="text-xs font-semibold text-slate-700 text-right shrink-0">Día ${user.resetDay || 1} de cada mes</span>
          </div>

          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${getIconSvg('sparkles', 'w-4 h-4')}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800">Categorización inteligente</p>
                <p class="text-[11px] text-slate-500">Sugerir según conceptos habituales</p>
              </div>
            </div>
            <button
              id="toggle-smart-cat"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer shrink-0 ${
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

        ${isDemoUser(user)
          ? `
        <div class="w-full rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex items-center gap-2.5 text-slate-500" aria-label="Cuenta demo protegida">
          <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
            ${getIconSvg('lock', 'w-3.5 h-3.5')}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700">Cuenta demo protegida</p>
            <p class="text-[11px] text-slate-500">No se puede eliminar ni borrar sus datos compartidos</p>
          </div>
        </div>
        `
          : `
        <button id="btn-delete-account" class="w-full h-11 rounded-full text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 text-xs font-medium active:scale-95 transition-all cursor-pointer">
          ${getIconSvg('trash2', 'w-3.5 h-3.5')}
          <span>Eliminar cuenta y datos locales</span>
        </button>
        `}

      </div>

      <!-- App Branding Footer -->
      <div class="flex flex-col items-center justify-center gap-1.5 py-4 text-center select-none">
        <p class="text-[11px] text-slate-400 font-medium">Control de finanzas personales 100% privado y local</p>
        <div class="flex items-center justify-center gap-1.5 pt-1.5 text-[11px] text-slate-400 font-medium">
          <span>By</span>
          ${getFixelarImagotipo('h-5 w-auto opacity-80')}
        </div>
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

  document.getElementById('toggle-smart-cat').onclick = async () => {
    const res = await api.updateProfile({ smartCategorization: !user.smartCategorization });
    state.currentUser = res.user;
    renderProfile();
    showToast('Preferencia actualizada');
  };

  document.getElementById('btn-logout').onclick = async () => {
    await api.logout();
    state.currentUser = null;
    renderApp();
    showToast('Sesión cerrada');
  };

  const deleteAccountButton = document.getElementById('btn-delete-account');
  if (deleteAccountButton) deleteAccountButton.onclick = () => {
    openDeleteConfirmationModal({
      title: '¿Eliminar cuenta y datos?',
      message: 'Esta acción borrará todas tus transacciones, metas y gastos fijos de forma irreversible.',
      successMessage: 'Cuenta eliminada',
      errorMessage: 'No se pudo eliminar la cuenta',
      onConfirm: async () => {
        await api.deleteAccount();
        state.currentUser = null;
        renderApp();
      },
    });
  };
}

// -------------------------------------------------------------
// VIEW 7: AUTH (LOGIN & REGISTER)
// -------------------------------------------------------------
let isRegisterMode = true;
let registerAvatarUrl = '';
let authRecoveryMode = null;
let recoveryAccessToken = '';
let recoveryNotice = '';
let recoveryError = '';

function recoveryRedirectUrl() {
  const url = new URL(window.location.origin);
  url.searchParams.set('password_reset', '1');
  return url.toString();
}

function readRecoveryAccessToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  const type = params.get('type');
  return type === 'recovery' ? params.get('access_token') || '' : '';
}

function readRecoveryError() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  const errorCode = params.get('error_code') || '';
  const description = (params.get('error_description') || '').toLowerCase();
  if (!params.get('error') && !errorCode) return '';
  if (errorCode === 'otp_expired' || description.includes('expired')) {
    return 'El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo.';
  }
  return 'No se pudo validar el enlace de recuperación. Solicita uno nuevo.';
}

function prepareRecoveryFromUrl() {
  const accessToken = readRecoveryAccessToken();
  if (accessToken) {
    recoveryAccessToken = accessToken;
    authRecoveryMode = 'update';
    return true;
  }
  const urlError = readRecoveryError();
  if (urlError) {
    recoveryError = urlError;
    authRecoveryMode = 'request';
    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = '';
    window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}`);
    return true;
  }
  if (new URLSearchParams(window.location.search).get('password_reset') === '1') {
    authRecoveryMode = 'request';
    return true;
  }
  return false;
}

function renderPasswordRecovery() {
  const isUpdate = authRecoveryMode === 'update';
  const isRequest = authRecoveryMode === 'request';
  const title = isUpdate ? 'Crear nueva contraseña' : 'Recuperar contraseña';
  const description = isUpdate
    ? 'Escribe una nueva contraseña para volver a entrar a tu cuenta.'
    : 'Te enviaremos un enlace seguro al correo asociado a tu cuenta.';

  DOM.viewAuth.innerHTML = `
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${getImagotipoHorizontal('h-11 sm:h-12 w-auto object-contain drop-shadow-sm')}
        </div>
        <p class="text-sm font-semibold text-[#0058bc] tracking-wide mt-1">Tu dinero claro, tus metas cerca.</p>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-extrabold text-[#0b1c30]">${title}</h2>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">${description}</p>
        </div>

        ${isRequest ? `
          <form id="form-password-reset-request" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electrónico</label>
              <input id="reset-email" type="email" autocomplete="email" required placeholder="camila.restrepo@email.com" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>
            <button id="reset-request-submit" type="submit" class="w-full py-3 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Enviar enlace de recuperación</button>
          </form>
          ${recoveryError ? `<div class="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700">${recoveryError}</div>` : ''}
          ${recoveryNotice ? `<div class="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-[#006c49]">${recoveryNotice}</div>` : ''}
        ` : `
          <form id="form-password-reset-update" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Nueva contraseña</label>
              <div class="relative mt-1">
                <input id="reset-new-password" type="password" autocomplete="new-password" minlength="6" required placeholder="Mínimo 6 caracteres" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-password" type="button" aria-label="Mostrar contraseña" title="Mostrar contraseña" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${getIconSvg('eye', 'w-4 h-4')}</button>
              </div>
            </div>
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Confirmar contraseña</label>
              <div class="relative mt-1">
                <input id="reset-confirm-password" type="password" autocomplete="new-password" minlength="6" required placeholder="Repite la contraseña" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-confirm-password" type="button" aria-label="Mostrar confirmación de contraseña" title="Mostrar confirmación de contraseña" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${getIconSvg('eye', 'w-4 h-4')}</button>
              </div>
            </div>
            <button id="reset-update-submit" type="submit" class="w-full py-3 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Guardar nueva contraseña</button>
          </form>
        `}

        <button id="back-to-login" type="button" class="text-xs font-semibold text-[#0058bc] hover:underline cursor-pointer">Volver a iniciar sesión</button>
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium"><span>By</span>${getFixelarImagotipo('h-5 w-auto opacity-80')}</div>
    </div>
  `;

  document.getElementById('back-to-login').onclick = () => {
    authRecoveryMode = null;
    recoveryAccessToken = '';
    recoveryNotice = '';
    recoveryError = '';
    isRegisterMode = false;
    renderAuth();
  };

  if (isRequest) {
    const form = document.getElementById('form-password-reset-request');
    form.onsubmit = async (event) => {
      event.preventDefault();
      const emailInput = document.getElementById('reset-email');
      const email = emailInput.value.trim().toLowerCase();
      if (!emailInput.checkValidity()) {
        showToast('Ingresa un correo electrónico válido', 'error');
        emailInput.focus();
        return;
      }
      try {
        recoveryError = '';
        const result = await api.requestPasswordReset(email, recoveryRedirectUrl());
        recoveryNotice = result.message;
        renderPasswordRecovery();
      } catch (error) {
        showToast(error.message, 'error');
      }
    };
    return;
  }

  const newPassword = document.getElementById('reset-new-password');
  const confirmPassword = document.getElementById('reset-confirm-password');
  const togglePassword = document.getElementById('toggle-reset-password');
  const toggleConfirmPassword = document.getElementById('toggle-reset-confirm-password');
  const bindPasswordToggle = (input, button, label) => {
    button.onclick = () => {
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      const action = showing ? 'Ocultar' : 'Mostrar';
      button.innerHTML = getIconSvg(showing ? 'eyeOff' : 'eye', 'w-4 h-4');
      button.setAttribute('aria-label', `${action} ${label}`);
      button.setAttribute('title', `${action} ${label}`);
    };
  };
  bindPasswordToggle(newPassword, togglePassword, 'contraseña');
  bindPasswordToggle(confirmPassword, toggleConfirmPassword, 'confirmación de contraseña');
  document.getElementById('form-password-reset-update').onsubmit = async (event) => {
    event.preventDefault();
    const password = newPassword.value;
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      newPassword.focus();
      return;
    }
    if (password !== confirmPassword.value) {
      showToast('Las contraseñas no coinciden', 'error');
      confirmPassword.focus();
      return;
    }
    try {
      await api.confirmPasswordReset(recoveryAccessToken, password);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('password_reset');
      cleanUrl.hash = '';
      window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}`);
      authRecoveryMode = null;
      recoveryAccessToken = '';
      recoveryNotice = '';
      recoveryError = '';
      isRegisterMode = false;
      renderAuth();
      showToast('Contraseña actualizada. Ya puedes iniciar sesión');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };
}

function renderAuth() {
  if (authRecoveryMode) {
    renderPasswordRecovery();
    return;
  }
  DOM.viewAuth.innerHTML = `
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <!-- Brand Header with Official Logo & Imagotipo -->
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${getImagotipoHorizontal('h-11 sm:h-12 w-auto object-contain drop-shadow-sm')}
        </div>
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

        ${isRegisterMode
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
              <input id="reg-email" type="email" autocomplete="email" required placeholder="ej. camila@email.com" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Contraseña</label>
              <div class="relative mt-1">
                <input id="reg-pass" type="password" autocomplete="new-password" required minlength="6" placeholder="Mínimo 6 caracteres" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reg-pass" type="button" aria-label="Mostrar contraseña" title="Mostrar contraseña" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">
                  ${getIconSvg('eye', 'w-4 h-4')}
                </button>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-[#0b1c30]">Salario o ingreso mensual estimado (COP)</label>
                <span class="text-[10px] font-semibold text-slate-400">Opcional</span>
              </div>
              <input id="reg-salary" type="text" inputmode="decimal" autocomplete="off" placeholder="ej. 5.800.000" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc] tabular-nums" />
              <div class="mt-2">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Valores frecuentes</p>
                <div class="flex flex-wrap gap-2 mt-2" role="group" aria-label="Valores de ingreso frecuentes">
                  <button type="button" data-salary-value="1300000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$1.300.000</button>
                  <button type="button" data-salary-value="2000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$2.000.000</button>
                  <button type="button" data-salary-value="3000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$3.000.000</button>
                  <button type="button" data-salary-value="5000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$5.000.000</button>
                  <button type="button" data-salary-value="8000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$8.000.000</button>
                  <button type="button" data-salary-value="10000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$10.000.000</button>
                </div>
              </div>
              <p class="mt-1 text-[10px] text-slate-400">También puedes escribir un valor diferente.</p>
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
              <div class="relative mt-1">
                <input id="login-pass" type="password" autocomplete="current-password" placeholder="demo" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-login-pass" type="button" aria-label="Mostrar contraseña" title="Mostrar contraseña" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">
                  ${getIconSvg('eye', 'w-4 h-4')}
                </button>
              </div>
            </div>

            <button type="submit" class="w-full py-3 mt-2 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Iniciar Sesión
            </button>
            <button id="auth-forgot-password" type="button" class="text-xs font-semibold text-[#0058bc] hover:underline cursor-pointer">¿Olvidaste tu contraseña?</button>
          </form>
        `
        }

        ${`
        <!-- Demo Account Instant Shortcut -->
        <div class="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
          <span class="text-[11px] text-slate-400 font-medium">¿Quieres probar la app de inmediato?</span>
          <button
            id="btn-login-demo"
            type="button"
            class="w-full py-2.5 px-4 rounded-2xl bg-[#eff4ff] hover:bg-blue-100 text-[#0058bc] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            ${getIconSvg('sparkles', 'w-4 h-4 text-[#0058bc]')}
            <span>Entrar con cuenta de demostración</span>
          </button>
        </div>
        `}
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium">
        <span>By</span>
        ${getFixelarImagotipo('h-5 w-auto opacity-80')}
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
        const hasBootstrap = applyBootstrapData(res.bootstrap);
        if (hasBootstrap) {
          try {
            localStorage.setItem('miplata_bootstrap_cache', JSON.stringify(res.bootstrap));
          } catch (_error) {
            // Keep the authenticated session working when browser storage is full.
          }
        } else {
          state.currentUser = res.user;
          await refreshAllData();
        }
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
    const regEmail = document.getElementById('reg-email');
    const regPass = document.getElementById('reg-pass');
    const toggleRegPass = document.getElementById('toggle-reg-pass');
    const regSalary = document.getElementById('reg-salary');
    const regSalaryOptions = Array.from(formReg.querySelectorAll('[data-salary-value]'));
    const avatarInput = document.getElementById('input-avatar-file');
    const previewName = document.getElementById('auth-preview-name');
    const avatarPreview = document.getElementById('auth-avatar-preview');

    // Use the app's Spanish feedback instead of inconsistent browser-native
    // validation messages on different phones and browsers.
    formReg.noValidate = true;

    toggleRegPass.onclick = () => {
      const showing = regPass.type === 'password';
      regPass.type = showing ? 'text' : 'password';
      toggleRegPass.innerHTML = getIconSvg(showing ? 'eyeOff' : 'eye', 'w-4 h-4');
      toggleRegPass.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggleRegPass.setAttribute('title', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
    };

    regName.oninput = () => {
      previewName.textContent = regName.value.trim() || 'Tu perfil';
      avatarPreview.innerHTML = renderAvatarHtml(regName.value || 'Tu', registerAvatarUrl, 'lg');
    };

    const syncSalaryOptionState = () => {
      const currentValue = parseInt(regSalary.value.replace(/\D/g, ''), 10) || 0;
      regSalaryOptions.forEach((option) => {
        const selected = Number(option.dataset.salaryValue) === currentValue;
        option.setAttribute('aria-pressed', String(selected));
        option.classList.toggle('bg-[#0058bc]', selected);
        option.classList.toggle('border-[#0058bc]', selected);
        option.classList.toggle('text-white', selected);
        option.classList.toggle('shadow-sm', selected);
        option.classList.toggle('bg-white', !selected);
        option.classList.toggle('border-slate-200', !selected);
        option.classList.toggle('text-slate-600', !selected);
      });
    };

    regSalaryOptions.forEach((option) => {
      option.onclick = () => {
        const selectedSalary = Number(option.dataset.salaryValue);
        regSalary.value = selectedSalary.toLocaleString('es-CO');
        syncSalaryOptionState();
      };
    });

    regSalary.oninput = () => {
      const num = parseInt(regSalary.value.replace(/\D/g, ''), 10);
      regSalary.value = isNaN(num) ? '' : num.toLocaleString('es-CO');
      syncSalaryOptionState();
    };

    avatarInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        registerAvatarUrl = await compressImageForUpload(file);
        avatarPreview.innerHTML = renderAvatarHtml(regName.value || 'Tu', registerAvatarUrl, 'lg');
      } catch (error) {
        registerAvatarUrl = '';
        avatarInput.value = '';
        showToast(error.message || 'No se pudo cargar la imagen', 'error');
      }
    };

    formReg.onsubmit = async (e) => {
      e.preventDefault();
      const name = regName.value.trim();
      const email = regEmail.value.trim().toLowerCase();
      const password = regPass.value;
      const salary = parseInt(regSalary.value.replace(/\D/g, ''), 10) || 0;

      if (!name) {
        showToast('Escribe tu nombre completo para continuar', 'error');
        regName.focus();
        return;
      }
      if (!email) {
        showToast('Escribe un correo electrónico para crear la cuenta', 'error');
        regEmail.focus();
        return;
      }
      if (!regEmail.checkValidity()) {
        showToast('Ingresa un correo electrónico válido', 'error');
        regEmail.focus();
        return;
      }
      if (!password) {
        showToast('Escribe una contraseña para crear la cuenta', 'error');
        regPass.focus();
        return;
      }
      if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        regPass.focus();
        return;
      }

      try {
        const res = await api.register(name, email, password, salary, registerAvatarUrl);
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
    const loginPass = document.getElementById('login-pass');
    const toggleLoginPass = document.getElementById('toggle-login-pass');
    const forgotPassword = document.getElementById('auth-forgot-password');

    if (forgotPassword) {
      forgotPassword.onclick = () => {
        authRecoveryMode = 'request';
        recoveryNotice = '';
        renderAuth();
      };
    }

    toggleLoginPass.onclick = () => {
      const showing = loginPass.type === 'password';
      loginPass.type = showing ? 'text' : 'password';
      toggleLoginPass.innerHTML = getIconSvg(showing ? 'eyeOff' : 'eye', 'w-4 h-4');
      toggleLoginPass.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggleLoginPass.setAttribute('title', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
    };

    formLog.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = loginPass.value;

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
const SMART_CATEGORY_RULES = {
  gasto: [
    { category: 'Alimentación', keywords: ['almuerzo', 'desayuno', 'cena', 'comida', 'restaurante', 'supermercado', 'mercado', 'carulla', 'exito', 'd1', 'fruta', 'pan', 'cafe', 'empanada', 'domicilio', 'rappi', 'comida rapida'] },
    { category: 'Transporte', keywords: ['uber', 'taxi', 'bus', 'transmilenio', 'metro', 'gasolina', 'combustible', 'parqueadero', 'peaje', 'soat', 'pasaje', 'moto', 'bicicleta'] },
    { category: 'Compras', keywords: ['compra', 'ropa', 'zapatos', 'electronica', 'amazon', 'mercado libre', 'falabella', 'regalo', 'hogar'] },
    { category: 'Servicios', keywords: ['arriendo', 'alquiler', 'luz', 'agua', 'energia', 'gas', 'internet', 'telefono', 'celular', 'factura', 'servicio'] },
    { category: 'Salud', keywords: ['salud', 'medico', 'medicina', 'medicamento', 'medicamentos', 'farmacia', 'drogueria', 'consulta', 'hospital', 'laboratorio', 'examen', 'urgencias', 'odontologo', 'dentista', 'terapia', 'psicologo', 'vitamina', 'vitaminas', 'eps', 'seguro'] },
    { category: 'Entretenimiento', keywords: ['cine', 'concierto', 'netflix', 'spotify', 'juego', 'videojuego', 'gimnasio', 'bar', 'fiesta', 'ocio'] },
    { category: 'Educación', keywords: ['colegio', 'universidad', 'curso', 'clase', 'libro', 'matricula', 'educacion', 'papeleria'] },
  ],
  ingreso: [
    { category: 'Nómina', keywords: ['salario', 'sueldo', 'nomina', 'nomina', 'quincena', 'pago laboral', 'empresa'] },
    { category: 'Honorarios', keywords: ['honorario', 'freelance', 'consultoria', 'asesoria', 'servicio profesional', 'cliente'] },
    { category: 'Negocio', keywords: ['venta', 'negocio', 'cliente', 'pedido', 'emprendimiento', 'producto'] },
    { category: 'Inversión', keywords: ['inversion', 'dividendos', 'intereses', 'rendimiento', 'interes', 'fondo'] },
  ],
};

function normalizeSmartCategoryText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function suggestCategoryFromDescription(type, description) {
  if (!state.currentUser?.smartCategorization) return '';
  const text = normalizeSmartCategoryText(description);
  if (text.length < 3) return '';

  const rules = SMART_CATEGORY_RULES[type] || [];
  let bestMatch = { category: '', score: 0 };
  rules.forEach((rule) => {
    const score = rule.keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeSmartCategoryText(keyword);
      return total + (text.includes(normalizedKeyword) ? normalizedKeyword.length : 0);
    }, 0);
    if (score > bestMatch.score) bestMatch = { category: rule.category, score };
  });

  return bestMatch.category;
}

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
  document.documentElement.classList.add('quick-add-open');
  document.body.classList.add('quick-add-open');
  state.quickAdd.type = type;
  state.quickAdd.rawValue = '0';
  state.quickAdd.category = type === 'ingreso' ? 'Nómina' : 'Alimentación';
  state.quickAdd.categoryManuallySelected = false;
  state.quickAdd.smartSuggestion = '';
  state.quickAdd.description = '';
  state.quickAdd.date = getTodayISODate();

  DOM.modalQuickAdd.classList.remove('hidden');
  renderQuickAddModalContent();
}

function renderQuickAddModalContent() {
  const { type, rawValue, category, description, date, smartSuggestion } = state.quickAdd;
  const numVal = parseInt(rawValue, 10) || 0;

  const expenseCategories = [
    { name: 'Alimentación', label: 'Comida', icon: 'pizzaSlice' },
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
    <div class="quick-add-page qa-form-shell bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="qa-header flex items-center justify-between mb-4 sm:mb-5">
        <button id="qa-close-btn" aria-label="Volver" class="w-9 h-9 flex items-center justify-center text-[#0058bc] cursor-pointer">${getIconSvg('arrowLeft', 'w-7 h-7')}</button>
        <div class="flex items-center gap-2"><img src="assets/optimized/Logo.png" alt="MiPlata" width="160" height="160" decoding="async" class="w-10 h-10 rounded-xl" /><h1 class="text-xl font-semibold">Nuevo Registro</h1></div>
        ${renderAvatarHtml(state.currentUser?.name, state.currentUser?.avatarUrl, 'sm')}
      </div>
      <div class="qa-drag-handle h-1.5 w-12 rounded-full bg-[#dce8ff] mx-auto mb-3 sm:mb-4"></div>

      <div class="qa-type-switch flex items-center bg-[#dce8ff] p-1 rounded-full mb-4 sm:mb-6">
        <button id="qa-type-gasto" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${type === 'gasto' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600'}">Gasto</button>
        <button id="qa-type-ingreso" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${type === 'ingreso' ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-slate-600'}">Ingreso</button>
      </div>

      <div class="qa-amount-display text-center mb-4 sm:mb-5"><div class="flex items-baseline justify-center gap-1"><span class="qa-amount-value text-4xl sm:text-5xl font-extrabold text-[#0b1c30] tabular-nums"><span class="text-slate-300">$</span>${formatCOP(numVal).replace('$', '')}</span><span class="text-base sm:text-xl font-medium text-slate-500">COP</span></div><p class="qa-amount-status mt-2 text-xs sm:text-sm font-semibold text-[#0058bc]"><span class="inline-block w-3 h-3 rounded-full bg-[#006c49] mr-1"></span>${type === 'ingreso' ? 'Registrando ingreso inmediato' : 'Registrando egreso inmediato'}</p></div>

      <div class="qa-category-heading flex items-center justify-between mb-2.5 sm:mb-3"><h2 class="text-base sm:text-lg font-semibold uppercase tracking-wide text-slate-600">Categoría</h2><span id="qa-selected-category" class="text-base sm:text-lg font-semibold text-[#0058bc]">${category}</span></div>
      <div id="qa-categories-scroll" class="qa-category-scroller qa-categories-scroll flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1.5 sm:pb-2 mb-4 sm:mb-5" role="listbox" aria-label="Categorías de ${type === 'ingreso' ? 'ingreso' : 'gasto'}">
        ${categories.map((c) => `<button type="button" data-cat="${c.name}" role="option" aria-selected="${category === c.name}" class="qa-cat-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer"><span class="qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${category === c.name ? 'bg-[#0058bc] text-white shadow-md' : 'bg-[#dce8ff] text-slate-600'}">${getIconSvg(c.icon, 'w-6 h-6 sm:w-7 sm:h-7')}</span><span class="qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${category === c.name ? 'text-[#0058bc] font-semibold' : 'text-slate-700'}">${c.label}</span></button>`).join('')}
      </div>
      <p id="qa-smart-category-hint" aria-hidden="true" style="display: none !important;" class="qa-smart-hint qa-smart-hint-hidden text-[11px] text-[#0058bc] font-medium text-center -mt-3 mb-3 ${smartSuggestion ? '' : 'invisible'}">${smartSuggestion ? `Sugerencia automática: ${smartSuggestion}` : 'Sugerencia automática'}</p>

      <div class="qa-details-card rounded-3xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-100 mb-4 sm:mb-6">
        <div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${getIconSvg('fileText', 'w-5 h-5')}</span><input id="qa-description-input" type="text" placeholder="${type === 'ingreso' ? 'Concepto del ingreso' : 'Café y empanada Juan Valdez'}" value="${description}" class="qa-description-input flex-1 min-w-0 text-lg bg-transparent focus:outline-none focus:ring-0" /></div>
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${getIconSvg('calendar', 'w-5 h-5')}</span><div><p class="text-sm font-semibold text-slate-500">Fecha</p><p class="text-base font-semibold">${formatQuickAddDateLabel(date)}</p></div></div><div class="relative"><button id="qa-change-date-btn" type="button" class="rounded-full bg-[#dce8ff] px-3 py-2 text-sm font-semibold text-[#0058bc] cursor-pointer">Cambiar</button><input id="qa-date-input" type="date" value="${date}" aria-label="Cambiar fecha del registro" class="absolute inset-0 h-full w-full opacity-0 pointer-events-none" /></div></div>
      </div>

      <div class="qa-keypad keypad-grid gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <button data-key="1" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">1</button><button data-key="2" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">2</button><button data-key="3" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">3</button>
        <button data-key="4" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">4</button><button data-key="5" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">5</button><button data-key="6" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">6</button>
        <button data-key="7" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">7</button><button data-key="8" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">8</button><button data-key="9" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">9</button>
        <button data-key="000" class="keypad-btn bg-[#eef3ff] border-0 text-[#0058bc] h-16 sm:h-[72px] rounded-full">+000</button><button data-key="0" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">0</button><button data-key="backspace" class="keypad-btn bg-[#eef3ff] border-0 h-16 sm:h-[72px] rounded-full">${getIconSvg('deleteKey', 'w-7 h-7')}</button>
      </div>
      <button id="qa-submit-btn" class="qa-submit-button w-full h-14 sm:h-16 rounded-full ${numVal > 0 ? 'bg-[#0058bc]' : 'bg-slate-300 pointer-events-none'} text-white font-bold text-lg sm:text-xl shadow-md cursor-pointer flex items-center justify-center gap-2">${getIconSvg('checkCircle2', 'w-6 h-6 sm:w-7 sm:h-7')}<span>Guardar ${type === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></button>
    </div>
  `;

  // Attach Keypad Listeners
  document.getElementById('qa-type-gasto').onclick = () => {
    state.quickAdd.type = 'gasto';
    state.quickAdd.category = 'Alimentación';
    state.quickAdd.categoryManuallySelected = false;
    state.quickAdd.smartSuggestion = '';
    renderQuickAddModalContent();
  };
  document.getElementById('qa-type-ingreso').onclick = () => {
    state.quickAdd.type = 'ingreso';
    state.quickAdd.category = 'Nómina';
    state.quickAdd.categoryManuallySelected = false;
    state.quickAdd.smartSuggestion = '';
    renderQuickAddModalContent();
  };
  document.getElementById('qa-close-btn').onclick = () => {
    DOM.modalQuickAdd.classList.add('hidden');
    state.quickAdd.isOpen = false;
    document.documentElement.classList.remove('quick-add-open');
    document.body.classList.remove('quick-add-open');
  };

  DOM.modalQuickAdd.querySelectorAll('.qa-cat-btn').forEach((btn) => {
    btn.onclick = () => {
      state.quickAdd.category = btn.dataset.cat;
      state.quickAdd.categoryManuallySelected = true;
      state.quickAdd.smartSuggestion = '';
      renderQuickAddModalContent();
    };
  });

  const refreshCategorySelection = (selectedCategory) => {
    state.quickAdd.category = selectedCategory;
    const selectedLabel = document.getElementById('qa-selected-category');
    if (selectedLabel) selectedLabel.textContent = selectedCategory;
    DOM.modalQuickAdd.querySelectorAll('.qa-cat-btn').forEach((button) => {
      const isSelected = button.dataset.cat === selectedCategory;
      button.setAttribute('aria-selected', String(isSelected));
      const icon = button.querySelector('span:first-child');
      const label = button.querySelector('span:last-child');
      if (icon) icon.className = `qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${isSelected ? 'bg-[#0058bc] text-white shadow-md' : 'bg-[#dce8ff] text-slate-600'}`;
      if (label) label.className = `qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${isSelected ? 'text-[#0058bc] font-semibold' : 'text-slate-700'}`;
    });
  };

  const descInput = document.getElementById('qa-description-input');
  if (descInput) {
    descInput.oninput = (e) => {
      state.quickAdd.description = e.target.value;
      if (!state.quickAdd.categoryManuallySelected) {
        const suggestedCategory = suggestCategoryFromDescription(state.quickAdd.type, state.quickAdd.description);
        state.quickAdd.smartSuggestion = suggestedCategory;
        if (suggestedCategory) refreshCategorySelection(suggestedCategory);
        const suggestionHint = document.getElementById('qa-smart-category-hint');
        if (suggestionHint) {
          suggestionHint.textContent = suggestedCategory ? `Sugerencia automática: ${suggestedCategory}` : 'Sugerencia automática';
          suggestionHint.classList.toggle('invisible', !suggestedCategory);
        }
      }
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
        isRecurring: false,
      };

      try {
        const result = await api.addTransaction(tx);
        applyLocalTransaction(tx, result);
      } catch (error) {
        showToast(error.message || 'No se pudo guardar el movimiento', 'error');
        return;
      }
      DOM.modalQuickAdd.classList.add('hidden');
      state.quickAdd.isOpen = false;
      document.documentElement.classList.remove('quick-add-open');
      document.body.classList.remove('quick-add-open');
      renderActiveView();
      showToast(`${state.quickAdd.type === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${formatCOP(amount)} guardado`);
    };
  }
}

// Edit Transaction Modal
function openEditTransactionModal(tx) {
  if (!tx) return;

  DOM.modalEditTransaction.classList.remove('hidden');
  DOM.modalEditTransaction.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Editar nombre del movimiento</h3>
        <button id="edit-tx-close" type="button" aria-label="Cerrar edición del movimiento" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <form id="form-edit-tx" class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Concepto</label>
          <input id="edit-tx-desc" type="text" value="${tx.description}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Tipo</label>
            <input type="text" value="${tx.type === 'ingreso' ? 'Ingreso' : 'Gasto / Egreso'}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Monto (COP)</label>
            <input type="text" value="${tx.amount.toLocaleString('es-CO')}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500 tabular-nums cursor-not-allowed" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Categoría</label>
            <input type="text" value="${tx.category || 'Otros'}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Fecha</label>
            <input type="text" value="${tx.date || 'Sin fecha'}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>
        </div>

        <p class="text-[11px] text-slate-400">Solo puedes cambiar el nombre. Los demás datos permanecen protegidos.</p>

        <button type="submit" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar nombre
        </button>

      </form>
    </div>
  `;

  document.getElementById('edit-tx-close').onclick = () => DOM.modalEditTransaction.classList.add('hidden');

  document.getElementById('form-edit-tx').onsubmit = async (e) => {
    e.preventDefault();
    const desc = document.getElementById('edit-tx-desc').value.trim();

    if (!desc) {
      showToast('Escribe un concepto para el movimiento', 'error');
      return;
    }

    try {
      await api.updateTransaction(tx.id, { description: desc });
      updateLocalTransaction(tx.id, { description: desc });
      DOM.modalEditTransaction.classList.add('hidden');
      renderActiveView();
      showToast('Movimiento actualizado');
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el movimiento', 'error');
    }
  };

}

// Add or Edit Fixed Obligation Modal
function openAddOrEditObligationModal(obligation = null) {
  DOM.modalFixedObligation.classList.remove('hidden');

  const isEdit = Boolean(obligation);
  const title = isEdit ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo';
  const reminderEnabled = isEdit ? Number(obligation.reminderDaysBefore ?? 3) > 0 : true;
  const selectedCategory = inferFixedObligationCategory(isEdit ? obligation.category : 'Servicios públicos', isEdit ? obligation.name : '');

  DOM.modalFixedObligation.innerHTML = `
    <div class="bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col border border-slate-100 max-h-[calc(100vh-4px)] overflow-y-auto">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">${title}</h3>
        <button id="ob-modal-close" type="button" aria-label="Cerrar gasto fijo" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <form id="form-obligation" class="flex flex-col gap-4">
        <div>
          <label class="text-sm font-medium text-[#607797]">Concepto</label>
          <input id="ob-input-name" type="text" placeholder="ej. Arriendo Apartamento, Internet, etc." value="${isEdit ? obligation.name : ''}" required class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#25364d] placeholder:text-[#8d99aa] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff]" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-[#607797]">Valor mensual</label>
            <div class="relative mt-1.5">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#91a0b4]">$</span>
              <input id="ob-input-amount" type="text" inputmode="numeric" placeholder="0" value="${isEdit ? obligation.amount.toLocaleString('es-CO') : ''}" required class="w-full h-12 pl-8 pr-3 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-bold text-[#25364d] placeholder:text-[#25364d] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff] tabular-nums" />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-[#607797]">Día de vencimiento</label>
            <input id="ob-input-day" type="number" min="1" max="31" value="${isEdit ? obligation.dueDay : 5}" required class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-bold text-[#25364d] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff]" />
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-[#607797]">Categoría</label>
          <input id="ob-input-category" type="hidden" value="${selectedCategory}" />
          <div id="ob-categories-scroll" class="qa-categories-scroll flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1.5 sm:pb-2 mt-1.5" role="listbox" aria-label="Categorías de gasto fijo">
            ${FIXED_OBLIGATION_CATEGORY_OPTIONS.map((option) => `
              <button type="button" data-category="${option.name}" role="option" aria-selected="${selectedCategory === option.name}" class="ob-category-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer">
                <span class="ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${selectedCategory === option.name ? 'bg-[#0058bc] text-white shadow-md' : 'bg-[#dce8ff] text-slate-600'}">${getIconSvg(option.icon, 'w-6 h-6 sm:w-7 sm:h-7')}</span>
                <span class="ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${selectedCategory === option.name ? 'text-[#0058bc] font-semibold' : 'text-slate-700'}">${option.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between h-14 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc]">
          <span class="text-sm font-medium text-[#405572]">Recordatorio activo (3 días antes)</span>
          <button id="ob-reminder-toggle" type="button" role="switch" aria-checked="${reminderEnabled}" class="relative w-12 h-7 rounded-full transition-colors cursor-pointer ${reminderEnabled ? 'bg-[#0058bc]' : 'bg-[#cbd5e1]'}">
            <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}"></span>
          </button>
        </div>

        <button type="submit" class="w-full h-12 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          ${isEdit ? 'Guardar Cambios' : 'Crear Obligación'}
        </button>

        ${
          isEdit
            ? `
          <button type="button" id="ob-delete-btn" class="w-full py-2.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5">
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

  const categoryInput = document.getElementById('ob-input-category');
  DOM.modalFixedObligation.querySelectorAll('.ob-category-btn').forEach((button) => {
    button.onclick = () => {
      categoryInput.value = button.dataset.category;
      DOM.modalFixedObligation.querySelectorAll('.ob-category-btn').forEach((optionButton) => {
        const isSelected = optionButton === button;
        optionButton.setAttribute('aria-selected', String(isSelected));
        const icon = optionButton.querySelector('.ob-category-icon');
        const label = optionButton.querySelector('.ob-category-label');
        if (icon) icon.className = `ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${isSelected ? 'bg-[#0058bc] text-white shadow-md' : 'bg-[#dce8ff] text-slate-600'}`;
        if (label) label.className = `ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${isSelected ? 'text-[#0058bc] font-semibold' : 'text-slate-700'}`;
      });
    };
  });

  const reminderToggle = document.getElementById('ob-reminder-toggle');
  if (reminderToggle) {
    reminderToggle.onclick = () => {
      const enabled = reminderToggle.getAttribute('aria-checked') !== 'true';
      reminderToggle.setAttribute('aria-checked', String(enabled));
      reminderToggle.className = `relative w-12 h-7 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-[#0058bc]' : 'bg-[#cbd5e1]'}`;
      reminderToggle.firstElementChild.className = `absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`;
    };
  }

  document.getElementById('form-obligation').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('ob-input-name').value.trim();
    const amount = parseInt(amountInput.value.replace(/\D/g, ''), 10) || 0;
    const dueDay = parseInt(document.getElementById('ob-input-day').value, 10) || 1;
    const category = document.getElementById('ob-input-category').value;
    const reminderDaysBefore = document.getElementById('ob-reminder-toggle')?.getAttribute('aria-checked') === 'true' ? 3 : 0;

    if (!name || amount <= 0) return;

    try {
      if (isEdit) {
        const updates = {
          name,
          amount,
          dueDay,
          category,
          reminderDaysBefore,
          notes: `Vence Día ${dueDay} del mes`,
        };
        await api.updateFixedObligation(obligation.id, updates);
        updateLocalFixedObligation(obligation.id, updates);
        showToast('Obligación actualizada');
      } else {
        const item = {
          name,
          amount,
          dueDay,
          category,
          reminderDaysBefore,
          status: 'pending',
          notes: `Vence Día ${dueDay} del mes`,
        };
        const result = await api.addFixedObligation(item);
        upsertLocalFixedObligation(item, result.id);
        showToast('Gasto fijo agregado');
      }

      DOM.modalFixedObligation.classList.add('hidden');
      renderActiveView();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el gasto fijo', 'error');
    }
  };

  const deleteBtn = document.getElementById('ob-delete-btn');
  if (deleteBtn && isEdit) {
    deleteBtn.onclick = () => {
      openDeleteConfirmationModal({
        title: '¿Eliminar gasto fijo?',
        message: 'Esta acción eliminará el gasto fijo y su registro asociado de forma permanente.',
        successMessage: 'Obligación eliminada',
        errorMessage: 'No se pudo eliminar el gasto fijo',
        onConfirm: async () => {
          await api.deleteFixedObligation(obligation.id);
          removeLocalFixedObligation(obligation.id);
          DOM.modalFixedObligation.classList.add('hidden');
          renderActiveView();
        },
      });
    };
  }
}

// Add or Edit Savings Goal Modal
function normalizeGoalDeadline(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;

  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const monthYear = normalized.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const monthIndex = SPANISH_MONTHS.findIndex((month) => month.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === monthYear[1]);
    if (monthIndex >= 0) return `${monthYear[2]}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  }

  const dayMonthYear = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const year = Number(dayMonthYear[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function formatGoalDeadline(value) {
  const normalized = normalizeGoalDeadline(value);
  if (!normalized) return String(value || '');
  const [, year, month] = normalized.match(/^(\d{4})-(\d{2})-/) || [];
  return year && month ? `${SPANISH_MONTHS[Number(month) - 1] || month} ${year}` : String(value || '');
}

const GOAL_IMAGE_DATA_URL_LIMIT = 600000;

function compressImageForUpload(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    return Promise.reject(new Error('Selecciona una imagen válida'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      image.onload = () => {
        const originalWidth = image.naturalWidth || image.width;
        const originalHeight = image.naturalHeight || image.height;
        if (!originalWidth || !originalHeight) {
          reject(new Error('La imagen no tiene un tamaño válido'));
          return;
        }

        const maxDimensions = [1000, 800, 650, 500];
        let compressed = '';
        for (const maxDimension of maxDimensions) {
          const scale = Math.min(1, maxDimension / originalWidth, maxDimension / originalHeight);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(originalWidth * scale));
          canvas.height = Math.max(1, Math.round(originalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('El navegador no permite procesar la imagen'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          compressed = canvas.toDataURL('image/webp', 0.78);
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', 0.78);
          }
          if (compressed.length <= GOAL_IMAGE_DATA_URL_LIMIT) break;
        }

        if (compressed.length > GOAL_IMAGE_DATA_URL_LIMIT) {
          reject(new Error('La imagen es demasiado grande. Elige una imagen más pequeña'));
          return;
        }
        resolve(compressed);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function isGoalDeadlineBeforeCurrentMonth(year, month) {
  const selectedMonthKey = `${Number(year)}-${String(Number(month)).padStart(2, '0')}`;
  return selectedMonthKey < getCurrentMonthKey();
}

function openAddOrEditGoalModal(goal = null) {
  DOM.modalSavingsGoal.classList.remove('hidden');

  const isEdit = Boolean(goal);
  let customGoalImage = isEdit ? goal.imageUrl || '' : '';
  let selectedIcon = isEdit ? goal.icon || 'security' : 'security';
  const normalizedCurrentDeadline = isEdit ? normalizeGoalDeadline(goal.deadline) || '' : '';
  const currentDeadlineMonth = normalizedCurrentDeadline.slice(5, 7);
  const currentDeadlineYear = normalizedCurrentDeadline.slice(0, 4);
  const currentYear = new Date().getFullYear();
  const firstDeadlineYear = Math.min(currentYear, Number(currentDeadlineYear) || currentYear);
  const lastDeadlineYear = Math.max(currentYear + 10, Number(currentDeadlineYear) || currentYear);
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
  const goalDeadlineMonthOptions = SPANISH_MONTHS.map((month, index) => `
    <option value="${String(index + 1).padStart(2, '0')}" ${currentDeadlineMonth === String(index + 1).padStart(2, '0') ? 'selected' : ''}>${month}</option>
  `).join('');
  const goalDeadlineYearOptions = Array.from({ length: lastDeadlineYear - firstDeadlineYear + 1 }, (_, index) => firstDeadlineYear + index)
    .map((year) => {
      const isExpiredYear = year < currentYear;
      const isCurrentDeadlineYear = currentDeadlineYear === String(year);
      const label = isExpiredYear && isCurrentDeadlineYear ? `${year} (fecha anterior)` : year;
      return `<option value="${year}" ${isCurrentDeadlineYear ? 'selected' : ''} ${isExpiredYear ? 'disabled' : ''}>${label}</option>`;
    })
    .join('');

  DOM.modalSavingsGoal.innerHTML = `
    <div class="bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-[18px] text-[#0b1c30]">${isEdit ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}</h3>
        <button id="goal-modal-close" type="button" aria-label="Cerrar meta de ahorro" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer">
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
          <input id="goal-input-target" type="text" inputmode="numeric" placeholder="30.000.000" value="${isEdit ? Number(goal.targetAmount || 0).toLocaleString('es-CO') : ''}" required class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-bold text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30 tabular-nums" />
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Fecha límite opcional</label>
          <div class="grid grid-cols-2 gap-2 mt-1.5">
            <select id="goal-input-deadline-month" aria-label="Mes de la fecha límite" class="w-full h-12 px-3 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30">
              <option value="">Mes</option>
              ${goalDeadlineMonthOptions}
            </select>
            <select id="goal-input-deadline-year" aria-label="Año de la fecha límite" class="w-full h-12 px-3 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30">
              <option value="">Año</option>
              ${goalDeadlineYearOptions}
            </select>
          </div>
          <button type="button" id="goal-clear-deadline" class="text-xs text-[#0058bc] font-semibold mt-1.5 cursor-pointer">Quitar fecha límite</button>
          <p class="text-xs text-slate-400 mt-1">Solo puedes elegir el mes actual o una fecha futura.</p>
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
          <div class="flex flex-wrap items-center gap-2 mt-2 max-w-full overflow-x-hidden">${goalIconButtons}</div>
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
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        customGoalImage = await compressImageForUpload(file);
        previewDiv.innerHTML = `<img src="${customGoalImage}" class="max-w-full max-h-full object-contain" />`;
        removeImageBtn?.classList.remove('hidden');
      } catch (error) {
        customGoalImage = '';
        fileInput.value = '';
        showToast(error.message || 'No se pudo cargar la imagen', 'error');
      }
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
    const numericValue = parseRawNumber(targetInput.value);
    targetInput.value = numericValue ? numericValue.toLocaleString('es-CO') : '';
  };

  const deadlineMonthInput = document.getElementById('goal-input-deadline-month');
  const deadlineYearInput = document.getElementById('goal-input-deadline-year');
  const syncGoalDeadlineMonthOptions = () => {
    const selectedYear = Number(deadlineYearInput.value) || currentYear;
    Array.from(deadlineMonthInput.options).forEach((option) => {
      if (!option.value) return;
      const isPast = isGoalDeadlineBeforeCurrentMonth(selectedYear, option.value);
      option.disabled = isPast;
      if (isPast && option.selected) deadlineMonthInput.value = '';
    });
  };
  deadlineYearInput.onchange = syncGoalDeadlineMonthOptions;
  syncGoalDeadlineMonthOptions();
  document.getElementById('goal-clear-deadline').onclick = () => {
    deadlineMonthInput.value = '';
    deadlineYearInput.value = '';
    syncGoalDeadlineMonthOptions();
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
    const targetAmount = parseRawNumber(targetInput.value);
    const selectedDeadlineMonth = deadlineMonthInput.value;
    const selectedDeadlineYear = deadlineYearInput.value;
    const hasDeadlineMonth = Boolean(selectedDeadlineMonth);
    const hasDeadlineYear = Boolean(selectedDeadlineYear);
    const deadlineText = hasDeadlineMonth && hasDeadlineYear ? `${selectedDeadlineYear}-${selectedDeadlineMonth}` : '';
    const deadline = normalizeGoalDeadline(deadlineText);
    const icon = selectedIcon;

    if (!name || targetAmount <= 0) {
      showToast('Escribe un nombre y un valor objetivo mayor que $0', 'error');
      return;
    }
    if (hasDeadlineMonth !== hasDeadlineYear) {
      showToast('Selecciona el mes y el año de la fecha límite', 'error');
      return;
    }
    if (deadlineText && !deadline) {
      showToast('La fecha límite seleccionada no es válida', 'error');
      return;
    }
    if (deadline && isGoalDeadlineBeforeCurrentMonth(selectedDeadlineYear, selectedDeadlineMonth)) {
      showToast('La fecha límite debe ser el mes actual o un mes futuro', 'error');
      return;
    }

    const colors = {
      security: '#006c49',
      laptop: '#0058bc',
      plane: '#00838f',
      car: '#0284c7',
      home: '#4f46e5',
      star: '#d97706',
    };

    try {
      if (isEdit) {
        const updates = {
          name,
          targetAmount,
          deadline,
          icon,
          color: colors[icon] || '#006c49',
          imageUrl: customGoalImage,
        };
        await api.updateSavingsGoal(goal.id, updates);
        updateLocalSavingsGoal(goal.id, updates);
        showToast(`Meta "${name}" actualizada`);
      } else {
        const newGoal = {
          name,
          targetAmount,
          currentAmount: 0,
          deadline,
          icon,
          color: colors[icon] || '#006c49',
          imageUrl: customGoalImage,
        };
        const result = await api.addSavingsGoal(newGoal);
        upsertLocalSavingsGoal(newGoal, result.id);
        showToast(`Meta "${name}" creada`);
      }

      DOM.modalSavingsGoal.classList.add('hidden');
      renderActiveView();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar la meta', 'error');
    }
  };

  const deleteBtn = document.getElementById('goal-delete-btn');
  if (deleteBtn && isEdit) {
    deleteBtn.onclick = () => {
      openDeleteConfirmationModal({
        title: '¿Eliminar meta?',
        message: `Esta acción eliminará la meta "${goal.name}" y sus aportes asociados de forma permanente.`,
        successMessage: 'Meta eliminada',
        errorMessage: 'No se pudo eliminar la meta',
        onConfirm: async () => {
          // The API client applies demo mutations only to its in-memory
          // runtime; real accounts persist the same request in the backend.
          // Keeping both layers in sync prevents deleted contributions from
          // reducing the available cash used by the next goal contribution.
          await api.deleteSavingsGoal(goal.id);
          removeLocalSavingsGoal(goal.id);
          DOM.modalSavingsGoal.classList.add('hidden');
          renderActiveView();
        },
      });
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
        <button id="aporte-modal-close" type="button" aria-label="Cerrar aporte a la meta" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer shrink-0">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="mt-7 text-center">
        <label class="block text-sm font-semibold tracking-wide text-[#6b7d98]">MONTO A RESERVAR</label>
        <div class="flex items-center justify-center gap-2 mt-2 w-full min-w-0 text-[#0058bc]">
          <span class="shrink-0 text-[34px] font-bold leading-none">$</span>
          <input id="aporte-input" type="text" inputmode="numeric" value="100.000" placeholder="100.000" class="min-w-0 flex-1 max-w-xs bg-transparent text-center text-3xl sm:text-[38px] font-extrabold leading-tight tabular-nums focus:outline-none" />
          <span class="shrink-0 text-sm font-semibold text-[#6b7d98]">COP</span>
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
      aporteInput.value = amt.toLocaleString('es-CO');
    };
  });

  aporteInput.oninput = () => {
    const numericValue = parseRawNumber(aporteInput.value);
    aporteInput.value = numericValue ? numericValue.toLocaleString('es-CO') : '';
  };

  document.getElementById('aporte-submit-btn').onclick = async () => {
    const amt = parseRawNumber(aporteInput.value);
    if (amt <= 0) return;

    const metrics = computeMetrics();
    const availableForGoals = metrics.availableCash;
    if (amt > availableForGoals) {
      showToast(`No puedes aportar más de ${formatCOP(availableForGoals, true)} disponibles.`, 'error');
      return;
    }

    try {
      const result = await api.contributeToGoal(goalId, amt, 'Manual');
      applyLocalGoalContribution(goalId, amt, 'Manual', result);
    } catch (error) {
      showToast(error.message || 'No se pudo registrar el aporte', 'error');
      return;
    }
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
    <div class="bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100vh-4px)] overflow-y-auto">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">Editar Información Personal</h3>
        <button id="edit-profile-close" aria-label="Cerrar" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="flex flex-col items-center gap-3 mb-7">
        <div id="profile-modal-avatar-preview">${renderAvatarHtml(user.name, tempAvatarUrl, 'profile')}</div>
        <label class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef4ff] text-[#0058bc] text-sm font-semibold cursor-pointer active:scale-95 transition-all">
          ${getIconSvg('camera', 'w-4 h-4')}
          <span>Subir foto</span>
          <input id="input-profile-avatar" type="file" accept="image/*" class="sr-only" />
        </label>
        <p id="profile-avatar-hint" class="text-xs text-[#8da0bd] text-center">${tempAvatarUrl ? 'Foto de perfil seleccionada' : `Mostrando iniciales "${getInitials(user.name)}" según tu nombre`}</p>
      </div>

      <div class="flex flex-col gap-3">
        <div>
          <label class="text-sm font-medium text-[#607797]">Nombre completo</label>
          <input id="edit-name-input" type="text" value="${user.name}" class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#26364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div>
          <label class="text-sm font-medium text-[#607797]">Correo electrónico</label>
          <input id="edit-email-input" type="email" value="${user.email}" class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#26364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div class="grid grid-cols-2 gap-3 pt-3">
          <button id="edit-profile-cancel-btn" class="h-12 rounded-full bg-[#eff4f8] text-[#50627b] font-semibold text-sm active:scale-95 transition-all cursor-pointer">Cancelar</button>
          <button id="edit-profile-save-btn" class="h-12 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Guardar Cambios</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => DOM.modalEditProfile.classList.add('hidden');
  document.getElementById('edit-profile-close').onclick = closeModal;
  document.getElementById('edit-profile-cancel-btn').onclick = closeModal;

  const avatarInput = document.getElementById('input-profile-avatar');
  const avatarPreview = document.getElementById('profile-modal-avatar-preview');
  const nameInput = document.getElementById('edit-name-input');
  const avatarHint = document.getElementById('profile-avatar-hint');

  const syncAvatarFallback = () => {
    const name = nameInput.value.trim() || user.name;
    if (!tempAvatarUrl) {
      avatarPreview.innerHTML = renderAvatarHtml(name, '', 'profile');
      avatarHint.textContent = `Mostrando iniciales "${getInitials(name)}" según tu nombre`;
    } else {
      avatarHint.textContent = 'Foto de perfil seleccionada';
    }
  };

  nameInput.oninput = syncAvatarFallback;

  if (avatarInput) {
    avatarInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        tempAvatarUrl = await compressImageForUpload(file);
        avatarPreview.innerHTML = renderAvatarHtml(nameInput.value || user.name, tempAvatarUrl, 'profile');
        avatarHint.textContent = 'Foto de perfil seleccionada';
      } catch (error) {
        tempAvatarUrl = '';
        avatarInput.value = '';
        syncAvatarFallback();
        showToast(error.message || 'No se pudo cargar la imagen', 'error');
      }
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

// Edit a category budget directly from the Records view
function openCategoryBudgetModal(categoryBudget) {
  const currentLimit = Number(categoryBudget.limit) || 0;
  DOM.modalEditBudget.classList.remove('hidden');
  DOM.modalEditBudget.innerHTML = `
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <div>
          <h3 class="font-bold text-sm text-[#0b1c30]">Límite de ${categoryBudget.category}</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">Presupuesto mensual de la categoría</p>
        </div>
        <button id="edit-category-budget-close" type="button" aria-label="Cerrar presupuesto de categoría" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${getIconSvg('x', 'w-4 h-4')}
        </button>
      </div>

      <div class="flex flex-col gap-1">
        <label for="edit-category-budget-input" class="text-xs font-bold text-[#0b1c30]">Límite mensual (COP)</label>
        <input id="edit-category-budget-input" type="text" inputmode="numeric" value="${currentLimit ? currentLimit.toLocaleString('es-CO') : ''}" placeholder="ej. 700.000" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
      </div>

      <div class="flex gap-2 pt-1">
        <button id="edit-category-budget-cancel" type="button" class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs cursor-pointer">Cancelar</button>
        <button id="edit-category-budget-save" type="button" class="flex-1 py-2.5 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/20 cursor-pointer">Guardar límite</button>
      </div>
    </div>
  `;

  const closeModal = () => DOM.modalEditBudget.classList.add('hidden');
  document.getElementById('edit-category-budget-close').onclick = closeModal;
  document.getElementById('edit-category-budget-cancel').onclick = closeModal;

  const limitInput = document.getElementById('edit-category-budget-input');
  limitInput.oninput = () => {
    const numericValue = parseInt(limitInput.value.replace(/\D/g, ''), 10);
    limitInput.value = Number.isNaN(numericValue) ? '' : numericValue.toLocaleString('es-CO');
  };

  document.getElementById('edit-category-budget-save').onclick = async () => {
    const limit = parseInt(limitInput.value.replace(/\D/g, ''), 10) || 0;
    try {
      await api.updateCategoryBudget(categoryBudget.category, limit);
      categoryBudget.limit = limit;
      registerLocalMutation();
      closeModal();
      renderExpenses();
      showToast(`Límite de ${categoryBudget.category} actualizado`);
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar el límite', 'error');
    }
  };
};

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
        <button id="edit-budget-close" type="button" aria-label="Cerrar ajuste de salario" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
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
function setSearchOverlayOpen(isOpen) {
  DOM.modalSearch.classList.toggle('hidden', !isOpen);
  document.documentElement.classList.toggle('search-open', isOpen);
  document.body.classList.toggle('search-open', isOpen);
}

function setupSearchOverlay() {
  DOM.searchInputIcon.innerHTML = getIconSvg('search', 'w-4 h-4 text-slate-400');
  DOM.searchCloseBtn.innerHTML = getIconSvg('x', 'w-4 h-4');

  DOM.headerSearchBtn.onclick = () => {
    setSearchOverlayOpen(true);
    DOM.searchInput.value = '';
    DOM.searchInput.focus();
    renderSearchResults('');
  };

  DOM.searchCloseBtn.onclick = () => {
    setSearchOverlayOpen(false);
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
      setSearchOverlayOpen(false);
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
        document.documentElement.classList.remove('quick-add-open');
        document.body.classList.remove('quick-add-open');
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
      document.documentElement.classList.remove('quick-add-open');
      document.body.classList.remove('quick-add-open');
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
  setupMonthlyRolloverWatcher();

  const hasRecoveryContext = prepareRecoveryFromUrl();
  if (hasRecoveryContext) {
    state.currentUser = null;
    renderApp();
    return;
  }

  // Paint the last verified state immediately, then synchronize in the
  // background so returning users never see a blank screen while Supabase
  // responds.
  const restoredCachedState = restoreCachedState();
  const cachedBootstrapSnapshot = localStorage.getItem('miplata_bootstrap_cache');
  renderApp();

  // Load the session and all initial data in one request.
  try {
    const refreshed = await refreshAllData();
    const freshBootstrapSnapshot = localStorage.getItem('miplata_bootstrap_cache');
    if (refreshed && (!restoredCachedState || cachedBootstrapSnapshot !== freshBootstrapSnapshot)) {
      renderApp();
    }
  } catch (e) {
    console.warn('Initial session check error', e);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
