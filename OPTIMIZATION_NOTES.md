# VectorVision Canvas Optimization - Implementation Notes

## Status: **PARTIALLY IMPLEMENTED** (Rolled back to DOM version)

## Problem Statement
The current DOM-based rendering creates performance issues with 8,000+ images:
- Each image is a separate `<div>` element
- Heavy layout/reflow calculations
- Memory strain from thousands of DOM nodes
- UI becomes sluggish during pan/zoom operations

## Optimization Approach (Attempted)

### Created Files:
1. **`public/js/som-worker.js`** ✅ COMPLETE
   - Web Worker for Self-Organizing Map training
   - Runs SOM calculations in background thread
   - Prevents UI freezing during clustering
   - Ready to use when canvas integration is complete

2. **`public/js/canvas-renderer.js`** ⚠️ NEEDS DEBUGGING
   - High-performance canvas-based renderer
   - Viewport culling (only draws visible images)
   - LRU texture cache (max 1,000 textures)
   - High-DPI support
   - 3D projection system
   - Mouse interaction handling

### Issues Encountered:
1. **Coordinate System Mismatch**
   - Canvas uses screen-space coordinates
   - Original code uses world-space (4000x4000) coordinates
   - Transformation between systems was not properly aligned

2. **Texture Loading**
   - Images showed as grey boxes
   - File:// protocol URLs from Electron may not load correctly in canvas
   - Need to ensure Data URLs are used instead

3. **Camera/Transform Integration**
   - Original code uses CSS transforms
   - Canvas requires manual camera matrix calculations
   - Zoom/pan state management needs to be unified

## Recommended Next Steps for Canvas Implementation:

### Phase 1: Fix Coordinate System
```javascript
// In canvas-renderer.js drawItem():
// CURRENT (broken):
screenX = x + this.camera.x;

// SHOULD BE:
screenX = (x - worldOffsetX) * this.camera.scale + this.camera.x;
```

### Phase 2: Ensure Data URL Loading
```javascript
// In app.js displayImages():
// Always convert file:// to Data URL before passing to canvas
if (isElectron && img.path) {
    const dataUrl = await window.electronAPI.getImageData(img.path);
    renderer.loadTexture(dataUrl.dataUrl, img.path);
}
```

### Phase 3: Unified Camera State
- Sync `pointX`, `pointY`, `scale with` renderer.setCamera()
- Test zoom/pan interactions thoroughly
- Ensure 2D and 3D modes work correctly

### Phase 4: Progressive Enhancement
- Start with 2D mode only
- Get 2D working perfectly
- Then add 3D projection
- Finally add all interactive features

## Performance Targets:
- **Before**: ~25-30 FPS with <1000 images, degrades with 8000+
- **After**: Stable 60 FPS with 10,000+ images
- **Memory**: < 500MB with 10,000 images (vs 2GB+ currently)

## Files to Review:
- `public/js/app.js.backup` - Original working DOM version
- `public/js/canvas-renderer.js` - Canvas implementation (needs fixes)
- `public/js/som-worker.js` - Web Worker (ready to use)

## Current State:
**ROLLED BACK** to original DOM version for stability. The optimization files are preserved for future implementation once the coordinate system and texture loading issues are resolved.
