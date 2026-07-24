# Dockerfile for SentinelX Python AI Microservice (FastAPI + XGBoost + Isolation Forest)
FROM python:3.10-slim

WORKDIR /app

# Install system build tools and OpenMP runtime (libgomp1 required for XGBoost)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements & install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice code
COPY . .

# Ensure models storage directory exists
RUN mkdir -p models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
