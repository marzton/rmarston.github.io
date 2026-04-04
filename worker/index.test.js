'use strict';

const workerModule = require('./index.ts');
const worker = workerModule.default;
const { getRedirectStatus, buildUpstreamUrl } = workerModule;

describe('worker exports', () => {
  test('getRedirectStatus only accepts allowed redirect codes', () => {
    expect(getRedirectStatus('301')).toBe(301);
    expect(getRedirectStatus('302')).toBe(302);
    expect(getRedirectStatus('307')).toBe(307);
    expect(getRedirectStatus('308')).toBe(308);

    expect(getRedirectStatus('303')).toBe(301);
    expect(getRedirectStatus(undefined)).toBe(301);
  });

  test('buildUpstreamUrl merges origin path and search', () => {
    expect(
      buildUpstreamUrl('https://backend.example/', '/v1/users', '?id=123').toString(),
    ).toBe('https://backend.example/v1/users?id=123');
  });
});

describe('worker default.fetch', () => {
  const baseEnv = {
    BACKEND_UPSTREAM: 'https://backend.internal',
    PRIMARY_DOMAIN: 'example.com',
  };

  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Upstream response', { status: 200 }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 500 when required config is missing', async () => {
    const response = await worker.fetch(new Request('https://example.com/path'), {
      BACKEND_UPSTREAM: '',
      PRIMARY_DOMAIN: '',
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Missing required worker configuration.');
  });

  test('redirects non-primary host to primary host using configured status', async () => {
    const response = await worker.fetch(new Request('http://www.example.org/path?a=1'), {
      ...baseEnv,
      REDIRECT_MODE: '307',
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/path?a=1');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('strips hop-by-hop and sensitive headers before upstream request', async () => {
    await worker.fetch(
      new Request('https://example.com/proxy', {
        method: 'GET',
        headers: {
          connection: 'keep-alive, x-remove-me',
          'keep-alive': 'timeout=5',
          'transfer-encoding': 'chunked',
          'x-remove-me': '1',
          authorization: 'Bearer abc',
          cookie: 'session=secret',
          'x-keep': 'safe',
        },
      }),
      baseEnv,
    );

    const upstreamReq = globalThis.fetch.mock.calls[0][0];

    expect(upstreamReq.headers.get('authorization')).toBeNull();
    expect(upstreamReq.headers.get('cookie')).toBeNull();
    expect(upstreamReq.headers.get('keep-alive')).toBeNull();
    expect(upstreamReq.headers.get('x-remove-me')).toBeNull();
    expect(upstreamReq.headers.get('transfer-encoding')).toBeNull();

    expect(upstreamReq.headers.get('x-keep')).toBe('safe');
    expect(upstreamReq.headers.get('host')).toBe('backend.internal');
    expect(upstreamReq.headers.get('x-forwarded-host')).toBe('example.com');
    expect(upstreamReq.headers.get('x-forwarded-proto')).toBe('https');
  });

  test('/api/contact handles CORS preflight', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', { method: 'OPTIONS' }),
      baseEnv,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
  });

  test('/api/contact returns success and sends email', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const env = {
      ...baseEnv,
      SEND_EMAIL: { send },
      CONTACT_FROM_EMAIL: 'from@example.com',
      CONTACT_TO_EMAIL: 'to@example.com',
    };

    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          name: 'Test User',
          email: 'test@example.com',
          company: 'Acme',
          subject: 'support',
          message: 'hello',
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(send).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('/api/contact returns failure when email send errors', async () => {
    const env = {
      ...baseEnv,
      SEND_EMAIL: { send: jest.fn().mockRejectedValue(new Error('boom')) },
    };

    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'support',
          message: 'hello',
        }),
      }),
      env,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to send email.' });
  });

  test('/api/contact rejects unparseable form body', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Broken' }),
      }),
      baseEnv,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid form data.' });
  });
});
