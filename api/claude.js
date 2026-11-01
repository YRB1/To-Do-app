// Vercel serverless function: proxies YRB's World → Claude API so the API key
// lives in Vercel (env ANTHROPIC_API_KEY), never in the browser.
// Locked with a passcode (env YRB_PASSCODE) so nobody else can spend your credit.
const ALLOWED = ['model', 'max_tokens', 'system', 'messages', 'output_config', 'temperature', 'stop_sequences'];
const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.ANTHROPIC_API_KEY, pass = process.env.YRB_PASSCODE;
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!key, locked: !!pass });
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Use POST' } });
  if (!key) return res.status(503).json({ error: { message: 'ANTHROPIC_API_KEY is not set in Vercel → Settings → Environment Variables.' } });
  if (!pass) return res.status(503).json({ error: { message: 'Set YRB_PASSCODE in Vercel so only you can use this endpoint.' } });
  if ((req.headers['x-yrb-passcode'] || '') !== pass) return res.status(401).json({ error: { message: 'Wrong passcode. Check it in Connections → Claude.' } });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const out = {};
  for (const k of ALLOWED) if (body && body[k] !== undefined) out[k] = body[k];
  if (!MODELS.includes(out.model)) out.model = 'claude-opus-5-5';
  out.max_tokens = Math.min(+out.max_tokens || 4000, 16000);
  if (!Array.isArray(out.messages) || !out.messages.length) return res.status(400).json({ error: { message: 'No messages' } });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(out),
    });
    const j = await r.json().catch(() => ({ error: { message: 'Bad response from Claude API' } }));
    return res.status(r.status).json(j);
  } catch (e) {
    return res.status(502).json({ error: { message: 'Could not reach the Claude API: ' + e.message } });
  }
};
