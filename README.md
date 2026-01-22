```
░██████                                                 ░██    ░██                          ░██                        
  ░██                                                   ░██    ░██                          ░██                        
  ░██  ░█████████████   ░██████    ░████████  ░███████  ░██    ░██  ░███████   ░███████  ░████████  ░███████  ░██░████ 
  ░██  ░██   ░██   ░██       ░██  ░██    ░██ ░██    ░██ ░██    ░██ ░██    ░██ ░██    ░██    ░██    ░██    ░██ ░███     
  ░██  ░██   ░██   ░██  ░███████  ░██    ░██ ░█████████  ░██  ░██  ░█████████ ░██           ░██    ░██    ░██ ░██      
  ░██  ░██   ░██   ░██ ░██   ░██  ░██   ░███ ░██          ░██░██   ░██        ░██    ░██    ░██    ░██    ░██ ░██      
░██████░██   ░██   ░██  ░█████░██  ░█████░██  ░███████     ░███     ░███████   ░███████      ░████  ░███████  ░██      
                                         ░██                                                                           
                                   ░███████
```

**High-performance desktop application for AI-powered image exploration and organization**

```
┌─────────────────────────────────────────────────────────┐
│  [✓] 100% LOCAL  |  [✓] GPU ACCELERATED  |  [✓] PRIVATE │
└─────────────────────────────────────────────────────────┘
```

![UI Preview](screenshot.png)

## [◆] ORIGIN STORY

For a long time I searched for commercial software that could archive images and connect them on a visual and semantic level. I never found the right solution, so I built VectorVision.

This is not a commercial product. It is a personal tool built through vibecoding. I used Visual Studio Code with Gemini 3 and Claude Sonnet to create exactly what I needed for my own workflow. It runs entirely locally and keeps all data private.

## [▸] FEATURES

*   **Native GPU Acceleration**: Uses ONNX Runtime with DirectML (Windows) or CoreML (macOS) for 5-10x faster image analysis
*   **AI Semantic Clustering**: Organizes images by visual similarity using CLIP embeddings and Self-Organizing Maps (SOM)
*   **Library Management**: Multiple libraries with image counts, last updated timestamps, and quick switching
*   **150+ Smart Categories**: Optimized for artistic/design/fashion photography with tags like:
    *   **Photography**: monochrome, minimalist, abstract, high contrast, dramatic, cinematic, editorial
    *   **Design**: graphic design, typography, branding, layout, composition, visual identity
    *   **Patterns**: geometric pattern, texture, striped, grid, lines, waves, abstract pattern
    *   **Objects**: product, still life, bottle, glass, sphere, cube, geometric shape
    *   **Space**: negative space, minimal composition, centered, symmetrical, balanced
    *   **Light**: light and shadow, chiaroscuro, dramatic lighting, backlit, silhouette
    *   **Color**: vibrant, muted, gradients, warm tones, cool tones
    *   **Style**: fashion, elegant, contemporary, avant garde, experimental, surreal
*   **Multi-Dimensional Sorting**: 2D/3D clustering by AI semantics, color, or lightness
*   **Informative Progress**: Context-aware loading overlays with detailed descriptions of each processing phase
*   **Smart Search & Filtering**: 
    *   Type keywords to filter and re-cluster images semantically
    *   Common tags word cloud for quick filtering
    *   Combined Filter & Tags interface for intuitive exploration
*   **Semantic Similarity View**: 
    *   **Shift + Hover** to reveal 20 most visually similar images with smooth fade
    *   Automatically enabled when tag filter is active
    *   Clean opacity-based highlighting
*   **Deep Interaction**:
    *   **Double-Click** for full-resolution lightbox view
    *   **Hover** to see image info, tags, and preview
    *   **Depth Control** to expand/compress 3D clusters
    *   **Auto-Drift** mode for cinematic 3D exploration
*   **Professional Design**: 
    *   Roboto Mono typography for interface elements
    *   Helvetica/Arial for readable descriptions
    *   Compact, space-efficient library management
    *   Clean visual hierarchy throughout
