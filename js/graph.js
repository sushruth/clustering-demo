let baseCenters = [];
let autoSample = null;

function gauss() {
  const u = 1 - Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function nodeTarget(n) {
  const h = n.home;
  if (!h || !baseCenters[h.a]) return null;
  const sc = params.separation / 180;
  const spread = Math.pow(75 / params.cohesion, 0.7);
  const A = baseCenters[h.a], B = baseCenters[h.b];
  return {
    x: width / 2 + (A.x + (B.x - A.x) * h.t) * sc + h.ox * spread,
    y: height / 2 + (A.y + (B.y - A.y) * h.t) * sc + h.oy * spread
  };
}

function buildGraph(numClusters, opts = {}) {
  const { total = 100, elong = 1, bridgePts = 18, outliers = 3, sigmaMul = 1 } = opts;
  params.k = numClusters;
  nodes = [];
  edges = [];
  clusterCenters = [];
  autoSample = null;

  const ring = 86 * (1 + (numClusters - 3) * 0.2);
  const rot = Math.random() * Math.PI * 2;
  baseCenters = [];
  for (let c = 0; c < numClusters; c++) {
    const ang = rot + (c / numClusters) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const r = ring * (0.8 + Math.random() * 0.4);
    baseCenters.push({ x: Math.cos(ang) * r * 1.25, y: Math.sin(ang) * r });
    clusterCenters.push({ x: 0, y: 0, cluster: c });
  }

  const sigmas = [28, 40, 52, 34, 60].slice(0, Math.max(numClusters, 1));
  while (sigmas.length < numClusters) sigmas.push(36);
  sigmas.sort(() => Math.random() - 0.5);
  const weights = baseCenters.map(() => 0.6 + Math.random());
  const wSum = weights.reduce((a, b) => a + b, 0);
  const regionTotal = total - bridgePts - outliers;

  let id = 0;
  const add = (cluster, home, extra = {}) => {
    const n = { id: id++, cluster, home, vx: 0, vy: 0, radius: 6, isOutlier: false, isCore: false,
      tone: 0.62 + Math.random() * 0.3, ...extra };
    const t = nodeTarget(n);
    n.x = t.x; n.y = t.y;
    nodes.push(n);
  };

  for (let c = 0; c < numClusters; c++) {
    const count = Math.max(6, Math.round(regionTotal * weights[c] / wSum));
    const sig = sigmas[c] * sigmaMul;
    const axis = Math.random() * Math.PI * 2;
    const ca = Math.cos(axis), sa = Math.sin(axis);
    for (let i = 0; i < count; i++) {
      const g1 = Math.max(-2.2, Math.min(2.2, gauss())) * sig * elong;
      const g2 = Math.max(-2.2, Math.min(2.2, gauss())) * sig / Math.sqrt(elong);
      add(c, { a: c, b: c, t: 0, ox: g1 * ca - g2 * sa, oy: g1 * sa + g2 * ca });
    }
  }

  const nearestOther = a => {
    let best = -1, bd = Infinity;
    baseCenters.forEach((p, j) => {
      const d = Math.hypot(p.x - baseCenters[a].x, p.y - baseCenters[a].y);
      if (j !== a && d < bd) { bd = d; best = j; }
    });
    return best;
  };
  for (let i = 0; i < bridgePts && numClusters > 1; i++) {
    const a = Math.floor(Math.random() * numClusters);
    const b = nearestOther(a);
    const t = 0.3 + Math.random() * 0.4;
    add(t < 0.5 ? a : b, { a, b, t, ox: gauss() * 9, oy: gauss() * 9 });
  }

  for (let i = 0; i < outliers; i++) {
    const c = Math.floor(Math.random() * numClusters);
    const A = baseCenters[c];
    const len = Math.hypot(A.x, A.y) || 1;
    const push = (opts.outlierDist || 120) + Math.random() * 70;
    const side = (Math.random() - 0.5) * 120;
    add(c, { a: c, b: c, t: 0, ox: (A.x / len) * push - (A.y / len) * side, oy: (A.y / len) * push + (A.x / len) * side },
      { isOutlier: true });
  }

  const seen = new Set();
  for (let c = 0; c < numClusters; c++) {
    const members = nodes.filter(n => n.cluster === c);
    members.forEach(m => {
      members.filter(o => o !== m).sort((a, b) => dist(m, a) - dist(m, b)).slice(0, 2).forEach(o => {
        const key = Math.min(m.id, o.id) + '-' + Math.max(m.id, o.id);
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({ source: m, target: o, isCross: false });
      });
    });
  }

  applyCouplingEdges(params.couplingEdges);
  settleTicks = 0;
  for (let i = 0; i < 300; i++) stepPhysics();
  dirty = true;
}

function applyCouplingEdges(targetCrossCount) {
  edges = edges.filter(e => !e.isCross);
  if (targetCrossCount <= 0 || params.k < 2) return;

  const pairs = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].cluster !== nodes[j].cluster) pairs.push({ s: nodes[i], t: nodes[j], d: dist(nodes[i], nodes[j]) });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const pool = pairs.slice(0, Math.max(targetCrossCount * 3, 8));
  pool.sort(() => Math.random() - 0.5);
  pool.slice(0, targetCrossCount).forEach(p => edges.push({ source: p.s, target: p.t, isCross: true }));
}

function recluster(k) {
  params.k = k;
  autoSample = null;
  if (nodes.length === 0) return;
  k = Math.min(k, nodes.length);
  let seed = 1337 + k * 7919;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nearest = (p, cs) => {
    let bi = 0, bd = Infinity;
    cs.forEach((c, i) => { const d = distSq(p, c); if (d < bd) { bd = d; bi = i; } });
    return { i: bi, d: bd };
  };

  const ordered = nodes.slice().sort((a, b) => a.id - b.id);
  let centers = [{ x: ordered[Math.floor(rand() * ordered.length)].x, y: 0 }];
  centers[0].y = ordered.find(n => n.x === centers[0].x).y;
  while (centers.length < k) {
    const ds = ordered.map(n => nearest(n, centers).d);
    const total = ds.reduce((a, b) => a + b, 0);
    let r = rand() * total, pick = ordered.length - 1;
    for (let i = 0; i < ds.length; i++) { r -= ds[i]; if (r <= 0) { pick = i; break; } }
    centers.push({ x: ordered[pick].x, y: ordered[pick].y });
  }

  let assign = new Array(ordered.length).fill(-1);
  for (let iter = 0; iter < 30; iter++) {
    let changed = false;
    ordered.forEach((n, i) => {
      const c = nearest(n, centers).i;
      if (c !== assign[i]) { assign[i] = c; changed = true; }
    });
    centers = centers.map((c, ci) => {
      let sx = 0, sy = 0, cnt = 0;
      ordered.forEach((n, i) => { if (assign[i] === ci) { sx += n.x; sy += n.y; cnt++; } });
      if (cnt > 0) return { x: sx / cnt, y: sy / cnt };
      let far = ordered[0], fd = -1;
      ordered.forEach(n => { const d = nearest(n, centers).d; if (d > fd) { fd = d; far = n; } });
      changed = true;
      return { x: far.x, y: far.y };
    });
    if (!changed) break;
  }

  const rank = centers.map((c, i) => i).sort((a, b) => centers[a].x - centers[b].x || centers[a].y - centers[b].y);
  const label = new Map(rank.map((ci, r) => [ci, r]));
  ordered.forEach((n, i) => { n.cluster = label.get(assign[i]); });
  edges.forEach(e => { e.isCross = e.source.cluster !== e.target.cluster; });
  markDirty();
}
