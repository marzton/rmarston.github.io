import { Hono } from "hono";
import { verifyAccessJWT } from "@goldshore/auth";

// ---------------------------------------------------------------------------
// Environment bindings (declared in wrangler.toml)
// ---------------------------------------------------------------------------
export interface Env {
  // D1 database
  DB: D1Database;
  // KV — sessions and config
  GS_SESSIONS: KVNamespace;
  GS_CONFIG: KVNamespace;
  // Service bindings
  GATEWAY: Fetcher;
  CONTROL: Fetcher;
  // Secrets
  RESEND_API_KEY: string;
  CF_ACCESS_AUD: string;
}

const app = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok", worker: "gs-api" }));

// ---------------------------------------------------------------------------
// Auth middleware — validates CF Access JWT on all /admin/* routes
// ---------------------------------------------------------------------------
app.use("/admin/*", async (c, next) => {
  const jwt = c.req.header("Cf-Access-Jwt-Assertion");
  if (!jwt) return c.json({ error: "Missing CF Access token" }, 401);

  const valid = await verifyAccessJWT(jwt, c.env.CF_ACCESS_AUD);
  if (!valid) return c.json({ error: "Invalid CF Access token" }, 403);

  await next();
});

// ---------------------------------------------------------------------------
// Example: create a user
// ---------------------------------------------------------------------------
app.post("/users", async (c) => {
  const { email, name } = await c.req.json<{ email: string; name: string }>();

  const result = await c.env.DB.prepare(
    "INSERT INTO users (email, name, created_at) VALUES (?1, ?2, ?3) RETURNING id"
  )
    .bind(email, name, new Date().toISOString())
    .first<{ id: number }>();

  if (!result) return c.json({ error: "Failed to create user" }, 500);

  // Emit event to control worker via queue (through gateway service binding)
  const eventReq = new Request("https://gs-gateway.internal/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user.created", userId: result.id }),
  });
  await c.env.GATEWAY.fetch(eventReq);

  return c.json({ id: result.id }, 201);
});

export default app;
