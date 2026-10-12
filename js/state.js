const CLUSTER_COLORS_DARK = [
  { main: '#38bdf8', glow: 'rgba(56, 189, 248, 0.25)', border: '#0284c7' },
  { main: '#34d399', glow: 'rgba(52, 211, 153, 0.25)', border: '#059669' },
  { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)', border: '#e11d48' },
  { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)', border: '#7e22ce' },
  { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.25)', border: '#d97706' }
];
const CLUSTER_COLORS_LIGHT = [
  { main: '#0284c7', glow: 'rgba(2, 132, 199, 0.25)', border: '#075985' },
  { main: '#059669', glow: 'rgba(5, 150, 105, 0.25)', border: '#047857' },
  { main: '#e11d48', glow: 'rgba(225, 29, 72, 0.25)', border: '#9f1239' },
  { main: '#9333ea', glow: 'rgba(147, 51, 234, 0.25)', border: '#6b21a8' },
  { main: '#d97706', glow: 'rgba(217, 119, 6, 0.25)', border: '#92400e' }
];
const CLUSTER_COLORS = CLUSTER_COLORS_DARK.map(c => ({ ...c }));
const NEUTRAL = [214, 222, 238];
const lightMQ = window.matchMedia('(prefers-color-scheme: light)');
let themeCache = null;
function theme() {
  if (themeCache) return themeCache;
  const cs = getComputedStyle(document.documentElement);
  const v = n => cs.getPropertyValue(n).trim();
  const rgb = n => v(n).split(',').map(Number);
  themeCache = { cross: v('--cross'), outlier: rgb('--outlier'), fg: rgb('--fg'), env0: +v('--env0'), env1: +v('--env1'), edgeMul: +v('--edge-mul') };
  NEUTRAL.splice(0, 3, ...rgb('--neutral'));
  (lightMQ.matches ? CLUSTER_COLORS_LIGHT : CLUSTER_COLORS_DARK).forEach((c, i) => Object.assign(CLUSTER_COLORS[i], c));
  return themeCache;
}
theme();
lightMQ.addEventListener('change', () => { themeCache = null; theme(); markDirty(); });

let nodes = [];
let edges = [];
let clusterCenters = [];
let settleTicks = 0;
let dirty = true;
function markDirty() { dirty = true; }
function settle(n = 150) { settleTicks = n; dirty = true; }
let inspectedNodeIndex = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };

const canvas = document.getElementById('clusterCanvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;

let params = {
  k: 3,
  cohesion: 75,
  separation: 180,
  couplingEdges: 3,
  epsilon: 45,
  minPts: 3,
  damping: 0.86
};

const layers = {
  enclosures: true,
  intraEdges: true,
  interEdges: true,
  treeView: false,
  identify: false
};
