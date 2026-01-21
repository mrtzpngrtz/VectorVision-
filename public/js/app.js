let images = [];
let featureModel = null;
let tagModel = null;
const mapContainer = document.getElementById('map-container');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const semanticInfoDiv = document.getElementById('semantic-info');
const loaderEl = document.getElementById('main-loader');
const statusContainer = document.getElementById('status-container');
const fpsCounterEl = document.getElementById('fps-counter');

function setLoading(active) {
    if (statusContainer) statusContainer.style.display = active ? 'block' : 'none';
    if (loaderEl) loaderEl.style.display = active ? 'block' : 'none';
    if (active) statusDiv.classList.add('analyzing');
    else statusDiv.classList.remove('analyzing');
}

let is3D = false;
let currentSort = 'semantic'; // 'semantic', 'color', 'grid', 'lightness'
let som2D = null;
let som3D = null;

function toggleUI() {
    document.body.classList.toggle('ui-hidden');
}

// --- Lightbox Logic ---
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

function showLightbox(url) {
    lightboxImg.src = url;
    lightbox.style.display = 'flex';
}

lightbox.onclick = () => {
    lightbox.style.display = 'none';
    lightboxImg.src = '';
};

// --- Simple SOM Implementation ---
class SimpleSOM {
    constructor(width, height, depth, inputDim, iterations = 1000) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.inputDim = inputDim;
        this.iterations = iterations;
        this.learningRate = 0.5;
        this.map = [];
        
