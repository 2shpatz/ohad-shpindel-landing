/* ==================== ROUTER ====================
 * Hash routing + animated tab switching.
 *
 * Routes:  #about  #projects  #projects/<id>  #support  #contact
 * Unknown or empty hash falls back to the first nav item.
 * ================================================ */

(() => {
  const ROUTES = SITE_CONTENT.nav.map((n) => n.id);
  const DEFAULT_ROUTE = ROUTES[0];

  let current = null;

  /* ---------- hash parsing ---------- */

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [route, param] = raw.split('/');
    return ROUTES.includes(route)
      ? { route, param: param || null }
      : { route: DEFAULT_ROUTE, param: null };
  }

  /* ---------- tab indicator (FLIP) ---------- */

  function moveIndicator(route) {
    const list = document.getElementById('tablist-desktop');
    const indicator = list?.querySelector('.tab-indicator');
    const tab = list?.querySelector(`.tab[data-route="${route}"]`);
    if (!indicator || !tab) return;

    // Desktop nav is display:none under 861px — measuring then would give 0.
    if (!tab.offsetParent) {
      indicator.classList.remove('ready');
      return;
    }

    const listRect = list.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    // Offset is measured from the inline-start edge, which is the RIGHT edge
    // in RTL — so we measure from the right and translate negatively.
    const offset = listRect.right - tabRect.right;

    indicator.style.width = `${tabRect.width}px`;
    indicator.style.transform = `translateX(${-offset}px)`;
    indicator.classList.add('ready');
  }

  /* ---------- tab state ---------- */

  function setTabState(route) {
    document.querySelectorAll('.tab').forEach((tab) => {
      const active = tab.dataset.route === route;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      // Roving tabindex: only the active tab is in the tab order.
      tab.tabIndex = active ? 0 : -1;
    });
    moveIndicator(route);
  }

  /* ---------- the actual view swap ---------- */

  function swap(route, param) {
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.remove('active', 'entering');
    });

    const view = document.getElementById(`view-${route}`);
    if (!view) return;

    view.classList.add('active');

    // Projects has a nested detail route.
    if (route === 'projects') {
      if (param && Render.projectDetail(param)) {
        // Detail rendered.
      } else {
        Render.showProjectIndex();
        // A bad project id shouldn't leave a dead URL in the bar.
        if (param) history.replaceState(null, '', '#projects');
      }
    }

    setTabState(route);

    if (!Motion.reduced) view.classList.add('entering');
    Motion.observeAll(view);
    Motion.revealNow(view);

    document.title = titleFor(route, param);
  }

  function titleFor(route, param) {
    const name = SITE_CONTENT.meta.name;
    if (route === 'projects' && param) {
      const p = SITE_CONTENT.projects.find((x) => x.id === param);
      // A title's line break is for the page's heading; the browser tab gets it
      // on one line.
      if (p) return `${p.title.replace(/\s*[\r\n]+\s*/g, ' ')} · ${name}`;
    }
    const item = SITE_CONTENT.nav.find((n) => n.id === route);
    return item && route !== DEFAULT_ROUTE ? `${item.label} · ${name}` : name;
  }

  /* ---------- navigate ---------- */

  function navigate({ scroll = true } = {}) {
    const { route, param } = parseHash();
    const key = `${route}/${param || ''}`;
    if (key === current) return;

    const isFirstPaint = current === null;
    current = key;

    const run = () => {
      swap(route, param);
      if (scroll && !isFirstPaint) {
        scrollTo({ top: 0, behavior: Motion.reduced ? 'auto' : 'smooth' });
      }
    };

    // View Transitions API where available; the CSS .entering animation is
    // the fallback everywhere else. Same code path either way.
    if (!isFirstPaint && !Motion.reduced && document.startViewTransition) {
      document.startViewTransition(run);
    } else {
      run();
    }
  }

  /* ---------- keyboard: arrow keys move between tabs ---------- */

  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();

      const list = [...tab.parentElement.querySelectorAll('.tab')];
      const i = list.indexOf(tab);
      // RTL: ArrowLeft advances, ArrowRight goes back.
      let next;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = list.length - 1;
      else if (e.key === 'ArrowLeft') next = (i + 1) % list.length;
      else next = (i - 1 + list.length) % list.length;

      const target = list[next];
      target.focus();
      location.hash = `#${target.dataset.route}`;
    });
  }

  /* ---------- clicks ---------- */

  function initClicks() {
    // Route links inside rendered copy should always open at the top of the
    // destination view, rather than letting the browser preserve an old
    // scroll position while the hash router swaps the view.
    document.addEventListener('click', (e) => {
      const routeLink = e.target.closest('a[href^="#"]');
      if (routeLink) {
        const rawHash = routeLink.getAttribute('href').replace(/^#\/?/, '');
        const targetRoute = rawHash.split('/')[0];
        if (ROUTES.includes(targetRoute)) {
          e.preventDefault();
          scrollTo({ top: 0, behavior: 'auto' });
          if (location.hash !== routeLink.getAttribute('href')) {
            location.hash = routeLink.getAttribute('href');
          }
          return;
        }
      }

      // Tabs are <button>, not <a>, so they need an explicit handler.
      const tab = e.target.closest('.tab');
      if (tab) {
        location.hash = `#${tab.dataset.route}`;
        return;
      }
      const card = e.target.closest('[data-project]');
      if (card) location.hash = `#projects/${card.dataset.project}`;
    });

    // Project cards act as links; make them keyboard-operable.
    document.addEventListener('keydown', (e) => {
      const card = e.target.closest('[data-project]');
      if (!card || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      location.hash = `#projects/${card.dataset.project}`;
    });
  }

  /* ---------- boot ---------- */

  function init() {
    Render.all();
    Motion.init();
    Contact.init();
    Photos.init();
    Arcade.init();
    initClicks();
    initKeyboard();

    addEventListener('hashchange', () => {
      navigate();
      // Peeking characters are anchored to elements in the outgoing view.
      Arcade.onRouteChange();
    });
    // Indicator geometry depends on layout; recompute when it changes.
    addEventListener('resize', () => {
      const { route } = parseHash();
      moveIndicator(route);
    }, { passive: true });

    // Fonts load after first paint and change tab widths.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => moveIndicator(parseHash().route));
    }

    navigate({ scroll: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
