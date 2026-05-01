/* ============================================
   REACH SCREENS — Interactions
   ============================================ */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initScrollProgress();
    initNav();
    initReveal();
    initCounters();
    initCardTilt();
    initFaq();
    initTabs();
    initTestimonials();
    initContactForm();
    initTimeline();
    initParallax();
  }

  /* ---------- Scroll progress bar ---------- */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    let ticking = false;
    function update() {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const height = h.scrollHeight - h.clientHeight;
      const pct = height > 0 ? (scrolled / height) * 100 : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Nav (scroll effect + mobile toggle + active link) ---------- */
  function initNav() {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (nav) {
      const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 24);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        links.classList.toggle('open');
      });
      // Close on link click (mobile)
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          toggle.classList.remove('active');
          links.classList.remove('open');
        });
      });
    }

    // Highlight current page
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href === here || (here === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  /* ---------- Scroll reveal via Intersection Observer ---------- */
  function initReveal() {
    const selectors = ['.reveal', '.reveal-left', '.reveal-right', '.reveal-scale', '.stagger', '.table-row', '.timeline-item', '.price-card'];
    const els = document.querySelectorAll(selectors.join(','));
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Counter animation ---------- */
  function initCounters() {
    const nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      const startVal = 0;
      const easeOut = t => 1 - Math.pow(1 - t, 3);

      function fmt(n) {
        if (target >= 1000) return Math.floor(n).toLocaleString();
        if (Number.isInteger(target)) return Math.floor(n).toString();
        const decimals = (el.dataset.count.split('.')[1] || '').length || 1;
        return n.toFixed(decimals);
      }

      function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const val = startVal + (target - startVal) * easeOut(t);
        el.textContent = fmt(val) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target) + suffix;
      }
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(animate);
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    nodes.forEach(n => io.observe(n));
  }

  /* ---------- 3D card tilt on hover (desktop only) ---------- */
  function initCardTilt() {
    if (prefersReduced) return;
    if (matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
      const strength = parseFloat(card.dataset.tilt) || 8;
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - y) * strength;
        const ry = (x - 0.5) * strength;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    // Mouse-follow glow for .card
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close siblings in same parent (optional)
        item.parentElement.querySelectorAll('.faq-item.open').forEach(other => {
          if (other !== item) {
            other.classList.remove('open');
            const oa = other.querySelector('.faq-a');
            if (oa) oa.style.maxHeight = '0px';
          }
        });
        if (isOpen) {
          item.classList.remove('open');
          a.style.maxHeight = '0px';
        } else {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(group => {
      const btns = group.querySelectorAll('.tab-btn');
      const panels = document.querySelectorAll('[data-tab-target]');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          btns.forEach(b => b.classList.toggle('active', b === btn));
          panels.forEach(p => p.classList.toggle('active', p.dataset.tabTarget === target));
        });
      });
    });
  }

  /* ---------- Testimonials carousel ---------- */
  function initTestimonials() {
    const root = document.querySelector('[data-testimonials]');
    if (!root) return;
    const slides = root.querySelectorAll('.testimonial-slide');
    const dots = root.querySelectorAll('.testimonial-dot');
    if (!slides.length) return;

    let idx = 0;
    let timer;

    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('active', n === idx));
      dots.forEach((d, n) => d.classList.toggle('active', n === idx));
    }
    function next() { show(idx + 1); }
    function start() { timer = setInterval(next, 6000); }
    function stop() { clearInterval(timer); }

    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); stop(); start(); }));
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    show(0);
    start();
  }

  /* ---------- Contact form ---------- */
  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const inquiryHidden = form.querySelector('#inquiryType');
    const toggleBtns = form.querySelectorAll('.form-toggle-btn');
    const advertiseOnly = form.querySelectorAll('[data-advertise-only]');
    const hostOnly = form.querySelectorAll('[data-host-only]');
    const messageLabel = form.querySelector('[data-message-label]');
    const packageSelect = form.querySelector('#package');

    function applyMode(mode) {
      if (inquiryHidden) inquiryHidden.value = mode;
      toggleBtns.forEach(b => {
        const isActive = b.dataset.inquiry === mode;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });
      advertiseOnly.forEach(el => { el.style.display = mode === 'advertise' ? '' : 'none'; });
      hostOnly.forEach(el => { el.style.display = mode === 'host' ? '' : 'none'; });
      if (messageLabel) {
        messageLabel.textContent = mode === 'host'
          ? 'Tell us about your space and customer foot traffic'
          : 'Tell us what you’re looking for';
      }
    }

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => applyMode(btn.dataset.inquiry));
    });

    // Read URL params: ?type=host|advertise and ?package=local-presence|lloyd-network|category-authority|city-takeover
    const params = new URLSearchParams(location.search);
    const typeParam = (params.get('type') || '').toLowerCase();
    const initialMode = typeParam === 'host' ? 'host' : 'advertise';
    applyMode(initialMode);

    const pkgParam = (params.get('package') || '').toLowerCase();
    if (pkgParam && packageSelect) {
      const opt = packageSelect.querySelector(`option[value="${pkgParam}"]`);
      if (opt) packageSelect.value = pkgParam;
    }

    // Locations picker
    const locToggle = form.querySelector('.form-locations-toggle');
    const locPanel = form.querySelector('.form-locations-panel');
    const locList = form.querySelector('.form-locations-list');
    const locSearch = form.querySelector('.form-locations-search');
    const locCounter = form.querySelector('.form-locations-counter');
    const locHidden = form.querySelector('#locations');

    if (locToggle && locPanel && locList && locHidden && Array.isArray(window.screenLocations)) {
      const selected = new Set();

      const initialLocs = (params.get('locations') || '').split(',').filter(Boolean);
      initialLocs.forEach(id => selected.add(String(id)));

      function updateCounter() {
        if (!locCounter) return;
        locCounter.textContent = selected.size > 0
          ? `(${selected.size} selected)`
          : '(optional)';
      }

      function updateHidden() {
        locHidden.value = Array.from(selected).join(',');
      }

      function renderList(filter) {
        const f = (filter || '').toLowerCase().trim();
        const rows = window.screenLocations
          .filter(loc => !f || loc.name.toLowerCase().includes(f) || (loc.address || '').toLowerCase().includes(f))
          .map(loc => {
            const id = String(loc.id);
            const checked = selected.has(id) ? 'checked' : '';
            const screensBadge = (loc.screens && loc.screens > 1)
              ? `<span class="form-locations-row-screens">${loc.screens} screens</span>` : '';
            return `<label class="form-locations-row">
              <input type="checkbox" value="${id}" ${checked}>
              <span class="form-locations-row-body">
                <span class="form-locations-row-name">${loc.name}${screensBadge}</span>
                <span class="form-locations-row-addr">${loc.address || ''}</span>
              </span>
            </label>`;
          }).join('');
        locList.innerHTML = rows || '<div class="form-locations-empty">No matches.</div>';
      }

      locToggle.addEventListener('click', () => {
        const expanded = locToggle.getAttribute('aria-expanded') === 'true';
        locToggle.setAttribute('aria-expanded', String(!expanded));
        if (expanded) {
          locPanel.setAttribute('hidden', '');
        } else {
          locPanel.removeAttribute('hidden');
          if (locSearch) locSearch.focus();
        }
      });

      locList.addEventListener('change', (e) => {
        const cb = e.target;
        if (!(cb instanceof HTMLInputElement) || cb.type !== 'checkbox') return;
        if (cb.checked) selected.add(cb.value);
        else selected.delete(cb.value);
        updateHidden();
        updateCounter();
      });

      if (locSearch) {
        locSearch.addEventListener('input', () => renderList(locSearch.value));
      }

      renderList('');
      updateHidden();
      updateCounter();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalLabel = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';
      }

      const payload = {
        _hp: form.querySelector('input[name="_hp"]')?.value || '',
        type: inquiryHidden?.value || 'advertise',
        name: form.querySelector('#name')?.value || '',
        business: form.querySelector('#business')?.value || '',
        email: form.querySelector('#email')?.value || '',
        phone: form.querySelector('#phone')?.value || '',
        package: packageSelect?.value || '',
        locations: locHidden?.value || '',
        venue: form.querySelector('#venue')?.value || '',
        address: form.querySelector('#address')?.value || '',
        message: form.querySelector('#message')?.value || '',
      };

      const endpoint = form.dataset.endpoint || '/submit';
      let ok = false;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        ok = res.ok && data.ok === true;
      } catch (err) {
        ok = false;
      }

      if (ok) {
        form.style.display = 'none';
        const success = document.querySelector('.form-success');
        if (success) success.classList.add('show');
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalLabel;
        }
        const errBox = form.querySelector('[data-form-error]');
        if (errBox) {
          errBox.textContent = "Couldn't send your message. Please try again or email info@reachscreens.ca directly.";
          errBox.style.display = 'block';
        } else {
          alert("Couldn't send your message. Please try again or email info@reachscreens.ca directly.");
        }
      }
    });
  }

  /* ---------- Timeline line draw ---------- */
  function initTimeline() {
    const line = document.querySelector('.timeline-line');
    const timeline = document.querySelector('.timeline');
    if (!line || !timeline) return;

    function update() {
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = rect.top;
      const end = rect.bottom;
      const total = rect.height;

      // Progress: 0 when timeline top hits 75% of viewport, 1 when bottom hits 25%
      const startAt = vh * 0.75;
      const endAt = vh * 0.25;
      const triggered = Math.max(0, Math.min(1, (startAt - start) / (total - (endAt - startAt) * -1)));
      const clamped = Math.max(0, Math.min(1, triggered));
      line.style.height = (clamped * 100) + '%';
    }
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Parallax (hero screen, subtle) ---------- */
  function initParallax() {
    if (prefersReduced) return;
    const el = document.querySelector('[data-parallax]');
    if (!el) return;
    const speed = parseFloat(el.dataset.parallax) || 0.15;
    let ticking = false;
    function update() {
      const y = window.scrollY;
      el.style.transform = `translateY(${-y * speed}px)`;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }
})();
