// Keep the demo entry point responsive without changing the login workflow.
// The backend handles the expensive seed only once; this layer prevents
// accidental double clicks from starting concurrent demo sessions.
(() => {
  const buttonId = 'btn-login-demo';
  const sessionKey = 'miplata_supabase_session';
  const demoSeedKey = 'miplata_demo_seed_cache_v1';
  const demoSessionKey = 'miplata_demo_session_cache_v1';
  let demoRequestActive = false;

  const readStorage = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_error) {
      return null;
    }
  };

  const cacheVerifiedDemoResponse = (response) => {
    response.clone().json().then((data) => {
      if (!data?.bootstrap?.user || !data?.session?.access_token) return;
      try {
        localStorage.setItem(demoSeedKey, JSON.stringify(data.bootstrap));
        localStorage.setItem(demoSessionKey, JSON.stringify(data.session));
        localStorage.setItem(sessionKey, JSON.stringify(data.session));
      } catch (_error) {
        // Keep the live login working if browser storage is unavailable.
      }
    }).catch(() => {});
  };

  const createCachedDemoResponse = () => {
    const bootstrap = readStorage(demoSeedKey);
    const session = readStorage(demoSessionKey);
    if (!bootstrap?.user || !session?.access_token) return null;

    return new Response(JSON.stringify({
      user: bootstrap.user,
      session,
      ...session,
      message: 'Sesión de demostración iniciada',
      bootstrap,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const setButtonState = (active) => {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (active) {
      if (!button.dataset.demoOriginalLabel) {
        const label = button.querySelector('span');
        button.dataset.demoOriginalLabel = label?.textContent || '';
      }
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.classList.add('opacity-70', 'cursor-wait');
      const label = button.querySelector('span');
      if (label) label.textContent = 'Cargando demo…';
      return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.classList.remove('opacity-70', 'cursor-wait');
    const label = button.querySelector('span');
    if (label && button.dataset.demoOriginalLabel) {
      label.textContent = button.dataset.demoOriginalLabel;
    }
    delete button.dataset.demoOriginalLabel;
  };

  // Capture phase runs before the button's onclick handler, so a second tap
  // cannot enqueue another Supabase authentication request.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest(`#${buttonId}`)
      : null;
    if (!target) return;

    if (demoRequestActive) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    demoRequestActive = true;
    setButtonState(true);
  }, true);

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.href,
    );
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const isDemoLogin = method === 'POST' && url.pathname === '/api/auth/demo';
    const isRegularLogin = method === 'POST' && url.pathname === '/api/auth/login';
    if (isRegularLogin) {
      // The shared API error helper treats every 401 as an expired session.
      // Login is the exception: show a useful credentials/account message.
      return originalFetch(input, init).then(async (response) => {
        if (response.status !== 401) return response;
        const body = await response.clone().json().catch(() => ({}));
        return new Response(JSON.stringify({
          ...body,
          error: 'Correo o contraseña incorrectos.',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      });
    }
    if (!isDemoLogin) return originalFetch(input, init);

    demoRequestActive = true;
    setButtonState(true);

    const cachedResponse = createCachedDemoResponse();
    if (cachedResponse) {
      // A verified demo session is enough for the session-only demo runtime.
      // Refresh the real Supabase session in the background for reports and
      // other authenticated reads, without making the user wait for it.
      void originalFetch(input, init)
        .then(cacheVerifiedDemoResponse)
        .catch(() => {});
      return Promise.resolve(cachedResponse).finally(() => {
        demoRequestActive = false;
        setButtonState(false);
      });
    }

    return originalFetch(input, init).then((response) => {
      cacheVerifiedDemoResponse(response);
      return response;
    }).finally(() => {
      demoRequestActive = false;
      setButtonState(false);
    });
  };
})();
