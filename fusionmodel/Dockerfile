FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    pkg-config \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    libchromaprint-tools \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# 🔒 NumPy MUST be < 2 for PyTorch 2.2.x
RUN pip install --no-cache-dir "numpy<2"

# ✅ CPU-only PyTorch (with PyPI fallback)
RUN pip install --no-cache-dir \
    torch==2.2.2 \
    torchaudio==2.2.2 \
    torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple

# ✅ REQUIRED by audiocraft
RUN pip install --no-cache-dir xformers

RUN pip install --no-cache-dir av==12.3.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ⚠️ install audiocraft AFTER deps
RUN pip install --no-cache-dir \
    git+https://github.com/facebookresearch/audiocraft.git

COPY . .

EXPOSE 10000

# 🔥 single worker + preload (critical for models)
CMD [
  "gunicorn",
  "--workers", "1",
  "--threads", "1",
  "--preload",
  "--bind", "0.0.0.0:10000",
  "--timeout", "600",
  "app:app"
]
