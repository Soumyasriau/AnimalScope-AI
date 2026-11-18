"""
Image validation and preprocessing for AnimalScope AI.

This module only needs Pillow and NumPy (no TensorFlow), so it can be unit-tested anywhere.

WHAT THE COLAB NOTEBOOK DOES (prediction cell, "Upload an image"):

    img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
    img_array = tf.keras.utils.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    predictions = model.predict(img_array, verbose=0)[0]

and the model itself was built as:

    ... RandomFlip / RandomRotation / RandomZoom ...
    layers.Lambda(tf.keras.applications.mobilenet_v2.preprocess_input)   # <- scaling is INSIDE the model
    base_model (MobileNetV2) ...

So the API must:
  1. open the image and convert it to RGB,
  2. resize to 224x224 using NEAREST (Keras load_img's default interpolation),
  3. convert to a float32 array with raw pixel values 0..255 (NO division by 255, NO extra preprocess_input),
  4. add a batch dimension.

The MobileNetV2 scaling (x / 127.5 - 1) is applied by the Lambda layer inside the saved model.
Applying it here as well would scale the pixels twice and break the predictions.
"""

from __future__ import annotations

import io
import os
from typing import Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError

IMG_SIZE: Tuple[int, int] = (224, 224)

# Formats accepted by the API (Pillow format names) and the MIME types browsers send for them.
ALLOWED_FORMATS = {"JPEG", "PNG"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/x-png"}

# Notebook parity: Keras load_img() resizes with "nearest" by default.
# (image_dataset_from_directory, used for TRAINING, uses bilinear.)
# Set RESIZE_METHOD=bilinear in the environment to use training-style resizing instead.
_RESAMPLING = {
    "nearest": Image.Resampling.NEAREST,
    "bilinear": Image.Resampling.BILINEAR,
}
RESIZE_METHOD = os.getenv("RESIZE_METHOD", "nearest").strip().lower()
if RESIZE_METHOD not in _RESAMPLING:
    raise ValueError("RESIZE_METHOD must be 'nearest' or 'bilinear'")

# Guard against decompression-bomb style images (Pillow also warns above its own default limit).
Image.MAX_IMAGE_PIXELS = 50_000_000


class ImageValidationError(Exception):
    """Raised when an uploaded file is not an acceptable image. Carries an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def load_and_validate_image(data: bytes, max_bytes: int) -> Image.Image:
    """Decode the uploaded bytes and make sure they are a real JPEG or PNG image."""
    if not data:
        raise ImageValidationError("The uploaded file is empty.", 400)

    if len(data) > max_bytes:
        mb = max_bytes / (1024 * 1024)
        raise ImageValidationError(f"The image is too large. Maximum size is {mb:.0f} MB.", 413)

    try:
        # verify() checks file integrity but invalidates the object, so open twice.
        probe = Image.open(io.BytesIO(data))
        detected_format = probe.format
        probe.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ImageValidationError(
            "The file could not be read as an image. It may be corrupted or not an image.", 400
        )

    if detected_format not in ALLOWED_FORMATS:
        raise ImageValidationError(
            f"Unsupported image format ({detected_format or 'unknown'}). Please upload a JPG, JPEG or PNG image.",
            415,
        )

    return img


def preprocess_image(img: Image.Image) -> np.ndarray:
    """
    Notebook-identical preprocessing. Returns an array of shape (1, 224, 224, 3), dtype float32,
    with raw pixel values in the range 0..255.
    """
    img = img.convert("RGB")                               # same as load_img(color_mode="rgb")
    img = img.resize(IMG_SIZE, _RESAMPLING[RESIZE_METHOD])  # PIL takes (width, height)
    arr = np.asarray(img, dtype="float32")                  # same as img_to_array: float32, 0..255
    return np.expand_dims(arr, axis=0)                      # add batch dimension


def prepare_input(data: bytes, max_bytes: int) -> np.ndarray:
    """Validate raw upload bytes and return the model-ready batch."""
    return preprocess_image(load_and_validate_image(data, max_bytes))
