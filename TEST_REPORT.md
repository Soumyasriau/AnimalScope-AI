# Test report

This report lists what was actually tested while building the project, and what was **not**. Nothing here is claimed beyond that.

**Build environment limits:** no internet (so `pip install` and `npm install` were impossible), and **TensorFlow, Keras, h5py and FastAPI were not installed**.
Therefore the trained model could not be executed, and the FastAPI server could not be started.

## 1. Tests that were run and passed

### Files and model (24 unit tests in `backend/tests`, all passed)
Run with `cd backend && python -m unittest discover -s tests -v` (needs only Python, Pillow and NumPy).

| Check | Result |
|-------|--------|
| `animal_classifier.keras` and `class_names.json` are present in `backend/` | Passed |
| The copied model is byte-identical to the uploaded file (SHA-256 compared when the ZIP was built) | Passed |
| `.keras` archive is a valid ZIP (`config.json`, `metadata.json`, `model.weights.h5`), and the weights file has a valid HDF5 header | Passed |
| `class_names.json` equals `["Cat", "bird", "dog"]` exactly, in that order | Passed |
| Model config (read directly from the archive): input `[None, 224, 224, 3]`, MobileNetV2 backbone, final `Dense(3, softmax)` | Passed |
| Model config contains exactly one `Lambda` layer calling `preprocess_input` and no `Rescaling` layer, i.e. **scaling is inside the model** | Passed |

### Preprocessing and image validation (`backend/image_utils.py`)
| Check | Result |
|-------|--------|
| Output shape `(1, 224, 224, 3)`, dtype `float32` | Passed |
| Pixel values stay **raw 0 to 255** (a white image gives exactly 255.0, so there is no `/255` and no double scaling) | Passed |
| RGB channel order; RGBA, grayscale and palette PNGs become 3-channel RGB | Passed |
| Output equals `convert("RGB")` + `resize((224, 224), NEAREST)` + `float32` | Passed (see caveat below) |
| JPEG and PNG accepted; GIF, BMP, WebP, text files, empty files, truncated JPEGs, and fake files with a `.jpg` name are rejected with clear messages and the right status code (400 / 415) | Passed |
| Files over the size limit are rejected (413) | Passed |

*Caveat:* the nearest-neighbour equivalence is checked against Pillow's behaviour. That Keras `load_img` uses nearest-neighbour by default
comes from Keras documentation and source, not from running Keras here. `backend/verify_model.py` checks this directly on your machine.

### Website (75 automated browser checks, all passed)
Run in headless Chromium against the website bundle, talking to a **test-only stub API** (see the limitation below).
The stub used the real `image_utils.py` for validation but returned **pseudo-random probabilities**; it is not part of this project.

- Hero text, subtitle, nav links (Home, About, Model, Results, Docs), feature highlights, Try Now, Sound button present; no animal images in the hero
- Every nav link scrolls its section to just below the header; active link highlights; Try Now scrolls to the upload card
- Empty state shown before upload (no numbers); Predict disabled until an image is chosen
- `.txt`, `.gif`, a fake `.jpg` and a 15 MB `.png` each produce a clear error message
- A valid JPG/PNG shows the **uploaded image** as preview (verified by its pixel dimensions); drag and drop works; Clear works; choosing a new image resets the result
- After Predict, the predicted name, confidence, and all three bar values and widths **equal the API response** (compared programmatically); bar order is Cat, Bird, Dog
- Loading state, HTTP 503 message, "server unreachable" message, "model is loading" status and automatic recovery all behave correctly
- Sound: off by default; one quiet tick when switched on; click ticks only while ON; silent when OFF; preference remembered
- Tablet (820 px) and mobile (390 px): no horizontal scrolling, hamburger menu opens/closes and navigates, results layout fits
- No JavaScript errors in the console
- Screenshots were reviewed by eye for desktop and mobile

## 2. Not tested (could not be done here)

| Not tested | Why | What to do |
|------------|-----|-----------|
| **Loading the `.keras` file with TensorFlow and running real predictions** | TensorFlow not installable offline | Run `python verify_model.py <images>` (see README). Not verified: the load path with `custom_objects`, real probabilities, and your 99.55% / 100.00% results being reproduced |
| **Starting `app.py` / calling the real `/predict`** | FastAPI not installed | The file compiles and passed a static name check, but it has **never been run**. Endpoints, CORS, error handlers and the background model loader are untested. Run it locally (Part 2 of `DEPLOYMENT.md`) |
| **`requirements.txt` resolves** | No network | TensorFlow/Keras versions are unverified. Your model was saved with Keras 3.13.2, so Keras >= 3.13.2 is requested |
| **`npm install` and the real Vite build (`npm run build`)** | No network | The code was bundled with esbuild (compiles the same JSX and CSS), but Vite's own build, `package.json` dependency versions and `vercel.json` were not run |
| **Memory use / speed on Render** | No deployment | TensorFlow may exceed the free 512 MB plan |
| **GitHub, Render and Vercel deployment** | No access / not requested to be performed | Follow `DEPLOYMENT.md`. The site is **not live** |
| Browsers other than Chromium, real phones, Windows | Only headless Chromium on Linux available | Try it on your laptop and phone |
| **Design reference image** | **It was not among the uploaded files** | The design follows your written description only. Send the image if you want it matched more closely |

## 3. Limitations worth knowing

- The stub API in tests returned fake numbers to check the website's wiring. No real model output was ever shown in any test.
- The resize method follows your notebook's test cell (nearest-neighbour), while training used bilinear. This is configurable (`RESIZE_METHOD`).
  Run `verify_model.py` on a few of your own photos to see whether it changes anything.
