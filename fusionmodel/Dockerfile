# Base image
FROM python:3.11-slim

# Install system dependencies
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

# Set working directory
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install CPU-only PyTorch + torchaudio + torchvision
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu \
    torchaudio==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install other dependencies
RUN pip install --no-cache-dir av==12.3.0 numpy==1.25.2

# Install xformers (required by Audiocraft)
RUN pip install --no-cache-dir xformers==0.0.20

# Install Audiocraft
RUN pip install --no-cache-dir git+https://github.com/facebookresearch/audiocraft.git

# Patch Audiocraft version (optional)
RUN python - <<EOF
import os
p = "/usr/local/lib/python3.11/site-packages/audiocraft/__init__.py"
if os.path.exists(p):
    with open(p, "w") as f:
        f.write('__version__ = "1.4.0"\\n')
EOF

# Copy project files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Gunicorn settings: single worker, long timeout (for large ML models)
EXPOSE 10000
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers", "1", "--timeout", "600", "app:app"]
