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

# ✅ CPU-only PyTorch (correct)
RUN pip install --no-cache-dir \
    torch==2.2.2 \
    torchaudio==2.2.2 \
    torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir av==12.3.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir --no-deps \
    git+https://github.com/facebookresearch/audiocraft.git

RUN python - <<EOF
import os
p = "/usr/local/lib/python3.11/site-packages/audiocraft/__init__.py"
if os.path.exists(p):
    with open(p, "w") as f:
        f.write('__version__ = "1.4.0"\n')
EOF

COPY . .

EXPOSE 10000
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--timeout", "600", "app:app"]
