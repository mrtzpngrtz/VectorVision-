const ort = require('onnxruntime-node');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');

let visionSession = null;
let textSession = null;
let hardwareProvider = 'cpu';

// CLIP model URLs (ONNX format) - Using Xenova's properly converted models
const MODEL_URLS = {
    vision: 'https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model.onnx',
    text: 'https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/text_model.onnx'
};

const MODELS_DIR = path.join(__dirname, '..', 'models');
const VISION_MODEL_PATH = path.join(MODELS_DIR, 'clip_vision.onnx');
const TEXT_MODEL_PATH = path.join(MODELS_DIR, 'clip_text.onnx');

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Download model if not exists
async function downloadModel(url, outputPath) {
    if (fs.existsSync(outputPath)) {
        console.log(`Model already exists: ${outputPath}`);
        return;
    }

    console.log(`Downloading model from ${url}...`);
    const writer = fs.createWriteStream(outputPath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log(`Model downloaded: ${outputPath}`);
            resolve();
        });
        writer.on('error', reject);
    });
}

// Detect and configure hardware acceleration
function getExecutionProviders() {
    const platform = process.platform;
    
    if (platform === 'win32') {
        // Windows: Try DirectML first
        try {
            console.log('Attempting to use DirectML execution provider (Windows GPU)...');
            hardwareProvider = 'DirectML';
            return ['dml', 'cpu'];
        } catch (e) {
            console.log('DirectML not available, falling back to CPU');
            hardwareProvider = 'CPU';
            return ['cpu'];
        }
    } else if (platform === 'darwin') {
        // macOS: Try CoreML
        try {
            console.log('Attempting to use CoreML execution provider (macOS Neural Engine)...');
            hardwareProvider = 'CoreML';
            return ['coreml', 'cpu'];
        } catch (e) {
            console.log('CoreML not available, falling back to CPU');
            hardwareProvider = 'CPU';
            return ['cpu'];
        }
    } else {
        // Linux: Try CUDA if available
        hardwareProvider = 'CPU';
        return ['cpu'];
    }
}

async function loadModel() {
    if (visionSession && textSession) {
        return { hardwareProvider };
    }

    try {
        // Download models if needed
        console.log('Checking CLIP models...');
        await downloadModel(MODEL_URLS.vision, VISION_MODEL_PATH);
        await downloadModel(MODEL_URLS.text, TEXT_MODEL_PATH);

        const executionProviders = getExecutionProviders();
        console.log('Using execution providers:', executionProviders);

        // Load vision model for image embeddings
        visionSession = await ort.InferenceSession.create(VISION_MODEL_PATH, {
            executionProviders: executionProviders
        });
        console.log('CLIP Vision model loaded');

        // Load text model for zero-shot classification
        textSession = await ort.InferenceSession.create(TEXT_MODEL_PATH, {
            executionProviders: executionProviders
        });
        console.log('CLIP Text model loaded');

        console.log(`Hardware acceleration: ${hardwareProvider}`);
        return { hardwareProvider };
    } catch (error) {
        console.error('Error loading CLIP models:', error);
        throw error;
    }
}

