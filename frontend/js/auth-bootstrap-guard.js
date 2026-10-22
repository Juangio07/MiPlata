// Prevent a previously verified demo snapshot from being reused by a normal
// account during login. The active bundle also keeps a bootstrap cache for a
// fast first render, so invalidate it as soon as the authenticated account is
// known to be different from the demo account.
(() => {
  const demoEmail = 'demo@miplata.app';
  const demoSeedKey = 'miplata_demo_seed_cache_v1';
  const demoSessionKey = 'miplata_demo_session_cache_v1';
  const sessionKey = 'miplata_supabase_session';
  const bootstrapCacheKey = 'miplata_bootstrap_cache';
  let freshlyLoadedBootstrapUntil = 0;
  let loginFlowActive = false;

  const showLoginLoading = () => {
    let overlay = document.getElementById('auth-data-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-data-loading-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
          <div style="width:34px;height:34px;border:3px solid #d8e6ff;border-top-color:#0058bc;border-radius:999px;animation:miplata-auth-spin .8s linear infinite"></div>
          <strong style="font-size:15px;color:#0b1c30">Cargando tus datos…</strong>
          <span style="font-size:12px;color:#6b7c93">Espera un momento para ingresar</span>
        </div>`;
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(248,249,255,.96);font-family:Inter,system-ui,sans-serif';
      const style = document.createElement('style');
      style.textContent = '@keyframes miplata-auth-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  };

  const hideLoginLoading = () => {
    loginFlowActive = false;
    document.getElementById('auth-data-loading-overlay')?.remove();
  };

  const readUser = () => {
    try {
      return JSON.parse(localStorage.getItem('miplata_user_cache') || 'null');
    } catch (_error) {
      return null;
    }
  };

  const isDemoUser = (user) => String(user?.email || '').trim().toLowerCase() === demoEmail;

  const clearDemoSnapshots = (preserveUserId = '') => {
    const cachedBootstrap = readJson(bootstrapCacheKey);
    const keepOwnBootstrap = preserveUserId
      && String(cachedBootstrap?.user?.id || '') === String(preserveUserId)
      && !isDemoUser(cachedBootstrap.user);
    if (!keepOwnBootstrap) localStorage.removeItem(bootstrapCacheKey);
    localStorage.removeItem(demoSeedKey);
    localStorage.removeItem(demoSessionKey);
  };

  const readJson = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_error) {
      return null;
    }
  };

  const hasUsableSession = () => {
    const session = readJson(sessionKey);
    const expiresAt = Number(session?.expires_at || 0);
    return Boolean(session?.access_token)
      && (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 10);
  };

  const readOwnBootstrap = () => {
    const user = readUser();
    const bootstrap = readJson(bootstrapCacheKey);
    if (!hasUsableSession() || !user?.id || isDemoUser(user)) return null;
    if (String(bootstrap?.user?.id || '') !== String(user.id)) return null;
    if (!Array.isArray(bootstrap.transactions)
      || !Array.isArray(bootstrap.fixedObligations)
      || !Array.isArray(bootstrap.savingsGoals)) return null;
    return bootstrap;
  };

  const cacheBootstrapResponse = async (response, expectedUserId) => {
    if (!response?.ok) return;
    const payload = await response.clone().json().catch(() => null);
    if (String(payload?.user?.id || '') !== String(expectedUserId || '')) return;
    try {
      localStorage.setItem(bootstrapCacheKey, JSON.stringify(payload));
      freshlyLoadedBootstrapUntil = Date.now() + 5000;
    } catch (_error) {
      // Keep the network response working when storage is unavailable.
    }
  };

  const failedBootstrapResponse = () => new Response(JSON.stringify({
    error: 'No se pudieron cargar tus datos. Intenta nuevamente.',
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

  const storedUser = readUser();
  const storedUserId = String(localStorage.getItem('miplata_current_user_id') || '');
  let cachedBootstrap = null;
  try {
    cachedBootstrap = JSON.parse(localStorage.getItem('miplata_bootstrap_cache') || 'null');
  } catch (_error) {
    cachedBootstrap = null;
  }
  const cacheBelongsToAnotherUser = storedUserId
    && cachedBootstrap?.user?.id
    && storedUserId !== String(cachedBootstrap.user.id);
  if (storedUser && !isDemoUser(storedUser)) clearDemoSnapshots(storedUser.id);
  if (cacheBelongsToAnotherUser) clearDemoSnapshots();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.href,
    );
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    if (method === 'GET' && url.pathname === '/api/bootstrap') {
      const cachedBootstrap = readOwnBootstrap();
      if (cachedBootstrap) {
        const expectedUserId = cachedBootstrap.user.id;
        // Refresh without delaying the first paint. The next navigation or
        // reload receives the fresh response from this background request.
        if (Date.now() >= freshlyLoadedBootstrapUntil) {
          void originalFetch(input, init)
            .then((response) => cacheBootstrapResponse(response, expectedUserId))
            .catch(() => {});
        }
        if (loginFlowActive) window.setTimeout(hideLoginLoading, 0);
        return new Response(JSON.stringify(cachedBootstrap), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const isLoginRequest = method === 'POST' && url.pathname === '/api/auth/login';
    if (isLoginRequest) {
      loginFlowActive = true;
      showLoginLoading();
    }

    let response;
    try {
      response = await originalFetch(input, init);
    } catch (error) {
      if (isLoginRequest) hideLoginLoading();
      throw error;
    }

    if (method === 'GET' && url.pathname === '/api/bootstrap' && loginFlowActive && response.ok) {
      window.setTimeout(hideLoginLoading, 0);
    }

    if (method === 'POST' && url.pathname === '/api/auth/login' && response.ok) {
      const body = await response.clone().json().catch(() => ({}));
      if (body?.user && !isDemoUser(body.user)) {
        clearDemoSnapshots(body.user.id);
        const accessToken = body?.session?.access_token || body?.access_token || '';
        if (!accessToken) {
          hideLoginLoading();
          return response;
        }

        try {
          // Keep the normal account on the access screen until its first
          // complete bootstrap is available. This prevents a blank or stale
          // dashboard from appearing between authentication and data load.
          const bootstrapResponse = await originalFetch('/api/bootstrap', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!bootstrapResponse.ok) {
            hideLoginLoading();
            return failedBootstrapResponse();
          }

          const bootstrap = await bootstrapResponse.clone().json().catch(() => null);
          if (!bootstrap || (bootstrap.user?.id && String(bootstrap.user.id) !== String(body.user.id))) {
            hideLoginLoading();
            return failedBootstrapResponse();
          }
          const completeBootstrap = { ...bootstrap, user: bootstrap.user || body.user };
          try {
            localStorage.setItem(bootstrapCacheKey, JSON.stringify(completeBootstrap));
            freshlyLoadedBootstrapUntil = Date.now() + 5000;
          } catch (_error) {
            // The login response remains valid even when storage is unavailable.
          }
          return new Response(JSON.stringify({ ...body, bootstrap: completeBootstrap }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (_error) {
          hideLoginLoading();
          return failedBootstrapResponse();
        }
      }
      hideLoginLoading();
    } else if (isLoginRequest && !response.ok) {
      hideLoginLoading();
    }
    return response;
  };
})();
