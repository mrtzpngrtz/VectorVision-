# ImageVector Desktop

**ImageVector** is a high-performance desktop application for exploring and organizing large image libraries in 2D and 3D space using native GPU-accelerated AI.

![UI Preview](screenshot.png)

## 🚀 Features

*   **Native GPU Acceleration**: Uses ONNX Runtime with DirectML (Windows) or CoreML (macOS) for 5-10x faster image analysis
*   **AI Semantic Clustering**: Organizes images by visual similarity using CLIP embeddings and Self-Organizing Maps (SOM)
*   **120+ Smart Categories**: Advanced zero-shot classification with comprehensive labels (people, nature, architecture, food, art, and more)
*   **Chromatic Sorting**: 2D/3D clustering based on dominant colors
*   **Real-Time Progress**: Live stats showing speed, ETA, and current file during analysis
*   **Smart Search**: Type keywords to filter and re-cluster images semantically
*   **Deep Interaction**:
    *   **Shift+Click** to reveal semantic neighbors
    *   **Depth Control** to expand/compress 3D clusters
    *   **Auto-Drift** mode for cinematic exploration
*   **Minimalist Design**: Distraction-free, monochrome interface with dark/light themes
*   **100% Private**: All AI analysis happens locally on your machine - no cloud, no API keys required

## 📋 Requirements

### Windows
- Windows 10/11 (64-bit)
- DirectX 12 compatible GPU (for DirectML acceleration)
- 8GB+ RAM recommended

### macOS
- macOS 10.15+ (Catalina or later)
- Apple Silicon (M1/M2/M3) or Intel with Metal support
- 8GB+ RAM recommended

## 🔧 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mrtzpngrtz/VectorVision.git
    cd VectorVision
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the desktop app:**
    ```bash
    npm start
    ```
    or for development with DevTools:
    ```bash
    npm run dev
    ```

**First Launch:** The app will automatically download CLIP models (~600MB) on first run. Models are cached in the `models/` directory for future use.

## 🎯 Usage

1.  **Launch the app** with `npm start`
2.  **Enter your image folder path** (e.g., `C:\Users\You\Pictures`)
3.  **Click "Scan Library"** - The app will:
    -   Scan for supported images (.jpg, .jpeg, .png, .gif, .webp)
    -   Load cached analysis if available
    -   Analyze new images with native GPU acceleration
    -   Display real-time progress (speed, ETA, current file)
4.  **Explore your images:**
    -   Toggle between **2D Flat** and **3D Space** views
    -   Switch **Sorting** modes: Grid, AI (semantic), Color, Lightness
    -   Use **Search** to filter by auto-generated keywords
    -   **Pan, zoom, rotate** to navigate the space
    -   **Double-click** images for lightbox view
    -   **Shift+Click** to highlight semantic neighbors

## ⚡ Performance

Compared to the browser-based version:

| Metric | Browser (WebGPU) | Desktop (DirectML) | Improvement |
|--------|-----------------|-------------------|-------------|
| Image/sec | 0.5-1.5 fps | 5-10 fps | **5-10x faster** |
| Model Load | 30-60s | 5-10s | **3-6x faster** |
| GPU Usage | 20-40% | 80-95% | **Full utilization** |

*Benchmarks on Windows 11, RTX 3060, 100 images*

## 🏗️ Technologies

*   **Electron**: Cross-platform desktop framework
*   **ONNX Runtime**: Native AI inference with GPU support (DirectML/CoreML)
*   **CLIP (ViT-Base-Patch32)**: OpenAI's vision-language model for embeddings and zero-shot classification
*   **Sharp**: High-performance Node.js image processing
*   **Self-Organizing Maps**: Unsupervised clustering for spatial layout

## 📖 Documentation

- **[README_ELECTRON.md](README_ELECTRON.md)** - Detailed desktop app documentation, troubleshooting, and architecture

## 🔨 Building for Distribution

To create distributable packages:

```bash
npm run dist
```

This will create installers in the `dist/` folder for your platform.

## 🛠️ Development

**Architecture:**
```
Electron Main Process (Node.js)
├── electron-main.js - Window & IPC management
├── server/analyzer.js - Native CLIP with GPU
└── preload.js - Secure IPC bridge

Renderer Process (Chromium)
└── public/ - UI with 2D/3D visualization
```

**Key Features:**
- IPC for secure communication
- Async thumbnail generation
- Real-time progress events
- Hardware-accelerated inference

## 📜 License

MIT

## 🙏 Credits

- **CLIP**: OpenAI's Contrastive Language-Image Pre-training
- **ONNX Runtime**: Microsoft's cross-platform ML inference engine
- **Electron**: Cross-platform desktop applications
- **Sharp**: High-performance Node.js image processing
