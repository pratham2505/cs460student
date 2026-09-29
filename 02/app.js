/*
 * CS460 Assignment 2 - Advanced 3D Cube Art Visualization & Studio
 * Powered by XTK (The X Toolkit) WebGL Framework
 *
 * Features:
 *  - Full CS460 Assignment 2 Standard Compliance:
 *      WASD + QE Movement, 0-9 Color selection, Space to place,
 *      O to download scene.json, L to upload scene.json,
 *      C to push camera view, V to toggle camera switching loop.
 *  - Amazing Visual Art Sculptures (DNA Helix, Cyber City, Ocean Wave, Galaxy Spiral, Voxel Heart, Torus)
 *  - Flying Cubes Mode (Zero-G levitation and 3D flight paths)
 *  - Supernova Mode (Explosive cosmic scattering and magnetic reassembly)
 *  - Wave Ripple Dance (Dynamic real-time mathematical ripple)
 *  - Rainbow Chromatic Shift (Real-time HSV spectral morphing)
 *  - Cinematic Auto-Orbit Camera
 *  - Modern Cyberpunk Glassmorphic HUD overlay with touch & mouse controls
 */

// Sidelengths and gap according to assignment specification
const CUBE_SIDELENGTH = 10;
const CUBE_SIDELENGTH_PLACE = 10.1;
const GAP = 2;
const STEP = CUBE_SIDELENGTH + GAP; // 12 units

// Camera storage array according to assignment specification
var CAMERAS = [];

// Array tracking all placed cubes
var placedCubes = [];

// Renderer and interactive cursor cube instances
var r = null;
var c = null;

// Interval ID for camera switching (Key V)
var intervalID = null;
var currCamIndex = 0;

// Animation & Visualization state
var animTime = 0;
var flyingMode = false;
var waveMode = false;
var rainbowMode = false;
var autoOrbit = false;
var supernovaState = 'idle'; // 'idle', 'exploding', 'reassembling'
var supernovaFactor = 0; // 0 (normal) to 1 (fully exploded)

// Color palette matching digits 0-9
const PALETTE = [
  { name: 'Black',   color: [0, 0, 0] },             // 0
  { name: 'White',   color: [1, 1, 1] },             // 1
  { name: 'Red',     color: [1, 0, 0] },             // 2
  { name: 'Green',   color: [0, 1, 0] },             // 3
  { name: 'Blue',    color: [0, 0, 1] },             // 4
  { name: 'Yellow',  color: [1, 1, 0] },             // 5
  { name: 'Pink',    color: [1, 0, 1] },             // 6
  { name: 'Cyan',    color: [0, 1, 1] },             // 7
  { name: 'Orange',  color: [1, 0.65, 0] },          // 8
  { name: 'Brick',   color: [0.66, 0.3, 0.26] }      // 9
];

var currentColorIndex = 7; // Default to Cyan

// Helper: Convert HSV to RGB
function hsvToRgb(h, s, v) {
  var r, g, b;
  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r, g, b];
}

// Register a newly added cube into the animation engine
function registerCube(cube) {
  cube.origMatrix = new Float32Array(cube.transform.matrix);
  cube.origX = cube.transform.matrix[12];
  cube.origY = cube.transform.matrix[13];
  cube.origZ = cube.transform.matrix[14];
  cube.origColor = [cube.color[0], cube.color[1], cube.color[2]];

  // Assign deterministic yet pseudo-random movement seeds
  var seed = (cube.origX * 73 + cube.origY * 37 + cube.origZ * 19) % 1000;
  cube.animPhase = (seed / 1000) * Math.PI * 2;
  cube.flySpeed = 0.6 + ((seed % 100) / 100) * 0.8;

  // Compute radial explosion vector away from center
  var dist = Math.sqrt(cube.origX * cube.origX + cube.origY * cube.origY + cube.origZ * cube.origZ) || 1;
  cube.radialDir = [
    (cube.origX / dist) + (Math.sin(cube.animPhase) * 0.3),
    (cube.origY / dist) + (Math.cos(cube.animPhase) * 0.3),
    (cube.origZ / dist) + (Math.sin(cube.animPhase * 2) * 0.3)
  ];
  cube.explodeDist = 60 + ((seed % 80));

  placedCubes.push(cube);
  updateStats();
}

