const MODE_KEY = 'clusterDemo.mode';

const LABELS = {
  clustering: {
    cloud: 'One cloud',
    tip: 'Drag a node.',
    presetIdeal: 'Ideal Isolated',
    presetTangled: 'High Coupling',
    presetOverlap: 'Overlapping',
    presetOutlier: 'Outlier Skew',
    presetChains: 'Density Chains',
    tree: 'Tree view',
    treeOn: 'Tree view on',
    identify: 'Identify clusters',
    identifyOn: 'Identify clusters on',
    reseed: 'Reseed',
    outlier: '+ Outlier',
    elbow: 'Elbow',
    elbowOn: 'Elbow on',
    reset: 'Reset defaults',
    sCohesion: 'Cohesion',
    sSeparation: 'Separation',
    sCoupling: 'Coupling',
    sK: 'Clusters (K)',
    sEpsilon: 'Reachability ε',
    capCohesion: '',
    capSeparation: '',
    capCoupling: '',
    capK: '',
    capEpsilon: '',
    elbowY: 'inertia',
    elbowHint: 'Adding clusters stops helping fast here.',
    elbowFlat: 'No clear elbow here: the curve is close to a straight line.'
  },
  chaos: {
    cloud: 'One codebase',
    tip: 'Drag a unit.',
    presetIdeal: 'Clean modules',
    presetTangled: 'Tangled',
    presetOverlap: 'Overlapping modules',
    presetOutlier: 'A few odd units',
    presetChains: 'Chains of hubs',
    tree: 'Tree view',
    treeOn: 'Tree view on',
    identify: 'Show groups',
    identifyOn: 'Show groups on',
    reseed: 'Reseed',
    outlier: '+ Odd unit',
    elbow: 'Elbow',
    elbowOn: 'Elbow on',
    reset: 'Reset defaults',
    sCohesion: 'Direct use pull',
    sSeparation: 'Push',
    sCoupling: 'Crossing uses',
    sK: 'Groups (K)',
    sEpsilon: 'Reach steps',
    capCohesion: '--direct',
    capSeparation: '--push',
    capCoupling: 'uses between groups',
    capK: 'chosen by the elbow',
    capEpsilon: '--decay, --stop',
    elbowY: 'within-group distance',
    elbowHint: 'Adding groups stops helping fast here.',
    elbowFlat: 'No clear elbow here: the curve is close to a straight line.'
  }
};

let mode = readMode();

function readMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'chaos' ? 'chaos' : 'clustering';
  } catch (e) {
    return 'clustering';
  }
}

function label(key) {
  return LABELS[mode][key];
}

function setMode(next) {
  mode = next;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (e) {}
  applyMode();
}

function refreshToggleLabels() {
  const tree = document.getElementById('btn-tree');
  tree.textContent = layers.treeView ? label('treeOn') : label('tree');
  tree.classList.toggle('lit', layers.treeView);

  const identify = document.getElementById('btn-identify');
  identify.textContent = layers.identify ? label('identifyOn') : label('identify');
  identify.classList.toggle('lit', layers.identify);

  const elbow = document.getElementById('btn-elbow');
  elbow.textContent = elbowOn ? label('elbowOn') : label('elbow');
  elbow.classList.toggle('lit', elbowOn);
}

function applyMode() {
  document.documentElement.dataset.mode = mode;
  document.querySelectorAll('[data-label]').forEach(el => { el.textContent = label(el.dataset.label); });
  document.querySelectorAll('[data-mode-btn]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode)));
  refreshToggleLabels();
  buildTermButtons();
  elbowDrawKey = '';
  elbowTick();
  markDirty();
}

document.querySelectorAll('[data-mode-btn]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));
