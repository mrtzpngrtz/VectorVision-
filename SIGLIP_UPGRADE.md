# SigLIP Upgrade Guide

## What Changed?

VectorVision has been upgraded from **CLIP** to **SigLIP** (Sigmoid Loss for Language-Image Pre-training), Google's improved vision-language model.

## Why SigLIP?

SigLIP is the successor to CLIP and offers several advantages:

1. **Better Semantic Understanding**: More accurate zero-shot classification of images
2. **Improved Search Results**: Natural language queries yield more relevant matches
3. **Enhanced Accuracy**: Better alignment between images and text descriptions
4. **Modern Architecture**: State-of-the-art vision-language model (2023+)

## What This Means for You

### ✅ Benefits
- More accurate "Smart Categories" tags
- Better semantic search results
- Improved similarity calculations
- Same or better performance (5-10 images/sec)

### ⚠️ Important: Existing Libraries

**Your existing libraries will need to be rescanned** to take advantage of the improved AI model.

The old CLIP embeddings are incompatible with SigLIP embeddings, which means:
- **Semantic clustering** will not work correctly without rescanning
- **Similarity view** (Shift+Hover) will show incorrect results
- **Search** will be less accurate

### How to Upgrade Your Libraries

1. **Launch the app** with `npm start`
2. **For each library:**
   - Click the **⟳ (Rescan) button** next to the library name
   - Confirm the rescan when prompted
   - Wait for the analysis to complete (5-10 images/second)

### What Gets Rescanned?

The rescan process will:
- ✓ Extract new SigLIP embeddings (512D vectors)
- ✓ Re-classify images with the updated AI model
- ✓ Generate new semantic tags
- ✗ **NOT** re-extract dominant colors (these are reused)
- ✗ **NOT** re-scan your folder for new images

### Technical Details

#### Model Changes
- **Old**: `Xenova/clip-vit-base-patch32` (CLIP ViT-Base)
- **New**: `Xenova/siglip-base-patch16-224` (SigLIP Base)

#### Preprocessing Changes
- **Old**: ImageNet normalization (mean=[0.48, 0.46, 0.41], std=[0.27, 0.26, 0.28])
- **New**: Simple normalization (mean=0.5, std=0.5)

#### Tokenizer Changes
- **Old**: BPE tokenizer, max_length=77
- **New**: SentencePiece tokenizer, max_length=64

#### Model Files
- **Old**: `models/clip_vision.onnx`, `models/clip_text.onnx`
- **New**: `models/siglip_vision.onnx`, `models/siglip_text.onnx`

New models (~600MB total) will be downloaded automatically on first launch.

## Performance

Performance remains the same or slightly better:
- **Model Loading**: 5-10 seconds
- **Analysis Speed**: 5-10 images/second with GPU acceleration
- **GPU Utilization**: 80-95% (DirectML/CoreML)

## Backward Compatibility

⚠️ **Breaking Change**: Old databases with CLIP embeddings cannot be directly used with SigLIP.

If you encounter issues:
1. Rescan the library using the ⟳ button
2. If problems persist, delete the library and recreate it
3. The old CLIP model files can be safely deleted from `models/` folder

## Need Help?

If you experience any issues:
1. Check the console output for error messages
2. Delete `models/` folder and restart (forces model re-download)
3. Report issues on the GitHub repository

---

**Bottom Line**: The upgrade improves AI accuracy significantly. Simply rescan your libraries to enjoy better semantic understanding and search results!
