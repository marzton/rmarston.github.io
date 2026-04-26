export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://rmarston.com',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405);
    }

    try {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return json({ ok: false, error: 'Invalid content type' }, 400);
      }

      const body = await request.json();

      const name = clean(body.name);
      const email = clean(body.email);
      const company = clean(body.company || '');
      const type = clean(body.type || '');
      const message = clean(body.message);
      const website = clean(body.website || ''); // honeypot

      // If honeypot is filled, silently "succeed" to fool bots
      if (website) {
        console.log('Honeypot triggered');
        return json({ ok: true }, 200);
      }

      if (!name || !email || !message) {
        return json({ ok: false, error: 'Missing required fields' }, 400);
      }

      if (!isValidEmail(email)) {
        return json({ ok: false, error: 'Invalid email address' }, 400);
      }

      if (message.length > 5000) {
        return json({ ok: false, error: 'Message too long' }, 400);
      }

      const subject = `rmarston.com contact — ${type || 'General Inquiry'} — ${name}`;

      const emailPayload = {
        from: env.CONTACT_FROM_EMAIL || 'contact@rmarston.com',
        to: env.CONTACT_TO_EMAIL || 'marstonr6@gmail.com',
        reply_to: email,
        subject,
        html: `
          <h2>New contact submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Company:</strong> ${escapeHtml(company)}</p>
          <p><strong>Inquiry Type:</strong> ${escapeHtml(type)}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `,
      };

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error('Resend API error:', errorText);
        return json({ ok: false, error: 'Email send failed', detail: errorText }, 502);
      }

      return json({ ok: true }, 200);
    } catch (err) {
      console.error('Server error:', err);
      return json({ ok: false, error: 'Server error' }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'https://rmarston.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function clean(value) {
  return String(value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
