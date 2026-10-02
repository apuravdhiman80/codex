# Model and data notices

VisionID ships the following browser model assets at `/models/v1/`. Runtime model fetches are same-origin. The service worker caches only the exact versioned paths and SHA-256 values in this notice and `src/ai/engine/modelManifest.ts`.

## Inference modules

| Module | Version / model | Purpose | Enabled output |
| --- | --- | --- | --- |
| `@vladmandic/human` | 3.3.6 | BlazeFace detection, FaceMesh landmarks, HSE FaceRes embedding | Face box, detector confidence, landmarks, 1024-value descriptor |
| `@tensorflow-models/coco-ssd` | 2.2.3, `lite_mobilenet_v2` | COCO object detection | Class, model class index, detector confidence, pixel box |
| TensorFlow.js backends | 4.22.0 | WebGL, WASM, then CPU fallback | Model execution |

The COCO SSD model recognizes the 80 COCO categories listed by its upstream package. It does not recognize arbitrary objects. Runtime scores are model detector scores, not calibrated probabilities.

Only face detection, mesh landmarks, and face description are enabled in Human. Emotion, age, gender, race, antispoof, liveness, body, hand, segmentation, gestures, and Human's own object model remain disabled. COCO object detector output is separate from face detector output. Recognition similarity is computed only by the app's matcher against enrolled descriptors and never reused as detector confidence.

## Model asset inventory

Every SHA-256 below was computed from the exact checked-in file. Size is in bytes.

| File | Size | SHA-256 | Upstream / stated license |
| --- | ---: | --- | --- |
| `human/blazeface.json` | 79,038 | `cd7bbfc078270572beb39f9e5ae67aadbd50b5e67cff37e6d4f6b3ea39312e5f` | MediaPipe BlazeFace / Apache-2.0 |
| `human/blazeface.bin` | 538,928 | `dc9a97fdc50bc43216554bdd69aa3e7b9361a519ee7bdd996a2f69a98a6f9b72` | MediaPipe BlazeFace / Apache-2.0 |
| `human/facemesh.json` | 95,845 | `b60ca26f404724f43bd2b1575761d8265180e1f053cc0731caa68462927309e7` | MediaPipe FaceMesh / Apache-2.0 |
| `human/facemesh.bin` | 1,477,958 | `3826da640b0a3021161605369ee6af293f75d518040355b960ec71a3390c1c0b` | MediaPipe FaceMesh / Apache-2.0 |
| `human/faceres.json` | 71,432 | `5b83d49c0385d2e68a05122441b94226313677cae9fcc40b9587ad50079eb4df` | HSE FaceRes / Apache-2.0; training data notice below |
| `human/faceres.bin` | 6,978,814 | `2c7d2d62b76c97528b736527aa09d310ea71743c9e3e79fb6c62d4b2d73af79b` | HSE FaceRes / Apache-2.0; training data notice below |
| `coco-ssd/model.json` | 527,315 | `3770b2528339b1e3340cb74360e1e40401816b009779aeb8d0cce3a4353ea3a9` | TensorFlow COCO SSD / Apache-2.0 |
| `coco-ssd/group1-shard1of5` | 4,194,304 | `0e7af0f713e98521252321f7f84892c31cefccccec3ac64c84e5065b75ed5646` | TensorFlow COCO SSD / Apache-2.0 |
| `coco-ssd/group1-shard2of5` | 4,194,304 | `74cc6cfc2c4510c9cd81b8ad4cebf6f6a8f305119bb365ce0eb96276da38519a` | TensorFlow COCO SSD / Apache-2.0 |
| `coco-ssd/group1-shard3of5` | 4,194,304 | `50383033f893eae136392a403e8f70ade5efd90867df5695c4ca5ac640e14f38` | TensorFlow COCO SSD / Apache-2.0 |
| `coco-ssd/group1-shard4of5` | 4,194,304 | `d856dc534c780068bbf6c666ce1516df2c8433d87578aa31fcdf197de7058cc2` | TensorFlow COCO SSD / Apache-2.0 |
| `coco-ssd/group1-shard5of5` | 1,257,312 | `3d356f1fb6dfca6af78c56db34d9326706d0196e303f9de6b04f236ca79ed309` | TensorFlow COCO SSD / Apache-2.0 |
| `tfjs-wasm/tfjs-backend-wasm.wasm` | 311,123 | `70a5d516060464e5269f01c74bac1772d6b8ab6cb612acf16b5cdaf61f78d892` | TensorFlow.js / Apache-2.0 |
| `tfjs-wasm/tfjs-backend-wasm-simd.wasm` | 424,594 | `77ebb28a6d34f371dbbf2086b7f2de8994acd8ea5a3cf1fa24d2c26c840cac7b` | TensorFlow.js / Apache-2.0 |
| `tfjs-wasm/tfjs-backend-wasm-threaded-simd.wasm` | 435,643 | `c052228d4bef185c27bbe59a9e029570c78bbb9f08b3cb46b597851650373de2` | TensorFlow.js / Apache-2.0 |

## Attribution and training-data scope

- Human library source code is MIT licensed. Its [upstream model list](https://github.com/vladmandic/human/wiki/Models) identifies BlazeFace and FaceMesh as MediaPipe models and Face Description as HSE FaceRes. This project includes the corresponding upstream MIT/Apache license texts alongside the model files.
- The [HSE FaceRec repository](https://github.com/av-savchenko/HSE_FaceRec_tf) identifies its MobileNet/ResNet model family as trained using VGGFace2. Its source repository is Apache-2.0. [VGG's dataset access terms](https://www.robots.ox.ac.uk/~vgg/terms/dataset-group-2-access.html) grant researchers use strictly for non-commercial research and say output artifacts must not be incorporated in commercial products. The dataset image files are not included here, but training provenance still matters: the HSE weights are shipped for this local research/demo build only. Before redistributing or using FaceRes weights in a commercial product, obtain a clear rights determination or replace the embedding model with weights whose model and training-data rights permit that use. A successful JavaScript build does not establish those rights.
- COCO SSD's [upstream implementation](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) and TensorFlow.js runtime use Apache-2.0. The model is trained for the COCO categories; the project includes no COCO images or annotations. The [COCO dataset site](https://cocodataset.org/#home) should be reviewed if adding dataset content or reproducing dataset-derived material.
- WASM backend binaries are from TensorFlow.js 4.22.0 and are included under the TensorFlow Apache-2.0 license.

The license texts shipped beside assets are `human/LICENSE-Human-MIT.txt`, `human/LICENSE-MediaPipe-Apache-2.0.txt`, `human/LICENSE-HSE.txt`, `coco-ssd/LICENSE-TensorFlow-Apache-2.0.txt`, and `tfjs-wasm/LICENSE-TensorFlow-Apache-2.0.txt`.

## Runtime, network, and privacy

The first visit downloads about 29 MB of public model files from this application's own static origin. A versioned service worker verifies file length and SHA-256 before storing a model response in CacheStorage and re-checks integrity on cache hits. It does not cache camera frames, QR payloads, profile data, or descriptors. Frames are passed from the camera to local inference and released after the result. Enrolled 1024-value descriptors are stored in local IndexedDB only after the user opts in to enrollment. Removing the model cache does not delete personal records.

The model sources are pinned in `src/ai/engine/modelManifest.ts`. To upgrade an asset, update its exact source, version, license/data notice, size, and digest in that manifest and the service worker allowlist together, then re-run model and deployment checks.
