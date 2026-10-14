FROM python:3.11-slim-bullseye
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir torch==2.3.0 torchvision==0.18.0 \
    --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gdown

COPY apps/ai-service/. .
RUN mkdir -p weights && \
    gdown "https://drive.google.com/uc?id=1jwX1ZqPmVX2MM0QE6UzT5P0Uipvbp6Sc" -O weights/best.pt

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
