export interface Env {
  PRIMARY_DOMAIN?: string;
  CONTACT_TO_EMAIL?: string;
  RESEND_API_KEY?: string;
}

/**
 * Handle POST /api/contact — parse form data and send an email
 * via the Resend API.
 */
async function handleContactForm(request: Request, env: Env): Promise<Response> {
  const allowedOrigin = "https://rmarston.com";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
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

  const toAddr = env.CONTACT_TO_EMAIL?.trim() || "rob@rmarston.com";
  const fromAddr = "mail@rmarston.com"; // Verified Resend domain

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

  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `rmarston.com <${fromAddr}>`,
          to: [toAddr],
          reply_to: email,
          subject: emailSubject,
          text: emailBody,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API error:", errorText);
        throw new Error("Failed to send email via Resend.");
      }
    } catch (err) {
      console.error("Email send error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to send email." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  } else {
    // RESEND_API_KEY not configured — log and succeed gracefully in dev/staging
    console.log("RESEND_API_KEY not configured. Would have sent via Resend:\n", emailBody);
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

    return new Response(`No worker route is configured for ${requestUrl.pathname}.`, {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  },
};
