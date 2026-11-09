/* ==================== MOTION ====================
 * Scroll reveal, parallax, magnetic buttons, card tilt, word rotator.
 *
 * Two hard rules:
 *   1. prefers-reduced-motion: reduce  -> nothing here attaches at all.
 *   2. Pointer effects are gated on (pointer: fine) so phones never run
 *      handlers that can't fire.
 * ================================================ */

const Motion = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  let revealObserver = null;
  let rotatorTimer = null;

  /* ---------- scroll reveal ---------- */

  function initReveal() {
    if (reduced) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
      return;
    }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target); // one-shot
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    observeAll();
  }

  // Called again after each view switch - new nodes need observing.
  function observeAll(root = document) {
    if (reduced) {
      root.querySelectorAll('.reveal:not(.visible)').forEach((el) => el.classList.add('visible'));
      return;
    }
    if (!revealObserver) return;
    root.querySelectorAll('.reveal:not(.visible)').forEach((el) => revealObserver.observe(el));
  }

  // The active view is visible immediately on load/switch; don't wait for a
  // scroll that may never come on a short page.
  function revealNow(root) {
    if (!root) return;
    requestAnimationFrame(() => {
      root.querySelectorAll('.reveal').forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < innerHeight * 0.92) el.classList.add('visible');
      });
    });
  }

  /* ---------- scroll-driven bits (one rAF loop, passive listeners) ---------- */

  function initScroll() {
    const header = document.getElementById('site-header');
    const progress = document.querySelector('.scroll-progress i');
    let ticking = false;

    const update = () => {
      const y = scrollY;
      header.classList.toggle('scrolled', y > 50);

      if (progress && !reduced) {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      }
      ticking = false;
    };

    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  /* ---------- pointer effects ---------- */

  function initPointer() {
    if (reduced || !finePointer) return;

    const orbs = [...document.querySelectorAll('.orb')];
    let mx = 0, my = 0, queued = false;

    const apply = () => {
      // Each orb drifts at a different depth for a parallax feel.
      orbs.forEach((orb, i) => {
        const depth = (i + 1) * 9;
        orb.style.setProperty('--px', `${-mx * depth}px`);
        orb.style.setProperty('--py', `${-my * depth}px`);
      });
      queued = false;
    };

    addEventListener('pointermove', (e) => {
      mx = (e.clientX / innerWidth) - 0.5;
      my = (e.clientY / innerHeight) - 0.5;

      // Card glow follows the cursor; set on the hovered card only.
      const card = e.target.closest?.('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }

      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }, { passive: true });

    initMagnetic();
    initTilt();
  }

  // Buttons drift slightly toward the cursor when it's close.
  function initMagnetic() {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest?.('.magnetic');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.14}px, ${dy * 0.22}px)`;
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest?.('.magnetic');
      if (el) el.style.transform = '';
    }, { passive: true });
  }

  // Subtle 3D tilt on cards.
  function initTilt() {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest?.('.tilt');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${-py * 5}deg) rotateY(${px * 5}deg) translateY(-4px)`;
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest?.('.tilt');
      if (el) el.style.transform = '';
    }, { passive: true });
  }

  /* ---------- hero word rotator ---------- */

  function initRotator() {
    const el = document.getElementById('rotator-word');
    const words = SITE_CONTENT.meta.rotatingWords || [];
    if (!el || words.length < 2 || reduced) return;

    let i = 0;
    clearInterval(rotatorTimer);
    rotatorTimer = setInterval(() => {
      // Pause while the About tab is hidden - no point animating offscreen.
      if (!document.getElementById('view-about').classList.contains('active')) return;
      if (document.hidden) return;

      el.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('out');
        // Restart the entry animation.
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
      }, 320);
    }, 2600);
  }

  /* ---------- tap the portrait for a random animation ---------- */

  const PORTRAIT_FX = [
    'fx-spin', 'fx-flip', 'fx-jelly', 'fx-bounce',
    'fx-shake', 'fx-tada', 'fx-pop', 'fx-roll', 'fx-swing',
  ];

  function playRandomFx(host) {
    // Ignore taps while one is already running, or they cut each other off.
    if (host.dataset.fxPlaying) return;

    // Never repeat the previous one - back-to-back duplicates read as a bug.
    let fx;
    do {
      fx = PORTRAIT_FX[Math.floor(Math.random() * PORTRAIT_FX.length)];
    } while (PORTRAIT_FX.length > 1 && fx === host.dataset.fxLast);

    host.dataset.fxLast = fx;
    host.dataset.fxPlaying = '1';
    host.classList.add(fx);

    const done = (e) => {
      // The blob animation on a child bubbles here too; only ours counts.
      if (e.target !== host) return;
      host.removeEventListener('animationend', done);
      host.classList.remove(fx);
      delete host.dataset.fxPlaying;
    };
    host.addEventListener('animationend', done);
  }

  function initPortraitFx() {
    if (reduced) return; // the whole point is motion; skip it entirely

    const trigger = (e) => {
      const frame = e.target.closest?.('.portrait-frame');
      if (!frame) return;
      const host = frame.closest('.hero-portrait');
      if (host) playRandomFx(host);
    };

    document.addEventListener('click', trigger);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.closest?.('.portrait-frame')) return;
      e.preventDefault(); // Space would scroll the page
      trigger(e);
    });
  }

  /* ---------- the speech bubble waves itself away ----------
   * Dismissed for good, not just for this view: the About tab is rebuilt from
   * scratch on every navigation back to it, and a note the visitor has already
   * waved away should not reappear each time. Render asks bubbleHidden() before
   * it draws one. */

  const BUBBLE_KEY = 'portraitBubble:hidden';

  const bubbleHidden = () => {
    try {
      return localStorage.getItem(BUBBLE_KEY) === '1';
    } catch {
      return false; // storage blocked - better a bubble than a broken page
    }
  };

  // Attached even under reduced motion: this one is a control, not an effect.
  function initBubble() {
    document.addEventListener('click', (e) => {
      const bubble = e.target.closest?.('.portrait-bubble');
      if (!bubble) return;
      try { localStorage.setItem(BUBBLE_KEY, '1'); } catch {}
      bubble.classList.add('is-gone');
      // Out of the layout only once it has finished fading.
      setTimeout(() => bubble.remove(), reduced ? 0 : 260);
    });
  }

  function init() {
    initReveal();
    initScroll();
    initPointer();
    initRotator();
    initPortraitFx();
    initBubble();
  }

  return { init, observeAll, revealNow, reduced, bubbleHidden };
})();
