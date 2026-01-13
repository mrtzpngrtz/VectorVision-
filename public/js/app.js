let images = [];
let model = null;
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
        if (!model) {
            statusDiv.textContent = 'Loading MobileNet (GPU)...';
            // Use 'mobilenet' global from CDN script
            model = await mobilenet.load(); 
            console.log('Model loaded');
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
                
                // Extract features
                // infer(img, true) returns embeddings (1024D for MobileNet v1/v2)
                const activation = await model.infer(imgEl, true);
                const features = await activation.data(); // Float32Array
                activation.dispose(); // Cleanup tensor
                
                // Get keywords for search
                const predictions = await model.classify(imgEl);
                imgData.keywords = predictions;
                
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
            const gridW = Math.ceil(Math.sqrt(featureVectors.length));
            const gridH = Math.ceil(Math.sqrt(featureVectors.length));
            
            const inputDim = featureVectors[0].length;
            const som = new SimpleSOM(Math.min(20, gridW), Math.min(20, gridH), inputDim, featureVectors.length * 5);
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
    
    // Determine grid size
    const xs = imageList.map(i => i.x).filter(x => x !== undefined);
    const ys = imageList.map(i => i.y).filter(y => y !== undefined);
    const maxX = Math.max(...xs, 1);
    const maxY = Math.max(...ys, 1);
    
    const containerW = mapContainer.clientWidth;
    const containerH = mapContainer.clientHeight;
    
    const cellW = containerW / (maxX + 1);
    const cellH = containerH / (maxY + 1);

    imageList.forEach((img, index) => {
        if (img.x === undefined) return;

        const el = document.createElement('div');
        el.className = 'image-node';
        el.style.width = `${Math.min(100, cellW * 0.9)}px`;
        el.style.height = `${Math.min(100, cellH * 0.9)}px`;
        
        // Jitter slightly to see overlapping
        const jitterX = (Math.random() - 0.5) * (cellW * 0.2);
        const jitterY = (Math.random() - 0.5) * (cellH * 0.2);
        
        const x = img.x * cellW + (cellW * 0.05) + jitterX;
        const y = img.y * cellH + (cellH * 0.05) + jitterY;
        
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.title = img.keywords ? img.keywords.map(k => k.className).join(', ') : img.name;
        
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
