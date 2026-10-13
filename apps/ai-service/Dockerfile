FROM python:3.11-slim
WORKDIR /app

# Dependencias del sistema para OpenCV y PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python (sin torch primero para aprovechar cache)
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.3.0 torchvision==0.18.0 \
    --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p weights

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
