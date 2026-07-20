import os
import time
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from xgboost import XGBRegressor
from sklearn.ensemble import IsolationForest

TARGET_SENSORS = ["Temperature", "Vibration", "Current", "Voltage", "RPM", "Sound"]

# In-Memory Model Cache
# Key: f"{machine_id}_v{version}" -> Dict of loaded models
MODEL_CACHE: Dict[str, Dict[str, Any]] = {}

def clear_model_cache(machine_id: Optional[str] = None):
    """Clear model cache for a specific machine or all machines."""
    global MODEL_CACHE
    if machine_id:
        keys_to_del = [k for k in MODEL_CACHE.keys() if k.startswith(machine_id)]
        for k in keys_to_del:
            del MODEL_CACHE[k]
    else:
        MODEL_CACHE.clear()

def load_or_get_cached_models(machine_id: str, version: int, model_dir: str) -> Dict[str, Any]:
    """Load trained model artifacts into memory cache if not already cached."""
    cache_key = f"{machine_id}_v{version}"
    if cache_key in MODEL_CACHE:
        return MODEL_CACHE[cache_key]

    version_dir = os.path.join(model_dir, machine_id, f"v{version}")
    if not os.path.exists(version_dir):
        # Fallback to check relative path
        version_dir = os.path.join("models", machine_id, f"v{version}")
        if not os.path.exists(version_dir):
            raise FileNotFoundError(f"Model directory for machine {machine_id} v{version} not found at {version_dir}")

    # Load metadata
    meta_path = os.path.join(version_dir, "metadata.json")
    feature_cols = []
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
            feature_cols = meta.get("feature_cols", [])

    # Load 6 XGBoost Models
    xgb_models: Dict[str, XGBRegressor] = {}
    for sensor in TARGET_SENSORS:
        fname = f"xgb_{sensor.lower()}.json"
        fpath = os.path.join(version_dir, fname)
        if os.path.exists(fpath):
            model = XGBRegressor()
            model.load_model(fpath)
            xgb_models[sensor] = model
        else:
            raise FileNotFoundError(f"Missing required XGBoost model file for sensor {sensor}: {fname}")

    # Load Isolation Forest
    iso_path = os.path.join(version_dir, "isolation_forest.joblib")
    iso_model = None
    if os.path.exists(iso_path):
        iso_model = joblib.load(iso_path)

    cache_entry = {
        "machine_id": machine_id,
        "version": version,
        "feature_cols": feature_cols,
        "xgb_models": xgb_models,
        "iso_model": iso_model,
        "loaded_at": time.time()
    }
    
    MODEL_CACHE[cache_key] = cache_entry
    return cache_entry

