function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  markDirty();
}

canvas.addEventListener('mousedown', e => {
  if (layers.treeView) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  let hit = null;
  for (let i = 0; i < nodes.length; i++) {
    if (dist({ x: mx, y: my }, nodes[i]) <= nodes[i].radius + 8) {
      hit = nodes[i];
      break;
    }
  }

  if (hit) {
    draggedNode = hit;
    hit.home = null;
    dragOffset.x = hit.x - mx;
    dragOffset.y = hit.y - my;
    inspectNode(hit.id);
  } else {
    clearInspection();
  }
});

window.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;

  if (draggedNode) {
    draggedNode.x = Math.max(15, Math.min(width - 15, mousePos.x + dragOffset.x));
    draggedNode.y = Math.max(15, Math.min(height - 15, mousePos.y + dragOffset.y));
    draggedNode.vx = 0;
    draggedNode.vy = 0;
  }
});

window.addEventListener('mouseup', () => {
  if (draggedNode) settle(40);
  draggedNode = null;
});

canvas.addEventListener('touchstart', e => {
  if (layers.treeView) return;
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    const hit = nodes.find(n => dist({ x: mx, y: my }, n) <= n.radius + 14);
    if (hit) {
      draggedNode = hit;
      hit.home = null;
      dragOffset.x = hit.x - mx;
      dragOffset.y = hit.y - my;
      inspectNode(hit.id);
      e.preventDefault();
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (draggedNode && e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draggedNode.x = touch.clientX - rect.left + dragOffset.x;
    draggedNode.y = touch.clientY - rect.top + dragOffset.y;
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  if (draggedNode) settle(40);
  draggedNode = null;
});
