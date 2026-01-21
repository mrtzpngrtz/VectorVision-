const ort = require('onnxruntime-node');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');

let visionSession = null;
let textSession = null;
let hardwareProvider = 'cpu';
let clipTokenizer = null;
let AutoTokenizer = null;

// Cache for pre-encoded text features (for performance)
let cachedTextFeatures = null;
let cachedCandidateLabels = null;

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

        // Load the proper CLIP tokenizer
        await loadTokenizer();

        // Pre-encode all text labels for zero-shot classification (performance optimization)
        console.log('Pre-encoding text labels for fast classification...');
        await preEncodeTextLabels();
        console.log('Text labels pre-encoded and cached');

        console.log(`Hardware acceleration: ${hardwareProvider}`);
        return { hardwareProvider };
    } catch (error) {
        console.error('Error loading CLIP models:', error);
        throw error;
    }
}

// Pre-encode all candidate labels for fast classification
async function preEncodeTextLabels() {
    // Expanded vocabulary for artistic/design/fashion photography
    const candidateLabels = [
        // Photography Styles
        'black and white', 'monochrome', 'minimalist', 'abstract', 'conceptual', 'artistic',
        'high contrast', 'moody', 'dramatic', 'cinematic', 'editorial', 'fine art',
        
        // Fashion & Style
        'fashion', 'fashion photography', 'fashion editorial', 'model', 'portrait', 'beauty', 'style', 'clothing', 'accessories',
        'elegant', 'sophisticated', 'contemporary', 'avant garde', 'runway', 'outfit',
        'haute couture', 'streetwear', 'minimalist fashion', 'luxury', 'designer',
        
        // Graphic Design & Typography
        'graphic design', 'typography', 'text', 'lettering', 'typeface', 'font',
        'poster', 'logo', 'branding', 'layout', 'design elements', 'visual identity',
        
        // Patterns & Textures
        'pattern', 'repeating pattern', 'geometric pattern', 'organic pattern',
        'texture', 'striped', 'dotted', 'grid', 'lines', 'circles', 'triangles',
        'diagonal', 'waves', 'chevron', 'abstract pattern',
        
        // Geometric & Shapes
        'geometric', 'geometric shape', 'circle', 'square', 'triangle',
        'sphere', 'cube', 'pyramid', 'hexagon', 'polygon', 'angular', 'curved',
        
        // Objects & Products
        'object', 'still life', 'product', 'product photography', 'commercial',
        'bottle', 'glass', 'container', 'tool', 'device', 'gadget', 'furniture',
        'car', 'vehicle', 'automobile', 'bike', 'bicycle', 'motorcycle',
        'phone', 'computer', 'camera', 'watch', 'jewelry', 'bag', 'shoe',
        'book', 'plant', 'flower', 'food', 'drink', 'cup', 'plate',
        
        // Space & Composition
        'negative space', 'empty space', 'minimal composition', 'sparse',
        'centered', 'symmetrical', 'asymmetrical', 'balanced', 'framing',
        
        // Light & Shadow
        'light', 'shadow', 'light and shadow', 'chiaroscuro', 'backlit', 'silhouette',
        'dramatic lighting', 'soft light', 'hard light', 'rim light', 'glow', 'luminous',
        'spotlight', 'contrast lighting',
        
        // Color (even for B&W collections)
        'colorful', 'vibrant', 'muted', 'pastel', 'saturated', 'desaturated',
        'warm tones', 'cool tones', 'gradients', 'tonal',
        
        // People & Portraits 
        'person', 'face', 'silhouette', 'figure', 'body', 'hands', 'eyes',
        'profile', 'closeup', 'headshot', 'full body', 'gesture',
        'man', 'woman', 'male', 'female',
        
        // Architecture & Interiors
        'architecture', 'building', 'interior', 'urban', 'structure',
        'modern architecture', 'brutalism', 'industrial', 'minimal interior',
        'concrete', 'glass', 'steel', 'facade',
        
        // Nature (Artistic)
        'nature', 'organic', 'natural form', 'botanical', 'landscape',
        'water', 'sky', 'clouds', 'mountains', 'desert', 'ocean', 'trees',
        
        // Urban & Street
        'street', 'city', 'urban', 'street photography', 'skyline',
        'alley', 'sidewalk', 'pedestrian',
        
        // Conceptual & Experimental
        'surreal', 'experimental', 'conceptual art', 'abstract art',
        'visual metaphor', 'symbolic', 'poetic', 'dreamlike', 'mysterious',
        'projection',
        
        // Composition & Style
        'composition', 'layered', 'overlapping', 'reflection', 'mirror',
        'double exposure', 'fragmented', 'collage', 'montage'
    ];
    
    // Encode all text labels once
    cachedCandidateLabels = candidateLabels;
    cachedTextFeatures = await Promise.all(
        candidateLabels.map(label => extractTextFeatures(label))
    );
    
    // Debug: Check if text features are actually different
    console.log('\n=== TEXT FEATURE DEBUG ===');
    console.log(`Encoded ${cachedTextFeatures.length} labels`);
    console.log(`Sample "black and white" first 5 values:`, cachedTextFeatures[0].slice(0, 5));
    console.log(`Sample "portrait" first 5 values:`, cachedTextFeatures[cachedCandidateLabels.indexOf('portrait')].slice(0, 5));
    console.log(`Sample "architecture" first 5 values:`, cachedTextFeatures[cachedCandidateLabels.indexOf('architecture')].slice(0, 5));
    
    // Check if they're all the same
    const firstFeature = cachedTextFeatures[0];
    const allSame = cachedTextFeatures.every(feat => 
        feat.every((val, idx) => Math.abs(val - firstFeature[idx]) < 0.0001)
    );
    console.log(`All features identical: ${allSame}`);
    console.log('========================\n');
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

// Load CLIP tokenizer
async function loadTokenizer() {
    if (clipTokenizer) return clipTokenizer;
    
    // Dynamically import ES module
    if (!AutoTokenizer) {
        const transformers = await import('@xenova/transformers');
        AutoTokenizer = transformers.AutoTokenizer;
    }
    
    console.log('Loading CLIP tokenizer...');
    clipTokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
    console.log('CLIP tokenizer loaded');
    return clipTokenizer;
}

// Proper CLIP tokenizer using BPE
async function tokenizeText(text) {
    if (!clipTokenizer) {
        await loadTokenizer();
    }
    
    const encoded = await clipTokenizer(text, {
        padding: 'max_length',
        max_length: 77,
        truncation: true,
        return_tensors: false
    });
    
    // Extract token IDs - handle different return formats
    let tokenIds;
    if (encoded.input_ids && Array.isArray(encoded.input_ids)) {
        tokenIds = encoded.input_ids;
    } else if (encoded.input_ids && encoded.input_ids.data) {
        // Tensor format
        tokenIds = Array.from(encoded.input_ids.data);
    } else if (Array.isArray(encoded)) {
        tokenIds = encoded;
    } else {
        console.error('Unexpected tokenizer output format:', encoded);
        tokenIds = [49406, 49407]; // Fallback: [BOS, EOS]
    }
    
    // Debug first 3 calls
    if (!tokenizeText.callCount) tokenizeText.callCount = 0;
    if (tokenizeText.callCount < 3) {
        console.log(`\nTokenizing "${text}":`, tokenIds.slice(0, 10));
        tokenizeText.callCount++;
    }
    
    // Convert to BigInt64Array for ONNX
    const tokens = new BigInt64Array(77);
    for (let i = 0; i < Math.min(tokenIds.length, 77); i++) {
        tokens[i] = BigInt(tokenIds[i]);
    }
    
    return new ort.Tensor('int64', tokens, [1, 77]);
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
        const inputIds = await tokenizeText(text);
        
        const feeds = { input_ids: inputIds };
        const results = await textSession.run(feeds);
        
        // Get text embeddings
        const embedding = results.text_embeds || results.pooler_output;
        const features = Array.from(embedding.data);
        
        // Normalize text features to unit length for consistent comparison
        let norm = 0;
        for (let i = 0; i < features.length; i++) {
            norm += features[i] * features[i];
        }
        norm = Math.sqrt(norm);
        const normalizedFeatures = features.map(v => v / norm);
        
        return normalizedFeatures;
    } catch (error) {
        console.error('Error extracting text features:', error);
        throw error;
    }
}

