// Vercel serverless function: mints an Apple Music developer token (ES256 JWT)
// for MusicKit JS. Needs an Apple Developer account and a MusicKit key:
//   APPLE_TEAM_ID            – 10-character Team ID
//   APPLE_KEY_ID             – 10-character Key ID of the MusicKit key
//   APPLE_MUSIC_PRIVATE_KEY  – contents of the AuthKey_XXXX.p8 file
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
let cache = { token: '', exp: 0 };

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const team = process.env.APPLE_TEAM_ID, kid = process.env.APPLE_KEY_ID;
  let pem = process.env.APPLE_MUSIC_PRIVATE_KEY || '';
  if (!team || !kid || !pem) return res.status(200).json({ configured: false });
  const now = Math.floor(Date.now() / 1000);
  if (cache.token && cache.exp - now > 3600) return res.status(200).json({ configured: true, token: cache.token });
  try {
    pem = pem.replace(/\\n/g, '\n').trim();
    if (!pem.includes('BEGIN')) pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
    const exp = now + 60 * 60 * 24 * 30; // 30 days (Apple max is 6 months)
    const head = b64u(JSON.stringify({ alg: 'ES256', kid }));
    const payload = b64u(JSON.stringify({ iss: team, iat: now, exp }));
    const sig = crypto.sign('sha256', Buffer.from(`${head}.${payload}`), { key: pem, dsaEncoding: 'ieee-p1363' });
    cache = { token: `${head}.${payload}.${b64u(sig)}`, exp };
    return res.status(200).json({ configured: true, token: cache.token });
  } catch (e) {
    return res.status(500).json({ configured: false, error: 'Could not sign token — check APPLE_MUSIC_PRIVATE_KEY: ' + e.message });
  }
};
