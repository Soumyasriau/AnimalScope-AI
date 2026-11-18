"""Unit tests for upload validation + preprocessing. Run from the backend folder:  python -m unittest discover -s tests -v"""
import io
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from image_utils import IMG_SIZE, ImageValidationError, load_and_validate_image, prepare_input, preprocess_image

MAX = 10 * 1024 * 1024


def make_bytes(fmt, size=(300, 200), mode="RGB", color=(10, 120, 240)):
    buf = io.BytesIO()
    Image.new(mode, size, color).save(buf, format=fmt)
    return buf.getvalue()


class PreprocessingTests(unittest.TestCase):
    def test_output_shape_and_dtype(self):
        out = prepare_input(make_bytes("JPEG"), MAX)
        self.assertEqual(out.shape, (1, 224, 224, 3))
        self.assertEqual(out.dtype, np.float32)

    def test_values_are_raw_0_255_not_scaled(self):
        # The saved model has Lambda(preprocess_input) inside it, so the API must NOT scale pixels.
        out = prepare_input(make_bytes("PNG", color=(255, 255, 255)), MAX)
        self.assertEqual(float(out.min()), 255.0)
        self.assertEqual(float(out.max()), 255.0)
        out = prepare_input(make_bytes("PNG", color=(0, 0, 0)), MAX)
        self.assertEqual(float(out.max()), 0.0)

    def test_channel_order_is_rgb(self):
        out = prepare_input(make_bytes("PNG", color=(255, 0, 0)), MAX)
        self.assertTrue(np.all(out[0, :, :, 0] == 255))
        self.assertTrue(np.all(out[0, :, :, 1] == 0))
        self.assertTrue(np.all(out[0, :, :, 2] == 0))

    def test_matches_keras_load_img_logic(self):
        # Keras load_img(target_size=(224,224)) = convert('RGB') then img.resize((224,224), NEAREST); img_to_array = float32.
        rng = np.random.default_rng(0)
        src = Image.fromarray(rng.integers(0, 256, (333, 517, 3), dtype=np.uint8))
        buf = io.BytesIO(); src.save(buf, format="PNG")
        expected = np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert("RGB").resize((224, 224), Image.NEAREST), dtype="float32")
        got = prepare_input(buf.getvalue(), MAX)[0]
        np.testing.assert_array_equal(got, expected)

    def test_rgba_png_becomes_rgb(self):
        out = prepare_input(make_bytes("PNG", mode="RGBA", color=(10, 20, 30, 255)), MAX)
        self.assertEqual(out.shape, (1, 224, 224, 3))

    def test_grayscale_becomes_three_channels(self):
        out = prepare_input(make_bytes("PNG", mode="L", color=128), MAX)
        self.assertEqual(out.shape, (1, 224, 224, 3))

    def test_palette_png(self):
        out = prepare_input(make_bytes("PNG", mode="P", color=3), MAX)
        self.assertEqual(out.shape, (1, 224, 224, 3))

    def test_img_size_constant(self):
        self.assertEqual(IMG_SIZE, (224, 224))


class ValidationTests(unittest.TestCase):
    def assertRejected(self, data, status):
        with self.assertRaises(ImageValidationError) as ctx:
            load_and_validate_image(data, MAX)
        self.assertEqual(ctx.exception.status_code, status)
        return ctx.exception.message

    def test_accepts_jpeg_and_png(self):
        load_and_validate_image(make_bytes("JPEG"), MAX)
        load_and_validate_image(make_bytes("PNG"), MAX)

    def test_rejects_gif_webp_bmp(self):
        for fmt in ("GIF", "BMP", "WEBP"):
            try:
                data = make_bytes(fmt)
            except Exception:
                self.skipTest(f"Pillow build lacks {fmt}")
            msg = self.assertRejected(data, 415)
            self.assertIn("JPG, JPEG or PNG", msg)

    def test_rejects_text_file(self):
        self.assertRejected(b"hello, I am not an image", 400)

    def test_rejects_empty(self):
        self.assertRejected(b"", 400)

    def test_rejects_truncated_jpeg(self):
        good = make_bytes("JPEG", size=(600, 600))
        self.assertRejected(good[: len(good) // 3], 400)

    def test_rejects_renamed_non_image(self):
        self.assertRejected(b"%PDF-1.4 fake pdf", 400)

    def test_rejects_too_large(self):
        data = make_bytes("PNG", size=(400, 400))
        with self.assertRaises(ImageValidationError) as ctx:
            load_and_validate_image(data, 100)
        self.assertEqual(ctx.exception.status_code, 413)


if __name__ == "__main__":
    unittest.main()
