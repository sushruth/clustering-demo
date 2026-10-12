function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function nodePaint(node) {
  if (layers.identify) {
    const col = CLUSTER_COLORS[node.cluster % CLUSTER_COLORS.length];
    return { fill: node.isOutlier ? `rgba(${theme().outlier.join(',')}, 0.9)` : hexA(col.main, 0.9), alpha: 1, r: node.isOutlier ? 8 : node.radius };
  }
  return { fill: `rgba(${NEUTRAL.join(',')}, ${node.tone ?? 0.75})`, alpha: 1, r: node.radius };
}

function edgePaint(edge) {
  const cross = edge.isCross;
  if (layers.identify) {
    return { color: cross ? theme().cross : CLUSTER_COLORS[edge.source.cluster % CLUSTER_COLORS.length].main,
      alpha: cross ? 0.5 : 0.35, width: cross ? 1.6 : 0.8 };
  }
  return { color: `rgb(${NEUTRAL.join(',')})`, alpha: (cross ? 0.16 : 0.11) * theme().edgeMul, width: 0.6 };
}

const TREE_DIR = -1;
const TREE_MARGIN = { l: 50, r: 110, t: 40, b: 40 };
const TREE_MS = 500;
let treeBlend = 0;
let treeLast = performance.now();

function stepTreeBlend() {
  const now = performance.now();
  const dt = now - treeLast;
  treeLast = now;
  const goal = layers.treeView ? 1 : 0;
  const step = dt / TREE_MS;
  treeBlend = goal > treeBlend ? Math.min(goal, treeBlend + step) : Math.max(goal, treeBlend - step);
  return treeBlend * treeBlend * (3 - 2 * treeBlend);
}

function primChildren(members, root) {
  const children = new Map(members.map(n => [n, []]));
  const depth = new Map([[root, 0]]);
  const best = members.filter(n => n !== root).map(n => ({ n, d: dist(n, root), p: root }));
  while (best.length) {
    let bi = 0;
    for (let i = 1; i < best.length; i++) if (best[i].d < best[bi].d) bi = i;
    const { n, p } = best.splice(bi, 1)[0];
    depth.set(n, depth.get(p) + 1);
    children.get(p).push(n);
    best.forEach(b => { const d = dist(b.n, n); if (d < b.d) { b.d = d; b.p = n; } });
  }
  children.forEach(list => list.sort((x, y) => x.id - y.id));
  return { children, depth };
}

function layoutTree(anchors) {
  const trees = anchors.filter(a => a.medoid).map(a => {
    const members = nodes.filter(n => n.cluster === a.cluster);
    return { cluster: a.cluster, hub: a.medoid, ...primChildren(members, a.medoid) };
  });
  let maxDepth = 1;
  trees.forEach(t => t.depth.forEach(d => { maxDepth = Math.max(maxDepth, d + 1); }));

  const gap = 0.9;
  const pos = new Map();
  let slot = 0;
  const place = (t, n) => {
    const kids = t.children.get(n);
    let y;
    if (kids.length === 0) y = slot++;
    else {
      kids.forEach(k => place(t, k));
      y = (pos.get(kids[0]).y + pos.get(kids[kids.length - 1]).y) / 2;
    }
    pos.set(n, { y, depth: t.depth.get(n) + 1 });
  };
  trees.forEach((t, i) => {
    if (i) slot += gap;
    place(t, t.hub);
  });

  const m = TREE_MARGIN;
  const rootX = TREE_DIR < 0 ? width - m.r : m.l;
  const stepX = Math.min(130, (width - m.l - m.r) / maxDepth);
  const stepY = Math.min(34, (height - m.t - m.b) / Math.max(slot - 1, 1));
  const y0 = height / 2 - (Math.max(slot - 1, 0) * stepY) / 2;
  pos.forEach(p => { p.x = rootX + TREE_DIR * p.depth * stepX; p.y = y0 + p.y * stepY; });
  const hubs = trees.map(t => pos.get(t.hub));
  const root = { x: rootX, y: hubs.length ? (hubs[0].y + hubs[hubs.length - 1].y) / 2 : height / 2 };
  return { trees, pos, root, maxDepth };
}

