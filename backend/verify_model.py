r"""
Run this ONCE on your own computer to prove the API pipeline gives the same answers as your Colab notebook.

    cd backend
    python verify_model.py path\to\some_cat.jpg path\to\some_dog.jpg path\to\some_bird.jpg

For every image it computes the prediction two ways:
  A) the notebook way   (tf.keras.utils.load_img -> img_to_array -> model.predict)    [notebook cell 14]
  B) the website's way  (image_utils.prepare_input on the raw file bytes -> model.predict)
and checks that A and B agree. It also shows what would change if bilinear resizing was used instead.
"""
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

import image_utils

HERE = Path(__file__).resolve().parent
MAX_BYTES = 10 * 1024 * 1024


def main(paths):
    class_names = json.loads((HERE / "class_names.json").read_text(encoding="utf-8"))
    print("Class names (must be ['Cat', 'bird', 'dog']):", class_names)

    model = tf.keras.models.load_model(
        HERE / "animal_classifier.keras",
        custom_objects={"preprocess_input": preprocess_input},
        compile=False,
    )
    print("Model loaded. Input:", model.input_shape, "Output:", model.output_shape)
    assert model.output_shape[-1] == len(class_names), "class count mismatch"

    all_ok = True
    for path in paths:
        print("\n==", path)

        # A) exactly what the notebook's prediction cell does
        img = tf.keras.utils.load_img(path, target_size=(224, 224))
        arr = np.expand_dims(tf.keras.utils.img_to_array(img), axis=0)
        probs_a = model.predict(arr, verbose=0)[0]

        # B) what the website's backend does
        data = Path(path).read_bytes()
        probs_b = model.predict(image_utils.prepare_input(data, MAX_BYTES), verbose=0)[0]

        # Extra: training-style bilinear resize, for information only
        saved = image_utils.RESIZE_METHOD
        image_utils.RESIZE_METHOD = "bilinear"
        probs_c = model.predict(image_utils.prepare_input(data, MAX_BYTES), verbose=0)[0]
        image_utils.RESIZE_METHOD = saved

        diff = float(np.max(np.abs(probs_a - probs_b)))
        ok = diff < 1e-5
        all_ok &= ok
        print(f"  notebook : {class_names[int(np.argmax(probs_a))]:5s} {probs_a.max()*100:6.2f}%   all={np.round(probs_a*100, 2)}")
        print(f"  website  : {class_names[int(np.argmax(probs_b))]:5s} {probs_b.max()*100:6.2f}%   all={np.round(probs_b*100, 2)}")
        print(f"  bilinear : {class_names[int(np.argmax(probs_c))]:5s} {probs_c.max()*100:6.2f}%   (information only)")
        print(f"  max difference notebook vs website: {diff:.2e}  ->  {'PASS' if ok else 'FAIL'}")

    print("\nOVERALL:", "PASS - the website pipeline matches the notebook." if all_ok else "FAIL - see above.")
    return 0 if all_ok else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