def run_live_inference_and_forecast(
    machine_id: str,
    version: int,
    model_dir: str,
    feature_vector: Dict[str, float],
    current_reading: Dict[str, float],
    operating_limits: Dict[str, float],
    horizon: int = 100,
    sampling_interval_seconds: float = 5.0
) -> Dict[str, Any]:
    """
    Execute 1-step live prediction, 100-step recursive forecasting, 
    RSOT calculation, and Isolation Forest anomaly scoring.
    """
    t0 = time.time()
    
    # 1. Load cached models
    cached = load_or_get_cached_models(machine_id, version, model_dir)
    xgb_models: Dict[str, XGBRegressor] = cached["xgb_models"]
    iso_model: Optional[IsolationForest] = cached["iso_model"]
    feature_cols: List[str] = cached["feature_cols"]

    # 2. Align feature vector to exact feature_cols order
    if not feature_cols:
        feature_cols = [k for k in feature_vector.keys() if k not in ["Timestamp", "timestamp"]]

    x_input = [float(feature_vector.get(c, 0.0)) for c in feature_cols]
    df_curr = pd.DataFrame([x_input], columns=feature_cols)

    # 3. Predict Next Step (t+1) for all 6 target sensors
    t1_predictions: Dict[str, float] = {}
    for sensor in TARGET_SENSORS:
        model = xgb_models[sensor]
        pred_val = float(model.predict(df_curr)[0])
        t1_predictions[sensor] = round(pred_val, 3)

    t_inf = time.time()
    inference_latency_ms = round((t_inf - t0) * 1000, 2)

    # 4. Anomaly Detection via Isolation Forest
    is_anomaly = False
    anomaly_score = 0.0
    if iso_model:
        try:
            iso_pred = iso_model.predict(df_curr)[0] # 1 = normal, -1 = anomaly
            is_anomaly = (iso_pred == -1)
            # decision_function: positive = normal, negative = anomaly
            dec_score = float(iso_model.decision_function(df_curr)[0])
            # Convert to 0..1 scale (lower = more anomalous)
            anomaly_score = round(max(0.0, min(1.0, 0.5 - dec_score)), 3)
        except Exception:
            pass

    # 5. Extract Operating Limits
    max_temp = float(operating_limits.get("maxTemperature", 80.0))
    max_vib = float(operating_limits.get("maxVibration", 2.5))
    max_cur = float(operating_limits.get("maxCurrent", 15.0))
    min_rpm = float(operating_limits.get("minRPM", 1000.0))

    # 6. Recursive 100-Step Forecasting & RSOT Calculation
    forecast_trajectory: List[Dict[str, Any]] = []
    
    # State tracker for recursive features
    state = {k: float(v) for k, v in current_reading.items()}
    recent_history: Dict[str, List[float]] = {
        s: [state.get(s, 0.0)] for s in TARGET_SENSORS
    }

    breach_step: Optional[int] = None
    violating_sensor: Optional[str] = None
    breach_value: Optional[float] = None
    breach_limit: Optional[float] = None

    for step in range(1, horizon + 1):
        # Build step feature dictionary
        step_row: Dict[str, float] = {}
        
        # Base metrics & Lags
        for s in TARGET_SENSORS:
            curr_v = recent_history[s][-1]
            prev_v1 = recent_history[s][-2] if len(recent_history[s]) >= 2 else curr_v
            prev_v2 = recent_history[s][-3] if len(recent_history[s]) >= 3 else prev_v1
            prev_v3 = recent_history[s][-4] if len(recent_history[s]) >= 4 else prev_v2

            step_row[s] = curr_v
            step_row[f"{s}_Lag1"] = prev_v1
            step_row[f"{s}_Lag2"] = prev_v2
            step_row[f"{s}_Lag3"] = prev_v3
            step_row[f"{s}_RoC"] = round(curr_v - prev_v1, 3)

            # Rolling stats (windows 5, 10, 30)
            for w in [5, 10, 30]:
                window_vals = recent_history[s][-w:]
                step_row[f"{s}_RollMean_{w}"] = round(float(np.mean(window_vals)), 2)
                step_row[f"{s}_RollStd_{w}"] = round(float(np.std(window_vals)), 3)

        # Interactions
        temp = step_row.get("Temperature", 0.0)
        cur = step_row.get("Current", 0.0)
        rpm = max(1.0, step_row.get("RPM", 1.0))
        vib = step_row.get("Vibration", 0.0)

        step_row["Interaction_Temp_x_Current"] = round(temp * cur, 2)
        step_row["Interaction_Current_div_RPM"] = round(cur / rpm, 5)
        step_row["Interaction_Vib_x_RPM"] = round(vib * rpm, 2)
        step_row["Interaction_Temp_x_Vib"] = round(temp * vib, 3)

        # Limits Distance
        step_row["LimitDist_MaxTemp"] = round(max_temp - temp, 2)
        step_row["LimitDist_MaxVib"] = round(max_vib - vib, 3)
        step_row["LimitDist_MaxCurrent"] = round(max_cur - cur, 2)
        step_row["LimitDist_MinRPM"] = round(rpm - min_rpm, 0)

        # Predict next state using XGBoost models
        x_step = [float(step_row.get(c, 0.0)) for c in feature_cols]
        df_step = pd.DataFrame([x_step], columns=feature_cols)

        next_state: Dict[str, float] = {}
        for s in TARGET_SENSORS:
            p_val = float(xgb_models[s].predict(df_step)[0])
            next_state[s] = round(p_val, 3)
            recent_history[s].append(p_val)

        forecast_trajectory.append({
            "step": step,
            "predictions": next_state
        })

        # Check limit breach
        if breach_step is None:
            if next_state["Temperature"] >= max_temp:
                breach_step = step
                violating_sensor = "Temperature"
                breach_value = next_state["Temperature"]
                breach_limit = max_temp
            elif next_state["Vibration"] >= max_vib:
                breach_step = step
                violating_sensor = "Vibration"
                breach_value = next_state["Vibration"]
                breach_limit = max_vib
            elif next_state["Current"] >= max_cur:
                breach_step = step
                violating_sensor = "Current"
                breach_value = next_state["Current"]
                breach_limit = max_cur
            elif next_state["RPM"] <= min_rpm:
                breach_step = step
                violating_sensor = "RPM"
                breach_value = next_state["RPM"]
                breach_limit = min_rpm

    t_end = time.time()
    forecast_latency_ms = round((t_end - t_inf) * 1000, 2)
    total_latency_ms = round((t_end - t0) * 1000, 2)

    # 7. RSOT Formatting
    rsot_seconds: Optional[int] = None
    rsot_formatted = "Safe (> 100 steps)"
    
    if breach_step is not None:
        rsot_seconds = int(breach_step * sampling_interval_seconds)
        mins = rsot_seconds // 60
        secs = rsot_seconds % 60
        if mins >= 60:
            hrs = mins // 60
            mins_rem = mins % 60
            rsot_formatted = f"{breach_step} steps ({hrs}h {mins_rem}m)"
        elif mins > 0:
            rsot_formatted = f"{breach_step} steps ({mins}m {secs}s)"
        else:
            rsot_formatted = f"{breach_step} steps ({secs}s)"

    return {
        "success": True,
        "machine_id": machine_id,
        "model_version": version,
        "predicted_next": t1_predictions,
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "rsot_seconds": rsot_seconds,
        "rsot_formatted": rsot_formatted,
        "breach_step": breach_step,
        "violating_sensor": violating_sensor,
        "breach_value": breach_value,
        "breach_limit": breach_limit,
        "forecast_trajectory": forecast_trajectory,
        "performance": {
            "inference_latency_ms": inference_latency_ms,
            "forecast_latency_ms": forecast_latency_ms,
            "total_latency_ms": total_latency_ms,
        }
    }
