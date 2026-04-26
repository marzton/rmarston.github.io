import { getEmailFromJWT } from './index';

describe('getEmailFromJWT', () => {
  const mockB64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '');

  test('extracts email from a valid JWT', () => {
    const payload = { email: 'test@example.com', name: 'Test User' };
    const token = `header.${mockB64(payload)}.signature`;
    expect(getEmailFromJWT(token)).toBe('test@example.com');
  });

  test('returns null if email is missing from payload', () => {
    const payload = { name: 'Test User' };
    const token = `header.${mockB64(payload)}.signature`;
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('returns null for malformed JWT (less than 2 parts)', () => {
    expect(getEmailFromJWT('not-a-jwt')).toBeNull();
  });

  test('returns null for invalid Base64 in payload', () => {
    // In node.js, Buffer.from(..., 'base64') might just ignore invalid characters.
    // But getEmailFromJWT uses atob() which might be more strict.
    // Actually in this environment, it seems it's using a custom atob or node's atob.
    const token = 'header.!!!.signature';
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('returns null for invalid JSON in payload', () => {
    const invalidJsonB64 = Buffer.from('{ invalid json }').toString('base64');
    const token = `header.${invalidJsonB64}.signature`;
    expect(getEmailFromJWT(token)).toBeNull();
  });

  test('handles URL-safe Base64 encoding', () => {
    const payload = { email: 'test@example.com', extra: 'ÿþ' };
    const normalB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const urlSafeB64 = normalB64.replace(/\+/g, '-').replace(/\//g, '_');

    const token = `header.${urlSafeB64}.signature`;
    expect(getEmailFromJWT(token)).toBe('test@example.com');
  });
});