        const size = width * height * depth;
        for (let i = 0; i < size; i++) {
            this.map[i] = new Float32Array(inputDim);
            for (let j = 0; j < inputDim; j++) {
                this.map[i][j] = Math.random();
            }
        }
    }

    async trainAsync(data, onProgress) {
        const radius = Math.max(this.width, Math.max(this.height, this.depth)) / 2;
        const timeConstant = this.iterations / Math.log(radius);

        for (let i = 0; i < this.iterations; i++) {
            const input = data[Math.floor(Math.random() * data.length)];
            let bmuIdx = -1;
            let minDist = Infinity;
            
            for (let j = 0; j < this.map.length; j++) {
                const dist = this.euclideanDistance(input, this.map[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bmuIdx = j;
                }
            }
            
            const bmuX = bmuIdx % this.width;
            const bmuY = Math.floor(bmuIdx / this.width) % this.height;
            const bmuZ = Math.floor(bmuIdx / (this.width * this.height));
            
            const currentRadius = radius * Math.exp(-i / timeConstant);
            const currentLr = this.learningRate * Math.exp(-i / this.iterations);
            
            for (let j = 0; j < this.map.length; j++) {
                const x = j % this.width;
                const y = Math.floor(j / this.width) % this.height;
                const z = Math.floor(j / (this.width * this.height));
                
                const distToBmu = Math.sqrt((x - bmuX)**2 + (y - bmuY)**2 + (z - bmuZ)**2);
                
                if (distToBmu < currentRadius) {
                    const influence = Math.exp(-(distToBmu**2) / (2 * currentRadius**2));
                    for (let k = 0; k < this.inputDim; k++) {
                        this.map[j][k] += influence * currentLr * (input[k] - this.map[j][k]);
                    }
                }
            }

            if (i % 20 === 0 && onProgress) {
                onProgress(i, this.iterations);
                await new Promise(r => setTimeout(r, 0));
            }
        }
        if (onProgress) onProgress(this.iterations, this.iterations);
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
            y: Math.floor(bmuIdx / this.width) % this.height,
            z: Math.floor(bmuIdx / (this.width * this.height))
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

// --- App Logic ---
async function scanFolder() {
    const folderPath = document.getElementById('folder-path').value;
    if (!folderPath) return alert('Please enter a folder path');

    statusDiv.textContent = 'INIT_DB_LOAD';
    try {
        const dbRes = await fetch('/api/load');
        const dbJson = await dbRes.json();
        let dbData = {};
        if (dbJson.data) dbData = dbJson.data; 
        if (Array.isArray(dbData)) {
            const map = {};
            dbData.forEach(item => map[item.path] = item);
            dbData = map;
        }

        statusDiv.textContent = 'FILESYSTEM_SCAN';
        setLoading(true);
        
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        images = data.images.map(img => {
            if (dbData[img.path]) {
                return { ...img, ...dbData[img.path], created: img.created || dbData[img.path].created };
            }
            return img;
        });

        const toAnalyze = images.filter(img => !img.features || !img.color);
        
        if (toAnalyze.length > 0) {
            statusDiv.textContent = `ANALYSIS_REQUIRED: ${toAnalyze.length}`;
            processImagesBrowser(toAnalyze);
        } else {
            const hasCoords = images.some(img => img.x !== undefined);
            if (!hasCoords && images.length > 0) {
                 train2D();
            } else {
                statusDiv.textContent = `SYSTEM_READY: ${images.length}_IMG`;
                setLoading(false);
                displayImages(images);
            }
        }
    } catch (error) {
        statusDiv.textContent = 'ERR: ' + error.message;
        setLoading(false);
    }
}

async function processImagesBrowser(toAnalyzeList) {
    try {
        if (!featureModel) {
            statusDiv.textContent = 'BOOTSTRAPPING_AI';
            featureModel = await mobilenet.load({ version: 2, alpha: 1.0 });
            tagModel = await cocoSsd.load();
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

        const getDominantColor = (imgEl) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(imgEl, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return [r, g, b];
        };

        statusDiv.textContent = `ANALYZING_STREAM`;
        setLoading(true);

        for (let i = 0; i < total; i++) {
            const imgData = toAnalyzeList[i];
            try {
                progressDiv.textContent = `[${processedCount + 1}/${total}] PROC: ${imgData.name}`;
                const imgEl = await loadImage(imgData.thumbUrl);
                
                const color = getDominantColor(imgEl);
                imgData.color = color;
                imgData.colorVector = [color[0]/255, color[1]/255, color[2]/255];

                if (!imgData.features) {
                    const activation = await featureModel.infer(imgEl, true);
                    const features = await activation.data(); 
                    activation.dispose(); 
                    imgData.features = Array.from(features);
                }
                
                if (!imgData.keywords) {
                    const detections = await tagModel.detect(imgEl);
                    imgData.keywords = detections.map(d => ({ className: d.class, probability: d.score }));
                }
                processedCount++;
            } catch (err) {
                console.error('Error:', err);
            }
            if (i % 5 === 0) await new Promise(r => requestAnimationFrame(r));
        }
        train2D(); 
    } catch (error) {
        statusDiv.textContent = 'ERR: ' + error.message;
        setLoading(false);
    }
}

// --- Training Logic ---

async function train2D() {
    const vectors = images.filter(i => i.features).map(i => i.features);
    if (vectors.length === 0) return;

    statusDiv.textContent = 'MAPPING_SEMANTIC_2D';
    setLoading(true);
    
    const gridSize = Math.ceil(Math.sqrt(vectors.length) * 1.5);
    const som = new SimpleSOM(gridSize, gridSize, 1, vectors[0].length, Math.max(1000, vectors.length * 2));
    
    await som.trainAsync(vectors, (c, t) => {
        statusDiv.textContent = `TRAINING: ${Math.round(c/t*100)}%`;
    });

    images.forEach((img, i) => {
        if (img.features) {
            const pos = som.getBMU(img.features);
            img.x = pos.x; img.y = pos.y;
        }
    });
    
    resolveCollisions2D();
    saveData();
    statusDiv.textContent = 'SYSTEM_READY';
    setLoading(false);
    displayImages(images);
}

function resolveCollisions2D() {
    const occupied = new Set();
    images.forEach(img => {
        if (img.x === undefined) return;
        let x = Math.round(img.x);
        let y = Math.round(img.y);
        let key = `${x},${y}`;
        if (occupied.has(key)) {
            let found = false, radius = 1;
            while (!found && radius < 50) {
                for (let dx = -radius; dx <= radius && !found; dx++) {
                    for (let dy = -radius; dy <= radius && !found; dy++) {
                        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                        let nx = x + dx, ny = y + dy, nKey = `${nx},${ny}`;
                        if (!occupied.has(nKey)) { img.x = nx; img.y = ny; occupied.add(nKey); found = true; }
                    }
                }
                radius++;
            }
        } else { occupied.add(key); img.x = x; img.y = y; }
    });
}

async function train3D() {
    const vectors = images.filter(i => i.features).map(i => i.features);
    if (vectors.length === 0) return;
    statusDiv.textContent = 'MAPPING_SEMANTIC_3D';
    setLoading(true);
    const gridSize = Math.ceil(Math.cbrt(vectors.length) * 2); 
    const som = new SimpleSOM(gridSize, gridSize, gridSize, vectors[0].length, Math.max(1000, vectors.length * 2));
    await som.trainAsync(vectors, (c, t) => {
        statusDiv.textContent = `TRAINING: ${Math.round(c/t*100)}%`;
    });
    images.forEach((img, i) => {
        if (img.features) {
            const pos = som.getBMU(img.features);
            img.x3 = pos.x; img.y3 = pos.y; img.z3 = pos.z;
        }
    });
    resolveCollisions3D();
    saveData();
    statusDiv.textContent = 'SYSTEM_READY';
    setLoading(false);
    displayImages(images);
}

function resolveCollisions3D() {
    const occupied = new Set();
    images.forEach(img => {
        if (img.x3 === undefined) return;
        let x = Math.round(img.x3); let y = Math.round(img.y3); let z = Math.round(img.z3);
        let key = `${x},${y},${z}`;
        if (occupied.has(key)) {
            let found = false, radius = 1;
            while (!found && radius < 20) {
                for (let dx = -radius; dx <= radius && !found; dx++) {
                    for (let dy = -radius; dy <= radius && !found; dy++) {
                        for (let dz = -radius; dz <= radius && !found; dz++) {
                            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius && Math.abs(dz) !== radius) continue;
                            let nx = x + dx, ny = y + dy, nz = z + dz, nKey = `${nx},${ny},${nz}`;
                            if (!occupied.has(nKey)) { img.x3 = nx; img.y3 = ny; img.z3 = nz; occupied.add(nKey); found = true; }
                        }
                    }
                }
                radius++;
            }
        } else { occupied.add(key); img.x3 = x; img.y3 = y; img.z3 = z; }
    });
}

async function trainColor(is3DMode) {
    const valid = images.filter(i => i.colorVector);
    const vectors = valid.map(i => i.colorVector);
    if (vectors.length === 0) return;
    statusDiv.textContent = 'MAPPING_COLOR_SPACE';
    setLoading(true);
    let som;
    if (is3DMode) {
        const gridSize = Math.ceil(Math.cbrt(vectors.length) * 2);
        som = new SimpleSOM(gridSize, gridSize, gridSize, 3, Math.max(1000, vectors.length * 2));
    } else {
        const gridSize = Math.ceil(Math.sqrt(vectors.length) * 1.5);
        som = new SimpleSOM(gridSize, gridSize, 1, 3, Math.max(1000, vectors.length * 2));
    }
    await som.trainAsync(vectors, (c, t) => {
        statusDiv.textContent = `TRAINING: ${Math.round(c/t*100)}%`;
    });
    valid.forEach((img, i) => {
        const pos = som.getBMU(img.colorVector);
        if (is3DMode) { img.xC3 = pos.x; img.yC3 = pos.y; img.zC3 = pos.z; }
        else { img.xC = pos.x; img.yC = pos.y; }
    });
    if (is3DMode) resolveCollisionsColor3D();
    else resolveCollisionsColor2D();
    saveData();
    statusDiv.textContent = 'SYSTEM_READY';
    setLoading(false);
    displayImages(images);
}

function resolveCollisionsColor2D() {
    const occupied = new Set();
    images.forEach(img => {
        if (img.xC === undefined) return;
        let x = Math.round(img.xC); let y = Math.round(img.yC);
        let key = `${x},${y}`;
        if (occupied.has(key)) {
            let found = false, r = 1;
            while (!found && r < 50) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    for (let dy = -r; dy <= r && !found; dy++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                        let nx = x + dx, ny = y + dy, nKey = `${nx},${ny}`;
                        if (!occupied.has(nKey)) { img.xC = nx; img.yC = ny; occupied.add(nKey); found = true; }
                    }
                }
                r++;
            }
        } else { occupied.add(key); img.xC = x; img.yC = y; }
    });
}