// Preprocess image for CLIP (224x224, normalized)
async function preprocessImage(imagePath) {
    try {
        // CLIP preprocessing: resize to 224x224, normalize with ImageNet stats
        const { data, info } = await sharp(imagePath)
            .resize(224, 224, { fit: 'cover' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Convert to float32 and normalize
        const float32Data = new Float32Array(3 * 224 * 224);
        const mean = [0.48145466, 0.4578275, 0.40821073];
        const std = [0.26862954, 0.26130258, 0.27577711];

        for (let i = 0; i < 224 * 224; i++) {
            // RGB -> normalized channels
            float32Data[i] = (data[i * 3] / 255.0 - mean[0]) / std[0]; // R
            float32Data[224 * 224 + i] = (data[i * 3 + 1] / 255.0 - mean[1]) / std[1]; // G
            float32Data[224 * 224 * 2 + i] = (data[i * 3 + 2] / 255.0 - mean[2]) / std[2]; // B
        }

        const tensor = new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
        return tensor;
    } catch (error) {
        console.error('Error preprocessing image:', error);
        throw error;
    }
}

// Simple CLIP tokenizer (basic version - matches CLIP's vocabulary)
function tokenizeText(text) {
    const maxLength = 77;
    const tokens = new BigInt64Array(maxLength).fill(49407n); // Fill with end token (int64)
    
    // Start token
    tokens[0] = 49406n;
    
    // Very basic tokenization: convert text to lowercase and split by words
    // This is simplified - real CLIP uses BPE tokenizer
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    
    // Map common words to approximate token IDs (very simplified)
    const vocab = {
        'photo': 1125, 'image': 2274, 'picture': 3937,
        'person': 2533, 'people': 2559, 'man': 786, 'woman': 1590,
        'car': 1615, 'vehicle': 4329, 'automobile': 14013,
        'building': 2311, 'architecture': 5594, 'house': 2353,
        'animal': 3724, 'dog': 1611, 'cat': 2368, 'pet': 3712,
        'nature': 3820, 'landscape': 4034, 'scenery': 18338,
        'food': 2057, 'meal': 7577, 'dinner': 8633,
        'indoor': 7877, 'outdoor': 8942, 'inside': 2503, 'outside': 3225,
        'sky': 3901, 'cloud': 6648, 'water': 2149, 'ocean': 5915,
        'city': 2260, 'urban': 7393, 'street': 2690, 'road': 3166,
        'art': 2083, 'painting': 4169, 'artwork': 8266,
        'tree': 3392, 'forest': 8054, 'plant': 3627,
        'a': 320, 'of': 539, 'the': 518, 'in': 530, 'with': 593
    };
    
    let pos = 1;
    for (const word of words) {
        if (pos >= maxLength - 1) break;
        if (vocab[word]) {
            tokens[pos++] = BigInt(vocab[word]);
        } else {
            // Unknown word - use generic token
            tokens[pos++] = 1000n;
        }
    }
    
    // End token at position pos
    tokens[pos] = 49407n;
    
    return new ort.Tensor('int64', tokens, [1, maxLength]);
}

// Extract image features using CLIP
async function extractImageFeatures(imagePath) {
    try {
        const imageTensor = await preprocessImage(imagePath);
        
        const feeds = { pixel_values: imageTensor };
        const results = await visionSession.run(feeds);
        
        // Get image embeddings (pooled output)
        const embedding = results.image_embeds || results.pooler_output;
        const features = Array.from(embedding.data);
        
        return features;
    } catch (error) {
        console.error('Error extracting image features:', error);
        throw error;
    }
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Softmax function
function softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sumExps);
}

// Extract text features using CLIP text encoder
async function extractTextFeatures(text) {
    try {
        const inputIds = tokenizeText(text);
        
        const feeds = { input_ids: inputIds };
        const results = await textSession.run(feeds);
        
        // Get text embeddings
        const embedding = results.text_embeds || results.pooler_output;
        const features = Array.from(embedding.data);
        
        return features;
    } catch (error) {
        console.error('Error extracting text features:', error);
        throw error;
    }
}

// Zero-shot classification with CLIP - Comprehensive open vocabulary
async function classifyImage(imagePath) {
    try {
        const imageFeatures = await extractImageFeatures(imagePath);
        
        // CLIP's powerful open vocabulary - 120+ diverse categories
        const candidateLabels = [
            // People & Portraits (12)
            'a photo of a person', 'a photo of people', 'a group photo', 'a selfie',
            'a portrait', 'a close-up of a face', 'children playing', 'a family photo',
            'a wedding photo', 'people at a party', 'a crowd', 'friends together',
            
            // Animals & Pets (12)
            'a photo of a dog', 'a photo of a cat', 'a photo of an animal',
            'a bird', 'a horse', 'wildlife', 'a pet', 'animals in nature',
            'an insect', 'a fish', 'marine life', 'a butterfly',
            
            // Vehicles & Transportation (12)
            'a photo of a car', 'a truck', 'a motorcycle', 'a bicycle',
            'an airplane', 'a boat', 'a ship', 'a train', 'public transportation',
            'a sports car', 'classic car', 'a vehicle on the road',
            
            // Architecture & Buildings (12)
            'a photo of a building', 'modern architecture', 'a house', 'a skyscraper',
            'a church', 'a bridge', 'historical building', 'interior design',
            'a room', 'a bedroom', 'a kitchen', 'a living room',
            
            // Nature & Landscapes (16)
            'a photo of nature', 'a landscape', 'a mountain', 'a forest',
            'a beach', 'desert landscape', 'countryside', 'a sunset', 'a sunrise',
            'autumn scenery', 'winter scene', 'spring flowers', 'summer landscape',
            'a tree', 'flowers', 'grass', 'leaves',
            
            // Sky & Weather (9)
            'a photo of the sky', 'clouds', 'a clear sky', 'dramatic sky',
            'a stormy sky', 'blue sky', 'night sky', 'stars', 'the moon',
            
            // Water & Aquatic (8)
            'a photo of water', 'the ocean', 'a lake', 'a river', 'a waterfall',
            'underwater scene', 'waves', 'reflection on water',
            
            // Urban & City (11)
            'a photo of a city', 'city skyline', 'a street', 'urban scene',
            'downtown', 'a road', 'pedestrians', 'traffic', 'nightlife',
            'a shop', 'a restaurant', 'a cafe',
            
            // Food & Dining (13)
            'a photo of food', 'a meal', 'breakfast', 'lunch', 'dinner',
            'dessert', 'a salad', 'a drink', 'coffee', 'cake', 'pizza',
            'Asian cuisine', 'Italian food', 'fast food', 'fine dining',
            
            // Art & Culture (11)
            'a photo of art', 'a painting', 'a sculpture', 'street art',
            'graffiti', 'an artwork', 'abstract art', 'a museum', 'a gallery',
            'illustration', 'digital art',
            
            // Events & Activities (8)
            'a concert', 'a performance', 'a sports event', 'a festival',
            'a celebration', 'a birthday party', 'fireworks', 'a ceremony',
            
            // Objects & Items (10)
            'a photo of a book', 'a computer', 'a phone', 'furniture',
            'a clock', 'a lamp', 'toys', 'electronics', 'clothing', 'shoes',
            
            // Sports & Recreation (8)
            'a sports photo', 'people playing sports', 'a gym', 'hiking',
            'skiing', 'surfing', 'a ball', 'outdoor activities',
            
            // Scenes & Environments (9)
            'an indoor photo', 'an outdoor photo', 'a cozy interior',
            'a bright room', 'dim lighting', 'minimalist design',
            'vintage style', 'modern design', 'rustic setting',
            
            // Technical & Style (10)
            'black and white photo', 'colorful image', 'macro photography',
            'aerial view', 'birds eye view', 'close-up shot', 'wide angle shot',
            'blurred background', 'bokeh effect', 'long exposure'
        ];
        
        // Encode all text labels
        const textFeatures = await Promise.all(
            candidateLabels.map(label => extractTextFeatures(label))
        );
        
        // Compute cosine similarities
        const similarities = textFeatures.map(textFeat => 
            cosineSimilarity(imageFeatures, textFeat)
        );
        
        // Apply temperature scaling and softmax
        const temperature = 100; // CLIP's default temperature
        const logits = similarities.map(s => s * temperature);
        const probabilities = softmax(logits);
        
        // Create results with probabilities
        const results = candidateLabels.map((label, i) => ({
            label: label.replace('a photo of ', '').replace('an ', '').replace('a ', '').replace('the ', '').replace('photo', '').trim(),
            probability: probabilities[i]
        }));
        
        // Sort by probability and get top results
        results.sort((a, b) => b.probability - a.probability);
        
        // Return top 3 with meaningful confidence (adaptive threshold)
        const threshold = 0.03; // 3% minimum threshold
        const keywords = results
            .filter(r => r.probability >= threshold)
            .slice(0, 3)
            .map(r => ({
                className: r.label,
                probability: r.probability
            }));
        
        // Always return at least the top result
        if (keywords.length === 0 && results.length > 0) {
            return [{
                className: results[0].label,
                probability: results[0].probability
            }];
        }
        
        return keywords;
    } catch (error) {
        console.error('Error classifying image:', error);
        // Return empty array on error
        return [];
    }
}

// Extract dominant color
async function extractColor(imagePath) {
    try {
        // Downsample to 1x1 to get average color
        const { data } = await sharp(imagePath)
            .resize(1, 1, { fit: 'cover' })
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const [r, g, b] = data;
        return {
            color: [r, g, b],
            colorVector: [r / 255.0, g / 255.0, b / 255.0]
        };
    } catch (error) {
        console.error('Error extracting color:', error);
        return null;
    }
}

// Main feature extraction function
async function extractFeatures(imagePath) {
    try {
        await loadModel();
        
        // Extract CLIP features
        const features = await extractImageFeatures(imagePath);
        
        // Extract keywords using zero-shot classification
        const keywords = await classifyImage(imagePath);
        
        // Extract color
        const colorData = await extractColor(imagePath);
        
        return {
            features,
            keywords,
            color: colorData ? colorData.color : null,
            colorVector: colorData ? colorData.colorVector : null
        };
    } catch (error) {
        console.error(`Error analyzing ${imagePath}:`, error);
        throw error;
    }
}

module.exports = { 
    loadModel, 
    extractFeatures,
    getHardwareProvider: () => hardwareProvider
};
