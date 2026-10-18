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
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.session?.access_token) return false;
        saveSession(data.session);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, options = {}, retry = true) {
  const headers = { ...getHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && path !== '/api/auth/refresh') {
    const refreshed = await refreshSession();
    if (refreshed) return request(path, options, false);
    clearSession();
  }
  return res;
}

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
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
    if (!readSession()?.access_token) {
      clearSession();
      return null;
    }
    const res = await request('/api/bootstrap');
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(await readError(res, 'No se pudo cargar la aplicación'));
    const data = await res.json();
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

  async getCurrentUser() {
    if (!readSession()?.access_token) {
      clearSession();
      return null;
    }
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
    return data;
  },

  async login(email, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
    if (!res.ok) throw new Error(await readError(res, 'Credenciales incorrectas'));
    const data = await res.json();
    storeAuthResponse(data);
    return data;
  },

  async register(name, email, password, monthlySalary, avatarUrl) {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, monthlySalary, avatarUrl }),
    }, false);
    if (res.status === 409) {
      throw new Error('Este correo ya está registrado. Inicia sesión o usa otro correo.');
    }
    if (!res.ok) throw new Error(await readError(res, 'Error al crear cuenta'));
    const data = await res.json();
    storeAuthResponse(data);
    return data;
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
    const res = await request('/api/user/profile', { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar perfil'));
    const data = await res.json();
    if (data.user) localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    return data;
  },

  async updateInitialBalance(newBalance) {
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
    const res = await request('/api/user/reset', { method: 'POST' });
    if (!res.ok) throw new Error(await readError(res, 'Error al reiniciar datos'));
    return res.json();
  },

  async deleteAccount() {
    const res = await request('/api/user', { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar cuenta'));
    clearSession();
    return res.json();
  },

  // Transactions
  async getTransactions() {
    const res = await request('/api/transactions');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener movimientos'));
    return res.json();
  },

  async addTransaction(tx) {
    const res = await request('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
    if (!res.ok) throw new Error(await readError(res, 'Error al registrar movimiento'));
    return res.json();
  },

  async updateTransaction(id, updates) {
    const res = await request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar movimiento'));
    return res.json();
  },

  // Fixed obligations
  async getFixedObligations() {
    const res = await request('/api/fixed-obligations');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener fijos'));
    return res.json();
  },

  async addFixedObligation(item) {
    const res = await request('/api/fixed-obligations', { method: 'POST', body: JSON.stringify(item) });
    if (!res.ok) throw new Error(await readError(res, 'Error al agregar fijo'));
    return res.json();
  },

  async updateFixedObligation(id, updates) {
    const res = await request(`/api/fixed-obligations/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar fijo'));
    return res.json();
  },

  async deleteFixedObligation(id) {
    const res = await request(`/api/fixed-obligations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar fijo'));
    return res.json();
  },

  async togglePayFixedObligation(id) {
    const res = await request(`/api/fixed-obligations/${id}/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error(await readError(res, 'Error al cambiar estado de pago'));
    return res.json();
  },

  // Savings goals
  async getSavingsGoals() {
    const res = await request('/api/savings-goals');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener metas'));
    return res.json();
  },

  async addSavingsGoal(goal) {
    const res = await request('/api/savings-goals', { method: 'POST', body: JSON.stringify(goal) });
    if (!res.ok) throw new Error(await readError(res, 'Error al crear meta'));
    return res.json();
  },

  async updateSavingsGoal(id, updates) {
    const res = await request(`/api/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar meta'));
    return res.json();
  },

  async deleteSavingsGoal(id) {
    const res = await request(`/api/savings-goals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res, 'Error al eliminar meta'));
    return res.json();
  },

  async contributeToGoal(goalId, amount, type = 'Manual') {
    const res = await request(`/api/savings-goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, type }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Error al registrar aporte'));
    return res.json();
  },

  async getGoalContributions() {
    const res = await request('/api/goal-contributions');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener aportes'));
    return res.json();
  },

  // Category budgets
  async getCategoryBudgets() {
    const res = await request('/api/category-budgets');
    if (!res.ok) throw new Error(await readError(res, 'Error al obtener presupuestos'));
    return res.json();
  },

  async updateCategoryBudget(category, limit) {
    const res = await request('/api/category-budgets', {
      method: 'PUT',
      body: JSON.stringify({ category, limit }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Error al actualizar presupuesto'));
    return res.json();
  },
};
