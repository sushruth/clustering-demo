function loadPreset(name) {
  if (name === 'wellSeparated') {
    setSliderValue('slider-cohesion', 'val-cohesion', 120, '%');
    setSliderValue('slider-separation', 'val-separation', 260, 'px');
    setSliderValue('slider-coupling', 'val-coupling', 0, ' edges');
    setSliderValue('slider-clusters', 'val-clusters', 3, ' groups');
    params.cohesion = 120;
    params.separation = 260;
    params.couplingEdges = 0;
    params.k = 3;
    buildGraph(3, { bridgePts: 0, outliers: 2 });
  } else if (name === 'highCoupling') {
    setSliderValue('slider-cohesion', 'val-cohesion', 60, '%');
    setSliderValue('slider-separation', 'val-separation', 140, 'px');
    setSliderValue('slider-coupling', 'val-coupling', 18, ' edges');
    setSliderValue('slider-clusters', 'val-clusters', 3, ' groups');
    params.cohesion = 60;
    params.separation = 140;
    params.couplingEdges = 18;
    params.k = 3;
    buildGraph(3, { bridgePts: 14 });
  } else if (name === 'diffuse') {
    setSliderValue('slider-cohesion', 'val-cohesion', 20, '%');
    setSliderValue('slider-separation', 'val-separation', 60, 'px');
    setSliderValue('slider-coupling', 'val-coupling', 8, ' edges');
    setSliderValue('slider-clusters', 'val-clusters', 4, ' groups');
    params.cohesion = 20;
    params.separation = 60;
    params.couplingEdges = 8;
    params.k = 4;
    buildGraph(4, { sigmaMul: 1.3, bridgePts: 10 });
  } else if (name === 'outlierSkew') {
    setSliderValue('slider-cohesion', 'val-cohesion', 90, '%');
    setSliderValue('slider-separation', 'val-separation', 190, 'px');
    setSliderValue('slider-coupling', 'val-coupling', 1, ' edges');
    setSliderValue('slider-clusters', 'val-clusters', 3, ' groups');
    params.cohesion = 90;
    params.separation = 190;
    params.couplingEdges = 1;
    params.k = 3;
    buildGraph(3, { outliers: 9, outlierDist: 190 });
  } else if (name === 'densityChains') {
    setSliderValue('slider-cohesion', 'val-cohesion', 65, '%');
    setSliderValue('slider-separation', 'val-separation', 160, 'px');
    setSliderValue('slider-coupling', 'val-coupling', 2, ' edges');
    setSliderValue('slider-epsilon', 'val-epsilon', 55, 'px');
    params.cohesion = 65;
    params.separation = 160;
    params.couplingEdges = 2;
    params.epsilon = 55;
    buildGraph(3, { elong: 2.6, bridgePts: 4 });
  }
}
