'use strict';
/* Site public : le contenu dynamique (formations, galerie, coordonnées) vient de /api/public.
   Tout est construit avec textContent : aucun HTML venant de la base n'est interprété. */

const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const icon = body => {
  const t = document.createElement('template');
  t.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>'; // constantes internes uniquement
  return t.content.firstChild;
};
const ICONS = {
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  grp: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
  cert: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  price: '<path d="M20 12 12 20 4 12V4h8z"/><circle cx="8.5" cy="8.5" r="1.2"/>'
};
const safeUrl = u => (/^https:\/\//.test(u) ? u : null);

/* ---------- en-tête, menu, apparition, lien actif ---------- */
const header = $('#header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

const burger = $('.burger'), menu = $('#menu');
const setMenu = open => {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
};
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}), { threshold: .12 });
const reveal = el => io.observe(el);
document.querySelectorAll('.reveal').forEach(reveal);

const links = [...menu.querySelectorAll('a:not(.btn)')];
const spy = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
$('#year').textContent = new Date().getFullYear();

/* ---------- données du back office ---------- */
let SITE = { settings: {}, courses: [], gallery: [] };
const waLink = text => SITE.settings.whatsapp ? `https://wa.me/${SITE.settings.whatsapp}?text=${encodeURIComponent(text)}` : null;

function renderCourses() {
  const box = $('#courses'); box.replaceChildren();
  const s = SITE.settings;
  if (!SITE.courses.length) { box.append(h('p', { class: 'more' }, 'De nouvelles formations arrivent bientôt.')); return; }
  SITE.courses.forEach((c, i) => {
    const poster = c.image ? h('button', { class: 'poster', type: 'button', 'data-full': c.image, 'aria-label': "Agrandir l'affiche : " + c.title },
      h('img', { src: c.image, alt: "Affiche de la formation " + c.title, width: 1254, height: 1254, loading: 'lazy' }), h('span', { class: 'zoom' }, "Agrandir l'affiche")) : null;
    const fact = (ic, label, val) => val ? h('div', {}, icon(ICONS[ic]), h('dt', {}, label), h('dd', {}, val)) : null;
    const actions = h('div', { class: 'actions' });
    if (c.enrollment_open) {
      actions.append(h('button', { class: 'btn enroll', type: 'button', 'data-id': c.id }, "S'inscrire"));
      const wa = waLink(`Bonjour Dige-e-com Academy, je souhaite m'inscrire à la formation : ${c.title}`);
      if (wa) actions.append(h('a', { class: 'btn btn-ghost', href: wa, target: '_blank', rel: 'noopener' }, 'Écrire sur WhatsApp'));
    } else actions.append(h('span', { class: 'btn closed', 'aria-disabled': 'true' }, 'Inscriptions fermées'));
    if (s.phone_intl) actions.append(h('a', { class: 'btn btn-ghost', href: 'tel:' + s.phone_intl.replace(/[^\d+]/g, '') }, 'Appeler'));
    const card = h('article', { class: 'course reveal' + (i % 2 ? ' flip' : '') }, poster,
      h('div', { class: 'course-body' },
        c.tag ? h('span', { class: 'badge' }, c.tag) : null, h('h3', {}, c.title),
        c.description ? h('p', { class: 'course-desc' }, c.description) : null,
        h('div', { class: 'course-cols' },
          c.program.length ? h('div', {}, h('h4', {}, 'Au programme'),
            h('ul', { class: 'program' }, c.program.map(p => h('li', {}, h('b', {}, p.t), p.d ? h('span', {}, p.d) : null)))) : null,
          h('div', {}, h('h4', {}, 'Infos pratiques'), h('dl', { class: 'facts' },
            fact('cal', 'Jour', c.day), fact('price', 'Tarif', c.price), fact('pin', 'Lieu', c.location),
            s.phone ? h('div', {}, icon(ICONS.tel), h('dt', {}, 'Contact'), h('dd', {}, h('a', { href: 'tel:' + (s.phone_intl || s.phone).replace(/[^\d+]/g, '') }, s.phone))) : null,
            fact('grp', 'Effectif', c.effectif), fact('cert', 'Validation', c.validation)))),
        actions));
    box.append(card); reveal(card);
  });
}

