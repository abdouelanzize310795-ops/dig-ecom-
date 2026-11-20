'use strict';
/**
 * Dige-e-com Academy — serveur du site et du back office.
 * Aucune dépendance npm : Node.js >= 22.5 (SQLite intégré).
 * Lancer :  node server.js      (PORT=5173 par défaut)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

/* ------------------------------------------------------------------ base */
const db = new DatabaseSync(path.join(DATA, 'site.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS courses(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, tag TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', program TEXT NOT NULL DEFAULT '[]',
  day TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', effectif TEXT NOT NULL DEFAULT '',
  validation TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', image TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1, enrollment_open INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS enrollments(
  id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, course_title TEXT NOT NULL,
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nouveau', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouveau', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leaders(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS gallery(
  id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
  wide INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0);
`);

const now = () => new Date().toISOString();
const getSetting = k => db.prepare('SELECT value FROM settings WHERE key=?').get(k)?.value ?? '';
const SETTING_KEYS = ['phone', 'phone_intl', 'whatsapp', 'address', 'facebook', 'instagram', 'email',
  'hero_eyebrow', 'hero_title', 'hero_title_accent', 'hero_lead', 'hero_image', 'hero_card_title', 'hero_steps',
  'president_image', 'president_name', 'president_role', 'president_text1', 'president_text2'];
const IMAGE_KEYS = ['hero_image', 'president_image'];
const LONG_KEYS = { hero_lead: 500, hero_steps: 800, president_text1: 700, president_text2: 700 };

function seed() {
  const defaults = {
    phone: '451 05 91', phone_intl: '+2694510591', whatsapp: '',
    address: "Moroni, à Coulé rond-point Hadoudja",
    facebook: 'https://www.facebook.com/people/Digecom-Agency/61563089879968/', instagram: '', email: '',
    hero_eyebrow: 'Agence de marketing digital',
    hero_title: 'Boostez votre croissance avec des', hero_title_accent: 'stratégies marketing sur-mesure',
    hero_lead: "Conçues pour propulser votre entreprise vers le succès : de l'audit à l'analyse des résultats, une seule équipe pilote votre présence digitale.",
    hero_image: '/assets/hero-formation.webp', hero_card_title: 'Notre approche en 4 temps',
    hero_steps: ['Audit de votre situation', 'Stratégie digitale sur-mesure', 'Exécution multicanale', 'Analyse et optimisation'].join('\n'),
    president_image: '/assets/president.webp', president_name: 'Bousri Abdallah Moukhni', president_role: 'Président',
    president_text1: "Dig Agency e-com accompagne les entreprises dans leur croissance digitale et, avec Dige-e-com Academy, forme celles et ceux qui feront le travail de demain.",
    president_text2: "Notre conviction : des stratégies sur-mesure, une approche pratique et un suivi de proximité, pour des résultats que chacun peut mesurer."
  };
  const insDef = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
  for (const [k, v] of Object.entries(defaults)) insDef.run(k, v);
  if (!db.prepare('SELECT COUNT(*) n FROM courses').get().n) {
    const ins = db.prepare(`INSERT INTO courses(title,tag,description,program,day,location,effectif,validation,image,position)
      VALUES(?,?,?,?,?,?,?,?,?,?)`);
    const loc = 'Moroni, à Coulé rond-point Hadoudja';
    const eff = 'Petits groupes, encadrement professionnel';
    const val = 'Attestation de fin de formation';
    ins.run('Informatique bureautique', 'Formation 100 % pratique',
      'Maîtrisez les outils essentiels pour travailler, étudier et booster votre avenir.',
      JSON.stringify([
        ['Les bases de l\'ordinateur et de Windows', 'clavier, souris, dossiers'], ['Word', 'rédaction et mise en page'],
        ['Excel', 'tableaux et calculs simples'], ['PowerPoint', 'présentations professionnelles'],
        ['Outlook', 'gestion des mails et agenda'], ['Internet', 'recherche et outils en ligne'],
        ['Gestion des fichiers', 'organisation et sécurité']].map(([t, d]) => ({ t, d }))),
      'À confirmer', loc, eff, val, '/assets/formations/informatique-bureautique.webp', 1);
    ins.run('Assistante comptable', 'Métier d\'avenir',
      'Apprenez un métier d\'avenir et boostez votre carrière, de la théorie à la pratique.',
      JSON.stringify([
        ['Comptabilité de base', 'saisie, classement, suivi'], ['Gestion des documents', 'factures, bons, relevés'],
        ['Excel', 'tableaux et calculs simples'], ['Word', 'rédaction et mise en page'],
        ['Outils bureautiques', 'messagerie, internet, organisation'],
        ['Organisation et communication', 'travail en équipe, relation client']].map(([t, d]) => ({ t, d }))),
      'À confirmer', loc, eff, val, '/assets/formations/assistante-comptable.webp', 2);
  }
  if (!db.prepare('SELECT COUNT(*) n FROM leaders').get().n) {
    db.prepare('INSERT INTO leaders(name,role,image,position) VALUES(?,?,?,1)')
      .run(getSetting('president_name') || 'Bousri Abdallah Moukhni', getSetting('president_role') || 'Président',
        getSetting('president_image') || '/assets/president.webp');
  }
  if (!db.prepare('SELECT COUNT(*) n FROM gallery').get().n) {
    const ins = db.prepare('INSERT INTO gallery(image,caption,wide,position) VALUES(?,?,?,?)');
    ins.run('/assets/apprenants/groupe.webp', 'La communauté Dige-e-com Academy', 1, 1);
    ins.run('/assets/apprenants/remise-attestation-1.webp', "Remise d'attestation de fin de formation", 0, 2);
    ins.run('/assets/apprenants/remise-attestation-2.webp', "Remise d'attestation de fin de formation", 0, 3);
  }
}
seed();

/* --------------------------------------------------------- mot de passe */
const hashPw = pw => {
  const salt = crypto.randomBytes(16);
  return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(pw, salt, 64).toString('hex');
};
const checkPw = (pw, stored) => {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const h = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const s = Buffer.from(hashHex, 'hex');
  return h.length === s.length && crypto.timingSafeEqual(h, s);
};
if (!db.prepare('SELECT 1 FROM admin WHERE id=1').get()) {
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = crypto.randomBytes(12).toString('base64url');
    fs.writeFileSync(path.join(DATA, 'MOT_DE_PASSE_INITIAL.txt'),
      `Mot de passe initial de l'administration :\n${pw}\n\nChangez-le dès la première connexion (Paramètres), puis supprimez ce fichier.\n`);
    console.log('Mot de passe initial écrit dans data/MOT_DE_PASSE_INITIAL.txt');
  }
  db.prepare('INSERT INTO admin(id,password_hash) VALUES(1,?)').run(hashPw(pw));
}

/* -------------------------------------------------------------- sessions */
const SESSION_MS = 7 * 24 * 3600 * 1000;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const newSession = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions(token_hash,expires) VALUES(?,?)').run(sha(token), Date.now() + SESSION_MS);
  return token;
};
const cookieOf = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, v.join('=')]));
const isAuthed = req => {
  const t = cookieOf(req).sid;
  if (!t) return false;
  const row = db.prepare('SELECT expires FROM sessions WHERE token_hash=?').get(sha(t));
  if (!row) return false;
  if (row.expires < Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t)); return false; }
  return true;
};
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()), 3600e3).unref();

