// ---- APLICAR ESTADOS DESDE CONFIG ----
const STATE_LABELS = {
  vigente:       { text: 'Vigente',          dot: true  },
  actualizacion: { text: 'En actualización', dot: false },
  desuso:        { text: 'Desuso',           dot: false }
};

(function applyConfig() {
  try {
    const cfg = JSON.parse(document.getElementById('promart-config').textContent);
    Object.entries(cfg.fichas || {}).forEach(([id, state]) => {
      const card = document.querySelector(`.store-card[data-id="${id}"]`);
      if (!card) return;
      const badge = card.querySelector('.status-badge');
      const info  = STATE_LABELS[state] || STATE_LABELS.vigente;
      badge.dataset.state = state;
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">${info.text}</span>`;
    });
  } catch(e) { console.warn('Config error:', e); }
})();

// ---- CHART TYPE TOGGLE ----
function setChart(type, btn) {
  document.getElementById('chart').dataset.type = type;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ---- METRIC TOGGLE ----
let currentMetric = 'm2';
function setMetric(metric, btn) {
  currentMetric = metric;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.bar-view .bar').forEach(bar => {
    bar.dataset.val = bar.dataset[metric === 'm2' ? 'm2' : metric === 'm3' ? 'm3' : 'racks'];
  });
}

// ---- TOGGLE ALL AREAS ----
function toggleAll(el) {
  const chips = el.parentNode.querySelectorAll('.multi-chip:not(:first-child)');
  const allOn = [...chips].every(c => c.classList.contains('selected'));
  chips.forEach(c => c.classList[allOn ? 'remove' : 'add']('selected'));
  el.classList[allOn ? 'remove' : 'add']('selected');
}

// ---- TOOLTIP ----
const tt = document.getElementById('tooltip');

function showTip(e, el) {
  const d = el.dataset;
  const metricVal = currentMetric === 'm2' ? d.m2 : currentMetric === 'm3' ? d.m3 : d.racks;
  tt.innerHTML = `
    <div class="tt-store">
      <span class="tt-dot" style="background:${d.color}"></span>${d.store}
    </div>
    <div class="tt-row"><span>Valor</span><strong>${metricVal}</strong></div>
    <div class="tt-row"><span>Área</span><strong>${d.area}</strong></div>
    <div class="tt-row"><span>Período</span><strong>${d.period}</strong></div>
    <div class="tt-row"><span>Tipología</span><strong>${d.tipo}</strong></div>`;
  tt.classList.add('show');
  moveTip(e);
}

function moveTip(e) {
  const w = tt.offsetWidth, h = tt.offsetHeight;
  let x = e.clientX + 16, y = e.clientY - 10;
  if (x + w > window.innerWidth - 16) x = e.clientX - w - 16;
  if (y + h > window.innerHeight - 16) y = window.innerHeight - h - 16;
  if (y < 8) y = 8;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

function hideTip() { tt.classList.remove('show'); }

// ---- ACUERDOS FILTER ----
function filterAcuerdos(cat, btn) {
  btn.closest('.cat-filter').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tl-item').forEach(item => {
    item.classList.toggle('hidden', cat !== 'all' && item.dataset.cat !== cat);
  });
}

// ---- AREA FILTER ----
function setArea(el) {
  el.closest('.area-filter').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ---- NAV SCROLLSPY ----
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}, { passive: true });
