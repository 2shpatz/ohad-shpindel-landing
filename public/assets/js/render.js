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

  function setupTrialCard(root) {
    if (!root) return;
    const flipper = root.querySelector('[data-trial-flipper]');
    if (!flipper) return;
    let startX = null;
    let suppressClick = false;
    let manuallyControlled = false;

    const setFlipped = (flipped) => {
      root.classList.toggle('is-flipped', flipped);
      root.setAttribute('aria-pressed', String(flipped));
      flipper.querySelector('.plans-trial-front').setAttribute('aria-hidden', String(flipped));
      flipper.querySelector('.plans-trial-back').setAttribute('aria-hidden', String(!flipped));
    };

    root.addEventListener('click', (event) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      manuallyControlled = true;
      setFlipped(!root.classList.contains('is-flipped'));
    });
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      manuallyControlled = true;
      setFlipped(!root.classList.contains('is-flipped'));
    });
    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      manuallyControlled = true;
      startX = event.clientX;
      root.setPointerCapture?.(event.pointerId);
    });
    root.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const deltaX = event.clientX - startX;
      startX = null;
      if (Math.abs(deltaX) < 45) return;
      suppressClick = true;
      setFlipped(!root.classList.contains('is-flipped'));
    });
    root.addEventListener('pointercancel', () => { startX = null; });

    if ('IntersectionObserver' in window) {
      let observedInitialState = false;
      let previousTop = null;
      const autoFlipObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const currentTop = entry.boundingClientRect.top;
          if (!observedInitialState) {
            observedInitialState = true;
            previousTop = currentTop;
            return;
          }
          const scrollingDown = currentTop < previousTop;
          previousTop = currentTop;
          if (manuallyControlled) return;
          if (entry.isIntersecting && !scrollingDown) setFlipped(false);
          if (!entry.isIntersecting && scrollingDown) setFlipped(true);
        });
      }, { rootMargin: '-50% 0px 0px 0px', threshold: 0 });
      autoFlipObserver.observe(root);
    }
  }

  const flipNoteCard = (emoji, title, body) => `<div class="plans-note plans-trial-card" data-trial-card role="button" tabindex="0" aria-pressed="false" aria-label="הצגת פרטי ${esc(title)}">
    <div class="plans-trial-flipper" data-trial-flipper>
      <div class="plans-trial-face plans-trial-front" aria-hidden="false">
        <span class="plans-note-emoji" aria-hidden="true">${esc(emoji)}</span>
        <strong class="plans-note-lead">${rich(title)}</strong>
      </div>
      <div class="plans-trial-face plans-trial-back" aria-hidden="true">
        <strong class="plans-note-lead">${rich(title)}</strong>
        <p>${rich(body)}</p>
      </div>
    </div>
  </div>`;

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
            <div class="project-thumb${p.imageFit === 'contain' ? ' is-logo' : ''}"${p.imageBg ? ` style="background:${esc(p.imageBg)}"` : ''}>
              ${has(p.image)
                ? `<img class="${p.imageFit === 'contain' ? 'is-contain' : ''}" src="${esc(p.image)}"
                     alt="" loading="lazy" decoding="async" width="400" height="250">`
                : `<div class="project-thumb-placeholder">✦</div>`}
            </div>
            <div class="project-body">
              <h3>${titleHtml(p.title)}</h3>
              <p>${rich(p.blurb)}</p>
              <div class="tag-row">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
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

  /* ---------- the support amount picker ----------
   * A support option with an `amounts` block (see content.js) doesn't link
   * straight out: the button opens this, and the choice becomes the link.
   * Everything happens in a plain <a href> - the CSP in _headers is
   * `default-src 'self'`, so a form posting to PayPal, an iframe or their JS
   * SDK would all be blocked, while a navigation is not restricted at all. */

  const AMOUNT_MIN = 1;
  const AMOUNT_MAX = 10000;

  // The state of the open picker. Held here rather than on the element so the
  // custom value survives switching to a preset and back.
  let amountState = null;

  function amountUrl(template, value) {
    return String(template || '').replace('{amount}', encodeURIComponent(value));
  }

  // '' for anything that isn't a usable amount, so the caller has one check.
  function cleanAmount(raw) {
    const n = Math.round(Number.parseFloat(String(raw).replace(',', '.')));
    if (!Number.isFinite(n) || n < AMOUNT_MIN || n > AMOUNT_MAX) return '';
    return String(n);
  }

  function closeAmountModal() {
    const modal = document.getElementById('amount-modal');
    if (!modal || modal.hidden) return;
    // Focus first, hide second: hiding the panel while the focus is still
    // inside it makes the browser reset focus to <body>, and that fixup lands
    // after our own focus() call and undoes it.
    amountState?.trigger?.focus?.();
    modal.hidden = true;
    amountState = null;
  }

  function ensureAmountModal() {
    if (document.getElementById('amount-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="amount-modal" id="amount-modal" hidden>
        <div class="amount-backdrop" data-close-amount></div>
        <div class="amount-panel" role="dialog" aria-modal="true" aria-labelledby="amount-title">
          <button class="amount-close" type="button" aria-label="סגירה" data-close-amount>×</button>
          <div class="amount-head">
            <span class="amount-logo" id="amount-logo"></span>
            <h3 id="amount-title"></h3>
          </div>
          <p class="amount-note" id="amount-note"></p>
          <div class="amount-chips" id="amount-chips" role="group" aria-label="בחירת סכום"></div>
          <div class="amount-custom" id="amount-custom" hidden>
            <label for="amount-custom-input" id="amount-custom-label"></label>
            <div class="amount-input-wrap">
              <input id="amount-custom-input" type="number" inputmode="numeric"
                     min="${AMOUNT_MIN}" max="${AMOUNT_MAX}" step="1" dir="ltr">
              <span class="amount-input-symbol" id="amount-symbol" aria-hidden="true"></span>
            </div>
            <span class="field-error" id="amount-error"></span>
          </div>
          <a class="btn btn-primary magnetic amount-go" id="amount-go"
             target="_blank" rel="noopener noreferrer"></a>
        </div>
      </div>`);

    const modal = document.getElementById('amount-modal');
    const chips = document.getElementById('amount-chips');
    const input = document.getElementById('amount-custom-input');
    const go = document.getElementById('amount-go');

    modal.querySelectorAll('[data-close-amount]').forEach((el) => {
      el.addEventListener('click', closeAmountModal);
    });

    chips.addEventListener('click', (event) => {
      const chip = event.target.closest('.amount-chip');
      if (!chip) return;
      selectAmount(chip.dataset.amount);
      if (chip.dataset.amount === 'custom') input.focus();
    });

    input.addEventListener('input', () => {
      if (amountState) amountState.custom = input.value;
      syncAmountLink();
    });

    // A blocked link is still a link, so the click has to be stopped by hand.
    go.addEventListener('click', (event) => {
      if (!go.classList.contains('is-blocked')) return;
      event.preventDefault();
      input.focus();
    });
  }

  function selectAmount(value) {
    if (!amountState) return;
    amountState.choice = value;
    document.getElementById('amount-custom').hidden = value !== 'custom';
    document.querySelectorAll('#amount-chips .amount-chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.amount === value));
    });
    syncAmountLink();
  }

  function syncAmountLink() {
    if (!amountState) return;
    const go = document.getElementById('amount-go');
    const error = document.getElementById('amount-error');
    const isCustom = amountState.choice === 'custom';
    const value = isCustom ? cleanAmount(amountState.custom) : amountState.choice;

    if (value) {
      go.href = amountUrl(amountState.template, value);
      go.classList.remove('is-blocked');
      go.removeAttribute('aria-disabled');
      error.textContent = '';
      return;
    }

    // No href at all, so a middle-click on a blocked button goes nowhere either.
    go.removeAttribute('href');
    go.classList.add('is-blocked');
    go.setAttribute('aria-disabled', 'true');
    error.textContent = String(amountState.custom || '').trim()
      ? `אפשר לבחור סכום בין ${AMOUNT_MIN} ל‑${AMOUNT_MAX}`
      : 'צריך למלא סכום';
  }

  function openAmountModal(option, trigger) {
    const a = option?.amounts;
    if (!a?.presets?.length || !has(a.urlTemplate)) return;
    ensureAmountModal();

    const modal = document.getElementById('amount-modal');
    const presets = a.presets.map((n) => cleanAmount(n)).filter(Boolean);
    const fallback = cleanAmount(a.defaultAmount) || presets[0];

    amountState = { template: a.urlTemplate, choice: fallback, custom: '', trigger };

    modal.querySelector('.amount-panel').style.setProperty('--accent', option.accent || 'var(--accent-primary)');
    document.getElementById('amount-logo').innerHTML = has(option.logo)
      ? `<img src="${esc(option.logo)}" alt="" width="34" height="34" loading="lazy" decoding="async">`
      : icon(option.icon);
    document.getElementById('amount-title').textContent = a.title || 'בחירת סכום';
    // No note in the content - the paragraph goes away rather than leaving its
    // margin between the title and the amounts.
    const note = document.getElementById('amount-note');
    note.innerHTML = a.note ? rich(a.note) : '';
    note.hidden = !a.note;
    document.getElementById('amount-custom-label').textContent = a.customPlaceholder || 'סכום אחר';
    document.getElementById('amount-symbol').textContent = a.symbol || '';
    document.getElementById('amount-go').textContent = a.submit || option.label;

    const symbol = a.symbol ? `<span class="amount-symbol">${esc(a.symbol)}</span>` : '';
    document.getElementById('amount-chips').innerHTML = `
      ${presets.map((n) => `
        <button class="amount-chip" type="button" data-amount="${esc(n)}" aria-pressed="false">
          <span class="amount-value">${esc(n)}</span>${symbol}
        </button>`).join('')}
      <button class="amount-chip is-custom" type="button" data-amount="custom" aria-pressed="false">
        ${esc(a.customLabel || 'סכום אחר')}
      </button>`;

    const input = document.getElementById('amount-custom-input');
    input.value = '';
    modal.hidden = false;
    selectAmount(fallback);
    // Opens on the chip that is already chosen, so Enter is one keystroke away.
    modal.querySelector('.amount-chip[aria-pressed="true"]')?.focus();
  }

  /* Escape closes whichever overlay is open. Both were click-only until now,
   * which left a keyboard user with no way out of them. */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // The screenshot lightbox opens on top of everything, so it goes first and
    // swallows the key rather than closing two overlays at once.
    if (closeShotLightbox()) return;
    const download = document.getElementById('download-warning-modal');
    if (download && !download.hidden) {
      download.hidden = true;
      download.dataset.pendingUrl = '';
    }
    closeAmountModal();
  });

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
        ${pl.note ? flipNoteCard(pl.noteEmoji || '', pl.noteTitle || noteLead, pl.noteTitle ? pl.note : noteRest.join('\n')) : ''}
      </section>`;
  }

  /* ---------- the screenshot carousel ("coverflow") ----------
   * A balanced strip: the active shot is centred at full opacity, its two
   * neighbours sit half-transparent and slightly smaller on either side, and
   * everything further out is parked off to the same side and hidden.
   *
   * The offset from centre is written to each slide as `--offset` and the
   * distance as `--depth`, and arcade-free CSS does the rest (see
   * `.shot-slide` in views.css). Two custom properties rather than a class per
   * position, because seven shots would mean seven classes; two numbers scale
   * to any number of slides. `--depth` is passed separately even though it is
   * just |offset| - CSS `abs()` is too new to rely on.
   *
   * Clicking the centre shot enlarges it; clicking a neighbour brings it to the
   * centre first, which is what everyone tries anyway. */
  function galleryCarousel(g) {
    const items = g?.items?.filter((s) => has(s.src)) || [];
    if (!items.length) return '';
    return `
      <section class="shot-gallery" data-shot-gallery aria-label="${esc(g.title || 'תמונות מהאפליקציה')}">
        ${g.title ? `<h3 class="shot-gallery-title">${esc(g.title)}</h3>` : ''}
        <div class="shot-stage">
          <button class="carousel-button shot-nav is-next" type="button" data-shot-prev aria-label="לתמונה הקודמת">${icon('arrow')}</button>
          <div class="shot-reel" data-shot-reel>
            ${items.map((s, i) => `
              <button class="shot-slide" type="button" data-shot-slide data-shot-index="${i}"
                      style="--offset:${i}; --depth:${i}"
                      aria-label="${esc(s.caption || `תמונה ${i + 1}`)} - להגדלה">
                <img src="${esc(s.src)}" alt="${esc(s.caption || '')}" loading="lazy" decoding="async">
              </button>`).join('')}
          </div>
          <button class="carousel-button shot-nav" type="button" data-shot-next aria-label="לתמונה הבאה">${icon('arrow')}</button>
        </div>
        <p class="shot-caption" data-shot-caption aria-live="polite">${esc(items[0].caption || '')}</p>
        <div class="shot-dots" data-shot-dots>
          ${items.map((s, i) => `
            <button class="shot-dot${i === 0 ? ' is-active' : ''}" type="button" data-shot-dot="${i}"
                    aria-label="${esc(s.caption || `תמונה ${i + 1}`)}"></button>`).join('')}
        </div>
        ${g.hint ? `<p class="shot-hint">${esc(g.hint)}</p>` : ''}
      </section>`;
  }

  function setupGallery(root, items) {
    if (!root || !items?.length) return;
    const slides = [...root.querySelectorAll('[data-shot-slide]')];
    const dots = [...root.querySelectorAll('[data-shot-dot]')];
    const caption = root.querySelector('[data-shot-caption]');
    const reel = root.querySelector('[data-shot-reel]');
    let active = 0;
    let gestureStart = null;

    /* Wraps rather than stopping at the ends: with the neighbours visible there
     * is always somewhere to go, so a disabled arrow would just look broken.
     *
     * Which means the offsets have to wrap too. Plain `i - active` puts the last
     * shot 6 places from the first, so at either end of the list one side of the
     * carousel sat empty - the shot that is *about* to come round was parked off
     * screen with the far ones. Taking the short way round the ring instead
     * keeps a neighbour on both sides at every position. Slides that cross the
     * halfway point flip from one side to the other, which is invisible because
     * anything that far out is hidden anyway. */
    const half = slides.length / 2;
    const show = (index) => {
      active = ((index % slides.length) + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        let offset = i - active;
        if (offset > half) offset -= slides.length;
        else if (offset < -half) offset += slides.length;
        const depth = Math.abs(offset);
        slide.style.setProperty('--offset', String(offset));
        slide.style.setProperty('--depth', String(depth));
        slide.classList.toggle('is-active', depth === 0);
        slide.classList.toggle('is-side', depth === 1);
        slide.classList.toggle('is-far', depth > 1);
        // Only the three visible shots are reachable by Tab; the dots below are
        // the full keyboard surface, and each one carries its caption.
        slide.tabIndex = depth > 1 ? -1 : 0;
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
      if (caption) caption.textContent = items[active].caption || '';
    };

    root.querySelector('[data-shot-prev]')?.addEventListener('click', () => show(active - 1));
    root.querySelector('[data-shot-next]')?.addEventListener('click', () => show(active + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));

    slides.forEach((slide, i) => {
      slide.addEventListener('click', () => {
        if (i === active) openShotLightbox(items, i, show);
        else show(i);
      });
    });

    // RTL: the next shot sits to the LEFT, so ArrowLeft advances.
    reel?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(active + 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(active - 1); }
    });

    // Swipe, same thresholds as the body carousel so both feel alike.
    reel?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      gestureStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });

    reel?.addEventListener('pointerup', (event) => {
      if (!gestureStart || gestureStart.id !== event.pointerId) return;
      const deltaX = event.clientX - gestureStart.x;
      const deltaY = event.clientY - gestureStart.y;
      gestureStart = null;
      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      show(deltaX > 0 ? active - 1 : active + 1);
    });

    reel?.addEventListener('pointercancel', () => { gestureStart = null; });
    show(0);
  }

  /* ---------- the screenshot lightbox ----------
   * The enlarged view loads `full` (1600px) rather than the carousel's `src`
   * (760px) - see the note on `gallery` in content.js for why there are two. */
  let shotState = null;

  function closeShotLightbox() {
    const modal = document.getElementById('shot-lightbox');
    if (!modal || modal.hidden) return false;
    modal.hidden = true;
    // Drop the big image so a second open re-decodes rather than holding it.
    const img = document.getElementById('shot-lightbox-img');
    if (img) img.removeAttribute('src');
    shotState?.onClose?.(shotState.index);
    shotState = null;
    return true;
  }

  function ensureShotLightbox() {
    if (document.getElementById('shot-lightbox')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="shot-lightbox" id="shot-lightbox" hidden>
        <div class="shot-lightbox-backdrop" data-close-shot></div>
        <div class="shot-lightbox-panel" role="dialog" aria-modal="true" aria-label="תמונה מוגדלת">
          <button class="shot-lightbox-close" type="button" aria-label="סגירה" data-close-shot>×</button>
          <div class="shot-lightbox-frame">
            <img id="shot-lightbox-img" alt="" decoding="async">
          </div>
          <p class="shot-lightbox-caption" id="shot-lightbox-caption"></p>
          <div class="shot-lightbox-nav">
            <button class="carousel-button is-next" type="button" data-shot-lightbox-prev aria-label="לתמונה הקודמת">${icon('arrow')}</button>
            <span class="shot-lightbox-count" id="shot-lightbox-count" aria-live="polite"></span>
            <button class="carousel-button" type="button" data-shot-lightbox-next aria-label="לתמונה הבאה">${icon('arrow')}</button>
          </div>
        </div>
      </div>`);

    const modal = document.getElementById('shot-lightbox');
    modal.querySelectorAll('[data-close-shot]').forEach((el) => el.addEventListener('click', closeShotLightbox));
    modal.querySelector('[data-shot-lightbox-prev]')?.addEventListener('click', () => stepShotLightbox(-1));
    modal.querySelector('[data-shot-lightbox-next]')?.addEventListener('click', () => stepShotLightbox(1));

    document.addEventListener('keydown', (event) => {
      if (!shotState) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); stepShotLightbox(1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); stepShotLightbox(-1); }
    });
  }

  function paintShotLightbox() {
    if (!shotState) return;
    const { items, index } = shotState;
    const shot = items[index];
    const img = document.getElementById('shot-lightbox-img');
    const caption = document.getElementById('shot-lightbox-caption');
    const count = document.getElementById('shot-lightbox-count');
    if (img) {
      img.src = has(shot.full) ? shot.full : shot.src;
      img.alt = shot.caption || '';
    }
    if (caption) caption.textContent = shot.caption || '';
    if (count) count.textContent = `${index + 1} / ${items.length}`;
  }

  function stepShotLightbox(direction) {
    if (!shotState) return;
    const total = shotState.items.length;
    shotState.index = ((shotState.index + direction) % total + total) % total;
    paintShotLightbox();
  }

  /* The back button is reachable with the overlay open - leaving it there would
   * park a full-screen image over whatever tab you landed on. Listening on
   * hashchange rather than closing inside projectDetail(): the router only calls
   * that for the projects route, so a jump to #about would slip past it. */
  window.addEventListener('hashchange', closeShotLightbox);

  // onClose gets the index the viewer left on, so the carousel behind the
  // overlay is showing the same shot when the overlay goes away.
  function openShotLightbox(items, index, onClose) {
    ensureShotLightbox();
    const modal = document.getElementById('shot-lightbox');
    if (!modal) return;
    shotState = { items, index, onClose };
    paintShotLightbox();
    modal.hidden = false;
    modal.querySelector('.shot-lightbox-close')?.focus();
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
        ${galleryCarousel(p.gallery)}
        ${titleCta}
      </div>
      ${has(p.summary) ? `<div class="project-summary"><p>
        <strong class="project-summary-lead">${summaryHtml(summaryLead)}</strong>
        ${summaryRest.length ? `<br>${summaryHtml(summaryRest.join('\n'))}` : ''}
      </p></div>` : ''}
      ${bodyCarousel(p.body?.length ? p.body : [p.blurb])}
      ${plansBlock(p.plans, p.reportSamples)}
      ${has(p.note) ? flipNoteCard(p.noteEmoji || '', p.noteTitle || '', p.note) : ''}
      ${has(p.licenseNote) ? flipNoteCard(p.licenseNoteEmoji || '', p.licenseNoteTitle || '', p.licenseNote) : ''}
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
    setupGallery(pane.querySelector('[data-shot-gallery]'), p.gallery?.items?.filter((s) => has(s.src)));
    pane.querySelectorAll('[data-trial-card]').forEach(setupTrialCard);
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
                // An option with an `amounts` block picks the sum first; the
                // button is what opens that picker, not the link itself.
                ? (o.amounts?.presets?.length
                  ? `<button class="btn btn-ghost" type="button" data-amounts="${esc(o.id)}">${esc(o.label)}</button>`
                  : `<a class="btn btn-ghost" href="${esc(o.url)}" target="_blank"
                        rel="noopener noreferrer">${esc(o.label)}</a>`)
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

    document.querySelectorAll('#view-support [data-amounts]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openAmountModal(live.find((o) => o.id === btn.dataset.amounts), btn);
      });
    });
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
    // An app whose groups were split keeps a nested `groups` list under the
    // community link, so it survives the filter as long as *something* under
    // it is joinable.
    const waSubs = (g) => (g.groups || []).filter((s) => has(s.url));
    const waGroups = (c.whatsapp?.groups || []).filter((g) => has(g.url) || waSubs(g).length);

    const waLink = (g, cls) => `
      <a class="wa-group${cls ? ` ${cls}` : ''}" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">
        ${icon('whatsapp')}
        <span class="wa-group-text">
          <strong>${nl2br(esc(g.app))}</strong>
          ${g.note ? `<small>${esc(oneLine(g.note))}</small>` : ''}
        </span>
      </a>`;

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
                  ${waGroups.map((g) => {
                    const subs = waSubs(g);
                    if (!subs.length) return `<li>${waLink(g)}</li>`;
                    return `
                    <li class="wa-community">
                      ${has(g.url) ? waLink(g, 'wa-group-lead') : ''}
                      <ul class="wa-subgroups">
                        ${subs.map((s) => `<li>${waLink(s, 'wa-group-sub')}</li>`).join('')}
                      </ul>
                    </li>`;
                  }).join('')}
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