function resolveCollisionsColor3D() {
    const occupied = new Set();
    images.forEach(img => {
        if (img.xC3 === undefined) return;
        let x = Math.round(img.xC3); let y = Math.round(img.yC3); let z = Math.round(img.zC3);
        let key = `${x},${y},${z}`;
        if (occupied.has(key)) {
            let found = false, r = 1;
            while (!found && r < 20) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    for (let dy = -r; dy <= r && !found; dy++) {
                        for (let dz = -r; dz <= r && !found; dz++) {
                            if (Math.abs(dx) !== r && Math.abs(dy) !== r && Math.abs(dz) !== r) continue;
                            let nx = x + dx, ny = y + dy, nz = z + dz, nKey = `${nx},${ny},${nz}`;
                            if (!occupied.has(nKey)) { img.xC3 = nx; img.yC3 = ny; img.zC3 = nz; occupied.add(nKey); found = true; }
                        }
                    }
                }
                r++;
            }
        } else { occupied.add(key); img.xC3 = x; img.yC3 = y; img.zC3 = z; }
    });
}

function calculateLightness() {
    statusDiv.textContent = 'MAPPING_LIGHTNESS';
    const valid = images.filter(i => i.color);
    valid.forEach(img => {
        const [r, g, b] = img.color;
        const lum = 0.2126*r + 0.7152*g + 0.0722*b;
        img.zLight = (lum / 255) * 4000;
        if (img.x !== undefined) { img.xLight = img.x; img.yLight = img.y; }
        else { img.xLight = 0; img.yLight = 0; }
    });
    saveData();
    displayImages(images);
}

