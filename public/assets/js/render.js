/* ==================== RENDER ====================
 * Turns SITE_CONTENT into DOM. Nothing here needs editing to change
 * the site's text — edit content.js instead.
 * ================================================ */

const Render = (() => {
  const C = SITE_CONTENT;

  /* ---------- helpers ---------- */

  // All content comes from a local file we control, but escaping keeps a
  // stray < or & in Hebrew copy from silently breaking the markup.
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const isTodo = (v) => typeof v === 'string' && v.startsWith('TODO_');
  const has = (v) => v && !isTodo(v);

  // A newline inside a paragraph string is an intentional line break, not a
  // new paragraph. Escaping happens first, so the <br> we add is the only tag.
  const nl2br = (s) => s.replace(/\r\n|[\r\n]/g, '<br>');

  // Markdown-style [text](url) inside paragraph copy. Runs on already-escaped
  // text and only accepts http(s) URLs, so no markup can come in from content.
  const links = (s) => s.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/?[\w./#?&=%-]+|#[a-z][\w-]*)\)/g,
    (_, text, url) => url.startsWith('#') || !/^https?:\/\//i.test(url)
      ? `<a class="text-link" href="${url}">${text}</a>`
      : `<a class="text-link" href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  );

  /* `:joy:` and friends inside copy become that icon, sitting inline with the
   * text — for a sentence that names a control and wants to show the very glyph
   * on it. Runs on already-escaped text, after nl2br so the svg's own line
   * breaks survive, and only known names are touched: a stray pair of colons in
   * Hebrew copy stays exactly as it was written. */
  const inlineIcons = (s) => s.replace(
    /:([a-z]+):/g,
    (all, name) => (ICONS[name] ? icon(name, 'inline-icon') : all),
  );

  const rich = (s) => inlineIcons(nl2br(links(esc(s))));

  const summaryHtml = (s) => rich(s).replace(
    /לגמרי בחינם!/g,
    '<strong class="summary-free">🤑 לגמרי בחינם!</strong>',
  );

  /* A title may carry a deliberate break — 'Spill It Out\nלמדריכות הורים'. What
   * follows it is a subtitle rather than a second headline, so it gets its own
   * line and its own size instead of the heading's. In an attribute or the
   * browser's tab title a newline has nowhere to go, so it collapses to a space
   * instead of silently disappearing.
   *
   * A headline that needs a break of its own ("שפכו ת'לב" over "Spill It Out")
   * separates itself from the subtitle with a BLANK line; single newlines
   * before it are then breaks inside the headline. With no blank line the old
   * rule still holds — first line is the headline, the rest is the subtitle —
   * so two-line titles written the original way are unaffected. */
  const titleHtml = (s) => {
    const raw = String(s ?? '');
    const [headBlock, ...subBlocks] = raw.split(/[\r\n][ \t]*[\r\n]+/);
    const headLines = subBlocks.length
      ? headBlock.split(/[\r\n]+/)
      : headBlock.split(/[\r\n]+/).slice(0, 1);
    const sub = (subBlocks.length
      ? subBlocks.join(' ')
      : headBlock.split(/[\r\n]+/).slice(1).join(' ')).replace(/\s+/g, ' ').trim();
    return headLines.map(esc).join('<br>')
      + (sub ? `<span class="title-sub">${esc(sub)}</span>` : '');
  };

  const oneLine = (s) => String(s ?? '').replace(/\s*[\r\n]+\s*/g, ' ');

  const paras = (arr) => (arr || []).map((p) => `<p>${rich(p)}</p>`).join('');

  const carouselHeadings = new Set([
    'לא בקיצור...',
    'שפכו ת\'לב - Spill It Out',
    'מדריכת הורים',
    'יועצת שינה',
  ]);

  const carouselCopy = (text) => {
    const [lead, ...rest] = String(text ?? '').split(/\r?\n/);
    if (!carouselHeadings.has(lead.trim().replace(/\s+/g, ' '))) return rich(text);
    return `<strong class="body-carousel-lead">${rich(lead.replace(/\s*🪏\s*$/, ''))}</strong>${rest.length ? `<br>${rich(rest.join('\n'))}` : ''}`;
  };

  const bodyCarousel = (arr) => {
    const cards = arr || [];
    return `<div class="body-carousel" data-body-carousel>
      <span class="body-carousel-shovel" aria-hidden="true">🪏</span>
      <div class="body-carousel-controls">
        <button class="carousel-button is-next" type="button" data-carousel-prev aria-label="לפסקה הקודמת">${icon('arrow')}</button>
        <span class="body-carousel-count" data-carousel-count aria-live="polite">1 / ${cards.length}</span>
        <button class="carousel-button" type="button" data-carousel-next aria-label="לפסקה הבאה">${icon('arrow')}</button>
      </div>
      <p class="body-carousel-hint">דפדפו להמשך קריאה</p>
      <div class="body-carousel-viewport">
        <div class="body-carousel-track">
          ${cards.map((p, i) => `<article class="body-carousel-card${i === 0 ? ' is-active' : ''}" data-carousel-card aria-hidden="${i === 0 ? 'false' : 'true'}"><p>${carouselCopy(p)}</p></article>`).join('')}
        </div>
      </div>
    </div>`;
  };

  function setupBodyCarousel(root) {
    const cards = [...root.querySelectorAll('[data-carousel-card]')];
    const previous = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    const count = root.querySelector('[data-carousel-count]');
    const viewport = root.querySelector('.body-carousel-viewport');
    let active = 0;
    let gestureStart = null;

    const show = (index) => {
      active = Math.max(0, Math.min(index, cards.length - 1));
      cards.forEach((card, i) => {
        const isActive = i === active;
        card.classList.toggle('is-active', isActive);
        card.setAttribute('aria-hidden', String(!isActive));
      });
      count.textContent = `${active + 1} / ${cards.length}`;
      previous.disabled = active === 0;
      next.disabled = active === cards.length - 1;
    };

    previous.addEventListener('click', () => show(active - 1));
    next.addEventListener('click', () => show(active + 1));

    viewport.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      gestureStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      viewport.setPointerCapture?.(event.pointerId);
    });

    viewport.addEventListener('pointerup', (event) => {
      if (!gestureStart || gestureStart.id !== event.pointerId) return;
      const deltaX = event.clientX - gestureStart.x;
      const deltaY = event.clientY - gestureStart.y;
      gestureStart = null;
      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      show(deltaX > 0 ? active + 1 : active - 1);
    });

    viewport.addEventListener('pointercancel', () => { gestureStart = null; });
    show(0);
  }

  const ICONS = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    arrow: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    paypal: '<path d="M7 21h3l1-5h3a5 5 0 0 0 0-10H8L5 21z"/><path d="M11 16h3a5 5 0 0 0 5-5"/>',
    bit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4a2 2 0 0 1 0 4H9h4a2 2 0 0 1 0 4H9"/>',
    paybox: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
    // The real WhatsApp mark, which is a solid glyph rather than a line drawing
    // like the rest of this set — hence the fill/stroke override on the path:
    // it beats the stroked bubble-and-squiggle that used to stand in for it.
    whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.4 3.8c0 5.4 3.3 6.6 6.4 7A3.4 3.4 0 0 0 9 18.1V22"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    // The arcade layer's joystick, same path as arcade.js's ICON.joy — copy that
    // points at that button shows the glyph that is actually on it. If one is
    // ever redrawn, redraw both.
    joy: '<rect x="3" y="9" width="18" height="11" rx="3"/><path d="M8 14h3M9.5 12.5v3M16 14h.01M18 16h.01M12 9V6a3 3 0 0 1 3-3"/>',
  };

  const icon = (name, cls = '') => {
    const path = ICONS[name];
    if (!path) return '';
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  };

  const downloadIcon = () => '<span class="download-badge-icon" aria-hidden="true">💻</span>';

  // Marks each direct child with --i so CSS can stagger the reveal.
  const stagger = (nodes) => nodes.forEach((el, i) => el.style.setProperty('--i', i));

  /* ---------- shell: brand, nav, footer ---------- */

  function shell() {
    // The mark shows the logo when there is one and falls back to the initials.
    // Same treatment as the hero portrait: a cut-out sits whole inside the tile,
    // on its own background, so the artwork and the frame read as one piece.
    const mark = document.getElementById('brand-mark');
    const m = C.meta;
    if (has(m.photo)) {
      mark.classList.add('has-logo');
      mark.innerHTML = `<img class="brand-logo" src="${esc(m.photo)}"
          alt="${esc(m.name)}" width="34" height="34" decoding="async"
          ${m.photoBg ? `style="background:${esc(m.photoBg)}"` : ''}>`;
    } else {
      mark.classList.remove('has-logo');
      mark.textContent = m.initials || '';
    }
    document.getElementById('brand-name').textContent = C.meta.name || '';
    // Same treatment as paragraph copy, so a \n in the footer line is a line
    // break and [text](url) is a link. Escaped first, so nothing else gets in.
    document.getElementById('footer-text').innerHTML = rich(C.footer?.text || '');
    document.getElementById('footer-name').textContent = C.meta.name || '';
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const desktop = document.getElementById('tablist-desktop');
    const mobile = document.getElementById('tablist-mobile');

    // The indicator is absolutely positioned, so appending tabs after it
    // keeps source order without affecting layout.
    C.nav.forEach((item) => {
      desktop.appendChild(tabButton(item, false));
      mobile.appendChild(tabButton(item, true));
    });
  }

  function tabButton(item, isMobile) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.type = 'button';
    btn.role = 'tab';
    btn.dataset.route = item.id;
    btn.id = isMobile ? `mtab-${item.id}` : `tab-${item.id}`;
    btn.setAttribute('aria-controls', `view-${item.id}`);
    btn.setAttribute('aria-selected', 'false');
    btn.tabIndex = -1;
    btn.innerHTML = isMobile
      ? `${icon(item.icon, 'tab-icon')}<span>${esc(item.label)}</span>`
      : esc(item.label);
    return btn;
  }

  /* ---------- view: about ---------- */

  /* A pile of prints, top one first. Depth is DOM order and nothing else — the
   * CSS positions each card by :nth-child, so browsing is Photos.js moving one
   * node to the end of the list and letting the transition play. No index to
   * keep in sync, and it survives a re-render of the view. */
  function photoStack(a) {
    const list = (a.photos || []).filter((p) => has(p.src));
    if (!list.length) return '';
    return `
      <section class="photo-pile reveal">
        <div class="photo-stack" id="photo-stack" data-count="${list.length}">
          ${list.map((p, i) => `
            <figure class="photo-card">
              <img src="${esc(p.src)}" alt="${esc(oneLine(p.alt || ''))}"
                   draggable="false" decoding="async"
                   ${p.focus ? `style="object-position:${esc(p.focus)}"` : ''}
                   ${i === 0 ? '' : 'loading="lazy"'}>
            </figure>`).join('')}
        </div>
        <div class="photo-controls">
          <button class="photo-next" type="button" aria-label="התמונה הבאה">${icon('arrow')}</button>
          ${a.photosHint ? `<span class="photo-hint">${rich(a.photosHint)}</span>` : ''}
        </div>
      </section>`;
  }

  function about() {
    const m = C.meta;
    const a = C.about;

    // 'contain' shows a cut-out image whole; the frame fills with photoBg so the
    // image's own background and the shape read as one piece.
    const fitClass = m.photoFit === 'contain' ? ' fit-contain' : '';
    const fitBg = m.photoFit === 'contain' && m.photoBg
      ? ` style="background:${esc(m.photoBg)}"` : '';

    const portrait = has(m.photo)
      ? `<img class="portrait-photo${fitClass}"${fitBg} src="${esc(m.photo)}"
           alt="${esc(m.name)}" width="300" height="300"
           fetchpriority="high" decoding="async">`
      : `<div class="portrait-initials">${esc(m.initials || '')}</div>`;

    /* The bubble names the arcade's remote button, so it must not appear when
     * there is no button to press: the layer builds nothing at all under
     * reduced motion or when it is switched off in content. Saying otherwise
     * would send the visitor hunting for a control that isn't there. */
    const arcadeLive = C.arcade?.enabled !== false
      && !(typeof Arcade !== 'undefined' && Arcade.reduced);
    // A button rather than a paragraph: pressing it is what makes it go away,
    // so it has to be reachable by keyboard and announced as pressable.
    const bubbleGone = typeof Motion !== 'undefined' && Motion.bubbleHidden();
    const bubble = arcadeLive && has(m.photoBubble) && !bubbleGone
      ? `<button class="portrait-bubble" type="button" title="לחצו להסתרה">
           <span>${rich(m.photoBubble)}</span>
           <span class="bubble-x" aria-hidden="true">×</span>
         </button>`
      : '';

    const words = m.rotatingWords || [];
    // Reads as a sentence ("אני מפתח"), not a floating label.
    const rotator = words.length
      ? `<p class="hero-role">${esc(m.rotatingPrefix || '')}
           <span class="rotator"><span class="rotator-word" id="rotator-word">${esc(words[0])}</span></span></p>`
      : '';

    const html = `
      <div class="container">
        <div class="hero">
          <div class="hero-copy reveal">
            <p class="hero-greeting">${rich(a.greeting)}</p>
            <h1><span class="gradient-text">${esc(m.name)}</span></h1>
            ${rotator}
            <p class="hero-tagline">${rich(m.tagline)}</p>
            <div class="hero-actions">
              <a class="btn btn-primary magnetic" href="#contact">
                ${icon('mail')}<span>דברו איתי!</span>
              </a>
              <a class="btn btn-ghost magnetic" href="#projects">
                ${icon('grid')}<span>מה בניתי</span>
              </a>
            </div>
          </div>
          <div class="hero-portrait-col reveal" style="--i:1">
            <div class="hero-portrait">
              <div class="portrait-frame" role="button" tabindex="0"
                   aria-label="לחצו על התמונה להפתעה">${portrait}</div>
            </div>
            ${bubble}
          </div>
        </div>

        <div class="about-body reveal">${paras(a.paragraphs)}</div>

        ${a.highlights?.length ? `
          <div class="highlight-grid">
            ${a.highlights.map((h) => `
              <article class="card highlight-card tilt reveal">
                <span class="h-icon">${esc(h.icon)}</span>
                <h3>${esc(h.title)}</h3>
                ${h.items?.length
                  ? `<ul class="h-list">${h.items.map((it) => `<li>${rich(it)}</li>`).join('')}</ul>`
                  : `<p>${rich(h.text)}</p>`}
              </article>`).join('')}
          </div>` : ''}

        ${a.timeline?.length ? `
          <div class="timeline">
            ${a.timeline.map((t) => `
              <div class="timeline-item reveal">
                <span class="timeline-year">${esc(t.year)}</span>
                <h3>${esc(t.title)}</h3>
                <p>${rich(t.text)}</p>
              </div>`).join('')}
          </div>` : ''}

        ${photoStack(a)}
      </div>`;

    const view = document.getElementById('view-about');
    view.innerHTML = html;
    stagger([...view.querySelectorAll('.highlight-grid .reveal')]);
    stagger([...view.querySelectorAll('.timeline .reveal')]);
  }

  /* ---------- view: projects ---------- */

  function projects() {
    const list = C.projects || [];
    const view = document.getElementById('view-projects');

    const cards = list.length ? `
      <div class="project-grid">
        ${list.map((p) => `
          <article class="card project-card tilt reveal" data-project="${esc(p.id)}"
                   role="link" tabindex="0" aria-label="${esc(oneLine(p.title))}">
            <div class="project-thumb"${p.imageBg ? ` style="background:${esc(p.imageBg)}"` : ''}>
              ${has(p.image)
                ? `<img class="${p.imageFit === 'contain' ? 'is-contain' : ''}" src="${esc(p.image)}"
                     alt="" loading="lazy" decoding="async" width="400" height="250">`
                : `<div class="project-thumb-placeholder">✦</div>`}
            </div>
            <div class="project-body">
              <h3>${titleHtml(p.title)}</h3>
              <p>${rich(p.blurb)}</p>
              ${p.tags?.length ? `<div class="tag-row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
              <span class="project-more">לפרטים ${icon('arrow')}</span>
            </div>
          </article>`).join('')}
      </div>` : emptyState('עוד לא העליתי פרויקטים', 'בקרוב יהיה כאן מה לראות. בינתיים, אשמח אם תגיד שלום.');

    view.innerHTML = `
      <div class="container" id="projects-index">
        <div class="section-head reveal">
          <span class="eyebrow">הפרויקטים שלי</span>
          <h2>יישומונים חופשיים לשימוש</h2>
          <p>מוזמנים להשתמש ביישומונים (אפליקציות) בכיף ובחופשיות</p>
          <p>מסלולי הבסיס בהם נדיבים ביותר (פלוס פלוס!) ונותנים המון ערך בלי לשים שקל</p>
        </div>
        ${cards}
      </div>
      <div class="container project-detail" id="project-detail" hidden></div>`;

    stagger([...view.querySelectorAll('.project-grid .reveal')]);
  }

  /* The install file, or an honest placeholder for it. A button that is plainly
   * "not yet" beats a link that downloads a 404 page, so with no `file` the
   * same block renders disabled — the visitor still learns the app exists and
   * what it needs to run. */
  function getDownloadWarningContent() {
    const isWindows = /Windows/i.test(navigator.userAgent || '') || /Windows/i.test(navigator.platform || '');

    if (isWindows) {
      return {
        title: 'הערה לפני הפעלת הקובץ',
        body: `
          <p></p>
          <p>לאחר הורדת הקובץ, הפעילו את ההתקנה שתמצא בתיקיית ההורדות.</p>
          <p>תופיע הודעת ההגנה של Windows Defender, כפי שאתם רואים בתמונה.</p>
          <p>בחרו <strong>More info</strong> / <strong>מידע נוסף</strong> ואז <strong>Run anyway</strong> / <strong>הרץ בכל זאת</strong>.</p>
          <p>הודעה זו היא של מערכת ההפעלה, ומופיעה כי ספק התוכנה (אני) עדיין לא מוכר על ידי Microsoft.</p>
          <p class="download-warning-quote">איך ששמשון ויובב אומרים... "סמוך עלינו פינוקיו! אנחנו חברים שלך..."</p>
        `,
      };
    }

    return {
      title: 'זו תוכנת Windows',
      body: `
        <p>התוכנה הזו מיועדת למערכות הפעלה Windows בלבד.</p>
        <p>אם אתם מנסים להוריד ממכשיר כמו טלפון או מחשב שאינו Windows, יש לנסות שוב ממחשב עם מערכת הפעלה Windows.</p>
        <p>הורידו את הקובץ מהמחשב המתאים, ואז הפעילו את ההתקנה בתיקיית ההורדות.</p>
      `,
    };
  }

  function ensureDownloadWarningModal() {
    if (document.getElementById('download-warning-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="download-warning-modal" id="download-warning-modal" hidden>
        <div class="download-warning-backdrop" data-close-download-modal></div>
        <div class="download-warning-panel" role="dialog" aria-modal="true" aria-labelledby="download-warning-title">
          <button class="download-warning-close" type="button" aria-label="סגירה" data-close-download-modal>×</button>
          <h3 id="download-warning-title">הערה לפני הפעלת הקובץ</h3>
          <div class="download-warning-actions" hidden>
            <button class="btn btn-ghost" type="button" data-close-download-modal>ביטול</button>
            <button class="btn btn-primary magnetic" type="button" data-confirm-download>המשך והורדה</button>
          </div>
          <div id="download-warning-body"></div>
        </div>
      </div>`);

    const modal = document.getElementById('download-warning-modal');
    const closeButtons = modal.querySelectorAll('[data-close-download-modal]');
    const confirm = modal.querySelector('[data-confirm-download]');

    closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.hidden = true;
        modal.dataset.pendingUrl = '';
      });
    });

    confirm?.addEventListener('click', () => {
      const url = modal.dataset.pendingUrl || '';
      modal.hidden = true;
      modal.dataset.pendingUrl = '';
      if (!url) return;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  function openDownloadWarning(url) {
    ensureDownloadWarningModal();
    const modal = document.getElementById('download-warning-modal');
    const title = document.getElementById('download-warning-title');
    const body = document.getElementById('download-warning-body');
    const actions = modal?.querySelector('.download-warning-actions');
    if (!modal || !url) return;

    const isWindows = /Windows/i.test(navigator.userAgent || '') || /Windows/i.test(navigator.platform || '');
    const warning = getDownloadWarningContent();
    if (title) title.textContent = warning.title;
    if (body) {
      body.innerHTML = isWindows
        ? `${warning.body}<div class="download-warning-image"><img src="assets/img/windows-defender-warning.png" alt="Windows Defender warning" /></div>`
        : warning.body;
    }
    if (actions) {
      actions.hidden = !isWindows;
      actions.style.display = isWindows ? '' : 'none';
    }

    modal.dataset.pendingUrl = isWindows ? url : '';
    modal.hidden = false;
  }

  function reportSamplesBlock(samples, variant = 'project') {
    if (!samples?.length) return '';
    const isPlan = variant === 'plan';
    return `
      <div class="${isPlan ? 'plan-report-samples' : 'project-report-samples'}" aria-label="דוחות לדוגמה">
        <p class="${isPlan ? 'plan-report-title' : 'project-report-title'}"><span aria-hidden="true">📜</span> דוחות לדוגמה</p>
        <div class="${isPlan ? 'plan-report-actions' : 'project-report-actions'}">
          ${samples.map((sample) => `
            <a class="btn btn-ghost ${isPlan ? 'plan-report-button' : 'project-report-button'}" href="${esc(sample.file)}" target="_blank" rel="noopener noreferrer">
              ${esc(sample.label)}
            </a>`).join('')}
        </div>
      </div>`;
  }

  function downloadBlock(d) {
    if (!d) return '';
    const ready = has(d.file);
    return `
      <div class="project-download">
        ${ready
          ? `<a class="btn btn-primary magnetic download-trigger" href="${esc(d.file)}" data-download-url="${esc(d.file)}" download>
               ${downloadIcon()}<span class="download-button-label">${esc(d.label)}</span></a>`
          : `<button class="btn btn-primary" type="button" disabled aria-disabled="true">
               ${downloadIcon()}<span class="download-button-label">${esc(d.soonLabel || d.label)}</span></button>`}
        ${d.meta ? `<span class="download-meta">${esc(d.meta)}</span>` : ''}
        ${!ready && d.note ? `<p class="download-note">${rich(d.note)}</p>` : ''}
      </div>`;
  }

  /* The free/paid comparison. Two columns rather than a ✓/✗ matrix, because the
   * source in the app's terms is two lists — inventing a row per feature would
   * mean inventing the "no" side of it.
   *
   * The ticks and stars are emoji from content.js rather than glyphs from ICONS:
   * they carry their own colour, so the two columns are told apart at a glance
   * instead of by a tint difference. They are decoration, so each is
   * aria-hidden and the list still reads as plain items to a screen reader. */
  function plansBlock(pl, reportSamples) {
    if (!pl?.columns?.length) return '';
    const bullet = (c) => (c.bullet
      ? `<span class="plan-bullet" aria-hidden="true">${esc(c.bullet)}</span>`
      : '');
    const [noteLead, ...noteRest] = (pl.note || '').split(/\r?\n/);
    return `
      <section class="plans">
        ${pl.title ? `<h3 class="plans-title">${esc(pl.title)}</h3>` : ''}
        ${pl.intro ? `<p class="plans-intro">${rich(pl.intro)}</p>` : ''}
        <div class="plan-grid">
          ${pl.columns.map((c) => `
            <article class="card plan-card${c.featured ? ' is-featured' : ''}">
              <header class="plan-head">
                ${c.emoji ? `<span class="plan-emoji" aria-hidden="true">${esc(c.emoji)}</span>` : ''}
                <div class="plan-titles">
                  <h4>${esc(c.label)}</h4>
                  ${c.tagline ? `<p class="plan-tagline">${rich(c.tagline)}</p>` : ''}
                </div>
                ${c.badge ? `<span class="plan-badge">${esc(c.badge)}</span>` : ''}
              </header>
              ${c.price ? `
                <p class="plan-price">
                  <span class="plan-price-num">${esc(c.price)}</span>
                  ${c.priceUnit ? `<span class="plan-price-unit">${esc(c.priceUnit)}</span>` : ''}
                </p>` : ''}
              <ul class="plan-list">
                ${(c.items || []).map((it) => `
                  <li>${bullet(c)}<span>${rich(it)}</span></li>`).join('')}
              </ul>
              ${c.featured ? reportSamplesBlock(reportSamples, 'plan') : ''}
              ${c.personalNoteLink ? `<button class="plan-personal-link plan-personal-card-link" type="button" data-scroll-to-personal aria-label="בקשה אישית מאוהד">
                <span>בקשה אישית מאוהד</span><span class="plan-personal-arrow" aria-hidden="true">👇</span>
              </button>` : ''}
            </article>`).join('')}
        </div>
        ${pl.note ? `<div class="plans-note">
          ${pl.noteEmoji ? `<span class="plans-note-emoji" aria-hidden="true">${esc(pl.noteEmoji)}</span>` : ''}
          <div class="plans-note-copy">
            <strong class="plans-note-lead">${rich(noteLead)}</strong>
            ${noteRest.length ? `<p>${rich(noteRest.join('\n'))}</p>` : ''}
          </div>
        </div>` : ''}
      </section>`;
  }

  // Renders one project's page into the detail pane. Returns false if unknown.
  function projectDetail(id) {
    const p = (C.projects || []).find((x) => x.id === id);
    const pane = document.getElementById('project-detail');
    const index = document.getElementById('projects-index');
    if (!p || !pane) return false;

    const [summaryLead, ...summaryRest] = String(p.summary || '').split(/\r?\n/);

    const ready = has(p.download?.file);
    const titleCta = ready
      ? `<div class="project-title-cta"><a class="btn btn-primary magnetic" href="${esc(p.download.file)}" data-download-url="${esc(p.download.file)}" download>
           ${downloadIcon()}<span class="download-button-label">${esc(p.download.label || 'הורדה')}</span></a></div>`
      : `<div class="project-title-cta"><button class="btn btn-primary" type="button" disabled aria-disabled="true">
           ${downloadIcon()}<span class="download-button-label">${esc(p.download?.soonLabel || p.download?.label || 'הורדה')}</span></button></div>`;

    pane.innerHTML = `
      <a class="back-link" href="#projects">${icon('arrow')}<span>חזרה לכל הפרויקטים</span></a>
      ${has(p.image)
        ? `<img class="project-hero-img ${p.imageFit === 'contain' ? 'is-contain' : ''}"
               src="${esc(p.image)}" alt="${esc(oneLine(p.title))}" decoding="async"
               ${p.imageBg ? `style="background:${esc(p.imageBg)}"` : ''}>`
        : ''}
      <div class="section-head">
        ${p.tags?.length ? `<div class="tag-row" style="margin-block-end:12px">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <h2>${titleHtml(p.title)}</h2>
        ${titleCta}
      </div>
      ${has(p.summary) ? `<div class="project-summary"><p>
        <strong class="project-summary-lead">${summaryHtml(summaryLead)}</strong>
        ${summaryRest.length ? `<br>${summaryHtml(summaryRest.join('\n'))}` : ''}
      </p></div>` : ''}
      ${bodyCarousel(p.body?.length ? p.body : [p.blurb])}
      ${plansBlock(p.plans, p.reportSamples)}
      ${has(p.note) ? `<div class="plans-note price-note-card">
        ${p.noteEmoji ? `<span class="plans-note-emoji" aria-hidden="true">${esc(p.noteEmoji)}</span>` : ''}
        <div class="plans-note-copy">
          <strong class="plans-note-lead">${esc(p.noteTitle || '')}</strong>
          <p>${rich(p.note)}</p>
        </div>
      </div>` : ''}
      ${has(p.licenseNote) ? `<div class="plans-note">
        ${p.licenseNoteEmoji ? `<span class="plans-note-emoji" aria-hidden="true">${esc(p.licenseNoteEmoji)}</span>` : ''}
        <div class="plans-note-copy">
          <strong class="plans-note-lead">${esc(p.licenseNoteTitle || '')}</strong>
          <p>${rich(p.licenseNote)}</p>
        </div>
      </div>` : ''}
      ${downloadBlock(p.download)}
      ${p.links?.length ? `
        <div class="project-links">
          ${p.links.map((l) => `
            <a class="btn ${l.primary ? 'btn-primary' : 'btn-ghost'} magnetic"
               href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join('')}
        </div>` : ''}
      ${has(p.launchNote) ? `<section class="launch-note" aria-label="מבצע השקה">
        <div class="launch-note-lights" aria-hidden="true">💡 ✨ 💡 ✨ 💡</div>
        <h3><span class="launch-note-trumpet" aria-hidden="true">🎺</span><span class="launch-note-title">${rich(p.launchNote.split(/\r?\n/)[0])}</span><span class="launch-note-trumpet" aria-hidden="true">🎺</span></h3>
        <div class="launch-note-copy">${paras(p.launchNote.split(/\r?\n/).slice(1))}</div>
        <div class="launch-note-lights" aria-hidden="true">🎉 💡 🎉 💡 🎉</div>
      </section>` : ''}
      ${has(p.personalNote) ? `<section class="personal-note" id="personal-note" aria-label="בקשה אישית מאוהד">
        <div>${paras(p.personalNote.split(/\r?\n/))}</div>
      </section>` : ''}
      `;

    pane.hidden = false;
    index.hidden = true;
    setupBodyCarousel(pane.querySelector('[data-body-carousel]'));
    pane.querySelectorAll('[data-download-url]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openDownloadWarning(link.dataset.downloadUrl || '');
      });
    });
    const scrollTrigger = pane.querySelector('[data-scroll-to-personal]');
    const personalNote = pane.querySelector('#personal-note');
    scrollTrigger?.addEventListener('click', () => personalNote?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return true;
  }

  function showProjectIndex() {
    const pane = document.getElementById('project-detail');
    const index = document.getElementById('projects-index');
    if (pane) pane.hidden = true;
    if (index) index.hidden = false;
  }

  /* ---------- view: support ---------- */

  function support() {
    const s = C.support;
    // A QR on its own is enough to make an option usable, so it counts as
    // configured even when there is no web link to go with it.
    const live = (s.options || []).filter((o) =>
      o.kind === 'handle' ? has(o.handle) : has(o.url) || has(o.qr));
    const pending = (s.options || []).length - live.length;

    const cards = live.length ? `
      <div class="support-grid">
        ${live.map((o) => `
          <article class="card support-card tilt reveal" style="--accent:${esc(o.accent)}">
            ${/* The real app icon when we have one: it is already a coloured,
                  rounded tile, so it replaces the tinted plate instead of
                  sitting inside it. `icon` stays as the fallback glyph for any
                  option without artwork. alt is empty on purpose — the platform
                  name is the <h3> directly below, so a description here would
                  just be read out twice. */''}
            ${has(o.logo)
              ? `<div class="support-icon is-logo">
                   <img src="${esc(o.logo)}" alt="" width="52" height="52"
                        loading="lazy" decoding="async">
                 </div>`
              : `<div class="support-icon" style="color:${esc(o.accent)}">${icon(o.icon)}</div>`}
            <h3>${esc(o.platform)}</h3>
            <p class="s-note">${rich(o.note)}</p>
            ${o.kind === 'handle'
              ? `<button class="handle-box" type="button" data-copy="${esc(o.handle)}"
                    aria-label="העתקת המספר ${esc(o.handle)}">
                   <span class="ltr">${esc(o.handle)}</span>${icon('copy')}
                 </button>`
              : has(o.url)
                ? `<a class="btn btn-ghost" href="${esc(o.url)}" target="_blank"
                      rel="noopener noreferrer">${esc(o.label)}</a>`
                : ''}
            ${/* A QR next to the link: tapping works on a phone, but a visitor on
                  a desktop has no app to open — they scan this with their phone
                  instead. Purely additive, so any option can carry one. */''}
            ${has(o.qr) ? `
              <figure class="qr-box">
                <img src="${esc(o.qr)}" alt="${esc(o.qrAlt || `קוד QR ל${o.platform}`)}"
                     width="164" height="164" loading="lazy" decoding="async">
                ${o.qrNote ? `<figcaption>${rich(o.qrNote)}</figcaption>` : ''}
              </figure>` : ''}
          </article>`).join('')}
      </div>`
      : emptyState('אפשרויות התמיכה בהכנה', 'עוד לא הגדרתי את הקישורים. בינתיים, מילה טובה גם עושה את העבודה.');

    document.getElementById('view-support').innerHTML = `
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">תמיכה</span>
          <h2>תמיכה בי! מה חשבתם?</h2>
          <p>${rich(s.intro)}</p>
        </div>
        ${cards}
        ${live.length ? `<p class="support-note reveal">${rich(s.note)}</p>` : ''}
        ${pending && live.length ? `<p class="support-note">תודה לכם! אבא אוהב! ❤️</p>` : ''}
      </div>`;

    stagger([...document.querySelectorAll('#view-support .support-grid .reveal')]);
  }

  /* ---------- view: contact ---------- */

  function contact() {
    const c = C.contact;
    const f = c.form;
    const m = C.meta;

    const keyMissing = !has(c.web3formsKey);

    const direct = [];
    if (has(m.email)) {
      direct.push(`<div class="direct-row">${icon('mail')}
        <a href="mailto:${esc(m.email)}" class="ltr">${esc(m.email)}</a></div>`);
    }

    (m.socials || []).forEach((s) => {
      if (!has(s.url)) return;
      direct.push(`<div class="direct-row">${icon(s.icon)}
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></div>`);
    });

    // Groups without a join link yet are parked in content.js, not shown.
    const waGroups = (c.whatsapp?.groups || []).filter((g) => has(g.url));

    // With no groups and no direct details, the aside would be an
    // empty column — collapse to one column instead of leaving dead space.
    const hasAside = waGroups.length > 0 || direct.length > 0;

    document.getElementById('view-contact').innerHTML = `
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">צור קשר</span>
          <h2>אשמח לשמוע ממך</h2>
          <p>${rich(c.intro)}</p>
          ${c.responseNote ? `<span class="response-note"><i class="pulse-dot"></i>${esc(c.responseNote)}</span>` : ''}
        </div>

        <div class="contact-layout${hasAside ? '' : ' no-aside'}">
          <div class="card reveal">
            ${keyMissing ? `
              <div class="setup-notice">
                <strong>הטופס עדיין לא מחובר.</strong> כדי להפעיל אותו, קבל מפתח חינמי ב־<code>web3forms.com</code>
                והחלף את <code>web3formsKey</code> בקובץ <code>assets/js/content.js</code>.
                עד אז אפשר לפנות אליי במייל או דרך קבוצת הוואטסאפ של האפליקציה.
              </div>` : ''}

            <form class="form-grid" id="contact-form" novalidate>
              <div class="form-row-2">
                <div class="field">
                  <label for="cf-name">${esc(f.name.label)}</label>
                  <input id="cf-name" name="name" type="text" autocomplete="name"
                         placeholder="${esc(f.name.placeholder)}" required>
                  <span class="field-error" data-error-for="name"></span>
                </div>
                <div class="field">
                  <label for="cf-email">${esc(f.email.label)}</label>
                  <input id="cf-email" name="email" type="email" autocomplete="email"
                         placeholder="${esc(f.email.placeholder)}" required>
                  <span class="field-error" data-error-for="email"></span>
                </div>
              </div>

              <div class="field">
                <label for="cf-phone">${esc(f.phone.label)}
                  <span class="optional-tag">(לא חובה)</span></label>
                <input id="cf-phone" name="phone" type="tel" autocomplete="tel"
                       placeholder="${esc(f.phone.placeholder)}">
                <span class="field-error" data-error-for="phone"></span>
              </div>

              <div class="field">
                <label for="cf-message">${esc(f.message.label)}</label>
                <textarea id="cf-message" name="message" rows="6"
                          placeholder="${esc(f.message.placeholder)}" required></textarea>
                <span class="field-error" data-error-for="message"></span>
              </div>

              <div class="hp-field" aria-hidden="true">
                <label for="cf-botcheck">אל תמלא שדה זה</label>
                <input id="cf-botcheck" name="botcheck" type="text" tabindex="-1" autocomplete="off">
              </div>

              <div class="form-status" id="form-status" role="alert"></div>

              <div>
                <button class="btn btn-primary magnetic" type="submit" id="cf-submit">
                  <span class="btn-label">${esc(f.submit)}</span>
                </button>
              </div>
            </form>
          </div>

          ${!hasAside ? '' : `
          <aside class="contact-aside">
            ${waGroups.length ? `
              <div class="card wa-card reveal">
                <h3>${esc(c.whatsapp.title)}</h3>
                <p>${rich(c.whatsapp.text)}</p>
                <ul class="wa-groups">
                  ${waGroups.map((g) => `
                    <li>
                      <a class="wa-group" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">
                        ${icon('whatsapp')}
                        <span class="wa-group-text">
                          <strong>${esc(g.app)}</strong>
                          ${g.note ? `<small>${esc(oneLine(g.note))}</small>` : ''}
                        </span>
                      </a>
                    </li>`).join('')}
                </ul>
              </div>` : ''}
            ${direct.length ? `<div class="card direct-card reveal">${direct.join('')}</div>` : ''}
          </aside>`}
        </div>

        ${has(c.image) ? `
          <figure class="contact-figure reveal">
            <img src="${esc(c.image)}" alt="${esc(oneLine(c.imageAlt || ''))}"
                 loading="lazy" decoding="async" width="1280" height="853">
            ${c.imageCaption ? `<figcaption>${rich(c.imageCaption)}</figcaption>` : ''}
          </figure>` : ''}
      </div>`;
  }

  function emptyState(title, text) {
    return `<div class="empty-state reveal">
      <span class="emoji">🌱</span>
      <h3>${esc(title)}</h3>
      <p>${rich(text)}</p>
    </div>`;
  }

  /* ---------- boot ---------- */

  function all() {
    shell();
    about();
    projects();
    support();
    contact();
  }

  return { all, projectDetail, showProjectIndex, icon, esc, has };
})();
