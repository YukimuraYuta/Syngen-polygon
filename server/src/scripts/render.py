#!/usr/bin/env python
"""SynGen Polygon Blender Render Script

Runs inside Blender (background mode) to generate synthetic image datasets
with domain randomization, multi-pass rendering (RGB, segmentation, depth),
ground truth extraction (bounding boxes), and annotation export (COCO, YOLO, VOC).

Compatible with Blender 5.x (uses compositing_node_group / write_still approach).

Usage:
    blender --background --python render.py -- \
        --model <path_to_glb> \
        --output <output_dir> \
        --num-views <N> \
        --seed <S> \
        --job-id <jobId> \
        --dr-params <path_to_json> \
        --width <W> \
        --height <H>
"""

import argparse
import json
import math
import os
import sys
import time

import bpy
import mathutils
from mathutils import Vector


# ─── Argument Parsing ───────────────────────────────────────────────

def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="SynGen Polygon Blender Render Script")
    parser.add_argument("--model", required=True, help="Path to 3D model file")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--num-views", type=int, default=100, help="Number of images to generate")
    parser.add_argument("--seed", type=int, default=0, help="Random seed")
    parser.add_argument("--job-id", required=True, help="Job identifier")
    parser.add_argument("--dr-params", required=True, help="Path to DR parameters JSON")
    parser.add_argument("--width", type=int, default=800, help="Image width")
    parser.add_argument("--height", type=int, default=600, help="Image height")
    parser.add_argument("--device", type=str, default="CPU", help="Render device: CPU or GPU")
    parser.add_argument("--samples", type=int, default=32, help="Render samples")
    return parser.parse_args(argv)


# ─── Output Helpers ────────────────────────────────────────────────

def send_json(event, **kwargs):
    """Send a JSON message to stdout for the TS backend to pick up."""
    msg = {"event": event, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **kwargs}
    print(json.dumps(msg), flush=True)


def log(message):
    send_json("log", data=message)


def image_generated(count):
    send_json("image_generated", count=count)


def send_status(running, job_id=None):
    send_json("status", running=running, jobId=job_id)


# ─── Scene Setup ────────────────────────────────────────────────────

