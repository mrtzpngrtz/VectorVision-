let images = [];
let featureModel = null;
let tagModel = null;
const mapContainer = document.getElementById('map-container');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');

// Simple Self-Organizing Map Implementation
class SimpleSOM {
    constructor(width, height, inputDim, iterations = 1000) {
        this.width = width;
        this.height = height;
        this.inputDim = inputDim;
        this.iterations = iterations;
        this.learningRate = 0.5;
        this.map = [];
        
        // Initialize weights randomly
        for (let i = 0; i < width * height; i++) {
            this.map[i] = new Float32Array(inputDim);
            for (let j = 0; j < inputDim; j++) {
                this.map[i][j] = Math.random();
            }
        }
    }

    train(data) {
        const radius = Math.max(this.width, this.height) / 2;
        const timeConstant = this.iterations / Math.log(radius);

        for (let i = 0; i < this.iterations; i++) {
            // Pick random input
            const input = data[Math.floor(Math.random() * data.length)];
            
            // Find BMU
            let bmuIdx = -1;
            let minDist = Infinity;
            
            for (let j = 0; j < this.map.length; j++) {
                const dist = this.euclideanDistance(input, this.map[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bmuIdx = j;
                }
            }
            
            // Update weights
            const bmuX = bmuIdx % this.width;
            const bmuY = Math.floor(bmuIdx / this.width);
            
            const currentRadius = radius * Math.exp(-i / timeConstant);
            const currentLr = this.learningRate * Math.exp(-i / this.iterations);
            
            for (let j = 0; j < this.map.length; j++) {
                const x = j % this.width;
                const y = Math.floor(j / this.width);
                
                const distToBmu = Math.sqrt((x - bmuX)**2 + (y - bmuY)**2);
                
                if (distToBmu < currentRadius) {
                    const influence = Math.exp(-(distToBmu**2) / (2 * currentRadius**2));
                    for (let k = 0; k < this.inputDim; k++) {
                        this.map[j][k] += influence * currentLr * (input[k] - this.map[j][k]);
                    }
                }
            }
            
            if (i % 100 === 0) {
                // Progress could be reported here
            }
        }
    }

    getBMU(input) {
        let bmuIdx = -1;
        let minDist = Infinity;
        for (let j = 0; j < this.map.length; j++) {
            const dist = this.euclideanDistance(input, this.map[j]);
            if (dist < minDist) {
                minDist = dist;
                bmuIdx = j;
            }
        }
        return {
            x: bmuIdx % this.width,
            y: Math.floor(bmuIdx / this.width)
        };
    }

    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i])**2;
        }
        return Math.sqrt(sum);
    }
}

async function scanFolder() {
    const folderPath = document.getElementById('folder-path').value;
    if (!folderPath) return alert('Please enter a folder path');

    statusDiv.textContent = 'Scanning files...';
    
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        images = data.images;
        statusDiv.textContent = `Found ${images.length} images. Starting GPU analysis...`;
        
        // Start processing
        processImagesBrowser(images);
        
    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
    }
}

async function processImagesBrowser(imageList) {
    try {
        if (!featureModel) {
            statusDiv.textContent = 'Loading AI Models (GPU)...';
            // Load MobileNet for Sorting
            featureModel = await mobilenet.load({ version: 2, alpha: 1.0 });
            // Load COCO-SSD for Tagging
            tagModel = await cocoSsd.load();
            console.log('Models loaded');
        }

        const featureVectors = [];
        let processedCount = 0;
        const total = imageList.length;

        // Helper to load image
        const loadImage = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });

        statusDiv.textContent = `Analyzing ${total} images on GPU...`;

        // Process sequentially to avoid memory issues, but could be batched
        for (let i = 0; i < total; i++) {
            const imgData = imageList[i];
            try {
                const imgEl = await loadImage(imgData.url);
                
                // 1. Extract features for Map (MobileNet)
                const activation = await featureModel.infer(imgEl, true);
                const features = await activation.data(); 
                activation.dispose(); 
                
                // 2. Extract tags for Search (COCO-SSD)
                const detections = await tagModel.detect(imgEl);
                // Map to compatible format
                imgData.keywords = detections.map(d => ({ className: d.class, probability: d.score }));
                
                featureVectors.push(Array.from(features));
                imgData.features = Array.from(features);
                
                processedCount++;
                progressDiv.textContent = `Processed ${processedCount} / ${total}`;
                
            } catch (err) {
                console.error('Error analyzing image:', err);
            }
            
            // Allow UI update
            if (i % 5 === 0) await new Promise(r => requestAnimationFrame(r));
        }

        statusDiv.textContent = 'Training Map (SOM)...';
        await new Promise(r => setTimeout(r, 100)); // UI refresh

        if (featureVectors.length > 0) {
            // Increase grid size to reduce stacking. 
            // sqrt(N) * 1.5 gives a sparser map.
            const gridSize = Math.ceil(Math.sqrt(featureVectors.length) * 1.5);
            
            const inputDim = featureVectors[0].length;
            // Use larger grid, slightly fewer iterations to keep it fast
            const som = new SimpleSOM(gridSize, gridSize, inputDim, featureVectors.length * 2);
            som.train(featureVectors);

            // Assign coordinates
            imageList.forEach(img => {
                if (img.features) {
                    const pos = som.getBMU(img.features);
                    img.x = pos.x;
                    img.y = pos.y;
                }
            });
            
            statusDiv.textContent = 'Analysis Complete.';
            displayImages(imageList);
        }

    } catch (error) {
        statusDiv.textContent = 'GPU Error: ' + error.message;
        console.error(error);
    }
}

