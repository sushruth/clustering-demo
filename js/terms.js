const TERMS = [
  { id: 'cohesion', name: 'Cohesion', hue: 'var(--h1)',
    text: 'How tightly the points inside one cluster hug each other. Tight is good.',
    num: m => `${m.cohesion.toFixed(1)} px avg distance inside`,
    chaos: { name: 'Modularity',
      text: "How much of a group's uses stay inside it, compared with chance.",
      code: 'high means the group can be read and changed alone; low means the group is just a folder.',
      status: 'in the testbed' } },
  { id: 'separation', name: 'Separation', hue: 'var(--h2)',
    text: 'The gap between two different clusters. Wider is better.',
    num: m => `${m.separation.toFixed(1)} px avg to nearest other cluster`,
    chaos: { name: 'Seams',
      text: 'Uses between groups that go against the main direction. A gap between groups is not measured.',
      code: 'a seam means two groups lean on each other both ways and cannot be pulled apart.',
      status: 'in chaos (seams); gap not measured' } },
  { id: 'coupling', name: 'Coupling / Cut', hue: 'var(--h4)',
    text: 'The links that cross from one cluster into another. Fewer means a cleaner split.',
    num: m => `${m.cutSize} crossing links`,
    chaos: { name: 'Crossing uses',
      text: "Uses that go from one group to another (seams, loop cut rows, a group's public face and needs).",
      code: 'each crossing is a place where a change in one group can reach another; fewer is a cleaner split.',
      status: 'in chaos' } },
  { id: 'conductance', name: 'Conductance', hue: 'var(--h5)',
    text: 'The share of all links that leak across a cluster boundary instead of staying inside.',
    num: m => `${(m.conductance * 100).toFixed(1)}% leaks out`,
    chaos: { name: 'Share of uses that leave',
      text: "The share of a group's uses that cross its boundary.",
      code: 'near 0 is a real module; near 0.5 or more means there is no clean cut.',
      status: 'computed by the split method, not shown; the testbed prints it as cut share' } },
  { id: 'silhouette', name: 'Silhouette', hue: 'var(--h3)',
    text: 'For one point: is it closer to its own cluster (a) than to the next nearest one (b)? Near +1 yes, below 0 it is in the wrong place.',
    num: () => { const s = sampleNode(); if (!s) return ''; const r = computeNodeSilhouette(s); return `point #${s.id}: a ${r.a.toFixed(0)}, b ${r.b.toFixed(0)}, s ${r.s.toFixed(2)}`; },
    chaos: { name: 'Move',
      text: 'A unit that another group uses more than its own group does. Chaos answers yes or no, not a score.',
      code: 'a unit that fits another group better is in the wrong group, and moving it is a small change.',
      status: 'in chaos (Move tab); a score is in the testbed' } },
  { id: 'centroid', name: 'Centroid / Medoid', hue: 'var(--h6)',
    text: 'The centroid is the average position, even if nothing sits there. The medoid is the real point closest to everyone else.',
    num: () => { const a = calculateClusterAnchors().find(x => x.cluster === focusCluster()); return a && a.medoid ? `${dist(a.centroid, a.medoid).toFixed(1)} px apart` : ''; },
    chaos: { name: 'Medoid unit',
      text: 'The unit with the least total distance to the rest of its group.',
      code: 'the unit to read first; remove it and the group falls apart.',
      status: 'in the testbed only' } },
  { id: 'density', name: 'Density / Reachability (ε)', hue: 'var(--h9)',
    text: 'A point is dense if enough neighbours sit within ε. Overlapping ε circles chain dense points into one region.',
    num: () => `${nodes.filter(n => n.isCore).length} of ${nodes.length} points are core`,
    chaos: { name: 'Reach within N uses',
      text: 'Units a unit reaches through uses, followed N steps; a unit with many is a hub.',
      code: 'chains of hubs mark a tangled region; units with none nearby are loose or dead code.',
      status: 'chaos reach has no step limit; the testbed stops when a step weighs less than 1/12' } },
  { id: 'dbdunn', name: 'Davies–Bouldin / Dunn', hue: 'var(--h8)',
    text: 'Two ratios of scatter to gap: how wide each cluster is versus how far apart clusters sit. Wide and close is bad.',
    num: m => `DB ${m.daviesBouldin.toFixed(2)} (lower better), Dunn ${m.dunnIndex.toFixed(2)} (higher better)`,
    chaos: { name: 'Not in chaos',
      text: 'Ratios of how wide groups are to how far apart they sit.',
      code: 'wide groups that sit close together would mean big modules that all touch each other.',
      status: 'not built' } },
  { id: 'inertia', name: 'Inertia', hue: 'var(--h10)',
    text: 'The total of every point’s squared distance to its own centroid. Smaller means tighter overall.',
    num: m => `${(m.inertia / 1000).toFixed(1)}k`,
    chaos: { name: 'Within-group distance',
      text: "Sum of squared distances from each unit to its group's medoid, where distance comes from closeness (pull minus push).",
      code: 'total looseness of the grouping; the elbow plot uses it.',
      status: 'in the testbed only' } }
];

let selectedTerm = null;
let pullCluster = 0;

function view(t) {
  return mode === 'chaos' ? t.chaos : t;
}

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

function numText(t, metrics) {
  const n = t.num(metrics);
  return mode === 'chaos' ? `${n}  ·  chaos: ${t.chaos.name}` : n;
}

function updateTermNumber(metrics, anchors) {
  if (!selectedTerm || !metrics || metrics.cohesion === undefined) return;
  const big = anchors.filter(a => a.memberCount >= 5);
  if (big.length) pullCluster = big.reduce((m, a) => (dist(a.centroid, a.medoid) > dist(m.centroid, m.medoid) ? a : m)).cluster;
  const el = document.getElementById('term-num');
  if (el) el.textContent = numText(selectedTerm, metrics);
}

function selectTerm(id) {
  selectedTerm = TERMS.find(t => t.id === id) || null;
  markDirty();
  document.querySelectorAll('#terms .term').forEach(b => b.classList.toggle('on', !!selectedTerm && b.dataset.id === selectedTerm.id));
  const v = selectedTerm ? view(selectedTerm) : null;
  const name = document.getElementById('term-name');
  name.textContent = v ? v.name : label('cloud');
  name.style.color = selectedTerm ? selectedTerm.hue : '';
  document.getElementById('term-text').textContent = v
    ? v.text
    : 'Pick a term to read what it means. Use the sliders to see how the graph responds.';
  document.getElementById('term-code').textContent = v && v.code ? `In code: ${v.code}` : '';
  document.getElementById('term-status').textContent = v && v.status ? v.status : '';
  document.getElementById('term-num').style.color = selectedTerm ? selectedTerm.hue : '';
  if (!selectedTerm) document.getElementById('term-num').textContent = '';
}

function buildTermButtons() {
  const nav = document.getElementById('terms');
  nav.replaceChildren();
  TERMS.forEach(t => {
    const b = document.createElement('button');
    b.className = 'term';
    b.dataset.id = t.id;
    b.textContent = view(t).name;
    b.style.setProperty('--h', t.hue);
    b.addEventListener('click', () => selectTerm(selectedTerm && selectedTerm.id === t.id ? null : t.id));
    nav.appendChild(b);
  });
  selectTerm(selectedTerm ? selectedTerm.id : null);
}

buildTermButtons();
