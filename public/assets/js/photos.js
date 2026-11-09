/* ==================== PHOTOS ====================
 * The pile of prints at the foot of the About tab.
 *
 * The whole model is DOM order: first child is the top of the pile, and the
 * CSS positions every card by :nth-child. Browsing is therefore one operation -
 * move the top node to the end - and the transition on `transform` animates
 * every other card into its new place for free. There is no current-index to
 * keep in sync with anything, and a re-render of the view costs nothing.
 *
 * Everything is delegated from `document`, so nothing needs re-binding when the
 * router rebuilds the tab.
 *
 * prefers-reduced-motion: the pile still works, it just cuts rather than
 * animates (the transitions are dropped in CSS) and dragging is not attached.
 * ================================================ */

const Photos = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FLY_MS = 340;      // must match .photo-card.is-leaving's transition
  const SWIPE_PX = 70;     // drag past this and the card goes
  const TAP_PX = 6;        // under this, it was a tap, not a drag
  const TAP_MS = 400;

  let drag = null;         // { card, id, x0, y0, dx, t0 }
  let busy = false;        // a card is mid-flight; ignore input until it lands

  const stackOf = (el) => el.closest('.photo-stack');
  const topCard = (stack) => stack.querySelector('.photo-card');

  /* Send the top card away and put it at the back. `dir` is -1 (left) or 1. */
  function advance(stack, dir = -1) {
    const card = topCard(stack);
    if (!card || busy || stack.children.length < 2) return;
    busy = true;

    card.style.transform = '';           // drop any drag transform
    card.style.setProperty('--fly', dir);
    card.classList.add('is-leaving');

    setTimeout(() => {
      stack.appendChild(card);           // now the back of the pile
      // Land it in its new place without animating the trip back: kill the
      // transition for one frame, then hand it back.
      card.classList.add('is-instant');
      card.classList.remove('is-leaving');
      card.style.removeProperty('--fly');
      void card.offsetWidth;             // force the style flush
      card.classList.remove('is-instant');
      busy = false;
    }, reduced ? 0 : FLY_MS);
  }

  /* ---------- dragging the top card ---------- */

  function onDown(e) {
    if (reduced || busy || e.button > 0) return;
    const card = e.target.closest('.photo-card');
    const stack = card && stackOf(card);
    if (!stack || card !== topCard(stack)) return;   // only the top one moves

    drag = { card, stack, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, t0: performance.now() };
    card.setPointerCapture(e.pointerId);
    card.classList.add('is-dragging');
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0;
    drag.dy = e.clientY - drag.y0;
    // A print being pushed aside pivots a little as it goes.
    drag.card.style.transform =
      `translate(${drag.dx}px, ${drag.dy * 0.35}px) rotate(${drag.dx / 22}deg)`;
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, stack, dx, t0 } = drag;
    card.classList.remove('is-dragging');
    drag = null;

    const tap = Math.abs(dx) < TAP_PX && performance.now() - t0 < TAP_MS;
    if (tap || Math.abs(dx) > SWIPE_PX) {
      advance(stack, dx > 0 ? 1 : -1);   // a tap always sends it the same way
    } else {
      card.style.transform = '';         // not far enough: it settles back
    }
  }

  function init() {
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.photo-next');
      if (!btn) return;
      const stack = btn.closest('.photo-pile')?.querySelector('.photo-stack');
      if (stack) advance(stack, -1);
    });

    // The button is the pile's keyboard handle, so left/right work from it
    // rather than only its own Enter/Space.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const btn = document.activeElement?.closest?.('.photo-next');
      if (!btn) return;
      e.preventDefault();
      const stack = btn.closest('.photo-pile')?.querySelector('.photo-stack');
      if (stack) advance(stack, e.key === 'ArrowRight' ? 1 : -1);
    });
  }

  return { init, reduced };
})();