// Zero-shot classification with CLIP - Using cached text features for performance
async function classifyImage(imagePath) {
    try {
        const imageFeatures = await extractImageFeatures(imagePath);
        
        // Use cached text features (pre-encoded during model loading)
        if (!cachedTextFeatures || !cachedCandidateLabels) {
            console.error('Text features not cached! This should not happen.');
            return [];
        }
        
        // Normalize image features for better comparison
        const imageFeaturesArray = Array.isArray(imageFeatures) ? imageFeatures : Array.from(imageFeatures);
        let imgNorm = 0;
        for (let i = 0; i < imageFeaturesArray.length; i++) {
            imgNorm += imageFeaturesArray[i] * imageFeaturesArray[i];
        }
        imgNorm = Math.sqrt(imgNorm);
        const normalizedImageFeatures = imageFeaturesArray.map(v => v / imgNorm);
        
        // Compute cosine similarities using cached text features (FAST!)
        const similarities = cachedTextFeatures.map(textFeat => 
            cosineSimilarity(normalizedImageFeatures, textFeat)
        );
        
        // Apply temperature scaling and softmax
        const temperature = 100; // CLIP's default temperature
        const logits = similarities.map(s => s * temperature);
        const probabilities = softmax(logits);
        
        // Create results with probabilities
        const results = cachedCandidateLabels.map((label, i) => ({
            label: label.replace('a photo of ', '').replace('an ', '').replace('a ', '').replace('the ', '').replace('photo', '').trim(),
            probability: probabilities[i],
            similarity: similarities[i]
        }));
        
        // Sort by probability and get top results
        results.sort((a, b) => b.probability - a.probability);
        
        // Debug: Log top 5 results for first few images
        const baseName = require('path').basename(imagePath);
        if (Math.random() < 0.05) { // Log 5% of images
            console.log(`\nTop 5 for ${baseName}:`);
            results.slice(0, 5).forEach((r, i) => {
                console.log(`  ${i+1}. ${r.label}: ${(r.probability * 100).toFixed(2)}% (sim: ${r.similarity.toFixed(4)})`);
            });
        }
        
        // Return top 5 with meaningful confidence (adaptive threshold)
        const threshold = 0.01; // Lower threshold to 1%
        const keywords = results
            .filter(r => r.probability >= threshold)
            .slice(0, 5)
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
