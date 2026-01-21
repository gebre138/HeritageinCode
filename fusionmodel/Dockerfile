FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install the BINARY version of av so it doesn't try to compile
RUN pip install --no-cache-dir av

# Install dependencies that Audiocraft usually brings in
RUN pip install --no-cache-dir xformers spacy flashy hydra-core julius num2words omegaconf sentencepiece dynamic-yaml

RUN python -m spacy download en_core_web_sm

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Audiocraft WITHOUT dependencies so it doesn't try to build 'av' again
RUN pip install --no-cache-dir --no-deps git+https://github.com/facebookresearch/audiocraft.git

COPY . .

EXPOSE 10000

CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--timeout", "600", "app:app"]