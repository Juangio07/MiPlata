/**
 * MiPlata API Client
 *
 * The browser keeps only the Supabase session tokens. The Flask backend
 * validates the access token on every request and derives the user id from it;
 * no user id supplied by the browser is trusted.
 */

const API_BASE = '';
const SESSION_KEY = 'miplata_supabase_session';
const BOOTSTRAP_CACHE_KEY = 'miplata_bootstrap_cache';
export const DEMO_EMAIL = 'demo@miplata.app';
const API_TIMEOUT_MS = 15000;
const GET_RETRY_DELAY_MS = 250;
const AUTH_NETWORK_RETRY_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/demo',
]);
const SESSION_EXPIRY_SKEW_SECONDS = 45;
const MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH = 600000;
const inFlightMutations = new Map();

function validateImagePayload(payload) {
  const imageUrl = String(payload?.imageUrl || '');
  if (imageUrl.startsWith('data:') && imageUrl.length > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH) {
    throw new Error('La imagen es demasiado grande. Elige una imagen más pequeña');
  }
}

function isNetworkFailure(error) {
  if (error?.code === 'MIPLATA_NETWORK_ERROR') return true;
  const message = String(error?.message || '');
  return error instanceof TypeError
    || /failed to fetch|networkerror|load failed/i.test(message);
}

function createNetworkError() {
  const error = new Error(
    'No se pudo conectar con MiPlata. Verifica que el servidor esté activo e inténtalo de nuevo.',
  );
  error.code = 'MIPLATA_NETWORK_ERROR';
  return error;
}

function normalizeNetworkError(error) {
  if (error?.name === 'AbortError') {
    return new Error('El servidor tardó demasiado en responder. Intenta nuevamente.');
  }
  return isNetworkFailure(error) ? createNetworkError() : error;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    throw normalizeNetworkError(error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// Demo changes are intentionally session-only. The demo account is shared as
// a read-only seed in Supabase, while each browser gets its own in-memory copy
// that disappears when the page is reloaded or the session is closed.
let demoRuntime = null;

export function isDemoUser(user) {
  return String(user?.email || '').trim().toLowerCase() === DEMO_EMAIL
    || String(user?.name || '').trim().toLowerCase() === 'fixelar';
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function readCachedBootstrap() {
  try {
    return JSON.parse(localStorage.getItem(BOOTSTRAP_CACHE_KEY) || 'null');
  } catch (_error) {
    return null;
  }
}

function hasActiveDemoSession() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('miplata_user_cache') || 'null');
    return String(currentUser?.email || '').trim().toLowerCase() === DEMO_EMAIL;
  } catch (_error) {
    return false;
  }
}

function syncDemoGoalAmounts(goals, contributions) {
  const totals = new Map();
  (contributions || []).forEach((contribution) => {
    const goalId = String(contribution?.goalId || '');
    if (!goalId) return;
    totals.set(goalId, (totals.get(goalId) || 0) + (Number(contribution.amount) || 0));
  });
  return (goals || []).map((goal) => ({
    ...goal,
    currentAmount: totals.get(String(goal.id)) || 0,
  }));
}

function createDemoId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function demoToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDemoAvailableCash() {
  if (!isDemoRuntimeActive()) return 0;
  const income = demoRuntime.transactions
    .filter((transaction) => transaction.type === 'ingreso')
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
  const expenses = demoRuntime.transactions
    .filter((transaction) => transaction.type === 'gasto')
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
  const contributions = demoRuntime.goalContributions
    .filter((contribution) => String(contribution.date || '').startsWith(demoToday().slice(0, 7)))
    .reduce((total, contribution) => total + (Number(contribution.amount) || 0), 0);
  return Math.max(0, income - expenses - contributions);
}

function activateDemoRuntime(data) {
  if (!data?.user || !isDemoUser(data.user)) {
    demoRuntime = null;
    return null;
  }

  const goalContributions = clone(data.goalContributions || []);
  demoRuntime = {
    isDemo: true,
    user: clone(data.user),
    transactions: clone(data.transactions || []),
    fixedObligations: clone(data.fixedObligations || []),
    // The backend already calculates this from the complete contribution
    // history; only current-month movements are sent in the bootstrap.
    savingsGoals: clone(data.savingsGoals || []),
    goalContributions,
    categoryBudgets: clone(data.categoryBudgets || []),
    availableMonths: clone(data.availableMonths || []),
  };
  return demoRuntime;
}

