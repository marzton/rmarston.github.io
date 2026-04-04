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
  const corsHeaders = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid form data." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const name    = (formData.get("name")    ?? "").toString().trim();
  const email   = (formData.get("email")   ?? "").toString().trim();
  const company = (formData.get("company") ?? "").toString().trim();
  const subject = (formData.get("subject") ?? "general").toString().trim();
  const message = (formData.get("message") ?? "").toString().trim();

  if (!name || !email || !subject || !message) {
    return new Response(
      JSON.stringify({ error: "Missing required fields." }),
      { status: 422, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: "Invalid email address." }),
      { status: 422, headers: { "Content-Type": "application/json", ...corsHeaders } },
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
      return new Response(
        JSON.stringify({ error: "Failed to send email." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  } else {
    // SEND_EMAIL binding not configured — log and succeed gracefully in dev/staging
    console.log("SEND_EMAIL binding not configured. Would have sent:\n", emailBody);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
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
