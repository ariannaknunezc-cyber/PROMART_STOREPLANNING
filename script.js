// ================================================================
//  CONFIG DE ESTADOS (fichas §01)
// ================================================================
const STATE_LABELS = {
  vigente:       { text: 'Vigente',          dot: true  },
  actualizacion: { text: 'En actualización', dot: false },
  desuso:        { text: 'Desuso',           dot: false }
};
(function applyConfig() {
  try {
    const cfg = JSON.parse(document.getElementById('promart-config').textContent);
    Object.entries(cfg.fichas || {}).forEach(([id, state]) => {
      const card  = document.querySelector(`.store-card[data-id="${id}"]`);
      if (!card) return;
      const badge = card.querySelector('.status-badge');
      const info  = STATE_LABELS[state] || STATE_LABELS.vigente;
      badge.dataset.state = state;
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">${info.text}</span>`;
    });
  } catch(e) { console.warn('Config error:', e); }
})();

// ================================================================
//  TIPO DE GRÁFICO
// ================================================================
function setChart(type, btn) {
  document.getElementById('chart').dataset.type = type;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  refreshChart();
}

// ================================================================
//  MÉTRICA
// ================================================================
let currentMetric = 'm2';
function setMetric(metric, btn) {
  currentMetric = metric;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  refreshChart();
}

// ================================================================
//  TOOLTIP
// ================================================================
const tt = document.getElementById('tooltip');

function showTip(e, el) {
  const d = el.dataset;
  tt.innerHTML = `
    <div class="tt-store"><span class="tt-dot" style="background:${d.color}"></span>${d.store}</div>
    <div class="tt-row"><span>m²</span><strong>${d.m2}</strong></div>
    <div class="tt-row"><span>m³</span><strong>${d.m3}</strong></div>
    <div class="tt-row"><span>Racks</span><strong>${d.racks}</strong></div>`;
  tt.classList.add('show');
  moveTip(e);
}

function showLineTip(e, el) {
  const d      = el.dataset;
  const suffix = currentMetric === 'm2' ? ' m²' : currentMetric === 'm3' ? ' m³' : ' racks';
  const val    = parseFloat(d.val);
  tt.innerHTML = `
    <div class="tt-store"><span class="tt-dot" style="background:${d.color}"></span>${d.store}</div>
    <div class="tt-row"><span>${d.area}</span><strong>${isNaN(val) ? '—' : val.toLocaleString('es-PE') + suffix}</strong></div>`;
  tt.classList.add('show');
  moveTip(e);
}

function moveTip(e) {
  const w = tt.offsetWidth, h = tt.offsetHeight;
  let x = e.clientX + 16, y = e.clientY - 10;
  if (x + w > window.innerWidth  - 16) x = e.clientX - w - 16;
  if (y + h > window.innerHeight - 16) y = window.innerHeight - h - 16;
  if (y < 8) y = 8;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}
function hideTip() { tt.classList.remove('show'); }

// ================================================================
//  SCROLLSPY
// ================================================================
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}, { passive: true });

// ================================================================
//  CONSTANTES
// ================================================================
const COUNTRY_FLAGS = {
  'PERÚ':'🇵🇪','Perú':'🇵🇪','Peru':'🇵🇪','PERU':'🇵🇪',
  'Ecuador':'🇪🇨','ECUADOR':'🇪🇨',
  'Chile':'🇨🇱','CHILE':'🇨🇱',
  'Colombia':'🇨🇴','COLOMBIA':'🇨🇴',
  'Bolivia':'🇧🇴','BOLIVIA':'🇧🇴'
};

// ================================================================
//  DATOS GLOBALES
// ================================================================
let allRows      = [];
let tiendaColors = {};   // { 'TIENDA': '#color' }
let areaOrder    = [];   // áreas en orden de aparición en el Excel

// ================================================================
//  COLORES — distribuidos uniformemente, arrancando en naranja
// ================================================================
function assignStoreColors(stores) {
  tiendaColors = {};
  const n = stores.length;
  stores.forEach((t, i) => {
    const hue = Math.round((25 + i * 360 / Math.max(n, 1)) % 360);
    const sat  = 68 + (i % 3) * 4;
    const lit  = 47 + (i % 2) * 8;
    tiendaColors[t] = `hsl(${hue},${sat}%,${lit}%)`;
  });
}