def clear_scene():
    """Remove all default objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_model(model_path):
    """Import a 3D model based on its file extension."""
    ext = os.path.splitext(model_path)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=model_path)
    elif ext == ".obj":
        bpy.ops.import_scene.obj(filepath=model_path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=model_path)
    elif ext == ".stl":
        bpy.ops.import_scene.stl(filepath=model_path)
    elif ext == ".ply":
        bpy.ops.import_scene.ply(filepath=model_path)
    else:
        raise ValueError(f"Unsupported model format: {ext}")

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not mesh_objects:
        raise ValueError("No mesh objects found in the imported model")
    return mesh_objects


def setup_scene(args, mesh_objects):
    """Configure render settings, camera, and lighting."""
    scene = bpy.context.scene

    # Render engine
    scene.render.engine = "CYCLES"
    if args.device.upper() == "GPU":
        try:
            prefs = bpy.context.preferences
            cprefs = prefs.addons["cycles"].preferences
            for dt in ("OPTIX", "CUDA", "HIP", "ONEAPI", "NONE"):
                try:
                    cprefs.compute_device_type = dt
                    if dt != "NONE":
                        break
                except Exception:
                    continue
            scene.cycles.device = "GPU"
            log(f"GPU rendering enabled (device type: {cprefs.compute_device_type})")
        except Exception as e:
            log(f"GPU rendering not available ({e}), falling back to CPU")
            scene.cycles.device = "CPU"
    else:
        try:
            scene.cycles.device = args.device
        except Exception:
            log(f"Could not set device to {args.device}, falling back to CPU")
            scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True

    # Resolution
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    scene.render.film_transparent = False

    # Assign unique object indices for segmentation
    for i, obj in enumerate(mesh_objects):
        obj.pass_index = i + 1

    # Create camera
    cam_data = bpy.data.cameras.new("Camera")
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    cam_data.lens = 50  # 50mm default

    # Key light (sun) — balanced for visible but not harsh shadows
    key_light_data = bpy.data.lights.new("KeyLight", type="SUN")
    key_light_obj = bpy.data.objects.new("KeyLight", key_light_data)
    scene.collection.objects.link(key_light_obj)
    key_light_obj.rotation_euler = (math.radians(45), math.radians(-30), 0)

    # White background world — very low ambient to keep shadows visible but not washed out
    scene.view_settings.view_transform = "Standard"
    scene.display_settings.display_device = "sRGB"
    scene.render.film_transparent = True  # Composite on white in post
    world = bpy.data.worlds.new("World")
    scene.world = world
    if world.node_tree:
        bg = world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs["Color"].default_value = (1, 1, 1, 1)  # White
            bg.inputs["Strength"].default_value = 0.05  # Minimal ambient

    # Large white ground plane (appears to extend to infinity)
    bpy.ops.mesh.primitive_plane_add(size=500, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "Ground"
    ground_mat = bpy.data.materials.new("GroundMaterial")
    if ground_mat.node_tree:
        bsdf = ground_mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1.0)  # White
            bsdf.inputs["Roughness"].default_value = 0.95
    ground.data.materials.append(ground_mat)

    return scene, cam_obj, key_light_data


# ─── Domain Randomization ────────────────────────────────────────────

def apply_dr_params(mesh_objects, params, cam_obj, key_light_data):
    """Apply domain randomization parameters to the scene."""
    # Object pose — prevent clipping through ground plane (Y=0)
    for obj in mesh_objects:
        desired = Vector(params["position"])
        obj.location = desired
        obj.rotation_euler = Vector(params["rotation"])
        obj.scale = (params["scale"], params["scale"], params["scale"])
        # Lower the object so its bottom sits at Y=0 (ground plane)
        bbox = obj.bound_box
        min_y = min(obj.matrix_world @ Vector(corner) for corner in bbox).y
        obj.location.y = desired.y - min_y  # Raise by the lowest point

    # Material color — disabled per user request (keep original material colors)

    # Light intensity and color temperature
    key_light_data.energy = params["lightIntensity"] * 20  # Balanced for visible shadows
    key_light_data.color = (1.0, 1.0, 1.0)  # Neutral white — no color randomization

    # Camera position — ensure entire object fits in frame
    cam_pos = Vector(params["cameraPosition"])
    center = sum(
        (obj.location for obj in mesh_objects), Vector((0, 0, 0))
    ) / len(mesh_objects)

    # Calculate bounding box diagonal to determine minimum camera distance
    bbox_min = Vector((float("inf"), float("inf"), float("inf")))
    bbox_max = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in mesh_objects:
        matrix = obj.matrix_world
        for corner in obj.bound_box:
            wc = matrix @ Vector(corner)
            bbox_min.x = min(bbox_min.x, wc.x)
            bbox_min.y = min(bbox_min.y, wc.y)
            bbox_min.z = min(bbox_min.z, wc.z)
            bbox_max.x = max(bbox_max.x, wc.x)
            bbox_max.y = max(bbox_max.y, wc.y)
            bbox_max.z = max(bbox_max.z, wc.z)
    bbox_diagonal = (bbox_max - bbox_min).length
    min_distance = bbox_diagonal * 2.5  # Ensure full object visible

    # Adjust camera distance while preserving direction
    direction = cam_pos - center
    if direction.length > 0:
        direction.normalize()
        distance = max((params["cameraPosition"][0]**2 + params["cameraPosition"][1]**2 + params["cameraPosition"][2]**2)**0.5, min_distance)
        cam_obj.location = center + direction * (distance + bbox_diagonal * 0.5)
    else:
        cam_obj.location = center + Vector((0, min_distance, 0))

    # Point camera at object center
    direction = center - cam_obj.location
    if direction.length > 0:
        direction.normalize()
        rot_quat = direction.to_track_quat("-Z", "Y")
        cam_obj.rotation_euler = rot_quat.to_euler()


def set_flat_materials(mesh_objects):
    """Replace materials with flat emission colors for segmentation masks.
    Returns a dict of original materials for restoration."""
    original = {}
    for obj in mesh_objects:
        idx = obj.pass_index
        r = (idx & 0xFF) / 255.0
        g = ((idx >> 8) & 0xFF) / 255.0
        b = ((idx >> 16) & 0xFF) / 255.0
        for j in range(len(obj.data.materials)):
            orig_mat = obj.data.materials[j]
            key = (obj.name, j)
            original[key] = orig_mat

            # Create new flat emission material (auto has node_tree in Blender 5.x)
            flat_mat = bpy.data.materials.new(f"FlatMask_{idx}_{j}")
            nt = flat_mat.node_tree
            if nt:
                for n in list(nt.nodes):
                    nt.nodes.remove(n)
                emit = nt.nodes.new("ShaderNodeEmission")
                emit.inputs["Color"].default_value = (r, g, b, 1)
                out_node = nt.nodes.new("ShaderNodeOutputMaterial")
                nt.links.new(emit.outputs["Emission"], out_node.inputs["Surface"])

            # Replace material by index
            obj.data.materials[j] = flat_mat

    return original


def restore_materials(mesh_objects, original):
    """Restore original materials after mask rendering."""
    for obj in mesh_objects:
        for j in range(len(obj.data.materials)):
            key = (obj.name, j)
            if key in original:
                obj.data.materials[j] = original[key]


# ─── Rendering ──────────────────────────────────────────────────────

def composite_on_white(filepath):
    """Composite a transparent PNG onto a white background."""
    try:
        img = bpy.data.images.load(filepath)
        w = img.size[0]
        h = img.size[1]
        pixels = list(img.pixels)
        new_pixels = []
        for i in range(0, len(pixels), 4):
            r, g, b, a = pixels[i:i+4]
            new_pixels.append(r * a + (1 - a))
            new_pixels.append(g * a + (1 - a))
            new_pixels.append(b * a + (1 - a))
            new_pixels.append(1.0)
        result = bpy.data.images.new("Composited", width=w, height=h, alpha=False, float_buffer=False)
        result.pixels = new_pixels
        scene = bpy.context.scene
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.image_settings.color_depth = "8"
        scene.render.use_overwrite = True
        result.save_render(filepath=filepath)
        bpy.data.images.remove(img)
        bpy.data.images.remove(result)
        log(f"Composited on white: {filepath}")
    except Exception as e:
        log(f"Post-processing failed: {e}")


def render_rgb(scene, vl, filepath):
    """Render the RGB pass with transparent background, then composite on white."""
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True  # Transparent for compositing
    vl.use_pass_combined = True
    vl.use_pass_z = False
    vl.use_pass_object_index = False
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    # Composite transparent -> white background
    composite_on_white(filepath)


def render_mask(scene, vl, mesh_objects, filepath):
    """Render segmentation mask using flat emission materials."""
    original = set_flat_materials(mesh_objects)
    # Hide every other mesh (e.g. the ground plane) so the mask only contains
    # the target object(s) on a transparent background.
    hidden = []
    for obj in scene.objects:
        if obj.type == "MESH" and obj not in mesh_objects and not obj.hide_render:
            obj.hide_render = True
            hidden.append(obj)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    vl.use_pass_combined = True
    vl.use_pass_z = False
    vl.use_pass_object_index = False
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    for obj in hidden:
        obj.hide_render = False
    restore_materials(mesh_objects, original)


def render_depth(scene, vl, filepath):
    """Render depth map as OpenEXR."""
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "16"
    vl.use_pass_combined = False
    vl.use_pass_z = True
    scene.render.film_transparent = False  # Depth needs opaque background
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    # Restore defaults
    vl.use_pass_combined = True
    vl.use_pass_z = False
    scene.render.film_transparent = True


# ─── Ground Truth Extraction ────────────────────────────────────────

def project_to_2d(cam_obj, point_3d, width, height):
    """Project a 3D world-space point to 2D pixel coordinates using the camera."""
    cam_data = cam_obj.data
    world_to_cam = cam_obj.matrix_world.inverted()
    point_cam = world_to_cam @ mathutils.Vector(point_3d)

    if point_cam.z >= 0:
        return None  # Point is behind the camera

    focal_length = cam_data.lens  # mm
    sensor_width = cam_data.sensor_width  # mm
    if sensor_width == 0 or focal_length == 0:
        return None

    px_per_mm_x = width / sensor_width
    px_per_mm_y = height / sensor_width

    x_ratio = (point_cam.x / (-point_cam.z)) * focal_length
    y_ratio = (point_cam.y / (-point_cam.z)) * focal_length

    x_pixel = x_ratio * px_per_mm_x + width / 2
    y_pixel = y_ratio * px_per_mm_y + height / 2

    return (x_pixel, y_pixel)


def extract_bbox_2d(cam_obj, mesh_objects, width, height):
    """Extract 2D bounding box from 3D object bounding boxes projected to screen."""
    coords_2d = []

    for obj in mesh_objects:
        bbox = obj.bound_box  # 8 corners in object space
        matrix = obj.matrix_world
        for corner in bbox:
            world_corner = matrix @ mathutils.Vector(corner)
            pixel = project_to_2d(cam_obj, world_corner, width, height)
            if pixel is not None:
                coords_2d.append(pixel)

    if not coords_2d:
        return None

    xs = [c[0] for c in coords_2d]
    ys = [c[1] for c in coords_2d]
    x_min = max(0, int(min(xs)))
    y_min = max(0, int(min(ys)))
    x_max = min(width, int(max(xs)))
    y_max = min(height, int(max(ys)))

    if x_max <= x_min or y_max <= y_min:
        return None

    return {
        "x": x_min,
        "y": y_min,
        "width": x_max - x_min,
        "height": y_max - y_min,
        "x_center": (x_min + x_max) / 2.0 / width,
        "y_center": (y_min + y_max) / 2.0 / height,
        "width_norm": (x_max - x_min) / width,
        "height_norm": (y_max - y_min) / height,
    }


# ─── Annotation Export ────────────────────────────────────────────────

def export_coco(annotations, output_dir, num_views, width, height):
    """Export annotations in COCO format."""
    coco = {
        "images": [],
        "annotations": [],
        "categories": [{"id": 1, "name": "object", "supercategory": "object"}],
    }

    ann_id = 1
    for i, ann in enumerate(annotations):
        img_name = f"img_{ann['job_id']}_{ann['view_num']}.png"
        coco["images"].append({
            "id": i + 1,
            "file_name": img_name,
            "width": width,
            "height": height,
        })
        if ann["bbox"]:
            coco["annotations"].append({
                "id": ann_id,
                "image_id": i + 1,
                "category_id": 1,
                "bbox": [
                    ann["bbox"]["x"],
                    ann["bbox"]["y"],
                    ann["bbox"]["width"],
                    ann["bbox"]["height"],
                ],
                "area": ann["bbox"]["width"] * ann["bbox"]["height"],
                "iscrowd": 0,
            })
            ann_id += 1

    path = os.path.join(output_dir, "annotations", "dataset_coco.json")
    with open(path, "w") as f:
        json.dump(coco, f, indent=2)
    log(f"Exported COCO annotations: {path}")


def export_yolo(annotations, output_dir):
    """Export annotations in YOLO format (one TXT per image)."""
    annot_dir = os.path.join(output_dir, "annotations")
    for ann in annotations:
        if ann["bbox"]:
            filename = f"img_{ann['job_id']}_{ann['view_num']}.txt"
            path = os.path.join(annot_dir, filename)
            with open(path, "w") as f:
                f.write(f"0 {ann['bbox']['x_center']:.6f} {ann['bbox']['y_center']:.6f} "
                        f"{ann['bbox']['width_norm']:.6f} {ann['bbox']['height_norm']:.6f}\n")
    log(f"Exported YOLO annotations ({len(annotations)} files)")


def export_voc(annotations, output_dir, width, height):
    """Export annotations in Pascal VOC format (one XML per image)."""
    import xml.etree.ElementTree as ET

    annot_dir = os.path.join(output_dir, "annotations")
    for ann in annotations:
        if not ann["bbox"]:
            continue
        root = ET.Element("annotation")
        ET.SubElement(root, "filename").text = f"img_{ann['job_id']}_{ann['view_num']}.png"
        size = ET.SubElement(root, "size")
        ET.SubElement(size, "width").text = str(width)
        ET.SubElement(size, "height").text = str(height)
        ET.SubElement(size, "depth").text = "3"
        obj = ET.SubElement(root, "object")
        ET.SubElement(obj, "name").text = "object"
        ET.SubElement(obj, "truncated").text = "0"
        ET.SubElement(obj, "difficult").text = "0"
        bndbox = ET.SubElement(obj, "bndbox")
        ET.SubElement(bndbox, "xmin").text = str(ann["bbox"]["x"])
        ET.SubElement(bndbox, "ymin").text = str(ann["bbox"]["y"])
        ET.SubElement(bndbox, "xmax").text = str(ann["bbox"]["x"] + ann["bbox"]["width"])
        ET.SubElement(bndbox, "ymax").text = str(ann["bbox"]["y"] + ann["bbox"]["height"])
        filename = f"img_{ann['job_id']}_{ann['view_num']}.xml"
        path = os.path.join(annot_dir, filename)
        tree = ET.ElementTree(root)
        tree.write(path, encoding="unicode")
    log(f"Exported Pascal VOC annotations")


# ─── Main ───────────────────────────────────────────────────────────

def main():
    args = parse_args()

    images_dir = os.path.join(args.output, "images")
    masks_dir = os.path.join(args.output, "masks")
    depth_dir = os.path.join(args.output, "depth")
    annotations_dir = os.path.join(args.output, "annotations")
    for d in [images_dir, masks_dir, depth_dir, annotations_dir]:
        os.makedirs(d, exist_ok=True)

    log(f"Starting SynGen Polygon render script")
    log(f"Model: {args.model}")
    log(f"Output: {args.output}")
    log(f"Views: {args.num_views}, Seed: {args.seed}, Resolution: {args.width}x{args.height}")

    # Load DR parameters (utf-8-sig handles BOM from Windows tools)
    with open(args.dr_params, "r", encoding="utf-8-sig") as f:
        dr_params = json.load(f)
    log(f"Loaded {len(dr_params)} domain randomization parameter sets")

    # Set up scene
    clear_scene()
    mesh_objects = import_model(args.model)
    scene, cam_obj, key_light_data = setup_scene(args, mesh_objects)

    view_layer = scene.view_layers[0]

    log("Starting rendering workflow")
    send_status(True, args.job_id)

    # Rendering loop
    annotations = []
    for i, params in enumerate(dr_params):
        view_num = i + 1
        log(f"Rendering view {view_num}/{len(dr_params)}...")

        # Apply domain randomization
        apply_dr_params(mesh_objects, params, cam_obj, key_light_data)

        filename_base = f"img_{args.job_id}_{view_num}"

        # 1. RGB image (combined pass, PNG)
        render_rgb(scene, view_layer, os.path.join(images_dir, filename_base))

        # 2. Segmentation mask (flat materials, PNG)
        render_mask(scene, view_layer, mesh_objects, os.path.join(masks_dir, filename_base))

        # 3. Depth map (Z pass, EXR)
        render_depth(scene, view_layer, os.path.join(depth_dir, filename_base))

        # Extract 2D bounding box
        bbox = extract_bbox_2d(cam_obj, mesh_objects, args.width, args.height)
        annotations.append({
            "job_id": args.job_id,
            "view_num": view_num,
            "bbox": bbox,
        })

        # Notify backend
        image_generated(view_num)
        log(f"View {view_num} complete — images saved")

    # Export annotations
    export_coco(annotations, args.output, len(dr_params), args.width, args.height)
    export_yolo(annotations, args.output)
    export_voc(annotations, args.output, args.width, args.height)

    send_status(False, args.job_id)
    log(f"Workflow complete: {len(dr_params)} images generated")
    send_status(False)


if __name__ == "__main__":
    main()