async function saveData() {
    const dataToSave = {};
    images.forEach(img => {
        dataToSave[img.path] = {
            path: img.path, created: img.created,
            features: img.features, color: img.color, colorVector: img.colorVector, keywords: img.keywords,
            x: img.x, y: img.y, x3: img.x3, y3: img.y3, z3: img.z3,
            xC: img.xC, yC: img.yC, xC3: img.xC3, yC3: img.yC3, zC3: img.zC3,
            xLight: img.xLight, yLight: img.yLight, zLight: img.zLight
        };
    });
    await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSave })
    });
}

// --- UI Logic ---

async function setViewMode(to3D) {
    if (is3D === to3D) return;
    is3D = to3D;
    document.getElementById('view-2d').classList.toggle('active', !is3D);
    document.getElementById('view-3d').classList.toggle('active', is3D);
    const sliderCtrl = document.getElementById('z-scale-control');
    const presetCtrl = document.getElementById('view-presets');
    if (sliderCtrl) sliderCtrl.style.display = is3D ? 'block' : 'none';
    if (presetCtrl) presetCtrl.style.display = is3D ? 'block' : 'none';
    if (currentSort === 'lightness' && !is3D) await setSorting('semantic');
    else await setSorting(currentSort);
    if (is3D) reset3DView();
    else centerMap();
}

