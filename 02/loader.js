/*
 * CS460 Assignment 2 - Loader
 * Handles serialization (download) and deserialization (upload) of 3D cube scenes.
 */

// Function to download the scene as a JSON file
function download() {
  var ALL_CUBES = [];

  // Determine source of cubes:
  // Check tracked cubes list or inspect r.Ha (XTK internal scene objects)
  var sourceList = [];
  if (window.placedCubes && window.placedCubes.length > 0) {
    sourceList = window.placedCubes;
  } else if (window.r && window.r.Ha) {
    for (var j = 0; j < window.r.Ha.length; j++) {
      if (window.r.Ha[j] !== window.c) {
        sourceList.push(window.r.Ha[j]);
      }
    }
  }

  for (var i = 0; i < sourceList.length; i++) {
    var obj = sourceList[i];
    if (obj === window.c) continue; // Skip cursor cube

    var color = [obj.color[0], obj.color[1], obj.color[2]];
    var matrix = Array.from(obj.transform.matrix);
    ALL_CUBES.push([color, matrix]);
  }

  // Create JSON output object
  var out = {};
  out['cubes'] = ALL_CUBES;
  out['camera'] = (window.CAMERAS || []).map(function(cam) {
    return Array.from(cam);
  });

  // Convert to downloadable data URI
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(out, null, 2));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "scene.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

  if (window.showToast) {
    window.showToast("Scene downloaded (" + ALL_CUBES.length + " cubes, " + (window.CAMERAS ? window.CAMERAS.length : 0) + " cameras)");
  }
}

// Function to upload/load a scene JSON file
function upload(scene) {
  // If scene is a File object (from file input)
  if (scene instanceof File) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        parseSceneData(parsed);
      } catch (err) {
        console.error("Error parsing JSON file:", err);
        if (window.showToast) window.showToast("Failed to parse JSON file!", true);
      }
    };
    reader.readAsText(scene);
    return;
  }

  // If scene is already a parsed object
  if (typeof scene === 'object' && scene !== null) {
    parseSceneData(scene);
    return;
  }

  // Otherwise treat as URL string
  var req = new XMLHttpRequest();
  req.responseType = 'json';
  req.open('GET', scene, true);
  req.onload = function() {
    if (req.status === 200 || req.status === 0) { // 0 for local files if allowed
      var loaded = req.response;
      if (typeof loaded === 'string') {
        try { loaded = JSON.parse(loaded); } catch (e) {}
      }
      if (loaded) {
        parseSceneData(loaded);
      } else {
        console.error("No JSON response received from", scene);
      }
    } else {
      console.warn("XHR failed with status", req.status, "for", scene);
      // Fallback: If loading local default scene fails due to browser CORS restriction on file://,
      // try loading from embedded default scene if defined in app.js
      if (window.loadEmbeddedDefaultScene) {
        window.loadEmbeddedDefaultScene();
      }
    }
  };
  req.onerror = function(err) {
    console.warn("XHR network error when loading:", scene, err);
    if (window.loadEmbeddedDefaultScene) {
      window.loadEmbeddedDefaultScene();
    }
  };
  try {
    req.send(null);
  } catch (e) {
    console.warn("XHR send exception:", e);
    if (window.loadEmbeddedDefaultScene) {
      window.loadEmbeddedDefaultScene();
    }
  }
}

// Helper to parse scene JSON structure and populate the renderer
function parseSceneData(loaded) {
  if (!loaded || !loaded['cubes']) {
    console.error("Invalid scene format:", loaded);
    if (window.showToast) window.showToast("Invalid scene JSON format!", true);
    return;
  }

  // Clear existing placed cubes first
  if (window.clearAllCubes) {
    window.clearAllCubes(false); // don't clear camera
  }

  var count = 0;
  // Parse cubes
  for (var i = 0; i < loaded['cubes'].length; i++) {
    var cubeData = loaded['cubes'][i];
    var color = cubeData[0];
    var matrix = cubeData[1];

    var loaded_cube = new X.cube();
    loaded_cube.color = [color[0], color[1], color[2]];
    loaded_cube.transform.matrix = new Float32Array(Object.values(matrix));
    loaded_cube.lengthX = loaded_cube.lengthY = loaded_cube.lengthZ = window.CUBE_SIDELENGTH || 10;

    r.add(loaded_cube);
    if (window.registerCube) {
      window.registerCube(loaded_cube);
    } else if (window.placedCubes) {
      window.placedCubes.push(loaded_cube);
    }
    count++;
  }

  // Restore camera views
  if (loaded['camera'] && loaded['camera'].length > 0) {
    window.CAMERAS = [];
    for (var c = 0; c < loaded['camera'].length; c++) {
      window.CAMERAS.push(new Float32Array(Object.values(loaded['camera'][c])));
    }
    // Set active camera to first saved view
    r.camera.view = new Float32Array(window.CAMERAS[0]);
  }

  if (window.updateStats) window.updateStats();
  if (window.showToast) {
    window.showToast("Loaded " + count + " cubes" + (loaded['camera'] ? " & " + loaded['camera'].length + " cameras" : ""));
  }
}
