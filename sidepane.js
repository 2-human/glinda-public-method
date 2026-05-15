// sidepane.js — generic right-anchored drawer for opening text content
//
// Usage:
//   <a class="sidepane-trigger"
//      href="/path/to/content.html"
//      data-sidepane-title="Title to show at the top of the drawer">
//     Link text
//   </a>
//
// On click, the linked URL is fetched and rendered in a drawer with the given
// title. The drawer is dismissed by clicking the close button, pressing Esc,
// or clicking outside the drawer body. Focus returns to the original trigger.
//
// The drawer's visual language matches the comments sidebar (right-anchored,
// solid white, brand-purple title accent, hairline divider, drop-shadow on
// the left edge). Self-contained: this file injects its own styles and DOM
// on first load and exposes window.GlindaSidepane.{open, close} for programmatic
// access (used later by the article-link pattern).

(function () {
  if (window.__GLINDA_SIDEPANE_INITIALIZED__) return;
  window.__GLINDA_SIDEPANE_INITIALIZED__ = true;

  // ---------- Styles ----------
  var css = ''
    + '.sp-overlay {'
    + '  position: fixed; inset: 0;'
    + '  background: rgba(1, 5, 94, 0.32);'
    + '  opacity: 0; pointer-events: none;'
    + '  transition: opacity 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);'
    + '  z-index: 200;'
    + '}'
    + '.sp-overlay.open { opacity: 1; pointer-events: auto; }'
    + '.sp-drawer {'
    + '  position: fixed; top: 0; right: 0; bottom: 0;'
    + '  width: min(560px, 100vw);'
    + '  background: #fff;'
    + '  z-index: 201;'
    + '  transform: translateX(100%);'
    + '  transition: transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1);'
    + '  display: flex; flex-direction: column;'
    + '  box-shadow: -10px 0 36px rgba(1, 5, 94, 0.10);'
    + '}'
    + '.sp-overlay.open .sp-drawer { transform: translateX(0); }'
    + '.sp-header {'
    + '  display: flex; justify-content: space-between; align-items: center;'
    + '  padding: 1.25rem 1.5rem;'
    + '  border-bottom: 1px solid #CDDCDF;'
    + '  flex-shrink: 0;'
    + '}'
    + '.sp-title {'
    + "  font-family: 'Space Grotesk', system-ui, sans-serif;"
    + '  font-size: 1.15rem; font-weight: 700;'
    + '  color: #01055E; margin: 0; line-height: 1.2;'
    + '}'
    + '.sp-close {'
    + '  background: none; border: none;'
    + '  font-size: 1.6rem; line-height: 1;'
    + '  cursor: pointer; color: #7E8C9F;'
    + '  padding: 0.25rem 0.5rem; border-radius: 4px;'
    + '  transition: color 0.15s, background 0.15s;'
    + '}'
    + '.sp-close:hover { color: #8705E4; background: #EFF5F7; }'
    + '.sp-body {'
    + '  flex: 1; overflow-y: auto;'
    + '  padding: 1.5rem;'
    + "  font-family: 'Open Sans', system-ui, sans-serif;"
    + '  font-size: 0.95rem; line-height: 1.6;'
    + '  color: #41505A;'
    + '}'
    + '.sp-body h3 {'
    + "  font-family: 'Space Grotesk', system-ui, sans-serif;"
    + '  font-size: 1rem; font-weight: 700;'
    + '  color: #01055E;'
    + '  margin: 1.6rem 0 0.5rem;'
    + '}'
    + '.sp-body h3:first-child { margin-top: 0; }'
    + '.sp-body p { margin: 0 0 0.9rem; }'
    + '.sp-body ul, .sp-body ol { margin: 0 0 0.9rem; padding-left: 1.25rem; }'
    + '.sp-body li { margin-bottom: 0.35rem; }'
    + '.sp-body a { color: #8705E4; text-decoration: underline; }'
    + '.sp-body a:hover { color: #6804B5; }'
    + '.sp-body small { color: #7E8C9F; font-size: 0.85rem; }'
    + '.sp-loading, .sp-error {'
    + '  text-align: center; padding: 2rem 1rem;'
    + '  color: #7E8C9F;'
    + '}'
    + '.sp-error { color: #b91c1c; }';

  var styleEl = document.createElement('style');
  styleEl.id = 'sidepane-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- DOM ----------
  var overlay = document.createElement('div');
  overlay.className = 'sp-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = ''
    + '<div class="sp-drawer" role="dialog" aria-modal="true" aria-labelledby="sp-title" tabindex="-1">'
    + '  <div class="sp-header">'
    + '    <h2 class="sp-title" id="sp-title"></h2>'
    + '    <button class="sp-close" type="button" aria-label="Close">×</button>'
    + '  </div>'
    + '  <div class="sp-body" tabindex="0"></div>'
    + '</div>';
  document.body.appendChild(overlay);

  var drawer  = overlay.querySelector('.sp-drawer');
  var titleEl = overlay.querySelector('.sp-title');
  var bodyEl  = overlay.querySelector('.sp-body');
  var closeBtn = overlay.querySelector('.sp-close');

  var lastTrigger = null;
  var contentCache = {};

  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  function open(title, url, trigger) {
    lastTrigger = trigger || null;
    titleEl.textContent = title || '';
    bodyEl.innerHTML = '<div class="sp-loading">Loading…</div>';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      try { drawer.focus(); } catch (e) { /* noop */ }
    }, 260);

    if (contentCache[url]) {
      bodyEl.innerHTML = contentCache[url];
      bodyEl.scrollTop = 0;
      return;
    }

    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        contentCache[url] = html;
        bodyEl.innerHTML = html;
        bodyEl.scrollTop = 0;
      })
      .catch(function (err) {
        console.error('[sidepane] fetch failed:', err);
        bodyEl.innerHTML = '<div class="sp-error">Sorry, that content couldn\'t be loaded right now. Please try again or email <a href="mailto:team@glindagroup.com">team@glindagroup.com</a>.</div>';
      });
  }

  // Event delegation — any element with .sidepane-trigger opens the drawer.
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('.sidepane-trigger');
    if (!trigger) return;
    e.preventDefault();
    var url = trigger.getAttribute('href');
    var title = trigger.getAttribute('data-sidepane-title') || (trigger.textContent || '').trim();
    open(title, url, trigger);
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  window.GlindaSidepane = { open: open, close: close };
})();
