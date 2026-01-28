# Video Support Implementation

## Overview
VectorVision now supports **MP4** and **WEBM** video files! Videos are processed by extracting the first frame and analyzing it using the same CLIP AI model as images.

## What Changed

### 1. File Scanning (`server/index.js`)
- **Updated supported extensions**: Now includes `.mp4` and `.webm` alongside image formats
- Files are scanned and added to the library just like images

### 2. Video Frame Extraction
- **New utility function**: `extractVideoFrame()` extracts the first frame from videos at timestamp 00:00:00
- **Temporary storage**: Extracted frames are saved to `temp_frames/` directory and automatically cleaned up after processing
- **Uses FFmpeg**: Leverages `fluent-ffmpeg` package for reliable video processing

### 3. Thumbnail Generation (`server/index.js`)
- **Smart detection**: Automatically detects if a file is a video
- **Frame extraction**: Extracts first frame before generating thumbnail
- **Fallback handling**: Graceful error handling if video processing fails

### 4. AI Analysis (`server/analyzer.js`)
- **Seamless integration**: Videos are analyzed just like images
- **First frame analysis**: Extracts frame, processes it through CLIP model, then cleans up
- **Same features**: Keywords, color analysis, and embeddings work identically for videos

### 5. Project Configuration
- **New dependency**: Added `fluent-ffmpeg` package to `package.json`
- **Updated .gitignore**: Added `temp_frames/` to prevent temporary files from being committed

## Requirements

### ⚠️ IMPORTANT: FFmpeg Installation Required

For video support to work, **FFmpeg must be installed on your system**:

#### Windows
1. Download FFmpeg from: https://ffmpeg.org/download.html
2. Extract to a location (e.g., `C:\ffmpeg`)
3. Add to PATH: 
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Edit "Path" variable and add FFmpeg's `bin` folder (e.g., `C:\ffmpeg\bin`)
4. Verify installation: Open Command Prompt and run `ffmpeg -version`

#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt install ffmpeg  # Debian/Ubuntu
sudo yum install ffmpeg  # CentOS/RHEL
```

## Performance Considerations

### Speed Impact
- **Video frame extraction** is slower than reading static images (typically 0.5-2 seconds per video)
- **Large video files** take longer to process
- **AI analysis** speed remains the same (5-10 fps on GPU)

### Recommended Usage
- ✅ Best for: Small to medium-sized video libraries (< 1000 videos)
- ✅ Works well with: Short video clips, motion graphics, video thumbnails
- ⚠️ Consider carefully: Very large video files (> 1GB) or massive collections

## How It Works

1. **Scan**: User selects a folder containing images and videos
2. **Detection**: App identifies video files by extension (`.mp4`, `.webm`)
3. **Frame Extraction**: FFmpeg extracts frame at 00:00:00 (first frame)
4. **Temporary Storage**: Frame saved as `.jpg` in `temp_frames/` directory
5. **AI Processing**: CLIP analyzes the extracted frame for:
   - Semantic embeddings (512-dimensional vectors)
   - Zero-shot classification (150+ categories)
   - Color analysis and palette extraction
6. **Cleanup**: Temporary frame is automatically deleted
7. **Storage**: All analysis results cached in database for instant reload

## Supported Video Formats

Currently supported:
- ✅ **MP4** (`.mp4`) - Most common format
- ✅ **WebM** (`.webm`) - Web-optimized format

FFmpeg can handle many container formats and codecs within these extensions, including:
- H.264/AVC
- H.265/HEVC
- VP8/VP9
- AV1

## Limitations

1. **First frame only**: Only analyzes the first frame of the video (not entire content)
2. **Black frames**: If video starts with fade-in or black screen, analysis may be less meaningful
3. **No audio**: Audio is not processed (visual analysis only)
4. **System dependency**: Requires FFmpeg installation (not bundled with app)

## Future Improvements

Potential enhancements for future versions:
- [ ] Extract frame from middle of video (e.g., 50% timestamp)
- [ ] Analyze multiple frames and average results
- [ ] Add video duration and metadata extraction
- [ ] Support for more video formats (`.mov`, `.avi`, etc.)
- [ ] Video preview on hover (instead of static frame)
- [ ] Bundle FFmpeg with Electron app for easier deployment

## Troubleshooting

### "Failed to extract video frame"
- **Cause**: FFmpeg is not installed or not in PATH
- **Solution**: Install FFmpeg and ensure it's accessible from command line

### Videos not appearing in library
- **Cause**: Video files might be corrupted or unsupported codec
- **Solution**: Check if FFmpeg can process the file manually: `ffmpeg -i video.mp4`

### Slow video processing
- **Cause**: Large video files or slow disk I/O
- **Solution**: Consider processing videos in smaller batches or using SSD storage

### Temp files accumulating
- **Cause**: App crash during processing may leave temp frames
- **Solution**: Manually delete files in `temp_frames/` directory

## Testing Recommendations

To test video support:

1. Create a test folder with a mix of images and videos
2. Ensure FFmpeg is installed: `ffmpeg -version`
3. Launch the app: `npm start`
4. Create a new library and select the test folder
5. Observe the analysis progress (videos will take longer)
6. Verify that videos appear in the grid with proper thumbnails
7. Check that video classifications make sense for the content

## Technical Details

### Dependencies Added
```json
"fluent-ffmpeg": "^2.1.3"
```

### New Files/Directories
- `temp_frames/` - Temporary storage for extracted video frames (auto-created, git-ignored)

### Modified Files
1. `server/index.js` - Scanning, thumbnail generation, video detection
2. `server/analyzer.js` - Feature extraction with video support
3. `.gitignore` - Added `temp_frames/` exclusion
4. `package.json` - Added fluent-ffmpeg dependency

---

**Note**: Video support is experimental but functional. Feedback and bug reports are welcome!
