# CS460 Assignment 2 - XTK 3D Cube Art & Animation Studio

An interactive WebGL 3D cube art visualization studio powered by [XTK (The X Toolkit)](https://goxtk.com).

## 🚀 Features

### 1. CS460 Assignment 2 Standard Compliance
- **Interactive Cursor Cube (`c`)**: Real-time position preview with `length = 10.1` and `color`.
- **Full Keyboard Movement**:
  - `W` / `S`: Up / Down (+Z / -Z)
  - `A` / `D`: Left / Right (+X / -X)
  - `Q` / `E`: Forward / Backward (+Y / -Y)
- **10-Color Palette (Keys `0` to `9`)**:
  - `0`: Black `[0, 0, 0]`
  - `1`: White `[1, 1, 1]`
  - `2`: Red `[1, 0, 0]`
  - `3`: Green `[0, 1, 0]`
  - `4`: Blue `[0, 0, 1]`
  - `5`: Yellow `[1, 1, 0]`
  - `6`: Pink `[1, 0, 1]`
  - `7`: Cyan `[0, 1, 1]`
  - `8`: Orange `[1, 0.65, 0]`
  - `9`: Brick `[0.66, 0.3, 0.26]`
- **Place Cube (`Space`)**: Places a cube (`length = 10`) at the current position.
- **Scene Serialization**:
  - `O`: Save/Download `scene.json` containing all cube positions, matrices, colors, and camera viewpoints.
  - `L`: Load `scene.json` from the server or file upload.
- **Camera Views & Director Tour**:
  - `C`: Capture current camera viewpoint matrix to `CAMERAS`.
  - `V`: Toggle sequential 1-second camera view tour loop.

---

### 2. 🎨 Visual Art Presets
Quickly generate intricate 3D sculptures:
1. **🧬 Cosmic DNA Helix**: Dual-strand spiral tower with connecting base pairs in neon cyan, magenta, gold, and emerald.
2. **🏙️ Cyberpunk Metropolis**: High-rise stepped monolithic skyscraper with satellite towers and skybridges.
3. **🌊 Wave Ocean**: 81-cube mathematical undulating surface grid.
4. **🌀 Galaxy Spiral**: 3-arm logarithmic vortex of cosmic particles.
5. **❤️ Voxel Heart**: Classic 3D retro voxel heart in crimson and ruby shades.
6. **🍩 Sacred Torus**: Multi-ring donut geometry with rainbow phase coloring.

---

### 3. ✨ Animations & Visual Effects
- **🚀 Flying Cubes (`F`)**: Zero-G levitation where cubes float along smooth 3D parametric Lissajous paths while rotating on their own axes. Seamlessly snaps back to the sculpture when disabled.
- **💥 Supernova Explode & Reassemble (`X`)**: Radially blasts all cubes outward into deep space, then magnetically pulls them back together with dynamic spring physics.
- **🌊 Harmonic Wave Ripple (`M`)**: Real-time fluid ripple passing through the voxel sculpture.
- **🌈 Rainbow Flow (`R`)**: Continuous spectral HSV color cycling across the sculpture with spatial gradients.
- **🛸 Auto-Orbit Camera (`T`)**: Smooth 60 FPS 360-degree orbital rotation around the artwork.

---

### 4. 🖥️ Glassmorphic HUD & Controls
- Top Bar displaying active cube count, camera count, and quick shortcut help.
- Sidebars for 1-click preset generation and animation toggles.
- Bottom palette with live swatches and mobile/mouse friendly virtual movement arrows.
