const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Scan folder for images
    scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
    
    // Load database
    loadDatabase: () => ipcRenderer.invoke('load-database'),
    
    // Save database
    saveDatabase: (data) => ipcRenderer.invoke('save-database', data),
    
    // Analyze images (returns promise)
    analyzeImages: (imagePaths) => ipcRenderer.invoke('analyze-images', imagePaths),
    
    // Get image data as base64
    getImageData: (imagePath) => ipcRenderer.invoke('get-image-data', imagePath),
    
    // Select folder dialog
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // Listen for analysis progress updates
    onAnalysisProgress: (callback) => {
        ipcRenderer.on('analysis-progress', (event, data) => callback(data));
    },
    
    // Remove analysis progress listener
    removeAnalysisProgressListener: () => {
        ipcRenderer.removeAllListeners('analysis-progress');
    }
});

console.log('Preload script loaded - Electron API bridge ready');