function renderGallery() {
  const box = $('#gallery'); box.replaceChildren();
  if (!SITE.gallery.length) { $('#apprenants').hidden = true; return; }
  SITE.gallery.forEach(g => {
    const fig = h('figure', { class: (g.wide ? 'wide ' : '') + 'reveal' },
      h('button', { class: 'poster', type: 'button', 'data-full': g.image, 'aria-label': 'Agrandir la photo' + (g.caption ? ' : ' + g.caption : '') },
        h('img', { src: g.image, alt: g.caption || 'Photo des apprenants de Dige-e-com Academy', loading: 'lazy' }), h('span', { class: 'zoom' }, 'Agrandir la photo')),
      g.caption ? h('figcaption', {}, g.caption) : null);
    box.append(fig); reveal(fig);
  });
}

function renderContact() {
  const s = SITE.settings, ul = $('#channels'); ul.replaceChildren();
  if (s.phone) ul.append(h('li', {}, h('a', { href: 'tel:' + (s.phone_intl || s.phone).replace(/[^\d+]/g, '') }, 'Téléphone : ' + s.phone)));
  if (s.address) ul.append(h('li', {}, s.address));
  if (s.email) ul.append(h('li', {}, h('a', { href: 'mailto:' + s.email }, s.email)));
  if (safeUrl(s.facebook)) ul.append(h('li', {}, h('a', { href: s.facebook, target: '_blank', rel: 'noopener' }, 'Facebook · Digecom Agency')));
  if (safeUrl(s.instagram)) ul.append(h('li', {}, h('a', { href: s.instagram, target: '_blank', rel: 'noopener' }, 'Instagram')));
  const social = $('.social'); social.replaceChildren('Suivez-nous sur ');
  const fb = h('a', { href: safeUrl(s.facebook) || '#', target: '_blank', rel: 'noopener', 'aria-label': 'Facebook' });
  fb.append(icon('<path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6c-.3 0-1.2-.1-2.2-.1C12.500 2.500 11 3.900 11 6.400v2.100H8.500v3H11v10h3v-10h2.400l.4-3z" fill="currentColor" stroke="none"/>'));
  if (safeUrl(s.facebook)) social.append(fb);
  if (safeUrl(s.instagram)) social.append(h('a', { href: s.instagram, target: '_blank', rel: 'noopener', 'aria-label': 'Instagram' },
    icon('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.200" cy="6.800" r=".8" fill="currentColor"/>')));
  // bouton WhatsApp flottant
  const wa = $('#wa-float'), link = waLink('Bonjour Dige-e-com Academy, je souhaite en savoir plus sur vos services.');
  if (link) { wa.href = link; wa.target = '_blank'; wa.rel = 'noopener'; }
}

/* Textes et images modifiables dans le back office (accueil + direction) */
function applyContent() {
  const s = SITE.settings;
  const set = (sel, txt) => { const el = $(sel); if (el && txt) el.textContent = txt; };
  set('.hero .eyebrow', s.hero_eyebrow);
  const h1 = $('.hero h1');
  if (h1 && s.hero_title) h1.replaceChildren(s.hero_title + ' ', s.hero_title_accent ? h('em', {}, s.hero_title_accent) : '');
  set('.hero .lead', s.hero_lead);
  const hp = $('.hero-photo'); if (hp && s.hero_image) hp.src = s.hero_image;
  set('.hero-card h2', s.hero_card_title);
  const steps = (s.hero_steps || '').split('\n').filter(Boolean), ol = $('.hero-card ol');
  if (ol && steps.length) ol.replaceChildren(...steps.map((t, i) => h('li', {}, h('b', {}, i + 1), h('span', {}, t))));
  const ps = document.querySelectorAll('.president .sub');
  if (ps[0] && s.president_text1) ps[0].textContent = s.president_text1;
  if (ps[1]) { ps[1].textContent = s.president_text2 || ''; ps[1].hidden = !s.president_text2; }
}

