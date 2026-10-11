/**
 * Official COCO 80-class label list used by YOLOv5 exports trained on COCO.
 * Index order matches the model's class dimension.
 */
export const COCO_CLASSES: readonly string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
  'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush',
];

export const MODEL_ID = 'yolov5s.onnx (Ultralytics, COCO)';
export const MODEL_INPUT_SIZE = 640;
export const DEFAULT_MODEL_URL =
  'https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx';

export function labelForClass(classId: number): string {
  if (classId >= 0 && classId < COCO_CLASSES.length) return COCO_CLASSES[classId];
  return 'unknown';
}

export function classIdForLabel(label: string): number {
  return COCO_CLASSES.indexOf(label);
}
