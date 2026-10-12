function updatePhysics() {
  if (settleTicks <= 0 && !draggedNode) return;
  if (settleTicks > 0) settleTicks--;
  stepPhysics();
}

function stepPhysics() {

  clusterCenters.forEach((cc, c) => {
    const bc = baseCenters[c];
    if (!bc) return;
    cc.x = width / 2 + bc.x * params.separation / 180;
    cc.y = height / 2 + bc.y * params.separation / 180;
  });

  nodes.forEach(node => {
    if (node === draggedNode) return;
    const t = nodeTarget(node);
    if (t) {
      node.vx += (t.x - node.x) * 0.03;
      node.vy += (t.y - node.y) * 0.03;
    }
  });

  edges.forEach(edge => {
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / d;
    const ny = dy / d;

    const restLength = edge.isCross ? 55 : 24;
    const displacement = d - restLength;
    const springK = edge.isCross ? 0.02 : 0.045 * (params.cohesion / 75);

    const forceX = nx * displacement * springK;
    const forceY = ny * displacement * springK;

    if (edge.source !== draggedNode) {
      edge.source.vx += forceX;
      edge.source.vy += forceY;
    }
    if (edge.target !== draggedNode) {
      edge.target.vx -= forceX;
      edge.target.vy -= forceY;
    }
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d2 = dx * dx + dy * dy || 1;
      const d = Math.sqrt(d2);

      const minSepDist = 14;

      if (d < minSepDist) {
        const push = (minSepDist - d) / minSepDist;
        const fx = (dx / d) * push * 1.2;
        const fy = (dy / d) * push * 1.2;

        if (n1 !== draggedNode) {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (n2 !== draggedNode) {
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }
  }

  const pad = 30;
  nodes.forEach(node => {
    if (node === draggedNode) return;

    node.vx *= params.damping;
    node.vy *= params.damping;

    node.x += node.vx;
    node.y += node.vy;

    if (node.x < pad) { node.x = pad; node.vx *= -0.5; }
    if (node.x > width - pad) { node.x = width - pad; node.vx *= -0.5; }
    if (node.y < pad) { node.y = pad; node.vy *= -0.5; }
    if (node.y > height - pad) { node.y = height - pad; node.vy *= -0.5; }
  });

  nodes.forEach(n => {
    let neighborCount = 0;
    nodes.forEach(other => {
      if (n.id !== other.id && dist(n, other) <= params.epsilon) {
        neighborCount++;
      }
    });
    n.isCore = neighborCount >= params.minPts;
  });
}
