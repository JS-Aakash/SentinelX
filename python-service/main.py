import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from ml_engine import train_machine_models
    from inference_engine import run_live_inference_and_forecast, clear_model_cache
except ImportError:
    train_machine_models = None
    run_live_inference_and_forecast = None
    clear_model_cache = None

app = FastAPI(
    title="SentinelX AI Model Service",
    description="Python FastAPI service for per-machine AI model training, time-aware maintenance forecasting, remaining operating life estimation, and anomaly detection",
    version="3.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrainModelRequest(BaseModel):
    machine_id: str
    dataset_path: str
    model_version: int
    output_dir: Optional[str] = "models"
    operating_limits: Optional[Dict[str, float]] = None
    dataset_ids: Optional[List[str]] = None

class PredictRequest(BaseModel):
    machine_id: str
    model_version: int
    model_dir: Optional[str] = "models"
    feature_vector: Dict[str, float]
    current_reading: Dict[str, float]
    operating_limits: Dict[str, float]
    horizon: Optional[int] = 100
    sampling_interval_seconds: Optional[float] = 5.0

class ClearCacheRequest(BaseModel):
    machine_id: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "service": "SentinelX AI Model Service",
        "status": "healthy",
        "version": "3.0.0",
        "features": [
            "6 Independent XGBoost Regressors per machine",
            "Isolation Forest Anomaly Detection",
            "Time-Aware Remaining Operating Life (RUL) Forecasting",
            "Estimated Maintenance Date & Failure Window Calculation",
            "In-Memory Model Caching"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/train-models")
def train_models_endpoint(req: TrainModelRequest):
    if train_machine_models is None:
        raise HTTPException(
            status_code=500,
            detail="ML engine libraries not available in environment"
        )
        
    try:
        result = train_machine_models(
            machine_id=req.machine_id,
            dataset_path=req.dataset_path,
            model_version=req.model_version,
            output_dir=req.output_dir or "models",
            operating_limits=req.operating_limits
        )
        # Clear model cache for this machine to ensure fresh models are loaded
        if clear_model_cache:
            clear_model_cache(req.machine_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict_endpoint(req: PredictRequest):
    """
    Execute live 1-step prediction, 100-step recursive forecast, RSOT estimation, 
    and Isolation Forest anomaly scoring using cached in-memory models.
    """
    if run_live_inference_and_forecast is None:
        raise HTTPException(status_code=500, detail="Inference engine not available")

    try:
        result = run_live_inference_and_forecast(
            machine_id=req.machine_id,
            version=req.model_version,
            model_dir=req.model_dir or "models",
            feature_vector=req.feature_vector,
            current_reading=req.current_reading,
            operating_limits=req.operating_limits,
            horizon=req.horizon or 100,
            sampling_interval_seconds=req.sampling_interval_seconds or 5.0
        )
        return result
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-cache")
def clear_cache_endpoint(req: ClearCacheRequest):
    if clear_model_cache:
        clear_model_cache(req.machine_id)
    return {"status": "success", "message": f"Cache cleared for {req.machine_id or 'all machines'}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
