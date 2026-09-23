# SynGen Polygon

End-to-end 3D render pipeline for generating synthetic dataset with domain randomization.

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + WebSocket (Node.js/TypeScript, run via `tsx watch`)
- **Rendering**: Blender 5.x (Cycles) with GPU acceleration

## Features

- Upload 3D models (GLB/GLTF, OBJ, FBX, STL, PLY)
- Generate 100+ rendered views with domain randomization (camera, lighting, pose)
- Per-view outputs: **RGB PNG**, **segmentation mask PNG**, **depth EXR**
- Annotation exports: **COCO**, **YOLO**, **Pascal VOC**
- Real-time WebSocket progress updates
- GPU rendering (CUDA/OptiX/HIP)

## Setup

```bash
# Install dependencies
cd server && npm install
cd .. && npm install

# Configure environment
cp .env.example .env  # Edit with your settings

# Start backend (port 8000)
cd server && npm run dev

# Start frontend (port 5173)
npm run dev
```

## Rendering Pipeline

1. Upload a 3D model
2. Start workflow (100 views by default)
3. Blender renders each view 3x (RGB, mask, depth)
4. Images composited on white background
5. Annotations exported to `output/runs/{job_id}/annotations/`

## Output Structure

```
output/
├── models/              # Uploaded 3D models
├── runs/
│   └── job_{timestamp}/
│       ├── images/      # RGB PNGs (white background)
│       ├── masks/       # Segmentation masks (transparent)
│       ├── depth/       # Depth maps (OpenEXR)
│       └── annotations/ # COCO, YOLO, VOC formats
└── database.json        # Job/image metadata
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Backend server port |
| `IMAGE_WIDTH` | 800 | Render resolution width |
| `IMAGE_HEIGHT` | 600 | Render resolution height |
| `CYCLES_SAMPLES` | 32 | Cycles render samples |
| `RENDER_DEVICE` | GPU | Render device: CPU, CUDA, OPTIX, HIP |
| `OUTPUT_DIR` | ./output | Output directory path |

## Git Hygiene

- `output/` and `.commandcode/` are gitignored
- Run artifacts are stored in `output/runs/{job_id}/`
- Database is stored in `output/database.json`

## License

MIT
