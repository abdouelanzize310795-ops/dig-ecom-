'use strict';
/* Back office — Dige-e-com Academy. Tout le contenu dynamique passe par textContent (pas d'innerHTML). */
const app = document.getElementById('app');

/* ---------- utilitaires ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
async function api(path, method = 'GET', body) {
  const res = await fetch('/api/admin' + path, {
    method, credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : (method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && path !== '/login') { renderLogin(); throw new Error('Session expirée'); }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || 'Erreur ' + res.status);
  return data;
}
let toastTimer;
function toast(text, err) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast' + (err ? ' err' : ''), role: 'status' }, text);
  document.body.append(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3200);
}
const fail = e => toast(e.message, true);
const fmtDate = s => new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const field = (label, input) => h('label', {}, label, input);
const confirmDel = txt => window.confirm(txt + '\n\nCette action est définitive.');

function imagePicker(initial, onChange, label = 'Image') {
  let current = initial || '';
  const img = h('img', { alt: '', src: current || '/assets/logo.png' });
  const info = h('span', { class: 'muted' }, current ? 'Image actuelle' : 'Aucune image');
  const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', onchange: async () => {
    const f = input.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast('Image trop lourde (5 Mo max).', true);
    info.textContent = 'Envoi…';
    const dataUrl = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
    try {
      const { path } = await api('/upload', 'POST', { dataUrl });
      current = path; img.src = path; info.textContent = 'Image envoyée'; onChange(path);
    } catch (e) { info.textContent = 'Échec'; fail(e); }
  } });
  return h('div', {}, h('span', { class: 'muted', style: 'font-size:.88rem;font-weight:500' }, label),
    h('div', { class: 'thumb' }, img, h('div', {}, input, h('br'), info)));
}

/* ---------- connexion ---------- */
function renderLogin() {
  const msg = h('p', { class: 'msg err', role: 'alert' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true, id: 'pw' });
  app.replaceChildren(h('div', { class: 'login' },
    h('form', { onsubmit: async e => {
      e.preventDefault(); msg.textContent = '';
      try { await api('/login', 'POST', { password: pw.value }); start(); }
      catch (err) { msg.textContent = err.message; }
    } },
      h('img', { src: '/assets/logo-main.png?v=3', alt: 'Dige-e-com Academy' }),
      h('h1', {}, 'Back office'),
      field('Mot de passe', pw),
      h('button', { class: 'btn', type: 'submit' }, 'Se connecter'), msg)));
  pw.focus();
}

/* ---------- coque ---------- */
const VIEWS = [
  ['dashboard', 'Tableau de bord'], ['courses', 'Formations'], ['enrollments', 'Inscriptions'],
  ['messages', 'Messages'], ['gallery', 'Galerie'], ['leaders', 'Direction'], ['content', 'Contenu du site'], ['settings', 'Paramètres']
];
let current = 'dashboard', stats = {};
async function start() {
  try { await api('/me'); } catch { return renderLogin(); }
  show(location.hash.slice(1) || 'dashboard');
}
async function show(view) {
  if (!VIEWS.some(v => v[0] === view)) view = 'dashboard';
  current = view; history.replaceState(null, '', '#' + view);
  try { stats = await api('/stats'); } catch { return; }
  const badge = { enrollments: stats.enrollmentsNew, messages: stats.messagesNew };
  const side = h('nav', { class: 'side', 'aria-label': 'Navigation' },
    h('img', { src: '/assets/logo-main.png?v=3', alt: 'Dige-e-com Academy' }),
    VIEWS.map(([id, label]) => h('button', { class: 'nav-btn', 'aria-current': id === current ? 'page' : false, onclick: () => show(id) },
      label, badge[id] ? h('span', { class: 'pill' }, badge[id]) : null)),
    h('span', { class: 'spacer' }),
    h('a', { class: 'nav-btn view', href: '/', target: '_blank', rel: 'noopener' }, 'Voir le site ↗'),
    h('button', { class: 'nav-btn', onclick: async () => { await api('/logout', 'POST', {}).catch(() => {}); renderLogin(); } }, 'Déconnexion'));
  const main = h('main', { id: 'view' });
  app.replaceChildren(h('div', { class: 'shell' }, side, main));
  const renderers = { dashboard, courses, enrollments, messages, gallery, leaders, content, settings };
  try { await renderers[current](main); } catch (e) { fail(e); }
}

