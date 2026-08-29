document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.lang-button');
  const blocks = document.querySelectorAll('[data-lang-block]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.lang;

      buttons.forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      blocks.forEach((block) => {
        const active = block.dataset.langBlock === target;
        block.classList.toggle('is-active', active);
      });
    });
  });
});
