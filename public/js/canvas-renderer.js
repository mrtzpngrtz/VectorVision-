// canvas-renderer.js - High-performance canvas-based image renderer with viewport culling
// Replaces DOM-based image nodes for 10,000+ image performance

class CanvasRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true // Hint for better performance
        });
        
        // Configuration
        this.worldSize = options.worldSize || 4000;
        this.gridDotSize = options.gridDotSize || 40;
        this.imageSize2D = options.imageSize2D || 80;
        this.imageSize3D = options.imageSize3D || 80;
        
        // Camera/viewport state
        this.camera = {
            x: 0,
            y: 0,
            z: -2000,
            scale: 1,
            rotX: -20,
            rotY: 45
        };
        
        // Rendering state
        this.is3D = false;
        this.items = [];
        this.textureCache = new Map();
        this.maxCacheSize = 1000; // Maximum number of textures to keep in memory
        this.pendingTextures = new Set();
        
        // Interaction
        this.hoveredItem = null;
        this.onHover = null;
        this.onClick = null;
        this.onDoubleClick = null;
        this.onRightClick = null;
        
        // Performance
        this.cullingMargin = 200; // Extra margin for culling to prevent pop-in
        this.lastFrameTime = 0;
        this.isAnimating = false;
        
        // High DPI support
        this.setupHighDPI();
        
        // Resize handling
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;
    }
    
    handleResize() {
        this.setupHighDPI();
        this.render();
    }
    
    // Set items to render
    setItems(items) {
        this.items = items;
        this.render();
    }
    
    // Set camera position
    setCamera(camera) {
        Object.assign(this.camera, camera);
        this.render();
    }
    
    // Set 3D mode
    set3DMode(is3D) {
        this.is3D = is3D;
        this.render();
    }
    
    // Load texture (image) into cache
    loadTexture(url, key) {
        if (this.textureCache.has(key)) {
            return Promise.resolve(this.textureCache.get(key));
        }
        
        if (this.pendingTextures.has(key)) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.textureCache.has(key)) {
                        clearInterval(checkInterval);
                        resolve(this.textureCache.get(key));
                    }
                }, 10);
            });
        }
        
        this.pendingTextures.add(key);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // LRU cache management
                if (this.textureCache.size >= this.maxCacheSize) {
                    const firstKey = this.textureCache.keys().next().value;
                    this.textureCache.delete(firstKey);
                }
                
                this.textureCache.set(key, img);
                this.pendingTextures.delete(key);
                resolve(img);
            };
            
            img.onerror = () => {
                this.pendingTextures.delete(key);
                reject(new Error(`Failed to load texture: ${url}`));
            };
            
            img.src = url;
        });
    }
    
    // Project 3D coordinates to 2D screen space
    project3D(x, y, z) {
        // Apply camera rotation
        const cosX = Math.cos(this.camera.rotX * Math.PI / 180);
        const sinX = Math.sin(this.camera.rotX * Math.PI / 180);
        const cosY = Math.cos(this.camera.rotY * Math.PI / 180);
        const sinY = Math.sin(this.camera.rotY * Math.PI / 180);
        
        // Rotate around Y axis
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;
        
        // Rotate around X axis
        let y1 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;
        
        // Apply camera translation
        z2 += this.camera.z;
        
        // Perspective projection
        const fov = 1000;
        const scale = fov / (fov + z2);
        
        const screenX = x1 * scale + this.displayWidth / 2 + this.camera.x;
        const screenY = y1 * scale + this.displayHeight / 2 + this.camera.y;
        
        return { x: screenX, y: screenY, z: z2, scale };
    }
    
    // Check if item is in viewport
    isInViewport(item, margin = this.cullingMargin) {
        let x, y, z = 0;
        
        if (this.is3D) {
            x = item.x3 !== undefined ? item.x3 : (item.x || 0);
            y = item.y3 !== undefined ? item.y3 : (item.y || 0);
            z = item.z3 !== undefined ? item.z3 : (item.z || 0);
            
            const projected = this.project3D(x, y, z);
            
            // Cull by depth
            if (projected.z > 200 || projected.z < -6000) return false;
            
            // Cull by screen position
            const size = this.imageSize3D * projected.scale;
            return projected.x + size > -margin && 
                   projected.x - size < this.displayWidth + margin &&
                   projected.y + size > -margin && 
                   projected.y - size < this.displayHeight + margin;
        } else {
            x = item.x !== undefined ? item.x : 0;
            y = item.y !== undefined ? item.y : 0;
            
            const screenX = x + this.camera.x;
            const screenY = y + this.camera.y;
            const size = this.imageSize2D;
            
            return screenX + size > -margin && 
                   screenX - size < this.displayWidth + margin &&
                   screenY + size > -margin && 
                   screenY - size < this.displayHeight + margin;
        }
    }
    
    // Main render loop
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        // Draw grid background
        this.drawGrid();
        
        // Collect visible items
        const visibleItems = [];
        
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if (this.isInViewport(item)) {
                visibleItems.push({ item, index: i });
            }
        }
        
        // Sort by depth (far to near for 3D)
        if (this.is3D) {
            visibleItems.sort((a, b) => {
                const zA = a.item.z3 !== undefined ? a.item.z3 : 0;
                const zB = b.item.z3 !== undefined ? b.item.z3 : 0;
                return zA - zB; // Far to near
            });
        }
        
        // Draw visible items
        for (const { item, index } of visibleItems) {
            this.drawItem(item, index);
        }
        
        // Update performance stats
        const now = performance.now();
        if (this.onFrameRender) {
            this.onFrameRender(visibleItems.length, now - this.lastFrameTime);
        }
        this.lastFrameTime = now;
    }
    
    // Draw grid background
    drawGrid() {
        if (this.is3D) return; // No grid in 3D mode
        
        const gridSize = this.gridDotSize * this.camera.scale;
        if (gridSize < 10) return; // Don't draw if too small
        
        this.ctx.fillStyle = '#333333';
        
        const startX = Math.floor(-this.camera.x / gridSize) * gridSize + this.camera.x;
        const startY = Math.floor(-this.camera.y / gridSize) * gridSize + this.camera.y;
        
        for (let x = startX; x < this.displayWidth; x += gridSize) {
            for (let y = startY; y < this.displayHeight; y += gridSize) {
                this.ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    
    // Draw individual item
    drawItem(item, index) {
        let x, y, z = 0;
        let screenX, screenY, size, opacity = 1, brightness = 1;
        
        if (this.is3D) {
            x = item.x3 !== undefined ? item.x3 : 0;
            y = item.y3 !== undefined ? item.y3 : 0;
            z = item.z3 !== undefined ? item.z3 : 0;
            
            const projected = this.project3D(x, y, z);
            screenX = projected.x;
            screenY = projected.y;
            size = this.imageSize3D * projected.scale;
            
            // Apply depth-based fading
            const worldZ = projected.z;
            if (worldZ > -500) {
                opacity = Math.max(0, Math.min(1, (worldZ + 1000) / 500 - 1));
            }
            if (worldZ < -2000) {
                brightness = Math.max(0.1, 1 - (Math.abs(worldZ + 2000) / 4000));
            }
        } else {
            x = item.x !== undefined ? item.x : 0;
            y = item.y !== undefined ? item.y : 0;
            
            screenX = x * this.camera.scale + this.camera.x;
            screenY = y * this.camera.scale + this.camera.y;
            size = this.imageSize2D * this.camera.scale;
        }
        
        // Check if hovered
        const isHovered = this.hoveredItem === index;
        if (isHovered && !this.is3D) {
            size *= 1.8;
        } else if (isHovered && this.is3D) {
            size *= 2.0;
        }
        
        // Apply opacity and brightness
        this.ctx.globalAlpha = opacity;
        
        // Draw image if texture is loaded
        const textureKey = item.path || item.thumbUrl || `item-${index}`;
        const texture = this.textureCache.get(textureKey);
        
        if (texture) {
            this.ctx.save();
            
            if (brightness !== 1) {
                this.ctx.filter = `brightness(${brightness})`;
            }
            
            this.ctx.drawImage(
                texture,
                screenX - size / 2,
                screenY - size / 2,
                size,
                size
            );
            
            // Draw border if hovered
            if (isHovered) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    screenX - size / 2,
                    screenY - size / 2,
                    size,
                    size
                );
            }
            
            this.ctx.restore();
        } else {
            // Draw placeholder while loading
            this.ctx.fillStyle = '#222222';
            this.ctx.fillRect(
                screenX - size / 2,
                screenY - size / 2,
                size,
                size
            );
            
            // Trigger texture load
            const url = item.thumbnailData || item.thumbUrl || item.url;
            if (url) {
                this.loadTexture(url, textureKey).then(() => {
                    this.render(); // Re-render when texture loads
                }).catch(err => {
                    console.error('Error loading texture:', err);
                });
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    // Get item at screen coordinates
    getItemAtPosition(screenX, screenY) {
        // Check in reverse order (top to bottom)
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            if (!this.isInViewport(item)) continue;
            
            let x, y, z = 0;
            let itemScreenX, itemScreenY, size;
            
            if (this.is3D) {
                x = item.x3 !== undefined ? item.x3 : 0;
                y = item.y3 !== undefined ? item.y3 : 0;
                z = item.z3 !== undefined ? item.z3 : 0;
                
                const projected = this.project3D(x, y, z);
                itemScreenX = projected.x;
                itemScreenY = projected.y;
                size = this.imageSize3D * projected.scale;
            } else {
                x = item.x !== undefined ? item.x : 0;
                y = item.y !== undefined ? item.y : 0;
                
                itemScreenX = x * this.camera.scale + this.camera.x;
                itemScreenY = y * this.camera.scale + this.camera.y;
                size = this.imageSize2D * this.camera.scale;
            }
            
            const halfSize = size / 2;
            if (screenX >= itemScreenX - halfSize && screenX <= itemScreenX + halfSize &&
                screenY >= itemScreenY - halfSize && screenY <= itemScreenY + halfSize) {
                return { item, index: i };
            }
        }
        
        return null;
    }
    
    // Handle mouse move for hover
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const result = this.getItemAtPosition(x, y);
        const newHoveredIndex = result ? result.index : null;
        
        if (newHoveredIndex !== this.hoveredItem) {
            this.hoveredItem = newHoveredIndex;
            
            if (this.onHover) {
                this.onHover(result ? result.item : null, result ? result.index : null);
            }
            
            this.render();
        }
    }
    
    // Handle mouse click
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const result = this.getItemAtPosition(x, y);
        
        if (this.onClick && result) {
            this.onClick(result.item, result.index);
        }
    }
    
    // Handle double-click
    handleDoubleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const result = this.getItemAtPosition(x, y);
        
        if (this.onDoubleClick && result) {
            event.stopPropagation();
            this.onDoubleClick(result.item, result.index);
        }
    }
    
    // Handle right-click
    handleRightClick(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const result = this.getItemAtPosition(x, y);
        
        if (this.onRightClick && result) {
            event.stopPropagation();
            this.onRightClick(result.item, result.index);
        }
    }
    
    // Clear hover state
    clearHover() {
        if (this.hoveredItem !== null) {
            this.hoveredItem = null;
            this.render();
        }
    }
    
    // Start animation loop
    startAnimationLoop(callback) {
        this.isAnimating = true;
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            if (callback) {
                callback();
            }
            
            this.render();
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    // Stop animation loop
    stopAnimationLoop() {
        this.isAnimating = false;
    }
    
    // Cleanup
    destroy() {
        this.stopAnimationLoop();
        this.textureCache.clear();
        this.items = [];
    }
}
