'use strict';

if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

const workerLogic = {
  getRedirectStatus: (value) => {
    const parsed = Number(value);
    if (parsed === 301 || parsed === 302 || parsed === 307 || parsed === 308) {
      return parsed;
    }
    return 301;
  },
  fetch: async (request, env) => {
    const requestUrl = new URL(request.url);
    const primaryDomain = env.PRIMARY_DOMAIN ? env.PRIMARY_DOMAIN.trim().toLowerCase() : undefined;
    const redirectStatus = workerLogic.getRedirectStatus(env.REDIRECT_MODE);

    if (!primaryDomain) {
      return new Response('Missing required worker configuration.', { status: 500 });
    }

    const hostname = requestUrl.hostname.toLowerCase();

    if (hostname !== primaryDomain) {
      const redirectUrl = new URL(request.url);
      redirectUrl.protocol = 'https:';
      redirectUrl.hostname = primaryDomain;
      redirectUrl.port = '';
      return Response.redirect(redirectUrl.toString(), redirectStatus);
    }

    return new Response('Not Found', { status: 404 });
  },
};

describe('Cloudflare Worker', () => {
  describe('getRedirectStatus', () => {
    test('returns correct status for valid inputs', () => {
      expect(workerLogic.getRedirectStatus('301')).toBe(301);
      expect(workerLogic.getRedirectStatus('302')).toBe(302);
      expect(workerLogic.getRedirectStatus('307')).toBe(307);
      expect(workerLogic.getRedirectStatus('308')).toBe(308);
    });

    test('returns default 301 for invalid or missing inputs', () => {
      expect(workerLogic.getRedirectStatus('303')).toBe(301);
      expect(workerLogic.getRedirectStatus('random')).toBe(301);
      expect(workerLogic.getRedirectStatus(undefined)).toBe(301);
    });
  });

  describe('fetch', () => {
    let env;

    beforeEach(() => {
      env = {
        PRIMARY_DOMAIN: 'example.com',
      };

      global.Headers = class {
        constructor(init) {
          this.map = new Map();
          if (init) {
            Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
          }
        }
        get(k) { return this.map.get(k.toLowerCase()); }
      };

      global.Request = class {
        constructor(url, options = {}) {
          this.url = url;
          this.method = options.method || 'GET';
          this.headers = new global.Headers(options.headers);
        }
      };

      global.Response = class {
        constructor(body, options = {}) {
          this.body = body;
          this.status = options.status || 200;
          this.headers = new global.Headers(options.headers);
        }
        async text() { return this.body; }
        static redirect(url, status) {
          const headers = { Location: url };
          return new Response(null, { status, headers });
        }
      };
    });

    test('returns 500 if PRIMARY_DOMAIN configuration is missing', async () => {
      const request = new Request('https://example.com');
      const response = await workerLogic.fetch(request, {});
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Missing required worker configuration.');
    });

    test('redirects if hostname does not match PRIMARY_DOMAIN', async () => {
      const request = new Request('https://other.com/path?query=1');
      const response = await workerLogic.fetch(request, env);
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('https://example.com/path?query=1');
    });

    test('uses custom redirect status from env', async () => {
      env.REDIRECT_MODE = '302';
      const request = new Request('https://other.com');
      const response = await workerLogic.fetch(request, env);
      expect(response.status).toBe(302);
    });

    test('returns 404 when request is already on PRIMARY_DOMAIN', async () => {
      const request = new Request('https://example.com/any-path');
      const response = await workerLogic.fetch(request, env);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });
  });
});
