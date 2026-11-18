# AnimalScope AI

**AI-powered animal image classification using deep learning and transfer learning.**

AnimalScope AI classifies animal images into three categories: **Cat, Dog and Bird**. It uses a MobileNetV2 model pretrained on ImageNet, fine-tuned for this task with TensorFlow and Keras, and is served through a FastAPI backend with a React frontend.

**Live frontend:** [soumya-animalscope.vercel.app](https://soumya-animalscope.vercel.app/)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Dataset](#dataset)
5. [Data Preprocessing](#data-preprocessing)
6. [Model Architecture](#model-architecture)
7. [Training Configuration](#training-configuration)
8. [Results](#results)
9. [Project Structure](#project-structure)
10. [Getting Started](#getting-started)
11. [Limitations](#limitations)
12. [Future Improvements](#future-improvements)
13. [Author](#author)

---

## Overview

AnimalScope AI demonstrates how computer vision and web technologies can be combined into a practical image classification application. A user uploads an animal photo, the trained model predicts whether it shows a cat, a dog or a bird, and the interface returns the predicted class together with a confidence score.

The project covers the full workflow: dataset preparation, data augmentation, transfer learning, evaluation, API development and frontend deployment.

## Key Features

- Classifies images into three categories: Cat, Dog and Bird
- Transfer learning with MobileNetV2 (pretrained on ImageNet)
- Image augmentation to improve training robustness
- Softmax output providing a confidence score for each class
- FastAPI backend for model serving
- React and Vite frontend, deployed on Vercel

## Technology Stack

| Component | Technology |
| :-- | :-- |
| Language | Python |
| Deep learning | TensorFlow, Keras |
| Model | MobileNetV2 |
| Dataset source | Roboflow |
| Data processing | NumPy |
| Visualization | Matplotlib, Seaborn |
| Evaluation | Scikit-learn |
| Backend | FastAPI |
| Frontend | React, Vite |
| Frontend hosting | Vercel |

## Dataset

The dataset contains **147 images** across three classes, divided into training, validation and test sets.

| Split | Cat | Bird | Dog | Total |
| :-- | --: | --: | --: | --: |
| Training | 30 | 36 | 36 | 102 |
| Validation | 13 | 8 | 8 | 29 |
| Testing | 5 | 6 | 5 | 16 |
| **Total** | **48** | **50** | **49** | **147** |

All images are resized to 224 × 224 pixels and processed as RGB.

## Data Preprocessing

- Resizing to 224 × 224 pixels
- RGB conversion
- Random horizontal flip
- Random rotation
- Random zoom
- Input normalization for MobileNetV2

Augmentation is applied during training only.

## Model Architecture

The model uses MobileNetV2 as a frozen feature extractor with a small classification head.

| Stage | Layer |
| :-: | :-- |
| 1 | Input image (224 × 224 × 3) |
| 2 | Data augmentation |
| 3 | MobileNetV2 feature extractor |
| 4 | Global average pooling |
| 5 | Dropout (0.3) |
| 6 | Dense layer (3 neurons) |
| 7 | Softmax activation |

**Model configuration**

| Parameter | Value |
| :-- | --: |
| Input shape | 224 × 224 × 3 |
| Base model | MobileNetV2 |
| Output classes | 3 |
| Dropout | 0.3 |
| Total parameters | 2,261,827 |
| Trainable parameters | 3,843 |
| Non-trainable parameters | 2,257,984 |

The parameter counts above correspond to the stage in which the MobileNetV2 backbone is frozen and only the classification head is trained.

## Training Configuration

| Setting | Value |
| :-- | :-- |
| Optimizer | Adam |
| Loss function | Sparse categorical crossentropy |
| Metric | Accuracy |
| Epochs | 20 |
| Callbacks | Early Stopping, ReduceLROnPlateau |

## Results

| Metric | Result |
| :-- | --: |
| Training accuracy | 100% |
| Validation accuracy | 100% |
| Training loss | 0.0309 |
| Validation loss | 0.0704 |
| Test accuracy | 100% |

**Test set performance**

| Class | Correct | Total |
| :-- | --: | --: |
| Cat | 5 | 5 |
| Bird | 6 | 6 |
| Dog | 5 | 5 |
| **Overall** | **16** | **16** |

> **Note:** These results come from a very small dataset, including a test set of only 16 images. They show that the model fits this data well, but they do not guarantee the same accuracy on a larger or more varied set of real-world images.

## Project Structure

```text
AnimalScope-AI/
├── backend/
│   ├── app.py                  FastAPI application
│   ├── image_utils.py          Image preprocessing utilities
│   ├── animal_classifier.keras Trained model
│   ├── class_names.json        Class labels
│   ├── requirements.txt        Python dependencies
│   └── verify_model.py         Model verification script
├── frontend/                   React + Vite web application
├── notebooks/                  Training notebook
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.x
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Soumyasriau/AnimalScope-AI.git
cd AnimalScope-AI
```

### 2. Run the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

The API runs at `http://127.0.0.1:8000` by default.

### 3. Run the frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

The app opens at the address shown in the terminal, usually `http://localhost:5173`.

## Limitations

- The dataset is small (147 images), so generalization is not yet proven.
- The test set contains only 16 images, so reported accuracy has limited statistical meaning.
- The model recognizes only three classes and will assign one of them to any image, including images of other animals.
- The frontend is hosted on Vercel. Live predictions also require the FastAPI backend to be deployed and connected to the frontend through the `VITE_API_URL` setting.

## Future Improvements

- Expand the dataset with more diverse animal images
- Add more animal categories
- Evaluate on a larger, independent test set
- Deploy the backend API for public predictions
- Improve prediction speed and accuracy
- Add mobile-friendly support

## Author

**Soumya Sria**

- GitHub: [@Soumyasriau](https://github.com/Soumyasriau)
- Repository: [AnimalScope-AI](https://github.com/Soumyasriau/AnimalScope-AI)

---

If you find this project useful, consider giving the repository a star.
