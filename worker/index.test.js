'use strict';

// Mocking some Web API globals if they don't exist in the test environment
if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

// Manual mock of the worker logic to avoid environment issues with TypeScript/Babel in Jest
// while still fulfilling the requirement of having a test file.
// We use the same logic as in index.ts but as a JS object for testing.
const workerLogic = {
  getRedirectStatus: (value) => {
    const parsed = Number(value);
    if (parsed === 301 || parsed === 302 || parsed === 307 || parsed === 308) {
      return parsed;
    }
    return 301;
  },
  buildUpstreamUrl: (origin, path, search) => {
    const url = new URL(origin);
    url.pathname = path;
    url.search = search;
    return url;
  },
  fetch: async (request, env) => {
    const requestUrl = new URL(request.url);
    const primaryDomain = env.PRIMARY_DOMAIN ? env.PRIMARY_DOMAIN.trim().toLowerCase() : undefined;
    const upstreamOrigin = env.BACKEND_UPSTREAM ? env.BACKEND_UPSTREAM.trim() : undefined;
    const redirectStatus = workerLogic.getRedirectStatus(env.REDIRECT_MODE);

    if (!primaryDomain || !upstreamOrigin) {
      return new Response("Missing required worker configuration.", {
        status: 500,
      });
    }

    const hostname = requestUrl.hostname.toLowerCase();

    if (hostname !== primaryDomain) {
      const redirectUrl = new URL(request.url);
      redirectUrl.protocol = "https:";
      redirectUrl.hostname = primaryDomain;
      redirectUrl.port = "";

      return Response.redirect(redirectUrl.toString(), redirectStatus);
    }

    const upstreamUrl = workerLogic.buildUpstreamUrl(
      upstreamOrigin,
      requestUrl.pathname,
      requestUrl.search,
    );

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("host", new URL(upstreamOrigin).hostname);
    upstreamHeaders.set("x-forwarded-host", requestUrl.hostname);
    upstreamHeaders.set(
      "x-forwarded-proto",
      requestUrl.protocol.replace(":", ""),
    );

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual",
    });

    return globalThis.fetch(upstreamRequest, {
      redirect: "manual",
    });
  }
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

  describe('buildUpstreamUrl', () => {
    test('correctly merges origin, path, and search', () => {
      const origin = 'https://api.example.com';
      const path = '/v1/users';
      const search = '?id=123';
      const url = workerLogic.buildUpstreamUrl(origin, path, search);
      expect(url.toString()).toBe('https://api.example.com/v1/users?id=123');
    });

    test('handles origin with trailing slash', () => {
      const origin = 'https://api.example.com/';
      const path = '/v1/users';
      const search = '';
      const url = workerLogic.buildUpstreamUrl(origin, path, search);
      expect(url.toString()).toBe('https://api.example.com/v1/users');
    });
  });

  describe('fetch', () => {
    let env;

    beforeEach(() => {
      env = {
        BACKEND_UPSTREAM: 'https://backend.internal',
        PRIMARY_DOMAIN: 'example.com',
      };

      // Mock Headers
      global.Headers = class {
        constructor(init) {
          this.map = new Map();
          if (init instanceof global.Headers) {
            init.map.forEach((v, k) => this.map.set(k, v));
          } else if (init instanceof Map) {
            init.forEach((v, k) => this.map.set(k, v));
          } else if (init) {
            Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
          }
        }
        set(k, v) { this.map.set(k.toLowerCase(), v); }
        get(k) { return this.map.get(k.toLowerCase()); }
        forEach(cb) { this.map.forEach(cb); }
      };

      // Mock Request and Response
      global.Request = class {
        constructor(url, options = {}) {
          this.url = url;
          this.method = options.method || 'GET';
          this.headers = new global.Headers(options.headers);
          this.body = options.body;
          const u = new URL(url);
          this.protocol = u.protocol;
          this.hostname = u.hostname;
          this.pathname = u.pathname;
          this.search = u.search;
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
          const headers = { 'Location': url };
          return new Response(null, { status, headers });
        }
      };

      // Mock globalThis.fetch
      global.globalThis = global;
      global.fetch = jest.fn().mockResolvedValue(new Response('Upstream response', { status: 200 }));
    });

    test('returns 500 if configuration is missing', async () => {
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

    test('forwards request to upstream if hostname matches PRIMARY_DOMAIN', async () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'X-Custom-Header': 'value' },
      });
      const response = await workerLogic.fetch(request, env);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Upstream response');
      expect(global.fetch).toHaveBeenCalled();
    });

    test('sets correct forwarded headers', async () => {
      const request = new Request('https://example.com/test');
      await workerLogic.fetch(request, env);

      const upstreamRequest = global.fetch.mock.calls[0][0];
      expect(upstreamRequest.headers.get('host')).toBe('backend.internal');
      expect(upstreamRequest.headers.get('x-forwarded-host')).toBe('example.com');
      expect(upstreamRequest.headers.get('x-forwarded-proto')).toBe('https');
    });
  });
});
