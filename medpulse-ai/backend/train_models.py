"""
MedPulse-AI: Model Training & Evaluation Engine
Trains clinical decompensation classifier and hospital cost forecasting regressor.
Evaluates metrics (ROC-AUC, Precision, Recall, F1, R2, RMSE) and exports serialized artifacts.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    r2_score, mean_squared_error, confusion_matrix, roc_curve
)
from pipeline import generate_empirical_datasets

def train_and_export_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    models_dir = os.path.join(base_dir, "models")
    
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    
    print("Generating empirical patient telemetry & financial datasets...")
    df_tel, df_fin = generate_empirical_datasets(n_samples=2500, random_state=42)
    
    # Save CSVs for empirical verification
    df_tel.to_csv(os.path.join(data_dir, "patient_telemetry.csv"), index=False)
    df_fin.to_csv(os.path.join(data_dir, "hospital_finance.csv"), index=False)
    print(f"Exported empirical datasets to {data_dir}")
    
    # --- MODEL 1: Clinical Sepsis & Decompensation Risk Classifier ---
    features_classification = [
        "age", "heart_rate", "sbp", "dbp", "spo2", "temp_c",
        "resp_rate", "wbc", "lactate", "creatinine", "shock_index", "map_pressure", "mews"
    ]
    X_cls = df_tel[features_classification]
    y_cls = df_tel["high_risk_flag"]
    
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_cls, y_cls, test_size=0.25, random_state=42, stratify=y_cls)
    
    scaler_cls = StandardScaler()
    X_train_c_scaled = scaler_cls.fit_transform(X_train_c)
    X_test_c_scaled = scaler_cls.transform(X_test_c)
    
    clf = RandomForestClassifier(n_estimators=120, max_depth=8, random_state=42)
    clf.fit(X_train_c_scaled, y_train_c)
    
    y_pred_probs = clf.predict_proba(X_test_c_scaled)[:, 1]
    y_pred_c = (y_pred_probs >= 0.45).astype(int)
    
    roc_auc = roc_auc_score(y_test_c, y_pred_probs)
    precision = precision_score(y_test_c, y_pred_c)
    recall = recall_score(y_test_c, y_pred_c)
    f1 = f1_score(y_test_c, y_pred_c)
    cm = confusion_matrix(y_test_c, y_pred_c).tolist()
    
    fpr, tpr, thresholds = roc_curve(y_test_c, y_pred_probs)
    # Downsample ROC points for visualization JSON
    roc_points = [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)} for f, t in zip(fpr[::5], tpr[::5])]
    
    feat_importances_cls = dict(zip(features_classification, [round(float(v), 4) for v in clf.feature_importances_]))
    
    print(f"\n[Model 1: Sepsis Classifier Results]")
    print(f"ROC-AUC: {roc_auc:.4f} | Precision: {precision:.4f} | Recall: {recall:.4f} | F1-Score: {f1:.4f}")
    
    # --- MODEL 2: ICU Stay & Cost Forecast Regressor ---
    df_merged = pd.merge(df_tel, df_fin, on="patient_id")
    features_reg = [
        "age", "heart_rate", "spo2", "lactate", "wbc", "shock_index", "mews", "high_risk_flag"
    ]
    X_reg = df_merged[features_reg]
    y_reg = df_merged["total_cost_usd"]
    
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_reg, y_reg, test_size=0.25, random_state=42)
    
    scaler_reg = StandardScaler()
    X_train_r_scaled = scaler_reg.fit_transform(X_train_r)
    X_test_r_scaled = scaler_reg.transform(X_test_r)
    
    reg = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42)
    reg.fit(X_train_r_scaled, y_train_r)
    
    y_pred_r = reg.predict(X_test_r_scaled)
    r2 = r2_score(y_test_r, y_pred_r)
    rmse = np.sqrt(mean_squared_error(y_test_r, y_pred_r))
    
    print(f"\n[Model 2: Cost Predictor Results]")
    print(f"R² Score: {r2:.4f} | RMSE: ${rmse:.2f}")
    
    # Save Models & Scalers
    joblib.dump(clf, os.path.join(models_dir, "sepsis_classifier.joblib"))
    joblib.dump(scaler_cls, os.path.join(models_dir, "scaler_classifier.joblib"))
    joblib.dump(reg, os.path.join(models_dir, "cost_regressor.joblib"))
    joblib.dump(scaler_reg, os.path.join(models_dir, "scaler_regressor.joblib"))
    
    metrics = {
        "classifier": {
            "roc_auc": round(float(roc_auc), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
            "confusion_matrix": cm,
            "feature_importance": feat_importances_cls,
            "roc_curve": roc_points
        },
        "regressor": {
            "r2": round(float(r2), 4),
            "rmse": round(float(rmse), 2),
            "avg_cost_predicted": round(float(np.mean(y_pred_r)), 2)
        }
    }
    
    with open(os.path.join(models_dir, "model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"\nSuccessfully trained models and saved artifacts to {models_dir}")

if __name__ == "__main__":
    train_and_export_models()
