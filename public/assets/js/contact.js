/* ==================== CONTACT ====================
 * Validation, Web3Forms submit, copy-to-clipboard.
 * Every path reports the real outcome — a failed send says so.
 * ================================================= */

const Contact = (() => {
  const C = SITE_CONTENT;
  const ENDPOINT = 'https://api.web3forms.com/submit';

  const hasKey = () => Render.has(C.contact.web3formsKey);

  /* ---------- toast ---------- */

  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- validation ---------- */

  const RULES = {
    name: (v) => (v.trim().length >= 2 ? '' : 'צריך לפחות שתי אותיות'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'כתובת אימייל לא תקינה'),
    // Optional, but if filled it should look like a phone number.
    phone: (v) => (!v.trim() || /^[\d\s+()-]{7,20}$/.test(v.trim()) ? '' : 'מספר טלפון לא תקין'),
    message: (v) => (v.trim().length >= 10 ? '' : 'ספר לי קצת יותר — לפחות 10 תווים'),
  };

  function validateField(input) {
    const rule = RULES[input.name];
    if (!rule) return true;
    const error = rule(input.value);
    const field = input.closest('.field');
    field.classList.toggle('invalid', !!error);
    const slot = field.querySelector(`[data-error-for="${input.name}"]`);
    if (slot) slot.textContent = error;
    input.setAttribute('aria-invalid', error ? 'true' : 'false');
    return !error;
  }

  function validateForm(form) {
    let firstBad = null;
    let ok = true;
    ['name', 'email', 'phone', 'message'].forEach((n) => {
      const input = form.elements[n];
      if (!input) return;
      if (!validateField(input)) {
        ok = false;
        if (!firstBad) firstBad = input;
      }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  /* ---------- status ---------- */

  function setStatus(kind, html) {
    const el = document.getElementById('form-status');
    if (!el) return;
    el.className = `form-status show ${kind}`;
    el.innerHTML = html;
  }

  function clearStatus() {
    const el = document.getElementById('form-status');
    if (el) el.className = 'form-status';
  }

  function fallbackContacts() {
    const m = C.meta;
    const bits = [];
    if (Render.has(m.email)) {
      bits.push(`<a href="mailto:${Render.esc(m.email)}" class="ltr">${Render.esc(m.email)}</a>`);
    }
    return bits.join(' · ');
  }

  /* ---------- submit ---------- */

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;

    // Honeypot: a bot filled the hidden field. Pretend success, send nothing.
    if (form.elements.botcheck?.value) {
      setStatus('success', Render.esc(C.contact.form.success));
      form.reset();
      return;
    }

    if (!validateForm(form)) return;

    // No key configured yet — say so plainly instead of firing a request
    // that would 400.
    if (!hasKey()) {
      setStatus('error',
        `הטופס עדיין לא חובר לשירות השליחה. אפשר לפנות אליי ישירות: ${fallbackContacts()}`);
      return;
    }

    const btn = document.getElementById('cf-submit');
    const label = btn.querySelector('.btn-label');
    const original = label.textContent;

    btn.disabled = true;
    label.textContent = C.contact.form.sending;
    btn.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
    clearStatus();

    const payload = {
      access_key: C.contact.web3formsKey,
      subject: C.contact.emailSubject,
      from_name: C.meta.name + ' — האתר האישי',
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim() || 'לא צוין',
      message: form.elements.message.value.trim(),
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus('success', Render.esc(C.contact.form.success));
        form.reset();
        form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
      } else {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      // Real failure — never fake a success here.
      setStatus('error',
        `${Render.esc(C.contact.form.error)} ${fallbackContacts()}`);
      console.error('[contact] send failed:', err);
    } finally {
      btn.disabled = false;
      btn.querySelector('.spinner')?.remove();
      label.textContent = original;
    }
  }

  /* ---------- wiring ---------- */

  function init() {
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', submit);
      // Validate on blur, then live-correct once a field is already marked bad.
      form.addEventListener('blur', (e) => {
        if (RULES[e.target.name]) validateField(e.target);
      }, true);
      form.addEventListener('input', (e) => {
        if (RULES[e.target.name] && e.target.closest('.field')?.classList.contains('invalid')) {
          validateField(e.target);
        }
      });
    }

    // Copy buttons (Bit / PayBox numbers).
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        toast('המספר הועתק ✓');
      } catch {
        // clipboard API needs a secure context; select the text so the user
        // can copy it manually rather than leaving them with nothing.
        const range = document.createRange();
        range.selectNodeContents(btn.querySelector('span') || btn);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        toast('סמן והעתק ידנית');
      }
    });
  }

  return { init, toast };
})();
