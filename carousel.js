// Hero carousel — vanilla port.
// Reads a global `window.CAROUSEL_ITEMS` array of {title, image, credit?, meta?, accent?}
// Attaches to the first .stage element on the page.
(function(){
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const items = window.CAROUSEL_ITEMS || [];
  if (!items.length) return;

  const CARD_H = 0.264, CARD_AR = 0.75, GAP = 0.038;
  const WHEEL_THRESHOLD = 60, WHEEL_COOLDOWN = 420, AUTOPLAY_MS = 4500;

  let index = 0, boxW = 0, boxH = 0, dragging = false, paused = false;
  let fullH = 0, halfH = 0, cardW = 0, gap = 0, step = 0;
  let dragStartX = 0, dragStartTranslate = 0, dragLastX = 0, dragLastT = 0, dragVel = 0;
  let autoplayTimer = null;

  // Build DOM scaffold
  stage.innerHTML = `
    <div class="bg-wrap">
      <img class="bg-img" alt="" draggable="false">
      <div class="bg-tint-color"></div>
      <div class="bg-tint-mult"></div>
    </div>
    <div class="bg-wash"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <div class="carousel-topbar">
      <button type="button" class="btn-back" aria-label="Back">↖ Back</button>
      <div class="brandword">POINT</div>
      <button type="button" class="btn-menu" aria-label="Menu">Menu ☰</button>
    </div>
    <div class="headline">
      <div class="headline-row">
        <h2 class="title"></h2>
        <p class="credit"></p>
        <div class="meta"></div>
      </div>
    </div>
    <div class="strip-wrap"><div class="strip"></div></div>
    <div class="rail">
      <div class="rail-nums"><span class="num-cur">01</span><span class="num-tot">01</span></div>
      <div class="rail-bar"><div class="rail-fill"></div></div>
    </div>
  `;
  stage.tabIndex = 0;
  stage.setAttribute('role','group');
  stage.setAttribute('aria-roledescription','carousel');

  const bgImg = stage.querySelector('.bg-img');
  const bgColor = stage.querySelector('.bg-tint-color');
  const bgMult = stage.querySelector('.bg-tint-mult');
  const titleEl = stage.querySelector('.title');
  const creditEl = stage.querySelector('.credit');
  const metaEl = stage.querySelector('.meta');
  const strip = stage.querySelector('.strip');
  const railFill = stage.querySelector('.rail-fill');
  const railCur = stage.querySelector('.num-cur');
  const railTot = stage.querySelector('.num-tot');
  const btnBack = stage.querySelector('.btn-back');
  const btnMenu = stage.querySelector('.btn-menu');

  btnBack.addEventListener('click', () => history.back());
  btnMenu.addEventListener('click', () => { location.href = 'projects.html'; });

  // Build cards once
  items.forEach((item, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.setAttribute('aria-label', (item.title || '').replace(/\n/g,' '));
    card.innerHTML = `<img src="${item.image}" alt="" draggable="false"><span class="veil"></span>`;
    card.addEventListener('click', () => go(i));
    strip.appendChild(card);
  });
  const cards = Array.from(strip.querySelectorAll('.card'));
  railTot.textContent = String(items.length).padStart(2,'0');

  function measure(){
    const r = stage.getBoundingClientRect();
    boxW = r.width; boxH = r.height;
    fullH = Math.max(96, Math.min(360, boxH * CARD_H));
    halfH = fullH / 2;
    cardW = fullH * CARD_AR;
    gap = Math.max(4, Math.round(cardW * GAP));
    step = cardW + gap;
    stage.style.setProperty('--full', fullH + 'px');
    stage.style.setProperty('--half', halfH + 'px');
    stage.style.setProperty('--card-w', cardW + 'px');
    stage.style.setProperty('--gap', gap + 'px');
    render(true);
  }

  function xFor(i){ return boxW/2 - (i * step + cardW/2); }

  function render(instant){
    const item = items[index];
    if (!item) return;

    // Background graded tint
    const accent = item.accent || '#8a8a8a';
    bgColor.style.backgroundColor = accent;
    bgMult.style.backgroundColor = accent;
    if (bgImg.getAttribute('src') !== item.image){
      bgImg.classList.add('enter');
      bgImg.src = item.image;
      requestAnimationFrame(() => requestAnimationFrame(() => bgImg.classList.remove('enter')));
    }

    // Headline
    const lines = (item.title || '').split('\n');
    titleEl.classList.remove('in');
    titleEl.innerHTML = lines.map(l => `<span class="line"><span class="inner">${escapeHTML(l)}</span></span>`).join('');
    void titleEl.offsetWidth;
    titleEl.classList.add('in');

    creditEl.textContent = item.credit || '';
    creditEl.style.display = item.credit ? '' : 'none';
    metaEl.innerHTML = (item.meta || []).map(m => `<span>${escapeHTML(m)}</span>`).join('');

    // Cards: active class
    cards.forEach((c, i) => c.classList.toggle('active', i === index));

    // Rail
    railCur.textContent = String(index + 1).padStart(2,'0');
    const pct = (index / items.length) * 100;
    const width = 100 / items.length;
    railFill.style.width = width + '%';
    railFill.style.left = pct + '%';

    // Strip position
    const tx = xFor(index);
    if (instant){
      strip.style.transition = 'none';
      strip.style.transform = `translateX(${tx}px)`;
      void strip.offsetWidth;
      strip.style.transition = '';
    } else {
      strip.style.transform = `translateX(${tx}px)`;
    }
  }

  function go(next){
    const last = items.length - 1;
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === index) return;
    index = clamped;
    render(false);
    restartAutoplay();
  }

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Wheel / trackpad
  stage.addEventListener('wheel', (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const last = items.length - 1;
    const stuck = (dx > 0 && index === last) || (dx < 0 && index === 0);
    if (stuck) return;
    e.preventDefault();
    const now = e.timeStamp;
    if (now < (stage._wheelUntil || 0)) return;
    stage._wheelAcc = (stage._wheelAcc || 0) + dx;
    if (Math.abs(stage._wheelAcc) < WHEEL_THRESHOLD) return;
    go(index + Math.sign(stage._wheelAcc));
    stage._wheelAcc = 0;
    stage._wheelUntil = now + WHEEL_COOLDOWN;
  }, { passive: false });

  // Keyboard
  stage.addEventListener('keydown', (e) => {
    const map = { ArrowLeft: index-1, ArrowRight: index+1, Home: 0, End: items.length-1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key]);
  });

  // Drag
  function onPointerDown(e){
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    strip.classList.add('dragging');
    stage.setPointerCapture?.(e.pointerId);
    dragStartX = e.clientX;
    const m = /translateX\(([-\d.]+)px\)/.exec(strip.style.transform || '');
    dragStartTranslate = m ? parseFloat(m[1]) : xFor(index);
    dragLastX = e.clientX;
    dragLastT = e.timeStamp;
    dragVel = 0;
  }
  function onPointerMove(e){
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    strip.style.transform = `translateX(${dragStartTranslate + dx}px)`;
    const now = e.timeStamp;
    const dt = Math.max(1, now - dragLastT);
    dragVel = (e.clientX - dragLastX) / dt * 1000;
    dragLastX = e.clientX; dragLastT = now;
  }
  function onPointerUp(){
    if (!dragging) return;
    dragging = false;
    strip.classList.remove('dragging');
    const m = /translateX\(([-\d.]+)px\)/.exec(strip.style.transform || '');
    const cur = m ? parseFloat(m[1]) : xFor(index);
    const thrown = cur + dragVel * 0.12;
    const nearest = Math.round((boxW/2 - thrown - cardW/2) / step);
    index = Math.max(0, Math.min(items.length-1, nearest));
    render(false);
    restartAutoplay();
  }
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Pause on hover / focus
  const pause = () => { paused = true; stopAutoplay(); };
  const resume = () => { paused = false; restartAutoplay(); };
  stage.addEventListener('pointerenter', pause);
  stage.addEventListener('pointerleave', resume);
  stage.addEventListener('focus', pause);
  stage.addEventListener('blur', resume);

  function startAutoplay(){
    if (items.length < 2) return;
    stopAutoplay();
    autoplayTimer = setTimeout(() => {
      if (paused || dragging) return;
      const next = index === items.length - 1 ? 0 : index + 1;
      index = next;
      render(false);
      startAutoplay();
    }, AUTOPLAY_MS);
  }
  function stopAutoplay(){ if (autoplayTimer){ clearTimeout(autoplayTimer); autoplayTimer = null; } }
  function restartAutoplay(){ if (!paused) startAutoplay(); }

  // ResizeObserver
  new ResizeObserver(measure).observe(stage);
  measure();
  startAutoplay();
})();
