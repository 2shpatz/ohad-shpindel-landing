
(function () {
  var stateEl = document.getElementById('spillitout-report-state');
  if (!stateEl) return;
  var state;
  try { state = JSON.parse(stateEl.textContent || '{}'); } catch (e) { return; }
  if (!state || !state.sessionId) return;
  state.items = state.items || [];
  var LOCAL_KEY = 'spillitout-report-' + state.sessionId;
  try {
    var cachedRaw = localStorage.getItem(LOCAL_KEY);
    if (cachedRaw) {
      var cached = JSON.parse(cachedRaw);
      if (cached && (!state.savedAt || !cached.savedAt || cached.savedAt > state.savedAt)) {
        state = cached;
      }
    }
  } catch (e) { /* localStorage unavailable, or the cached entry was corrupted - keep the embedded state */ }
  state.events = state.events || [];
  state.removedEventIds = state.removedEventIds || [];

  var originalEventIds = {};
  state.events.forEach(function (e) { originalEventIds[e.id] = true; });
  var emptyDayDates = [];
  var selectedDate = null;
  var justAddedEventId = null;
  var persistLocalTimer = null;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function toIso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  // Display-only - DD-MM-YYYY, never the ISO order, matching the app's own formatDate().
  function toDisplayDate(iso) { var p = iso.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function uid() { return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function persistLocal() {
    clearTimeout(persistLocalTimer);
    persistLocalTimer = setTimeout(function () {
      try {
        state.savedAt = new Date().toISOString();
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
        var savedAtEl = document.getElementById('saved-at');
        if (savedAtEl) {
          var t = new Date(state.savedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
          savedAtEl.innerHTML = 'נשמר אוטומטית במכשיר זה - עדכון אחרון ' + t + '<span class="en">Auto-saved on this device - last update ' + t + '</span>';
        }
      } catch (e) { /* localStorage unavailable - edits still work this session, just won't persist across opens */ }
    }, 400);
  }

  function itemsByKind(kind) { return state.items.filter(function (it) { return it.kind === kind; }); }
  function findItem(id) {
    var found = null;
    state.items.forEach(function (it) { if (it.id === id) found = it; });
    return found;
  }
  function itemText(id) { var it = findItem(id); return it ? it.text : id; }
  function itemKindOf(id) { var it = findItem(id); return it ? it.kind : 'task'; }

  // ---- Tabs ----
  var tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      Array.from(document.querySelectorAll('.tab-panel')).forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var panel = document.querySelector('.tab-panel[data-panel="' + btn.getAttribute('data-tab') + '"]');
      if (panel) panel.classList.add('active');
    });
  });

  // ---- Swipeable carousels: the artifacts on the overview tab, and the medals ----
  // One function for both, because there are now two of them and a copy of this
  // wiring would drift: the medals arrived as a second carousel in 2026-08-19, and
  // the only thing that differs between them is the four element ids.
  function initCarousel(trackId, dotsId, prevId, nextId, dotLabel) {
    var track = document.getElementById(trackId);
    if (!track) return;
    var slides = Array.from(track.children);
    var dotsWrap = document.getElementById(dotsId);
    var currentSlide = 0;
    var goToSlide = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      slides[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    };
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', dotLabel + ' ' + (i + 1));
      dot.addEventListener('click', function () { goToSlide(i); });
      if (dotsWrap) dotsWrap.appendChild(dot);
    });
    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);
    if (prevBtn) prevBtn.addEventListener('click', function () { goToSlide(currentSlide - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToSlide(currentSlide + 1); });
    if ('IntersectionObserver' in window) {
      var slideObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            var idx = slides.indexOf(entry.target);
            if (idx !== -1) {
              currentSlide = idx;
              if (dotsWrap) Array.from(dotsWrap.children).forEach(function (d, i) { d.classList.toggle('active', i === idx); });
            }
          }
        });
      }, { root: track, threshold: [0.6] });
      slides.forEach(function (s) { slideObserver.observe(s); });
    }
  }
  initCarousel('carousel-track', 'carousel-dots', 'carousel-prev', 'carousel-next', 'שקופית');
  // The medals sit on a tab that starts hidden. That is fine: the dots start on
  // the first one, and the observer fires as soon as the tab is opened.
  initCarousel('medal-track', 'medal-dots', 'medal-prev', 'medal-next', 'מדליה');
  // Third caller, and still no new logic here: the paths from a difficulty to a
  // success page exactly like the medals beside them.
  initCarousel('chain-track', 'chain-dots', 'chain-prev', 'chain-next', 'שרשרת');

  // ---- Event log: date roller + single-day detail ----
  var DOW_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  var KIND_GROUP_LABELS = { issue: 'קשיים · Issues', tip: 'דגשים · Key Points', task: 'משימות · Tasks', success: 'הצלחות · Successes' };
  var KIND_ORDER = ['issue', 'tip', 'task', 'success'];

  function allDates() {
    var set = {};
    state.events.forEach(function (e) { set[e.date] = true; });
    emptyDayDates.forEach(function (d) { set[d] = true; });
    return Object.keys(set).sort();
  }
  function eventsForDate(date) {
    return state.events.filter(function (e) { return e.date === date; }).sort(function (a, b) {
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    });
  }
  function kindsForDate(date) {
    var kinds = {};
    eventsForDate(date).forEach(function (e) { e.itemIds.forEach(function (id) { kinds[itemKindOf(id)] = true; }); });
    return Object.keys(kinds);
  }

  function addEvent(date, itemIds, note) {
    var ev = { id: uid(), date: date, itemIds: itemIds, note: note, createdAt: new Date().toISOString() };
    state.events.push(ev);
    emptyDayDates = emptyDayDates.filter(function (d) { return d !== date; });
    justAddedEventId = ev.id;
    renderRoller();
    renderDayDetail();
    renderProgressImage();
    persistLocal();
  }
  function removeEvent(id) {
    state.events = state.events.filter(function (e) { return e.id !== id; });
    if (originalEventIds[id] && state.removedEventIds.indexOf(id) === -1) state.removedEventIds.push(id);
    renderRoller();
    renderDayDetail();
    renderProgressImage();
    persistLocal();
  }
  function selectDate(date) {
    selectedDate = date;
    renderRoller();
    renderDayDetail();
  }
  function addDay(date) {
    if (allDates().indexOf(date) === -1) emptyDayDates.push(date);
    selectDate(date);
  }

  function buildItemPicker() {
    var wrap = document.createElement('div');
    wrap.className = 'item-picker';
    var checkboxes = [];
    KIND_ORDER.forEach(function (kind) {
      var items = itemsByKind(kind);
      if (items.length === 0) return;
      var groupLabel = document.createElement('div');
      groupLabel.className = 'item-picker-group kind-' + kind;
      groupLabel.textContent = KIND_GROUP_LABELS[kind];
      wrap.appendChild(groupLabel);
      items.forEach(function (it) {
        var row = document.createElement('label');
        row.className = 'item-picker-row';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = it.id;
        var span = document.createElement('span');
        span.textContent = it.text;
        row.appendChild(cb);
        row.appendChild(span);
        wrap.appendChild(row);
        checkboxes.push(cb);
      });
    });
    return { el: wrap, checkboxes: checkboxes };
  }

  function buildEventRow(ev, newlyAddedId) {
    var row = document.createElement('div');
    row.className = 'event-row';
    if (newlyAddedId === ev.id) row.className += ' new';
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'event-dots';
    ev.itemIds.forEach(function (id) {
      var dot = document.createElement('span');
      dot.className = 'event-dot kind-' + itemKindOf(id);
      dotsWrap.appendChild(dot);
    });
    var body = document.createElement('div');
    body.className = 'event-body';
    var title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = ev.itemIds.map(itemText).join(' · ');
    body.appendChild(title);
    if (ev.note) {
      var note = document.createElement('div');
      note.className = 'event-note';
      note.textContent = ev.note;
      body.appendChild(note);
    }
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'event-delete';
    del.setAttribute('aria-label', 'מחיקת אירוע');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () { removeEvent(ev.id); });
    row.appendChild(dotsWrap);
    row.appendChild(body);
    row.appendChild(del);
    return row;
  }

  function buildAddEventForm(date, onDone) {
    var form = document.createElement('div');
    form.className = 'add-event-form';
    var picker = buildItemPicker();
    var note = document.createElement('textarea');
    note.placeholder = 'מה קרה? איך זה עבד?\u2026';
    var actions = document.createElement('div');
    actions.className = 'add-event-actions';
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'שמירת אירוע';
    save.addEventListener('click', function () {
      var ids = picker.checkboxes.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (ids.length === 0) return;
      addEvent(date, ids, note.value.trim());
      onDone();
    });
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'ghost';
    cancel.textContent = 'ביטול';
    cancel.addEventListener('click', onDone);
    actions.appendChild(save);
    actions.appendChild(cancel);
    form.appendChild(picker.el);
    form.appendChild(note);
    form.appendChild(actions);
    return form;
  }

  var timelineEnabled = state.items.length > 0;
  var addDayBar = document.querySelector('.add-day-bar');
  if (!timelineEnabled && addDayBar) addDayBar.style.display = 'none';

  function renderRoller() {
    var roller = document.getElementById('date-roller');
    if (!roller) return;
    roller.innerHTML = '';
    var dates = allDates();
    if (dates.length === 0) return;
    if (!selectedDate || dates.indexOf(selectedDate) === -1) selectedDate = dates[dates.length - 1];
    dates.forEach(function (date) {
      var d = new Date(date + 'T00:00:00');
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'date-chip' + (date === selectedDate ? ' selected' : '');
      var dow = document.createElement('span');
      dow.className = 'dow';
      dow.textContent = DOW_NAMES[d.getDay()];
      var dom = document.createElement('span');
      dom.className = 'dom';
      dom.textContent = String(d.getDate());
      var dots = document.createElement('span');
      dots.className = 'chip-dots';
      kindsForDate(date).forEach(function (k) {
        var dot = document.createElement('span');
        dot.className = 'kind-' + k;
        dots.appendChild(dot);
      });
      chip.appendChild(dow);
      chip.appendChild(dom);
      chip.appendChild(dots);
      chip.addEventListener('click', function () { selectDate(date); });
      roller.appendChild(chip);
      if (date === selectedDate) {
        setTimeout(function () { chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }, 0);
      }
    });
  }

  function renderDayDetail() {
    var container = document.getElementById('day-detail');
    if (!container) return;
    var newlyAddedId = justAddedEventId;
    container.innerHTML = '';
    if (!timelineEnabled) {
      container.innerHTML = '<p class="empty">אין קשיים, דגשים או משימות למעקב עדיין.</p>';
      justAddedEventId = null;
      return;
    }
    var dates = allDates();
    if (dates.length === 0 || !selectedDate) {
      container.innerHTML = '<p class="empty">עוד לא נוספו ימים. לחצו על "הוספת יום" כדי להתחיל לתעד.</p>';
      justAddedEventId = null;
      return;
    }
    var date = selectedDate;
    var card = document.createElement('div');
    card.className = 'day-card';
    card.id = 'day-' + date;
    var header = document.createElement('div');
    header.className = 'day-card-header';
    var h3 = document.createElement('h3');
    var d = new Date(date + 'T00:00:00');
    h3.textContent = toDisplayDate(date) + ' · ' + DOW_NAMES[d.getDay()];
    header.appendChild(h3);
    card.appendChild(header);
    eventsForDate(date).forEach(function (ev) { card.appendChild(buildEventRow(ev, newlyAddedId)); });
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-event-btn';
    addBtn.textContent = '+ הוספת אירוע';
    var formSlot = document.createElement('div');
    addBtn.addEventListener('click', function () {
      addBtn.style.display = 'none';
      var form = buildAddEventForm(date, function () {
        formSlot.innerHTML = '';
        addBtn.style.display = '';
      });
      formSlot.innerHTML = '';
      formSlot.appendChild(form);
    });
    card.appendChild(addBtn);
    card.appendChild(formSlot);
    container.appendChild(card);
    justAddedEventId = null;
  }

  var addDayDateInput = document.getElementById('add-day-date');
  if (addDayDateInput) {
    addDayDateInput.min = state.sessionDate;
    addDayDateInput.value = toIso(new Date());
  }
  var addDayBtn = document.getElementById('add-day-btn');
  if (addDayBtn) {
    addDayBtn.addEventListener('click', function () {
      addDay((addDayDateInput && addDayDateInput.value) || toIso(new Date()));
    });
  }
  function stepDay(delta) {
    var dates = allDates();
    if (dates.length === 0) return;
    var idx = dates.indexOf(selectedDate);
    if (idx === -1) idx = dates.length - 1;
    selectDate(dates[Math.max(0, Math.min(dates.length - 1, idx + delta))]);
  }
  var rollerPrev = document.getElementById('roller-prev');
  var rollerNext = document.getElementById('roller-next');
  if (rollerPrev) rollerPrev.addEventListener('click', function () { stepDay(-1); });
  if (rollerNext) rollerNext.addEventListener('click', function () { stepDay(1); });

  renderRoller();
  renderDayDetail();

  // ---- Progress image (growth GIF) ----
  var progressCanvas = document.getElementById('progress-image-canvas');
  var progressCaption = document.getElementById('progress-caption');
  var progressDecoder = null;
  var progressFrameCount = 1;

  function base64ToBytes(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function renderProgressFrame() {
    if (!progressDecoder || !progressCanvas) return;
    var frameIndex = Math.min(progressFrameCount - 1, state.events.length);
    progressDecoder.decode({ frameIndex: frameIndex }).then(function (result) {
      var frame = result.image;
      progressCanvas.width = frame.displayWidth;
      progressCanvas.height = frame.displayHeight;
      var ctx = progressCanvas.getContext('2d');
      ctx.clearRect(0, 0, progressCanvas.width, progressCanvas.height);
      ctx.drawImage(frame, 0, 0);
      frame.close();
    }).catch(function () { /* decoding this frame failed - leave the last drawn frame as-is */ });
  }
  function renderProgressImage() { if (progressDecoder) renderProgressFrame(); }

  if (state.progressImageBase64 && progressCanvas) {
    var supportsImageDecoder = typeof window.ImageDecoder !== 'undefined';
    (supportsImageDecoder && window.ImageDecoder.isTypeSupported
      ? window.ImageDecoder.isTypeSupported('image/gif')
      : Promise.resolve(supportsImageDecoder)
    ).then(function (supported) {
      if (!supported) {
        var img = document.createElement('img');
        img.src = 'data:image/gif;base64,' + state.progressImageBase64;
        img.className = 'progress-image-fallback';
        progressCanvas.replaceWith(img);
        if (progressCaption) progressCaption.style.display = 'none';
        return;
      }
      try {
        var bytes = base64ToBytes(state.progressImageBase64);
        progressDecoder = new window.ImageDecoder({ data: bytes, type: 'image/gif' });
        progressDecoder.tracks.ready.then(function () {
          progressFrameCount = progressDecoder.tracks.selectedTrack.frameCount || 1;
          renderProgressFrame();
        });
      } catch (e) {
        var panel = document.getElementById('progress-image-panel');
        if (panel) panel.style.display = 'none';
      }
    }).catch(function () {
      var panel2 = document.getElementById('progress-image-panel');
      if (panel2) panel2.style.display = 'none';
    });
  }

  // ---- Send update to therapist (occasional export - everyday edits are
  // already autosaved locally via persistLocal(), so this isn't needed just
  // to keep progress from being lost) ----
  var saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    state.savedAt = new Date().toISOString();
    stateEl.textContent = JSON.stringify(state).replace(/</g, '\\u003c');
    saveBtn.className += ' saved';
    setTimeout(function () { saveBtn.className = saveBtn.className.replace(' saved', ''); }, 500);
    var html = '<!doctype html>\n' + document.documentElement.outerHTML;
    var blob = new Blob([html], { type: 'text/html' });
    var filename = 'spillitout-report-progress.html';
    if (navigator.canShare && navigator.share) {
      try {
        var file = new File([blob], filename, { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          // The file and nothing else. A `text` alongside it does not stay
          // attached to the file: WhatsApp delivers it as its own plain message,
          // so every update a parent sent back announced itself with a line of
          // our boilerplate that then sat in the therapist's collect picker
          // looking like something a parent had written (2026-08-17, reported).
          // `title` is dropped for the same reason - some targets use it as the
          // message body - and the share sheet shows the file name regardless.
          navigator.share({ files: [file] }).catch(function () {});
          return;
        }
      } catch (e) { /* Web Share API unavailable for files here - fall through to a plain download */ }
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();
