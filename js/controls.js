function reseedGraph() {
  buildGraph(params.k);
}

function addRandomOutlier() {
  const id = nodes.length;
  const c = Math.floor(Math.random() * params.k);
  const randomX = 40 + Math.random() * (width - 80);
  const randomY = 40 + Math.random() * (height - 80);
  
  const outlier = {
    id: id,
    cluster: c,
    x: randomX,
    y: randomY,
    vx: (Math.random() - 0.5) * 5,
    vy: (Math.random() - 0.5) * 5,
    radius: 6,
    tone: 0.75,
    home: null,
    isOutlier: true,
    isCore: false
  };
  nodes.push(outlier);
  inspectNode(id);
  settle(100);
}

document.getElementById('slider-cohesion').addEventListener('input', e => {
  params.cohesion = parseInt(e.target.value);
  document.getElementById('val-cohesion').textContent = `${params.cohesion}%`;
  settle();
});

document.getElementById('slider-separation').addEventListener('input', e => {
  params.separation = parseInt(e.target.value);
  document.getElementById('val-separation').textContent = `${params.separation}px`;
  settle();
});

document.getElementById('slider-coupling').addEventListener('input', e => {
  params.couplingEdges = parseInt(e.target.value);
  document.getElementById('val-coupling').textContent = `${params.couplingEdges} edges`;
  applyCouplingEdges(params.couplingEdges);
  settle();
});

document.getElementById('slider-clusters').addEventListener('input', e => {
  const k = parseInt(e.target.value);
  params.k = k;
  document.getElementById('val-clusters').textContent = `${k} groups`;
  recluster(k);
});

document.getElementById('slider-epsilon').addEventListener('input', e => {
  params.epsilon = parseInt(e.target.value);
  document.getElementById('val-epsilon').textContent = `${params.epsilon}px`;
  settle();
});

document.getElementById('layer-enclosures').addEventListener('change', e => layers.enclosures = e.target.checked);
document.getElementById('layer-intra-edges').addEventListener('change', e => layers.intraEdges = e.target.checked);
document.getElementById('layer-inter-edges').addEventListener('change', e => layers.interEdges = e.target.checked);

function resetSliders() {
  setSliderValue('slider-cohesion', 'val-cohesion', 75, '%');
  setSliderValue('slider-separation', 'val-separation', 180, 'px');
  setSliderValue('slider-coupling', 'val-coupling', 3, ' edges');
  setSliderValue('slider-clusters', 'val-clusters', 3, ' groups');
  setSliderValue('slider-epsilon', 'val-epsilon', 45, 'px');
  params.cohesion = 75;
  params.separation = 180;
  params.couplingEdges = 3;
  params.k = 3;
  params.epsilon = 45;
  buildGraph(3);
}

function setSliderValue(id, valId, val, unit) {
  const el = document.getElementById(id);
  el.value = val;
  document.getElementById(valId).textContent = `${val}${unit}`;
}

function toggleTree() {
  layers.treeView = !layers.treeView;
  const b = document.getElementById('btn-tree');
  b.textContent = layers.treeView ? 'Tree view on' : 'Tree view';
  b.classList.toggle('lit', layers.treeView);
  markDirty();
}

function toggleIdentify() {
  layers.identify = !layers.identify;
  const b = document.getElementById('btn-identify');
  b.textContent = layers.identify ? 'Identify clusters on' : 'Identify clusters';
  b.classList.toggle('lit', layers.identify);
  markDirty();
}