async function setSorting(mode) {
    currentSort = mode;
    document.querySelectorAll('[id^="sort-"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`sort-${mode}`);
    if (btn) btn.classList.add('active');
    if (images.length === 0) return;
    if (mode === 'grid') statusDiv.textContent = "MODE_SEQUENTIAL";
    else if (mode === 'color') {
        statusDiv.textContent = "MODE_CHROMATIC";
        const hasColorData = images.every(img => img.colorVector);
        if (!hasColorData) await ensureColorData();
        const trainedCount = images.filter(img => is3D ? img.xC3 !== undefined : img.xC !== undefined).length;
        if (trainedCount < images.length) await trainColor(is3D);
    } else if (mode === 'lightness') {
        statusDiv.textContent = "MODE_LIGHTNESS";
        if (!is3D) { await setViewMode(true); return; }
        const hasLightness = images.every(img => img.zLight !== undefined);
        if (!hasLightness) calculateLightness();
    } else {
        statusDiv.textContent = "MODE_SEMANTIC";
        const trainedCount = images.filter(img => is3D ? img.x3 !== undefined : img.x !== undefined).length;
        if (trainedCount < images.length) is3D ? await train3D() : await train2D();
    }
    displayImages(images);
}

async function ensureColorData() {
    setLoading(true);
    const toProcess = images.filter(img => !img.colorVector);
    for (const img of toProcess) {
        try {
            const imgEl = await loadImage(img.thumbUrl);
            const color = getDominantColor(imgEl);
            img.color = color;
            img.colorVector = [color[0]/255, color[1]/255, color[2]/255];
        } catch(e){}
    }
}

const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
});

const getDominantColor = (imgEl) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;
    ctx.drawImage(imgEl, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
};

async function toggleView() {
    await setViewMode(!is3D);
}

let imageNodeElements = [];

function displayImages(imageList) {
    mapContainer.innerHTML = '';
    imageNodeElements = [];
    const coords = imageList.map((img, i) => {
        if (currentSort === 'grid') {
            if (is3D) {
                const side = Math.ceil(Math.cbrt(imageList.length));
                return { x: i % side, y: Math.floor(i / side) % side, z: Math.floor(i / (side * side)) };
            } else {
                const cols = Math.ceil(Math.sqrt(imageList.length));
                return { x: i % cols, y: Math.floor(i / cols), z: 0 };
            }
        } else if (currentSort === 'color') return is3D ? {x: img.xC3, y: img.yC3, z: img.zC3} : {x: img.xC, y: img.yC, z: 0};
        else if (currentSort === 'lightness') return {x: img.xLight, y: img.yLight, z: img.zLight};
        else return is3D ? {x: img.x3, y: img.y3, z: img.z3} : {x: img.x, y: img.y, z: 0};
    });
    const validIndices = coords.map((c, i) => c.x !== undefined ? i : -1).filter(i => i !== -1);
    if (validIndices.length === 0) return;
    const validCoords = validIndices.map(i => coords[i]);
    let maxX = Math.max(...validCoords.map(c => c.x), 1);
    let maxY = Math.max(...validCoords.map(c => c.y), 1);
    let maxZ = Math.max(...validCoords.map(c => c.z), 1);
    const cellW = 4000 / (maxX + 2); const cellH = 4000 / (maxY + 2); const cellD = 4000 / (maxZ + 2);
    mapContainer.style.backgroundSize = `${cellW}px ${cellH}px`;
    const fragment = document.createDocumentFragment();
    validIndices.forEach(index => {
        const img = imageList[index]; const c = coords[index];
        const el = document.createElement('div');
        el.className = 'image-node'; el.id = `node-${index}`;
        const sizeW = is3D ? 80 : cellW; const sizeH = is3D ? 80 : cellH;
        el.style.width = `${sizeW}px`; el.style.height = `${sizeH}px`;
        const x = c.x * cellW; const y = c.y * cellH; const z = c.z * cellD;
        el.style.setProperty('--tx', `${x}px`); el.style.setProperty('--ty', `${y}px`); el.style.setProperty('--tz', `${z}px`);
        el._tz_val = z; el._visible = true;
        el.onmouseenter = () => {
            let content = `ID: ${img.name.toUpperCase()}<br>`;
            if (img.keywords && img.keywords.length > 0) content += `TAG: ${img.keywords[0].className.toUpperCase()}<br>`;
            content += `POS: [${Math.round(x)},${Math.round(y)},${Math.round(z)}]`;
            semanticInfoDiv.innerHTML = content;
            if (is3D) return;
            mapContainer.classList.add('node-hovered'); el.classList.add('is-hovered');
            imageNodeElements.forEach((node) => {
                if (el === node || !node._visible) return;
                const dx = parseFloat(node.style.getPropertyValue('--tx')) - x;
                const dy = parseFloat(node.style.getPropertyValue('--ty')) - y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 200) { 
                    const force = (200 - dist) / 200;
                    node.style.setProperty('--px', `${(dx/dist)*20*force}px`);
                    node.style.setProperty('--py', `${(dy/dist)*20*force}px`);
                    node.classList.add('is-pushed');
                }
            });
        };
        el.onmouseleave = () => {
            mapContainer.classList.remove('node-hovered'); el.classList.remove('is-hovered');
            imageNodeElements.forEach(node => {
                if(node.classList.contains('is-pushed')) {
                    node.style.setProperty('--px', `0px`); node.style.setProperty('--py', `0px`);
                    node.classList.remove('is-pushed');
                }
            });
        };
        el.onclick = (e) => { if (e.shiftKey) { e.stopPropagation(); highlightNeighbors(index); } };
        el.ondblclick = (e) => { e.stopPropagation(); showLightbox(img.url); };
        const imageElement = document.createElement('img');
        imageElement.src = img.thumbUrl; imageElement.loading = 'lazy';
        el.appendChild(imageElement); fragment.appendChild(el); imageNodeElements.push(el);
    });
    mapContainer.appendChild(fragment); mapContainer.className = is3D ? 'is-3d' : '';
    if (!is3D) centerMap();
}

