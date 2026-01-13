const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

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
            // Use encodeURIComponent to handle spaces and special chars
            url: `/image?path=${encodeURIComponent(path.join(folderPath, file))}`
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