/* ---------- tableau de bord ---------- */
async function dashboard(main) {
  const s = stats;
  const stat = (n, label, sub, to) => h('button', { class: 'card stat', style: 'text-align:left;cursor:pointer', onclick: () => show(to) },
    h('b', {}, n), h('span', {}, label), sub ? h('small', {}, sub) : null);
  main.append(h('h2', {}, 'Tableau de bord'),
    h('div', { class: 'stats' },
      stat(s.enrollments, 'Inscriptions', s.enrollmentsNew ? s.enrollmentsNew + ' nouvelle(s)' : '', 'enrollments'),
      stat(s.messages, 'Messages', s.messagesNew ? s.messagesNew + ' nouveau(x)' : '', 'messages'),
      stat(s.courses, 'Formations', '', 'courses'),
      stat(s.gallery, 'Photos en galerie', '', 'gallery')));
  const enr = (await api('/enrollments')).slice(0, 5);
  main.append(h('h3', { style: 'margin-top:2rem' }, 'Dernières inscriptions'),
    enr.length ? h('div', { class: 'card tablewrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Date', 'Nom', 'Formation', 'Téléphone', 'Statut'].map(t => h('th', {}, t)))),
      h('tbody', {}, enr.map(r => h('tr', { class: r.status === 'nouveau' ? 'new' : '' },
        h('td', {}, fmtDate(r.created_at)), h('td', {}, r.name), h('td', {}, r.course_title), h('td', {}, r.phone), h('td', {}, r.status))))))
      : h('div', { class: 'card empty' }, 'Aucune inscription pour le moment.'));
}

