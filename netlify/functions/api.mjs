const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

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
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
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

function monthLabel(key) {
  const [year, month] = String(key || monthKey()).split('-');
  return `${MONTHS[(Number(month) || 1) - 1] || month} ${year}`;
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
  const [profiles, transactions, goals] = await Promise.all([
    restRequest('profiles', {
      params: { id: `eq.${userId}`, limit: '1' },
      select: 'initial_balance',
    }),
    restRequest('transactions', {
      params: { user_id: `eq.${userId}` },
      select: 'type,amount,date',
    }),
    restRequest('savings_goals', {
      params: { user_id: `eq.${userId}` },
      select: 'current_amount',
    }),
  ]);

  const currentMonth = monthKey();
  const totalIncome = (transactions || [])
    .filter((transaction) => transaction.type === 'ingreso' && String(transaction.date || '').startsWith(currentMonth))
    .reduce((sum, transaction) => sum + number(transaction.amount), 0);
  const totalExpenses = (transactions || [])
    .filter((transaction) => transaction.type === 'gasto' && String(transaction.date || '').startsWith(currentMonth))
    .reduce((sum, transaction) => sum + number(transaction.amount), 0);
  const totalSavings = (goals || [])
    .reduce((sum, goal) => sum + number(goal.current_amount), 0);
  const initialBalance = number(profiles?.[0]?.initial_balance);

  return Math.max(0, initialBalance + totalIncome - totalExpenses - totalSavings);
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
  ['Transporte', 250000, 'directions_car'],
  ['Entretenimiento', 300000, 'sports_esports'],
  ['Salud', 200000, 'medical_services'],
  ['Compras', 350000, 'shopping_bag'],
  ['Servicios', 250000, 'bolt'],
  ['Educación', 200000, 'school'],
  ['Otros', 150000, 'more_horiz'],
];

