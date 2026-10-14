function animationLoop() {
  const goal = layers.treeView ? 1 : 0;
  const moving = settleTicks > 0 || draggedNode || treeBlend !== goal;
  if (moving || dirty) {
    updatePhysics();
    dirty = false;
    render();
  } else {
    treeLast = performance.now();
  }
  elbowTick();
  requestAnimationFrame(animationLoop);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  settle(120);
});

window.onload = function() {
  applyMode();
  resizeCanvas();
  buildGraph(params.k);
  animationLoop();
};
