import os
import joblib
import pandas as pd
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# === Paths & environment ===
BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "scrap_rf_model.pkl"


# === Load dataset from Supabase ===
def fetch_dataset() -> pd.DataFrame:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
            "Set them in backend_ml/.env."
        )

    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Adjust table name & columns to match your Supabase dataset exactly
    resp = client.table("scrap_prices").select(
        "scrap_type,sub_category,sub_sub_category,base_price"
    ).execute()

    rows = resp.data or []
    if not rows:
        raise RuntimeError("No rows returned from table 'scrap_prices'.")

    df = pd.DataFrame(rows)

    # Clean up columns
    for c in ["scrap_type", "sub_category", "sub_sub_category"]:
        df[c] = df[c].astype(str).str.strip()
    df["scrap_type"] = df["scrap_type"].str.lower().str.replace(" ", "-", regex=False)
    df["base_price"] = pd.to_numeric(df["base_price"], errors="coerce")
    df = df.dropna(
        subset=["scrap_type", "sub_category", "sub_sub_category", "base_price"]
    ).copy()

    print(f"✅ Dataset loaded: {len(df)} rows")
    return df


# === Train & save Random Forest ===
def train_and_save_model():
    print("📦 Fetching dataset from Supabase...")
    df = fetch_dataset()

    X = df[["scrap_type", "sub_category", "sub_sub_category"]]
    y = df["base_price"]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                ["scrap_type", "sub_category", "sub_sub_category"],
            )
        ]
    )

    model = Pipeline(
        [
            ("pre", preprocessor),
            (
                "rf",
                RandomForestRegressor(
                    n_estimators=300, random_state=42, n_jobs=-1
                ),
            ),
        ]
    )

    print("🎯 Training Random Forest model...")
    model.fit(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = MODEL_PATH.with_suffix(".tmp")
    joblib.dump(model, tmp_path)
    tmp_path.replace(MODEL_PATH)
    print(f"💾 Model saved at {MODEL_PATH}")


if __name__ == "__main__":
    train_and_save_model()