async function ensureUserDefaults(userId, name, email, monthlySalary = null, avatarUrl = '') {
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

async function initializeRegisteredUser(userId, name, email, salary, avatarUrl) {
  const profile = await ensureUserDefaults(userId, name, email, salary, avatarUrl);
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
  const transactions = await restRequest('transactions', { params: { user_id: `eq.${userId}` } });
  const fixed = await restRequest('fixed_obligations', { params: { user_id: `eq.${userId}`, limit: '1' } });
  const goals = await restRequest('savings_goals', { params: { user_id: `eq.${userId}`, limit: '1' } });
  const existingTransactionIds = new Set((transactions || []).map((row) => row.id));

  if (!transactions?.length) {
    await restRequest('transactions', {
      method: 'POST', returning: true, body: [
        { id: 'demo_tx_income', user_id: userId, type: 'ingreso', amount: 5800000, category: 'Nómina', description: 'Nómina mensual', date: demoDate(3), time: '08:30:00', account_method: 'Bancolombia', is_recurring: false, fixed_obligation_id: null },
        { id: 'demo_tx_food', user_id: userId, type: 'gasto', amount: 184500, category: 'Alimentación', description: 'Supermercado de la semana', date: demoDate(1), time: '18:15:00', account_method: 'Tarjeta Débito', is_recurring: false, fixed_obligation_id: null },
        { id: 'demo_tx_transport', user_id: userId, type: 'gasto', amount: 65000, category: 'Transporte', description: 'Gasolina y transporte', date: demoDate(2), time: '17:45:00', account_method: 'Nequi QR', is_recurring: false, fixed_obligation_id: null },
        { id: 'demo_tx_entertainment', user_id: userId, type: 'gasto', amount: 52000, category: 'Entretenimiento', description: 'Cine y salida', date: demoDate(4), time: '20:10:00', account_method: 'Tarjeta Crédito', is_recurring: false, fixed_obligation_id: null },
      ],
    });
  }

  const historicalTransactions = [
    { id: 'demo_tx_previous_1_income_salary', user_id: userId, type: 'ingreso', amount: 2900000, category: 'Nómina', description: 'Nómina primera quincena', date: demoMonthDate(1, 15), time: '08:30:00', account_method: 'Bancolombia', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_income_extra', user_id: userId, type: 'ingreso', amount: 650000, category: 'Honorarios', description: 'Proyecto freelance', date: demoMonthDate(1, 26), time: '16:00:00', account_method: 'Nequi', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_rent', user_id: userId, type: 'gasto', amount: 1200000, category: 'Vivienda', description: 'Arriendo del apartamento', date: demoMonthDate(1, 5), time: '10:00:00', account_method: 'Transferencia Bancaria', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_food', user_id: userId, type: 'gasto', amount: 460000, category: 'Alimentación', description: 'Mercado mensual', date: demoMonthDate(1, 8), time: '17:30:00', account_method: 'Tarjeta Débito', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_services', user_id: userId, type: 'gasto', amount: 263000, category: 'Servicios', description: 'Energía, acueducto e internet', date: demoMonthDate(1, 12), time: '14:15:00', account_method: 'PSE Bancolombia', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_transport', user_id: userId, type: 'gasto', amount: 215000, category: 'Transporte', description: 'Gasolina y estacionamiento', date: demoMonthDate(1, 18), time: '18:30:00', account_method: 'Bancolombia Débito', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_1_leisure', user_id: userId, type: 'gasto', amount: 180000, category: 'Entretenimiento', description: 'Cine y salida de fin de semana', date: demoMonthDate(1, 22), time: '20:45:00', account_method: 'Tarjeta Crédito', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_income_salary', user_id: userId, type: 'ingreso', amount: 2900000, category: 'Nómina', description: 'Nómina mensual', date: demoMonthDate(2, 15), time: '08:30:00', account_method: 'Bancolombia', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_income_extra', user_id: userId, type: 'ingreso', amount: 750000, category: 'Honorarios', description: 'Asesoría independiente', date: demoMonthDate(2, 26), time: '16:00:00', account_method: 'Nequi', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_rent', user_id: userId, type: 'gasto', amount: 1200000, category: 'Vivienda', description: 'Arriendo del apartamento', date: demoMonthDate(2, 5), time: '10:00:00', account_method: 'Transferencia Bancaria', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_food', user_id: userId, type: 'gasto', amount: 680000, category: 'Alimentación', description: 'Mercado y alimentos del hogar', date: demoMonthDate(2, 10), time: '18:00:00', account_method: 'Tarjeta Débito', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_services', user_id: userId, type: 'gasto', amount: 285000, category: 'Servicios', description: 'Servicios públicos e internet', date: demoMonthDate(2, 14), time: '14:30:00', account_method: 'PSE', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_transport', user_id: userId, type: 'gasto', amount: 245000, category: 'Transporte', description: 'Gasolina y mantenimiento', date: demoMonthDate(2, 19), time: '17:15:00', account_method: 'Nequi', is_recurring: false, fixed_obligation_id: null },
    { id: 'demo_tx_previous_2_shopping', user_id: userId, type: 'gasto', amount: 290000, category: 'Compras', description: 'Ropa y artículos para el hogar', date: demoMonthDate(2, 22), time: '16:30:00', account_method: 'Tarjeta Crédito', is_recurring: false, fixed_obligation_id: null },
  ];
  const missingHistorical = historicalTransactions.filter((transaction) => !existingTransactionIds.has(transaction.id));
  if (missingHistorical.length) {
    await restRequest('transactions', { method: 'POST', returning: true, body: missingHistorical });
  }

  if (!fixed?.length) {
    const currentMonth = monthKey();
    await restRequest('fixed_obligations', {
      method: 'POST', returning: true, body: [
        { id: 'demo_fixed_rent', user_id: userId, name: 'Arriendo', amount: 800000, due_day: 5, category: 'Vivienda', status: 'pending', paid_date: null, reminder_days_before: 3, is_automatic: false, notes: 'Pago mensual del apartamento' },
        { id: 'demo_fixed_internet', user_id: userId, name: 'Internet Fibra', amount: 130000, due_day: 8, category: 'Servicios', status: 'paid', paid_date: `${currentMonth}-${String(Math.max(1, new Date().getDate() - 2)).padStart(2, '0')}`, reminder_days_before: 3, is_automatic: true, notes: 'Internet del hogar' },
        { id: 'demo_fixed_services', user_id: userId, name: 'Servicios públicos', amount: 220000, due_day: 15, category: 'Servicios', status: 'paid', paid_date: `${currentMonth}-${String(Math.max(1, new Date().getDate() - 1)).padStart(2, '0')}`, reminder_days_before: 3, is_automatic: false, notes: 'Luz, agua y gas' },
      ],
    });
  }

  if (!goals?.length) {
    await restRequest('savings_goals', {
      method: 'POST', returning: true, body: [
        { id: 'demo_goal_emergency', user_id: userId, name: 'Fondo de Emergencia', target_amount: 4000000, current_amount: 2400000, deadline: `${new Date().getFullYear() + 1}-01-20`, icon: 'shield', color: '#0058bc', category: 'Seguridad', image_url: '' },
        { id: 'demo_goal_laptop', user_id: userId, name: 'MacBook M3 Pro', target_amount: 5000000, current_amount: 3200000, deadline: `${new Date().getFullYear()}-12-20`, icon: 'laptop', color: '#0058bc', category: 'Tecnología', image_url: '' },
      ],
    });
  }

  const contributions = await restRequest('goal_contributions', { params: { user_id: `eq.${userId}`, limit: '1' } });
  if (!contributions?.length) {
    await restRequest('goal_contributions', {
      method: 'POST', returning: true, body: [
        { id: 'demo_contribution_1', user_id: userId, goal_id: 'demo_goal_emergency', goal_name: 'Fondo de Emergencia', amount: 200000, date: demoDate(1), type: 'Automático', timestamp: Date.now() - 3600000 },
        { id: 'demo_contribution_2', user_id: userId, goal_id: 'demo_goal_laptop', goal_name: 'MacBook M3 Pro', amount: 150000, date: demoDate(3), type: 'Manual', timestamp: Date.now() - 7200000 },
      ],
    });
  }
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

async function userTransactions(userId) {
  const rows = await restRequest('transactions', {
    params: { user_id: `eq.${userId}`, order: 'date.desc,created_at.desc' },
    select: 'id,user_id,type,amount,category,description,date,time,account_method,is_recurring,fixed_obligation_id,created_at',
  }) || [];
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, type: row.type, amount: number(row.amount), category: row.category,
    description: row.description, date: String(row.date || '').slice(0, 10), time: row.time || '',
    accountMethod: row.account_method || '', isRecurring: Boolean(row.is_recurring),
    fixedObligationId: row.fixed_obligation_id || null, createdAt: timestamp(row.created_at),
  }));
}

