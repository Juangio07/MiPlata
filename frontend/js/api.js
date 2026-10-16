/**
 * MiPlata API Client
 * Interfaces with Python Flask backend with local cache resilience
 */

const API_BASE = ''; // Same-origin relative path

function getHeaders() {
  const currentUserId = localStorage.getItem('miplata_current_user_id');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (currentUserId) {
    headers['X-User-Id'] = currentUserId;
  }
  return headers;
}

export const api = {
  async getCurrentUser() {
    try {
      const res = await fetch(`${API_BASE}/api/user`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('miplata_current_user_id', data.user.id);
      }
      return data.user;
    } catch (e) {
      console.warn('API get user failed, checking localStorage fallback', e);
      const local = localStorage.getItem('miplata_user_cache');
      return local ? JSON.parse(local) : null;
    }
  },

  async loginDemo() {
    const res = await fetch(`${API_BASE}/api/auth/demo`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al iniciar demo');
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_current_user_id', data.user.id);
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Credenciales incorrectas');
    }
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_current_user_id', data.user.id);
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    return data;
  },

  async register(name, email, password, monthlySalary, avatarUrl) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, monthlySalary, avatarUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear cuenta');
    }
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_current_user_id', data.user.id);
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (e) {
      console.warn('Logout error', e);
    }
    localStorage.removeItem('miplata_current_user_id');
    localStorage.removeItem('miplata_user_cache');
  },

  async updateProfile(updates) {
    const res = await fetch(`${API_BASE}/api/user/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar perfil');
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    return data;
  },

  async updateInitialBalance(newBalance) {
    const res = await fetch(`${API_BASE}/api/user/balance`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ initialBalance: newBalance }),
    });
    if (!res.ok) throw new Error('Error al actualizar saldo');
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('miplata_user_cache', JSON.stringify(data.user));
    }
    return data;
  },

  async resetUserData() {
    const res = await fetch(`${API_BASE}/api/user/reset`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al reiniciar datos');
    return res.json();
  },

  async deleteAccount() {
    const res = await fetch(`${API_BASE}/api/user`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar cuenta');
    localStorage.removeItem('miplata_current_user_id');
    localStorage.removeItem('miplata_user_cache');
    return res.json();
  },

  // Transactions
  async getTransactions() {
    const res = await fetch(`${API_BASE}/api/transactions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener movimientos');
    return res.json();
  },

  async addTransaction(tx) {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error('Error al registrar movimiento');
    return res.json();
  },

  async updateTransaction(id, updates) {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar movimiento');
    return res.json();
  },

  async deleteTransaction(id) {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar movimiento');
    return res.json();
  },

  // Fixed Obligations
  async getFixedObligations() {
    const res = await fetch(`${API_BASE}/api/fixed-obligations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener fijos');
    return res.json();
  },

  async addFixedObligation(item) {
    const res = await fetch(`${API_BASE}/api/fixed-obligations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Error al agregar fijo');
    return res.json();
  },

  async updateFixedObligation(id, updates) {
    const res = await fetch(`${API_BASE}/api/fixed-obligations/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar fijo');
    return res.json();
  },

  async deleteFixedObligation(id) {
    const res = await fetch(`${API_BASE}/api/fixed-obligations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar fijo');
    return res.json();
  },

  async togglePayFixedObligation(id) {
    const res = await fetch(`${API_BASE}/api/fixed-obligations/${id}/toggle`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al cambiar estado de pago');
    return res.json();
  },

  // Savings Goals
  async getSavingsGoals() {
    const res = await fetch(`${API_BASE}/api/savings-goals`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener metas');
    return res.json();
  },

  async addSavingsGoal(goal) {
    const res = await fetch(`${API_BASE}/api/savings-goals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Error al crear meta');
    return res.json();
  },

  async updateSavingsGoal(id, updates) {
    const res = await fetch(`${API_BASE}/api/savings-goals/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar meta');
    return res.json();
  },

  async deleteSavingsGoal(id) {
    const res = await fetch(`${API_BASE}/api/savings-goals/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al eliminar meta');
    return res.json();
  },

  async contributeToGoal(goalId, amount, type = 'Manual') {
    const res = await fetch(`${API_BASE}/api/savings-goals/${goalId}/contribute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, type }),
    });
    if (!res.ok) throw new Error('Error al registrar aporte');
    return res.json();
  },

  async getGoalContributions() {
    const res = await fetch(`${API_BASE}/api/goal-contributions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener aportes');
    return res.json();
  },

  // Category Budgets
  async getCategoryBudgets() {
    const res = await fetch(`${API_BASE}/api/category-budgets`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener presupuestos');
    return res.json();
  },

  async updateCategoryBudget(category, limit) {
    const res = await fetch(`${API_BASE}/api/category-budgets`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ category, limit }),
    });
    if (!res.ok) throw new Error('Error al actualizar presupuesto');
    return res.json();
  },
};