function isDemoRuntimeActive() {
  if (!demoRuntime) {
    const cachedBootstrap = readCachedBootstrap();
    if (cachedBootstrap?.user && isDemoUser(cachedBootstrap.user)) activateDemoRuntime(cachedBootstrap);
  }
  return Boolean(demoRuntime?.isDemo);
}

function getDemoBootstrap() {
  if (!isDemoRuntimeActive()) return null;
  return clone({
    user: demoRuntime.user,
    transactions: demoRuntime.transactions,
    fixedObligations: demoRuntime.fixedObligations,
    savingsGoals: demoRuntime.savingsGoals,
    goalContributions: demoRuntime.goalContributions,
    categoryBudgets: demoRuntime.categoryBudgets,
    availableMonths: demoRuntime.availableMonths,
  });
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function saveSession(session) {
  if (!session?.access_token) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('miplata_current_user_id');
  localStorage.removeItem('miplata_user_cache');
  localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
  demoRuntime = null;
}

function getHeaders() {
  const session = readSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

let refreshPromise = null;

async function refreshSession() {
  const session = readSession();
  if (!session?.refresh_token) return false;
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.session?.access_token) return false;
        // Supabase normally rotates the refresh token, but keeping the old
        // one as a fallback prevents a valid session from becoming unusable
        // when a response omits that field.
        saveSession({ ...session, ...data.session });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function sessionNeedsRefresh(session) {
  const expiresAt = Number(session?.expires_at || 0);
  if (!expiresAt) return false;
  return expiresAt <= Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SKEW_SECONDS;
}

function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent('miplata:auth-expired'));
}

async function request(path, options = {}, retry = true, networkAttempt = 0) {
  const method = String(options.method || 'GET').toUpperCase();
  const lockKey = retry && method !== 'GET' && method !== 'HEAD'
    ? `${method}:${path}:${options.body || ''}`
    : '';
  if (lockKey && inFlightMutations.has(lockKey)) return inFlightMutations.get(lockKey);

  const execute = async () => {
    try {
      const session = readSession();
      if (retry && session?.access_token && sessionNeedsRefresh(session)) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          clearSession();
          notifySessionExpired();
          return new Response(JSON.stringify({ error: 'Tu sesión expiró. Ingresa nuevamente.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      const requestHeaders = { ...getHeaders(), ...(options.headers || {}) };
      const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers: requestHeaders });
      if (res.status === 401 && retry && path !== '/api/auth/refresh') {
        const refreshed = await refreshSession();
        if (refreshed) {
          const retryResponse = await request(path, options, false);
          if (retryResponse.status !== 401) return retryResponse;
        }
        clearSession();
        notifySessionExpired();
      }
      return res;
    } catch (error) {
      const normalizedError = normalizeNetworkError(error);
      if (
        networkAttempt === 0
        && AUTH_NETWORK_RETRY_PATHS.has(path)
        && isNetworkFailure(normalizedError)
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, GET_RETRY_DELAY_MS));
        return request(path, options, retry, 1);
      }
      if (retry && method === 'GET' && networkAttempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, GET_RETRY_DELAY_MS));
        return request(path, options, false, 1);
      }
      throw normalizedError;
    }
  };

  const promise = execute();
  if (!lockKey) return promise;
  inFlightMutations.set(lockKey, promise);
  try {
    return await promise;
  } finally {
    if (inFlightMutations.get(lockKey) === promise) inFlightMutations.delete(lockKey);
  }
}

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return 'Tu sesión expiró. Ingresa nuevamente para continuar.';
  return data.error || fallback;
}

function storeAuthResponse(data) {
  if (data?.session?.access_token) saveSession(data.session);
  if (data?.user?.id) {
    try {
      const cached = JSON.parse(localStorage.getItem(BOOTSTRAP_CACHE_KEY) || 'null');
      if (cached?.user?.id && cached.user.id !== data.user.id) {
        localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
      }
    } catch (_error) {
      localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    }
    localStorage.setItem('miplata_current_user_id', data.user.id);
    localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
  }
}