function renderLeaders() {
  const box = $('#leaders'), sec = $('#direction');
  box.replaceChildren();
  const list = SITE.leaders || [];
  sec.hidden = !list.length;
  list.forEach(l => {
    const fig = h('figure', { class: 'reveal' },
      l.image ? h('img', { src: l.image, alt: [l.name, l.role].filter(Boolean).join(', '), width: 918, height: 1100, loading: 'lazy' }) : null,
      h('figcaption', {}, h('b', {}, l.name), l.role ? h('span', {}, l.role) : null));
    box.append(fig); reveal(fig);
  });
}

async function load() {
  try {
    const res = await fetch('/api/public', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    SITE = await res.json();
  } catch {
    $('#courses').replaceChildren(h('p', { class: 'more' }, 'Les formations ne sont pas disponibles pour le moment. Contactez-nous directement.'));
    return;
  }
  applyContent(); renderCourses(); renderGallery(); renderLeaders(); renderContact();
}
load();

/* ---------- agrandissement des affiches (délégation) ---------- */
const lb = $('#lightbox');
document.addEventListener('click', e => {
  const b = e.target.closest('.poster');
  if (!b || !lb?.showModal) return;
  const img = lb.querySelector('img');
  img.src = b.dataset.full; img.alt = b.querySelector('img')?.alt || '';
  lb.showModal();
});
lb?.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });

/* ---------- envoi de formulaires ---------- */
async function post(url, data) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Une erreur est survenue. Réessayez.');
}
function validate(form) {
  let ok = true;
  form.querySelectorAll('input[required],textarea[required]').forEach(i => {
    const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
    i.classList.toggle('err', bad); i.setAttribute('aria-invalid', bad); if (bad) ok = false;
  });
  const opt = form.querySelector('input[type=email]:not([required])');
  if (opt && opt.value && !/^\S+@\S+\.\S+$/.test(opt.value)) { opt.classList.add('err'); ok = false; }
  return ok;
}

const contactForm = $('#contact-form');
contactForm.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('.form-msg', contactForm), btn = $('button[type=submit]', contactForm);
  if (!validate(contactForm)) { msg.textContent = 'Merci de remplir correctement tous les champs.'; return; }
  btn.disabled = true; msg.textContent = 'Envoi en cours…';
  try {
    await post('/api/messages', Object.fromEntries(new FormData(contactForm)));
    msg.textContent = 'Merci ! Votre message a bien été envoyé, nous vous répondons rapidement.';
    contactForm.reset();
  } catch (err) { msg.textContent = err.message; }
  btn.disabled = false;
});

const dlg = $('#enroll-dialog'), enrollForm = $('#enroll-form');
let enrollCourse = null;
document.addEventListener('click', e => {
  const b = e.target.closest('.enroll');
  if (!b) return;
  enrollCourse = SITE.courses.find(c => c.id === Number(b.dataset.id));
  if (!enrollCourse) return;
  $('#enroll-title').textContent = "S'inscrire : " + enrollCourse.title;
  $('#enroll-sub').textContent = 'Laissez-nous vos coordonnées, nous vous rappelons pour confirmer votre inscription.';
  $('.form-msg', enrollForm).textContent = '';
  dlg.showModal(); $('#en-name').focus();
});
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.dlg-close')) dlg.close(); });
enrollForm.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('.form-msg', enrollForm), btn = $('button[type=submit]', enrollForm);
  if (!validate(enrollForm)) { msg.textContent = 'Merci de remplir correctement les champs obligatoires.'; return; }
  btn.disabled = true; msg.textContent = 'Envoi en cours…';
  try {
    await post('/api/enrollments', { ...Object.fromEntries(new FormData(enrollForm)), course_id: enrollCourse.id });
    msg.textContent = 'Merci ! Votre demande est enregistrée, nous vous contactons très vite.';
    enrollForm.reset();
    setTimeout(() => dlg.close(), 2500);
  } catch (err) { msg.textContent = err.message; }
  btn.disabled = false;
});
