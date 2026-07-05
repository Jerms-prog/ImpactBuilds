/* =============================================
   IMPACT BUILDS — PUBLIC SITE SCRIPT
   script.js
   ============================================= */
'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* =============================================
   REVEAL MODULE — shared queue, starts after
   loading screen dismisses so elements that are
   technically "in viewport" don't trigger early
   ============================================= */
const REVEAL = (() => {
  let obs     = null;
  let started = false;
  const queue = [];

  function observe(el, variant) {
    if (!el || el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    if (variant) el.classList.add('reveal--' + variant);
    obs ? obs.observe(el) : queue.push(el);
  }

  function start() {
    if (started) return;
    started = true;
    obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const siblings = [...entry.target.parentElement.children]
          .filter(c => c.classList.contains('reveal'));
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('revealed'), Math.min(idx * 90, 480));
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    queue.splice(0).forEach(el => obs.observe(el));
  }

  /* Safety fallback: start reveal even if loading screen never fires */
  setTimeout(start, 5500);

  return { observe, start };
})();

/* =============================================
   LOADING SCREEN
   ============================================= */
(function initLoadScreen() {
  const overlay = document.getElementById('lsOverlay');
  const bar     = document.getElementById('lsProgBar');
  const pct     = document.getElementById('lsPct');
  if (!overlay) return;

  let progress = 0;
  const startTime = Date.now();

  function setProgress(n) {
    progress = Math.min(100, Math.max(progress, n));
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = Math.round(progress) + '%';
  }

  function dismiss() {
    setProgress(100);
    setTimeout(() => {
      overlay.classList.add('ls-done');
      setTimeout(() => {
        overlay.style.display = 'none';
        REVEAL.start();
        document.dispatchEvent(new Event('reveal:ready'));
      }, 950);
    }, 320);
  }

  /* Staged progress ticks for drama */
  setTimeout(() => setProgress(18), 120);
  setTimeout(() => setProgress(42), 450);
  setTimeout(() => setProgress(67), 900);
  setTimeout(() => setProgress(84), 1400);

  window.addEventListener('load', () => {
    const elapsed = Date.now() - startTime;
    setTimeout(dismiss, Math.max(0, 1900 - elapsed));
  });

  /* Hard cap at 4s */
  setTimeout(dismiss, 4000);
})();

/* =============================================
   SCROLL PROGRESS BAR
   ============================================= */
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const docH   = document.documentElement.scrollHeight - window.innerHeight;
    const pct    = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

/* =============================================
   STICKY HEADER
   ============================================= */
(function initHeader() {
  const header = $('#header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();

/* =============================================
   MOBILE NAV
   ============================================= */
(function initMobileNav() {
  const burger = $('#hamburger');
  const links  = $('#navLinks');
  if (!burger || !links) return;

  const toggle = (force) => {
    const open = typeof force === 'boolean' ? force : !burger.classList.contains('open');
    burger.classList.toggle('open', open);
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  burger.addEventListener('click', () => toggle());
  $$('.nav__link', links).forEach(l => l.addEventListener('click', () => toggle(false)));
  document.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !links.contains(e.target)) toggle(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
})();

/* =============================================
   ACTIVE NAV LINK on scroll
   ============================================= */
(function initActiveNav() {
  const sections = $$('section[id]');
  const links    = $$('.nav__link');
  if (!sections.length || !links.length) return;
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: `-${navH}px 0px -55% 0px` });
  sections.forEach(s => obs.observe(s));
})();

/* =============================================
   SMOOTH SCROLL
   ============================================= */
(function initSmoothScroll() {
  const navH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH(), behavior: 'smooth' });
    });
  });
})();

/* =============================================
   SCROLL REVEAL — register static elements now,
   REVEAL.start() fires after loading screen
   ============================================= */
