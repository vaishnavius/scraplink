import os
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
from train_model import train_and_save_model, BASE_DIR, MODEL_PATH

# === Setup ===
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

PORT = int(os.getenv("PORT", "5000"))


# === Safe model loader ===
def safe_load_model():
    if not Path(MODEL_PATH).exists():
        train_and_save_model()

    try:
        return joblib.load(MODEL_PATH)
    except Exception:
        if Path(MODEL_PATH).exists():
            Path(MODEL_PATH).unlink(missing_ok=True)
        train_and_save_model()
        return joblib.load(MODEL_PATH)


model = safe_load_model()


# === Health check ===
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# === Prediction endpoint ===
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True) or {}

    scrap_type = str(data.get("scrap_type", "")).strip().lower().replace(" ", "-")
    sub_category = str(data.get("sub_category", "")).strip()
    leaf = str(data.get("sub_sub_category", "")).strip()
    weight = float(data.get("weight", 0))

    if not scrap_type or not sub_category or weight <= 0:
        return (
            jsonify(
                {"error": "scrap_type, sub_category and positive weight are required"}
            ),
            400,
        )

    # Figure out what columns the model expects
    try:
        expected_cols = getattr(model, "feature_names_in_", [])
    except Exception:
        expected_cols = []

    if len(expected_cols) == 2:
        # trained only on 2 columns
        X = pd.DataFrame(
            [{"scrap_type": scrap_type, "sub_category": leaf or sub_category}]
        )
    else:
        X = pd.DataFrame(
            [
                {
                    "scrap_type": scrap_type,
                    "sub_category": sub_category or "N/A",
                    "sub_sub_category": leaf or sub_category,
                }
            ]
        )

    try:
        price_per_kg = float(model.predict(X)[0])
    except Exception as e:
        return jsonify({"error": f"Model prediction failed: {str(e)}"}), 500

    return (
        jsonify(
            {
                "base_price": round(price_per_kg, 2),
                "predicted_price": round(price_per_kg * weight, 2),
                "weight": weight,
            }
        ),
        200,
    )


# === Retrain endpoint ===
@app.route("/retrain", methods=["POST"])
def retrain():
    train_and_save_model()
    global model
    model = joblib.load(MODEL_PATH)
    return jsonify({"status": "retrained"}), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, debug=True, use_reloader=False)
