// Keep local/API network failures consistent across the source modules and
// the production bundle. Only authentication requests are retried here;
// retrying a financial write could create a duplicate record.
(() => {
  const originalFetch = window.fetch.bind(window);
  const AUTH_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/demo',
  ]);
  const RETRY_DELAY_MS = 350;

  const isNetworkFailure = (error) => {
    const message = String(error?.message || '');
    return error instanceof TypeError
      || /failed to fetch|networkerror|load failed/i.test(message);
  };

  const createNetworkError = () => {
    const error = new Error(
      'No se pudo conectar con MiPlata. Verifica que el servidor esté activo e inténtalo de nuevo.',
    );
    error.code = 'MIPLATA_NETWORK_ERROR';
    return error;
  };

  window.fetch = async (input, init = {}) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.href,
    );
    const method = String(
      init.method || (input instanceof Request ? input.method : 'GET'),
    ).toUpperCase();
    const isApiRequest = url.origin === window.location.origin
      && url.pathname.startsWith('/api/');
    const canRetry = isApiRequest && method === 'POST' && AUTH_PATHS.has(url.pathname)
      && !(input instanceof Request);

    try {
      return await originalFetch(input, init);
    } catch (error) {
      if (canRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
        try {
          return await originalFetch(input, init);
        } catch (retryError) {
          if (isNetworkFailure(retryError)) throw createNetworkError();
          throw retryError;
        }
      }
      if (isNetworkFailure(error)) throw createNetworkError();
      throw error;
    }
  };
})();