function highlightNeighbors(targetIndex) {
    const target = images[targetIndex]; if (!target.features) return;
    imageNodeElements.forEach(n => { n.style.opacity = '0.1'; n.style.border = 'none'; });
    const dists = images.map((img, i) => {
        if (!img.features) return { idx: i, d: Infinity };
        let d = 0; for(let k=0; k<img.features.length; k++) d += (img.features[k] - target.features[k])**2;
        return { idx: i, d: d };
    });
    dists.sort((a,b) => a.d - b.d);
    dists.slice(0, 10).forEach(item => {
        const el = imageNodeElements.find(node => node.id === `node-${item.idx}`);
        if (el) { el.style.opacity = '1'; el.style.border = '2px solid red'; }
    });
}

function clearAll() {
    document.getElementById('search-input').value = '';
    imageNodeElements.forEach(el => { el.style.opacity = '1'; el.style.border = 'none'; el.classList.remove('highlight'); });
    statusDiv.textContent = 'SYSTEM_READY';
}

function searchImages() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    if (!keyword) { clearAll(); return; }
    let matchCount = 0; let sumX = 0, sumY = 0, sumZ = 0;
    imageNodeElements.forEach((el, i) => {
        const img = images[i]; if (!img) return;
        const match = img.keywords && img.keywords.some(p => p.className.toLowerCase().includes(keyword));
        if (match) {
            el.style.opacity = '1'; matchCount++;
            const x = parseFloat(el.style.getPropertyValue('--tx'));
            const y = parseFloat(el.style.getPropertyValue('--ty'));
            sumX += x; sumY += y; sumZ += el._tz_val;
        } else { el.style.opacity = '0.1'; }
    });
    statusDiv.textContent = `MATCH_FOUND: ${matchCount}`;
    if (matchCount > 0) {
        if (is3D) {
            transX = -sumX / matchCount + main.clientWidth/2; transY = -sumY / matchCount + main.clientHeight/2;
            transZ = - (sumZ / matchCount) - 1000; updateTransform();
        } else {
            pointX = -sumX / matchCount + main.clientWidth/2; pointY = -sumY / matchCount + main.clientHeight/2;
            scale = 1; updateTransform();
        }
    }
}

