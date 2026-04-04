export interface SendEmailBinding {
  send(message: {
    from: string;
    to: string;
    raw: ReadableStream;
  }): Promise<void>;
}

export interface Env {
  BACKEND_UPSTREAM: string;
  PRIMARY_DOMAIN: string;
  REDIRECT_MODE?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
  SEND_EMAIL?: SendEmailBinding;
  TURNSTILE_SECRET?: string;
  CONTACT_RATE_LIMIT_KV?: {
    get(key: string): Promise<string | null>;
    put(
      key: string,
      value: string,
      options?: {
        expirationTtl?: number;
      },
    ): Promise<void>;
  };
}

export function getRedirectStatus(value?: string): 301 | 302 | 307 | 308 {
  const parsed = Number(value);
  const redirectStatuses = [301, 302, 307, 308];
  if (redirectStatuses.includes(parsed)) {
    return parsed as 301 | 302 | 307 | 308;
  }
  return 301;
}

export function buildUpstreamUrl(origin: string, path: string, search: string): URL {
  const url = new URL(origin);
  url.pathname = path;
  url.search = search;
  return url;
}

/** Build a minimal text/plain MIME email message. */
function buildMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string,
): string {
  const safeSubject = subject.replace(/[\r\n]/g, " ");
  const safeFrom    = from.replace(/[\r\n]/g, "");
  const safeTo      = to.replace(/[\r\n]/g, "");
  return [
    `MIME-Version: 1.0`,
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");
}

/**
 * Handle POST /api/contact — parse form data and send an email
 * via the Cloudflare Email Routing send_email binding.
 */
async function handleContactForm(
  request: Request,
  env: Env,
): Promise<Response> {
  const ALLOWED_ORIGIN_SUFFIX = ".rmarston.com";
  const ALLOWED_ORIGINS = new Set<string>([
    "https://rmarston.com",
    "https://www.rmarston.com",
  ]);
  const MAX_MESSAGE_LENGTH = 5000;
  const MAX_NAME_LENGTH = 120;
  const MAX_COMPANY_LENGTH = 120;
  const MAX_SUBJECT_LENGTH = 160;
  const RATE_LIMIT_WINDOW_SECONDS = 60;
  const RATE_LIMIT_MAX_ATTEMPTS = 8;

  const jsonHeaders = {
    "Content-Type": "application/json",
  };
  const buildCorsHeaders = (origin: string) => ({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  });
  const jsonResponse = (
    body: Record<string, unknown>,
    status: number,
    origin?: string,
  ) => {
    const headers = origin
      ? { ...jsonHeaders, ...buildCorsHeaders(origin) }
      : jsonHeaders;
    return new Response(JSON.stringify(body), { status, headers });
  };
  const isAllowedOrigin = (origin: string): boolean => {
    if (ALLOWED_ORIGINS.has(origin)) {
      return true;
    }
    try {
      const url = new URL(origin);
      return (
        url.protocol === "https:" &&
        url.hostname.endsWith(ALLOWED_ORIGIN_SUFFIX) &&
        url.hostname.length > ALLOWED_ORIGIN_SUFFIX.length
      );
    } catch {
      return false;
    }
  };
  const logBlocked = (reason: string, origin: string | null) => {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const country = request.headers.get("CF-IPCountry") ?? "unknown";
    const userAgent = request.headers.get("User-Agent") ?? "unknown";
    console.warn("contact_blocked", {
      reason,
      origin: origin ?? "missing",
      ip,
      country,
      userAgent: userAgent.slice(0, 160),
    });
  };
  const blockedResponse = (
    code: string,
    message: string,
    status: number,
    origin: string | null,
  ) => {
    logBlocked(code, origin);
    return jsonResponse(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      status,
      origin && isAllowedOrigin(origin) ? origin : undefined,
    );
  };

  const origin = request.headers.get("Origin");
  const likelyBrowserRequest =
    request.headers.has("Sec-Fetch-Mode") ||
    request.headers.has("Sec-Fetch-Site");

  if (request.method === "OPTIONS") {
    if (!origin || !isAllowedOrigin(origin)) {
      return blockedResponse(
        "origin_not_allowed",
        "Origin is not allowed.",
        403,
        origin,
      );
    }
    return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
  }

  if (likelyBrowserRequest && (!origin || !isAllowedOrigin(origin))) {
    return blockedResponse(
      "invalid_origin",
      "Missing or invalid Origin header.",
      403,
      origin,
    );
  }

  if (origin && !isAllowedOrigin(origin)) {
    return blockedResponse(
      "origin_not_allowed",
      "Origin is not allowed.",
      403,
      origin,
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (env.CONTACT_RATE_LIMIT_KV && ip !== "unknown") {
    const key = `contact:rl:${ip}`;
    const currentCount = Number(await env.CONTACT_RATE_LIMIT_KV.get(key) ?? "0");
    if (currentCount >= RATE_LIMIT_MAX_ATTEMPTS) {
      return blockedResponse(
        "rate_limited",
        "Too many attempts. Please try again later.",
        429,
        origin,
      );
    }
    await env.CONTACT_RATE_LIMIT_KV.put(
      key,
      String(currentCount + 1),
      { expirationTtl: RATE_LIMIT_WINDOW_SECONDS },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      { success: false, error: { code: "invalid_form_data", message: "Invalid form data." } },
      400,
      origin ?? undefined,
    );
  }

  const turnstileToken = (formData.get("cf-turnstile-response") ?? "")
    .toString()
    .trim();
  if (env.TURNSTILE_SECRET) {
    if (!turnstileToken) {
      return blockedResponse(
        "turnstile_missing",
        "Missing Turnstile token.",
        403,
        origin,
      );
    }
    const verifyBody = new URLSearchParams();
    verifyBody.set("secret", env.TURNSTILE_SECRET);
    verifyBody.set("response", turnstileToken);
    if (ip !== "unknown") {
      verifyBody.set("remoteip", ip);
    }
    const verifyResp = await globalThis.fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyBody.toString(),
      },
    );
    if (!verifyResp.ok) {
      return blockedResponse(
        "turnstile_verify_failed",
        "Unable to verify Turnstile token.",
        503,
        origin,
      );
    }
    const verifyJson = await verifyResp.json<{ success?: boolean }>();
    if (!verifyJson.success) {
      return blockedResponse(
        "turnstile_invalid",
        "Turnstile validation failed.",
        403,
        origin,
      );
    }
  }

  const name    = (formData.get("name")    ?? "").toString().trim();
  const email   = (formData.get("email")   ?? "").toString().trim();
  const company = (formData.get("company") ?? "").toString().trim();
  const subject = (formData.get("subject") ?? "general").toString().trim();
  const message = (formData.get("message") ?? "").toString().trim();

  if (!name || !email || !subject || !message) {
    return jsonResponse(
      { success: false, error: { code: "missing_fields", message: "Missing required fields." } },
      422,
      origin ?? undefined,
    );
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(
      { success: false, error: { code: "invalid_email", message: "Invalid email address." } },
      422,
      origin ?? undefined,
    );
  }

  if (
    message.length > MAX_MESSAGE_LENGTH ||
    name.length > MAX_NAME_LENGTH ||
    company.length > MAX_COMPANY_LENGTH ||
    subject.length > MAX_SUBJECT_LENGTH
  ) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "payload_too_large",
          message: "One or more fields exceed allowed length.",
        },
      },
      413,
      origin ?? undefined,
    );
  }

  const fromAddr = env.CONTACT_FROM_EMAIL ?? "contact@goldshore.ai";
  const toAddr   = env.CONTACT_TO_EMAIL   ?? "rob@goldshore.ai";

  const emailSubject = `[GoldShore Contact] ${subject} — ${name}`;
  const emailBody = [
    `New contact form submission from goldshore.ai`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Company: ${company || "(not provided)"}`,
    `Topic:   ${subject}`,
    ``,
    `Message:`,
    message,
  ].join("\n");

  if (env.SEND_EMAIL) {
    try {
      const raw     = buildMimeMessage(fromAddr, toAddr, emailSubject, emailBody);
      const encoded = new TextEncoder().encode(raw);
      const stream  = new ReadableStream({
        start(controller) {
          controller.enqueue(encoded);
          controller.close();
        },
      });
      await env.SEND_EMAIL.send({ from: fromAddr, to: toAddr, raw: stream });
    } catch (err) {
      console.error("Email send error:", err);
      return jsonResponse(
        { success: false, error: { code: "email_send_failed", message: "Failed to send email." } },
        500,
        origin ?? undefined,
      );
    }
  } else {
    // SEND_EMAIL binding not configured — log and succeed gracefully in dev/staging
    console.log("SEND_EMAIL binding not configured. Would have sent:\n", emailBody);
  }

  return jsonResponse({ success: true }, 200, origin ?? undefined);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const primaryDomain = env.PRIMARY_DOMAIN?.trim().toLowerCase();
    const upstreamOrigin = env.BACKEND_UPSTREAM?.trim();
    const redirectStatus = getRedirectStatus(env.REDIRECT_MODE);

    // Handle contact form API endpoint before any redirect logic
    if (
      requestUrl.pathname === "/api/contact" &&
      (request.method === "POST" || request.method === "OPTIONS")
    ) {
      return handleContactForm(request, env);
    }

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

    const upstreamUrl = buildUpstreamUrl(
      upstreamOrigin,
      requestUrl.pathname,
      requestUrl.search,
    );

    const upstreamHeaders = new Headers(request.headers);

    // Standard hop-by-hop headers as per RFC 7230
    const hopByHopHeaders = [
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
    ];

    // Headers listed in the 'Connection' header are also hop-by-hop
    const connectionHeader = request.headers.get("connection");
    if (connectionHeader) {
      for (const header of connectionHeader.split(",")) {
        hopByHopHeaders.push(header.trim().toLowerCase());
      }
    }

    // Sensitive headers that should not be forwarded
    const sensitiveHeaders = ["cookie", "authorization"];

    const headersToStrip = [...hopByHopHeaders, ...sensitiveHeaders];

    for (const header of headersToStrip) {
      upstreamHeaders.delete(header);
    }

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
  },
};
