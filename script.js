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
      const card = document.querySelector(`.store-card[data-id="${id}"]`);
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
//  MÉTRICA — reconstruye el gráfico al cambiar
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

// ================================================================
//  ACUERDOS FILTER
// ================================================================
function filterAcuerdos(cat, btn) {
  btn.closest('.cat-filter').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tl-item').forEach(item => {
    item.classList.toggle('hidden', cat !== 'all' && item.dataset.cat !== cat);
  });
}
function setArea(el) {
  el.closest('.area-filter').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ================================================================
//  SCROLLSPY
// ================================================================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}, { passive: true });

// ================================================================
//  CONSTANTES
// ================================================================
const CHART_COLORS = [
  '#F47920','#10B981','#8B5CF6','#3B82F6','#EF4444',
  '#F59E0B','#06B6D4','#EC4899','#84CC16','#6366F1',
  '#14B8A6','#F43F5E','#A855F7','#0EA5E9','#22C55E'
];

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
let allRows       = [];
let tiendaColors  = {};  // { TIENDA_NAME: '#COLOR' }

// ================================================================
//  DESCARGA DE PLANTILLA CSV
// ================================================================
function downloadTemplate() {
  const csv = [
    'Pais,Tienda,Area_Comercial,m2,m3,N_RACKS',
    'PERÚ,AREQUIPA,Ferretería,180.20,310.50,25',
    'PERÚ,AREQUIPA,Herramientas,335.75,407.76,54',
    'PERÚ,AREQUIPA,Puertas,76.17,185.87,10.5',
    'PERÚ,CUSCO 1,Ferretería,125.59,236.76,17.5',
    'PERÚ,CUSCO 1,Herramientas,210.30,320.40,32',
    'PERÚ,TRUJILLO,Ferretería,160.00,280.00,22',
    'Ecuador,Batan,Ferretería,90.00,150.00,12',
    'Ecuador,Orellana,Ferretería,85.00,140.00,11',
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
  const areas  = [...new Set(countryRows.map(r => r.Area_Comercial || r['Área'] || ''))].filter(Boolean).sort();

  // Asignar colores fijos por tienda
  tiendaColors = {};
  stores.forEach((t, i) => { tiendaColors[t] = CHART_COLORS[i % CHART_COLORS.length]; });

  updateStoreChips(stores);
  populateAreas(areas);
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
    return `<span class="multi-chip selected"
      data-tienda="${t}"
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
      `<span class="multi-chip" data-area="${a}" onclick="toggleAreaChip(this)">${a}</span>`
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
  const todasBtn  = document.querySelector('#area-chips .multi-chip:first-child');
  const anyOn     = document.querySelectorAll('#area-chips .multi-chip[data-area].selected').length > 0;
  if (todasBtn) todasBtn.classList.toggle('active', !anyOn);
  refreshChart();
}

// ================================================================
//  REFRESH — filtra y agrega, luego renderiza
// ================================================================
function refreshChart() {
  if (!allRows.length) return;

  const country        = document.getElementById('country-sel')?.value || '';
  const selectedTiendas = [...document.querySelectorAll('#store-chips .multi-chip[data-tienda].selected')]
                            .map(c => c.dataset.tienda);
  const todasAreas     = document.querySelector('#area-chips .multi-chip:first-child')?.classList.contains('active') ?? true;
  const selectedAreas  = todasAreas ? null :
    [...document.querySelectorAll('#area-chips .multi-chip[data-area].selected')].map(c => c.dataset.area);

  const filtered = allRows.filter(r => {
    const pais   = r.Pais || r['País'] || '';
    const tienda = r.Tienda || '';
    const area   = r.Area_Comercial || r['Área'] || '';
    return (!country || pais === country)
        && selectedTiendas.includes(tienda)
        && (!selectedAreas || selectedAreas.includes(area));
  });

  // Agregar por Tienda
  const agg = {};
  filtered.forEach(r => {
    const t = r.Tienda;
    if (!agg[t]) agg[t] = { m2: 0, m3: 0, racks: 0 };
    agg[t].m2    += parseFloat(r.m2)      || 0;
    agg[t].m3    += parseFloat(r.m3)      || 0;
    agg[t].racks += parseFloat(r.N_RACKS) || 0;
  });

  // Mantener el orden de los chips
  const ordered = [...document.querySelectorAll('#store-chips .multi-chip[data-tienda].selected')]
    .map(c => c.dataset.tienda)
    .filter(t => agg[t])
    .map(t => ({
      Tienda: t,
      m2:    Math.round(agg[t].m2    * 10) / 10,
      m3:    Math.round(agg[t].m3    * 10) / 10,
      racks: Math.round(agg[t].racks * 10) / 10,
      color: tiendaColors[t] || CHART_COLORS[0]
    }));

  if (ordered.length) renderChart(ordered, country);
}

// ================================================================
//  RENDERIZAR GRÁFICO
// ================================================================
function renderChart(stores, country) {
  const vals   = stores.map(s => s[currentMetric] || 0);
  const maxVal = Math.max(...vals) || 1;
  const suffix = currentMetric === 'm2' ? ' m²' : currentMetric === 'm3' ? ' m³' : ' racks';
  const metricLabel = currentMetric === 'm2' ? 'm²' : currentMetric === 'm3' ? 'm³' : 'N° Racks';

  // Título
  document.querySelector('.chart-head h4').textContent =
    `${metricLabel} por tienda · ${country || ''}`;
  document.querySelector('.chart-head small').textContent =
    `${stores.length} tienda(s) · Pasa el mouse para ver detalle completo`;

  // ---- BARRAS ----
  document.querySelector('.bar-view').innerHTML = stores.map(s => {
    const val = s[currentMetric] || 0;
    const pct = Math.max(4, Math.round((val / maxVal) * 92));
    return `<div class="bar" style="--bar-c:${s.color};height:${pct}%"
      data-val="${val.toLocaleString('es-PE')}${suffix}"
      data-label="${s.Tienda}"
      data-store="${s.Tienda}"
      data-color="${s.color}"
      data-m2="${s.m2.toLocaleString('es-PE')} m²"
      data-m3="${s.m3.toLocaleString('es-PE')} m³"
      data-racks="${s.racks.toLocaleString('es-PE')} racks"
      onmouseenter="showTip(event,this)" onmousemove="moveTip(event)" onmouseleave="hideTip()"></div>`;
  }).join('');

  // ---- LÍNEAS ----
  const n     = stores.length;
  const xStep = n > 1 ? 480 / (n - 1) : 0;
  const pts   = stores.map((s, i) => ({
    x: n === 1 ? 300 : Math.round(60 + i * xStep),
    y: Math.round(220 - ((s[currentMetric] || 0) / maxVal) * 180),
    ...s
  }));

  const areaPath = `M${pts[0].x} ${pts[0].y}` +
    pts.slice(1).map(p => ` L${p.x} ${p.y}`).join('') +
    ` L${pts[n-1].x} 220 L${pts[0].x} 220Z`;

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
    <polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}"
      fill="none" stroke="#94A3B8" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="4 3"/>
    ${pts.map(p => `
      <circle class="line-dot" cx="${p.x}" cy="${p.y}" r="7"
        fill="#fff" stroke="${p.color}" stroke-width="3"
        data-store="${p.Tienda}" data-color="${p.color}"
        data-m2="${p.m2.toLocaleString('es-PE')} m²"
        data-m3="${p.m3.toLocaleString('es-PE')} m³"
        data-racks="${p.racks.toLocaleString('es-PE')} racks"
        onmouseenter="showTip(event,this)" onmousemove="moveTip(event)" onmouseleave="hideTip()"/>`).join('')}
    <g font-family="Inter,sans-serif" font-size="11" font-weight="700" text-anchor="middle">
      ${pts.map(p => `<text x="${p.x}" y="${p.y - 14}" fill="${p.color}">
        ${(p[currentMetric]||0).toLocaleString('es-PE')}</text>`).join('')}
    </g>
    <g font-family="Inter,sans-serif" font-size="10" fill="#7A7A82" text-anchor="middle">
      ${pts.map(p => {
        const lbl = p.Tienda.length > 9 ? p.Tienda.slice(0, 9) + '…' : p.Tienda;
        return `<text x="${p.x}" y="252">${lbl}</text>`;
      }).join('')}
    </g>`;

  // ---- LEYENDA ----
  document.querySelector('.chart-legend').innerHTML = stores.map(s =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${s.color}"></div>${s.Tienda}
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