// ================================================================
//  HELPER — escape XML attribute
// ================================================================
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ================================================================
//  DESCARGA DE PLANTILLA EXCEL
// ================================================================
function downloadTemplate() {
  const a = Object.assign(document.createElement('a'), {
    href: 'PLANTILLA_ANALISIS.xlsx',
    download: 'PLANTILLA_ANALISIS.xlsx'
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
    allRows = rows;
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
  const countries = [...new Set(allRows.map(r => r.Pais || r['País'] || ''))].filter(Boolean);
  const sel = document.getElementById('country-sel');
  if (sel) {
    sel.innerHTML = countries
      .map(c => `<option value="${c}">${COUNTRY_FLAGS[c] || '🏳'} ${c}</option>`)
      .join('');
  }
  if (countries[0]) filterByCountry(countries[0]);
}

function filterByCountry(country) {
  const countryRows = allRows.filter(r => (r.Pais || r['País'] || '') === country);
  const stores = [...new Set(countryRows.map(r => r.Tienda))].sort();

  // Preserve area order from Excel (first-occurrence)
  const areasSeen = new Set();
  countryRows.forEach(r => {
    const a = r.Area_Comercial || r['Área'] || '';
    if (a) areasSeen.add(a);
  });
  areaOrder = [...areasSeen];

  assignStoreColors(stores);
  updateStoreChips(stores);
  populateAreas(areaOrder);
  refreshChart();
}

// ================================================================
//  CHIPS DE TIENDAS
// ================================================================
function updateStoreChips(stores) {
  const label = document.getElementById('stores-label');
  const wrap  = document.getElementById('store-chips');
  if (!wrap) return;

  wrap.innerHTML = stores.map(t => {
    const color = tiendaColors[t] || '#F47920';
    return `<span class="multi-chip selected" data-tienda="${esc(t)}"
      onclick="this.classList.toggle('selected');refreshChart()"
      style="border-left:3px solid ${color};padding-left:10px">${t}</span>`;
  }).join('') +
  `<span class="multi-chip more" onclick="selectAllStores(this)">Seleccionar todas</span>`;

  if (label) label.textContent = `Tiendas · ${stores.length} disponibles · todas seleccionadas`;
}

function selectAllStores(btn) {
  const chips = document.querySelectorAll('#store-chips .multi-chip[data-tienda]');
  const allOn = [...chips].every(c => c.classList.contains('selected'));
  chips.forEach(c => c.classList[allOn ? 'remove' : 'add']('selected'));
  refreshChart();
}

// ================================================================
//  CHIPS DE ÁREAS COMERCIALES
// ================================================================
function populateAreas(areas) {
  const label = document.getElementById('areas-label');
  const wrap  = document.getElementById('area-chips');
  if (!wrap) return;

  wrap.innerHTML =
    `<span class="multi-chip active" onclick="selectAllAreas(this)">Todas</span>` +
    areas.map(a =>
      `<span class="multi-chip" data-area="${esc(a)}" onclick="toggleAreaChip(this)">${a}</span>`
    ).join('');

  if (label) label.textContent = `Áreas comerciales · ${areas.length} disponibles`;
}

function selectAllAreas(btn) {
  document.querySelectorAll('#area-chips .multi-chip[data-area]').forEach(c => c.classList.remove('selected'));
  btn.classList.add('active');
  refreshChart();
}

function toggleAreaChip(el) {
  el.classList.toggle('selected');
  const todasBtn = document.querySelector('#area-chips .multi-chip:first-child');
  const anyOn    = document.querySelectorAll('#area-chips .multi-chip[data-area].selected').length > 0;
  if (todasBtn) todasBtn.classList.toggle('active', !anyOn);
  refreshChart();
}

// ================================================================
//  HELPERS MATEMÁTICOS
// ================================================================
function niceMax(val) {
  if (val <= 0) return 100;
  const mag  = Math.pow(10, Math.floor(Math.log10(val)));
  const norm = val / mag;
  let nice;
  if      (norm <= 1)   nice = 1;
  else if (norm <= 1.5) nice = 1.5;
  else if (norm <= 2)   nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 3)   nice = 3;
  else if (norm <= 4)   nice = 4;
  else if (norm <= 5)   nice = 5;
  else if (norm <= 6)   nice = 6;
  else if (norm <= 7)   nice = 7;
  else if (norm <= 8)   nice = 8;
  else if (norm <= 9)   nice = 9;
  else                  nice = 10;
  return nice * mag;
}

// Catmull-Rom → Cubic Bézier (smooth lines)
function catmullRomPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

// ================================================================
//  REFRESH — decide qué gráfico renderizar
// ================================================================
function refreshChart() {
  if (!allRows.length) return;

  const country         = document.getElementById('country-sel')?.value || '';
  const selectedTiendas = [...document.querySelectorAll('#store-chips .multi-chip[data-tienda].selected')]
                            .map(c => c.dataset.tienda);
  const todasAreas      = document.querySelector('#area-chips .multi-chip:first-child')?.classList.contains('active') ?? true;
  const selectedAreas   = todasAreas ? null :
    [...document.querySelectorAll('#area-chips .multi-chip[data-area].selected')].map(c => c.dataset.area);

  const chartType = document.getElementById('chart')?.dataset.type || 'line';
  const metricKey = currentMetric === 'racks' ? 'N_RACKS' : currentMetric;
  const areas     = selectedAreas || areaOrder;

  if (chartType === 'line') {
    // Serie por tienda: valor en cada área
    const tiendaSeries = selectedTiendas.map(tienda => {
      const values = {};
      allRows.filter(r => {
        const pais = r.Pais || r['País'] || '';
        const area = r.Area_Comercial || r['Área'] || '';
        return r.Tienda === tienda
            && (!country || pais === country)
            && areas.includes(area);
      }).forEach(r => {
        const area = r.Area_Comercial || r['Área'] || '';
        values[area] = (values[area] || 0) + (parseFloat(r[metricKey]) || 0);
      });
      return { tienda, color: tiendaColors[tienda] || '#F47920', values };
    }).filter(s => Object.keys(s.values).length > 0);

    if (tiendaSeries.length) renderMultiSeriesLine(areas, tiendaSeries, country);

  } else {
    // Barras: agregar por tienda
    const filtered = allRows.filter(r => {
      const pais   = r.Pais || r['País'] || '';
      const tienda = r.Tienda || '';
      const area   = r.Area_Comercial || r['Área'] || '';
      return (!country || pais === country)
          && selectedTiendas.includes(tienda)
          && (!selectedAreas || selectedAreas.includes(area));
    });

    const agg = {};
    filtered.forEach(r => {
      const t = r.Tienda;
      if (!agg[t]) agg[t] = { m2: 0, m3: 0, racks: 0 };
      agg[t].m2    += parseFloat(r.m2)      || 0;
      agg[t].m3    += parseFloat(r.m3)      || 0;
      agg[t].racks += parseFloat(r.N_RACKS) || 0;
    });

    const ordered = [...document.querySelectorAll('#store-chips .multi-chip[data-tienda].selected')]
      .map(c => c.dataset.tienda).filter(t => agg[t])
      .map(t => ({
        Tienda: t,
        m2:    Math.round(agg[t].m2    * 10) / 10,
        m3:    Math.round(agg[t].m3    * 10) / 10,
        racks: Math.round(agg[t].racks * 10) / 10,
        color: tiendaColors[t] || '#F47920'
      }));

    if (ordered.length) renderBarChart(ordered, country);
  }
}

// ================================================================
//  RENDER — líneas múltiples (X = áreas, cada línea = tienda)
// ================================================================
function renderMultiSeriesLine(areas, tiendaSeries, country) {
  const metricLabel = currentMetric === 'm2' ? 'm²' : currentMetric === 'm3' ? 'm³' : 'N° Racks';
  const suffix      = currentMetric === 'm2' ? ' m²' : currentMetric === 'm3' ? ' m³' : '';

  document.querySelector('.chart-head h4').textContent =
    `Comparativo ${metricLabel} — ${country || ''}`;
  document.querySelector('.chart-head small').textContent =
    `${tiendaSeries.length} tienda(s) · ${areas.length} área(s) · Pasa el mouse sobre un punto para ver el valor`;

  // Escala Y
  let maxVal = 0;
  tiendaSeries.forEach(s => areas.forEach(a => {
    const v = s.values[a] || 0; if (v > maxVal) maxVal = v;
  }));
  const yMax = niceMax(maxVal * 1.08 || 100);

  // Layout SVG
  const W  = 800, H = 340;
  const ml = 70, mr = 20, mt = 18, mb = 88;
  const pw = W - ml - mr;
  const ph = H - mt - mb;
  const n  = areas.length;

  const xOf = i => ml + (n > 1 ? (i / (n - 1)) * pw : pw / 2);
  const yOf = v => mt + ph - Math.min(1, Math.max(0, v / yMax)) * ph;

  // Ticks Y
  const NTICKS = 5;
  const yTicks = Array.from({ length: NTICKS + 1 }, (_, i) => ({
    v: Math.round(yMax / NTICKS * i),
    y: yOf(yMax / NTICKS * i)
  }));

  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg">`;

  // Gradiente fill
  s += `<defs>`;
  tiendaSeries.forEach((ser, si) => {
    s += `<linearGradient id="fg${si}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ser.color}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${ser.color}" stop-opacity="0.01"/>
    </linearGradient>`;
  });
  s += `</defs>`;

  // Gridlines horizontales
  s += `<g stroke="#ECEAE5" stroke-width="1">`;
  yTicks.forEach(t => {
    s += `<line x1="${ml}" y1="${t.y.toFixed(1)}" x2="${W - mr}" y2="${t.y.toFixed(1)}" stroke-dasharray="3 5"/>`;
  });
  s += `</g>`;

  // Etiquetas Y
  s += `<g font-family="Inter,sans-serif" font-size="11" fill="#9CA3AF" text-anchor="end">`;
  yTicks.forEach(t => {
    s += `<text x="${ml - 8}" y="${(t.y + 4).toFixed(1)}">${t.v.toLocaleString('es-PE')}${suffix}</text>`;
  });
  s += `</g>`;

  // Línea base X
  s += `<line x1="${ml}" y1="${(mt + ph).toFixed(1)}" x2="${W - mr}" y2="${(mt + ph).toFixed(1)}" stroke="#D5D2CB" stroke-width="1.5"/>`;

  // Ticks y etiquetas X (rotadas -40°)
  s += `<g font-family="Inter,sans-serif" font-size="10" fill="#9CA3AF" text-anchor="end">`;
  areas.forEach((a, i) => {
    const x  = xOf(i).toFixed(1);
    const y0 = (mt + ph).toFixed(1);
    const y1 = (mt + ph + 5).toFixed(1);
    const y2 = (mt + ph + 10).toFixed(1);
    const lbl = a.length > 14 ? a.slice(0, 13) + '…' : a;
    s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="#D5D2CB" stroke-width="1"/>`;
    s += `<text transform="rotate(-40,${x},${y2})" x="${x}" y="${y2}">${esc(lbl)}</text>`;
  });
  s += `</g>`;

  // Fills (renderizar primero para que queden debajo de las líneas)
  tiendaSeries.forEach((ser, si) => {
    const pts = areas.map((a, i) => ({ x: xOf(i), y: yOf(ser.values[a] || 0) }));
    const pathD = catmullRomPath(pts);
    if (!pathD) return;
    s += `<path d="${pathD} L${pts[pts.length-1].x},${mt+ph} L${pts[0].x},${mt+ph}Z"
      fill="url(#fg${si})"/>`;
  });

  // Líneas y puntos
  tiendaSeries.forEach(ser => {
    const pts = areas.map((a, i) => ({ x: xOf(i), y: yOf(ser.values[a] || 0) }));
    const pathD = catmullRomPath(pts);
    if (!pathD) return;

    // Línea principal
    s += `<path d="${pathD}" fill="none" stroke="${ser.color}" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>`;

    // Puntos interactivos
    pts.forEach((p, i) => {
      const val = Math.round((ser.values[areas[i]] || 0) * 10) / 10;
      s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"
        fill="white" stroke="${ser.color}" stroke-width="2"
        class="line-dot"
        data-store="${esc(ser.tienda)}" data-color="${ser.color}"
        data-area="${esc(areas[i])}" data-val="${val}"
        onmouseenter="showLineTip(event,this)"
        onmousemove="moveTip(event)"
        onmouseleave="hideTip()"/>`;
    });
  });

  s += `</svg>`;

  // Inyectar en el chart div
  const chartEl = document.getElementById('chart');
  chartEl.style.height  = 'auto';
  chartEl.style.padding = '8px 0 0';
  chartEl.innerHTML = s;

  // Leyenda
  document.querySelector('.chart-legend').innerHTML = tiendaSeries
    .map(ser => `<div class="legend-item">
      <div class="legend-dot" style="background:${ser.color}"></div>${esc(ser.tienda)}
    </div>`).join('');
}