function displayImages(imageList) {
    mapContainer.innerHTML = '';
    
    // Grid Collision Avoidance (Spiral Search)
    const occupied = {}; // Map "x,y" to true
    
    // Determine bounds to calculate cell size
    const xs = imageList.map(i => i.x).filter(x => x !== undefined);
    const ys = imageList.map(i => i.y).filter(y => y !== undefined);
    // Initial max, will grow as we spread
    let maxX = Math.max(...xs, 1); 
    let maxY = Math.max(...ys, 1);
    
    // Assign final coordinates
    imageList.forEach(img => {
        if (img.x === undefined) return;
        
        let cx = img.x;
        let cy = img.y;
        let radius = 0;
        let found = false;
        
        // Spiral out until empty spot found
        // Max radius 50 to prevent infinite loop
        while (radius < 50 && !found) {
            // Check points in square radius
            for (let i = -radius; i <= radius; i++) {
                for (let j = -radius; j <= radius; j++) {
                    // Only check the perimeter of the current radius (optimization)
                    if (Math.abs(i) !== radius && Math.abs(j) !== radius) continue;
                    
                    const testX = cx + i;
                    const testY = cy + j;
                    const key = `${testX},${testY}`;
                    
                    if (!occupied[key]) {
                        occupied[key] = true;
                        img.finalX = testX;
                        img.finalY = testY;
                        found = true;
                        
                        // Update bounds
                        maxX = Math.max(maxX, testX);
                        maxY = Math.max(maxY, testY);
                        break;
                    }
                }
                if (found) break;
            }
            radius++;
        }
        // Fallback if super crowded (stack)
        if (!found) {
            img.finalX = cx;
            img.finalY = cy;
        }
    });
    
    const containerW = mapContainer.clientWidth;
    const containerH = mapContainer.clientHeight;
    
    // Recalculate cell size based on new spread bounds
    const cellW = containerW / (maxX + 2);
    const cellH = containerH / (maxY + 2);

    imageList.forEach((img, index) => {
        if (img.finalX === undefined) return;

        const el = document.createElement('div');
        el.className = 'image-node';
        // Size: slightly smaller than cell to leave gap
        const size = Math.min(150, Math.min(cellW, cellH) * 0.9);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        
        const x = img.finalX * cellW + (cellW - size) / 2;
        const y = img.finalY * cellH + (cellH - size) / 2;
        
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.title = img.keywords ? img.keywords.map(k => `${k.className} (${Math.round(k.probability*100)}%)`).join(', ') : img.name;
        
        const imageElement = document.createElement('img');
        imageElement.src = img.url;
        imageElement.loading = 'lazy';
        
        el.appendChild(imageElement);
        mapContainer.appendChild(el);
    });
}

function searchImages() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    if (!keyword) {
        displayImages(images);
        return;
    }

    const filtered = images.filter(img => {
        if (!img.keywords) return false;
        return img.keywords.some(p => p.className.toLowerCase().includes(keyword));
    });

    statusDiv.textContent = `Found ${filtered.length} matches for "${keyword}".`;
    displayImages(filtered);
}

// --- Pan & Zoom Logic ---
const mainContainer = document.getElementById('main');
let scale = 1;
let panning = false;
let pointX = 0;
let pointY = 0;
let startX = 0;
let startY = 0;

function setTransform() {
    mapContainer.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

mainContainer.addEventListener('mousedown', (e) => {
    // Only left click
    if (e.button !== 0) return;
    e.preventDefault();
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    panning = true;
});

mainContainer.addEventListener('mousemove', (e) => {
    if (!panning) return;
    e.preventDefault();
    pointX = e.clientX - startX;
    pointY = e.clientY - startY;
    setTransform();
});

mainContainer.addEventListener('mouseup', () => {
    panning = false;
});

mainContainer.addEventListener('mouseleave', () => {
    panning = false;
});

mainContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const xs = (e.clientX - mainContainer.getBoundingClientRect().left - pointX) / scale;
    const ys = (e.clientY - mainContainer.getBoundingClientRect().top - pointY) / scale;
    
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    
    let newScale = scale * factor;
    // Limit scale
    newScale = Math.min(Math.max(0.1, newScale), 5);
    
    pointX -= xs * (newScale - scale);
    pointY -= ys * (newScale - scale);
    scale = newScale;
    
    setTransform();
});

// Initial Center
function centerMap() {
    // Center initially (approx)
    const containerW = mainContainer.clientWidth;
    const containerH = mainContainer.clientHeight;
    // Map is 4000x4000
    // We want to center it:
    // (ContainerW - MapW*Scale) / 2
    
    // Start zoomed out to fit?
    scale = Math.min(containerW/4000, containerH/4000);
    // Or just start at 0.1?
    scale = 0.2; 
    
    pointX = (containerW - 4000 * scale) / 2;
    pointY = (containerH - 4000 * scale) / 2;
    
    setTransform();
}

// Call centerMap on load (or after display)
// We'll call it when images are displayed for the first time if needed, 
// or just initialize it now.
centerMap();
