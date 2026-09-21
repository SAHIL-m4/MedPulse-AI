"""
MedPulse-AI: Data Pipeline & Feature Engineering Engine
Processes de-identified ICU patient telemetry (vitals, labs) and hospital resource metrics.
Calculates clinical risk indices: Shock Index, MAP, MEWS, and Financial Risk Factors.
"""

import numpy as np
import pandas as pd

def generate_empirical_datasets(n_samples: int = 1500, random_state: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generates realistic, de-identified ICU patient clinical telemetry and hospital billing datasets
    based on empirical distribution ranges from MIMIC-III / PhysioNet standards.
    """
    np.random.seed(random_state)
    
    patient_ids = [f"PAT-{1000 + i}" for i in range(n_samples)]
    age = np.random.normal(62, 14, n_samples).clip(18, 92).astype(int)
    gender = np.random.choice(["M", "F"], n_samples, p=[0.54, 0.46])
    
    # Vital Signs Telemetry
    heart_rate = np.random.normal(84, 18, n_samples).clip(45, 170)
    sbp = np.random.normal(118, 22, n_samples).clip(70, 200) # Systolic BP
    dbp = np.random.normal(74, 14, n_samples).clip(40, 120)  # Diastolic BP
    spo2 = np.random.normal(96.5, 3.5, n_samples).clip(75, 100) # Oxygen Saturation
    temp_c = np.random.normal(37.1, 0.9, n_samples).clip(35.0, 40.5) # Temperature
    resp_rate = np.random.normal(18, 5, n_samples).clip(8, 42) # Respiratory Rate
    
    # Laboratory Biomarkers (De-identified empirical bounds)
    wbc = np.random.lognormal(2.2, 0.4, n_samples).clip(2.5, 38.0) # White Blood Cell count (k/uL)
    lactate = np.random.lognormal(0.6, 0.5, n_samples).clip(0.5, 14.0) # Blood Lactate (mmol/L)
    creatinine = np.random.lognormal(0.1, 0.4, n_samples).clip(0.4, 8.5) # Serum Creatinine (mg/dL)
    
    # Derived Clinical Risk Indices
    # Shock Index = Heart Rate / Systolic BP (Normal: 0.5 - 0.7, >0.9 indicates hemodynamic instability)
    shock_index = heart_rate / np.maximum(sbp, 1.0)
    
    # Mean Arterial Pressure (MAP) = (2 * DBP + SBP) / 3 (Normal: 70 - 100 mmHg, <65 indicates hypoperfusion)
    map_pressure = (2 * dbp + sbp) / 3.0
    
    # Modified Early Warning Score (MEWS approximation)
    mews = np.zeros(n_samples, dtype=int)
    mews += np.where((heart_rate < 40) | (heart_rate > 130), 3, np.where((heart_rate > 110) | (heart_rate < 50), 2, 0))
    mews += np.where(map_pressure < 65, 3, np.where(map_pressure < 75, 1, 0))
    mews += np.where(resp_rate > 25, 3, np.where(resp_rate > 20, 2, 0))
    mews += np.where(temp_c > 38.5, 2, np.where(temp_c < 35.5, 2, 0))
    mews += np.where(wbc > 12.0, 2, 0)
    mews += np.where(lactate > 4.0, 3, np.where(lactate > 2.0, 1, 0))
    
    # Decompensation / Sepsis Risk Target Label (Empirical clinical rule + stochastic noise)
    sepsis_risk_score = (
        0.25 * (shock_index > 0.85) +
        0.30 * (map_pressure < 65) +
        0.20 * (lactate > 2.5) +
        0.15 * (wbc > 14.0) +
        0.10 * (mews >= 5) +
        np.random.normal(0, 0.05, n_samples)
    )
    sepsis_target = (sepsis_risk_score > 0.42).astype(int)
    
    # Clinical Telemetry DataFrame
    df_telemetry = pd.DataFrame({
        "patient_id": patient_ids,
        "age": age,
        "gender": gender,
        "heart_rate": np.round(heart_rate, 1),
        "sbp": np.round(sbp, 1),
        "dbp": np.round(dbp, 1),
        "spo2": np.round(spo2, 1),
        "temp_c": np.round(temp_c, 2),
        "resp_rate": np.round(resp_rate, 1),
        "wbc": np.round(wbc, 2),
        "lactate": np.round(lactate, 2),
        "creatinine": np.round(creatinine, 2),
        "shock_index": np.round(shock_index, 3),
        "map_pressure": np.round(map_pressure, 1),
        "mews": mews,
        "high_risk_flag": sepsis_target
    })
    
    # Hospital Financial & Resource Telemetry DataFrame
    daily_icu_rate = 3400 # Base ICU cost per day ($)
    predicted_los_days = (
        2.5 + 
        4.0 * sepsis_target + 
        0.8 * (mews / 2.0) + 
        0.5 * (lactate / 2.0) + 
        np.random.normal(0, 1.2, n_samples)
    ).clip(1.0, 25.0)
    
    total_cost = np.round(predicted_los_days * daily_icu_rate * (1 + 0.15 * (sepsis_target)), 2)
    readmission_risk = np.round((0.08 + 0.35 * sepsis_target + 0.02 * (age / 20.0)).clip(0.02, 0.85), 3)
    
    df_finance = pd.DataFrame({
        "patient_id": patient_ids,
        "icu_unit": np.random.choice(["ICU-Alpha", "ICU-Bravo", "CCU-Main", "Neuro-ICU"], n_samples),
        "insurance_class": np.random.choice(["Medicare", "Private-PPO", "Medicaid", "HMO-Primary"], n_samples, p=[0.4, 0.35, 0.15, 0.10]),
        "los_days": np.round(predicted_los_days, 1),
        "total_cost_usd": total_cost,
        "readmission_risk_30d": readmission_risk,
        "resource_tier": np.where(total_cost > 35000, "High Utilization", np.where(total_cost > 18000, "Moderate Utilization", "Standard"))
    })
    
    return df_telemetry, df_finance

if __name__ == "__main__":
    df_tel, df_fin = generate_empirical_datasets(100)
    print("Telemetry Sample:")
    print(df_tel.head(3))
    print("\nFinance Sample:")
    print(df_fin.head(3))
