const worker = require('./index').default;

describe('CORS Security Fix', () => {
  const env = {
    ASSETS: {
      fetch: jest.fn(),
    },
    CONTACT_FROM_EMAIL: 'test@example.com',
    CONTACT_TO_EMAIL: 'admin@example.com',
  };

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
        this.body = options.body;
      }
      async formData() {
        return this.body;
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

    global.FormData = class {
      constructor() {
        this.data = new Map();
      }
      append(k, v) {
        this.data.set(k, v);
      }
      get(k) {
        return this.data.get(k);
      }
    };
  });

  test('should have restricted Access-Control-Allow-Origin header', async () => {
    const request = new Request('https://rmarston.com/api/contact', {
      method: 'OPTIONS',
    });

    const response = await worker.fetch(request, env);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://rmarston.com');
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });

  test('POST /api/contact should also have restricted CORS headers', async () => {
    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'test@example.com');
    formData.append('subject', 'general');
    formData.append('message', 'Hello world');

    const request = new Request('https://rmarston.com/api/contact', {
      method: 'POST',
      body: formData,
    });

    const response = await worker.fetch(request, env);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://rmarston.com');
  });
});