/* ----------------------------------------------------------- limitations */
const buckets = new Map();
function limited(key, max, windowMs) {
  const t = Date.now();
  const arr = (buckets.get(key) || []).filter(x => t - x < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return true; }
  arr.push(t); buckets.set(key, arr);
  return false;
}
setInterval(() => buckets.clear(), 6 * 3600e3).unref();
// Derrière un proxy (TRUST_PROXY=true), on lit l'IP du client dans X-Forwarded-For ; sinon l'adresse de la connexion.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';
const ipOf = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'x';

/* --------------------------------------------------------------- helpers */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SEC, ...headers });
  res.end(body);
}
const json = (res, status, obj, headers = {}) =>
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });

function readBody(req, max = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('bad json'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = v => (v ? 1 : 0);
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// chemins d'images autorisés : fichiers du site ou téléversements
const imgOk = p => typeof p === 'string' && /^\/(assets|uploads)\/[\w./-]+$/.test(p) && !p.includes('..');

function courseOut(r) {
  let program = [];
  try { program = JSON.parse(r.program); } catch { /* vide */ }
  return { ...r, program, published: !!r.published, enrollment_open: !!r.enrollment_open };
}
function courseIn(b) {
  const program = Array.isArray(b.program)
    ? b.program.slice(0, 30).map(p => ({ t: str(p?.t, 120), d: str(p?.d, 160) })).filter(p => p.t)
    : [];
  const title = str(b.title, 140);
  if (!title) throw Object.assign(new Error('Titre requis'), { code: 400 });
  const image = b.image && imgOk(b.image) ? b.image : '';
  return {
    title, tag: str(b.tag, 80), description: str(b.description, 600), program: JSON.stringify(program),
    day: str(b.day, 120), location: str(b.location, 200), effectif: str(b.effectif, 200),
    validation: str(b.validation, 200), price: str(b.price, 60), image,
    published: bool(b.published), enrollment_open: bool(b.enrollment_open), position: Number.isInteger(b.position) ? b.position : 0
  };
}

/* ------------------------------------------------------------- API public */
const STATUS_ENR = ['nouveau', 'contacté', 'confirmé', 'annulé'];
const STATUS_MSG = ['nouveau', 'lu', 'traité'];

async function publicApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/public') {
    const settings = Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)]));
    const courses = db.prepare('SELECT * FROM courses WHERE published=1 ORDER BY position,id').all().map(courseOut);
    const gallery = db.prepare('SELECT id,image,caption,wide FROM gallery ORDER BY position,id').all();
    const leaders = db.prepare('SELECT id,name,role,image FROM leaders WHERE published=1 ORDER BY position,id').all();
    return json(res, 200, { settings, courses, gallery, leaders });
  }
  if (req.method === 'POST' && (url.pathname === '/api/enrollments' || url.pathname === '/api/messages')) {
    if (limited('pub:' + ipOf(req), 8, 3600e3)) return json(res, 429, { error: 'Trop de demandes, réessayez plus tard.' });
    const b = await readBody(req, 20 * 1024);
    if (b.website) return json(res, 200, { ok: true }); // piège anti-robots
    const name = str(b.name, 120), email = str(b.email, 160), message = str(b.message, 3000);
    if (url.pathname === '/api/messages') {
      if (!name || !emailOk(email) || !message) return json(res, 400, { error: 'Champs invalides.' });
      db.prepare('INSERT INTO messages(name,email,message,created_at) VALUES(?,?,?,?)').run(name, email, message, now());
      return json(res, 201, { ok: true });
    }
    const phone = str(b.phone, 40);
    if (!name || phone.replace(/\D/g, '').length < 6 || (email && !emailOk(email))) return json(res, 400, { error: 'Champs invalides.' });
    const c = db.prepare('SELECT id,title FROM courses WHERE id=? AND published=1 AND enrollment_open=1').get(Number(b.course_id));
    if (!c) return json(res, 400, { error: 'Formation indisponible.' });
    db.prepare('INSERT INTO enrollments(course_id,course_title,name,phone,email,message,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(c.id, c.title, name, phone, email, message, now());
    return json(res, 201, { ok: true });
  }
  return false;
}

