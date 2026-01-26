import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { Settings as SettingsIcon, Save, Edit3, Loader2, Play, Check } from "lucide-react";

const api_url = process.env.REACT_APP_API_URL;

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({ 
    min_audio_length: 0, 
    max_audio_length: 0, 
    max_similarity_allowed: 0, 
    min_volume_threshold: 0,
    group_by_category: 0,
    group_by_country: 0
  });

  const [pricing, setPricing] = useState({
    heritage_download: 0,
    fused_download: 0,
    daily_sub: 0,
    weekly_sub: 0,
    monthly_sub: 0,
    yearly_sub: 0
  });

  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [isEditPricing, setIsEditPricing] = useState(false);
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const token = sessionStorage.getItem("userToken");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${api_url}/api/tracks/admin/controls`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data) {
        setSettings({
          min_audio_length: Number(res.data.min_audio_length) || 0,
          max_audio_length: Number(res.data.max_audio_length) || 0,
          max_similarity_allowed: Number(res.data.max_similarity_allowed) || 0,
          min_volume_threshold: Number(res.data.min_volume_threshold) || 0,
          group_by_category: Number(res.data.group_by_category) || 0,
          group_by_country: Number(res.data.group_by_country) || 0
        });
      }
    } catch (err) { console.error("failed to load settings", err); }
  }, [token]);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${api_url}/api/payment/pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setPricing({
          heritage_download: Number(res.data.heritage_download) || 0,
          fused_download: Number(res.data.fused_download) || 0,
          daily_sub: Number(res.data.daily_sub) || 0,
          weekly_sub: Number(res.data.weekly_sub) || 0,
          monthly_sub: Number(res.data.monthly_sub) || 0,
          yearly_sub: Number(res.data.yearly_sub) || 0
        });
      }
    } catch (err) { console.error("failed to load pricing", err); }
  }, [token]);

  useEffect(() => {
    fetchSettings();
    fetchPricing();
    return () => stopTestSound();
  }, [fetchSettings, fetchPricing]);

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

  const handleToggleGrouping = (type: 'category' | 'country') => {
    if (type === 'category') {
      setSettings({
        ...settings,
        group_by_category: settings.group_by_category === 1 ? 0 : 1,
        group_by_country: 0
      });
    } else {
      setSettings({
        ...settings,
        group_by_country: settings.group_by_country === 1 ? 0 : 1,
        group_by_category: 0
      });
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await axios.post(`${api_url}/api/tracks/admin/controls`, settings, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMessage("system updated");
      setTimeout(() => setMessage(""), 3000);
      fetchSettings();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSavePricing = async () => {
    setPricingLoading(true);
    try {
      await axios.put(`${api_url}/api/payment/pricing/update`, pricing, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("pricing updated");
      setIsEditPricing(false);
      setTimeout(() => setMessage(""), 3000);
      fetchPricing();
    } catch (err) { console.error(err); } finally { setPricingLoading(false); }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4" style={{ backgroundColor: COLORS.bgPage }}>
      <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderOrange }}>
        <h1 className="text-lg flex items-center gap-2" style={{ color: COLORS.textDark }}>
          <SettingsIcon size={20} style={{ color: COLORS.primaryColor }} /> portal controle
        </h1>
        {message && (
          <span className="text-[10px] px-3 py-1 rounded-full border" style={{ backgroundColor: COLORS.successBg, color: COLORS.successText, borderColor: COLORS.successBorder }}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleToggleGrouping('category')}
                className="p-4 rounded-xl border text-left transition-all relative"
                style={{ 
                  borderColor: settings.group_by_category === 1 ? COLORS.primaryColor : "transparent",
                  backgroundColor: settings.group_by_category === 1 ? COLORS.primaryTransparent : COLORS.bgGray
                }}
              >
                <div className="w-4 h-4 rounded-md border-2 mb-1.5 flex items-center justify-center transition-all" style={{ borderColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.bgWhite }}>
                  {settings.group_by_category === 1 && <Check size={12} color="white" strokeWidth={4} />}
                </div>
                <p className="text-xs leading-tight" style={{ color: COLORS.textColor }}>group by folder (category)</p>
              </button>
              <button 
                onClick={() => handleToggleGrouping('country')}
                className="p-4 rounded-xl border text-left transition-all relative"
                style={{ 
                  borderColor: settings.group_by_country === 1 ? COLORS.primaryColor : "transparent",
                  backgroundColor: settings.group_by_country === 1 ? COLORS.primaryTransparent : COLORS.bgGray
                }}
              >
                <div className="w-4 h-4 rounded-md border-2 mb-1.5 flex items-center justify-center transition-all" style={{ borderColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.bgWhite }}>
                  {settings.group_by_country === 1 && <Check size={12} color="white" strokeWidth={4} />}
                </div>
                <p className="text-xs leading-tight" style={{ color: COLORS.textColor }}>group by folder (country)</p>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span style={{ color: COLORS.textLight }}>similarity threshold</span>
                <span style={{ color: COLORS.textDark }}>{settings.max_similarity_allowed}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={settings.max_similarity_allowed} 
                onChange={(e) => setSettings({...settings, max_similarity_allowed: parseInt(e.target.value) || 0})} 
                className="w-full h-1 rounded-lg appearance-none cursor-pointer" 
                style={{ backgroundColor: COLORS.controlSliderBg, accentColor: COLORS.primaryColor }} 
              />
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: COLORS.bgGray }}>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: COLORS.textLight }}>min loudness {settings.min_volume_threshold}%</span>
                <button onClick={toggleTestSound} className="p-1.5 rounded-full transition-all" style={{ backgroundColor: isPlaying ? COLORS.dangerColor : COLORS.primaryColor, color: COLORS.bgWhite }}>
                  {isPlaying ? <div className="w-2.5 h-2.5 bg-white rounded-sm" /> : <Play size={14} fill="white" />}
                </button>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={settings.min_volume_threshold} 
                onChange={(e) => setSettings({...settings, min_volume_threshold: parseInt(e.target.value) || 0})} 
                className="w-full h-1 rounded-lg appearance-none cursor-pointer" 
                style={{ backgroundColor: COLORS.borderLight, accentColor: COLORS.primaryColor }} 
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] tracking-wider" style={{ color: COLORS.textLight }}>allowed track length</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px]" style={{ color: COLORS.textLight }}>min sec</label>
                  <input 
                    type="number" 
                    min="0"
                    value={settings.min_audio_length} 
                    onChange={(e) => setSettings({...settings, min_audio_length: Math.max(0, parseInt(e.target.value) || 0)})} 
                    className="w-full p-3 border rounded-xl text-xs outline-none" 
                    style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px]" style={{ color: COLORS.textLight }}>max sec</label>
                  <input 
                    type="number" 
                    min="0"
                    value={settings.max_audio_length} 
                    onChange={(e) => setSettings({...settings, max_audio_length: Math.max(0, parseInt(e.target.value) || 0)})} 
                    className="w-full p-3 border rounded-xl text-xs outline-none" 
                    style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }} 
                  />
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={loading} className="w-full py-3 mt-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: COLORS.primaryColor, color: COLORS.bgWhite }}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} save configurations
          </button>
        </div>

        <div className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'heritage_download', label: 'Heritage track download' },
              { id: 'fused_download', label: 'Fused track download' },
              { id: 'daily_sub', label: 'Daily subscription' },
              { id: 'weekly_sub', label: 'Weekly subscription' },
              { id: 'monthly_sub', label: 'Monthly subscription' },
              { id: 'yearly_sub', label: 'Annual subscription' }
            ].map((field) => (
              <div key={field.id} className="p-4 rounded-xl transition-all border" style={{ 
                backgroundColor: isEditPricing ? COLORS.bgWhite : COLORS.bgGray,
                borderColor: isEditPricing ? COLORS.primaryColor : "transparent"
              }}>
                <label className="block text-[10px] mb-2" style={{ color: COLORS.textLight }}>{field.label}</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: COLORS.textDark }}>$</span>
                  <input 
                    type="number"
                    min="0"
                    disabled={!isEditPricing}
                    value={(pricing as any)[field.id]}
                    onChange={(e) => setPricing({...pricing, [field.id]: Math.max(0, parseFloat(e.target.value) || 0)})}
                    className="w-full bg-transparent text-xs outline-none"
                    style={{ color: COLORS.textDark }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => isEditPricing ? handleSavePricing() : setIsEditPricing(true)}
            className="w-full py-3 mt-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: COLORS.primaryColor, color: COLORS.bgWhite }}
          >
            {pricingLoading ? <Loader2 className="animate-spin" size={14} /> : isEditPricing ? <><Save size={14} /> update pricing</> : <><Edit3 size={14} /> update</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;