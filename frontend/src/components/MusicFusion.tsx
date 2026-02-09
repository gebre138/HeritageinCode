import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Track } from "../types";
import { Music, Volume2, Mic2, RefreshCw, Loader2, AlertCircle, TriangleAlert, Upload, SlidersHorizontal, WifiOff} from "lucide-react";
import { COLORS } from "./supportives/colors";
import TransactionManager from "./TransactionManager";
import { useFusion } from "./FusionContext";

interface Props {
  tracks: Track[];
  modernTracks: Track[];
  initialTrack: Track | null;
}

const MusicFusion: React.FC<Props> = ({ tracks, modernTracks: initialModernTracks, initialTrack }) => {
  const { fusionState, startFusion, resetFusionState } = useFusion();
  const [jamendoTracks, setJamendoTracks] = useState<Track[]>([]);
  const [music1, setMusic1] = useState<Track | null>(null);
  const [music2, setMusic2] = useState<Track | null>(null);
  const [userModernFile, setUserModernFile] = useState<File | null>(null);
  const [userModernUrl, setUserModernUrl] = useState<string | null>(null);
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [fusionMode, setFusionMode] = useState<"audio" | "upload">("audio");
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [fusionPrice, setFusionPrice] = useState<number>(0);
  const [melodyStrength, setMelodyStrength] = useState(70);
  const [styleStrength, setStyleStrength] = useState(50);
  const [networkError, setNetworkError] = useState(false);
  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef1 = useRef<HTMLAudioElement | null>(null);
  const audioRef2 = useRef<HTMLAudioElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const filter1 = useRef<BiquadFilterNode | null>(null);
  const filter2 = useRef<BiquadFilterNode | null>(null);
  const source1 = useRef<MediaElementAudioSourceNode | null>(null);
  const source2 = useRef<MediaElementAudioSourceNode | null>(null);
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const userEmail = sessionStorage.getItem("userEmail");

  const initAudio = (ref: React.RefObject<HTMLAudioElement | null>, filterRef: React.MutableRefObject<BiquadFilterNode | null>, sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>) => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ref.current && !sourceRef.current) {
      sourceRef.current = audioCtx.current.createMediaElementSource(ref.current);
      filterRef.current = audioCtx.current.createBiquadFilter();
      filterRef.current.type = "peaking";
      filterRef.current.frequency.value = 1000;
      filterRef.current.Q.value = 1.0;
      sourceRef.current.connect(filterRef.current);
      filterRef.current.connect(audioCtx.current.destination);
    }
  };

  const handleSliderChange = async (val: number, isMelody: boolean) => {
    if (audioCtx.current?.state === "suspended") await audioCtx.current.resume();
    if (isMelody) {
      setMelodyStrength(val);
      if (filter1.current) filter1.current.gain.setTargetAtTime((val - 50) * 0.4, audioCtx.current!.currentTime, 0.1);
    } else {
      setStyleStrength(val);
      if (filter2.current) filter2.current.gain.setTargetAtTime((val - 50) * 0.4, audioCtx.current!.currentTime, 0.1);
    }
  };

  useEffect(() => { if (music1 && audioRef1.current) initAudio(audioRef1, filter1, source1); }, [music1]);
  useEffect(() => { if ((music2 || userModernUrl) && audioRef2.current) initAudio(audioRef2, filter2, source2); }, [music2, userModernUrl]);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/payment/pricing`);
      if (res.data && res.data.fused_download !== undefined) setFusionPrice(Number(res.data.fused_download));
    } catch (err) { console.warn(err); }
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/api/modern/jamendo`).then(res => res.json()).then(data => setJamendoTracks(data.map((t: any) => ({ ...t, isapproved: true })))).catch(console.error);
    fetchPricing();
  }, [API_BASE, fetchPricing]);

  useEffect(() => { if (initialTrack) { setMusic1(initialTrack); setSearch1(initialTrack.title?.toLowerCase() || ""); } }, [initialTrack]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef1.current && !containerRef1.current.contains(event.target as Node)) setIsOpen1(false);
      if (containerRef2.current && !containerRef2.current.contains(event.target as Node)) setIsOpen2(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUserModernFile(file); setUserModernUrl(URL.createObjectURL(file)); setMusic2(null); setSearch2(""); }
  };

  const handleReset = () => {
    setMusic1(null); setSearch1(""); setMusic2(null); setSearch2("");
    setUserModernFile(null); setUserModernUrl(null);
    setMelodyStrength(70); setStyleStrength(50);
    setNetworkError(false);
    resetFusionState();
  };

  const handleFusion = async () => {
    if (!navigator.onLine) {
      setNetworkError(true);
      return;
    }
    if (!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "upload" && !userModernFile)) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const fd = new FormData();
      const b1 = await fetch(music1.sound_track_url!, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error("failed to fetch melody");
        return r.blob();
      });
      clearTimeout(timeoutId);
      fd.append("melody", b1, "m.wav");
      fd.append("melody_strength", (melodyStrength/100).toString());
      fd.append("style_strength", (styleStrength/100).toString());
      if (fusionMode === "audio") {
        const timeoutId2 = setTimeout(() => controller.abort(), 15000);
        const b2 = await fetch(music2!.modernaudio_url!, { signal: controller.signal }).then(r => {
          if (!r.ok) throw new Error("failed to fetch style");
          return r.blob();
        });
        clearTimeout(timeoutId2);
        fd.append("style", b2, "s.wav");
      } else {
        fd.append("style", userModernFile!, "u.wav");
      }
      const metadata = { sound_id: music1.sound_id, heritage_sound: music1.title, modern_sound: fusionMode === "audio" ? music2?.title : "upload", user_mail: userEmail, community: music1.community };
      startFusion(fd, API_BASE, metadata);
    } catch (err) {
      console.error("network/fetch error:", err);
      setNetworkError(true);
      resetFusionState();
    }
  };

  const fH = (tracks || []).filter(t => (t.title || "").toLowerCase().includes(search1.toLowerCase()));
  const fM = [...(initialModernTracks || []), ...(jamendoTracks || [])].filter(t => {
    const combined = `${t.category || ""} ${t.title || ""} ${t.rhythm_style || ""} ${t.harmony_type || ""} ${t.mood || ""}`.toLowerCase();
    return combined.includes(search2.toLowerCase());
  });

  return (
    <div className="max-w-4xl mx-auto pt-0 p-4 space-y-6 font-sans relative" style={{ color: COLORS.textColor }}>
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .animate-shake { animation: shake 0.4s ease-in-out; }`}</style>
      {loginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-sm w-full shadow-2xl text-center border-t-8" style={{ borderColor: COLORS.primaryColor }}>
            <TriangleAlert className="mx-auto mb-4" size={48} style={{ color: COLORS.primaryColor }} />
            <p className="text-[13px] mb-6 px-4" style={{ color: COLORS.textGray }}>please login to download tracks.</p>
            <button onClick={() => setLoginModal(false)} className="w-full py-3 rounded-xl transition-all active:scale-95" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>ok</button>
          </div>
        </div>
      )}
      {(fusionState.error || networkError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: COLORS.bgBlackOverlay }}>
          <div className="rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-6 animate-shake" style={{ backgroundColor: COLORS.bgWhite }}>
            <div className="flex justify-center"><div className="p-3 rounded-2xl" style={{ backgroundColor: COLORS.dangerBg }}>{networkError ? <WifiOff style={{ color: COLORS.dangerColor }} size={32} /> : <AlertCircle style={{ color: COLORS.dangerColor }} size={32} />}</div></div>
            <div className="space-y-2"><p className="text-[13px] font-normal" style={{ color: COLORS.textLight }}>{networkError ? "internet connection lost or timeout" : "fusion failed, try again later"}</p></div>
            <button onClick={() => { setNetworkError(false); resetFusionState(); }} className="w-full py-3 text-white rounded-2xl text-sm font-bold" style={{ backgroundColor: COLORS.textDark }}>ok</button>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center pb-2 w-full">
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: COLORS.textDark }}>Track Fusion Engine</h1>
        <div className="w-full h-[1px] mt-2 opacity-50" style={{ backgroundColor: COLORS.primaryColor }}></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div ref={containerRef1} className="space-y-4">
          <div className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
            <label className="text-[12px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Mic2 size={16}/> heritage melody</label>
            <div className="relative mt-2">
              <input className="w-full p-2 text-sm rounded-xl outline-none" style={{ backgroundColor: COLORS.bgSlate }} value={search1} onChange={e => {setSearch1(e.target.value); setIsOpen1(true);}} onFocus={() => {setSearch1(""); setIsOpen1(true); setMusic1(null);}} placeholder="select heritage..." />
              {isOpen1 && <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-40 overflow-auto shadow-xl bg-white">{(fH || []).map(t => <button key={t.sound_id} className="w-full text-left p-2 text-[13px] border-b last:border-0 hover:bg-gray-50" onClick={() => {setMusic1(t); setIsOpen1(false); setSearch1(t.title?.toLowerCase() || "");}}>{(t.title || "unknown").toLowerCase()}</button>)}</div>}
            </div>
          </div>
          {music1 && (
            <div className="p-4 rounded-2xl border bg-white/50 space-y-3" style={{ borderColor: COLORS.borderLight }}>
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase opacity-60">control board</span><SlidersHorizontal size={14} className="opacity-40" /></div>
              <audio ref={audioRef1} crossOrigin="anonymous" controls src={music1.sound_track_url} className="w-full h-8" />
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold"><span>bandwidth strength</span><span>{melodyStrength}%</span></div>
                <input type="range" min="0" max="100" value={melodyStrength} onChange={(e) => handleSliderChange(Number(e.target.value), true)} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
            </div>
          )}
        </div>
        <div ref={containerRef2} className="space-y-4">
          <div className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[12px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Music size={12}/> modern style</label>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1"><span className="text-[9px] font-bold opacity-50">Use existing library</span><button onClick={() => setFusionMode("audio")} className={`p-1.5 rounded-lg transition-all ${fusionMode === "audio" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}><Music size={14} /></button></div>
                <div className="flex items-center gap-1"><span className="text-[9px] font-bold opacity-50">Upload your track</span><button onClick={() => { setFusionMode("upload"); fileInputRef.current?.click(); }} className={`p-1.5 rounded-lg transition-all ${fusionMode === "upload" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}><Upload size={14} /></button></div>
              </div>
            </div>
            {fusionMode === "upload" ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-dashed" style={{ borderColor: COLORS.borderLight }}>
                <span className="text-[11px] truncate flex-1 opacity-70">{userModernFile ? userModernFile.name : "no file selected"}</span>
                <input type="file" ref={fileInputRef} hidden accept="audio/*" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-orange-600 uppercase">change</button>
              </div>
            ) : (
              <div className="relative">
                <input className="w-full p-2 text-sm rounded-xl outline-none" style={{ backgroundColor: COLORS.bgSlate }} value={search2} onChange={e => {setSearch2(e.target.value); setIsOpen2(true);}} onFocus={() => {setSearch2(""); setIsOpen2(true); setMusic2(null);}} placeholder="search library..." />
                {isOpen2 && (
                  <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-48 overflow-auto shadow-xl bg-white">
                    {(fM || []).map(t => {
                      const finalLabel = [t.rhythm_style, t.mood].filter(Boolean).join(" - ").toLowerCase() || (t.category || t.title || "unknown").toLowerCase();
                      return <button key={t.sound_id} className="w-full text-left p-3 border-b last:border-0 hover:bg-gray-50 text-[13px] font-medium text-gray-700" onClick={() => {setMusic2(t); setIsOpen2(false); setSearch2(finalLabel);}}>{finalLabel}</button>;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          {(music2 || userModernUrl) && (
            <div className="p-4 rounded-2xl border bg-white/50 space-y-3" style={{ borderColor: COLORS.borderLight }}>
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase opacity-60">control board</span><SlidersHorizontal size={14} className="opacity-40" /></div>
              <audio ref={audioRef2} crossOrigin="anonymous" controls src={fusionMode === 'upload' ? userModernUrl! : music2?.modernaudio_url} className="w-full h-8" />
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold"><span>bandwidth strength</span><span>{styleStrength}%</span></div>
                <input type="range" min="0" max="100" value={styleStrength} onChange={(e) => handleSliderChange(Number(e.target.value), false)} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-6 pt-4">
        <button onClick={handleFusion} disabled={fusionState.isFusing || !music1 || (fusionMode === "audio" && !music2) || (fusionMode === "upload" && !userModernFile)} className="px-8 py-2.5 rounded-full text-sm font-normal transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 border" style={{ backgroundColor: COLORS.primaryColor, color: 'white', borderColor: COLORS.primaryColor }}>
          {fusionState.isFusing && <Loader2 size={16} className="animate-spin" />}
          {fusionState.isFusing ? `Fusing ${fusionState.progress}%` : "Fuse Track"}
        </button>
        <button onClick={handleReset} className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide opacity-60 hover:opacity-100" style={{ color: COLORS.textMuted }}><RefreshCw size={10} /> Reset Selections</button>
        {fusionState.url && (
          <div className="w-full flex items-center gap-4 p-4 rounded-2xl border animate-in slide-in-from-bottom-2 bg-white" style={{ borderColor: COLORS.borderLight }}>
            <Volume2 style={{ color: COLORS.primaryColor }} size={20} />
            <audio controls src={fusionState.url} className="flex-1 h-8" />
            <div className="flex flex-col items-center">
              <TransactionManager 
                item={{ id: String(music1?.sound_id || Date.now()), user_mail: music1?.contributor || "anonymous", heritage_sound: music1?.title || "fused session", community: music1?.community || "general", contributor_email: music1?.contributor || "anonymous" } as any}
                currentUserEmail={userEmail} downloadUrl={fusionState.url} onOpenLogin={() => setLoginModal(true)} price={fusionPrice} variant="fused"
              />
              <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>{fusionPrice} usd</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicFusion;