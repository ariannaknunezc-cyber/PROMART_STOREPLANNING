// ---- CONFIG DE ESTADOS ----
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

// ---- CHART TYPE ----
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
    bar.dataset.val = bar.dataset[metric === 'racks' ? 'racks' : metric];
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
    <div class="tt-store"><span class="tt-dot" style="background:${d.color}"></span>${d.store}</div>
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

// ---- SCROLLSPY ----
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}, { passive: true });

// ================================================================
//  PALETA DE COLORES DEL GRÁFICO
// ================================================================
const CHART_COLORS = [
  '#F47920','#10B981','#8B5CF6','#3B82F6','#EF4444',
  '#F59E0B','#06B6D4','#EC4899','#84CC16','#6366F1'
];

const COUNTRY_FLAGS = { 'Perú':'🇵🇪', 'Chile':'🇨🇱', 'Colombia':'🇨🇴', 'Bolivia':'🇧🇴' };

// ================================================================
//  DATOS GLOBALES
// ================================================================
let allStoreData = [];

// ================================================================
//  DESCARGA DE PLANTILLA CSV
// ================================================================
function downloadTemplate() {
  const csv = [
    'Tienda,País,Tipología,Área,Período,Venta_m2,Venta_m3,N_Racks',
    'Lima Norte,Perú,Tienda Alta,Ferretería · Construcción · Hogar,Q1 2026,845,312,48',
    'Arequipa,Perú,Tienda Baja,Ferretería · Construcción · Hogar,Q1 2026,1200,445,62',
    'Trujillo,Perú,Tienda Alta,Ferretería · Construcción · Hogar,Q1 2026,980,362,54',
    'Cusco,Perú,Tienda Baja,Ferretería · Construcción · Hogar,Q1 2026,1500,556,78',
    'Chiclayo,Perú,Tienda Alta,Ferretería · Construcción · Hogar,Q1 2026,920,341,51',
    'Piura,Perú,Tienda Baja,Ferretería · Construcción · Hogar,Q1 2026,760,280,40',
    'Santiago Centro,Chile,Tienda Alta,Ferretería · Construcción · Hogar,Q1 2026,1100,410,60',
    'Providencia,Chile,Tienda Baja,Ferretería · Construcción · Hogar,Q1 2026,950,350,52',
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'Plantilla_StorePlanning.csv' });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ================================================================
//  CARGA DE ARCHIVO
// ================================================================
function handleFileInput(input) {
  if (input.files[0]) handleFile(input.files[0]);
}

function handleFile(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const zone = document.getElementById('upload-zone');

  const onData = rows => {
    allStoreData = rows;
    populateCountries();
    setZoneLoaded(zone, file.name);
  };

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => onData(parseCSV(e.target.result.replace(/^﻿/, '')));
    reader.readAsText(file, 'UTF-8');
  } else {
    if (typeof XLSX === 'undefined') {
      alert('La librería Excel aún se está cargando. Espera un momento e intenta de nuevo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      onData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
    };
    reader.readAsArrayBuffer(file);
  }
}

function parseCSV(text) {
  const lines   = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',');
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

function setZoneLoaded(zone, filename) {
  zone.classList.add('loaded');
  zone.querySelector('h4').textContent = 'Archivo cargado correctamente';
  zone.querySelector('p').textContent  = filename + ' · Gráfico actualizado';
}

// ================================================================
//  SELECTOR DE PAÍS
// ================================================================
function populateCountries() {
  const countries = [...new Set(allStoreData.map(r => r['País'] || 'Perú'))];
  const sel = document.getElementById('country-sel');
  sel.innerHTML = countries
    .map(c => `<option value="${c}">${COUNTRY_FLAGS[c] || '🏳'} ${c}</option>`)
    .join('');
  filterByCountry(countries[0]);
}

function filterByCountry(country) {
  const stores = allStoreData.filter(r => (r['País'] || 'Perú') === country);
  updateStoreChips(stores);
  refreshChart();
}

// ================================================================
//  CHIPS DE TIENDAS
// ================================================================
function updateStoreChips(stores) {
  const label    = document.getElementById('stores-label');
  const chipWrap = document.getElementById('store-chips');
  if (!chipWrap) return;

  chipWrap.innerHTML = stores.map((r, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    return `<span class="multi-chip selected"
      style="--chip-color:${color}"
      data-tienda="${r.Tienda}"
      onclick="this.classList.toggle('selected');refreshChart()">
      <span class="chip-dot" style="background:${color}"></span>${r.Tienda}
    </span>`;
  }).join('') + `<span class="multi-chip more" onclick="selectAllStores(this)">Seleccionar todas</span>`;

  if (label) label.textContent = `Tiendas · ${stores.length} disponibles`;
}

function selectAllStores(btn) {
  const chips = document.querySelectorAll('#store-chips .multi-chip[data-tienda]');
  const allOn = [...chips].every(c => c.classList.contains('selected'));
  chips.forEach(c => c.classList[allOn ? 'remove' : 'add']('selected'));
  refreshChart();
}