// --- Navigation & Transforms ---
const main = document.getElementById('main');
let scale = 1, pointX = 0, pointY = 0;
let rotX = -20, rotY = 45, transX = 0, transY = 0, transZ = -2000;
let isDragging = false, dragButton = 0, startX = 0, startY = 0;
let isSpacePressed = false;
let isAutoMoveEnabled = true;
let driftSpeed = 0.5;
let driftInterval = 20;

function toggleAutoMove() {
    isAutoMoveEnabled = !isAutoMoveEnabled;
    const btn = document.getElementById('auto-move-toggle');
    if (btn) btn.textContent = `AUTODRIFT: ${isAutoMoveEnabled ? 'ON' : 'OFF'}`;
    localStorage.setItem('autoMove', isAutoMoveEnabled);
    if (isAutoMoveEnabled) randomizeTargetVelocity();
}

function updateDriftSpeed(val) { driftSpeed = parseFloat(val); }
function updateDriftInterval(val) { driftInterval = parseInt(val); }

let autoMoveTime = 0;
let driftVelX = 0, driftVelY = 0, driftVelZ = 0;
let targetVelX = 0, targetVelY = 0, targetVelZ = 0;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsUpdateTime = 0;

function randomizeTargetVelocity() {
    const axis = Math.floor(Math.random() * 3); 
    const dir = Math.random() > 0.5 ? 1 : -1;
    const mag = 1.0 + Math.random(); 
    targetVelX = (axis === 0) ? dir * mag : 0;
    targetVelY = (axis === 1) ? dir * mag : 0;
    targetVelZ = (axis === 2) ? dir * mag : 0;
}

