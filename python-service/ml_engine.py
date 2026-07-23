import os
import time
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from xgboost import XGBRegressor
from sklearn.ensemble import IsolationForest

TARGET_SENSORS = ["Temperature", "Vibration", "Current", "Voltage", "RPM", "Sound"]

def train_machine_models(
    machine_id: str,
    dataset_path: str,
    model_version: int,
    output_dir: str,
    operating_limits: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Train 6 independent XGBoost Regressors (one per sensor target) 
    and 1 Isolation Forest model for anomaly detection.
    
    Each XGBoost regressor predicts ONLY its target sensor at [t+1], 
    using the COMPLETE engineered feature set as input.
    """
    start_time = time.time()
    
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Engineered dataset file not found: {dataset_path}")
        
    df = pd.read_csv(dataset_path)
    if df.empty:
        raise ValueError("Engineered dataset file is empty")
        
    # Drop timestamp from input features
    feature_cols = [c for c in df.columns if c not in ["Timestamp", "timestamp"]]
    
    if len(feature_cols) == 0:
        raise ValueError("No numeric feature columns found in dataset")
        
    X = df[feature_cols].copy()
    
    # Fill any remaining NaNs with forward fill or 0
    X = X.ffill().bfill().fillna(0)
    
    # Target creation: 1-step-ahead shift for each sensor
    targets: Dict[str, pd.Series] = {}
    for sensor in TARGET_SENSORS:
        if sensor in df.columns:
            targets[sensor] = df[sensor].shift(-1)
        else:
            # Fallback if case mismatch
            matching_col = next((c for c in df.columns if c.lower() == sensor.lower()), None)
            if matching_col:
                targets[sensor] = df[matching_col].shift(-1)
            else:
                raise ValueError(f"Required target sensor column '{sensor}' missing from dataset")

    # Drop last row because shift(-1) creates a NaN target at the end
    X_train = X.iloc[:-1].copy()
    
    # Create output model directory
    model_save_dir = os.path.join(output_dir, machine_id, f"v{model_version}")
    os.makedirs(model_save_dir, exist_ok=True)
    
    models_created = []
    
    # 1. Train 6 Independent XGBoost Regressor Models
    for sensor in TARGET_SENSORS:
        y_train = targets[sensor].iloc[:-1]
        
        xgb_model = XGBRegressor(
            n_estimators=100,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        
        xgb_model.fit(X_train, y_train)
        
        # Save XGBoost model to JSON / joblib
        model_filename = f"xgb_{sensor.lower()}.json"
        model_filepath = os.path.join(model_save_dir, model_filename)
        xgb_model.save_model(model_filepath)
        
        models_created.append(f"XGBRegressor ({sensor}) -> {model_filename}")
        
    # 2. Train 1 Isolation Forest Model for Anomaly Detection
    iso_model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )
    iso_model.fit(X)
    
    iso_filename = "isolation_forest.joblib"
    iso_filepath = os.path.join(model_save_dir, iso_filename)
    joblib.dump(iso_model, iso_filepath)
    
    models_created.append(f"IsolationForest (Anomaly Detection) -> {iso_filename}")
    
    # 3. Calculate Machine Baseline Statistics & Historical Degradation Slopes
    sensor_baselines: Dict[str, Dict[str, float]] = {}
    historical_degradation_slopes: Dict[str, float] = {}

    total_rows = len(df)
    total_hours = float(df["operating_hours"].iloc[-1] - df["operating_hours"].iloc[0]) if "operating_hours" in df.columns and len(df) > 1 else max(1.0, total_rows * (5.0 / 3600.0))

    for sensor in TARGET_SENSORS:
        col = sensor if sensor in df.columns else next((c for c in df.columns if c.lower() == sensor.lower()), None)
        if col:
            s_vals = df[col].dropna()
            mean_val = round(float(s_vals.mean()), 2)
            std_val = round(float(s_vals.std()), 3)

            # Linear degradation slope over total operating hours
            if len(s_vals) > 10 and total_hours > 0:
                first_window_mean = float(s_vals.iloc[:max(5, int(len(s_vals) * 0.1))].mean())
                last_window_mean = float(s_vals.iloc[-max(5, int(len(s_vals) * 0.1)):].mean())
                deg_slope_per_hour = round((last_window_mean - first_window_mean) / max(1.0, total_hours), 5)
            else:
                deg_slope_per_hour = 0.0

            sensor_baselines[sensor] = {
                "expected": mean_val,
                "std": std_val,
                "q05": round(float(s_vals.quantile(0.05)), 2),
                "q95": round(float(s_vals.quantile(0.95)), 2),
                "min": round(float(s_vals.min()), 2),
                "max": round(float(s_vals.max()), 2),
                "degradation_slope_per_hour": deg_slope_per_hour,
            }
            historical_degradation_slopes[sensor] = deg_slope_per_hour

    # 4. Save Feature Names & Machine Baseline Metadata
    metadata = {
        "machine_id": machine_id,
        "model_version": model_version,
        "feature_cols": feature_cols,
        "target_sensors": TARGET_SENSORS,
        "sensor_baselines": sensor_baselines,
        "historical_degradation_slopes": historical_degradation_slopes,
        "total_operating_hours": round(total_hours, 2),
        "total_rows_trained": len(X_train),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    metadata_filepath = os.path.join(model_save_dir, "metadata.json")
    with open(metadata_filepath, "w") as f:
        json.dump(metadata, f, indent=2)
        
    elapsed_time = round(time.time() - start_time, 2)
    
    return {
        "success": True,
        "machine_id": machine_id,
        "model_version": model_version,
        "model_dir": model_save_dir,
        "feature_count": len(feature_cols),
        "total_rows_trained": len(X_train),
        "elapsed_time_seconds": elapsed_time,
        "models_created": models_created,
        "feature_cols": feature_cols,
        "target_sensors": TARGET_SENSORS,
        "sensor_baselines": sensor_baselines,
        "historical_degradation_slopes": historical_degradation_slopes,
    }
