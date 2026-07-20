// sidepane.js — generic anchored drawer for opening text content
//
// Usage (basic, unchanged — right-anchored, 560px, no CTA):
//   <a class="sidepane-trigger"
//      href="/path/to/content.html"
//      data-sidepane-title="Title to show at the top of the drawer">
//     Link text
//   </a>
//
// Optional per-trigger data-attributes (added 2026-07-14 for the article pattern):
//   data-sidepane-side="left"           -> slide in from the left (default: right)
//   data-sidepane-size="third"          -> 1/3 of viewport on desktop, full on mobile
//                                          (default: min(560px, 100vw))
//   data-sidepane-cta-href="#contact"   -> show a sticky CTA button at the bottom
//   data-sidepane-cta-label="Book …"    -> CTA button label
//   data-article="<slug>"               -> makes the pane deep-linkable via
//                                          ?article=<slug> and keeps the URL in sync
//
// Deep-link: on load, ?article=<slug> opens the matching trigger's pane
// automatically (used for LinkedIn posts that link straight into an article).
//
// The drawer is dismissed by the close button, Esc, or clicking outside. Focus
// returns to the trigger. Privacy/Terms links use the basic form and are
// unaffected by the new options. Exposes window.GlindaSidepane.{open, close}.

(function () {
  if (window.__GLINDA_SIDEPANE_INITIALIZED__) return;
  window.__GLINDA_SIDEPANE_INITIALIZED__ = true;

  var ARTICLE_PARAM = 'article';

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
    // Left-anchored variant
    + '.sp-drawer.sp-left {'
    + '  right: auto; left: 0;'
    + '  transform: translateX(-100%);'
    + '  box-shadow: 10px 0 36px rgba(1, 5, 94, 0.10);'
    + '}'
    // 1/3-viewport size (desktop); full screen on mobile handled below
    + '.sp-drawer.sp-size-third { width: 33.333vw; min-width: 380px; }'
    // Open state — same end position for both sides
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
    + '.sp-body li { margin-bottom: 0.5rem; }'
    + '.sp-body a { color: #8705E4; text-decoration: underline; }'
    + '.sp-body a:hover { color: #6804B5; }'
    + '.sp-body small { color: #7E8C9F; font-size: 0.85rem; }'
    // Full-article typography (article fragments use h2/h4/blockquote/img)
    + '.sp-body h2 {'
    + "  font-family: 'Space Grotesk', system-ui, sans-serif;"
    + '  font-size: 1.15rem; font-weight: 700; color: #01055E;'
    + '  margin: 1.8rem 0 0.6rem; line-height: 1.25;'
    + '}'
    + '.sp-body h2:first-child, .sp-body h4:first-child { margin-top: 0; }'
    + '.sp-body h4 {'
    + "  font-family: 'Space Grotesk', system-ui, sans-serif;"
    + '  font-size: 0.95rem; font-weight: 700; color: #01055E; margin: 1.3rem 0 0.4rem;'
    + '}'
    + '.sp-body blockquote {'
    + '  margin: 1.2rem 0; padding: 0.9rem 1.1rem;'
    + '  border-left: 3px solid #8705E4; background: #F7F2FE;'
    + '  border-radius: 0 6px 6px 0; color: #41505A;'
    + '}'
    + '.sp-body blockquote p:last-child { margin-bottom: 0; }'
    + '.sp-body strong { color: #01055E; font-weight: 700; }'
    + '.sp-body img { max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0; display: block; }'
    + '.sp-author { display: flex; align-items: center; gap: 0.75rem; margin: 0 0 1.25rem; padding: 0 0 1rem; border-bottom: 1px solid #CDDCDF; }'
    + '.sp-author-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid #E8F0F2; }'
    + '.sp-author-name {'
    + "  font-family: 'Space Grotesk', system-ui, sans-serif;"
    + '  font-weight: 700; font-size: 0.95rem; color: #01055E; line-height: 1.2;'
    + '}'
    + '.sp-author-role { font-size: 0.8rem; color: #7E8C9F; margin-top: 2px; }'
    + '.sp-body h2.sp-subtitle {'
    + "  font-family: 'Open Sans', system-ui, sans-serif;"
    + '  font-style: italic; font-weight: 600; font-size: 1.15rem;'
    + '  color: #8705E4; margin: 0 0 1.2rem; line-height: 1.3; text-transform: none;'
    + '}'
    // Sticky CTA footer
    + '.sp-cta {'
    + '  flex-shrink: 0;'
    + '  border-top: 1px solid #CDDCDF;'
    + '  padding: 1rem 1.5rem;'
    + '  background: #fff;'
    + '}'
    + '.sp-cta[hidden] { display: none; }'
    + '.sp-cta a {'
    + '  display: block; text-align: center;'
    + '  background: #8705E4; color: #fff; text-decoration: none;'
    + "  font-family: 'Open Sans', system-ui, sans-serif;"
    + '  font-weight: 600; font-size: 0.95rem;'
    + '  padding: 0.8rem 1rem; border-radius: 8px;'
    + '  transition: background 0.15s;'
    + '}'
    + '.sp-cta a:hover { background: #6804B5; }'
    + '.sp-loading, .sp-error {'
    + '  text-align: center; padding: 2rem 1rem;'
    + '  color: #7E8C9F;'
    + '}'
    + '.sp-error { color: #b91c1c; }'
    + '@media (max-width: 640px) {'
    + '  .sp-drawer.sp-size-third { width: 100vw; min-width: 0; }'
    + '}';

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
    + '  <div class="sp-cta" hidden><a href="#"></a></div>'
    + '</div>';
  document.body.appendChild(overlay);

  var drawer   = overlay.querySelector('.sp-drawer');
  var titleEl  = overlay.querySelector('.sp-title');
  var bodyEl   = overlay.querySelector('.sp-body');
  var closeBtn = overlay.querySelector('.sp-close');
  var ctaEl    = overlay.querySelector('.sp-cta');
  var ctaLink  = ctaEl.querySelector('a');

  var lastTrigger = null;
  var contentCache = {};

  // ---------- URL param helpers (article deep-link, preserves other params) ----------
  function setArticleParam(slug) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set(ARTICLE_PARAM, slug);
      window.history.replaceState(null, '', url.toString());
    } catch (e) { /* noop */ }
  }
  function removeArticleParam() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has(ARTICLE_PARAM)) {
        url.searchParams.delete(ARTICLE_PARAM);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) { /* noop */ }
  }

  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    removeArticleParam();
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      // preventScroll: closing the pane should not scroll-jump the page back
      // to the trigger (and that jump also interfered with the CTA scroll).
      try { lastTrigger.focus({ preventScroll: true }); } catch (e) { lastTrigger.focus(); }
    }
  }

  // open(title, url, trigger, opts)
  //   opts = { side:'left'|'right', size:'third', cta:{href,label} }
  function open(title, url, trigger, opts) {
    opts = opts || {};
    lastTrigger = trigger || null;

    // Anchoring + size (reset both each open so panes don't inherit prior state)
    drawer.classList.toggle('sp-left', opts.side === 'left');
    drawer.classList.toggle('sp-size-third', opts.size === 'third');

    // Sticky CTA
    if (opts.cta && opts.cta.href) {
      ctaLink.setAttribute('href', opts.cta.href);
      ctaLink.textContent = opts.cta.label || 'Get in touch →';
      ctaEl.hidden = false;
    } else {
      ctaEl.hidden = true;
    }

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

  // Read the optional data-attributes off a trigger and open from it.
  function readTriggerOpts(trigger) {
    var ctaHref = trigger.getAttribute('data-sidepane-cta-href');
    return {
      side: trigger.getAttribute('data-sidepane-side') || 'right',
      size: trigger.getAttribute('data-sidepane-size') || '',
      article: trigger.getAttribute('data-article') || '',
      cta: ctaHref ? {
        href: ctaHref,
        label: trigger.getAttribute('data-sidepane-cta-label') || 'Get in touch →'
      } : null
    };
  }

  function openFromTrigger(trigger) {
    var url = trigger.getAttribute('href');
    var title = trigger.getAttribute('data-sidepane-title') || (trigger.textContent || '').trim();
    var opts = readTriggerOpts(trigger);
    open(title, url, trigger, opts);
    if (opts.article) setArticleParam(opts.article);
  }

  // ---------- Events ----------
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('.sidepane-trigger');
    if (!trigger) return;
    e.preventDefault();
    openFromTrigger(trigger);
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  // Sticky CTA: same-page anchors close the pane, then jump to the target.
  // Uses native hash navigation — a programmatic scrollIntoView after close()
  // was unreliable on long pages, while the browser's own anchor scroll works.
  ctaLink.addEventListener('click', function (e) {
    var href = ctaLink.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      e.preventDefault();
      close();
      setTimeout(function () {
        // Clear an already-matching hash first so the anchor jump re-fires.
        if (window.location.hash === href) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        window.location.hash = href;
      }, 60);
    } else {
      close();
    }
  });

  // ---------- Deep-link: ?article=<slug> opens the matching pane on load ----------
  function initDeepLink() {
    try {
      var slug = new URLSearchParams(window.location.search).get(ARTICLE_PARAM);
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return;
      var trigger = document.querySelector('.sidepane-trigger[data-article="' + slug + '"]');
      if (trigger) openFromTrigger(trigger);
    } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeepLink);
  } else {
    initDeepLink();
  }

  window.GlindaSidepane = { open: open, close: close };
})();
