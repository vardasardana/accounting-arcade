// HTML overlay that sits exactly over the 1280x720 canvas (crisp text, real buttons, screen-reader friendly).
let root = null, game = null, live = null;

export const UI = {
  init(g) {
    game = g;
    root = document.getElementById('ui');
    live = document.getElementById('live');
    const fit = () => {
      const c = game.canvas; if (!c) return;
      let r = c.getBoundingClientRect();
      if (r.right > window.innerWidth + 2 || r.bottom > window.innerHeight + 2 || (Math.abs(r.width - window.innerWidth) > 2 && Math.abs(r.height - window.innerHeight) > 2)) { game.scale.refresh(); r = c.getBoundingClientRect(); }
      const s = r.width / 1280;
      root.style.left = r.left + window.scrollX + 'px';
      root.style.top = r.top + window.scrollY + 'px';
      root.style.transform = `scale(${s})`;
    };
    game.scale.on('resize', fit); window.addEventListener('resize', () => setTimeout(fit, 50));
    setTimeout(fit, 0); setInterval(fit, 500);
    game.events.once('ready', () => { fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(game.canvas); });
    this.fit = fit;
  },
  get root() { return root; },
  clear() { root.innerHTML = ''; },
  add(html, cls = '') {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    root.appendChild(d);
    if (this.fit) this.fit();
    return d;
  },
  announce(text) { if (live) { live.textContent = ''; setTimeout(() => (live.textContent = text), 30); } },
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (el, sel) => el.querySelector(sel);
export const $$ = (el, sel) => [...el.querySelectorAll(sel)];
