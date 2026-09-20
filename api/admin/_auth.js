import crypto from 'node:crypto';

const COOKIE='interclasse_admin';
const TEACHER_COOKIE='interclasse_teacher';
const secret=()=>process.env.ADMIN_SESSION_SECRET||process.env.ADMIN_PASSWORD;
const teacherSecret=()=>process.env.TEACHER_SESSION_SECRET||process.env.TEACHER_PASSWORD;
const sign=(value,key)=>crypto.createHmac('sha256',key).update(value).digest('base64url');
const cookie=(name,key)=>{const value=String(Date.now());return `${name}=${value}.${sign(value,key)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;};
const check=(req,name,key)=>{if(!key)return false;const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);if(!raw)return false;const [value,signature]=raw.split('.');if(!value||!signature||Date.now()-Number(value)>28800000)return false;const expected=sign(value,key);return signature.length===expected.length&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));};
export function sessionCookie(){return cookie(COOKIE,secret());}
export function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}
export function authorized(req){return check(req,COOKIE,secret());}
export function teacherSessionCookie(){return cookie(TEACHER_COOKIE,teacherSecret());}
export function clearTeacherCookie(){return `${TEACHER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}
export function teacherAuthorized(req){return check(req,TEACHER_COOKIE,teacherSecret());}
