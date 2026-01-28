const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const TEMP_DIR = path.join(__dirname, '../temp_frames');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper function to check if file is a video
function isVideo(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.webm'].includes(ext);
}

// Extract first frame from video as a temporary image
function extractVideoFrame(videoPath) {
    return new Promise((resolve, reject) => {
        const tempImagePath = path.join(TEMP_DIR, `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
        
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['00:00:00'], // First frame
                filename: path.basename(tempImagePath),
                folder: path.dirname(tempImagePath),
                size: '224x224'
            })
            .on('end', () => {
                resolve(tempImagePath);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint to list images in a directory
app.post('/api/scan', async (req, res) => {
    const { folderPath } = req.body;
    
    if (!folderPath || !fs.existsSync(folderPath)) {
        return res.status(400).json({ error: 'Invalid folder path' });
    }

    try {
        const files = fs.readdirSync(folderPath);
        const images = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'].includes(ext);
        }).map(file => {
            const filePath = path.join(folderPath, file);
            const ext = path.extname(file).toLowerCase();
            // gif, mp4, webm are animated/video content
            const mediaType = ['.mp4', '.webm', '.gif'].includes(ext) ? 'video' : 'static';
            
            let created = 0;
            try {
                const stats = fs.statSync(filePath);
                created = stats.birthtimeMs || stats.mtimeMs;
            } catch(e) {}
            
            return {
                name: file,
                path: filePath,
                created: created,
                mediaType: mediaType,
                url: `/image?path=${encodeURIComponent(filePath)}`,
                thumbUrl: `/thumbnail?path=${encodeURIComponent(filePath)}`
            };
        });

        res.json({ images });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Endpoint to serve local images securely
app.get('/image', (req, res) => {
    const imagePath = req.query.path;
    if (imagePath && fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Image not found');
    }
});

// API Endpoint to serve thumbnails
app.get('/thumbnail', async (req, res) => {
    const imagePath = req.query.path;
    if (imagePath && fs.existsSync(imagePath)) {
        try {
            let sourceImage = imagePath;
            let tempFrame = null;
            
            // If it's a video, extract first frame
            if (isVideo(imagePath)) {
                try {
                    tempFrame = await extractVideoFrame(imagePath);
                    sourceImage = tempFrame;
                } catch (videoErr) {
                    console.error('Video frame extraction error:', videoErr);
                    return res.status(500).send('Failed to extract video frame');
                }
            }
            
            // Resize to 150px (matching grid cell size approx)
            const buffer = await sharp(sourceImage)
                .resize(150, 150, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toBuffer();
            
            // Clean up temp frame if created
            if (tempFrame && fs.existsSync(tempFrame)) {
                fs.unlinkSync(tempFrame);
            }
            
            res.type('image/jpeg');
            res.send(buffer);
        } catch (err) {
            console.error('Thumbnail error:', err);
            // Fallback to original if sharp fails (won't work for videos)
            if (!isVideo(imagePath)) {
                res.sendFile(imagePath);
            } else {
                res.status(500).send('Failed to generate video thumbnail');
            }
        }
    } else {
        res.status(404).send('Image not found');
    }
});

// Save analysis results
app.post('/api/save', (req, res) => {
    const { data } = req.body;
    fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save DB' });
        res.json({ success: true });
    });
});

// Load analysis results
app.get('/api/load', (req, res) => {
    if (fs.existsSync(DB_FILE)) {
        fs.readFile(DB_FILE, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: 'Failed to load DB' });
            try {
                res.json({ data: JSON.parse(data) });
            } catch (e) {
                res.json({ data: [] });
            }
        });
    } else {
        res.json({ data: null });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
