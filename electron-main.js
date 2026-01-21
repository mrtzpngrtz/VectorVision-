const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const analyzer = require('./server/analyzer');

const DB_FILE = path.join(__dirname, 'server', 'database.json');
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#0a0a0a',
        title: 'ImageVector - Desktop'
    });

    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

    // Open DevTools in development mode
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Scan folder for images
ipcMain.handle('scan-folder', async (event, folderPath) => {
    if (!folderPath || !fs.existsSync(folderPath)) {
        throw new Error('Invalid folder path');
    }

    try {
        const files = fs.readdirSync(folderPath);
        const images = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        }).map(file => {
            const filePath = path.join(folderPath, file);
            let created = 0;
            try {
                const stats = fs.statSync(filePath);
                created = stats.birthtimeMs || stats.mtimeMs;
            } catch(e) {}
            
            return {
                name: file,
                path: filePath,
                created: created
            };
        });

        return { images };
    } catch (error) {
        throw new Error(error.message);
    }
});

// Load database
ipcMain.handle('load-database', async () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return { data: JSON.parse(data) };
        } catch (e) {
            return { data: null };
        }
    }
    return { data: null };
});

// Save database
ipcMain.handle('save-database', async (event, data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (err) {
        throw new Error('Failed to save database');
    }
});

// Analyze images with native CLIP
ipcMain.handle('analyze-images', async (event, imagePaths) => {
    try {
        await analyzer.loadModel();
        
        const results = [];
        const total = imagePaths.length;
        
        for (let i = 0; i < total; i++) {
            const imgPath = imagePaths[i];
            
            // Send progress update
            event.sender.send('analysis-progress', {
                current: i + 1,
                total: total,
                fileName: path.basename(imgPath)
            });
            
            try {
                const result = await analyzer.extractFeatures(imgPath);
                if (result) {
                    results.push({
                        path: imgPath,
                        features: result.features,
                        keywords: result.keywords,
                        color: result.color,
                        colorVector: result.colorVector
                    });
                }
            } catch (err) {
                console.error(`Error analyzing ${imgPath}:`, err);
                results.push({
                    path: imgPath,
                    error: err.message
                });
            }
        }
        
        return { results };
    } catch (error) {
        throw new Error(error.message);
    }
});

// Get image as data URL for thumbnails
ipcMain.handle('get-image-data', async (event, imagePath) => {
    try {
        const sharp = require('sharp');
        const buffer = await sharp(imagePath)
            .resize(150, 150, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer();
        
        return { 
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`
        };
    } catch (error) {
        throw new Error(error.message);
    }
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return { path: result.filePaths[0] };
    }
    
    return { path: null };
});

console.log('ImageVector Electron App Started');
console.log('Hardware acceleration enabled via ONNX Runtime');
