# 🐾 AnimalScope AI

### AI-Powered Animal Image Classifier

AnimalScope AI is a deep learning-based image classification application that identifies whether an uploaded image contains a **Cat, Bird, or Dog**. It uses a custom-trained MobileNetV2 model with TensorFlow/Keras and displays a confidence score for each class.

The project combines a React frontend with a FastAPI backend to provide an interactive animal image classification experience.

## 🌐 Live Application

**Frontend:** [https://soumya-animalscope.vercel.app/](https://soumya-animalscope.vercel.app/)

**Backend API:** [https://animalscope-ai-backend.onrender.com](https://animalscope-ai-backend.onrender.com)

**API Health Check:** [Check Backend Status](https://animalscope-ai-backend.onrender.com/health)

**API Documentation:** [Interactive API Docs](https://animalscope-ai-backend.onrender.com/docs)

## 📌 Project Overview

- **Frontend:** React, Vite, and CSS (deployed on Vercel)
- **Backend:** Python, FastAPI, TensorFlow/Keras, Pillow, and NumPy (deployed on Render)
- **Model:** Custom-trained `animal_classifier.keras`
- **Architecture:** MobileNetV2 with transfer learning
- **Input Image Size:** 224 × 224 pixels
- **Supported Classes:** Cat, bird, dog
- **Class Order:** `["Cat", "bird", "dog"]`

The original trained model and its class order are preserved.

## ✨ Features

- Upload animal images through a file picker or drag-and-drop.
- Classify images into Cat, Bird, or Dog categories.
- Display the predicted animal and confidence score.
- Show probability percentages for all three classes.
- Validate image formats and file sizes.
- Provide image previews before prediction.
- Responsive interface for desktop, tablet, and mobile.
- API health monitoring and loading indicators.
- Interactive API documentation through FastAPI.
- Optional click sound controls.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Styling | CSS |
| Backend | Python |
| API Framework | FastAPI |
| Deep Learning | TensorFlow / Keras |
| Model Architecture | MobileNetV2 |
| Image Processing | Pillow |
| Numerical Processing | NumPy |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

## 🧠 Model Architecture

AnimalScope AI uses MobileNetV2, a convolutional neural network originally trained on ImageNet.

Transfer learning is used to adapt the pre-trained network for three animal categories.

The classification model includes:

1. MobileNetV2 feature extractor
2. Global Average Pooling layer
3. Dropout layer (0.3)
4. Dense output layer with 3 neurons
5. Softmax activation for classification

### Model Configuration

| Parameter | Value |
|---|---|
| Architecture | MobileNetV2 |
| Input Shape | 224 × 224 × 3 |
| Output Classes | 3 |
| Dropout Rate | 0.3 |
| Total Parameters | 2,261,827 |
| Trainable Parameters | 3,843 |
| Non-Trainable Parameters | 2,257,984 |

**Model File:** `animal_classifier.keras`

## 📂 Dataset Information

The dataset contains 147 animal images divided into training, validation, and testing sets.

| Dataset | Cat | Bird | Dog | Total |
|---|---:|---:|---:|---:|
| Training | 30 | 36 | 36 | 102 |
| Validation | 13 | 8 | 8 | 29 |
| Testing | 5 | 6 | 5 | 16 |
| **Total** | **48** | **50** | **49** | **147** |

### Data Preprocessing

The following preprocessing techniques are used:

- Resize images to 224 × 224 pixels.
- Convert images to RGB format.
- Apply random horizontal flipping.
- Apply random rotation and zoom augmentation.
- Convert images into numerical arrays.
- Pass images to the trained MobileNetV2 model.

## ⚙️ Prediction Workflow

The application follows this workflow:

1. The user uploads a JPG, JPEG, or PNG image.
2. The React frontend sends the image to the FastAPI backend.
3. The backend validates and decodes the image.
4. The image is converted to RGB and resized to 224 × 224.
5. The trained MobileNetV2 model processes the image.
6. The model generates probabilities for Cat, bird, and dog.
7. The backend returns the predicted class and confidence scores.
8. The frontend displays the classification results.

### Important Preprocessing Detail

The saved Keras model already contains the MobileNetV2 `preprocess_input` Lambda layer.

Therefore, the backend passes image values in the 0–255 range without applying additional `/255` normalization or another `preprocess_input` operation.

This avoids applying preprocessing twice.

The backend uses nearest-neighbour resizing by default to match the notebook's prediction workflow.

## 📁 Project Structure

```text
AnimalScope-AI/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── sound.js
│   │   └── style.css
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example
│
├── backend/
│   ├── app.py
│   ├── image_utils.py
│   ├── requirements.txt
│   ├── animal_classifier.keras
│   ├── class_names.json
│   ├── verify_model.py
│   ├── env.example.txt
│   └── tests/
│
├── assets/
├── notebooks/
├── render.yaml
├── DEPLOYMENT.md
├── TEST_REPORT.md
├── README.md
└── .gitignore
```

## 🚀 Run the Project Locally

### Prerequisites

- Python 3.11
- Node.js and npm
- Git
- VS Code

### 1. Clone the Repository

```bash
git clone https://github.com/Soumyasriau/AnimalScope-AI.git
cd AnimalScope-AI
```

### 2. Start the Backend

Open a terminal:

```bash
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

Wait until the model finishes loading.

Open the health endpoint:

```text
http://127.0.0.1:8000/health
```

The expected status is `ready` with `model_loaded` set to `true`.

### 3. Start the Frontend

Open a second terminal:

```bash
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

Make sure the `.env` file contains:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## 🔌 API Endpoints

The FastAPI backend provides the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Basic API information |
| GET | `/health` | Backend and model health status |
| GET | `/classes` | Returns supported animal classes |
| POST | `/predict` | Predicts an uploaded animal image |

### Prediction Request

The `/predict` endpoint accepts an image using multipart form data.

Form field:

```text
file
```

Supported formats:

- JPG
- JPEG
- PNG

Maximum upload size: 10 MB.

### Example Response

```json
{
  "predicted_class": "Cat",
  "confidence": 98.5,
  "probabilities": [
    {
      "class": "Cat",
      "probability": 0.985,
      "percentage": 98.5
    },
    {
      "class": "bird",
      "probability": 0.01,
      "percentage": 1.0
    },
    {
      "class": "dog",
      "probability": 0.005,
      "percentage": 0.5
    }
  ],
  "inference_ms": 120.5,
  "filename": "cat.jpg"
}
```

*The values above are illustrative only. Actual predictions and confidence scores are generated by the trained model.*

## 🌍 Deployment

### Frontend Deployment – Vercel

The React frontend is hosted on Vercel.

Live URL:

[https://soumya-animalscope.vercel.app/](https://soumya-animalscope.vercel.app/)

Required environment variable:

```env
VITE_API_URL=https://animalscope-ai-backend.onrender.com
```

### Backend Deployment – Render

The FastAPI backend is hosted on Render.

Backend URL:

[https://animalscope-ai-backend.onrender.com](https://animalscope-ai-backend.onrender.com)

The Render configuration is defined in `render.yaml`.

Important backend environment variables:

| Variable | Purpose |
|---|---|
| `PYTHON_VERSION` | Python version (3.11.9) |
| `TF_CPP_MIN_LOG_LEVEL` | Controls TensorFlow logging |
| `ALLOWED_ORIGINS` | Allows requests from the Vercel frontend |
| `MAX_UPLOAD_MB` | Maximum image upload size |
| `RESIZE_METHOD` | Image resizing method |

### Current Deployment Status

- Frontend deployed on Vercel.
- Backend deployed on Render.
- Backend health endpoint has returned `ready`.
- Model loading has been confirmed through the health endpoint.
- End-to-end image prediction should be tested through the live website.

## 🧪 Model Verification

The repository includes:

```text
backend/verify_model.py
```

This script can be used to compare backend predictions against the original notebook predictions.

Example:

```bash
cd backend
python verify_model.py "C:\path\to\a_cat.jpg" "C:\path\to\a_dog.jpg" "C:\path\to\a_bird.jpg"
```

The expected successful verification result is:

```text
OVERALL: PASS
```

Refer to `TEST_REPORT.md` for the project's testing details.

## ⚠️ Known Limitations

- The model recognizes only Cat, bird, and dog categories.
- Images of other animals may still be assigned one of these three classes.
- Confidence scores represent model probabilities, not guaranteed correctness.
- The dataset is relatively small, so additional testing with diverse images is necessary.
- Render free hosting may experience cold starts and memory limitations.
- Phone images with EXIF rotation are not automatically rotated.
- Large image uploads are restricted to 10 MB.

## 🔐 Security

- Do not commit API keys, passwords, or private credentials to GitHub.
- Store deployment configuration in environment variables.
- Restrict backend CORS access to trusted frontend origins.
- Revoke and replace any API key that may have been exposed in a public notebook or repository.

## 🔮 Future Improvements

- Expand the dataset with more animal images.
- Add support for more animal categories.
- Improve model generalization with additional training data.
- Optimize backend inference performance.
- Improve mobile usability.
- Add more robust model evaluation using larger test datasets.

## 🎯 Project Objective

The main objective of AnimalScope AI is to build a practical deep learning application that identifies common animals from uploaded images.

This project demonstrates the integration of computer vision, transfer learning, TensorFlow/Keras, REST API development, and cloud deployment.

## 👩‍💻 Author

**Soumya Sria**

GitHub: [Soumyasriau](https://github.com/Soumyasriau)

Project Repository: [AnimalScope-AI](https://github.com/Soumyasriau/AnimalScope-AI)

---

⭐ If you find this project interesting, consider giving the repository a star!
