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
    target_sensors = ["Temperature", "Vibration", "Current", "Voltage", "RPM", "Sound"]
    sensor_baselines: Dict[str, Dict[str, float]] = {}
    historical_degradation_slopes: Dict[str, float] = {}

    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
            feature_cols = meta.get("feature_cols", [])
            target_sensors = meta.get("target_sensors", target_sensors)
            sensor_baselines = meta.get("sensor_baselines", {})
            historical_degradation_slopes = meta.get("historical_degradation_slopes", {})

    # Load dynamic XGBoost Models for all configured target sensors
    xgb_models: Dict[str, XGBRegressor] = {}
    for sensor in target_sensors:
        fname = f"xgb_{sensor.lower()}.json"
        fpath = os.path.join(version_dir, fname)
        if os.path.exists(fpath):
            model = XGBRegressor()
            model.load_model(fpath)
            xgb_models[sensor] = model

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

# In-Memory Machine Degradation Index (MDI) & Health Memory Cache per machine
# Key: machine_id -> float (stored MDI memory)
MDI_MEMORY_CACHE: Dict[str, float] = {}

def get_machine_mdi_memory(machine_id: str, default_mdi: float) -> float:
    global MDI_MEMORY_CACHE
    if machine_id not in MDI_MEMORY_CACHE:
        MDI_MEMORY_CACHE[machine_id] = default_mdi
    return MDI_MEMORY_CACHE[machine_id]

def update_machine_mdi_memory(machine_id: str, new_mdi: float) -> float:
    global MDI_MEMORY_CACHE
    MDI_MEMORY_CACHE[machine_id] = new_mdi
    return new_mdi

