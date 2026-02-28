import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { Track } from "../types";
import { Music, Volume2, Mic2, RefreshCw, Loader2, Upload, MessageSquare, CloudUpload, CheckCircle2, Download, Link2, ExternalLink, SlidersHorizontal, Activity, Sparkles } from "lucide-react";
import { COLORS } from "./supportives/colors";
import { FORM_FIELDS } from "./supportives/attributes";
import TransactionManager from "./TransactionManager";
import { useFusion } from "./FusionContext";

const EngineStatus = ({ apiBase }: { apiBase: string }) => {
  const [status, setStatus] = useState<{ colab: boolean; hf: boolean }>({ colab: false, hf: false });
  const [checking, setChecking] = useState(true);
  const [showUrl, setShowUrl] = useState<string | null>(null);

  const COLAB_URL = process.env.REACT_APP_FUSION_COLAB_URL1 || "not allowed";
  const HF_URL = process.env.REACT_APP_FUSION_HF_URL2 || "not allowed";

  const checkHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/fusion/engines-health`, {
        params: { _t: Date.now() }
      });
      setStatus(res.data);
    } catch (e) {
      console.warn("health check failed");
    } finally {
      setChecking(false);
    }
  }, [apiBase]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const toggleUrl = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUrl(prev => prev === id ? null : id);
  };

  return (
    <div className="absolute top-0 right-0 p-3 flex flex-col items-end gap-2 z-[999] pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {checking && <Loader2 size={10} className="animate-spin opacity-40" />}
        <div className="relative flex flex-col items-center">
          <button onClick={(e) => toggleUrl(e, "colab")} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shadow-sm cursor-pointer ${status.colab ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100" : "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"}`}>
            <span className="font-medium text-[8px] lowercase first-letter:uppercase">Primary engine (colab)</span>
            <div className={`w-1.5 h-1.5 rounded-full ${status.colab ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          </button>
          {showUrl === "colab" && (
            <a href={COLAB_URL} target="_blank" rel="noopener noreferrer" className="absolute top-full mt-2 right-0 bg-black/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 pointer-events-auto shadow-xl border border-white/10 whitespace-nowrap hover:bg-black transition-colors group">
              <Link2 size={10} className="text-amber-400" /><span className="font-mono text-[8px] border-b border-transparent group-hover:border-amber-400/50">{COLAB_URL}</span><ExternalLink size={8} className="opacity-40" />
            </a>
          )}
        </div>
        <div className="relative flex flex-col items-center">
          <button onClick={(e) => toggleUrl(e, "hf")} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all shadow-sm cursor-pointer ${status.hf ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100" : "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"}`}>
            <span className="font-medium text-[8px] lowercase first-letter:uppercase">Secondary engine (hf)</span>
            <div className={`w-1.5 h-1.5 rounded-full ${status.hf ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          </button>
          {showUrl === "hf" && (
            <a href={HF_URL} target="_blank" rel="noopener noreferrer" className="absolute top-full mt-2 right-0 bg-black/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 pointer-events-auto shadow-xl border border-white/10 whitespace-nowrap hover:bg-black transition-colors group">
              <Link2 size={10} className="text-amber-400" /><span className="font-mono text-[8px] border-b border-transparent group-hover:border-amber-400/50">{HF_URL}</span><ExternalLink size={8} className="opacity-40" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const MusicFusion: React.FC<{tracks: Track[], modernTracks: Track[], initialTrack: Track | null}> = ({ tracks, modernTracks, initialTrack }) => {
  const { fusionState, startFusion, resetFusionState } = useFusion();
  const [music1, setMusic1] = useState<Track | null>(null);
  const [music2, setMusic2] = useState<Track | null>(null);
  const [userFile, setUserFile] = useState<{file:File, url:string} | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [o1, setO1] = useState(false);
  const [o2, setO2] = useState(false);
  const [activePanel, setActivePanel] = useState<"context" | "detail" | null>(null);
  const [fusionPrice, setFusionPrice] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [isNewFusionSession, setIsNewFusionSession] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [params, setParams] = useState({
    gate: -45,
    clarity: 1.0,
    fusion_strength: 0.7,
    generation_temp: 1.0
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<string>("");
  const isAutoSaving = useRef(false);
  
  const API = process.env.REACT_APP_API_URL || "";
  const isSuperAdmin = sessionStorage.getItem("role") === "superadmin";

  const CULTURAL_FIELDS = [
    { key: "traditional_use", label: "Traditional use" },
    { key: "ensemble_role", label: "Ensemble role" },
    { key: "cultural_function", label: "Cultural function" },
    { key: "musical_behaviour", label: "Musical behaviour" },
    { key: "modern_use_tip", label: "Modern use tip" }
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (box1Ref.current && !box1Ref.current.contains(e.target as Node)) setO1(false);
      if (box2Ref.current && !box2Ref.current.contains(e.target as Node)) setO2(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/payment/pricing`);
      if (res.data && res.data.fused_download !== undefined) setFusionPrice(Number(res.data.fused_download));
    } catch (err) { console.warn("pricing fetch failed", err); }
  }, [API]);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);
  
  useEffect(() => {
    const meta = fusionState.metadata;
    if (meta?.sound_id && !music1) {
      const found = tracks.find(t => String(t.sound_id || (t as any).id) === String(meta.sound_id));
      if (found) { setMusic1(found); setS1(found.title || ""); }
    } else if (initialTrack && !music1) {
      setMusic1(initialTrack); setS1(initialTrack.title || "");
    }
  }, [fusionState.metadata, initialTrack, tracks, music1]);

  useEffect(() => {
    const checkExistingFusion = async () => {
      if (fusionState.isFusing || localLoading) return;
      const sid = music1?.sound_id || (music1 as any)?.id;
      const modernName = music2 ? ((music2 as any).category || (music2 as any).modern_category) : userFile?.file.name;
      if (!sid || !modernName) return;
      const currentSelectionKey = `${sid}-${modernName}`;
      if (lastSelectionRef.current === currentSelectionKey) return;
      lastSelectionRef.current = currentSelectionKey;
      try {
        const res = await axios.get(`${API}/api/fusion/check`, {
          params: { sound_id: sid, modern_sound: modernName }
        });
        if (res.data && res.data.fused_url) {
          fusionState.url = res.data.fused_url;
          setIsSaved(true);
          setIsNewFusionSession(false);
        } else { 
          setIsSaved(false); 
        }
      } catch (e) { 
        setIsSaved(false); 
      }
    };
    checkExistingFusion();
  }, [music1, music2, userFile, API, localLoading, fusionState]);

  useEffect(() => {
    const autoSave = async () => {
      const sid = music1?.sound_id || (music1 as any)?.id;
      if (!fusionState.url || isSaved || isAutoSaving.current || !music1 || !sid || fusionState.isFusing || localLoading) return;
      isAutoSaving.current = true;
      try {
        const audioResponse = await fetch(fusionState.url);
        const audioBlob = await audioResponse.blob();
        const fd = new FormData();
        fd.append("audio", audioBlob, `fused_${sid}.wav`);
        fd.append("sound_id", String(sid));
        fd.append("heritage_sound", music1.title || "");
        const categoryName = music2 ? ((music2 as any).category || (music2 as any).modern_category) : userFile?.file.name || "uploaded_style";
        fd.append("modern_sound", categoryName);
        fd.append("user_mail", sessionStorage.getItem("userEmail") || "shared_fusion");
        fd.append("style", "harmonic");
        fd.append("community", (music1 as any).community || "");
        fd.append("fused_url", fusionState.url);
        fd.append("gate", String(params.gate));
        fd.append("clarity", String(params.clarity));
        fd.append("strength", String(params.fusion_strength));
        fd.append("temp", String(params.generation_temp));
        await axios.post(`${API}/api/fusion/save`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setIsSaved(true);
        setIsNewFusionSession(false);
      } catch (err) { 
        console.error("silent save error:", err); 
      } finally { 
        isAutoSaving.current = false; 
      }
    };
    if (fusionState.url && !isSaved && isNewFusionSession) {
      autoSave();
    }
  }, [fusionState.url, music1, music2, userFile, isSaved, API, fusionState, localLoading, isNewFusionSession, params]);

  const getUrl = useCallback((t: Track, type: 'h'|'m') => {
    const url = type === 'h' ? t.sound_track_url : (t as any).modernaudio_url;
    if (!url) return "";
    return url.startsWith('http') ? url : `${API}${url}`;
  }, [API]);

  const handleFusion = async () => {
    const sid = music1?.sound_id || (music1 as any)?.id;
    if (!music1 || !sid || (!music2 && !userFile)) return;
    setLocalLoading(true);
    setIsSaved(false);
    resetFusionState();
    try {
      const [b1, b2] = await Promise.all([
        fetch(getUrl(music1, 'h')).then(r => r.blob()),
        userFile ? Promise.resolve(userFile.file) : fetch(getUrl(music2!, 'm')).then(r => r.blob())
      ]);
      const fd = new FormData();
      fd.append("melody", b1, "m.wav");
      fd.append("style", b2, "s.wav");
      fd.append("gate", String(params.gate));
      fd.append("clarity", String(params.clarity));
      fd.append("strength", String(params.fusion_strength));
      fd.append("temp", String(params.generation_temp));
      fd.append("mode", "harmonic");
      const meta = {
        sound_id: String(sid),
        heritage_sound: music1.title,
        modern_sound: music2 ? ((music2 as any).category || (music2 as any).modern_category) : userFile?.file.name,
        user_mail: sessionStorage.getItem("userEmail"),
        community: (music1 as any).community,
        gate: params.gate,
        clarity: params.clarity,
        strength: params.fusion_strength,
        temp: params.generation_temp
      };
      await startFusion(fd, `${API}/api/fusion/process`, meta);
      setIsNewFusionSession(true);
    } catch (error: any) {
      console.error("fusion process failed entirely", error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleFreeDownload = async () => {
    if (!fusionState.url || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(fusionState.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `fused_${music1?.title || "track"}.wav`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const isActuallyFusing = localLoading || fusionState.isFusing;
  const fH = useMemo(() => (tracks || []).filter(t => (t.title || "").toLowerCase().includes(s1.toLowerCase())), [tracks, s1]);
  const fM = useMemo(() => (modernTracks || []).filter(t => ((t as any).category || (t as any).modern_category || "").toLowerCase().includes(s2.toLowerCase()) || ((t as any).rhythm_style || "").toLowerCase().includes(s2.toLowerCase())), [modernTracks, s2]);
  const currentSoundId = music1?.sound_id || (music1 as any)?.id;
  const isSelectionComplete = music1 && (music2 || userFile);

  return (
    <div className="relative w-full min-h-screen flex flex-col m-0 p-0 overflow-x-hidden">
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ 
          backgroundImage: "url('/dj.png')", 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          width: '100vw',
          height: '100vh',
          filter: "brightness(0.7) contrast(1.1)",
        }}
      />
      
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-orange-500/10 blur-2xl animate-float"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: isActuallyFusing ? 0.4 : 0.1
            }}
          />
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(30px, -50px) rotate(180deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes fusionOrb {
          0% { transform: scale(1); opacity: 0.2; filter: blur(20px); }
          50% { transform: scale(1.5); opacity: 0.6; filter: blur(40px); }
          100% { transform: scale(1); opacity: 0.2; filter: blur(20px); }
        }
        @keyframes signalWave {
          0% { transform: scaleY(0.5); opacity: 0.3; }
          50% { transform: scaleY(3); opacity: 1; }
          100% { transform: scaleY(0.5); opacity: 0.3; }
        }
        .animate-float { animation: float linear infinite; }
        .fusion-orb { animation: fusionOrb 3s infinite ease-in-out; }
        .wave-bar {
          width: 6px;
          height: 30px;
          background: #f97316;
          border-radius: 4px;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.9);
        }
        .smart-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 4px;
          background: #f97316;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
        }
        .smart-slider {
          -webkit-appearance: none;
          background: rgba(255,255,255,0.1);
          height: 4px;
          border-radius: 10px;
        }
      `}} />

      <div className="flex-grow w-full max-w-7xl mx-auto p-4 flex flex-col relative z-10 text-[10px]" style={{ color: COLORS.textColor }}>
        {isSuperAdmin && <EngineStatus apiBase={API} />}
        
        <div className="w-full mb-8 flex flex-col items-center">
          <h2 className="text-[20px] font-bold uppercase tracking-widest mb-2 text-white text-center drop-shadow-lg">Track fusion</h2>
          <div className="w-full h-[1px] bg-amber-400/60" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {isSelectionComplete && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-600/20 rounded-full blur-[60px] fusion-orb z-0 pointer-events-none" />
          )}

          <div ref={box1Ref} className="p-3 border border-white/20 rounded-xl bg-white/90 backdrop-blur-md relative h-fit shadow-2xl z-50">
            <label className="font-bold opacity-50 flex items-center gap-1 uppercase"><Mic2 size={10}/> Heritage melody</label>
            <input className="w-full mt-1 p-2 bg-slate-50 rounded-lg border outline-none" value={s1} onChange={(e) => setS1(e.target.value)} onClick={() => { setS1(""); setO1(true); }} placeholder="type to search..." />
            {o1 && (
              <div className="absolute z-[100] bg-white border w-full left-0 mt-1 max-h-64 overflow-auto shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-xl border-orange-100">
                {fH.length > 0 ? fH.map(t => (
                  <div key={t.sound_id || (t as any).id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-orange-50 cursor-pointer" onClick={() => { setMusic1(t); setS1(t.title || ""); setO1(false); resetFusionState(); setIsSaved(false); setIsNewFusionSession(false); lastSelectionRef.current = ""; }}>
                    <span className="font-medium capitalize text-sm">{t.title?.toLowerCase()}</span>
                    <MessageSquare size={10} className="text-orange-400"/>
                  </div>
                )) : <div className="p-4 text-center opacity-40 italic">no tracks found</div>}
              </div>
            )}
            {music1 && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                <audio src={getUrl(music1, 'h')} controls className="w-full h-7 mb-2" />
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between mb-1">
                    <button onClick={() => setActivePanel(activePanel === "detail" ? null : "detail")} className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${activePanel === "detail" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>Detail</button>
                    <button onClick={() => setActivePanel(activePanel === "context" ? null : "context")} className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${activePanel === "context" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>Context</button>
                  </div>
                  {activePanel === "context" && <div className="p-1 bg-slate-50 rounded-lg">{CULTURAL_FIELDS.map(cf => <p key={cf.key}><span className="font-bold opacity-60">{cf.label}:</span> {(music1 as any)[cf.key] || "--"}</p>)}</div>}
                  {activePanel === "detail" && <div className="p-1 bg-slate-50 rounded-lg">{FORM_FIELDS.filter(f => !["file", "id", "sound_id", "contributor", "sound_track", "album_file", "sound_track_url", "album_file_url"].includes(f.name)).map(f => (<p key={f.name}><span className="font-bold opacity-60">{f.label}:</span> {(music1 as any)[f.name] || "-"}</p>))}</div>}
                </div>
              </div>
            )}
          </div>

          <div ref={box2Ref} className="p-3 border border-white/20 rounded-xl bg-white/90 backdrop-blur-md relative h-fit shadow-2xl z-50">
            <div className="flex justify-between items-center">
              <label className="font-bold opacity-50 flex items-center gap-1 uppercase"><Music size={10}/> Modern style</label>
              <button onClick={() => fileRef.current?.click()} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors shadow-sm" title="upload style">
                <Upload size={16}/>
              </button>
            </div>
            <input className="w-full mt-1 p-2 bg-slate-50 rounded-lg border outline-none" value={s2} onChange={(e) => setS2(e.target.value)} onClick={() => { setS2(""); setO2(true); }} placeholder="search style..." />
            <input type="file" ref={fileRef} hidden accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setUserFile({ file: f, url: URL.createObjectURL(f) }); setMusic2(null); setS2(f.name); setO2(false); resetFusionState(); setIsSaved(false); setIsNewFusionSession(false); lastSelectionRef.current = ""; } }} />
            {o2 && (
              <div className="absolute z-[100] bg-white border w-full left-0 mt-1 max-h-64 overflow-auto shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-xl border-orange-100">
                {fM.length > 0 ? fM.map(t => (
                  <div key={t.sound_id || (t as any).id} className="p-3 border-b last:border-0 hover:bg-orange-50 cursor-pointer" onClick={() => { setMusic2(t); setS2(`${(t as any).category || (t as any).modern_category} - ${(t as any).rhythm_style}`); setUserFile(null); setO2(false); resetFusionState(); setIsSaved(false); setIsNewFusionSession(false); lastSelectionRef.current = ""; }}>
                    <span className="font-medium capitalize text-sm">{((t as any).category || (t as any).modern_category)?.toLowerCase()} - {(t as any).rhythm_style?.toLowerCase()}</span>
                  </div>
                )) : <div className="p-4 text-center opacity-40 italic">no styles found</div>}
              </div>
            )}
            {(music2 || userFile) && <audio src={userFile?.url || getUrl(music2!, 'm')} controls className="w-full h-7 mt-2 animate-in fade-in" />}
          </div>
        </div>

        {isSelectionComplete && (
          <div className="w-full mt-6 p-6 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-6 duration-700 z-10">
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/30 rounded-xl shadow-inner"><SlidersHorizontal size={14} className="text-orange-400" /></div>
                <div>
                  <span className="block font-bold uppercase tracking-widest text-white/90">Fusion core parameters</span>
                  <span className="block text-[8px] opacity-40 uppercase tracking-tighter">Adjust engine logic</span>
                </div>
              </div>
              <Sparkles size={14} className={`text-orange-500 transition-opacity duration-1000 ${isActuallyFusing ? 'opacity-100 animate-pulse' : 'opacity-20'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {Object.entries(params).map(([key, val]) => (
                <div key={key} className="group space-y-3">
                  <div className="flex justify-between font-bold uppercase text-[9px] text-white/40 group-hover:text-orange-400 transition-colors">
                    <span>{key.replace('_', ' ')}</span>
                    <span className="text-orange-500 bg-orange-500/10 px-1.5 rounded">{val}{key === 'gate' ? 'db' : ''}</span>
                  </div>
                  <input 
                    type="range" 
                    min={key === 'gate' ? -60 : (key === 'generation_temp' ? 0.5 : 0)} 
                    max={key === 'gate' ? 0 : (key === 'clarity' ? 2.0 : 1.5)} 
                    step={key === 'gate' ? 1 : 0.05} 
                    value={val} 
                    onChange={(e) => setParams({...params, [key]: parseFloat(e.target.value)})} 
                    className="w-full smart-slider cursor-pointer" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 py-12 relative">
          {isActuallyFusing && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-20 h-24 pointer-events-none z-0">
              <div className="flex gap-2">
                {[...Array(10)].map((_, i) => <div key={i} className="wave-bar" style={{ animation: `signalWave 0.4s infinite ease-in-out ${i * 0.05}s` }} />)}
              </div>
              <div className="flex gap-2">
                {[...Array(10)].map((_, i) => <div key={i} className="wave-bar" style={{ animation: `signalWave 0.4s infinite ease-in-out ${i * 0.05}s` }} />)}
              </div>
            </div>
          )}

          <button onClick={handleFusion} disabled={isActuallyFusing || !isSelectionComplete} className="relative min-w-[240px] px-16 py-4 bg-orange-600 text-white uppercase rounded-full shadow-[0_15px_40px_rgba(234,88,12,0.4)] disabled:opacity-20 tracking-[0.2em] font-black flex items-center justify-center gap-4 border border-white/30 hover:scale-105 transition-all active:scale-95 z-20 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
            {isActuallyFusing ? <><Loader2 size={20} className="animate-spin" /> Analyzing audio...</> : <><Activity size={18} /> Fuse sounds</>}
          </button>

          {fusionState.url && music1 && currentSoundId && (
            <div className="w-full p-5 bg-white/95 backdrop-blur-xl border border-orange-100 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex items-center gap-4 animate-in zoom-in duration-500 z-20">
              <Volume2 size={16} className="text-orange-500"/><audio key={fusionState.url} src={fusionState.url} controls className="flex-1 h-10"/>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold uppercase text-[9px] shadow-inner">
                  {isSaved ? <><CheckCircle2 size={12} className="text-green-500" /> Cloud saved</> : <><CloudUpload size={12} /> Pending sync</>}
                </div>
                <div className="flex flex-col items-center">
                  {isSuperAdmin ? (
                    <button onClick={handleFreeDownload} disabled={isDownloading} className="p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg disabled:opacity-50 active:scale-90">
                      {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                  ) : (
                    <TransactionManager 
                      item={{ 
                        id: String(currentSoundId), 
                        user_mail: sessionStorage.getItem("userEmail") || "", 
                        heritage_sound: music1.title || "", 
                        community: (music1 as any).community || "", 
                        contributor_email: (music1 as any).user_mail || sessionStorage.getItem("userEmail") || "" 
                      }} 
                      currentUserEmail={sessionStorage.getItem("userEmail")} 
                      downloadUrl={fusionState.url} 
                      onOpenLogin={() => {}} 
                      price={fusionPrice} 
                      variant="fused" 
                    />
                  )}
                  <span className="text-[9px] font-black mt-1 uppercase text-orange-600">{isSuperAdmin ? "Free" : `${fusionPrice} usd`}</span>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => { setMusic1(null); setMusic2(null); setS1(""); setS2(""); setUserFile(null); resetFusionState(); setIsSaved(false); setIsNewFusionSession(false); setActivePanel(null); lastSelectionRef.current = ""; }} className="opacity-40 hover:opacity-100 text-white flex items-center gap-2 uppercase font-bold tracking-widest transition-all mb-10 hover:translate-y-[-2px] active:translate-y-0"><RefreshCw size={14}/> Reset session</button>
        </div>
      </div>
    </div>
  );
};

export default MusicFusion;