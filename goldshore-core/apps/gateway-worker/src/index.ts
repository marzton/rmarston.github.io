import { Hono } from "hono";
import { cors } from "hono/cors";

// ---------------------------------------------------------------------------
// Environment bindings (declared in wrangler.toml)
// ---------------------------------------------------------------------------
export interface Env {
  // Workers AI
  AI: Ai;
  // Cloudflare Images
  IMAGES: ImagesBinding;
  // D1 database
  DB: D1Database;
  // KV — app config + feature flags
  GS_CONFIG: KVNamespace;
  // R2 buckets
  R2_PUBLIC: R2Bucket;
  R2_LOGS: R2Bucket;
  // Event queue (producer)
  QUEUE_EVENTS: Queue;
  // Service binding to gs-api
  API: Fetcher;
  // Secrets (injected at deploy time)
  AIPROXYSIGNING_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS — allow requests from goldshore.ai and goldshore.org
app.use(
  "*",
  cors({
    origin: ["https://goldshore.ai", "https://goldshore.org", "https://admin.goldshore.org"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok", worker: "gs-gateway" }));

// ---------------------------------------------------------------------------
// AI proxy endpoint
// Validates AIPROXYSIGNING_KEY before forwarding to Workers AI.
// ---------------------------------------------------------------------------
app.post("/ai/run/:model", async (c) => {
  const signingKey = c.req.header("x-goldshore-signing-key");
  if (signingKey !== c.env.AIPROXYSIGNING_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const model = c.req.param("model") as BaseAiTextGenerationModels;
  const body = await c.req.json();

  const result = await c.env.AI.run(model, body);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// Image upload proxy
// ---------------------------------------------------------------------------
app.post("/images/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  const result = await c.env.IMAGES.input(file).transform({ fit: "scale-down", width: 2048 }).output({ format: "webp" });
  return c.body(result.image(), 200, { "Content-Type": "image/webp" });
});

// ---------------------------------------------------------------------------
// Forward all /api/* traffic to gs-api via service binding
// ---------------------------------------------------------------------------
app.all("/api/*", async (c) => {
  const url = new URL(c.req.url);
  url.hostname = "gs-api.internal";
  const forwardedRequest = new Request(url.toString(), c.req.raw);
  return c.env.API.fetch(forwardedRequest);
});

export default app;