// Clear all placed cubes from the scene
function clearAllCubes(clearCameras) {
  for (var i = 0; i < placedCubes.length; i++) {
    placedCubes[i].visible = false;
  }
  placedCubes = [];
  if (clearCameras) {
    CAMERAS = [];
    if (intervalID !== null) {
      clearInterval(intervalID);
      intervalID = null;
    }
  }
  updateStats();
  showToast("Scene cleared");
}

// Update UI stats display
function updateStats() {
  var countEl = document.getElementById('cube-count');
  if (countEl) countEl.innerText = placedCubes.length;
  var camCountEl = document.getElementById('cam-count');
  if (camCountEl) camCountEl.innerText = CAMERAS.length;
}

// Display subtle notification toast in the UI
function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.85)';
  toast.style.borderColor = isError ? '#ef4444' : '#06b6d4';
  toast.classList.add('show');
  clearTimeout(toast.hideTimeout);
  toast.hideTimeout = setTimeout(function() {
    toast.classList.remove('show');
  }, 2200);
}

// Set active drawing color
function selectColor(index) {
  if (index < 0 || index >= PALETTE.length) return;
  currentColorIndex = index;
  if (c) {
    c.color = [PALETTE[index].color[0], PALETTE[index].color[1], PALETTE[index].color[2]];
  }
  // Update palette active states in DOM
  for (var i = 0; i < 10; i++) {
    var btn = document.getElementById('swatch-' + i);
    if (btn) {
      if (i === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
  var nameEl = document.getElementById('active-color-name');
  if (nameEl) nameEl.innerText = PALETTE[index].name + " [" + index + "]";
}

// Place a cube at the current cursor position
function dropCube() {
  if (!c || !r) return;
  var new_cube = new X.cube();
  new_cube.color = [c.color[0], c.color[1], c.color[2]];
  new_cube.transform.matrix = new Float32Array(c.transform.matrix);
  new_cube.lengthX = new_cube.lengthY = new_cube.lengthZ = CUBE_SIDELENGTH;

  r.add(new_cube);
  registerCube(new_cube);
}

// Camera switching logic (standard Assignment 2)
function switchCamera() {
  if (CAMERAS.length === 0) return;
  if (currCamIndex >= CAMERAS.length) {
    currCamIndex = 0;
  }
  r.camera.view = new Float32Array(CAMERAS[currCamIndex]);
  showToast("Camera View " + (currCamIndex + 1) + " / " + CAMERAS.length);
  currCamIndex++;
}

// Toggle camera switching loop (Key V)
function toggleCameraLoop() {
  var vBtn = document.getElementById('btn-camera-loop');
  if (intervalID == null) {
    if (CAMERAS.length === 0) {
      showToast("No camera views saved! Press 'C' to save first.", true);
      return;
    }
    intervalID = setInterval(switchCamera, 1000);
    if (vBtn) vBtn.classList.add('active');
    showToast("Camera tour started");
  } else {
    clearInterval(intervalID);
    intervalID = null;
    if (vBtn) vBtn.classList.remove('active');
    showToast("Camera tour paused");
  }
}

// Smooth camera orbit around world Z axis
function orbitCameraStep(angleRad) {
  if (!r || !r.camera || !r.camera.view) return;
  var V = r.camera.view;
  var cosA = Math.cos(angleRad);
  var sinA = Math.sin(angleRad);

  // Column-major 4x4 matrix multiplication with R_z(angleRad)
  for (var row = 0; row < 4; row++) {
    var v0 = V[row];
    var v1 = V[row + 4];
    V[row]     =  cosA * v0 + sinA * v1;
    V[row + 4] = -sinA * v0 + cosA * v1;
  }
}

// Trigger Supernova explosion / reassembly
function triggerSupernova() {
  if (supernovaState === 'idle' || supernovaState === 'reassembling') {
    supernovaState = 'exploding';
    showToast("Supernova: Cubes exploding into cosmos! 💥");
  } else {
    supernovaState = 'reassembling';
    showToast("Supernova: Magnetic reassembly! 🧲");
  }
  updateToggleButtons();
}

// Toggle flying cubes mode
function toggleFlying() {
  flyingMode = !flyingMode;
  showToast(flyingMode ? "Zero-G Flight Mode ENABLED 🚀" : "Zero-G Flight Mode DISABLED");
  updateToggleButtons();
}

// Toggle wave mode
function toggleWave() {
  waveMode = !waveMode;
  showToast(waveMode ? "Wave Ripple ENABLED 🌊" : "Wave Ripple DISABLED");
  updateToggleButtons();
}

// Toggle rainbow mode
function toggleRainbow() {
  rainbowMode = !rainbowMode;
  showToast(rainbowMode ? "Rainbow Flow ENABLED 🌈" : "Rainbow Flow DISABLED");
  updateToggleButtons();
}

// Toggle camera auto-orbit
function toggleOrbit() {
  autoOrbit = !autoOrbit;
  showToast(autoOrbit ? "Auto-Orbit ENABLED 🛸" : "Auto-Orbit DISABLED");
  updateToggleButtons();
}

// Update DOM button active classes
function updateToggleButtons() {
  var flyBtn = document.getElementById('btn-toggle-fly');
  if (flyBtn) flyBtn.classList.toggle('active', flyingMode);

  var waveBtn = document.getElementById('btn-toggle-wave');
  if (waveBtn) waveBtn.classList.toggle('active', waveMode);

  var rainbowBtn = document.getElementById('btn-toggle-rainbow');
  if (rainbowBtn) rainbowBtn.classList.toggle('active', rainbowMode);

  var orbitBtn = document.getElementById('btn-toggle-orbit');
  if (orbitBtn) orbitBtn.classList.toggle('active', autoOrbit);

  var novaBtn = document.getElementById('btn-supernova');
  if (novaBtn) {
    if (supernovaState === 'exploding') {
      novaBtn.classList.add('active');
      novaBtn.innerText = "🧲 Reassemble";
    } else {
      novaBtn.classList.remove('active');
      novaBtn.innerText = "💥 Supernova";
    }
  }
}

// ---------------------------------------------------------
// Art Presets Generators
// ---------------------------------------------------------

function loadPreset(name) {
  clearAllCubes(false);
  CAMERAS = [];

  switch (name) {
    case 'dna':
      buildDnaHelix();
      break;
    case 'city':
      buildCyberCity();
      break;
    case 'wave':
      buildWaveOcean();
      break;
    case 'galaxy':
      buildGalaxySpiral();
      break;
    case 'heart':
      buildVoxelHeart();
      break;
    case 'torus':
      buildTorus();
      break;
    default:
      buildDnaHelix();
      break;
  }

  // Pre-seed some dramatic camera views for the preset
  CAMERAS.push(new Float32Array(r.camera.view));

  // Store a second slightly elevated/rotated view
  orbitCameraStep(Math.PI / 3);
  CAMERAS.push(new Float32Array(r.camera.view));

  // Store a third view
  orbitCameraStep(Math.PI / 3);
  CAMERAS.push(new Float32Array(r.camera.view));

  // Reset back to initial
  r.camera.view = new Float32Array(CAMERAS[0]);
  currCamIndex = 0;
  updateStats();
}

// Helper to spawn a cube at specific coordinate and color
function spawnCubeAt(x, y, z, color) {
  var cube = new X.cube();
  cube.color = [color[0], color[1], color[2]];
  cube.transform.translateX(x);
  cube.transform.translateY(y);
  cube.transform.translateZ(z);
  cube.lengthX = cube.lengthY = cube.lengthZ = CUBE_SIDELENGTH;
  r.add(cube);
  registerCube(cube);
  return cube;
}

// Preset 1: Cosmic DNA Helix
function buildDnaHelix() {
  var radius = 36;
  var turns = 3;
  var totalSteps = 42;
  var heightRange = 180;
  var startZ = -heightRange / 2;

  for (var i = 0; i <= totalSteps; i++) {
    var progress = i / totalSteps;
    var theta = progress * Math.PI * 2 * turns;
    var z = startZ + progress * heightRange;

    var x1 = Math.round((radius * Math.cos(theta)) / STEP) * STEP;
    var y1 = Math.round((radius * Math.sin(theta)) / STEP) * STEP;
    var x2 = -x1;
    var y2 = -y1;

    // Strand 1: Cyan to Blue
    var c1 = [0, 1 - progress * 0.5, 1];
    spawnCubeAt(x1, y1, z, c1);

    // Strand 2: Magenta to Pink
    var c2 = [1, 0, 1 - progress * 0.4];
    spawnCubeAt(x2, y2, z, c2);

    // Connecting base-pair rungs every 3rd step
    if (i % 3 === 0) {
      var rungs = 3;
      for (var k = 1; k <= rungs; k++) {
        var t = k / (rungs + 1);
        var rx = Math.round((x1 + (x2 - x1) * t) / STEP) * STEP;
        var ry = Math.round((y1 + (y2 - y1) * t) / STEP) * STEP;
        var rungColor = (i % 6 === 0) ? [1, 0.85, 0] : [0, 1, 0]; // Yellow or Green
        spawnCubeAt(rx, ry, z, rungColor);
      }
    }
  }
  showToast("Loaded: Cosmic DNA Helix (Dual Strand)");
}

// Preset 2: Cyberpunk Metropolis
function buildCyberCity() {
  // Central Tower
  for (var z = 0; z < 10; z++) {
    var height = z * STEP;
    var cColor = (z >= 8) ? [0, 1, 1] : (z % 2 === 0 ? [0.66, 0.3, 0.26] : [0, 0, 0]);
    spawnCubeAt(0, 0, height, cColor);
    if (z < 6) {
      spawnCubeAt(STEP, 0, height, [0.2, 0.2, 0.2]);
      spawnCubeAt(-STEP, 0, height, [0.2, 0.2, 0.2]);
      spawnCubeAt(0, STEP, height, [0.2, 0.2, 0.2]);
      spawnCubeAt(0, -STEP, height, [0.2, 0.2, 0.2]);
    }
  }
  // Antenna needle
  spawnCubeAt(0, 0, 10 * STEP, [1, 0, 0]);
  spawnCubeAt(0, 0, 11 * STEP, [1, 1, 1]);

  // Satellite Towers
  var offsets = [
    [-3 * STEP, -3 * STEP],
    [3 * STEP, -3 * STEP],
    [-3 * STEP, 3 * STEP],
    [3 * STEP, 3 * STEP]
  ];

  offsets.forEach(function(pos, idx) {
    var towerH = 5 + (idx % 3);
    for (var tz = 0; tz < towerH; tz++) {
      var col = (tz === towerH - 1) ? [1, 0.65, 0] : [0.15, 0.15, 0.15];
      spawnCubeAt(pos[0], pos[1], tz * STEP, col);
    }
    // Skybridge to center at tier 3
    var midX = Math.round(pos[0] / 2 / STEP) * STEP;
    var midY = Math.round(pos[1] / 2 / STEP) * STEP;
    spawnCubeAt(midX, midY, 3 * STEP, [0, 1, 1]);
  });

  showToast("Loaded: Cyberpunk Metropolis & Skybridges");
}

// Preset 3: Undulating Voxel Wave Ocean
function buildWaveOcean() {
  var size = 9;
  var half = Math.floor(size / 2);

  for (var ix = -half; ix <= half; ix++) {
    for (var iy = -half; iy <= half; iy++) {
      var x = ix * STEP;
      var y = iy * STEP;
      var dist = Math.sqrt(ix * ix + iy * iy);
      var heightLevel = Math.round(Math.sin(dist * 0.7) * 2);
      var z = heightLevel * STEP;

      var col;
      if (heightLevel >= 1) col = [0, 1, 1]; // Peak cyan
      else if (heightLevel === 0) col = [0, 0.5, 1]; // Ocean blue
      else col = [0.1, 0.1, 0.6]; // Deep trench

      spawnCubeAt(x, y, z, col);
    }
  }
  showToast("Loaded: Undulating Voxel Wave Surface");
}

// Preset 4: Quantum Spiral Galaxy
function buildGalaxySpiral() {
  var arms = 3;
  var cubesPerArm = 22;
  var a = 8;
  var b = 0.22;

  // Center supermassive core
  spawnCubeAt(0, 0, 0, [1, 1, 1]);
  spawnCubeAt(STEP, 0, 0, [1, 1, 0]);
  spawnCubeAt(-STEP, 0, 0, [1, 1, 0]);
  spawnCubeAt(0, STEP, 0, [1, 1, 0]);
  spawnCubeAt(0, -STEP, 0, [1, 1, 0]);

  for (var arm = 0; arm < arms; arm++) {
    var armAngleOffset = (arm * Math.PI * 2) / arms;
    for (var i = 1; i <= cubesPerArm; i++) {
      var theta = i * 0.32;
      var rVal = a * Math.exp(b * theta) + (i * 2);
      var totalAngle = theta + armAngleOffset;

      var x = Math.round((rVal * Math.cos(totalAngle)) / STEP) * STEP;
      var y = Math.round((rVal * Math.sin(totalAngle)) / STEP) * STEP;
      var z = Math.round(Math.sin(theta * 1.5) * STEP);

      var progress = i / cubesPerArm;
      var col;
      if (progress < 0.3) col = [1, 0.85, 0]; // Warm gold core
      else if (progress < 0.7) col = [1, 0, 1]; // Magenta middle
      else col = [0, 1, 1]; // Cyan outer fringe

      spawnCubeAt(x, y, z, col);
    }
  }
  showToast("Loaded: Quantum Spiral Galaxy (3-Arm Vortex)");
}

// Preset 5: 3D Retro Voxel Heart
function buildVoxelHeart() {
  // A stepped 3D heart layer-by-layer
  var heartShape = [
    // z = 2 (top lobes)
    { x: -1, y: 1, z: 2, c: [1, 0, 0.4] },
    { x: -2, y: 1, z: 2, c: [1, 0, 0.4] },
    { x: 1, y: 1, z: 2, c: [1, 0, 0.4] },
    { x: 2, y: 1, z: 2, c: [1, 0, 0.4] },

    // z = 1 (wide chest)
    { x: -3, y: 0, z: 1, c: [1, 0, 0] },
    { x: -2, y: 0, z: 1, c: [1, 0, 0] },
    { x: -1, y: 0, z: 1, c: [1, 0.2, 0.2] },
    { x: 0, y: 0, z: 1, c: [1, 0.8, 0.8] }, // highlight core
    { x: 1, y: 0, z: 1, c: [1, 0.2, 0.2] },
    { x: 2, y: 0, z: 1, c: [1, 0, 0] },
    { x: 3, y: 0, z: 1, c: [1, 0, 0] },

    { x: -2, y: 1, z: 1, c: [1, 0, 0] },
    { x: -1, y: 1, z: 1, c: [1, 0, 0] },
    { x: 0, y: 1, z: 1, c: [1, 0, 0] },
    { x: 1, y: 1, z: 1, c: [1, 0, 0] },
    { x: 2, y: 1, z: 1, c: [1, 0, 0] },

    { x: -2, y: -1, z: 1, c: [0.8, 0, 0] },
    { x: -1, y: -1, z: 1, c: [0.8, 0, 0] },
    { x: 0, y: -1, z: 1, c: [0.8, 0, 0] },
    { x: 1, y: -1, z: 1, c: [0.8, 0, 0] },
    { x: 2, y: -1, z: 1, c: [0.8, 0, 0] },

    // z = 0 (tapering)
    { x: -2, y: 0, z: 0, c: [0.8, 0, 0] },
    { x: -1, y: 0, z: 0, c: [0.9, 0, 0] },
    { x: 0, y: 0, z: 0, c: [1, 0, 0] },
    { x: 1, y: 0, z: 0, c: [0.9, 0, 0] },
    { x: 2, y: 0, z: 0, c: [0.8, 0, 0] },

    { x: -1, y: -1, z: 0, c: [0.7, 0, 0] },
    { x: 0, y: -1, z: 0, c: [0.7, 0, 0] },
    { x: 1, y: -1, z: 0, c: [0.7, 0, 0] },

    // z = -1 (point)
    { x: -1, y: 0, z: -1, c: [0.7, 0, 0] },
    { x: 0, y: 0, z: -1, c: [0.8, 0, 0] },
    { x: 1, y: 0, z: -1, c: [0.7, 0, 0] },

    // z = -2 (tip)
    { x: 0, y: 0, z: -2, c: [0.6, 0, 0] }
  ];

  heartShape.forEach(function(pt) {
    spawnCubeAt(pt.x * STEP, pt.y * STEP, pt.z * STEP, pt.c);
  });
  showToast("Loaded: 3D Crimson Voxel Heart ❤️");
}

// Preset 6: Sacred Mobius Torus
function buildTorus() {
  var majorRadius = 36;
  var minorRadius = 16;
  var majorSegments = 24;
  var minorSegments = 6;

  for (var i = 0; i < majorSegments; i++) {
    var u = (i / majorSegments) * Math.PI * 2;
    for (var j = 0; j < minorSegments; j++) {
      var v = (j / minorSegments) * Math.PI * 2;

      var x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
      var y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
      var z = minorRadius * Math.sin(v);

      var sx = Math.round(x / STEP) * STEP;
      var sy = Math.round(y / STEP) * STEP;
      var sz = Math.round(z / STEP) * STEP;

      var hue = (i / majorSegments);
      var col = hsvToRgb(hue, 0.85, 0.95);
      spawnCubeAt(sx, sy, sz, col);
    }
  }
  showToast("Loaded: Sacred Geometric Torus");
}

// Embedded default fallback in case scene.json cannot be fetched due to file:// CORS
function loadEmbeddedDefaultScene() {
  loadPreset('dna');
}

// ---------------------------------------------------------
// Main Window Onload Initializer
// ---------------------------------------------------------
window.onload = function() {
  // Create and initialize 3D XTK renderer
  r = new X.renderer3D();
  r.init();

  // Create placement/cursor cube with length 10.1
  c = new X.cube();
  c.lengthX = c.lengthY = c.lengthZ = CUBE_SIDELENGTH_PLACE;
  c.color = [PALETTE[currentColorIndex].color[0], PALETTE[currentColorIndex].color[1], PALETTE[currentColorIndex].color[2]];
  r.add(c);

  // Position camera for good viewing perspective
  r.camera.position = [0, 0, 260];

  // Initialize render loop
  r.render();

  // Setup per-frame animation hook in XTK
  r.onRender = function() {
    animTime += 0.04;

    // 1. Camera Auto-Orbit
    if (autoOrbit) {
      orbitCameraStep(0.008);
    }

    // 2. Supernova Transition
    if (supernovaState === 'exploding') {
      supernovaFactor = Math.min(1, supernovaFactor + 0.025);
    } else if (supernovaState === 'reassembling') {
      supernovaFactor = Math.max(0, supernovaFactor - 0.035);
      if (supernovaFactor === 0) {
        supernovaState = 'idle';
        updateToggleButtons();
      }
    }

    var hasActiveMotion = flyingMode || waveMode || (supernovaFactor > 0);

    // Animate every placed cube
    for (var i = 0; i < placedCubes.length; i++) {
      var cube = placedCubes[i];
      if (!cube || !cube.transform) continue;

      var posX = cube.origX;
      var posY = cube.origY;
      var posZ = cube.origZ;

      // Supernova explosion offset
      if (supernovaFactor > 0) {
        var ease = Math.sin(supernovaFactor * Math.PI * 0.5);
        posX += cube.radialDir[0] * cube.explodeDist * ease * 2.5;
        posY += cube.radialDir[1] * cube.explodeDist * ease * 2.5;
        posZ += cube.radialDir[2] * cube.explodeDist * ease * 2.5;
      }

      // Flying zero-g trajectory
      if (flyingMode) {
        var spd = cube.flySpeed;
        var ph = cube.animPhase;
        posX += 18 * Math.sin(animTime * spd + ph);
        posY += 18 * Math.cos(animTime * 0.8 * spd + ph * 1.3);
        posZ += 24 * Math.sin(animTime * 1.2 * spd + ph * 0.7);

        // Spin each flying cube on its local axes
        cube.transform.rotateX(0.7 * spd);
        cube.transform.rotateY(0.9 * spd);
      }

      // Wave ripple oscillation
      if (waveMode) {
        var dist = Math.sqrt(cube.origX * cube.origX + cube.origY * cube.origY);
        posZ += 18 * Math.sin(animTime * 2.5 - dist * 0.08);
      }

      // Smoothly update position if in motion
      if (hasActiveMotion) {
        cube.transform.matrix[12] = posX;
        cube.transform.matrix[13] = posY;
        cube.transform.matrix[14] = posZ;
      } else if (!hasActiveMotion && supernovaState === 'idle') {
        // Return to anchor position
        cube.transform.matrix[12] = cube.origX;
        cube.transform.matrix[13] = cube.origY;
        cube.transform.matrix[14] = cube.origZ;
      }

      // Rainbow spectral flow
      if (rainbowMode) {
        var hue = (animTime * 0.12 + (cube.origX + cube.origY + cube.origZ) * 0.003) % 1;
        if (hue < 0) hue += 1;
        cube.color = hsvToRgb(hue, 0.9, 0.95);
      } else {
        cube.color = [cube.origColor[0], cube.origColor[1], cube.origColor[2]];
      }
    }
  };

  // Keyboard Event Handlers according to CS460 Assignment 2
  window.addEventListener("keydown", function(e) {
    // Avoid interfering if typing in an input
    if (e.target && e.target.tagName === 'INPUT') return;

    switch (e.code) {
      // WASD + QE: Cursor Cube Movement
      case "KeyD": // Right (-X)
        c.transform.translateX(-STEP);
        break;
      case "KeyA": // Left (+X)
        c.transform.translateX(STEP);
        break;
      case "KeyW": // Up (+Z)
        c.transform.translateZ(STEP);
        break;
      case "KeyS": // Down (-Z)
        c.transform.translateZ(-STEP);
        break;
      case "KeyQ": // Forward (+Y)
        c.transform.translateY(STEP);
        break;
      case "KeyE": // Backward (-Y)
        c.transform.translateY(-STEP);
        break;

      // Color selection (Digits 0-9)
      case "Digit0": selectColor(0); break;
      case "Digit1": selectColor(1); break;
      case "Digit2": selectColor(2); break;
      case "Digit3": selectColor(3); break;
      case "Digit4": selectColor(4); break;
      case "Digit5": selectColor(5); break;
      case "Digit6": selectColor(6); break;
      case "Digit7": selectColor(7); break;
      case "Digit8": selectColor(8); break;
      case "Digit9": selectColor(9); break;

      // Space: Place new cube at cursor
      case "Space":
        e.preventDefault();
        dropCube();
        break;

      // Serialization (Key O and Key L)
      case "KeyO":
        download();
        break;
      case "KeyL":
        upload("scene.json");
        break;

      // Camera view storage & switching (Key C and Key V)
      case "KeyC":
        CAMERAS.push(new Float32Array(r.camera.view));
        updateStats();
        showToast("Saved Camera View #" + CAMERAS.length);
        break;
      case "KeyV":
        toggleCameraLoop();
        break;

      // Extra visualization shortcuts
      case "KeyF":
        toggleFlying();
        break;
      case "KeyR":
        toggleRainbow();
        break;
      case "KeyM":
        toggleWave();
        break;
      case "KeyT":
        toggleOrbit();
        break;
      case "KeyX":
        triggerSupernova();
        break;
      case "KeyH":
        toggleHelpModal();
        break;
      case "Escape":
        closeHelpModal();
        break;
    }
  });

  // Setup DOM UI Interactions
  setupUI();

  // Load initial impressive preset
  loadPreset('dna');
};

// Setup user interface listeners and controls
function setupUI() {
  // Build color palette buttons in DOM
  var paletteContainer = document.getElementById('palette-container');
  if (paletteContainer) {
    paletteContainer.innerHTML = '';
    PALETTE.forEach(function(item, idx) {
      var swatch = document.createElement('button');
      swatch.id = 'swatch-' + idx;
      swatch.className = 'swatch-btn' + (idx === currentColorIndex ? ' active' : '');
      var rgb255 = item.color.map(function(v) { return Math.round(v * 255); }).join(',');
      swatch.style.backgroundColor = 'rgb(' + rgb255 + ')';
      swatch.title = item.name + ' [' + idx + ']';
      swatch.onclick = function() { selectColor(idx); };
      paletteContainer.appendChild(swatch);
    });
  }

  // D-Pad / Movement buttons for touch/mouse
  var bindBtn = function(id, fn) {
    var el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  bindBtn('btn-mv-up', function() { c.transform.translateZ(STEP); });
  bindBtn('btn-mv-down', function() { c.transform.translateZ(-STEP); });
  bindBtn('btn-mv-left', function() { c.transform.translateX(STEP); });
  bindBtn('btn-mv-right', function() { c.transform.translateX(-STEP); });
  bindBtn('btn-mv-fwd', function() { c.transform.translateY(STEP); });
  bindBtn('btn-mv-back', function() { c.transform.translateY(-STEP); });
  bindBtn('btn-drop-cube', dropCube);

  // File I/O
  bindBtn('btn-download', download);
  bindBtn('btn-upload-default', function() { upload("scene.json"); });

  var fileInput = document.getElementById('file-upload-input');
  if (fileInput) {
    fileInput.onchange = function(e) {
      if (e.target.files && e.target.files[0]) {
        upload(e.target.files[0]);
      }
    };
  }
  bindBtn('btn-upload-file', function() {
    if (fileInput) fileInput.click();
  });

  // Camera actions
  bindBtn('btn-save-cam', function() {
    CAMERAS.push(new Float32Array(r.camera.view));
    updateStats();
    showToast("Saved Camera View #" + CAMERAS.length);
  });
  bindBtn('btn-camera-loop', toggleCameraLoop);

  // Animation toggles
  bindBtn('btn-toggle-fly', toggleFlying);
  bindBtn('btn-toggle-wave', toggleWave);
  bindBtn('btn-toggle-rainbow', toggleRainbow);
  bindBtn('btn-toggle-orbit', toggleOrbit);
  bindBtn('btn-supernova', triggerSupernova);

  // Presets
  bindBtn('preset-dna', function() { loadPreset('dna'); });
  bindBtn('preset-city', function() { loadPreset('city'); });
  bindBtn('preset-wave', function() { loadPreset('wave'); });
  bindBtn('preset-galaxy', function() { loadPreset('galaxy'); });
  bindBtn('preset-heart', function() { loadPreset('heart'); });
  bindBtn('preset-torus', function() { loadPreset('torus'); });
  bindBtn('btn-clear', function() { clearAllCubes(true); });

  // Help Modal
  bindBtn('btn-help', toggleHelpModal);
  bindBtn('btn-close-modal', closeHelpModal);
  var modalBackdrop = document.getElementById('help-modal');
  if (modalBackdrop) {
    modalBackdrop.onclick = function(e) {
      if (e.target === modalBackdrop) closeHelpModal();
    };
  }

  updateStats();
  selectColor(currentColorIndex);
}

function toggleHelpModal() {
  var modal = document.getElementById('help-modal');
  if (modal) modal.classList.toggle('open');
}

function closeHelpModal() {
  var modal = document.getElementById('help-modal');
  if (modal) modal.classList.remove('open');
}
