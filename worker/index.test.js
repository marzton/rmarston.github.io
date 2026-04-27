'use strict';

const worker = require('./index');

if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

global.Headers = class {
  constructor(init) {
    this.map = new Map();
    if (init) {
      if (init instanceof Map) {
        init.forEach((v, k) => this.map.set(k.toLowerCase(), v));
      } else {
        Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
      }
    }
  }
  set(k, v) { this.map.set(k.toLowerCase(), v); }
  get(k) { return this.map.get(k.toLowerCase()); }
  has(k) { return this.map.has(k.toLowerCase()); }
};

global.FormData = class {
  constructor() {
    this.data = new Map();
  }
  append(k, v) { this.data.set(k, v); }
  get(k) { return this.data.get(k); }
};

global.Request = class {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new global.Headers(options.headers);
    this.body = options.body;
  }
  async formData() {
    if (this.body instanceof global.FormData) {
      return this.body;
    }
    throw new Error('Not form data');
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

global.TextEncoder = class {
  encode(str) {
    return Buffer.from(str);
  }
};

global.ReadableStream = class {
  constructor(opts) {
    this.opts = opts;
  }
};

describe('Cloudflare Worker API + asset routing', () => {
  test('handles POST /api/contact with valid data', async () => {
    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'test@example.com');
    formData.append('subject', 'Hello');
    formData.append('message', 'This is a test message');

    const request = new Request('https://rmarston.com/api/contact', {
      method: 'POST',
      body: formData
    });

    const env = {
      CONTACT_FROM_EMAIL: 'sender@example.com',
      CONTACT_TO_EMAIL: 'receiver@example.com',
      SEND_EMAIL: {
        send: jest.fn().mockResolvedValue(undefined)
      }
    };

    const response = await worker.default.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    const json = await response.json();
    expect(json).toEqual({ success: true });
    expect(env.SEND_EMAIL.send).toHaveBeenCalled();
  });

  test('returns 422 for invalid email address', async () => {
    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'invalid-email');
    formData.append('subject', 'Hello');
    formData.append('message', 'This is a test message');

    const request = new Request('https://rmarston.com/api/contact', {
      method: 'POST',
      body: formData
    });

    const response = await worker.default.fetch(request, {});

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Invalid email address.' });
  });

  test('falls through to static assets for website pages', async () => {
    const request = new Request('https://rmarston.com/');
    const env = {
      ASSETS: {
        fetch: async () => new Response('<html>portfolio</html>', { status: 200 }),
      },
    };

    const response = await worker.default.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('portfolio');
  });

  test('returns 404 JSON for unknown API routes', async () => {
    const request = new Request('https://rmarston.com/api/missing');
    const response = await worker.default.fetch(request, {});

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found.' });
  });
});
