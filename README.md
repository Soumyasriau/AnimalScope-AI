AnimalScope AI
AI-Powered Animal Image Classifier. Upload a photo and a MobileNetV2 deep learning model (TensorFlow / Keras) tells you whether it shows a Cat, a bird or a dog, with a confidence score for every class.

Frontend: React + Vite + CSS (deploys to Vercel)
Backend: Python FastAPI + TensorFlow/Keras + Pillow + NumPy (deploys to Render)
Model: your own animal_classifier.keras (MobileNetV2 transfer learning), unchanged
Class order: ["Cat", "bird", "dog"], unchanged
Status: this project has not been deployed, and the trained model has not been run inside this build environment (no TensorFlow was available there). Read TEST_REPORT.md for exactly what was and was not tested, and run backend/verify_model.py once on your PC to close that gap (instructions below).

Folder structure
AnimalScope-AI/
├── frontend/                  React + Vite website
│   ├── src/
│   │   ├── App.jsx            all page sections, upload + results logic
│   │   ├── main.jsx
│   │   ├── sound.js           optional click sound (Web Audio, no audio files)
│   │   └── style.css          dark navy cyber arcade-inspired theme
│   ├── public/favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example           VITE_API_URL (backend address)
├── backend/                   FastAPI service
│   ├── app.py                 API: /health, /classes, /predict
│   ├── image_utils.py         image validation + preprocessing (matches the notebook)
│   ├── requirements.txt
│   ├── animal_classifier.keras   YOUR trained model
│   ├── class_names.json          YOUR class names
│   ├── verify_model.py        run on your PC to compare API output with the notebook
│   ├── env.example.txt        list of optional environment variables
│   └── tests/                 unit tests (no TensorFlow needed)
├── render.yaml                optional one-click Render blueprint
├── DEPLOYMENT.md              step-by-step Windows / GitHub / Render / Vercel guide
├── TEST_REPORT.md             honest list of what was tested and what was not
├── README.md
└── .gitignore
How preprocessing works (checked against your notebook)
Your notebook builds the model like this:

layers.Lambda(tf.keras.applications.mobilenet_v2.preprocess_input),   # scaling is INSIDE the saved model
and the notebook's prediction cell feeds the model raw 0–255 pixels:

img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
img_array = tf.keras.utils.img_to_array(img)
img_array = np.expand_dims(img_array, axis=0)
predictions = model.predict(img_array, verbose=0)[0]
The backend therefore does exactly this and nothing more:

Decode the upload, confirm it really is a JPEG or PNG.
Convert to RGB.
Resize to 224 × 224 with nearest-neighbour (the default of Keras load_img, i.e. what your Colab test used).
Convert to float32 with values 0–255. No /255.0 and no extra preprocess_input, because the model already contains it.
Add a batch dimension and call model.predict.
Applying /255 or preprocess_input in the API as well would scale the image twice and give wrong predictions.

One detail worth knowing: during training, image_dataset_from_directory resized images with bilinear interpolation, while your Colab test cell (load_img) used nearest. The API follows the test cell because your reported results came from it. If you ever prefer training-style resizing, set the environment variable RESIZE_METHOD=bilinear. verify_model.py prints both results for your own images so you can see whether it matters.

Run it on your own computer (Windows)
Full beginner steps are in DEPLOYMENT.md. The short version, in two VS Code terminals:

Terminal 1: backend

cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
Wait until the log says Model loaded and warmed up, then open http://127.0.0.1:8000/health. It should show "status":"ready".

Terminal 2: frontend

cd frontend
Copy-Item .env.example .env
npm install
npm run dev
Open http://localhost:5173.

Verify the model against your notebook (recommended, once):

cd backend
python verify_model.py "C:\path\to\a_cat.jpg" "C:\path\to\a_dog.jpg" "C:\path\to\a_bird.jpg"
It should end with OVERALL: PASS.

API
Method	Path	Purpose
GET	/health	status is loading, ready or error; also lists classes and input size
GET	/classes	Class names in model order
POST	/predict	Multipart form field file (JPG/JPEG/PNG, max 10 MB)
POST /predict returns:

{
  "predicted_class": "<class name>",
  "confidence": "<0-100>",
  "probabilities": [
    { "class": "Cat",  "probability": "<0-1>", "percentage": "<0-100>" },
    { "class": "bird", "probability": "<0-1>", "percentage": "<0-100>" },
    { "class": "dog",  "probability": "<0-1>", "percentage": "<0-100>" }
  ],
  "inference_ms": "<number>",
  "filename": "<name>"
}
(The values are placeholders here on purpose; real numbers come only from your model.)

Errors are JSON {"detail": "..."} with status 400 (unreadable/empty image), 413 (too large), 415 (not JPG/PNG), 422 (no file sent) or 503 (model still loading / unavailable). Interactive docs: /docs on the backend URL.

Environment variables
Where	Name	Meaning
Backend	ALLOWED_ORIGINS	Website address(es) allowed to call the API, comma separated. Default: http://localhost:5173,http://127.0.0.1:5173
Backend	MAX_UPLOAD_MB	Upload limit, default 10
Backend	RESIZE_METHOD	nearest (default, matches notebook test cell) or bilinear
Backend	PYTHON_VERSION	Render only: set to 3.11.9
Frontend	VITE_API_URL	Backend address, e.g. https://animalscope-ai-backend.onrender.com (no trailing slash)
Features
Sticky header with logo, working navigation (Home, About, Model, Results, Docs), Sound ON/OFF and Try Now
Hero section with animated wave graphic, no decorative animal images
Drag-and-drop or button upload, live preview, JPG/JPEG/PNG validation with clear error messages
Results panel: uploaded image, predicted animal, confidence, and one bar per class, all taken from the API response
Empty state before any prediction; loading, error and server-waking states
Optional, quiet click sound (off by default, remembered between visits, no music)
Responsive layout for desktop, tablet and mobile; respects "reduce motion"
Known limitations
The model only knows Cat, bird and dog. A photo of a horse will still be labelled as one of the three. Confidence is a probability from the model, not a guarantee.
Your Colab results (99.55% bird, 100.00% dog) were single-image tests. The website deliberately does not display them as fixed numbers.
TensorFlow is heavy. Free hosting tiers may be too small and cold-start slowly; see DEPLOYMENT.md.
Phone photos with EXIF rotation are not auto-rotated, exactly like the notebook's load_img.
Security note
Cell 2 of your Colab notebook contains your Roboflow API key. Thatwhich readme is nice