def apply_maintenance_recovery(machine_id: str, recovery_points: float = 20.0) -> float:
    """Apply maintenance recovery factor to improve machine health score."""
    global MDI_MEMORY_CACHE
    curr_mdi = MDI_MEMORY_CACHE.get(machine_id, 20.0)
    recovered_mdi = max(0.0, curr_mdi - recovery_points)
    MDI_MEMORY_CACHE[machine_id] = recovered_mdi
    return recovered_mdi

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
    SentinelX Machine Lifecycle & Degradation Engine:
    
    Architecture:
    Machine Lifecycle + Historical Degradation + Current Condition
    -> Machine Degradation Index (MDI: 0=New, 100=End of Life)
    -> Health Score (100 - MDI)
    -> Hybrid Lifecycle RSOT (Remaining Safe Operating Time)
    """
    t0 = time.time()
    
    # 1. Load cached models & per-machine baselines
    cached = load_or_get_cached_models(machine_id, version, model_dir)
    xgb_models: Dict[str, XGBRegressor] = cached["xgb_models"]
    iso_model: Optional[IsolationForest] = cached["iso_model"]
    feature_cols: List[str] = cached["feature_cols"]
    sensor_baselines: Dict[str, Dict[str, float]] = cached.get("sensor_baselines", {})

    default_baselines = {
        "Temperature": {"expected": 45.0, "unit": "°C"},
        "Vibration": {"expected": 0.12, "unit": "g"},
        "Current": {"expected": 3.5, "unit": "A"},
        "Voltage": {"expected": 230.0, "unit": "V"},
        "RPM": {"expected": 1480.0, "unit": "RPM"},
        "Sound": {"expected": 62.0, "unit": "dB"},
    }

    # 2. Update sliding sequence buffer
    buffer = update_sequence_buffer(machine_id, current_reading)
    buf_df = pd.DataFrame(buffer)

    # Construct time-aware feature map
    feat_map = {k: float(v) for k, v in feature_vector.items()}
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

    # 3. Predict Next Step (t+1) for target sensors
    t1_predictions: Dict[str, float] = {}
    for sensor in TARGET_SENSORS:
        model = xgb_models[sensor]
        raw_pred = float(model.predict(df_curr)[0])
        hist_base = sensor_baselines.get(sensor, {}).get("expected", default_baselines[sensor]["expected"])
        
        s_col = sensor if sensor in buf_df.columns else next((c for c in buf_df.columns if c.lower() == sensor.lower()), None)
        roll_mean = float(buf_df[s_col].tail(5).mean()) if s_col else raw_pred
        
        blended_val = round(0.60 * raw_pred + 0.25 * roll_mean + 0.15 * hist_base, 3)
        t1_predictions[sensor] = blended_val

    t_inf = time.time()
    inference_latency_ms = round((t_inf - t0) * 1000, 2)

    # 4. Isolation Forest Continuous Anomaly & Stress Scoring
    is_anomaly = False
    anomaly_score = 0.0
    if iso_model:
        try:
            iso_pred = iso_model.predict(df_curr)[0]
            is_anomaly = (iso_pred == -1)
            dec_score = float(iso_model.decision_function(df_curr)[0])
            anomaly_score = round(max(0.0, min(1.0, 0.5 - (dec_score * 2.5))), 3)
        except Exception:
            pass

    # 5. Extract Machine Lifecycle Metadata & Temporal Features
    machine_age_days = float(feature_vector.get("machine_age_days", 180.0))
    operating_hours = float(feature_vector.get("operating_hours", machine_age_days * 18.0))
    history_days = float(feature_vector.get("history_days", max(7.0, machine_age_days * 0.8)))
    gap_ratio = float(feature_vector.get("gap_ratio", 0.05))

    max_temp = float(operating_limits.get("maxTemperature", 80.0))
    max_vib = float(operating_limits.get("maxVibration", 2.5))
    max_cur = float(operating_limits.get("maxCurrent", 15.0))
    min_rpm = float(operating_limits.get("minRPM", 1000.0))

    # Check immediate safety breaches
    curr_temp = float(current_reading.get("Temperature", 40.0))
    curr_vib = float(current_reading.get("Vibration", 0.12))
    curr_cur = float(current_reading.get("Current", 3.5))
    curr_rpm = float(current_reading.get("RPM", 1480.0))
    curr_sound = float(current_reading.get("Sound", 62.0))

    is_limit_breached = (
        curr_temp >= max_temp or
        curr_vib >= max_vib or
        curr_cur >= max_cur or
        (min_rpm > 0 and curr_rpm <= min_rpm)
    )

    # 6. Machine Degradation Index (MDI) Calculation Pipeline
    # Component A: Historical Accumulated Wear (70% weight baseline)
    base_lifecycle_wear = min(35.0, (operating_hours / 1000.0) * 1.2 + (machine_age_days / 365.0) * 1.5)
    
    # Calculate Sensor Cumulative Drifts
    sensor_drifts: Dict[str, float] = {}
    total_drift_sum = 0.0
    for s in TARGET_SENSORS:
        act = float(current_reading.get(s, default_baselines[s]["expected"]))
        base_exp = sensor_baselines.get(s, {}).get("expected", default_baselines[s]["expected"])
        
        if s == "Temperature":
            d_ratio = max(0.0, (act - base_exp) / max(1.0, max_temp - base_exp))
        elif s == "Vibration":
            d_ratio = max(0.0, (act - base_exp) / max(0.1, max_vib - base_exp))
        elif s == "Current":
            d_ratio = max(0.0, (act - base_exp) / max(1.0, max_cur - base_exp))
        elif s == "RPM":
            d_ratio = max(0.0, (1480.0 - act) / max(1.0, 1480.0 - min_rpm))
        else:
            d_ratio = max(0.0, (act - base_exp) / 30.0)
            
        sensor_drifts[s] = d_ratio
        total_drift_sum += d_ratio

    mdi_historical = min(75.0, base_lifecycle_wear + total_drift_sum * 15.0)

    # Component B: Recent Trend (20% weight baseline)
    recent_trend_sum = 0.0
    for s in TARGET_SENSORS:
        s_col = s if s in buf_df.columns else next((c for c in buf_df.columns if c.lower() == s.lower()), None)
        if s_col and len(buf_df[s_col]) >= 5:
            s_std = float(buf_df[s_col].tail(10).std())
            recent_trend_sum += s_std
    mdi_recent_trend = min(80.0, recent_trend_sum * 8.0)

    # Component C: Current Instantaneous Stress Index (CSI) (10% weight baseline)
    csi_instant = min(100.0, total_drift_sum * 30.0 + anomaly_score * 20.0)

    # Dynamic Historical Weighting Adaptability based on Available History
    # 1 year history -> 90% historical weight, 10% recent/current
    # 1 week history -> 40% historical weight, 60% recent/current
    w_hist = max(0.40, min(0.90, 0.40 + 0.50 * (history_days / 365.0)))
    w_rem = 1.0 - w_hist
    w_recent = w_rem * 0.70
    w_instant = w_rem * 0.30

    mdi_composite = (w_hist * mdi_historical) + (w_recent * mdi_recent_trend) + (w_instant * csi_instant)

    # Long-Term Health Memory Integration (Smooth Monotonic Evolution)
    # Daily noise will NOT fluctuate health wildly; smooth update factor alpha=0.02
    initial_default_mdi = min(60.0, mdi_composite)
    prev_mdi_memory = get_machine_mdi_memory(machine_id, initial_default_mdi)

    if is_limit_breached:
        # Immediate safety limit penalty
        mdi_smoothed = min(100.0, max(80.0, mdi_composite * 1.5))
    else:
        # Slow monotonic evolution (2% new, 98% memory)
        mdi_smoothed = round(0.98 * prev_mdi_memory + 0.02 * mdi_composite, 2)

    update_machine_mdi_memory(machine_id, mdi_smoothed)

    # Health Score is derived directly: Health Score = 100 - MDI
    health_score = max(0, min(100, int(round(100.0 - mdi_smoothed))))

    # 7. Explainability Attribution Breakdown
    # Percentage attribution of degradation across sensors
    explainability_attribution: Dict[str, int] = {}
    if total_drift_sum > 0:
        for s in TARGET_SENSORS:
            pct = int(round((sensor_drifts[s] / total_drift_sum) * 100))
            explainability_attribution[s] = pct
    else:
        explainability_attribution = {"Temperature": 30, "Vibration": 30, "Current": 20, "RPM": 10, "Sound": 5, "Voltage": 5}

    # 8. Hybrid Lifecycle RSOT Engine Calculation
    # Remaining Safe Operating Time based on Machine Age, Operating Hours, Degradation Velocity & Limits
    degradation_velocities: Dict[str, float] = {}
    sensor_rsot_projections: Dict[str, float] = {}

    for s in target_sensors:
        slope = cached.get("historical_degradation_slopes", {}).get(s, 0.0)
        act = float(current_reading.get(s, default_baselines.get(s, {}).get("expected", 50.0)))
        base_exp = sensor_baselines.get(s, {}).get("expected", default_baselines.get(s, {}).get("expected", 50.0))
        
        # Degradation velocity in sensor units per hour
        if abs(slope) > 0.00001:
            vel = abs(slope)
        else:
            vel = max(0.001, abs(act - base_exp) / max(1.0, operating_hours))
            
        degradation_velocities[s] = round(vel, 5)

        # Distance to safety threshold
        s_lower = s.lower()
        if "temp" in s_lower:
            dist = max(0.0, max_temp - act)
        elif "vib" in s_lower:
            dist = max(0.0, max_vib - act)
        elif "curr" in s_lower:
            dist = max(0.0, max_cur - act)
        elif "rpm" in s_lower:
            dist = max(0.0, act - min_rpm)
        else:
            dist = max(0.0, base_exp * 1.5 - act)

        s_rsot = dist / max(0.00001, vel)
        sensor_rsot_projections[s] = s_rsot

    # Find minimum remaining operating hours across sensors
    min_sensor_rsot_hours = min(sensor_rsot_projections.values()) if sensor_rsot_projections else 2450.0
    weakest_sensor = min(sensor_rsot_projections, key=sensor_rsot_projections.get) if sensor_rsot_projections else "Temperature"

    # Wear-based RSOT
    rsot_wear_hours = max(24.0, (100.0 - mdi_smoothed) * 220.0)

    if is_limit_breached:
        remaining_operating_hours = 0
        breach_sensor = weakest_sensor
        breach_value = float(current_reading.get(weakest_sensor, 0.0))
    else:
        remaining_operating_hours = int(round(min(rsot_wear_hours, min_sensor_rsot_hours)))
        remaining_operating_hours = max(48, min(25000, remaining_operating_hours))

    # 9. Dynamic Confidence Score
    # Confidence increases with available history and continuous data stream
    confidence_score = int(round(max(50.0, min(98.0, 50.0 + min(40.0, history_days * 0.5) - (gap_ratio * 15.0)))))

    # Forecast Trajectory Generation for UI
    forecast_trajectory: List[Dict[str, Any]] = []
    step_hours = 24
    for h in range(step_hours, 2001, step_hours):
        target_timestamp = time.time() + (h * 3600)
        target_date_str = time.strftime("%Y-%m-%d", time.localtime(target_timestamp))
        
        proj_state: Dict[str, float] = {}
        for s in TARGET_SENSORS:
            curr_v = float(current_reading.get(s, default_baselines[s]["expected"]))
            proj_v = curr_v + (degradation_velocities[s] * h)
            proj_state[s] = round(proj_v, 3)

        forecast_trajectory.append({
            "operatingHours": int(operating_hours + h),
            "targetDate": target_date_str,
            "predictions": proj_state
        })

    # Root Cause Analysis
    sensor_deviations = []
    cause_rankings = []
    sensor_units = {"Temperature": "°C", "Vibration": "g", "Current": "A", "Voltage": "V", "RPM": "RPM", "Sound": "dB"}

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

    cause_rankings.sort(key=lambda x: x[2], reverse=True)
    affected_sensors = [c[0] for c in cause_rankings] if cause_rankings else []
    primary_cause = f"Abnormal {cause_rankings[0][0]} ({'+' if cause_rankings[0][1] > 0 else ''}{cause_rankings[0][1]} {sensor_units[cause_rankings[0][0]]})" if cause_rankings else "Nominal Baseline"
    secondary_cause = f"Secondary drift in {cause_rankings[1][0]}" if len(cause_rankings) > 1 else None
    supporting_cause = f"Fluctuation in {cause_rankings[2][0]}" if len(cause_rankings) > 2 else None

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

    t_end = time.time()
    forecast_latency_ms = round((t_end - t_inf) * 1000, 2)
    total_latency_ms = round((t_end - t0) * 1000, 2)

    if remaining_operating_hours == 0:
        estimated_maintenance_date = "IMMEDIATE EMERGENCY MAINTENANCE REQUIRED"
        estimated_failure_window = "Immediate Breach"
        confidence_score = 99
        primary_degradation_factors = [f"Critical Limit Breach on {weakest_sensor}"]
        rsot_formatted = f"CRITICAL LIMIT BREACH (0 operating hours left - Emergency Inspection Required)"
    else:
        est_maint_time = time.time() + (remaining_operating_hours * 3600)
        estimated_maintenance_date = time.strftime("%d %B %Y", time.localtime(est_maint_time))
        estimated_failure_window = time.strftime("%B %Y", time.localtime(est_maint_time + 15 * 86400))
        primary_degradation_factors = [weakest_sensor] if weakest_sensor else ["Multi-Sensor Drift"]
        rsot_formatted = f"{remaining_operating_hours:,} operating hours left (Est. Maintenance: {estimated_maintenance_date})"

    return {
        "success": True,
        "machine_id": machine_id,
        "model_version": version,
        "predicted_next": t1_predictions,
        "health_score": health_score,
        "machine_degradation_index": round(mdi_smoothed, 2),
        "machine_wear_index": round(mdi_historical, 2),
        "current_stress_index": round(csi_instant, 2),
        "explainability_attribution": explainability_attribution,
        "degradation_velocities": degradation_velocities,
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
        "violating_sensor": breach_sensor if is_limit_breached else None,
        "breach_value": float(current_reading.get(breach_sensor, 0.0)) if is_limit_breached and breach_sensor else None,
        "breach_limit": max_temp if breach_sensor == "Temperature" else max_vib,
        "forecast_trajectory": forecast_trajectory,
        "performance": {
            "inference_latency_ms": inference_latency_ms,
            "forecast_latency_ms": forecast_latency_ms,
            "total_latency_ms": total_latency_ms,
        }
    }
