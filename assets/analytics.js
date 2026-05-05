/* ================================================================
   Reach Screens — Google Analytics 4 (GA4) tracking

   ⚠️  ONE-LINE EDIT REQUIRED:
   Replace 'G-XXXXXXXXXX' below with your real GA4 Measurement ID
   from https://analytics.google.com/ → Admin → Data Streams → Web.
   The script no-ops while the placeholder is in place, so the site
   keeps working until you swap it in.

   Tracked events:
   - page_view  (auto, via GA config)
   - submit_idea_click  (any "Submit Your Idea" CTA, anywhere)
   - get_recommendation_click  (any "Get a Recommendation" link)
   - form_submit  (successful contact form submission)
   - scroll_75  (user scrolled past 75% of the page)

   Mark `form_submit` as a Conversion in GA4 → Admin → Events.
================================================================ */
(function () {
  'use strict';

  const GA_ID = 'G-30T0H76EWV';
  const PLACEHOLDER = 'G-XXXXXXXXXX';

  // No-op while the placeholder is in place — site works without GA active.
  if (!GA_ID || GA_ID === PLACEHOLDER) {
    window.gtag = function () {};
    return;
  }

  // Inject the gtag.js library.
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID, {
    // Anonymize IPs and respect Do-Not-Track headers; tweak to taste.
    anonymize_ip: true,
  });

  // ----- Event tracking ----------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    // CTA click tracking — match any anchor whose visible text is one of our
    // headline CTAs. Robust to copy tweaks because we match by text content.
    document.body.addEventListener('click', function (ev) {
      const a = ev.target.closest('a, button');
      if (!a) return;
      const txt = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (txt.includes('submit your idea')) {
        gtag('event', 'submit_idea_click', {
          location: location.pathname,
          link_url: a.href || '',
        });
      } else if (txt.includes('get a recommendation') || txt.includes('see pricing')) {
        gtag('event', 'get_recommendation_click', {
          location: location.pathname,
          link_url: a.href || '',
        });
      }
    }, { passive: true });

    // Form submit success — fires after the form-success element becomes visible.
    // (initContactForm in main.js adds the .show class on a 200 response.)
    const success = document.querySelector('.form-success');
    if (success) {
      const obs = new MutationObserver(function () {
        if (success.classList.contains('show')) {
          const form = document.querySelector('[data-contact-form]');
          const inquiryType = form?.querySelector('#inquiryType')?.value || 'unknown';
          const presence = form?.querySelector('#package')?.value || '';
          gtag('event', 'form_submit', {
            inquiry_type: inquiryType,
            presence_type: presence,
          });
          obs.disconnect();
        }
      });
      obs.observe(success, { attributes: true, attributeFilter: ['class'] });
    }

    // Scroll depth — fire once when the user scrolls past 75% of the page height.
    let fired75 = false;
    window.addEventListener('scroll', function () {
      if (fired75) return;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return;
      const pct = (h.scrollTop / max) * 100;
      if (pct >= 75) {
        fired75 = true;
        gtag('event', 'scroll_75', { location: location.pathname });
      }
    }, { passive: true });
  });
})();
