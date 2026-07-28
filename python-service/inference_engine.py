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

# In-Memory Sliding Sequence Buffer for Time-Aware Live Inference
# Key: machine_id -> List[Dict[str, float]] (last 30 telemetry readings)
INFERENCE_SEQUENCE_BUFFER: Dict[str, List[Dict[str, float]]] = {}

def update_sequence_buffer(machine_id: str, current_reading: Dict[str, float]) -> List[Dict[str, float]]:
    """Maintain sliding window of last 30 telemetry readings for time-aware inference."""
    global INFERENCE_SEQUENCE_BUFFER
    if machine_id not in INFERENCE_SEQUENCE_BUFFER:
        INFERENCE_SEQUENCE_BUFFER[machine_id] = []

    clean_reading = {s: float(current_reading.get(s, 0.0)) for s in TARGET_SENSORS}
    buffer = INFERENCE_SEQUENCE_BUFFER[machine_id]
    buffer.append(clean_reading)
    if len(buffer) > 30:
        buffer.pop(0)

    return buffer

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

    # Load metadata for per-machine baseline expectations
    metadata_path = os.path.join(version_dir, "metadata.json")
    sensor_baselines: Dict[str, Dict[str, float]] = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                meta = json.load(f)
                sensor_baselines = meta.get("sensor_baselines", {})
        except Exception:
            pass

    cache_entry = {
        "machine_id": machine_id,
        "version": version,
        "feature_cols": feature_cols,
        "xgb_models": xgb_models,
        "iso_model": iso_model,
        "sensor_baselines": sensor_baselines,
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
    Execute live prediction, time-aware forecasting, 
    Isolation Forest continuous anomaly scoring, and automated Root Cause Analysis.
    """
    t0 = time.time()
    
    # 1. Load cached models & per-machine baselines
    cached = load_or_get_cached_models(machine_id, version, model_dir)
    xgb_models: Dict[str, XGBRegressor] = cached["xgb_models"]
    iso_model: Optional[IsolationForest] = cached["iso_model"]
    feature_cols: List[str] = cached["feature_cols"]
    sensor_baselines: Dict[str, Dict[str, float]] = cached.get("sensor_baselines", {})

    # Default fallback baselines if machine hasn't learned historical baseline yet
    default_baselines = {
        "Temperature": {"expected": 45.0, "unit": "°C"},
        "Vibration": {"expected": 0.12, "unit": "g"},
        "Current": {"expected": 3.5, "unit": "A"},
        "Voltage": {"expected": 230.0, "unit": "V"},
        "RPM": {"expected": 1480.0, "unit": "RPM"},
        "Sound": {"expected": 62.0, "unit": "dB"},
    }

    # 2. Update sequence buffer & construct time-aware feature vector
    buffer = update_sequence_buffer(machine_id, current_reading)

    # Build dynamic feature map combining current reading, lags, rolling statistics, and derivatives
    feat_map = {k: float(v) for k, v in feature_vector.items()}
    
    # Overwrite/fill missing time-aware features from sliding sequence buffer
    buf_df = pd.DataFrame(buffer)
    for s in TARGET_SENSORS:
        col = s if s in buf_df.columns else next((c for c in buf_df.columns if c.lower() == s.lower()), None)
        if col:
            s_vals = buf_df[col]
            curr_val = float(s_vals.iloc[-1])
            feat_map[s] = curr_val
            feat_map[f"{s}_lag1"] = float(s_vals.iloc[-2]) if len(s_vals) >= 2 else curr_val
            feat_map[f"{s}_lag2"] = float(s_vals.iloc[-3]) if len(s_vals) >= 3 else curr_val
            feat_map[f"{s}_lag5"] = float(s_vals.iloc[-6]) if len(s_vals) >= 6 else curr_val
            feat_map[f"{s}_rolling_mean_5"] = float(s_vals.tail(5).mean())
            feat_map[f"{s}_rolling_mean_15"] = float(s_vals.tail(15).mean())
            feat_map[f"{s}_rolling_std_5"] = float(s_vals.tail(5).std()) if len(s_vals) >= 2 else 0.0
            feat_map[f"{s}_diff1"] = round(curr_val - float(s_vals.iloc[-2]), 3) if len(s_vals) >= 2 else 0.0
            feat_map[f"{s}_diff5"] = round(curr_val - float(s_vals.iloc[-6]), 3) if len(s_vals) >= 6 else 0.0

    if not feature_cols:
        feature_cols = [k for k in feat_map.keys() if k not in ["Timestamp", "timestamp"]]

    x_input = [float(feat_map.get(c, 0.0)) for c in feature_cols]
    df_curr = pd.DataFrame([x_input], columns=feature_cols)

    # 3. Predict Next Step (t+1) for all 6 target sensors with Time-Aware Sequence Blending
    t1_predictions: Dict[str, float] = {}
    for sensor in TARGET_SENSORS:
        model = xgb_models[sensor]
        raw_pred = float(model.predict(df_curr)[0])
        hist_base = sensor_baselines.get(sensor, {}).get("expected", default_baselines[sensor]["expected"])
        
        # Exponential Moving Average (EMA) & Time-Aware Sequence Blending
        # 60% ML Sequence Model prediction + 25% Rolling Sequence Mean + 15% Baseline
        s_col = sensor if sensor in buf_df.columns else next((c for c in buf_df.columns if c.lower() == sensor.lower()), None)
        roll_mean = float(buf_df[s_col].tail(5).mean()) if s_col else raw_pred
        
        blended_val = round(0.60 * raw_pred + 0.25 * roll_mean + 0.15 * hist_base, 3)
        t1_predictions[sensor] = blended_val

    t_inf = time.time()
    inference_latency_ms = round((t_inf - t0) * 1000, 2)

    # 4. Isolation Forest Continuous Anomaly Scoring & Decision Boundary Normalization
    is_anomaly = False
    anomaly_score = 0.0
    if iso_model:
        try:
            iso_pred = iso_model.predict(df_curr)[0] # 1 = normal, -1 = anomaly
            is_anomaly = (iso_pred == -1)
            # decision_function: positive = normal, negative = anomaly
            dec_score = float(iso_model.decision_function(df_curr)[0])
            # Convert decision_function to a continuous 0.0 - 1.0 anomaly scale
            # (Higher score = more anomalous)
            anomaly_score = round(max(0.0, min(1.0, 0.5 - (dec_score * 2.5))), 3)
        except Exception:
            pass

    # 5. Automated Root Cause Analysis & Sensor Deviation Ranking
    sensor_units = {
        "Temperature": "°C",
        "Vibration": "g",
        "Current": "A",
        "Voltage": "V",
        "RPM": "RPM",
        "Sound": "dB",
    }

    sensor_deviations = []
    cause_rankings = []

    for s in TARGET_SENSORS:
        act = float(current_reading.get(s, 0.0))
        base_exp = sensor_baselines.get(s, {}).get("expected", default_baselines[s]["expected"])
        dev = round(act - base_exp, 2)
        dev_ratio = abs(dev) / max(0.01, base_exp)
        
        sensor_deviations.append({
            "sensor": s,
            "expected": base_exp,
            "actual": act,
            "deviation": dev,
            "unit": sensor_units[s],
            "devRatio": dev_ratio
        })

        if dev_ratio > 0.10 or abs(dev) > 0.5:
            cause_rankings.append((s, dev, dev_ratio))

    # Sort sensors by highest relative deviation ratio
    cause_rankings.sort(key=lambda x: x[2], reverse=True)

    affected_sensors = [c[0] for c in cause_rankings] if cause_rankings else []
    primary_cause = f"Abnormal {cause_rankings[0][0]} ({'+' if cause_rankings[0][1] > 0 else ''}{cause_rankings[0][1]} {sensor_units[cause_rankings[0][0]]})" if cause_rankings else "Nominal Baseline"
    secondary_cause = f"Secondary drift in {cause_rankings[1][0]}" if len(cause_rankings) > 1 else None
    supporting_cause = f"Fluctuation in {cause_rankings[2][0]}" if len(cause_rankings) > 2 else None

    # Operator recommended action selection
    if affected_sensors:
        top_s = affected_sensors[0]
        if top_s == "Temperature":
            rec_action = "Inspect cooling fan airflow, thermal paste, and bearing lubrication immediately."
        elif top_s == "Vibration":
            rec_action = "Inspect shaft coupling alignment, bearing housing, and tighten mounting bolts."
        elif top_s == "Current":
            rec_action = "Check drive belt tension and inspect motor windings for impedance imbalance."
        elif top_s == "Voltage":
            rec_action = "Check power line voltage stability and electrical supply transformer phase balance."
        elif top_s == "RPM":
            rec_action = "Verify speed governor controller tuning and check drive coupling resistance."
        else:
            rec_action = "Inspect acoustic dampening, housing resonance, and mechanical chatter."
    else:
        rec_action = "Maintain standard preventive inspection schedule."

    # 6. Extract Operating Limits & Failure Specs
    max_temp = float(operating_limits.get("maxTemperature", 80.0))
    max_vib = float(operating_limits.get("maxVibration", 2.5))
    max_cur = float(operating_limits.get("maxCurrent", 15.0))
    min_rpm = float(operating_limits.get("minRPM", 1000.0))
    fail_temp = float(operating_limits.get("failureTemperature", max_temp * 1.2))
    fail_vib = float(operating_limits.get("failureVibration", max_vib * 1.3))

    # 6. Time-Aware Maintenance & Remaining Operating Life (RUL) Forecasting
    # Extract temporal features or compute baseline
    machine_age_days = int(feature_vector.get("machine_age_days", 180))
    operating_hours = int(feature_vector.get("operating_hours", machine_age_days * 20))
    
    forecast_trajectory: List[Dict[str, Any]] = []
    recent_history: Dict[str, List[float]] = {
        s: [float(current_reading.get(s, 0.0))] for s in TARGET_SENSORS
    }

    # Step in operating hours increments (e.g. 24h steps) up to 2000h max horizon
    step_hours_increment = 24
    max_forecast_hours = 2000
    
    remaining_operating_hours: Optional[int] = None
    primary_degradation_factors: List[str] = []
    breach_sensor: Optional[str] = None
    breach_value: Optional[float] = None

    # Check if CURRENT telemetry ALREADY breaches operating limits right now
    curr_temp_check = float(current_reading.get("Temperature", 40.0))
    curr_vib_check = float(current_reading.get("Vibration", 0.12))
    curr_cur_check = float(current_reading.get("Current", 5.0))
    curr_rpm_check = float(current_reading.get("RPM", 1480.0))

    if curr_temp_check >= max_temp:
        remaining_operating_hours = 0
        breach_sensor = "Temperature"
        breach_value = curr_temp_check
        is_anomaly = True
        anomaly_score = max(anomaly_score, 0.95)
    elif curr_vib_check >= max_vib:
        remaining_operating_hours = 0
        breach_sensor = "Vibration"
        breach_value = curr_vib_check
        is_anomaly = True
        anomaly_score = max(anomaly_score, 0.95)
    elif curr_cur_check >= max_cur:
        remaining_operating_hours = 0
        breach_sensor = "Current"
        breach_value = curr_cur_check
        is_anomaly = True
        anomaly_score = max(anomaly_score, 0.95)
    elif min_rpm > 0 and curr_rpm_check <= min_rpm:
        remaining_operating_hours = 0
        breach_sensor = "RPM"
        breach_value = curr_rpm_check
        is_anomaly = True
        anomaly_score = max(anomaly_score, 0.95)

    # Track rates of change to identify primary degrading sensors
    sensor_degradation_scores: Dict[str, float] = {}

    curr_hours = 0
    for h in range(step_hours_increment, max_forecast_hours + 1, step_hours_increment):
        curr_hours = h
        step_row: Dict[str, float] = {}

        # Build feature vector for this operating hour projection
        for s in TARGET_SENSORS:
            curr_v = recent_history[s][-1]
            prev_v1 = recent_history[s][-2] if len(recent_history[s]) >= 2 else curr_v
            
            step_row[s] = curr_v
            step_row[f"{s}_Lag1"] = prev_v1
            step_row[f"{s}_Lag2"] = prev_v1
            step_row[f"{s}_Lag3"] = prev_v1
            step_row[f"{s}_RoC"] = round(curr_v - prev_v1, 3)

            for w in [5, 10, 30]:
                window_vals = recent_history[s][-w:]
                step_row[f"{s}_RollMean_{w}"] = round(float(np.mean(window_vals)), 2)
                step_row[f"{s}_RollStd_{w}"] = round(float(np.std(window_vals)), 3)

        temp = step_row.get("Temperature", 0.0)
        cur = step_row.get("Current", 0.0)
        rpm = max(1.0, step_row.get("RPM", 1.0))
        vib = step_row.get("Vibration", 0.0)

        step_row["Interaction_Temp_x_Current"] = round(temp * cur, 2)
        step_row["Interaction_Current_div_RPM"] = round(cur / rpm, 5)
        step_row["Interaction_Vib_x_RPM"] = round(vib * rpm, 2)
        step_row["Interaction_Temp_x_Vib"] = round(temp * vib, 3)
        step_row["LimitDist_MaxTemp"] = round(max_temp - temp, 2)
        step_row["LimitDist_MaxVib"] = round(max_vib - vib, 3)
        step_row["LimitDist_MaxCurrent"] = round(max_cur - cur, 2)
        step_row["LimitDist_MinRPM"] = round(rpm - min_rpm, 0)

        # Predict next operating hour state
        x_step = [float(step_row.get(c, 0.0)) for c in feature_cols]
        df_step = pd.DataFrame([x_step], columns=feature_cols)

        next_state: Dict[str, float] = {}
        for s in TARGET_SENSORS:
            p_val = float(xgb_models[s].predict(df_step)[0])
            next_state[s] = round(p_val, 3)
            recent_history[s].append(p_val)

        # Calculate target date string
        target_timestamp = time.time() + (h * 3600)
        target_date_str = time.strftime("%Y-%m-%d", time.localtime(target_timestamp))

        forecast_trajectory.append({
            "operatingHours": operating_hours + h,
            "targetDate": target_date_str,
            "predictions": next_state
        })

        # Check threshold breach for maintenance planning
        if remaining_operating_hours is None:
            if next_state["Temperature"] >= max_temp:
                remaining_operating_hours = h
                breach_sensor = "Temperature"
                breach_value = next_state["Temperature"]
                sensor_degradation_scores["Temperature"] = sensor_degradation_scores.get("Temperature", 0.0) + 5.0
            elif next_state["Vibration"] >= max_vib:
                remaining_operating_hours = h
                breach_sensor = "Vibration"
                breach_value = next_state["Vibration"]
                sensor_degradation_scores["Vibration"] = sensor_degradation_scores.get("Vibration", 0.0) + 5.0
            elif next_state["Current"] >= max_cur:
                remaining_operating_hours = h
                breach_sensor = "Current"
                breach_value = next_state["Current"]
                sensor_degradation_scores["Current"] = sensor_degradation_scores.get("Current", 0.0) + 5.0
            elif next_state["RPM"] <= min_rpm:
                remaining_operating_hours = h
                breach_sensor = "RPM"
                breach_value = next_state["RPM"]
                sensor_degradation_scores["RPM"] = sensor_degradation_scores.get("RPM", 0.0) + 5.0

    t_end = time.time()
    forecast_latency_ms = round((t_end - t_inf) * 1000, 2)
    total_latency_ms = round((t_end - t0) * 1000, 2)

    # 7. Time-Aware Maintenance Calculation Outputs
    if remaining_operating_hours == 0:
        estimated_maintenance_date = "IMMEDIATE EMERGENCY MAINTENANCE REQUIRED"
        estimated_failure_window = "Immediate Breach"
        confidence_score = 99
        primary_degradation_factors = [f"Critical Limit Breach on {breach_sensor} ({breach_value})"]
        rsot_formatted = f"CRITICAL LIMIT BREACH (0 operating hours left - Emergency Inspection Required)"
    elif remaining_operating_hours is None:
        # Calculate dynamic remaining operating hours based on composite multi-sensor distance to limits
        curr_temp = float(current_reading.get("Temperature", 40.0))
        curr_vib = float(current_reading.get("Vibration", 0.12))
        curr_cur = float(current_reading.get("Current", 5.0))
        curr_rpm = float(current_reading.get("RPM", 1480.0))
        curr_sound = float(current_reading.get("Sound", 62.0))

        temp_dist = max(0.0, (max_temp - curr_temp) / max(1.0, max_temp - 30.0))
        vib_dist = max(0.0, (max_vib - curr_vib) / max(0.1, max_vib))
        cur_dist = max(0.0, (max_cur - curr_cur) / max(1.0, max_cur))
        rpm_dist = max(0.0, curr_rpm / 1500.0)
        sound_dist = max(0.0, (85.0 - curr_sound) / 30.0)

        composite_dist = (temp_dist * 0.25 + vib_dist * 0.25 + cur_dist * 0.20 + rpm_dist * 0.15 + sound_dist * 0.15)
        remaining_operating_hours = int(max(48, min(25000, composite_dist * 18000)))
        est_maint_time = time.time() + (remaining_operating_hours * 3600)
        estimated_maintenance_date = time.strftime("%d %B %Y", time.localtime(est_maint_time))
        estimated_failure_window = time.strftime("%B %Y", time.localtime(est_maint_time + 30 * 86400))
        confidence_score = 94
        primary_degradation_factors = ["Nominal Degradation Baseline"]
        rsot_formatted = f"Healthy ({remaining_operating_hours:,} operating hours)"
    else:
        est_maint_time = time.time() + (remaining_operating_hours * 3600)
        estimated_maintenance_date = time.strftime("%d %B %Y", time.localtime(est_maint_time))
        estimated_failure_window = time.strftime("%B %Y", time.localtime(est_maint_time + 15 * 86400))
        confidence_score = min(96, max(82, 100 - int((remaining_operating_hours / 10000) * 10)))
        primary_degradation_factors = [breach_sensor] if breach_sensor else ["Multi-Sensor Drift"]
        rsot_formatted = f"{remaining_operating_hours:,} operating hours left (Est. Maintenance: {estimated_maintenance_date})"

    return {
        "success": True,
        "machine_id": machine_id,
        "model_version": version,
        "predicted_next": t1_predictions,
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "affected_sensors": affected_sensors,
        "sensor_deviations": sensor_deviations,
        "primary_cause": primary_cause,
        "secondary_cause": secondary_cause,
        "supporting_cause": supporting_cause,
        "recommended_action": rec_action,
        "machine_age_days": machine_age_days,
        "operating_hours": operating_hours,
        "remaining_operating_hours": remaining_operating_hours,
        "estimated_maintenance_date": estimated_maintenance_date,
        "estimated_failure_window": estimated_failure_window,
        "confidence_score": confidence_score,
        "primary_degradation_factors": primary_degradation_factors,
        "rsot_seconds": remaining_operating_hours * 3600,
        "rsot_formatted": rsot_formatted,
        "breach_step": None,
        "violating_sensor": breach_sensor,
        "breach_value": breach_value,
        "breach_limit": max_temp if breach_sensor == "Temperature" else max_vib,
        "forecast_trajectory": forecast_trajectory,
        "performance": {
            "inference_latency_ms": inference_latency_ms,
            "forecast_latency_ms": forecast_latency_ms,
            "total_latency_ms": total_latency_ms,
        }
    }
