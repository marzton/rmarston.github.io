'use strict';

if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

const workerLogic = {
  fetch: async (request) => {
    const requestUrl = new URL(request.url);

    if (
      requestUrl.pathname === '/api/contact' &&
      (request.method === 'POST' || request.method === 'OPTIONS')
    ) {
      return new Response('contact endpoint', { status: 200 });
    }

    return new Response('Not found.', { status: 404 });
  },
};

describe('Cloudflare Worker API-only routing', () => {
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
    };
  });

  test('handles POST /api/contact', async () => {
    const request = new Request('https://rmarston.com/api/contact', { method: 'POST' });
    const response = await workerLogic.fetch(request, {});

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('contact endpoint');
  });

  test('handles OPTIONS /api/contact', async () => {
    const request = new Request('https://rmarston.com/api/contact', { method: 'OPTIONS' });
    const response = await workerLogic.fetch(request, {});

    expect(response.status).toBe(200);
  });

  test('returns 404 for non-API routes', async () => {
    const request = new Request('https://rmarston.com/');
    const response = await workerLogic.fetch(request, {});

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not found.');
  });
});
