import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { Settings as SettingsIcon, Save, Loader2, Play, Check } from "lucide-react";

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

  const [pricing, setPricing] = useState<any>({
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
  const [isEditSettings, setIsEditSettings] = useState(false);
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
          heritage_download: res.data.heritage_download,
          fused_download: res.data.fused_download,
          daily_sub: res.data.daily_sub,
          weekly_sub: res.data.weekly_sub,
          monthly_sub: res.data.monthly_sub,
          yearly_sub: res.data.yearly_sub
        });
      }
    } catch (err) { console.error("failed to load pricing", err); }
  }, [token]);

  useEffect(() => {
    fetchSettings();
    fetchPricing();
    return () => stopTestSound();
  }, [fetchSettings, fetchPricing]);

  useEffect(() => {
    if (isPlaying && gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(settings.min_volume_threshold / 100, audioContextRef.current.currentTime, 0.05);
    }
  }, [settings.min_volume_threshold, isPlaying]);

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
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.connect(gainNode);
    osc.start();
    oscillatorRef.current = osc;
    setIsPlaying(true);
  };

  const handleToggleGrouping = (type: 'category' | 'country') => {
    if (!isEditSettings) return;
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

  const blockNegative = (e: React.KeyboardEvent) => {
    if (e.key === '-' || e.key === 'e') {
      e.preventDefault();
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    const validatedSettings = {
      ...settings,
      max_audio_length: settings.max_audio_length < settings.min_audio_length 
        ? settings.min_audio_length 
        : settings.max_audio_length
    };
    try {
      await axios.post(`${api_url}/api/tracks/admin/controls`, validatedSettings, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMessage("System Updated Successfully");
      setIsEditSettings(false);
      setTimeout(() => setMessage(""), 3000);
      fetchSettings();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSavePricing = async () => {
    setPricingLoading(true);
    const validatedPricing = {
      heritage_download: Math.max(0, parseFloat(pricing.heritage_download) || 0),
      fused_download: Math.max(0, parseFloat(pricing.fused_download) || 0),
      daily_sub: Math.max(0, parseFloat(pricing.daily_sub) || 0),
      weekly_sub: Math.max(0, parseFloat(pricing.weekly_sub) || 0),
      monthly_sub: Math.max(0, parseFloat(pricing.monthly_sub) || 0),
      yearly_sub: Math.max(0, parseFloat(pricing.yearly_sub) || 0)
    };
    try {
      await axios.put(`${api_url}/api/payment/pricing/update`, validatedPricing, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("Pricing Updated Successfully");
      setIsEditPricing(false);
      setTimeout(() => setMessage(""), 3000);
      fetchPricing();
    } catch (err) { console.error(err); } finally { setPricingLoading(false); }
  };

  const isInvalidDuration = settings.max_audio_length > 0 && settings.max_audio_length < settings.min_audio_length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4" style={{ backgroundColor: COLORS.bgPage }}>
      <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderOrange }}>
        <h1 className="text-[18px] font-bold flex items-center gap-2" style={{ color: COLORS.textDark }}>
          <SettingsIcon size={22} style={{ color: COLORS.primaryColor }} /> Heritage in Code Portal Configurations
        </h1>
        {message && (
          <span className="text-[12px] font-bold px-3 py-1 rounded-full border" style={{ backgroundColor: COLORS.successBg, color: COLORS.successText, borderColor: COLORS.successBorder }}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="p-5 rounded-2xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <div className="space-y-6">
            <h2 className="text-[14px] font-bold mb-2 tracking-wide" style={{ color: COLORS.primaryColor }}>Uploading Requierements</h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleToggleGrouping('category')}
                disabled={!isEditSettings}
                className="p-4 rounded-xl border text-left transition-all relative disabled:opacity-60"
                style={{ 
                  borderColor: settings.group_by_category === 1 ? COLORS.primaryColor : isEditSettings ? COLORS.borderLight : "transparent",
                  backgroundColor: settings.group_by_category === 1 ? COLORS.primaryTransparent : COLORS.bgGray
                }}
              >
                <div className="w-5 h-5 rounded-md border-2 mb-2 flex items-center justify-center transition-all" style={{ borderColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: settings.group_by_category === 1 ? COLORS.primaryColor : COLORS.bgWhite }}>
                  {settings.group_by_category === 1 && <Check size={14} color="white" strokeWidth={4} />}
                </div>
                <p className="text-[12px] font-bold leading-tight" style={{ color: COLORS.textColor }}>Group By Category</p>
              </button>
              <button 
                onClick={() => handleToggleGrouping('country')}
                disabled={!isEditSettings}
                className="p-4 rounded-xl border text-left transition-all relative disabled:opacity-60"
                style={{ 
                  borderColor: settings.group_by_country === 1 ? COLORS.primaryColor : isEditSettings ? COLORS.borderLight : "transparent",
                  backgroundColor: settings.group_by_country === 1 ? COLORS.primaryTransparent : COLORS.bgGray
                }}
              >
                <div className="w-5 h-5 rounded-md border-2 mb-2 flex items-center justify-center transition-all" style={{ borderColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: settings.group_by_country === 1 ? COLORS.primaryColor : COLORS.bgWhite }}>
                  {settings.group_by_country === 1 && <Check size={14} color="white" strokeWidth={4} />}
                </div>
                <p className="text-[12px] font-bold leading-tight" style={{ color: COLORS.textColor }}>Group By Country</p>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold" style={{ color: COLORS.textLight }}>Similarity Threshold</span>
                <span className="text-[12px] font-bold" style={{ color: COLORS.textDark }}>{settings.max_similarity_allowed}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                disabled={!isEditSettings}
                value={settings.max_similarity_allowed} 
                onChange={(e) => setSettings({...settings, max_similarity_allowed: parseInt(e.target.value) || 0})} 
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${!isEditSettings ? 'opacity-40 grayscale-[0.5]' : 'opacity-100 hover:h-2.5'}`} 
                style={{ backgroundColor: isEditSettings ? COLORS.primaryTransparent : COLORS.borderLight, accentColor: COLORS.primaryColor }} 
              />
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: COLORS.bgGray }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold" style={{ color: COLORS.textLight }}>Minimum Loudness {settings.min_volume_threshold}%</span>
                <button onClick={toggleTestSound} className="p-2 rounded-full transition-all shadow-sm" style={{ backgroundColor: isPlaying ? COLORS.dangerColor : COLORS.primaryColor, color: COLORS.bgWhite }}>
                  {isPlaying ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Play size={16} fill="white" />}
                </button>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                disabled={!isEditSettings}
                value={settings.min_volume_threshold} 
                onChange={(e) => setSettings({...settings, min_volume_threshold: parseInt(e.target.value) || 0})} 
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${!isEditSettings ? 'opacity-40' : 'opacity-100'}`} 
                style={{ backgroundColor: isEditSettings ? COLORS.borderOrange : COLORS.borderLight, accentColor: COLORS.primaryColor }} 
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COLORS.textLight }}>Allowed Track Duration</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold" style={{ color: COLORS.textLight }}>Minimum Seconds</label>
                  <input 
                    type="number" 
                    min="0"
                    disabled={!isEditSettings}
                    onKeyDown={blockNegative}
                    value={settings.min_audio_length === 0 ? "" : settings.min_audio_length} 
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      setSettings({...settings, min_audio_length: val});
                    }} 
                    className="w-full p-3 border rounded-xl text-[12px] font-bold outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400" 
                    style={{ backgroundColor: isEditSettings ? COLORS.bgWhite : COLORS.bgGray, borderColor: isEditSettings ? COLORS.primaryColor : COLORS.borderLight }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold" style={{ color: COLORS.textLight }}>Maximum Seconds</label>
                  <input 
                    type="number" 
                    min="0"
                    disabled={!isEditSettings}
                    onKeyDown={blockNegative}
                    value={settings.max_audio_length === 0 ? "" : settings.max_audio_length} 
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      setSettings({...settings, max_audio_length: val});
                    }} 
                    className="w-full p-3 border rounded-xl text-[12px] font-bold outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400" 
                    style={{ backgroundColor: isEditSettings ? COLORS.bgWhite : COLORS.bgGray, borderColor: isInvalidDuration ? COLORS.dangerColor : isEditSettings ? COLORS.primaryColor : COLORS.borderLight }} 
                  />
                  {isInvalidDuration && (
                    <p className="text-[10px] font-bold" style={{ color: COLORS.dangerColor }}>Max duration cannot be less than min duration</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => isEditSettings ? handleSaveSettings() : setIsEditSettings(true)} 
            disabled={loading} 
            className="w-full py-3.5 mt-6 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all tracking-wide shadow-md active:shadow-sm" 
            style={{ backgroundColor: COLORS.primaryColor, color: COLORS.bgWhite }}
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : isEditSettings ? <><Save size={14} /> Save Configurations</> : <><Save size={14} /> Edit Settings</>}
          </button>
        </div>

        <div className="p-5 rounded-2xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <div className="space-y-6">
            <h2 className="text-[14px] font-bold mb-2 tracking-wide" style={{ color: COLORS.primaryColor }}>Pricing & Subscriptions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'heritage_download', label: 'Heritage Track Download' },
                { id: 'fused_download', label: 'Fused Track Download' },
                { id: 'daily_sub', label: 'Daily Subscription' },
                { id: 'weekly_sub', label: 'Weekly Subscription' },
                { id: 'monthly_sub', label: 'Monthly Subscription' },
                { id: 'yearly_sub', label: 'Annual Subscription' }
              ].map((field) => (
                <div key={field.id} className="p-4 rounded-xl transition-all border" style={{ 
                  backgroundColor: isEditPricing ? COLORS.bgWhite : COLORS.bgGray,
                  borderColor: isEditPricing ? COLORS.primaryColor : "transparent"
                }}>
                  <label className="block text-[12px] font-bold mb-2" style={{ color: COLORS.textLight }}>{field.label}</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-bold" style={{ color: COLORS.textDark }}>$</span>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isEditPricing}
                      onKeyDown={blockNegative}
                      value={pricing[field.id] === 0 ? "" : pricing[field.id]}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value)).toString();
                        setPricing({...pricing, [field.id]: val});
                      }}
                      className="w-full bg-transparent text-[12px] font-bold outline-none disabled:text-gray-400"
                      style={{ color: COLORS.textDark }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => isEditPricing ? handleSavePricing() : setIsEditPricing(true)}
            disabled={pricingLoading}
            className="w-full py-3.5 mt-6 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all tracking-wide shadow-md active:shadow-sm"
            style={{ backgroundColor: COLORS.primaryColor, color: COLORS.bgWhite }}
          >
            {pricingLoading ? <Loader2 className="animate-spin" size={14} /> : isEditPricing ? <><Save size={14} /> Save Pricing</> : <><Save size={14} /> Edit Pricing</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;