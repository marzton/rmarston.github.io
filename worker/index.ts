export interface Env {}

const DEPRECATION_MESSAGE =
  "Deprecated worker: rmarston.com is served directly by GitHub Pages and no domain routes should target this worker.";

export default {
  async fetch(): Promise<Response> {
    return new Response(DEPRECATION_MESSAGE, {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  },
};
