const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const jpeg = require('jpeg-js');
const png = require('pngjs').PNG;
const sharp = require('sharp');

let model = null;

async function loadModel() {
    if (!model) {
        console.log('Loading MobileNet model...');
        // Use a lighter model (alpha=0.25) for faster CPU inference
        model = await mobilenet.load({ version: 2, alpha: 0.50 });
        console.log('Model loaded.');
    }
    return model;
}

async function decodeImage(imagePath) {
    const { data, info } = await sharp(imagePath)
        .removeAlpha() // Ensure 3 channels
        .resize(224, 224, { fit: 'fill' }) // Resize to MobileNet input size directly here for speed
        .raw()
        .toBuffer({ resolveWithObject: true });

    return tf.tidy(() => {
        return tf.tensor3d(data, [info.height, info.width, info.channels], 'int32');
    });
}

async function extractFeatures(imagePath) {
    await loadModel();
    let imageTensor;
    try {
        imageTensor = await decodeImage(imagePath);
        
        // Get features for SOM
        const activation = await model.infer(imageTensor, true); 
        const features = activation.arraySync().flat();
        activation.dispose();

        // Get classifications for Search (Keywords)
        const predictions = await model.classify(imageTensor);
        
        imageTensor.dispose();

        return { features, predictions }; 
    } catch (err) {
        console.error(`Error analyzing ${imagePath}:`, err);
        if (imageTensor) imageTensor.dispose();
        return null;
    }
}

async function extractColorStats(imagePath) {
    try {
        const stats = await sharp(imagePath).stats();
        return {
            dominant: stats.dominant,
            channels: stats.channels.map(c => ({ mean: c.mean, std: c.stdev }))
        };
    } catch (error) {
        console.error(`Error extracting color stats for ${imagePath}:`, error);
        return null;
    }
}

module.exports = { loadModel, extractFeatures, extractColorStats };
