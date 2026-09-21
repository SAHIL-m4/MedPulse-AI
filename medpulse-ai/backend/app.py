"""
MedPulse-AI: FastAPI REST & Streaming Server
Provides endpoints for patient telemetry, real-time risk predictions, model metrics, and frontend hosting.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(
    title="MedPulse-AI API Engine",
    description="Clinical telemetry analytics & financial risk forecasting backend for GIBC V2",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Load Models & Scalers
try:
    classifier = joblib.load(os.path.join(MODELS_DIR, "sepsis_classifier.joblib"))
    scaler_cls = joblib.load(os.path.join(MODELS_DIR, "scaler_classifier.joblib"))
    regressor = joblib.load(os.path.join(MODELS_DIR, "cost_regressor.joblib"))
    scaler_reg = joblib.load(os.path.join(MODELS_DIR, "scaler_regressor.joblib"))
    print("Models loaded successfully.")
except Exception as e:
    print(f"Warning: Models not loaded yet ({e}). Run train_models.py first.")
    classifier, scaler_cls, regressor, scaler_reg = None, None, None, None

class PatientTelemetryInput(BaseModel):
    age: int = 64
    heart_rate: float = 84.0
    sbp: float = 118.0
    dbp: float = 74.0
    spo2: float = 98.0
    temp_c: float = 37.1
    resp_rate: float = 18.0
    wbc: float = 7.8
    lactate: float = 1.4
    creatinine: float = 0.9

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MedPulse-AI Clinical Telemetry Core",
        "track": "GIBC V2 Track 02 Applied",
        "models_loaded": classifier is not None
    }

@app.get("/api/metrics")
def get_model_metrics():
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Metrics file not found")
    with open(metrics_path, "r") as f:
        return json.load(f)

@app.post("/api/predict")
def predict_decompensation_and_cost(data: PatientTelemetryInput):
    # Derived Clinical Features
    shock_index = data.heart_rate / max(data.sbp, 1.0)
    map_pressure = (2 * data.dbp + data.sbp) / 3.0
    
    mews = 0
    if data.heart_rate < 40 or data.heart_rate > 130: mews += 3
    elif data.heart_rate > 110 or data.heart_rate < 50: mews += 2
    
    if map_pressure < 65: mews += 3
    elif map_pressure < 75: mews += 1
    
    if data.resp_rate > 25: mews += 3
    elif data.resp_rate > 20: mews += 2
    
    if data.temp_c > 38.5 or data.temp_c < 35.5: mews += 2
    if data.wbc > 12.0: mews += 2
    if data.lactate > 4.0: mews += 3
    elif data.lactate > 2.0: mews += 1

    features_cls_df = pd.DataFrame([{
        "age": data.age, "heart_rate": data.heart_rate, "sbp": data.sbp, "dbp": data.dbp,
        "spo2": data.spo2, "temp_c": data.temp_c, "resp_rate": data.resp_rate, "wbc": data.wbc,
        "lactate": data.lactate, "creatinine": data.creatinine, "shock_index": shock_index,
        "map_pressure": map_pressure, "mews": mews
    }])

    if classifier and scaler_cls:
        scaled_c = scaler_cls.transform(features_cls_df)
        risk_prob = float(classifier.predict_proba(scaled_c)[0, 1])
        high_risk_flag = int(risk_prob >= 0.45)
    else:
        # Fallback calculation
        risk_prob = min(max(0.1 + 0.3 * (shock_index > 0.8) + 0.3 * (data.lactate > 3.0), 0.05), 0.98)
        high_risk_flag = int(risk_prob > 0.45)

    features_reg_df = pd.DataFrame([{
        "age": data.age, "heart_rate": data.heart_rate, "spo2": data.spo2, "lactate": data.lactate,
        "wbc": data.wbc, "shock_index": shock_index, "mews": mews, "high_risk_flag": high_risk_flag
    }])

    if regressor and scaler_reg:
        scaled_r = scaler_reg.transform(features_reg_df)
        predicted_cost = float(regressor.predict(scaled_r)[0])

    else:
        predicted_cost = float(12000 + 25000 * high_risk_flag + 800 * mews)

    predicted_los = round(predicted_cost / 3400.0, 1)

    return {
        "patient_metrics": {
            "shock_index": round(shock_index, 3),
            "map_pressure": round(map_pressure, 1),
            "mews_score": mews
        },
        "decompensation_prediction": {
            "sepsis_risk_probability": round(risk_prob, 4),
            "sepsis_risk_percent": round(risk_prob * 100, 1),
            "risk_tier": "CRITICAL" if risk_prob > 0.55 else ("MODERATE" if risk_prob > 0.3 else "LOW"),
            "high_risk_flag": high_risk_flag
        },
        "financial_forecasting": {
            "predicted_los_days": predicted_los,
            "predicted_total_cost_usd": round(predicted_cost, 2),
            "daily_icu_rate": 3400,
            "estimated_savings_early_intervention": round(1.8 * 3400, 2)
        }
    }

# Mount static frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
