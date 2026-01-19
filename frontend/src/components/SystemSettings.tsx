import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";

const API_URL = process.env.REACT_APP_API_URL;

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({ 
    min_audio_length: 10, 
    max_audio_length: 120, 
    max_similarity_allowed: 1, 
    min_volume_threshold: 20,
    group_by_category: 0,
    group_by_country: 0
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
      if (res.data && Array.isArray(res.data)) {
        const config: any = {};
        res.data.forEach((item: any) => {
          config[item.key] = Number(item.value);
        });
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
    if (isPlaying) return stopTestSound();
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
      const payload = Object.entries(settings).map(([key, value]) => ({
        key: key,
        value: value
      }));
      await axios.post(`${API_URL}/api/tracks/admin/controls`, payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMessage("Settings updated successfully!");
      setTimeout(() => setMessage(""), 3000);
      fetchSettings();
    } catch (err) { 
      setMessage("Failed to update settings."); 
    } finally { 
      setLoading(false); 
    }
  };

  const inputStyle = { backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight };
  const labelStyle = { color: COLORS.textColor };

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-2xl shadow-sm border mt-6" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderOrange }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold" style={{ color: COLORS.textDark }}>System Controls</h2>
        {message && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: COLORS.successBg, color: COLORS.successText }}>{message}</span>}
      </div>
      <div className="space-y-8">
        <div className="p-4 rounded-xl border" style={{ backgroundColor: COLORS.bgPage, borderColor: COLORS.borderMain }}>
          <label className="block text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: COLORS.textLight }}>Display Preferences (Grouping)</label>
          <div className="space-y-4">
            <label className="flex items-center cursor-pointer group">
              <input type="checkbox" checked={settings.group_by_category === 1} onChange={(e) => setSettings({...settings, group_by_category: e.target.checked ? 1 : 0, group_by_country: 0})} className="hidden" />
              <div className="h-5 w-5 rounded border flex items-center justify-center transition-all mr-3" style={{ backgroundColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.bgWhite, borderColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.borderLight }}>
                {settings.group_by_category === 1 && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium" style={{ color: COLORS.textDark }}>Group tracks by Folder (Category)</span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <input type="checkbox" checked={settings.group_by_country === 1} onChange={(e) => setSettings({...settings, group_by_country: e.target.checked ? 1 : 0, group_by_category: 0})} className="hidden" />
              <div className="h-5 w-5 rounded border flex items-center justify-center transition-all mr-3" style={{ backgroundColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.bgWhite, borderColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.borderLight }}>
                {settings.group_by_country === 1 && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium" style={{ color: COLORS.textDark }}>Group tracks by Folder (Country)</span>
            </label>
          </div>
          <p className="text-[10px] mt-3" style={{ color: COLORS.textMuted }}>Selecting one will automatically uncheck the other.</p>
        </div>
        <div>
          <label className="flex justify-between text-sm font-bold mb-2" style={labelStyle}>Max Similarity Allowed <span>{Math.round(settings.max_similarity_allowed)}%</span></label>
          <input type="range" min="1" max="100" step="1" value={settings.max_similarity_allowed} onChange={(e) => setSettings({...settings, max_similarity_allowed: parseInt(e.target.value)})} className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none" style={{ backgroundColor: COLORS.controlSliderBg, accentColor: COLORS.controlSliderThumb }} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[{ label: "Min Length (sec)", key: "min_audio_length" }, { label: "Max Length (sec)", key: "max_audio_length" }].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-bold mb-1" style={{ color: COLORS.textLight }}>{f.label}</label>
              <input type="number" value={(settings as any)[f.key]} onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setSettings({ ...settings, [f.key]: val });
              }} className="w-full p-2 border rounded-lg text-sm outline-none transition-all" style={inputStyle} />
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl border" style={{ backgroundColor: COLORS.bgPage, borderColor: COLORS.borderMain }}>
          <div className="flex justify-between items-start mb-4">
            <label className="text-sm font-bold" style={labelStyle}>Minimum Loudness Requirement <span>{settings.min_volume_threshold}%</span></label>
            <button onClick={toggleTestSound} className="p-2 rounded-full transition-all flex items-center justify-center outline-none shadow-lg" style={{ backgroundColor: isPlaying ? COLORS.controlTestStop : COLORS.controlTestPlay, color: COLORS.bgWhite }}>
              {isPlaying ? <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
            </button>
          </div>
          <input type="range" min="0" max="100" step="1" value={settings.min_volume_threshold} onChange={(e) => setSettings({...settings, min_volume_threshold: parseInt(e.target.value)})} className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none" style={{ backgroundColor: COLORS.borderOrange, accentColor: COLORS.primaryColor }} />
        </div>
      </div>
      <button onClick={handleSave} disabled={loading} className="w-full mt-10 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 outline-none" style={{ backgroundColor: COLORS.primaryColor }}>{loading ? "Updating..." : "Save System Configurations"}</button>
    </div>
  );
};

export default SystemSettings;