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

let dbData = {};

async function scanFolder() {
    const folderPath = document.getElementById('folder-path').value;
    if (!folderPath) return alert('Please enter a folder path');

    statusDiv.textContent = 'Loading Database...';
    try {
        const dbRes = await fetch('/api/load');
        const dbJson = await dbRes.json();
        if (dbJson.data) dbData = dbJson.data; 
        if (Array.isArray(dbData)) {
            const map = {};
            dbData.forEach(item => map[item.path] = item);
            dbData = map;
        }
    } catch(e) { console.error('DB Load Error', e); }

    statusDiv.textContent = 'Scanning files...';
    
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        images = data.images.map(img => {
            if (dbData[img.path]) {
                return { ...img, ...dbData[img.path] };
            }
            return img;
        });

        const toAnalyze = images.filter(img => !img.features);
        
        if (toAnalyze.length > 0) {
            statusDiv.textContent = `Found ${images.length} images (${toAnalyze.length} new). Analyzing new...`;
            processImagesBrowser(toAnalyze);
        } else {
            statusDiv.textContent = `Loaded ${images.length} images from DB. Displaying...`;
            displayImages(images);
        }
        
    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
    }
}

async function processImagesBrowser(toAnalyzeList) {
    try {
        if (!featureModel) {
            statusDiv.textContent = 'Loading AI Models (GPU)...';
            featureModel = await mobilenet.load({ version: 2, alpha: 1.0 });
            tagModel = await cocoSsd.load();
            console.log('Models loaded');
        }

        let processedCount = 0;
        const total = toAnalyzeList.length;

        const loadImage = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });

        statusDiv.textContent = `Analyzing ${total} new images on GPU...`;

        for (let i = 0; i < total; i++) {
            const imgData = toAnalyzeList[i];
            try {
                // Use thumbnail for analysis to save memory/speed
                const imgEl = await loadImage(imgData.thumbUrl);
                
                const activation = await featureModel.infer(imgEl, true);
                const features = await activation.data(); 
                activation.dispose(); 
                
                const detections = await tagModel.detect(imgEl);
                imgData.keywords = detections.map(d => ({ className: d.class, probability: d.score }));
                imgData.features = Array.from(features);
                
                processedCount++;
                progressDiv.textContent = `Processed ${processedCount} / ${total}`;
                
            } catch (err) {
                console.error('Error analyzing image:', err);
            }
            if (i % 5 === 0) await new Promise(r => requestAnimationFrame(r));
        }

        // Re-train SOM with ALL images
        const validImages = images.filter(img => img.features);
        const vectors = validImages.map(img => img.features);

        if (vectors.length > 0) {
            statusDiv.textContent = 'Training Map (SOM)...';
            await new Promise(r => setTimeout(r, 100));

            const gridSize = Math.ceil(Math.sqrt(vectors.length) * 1.5);
            const inputDim = vectors[0].length;
            const som = new SimpleSOM(gridSize, gridSize, inputDim, Math.max(1000, vectors.length * 2));
            som.train(vectors);

            validImages.forEach((img, i) => {
                const pos = som.getBMU(vectors[i]);
                img.x = pos.x;
                img.y = pos.y;
            });
            
            // Save to DB
            const dataToSave = {};
            validImages.forEach(img => {
                dataToSave[img.path] = {
                    path: img.path,
                    features: img.features,
                    keywords: img.keywords,
                    x: img.x,
                    y: img.y
                };
            });
            
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: dataToSave })
            });
            
            statusDiv.textContent = 'Analysis Complete & Saved.';
            displayImages(images);
        }

    } catch (error) {
        statusDiv.textContent = 'GPU Error: ' + error.message;
        console.error(error);
    }
}

function displayImages(imageList) {
    mapContainer.innerHTML = '';
    
    // Grid Collision Avoidance (Spiral Search)
    const occupied = {}; 
    const xs = imageList.map(i => i.x).filter(x => x !== undefined);
    const ys = imageList.map(i => i.y).filter(y => y !== undefined);
    let maxX = Math.max(...xs, 1); 
    let maxY = Math.max(...ys, 1);
    
    imageList.forEach(img => {
        if (img.x === undefined) return;
        
        let cx = img.x;
        let cy = img.y;
        let radius = 0;
        let found = false;
        
        while (radius < 50 && !found) {
            for (let i = -radius; i <= radius; i++) {
                for (let j = -radius; j <= radius; j++) {
                    if (Math.abs(i) !== radius && Math.abs(j) !== radius) continue;
                    const testX = cx + i;
                    const testY = cy + j;
                    const key = `${testX},${testY}`;
                    if (!occupied[key]) {
                        occupied[key] = true;
                        img.finalX = testX;
                        img.finalY = testY;
                        found = true;
                        maxX = Math.max(maxX, testX);
                        maxY = Math.max(maxY, testY);
                        break;
                    }
                }
                if (found) break;
            }
            radius++;
        }
        if (!found) {
            img.finalX = cx;
            img.finalY = cy;
        }
    });
    
    // Fixed layout size or dynamic? 
    // Container is 4000x4000. Let's use that.
    const containerW = 4000;
    const containerH = 4000;
    
    const cellW = containerW / (maxX + 2);
    const cellH = containerH / (maxY + 2);

    imageList.forEach((img, index) => {
        if (img.finalX === undefined) return;

        const el = document.createElement('div');
        el.className = 'image-node';
        const size = Math.min(150, Math.min(cellW, cellH) * 0.9);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        
        const x = img.finalX * cellW + (cellW - size) / 2;
        const y = img.finalY * cellH + (cellH - size) / 2;
        
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.title = img.keywords ? img.keywords.map(k => `${k.className} (${Math.round(k.probability*100)}%)`).join(', ') : img.name;
        
        const imageElement = document.createElement('img');
        imageElement.src = img.thumbUrl; // Use thumbnail
        imageElement.loading = 'lazy';
        
        el.onclick = () => window.open(img.url, '_blank'); // Open full
        
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
    newScale = Math.min(Math.max(0.1, newScale), 5);
    pointX -= xs * (newScale - scale);
    pointY -= ys * (newScale - scale);
    scale = newScale;
    setTransform();
});

function centerMap() {
    // Start zoomed out
    scale = 0.2; 
    pointX = (mainContainer.clientWidth - 4000 * scale) / 2;
    pointY = (mainContainer.clientHeight - 4000 * scale) / 2;
    setTransform();
}

centerMap();
