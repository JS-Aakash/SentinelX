import os
import time
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from xgboost import XGBRegressor
from sklearn.ensemble import IsolationForest

DEFAULT_TARGET_SENSORS = ["Temperature", "Vibration", "Current", "Voltage", "RPM", "Sound"]

def extract_time_aware_features(df: pd.DataFrame, target_sensors: List[str] = None) -> Tuple[pd.DataFrame, List[str]]:
    """
    Generate dynamic time-aware sequence features per sensor:
    - Lag features (t-1, t-2, t-5)
    - Rolling window statistics (rolling mean 5/15, rolling std 5)
    - Rate-of-change derivatives (diff1, diff5)
    """
    df_out = df.copy()

    # Identify non-sensor metadata columns
    meta_cols = ["Timestamp", "timestamp", "sequence_id", "dataset_id", "source_dataset", "delta_t_hours", "time_since_last_observation_hours", "elapsed_days", "operating_hours", "machine_age_days"]
    
    if not target_sensors:
        target_sensors = [c for c in df_out.columns if c not in meta_cols and not c.endswith(("_Lag1", "_Lag2", "_Lag3", "_EMA", "_historical_baseline", "_cumulative_drift", "_growth_rate_per_day", "_RollMean_5", "_RollStd_5", "_RoC", "_long_term_slope", "_recent_slope", "_LimitDist"))]
        if not target_sensors:
            target_sensors = DEFAULT_TARGET_SENSORS

    group_col = None
    for col in ["sequence_id", "dataset_id", "source_dataset"]:
        if col in df_out.columns:
            group_col = col
            break

    for sensor in target_sensors:
        col_name = sensor if sensor in df_out.columns else next((c for c in df_out.columns if c.lower() == sensor.lower()), None)
        if not col_name:
            continue

        if group_col:
            grouped = df_out.groupby(group_col)[col_name]
            df_out[f"{sensor}_lag1"] = grouped.shift(1)
            df_out[f"{sensor}_lag2"] = grouped.shift(2)
            df_out[f"{sensor}_lag5"] = grouped.shift(5)
            df_out[f"{sensor}_rolling_mean_5"] = grouped.transform(lambda s: s.rolling(5, min_periods=1).mean())
            df_out[f"{sensor}_rolling_mean_15"] = grouped.transform(lambda s: s.rolling(15, min_periods=1).mean())
            df_out[f"{sensor}_rolling_std_5"] = grouped.transform(lambda s: s.rolling(5, min_periods=1).std()).fillna(0)
            df_out[f"{sensor}_diff1"] = grouped.diff(1).fillna(0)
            df_out[f"{sensor}_diff5"] = grouped.diff(5).fillna(0)
        else:
            s_series = df_out[col_name]
            df_out[f"{sensor}_lag1"] = s_series.shift(1)
            df_out[f"{sensor}_lag2"] = s_series.shift(2)
            df_out[f"{sensor}_lag5"] = s_series.shift(5)
            df_out[f"{sensor}_rolling_mean_5"] = s_series.rolling(5, min_periods=1).mean()
            df_out[f"{sensor}_rolling_mean_15"] = s_series.rolling(15, min_periods=1).mean()
            df_out[f"{sensor}_rolling_std_5"] = s_series.rolling(5, min_periods=1).std().fillna(0)
            df_out[f"{sensor}_diff1"] = s_series.diff(1).fillna(0)
            df_out[f"{sensor}_diff5"] = s_series.diff(5).fillna(0)

    df_out = df_out.bfill().ffill().fillna(0)
    return df_out, target_sensors

def train_machine_models(
    machine_id: str,
    dataset_path: str,
    model_version: int,
    output_dir: str,
    operating_limits: Dict[str, float] = None,
    custom_target_sensors: List[str] = None
) -> Dict[str, Any]:
    """
    Train 1 independent XGBoost Regressor per configured sensor target
    and 1 Isolation Forest model for anomaly detection.
    """
    start_time = time.time()
    
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Engineered dataset file not found: {dataset_path}")
        
    df_raw = pd.read_csv(dataset_path)
    if df_raw.empty:
        raise ValueError("Engineered dataset file is empty")

    # Extract time-aware sequential features dynamically
    df, target_sensors = extract_time_aware_features(df_raw, custom_target_sensors)
        
    non_feature_cols = ["Timestamp", "timestamp", "sequence_id", "dataset_id", "source_dataset"]
    feature_cols = [c for c in df.columns if c not in non_feature_cols]
    
    if len(feature_cols) == 0:
        raise ValueError("No numeric feature columns found in dataset")
        
    X = df[feature_cols].copy().ffill().bfill().fillna(0)
    
    # Target creation: 1-step-ahead shift for each dynamic sensor
    targets: Dict[str, pd.Series] = {}
    for sensor in target_sensors:
        col = sensor if sensor in df.columns else next((c for c in df.columns if c.lower() == sensor.lower()), None)
        if col:
            targets[sensor] = df[col].shift(-1)
        else:
            continue

    # Drop last row because shift(-1) creates a NaN target at the end
    X_train = X.iloc[:-1].copy()
    
    # Create output model directory
    model_save_dir = os.path.join(output_dir, machine_id, f"v{model_version}")
    os.makedirs(model_save_dir, exist_ok=True)
    
    models_created = []
    
    # 1. Train 1 Independent XGBoost Regressor Model per Configured Sensor
    for sensor in target_sensors:
        if sensor not in targets or len(targets[sensor].dropna()) == 0:
            continue
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

    for sensor in target_sensors:
        col = sensor if sensor in df.columns else next((c for c in df.columns if c.lower() == sensor.lower()), None)
        if col:
            s_vals = df[col].dropna()
            mean_val = round(float(s_vals.mean()), 2)
            std_val = round(float(s_vals.std()), 3)

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
        "target_sensors": target_sensors,
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
