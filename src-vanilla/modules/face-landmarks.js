const TASKS_BUNDLE = '/vendor/mediapipe/tasks-vision/vision_bundle.mjs';
const TASKS_WASM = '/vendor/mediapipe/tasks-vision/wasm';
const FACE_LANDMARKER_MODEL = '/vendor/mediapipe/face_landmarker.task';

let faceLandmarkerPromise = null;

/**
 * Returns MediaPipe face landmarks in normalized image coordinates.
 * The model and WASM files are vendored so runtime detection is fully offline.
 */
export async function detectFaceLandmarks(image) {
  try {
    const landmarker = await getFaceLandmarker();
    const result = landmarker.detect(image);
    return result.faceLandmarks?.[0] || null;
  } catch (err) {
    console.warn('Face landmark detection unavailable; using fallback placement.', err);
    return null;
  }
}

async function getFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(TASKS_BUNDLE);
      const vision = await FilesetResolver.forVisionTasks(TASKS_WASM);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
    })();
  }
  return faceLandmarkerPromise;
}
