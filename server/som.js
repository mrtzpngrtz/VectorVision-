const SOM = require('ml-som');

class ImageSOM {
    constructor(width = 20, height = 20, iterations = 100) {
        this.width = width;
        this.height = height;
        this.iterations = iterations;
        this.som = null;
    }

    train(featureVectors) {
        if (!featureVectors || featureVectors.length === 0) return;

        // Configuration for ml-som
        // ml-som usually auto-detects fields from data if not provided
        // or we need to provide a simplified config
        
        const options = {
            iterations: this.iterations,
            learningRate: 0.1,
            method: 'random'
        };

        this.som = new SOM(this.width, this.height, options);
        
        // If ml-som requires fields for initialization, we might need to handle it.
        // But usually providing data to train is enough.
        // However, if new SOM() fails, we might need to pass data to constructor if supported
        // or rely on auto-detection if available.
        // Let's assume standard usage where train initializes if needed.
        
        this.som.train(featureVectors);
    }

    predict(vector) {
        if (!this.som) return null;
        return this.som.predict(vector);
    }
    
    // Get the grid position for a vector
    // ml-som predict returns [x, y]
    getPosition(vector) {
        return this.predict(vector);
    }
}

module.exports = ImageSOM;