/* ---------- formations ---------- */
async function courses(main) {
  const list = await api('/courses');
  const top = h('div', { class: 'top' }, h('h2', {}, 'Formations'), h('button', { class: 'btn', onclick: () => editCourse(main, null) }, '+ Nouvelle formation'));
  main.append(top, list.length ? h('div', { class: 'list' }, list.map(c => h('div', { class: 'card item' },
    h('img', { src: c.image || '/assets/logo.png', alt: '' }),
    h('div', {}, h('h3', {}, c.title),
      h('div', {}, h('span', { class: 'tag ' + (c.published ? 'on' : 'off') }, c.published ? 'Publiée' : 'Brouillon'), ' ',
        h('span', { class: 'tag ' + (c.enrollment_open ? 'on' : 'off') }, c.enrollment_open ? 'Inscriptions ouvertes' : 'Inscriptions fermées')),
      h('p', { class: 'muted' }, 'Jour : ' + (c.day || '—') + (c.price ? ' · Prix : ' + c.price : ''))),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn ghost sm', onclick: () => editCourse(main, c) }, 'Modifier'),
      h('button', { class: 'btn danger sm', onclick: async () => {
        if (!confirmDel(`Supprimer la formation « ${c.title} » ?`)) return;
        try { await api('/courses/' + c.id, 'DELETE'); toast('Formation supprimée'); show('courses'); } catch (e) { fail(e); }
      } }, 'Supprimer'))))) : h('div', { class: 'card empty' }, 'Aucune formation.'));
}
function editCourse(main, c) {
  const d = c || { title: '', tag: '', description: '', program: [], day: 'À confirmer', location: '', effectif: '', validation: '', price: '', image: '', published: true, enrollment_open: true, position: 0 };
  const f = {};
  const inp = (k, label, type = 'text') => { f[k] = h('input', { type, value: d[k] ?? '' }); return field(label, f[k]); };
  let image = d.image;
  const prog = h('div', { class: 'form' });
  const addRow = (p = { t: '', d: '' }) => {
    const row = h('div', { class: 'prog-row' },
      h('input', { type: 'text', placeholder: 'Sujet (ex. Excel)', value: p.t, 'aria-label': 'Sujet' }),
      h('input', { type: 'text', placeholder: 'Détail (ex. tableaux et calculs)', value: p.d, 'aria-label': 'Détail' }),
      h('button', { class: 'btn danger sm', type: 'button', onclick: () => row.remove() }, 'Retirer'));
    prog.append(row);
  };
  (d.program.length ? d.program : [{ t: '', d: '' }]).forEach(addRow);
  f.description = h('textarea', {}, d.description);
  f.published = h('input', { type: 'checkbox', checked: d.published });
  f.enrollment_open = h('input', { type: 'checkbox', checked: d.enrollment_open });
  const form = h('form', { class: 'card form', onsubmit: async e => {
    e.preventDefault();
    const body = {
      title: f.title.value, tag: f.tag.value, description: f.description.value, day: f.day.value, location: f.location.value,
      effectif: f.effectif.value, validation: f.validation.value, price: f.price.value, image,
      published: f.published.checked, enrollment_open: f.enrollment_open.checked, position: parseInt(f.position.value, 10) || 0,
      program: [...prog.children].map(r => { const i = r.querySelectorAll('input'); return { t: i[0].value, d: i[1].value }; }).filter(p => p.t.trim())
    };
    try { await (c ? api('/courses/' + c.id, 'PUT', body) : api('/courses', 'POST', body)); toast('Formation enregistrée'); show('courses'); } catch (err) { fail(err); }
  } },
    inp('title', 'Titre *'), inp('tag', 'Étiquette (ex. Formation 100 % pratique)'),
    field('Description', f.description),
    h('div', { class: 'grid2' }, inp('day', 'Jour / dates'), inp('price', 'Prix (laisser vide pour ne pas afficher)')),
    h('div', { class: 'grid2' }, inp('location', 'Lieu'), inp('effectif', 'Effectif')),
    h('div', { class: 'grid2' }, inp('validation', 'Validation'), inp('position', 'Ordre d\'affichage', 'number')),
    imagePicker(image, p => { image = p; }, 'Affiche de la formation'),
    h('div', {}, h('h3', {}, 'Programme'), prog, h('button', { class: 'btn ghost sm', type: 'button', style: 'margin-top:.6rem', onclick: () => addRow() }, '+ Ajouter une ligne')),
    h('label', { class: 'check' }, f.published, 'Publiée sur le site'),
    h('label', { class: 'check' }, f.enrollment_open, 'Inscriptions ouvertes'),
    h('div', { class: 'row-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Enregistrer'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => show('courses') }, 'Annuler')));
  main.replaceChildren(h('h2', {}, c ? 'Modifier la formation' : 'Nouvelle formation'), form);
  f.title.required = true; f.title.focus();
}

/* ---------- inscriptions ---------- */
async function enrollments(main) {
  const rows = await api('/enrollments');
  main.append(h('div', { class: 'top' }, h('h2', {}, 'Inscriptions'),
    h('a', { class: 'btn ghost', href: '/api/admin/enrollments.csv' }, 'Exporter en CSV')));
  if (!rows.length) return main.append(h('div', { class: 'card empty' }, 'Aucune inscription pour le moment.'));
  main.append(h('div', { class: 'card tablewrap' }, h('table', {},
    h('thead', {}, h('tr', {}, ['Date', 'Candidat', 'Formation', 'Statut', 'Note', ''].map(t => h('th', {}, t)))),
    h('tbody', {}, rows.map(r => {
      const sel = h('select', { 'aria-label': 'Statut' }, ['nouveau', 'contacté', 'confirmé', 'annulé'].map(s => h('option', { value: s, selected: s === r.status }, s)));
      const note = h('input', { type: 'text', value: r.note, placeholder: 'Note interne', 'aria-label': 'Note' });
      const save = async () => { try { await api('/enrollments/' + r.id, 'PATCH', { status: sel.value, note: note.value }); toast('Enregistré'); } catch (e) { fail(e); } };
      sel.addEventListener('change', async () => { await save(); show('enrollments'); });
      note.addEventListener('change', save);
      return h('tr', { class: r.status === 'nouveau' ? 'new' : '' },
        h('td', {}, fmtDate(r.created_at)),
        h('td', {}, h('b', {}, r.name), h('br'), h('a', { href: 'tel:' + r.phone.replace(/[^\d+]/g, '') }, r.phone), r.email ? h('br') : null,
          r.email ? h('a', { href: 'mailto:' + r.email }, r.email) : null, r.message ? h('p', { class: 'muted' }, r.message) : null),
        h('td', {}, r.course_title), h('td', {}, sel), h('td', {}, note),
        h('td', {}, h('button', { class: 'btn danger sm', onclick: async () => {
          if (!confirmDel(`Supprimer l'inscription de ${r.name} ?`)) return;
          try { await api('/enrollments/' + r.id, 'DELETE'); show('enrollments'); } catch (e) { fail(e); }
        } }, 'Supprimer')));
    })))));
}

