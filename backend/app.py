"""
AnimalScope AI - FastAPI backend.

Endpoints
  GET  /          basic service info
  GET  /health    health check (reports whether the model has finished loading)
  GET  /classes   class names in the exact order used by the model
  POST /predict   multipart upload (field name: "file") -> predicted class + all probabilities

Run locally:   uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

# Quieter TensorFlow logs. Must be set before TensorFlow is imported.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from fastapi import FastAPI, File, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from image_utils import (
    ALLOWED_CONTENT_TYPES,
    IMG_SIZE,
    RESIZE_METHOD,
    ImageValidationError,
    prepare_input,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("animalscope")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "animal_classifier.keras"))
CLASS_NAMES_PATH = Path(os.getenv("CLASS_NAMES_PATH", BASE_DIR / "class_names.json"))
MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)


class ModelState:
    """Holds the model and its loading status (the model loads in a background thread)."""

    def __init__(self) -> None:
        self.model = None
        self.class_names: list[str] = []
        self.status = "loading"  # "loading" | "ready" | "error"
        self.error: str | None = None
        self.predict_lock = threading.Lock()  # one prediction at a time keeps memory use predictable


state = ModelState()


def load_class_names() -> list[str]:
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        names = json.load(f)
    if not isinstance(names, list) or not all(isinstance(n, str) for n in names) or not names:
        raise ValueError("class_names.json must be a non-empty JSON list of strings")
    return names


def load_everything() -> None:
    """Load class names and the trained model exactly as the Colab notebook does."""
    try:
        t0 = time.time()
        class_names = load_class_names()
        log.info("Class names (model output order): %s", class_names)

        import tensorflow as tf  # imported here so the server can bind its port first
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

        # The saved model contains Lambda(preprocess_input). Same custom_objects as notebook cell 21.
        custom_objects = {"preprocess_input": preprocess_input}
        try:
            model = tf.keras.models.load_model(MODEL_PATH, custom_objects=custom_objects, compile=False)
        except ValueError as exc:
            # Keras "safe mode" can refuse Lambda layers in some versions. This is YOUR OWN trusted model file.
            log.warning("Standard load failed (%s). Retrying with safe_mode=False.", exc)
            model = tf.keras.models.load_model(
                MODEL_PATH, custom_objects=custom_objects, compile=False, safe_mode=False
            )

        out_units = model.output_shape[-1]
        if out_units != len(class_names):
            raise ValueError(
                f"Model outputs {out_units} classes but class_names.json has {len(class_names)} entries"
            )
        expected_input = (None, IMG_SIZE[0], IMG_SIZE[1], 3)
        if tuple(model.input_shape) != expected_input:
            raise ValueError(f"Unexpected model input shape {model.input_shape}, expected {expected_input}")

        # Warm-up so the first real request is fast.
        import numpy as np

        model.predict(np.zeros((1, IMG_SIZE[0], IMG_SIZE[1], 3), dtype="float32"), verbose=0)

        state.model = model
        state.class_names = class_names
        state.status = "ready"
        log.info("Model loaded and warmed up in %.1fs. Input %s, output %s",
                 time.time() - t0, model.input_shape, model.output_shape)
    except Exception as exc:  # noqa: BLE001 - we want to report any startup failure through /health
        state.status = "error"
        state.error = f"{type(exc).__name__}: {exc}"
        log.exception("Model loading failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=load_everything, name="model-loader", daemon=True).start()
    yield


app = FastAPI(
    title="AnimalScope AI API",
    description="Classifies an uploaded image as Cat, bird or dog using a MobileNetV2 model.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: set ALLOWED_ORIGINS to your Vercel URL(s), comma separated, e.g. https://animalscope-ai.vercel.app
_origins = [o.strip().rstrip("/") for o in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in _origins else _origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------- error handling: always return JSON like {"detail": "..."} ----------
@app.exception_handler(ImageValidationError)
async def image_error_handler(_, exc: ImageValidationError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": 'No image received. Send the image as multipart form data in a field named "file".'},
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(_, exc: Exception):
    log.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong while processing the image."})


# ---------- routes ----------
@app.get("/")
def root():
    return {"service": "AnimalScope AI API", "status": state.status, "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    body = {
        "status": state.status,
        "model_loaded": state.status == "ready",
        "classes": state.class_names,
        "input_size": list(IMG_SIZE),
        "resize_method": RESIZE_METHOD,
        "max_upload_mb": MAX_UPLOAD_MB,
    }
    if state.error:
        body["error"] = state.error
    return body


@app.get("/classes")
def classes():
    return {"classes": state.class_names or load_class_names()}


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    if state.status == "loading":
        return JSONResponse(
            status_code=503,
            content={"detail": "The model is still loading. Please try again in a few seconds."},
        )
    if state.status == "error" or state.model is None:
        return JSONResponse(status_code=503, content={"detail": "The model is not available on the server."})

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES and content_type != "application/octet-stream":
        return JSONResponse(
            status_code=415,
            content={"detail": f"Unsupported file type ({content_type}). Please upload a JPG, JPEG or PNG image."},
        )

    # Read at most MAX+1 bytes so an oversized upload is rejected without loading all of it.
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    batch = prepare_input(data, MAX_UPLOAD_BYTES)  # (1, 224, 224, 3) float32, raw 0..255 - see image_utils.py

    t0 = time.perf_counter()
    try:
        with state.predict_lock:
            probs = state.model.predict(batch, verbose=0)[0]
    except Exception:  # noqa: BLE001 - returned here (not re-raised) so the response still carries CORS headers
        log.exception("Prediction failed")
        return JSONResponse(status_code=500, content={"detail": "The model failed to process this image."})
    elapsed_ms = (time.perf_counter() - t0) * 1000

    probabilities = [
        {"class": name, "probability": float(p), "percentage": round(float(p) * 100, 2)}
        for name, p in zip(state.class_names, probs)
    ]
    top = max(range(len(probs)), key=lambda i: float(probs[i]))

    return {
        "predicted_class": state.class_names[top],
        "confidence": round(float(probs[top]) * 100, 2),
        "probabilities": probabilities,  # same order as class_names.json / the model output
        "inference_ms": round(elapsed_ms, 1),
        "filename": file.filename,
    }