*   **100% Private**: All AI analysis happens locally on your machine - no cloud, no API keys required

## [■] REQUIREMENTS

### Windows
- Windows 10/11 (64-bit)
- DirectX 12 compatible GPU (for DirectML acceleration)
- 8GB+ RAM recommended

### macOS
- macOS 10.15+ (Catalina or later)
- Apple Silicon (M1/M2/M3) or Intel with Metal support
- 8GB+ RAM recommended

## [↓] INSTALLATION

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

## [▶] USAGE

### Getting Started

1.  **Launch the app** with `npm start`
2.  **Create a library:**
    -   Click "+ New Library"
    -   Select your image folder
    -   Enter a library name
3.  **The app will automatically:**
    -   Scan for supported images (.jpg, .jpeg, .png, .gif, .webp)
    -   Load cached analysis if available (instant load)
    -   Analyze new images with GPU acceleration at 5-10 images/second
    -   Show informative progress with context-aware descriptions
    -   Display real-time stats: speed, progress, ETA

### Managing Libraries

-   **Switch Libraries**: Click on any library to load it instantly
-   **Library Info**: See image count and last updated time for each library
-   **Rescan**: Force re-analysis with updated AI categories (⟳ button)
-   **Rename**: Update library names (✎ button)
-   **Delete**: Remove library and its database (✕ button)

### Exploring Your Images

-   **View Modes**: Toggle between 2D Flat and 3D Space
-   **Sorting**: Grid, Semantic (AI clustering), Color, Lightness
-   **Search & Filter**: 
    -   Type keywords in search box (e.g., "monochrome", "geometric")
    -   Click common tags from word cloud for instant filtering
    -   Clear with ✕ button or ESC key
-   **Navigate**: Pan (drag), zoom (scroll), rotate (drag in 3D)
-   **Semantic Similarity**:
    -   **Shift + Hover** over any image to see 20 most similar images
    -   When filtering by tags, similarity view activates automatically on hover
    -   Images fade smoothly to highlight relationships
-   **Inspect**: 
    -   Hover to see info, tags, and preview in sidebar
    -   Double-click for full-resolution lightbox view
-   **3D Controls**:
    -   Auto-Drift mode for cinematic exploration
    -   Depth Scale slider to adjust Z-axis compression

**Keyboard Shortcuts:**
-   `Shift + Hover` - Show 20 similar images
-   `ESC` - Clear highlights/filters
-   `Space + Drag` - Pan mode
-   `Enter` - Search (when in search field)

## [⚡] PERFORMANCE

Compared to the browser-based version:

| Metric | Browser (WebGPU) | Desktop (DirectML) | Improvement |
|--------|-----------------|-------------------|-------------|
| Image/sec | 0.5-1.5 fps | 5-10 fps | **5-10x faster** |
| Model Load | 30-60s | 5-10s | **3-6x faster** |
| GPU Usage | 20-40% | 80-95% | **Full utilization** |

*Benchmarks on Windows 11, RTX 3060, 100 images*

## [⬡] TECHNOLOGIES

*   **Electron**: Cross-platform desktop framework
*   **ONNX Runtime**: Native AI inference with GPU support (DirectML/CoreML)
*   **CLIP (ViT-Base-Patch32)**: OpenAI's vision-language model for embeddings and zero-shot classification
*   **Sharp**: High-performance Node.js image processing
*   **Self-Organizing Maps**: Unsupervised clustering for spatial layout

## [?] DOCUMENTATION

- **[README_ELECTRON.md](README_ELECTRON.md)** - Detailed desktop app documentation, troubleshooting, and architecture

## [⚙] BUILDING FOR DISTRIBUTION

To create distributable packages:

```bash
npm run dist
```

This will create installers in the `dist/` folder for your platform.

## [◈] DEVELOPMENT

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

## [©] LICENSE

MIT

## [★] CREDITS

- **CLIP**: OpenAI's Contrastive Language-Image Pre-training
- **ONNX Runtime**: Microsoft's cross-platform ML inference engine
- **Electron**: Cross-platform desktop applications
- **Sharp**: High-performance Node.js image processing
