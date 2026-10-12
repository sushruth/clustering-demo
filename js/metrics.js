function dist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distSq(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function calculateClusterAnchors() {
  const anchors = [];
  for (let c = 0; c < params.k; c++) {
    const members = nodes.filter(n => n.cluster === c);
    if (members.length === 0) continue;

    let sumX = 0, sumY = 0;
    members.forEach(m => {
      sumX += m.x;
      sumY += m.y;
    });
    const centroid = { x: sumX / members.length, y: sumY / members.length, cluster: c };

    let bestMedoid = members[0];
    let minTotalDist = Infinity;
    for (let i = 0; i < members.length; i++) {
      let totalD = 0;
      for (let j = 0; j < members.length; j++) {
        totalD += dist(members[i], members[j]);
      }
      if (totalD < minTotalDist) {
        minTotalDist = totalD;
        bestMedoid = members[i];
      }
    }

    let maxRadius = 0;
    let sumDistToCentroid = 0;
    members.forEach(m => {
      const d = dist(m, centroid);
      if (d > maxRadius) maxRadius = d;
      sumDistToCentroid += d;
    });

    anchors.push({
      cluster: c,
      centroid,
      medoid: bestMedoid,
      memberCount: members.length,
      maxRadius,
      meanRadius: sumDistToCentroid / members.length
    });
  }
  return anchors;
}

function computeClusteringMetrics(anchors) {
  if (nodes.length === 0 || anchors.length === 0) return {};

  let totalIntraDist = 0;
  let intraPairs = 0;
  let inertia = 0;

  for (let i = 0; i < nodes.length; i++) {
    const anchor = anchors.find(a => a.cluster === nodes[i].cluster);
    if (anchor) {
      inertia += distSq(nodes[i], anchor.centroid);
    }
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].cluster === nodes[j].cluster) {
        totalIntraDist += dist(nodes[i], nodes[j]);
        intraPairs++;
      }
    }
  }
  const meanCohesion = intraPairs > 0 ? (totalIntraDist / intraPairs) : 0;

  let totalInterCentroidDist = 0;
  let minInterCentroidDist = Infinity;
  let centroidPairs = 0;

  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const d = dist(anchors[i].centroid, anchors[j].centroid);
      totalInterCentroidDist += d;
      if (d < minInterCentroidDist) minInterCentroidDist = d;
      centroidPairs++;
    }
  }
  const meanSeparation = centroidPairs > 0 ? (totalInterCentroidDist / centroidPairs) : 0;
  if (minInterCentroidDist === Infinity) minInterCentroidDist = 0;

  let totalSilhouette = 0;
  nodes.forEach(node => {
    const { a, b, s } = computeNodeSilhouette(node);
    node.silhouette = s;
    node.a = a;
    node.b = b;
    totalSilhouette += s;
  });
  const meanSilhouette = nodes.length > 0 ? totalSilhouette / nodes.length : 0;

  const crossEdges = edges.filter(e => e.isCross).length;
  const totalEdges = edges.length;
  const conductance = totalEdges > 0 ? (crossEdges / totalEdges) : 0;

  let dbSum = 0;
  if (anchors.length > 1) {
    for (let i = 0; i < anchors.length; i++) {
      let maxR = -Infinity;
      for (let j = 0; j < anchors.length; j++) {
        if (i === j) continue;
        const M_ij = dist(anchors[i].centroid, anchors[j].centroid);
        if (M_ij > 0.001) {
          const R = (anchors[i].meanRadius + anchors[j].meanRadius) / M_ij;
          if (R > maxR) maxR = R;
        }
      }
      if (maxR !== -Infinity) dbSum += maxR;
    }
  }
  const daviesBouldin = anchors.length > 1 ? (dbSum / anchors.length) : 0;

  let maxDiameter = 0;
  anchors.forEach(a => {
    if (a.maxRadius * 2 > maxDiameter) maxDiameter = a.maxRadius * 2;
  });
  const dunnIndex = maxDiameter > 0 ? (minInterCentroidDist / maxDiameter) : 0;

  return {
    cohesion: meanCohesion,
    separation: meanSeparation,
    silhouette: meanSilhouette,
    cutSize: crossEdges,
    conductance: conductance,
    daviesBouldin: daviesBouldin,
    dunnIndex: dunnIndex,
    inertia: Math.round(inertia)
  };
}

function computeNodeSilhouette(node) {
  const sameClusterNodes = nodes.filter(n => n.cluster === node.cluster && n.id !== node.id);
  
  let a = 0;
  if (sameClusterNodes.length > 0) {
    let sumA = 0;
    sameClusterNodes.forEach(other => sumA += dist(node, other));
    a = sumA / sameClusterNodes.length;
  }

  let b = Infinity;
  for (let c = 0; c < params.k; c++) {
    if (c === node.cluster) continue;
    const otherClusterNodes = nodes.filter(n => n.cluster === c);
    if (otherClusterNodes.length > 0) {
      let sumDist = 0;
      otherClusterNodes.forEach(o => sumDist += dist(node, o));
      const avgDist = sumDist / otherClusterNodes.length;
      if (avgDist < b) b = avgDist;
    }
  }

  if (b === Infinity) b = 0;

  const maxAB = Math.max(a, b);
  const s = maxAB > 0.0001 ? (b - a) / maxAB : 0;
  return { a, b, s };
}