// ================================================================
//  REFRESH CHART SEGÚN SELECCIÓN ACTUAL
// ================================================================
function refreshChart() {
  if (!allStoreData.length) return;

  const country  = (document.getElementById('country-sel') || {}).value || 'Perú';
  const selected = [...document.querySelectorAll('#store-chips .multi-chip[data-tienda].selected')]
                    .map(c => c.dataset.tienda);

  const filtered = allStoreData.filter(r =>
    (r['País'] || 'Perú') === country && selected.includes(r.Tienda)
  );

  if (filtered.length) updateChart(filtered, 'datos filtrados');
}

// ================================================================
//  ACTUALIZAR GRÁFICO
// ================================================================
function updateChart(rows, filename) {
  if (!rows.length) return;

  const maxM2 = Math.max(...rows.map(r => parseFloat(r.Venta_m2) || 0));
  const area  = rows[0]['Área']    || 'Todas las áreas';
  const per   = rows[0]['Período'] || 'Período importado';

  document.querySelector('.chart-head h4').textContent   = `Venta por m² · ${area} · ${per}`;
  document.querySelector('.chart-head small').textContent = `${rows.length} tiendas · ${filename} · Pasa el mouse sobre cada elemento para ver detalle`;

  // -- BARRAS --
  document.querySelector('.bar-view').innerHTML = rows.map((r, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const m2    = parseFloat(r.Venta_m2) || 0;
    const m3    = parseFloat(r.Venta_m3) || 0;
    const racks = parseFloat(r.N_Racks)  || 0;
    const pct   = maxM2 > 0 ? Math.max(4, Math.round((m2 / maxM2) * 92)) : 4;
    return `<div class="bar" style="--bar-c:${color};height:${pct}%"
      data-val="S/ ${m2.toLocaleString('es-PE')}" data-label="${r.Tienda}"
      data-store="${r.Tienda}" data-color="${color}"
      data-m2="S/ ${m2.toLocaleString('es-PE')}/m²"
      data-m3="S/ ${m3.toLocaleString('es-PE')}/m³"
      data-racks="${racks} racks"
      data-area="${r['Área'] || ''}" data-period="${r['Período'] || ''}" data-tipo="${r['Tipología'] || ''}"
      onmouseenter="showTip(event,this)" onmousemove="moveTip(event)" onmouseleave="hideTip()"></div>`;
  }).join('');

  // -- LÍNEAS --
  const n     = rows.length;
  const xStep = n > 1 ? 480 / (n - 1) : 0;
  const pts   = rows.map((r, i) => {
    const m2    = parseFloat(r.Venta_m2) || 0;
    const m3    = parseFloat(r.Venta_m3) || 0;
    const racks = parseFloat(r.N_Racks)  || 0;
    return {
      x: n === 1 ? 300 : Math.round(60 + i * xStep),
      y: maxM2 > 0 ? Math.round(220 - (m2 / maxM2) * 180) : 220,
      m2, m3, racks,
      color: CHART_COLORS[i % CHART_COLORS.length],
      Tienda: r.Tienda, Área: r['Área'] || '', Período: r['Período'] || '', Tipología: r['Tipología'] || ''
    };
  });

  const areaPath = `M${pts[0].x} ${pts[0].y}` + pts.slice(1).map(p => ` L${p.x} ${p.y}`).join('')
                 + ` L${pts[n-1].x} 220 L${pts[0].x} 220Z`;

  document.querySelector('.line-view svg').innerHTML = `
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#64748B" stop-opacity=".15"/>
      <stop offset="1" stop-color="#64748B" stop-opacity="0"/>
    </linearGradient></defs>
    <g stroke="#ECEAE5" stroke-width="1" stroke-dasharray="3 4">
      <line x1="20" y1="40" x2="580" y2="40"/><line x1="20" y1="100" x2="580" y2="100"/>
      <line x1="20" y1="160" x2="580" y2="160"/><line x1="20" y1="220" x2="580" y2="220"/>
    </g>
    <path d="${areaPath}" fill="url(#lg)"/>
    <polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#94A3B8"
      stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="4 3"/>
    ${pts.map(p => `<circle class="line-dot" cx="${p.x}" cy="${p.y}" r="7"
      fill="#fff" stroke="${p.color}" stroke-width="3"
      data-store="${p.Tienda}" data-color="${p.color}"
      data-m2="S/ ${p.m2.toLocaleString('es-PE')}/m²"
      data-m3="S/ ${p.m3.toLocaleString('es-PE')}/m³"
      data-racks="${p.racks} racks"
      data-area="${p.Área}" data-period="${p.Período}" data-tipo="${p.Tipología}"
      onmouseenter="showTip(event,this)" onmousemove="moveTip(event)" onmouseleave="hideTip()"/>`).join('')}
    <g font-family="Inter,sans-serif" font-size="11" font-weight="700" text-anchor="middle">
      ${pts.map(p=>`<text x="${p.x}" y="${p.y-14}" fill="${p.color}">${p.m2.toLocaleString('es-PE')}</text>`).join('')}
    </g>
    <g font-family="Inter,sans-serif" font-size="11" fill="#7A7A82" text-anchor="middle">
      ${pts.map(p=>`<text x="${p.x}" y="252">${p.Tienda}</text>`).join('')}
    </g>`;

  // -- LEYENDA --
  document.querySelector('.chart-legend').innerHTML = rows.map((r, i) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${CHART_COLORS[i%CHART_COLORS.length]}"></div>
      ${r.Tienda}
    </div>`).join('');
}

// ================================================================
//  DRAG & DROP
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
});
