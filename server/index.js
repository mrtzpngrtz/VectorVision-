const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sharp = require('sharp');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
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
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        }).map(file => ({
            name: file,
            path: path.join(folderPath, file),
            url: `/image?path=${encodeURIComponent(path.join(folderPath, file))}`,
            thumbUrl: `/thumbnail?path=${encodeURIComponent(path.join(folderPath, file))}`
        }));

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
            // Resize to 150px (matching grid cell size approx)
            const buffer = await sharp(imagePath)
                .resize(150, 150, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toBuffer();
            
            res.type('image/jpeg');
            res.send(buffer);
        } catch (err) {
            console.error('Thumbnail error:', err);
            // Fallback to original if sharp fails
            res.sendFile(imagePath);
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