function animate(now) {
    frameCount++;
    if (now - fpsUpdateTime > 500) {
        const fps = Math.round((frameCount * 1000) / (now - fpsUpdateTime));
        if (fpsCounterEl) fpsCounterEl.textContent = `FPS: ${fps}`;
        frameCount = 0; fpsUpdateTime = now;
    }
    lastFrameTime = now;
    if (is3D && !isDragging) {
        if (isAutoMoveEnabled) {
            autoMoveTime += 0.01;
            rotX += (0 - rotX) * 0.02; rotY += (0 - rotY) * 0.02;
            if (Math.floor(autoMoveTime / driftInterval) !== Math.floor((autoMoveTime - 0.01) / driftInterval)) {
                randomizeTargetVelocity();
            }
            driftVelX += (targetVelX - driftVelX) * 0.01;
            driftVelY += (targetVelY - driftVelY) * 0.01;
            driftVelZ += (targetVelZ - driftVelZ) * 0.01;
            transX += driftVelX * driftSpeed; transY += driftVelY * driftSpeed;
            transZ += driftVelZ * driftSpeed * 2; transZ = Math.min(0, Math.max(-8000, transZ));
        }
        updateTransform(); updateProximityFading();
    }
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

let staggeredIndex = 0;
const BATCH_SIZE = 200;

function updateProximityFading() {
    if (!is3D || imageNodeElements.length === 0) return;
    const start = staggeredIndex; const end = Math.min(start + BATCH_SIZE, imageNodeElements.length);
    for (let i = start; i < end; i++) {
        const node = imageNodeElements[i];
        const worldZ = node._tz_val + transZ;
        if (worldZ > 200 || worldZ < -6000) {
            if (node._visible) { node.style.display = 'none'; node._visible = false; }
            continue;
        } else {
            if (!node._visible) { node.style.display = 'block'; node._visible = true; }
        }
        let opacity = 1; let brightness = 1;
        if (worldZ > -500) opacity = Math.max(0, Math.min(1, (worldZ + 1000) / 500 - 1));
        if (worldZ < -2000) brightness = Math.max(0.1, 1 - (Math.abs(worldZ + 2000) / 4000));
        node.style.opacity = opacity; node.style.filter = `brightness(${brightness})`;
    }
    staggeredIndex = (staggeredIndex + BATCH_SIZE) % imageNodeElements.length;
}

window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space') isSpacePressed = true; 
    if (e.code === 'KeyH') toggleUI();
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') isSpacePressed = false; });
function updateTransform() {
    if (is3D) {
        mapContainer.style.transformOrigin = 'center center';
        mapContainer.style.transform = `translateX(${transX}px) translateY(${transY}px) translateZ(${transZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    } else {
        mapContainer.style.transformOrigin = '0 0';
        mapContainer.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }
}
function reset3DView() { rotX = -20; rotY = 45; transX = 0; transY = 0; transZ = -2000; updateTransform(); }
function centerMap() {
    if (is3D) reset3DView();
    else {
        const rect = main.getBoundingClientRect();
        scale = 0.2;
        pointX = (rect.width - 4000 * scale) / 2;
        pointY = (rect.height - 4000 * scale) / 2;
        updateTransform();
    }
}
function updateZScale(val) { mapContainer.style.setProperty('--z-scale', val); }
function nav(direction) {
    const step = 200; 
    if (is3D) {
        switch(direction) {
            case 'up': transY += step; break; case 'down': transY -= step; break;
            case 'left': transX += step; break; case 'right': transX -= step; break;
        }
    } else {
        switch(direction) {
            case 'up': pointY += step; break; case 'down': pointY -= step; break;
            case 'left': pointX += step; break; case 'right': pointX -= step; break;
        }
    }
    updateTransform();
}
function zoomIn() { if (is3D) { transZ += 500; updateTransform(); } else { scale = Math.min(scale * 1.2, 5); updateTransform(); } }
function zoomOut() { if (is3D) { transZ -= 500; updateTransform(); } else { scale = Math.max(scale / 1.2, 0.05); updateTransform(); } }

const mapControls = document.getElementById('map-controls');
if (mapControls) mapControls.addEventListener('mousedown', (e) => e.stopPropagation());
main.addEventListener('contextmenu', (e) => e.preventDefault());
main.addEventListener('mousedown', (e) => {
    if (e.target === main || e.target === mapContainer) clearAll();
    if (isSpacePressed || e.button === 2) dragButton = 2; 
    else if (e.button === 0) dragButton = 0; else return;
    e.preventDefault(); startX = e.clientX; startY = e.clientY; isDragging = true;
});
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault(); const dx = e.clientX - startX; const dy = e.clientY - startY;
    if (is3D) { transX += dx; transY += dy; } else { pointX += dx; pointY += dy; }
    startX = e.clientX; startY = e.clientY; updateTransform();
});
window.addEventListener('mouseup', () => isDragging = false);
main.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (is3D) { transZ -= e.deltaY * 2; transZ = Math.min(0, Math.max(-10000, transZ)); }
    else {
        const rect = main.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const targetX = (mouseX - pointX) / scale;
        const targetY = (mouseY - pointY) / scale;
        const factor = -e.deltaY > 0 ? 1.1 : 0.9;
        let newScale = Math.min(Math.max(0.05, scale * factor), 5);
        pointX = mouseX - targetX * newScale;
        pointY = mouseY - targetY * newScale;
        scale = newScale;
    }
    updateTransform();
});

const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme');
const savedAutoMove = localStorage.getItem('autoMove');
if (savedAutoMove !== null) {
    isAutoMoveEnabled = savedAutoMove === 'true';
    const btn = document.getElementById('auto-move-toggle');
    if (btn) btn.textContent = `AUTODRIFT: ${isAutoMoveEnabled ? 'ON' : 'OFF'}`;
}
if (savedTheme === 'dark') document.body.classList.add('dark-mode');
themeToggle.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};
randomizeTargetVelocity(); centerMap();
