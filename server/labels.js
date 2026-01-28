/**
 * CLIP Zero-Shot Classification Labels
 * 
 * Optimized vocabulary for artistic/design/fashion photography.
 * These labels are pre-encoded during model initialization for fast classification.
 */

const CANDIDATE_LABELS = [
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

/**
 * Label cleaning configuration
 * These prefixes/suffixes are stripped from CLIP labels to produce cleaner output
 */
const LABEL_CLEANUP_PATTERNS = [
    'a photo of ',
    'an ',
    'a ',
    'the ',
    'photo'
];

/**
 * Clean a label by removing common CLIP prompt artifacts
 * @param {string} label - Raw label from CLIP
 * @returns {string} - Cleaned label
 */
function cleanLabel(label) {
    let cleaned = label;
    for (const pattern of LABEL_CLEANUP_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trim();
}

module.exports = {
    CANDIDATE_LABELS,
    LABEL_CLEANUP_PATTERNS,
    cleanLabel
};
