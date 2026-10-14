export interface Env {
  DB: D1Database;
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/test-d1') {
      const { results } = await env.DB.prepare('SELECT id, name, email, role FROM User').all();
      return Response.json({ success: true, count: results.length, users: results });
    }
    return Response.json({ message: 'GeoClass Cloudflare Worker online!', path: url.pathname });
  },
};