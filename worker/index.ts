export interface SendEmailBinding {
  send(message: {
    from: string;
    to: string;
    raw: ReadableStream;
  }): Promise<void>;
}

export interface Env {
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
  SEND_EMAIL?: SendEmailBinding;
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

  const fromAddr = env.CONTACT_FROM_EMAIL?.trim();
  const toAddr   = env.CONTACT_TO_EMAIL?.trim();

  if (!fromAddr || !toAddr) {
    console.error("Missing contact email configuration.");
    return new Response(
      JSON.stringify({ error: "Contact email is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const emailSubject = `[rmarston.com Contact] ${subject} — ${name}`;
  const emailBody = [
    `New contact form submission from rmarston.com`,
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

    // Handle contact form API endpoint
    if (
      requestUrl.pathname === "/api/contact" &&
      (request.method === "POST" || request.method === "OPTIONS")
    ) {
      return handleContactForm(request, env);
    }

    return new Response("Not found.", { status: 404 });
  },
};
