// som-worker.js - Web Worker for Self-Organizing Map training
// Runs in a separate thread to prevent UI blocking

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

    train(data, progressCallback) {
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

            // Report progress every 20 iterations
            if (i % 20 === 0 && progressCallback) {
                progressCallback(i, this.iterations);
            }
        }
        
        if (progressCallback) {
            progressCallback(this.iterations, this.iterations);
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

    // Map all vectors to BMU positions
    mapVectors(vectors) {
        return vectors.map(vec => this.getBMU(vec));
    }
}

// Worker message handler
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    if (type === 'train') {
        const { width, height, depth, vectors, iterations } = data;
        const inputDim = vectors[0].length;
        
        const som = new SimpleSOM(width, height, depth, inputDim, iterations);
        
        // Train the SOM
        som.train(vectors, (current, total) => {
            self.postMessage({
                type: 'progress',
                data: { current, total }
            });
        });
        
        // Map all vectors to their BMU positions
        const positions = som.mapVectors(vectors);
        
        // Send results back to main thread
        self.postMessage({
            type: 'complete',
            data: { positions }
        });
    }
};
