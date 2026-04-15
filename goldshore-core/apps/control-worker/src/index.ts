// gs-control — internal-only worker.
// Reachable only via service binding from gs-api; no public HTTP routes.
//
// Responsibilities:
//   - Drain the goldshore-events Queue
//   - Run admin ops (KV updates, cache invalidation)
//   - Handle transactional email bounce/webhook processing

export interface Env {
  DB: D1Database;
  GS_CONFIG: KVNamespace;
  GS_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
}

// ---------------------------------------------------------------------------
// Queue consumer — handles goldshore-events messages
// ---------------------------------------------------------------------------
export default {
  // HTTP fetch handler (service-binding calls from gs-api)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "gs-control" });
    }

    if (url.pathname === "/admin/cache/invalidate" && request.method === "POST") {
      const { keys } = await request.json<{ keys: string[] }>();
      await Promise.all(keys.map((k) => env.GS_CONFIG.delete(k)));
      return Response.json({ invalidated: keys });
    }

    return new Response("Not found", { status: 404 });
  },

  // Queue consumer — drains goldshore-events
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleEvent(msg.body as GoldshoreEvent, env);
        msg.ack();
      } catch (err) {
        console.error("Failed to process event", msg.id, err);
        msg.retry();
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

interface GoldshoreEvent {
  type: string;
  [key: string]: unknown;
}

async function handleEvent(event: GoldshoreEvent, env: Env): Promise<void> {
  switch (event.type) {
    case "user.created":
      // TODO: send welcome email via Resend
      break;
    case "subscription.updated":
      // TODO: update KV feature flags for the user
      break;
    default:
      console.warn("Unhandled event type:", event.type);
  }
}
