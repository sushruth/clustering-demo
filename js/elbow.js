const ELBOW_MAX_K = 8;
let elbowOn = false;
let elbowCurve = null;
let elbowKey = '';
let elbowDrawKey = '';
let elbowDots = [];

function computeInertiaCurve() {
  const maxK = Math.min(ELBOW_MAX_K, nodes.length);
  const curve = [];
  for (let k = 1; k <= maxK; k++) {
    const sse = kmeansFit(k).sse;
    curve.push(curve.length ? Math.min(sse, curve[curve.length - 1]) : sse);
  }
  return curve;
}

function findElbowK(curve) {
  const n = curve.length;
  if (n < 3) return null;
  const lo = Math.min(...curve), hi = Math.max(...curve);
  if (hi - lo < 1e-9 * Math.max(hi, 1)) return null;
  const pts = curve.map((v, i) => ({ x: i / (n - 1), y: (v - lo) / (hi - lo) }));
  const a = pts[0], b = pts[n - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  let best = -1, bd = 0;
  pts.forEach((p, i) => {
    const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
    if (d > bd) { bd = d; best = i; }
  });
  return bd < 0.05 || best <= 0 || best >= n - 1 ? null : best + 1;
}

function drawElbow() {
  const cv = document.getElementById('elbowCanvas');
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  elbowDots = [];
  const curve = elbowCurve;
  if (!curve || curve.length < 2) return;

  const th = theme();
  const fg = a => `rgba(${th.fg.join(',')},${a})`;
  const line = `rgba(${NEUTRAL.join(',')},0.55)`;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--h3').trim();
  const elbowK = findElbowK(curve);
  const L = 14, R = W - 14, T = 30, B = H - 28;
  const hi = Math.max(...curve), lo = Math.min(...curve);
  const px = i => L + (R - L) * i / (ELBOW_MAX_K - 1);
  const py = v => hi === lo ? (T + B) / 2 : T + (B - T) * (1 - (v - lo) / (hi - lo));

  c.font = '12.5px Inter, system-ui, sans-serif';
  c.textBaseline = 'alphabetic';
  c.fillStyle = fg(0.6);
  c.textAlign = 'left';
  c.fillText(label('elbowY'), 0, 12);

  c.strokeStyle = line;
  c.lineWidth = 1.25;
  c.beginPath();
  curve.forEach((v, i) => (i ? c.lineTo(px(i), py(v)) : c.moveTo(px(i), py(v))));
  c.stroke();

  curve.forEach((v, i) => {
    const k = i + 1, x = px(i), y = py(v);
    const isElbow = k === elbowK;
    elbowDots.push({ k, x, y });
    c.fillStyle = isElbow ? accent : line;
    c.beginPath();
    c.arc(x, y, isElbow ? 5.5 : 3, 0, Math.PI * 2);
    c.fill();
    if (k === params.k) {
      c.strokeStyle = fg(0.55);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(x, y, isElbow ? 9 : 6.5, 0, Math.PI * 2);
      c.stroke();
    }
    c.textAlign = 'center';
    c.fillStyle = k === params.k ? fg(0.95) : fg(0.6);
    c.fillText(String(k), x, H - 8);
  });

  if (elbowK) {
    const d = elbowDots[elbowK - 1];
    c.fillStyle = accent;
    c.textAlign = 'left';
    c.fillText(`elbow · K=${elbowK}`, Math.min(d.x + 12, W - 88), d.y - 12);
  }
  document.getElementById('elbow-hint').textContent = elbowK
    ? label('elbowHint')
    : label('elbowFlat');
}

function elbowTick(force) {
  if (!elbowOn) return;
  if (force) { elbowKey = ''; elbowDrawKey = ''; }
  const key = nodes.map(n => Math.round(n.x) + ',' + Math.round(n.y)).join(';');
  if (key !== elbowKey) {
    elbowKey = key;
    elbowCurve = computeInertiaCurve();
  }
  const drawKey = key + '|' + params.k;
  if (drawKey !== elbowDrawKey) {
    elbowDrawKey = drawKey;
    drawElbow();
  }
}

function toggleElbow() {
  elbowOn = !elbowOn;
  refreshToggleLabels();
  document.getElementById('elbow').hidden = !elbowOn;
  elbowTick(true);
}

document.getElementById('elbowCanvas').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = elbowDots.find(d => Math.hypot(d.x - x, d.y - y) < 14);
  if (!hit || hit.k < 2) return;
  const slider = document.getElementById('slider-clusters');
  slider.value = hit.k;
  slider.dispatchEvent(new Event('input'));
});

lightMQ.addEventListener('change', () => { elbowDrawKey = ''; elbowTick(); });
window.addEventListener('resize', () => { elbowDrawKey = ''; });