/* ---------- messages ---------- */
async function messages(main) {
  const rows = await api('/messages');
  main.append(h('h2', {}, 'Messages'));
  if (!rows.length) return main.append(h('div', { class: 'card empty' }, 'Aucun message pour le moment.'));
  main.append(h('div', { class: 'list' }, rows.map(r => {
    const sel = h('select', { 'aria-label': 'Statut' }, ['nouveau', 'lu', 'traité'].map(s => h('option', { value: s, selected: s === r.status }, s)));
    sel.addEventListener('change', async () => { try { await api('/messages/' + r.id, 'PATCH', { status: sel.value }); show('messages'); } catch (e) { fail(e); } });
    return h('div', { class: 'card' },
      h('div', { class: 'top', style: 'margin-bottom:.4rem' }, h('h3', { style: 'margin:0' }, r.name + (r.status === 'nouveau' ? ' • nouveau' : '')), h('span', { class: 'muted' }, fmtDate(r.created_at))),
      h('p', {}, h('a', { href: 'mailto:' + r.email }, r.email)),
      h('p', { style: 'white-space:pre-wrap;margin:.6rem 0' }, r.message),
      h('div', { class: 'row-actions' }, sel, h('button', { class: 'btn danger sm', onclick: async () => {
        if (!confirmDel('Supprimer ce message ?')) return;
        try { await api('/messages/' + r.id, 'DELETE'); show('messages'); } catch (e) { fail(e); }
      } }, 'Supprimer')));
  })));
}