(function initReveal() {
  /* about__text, about__video-box, about__tags excluded — initAboutScaffold handles those */
  $$('.section-header, .community-msg')
    .forEach(el => REVEAL.observe(el, 'pull'));
  $$('.media-video')
    .forEach(el => REVEAL.observe(el, 'drop'));
  $$('.community__form')
    .forEach(el => REVEAL.observe(el, ''));
  /* note-cards & screenshots are dynamic — registered in loadNotes / loadMedia */
})();

/* =============================================
   DELIVERY TRUCK — spawned on contact form submit.
   spawnMsgTruck() is called from initContactForm
   after a successful Supabase insert.
   ============================================= */
function spawnMsgTruck() {
  if (document.getElementById('deliveryTruck')) return; /* prevent double-spawn */
  const topPos = Math.round(window.innerHeight * 0.55);

  const truck = document.createElement('div');
  truck.id = 'deliveryTruck';
  truck.setAttribute('aria-hidden', 'true');
  truck.style.top = topPos + 'px';
  truck.innerHTML = `
    <svg viewBox="0 0 120 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="14" width="54" height="20" rx="2" fill="#FFB800"/>
      <path d="M6 14 Q33 4 60 14" fill="#e6a700" opacity="0.9"/>
      <rect x="59" y="18" width="28" height="16" rx="2" fill="#FFB800"/>
      <polygon points="83,18 88,11 92,11 94,18" fill="#9aaed4" opacity="0.65"/>
      <rect x="85" y="26" width="4" height="3" rx="1" fill="#fff" opacity="0.8"/>
      <rect x="3" y="34" width="88" height="5" rx="1" fill="#e6a700"/>
      <rect x="76" y="10" width="3" height="8" rx="1" fill="#c47f00"/>
      <circle cx="77" cy="8" r="3" fill="rgba(255,255,255,0.18)"/>
      <circle cx="79" cy="5" r="2" fill="rgba(255,255,255,0.10)"/>
      <circle class="tw" cx="22" cy="40" r="7" fill="#1e2a4a" stroke="#FFB800" stroke-width="2.5"/>
      <circle cx="22" cy="40" r="2.5" fill="#FFB800"/>
      <circle class="tw" cx="48" cy="40" r="7" fill="#1e2a4a" stroke="#FFB800" stroke-width="2.5"/>
      <circle cx="48" cy="40" r="2.5" fill="#FFB800"/>
      <circle class="tw" cx="73" cy="40" r="7" fill="#1e2a4a" stroke="#FFB800" stroke-width="2.5"/>
      <circle cx="73" cy="40" r="2.5" fill="#FFB800"/>
    </svg>`;

  document.body.appendChild(truck);

  /* ----- Letter that flies INTO the truck cargo area ----- */
  /* Truck parks at: left edge = 0.43*vw + 30px (derived from CSS: right:-200px + translateX(-57vw))
     Cargo rect in SVG (viewBox 0 0 120 52) is x=6 w=54. Scale = 170/120 = 1.417.
     Cargo center X in element = (6+27)*1.417 = 46.7px from truck left edge.
     Cargo center Y in element = (14+10)*1.417 = 34px from truck top. */
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const truckLeftParked = vw * 0.43 + 30;
  const cargoX = truckLeftParked + 47;   /* pixel position of cargo center in viewport */
  const cargoY = topPos + 34;

  /* Letter starts center of viewport, slightly below midpoint */
  const emojiPx = 45; /* ~2.8rem at 16px base */
  const lsx = vw * 0.5 - emojiPx / 2;
  const lsy = vh * 0.70 - emojiPx / 2;

  const letter = document.createElement('div');
  letter.id = 'msgLetter';
  letter.textContent = '✉️';
  letter.setAttribute('aria-hidden', 'true');
  /* position at 0,0; all placement done via transform in animation */
  letter.style.cssText = 'position:fixed;left:0;top:0;font-size:2.8rem;z-index:299;pointer-events:none;opacity:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));';
  document.body.appendChild(letter);

  /* Use Web Animations API so we can use computed pixel targets */
  letter.animate([
    { transform: `translate(${lsx}px,${lsy}px) scale(1.15) rotate(0deg)`,   opacity: 0 },
    { transform: `translate(${lsx}px,${lsy - 20}px) scale(1) rotate(-7deg)`, opacity: 1, offset: 0.06 },
    { transform: `translate(${lsx + (cargoX-lsx)*0.72}px,${lsy + (cargoY-lsy)*0.72}px) rotate(-15deg) scale(0.65)`, opacity: 1, offset: 0.74 },
    { transform: `translate(${cargoX}px,${cargoY}px) rotate(-20deg) scale(0.15)`, opacity: 0.4, offset: 0.92 },
    { transform: `translate(${cargoX}px,${cargoY}px) scale(0)`, opacity: 0 }
  ], { duration: 1350, delay: 420, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' });

  setTimeout(() => letter.remove(), 2100);

  requestAnimationFrame(() => {
    truck.classList.add('delivery-active');

    /* "MESSAGE DELIVERED" badge — appears after truck has fully exited (~3.4s) */
    setTimeout(() => {
      const badge = document.createElement('div');
      badge.id = 'deliveredBadge';
      badge.textContent = '✓ MESSAGE DELIVERED!';
      badge.style.left = '50%';
      badge.style.top  = Math.max(topPos - 64, 30) + 'px';
      document.body.appendChild(badge);
      requestAnimationFrame(() => badge.classList.add('show'));
      setTimeout(() => {
        badge.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 340);
      }, 1600);
    }, 3450); /* truck exits at ~3.4s */

    setTimeout(() => truck.remove(), 5200);
  });
}

/* =============================================
   ABOUT SECTION — CONSTRUCTION SCENE + WRECKING BALL
   Only arms after loading screen finishes (reveal:ready).
   ============================================= */
(function initAboutScaffold() {
  const about = document.getElementById('about');
  if (!about) return;
  let fired = false;

  function arm() {
    if (fired) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || fired) return;
      fired = true;
      obs.disconnect();

      about.classList.add('scaffolding');
      /* Workers hammer for 2.5s before wrecking ball swings */
      setTimeout(() => about.classList.add('swinging'),   2500);
      /* Swing takes 1.5s → shatter at 4.0s */
      setTimeout(() => about.classList.add('shattered'),  3950);
      /* Content fully revealed at 4.6s */
      setTimeout(() => {
        about.classList.add('scaffold-done');
        about.classList.remove('scaffolding');
      }, 4600);
    }, { threshold: 0.4, rootMargin: '0px 0px -15% 0px' });

    /* Small delay after reveal:ready so sections in view don't fire instantly */
    setTimeout(() => obs.observe(about), 350);
  }

  document.addEventListener('reveal:ready', arm, { once: true });
  setTimeout(arm, 7000); /* fallback if reveal:ready never fires */
})();

