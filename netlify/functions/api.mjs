const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH = 600000;

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

class SupabaseError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
    throw new SupabaseError('Faltan variables de entorno de Supabase en Netlify', 500);
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Error de Supabase';
    throw new SupabaseError(message, response.status, payload);
  }
  return payload;
}

function authHeaders(key, token = '') {
  return {
    apikey: key,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function authRequest(path, method = 'GET', body = null, key = SUPABASE_PUBLISHABLE_KEY, token = '') {
  return supabaseRequest(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: authHeaders(key, token),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function restRequest(table, { method = 'GET', params = {}, body = null, returning = false, select = '' } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, value);
  });
  if (select) url.searchParams.set('select', select);
  return supabaseRequest(url, {
    method,
    headers: {
      ...authHeaders(SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY),
      ...(returning ? { Prefer: 'return=representation' } : {}),
    },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(key) {
  const [year, month] = String(key).split('-').map(Number);
  const next = new Date(year, month, 1);
  return [`${year}-${String(month).padStart(2, '0')}-01`, `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`];
}

function monthLabel(key) {
  const [year, month] = String(key || monthKey()).split('-');
  return `${MONTHS[(Number(month) || 1) - 1] || month} ${year}`;
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function nonNegativeNumber(value, allowZero = true) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || (!allowZero && result === 0)) return null;
  return result;
}

function isValidMonthKey(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim());
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= 12);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function isDuplicateEmailError(error) {
  const payload = error?.payload || {};
  const details = [
    payload.code,
    payload.error_code,
    payload.msg,
    payload.message,
    payload.error,
    payload.error_description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return error?.status === 409 || [
    'email_exists',
    'user_already_exists',
    'already registered',
    'already been registered',
    'already exists',
  ].some((marker) => details.includes(marker));
}

function dateOnly(value, fallbackToday = false) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const monthYear = normalized.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const monthIndex = MONTHS.findIndex((month) => month.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === monthYear[1]);
    if (monthIndex >= 0) return `${monthYear[2]}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  }
  const dayMonthYear = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${dayMonthYear[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return fallbackToday ? new Date().toISOString().slice(0, 10) : null;
}

function isPastGoalMonth(value) {
  const normalized = dateOnly(value);
  if (!normalized) return false;
  const [year, month] = normalized.split('-').map(Number);
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

async function availableCashForUser(userId) {
  const currentMonth = monthKey();
  const [transactions, contributions] = await Promise.all([
    restRequest('transactions', {
      params: { user_id: `eq.${userId}`, date: monthBounds(currentMonth).map((bound, index) => `${index === 0 ? 'gte' : 'lt'}.${bound}`) },
      select: 'type,amount,date',
    }),
    restRequest('goal_contributions', {
      params: { user_id: `eq.${userId}`, date: monthBounds(currentMonth).map((bound, index) => `${index === 0 ? 'gte' : 'lt'}.${bound}`) },
      select: 'amount',
    }),
  ]);

  const totalIncome = (transactions || [])
    .filter((transaction) => transaction.type === 'ingreso' && String(transaction.date || '').startsWith(currentMonth))
    .reduce((sum, transaction) => sum + number(transaction.amount), 0);
  const totalExpenses = (transactions || [])
    .filter((transaction) => transaction.type === 'gasto' && String(transaction.date || '').startsWith(currentMonth))
    .reduce((sum, transaction) => sum + number(transaction.amount), 0);
  const totalSavings = (contributions || [])
    .reduce((sum, contribution) => sum + number(contribution.amount), 0);

  return Math.max(0, totalIncome - totalExpenses - totalSavings);
}

function timestamp(value) {
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function profileToClient(row) {
  if (!row) return null;
  const memberSince = row.member_since ? monthLabel(String(row.member_since).slice(0, 7)) : monthLabel();
  return {
    id: row.id,
    name: row.name || 'MiPlata',
    email: row.email || '',
    password: null,
    avatarUrl: row.avatar_url || '',
    plan: row.plan || 'Plan Personal Activo',
    memberSince,
    isLocalOnly: false,
    monthlySalary: number(row.monthly_salary),
    initialBalance: number(row.initial_balance),
    monthlyBudgetLimit: number(row.monthly_budget_limit),
    budgetRule: {
      needs: number(row.budget_needs),
      wants: number(row.budget_wants),
      savings: number(row.budget_savings),
    },
    alert80Percent: Boolean(row.alert_80_percent),
    autoAdjustVariable: Boolean(row.auto_adjust_variable),
    currency: row.currency || 'COP',
    quickKeypad: true,
    resetDay: row.reset_day || 1,
    smartCategorization: Boolean(row.smart_categorization),
  };
}

async function getProfile(userId) {
  const rows = await restRequest('profiles', {
    params: { id: `eq.${userId}`, limit: '1' },
    select: 'id,name,email,avatar_url,plan,member_since,monthly_salary,initial_balance,monthly_budget_limit,budget_needs,budget_wants,budget_savings,alert_80_percent,auto_adjust_variable,currency,reset_day,smart_categorization',
  });
  return profileToClient(rows?.[0]);
}

const DEFAULT_CATEGORIES = [
  ['Alimentación', 700000, 'restaurant'],
  ['Compras', 350000, 'shopping_bag'],
  ['Educación', 200000, 'school'],
  ['Entretenimiento', 300000, 'sports_esports'],
  ['Transporte', 250000, 'directions_car'],
];

async function ensureUserDefaults(userId, name, email, monthlySalary = null, avatarUrl = '', applyDefaultPreferences = false) {
  const rows = await restRequest('profiles', { params: { id: `eq.${userId}`, limit: '1' } });
  if (!rows?.length) {
    await restRequest('profiles', {
      method: 'POST',
      returning: true,
      body: {
        id: userId,
        name: name || 'MiPlata',
        email: email || '',
        avatar_url: avatarUrl || null,
        monthly_salary: monthlySalary || 0,
        monthly_budget_limit: monthlySalary || 0,
        alert_80_percent: true,
        auto_adjust_variable: true,
        smart_categorization: true,
      },
    });
  } else {
    const patch = {};
    if (name) patch.name = name;
    if (email) patch.email = email.toLowerCase();
    if (avatarUrl) patch.avatar_url = avatarUrl;
    if (monthlySalary !== null) {
      patch.monthly_salary = monthlySalary || 0;
      if (!rows[0].monthly_budget_limit) patch.monthly_budget_limit = monthlySalary || 0;
    }
    if (applyDefaultPreferences) {
      patch.alert_80_percent = true;
      patch.auto_adjust_variable = true;
      patch.smart_categorization = true;
    }
    if (Object.keys(patch).length) {
      await restRequest('profiles', { method: 'PATCH', params: { id: `eq.${userId}` }, body: patch });
    }
  }

  const budgets = await restRequest('category_budgets', { params: { user_id: `eq.${userId}`, limit: '1' } });
  if (!budgets?.length) {
    await restRequest('category_budgets', {
      method: 'POST',
      returning: true,
      body: DEFAULT_CATEGORIES.map(([category, limit_amount, icon]) => ({
        id: `cb_${userId}_${category}`,
        user_id: userId,
        category,
        limit_amount,
        icon,
      })),
    });
  }
  return getProfile(userId);
}

async function addTransaction(userId, tx) {
  const id = tx.id || `tx_${Date.now()}`;
  await restRequest('transactions', {
    method: 'POST',
    returning: true,
    body: {
      id,
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
      date: dateOnly(tx.date, true),
      time: tx.time || new Date().toTimeString().slice(0, 8),
      account_method: tx.accountMethod || '',
      is_recurring: Boolean(tx.isRecurring),
      fixed_obligation_id: tx.fixedObligationId || null,
    },
  });
  return id;
}

async function initializeRegisteredUser(userId, name, email, salary, avatarUrl, applyDefaultPreferences = true) {
  const profile = await ensureUserDefaults(userId, name, email, salary, avatarUrl, applyDefaultPreferences);
  if (number(salary) > 0) {
    const existing = await restRequest('transactions', {
      params: {
        user_id: `eq.${userId}`,
        category: 'eq.Nómina',
        description: 'eq.Nómina / Ingreso mensual registrado',
        limit: '1',
      },
    });
    if (!existing?.length) {
      await addTransaction(userId, {
        id: `tx_sal_${Date.now()}`,
        type: 'ingreso',
        amount: number(salary),
        category: 'Nómina',
        description: 'Nómina / Ingreso mensual registrado',
        date: dateOnly(null, true),
        time: new Date().toTimeString().slice(0, 8),
        accountMethod: 'Cuenta Principal',
      });
    }
  }
  return profile;
}

function demoDate(offset) {
  const date = new Date();
  date.setDate(Math.max(1, Math.min(28, date.getDate() - offset)));
  return date.toISOString().slice(0, 10);
}

function demoMonthKey(offset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function demoMonthDate(offset, day) {
  return `${demoMonthKey(offset)}-${String(day).padStart(2, '0')}`;
}

async function ensureDemoData(userId) {
  const now = new Date();
  const currentMonth = monthKey();
  const currentDay = Math.max(1, Math.min(28, now.getDate()));
  const dateFromToday = (offset) => `${currentMonth}-${String(Math.max(1, currentDay - offset)).padStart(2, '0')}`;
  const tx = (id, type, amount, category, description, date, time, accountMethod, fixedObligationId = null, isRecurring = false) => ({
    id, user_id: userId, type, amount, category, description, date, time, account_method: accountMethod,
    is_recurring: isRecurring, fixed_obligation_id: fixedObligationId,
  });
  const transactions = [
    tx('demo_tx_income', 'ingreso', 2000000, 'Nómina', 'Nómina mensual', dateFromToday(3), '08:30:00', 'Bancolombia'),
    tx('demo_tx_food', 'gasto', 240000, 'Alimentación', 'Mercado de la semana', dateFromToday(1), '18:15:00', 'Tarjeta Débito'),
    tx('demo_tx_transport', 'gasto', 85000, 'Transporte', 'Gasolina y transporte', dateFromToday(2), '17:45:00', 'Nequi QR'),
    tx('demo_tx_health', 'gasto', 45000, 'Salud', 'Medicamentos', dateFromToday(4), '11:10:00', 'Efectivo'),
    tx('demo_tx_internet', 'gasto', 80000, 'Servicios', 'Pago Internet Fibra', dateFromToday(5), '09:00:00', 'Débito automático', 'demo_fixed_internet', true),
    tx('demo_tx_services', 'gasto', 120000, 'Servicios', 'Pago servicios públicos', dateFromToday(6), '14:00:00', 'PSE', 'demo_fixed_services'),
    tx('demo_tx_previous_1_income_salary', 'ingreso', 2000000, 'Nómina', 'Nómina mensual', demoMonthDate(1, 15), '08:30:00', 'Bancolombia'),
    tx('demo_tx_previous_1_income_extra', 'ingreso', 250000, 'Honorarios', 'Trabajo freelance', demoMonthDate(1, 26), '16:00:00', 'Nequi'),
    tx('demo_tx_previous_1_rent', 'gasto', 500000, 'Vivienda', 'Arriendo del apartamento', demoMonthDate(1, 5), '10:00:00', 'Transferencia Bancaria'),
    tx('demo_tx_previous_1_food', 'gasto', 300000, 'Alimentación', 'Mercado mensual', demoMonthDate(1, 8), '17:30:00', 'Tarjeta Débito'),
    tx('demo_tx_previous_1_services', 'gasto', 150000, 'Servicios', 'Servicios públicos e internet', demoMonthDate(1, 12), '14:15:00', 'PSE'),
    tx('demo_tx_previous_1_transport', 'gasto', 100000, 'Transporte', 'Gasolina y transporte', demoMonthDate(1, 18), '18:30:00', 'Bancolombia Débito'),
    tx('demo_tx_previous_1_leisure', 'gasto', 80000, 'Entretenimiento', 'Cine y salida de fin de semana', demoMonthDate(1, 22), '20:45:00', 'Tarjeta Crédito'),
    tx('demo_tx_previous_2_income_salary', 'ingreso', 2000000, 'Nómina', 'Nómina mensual', demoMonthDate(2, 15), '08:30:00', 'Bancolombia'),
    tx('demo_tx_previous_2_income_extra', 'ingreso', 180000, 'Honorarios', 'Asesoría independiente', demoMonthDate(2, 26), '16:00:00', 'Nequi'),
    tx('demo_tx_previous_2_rent', 'gasto', 500000, 'Vivienda', 'Arriendo del apartamento', demoMonthDate(2, 5), '10:00:00', 'Transferencia Bancaria'),
    tx('demo_tx_previous_2_food', 'gasto', 340000, 'Alimentación', 'Mercado y alimentos del hogar', demoMonthDate(2, 10), '18:00:00', 'Tarjeta Débito'),
    tx('demo_tx_previous_2_services', 'gasto', 170000, 'Servicios', 'Servicios públicos e internet', demoMonthDate(2, 14), '14:30:00', 'PSE'),
    tx('demo_tx_previous_2_transport', 'gasto', 110000, 'Transporte', 'Gasolina y mantenimiento', demoMonthDate(2, 19), '17:15:00', 'Nequi'),
    tx('demo_tx_previous_2_shopping', 'gasto', 160000, 'Compras', 'Ropa y artículos para el hogar', demoMonthDate(2, 22), '16:30:00', 'Tarjeta Crédito'),
  ];
  const fixed = [
    { id: 'demo_fixed_rent', user_id: userId, name: 'Arriendo', amount: 500000, due_day: 5, category: 'Vivienda', status: 'pending', paid_date: null, reminder_days_before: 3, is_automatic: false, notes: 'Pago mensual del apartamento' },
    { id: 'demo_fixed_internet', user_id: userId, name: 'Internet Fibra', amount: 80000, due_day: 8, category: 'Servicios', status: 'paid', paid_date: dateFromToday(5), reminder_days_before: 3, is_automatic: true, notes: 'Internet del hogar' },
    { id: 'demo_fixed_services', user_id: userId, name: 'Servicios públicos', amount: 120000, due_day: 15, category: 'Servicios', status: 'paid', paid_date: dateFromToday(6), reminder_days_before: 3, is_automatic: false, notes: 'Luz, agua y gas' },
  ];
  const goals = [
    { id: 'demo_goal_emergency', user_id: userId, name: 'Fondo de Emergencia', target_amount: 3000000, current_amount: 120000, deadline: `${now.getFullYear() + 1}-06-30`, icon: 'shield', color: '#0058bc', category: 'Seguridad', image_url: '' },
    { id: 'demo_goal_trip', user_id: userId, name: 'Viaje familiar', target_amount: 1800000, current_amount: 80000, deadline: `${now.getFullYear() + 1}-12-15`, icon: 'flight', color: '#00838f', category: 'Viajes', image_url: '' },
  ];
  const contributions = [
    { id: 'demo_contribution_1', user_id: userId, goal_id: 'demo_goal_emergency', goal_name: 'Fondo de Emergencia', amount: 120000, date: dateFromToday(1), type: 'Automático', timestamp: Date.now() - 3600000 },
    { id: 'demo_contribution_2', user_id: userId, goal_id: 'demo_goal_trip', goal_name: 'Viaje familiar', amount: 80000, date: dateFromToday(3), type: 'Manual', timestamp: Date.now() - 7200000 },
  ];
  const categoryBudgets = [
    ['Alimentación', 400000, 'restaurant'], ['Compras', 150000, 'shopping_bag'],
    ['Educación', 100000, 'school'], ['Entretenimiento', 150000, 'sports_esports'],
    ['Transporte', 180000, 'directions_car'],
  ].map(([category, limit_amount, icon]) => ({ id: `cb_${userId}_${category}`, user_id: userId, category, limit_amount, icon }));

  // Demo data is intentionally ephemeral: every new demo session starts clean.
  // Contributions reference savings_goals, so remove them first and create
  // them last. Unrelated tables remain concurrent for a fast demo login.
  await restRequest('goal_contributions', { method: 'DELETE', params: { user_id: `eq.${userId}` } });
  await Promise.all(['transactions', 'fixed_obligations', 'category_budgets'].map((table) => (
    restRequest(table, { method: 'DELETE', params: { user_id: `eq.${userId}` } })
  )));
  await restRequest('savings_goals', { method: 'DELETE', params: { user_id: `eq.${userId}` } });
  await restRequest('profiles', { method: 'PATCH', params: { id: `eq.${userId}` }, body: {
    name: 'Fixelar', monthly_salary: 2000000, monthly_budget_limit: 2000000, budget_needs: 50, budget_wants: 30, budget_savings: 20, alert_80_percent: true, auto_adjust_variable: true, smart_categorization: true,
  } });
  await Promise.all([
    restRequest('category_budgets', { method: 'POST', returning: true, body: categoryBudgets }),
    restRequest('transactions', { method: 'POST', returning: true, body: transactions }),
    restRequest('fixed_obligations', { method: 'POST', returning: true, body: fixed }),
  ]);
  await restRequest('savings_goals', { method: 'POST', returning: true, body: goals });
  await restRequest('goal_contributions', { method: 'POST', returning: true, body: contributions });
}

function sessionResponse(auth, profile, message) {
  const session = {};
  ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type'].forEach((key) => {
    if (auth?.[key] !== undefined) session[key] = auth[key];
  });
  return { user: profile, session, ...session, message };
}

async function authenticate(request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  try {
    return await authRequest('/user', 'GET', null, SUPABASE_PUBLISHABLE_KEY, authorization.slice(7).trim());
  } catch {
    return null;
  }
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function userTransactions(userId, selectedMonth = null) {
  const params = { user_id: `eq.${userId}`, order: 'date.desc,created_at.desc' };
  if (selectedMonth) {
    const [startDate, endDate] = monthBounds(selectedMonth);
    params.date = [`gte.${startDate}`, `lt.${endDate}`];
  }
  const rows = await restRequest('transactions', {
    params,
    select: 'id,user_id,type,amount,category,description,date,time,account_method,is_recurring,fixed_obligation_id,created_at',
  }) || [];
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, type: row.type, amount: number(row.amount), category: row.category,
    description: row.description, date: String(row.date || '').slice(0, 10), time: row.time || '',
    accountMethod: row.account_method || '', isRecurring: Boolean(row.is_recurring),
    fixedObligationId: row.fixed_obligation_id || null, createdAt: timestamp(row.created_at),
  }));
}

async function resetMonthlyFixedObligations(userId) {
  const currentMonth = monthKey();
  const rows = await restRequest('fixed_obligations', {
    params: { user_id: `eq.${userId}` },
    select: 'id,status,paid_date',
  }) || [];
  const staleRows = rows.filter((row) => row.status === 'paid' && !String(row.paid_date || '').startsWith(currentMonth));
  await Promise.all(staleRows.map((row) => restRequest('fixed_obligations', {
    method: 'PATCH',
    params: { id: `eq.${row.id}`, user_id: `eq.${userId}` },
    body: { status: 'pending', paid_date: null },
  })));
}

async function userFixed(userId) {
  await resetMonthlyFixedObligations(userId);
  const rows = await restRequest('fixed_obligations', {
    params: { user_id: `eq.${userId}`, order: 'due_day.asc' },
    select: 'id,user_id,name,amount,due_day,category,status,paid_date,reminder_days_before,is_automatic,notes',
  }) || [];
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, name: row.name, amount: number(row.amount), dueDay: row.due_day,
    category: row.category, status: row.status, paidDate: row.paid_date, reminderDaysBefore: row.reminder_days_before,
    isAutomatic: Boolean(row.is_automatic), notes: row.notes || '',
  }));
}

async function userGoals(userId) {
  const rows = await restRequest('savings_goals', {
    params: { user_id: `eq.${userId}`, order: 'created_at.asc' },
    select: 'id,user_id,name,target_amount,current_amount,deadline,icon,color,category,image_url',
  }) || [];
  const contributions = await userContributions(userId);
  const totals = contributions.reduce((result, contribution) => {
    const goalId = String(contribution.goalId || '');
    if (goalId) result[goalId] = (result[goalId] || 0) + number(contribution.amount);
    return result;
  }, {});
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, name: row.name, targetAmount: number(row.target_amount),
    currentAmount: totals[String(row.id)] || 0, deadline: row.deadline || '', icon: row.icon, color: row.color,
    category: row.category || '', imageUrl: row.image_url || '',
  }));
}

async function userContributions(userId, selectedMonth = null) {
  const params = { user_id: `eq.${userId}`, order: 'timestamp.desc' };
  if (selectedMonth) {
    const [startDate, endDate] = monthBounds(selectedMonth);
    params.date = [`gte.${startDate}`, `lt.${endDate}`];
  }
  const rows = await restRequest('goal_contributions', {
    params,
    select: 'id,user_id,goal_id,goal_name,amount,date,type,timestamp',
  }) || [];
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, goalId: row.goal_id, goalName: row.goal_name, amount: number(row.amount),
    date: row.date || '', type: row.type, timestamp: row.timestamp,
  }));
}

async function userBudgets(userId) {
  const rows = await restRequest('category_budgets', {
    params: { user_id: `eq.${userId}`, order: 'category.asc' },
    select: 'category,limit_amount,icon',
  }) || [];
  return rows.map((row) => ({ category: row.category, limit: number(row.limit_amount), icon: row.icon }));
}

async function userRecordMonths(userId) {
  const [transactions, contributions] = await Promise.all([
    restRequest('transactions', { params: { user_id: `eq.${userId}` }, select: 'date' }),
    restRequest('goal_contributions', { params: { user_id: `eq.${userId}` }, select: 'date' }),
  ]);
  const months = new Set([...(transactions || []), ...(contributions || [])]
    .map((row) => String(row.date || '').slice(0, 7))
    .filter((value) => /^\d{4}-\d{2}$/.test(value)));
  months.add(monthKey());
  return [...months].sort().reverse();
}

async function userBootstrap(userId) {
  const currentMonth = monthKey();
  const [profile, transactions, fixedObligations, savingsGoals, goalContributions, categoryBudgets] = await Promise.all([
    getProfile(userId),
    userTransactions(userId, currentMonth),
    userFixed(userId),
    userGoals(userId),
    userContributions(userId, currentMonth),
    userBudgets(userId),
  ]);
  const availableMonths = await userRecordMonths(userId);
  // userGoals already synchronizes currentAmount from the complete history;
  // only the current month's movements are intentionally sent to the client.
  return { user: profile, transactions, fixedObligations, savingsGoals, goalContributions, categoryBudgets, availableMonths };
}

async function deleteUserData(userId) {
  const childTables = ['goal_contributions', 'transactions', 'fixed_obligations', 'savings_goals', 'category_budgets'];
  await Promise.all(childTables.map((table) => restRequest(table, {
    method: 'DELETE',
    params: { user_id: `eq.${userId}` },
  })));
  await restRequest('profiles', { method: 'DELETE', params: { id: `eq.${userId}` } });
}

async function handleAuth(route, request) {
  const body = await readBody(request);
  if (route === 'auth/demo' && request.method === 'POST') {
    const email = 'demo@miplata.app';
    const password = 'MiPlataDemo2026!';
    try {
      await authRequest('/admin/users', 'POST', { email, password, email_confirm: true, user_metadata: { name: 'Fixelar' } }, SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY);
    } catch (error) {
      if (![400, 409, 422].includes(error.status)) throw error;
    }
    const auth = await authRequest('/token?grant_type=password', 'POST', { email, password });
    const user = auth.user || {};
    const profile = await ensureUserDefaults(user.id, 'Fixelar', email, null, '');
    await ensureDemoData(user.id);
    return json({
      ...sessionResponse(auth, profile, 'Sesión de demostración iniciada'),
      bootstrap: await userBootstrap(user.id),
    });
  }

  if (route === 'auth/login' && request.method === 'POST') {
    if (!body.email || !body.password) return json({ error: 'Correo y contraseña son requeridos' }, 400);
    try {
      const auth = await authRequest('/token?grant_type=password', 'POST', { email: body.email.trim().toLowerCase(), password: body.password });
      const user = auth.user || {};
      const metadata = user.user_metadata || {};
      const profile = await ensureUserDefaults(user.id, metadata.name || 'MiPlata', user.email || body.email, null, metadata.avatar_url || '');
      return json(sessionResponse(auth, profile, `¡Bienvenido de nuevo, ${(profile.name || 'usuario').split(' ')[0]}!`));
    } catch (error) {
      return json({ error: 'Correo o contraseña incorrectos' }, [400, 401].includes(error.status) ? 401 : 502);
    }
  }

  if (route === 'auth/password-reset/request' && request.method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const redirectTo = String(body.redirectTo || '').trim();
    if (!isValidEmail(email)) return json({ error: 'Ingresa un correo electrónico válido' }, 400);
    if (!/^https?:\/\/\S+$/.test(redirectTo)) return json({ error: 'La URL de recuperación no es válida' }, 400);
    try {
      await authRequest('/recover', 'POST', { email, redirect_to: redirectTo });
      return json({ message: 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.' });
    } catch (error) {
      console.warn('Password recovery email failed', { status: error.status, message: error.message });
      if (error.status === 429) {
        return json({ error: 'Supabase limitó temporalmente los correos de recuperación. Espera unos minutos y vuelve a intentarlo.' }, 429);
      }
      if (!error.status) {
        return json({ error: 'No se pudo conectar con el servicio de correo de Supabase. Intenta nuevamente.' }, 503);
      }
      if ([400, 422].includes(error.status)) {
        return json({ error: 'No se pudo enviar el enlace. Verifica la URL de redirección en Supabase.' }, 400);
      }
      return json({ error: 'No se pudo enviar el enlace de recuperación. Intenta nuevamente.' }, 502);
    }
  }

  if (route === 'auth/password-reset/confirm' && request.method === 'POST') {
    const accessToken = String(body.accessToken || '').trim();
    const password = String(body.password || '');
    if (!accessToken) return json({ error: 'El enlace de recuperación no es válido o ya expiró' }, 401);
    if (password.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    try {
      await authRequest('/user', 'PUT', { password }, SUPABASE_PUBLISHABLE_KEY, accessToken);
      return json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      if ([400, 401, 403, 404].includes(error.status)) {
        return json({ error: 'El enlace de recuperación no es válido o ya expiró' }, 401);
      }
      return json({ error: 'No se pudo actualizar la contraseña. Intenta nuevamente.' }, 502);
    }
  }

  if (route === 'auth/register' && request.method === 'POST') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const avatarUrl = String(body.avatarUrl || '');
    if (!name) return json({ error: 'El nombre es requerido' }, 400);
    if (!email) return json({ error: 'El correo electrónico es requerido' }, 400);
    if (!isValidEmail(email)) return json({ error: 'Ingresa un correo electrónico válido' }, 400);
    if (!password) return json({ error: 'La contraseña es requerida' }, 400);
    if (password.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    if (avatarUrl.startsWith('data:') && avatarUrl.length > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH) return json({ error: 'La imagen es demasiado grande. Elige una imagen más pequeña' }, 400);
    try {
      await authRequest('/admin/users', 'POST', {
        email, password, email_confirm: true, user_metadata: { name, avatar_url: body.avatarUrl || '' },
      }, SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY);
      const auth = await authRequest('/token?grant_type=password', 'POST', { email, password });
      const user = auth.user || {};
      const profile = await initializeRegisteredUser(user.id, name, email, number(body.monthlySalary), body.avatarUrl || '');
      return json(sessionResponse(auth, profile, `¡Bienvenido a MiPlata, ${name.split(' ')[0]}! Todo listo y limpio en 0 para comenzar.`));
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        return json({ error: 'Correo ya registrado.' }, 409);
      }
      return json({ error: 'No se pudo crear la cuenta. Intenta nuevamente.' }, 502);
    }
  }

  if (route === 'auth/refresh' && request.method === 'POST') {
    if (!body.refreshToken) return json({ error: 'Sesión expirada' }, 401);
    try {
      const auth = await authRequest('/token?grant_type=refresh_token', 'POST', { refresh_token: body.refreshToken });
      const user = auth.user || {};
      const metadata = user.user_metadata || {};
      const profile = await ensureUserDefaults(user.id, metadata.name || 'MiPlata', user.email || '', null, metadata.avatar_url || '');
      return json(sessionResponse(auth, profile, 'Sesión renovada'));
    } catch {
      return json({ error: 'Sesión expirada' }, 401);
    }
  }

  if (route === 'auth/logout' && request.method === 'POST') return json({ message: 'Sesión cerrada correctamente' });
  return json({ error: 'Ruta de autenticación no encontrada' }, 404);
}

async function handleProtected(route, request, user) {
  const userId = user.id;
  const body = await readBody(request);

  if (route === 'bootstrap' && request.method === 'GET') {
    return json(await userBootstrap(userId));
  }

  const monthlyReportMatch = route === 'reports/monthly' && request.method === 'GET';
  if (monthlyReportMatch) {
    const requestedMonth = new URL(request.url).searchParams.get('month') || monthKey();
    if (!isValidMonthKey(requestedMonth)) return json({ error: 'El mes solicitado no es válido' }, 400);
    return json({
      month: requestedMonth,
      transactions: await userTransactions(userId, requestedMonth),
      goalContributions: await userContributions(userId, requestedMonth),
    });
  }

  if (route === 'user' && request.method === 'GET') {
    return json({ user: await getProfile(userId) });
  }

  if (route === 'user/profile' && request.method === 'PUT') {
    const avatarUrl = String(body.avatarUrl || '');
    if (avatarUrl.startsWith('data:') && avatarUrl.length > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH) return json({ error: 'La imagen es demasiado grande. Elige una imagen más pequeña' }, 400);
    const fieldMap = { name: 'name', email: 'email', avatarUrl: 'avatar_url', monthlySalary: 'monthly_salary', initialBalance: 'initial_balance', monthlyBudgetLimit: 'monthly_budget_limit', alert80Percent: 'alert_80_percent', autoAdjustVariable: 'auto_adjust_variable', smartCategorization: 'smart_categorization' };
    const patch = {};
    Object.entries(body).forEach(([key, value]) => { if (fieldMap[key]) patch[fieldMap[key]] = value; });
    if (body.budgetRule && typeof body.budgetRule === 'object') {
      ['needs', 'wants', 'savings'].forEach((key) => { if (body.budgetRule[key] !== undefined) patch[`budget_${key}`] = body.budgetRule[key]; });
    }
    if (Object.keys(patch).length) await restRequest('profiles', { method: 'PATCH', params: { id: `eq.${userId}` }, body: patch });
    return json({ user: await getProfile(userId), message: 'Perfil actualizado' });
  }

  if (route === 'user/balance' && request.method === 'PUT') {
    await restRequest('profiles', { method: 'PATCH', params: { id: `eq.${userId}` }, body: { initial_balance: number(body.initialBalance) } });
    return json({ user: await getProfile(userId), message: 'Saldo disponible base actualizado' });
  }

  if (route === 'user/reset' && request.method === 'POST') {
    for (const table of ['goal_contributions', 'transactions', 'fixed_obligations', 'savings_goals']) await restRequest(table, { method: 'DELETE', params: { user_id: `eq.${userId}` } });
    if ((user.email || '').trim().toLowerCase() === 'demo@miplata.app') await ensureDemoData(userId);
    return json({ message: 'Datos reiniciados al estado por defecto' });
  }

  if (route === 'user' && request.method === 'DELETE') {
    if ((user.email || '').trim().toLowerCase() === 'demo@miplata.app') {
      return json({ error: 'La cuenta demo está protegida y no se puede eliminar' }, 403);
    }
    await deleteUserData(userId);
    await authRequest(`/admin/users/${userId}`, 'DELETE', null, SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY);
    return json({ message: 'Tu cuenta y datos han sido eliminados' });
  }

  if (route === 'transactions' && request.method === 'GET') return json(await userTransactions(userId));
  if (route === 'transactions' && request.method === 'POST') {
    const amount = nonNegativeNumber(body.amount);
    if (!['gasto', 'ingreso'].includes(body.type)) return json({ error: 'El tipo de movimiento no es válido' }, 400);
    if (amount === null) return json({ error: 'El monto debe ser un número mayor o igual a 0' }, 400);
    if (!String(body.category || '').trim() || !String(body.description || '').trim()) return json({ error: 'La categoría y la descripción son requeridas' }, 400);
    return json({ id: await addTransaction(userId, { ...body, amount }), message: 'Movimiento registrado con éxito' });
  }

  const transactionMatch = route.match(/^transactions\/([^/]+)$/);
  if (transactionMatch) {
    const id = decodeURIComponent(transactionMatch[1]);
    if (request.method === 'PUT') {
      const fieldMap = { description: 'description' };
      const patch = {};
      Object.entries(body).forEach(([key, value]) => { if (fieldMap[key]) patch[fieldMap[key]] = value; });
      if (patch.date) patch.date = dateOnly(patch.date, true);
      await restRequest('transactions', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: patch });
      return json({ message: 'Movimiento actualizado' });
    }
  }

  if (route === 'fixed-obligations' && request.method === 'GET') return json(await userFixed(userId));
  if (route === 'fixed-obligations' && request.method === 'POST') {
    const amount = nonNegativeNumber(body.amount, false);
    const dueDay = Number(body.dueDay);
    if (!String(body.name || '').trim() || amount === null || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return json({ error: 'Nombre, monto y día de vencimiento son válidos y requeridos' }, 400);
    }
    const id = body.id || `fix_${Date.now()}`;
    await restRequest('fixed_obligations', { method: 'POST', returning: true, body: { id, user_id: userId, name: body.name, amount, due_day: dueDay, category: body.category, status: body.status || 'pending', paid_date: dateOnly(body.paidDate), reminder_days_before: body.reminderDaysBefore ?? 3, is_automatic: Boolean(body.isAutomatic), notes: body.notes || '' } });
    return json({ id, message: 'Nuevo gasto fijo agregado' });
  }

  const fixedMatch = route.match(/^fixed-obligations\/([^/]+)(?:\/(toggle))?$/);
  if (fixedMatch) {
    const id = decodeURIComponent(fixedMatch[1]);
    if (fixedMatch[2] === 'toggle' && request.method === 'POST') {
      const rows = await restRequest('fixed_obligations', { params: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } });
      if (!rows?.length) return json({ error: 'Obligación no encontrada' }, 404);
      const paid = rows[0].status !== 'paid';
      if (paid) {
        const amount = number(rows[0].amount);
        const availableCash = await availableCashForUser(userId);
        if (amount > availableCash) {
          return json({ error: `Saldo insuficiente. Disponible: $${availableCash.toLocaleString('es-CO')} COP` }, 400);
        }
      }
      await restRequest('fixed_obligations', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: { status: paid ? 'paid' : 'pending', paid_date: paid ? dateOnly(null, true) : null } });
      let transactionId = null;
      if (paid) {
        const linked = await restRequest('transactions', { params: { fixed_obligation_id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } });
        if (linked?.length) {
          transactionId = linked[0].id;
        } else {
          transactionId = `tx_fix_${id}_${Date.now()}`;
          await addTransaction(userId, { id: transactionId, type: 'gasto', amount: number(rows[0].amount), category: rows[0].category, description: `${rows[0].name} (Gasto Fijo)`, date: dateOnly(null, true), time: new Date().toTimeString().slice(0, 8), accountMethod: 'Fijo Mensual', isRecurring: true, fixedObligationId: id });
        }
      } else {
        await restRequest('transactions', { method: 'DELETE', params: { fixed_obligation_id: `eq.${id}`, user_id: `eq.${userId}` } });
      }
      return json({ result: { status: paid ? 'paid' : 'pending', isPaid: paid, transactionId }, message: paid ? 'Marcado como pagado e integrado a gastos.' : 'Gasto fijo desmarcado (vuelve a pendiente).' });
    }
    if (request.method === 'DELETE') {
      await restRequest('transactions', { method: 'DELETE', params: { fixed_obligation_id: `eq.${id}`, user_id: `eq.${userId}` } });
      await restRequest('fixed_obligations', { method: 'DELETE', params: { id: `eq.${id}`, user_id: `eq.${userId}` } });
      return json({ message: 'Obligación eliminada' });
    }
    if (request.method === 'PUT') {
      const fieldMap = { name: 'name', amount: 'amount', dueDay: 'due_day', category: 'category', status: 'status', paidDate: 'paid_date', reminderDaysBefore: 'reminder_days_before', isAutomatic: 'is_automatic', notes: 'notes' };
      const patch = {};
      Object.entries(body).forEach(([key, value]) => { if (fieldMap[key]) patch[fieldMap[key]] = value; });
      if (patch.paid_date) patch.paid_date = dateOnly(patch.paid_date);
      await restRequest('fixed_obligations', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: patch });
      return json({ message: 'Compromiso recurrente actualizado' });
    }
  }

  if (route === 'savings-goals' && request.method === 'GET') return json(await userGoals(userId));
  if (route === 'savings-goals' && request.method === 'POST') {
    const imageUrl = String(body.imageUrl || '');
    if (imageUrl.startsWith('data:') && imageUrl.length > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH) return json({ error: 'La imagen es demasiado grande. Elige una imagen más pequeña' }, 400);
    const targetAmount = nonNegativeNumber(body.targetAmount, false);
    if (!String(body.name || '').trim() || targetAmount === null) return json({ error: 'El nombre y el valor objetivo de la meta son requeridos' }, 400);
    const deadline = dateOnly(body.deadline);
    if (body.deadline && !deadline) return json({ error: 'La fecha límite no es válida' }, 400);
    if (deadline && isPastGoalMonth(deadline)) return json({ error: 'La fecha límite debe ser el mes actual o un mes futuro' }, 400);
    const id = body.id || `goal_${Date.now()}`;
    await restRequest('savings_goals', { method: 'POST', returning: true, body: { id, user_id: userId, name: body.name, target_amount: targetAmount, current_amount: 0, deadline, icon: body.icon || 'laptop', color: body.color || '#0058bc', category: body.category || '', image_url: body.imageUrl || '' } });
    return json({ id, message: `Meta "${body.name}" creada con éxito` });
  }

  const goalMatch = route.match(/^savings-goals\/([^/]+)(?:\/(contribute))?$/);
  if (goalMatch) {
    const id = decodeURIComponent(goalMatch[1]);
    if (goalMatch[2] === 'contribute' && request.method === 'POST') {
      const amount = nonNegativeNumber(body.amount, false);
      if (amount === null) return json({ error: 'El monto debe ser mayor a 0' }, 400);
      const availableCash = await availableCashForUser(userId);
      if (amount > availableCash) {
        return json({ error: `No tienes suficiente dinero disponible. Te quedan $${availableCash.toLocaleString('es-CO')} COP` }, 400);
      }
      const [rows, contributionRows] = await Promise.all([
        restRequest('savings_goals', { params: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } }),
        restRequest('goal_contributions', { params: { goal_id: `eq.${id}`, user_id: `eq.${userId}`, select: 'amount' } }),
      ]);
      if (!rows?.length) return json({ error: 'Meta no encontrada' }, 404);
      const contributedAmount = (contributionRows || []).reduce((sum, row) => sum + number(row.amount), 0);
      const newAmount = contributedAmount + amount;
      await restRequest('savings_goals', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: { current_amount: newAmount } });
      const contributionId = `contrib_${Date.now()}`;
      await restRequest('goal_contributions', { method: 'POST', returning: true, body: { id: contributionId, user_id: userId, goal_id: id, goal_name: rows[0].name, amount, date: dateOnly(null, true), type: body.type || 'Manual', timestamp: Date.now() } });
      return json({ result: { goalId: id, newAmount, contributionId }, message: `¡Has reservado $${amount.toLocaleString('es-CO')} COP para tu meta!` });
    }
    if (request.method === 'DELETE') {
      await restRequest('goal_contributions', { method: 'DELETE', params: { goal_id: `eq.${id}`, user_id: `eq.${userId}` } });
      await restRequest('savings_goals', { method: 'DELETE', params: { id: `eq.${id}`, user_id: `eq.${userId}` } });
      return json({ message: 'Meta de ahorro eliminada' });
    }
    if (request.method === 'PUT') {
      const imageUrl = String(body.imageUrl || '');
      if (imageUrl.startsWith('data:') && imageUrl.length > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH) return json({ error: 'La imagen es demasiado grande. Elige una imagen más pequeña' }, 400);
      const fieldMap = { name: 'name', targetAmount: 'target_amount', deadline: 'deadline', icon: 'icon', color: 'color', category: 'category', imageUrl: 'image_url' };
      const patch = {};
      Object.entries(body).forEach(([key, value]) => { if (fieldMap[key]) patch[fieldMap[key]] = value; });
      if (Object.prototype.hasOwnProperty.call(body, 'deadline')) {
        const deadline = dateOnly(body.deadline);
        if (body.deadline && !deadline) return json({ error: 'La fecha límite no es válida' }, 400);
        if (deadline && isPastGoalMonth(deadline)) return json({ error: 'La fecha límite debe ser el mes actual o un mes futuro' }, 400);
        patch.deadline = deadline;
      }
      await restRequest('savings_goals', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: patch });
      return json({ message: 'Meta actualizada' });
    }
  }

  if (route === 'goal-contributions' && request.method === 'GET') return json(await userContributions(userId));
  if (route === 'category-budgets' && request.method === 'GET') return json(await userBudgets(userId));
  if (route === 'category-budgets' && request.method === 'PUT') {
    const category = String(body.category || '').trim();
    const limit = nonNegativeNumber(body.limit);
    if (!category || limit === null) return json({ error: 'La categoría y el límite deben ser válidos' }, 400);
    await restRequest('category_budgets', { method: 'PATCH', params: { user_id: `eq.${userId}`, category: `eq.${category}` }, body: { limit_amount: limit } });
    return json({ message: `Presupuesto para ${category} actualizado` });
  }

  return json({ error: 'Ruta no encontrada' }, 404);
}

export default async function handler(request) {
  try {
    requireConfig();
    if (request.method === 'OPTIONS') return json({ ok: true });
    const pathname = new URL(request.url).pathname;
    const marker = pathname.indexOf('/api/');
    const route = marker >= 0 ? pathname.slice(marker + 5).replace(/\/$/, '') : '';

    if (route === 'health' && request.method === 'GET') return json({ status: 'ok', app: 'MiPlata Netlify Function', version: '1.0.0', supabase: true });
    if (route === 'config' && request.method === 'GET') return json({ supabase: true, url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY });
    if (route.startsWith('auth/')) return await handleAuth(route, request);

    const user = await authenticate(request);
    if (!user) return json({ error: 'No autorizado' }, 401);
    return await handleProtected(route, request, user);
  } catch (error) {
    console.error('MiPlata API error', error);
    return json({ error: error instanceof SupabaseError ? error.message : 'Error interno del servidor' }, error.status || 500);
  }
}
