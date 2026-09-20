import crypto from 'node:crypto';

const COOKIE='interclasse_admin';
const secret=()=>process.env.ADMIN_SESSION_SECRET||process.env.ADMIN_PASSWORD;
const sign=value=>crypto.createHmac('sha256',secret()).update(value).digest('base64url');
export function sessionCookie(){const value=String(Date.now());return `${COOKIE}=${value}.${sign(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;}
export function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}
export function authorized(req){if(!secret())return false;const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);if(!raw)return false;const [value,signature]=raw.split('.');if(!value||!signature||Date.now()-Number(value)>28800000)return false;const expected=sign(value);return signature.length===expected.length&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}