function drawTreeView(anchors, blend, ease) {
  const L = layoutTree(anchors);
  const at = new Map();
  nodes.forEach(n => {
    const t = L.pos.get(n);
    at.set(n, t ? { x: n.x + (t.x - n.x) * ease, y: n.y + (t.y - n.y) * ease } : { x: n.x, y: n.y });
  });
  const rp = { x: L.root.x + (width / 2 - L.root.x) * (1 - ease), y: L.root.y + (height / 2 - L.root.y) * (1 - ease) };

  const link = (p, c, col, alpha, lw) => {
    const mx = (p.x + c.x) / 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.bezierCurveTo(mx, p.y, mx, c.y, c.x, c.y);
    ctx.globalAlpha = alpha * blend;
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.stroke();
  };

  const treePairs = new Set();
  L.trees.forEach(t => t.children.forEach((kids, p) => kids.forEach(k => treePairs.add(Math.min(p.id, k.id) + '-' + Math.max(p.id, k.id)))));
  const arc = (e, al, lw, col) => {
    const a = at.get(e.source), b = at.get(e.target);
    const bow = 40 + 0.35 * Math.abs(a.y - b.y);
    const cx = Math.max(10, Math.min(width - 10, Math.max(a.x, b.x) + TREE_DIR * bow));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(cx, a.y, cx, b.y, b.x, b.y);
    ctx.globalAlpha = al * blend;
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.stroke();
  };
  edges.forEach(e => {
    if (e.isCross || treePairs.has(Math.min(e.source.id, e.target.id) + '-' + Math.max(e.source.id, e.target.id))) return;
    if (!layers.intraEdges) return;
    const p = edgePaint(e);
    arc(e, p.alpha * 0.6, 0.6, p.color);
  });

  L.trees.forEach(t => {
    const treeCol = layers.identify ? CLUSTER_COLORS[t.cluster % CLUSTER_COLORS.length].main : `rgb(${NEUTRAL.join(',')})`;
    const col = treeCol;
    link(rp, at.get(t.hub), col, 0.8 * (layers.identify ? 1 : 0.55), 1);
    t.children.forEach((kids, p) => kids.forEach(k => {
      const f = 1 - 0.65 * (t.depth.get(k) - 1) / Math.max(L.maxDepth - 2, 1);
      const base = layers.identify ? 1 : 0.4;
      link(at.get(p), at.get(k), layers.identify ? col : `rgb(${NEUTRAL.join(',')})`, Math.min(1, base * (0.5 + 0.5 * f)), 0.8 + 1.0 * f);
    }));
  });

  const crossFloor = edges.filter(e => e.isCross).length > 8 ? 0.2 : 0.4;
  if (layers.interEdges) {
    edges.filter(e => e.isCross).forEach(e => {
      const p = edgePaint(e);
      const al = Math.max(layers.identify ? 1 : 0.4, crossFloor);
      arc(e, al, al > 0.7 ? 1.5 : 0.9, p.color);
    });
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalAlpha = 0.4 * blend;
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${theme().fg.join(',')}, 0.8)`;
  ctx.fill();
  ctx.font = '300 12px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = `rgba(${theme().fg.join(',')}, 0.9)`;
  ctx.textBaseline = 'middle';
  ctx.fillText('all data', rp.x - TREE_DIR * 12 - (TREE_DIR < 0 ? 0 : 44), rp.y);
  ctx.restore();

  nodes.forEach(node => {
    const p = at.get(node);
    const np = nodePaint(node);
    ctx.save();
    ctx.globalAlpha = np.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, np.r, 0, Math.PI * 2);
    ctx.fillStyle = np.fill;
    ctx.fill();
    ctx.restore();
  });
}

function render() {
  ctx.clearRect(0, 0, width, height);

  const anchors = calculateClusterAnchors();
  const ease = stepTreeBlend();
  if (treeBlend > 0) {
    drawTreeView(anchors, treeBlend, ease);
    const m = computeClusteringMetrics(anchors);
    updateHudUI(m);
    updateTermNumber(m, anchors);
    return;
  }

  if (layers.identify && layers.enclosures) {
    anchors.forEach(a => {
      const col = CLUSTER_COLORS[a.cluster % CLUSTER_COLORS.length];
      const er = Math.max(a.maxRadius + 24, 40);
      const eg = ctx.createRadialGradient(a.centroid.x, a.centroid.y, 0, a.centroid.x, a.centroid.y, er);
      eg.addColorStop(0, hexA(col.main, theme().env0));
      eg.addColorStop(0.7, hexA(col.main, theme().env1));
      eg.addColorStop(1, hexA(col.main, 0));
      ctx.beginPath();
      ctx.arc(a.centroid.x, a.centroid.y, er, 0, Math.PI * 2);
      ctx.fillStyle = eg;
      ctx.fill();
    });
  }

  edges.forEach(edge => {
    const isCross = edge.isCross;
    if (isCross && !layers.interEdges) return;
    if (!isCross && !layers.intraEdges) return;
    const ep = edgePaint(edge);

    ctx.beginPath();
    ctx.moveTo(edge.source.x, edge.source.y);
    ctx.lineTo(edge.target.x, edge.target.y);
    ctx.globalAlpha = ep.alpha;
    ctx.lineWidth = ep.width;
    ctx.strokeStyle = ep.color;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });

  nodes.forEach(node => {
    const np = nodePaint(node);

    ctx.save();
    ctx.globalAlpha = np.alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, np.r, 0, Math.PI * 2);
    ctx.fillStyle = np.fill;
    ctx.fill();
    ctx.restore();
  });

  const metrics = computeClusteringMetrics(anchors);
  updateHudUI(metrics);
  updateTermNumber(metrics, anchors);
}
