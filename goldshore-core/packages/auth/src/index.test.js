'use strict';

/**
 * Extracts the authenticated email from a validated CF Access JWT.
 */
function getEmailFromJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];
    // Cloudflare uses base64url encoding
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.email ?? null;
  } catch {
    return null;
  }
}

describe('getEmailFromJWT', () => {
  const createJWT = (payload) => {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return `${header}.${payloadB64}.signature`;
  };

  test('extracts email from a valid JWT', () => {
    const email = 'user@example.com';
    const token = createJWT({ email, aud: 'test-aud', exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(getEmailFromJWT(token)).toBe(email);
  });

  test('returns null if email field is missing', () => {
    const token = createJWT({ aud: 'test-aud', exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('returns null for malformed JWT (missing payload)', () => {
    expect(getEmailFromJWT('not.a.jwt')).toBeNull();
    expect(getEmailFromJWT('justheader')).toBeNull();
  });

  test('returns null for invalid base64 in payload', () => {
    const token = 'header.!!!invalid-base64!!!.signature';
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('returns null for invalid JSON in payload', () => {
    const invalidJsonB64 = btoa('{ invalid: json ');
    const token = `header.${invalidJsonB64}.signature`;
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('handles empty string input', () => {
    expect(getEmailFromJWT('')).toBeNull();
  });
});
