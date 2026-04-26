'use strict';

if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

const workerLogic = {
  fetch: async (request, env) => {
    const requestUrl = new URL(request.url);

    if (
      requestUrl.pathname === '/api/contact' &&
      (request.method === 'POST' || request.method === 'OPTIONS')
    ) {
      return new Response('contact endpoint', { status: 200 });
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'API route not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Method not allowed.', { status: 405 });
  },
};

describe('Cloudflare Worker API + asset routing', () => {
  beforeEach(() => {
    global.Headers = class {
      constructor(init) {
        this.map = new Map();
        if (init) {
          Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
        }
      }
      set(k, v) { this.map.set(k.toLowerCase(), v); }
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
      async json() { return JSON.parse(this.body); }
    };
  });

  test('handles POST /api/contact', async () => {
    const request = new Request('https://rmarston.com/api/contact', { method: 'POST' });
    const response = await workerLogic.fetch(request, {});

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('contact endpoint');
  });

  test('falls through to static assets for website pages', async () => {
    const request = new Request('https://rmarston.com/');
    const env = {
      ASSETS: {
        fetch: async () => new Response('<html>portfolio</html>', { status: 200 }),
      },
    };

    const response = await workerLogic.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('portfolio');
  });

  test('returns 404 JSON for unknown API routes', async () => {
    const request = new Request('https://rmarston.com/api/missing');
    const response = await workerLogic.fetch(request, {});

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found.' });
  });
});
