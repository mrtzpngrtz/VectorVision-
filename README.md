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

*   **Triple AI Model System**: 
    *   **SigLIP**: Semantic understanding and zero-shot classification
    *   **DINOv2**: Visual similarity analysis (color, texture, style)
    *   **Aesthetic Predictor V2.5**: AI-powered quality scoring (0-10 scale)
*   **Native GPU Acceleration**: Uses ONNX Runtime with DirectML (Windows) or CoreML (macOS) for 5-10x faster image analysis
*   **Video Support**: Analyzes MP4 and WebM videos by extracting and processing the first frame (requires FFmpeg)
*   **AI Semantic Clustering**: Organizes images by visual similarity using SigLIP embeddings and Self-Organizing Maps (SOM)
*   **Aesthetic Quality Scores**: Each image receives an AI-generated aesthetic score (0-10) with star rating display on hover
*   **Library Management**: Multiple libraries with image counts, last updated timestamps, and quick switching
*   **375+ Smart Categories**: Optimized for artistic/design/fashion photography with tags like:
    *   **Photography**: monochrome, minimalist, abstract, cinematic, editorial, documentary, candid
    *   **Design**: graphic design, typography, bauhaus, art deco, swiss design, memphis design
    *   **Materials**: leather, silk, velvet, chrome, marble, wood, brushed metal, glossy, matte
    *   **Lighting**: neon, golden hour, softbox, natural light, chiaroscuro, volumetric light
    *   **Mood**: serene, energetic, melancholic, ethereal, clinical, intimate, bold
    *   **Technical**: bokeh, motion blur, shallow depth of field, macro, wide angle, grain
    *   **Aesthetics**: y2k, vaporwave, cyberpunk, wabi sabi, kinfolk, maximalist, retro
    *   **Color**: specific colors (red, emerald, coral) + color theory (complementary, analogous)
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
*   **Dual Sidebar Interface**:
    *   **Navigation Sidebar (Left)**: Library management, view modes, and sorting controls.
    *   **Inspector Sidebar (Right)**: Image preview, details, tags, and search filters.
    *   **Clean Mode**: Hide UI for immersive viewing.
*   **Customizable Grid**:
    *   **Aspect Ratio Control**: Switch between Square (1:1), Landscape (3:2), and Portrait (2:3) grids.
*   **Professional Design**: 
    *   Roboto Mono typography for interface elements
    *   Helvetica/Arial for readable descriptions
    *   Active Tag Display with bold typography
    *   Clean visual hierarchy throughout
*   **100% Private**: All AI analysis happens locally on your machine - no cloud, no API keys required

## [■] REQUIREMENTS

### Windows
- Windows 10/11 (64-bit)
- DirectX 12 compatible GPU (for DirectML acceleration)
- 8GB+ RAM recommended
- **FFmpeg** (optional, required for video support) - [Download here](https://ffmpeg.org/download.html)

### macOS
- macOS 10.15+ (Catalina or later)
- Apple Silicon (M1/M2/M3) or Intel with Metal support
- 8GB+ RAM recommended
- **FFmpeg** (optional, required for video support) - Install via Homebrew: `brew install ffmpeg`

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

**First Launch:** The app will automatically download SigLIP models (~600MB) on first run. Models are cached in the `models/` directory for future use.

## [▶] USAGE

### Getting Started

1.  **Launch the app** with `npm start`
2.  **Create a library:**
    -   Click "+ New Library"
    -   Select your image/video folder
    -   Enter a library name
3.  **The app will automatically:**
    -   Scan for supported files (.jpg, .jpeg, .png, .gif, .webp, .mp4, .webm)
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
*   **SigLIP (Base-Patch16-224)**: Google's improved vision-language model for embeddings and zero-shot classification (successor to CLIP)
*   **DINOv2 (Small)**: Meta's self-supervised vision transformer for visual similarity and feature extraction
*   **Aesthetic Predictor V2.5**: Specialized model for AI-powered image quality assessment (0-10 scoring)
*   **Sharp**: High-performance Node.js image processing
*   **FFmpeg**: Video frame extraction for MP4/WebM support
*   **Self-Organizing Maps**: Unsupervised clustering for spatial layout

## [?] DOCUMENTATION

- **[README_ELECTRON.md](README_ELECTRON.md)** - Detailed desktop app documentation, troubleshooting, and architecture
- **[VIDEO_SUPPORT.md](VIDEO_SUPPORT.md)** - Video support implementation details and FFmpeg setup guide
- **[OPTIMIZATION_NOTES.md](OPTIMIZATION_NOTES.md)** - Performance optimization and GPU acceleration details

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

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✓ Commercial use allowed
- ✓ Modification allowed
- ✓ Distribution allowed
- ✓ Private use allowed
- ✓ Attribution required

Copyright (c) 2026 Moritz Pongratz

## [★] CREDITS & THIRD-PARTY LICENSES

This project uses the following open-source technologies:

### Core Technologies
- **[SigLIP (Base-Patch16-224)](https://huggingface.co/google/siglip-base-patch16-224)** - Google's improved vision-language model for embeddings and zero-shot classification, successor to CLIP (Apache-2.0 License)
- **[DINOv2 (Small)](https://huggingface.co/facebook/dinov2-small)** - Meta's self-supervised vision transformer for visual similarity analysis (Apache-2.0 License)
- **[Aesthetic Predictor V2.5](https://huggingface.co/fsw/aesthetic-predictor-v2-5_onnx)** - AI-powered image quality assessment model trained on SigLIP embeddings (Public Domain)
- **[ONNX Runtime](https://github.com/microsoft/onnxruntime)** - Microsoft's cross-platform ML inference engine with DirectML/CoreML support (MIT License)
- **[Electron](https://www.electronjs.org/)** - Cross-platform desktop application framework (MIT License)
- **[Sharp](https://github.com/lovell/sharp)** - High-performance Node.js image processing library (Apache-2.0 License)
- **[Transformers.js](https://github.com/xenova/transformers.js)** - State-of-the-art machine learning for the web (Apache-2.0 License)

### Additional Dependencies
- **ml-som** - Self-Organizing Maps implementation (MIT License)
- **fluent-ffmpeg** - FFmpeg wrapper for video processing (MIT License)
- **axios** - Promise-based HTTP client (MIT License)
- **uuid** - RFC4122 UUID generation (MIT License)

All third-party licenses are compatible with the MIT License used by this project. Full license texts for each dependency can be found in their respective repositories or in the `node_modules` directory after installation.