/* -------------------------------------------------------------- API admin */
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"';

async function adminApi(req, res, url) {
  const p = url.pathname;
  const m = req.method;
  const idOf = re => { const r = p.match(re); return r ? Number(r[1]) : null; };

  if (m === 'POST' && p === '/api/admin/login') {
    const k = 'login:' + ipOf(req);
    if (limited(k, 6, 15 * 60e3)) return json(res, 429, { error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    const b = await readBody(req, 4096);
    const row = db.prepare('SELECT password_hash FROM admin WHERE id=1').get();
    if (!checkPw(String(b.password || ''), row.password_hash)) return json(res, 401, { error: 'Mot de passe incorrect.' });
    const token = newSession();
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return json(res, 200, { ok: true }, { 'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure}` });
  }
  if (!isAuthed(req)) return json(res, 401, { error: 'Non connecté.' });

  if (m === 'POST' && p === '/api/admin/logout') {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(cookieOf(req).sid || ''));
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (m === 'GET' && p === '/api/admin/me') return json(res, 200, { ok: true });

  if (m === 'GET' && p === '/api/admin/stats') {
    const n = (sql) => db.prepare(sql).get().n;
    return json(res, 200, {
      courses: n('SELECT COUNT(*) n FROM courses'),
      enrollments: n('SELECT COUNT(*) n FROM enrollments'),
      enrollmentsNew: n("SELECT COUNT(*) n FROM enrollments WHERE status='nouveau'"),
      messages: n('SELECT COUNT(*) n FROM messages'),
      messagesNew: n("SELECT COUNT(*) n FROM messages WHERE status='nouveau'"),
      gallery: n('SELECT COUNT(*) n FROM gallery'),
      leaders: n('SELECT COUNT(*) n FROM leaders')
    });
  }

  /* formations */
  if (p === '/api/admin/courses') {
    if (m === 'GET') return json(res, 200, db.prepare('SELECT * FROM courses ORDER BY position,id').all().map(courseOut));
    if (m === 'POST') {
      const c = courseIn(await readBody(req, 64 * 1024));
      const r = db.prepare(`INSERT INTO courses(title,tag,description,program,day,location,effectif,validation,price,image,published,enrollment_open,position)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(c.title, c.tag, c.description, c.program, c.day, c.location, c.effectif, c.validation, c.price, c.image, c.published, c.enrollment_open, c.position);
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
  }
  let id = idOf(/^\/api\/admin\/courses\/(\d+)$/);
  if (id !== null) {
    if (m === 'PUT') {
      const c = courseIn(await readBody(req, 64 * 1024));
      db.prepare(`UPDATE courses SET title=?,tag=?,description=?,program=?,day=?,location=?,effectif=?,validation=?,price=?,image=?,published=?,enrollment_open=?,position=? WHERE id=?`)
        .run(c.title, c.tag, c.description, c.program, c.day, c.location, c.effectif, c.validation, c.price, c.image, c.published, c.enrollment_open, c.position, id);
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM courses WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  /* direction */
  const leaderIn = b => {
    const name = str(b.name, 120);
    if (!name) throw Object.assign(new Error('Nom requis'), { code: 400 });
    return { name, role: str(b.role, 120), image: b.image && imgOk(b.image) ? b.image : '', published: bool(b.published), position: Number.isInteger(b.position) ? b.position : 0 };
  };
  if (p === '/api/admin/leaders') {
    if (m === 'GET') return json(res, 200, db.prepare('SELECT * FROM leaders ORDER BY position,id').all().map(r => ({ ...r, published: !!r.published })));
    if (m === 'POST') {
      const l = leaderIn(await readBody(req, 8192));
      const r = db.prepare('INSERT INTO leaders(name,role,image,published,position) VALUES(?,?,?,?,?)').run(l.name, l.role, l.image, l.published, l.position);
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
  }
  id = idOf(/^\/api\/admin\/leaders\/(\d+)$/);
  if (id !== null) {
    if (m === 'PUT') {
      const l = leaderIn(await readBody(req, 8192));
      db.prepare('UPDATE leaders SET name=?,role=?,image=?,published=?,position=? WHERE id=?').run(l.name, l.role, l.image, l.published, l.position, id);
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM leaders WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  /* inscriptions */
  if (m === 'GET' && p === '/api/admin/enrollments')
    return json(res, 200, db.prepare('SELECT * FROM enrollments ORDER BY id DESC').all());
  if (m === 'GET' && p === '/api/admin/enrollments.csv') {
    const rows = db.prepare('SELECT * FROM enrollments ORDER BY id DESC').all();
    const head = ['Date', 'Formation', 'Nom', 'Téléphone', 'Email', 'Message', 'Statut', 'Note'];
    const csv = '﻿' + [head, ...rows.map(r => [r.created_at, r.course_title, r.name, r.phone, r.email, r.message, r.status, r.note])]
      .map(r => r.map(csvCell).join(';')).join('\r\n');
    return send(res, 200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inscriptions.csv"', 'Cache-Control': 'no-store' });
  }
  id = idOf(/^\/api\/admin\/enrollments\/(\d+)$/);
  if (id !== null) {
    if (m === 'PATCH') {
      const b = await readBody(req, 8192);
      if (!STATUS_ENR.includes(b.status)) return json(res, 400, { error: 'Statut invalide.' });
      db.prepare('UPDATE enrollments SET status=?, note=? WHERE id=?').run(b.status, str(b.note, 1000), id);
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM enrollments WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  /* messages */
  if (m === 'GET' && p === '/api/admin/messages') return json(res, 200, db.prepare('SELECT * FROM messages ORDER BY id DESC').all());
  id = idOf(/^\/api\/admin\/messages\/(\d+)$/);
  if (id !== null) {
    if (m === 'PATCH') {
      const b = await readBody(req, 2048);
      if (!STATUS_MSG.includes(b.status)) return json(res, 400, { error: 'Statut invalide.' });
      db.prepare('UPDATE messages SET status=? WHERE id=?').run(b.status, id);
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM messages WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  /* galerie */
  if (p === '/api/admin/gallery') {
    if (m === 'GET') return json(res, 200, db.prepare('SELECT * FROM gallery ORDER BY position,id').all());
    if (m === 'POST') {
      const b = await readBody(req, 8192);
      if (!imgOk(b.image)) return json(res, 400, { error: 'Image invalide.' });
      const pos = db.prepare('SELECT COALESCE(MAX(position),0)+1 n FROM gallery').get().n;
      const r = db.prepare('INSERT INTO gallery(image,caption,wide,position) VALUES(?,?,?,?)').run(b.image, str(b.caption, 200), bool(b.wide), pos);
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
  }
  id = idOf(/^\/api\/admin\/gallery\/(\d+)$/);
  if (id !== null) {
    if (m === 'PUT') {
      const b = await readBody(req, 8192);
      db.prepare('UPDATE gallery SET caption=?, wide=?, position=? WHERE id=?').run(str(b.caption, 200), bool(b.wide), Number.isInteger(b.position) ? b.position : 0, id);
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM gallery WHERE id=?').run(id); return json(res, 200, { ok: true }); }
  }

  /* téléversement d'image (JSON data-URL, 5 Mo max) */
  if (m === 'POST' && p === '/api/admin/upload') {
    const b = await readBody(req, 8 * 1024 * 1024);
    const mt = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.dataUrl || '');
    if (!mt) return json(res, 400, { error: 'Format accepté : PNG, JPEG ou WebP.' });
    const buf = Buffer.from(mt[2], 'base64');
    if (buf.length > 5 * 1024 * 1024) return json(res, 413, { error: 'Image trop lourde (5 Mo max).' });
    const magic = buf.subarray(0, 12);
    const okMagic = mt[1] === 'image/png' ? magic.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      : mt[1] === 'image/jpeg' ? magic[0] === 0xff && magic[1] === 0xd8
      : magic.subarray(0, 4).toString() === 'RIFF' && magic.subarray(8, 12).toString() === 'WEBP';
    if (!okMagic) return json(res, 400, { error: "Le fichier n'est pas une image valide." });
    const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[mt[1]];
    const name = crypto.randomBytes(10).toString('hex') + ext;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return json(res, 201, { path: '/uploads/' + name });
  }

  /* paramètres */
  if (p === '/api/admin/settings') {
    if (m === 'GET') return json(res, 200, Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)])));
    if (m === 'PUT') {
      const b = await readBody(req, 8192);
      const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      for (const k of SETTING_KEYS) if (k in b) {
        let v = str(b[k], LONG_KEYS[k] || 300);
        if (IMAGE_KEYS.includes(k) && v && !imgOk(v)) return json(res, 400, { error: 'Image invalide.' });
        if (k === 'hero_steps') v = v.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8).join('\n');
        if (k === 'whatsapp') v = v.replace(/\D/g, '');
        if ((k === 'facebook' || k === 'instagram') && v && !/^https:\/\//.test(v)) return json(res, 400, { error: 'Les liens doivent commencer par https://' });
        up.run(k, v);
      }
      return json(res, 200, { ok: true });
    }
  }
  if (m === 'POST' && p === '/api/admin/password') {
    const b = await readBody(req, 2048);
    const row = db.prepare('SELECT password_hash FROM admin WHERE id=1').get();
    if (!checkPw(String(b.current || ''), row.password_hash)) return json(res, 400, { error: 'Mot de passe actuel incorrect.' });
    const next = String(b.next || '');
    if (next.length < 10) return json(res, 400, { error: 'Le nouveau mot de passe doit contenir au moins 10 caractères.' });
    db.prepare('UPDATE admin SET password_hash=? WHERE id=1').run(hashPw(next));
    const keep = sha(cookieOf(req).sid || '');
    db.prepare('DELETE FROM sessions WHERE token_hash<>?').run(keep);
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Introuvable.' });
}

/* ----------------------------------------------------------------- statique */
function serveFile(res, base, rel, extra = {}) {
  const file = path.resolve(base, '.' + path.posix.normalize('/' + rel));
  if (file !== base && !file.startsWith(base + path.sep)) return send(res, 403, 'Interdit');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Page introuvable', { 'Content-Type': 'text/plain; charset=utf-8' });
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const long = /\.(webp|png|jpe?g|svg)$/i.test(file);
    res.writeHead(200, { ...SEC, 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': long ? 'public, max-age=3600, must-revalidate' : 'no-cache', ...extra });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Requête invalide'); }
    url.pathname = pathname;

    if (pathname.startsWith('/api/')) {
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Origine refusée.' });
        if (!String(req.headers['content-type'] || '').startsWith('application/json') && req.method !== 'DELETE')
          return json(res, 415, { error: 'JSON requis.' });
      }
      const handled = pathname.startsWith('/api/admin/') ? await adminApi(req, res, url) : await publicApi(req, res, url);
      if (handled === false) return json(res, 404, { error: 'Introuvable.' });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Méthode non autorisée');
    if (pathname.startsWith('/uploads/')) return serveFile(res, UPLOADS, pathname.slice('/uploads/'.length));
    if (pathname === '/admin' || pathname === '/admin/') return serveFile(res, PUBLIC, 'admin/index.html', { 'Cache-Control': 'no-store' });
    return serveFile(res, PUBLIC, pathname === '/' ? 'index.html' : pathname);
  } catch (e) {
    const code = e.code === 400 || e.code === 413 ? e.code : 500;
    if (code === 500) console.error(e);
    if (!res.headersSent) json(res, code, { error: code === 500 ? 'Erreur serveur.' : e.message });
  }
});
server.listen(PORT, () => console.log(`Site : http://localhost:${PORT}   Back office : http://localhost:${PORT}/admin`));