/* =============================================
   MEDIA SECTION — BLUEPRINT SKETCH OVERLAY
   Only arms after loading screen finishes (reveal:ready).
   ============================================= */
(function initMediaBlueprint() {
  const media = document.getElementById('media');
  if (!media) return;
  let fired = false;

  function arm() {
    if (fired) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || fired) return;
      fired = true;
      obs.disconnect();
      /* Sketch stays visible for 4s so user can watch lines draw in */
      setTimeout(() => media.classList.add('blueprint-done'), 4000);
    }, { threshold: 0.4, rootMargin: '0px 0px -15% 0px' });

    setTimeout(() => obs.observe(media), 350);
  }

  document.addEventListener('reveal:ready', arm, { once: true });
  setTimeout(arm, 7000);
})();

/* =============================================
   CONTACT SECTION — RADIO TRANSMISSION
   Only arms after loading screen finishes (reveal:ready).
   ============================================= */
(function initContactTransmission() {
  const communityMsg = document.querySelector('#community .community-msg');
  if (!communityMsg) return;
  let fired = false;

  /* Inject elements up-front (DOM-only, no animation yet) */
  const ping = document.createElement('p');
  ping.className = 'transmission-ping';
  ping.textContent = '📡 INCOMING TRANSMISSION';
  communityMsg.insertBefore(ping, communityMsg.firstChild);

  const bubble = communityMsg.querySelector('.community-bubble');
  const scanFx = document.createElement('div');
  scanFx.className = 'scan-fx';
  if (bubble) bubble.appendChild(scanFx);

  const bubblePs = bubble ? bubble.querySelectorAll('p') : [];
  const msgEl    = bubblePs.length > 1 ? bubblePs[1] : null;
  const origText = msgEl ? msgEl.textContent : '';

  function arm() {
    if (fired) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || fired) return;
      fired = true;
      obs.disconnect();

      communityMsg.classList.add('transmitting');
      if (msgEl && origText) {
        msgEl.textContent = '';
        let i = 0;
        setTimeout(() => {
          const iv = setInterval(() => {
            msgEl.textContent += origText[i++];
            if (i >= origText.length) clearInterval(iv);
          }, 55);
        }, 700);
      }
    }, { threshold: 0.4, rootMargin: '0px 0px -15% 0px' });

    setTimeout(() => obs.observe(communityMsg), 350);
  }

  document.addEventListener('reveal:ready', arm, { once: true });
  setTimeout(arm, 7000);
})();

