# CivicProof Platform - Backend Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies (build-essential and libffi for crypto)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY app ./app
COPY scripts ./scripts

# Create data directory for SQLite / storage
RUN mkdir -p /app/data/storage

EXPOSE 8008

# Start production FastAPI server with worker clustering and proxy headers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8008", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]