/* ---------- galerie ---------- */
async function gallery(main) {
  const rows = await api('/gallery');
  const cap = h('input', { type: 'text', placeholder: 'Légende (optionnel)', 'aria-label': 'Légende' });
  const wide = h('input', { type: 'checkbox' });
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Photo' });
  main.append(h('h2', {}, 'Galerie « Nos apprenants »'),
    h('form', { class: 'card form', onsubmit: async e => {
      e.preventDefault();
      const f = file.files[0]; if (!f) return toast('Choisissez une photo.', true);
      if (f.size > 5 * 1024 * 1024) return toast('Image trop lourde (5 Mo max).', true);
      try {
        const dataUrl = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
        const { path } = await api('/upload', 'POST', { dataUrl });
        await api('/gallery', 'POST', { image: path, caption: cap.value, wide: wide.checked });
        toast('Photo ajoutée'); show('gallery');
      } catch (err) { fail(err); }
    } },
      h('h3', {}, 'Ajouter une photo'), file, cap,
      h('label', { class: 'check' }, wide, 'Photo pleine largeur (photo de groupe)'),
      h('p', { class: 'muted' }, 'Vérifiez que les personnes photographiées ont donné leur accord avant de publier.'),
      h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Ajouter'))),
    h('div', { class: 'gal', style: 'margin-top:1.4rem' }, rows.map(g => {
      const c = h('input', { type: 'text', value: g.caption, 'aria-label': 'Légende' });
      const w = h('input', { type: 'checkbox', checked: g.wide });
      const pos = h('input', { type: 'number', value: g.position, 'aria-label': 'Ordre', style: 'width:5rem' });
      const save = async () => { try { await api('/gallery/' + g.id, 'PUT', { caption: c.value, wide: w.checked, position: parseInt(pos.value, 10) || 0 }); toast('Enregistré'); } catch (e) { fail(e); } };
      [c, w, pos].forEach(x => x.addEventListener('change', save));
      return h('figure', { class: 'card' }, h('img', { src: g.image, alt: g.caption || 'Photo de la galerie' }), c,
        h('div', { class: 'row-actions' }, h('label', { class: 'check' }, w, 'Pleine largeur'), h('label', { class: 'check' }, 'Ordre', pos)),
        h('button', { class: 'btn danger sm', onclick: async () => {
          if (!confirmDel('Retirer cette photo de la galerie ?')) return;
          try { await api('/gallery/' + g.id, 'DELETE'); show('gallery'); } catch (e) { fail(e); }
        } }, 'Retirer'));
    })));
}

/* ---------- contenu du site (accueil + direction) ---------- */
async function content(main) {
  const s = await api('/settings');
  const v = {}; // valeurs courantes des champs
  const text = (k, label, hint) => { v[k] = h('input', { type: 'text', value: s[k] || '' }); return h('div', {}, field(label, v[k]), hint ? h('small', { class: 'muted' }, hint) : null); };
  const area = (k, label, hint, rows = 3) => { v[k] = h('textarea', { rows }, s[k] || ''); return h('div', {}, field(label, v[k]), hint ? h('small', { class: 'muted' }, hint) : null); };
  const images = { hero_image: s.hero_image };
  const save = async (keys, label) => {
    const body = {};
    keys.forEach(k => { body[k] = k in images ? images[k] : v[k].value; });
    try { await api('/settings', 'PUT', body); toast(label + ' enregistré'); } catch (e) { fail(e); }
  };
  const heroKeys = ['hero_eyebrow', 'hero_title', 'hero_title_accent', 'hero_lead', 'hero_image', 'hero_card_title', 'hero_steps'];
  const presKeys = ['president_text1', 'president_text2'];
  main.append(h('h2', {}, 'Contenu du site'),
    h('form', { class: 'card form', onsubmit: e => { e.preventDefault(); save(heroKeys, 'Accueil'); } },
      h('h3', {}, "Accueil (haut de page)"),
      imagePicker(images.hero_image, p => { images.hero_image = p; }, 'Photo principale'),
      text('hero_eyebrow', 'Étiquette au-dessus du titre'),
      h('div', { class: 'grid2' }, text('hero_title', 'Titre', 'Première partie, en blanc.'), text('hero_title_accent', 'Fin du titre (en italique orange)')),
      area('hero_lead', 'Texte d\'introduction', null, 3),
      text('hero_card_title', 'Titre de la carte sur la photo'),
      area('hero_steps', 'Étapes de la carte', 'Une étape par ligne (8 maximum).', 5),
      h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Enregistrer l\'accueil'))),
    h('form', { class: 'card form', style: 'margin-top:1.4rem', onsubmit: e => { e.preventDefault(); save(presKeys, 'Section direction'); } },
      h('h3', {}, 'Texte de la section « La direction »'),
      h('p', { class: 'muted' }, 'Les personnes (photo, nom, fonction) se gèrent dans l\'écran « Direction ».'),
      area('president_text1', 'Premier paragraphe', null, 3),
      area('president_text2', 'Second paragraphe (facultatif)', 'Laissez vide pour le masquer.', 3),
      h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Enregistrer le texte'))));
}

/* ---------- direction (personnes) ---------- */
async function leaders(main) {
  const rows = await api('/leaders');
  // formulaire d'ajout
  let newImage = '';
  const nName = h('input', { type: 'text', required: true, 'aria-label': 'Nom' });
  const nRole = h('input', { type: 'text', 'aria-label': 'Fonction' });
  main.append(h('h2', {}, 'Direction'),
    h('form', { class: 'card form', onsubmit: async e => {
      e.preventDefault();
      try { await api('/leaders', 'POST', { name: nName.value, role: nRole.value, image: newImage, published: true, position: rows.length + 1 }); toast('Personne ajoutée'); show('leaders'); } catch (err) { fail(err); }
    } },
      h('h3', {}, 'Ajouter une personne'),
      imagePicker('', p => { newImage = p; }, 'Portrait'),
      h('div', { class: 'grid2' }, field('Nom *', nName), field('Fonction', nRole)),
      h('p', { class: 'muted' }, 'Vérifiez que la personne a donné son accord avant de publier sa photo.'),
      h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Ajouter'))),
    h('div', { class: 'list', style: 'margin-top:1.4rem' }, rows.map(l => {
      let image = l.image;
      const name = h('input', { type: 'text', value: l.name, 'aria-label': 'Nom' });
      const role = h('input', { type: 'text', value: l.role, 'aria-label': 'Fonction' });
      const pos = h('input', { type: 'number', value: l.position, 'aria-label': 'Ordre', style: 'width:5rem' });
      const pub = h('input', { type: 'checkbox', checked: l.published });
      return h('form', { class: 'card form', onsubmit: async e => {
        e.preventDefault();
        try { await api('/leaders/' + l.id, 'PUT', { name: name.value, role: role.value, image, published: pub.checked, position: parseInt(pos.value, 10) || 0 }); toast('Enregistré'); show('leaders'); } catch (err) { fail(err); }
      } },
        imagePicker(image, p => { image = p; }, 'Portrait'),
        h('div', { class: 'grid2' }, field('Nom', name), field('Fonction', role)),
        h('div', { class: 'row-actions' },
          h('label', { class: 'check' }, pub, 'Visible sur le site'), h('label', { class: 'check' }, 'Ordre', pos),
          h('button', { class: 'btn sm', type: 'submit' }, 'Enregistrer'),
          h('button', { class: 'btn danger sm', type: 'button', onclick: async () => {
            if (!confirmDel(`Retirer ${l.name} de la direction ?`)) return;
            try { await api('/leaders/' + l.id, 'DELETE'); show('leaders'); } catch (err) { fail(err); }
          } }, 'Supprimer')));
    })));
}

/* ---------- paramètres ---------- */
async function settings(main) {
  const s = await api('/settings');
  const f = {};
  const inp = (k, label, type = 'text', hint) => { f[k] = h('input', { type, value: s[k] || '' }); return h('div', {}, field(label, f[k]), hint ? h('small', { class: 'muted' }, hint) : null); };
  const info = h('form', { class: 'card form', onsubmit: async e => {
    e.preventDefault();
    try { await api('/settings', 'PUT', Object.fromEntries(Object.keys(f).map(k => [k, f[k].value]))); toast('Paramètres enregistrés'); } catch (err) { fail(err); }
  } },
    h('h3', {}, 'Coordonnées affichées sur le site'),
    h('div', { class: 'grid2' }, inp('phone', 'Téléphone (affiché)'), inp('phone_intl', 'Téléphone (format international)', 'text', 'Ex. +2694510591, utilisé pour le lien « Appeler ».')),
    inp('whatsapp', 'Numéro WhatsApp', 'text', "Chiffres uniquement, avec l'indicatif du pays, sans « + ». Active le bouton WhatsApp flottant et les inscriptions par WhatsApp."),
    inp('address', 'Adresse'), inp('email', 'Email de contact', 'email'),
    h('div', { class: 'grid2' }, inp('facebook', 'Lien Facebook', 'url'), inp('instagram', 'Lien Instagram', 'url')),
    h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Enregistrer')));
  const cur = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const nxt = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: 10 });
  const pwForm = h('form', { class: 'card form', style: 'margin-top:1.4rem', onsubmit: async e => {
    e.preventDefault();
    try { await api('/password', 'POST', { current: cur.value, next: nxt.value }); toast('Mot de passe modifié'); pwForm.reset(); } catch (err) { fail(err); }
  } },
    h('h3', {}, 'Changer le mot de passe'), field('Mot de passe actuel', cur), field('Nouveau mot de passe (10 caractères minimum)', nxt),
    h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Modifier')));
  main.append(h('h2', {}, 'Paramètres'), info, pwForm);
}

window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== current && document.querySelector('.shell')) show(v); });
start();