async function userFixed(userId) {
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
  return rows.map((row) => ({
    id: row.id, userId: row.user_id, name: row.name, targetAmount: number(row.target_amount),
    currentAmount: number(row.current_amount), deadline: row.deadline || '', icon: row.icon, color: row.color,
    category: row.category || '', imageUrl: row.image_url || '',
  }));
}

async function userContributions(userId) {
  const rows = await restRequest('goal_contributions', {
    params: { user_id: `eq.${userId}`, order: 'timestamp.desc' },
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

async function userBootstrap(userId) {
  const [profile, transactions, fixedObligations, savingsGoals, goalContributions, categoryBudgets] = await Promise.all([
    getProfile(userId),
    userTransactions(userId),
    userFixed(userId),
    userGoals(userId),
    userContributions(userId),
    userBudgets(userId),
  ]);
  return { user: profile, transactions, fixedObligations, savingsGoals, goalContributions, categoryBudgets };
}

async function deleteUserData(userId) {
  for (const table of ['goal_contributions', 'transactions', 'fixed_obligations', 'savings_goals', 'category_budgets', 'profiles']) {
    await restRequest(table, { method: 'DELETE', params: { [table === 'profiles' ? 'id' : 'user_id']: `eq.${userId}` } });
  }
}

async function handleAuth(route, request) {
  const body = await readBody(request);
  if (route === 'auth/demo' && request.method === 'POST') {
    const email = 'demo@miplata.app';
    const password = 'MiPlataDemo2026!';
    try {
      await authRequest('/admin/users', 'POST', { email, password, email_confirm: true, user_metadata: { name: 'Cuenta de demostración' } }, SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY);
    } catch (error) {
      if (![400, 409, 422].includes(error.status)) throw error;
    }
    const auth = await authRequest('/token?grant_type=password', 'POST', { email, password });
    const user = auth.user || {};
    const profile = await ensureUserDefaults(user.id, 'Cuenta de demostración', email, null, '');
    await ensureDemoData(user.id);
    return json(sessionResponse(auth, profile, 'Sesión de demostración iniciada'));
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

  if (route === 'auth/register' && request.method === 'POST') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!name) return json({ error: 'El nombre es requerido' }, 400);
    if (!email) return json({ error: 'El correo electrónico es requerido' }, 400);
    if (!isValidEmail(email)) return json({ error: 'Ingresa un correo electrónico válido' }, 400);
    if (!password) return json({ error: 'La contraseña es requerida' }, 400);
    if (password.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
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
        return json({ error: 'Este correo ya está registrado. Inicia sesión o usa otro correo.' }, 409);
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

  if (route === 'user' && request.method === 'GET') {
    if ((user.email || '').trim().toLowerCase() === 'demo@miplata.app') await ensureDemoData(userId);
    return json({ user: await getProfile(userId) });
  }

  if (route === 'user/profile' && request.method === 'PUT') {
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
    await deleteUserData(userId);
    await authRequest(`/admin/users/${userId}`, 'DELETE', null, SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY);
    return json({ message: 'Tu cuenta y datos han sido eliminados' });
  }

  if (route === 'transactions' && request.method === 'GET') return json(await userTransactions(userId));
  if (route === 'transactions' && request.method === 'POST') return json({ id: await addTransaction(userId, body), message: 'Movimiento registrado con éxito' });

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
    const id = body.id || `fix_${Date.now()}`;
    await restRequest('fixed_obligations', { method: 'POST', returning: true, body: { id, user_id: userId, name: body.name, amount: body.amount, due_day: body.dueDay, category: body.category, status: body.status || 'pending', paid_date: dateOnly(body.paidDate), reminder_days_before: body.reminderDaysBefore ?? 3, is_automatic: Boolean(body.isAutomatic), notes: body.notes || '' } });
    return json({ id, message: 'Nuevo gasto fijo agregado' });
  }

  const fixedMatch = route.match(/^fixed-obligations\/([^/]+)(?:\/(toggle))?$/);
  if (fixedMatch) {
    const id = decodeURIComponent(fixedMatch[1]);
    if (fixedMatch[2] === 'toggle' && request.method === 'POST') {
      const rows = await restRequest('fixed_obligations', { params: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } });
      if (!rows?.length) return json({ error: 'Obligación no encontrada' }, 404);
      const paid = rows[0].status !== 'paid';
      await restRequest('fixed_obligations', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: { status: paid ? 'paid' : 'pending', paid_date: paid ? dateOnly(null, true) : null } });
      if (paid) {
        const linked = await restRequest('transactions', { params: { fixed_obligation_id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } });
        if (!linked?.length) await addTransaction(userId, { id: `tx_fix_${id}_${Date.now()}`, type: 'gasto', amount: number(rows[0].amount), category: rows[0].category, description: `${rows[0].name} (Gasto Fijo)`, date: dateOnly(null, true), time: new Date().toTimeString().slice(0, 8), accountMethod: 'Fijo Mensual', isRecurring: true, fixedObligationId: id });
      } else {
        await restRequest('transactions', { method: 'DELETE', params: { fixed_obligation_id: `eq.${id}`, user_id: `eq.${userId}` } });
      }
      return json({ result: { status: paid ? 'paid' : 'pending', isPaid: paid }, message: paid ? 'Marcado como pagado e integrado a gastos.' : 'Gasto fijo desmarcado (vuelve a pendiente).' });
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
    const deadline = dateOnly(body.deadline);
    if (body.deadline && !deadline) return json({ error: 'La fecha límite no es válida' }, 400);
    if (deadline && isPastGoalMonth(deadline)) return json({ error: 'La fecha límite debe ser el mes actual o un mes futuro' }, 400);
    const id = body.id || `goal_${Date.now()}`;
    await restRequest('savings_goals', { method: 'POST', returning: true, body: { id, user_id: userId, name: body.name, target_amount: body.targetAmount, current_amount: body.currentAmount || 0, deadline, icon: body.icon || 'laptop', color: body.color || '#0058bc', category: body.category || '', image_url: body.imageUrl || '' } });
    return json({ id, message: `Meta "${body.name}" creada con éxito` });
  }

  const goalMatch = route.match(/^savings-goals\/([^/]+)(?:\/(contribute))?$/);
  if (goalMatch) {
    const id = decodeURIComponent(goalMatch[1]);
    if (goalMatch[2] === 'contribute' && request.method === 'POST') {
      const amount = number(body.amount);
      if (amount <= 0) return json({ error: 'El monto debe ser mayor a 0' }, 400);
      const availableCash = await availableCashForUser(userId);
      if (amount > availableCash) {
        return json({ error: `No tienes suficiente dinero disponible. Te quedan $${availableCash.toLocaleString('es-CO')} COP` }, 400);
      }
      const rows = await restRequest('savings_goals', { params: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: '1' } });
      if (!rows?.length) return json({ error: 'Meta no encontrada' }, 404);
      const newAmount = number(rows[0].current_amount) + amount;
      await restRequest('savings_goals', { method: 'PATCH', params: { id: `eq.${id}`, user_id: `eq.${userId}` }, body: { current_amount: newAmount } });
      const contributionId = `contrib_${Date.now()}`;
      await restRequest('goal_contributions', { method: 'POST', returning: true, body: { id: contributionId, user_id: userId, goal_id: id, goal_name: rows[0].name, amount, date: dateOnly(null, true), type: body.type || 'Manual', timestamp: Date.now() } });
      return json({ result: { goalId: id, newAmount, contributionId }, message: `¡Has reservado $${amount.toLocaleString('es-CO')} COP para tu meta!` });
    }
    if (request.method === 'DELETE') {
      await restRequest('savings_goals', { method: 'DELETE', params: { id: `eq.${id}`, user_id: `eq.${userId}` } });
      return json({ message: 'Meta de ahorro eliminada' });
    }
    if (request.method === 'PUT') {
      const fieldMap = { name: 'name', targetAmount: 'target_amount', currentAmount: 'current_amount', deadline: 'deadline', icon: 'icon', color: 'color', category: 'category', imageUrl: 'image_url' };
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
    await restRequest('category_budgets', { method: 'PATCH', params: { user_id: `eq.${userId}`, category: `eq.${body.category}` }, body: { limit_amount: number(body.limit) } });
    return json({ message: `Presupuesto para ${body.category} actualizado` });
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
