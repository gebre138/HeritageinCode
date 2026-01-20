# =========================
# Base image
# =========================
FROM python:3.11-slim

# =========================
# System dependencies
# =========================
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

# =========================
# Set working directory
# =========================
WORKDIR /app

# =========================
# Upgrade pip and wheel
# =========================
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# =========================
# Install CPU-only dependencies
# =========================
RUN pip install --no-cache-dir "numpy<2"

RUN pip install --no-cache-dir \
    torch==2.2.2 \
    torchaudio==2.2.2 \
    torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple

# =========================
# Install xformers (required by Audiocraft)
# =========================
RUN pip install --no-cache-dir xformers==0.0.20

# =========================
# Install av library
# =========================
RUN pip install --no-cache-dir av==12.3.0

# =========================
# Install other Python dependencies
# =========================
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# =========================
# Install Audiocraft
# =========================
RUN pip install --no-cache-dir --no-deps \
    git+https://github.com/facebookresearch/audiocraft.git

# =========================
# Patch Audiocraft version
# =========================
RUN python - <<EOF
import os
p = "/usr/local/lib/python3.11/site-packages/audiocraft/__init__.py"
if os.path.exists(p):
    with open(p, "w") as f:
        f.write('__version__ = "1.4.0"\\n')
EOF

# =========================
# Copy app
# =========================
COPY . .

# =========================
# Expose port and run
# =========================
EXPOSE 10000
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--timeout", "600", "app:app"]
