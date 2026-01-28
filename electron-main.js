const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const analyzer = require('./server/analyzer');

const LIBRARIES_FILE = path.join(__dirname, 'server', 'libraries.json');
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1800,
        height: 1000,
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
    // Remove the default menu bar for a cleaner look
    Menu.setApplicationMenu(null);
    
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

// Load database for a specific library
ipcMain.handle('load-database', async (event, libraryId) => {
    const dbFile = libraryId 
        ? path.join(__dirname, 'server', `db_${libraryId}.json`)
        : path.join(__dirname, 'server', 'database.json');
    
    if (fs.existsSync(dbFile)) {
        try {
            const data = fs.readFileSync(dbFile, 'utf8');
            return { data: JSON.parse(data) };
        } catch (e) {
            return { data: null };
        }
    }
    return { data: null };
});

// Save database for a specific library
ipcMain.handle('save-database', async (event, data, libraryId) => {
    try {
        const dbFile = libraryId 
            ? path.join(__dirname, 'server', `db_${libraryId}.json`)
            : path.join(__dirname, 'server', 'database.json');
        
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (err) {
        throw new Error('Failed to save database');
    }
});

// Get libraries list
ipcMain.handle('get-libraries', async () => {
    if (fs.existsSync(LIBRARIES_FILE)) {
        try {
            const data = fs.readFileSync(LIBRARIES_FILE, 'utf8');
            return { libraries: JSON.parse(data) };
        } catch (e) {
            return { libraries: [] };
        }
    }
    return { libraries: [] };
});

// Save libraries list
ipcMain.handle('save-libraries', async (event, libraries) => {
    try {
        fs.writeFileSync(LIBRARIES_FILE, JSON.stringify(libraries, null, 2));
        return { success: true };
    } catch (err) {
        throw new Error('Failed to save libraries');
    }
});

// Delete library database
ipcMain.handle('delete-library-db', async (event, libraryId) => {
    try {
        const dbFile = path.join(__dirname, 'server', `db_${libraryId}.json`);
        if (fs.existsSync(dbFile)) {
            fs.unlinkSync(dbFile);
        }
        return { success: true };
    } catch (err) {
        throw new Error('Failed to delete library database');
    }
});

// Analyze images with native CLIP
ipcMain.handle('analyze-images', async (event, imagePaths, forceReloadLabels = false) => {
    try {
        await analyzer.loadModel();
        
        // Reload labels if requested (for Force Rescan after editing labels.js)
        if (forceReloadLabels) {
            await analyzer.reloadLabels();
        }
        
        const results = [];
        const total = imagePaths.length;
        
        for (let i = 0; i < total; i++) {
            const imgPath = imagePaths[i];
            
            try {
                const result = await analyzer.extractFeatures(imgPath);
                if (result) {
                    results.push({
                        path: imgPath,
                        features: result.features,
                        keywords: result.keywords,
                        color: result.color,
                        colorVector: result.colorVector,
                        palette: result.palette
                    });
                    
                    // Send progress update WITH keywords
                    event.sender.send('analysis-progress', {
                        current: i + 1,
                        total: total,
                        fileName: path.basename(imgPath),
                        keywords: result.keywords
                    });
                }
            } catch (err) {
                console.error(`Error analyzing ${imgPath}:`, err);
                results.push({
                    path: imgPath,
                    error: err.message
                });
                
                // Send progress even on error
                event.sender.send('analysis-progress', {
                    current: i + 1,
                    total: total,
                    fileName: path.basename(imgPath)
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

// Copy image to clipboard
ipcMain.handle('copy-to-clipboard', async (event, imagePath) => {
    try {
        const nativeImage = require('electron').nativeImage;
        const image = nativeImage.createFromPath(imagePath);
        clipboard.writeImage(image);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save image to location
ipcMain.handle('save-image', async (event, sourcePath) => {
    try {
        const ext = path.extname(sourcePath);
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'saved_image' + ext,
            filters: [{ name: 'Image', extensions: [ext.replace('.', '')] }]
        });
        
        if (canceled || !filePath) return { canceled: true };
        
        fs.copyFileSync(sourcePath, filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open file in folder
ipcMain.handle('open-in-folder', async (event, filePath) => {
    try {
        shell.showItemInFolder(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

console.log('ImageVector Electron App Started');
console.log('Hardware acceleration enabled via ONNX Runtime');
