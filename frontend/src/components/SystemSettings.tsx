import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    min_audio_length: 10,
    max_audio_length: 120,
    max_similarity_allowed: 1,
    min_volume_threshold: 20
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const token = sessionStorage.getItem("userToken");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/tracks/admin/controls`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.length > 0) {
        const config: any = {};
        res.data.forEach((item: any) => config[item.key] = item.value);
        setSettings(prev => ({ ...prev, ...config }));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
    return () => stopTestSound();
  }, [fetchSettings]);

  const stopTestSound = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleTestSound = () => {
    if (isPlaying) {
      stopTestSound();
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    const ctx = audioContextRef.current;
    const gainNode = gainNodeRef.current!;

    gainNode.gain.setValueAtTime(settings.min_volume_threshold / 100, ctx.currentTime);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.connect(gainNode);
    osc.start();
    
    oscillatorRef.current = osc;
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(settings.min_volume_threshold / 100, audioContextRef.current.currentTime, 0.05);
    }
  }, [settings.min_volume_threshold, isPlaying]);

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await axios.post(`${API_URL}/api/tracks/admin/controls`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("Settings updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-orange-100 mt-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">System Controls</h2>
        {message && <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{message}</span>}
      </div>

      <div className="space-y-8">
        <div>
          <label className="flex justify-between text-sm font-bold text-gray-700 mb-2">
            Max Similarity Allowed <span>{Math.round(settings.max_similarity_allowed)}%</span>
          </label>
          <input 
            type="range" 
            min="1" 
            max="100" 
            step="1"
            value={settings.max_similarity_allowed}
            onChange={(e) => setSettings({...settings, max_similarity_allowed: parseInt(e.target.value)})}
            className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-500 outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-1">Lower is stricter. 1% is recommended for unique heritage sounds.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Min Length (sec)</label>
            <input 
              type="number" 
              value={settings.min_audio_length}
              onChange={(e) => setSettings({...settings, min_audio_length: parseInt(e.target.value) || 0})}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Max Length (sec)</label>
            <input 
              type="number" 
              value={settings.max_audio_length}
              onChange={(e) => setSettings({...settings, max_audio_length: parseInt(e.target.value) || 0})}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <label className="text-sm font-bold text-gray-700">
              Minimum Loudness Requirement <span>{settings.min_volume_threshold}%</span>
            </label>
            <div className="flex flex-col items-center">
                <button 
                onClick={toggleTestSound}
                className={`p-2 rounded-full transition-all flex items-center justify-center outline-none ${isPlaying ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-orange-500 text-white shadow-lg shadow-orange-200'}`}
                title={isPlaying ? "Stop" : "Play Test Sample"}
                >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
                </button>
                <span className="text-[9px] text-orange-500 font-bold mt-1">Test audibility</span>
            </div>
          </div>
          <input 
            type="range" min="0" max="100" step="1"
            value={settings.min_volume_threshold}
            onChange={(e) => setSettings({...settings, min_volume_threshold: parseInt(e.target.value)})}
            className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 outline-none"
          />
          <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
            <span>Silent (0%)</span>
            <span>Very loud (100%)</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Higher values require louder recordings. Audio detected below this percentage will be rejected.</p>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="w-full mt-10 bg-[#E67E22] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 outline-none"
      >
        {loading ? "Updating..." : "Save System Configurations"}
      </button>
    </div>
  );
};

export default SystemSettings;