// ================================================================
//  RENDER — barras (X = tiendas, Y = métrica agregada)
// ================================================================
function renderBarChart(stores, country) {
  const metricLabel = currentMetric === 'm2' ? 'm²' : currentMetric === 'm3' ? 'm³' : 'N° Racks';
  const suffix      = currentMetric === 'm2' ? ' m²' : currentMetric === 'm3' ? ' m³' : ' racks';

  document.querySelector('.chart-head h4').textContent =
    `${metricLabel} por tienda · ${country || ''}`;
  document.querySelector('.chart-head small').textContent =
    `${stores.length} tienda(s) · Pasa el mouse para ver detalle`;

  const vals   = stores.map(s => s[currentMetric] || 0);
  const maxVal = Math.max(...vals) || 1;
  const yMax   = niceMax(maxVal * 1.08);

  const W  = 800, H = 300;
  const ml = 70, mr = 20, mt = 16, mb = 56;
  const pw = W - ml - mr;
  const ph = H - mt - mb;

  const NTICKS = 5;
  const yTicks = Array.from({ length: NTICKS + 1 }, (_, i) => ({
    v: Math.round(yMax / NTICKS * i),
    y: mt + ph - (yMax / NTICKS * i / yMax) * ph
  }));

  const n     = stores.length;
  const step  = pw / Math.max(n, 1);
  const barW  = Math.max(6, Math.min(44, step * 0.55));

  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg">`;

  // Grid
  s += `<g stroke="#ECEAE5" stroke-width="1">`;
  yTicks.forEach(t => s += `<line x1="${ml}" y1="${t.y.toFixed(1)}" x2="${W-mr}" y2="${t.y.toFixed(1)}" stroke-dasharray="3 5"/>`);
  s += `</g>`;

  // Y labels
  s += `<g font-family="Inter,sans-serif" font-size="11" fill="#9CA3AF" text-anchor="end">`;
  yTicks.forEach(t => s += `<text x="${ml-8}" y="${(t.y+4).toFixed(1)}">${t.v.toLocaleString('es-PE')}${suffix}</text>`);
  s += `</g>`;

  // Baseline
  s += `<line x1="${ml}" y1="${mt+ph}" x2="${W-mr}" y2="${mt+ph}" stroke="#D5D2CB" stroke-width="1.5"/>`;

  // Barras
  stores.forEach((store, i) => {
    const val  = store[currentMetric] || 0;
    const barH = Math.max(2, (val / yMax) * ph);
    const cx   = ml + step * i + step / 2;
    const x    = cx - barW / 2;
    const y    = mt + ph - barH;
    const lbl  = store.Tienda.length > 9 ? store.Tienda.slice(0, 8) + '…' : store.Tienda;

    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}"
      rx="4" fill="${store.color}" opacity="0.85" style="cursor:pointer"
      data-store="${esc(store.Tienda)}" data-color="${store.color}"
      data-m2="${store.m2.toLocaleString('es-PE')} m²"
      data-m3="${store.m3.toLocaleString('es-PE')} m³"
      data-racks="${store.racks.toLocaleString('es-PE')} racks"
      onmouseenter="showTip(event,this);this.style.opacity=1"
      onmousemove="moveTip(event)"
      onmouseleave="hideTip();this.style.opacity=0.85"/>`;

    // Valor encima
    if (barH > 18) {
      s += `<text x="${cx.toFixed(1)}" y="${(y - 5).toFixed(1)}" font-family="Inter,sans-serif"
        font-size="10" font-weight="700" fill="${store.color}" text-anchor="middle">
        ${val.toLocaleString('es-PE')}</text>`;
    }

    // Etiqueta X
    s += `<text x="${cx.toFixed(1)}" y="${(mt + ph + 16).toFixed(1)}" font-family="Inter,sans-serif"
      font-size="10" fill="#7A7A82" text-anchor="middle">${esc(lbl)}</text>`;
  });

  s += `</svg>`;

  const chartEl = document.getElementById('chart');
  chartEl.style.height  = '300px';
  chartEl.style.padding = '16px 12px 44px';
  chartEl.innerHTML = s;

  // Leyenda
  document.querySelector('.chart-legend').innerHTML = stores
    .map(store => `<div class="legend-item">
      <div class="legend-dot" style="background:${store.color}"></div>${esc(store.Tienda)}
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
