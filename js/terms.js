const TERMS = [
  { id: 'cohesion', name: 'Cohesion', hue: 'var(--h1)',
    text: 'How tightly the points inside one cluster hug each other. Tight is good.',
    num: m => `${m.cohesion.toFixed(1)} px avg distance inside` },
  { id: 'separation', name: 'Separation', hue: 'var(--h2)',
    text: 'The gap between two different clusters. Wider is better.',
    num: m => `${m.separation.toFixed(1)} px avg to nearest other cluster` },
  { id: 'coupling', name: 'Coupling / Cut', hue: 'var(--h4)',
    text: 'The links that cross from one cluster into another. Fewer means a cleaner split.',
    num: m => `${m.cutSize} crossing links` },
  { id: 'conductance', name: 'Conductance', hue: 'var(--h5)',
    text: 'The share of all links that leak across a cluster boundary instead of staying inside.',
    num: m => `${(m.conductance * 100).toFixed(1)}% leaks out` },
  { id: 'silhouette', name: 'Silhouette', hue: 'var(--h3)',
    text: 'For one point: is it closer to its own cluster (a) than to the next nearest one (b)? Near +1 yes, below 0 it is in the wrong place.',
    num: () => { const s = sampleNode(); if (!s) return ''; const r = computeNodeSilhouette(s); return `point #${s.id}: a ${r.a.toFixed(0)}, b ${r.b.toFixed(0)}, s ${r.s.toFixed(2)}`; } },
  { id: 'centroid', name: 'Centroid / Medoid', hue: 'var(--h6)',
    text: 'The centroid is the average position, even if nothing sits there. The medoid is the real point closest to everyone else.',
    num: () => { const a = calculateClusterAnchors().find(x => x.cluster === focusCluster()); return a && a.medoid ? `${dist(a.centroid, a.medoid).toFixed(1)} px apart` : ''; } },
  { id: 'density', name: 'Density / Reachability (ε)', hue: 'var(--h9)',
    text: 'A point is dense if enough neighbours sit within ε. Overlapping ε circles chain dense points into one region.',
    num: () => `${nodes.filter(n => n.isCore).length} of ${nodes.length} points are core` },
  { id: 'dbdunn', name: 'Davies–Bouldin / Dunn', hue: 'var(--h8)',
    text: 'Two ratios of scatter to gap: how wide each cluster is versus how far apart clusters sit. Wide and close is bad.',
    num: m => `DB ${m.daviesBouldin.toFixed(2)} (lower better), Dunn ${m.dunnIndex.toFixed(2)} (higher better)` },
  { id: 'inertia', name: 'Inertia', hue: 'var(--h10)',
    text: 'The total of every point’s squared distance to its own centroid. Smaller means tighter overall.',
    num: m => `${(m.inertia / 1000).toFixed(1)}k` }
];

let selectedTerm = null;
let pullCluster = 0;

function focusCluster() {
  const n = inspectedNodeIndex !== null ? nodes.find(x => x.id === inspectedNodeIndex) : null;
  return n ? n.cluster : pullCluster;
}

function sampleNode() {
  const n = inspectedNodeIndex !== null ? nodes.find(x => x.id === inspectedNodeIndex) : null;
  if (n) return n;
  if (autoSample === null) {
    let best = null, bs = Infinity;
    nodes.forEach(x => { if (!x.isOutlier) { const sv = computeNodeSilhouette(x).s; if (sv < bs) { bs = sv; best = x; } } });
    autoSample = best ? best.id : null;
  }
  return nodes.find(x => x.id === autoSample) || nodes[0];
}

function updateTermNumber(metrics, anchors) {
  if (!selectedTerm || !metrics || metrics.cohesion === undefined) return;
  const big = anchors.filter(a => a.memberCount >= 5);
  if (big.length) pullCluster = big.reduce((m, a) => (dist(a.centroid, a.medoid) > dist(m.centroid, m.medoid) ? a : m)).cluster;
  const el = document.getElementById('term-num');
  if (el) el.textContent = selectedTerm.num(metrics);
}

function selectTerm(id) {
  selectedTerm = TERMS.find(t => t.id === id) || null;
  markDirty();
  document.querySelectorAll('#terms .term').forEach(b => b.classList.toggle('on', !!selectedTerm && b.dataset.id === selectedTerm.id));
  const name = document.getElementById('term-name');
  name.textContent = selectedTerm ? selectedTerm.name : 'One cloud';
  name.style.color = selectedTerm ? selectedTerm.hue : '';
  document.getElementById('term-text').textContent = selectedTerm
    ? selectedTerm.text
    : 'Pick a term to read what it means. Use the sliders to see how the graph responds.';
  document.getElementById('term-num').style.color = selectedTerm ? selectedTerm.hue : '';
  if (!selectedTerm) document.getElementById('term-num').textContent = '';
}

(function buildTerms() {
  const nav = document.getElementById('terms');
  TERMS.forEach(t => {
    const b = document.createElement('button');
    b.className = 'term';
    b.dataset.id = t.id;
    b.textContent = t.name;
    b.style.setProperty('--h', t.hue);
    b.addEventListener('click', () => selectTerm(selectedTerm && selectedTerm.id === t.id ? null : t.id));
    nav.appendChild(b);
  });
  selectTerm(null);
})();