/* Team, Requirements, and FAQ reveals were scaled back to the
   simple fade used elsewhere (see REVEAL.observe calls in
   loadTeam / loadRequirements / loadFAQ below) — no custom
   scene, nothing gates the real content anymore. */

/* =============================================
   APPLY SITE SETTINGS from Supabase
   Colors, maintenance mode, section visibility,
   social links, copyright — all controlled from admin
   ============================================= */
(async function applySettings() {
  let settings = {};
  try {
    const { data } = await supabase.from('settings').select('setting_key, setting_value');
    (data || []).forEach(r => { settings[r.setting_key] = r.setting_value; });
  } catch { return; }

  const gen = settings.general || {};
  const si  = settings.siteinfo || {};
  const soc = settings.social || {};

  /* Maintenance mode — block entire site */
  if (gen.maintenanceEnabled) {
    const overlay = document.getElementById('maintenanceOverlay');
    if (overlay) {
      if (gen.maintenanceMsg) document.getElementById('maintenanceMsg').textContent = gen.maintenanceMsg;
      overlay.style.display = 'flex';
      return;
    }
  }

  /* Theme colors */
  const colors = gen.colors || {};
  if (colors.primary || colors.accent) {
    const style = document.createElement('style');
    let css = '';
    if (colors.primary) {
      css += `.btn-download, .btn-submit, .btn-login { background: ${colors.primary} !important; border-color: ${colors.primary} !important; }`;
      css += `.btn-download:hover, .btn-submit:hover { background: ${colors.primary}dd !important; }`;
    }
    if (colors.accent) {
      css += `.section-tag { color: ${colors.accent} !important; }`;
      css += `.nav__link.active, .nav__link:hover { color: ${colors.accent} !important; }`;
      css += `.about__tags span { border-color: ${colors.accent}55 !important; color: ${colors.accent} !important; }`;
      css += `.back-to-top { border-color: ${colors.accent}99 !important; }`;
    }
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* Section visibility */
  const prefs = gen.preferences || {};
  if (prefs.showNotes === false) {
    const el = document.getElementById('notes');
    if (el) el.style.display = 'none';
  }
  if (prefs.showMedia === false) {
    const el = document.getElementById('media');
    if (el) el.style.display = 'none';
  }
  if (prefs.showContact === false) {
    const el = document.getElementById('community');
    if (el) el.style.display = 'none';
  }

  /* Copyright from site info */
  if (si.copyright) {
    const el = document.getElementById('footerCopyright');
    if (el) el.textContent = si.copyright;
  }

  /* Social links in footer */
  const socialMap = [
    ['facebook',  'Facebook',  soc.facebook],
    ['twitter',   'Twitter / X', soc.twitter],
    ['instagram', 'Instagram', soc.instagram],
    ['youtube',   'YouTube',   soc.youtube],
    ['github',    'GitHub',    soc.github],
  ];
  const hasAnySocial = socialMap.some(s => s[2]);
  if (hasAnySocial) {
    const col  = document.getElementById('footerSocial');
    const list = document.getElementById('socialLinksList');
    if (col && list) {
      col.style.display = '';
      list.innerHTML = socialMap
        .filter(s => s[2])
        .map(s => `<li><a href="${s[2]}" target="_blank" rel="noopener">${s[1]}</a></li>`)
        .join('');
    }
  }
})();

/* =============================================
   LOAD CMS NOTES from Supabase
   ============================================= */
(async function loadNotes() {
  const grid  = $('#notesGrid');
  const empty = $('#notesEmpty');
  if (!grid) return;

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
  }
  function sanitize(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  let published = [];
  try {
    const { data } = await supabase.from('notes').select('*').eq('status', 'Published').order('date', { ascending: false });
    published = (data || []).map(r => ({ ...r, featuredImage: r.featured_image }));
  } catch (e) { /* not configured */ }

  if (published.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.innerHTML = published.map(n => `
    <article class="note-card">
      ${n.featuredImage ? `<img class="note-card__img" src="${n.featuredImage}" alt="${sanitize(n.title)}" loading="lazy"/>` : ''}
      <div class="note-card__meta">
        <span class="note-card__cat">${sanitize(n.category)}</span>
        <span class="note-card__date">${fmtDate(n.date)}</span>
      </div>
      <h3 class="note-card__title">${sanitize(n.title)}</h3>
      <p class="note-card__excerpt">${sanitize(n.content)}</p>
    </article>
  `).join('');
  $$('.note-card', grid).forEach(el => REVEAL.observe(el, ''));
})();

/* =============================================
   LOAD TEAM MEMBERS from Supabase
   ============================================= */
(async function loadTeam() {
  const grid  = $('#teamGrid');
  const empty = $('#teamEmpty');
  if (!grid) return;

  function sanitize(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  }

  let team = [];
  try {
    const { data } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
    team = data || [];
  } catch (e) { /* not configured */ }

  if (team.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.innerHTML = team.map(m => `
    <div class="team-card">
      ${m.avatar_url
        ? `<img class="team-card__avatar" src="${m.avatar_url}" alt="${sanitize(m.name)}" style="object-fit:cover;"/>`
        : `<div class="team-card__avatar">${initials(m.name)}</div>`}
      <h3 class="team-card__name">${sanitize(m.name)}</h3>
      ${m.lead_role ? `<p class="team-card__lead">${sanitize(m.lead_role)}</p>` : ''}
      <div class="team-card__roles">${(m.roles || []).map(r => `<span>${sanitize(r)}</span>`).join('')}</div>
    </div>
  `).join('');
  $$('.team-card', grid).forEach(el => REVEAL.observe(el, ''));
})();

/* =============================================
   LOAD SYSTEM REQUIREMENTS from Supabase
   ============================================= */
(async function loadRequirements() {
  const body = $('#sysreqBody');
  const wrap = $('#sysreqWrap');
  if (!body) return;

  function sanitize(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  let rows = [];
  try {
    const { data } = await supabase.from('settings').select('setting_value').eq('setting_key', 'system_requirements').maybeSingle();
    rows = Array.isArray(data?.setting_value) ? data.setting_value : [];
  } catch (e) { /* not configured */ }

  if (rows.length === 0) return;

  body.innerHTML = rows.map(r => `
    <tr>
      <td>${sanitize(r.spec)}</td>
      <td>${sanitize(r.minimum)}</td>
      <td>${sanitize(r.recommended)}</td>
    </tr>
  `).join('');
  if (wrap) REVEAL.observe(wrap, 'drop');
})();

/* =============================================
   LOAD FAQ from Supabase
   ============================================= */
(async function loadFAQ() {
  const list  = $('#faqList');
  const empty = $('#faqEmpty');
  if (!list) return;

  function sanitize(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  let items = [];
  try {
    const { data } = await supabase.from('faq_items').select('*').order('sort_order', { ascending: true });
    items = data || [];
  } catch (e) { /* not configured */ }

  if (items.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  list.innerHTML = items.map(f => `
    <details class="faq-item">
      <summary>${sanitize(f.question)}</summary>
      <p>${sanitize(f.answer)}</p>
    </details>
  `).join('');
  $$('.faq-item', list).forEach(el => REVEAL.observe(el, ''));
})();

/* =============================================
   LOAD CMS MEDIA (screenshots) from Supabase
   ============================================= */
(async function loadMedia() {
  const grid = $('#screenshotsGrid');
  if (!grid) return;

  const PLACEHOLDERS = [
    'City Overview', 'Typhoon Simulation', 'Earthquake Aftermath',
    'Flood Zone', 'Building Inspector', 'Post-Disaster Report'
  ];

  let media = [];
  try {
    const { data } = await supabase.from('media').select('id, filename, data, date').order('created_at', { ascending: false }).limit(6);
    media = data || [];
  } catch (e) { /* not configured */ }

  if (media.length === 0) {
    grid.innerHTML = PLACEHOLDERS.map(label => `
      <div class="screenshot-placeholder">
        <span>${label}</span><br/>
        <span style="font-size:0.65rem;opacity:0.6;">Screenshot Coming Soon</span>
      </div>
    `).join('');
    $$('.screenshot-placeholder', grid).forEach(el => REVEAL.observe(el, 'drop'));
    return;
  }

  const items = media.slice(0, 6);
  while (items.length < 6) items.push(null);

  grid.innerHTML = items.map((m, i) => m
    ? `<div class="screenshot-item"><img src="${m.data}" alt="${m.filename}" loading="lazy"/></div>`
    : `<div class="screenshot-placeholder"><span>${PLACEHOLDERS[i] || 'Coming Soon'}</span></div>`
  ).join('');
  $$('.screenshot-item, .screenshot-placeholder', grid).forEach(el => REVEAL.observe(el, 'drop'));
})();

/* =============================================
   DOWNLOAD MODAL
   ============================================= */
(function initDownloadModal() {
  const modal   = $('#downloadModal');
  const openBtn = $('#downloadBtn');
  const closeBtn = $('#modalClose');
  const okBtn   = $('#modalOk');
  if (!modal) return;

  const open  = () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (okBtn)   okBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
})();

/* =============================================
   CONTACT FORM
   ============================================= */
(function initContactForm() {
  const form    = $('#contactForm');
  const success = $('#formSuccess');
  if (!form) return;

  const sanitize = str => { const d = document.createElement('div'); d.appendChild(document.createTextNode(str)); return d.innerHTML; };

  const rules = {
    cName:    { el: () => $('#cName'),    err: () => $('#nameErr'),  fn: v => v.trim().length >= 2 ? '' : 'Name required.' },
    cEmail:   { el: () => $('#cEmail'),   err: () => $('#emailErr'), fn: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Valid email required.' },
    cSubject: { el: () => $('#cSubject'), err: () => null,           fn: v => v ? '' : 'Please select a subject.' },
    cMessage: { el: () => $('#cMessage'), err: () => $('#msgErr'),   fn: v => v.trim().length >= 10 ? '' : 'Message too short.' },
  };

  const validate = (key) => {
    const { el, err, fn } = rules[key];
    const msg = fn(el().value);
    if (err()) err().textContent = msg;
    el().classList.toggle('err', !!msg);
    return !msg;
  };

  Object.keys(rules).forEach(k => {
    rules[k].el().addEventListener('blur', () => validate(k));
    rules[k].el().addEventListener('input', () => { if (rules[k].el().classList.contains('err')) validate(k); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = Object.keys(rules).map(validate).every(Boolean);
    if (!ok) return;

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const submission = {
      id:      Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name:    $('#cName').value.trim(),
      email:   $('#cEmail').value.trim(),
      subject: $('#cSubject').value,
      message: $('#cMessage').value.trim(),
      date:    new Date().toISOString(),
      is_read: false
    };

    try {
      await supabase.from('messages').insert(submission);
    } catch (err) {
      console.warn('Could not save message:', err);
    }

    form.reset();
    success.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Send Message';
    setTimeout(() => success.classList.remove('visible'), 6000);

    /* Delivery truck flies across the screen; badge appears after it exits */
    spawnMsgTruck();
  });
})();

/* =============================================
   PLAY BUTTON (trailer placeholder)
   ============================================= */
(function initPlayBtn() {
  const btn = $('#playBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const inner = btn.closest('.media-video__inner');
    if (!inner) return;
    inner.innerHTML = `
      <p style="font-family:var(--font-h);font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:0.05em;">TRAILER COMING SOON</p>
      <p style="color:var(--text-muted);font-size:0.85rem;">The official gameplay trailer is in production. Stay tuned!</p>
    `;
  });
})();

/* =============================================
   BACK TO TOP — crane hoist
   Clones the loading screen overlay, changes its
   text to "BACK TO TOP", slides it up from the
   bottom (covering the page), jumps to top
   instantly behind it, then the overlay slides
   away upward — exactly like the loading screen
   dismiss, but initiated by clicking the crane.
   ============================================= */
(function initBackToTop() {
  const btn = $('#backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 500), { passive: true });

  btn.addEventListener('click', () => {
    if (document.getElementById('hoistOverlay')) return; /* already running */

    const orig = document.getElementById('lsOverlay');
    if (!orig) { window.scrollTo(0, 0); return; }

    /* Clone the crane loading screen */
    const ov = orig.cloneNode(true);
    ov.id = 'hoistOverlay';
    ov.removeAttribute('style');         /* clear display:none set after dismiss */
    ov.classList.remove('ls-done');
    ov.style.transform = 'translateY(100%)'; /* start below viewport */
    ov.style.zIndex    = '99998';

    /* Remove duplicate IDs and hide the progress bar */
    ['lsProgBar', 'lsPct'].forEach(id => {
      const el = ov.querySelector('#' + id);
      if (el) { el.removeAttribute('id'); el.style.display = 'none'; }
    });
    const pw = ov.querySelector('.ls-prog-wrap');
    if (pw) pw.style.display = 'none';

    /* Change text */
    const t = ov.querySelector('.ls-title');
    const s = ov.querySelector('.ls-sub');
    if (t) t.innerHTML = '<em>BACK</em> TO TOP';
    if (s) s.textContent = 'All hoisted ↑';

    document.body.appendChild(ov);

    /* Scroll to top now — hidden behind the overlay as it slides in */
    window.scrollTo(0, 0);

    /* Slide in from bottom */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ov.style.transition = 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1)';
        ov.style.transform  = 'translateY(0)';

        /* Brief pause, then hoist away upward like loading screen dismissal */
        setTimeout(() => {
          ov.style.transition = 'transform 0.88s cubic-bezier(0.76, 0, 0.24, 1)';
          ov.style.transform  = 'translateY(-105%)';
          setTimeout(() => ov.remove(), 920);
        }, 680);
      });
    });
  });
})();