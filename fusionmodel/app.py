import os
import torch
import torchaudio
import librosa
import numpy as np
import io
import tempfile
import audiocraft
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from audiocraft.models import MusicGen

app = Flask(__name__)
CORS(app)

class FusionEngine:
    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = MusicGen.get_pretrained('facebook/musicgen-small')

    def process(self, melody_bytes, style_bytes):
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as m_file:
            m_file.write(melody_bytes)
            m_path = m_file.name
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as s_file:
            s_file.write(style_bytes)
            s_path = s_file.name
        try:
            y2, sr2 = librosa.load(s_path, duration=10)
            tempo_val, _ = librosa.beat.beat_track(y=y2, sr=sr2)
            tempo = float(tempo_val[0]) if isinstance(tempo_val, (np.ndarray, list)) else float(tempo_val)
            spec_centroid = np.mean(librosa.feature.spectral_centroid(y=y2, sr=sr2))
            vibe = "electronic and synth-heavy" if spec_centroid > 2500 else "organic and acoustic"
            accurate_prompt = f"A {vibe} version of the uploaded melody. {int(tempo)} BPM, high-fidelity studio recording, signature professional instruments."
            self.model.set_generation_params(duration=15, use_sampling=True, top_k=250, temperature=0.7, cfg_coef=9.0)
            m_wav, sr = torchaudio.load(m_path)
            if m_wav.shape[0] > 1: m_wav = m_wav.mean(dim=0, keepdim=True)
            if sr != 32000:
                resampler = torchaudio.transforms.Resample(sr, 32000)
                m_wav = resampler(m_wav)
                sr = 32000
            result = self.model.generate_with_chroma(descriptions=[accurate_prompt], melody_wavs=m_wav[None, ...].to(self.device), melody_sample_rate=sr)
            return result[0].cpu(), self.model.sample_rate
        finally:
            if os.path.exists(m_path): os.remove(m_path)
            if os.path.exists(s_path): os.remove(s_path)

engine = None

@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "Fusion Engine Online", "model": "MusicGen-Small"}), 200

@app.route('/fuse', methods=['POST'])
def fuse():
    global engine
    if engine is None: engine = FusionEngine()
    try:
        m = request.files['melody'].read()
        s = request.files['style'].read()
        out_wav, sr = engine.process(m, s)
        buffer = io.BytesIO()
        torchaudio.save(buffer, out_wav, sr, format="wav")
        buffer.seek(0)
        return send_file(buffer, mimetype='audio/wav')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)