/**
 * SigLIP Zero-Shot Classification Labels
 * 
 * Optimized vocabulary for artistic/design/fashion photography.
 * These labels are pre-encoded during model initialization for fast classification.
 * Expanded for better granularity and coverage with SigLIP's improved accuracy.
 */

const CANDIDATE_LABELS = [
    // Photography Styles
    'black and white', 'monochrome', 'minimalist', 'abstract', 'conceptual', 'artistic',
    'high contrast', 'moody', 'dramatic', 'cinematic', 'editorial', 'fine art',
    'documentary', 'candid', 'staged', 'environmental portrait', 'lifestyle',
    
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
    'double exposure', 'fragmented', 'collage', 'montage',
    
    // Materials & Finishes
    'leather', 'silk', 'velvet', 'satin', 'linen', 'cotton',
    'chrome', 'gold', 'silver', 'copper', 'brass',
    'marble', 'granite', 'stone', 'wood', 'metal',
    'glass', 'crystal', 'plastic', 'rubber', 'fabric',
    'glossy', 'matte', 'brushed metal', 'polished', 'rough',
    
    // Specific Lighting Techniques
    'neon', 'neon lights', 'led', 'golden hour', 'blue hour',
    'softbox', 'strobe', 'flash', 'natural light', 'window light',
    'overhead lighting', 'side lighting', 'studio lighting',
    'candlelight', 'firelight', 'twilight', 'dusk', 'dawn',
    'harsh shadows', 'soft shadows', 'volumetric light', 'rays of light',
    
    // Aesthetics & Design Movements
    'bauhaus', 'art deco', 'art nouveau', 'modernism', 'postmodernism',
    'swiss design', 'international style', 'memphis design',
    'mid century modern', 'scandinavian design', 'japanese aesthetic',
    'wabi sabi', 'kinfolk', 'hygge', 'maximalist',
    'y2k', 'retro', 'vintage', 'nostalgic', 'futuristic',
    'cyberpunk', 'vaporwave', 'synthwave', 'glitch art',
    
    // Mood & Atmosphere
    'serene', 'calm', 'peaceful', 'tranquil', 'zen',
    'energetic', 'dynamic', 'vibrant', 'lively', 'playful',
    'melancholic', 'somber', 'dark', 'gloomy', 'ominous',
    'ethereal', 'mystical', 'magical', 'whimsical',
    'clinical', 'sterile', 'pristine', 'raw', 'gritty',
    'intimate', 'vulnerable', 'powerful', 'bold', 'delicate',
    
    // Technical Photography Details
    'shallow depth of field', 'bokeh', 'out of focus',
    'sharp focus', 'tack sharp', 'motion blur', 'long exposure',
    'grain', 'grainy', 'film grain', 'smooth', 'crisp',
    'wide angle', 'fisheye', 'telephoto', 'macro', 'close up',
    'aerial view', 'birds eye view', 'overhead shot', 'low angle',
    'dutch angle', 'tilted', 'panoramic', 'cropped',
    
    // Fashion Specific Details
    'runway', 'catwalk', 'lookbook', 'campaign',
    'knitwear', 'denim', 'tailoring', 'draping', 'pleated',
    'layered clothing', 'oversized', 'fitted', 'flowing',
    'structured', 'deconstructed', 'distressed', 'embroidered',
    'printed', 'textured clothing', 'sheer', 'transparent',
    
    // Design Elements
    'gradient', 'ombre', 'color blocking', 'monochromatic',
    'complementary colors', 'analogous colors', 'split complementary',
    'border', 'frame', 'vignette', 'rule of thirds',
    'leading lines', 'vanishing point', 'depth', 'perspective',
    'isolation', 'emphasis', 'contrast', 'harmony', 'rhythm',
    
    // Seasonal & Time
    'spring', 'summer', 'autumn', 'winter',
    'seasonal', 'holiday', 'festive',
    
    // Specific Colors
    'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'beige', 'tan', 'navy', 'teal',
    'burgundy', 'emerald', 'coral', 'mint', 'lavender',
    'black', 'white', 'gray', 'grey', 'cream', 'ivory'
];

/**
 * Clean a label by removing common CLIP prompt artifacts
 * Uses smart regex to avoid breaking words like "photography"
 * @param {string} label - Raw label from CLIP
 * @returns {string} - Cleaned label
 */
function cleanLabel(label) {
    // Only remove "a photo of", "an image of", etc. if they are at the START
    let cleaned = label.replace(/^(a photo of|an image of|a picture of|an|a|the)\s+/i, '');
    
    // Only remove standalone "photo" or "image" (e.g., "mountain photo" -> "mountain")
    // but keep "photography" intact using word boundaries
    cleaned = cleaned.replace(/\b(photo|image)\b/gi, '');
    
    return cleaned.trim();
}

module.exports = {
    CANDIDATE_LABELS,
    cleanLabel
};
