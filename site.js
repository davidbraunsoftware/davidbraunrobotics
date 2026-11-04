/* Behaviour of the site. No texts or choices here: they come from the pages (built from settings.py). */

// YouTube preview picture: if this size does not exist (error, or YouTube's tiny placeholder),
// try the next size listed in data-previews (set from settings.VIDEO_PREVIEWS).
function nextPreview(img, loaded) {
  if (loaded && img.naturalWidth >= +img.dataset.minWidth) return;
  const sizes = img.dataset.previews.split(' ');
  const i = sizes.findIndex(s => img.src.includes('/' + s + '.'));
  if (i >= 0 && i < sizes.length - 1) img.src = img.src.replace('/' + sizes[i] + '.', '/' + sizes[i + 1] + '.');
}

document.addEventListener('DOMContentLoaded', () => {
  // phone menu
  const menu = document.querySelector('.menu-btn');
  if (menu) {
    const list = menu.nextElementSibling;
    const set = open => { list.classList.toggle('open', open); menu.setAttribute('aria-expanded', open); };
    menu.addEventListener('click', () => set(!list.classList.contains('open')));
    // closes when touching anywhere outside the menu (pointerdown: phones do not report taps on plain text as clicks), or with Esc
    document.addEventListener('pointerdown', ev => { if (list.classList.contains('open') && !ev.target.closest('.nav')) set(false); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') set(false); });
  }

  // BibTeX box under a publication
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-bib]');
    if (b) b.closest('.pub').querySelector('pre').classList.toggle('open');
  });

  // filter buttons (Publications: Journal / Conference / Patents; News: Highlights / All news).
  // The filter box names the items it filters (data-items); each item and button carries data-filter.
  // Clicking the active button again shows all. An address ending such as #patents, or a button marked
  // data-default, opens the list pre-filtered.
  const box = document.querySelector('.filters');
  if (box) {
    const buttons = [...box.querySelectorAll('button')];
    const items = [...document.querySelectorAll(box.dataset.items)];
    const show = key => {
      buttons.forEach(b => b.classList.toggle('on', key !== null && b.dataset.filter === key));
      items.forEach(i => { i.style.display = !key || i.dataset.filter === key ? '' : 'none'; });
      // separator lines only between VISIBLE items (not under a heading): mark each visible item whose
      // nearest visible neighbour above is an item of the same list
      document.body.classList.add('filtered');
      items.forEach(i => {
        let p = i.previousElementSibling;
        while (p && p.matches(box.dataset.items) && p.style.display === 'none') p = p.previousElementSibling;
        i.classList.toggle('sep', !!p && p.matches(box.dataset.items) && i.style.display !== 'none');
      });
      document.querySelectorAll('.year-h').forEach(h => {   // hide a year heading with nothing visible below it
        let s = h.nextElementSibling, visible = false;
        while (s && !s.classList.contains('year-h')) {
          const group = s.matches(box.dataset.items) ? [s] : [...s.querySelectorAll(box.dataset.items)];
          if (group.some(i => i.style.display !== 'none')) visible = true;
          s = s.nextElementSibling;
        }
        h.style.display = visible ? '' : 'none';
      });
      // the first visible year sits right under the line, whichever filter is on
      const years = [...document.querySelectorAll('.year-h')];
      years.forEach(h => h.classList.remove('first-shown'));
      const first = years.find(h => h.style.display !== 'none');
      if (first) first.classList.add('first-shown');
    };
    buttons.forEach(b => b.addEventListener('click', () => show(b.classList.contains('on') ? null : b.dataset.filter)));
    const start = buttons.find(b => b.dataset.hash && b.dataset.hash === location.hash) || buttons.find(b => 'default' in b.dataset);
    if (start) show(start.dataset.filter);
  }

  // form fields: show the site's own messages (data-msg-missing / -short / -format) instead of the browser's
  document.querySelectorAll('form.form input, form.form textarea').forEach(field => {
    field.addEventListener('invalid', () => {
      const v = field.validity, d = field.dataset;
      field.setCustomValidity(
        v.valueMissing ? (d.msgMissing || '') :
        (v.tooShort ? (d.msgShort || '') : ((v.patternMismatch || v.typeMismatch) ? (d.msgFormat || '') : '')));
    });
    const words = () => (field.value.trim().match(/\S+/g) || []).length;
    field.addEventListener('input', () => {
      field.setCustomValidity('');
      if (field.dataset.maxWords) {   // word limit with a live counter under the box
        const n = words(), max = +field.dataset.maxWords, counter = field.parentElement.querySelector('.counter');
        if (counter) counter.textContent = field.dataset.counter.replace('{n}', n).replace('{max}', max);
        if (n > max) { field.setCustomValidity(field.dataset.msgLong || ''); return; }
      }
      // minlength is only checked by browsers after typing; check it here too so the message appears on time
      if (field.minLength > 0 && field.value && field.value.trim().length < field.minLength && field.dataset.msgShort)
        field.setCustomValidity(field.dataset.msgShort);
    });
  });

  // contact form before it is connected to a form service: show a note instead of sending
  document.querySelectorAll('form[data-preview]').forEach(f => f.addEventListener('submit', ev => {
    ev.preventDefault();
    alert(f.dataset.preview);
  }));

  // connected contact form: send in the background and show the result on the page
  // (without JavaScript the browser simply posts the form to the service)
  document.querySelectorAll('form[data-sent]').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const status = f.querySelector('.form-status'), button = f.querySelector('button[type=submit]'), label = button.textContent;
    button.disabled = true;
    if (f.dataset.sending) button.textContent = f.dataset.sending;
    try {
      const r = await fetch(f.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) });
      const ok = r.ok && (await r.json()).success;
      status.textContent = ok ? f.dataset.sent : f.dataset.error;
      if (ok) { f.reset(); f.querySelectorAll('textarea, input').forEach(x => x.dispatchEvent(new Event('input'))); }   // also resets the word counter
    } catch (e) {
      status.textContent = f.dataset.error;
    }
    button.disabled = false;
    button.textContent = label;
  }));
});
