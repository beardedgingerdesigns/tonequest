/**
 * THE TONEQUEST REPORT — main.js
 * Vanilla JS — no dependencies
 */

(function () {
  'use strict';

  /* ========================================================================
     Pricing Data
     ======================================================================== */
  const PRICES = {
    us: {
      print:   { 1: 99,  2: 178, 3: 252 },
      digital: { 1: 89,  2: 160, 3: 227 },
      bundle:  { 1: 119, 2: 214, 3: 303 },
    },
    canada: {
      print:   { 1: 159, 2: 286, 3: 405 },
      digital: { 1: 89,  2: 160, 3: 227 },
      bundle:  { 1: 179, 2: 322, 3: 457 },
    },
    international: {
      print:   { 1: 179, 2: 322, 3: 457 },
      digital: { 1: 89,  2: 160, 3: 227 },
      bundle:  { 1: 199, 2: 358, 3: 509 },
    },
  };

  /* ========================================================================
     Utility helpers
     ======================================================================== */
  function qs(selector, context) {
    return (context || document).querySelector(selector);
  }

  function qsa(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  function on(el, event, handler, options) {
    if (el) el.addEventListener(event, handler, options);
  }

  /* ========================================================================
     1. Sticky Header — .scrolled class after 80px
     ======================================================================== */
  (function initStickyHeader() {
    const header = qs('.site-header');
    if (!header) return;

    function update() {
      if (window.scrollY > 80) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    on(window, 'scroll', update, { passive: true });
    update(); // run on load in case page is pre-scrolled
  })();

  /* ========================================================================
     2. Dropdown Menus
     Desktop: hover to open; Keyboard: Escape closes, arrows navigate
     ======================================================================== */
  (function initDropdowns() {
    const items = qsa('.site-nav__item[data-dropdown]');
    if (!items.length) return;

    let openItem = null;

    function openDropdown(item) {
      if (openItem && openItem !== item) closeDropdown(openItem);
      item.classList.add('is-open');
      const trigger = qs('.site-nav__link', item);
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      openItem = item;
    }

    function closeDropdown(item) {
      item.classList.remove('is-open');
      const trigger = qs('.site-nav__link', item);
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (openItem === item) openItem = null;
    }

    function closeAll() {
      items.forEach(closeDropdown);
    }

    items.forEach(function (item) {
      const trigger = qs('.site-nav__link', item);
      const dropdown = qs('.nav-dropdown', item);
      if (!dropdown) return;

      // Set initial aria state
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      // Hover open (desktop)
      on(item, 'mouseenter', function () {
        openDropdown(item);
      });

      on(item, 'mouseleave', function () {
        closeDropdown(item);
      });

      // Click toggle (touch / keyboard)
      on(trigger, 'click', function (e) {
        e.preventDefault();
        if (item.classList.contains('is-open')) {
          closeDropdown(item);
        } else {
          openDropdown(item);
        }
      });

      // Keyboard navigation within dropdown
      on(item, 'keydown', function (e) {
        const links = qsa('.nav-dropdown__link', dropdown);
        const focused = document.activeElement;
        const currentIndex = links.indexOf(focused);

        if (e.key === 'Escape') {
          closeDropdown(item);
          if (trigger) trigger.focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentIndex < 0) {
            if (links[0]) links[0].focus();
          } else if (links[currentIndex + 1]) {
            links[currentIndex + 1].focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentIndex > 0 && links[currentIndex - 1]) {
            links[currentIndex - 1].focus();
          } else {
            if (trigger) trigger.focus();
          }
        } else if (e.key === 'Tab') {
          // Close when tabbing out
          requestAnimationFrame(function () {
            if (!item.contains(document.activeElement)) {
              closeDropdown(item);
            }
          });
        }
      });
    });

    // Close when clicking outside
    on(document, 'click', function (e) {
      if (!e.target.closest('.site-nav__item[data-dropdown]')) {
        closeAll();
      }
    });
  })();

  /* ========================================================================
     3. Mobile Nav Drawer
     ======================================================================== */
  (function initMobileNav() {
    const hamburger = qs('.hamburger-btn');
    const drawer = qs('.mobile-nav-drawer');
    const overlay = qs('.mobile-nav-overlay');
    const closeBtn = qs('.mobile-nav-drawer__close');
    const body = document.body;

    if (!hamburger || !drawer) return;

    function openNav() {
      hamburger.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      body.style.overflow = 'hidden';
      // Move focus into drawer
      const firstLink = qs('a, button', drawer);
      if (firstLink) firstLink.focus();
    }

    function closeNav() {
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      body.style.overflow = '';
      hamburger.focus();
    }

    on(hamburger, 'click', function () {
      if (drawer.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    on(closeBtn, 'click', closeNav);
    on(overlay, 'click', closeNav);

    // Escape key closes
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeNav();
      }
    });

    // Set initial aria state
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', 'mobile-nav-drawer');
  })();

  /* ========================================================================
     4 & 5. Subscribers Page — Region Tabs + Term Selector + Price Updates
     ======================================================================== */
  (function initSubscribePage() {
    const regionTabs = qsa('.region-tab');
    const termRadios = qsa('.term-radio input[name="term"]');
    const regionPanels = qsa('.subscribers-page__region-panel');

    if (!regionTabs.length && !termRadios.length) return;

    let activeRegion = 'us';
    let activeTerm = 1;

    // Find active region from DOM state
    regionTabs.forEach(function (tab) {
      if (tab.classList.contains('is-active')) {
        activeRegion = tab.dataset.region || 'us';
      }
    });

    // Find active term from DOM state
    termRadios.forEach(function (radio) {
      if (radio.checked) {
        activeTerm = parseInt(radio.value) || 1;
      }
    });

    function updatePrices() {
      const regionData = PRICES[activeRegion];
      if (!regionData) return;

      // Update each pricing card's displayed amount
      qsa('[data-plan]').forEach(function (card) {
        const plan = card.dataset.plan; // 'print', 'digital', 'bundle'
        if (!regionData[plan]) return;

        const price = regionData[plan][activeTerm];
        const amountEl = qs('.pricing-card__amount', card);
        if (amountEl) amountEl.textContent = price;
      });
    }

    // Region tab switching
    regionTabs.forEach(function (tab) {
      on(tab, 'click', function () {
        regionTabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        activeRegion = tab.dataset.region || 'us';

        // Show/hide panels
        const targetPanel = tab.dataset.panel;
        regionPanels.forEach(function (panel) {
          if (panel.id === targetPanel || panel.dataset.region === activeRegion) {
            panel.classList.add('is-active');
          } else {
            panel.classList.remove('is-active');
          }
        });

        updatePrices();
      });

      on(tab, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tab.click();
        }
      });
    });

    // Term selector
    termRadios.forEach(function (radio) {
      on(radio, 'change', function () {
        activeTerm = parseInt(radio.value) || 1;
        updatePrices();
      });
    });

    // Initial price render
    updatePrices();
  })();

  /* ========================================================================
     6. FAQ Accordion
     One open at a time; smooth height animation; aria-expanded
     ======================================================================== */
  (function initAccordion() {
    const accordions = qsa('.accordion');

    accordions.forEach(function (accordion) {
      const items = qsa('.accordion__item', accordion);

      items.forEach(function (item) {
        const trigger = qs('.accordion__trigger', item);
        const body = qs('.accordion__body', item);

        if (!trigger || !body) return;

        // Set initial state
        trigger.setAttribute('aria-expanded', 'false');

        on(trigger, 'click', function () {
          const isOpen = body.classList.contains('is-open');

          // Close all other items in this accordion
          items.forEach(function (otherItem) {
            if (otherItem !== item) {
              const otherTrigger = qs('.accordion__trigger', otherItem);
              const otherBody = qs('.accordion__body', otherItem);
              if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
              if (otherBody) otherBody.classList.remove('is-open');
            }
          });

          // Toggle current item
          if (isOpen) {
            trigger.setAttribute('aria-expanded', 'false');
            body.classList.remove('is-open');
          } else {
            trigger.setAttribute('aria-expanded', 'true');
            body.classList.add('is-open');
          }
        });

        on(trigger, 'keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            trigger.click();
          }
        });
      });
    });
  })();

  /* ========================================================================
     7. Announcement Bar Close — sessionStorage preference
     ======================================================================== */
  (function initAnnouncementBar() {
    const bar = qs('.announcement-bar');
    const closeBtn = qs('.announcement-bar__close');

    if (!bar) return;

    // Check if user previously dismissed
    if (sessionStorage.getItem('tqr-announcement-dismissed') === 'true') {
      bar.classList.add('is-hidden');
      return;
    }

    on(closeBtn, 'click', function () {
      bar.classList.add('is-hidden');
      sessionStorage.setItem('tqr-announcement-dismissed', 'true');
    });
  })();

  /* ========================================================================
     8. Smooth Scroll — all a[href^="#"] links
     ======================================================================== */
  (function initSmoothScroll() {
    on(document, 'click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '72'
      );

      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top: top, behavior: 'smooth' });

      // Update focus for accessibility
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  })();

  /* ========================================================================
     9. Active Nav State — matches current page URL
     ======================================================================== */
  (function initActiveNav() {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

    // Desktop nav links
    qsa('.site-nav__link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.replace(/\/$/, '') || '/';

      if (
        linkPath === currentPath ||
        (linkPath !== '/' && currentPath.startsWith(linkPath))
      ) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Mobile nav links
    qsa('.mobile-nav__link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.replace(/\/$/, '') || '/';

      if (
        linkPath === currentPath ||
        (linkPath !== '/' && currentPath.startsWith(linkPath))
      ) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Account nav links
    qsa('.account-nav__link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.replace(/\/$/, '') || '/';

      if (linkPath === currentPath) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ========================================================================
     Tabs component (region tabs are handled separately above)
     General-purpose .tabs component
     ======================================================================== */
  (function initTabs() {
    const tabContainers = qsa('.tabs');

    tabContainers.forEach(function (container) {
      const tabs = qsa('.tabs__tab', container);
      const panels = qsa('.tabs__panel', container);

      if (!tabs.length || !panels.length) return;

      // Set initial aria attributes
      tabs.forEach(function (tab, i) {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('is-active') ? 'true' : 'false');
        const panelId = tab.dataset.panel || ('panel-' + i);
        tab.setAttribute('aria-controls', panelId);
      });

      panels.forEach(function (panel, i) {
        panel.setAttribute('role', 'tabpanel');
        panel.id = panel.id || ('panel-' + i);
      });

      tabs.forEach(function (tab) {
        on(tab, 'click', function () {
          const targetPanel = tab.dataset.panel;

          tabs.forEach(function (t) {
            t.classList.remove('is-active');
            t.setAttribute('aria-selected', 'false');
          });

          panels.forEach(function (panel) {
            if (panel.id === targetPanel || panel.dataset.tab === tab.dataset.panel) {
              panel.classList.add('is-active');
            } else {
              panel.classList.remove('is-active');
            }
          });

          tab.classList.add('is-active');
          tab.setAttribute('aria-selected', 'true');
        });

        on(tab, 'keydown', function (e) {
          const currentIndex = tabs.indexOf(tab);
          if (e.key === 'ArrowRight' && tabs[currentIndex + 1]) {
            tabs[currentIndex + 1].click();
            tabs[currentIndex + 1].focus();
          } else if (e.key === 'ArrowLeft' && tabs[currentIndex - 1]) {
            tabs[currentIndex - 1].click();
            tabs[currentIndex - 1].focus();
          }
        });
      });
    });
  })();

})();