export const api = {
  async getBootstrap() {
    const cachedDemo = readCachedBootstrap();
    if (!readSession()?.access_token) {
      clearSession();
      return null;
    }
    const demoData = getDemoBootstrap();
    if (demoData) return demoData;

    // The demo account is intentionally session-only. When the page is
    // reloaded, restore its seed from the last verified bootstrap instead of
    // sending demo mutations to the backend while the local server is
    // unavailable or the demo token has expired. A normal account never
    // enters this branch because its cached user is not the demo account.
    if (hasActiveDemoSession() && cachedDemo?.user && isDemoUser(cachedDemo.user)) {
      const restoredDemo = activateDemoRuntime(cachedDemo);
      if (restoredDemo) return getDemoBootstrap();
    }

    const res = await request('/api/bootstrap');
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(await readError(res, 'No se pudo cargar la aplicación'));
    const data = await res.json();
    if (isDemoUser(data.user)) activateDemoRuntime(data);
    if (data.user) {
      localStorage.setItem('miplata_current_user_id', data.user.id);
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    try {
      localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(data));
    } catch (_error) {
      // Keep the live response working even when browser storage is full.
    }
    return data;
  },

  async getMonthlyReport(monthKey) {
    const res = await request(`/api/reports/monthly?month=${encodeURIComponent(monthKey)}`);
    if (!res.ok) throw new Error(await readError(res, 'No se pudo cargar el reporte mensual'));
    return res.json();
  },

  async getCurrentUser() {
    if (!readSession()?.access_token) {
      clearSession();
      return null;
    }
    if (isDemoRuntimeActive()) return clone(demoRuntime.user);
    try {
      const res = await request('/api/user');
      if (res.status === 401) return null;
      if (!res.ok) throw new Error('No se pudo consultar el usuario');
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('miplata_current_user_id', data.user.id);
        localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
      }
      return data.user;
    } catch (error) {
      console.warn('API get user failed', error);
      return null;
    }
  },

  async loginDemo() {
    const res = await request('/api/auth/demo', { method: 'POST' }, false);
    if (!res.ok) throw new Error(await readError(res, 'Error al iniciar demo'));
    const data = await res.json();
    storeAuthResponse(data);
    if (data.bootstrap) activateDemoRuntime(data.bootstrap);
    return data;
  },

  async login(email, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      throw new Error(await readError(res, 'Credenciales incorrectas'));
    }
    const data = await res.json();
    demoRuntime = null;
    storeAuthResponse(data);
    const cached = readCachedBootstrap();
    if (cached?.user?.id && cached.user.id === data?.user?.id) {
      data.bootstrap = cached;
    }
    return data;
  },

  async register(name, email, password, monthlySalary, avatarUrl) {
    validateImagePayload({ imageUrl: avatarUrl });
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, monthlySalary, avatarUrl }),
    }, false);
    if (res.status === 409) {
      throw new Error('Correo ya registrado.');
    }
    if (!res.ok) throw new Error(await readError(res, 'Error al crear cuenta'));
    const data = await res.json();
    demoRuntime = null;
    storeAuthResponse(data);
    return data;
  },

  async requestPasswordReset(email, redirectTo) {
    const res = await request('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email, redirectTo }),
    });
    if (!res.ok) throw new Error(await readError(res, 'No se pudo enviar el enlace de recuperación'));
    return res.json();
  },

  async confirmPasswordReset(accessToken, password) {
    const res = await request('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ accessToken, password }),
    });
    if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar la contraseña'));
    return res.json();
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' }, false);
    } catch (error) {
      console.warn('Logout error', error);
    }
    clearSession();
  },

  async updateProfile(updates) {
    validateImagePayload(updates);
    if (isDemoRuntimeActive()) {
      demoRuntime.user = { ...demoRuntime.user, ...clone(updates) };
      if (updates.budgetRule) {
        demoRuntime.user.budgetRule = {
          ...(demoRuntime.user.budgetRule || {}),
          ...clone(updates.budgetRule),
        };
      }
      return { user: clone(demoRuntime.user), message: 'Perfil actualizado' };
    }
    const res = await request('/api/user/profile', { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar perfil'));
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
      // Profile mutations must not be overwritten by the previous bootstrap
      // snapshot when refreshAllData loads the updated state.
      localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    }
    return data;
  },

  async updateInitialBalance(newBalance) {
    if (isDemoRuntimeActive()) {
      demoRuntime.user.initialBalance = Number(newBalance) || 0;
      return { user: clone(demoRuntime.user), message: 'Saldo disponible base actualizado' };
    }
    const res = await request('/api/user/balance', {
      method: 'PUT',
      body: JSON.stringify({ initialBalance: newBalance }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar saldo'));
    const data = await res.json();
    if (data.user) localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    return data;
  },

  async resetUserData() {
    if (isDemoRuntimeActive()) {
      return { message: 'Los datos demo se restauran al recargar la página' };
    }
    const res = await request('/api/user/reset', { method: 'POST' });
    if (!res.ok) throw new Error(await readError(res, 'Error al reiniciar datos'));
    return res.json();
  },

  async deleteAccount() {
    if (isDemoRuntimeActive()) {
      return { protected: true, message: 'La cuenta demo está protegida y no se puede eliminar' };
    }
    const res = await request('/api/user', { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar cuenta'));
    clearSession();
    return res.json();
  },

  // Transactions
  async getTransactions() {
    if (isDemoRuntimeActive()) return clone(demoRuntime.transactions);
    const res = await request('/api/transactions');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener movimientos'));
    return res.json();
  },

  async addTransaction(tx) {
    if (isDemoRuntimeActive()) {
      const id = tx.id || createDemoId('tx_demo');
      demoRuntime.transactions.push({
        ...clone(tx),
        id,
        userId: demoRuntime.user.id,
        createdAt: tx.createdAt || Date.now(),
      });
      return { id, message: 'Movimiento registrado con éxito' };
    }
    const res = await request('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
    if (!res.ok) throw new Error(await readError(res, 'Error al registrar movimiento'));
    return res.json();
  },

  async updateTransaction(id, updates) {
    if (isDemoRuntimeActive()) {
      const transaction = demoRuntime.transactions.find((item) => item.id === id);
      if (transaction) Object.assign(transaction, clone(updates));
      return { message: 'Movimiento actualizado' };
    }
    const res = await request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar movimiento'));
    return res.json();
  },

  // Fixed obligations
  async getFixedObligations() {
    if (isDemoRuntimeActive()) return clone(demoRuntime.fixedObligations);
    const res = await request('/api/fixed-obligations');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener fijos'));
    return res.json();
  },

  async addFixedObligation(item) {
    if (isDemoRuntimeActive()) {
      const id = item.id || createDemoId('fix_demo');
      demoRuntime.fixedObligations.push({
        ...clone(item),
        id,
        userId: demoRuntime.user.id,
        paidDate: item.paidDate || null,
      });
      return { id, message: 'Nuevo gasto fijo agregado' };
    }
    const res = await request('/api/fixed-obligations', { method: 'POST', body: JSON.stringify(item) });
    if (!res.ok) throw new Error(await readError(res, 'Error al agregar fijo'));
    return res.json();
  },

  async updateFixedObligation(id, updates) {
    if (isDemoRuntimeActive()) {
      const obligation = demoRuntime.fixedObligations.find((item) => item.id === id);
      if (obligation) Object.assign(obligation, clone(updates));
      return { message: 'Compromiso recurrente actualizado' };
    }
    const res = await request(`/api/fixed-obligations/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar fijo'));
    return res.json();
  },

  async deleteFixedObligation(id) {
    if (isDemoRuntimeActive()) {
      demoRuntime.fixedObligations = demoRuntime.fixedObligations.filter((item) => item.id !== id);
      demoRuntime.transactions = demoRuntime.transactions.filter((item) => item.fixedObligationId !== id);
      return { message: 'Obligación eliminada' };
    }
    const res = await request(`/api/fixed-obligations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar fijo'));
    return res.json();
  },

  async togglePayFixedObligation(id) {
    if (isDemoRuntimeActive()) {
      const obligation = demoRuntime.fixedObligations.find((item) => item.id === id);
      if (!obligation) throw new Error('Obligación no encontrada');
      const isPaid = obligation.status !== 'paid';
      const availableCash = getDemoAvailableCash();
      if (isPaid && Number(obligation.amount) > availableCash) {
        throw new Error(`No tienes suficiente dinero disponible para pagar este gasto fijo. Te quedan $${availableCash.toLocaleString('es-CO')} COP`);
      }
      obligation.status = isPaid ? 'paid' : 'pending';
      obligation.paidDate = isPaid ? demoToday() : null;
      const linked = demoRuntime.transactions.some((item) => item.fixedObligationId === id);
      let transactionId = demoRuntime.transactions.find((item) => item.fixedObligationId === id)?.id || null;
      if (isPaid && !linked) {
        transactionId = createDemoId(`tx_fix_${id}`);
        demoRuntime.transactions.push({
          id: transactionId,
          userId: demoRuntime.user.id,
          type: 'gasto',
          amount: Number(obligation.amount) || 0,
          category: obligation.category,
          description: `${obligation.name} (Gasto Fijo)`,
          date: demoToday(),
          time: new Date().toTimeString().slice(0, 8),
          accountMethod: 'Fijo Mensual',
          isRecurring: true,
          fixedObligationId: id,
          createdAt: Date.now(),
        });
      } else if (!isPaid) {
        demoRuntime.transactions = demoRuntime.transactions.filter((item) => item.fixedObligationId !== id);
      }
      return {
        result: { status: obligation.status, isPaid, transactionId },
        message: isPaid ? 'Marcado como pagado e integrado a gastos.' : 'Gasto fijo desmarcado (vuelve a pendiente).',
      };
    }
    const res = await request(`/api/fixed-obligations/${id}/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error(await readError(res, 'Error al cambiar estado de pago'));
    return res.json();
  },

  // Savings goals
  async getSavingsGoals() {
    if (isDemoRuntimeActive()) return clone(demoRuntime.savingsGoals);
    const res = await request('/api/savings-goals');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener metas'));
    return res.json();
  },

  async addSavingsGoal(goal) {
    validateImagePayload(goal);
    if (isDemoRuntimeActive()) {
      const id = goal.id || createDemoId('goal_demo');
      demoRuntime.savingsGoals.push({
        ...clone(goal),
        id,
        userId: demoRuntime.user.id,
        currentAmount: 0,
        imageUrl: goal.imageUrl || '',
      });
      return { id, message: `Meta "${goal.name}" creada con éxito` };
    }
    const res = await request('/api/savings-goals', { method: 'POST', body: JSON.stringify(goal) });
    if (!res.ok) throw new Error(await readError(res, 'Error al crear meta'));
    return res.json();
  },

  async updateSavingsGoal(id, updates) {
    validateImagePayload(updates);
    if (isDemoRuntimeActive()) {
      const goal = demoRuntime.savingsGoals.find((item) => item.id === id);
      if (goal) {
        const safeUpdates = { ...clone(updates) };
        delete safeUpdates.currentAmount;
        Object.assign(goal, safeUpdates);
      }
      return { message: 'Meta actualizada' };
    }
    const res = await request(`/api/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar meta'));
    return res.json();
  },

  async deleteSavingsGoal(id) {
    if (isDemoRuntimeActive()) {
      demoRuntime.savingsGoals = demoRuntime.savingsGoals.filter((item) => item.id !== id);
      demoRuntime.goalContributions = demoRuntime.goalContributions.filter((item) => item.goalId !== id);
      return { message: 'Meta de ahorro eliminada' };
    }
    const res = await request(`/api/savings-goals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar meta'));
    return res.json();
  },

  async contributeToGoal(goalId, amount, type = 'Manual') {
    if (isDemoRuntimeActive()) {
      const goal = demoRuntime.savingsGoals.find((item) => item.id === goalId);
      if (!goal) throw new Error('Meta no encontrada');
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      const availableCash = getDemoAvailableCash();
      if (numericAmount > availableCash) {
        throw new Error(`No tienes suficiente dinero disponible. Te quedan $${availableCash.toLocaleString('es-CO')} COP`);
      }
      const contributedAmount = demoRuntime.goalContributions
        .filter((contribution) => contribution.goalId === goalId)
        .reduce((total, contribution) => total + (Number(contribution.amount) || 0), 0);
      const newAmount = contributedAmount + numericAmount;
      goal.currentAmount = newAmount;
      const contributionId = createDemoId('contrib_demo');
      demoRuntime.goalContributions.unshift({
        id: contributionId,
        userId: demoRuntime.user.id,
        goalId,
        goalName: goal.name,
        amount: numericAmount,
        date: demoToday(),
        type,
        timestamp: Date.now(),
      });
      return {
        result: { goalId, newAmount, contributionId },
        message: `¡Has reservado $${Number(amount || 0).toLocaleString('es-CO')} COP para tu meta!`,
      };
    }
    const res = await request(`/api/savings-goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, type }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Error al registrar aporte'));
    return res.json();
  },

  async getGoalContributions() {
    if (isDemoRuntimeActive()) return clone(demoRuntime.goalContributions);
    const res = await request('/api/goal-contributions');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener aportes'));
    return res.json();
  },

  // Category budgets
  async getCategoryBudgets() {
    if (isDemoRuntimeActive()) return clone(demoRuntime.categoryBudgets);
    const res = await request('/api/category-budgets');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener presupuestos'));
    return res.json();
  },

  async updateCategoryBudget(category, limit) {
    if (isDemoRuntimeActive()) {
      const budget = demoRuntime.categoryBudgets.find((item) => item.category === category);
      if (budget) budget.limit = Number(limit) || 0;
      return { message: `Presupuesto para ${category} actualizado` };
    }
    const res = await request('/api/category-budgets', {
      method: 'PUT',
      body: JSON.stringify({ category, limit }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar presupuesto'));
    return res.json();
  },
};
