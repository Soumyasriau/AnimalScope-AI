"""
Static checks of the delivered model + class names. They read the .keras archive directly
(zip + JSON), so they do NOT need TensorFlow. They do NOT run the model.
Run from the backend folder:  python -m unittest discover -s tests -v
"""
import json
import unittest
import zipfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
MODEL = BACKEND / "animal_classifier.keras"
CLASSES = BACKEND / "class_names.json"
EXPECTED_CLASSES = ["Cat", "bird", "dog"]  # exact order from the Colab notebook


def walk_layers(cfg):
    for layer in cfg["config"]["layers"]:
        yield layer
        inner = layer.get("config", {})
        if isinstance(inner, dict) and "layers" in inner:
            yield from walk_layers(layer)


class ModelFileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.zf = zipfile.ZipFile(MODEL)
        cls.cfg = json.loads(cls.zf.read("config.json"))

    def test_files_exist(self):
        self.assertTrue(MODEL.is_file())
        self.assertTrue(CLASSES.is_file())

    def test_class_order_exact(self):
        self.assertEqual(json.loads(CLASSES.read_text(encoding="utf-8")), EXPECTED_CLASSES)

    def test_keras_archive_is_valid(self):
        self.assertIsNone(self.zf.testzip())
        self.assertEqual({"metadata.json", "config.json", "model.weights.h5"}, set(self.zf.namelist()))

    def test_weights_file_is_hdf5(self):
        with self.zf.open("model.weights.h5") as f:
            self.assertEqual(f.read(8), b"\x89HDF\r\n\x1a\n")

    def test_input_shape_224(self):
        first = self.cfg["config"]["layers"][0]
        self.assertEqual(first["class_name"], "InputLayer")
        self.assertEqual(first["config"]["batch_shape"], [None, 224, 224, 3])

    def test_preprocessing_is_inside_model(self):
        lambdas = [l for l in self.cfg["config"]["layers"] if l["class_name"] == "Lambda"]
        self.assertEqual(len(lambdas), 1)
        self.assertEqual(lambdas[0]["config"]["function"]["config"], "preprocess_input")

    def test_no_rescaling_layer_elsewhere(self):
        names = [l["class_name"] for l in self.cfg["config"]["layers"]]
        self.assertNotIn("Rescaling", names)

    def test_output_layer_matches_class_count(self):
        last = self.cfg["config"]["layers"][-1]
        self.assertEqual(last["class_name"], "Dense")
        self.assertEqual(last["config"]["units"], len(EXPECTED_CLASSES))
        self.assertEqual(last["config"]["activation"], "softmax")

    def test_backbone_is_mobilenetv2(self):
        names = [l["config"].get("name", "") for l in self.cfg["config"]["layers"]]
        self.assertTrue(any(n.startswith("mobilenetv2") for n in names))


if __name__ == "__main__":
    unittest.main()
