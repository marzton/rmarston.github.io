// CF Access JWT validation for goldshore-core workers.
// Usage: import { verifyAccessJWT } from "@goldshore/auth";

const CF_CERTS_URL = "https://api.cloudflare.com/client/v4/access/certs";

/**
 * Validates a Cloudflare Access JWT assertion.
 * @param token  The value of the `Cf-Access-Jwt-Assertion` header.
 * @param aud    The Application Audience tag from the CF Access application settings.
 * @returns      true if the token is valid and not expired.
 */
export async function verifyAccessJWT(token: string, aud: string): Promise<boolean> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return false;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
      aud?: string | string[];
    };

    // Check expiry
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    // Check audience
    if (!payload.aud) return false;
    const audiences: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return false;

    // Fetch CF public keys and verify signature
    const certsResponse = await fetch(CF_CERTS_URL);
    if (!certsResponse.ok) return false;

    const { keys } = await certsResponse.json<{ keys: JsonWebKey[] }>();

    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/"))) as { kid?: string };
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return false;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sig, data);
  } catch {
    return false;
  }
}

/**
 * Extracts the authenticated email from a validated CF Access JWT.
 * Call verifyAccessJWT first — this does not re-validate.
 */
export function getEmailFromJWT(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))) as { email?: string };
    return payload.email ?? null;
  } catch {
    return null;
  }
}
