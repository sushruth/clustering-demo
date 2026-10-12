function inspectNode(id) {
  inspectedNodeIndex = id;
  markDirty();
  const node = nodes.find(n => n.id === id);
  if (!node) return;

  const pill = document.getElementById('inspector-pill');
  pill.classList.remove('hidden');
  document.getElementById('inspect-id').textContent = id;
  document.getElementById('inspect-a').textContent = node.a ? node.a.toFixed(1) : '0';
  document.getElementById('inspect-b').textContent = node.b ? node.b.toFixed(1) : '0';
  document.getElementById('inspect-s').textContent = node.silhouette !== undefined ? node.silhouette.toFixed(2) : '0.00';
}

function clearInspection() {
  inspectedNodeIndex = null;
  markDirty();
  document.getElementById('inspector-pill').classList.add('hidden');
}

function updateHudUI(metrics) {
  if (!metrics.cohesion && metrics.cohesion !== 0) return;

  document.getElementById('metric-cohesion').textContent = metrics.cohesion.toFixed(1);
  document.getElementById('metric-separation').textContent = metrics.separation.toFixed(1);
  document.getElementById('metric-silhouette').textContent = metrics.silhouette.toFixed(2);
  document.getElementById('metric-cut').textContent = metrics.cutSize;
  document.getElementById('metric-conductance').textContent = (metrics.conductance * 100).toFixed(1) + '%';
  document.getElementById('metric-db').textContent = metrics.daviesBouldin.toFixed(2);
  document.getElementById('metric-dunn').textContent = metrics.dunnIndex.toFixed(2);
  document.getElementById('metric-inertia').textContent = (metrics.inertia / 1000).toFixed(1) + 'k';

  document.getElementById('node-count').textContent = nodes.length;
  document.getElementById('cluster-count-label').textContent = params.k;

  const silElem = document.getElementById('metric-silhouette');
  if (metrics.silhouette > 0.5) {
    silElem.className = 'mono text-base font-bold text-emerald-400';
  } else if (metrics.silhouette > 0.15) {
    silElem.className = 'mono text-base font-bold text-indigo-300';
  } else {
    silElem.className = 'mono text-base font-bold text-rose-400';
  }
}
