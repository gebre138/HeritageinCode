import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Track } from "../types";
import { Music, Volume2, Mic2, ChevronDown, RefreshCw, Loader2, AlertCircle, TriangleAlert } from "lucide-react";
import { COLORS } from "./supportives/colors";
import TransactionManager from "./TransactionManager";

interface Props {
  tracks: Track[];
  modernTracks: Track[];
}

const MusicFusion: React.FC<Props> = ({ tracks, modernTracks: initialModernTracks }) => {
  const [jamendoTracks, setJamendoTracks] = useState<Track[]>([]);
  const [music1, setMusic1] = useState<Track | null>(null);
  const [music2, setMusic2] = useState<Track | null>(null);
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [customText, setCustomText] = useState("");
  const [fusionMode, setFusionMode] = useState<"audio" | "text">("audio");
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [melodyStrength, setMelodyStrength] = useState(70);
  const [styleStrength, setStyleStrength] = useState(50);
  const [showError, setShowError] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [fusionPrice, setFusionPrice] = useState<number>(0);

  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const userEmail = sessionStorage.getItem("userEmail");
  const prompts = ["Cyberpunk techno", "Rainy Lo-fi", "Cinematic Orchestral", "80s Synthwave", "Acoustic Folk"];

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/payment/pricing`);
      if (res.data && res.data.fused_download !== undefined) {
        setFusionPrice(Number(res.data.fused_download));
      }
    } catch (err) {
      console.warn("failed to fetch pricing for fused tracks", err);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/api/modern/jamendo`).then(res => res.json()).then(data => setJamendoTracks(data.map((t: any) => ({ ...t, isapproved: true })))).catch(console.error);
    fetchPricing();
  }, [API_BASE, fetchPricing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef1.current && !containerRef1.current.contains(event.target as Node)) setIsOpen1(false);
      if (containerRef2.current && !containerRef2.current.contains(event.target as Node)) setIsOpen2(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = () => {
    setMusic1(null); setMusic2(null); setSearch1(""); setSearch2(""); setCustomText("");
    setUrl(null); setMelodyStrength(70); setStyleStrength(50); setProgress(0);
  };

  const handleFusion = async () => {
    if (!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText)) return;
    setIsFusing(true); setUrl(null); setProgress(0);
    const interval = setInterval(() => setProgress(prev => (prev < 95 ? prev + 5 : prev)), 200);
    try {
      const fd = new FormData();
      const b1 = await fetch(music1.sound_track_url!).then(r => r.blob());
      fd.append("melody", b1, "m.wav");
      fd.append("melody_strength", (melodyStrength/100).toString());
      fd.append("style_strength", (styleStrength/100).toString());
      if (fusionMode === "audio") {
        const b2 = await fetch(music2!.modernaudio_url!).then(r => r.blob());
        fd.append("style", b2, "s.wav");
      } else fd.append("description", customText);
      
      const res = await axios.post(`${API_BASE}/api/fusion/process`, fd, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "audio/wav" });
      const fusedUrl = URL.createObjectURL(blob);
      setUrl(fusedUrl);
      setProgress(100);
      
      const storageFd = new FormData();
      storageFd.append("audio", blob, "fused.wav");
      storageFd.append("sound_id", music1.sound_id || "");
      storageFd.append("heritage_sound", music1.title || "Unknown Heritage");
      storageFd.append("modern_sound", fusionMode === "audio" ? (music2?.category || music2?.title || "Modern") : "AI Text");
      storageFd.append("style", fusionMode === "audio" ? (music2?.category || "Style") : customText);
      storageFd.append("user_mail", sessionStorage.getItem("userEmail") || "anonymous");
      storageFd.append("community", music1.community || "General Community");
      
      await axios.post(`${API_BASE}/api/fusion/save`, storageFd);
    } catch (e) { 
      console.error("Fusion Frontend Error:", e);
      setShowError(true);
      setProgress(0);
    } finally { 
      clearInterval(interval); 
      setIsFusing(false); 
    }
  };

  const fH = tracks.filter(t => t.title.toLowerCase().includes(search1.toLowerCase()));
  const fM = [...initialModernTracks, ...jamendoTracks].filter(t => (t.category || t.title || "").toLowerCase().includes(search2.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 font-sans relative" style={{ color: COLORS.textColor }}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
      
      {loginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-t-8" style={{ borderColor: COLORS.primaryColor }}>
            <TriangleAlert className="mx-auto mb-4" size={48} style={{ color: COLORS.primaryColor }} />
            <p className="text-sm mb-6 px-4" style={{ color: COLORS.textGray }}>please login to download tracks.</p>
            <button 
              onClick={() => setLoginModal(false)} 
              className="w-full py-3 rounded-xl transition-all active:scale-95" 
              style={{ backgroundColor: COLORS.primaryColor, color: "white" }}
            >
              ok
            </button>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: COLORS.bgBlackOverlay }}>
          <div className="rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-6 animate-shake" style={{ backgroundColor: COLORS.bgWhite }}>
            <div className="flex justify-center"><div className="p-3 rounded-2xl" style={{ backgroundColor: COLORS.dangerBg }}><AlertCircle style={{ color: COLORS.dangerColor }} size={32} /></div></div>
            <div className="space-y-2"><p className="text-sm font-normal" style={{ color: COLORS.textLight }}>Fusion is not working currently, try later</p></div>
            <button onClick={() => setShowError(false)} className="w-full py-3 text-white rounded-2xl text-sm font-bold" style={{ backgroundColor: COLORS.textDark }}>Ok</button>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center pb-2 w-full">
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: COLORS.textDark }}>Track Fusion Engine</h1>
        <div className="w-full h-[1px] mt-2 opacity-50" style={{ backgroundColor: COLORS.primaryColor }}></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div ref={containerRef1} className="space-y-2">
          <div className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
            <label className="text-[12px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Mic2 size={16}/> Heritage melody</label>
            <div className="relative mt-2">
              <input className="w-full p-2 text-sm rounded-xl outline-none" style={{ backgroundColor: COLORS.bgSlate }} value={search1} onChange={e => {setSearch1(e.target.value); setIsOpen1(true);}} onFocus={() => {setSearch1(""); setIsOpen1(true); setMusic1(null);}} placeholder="Select heritage..." />
              {isOpen1 && <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-40 overflow-auto shadow-xl bg-white">{fH.map(t => <button key={t.sound_id} className="w-full text-left p-2 text-xs border-b last:border-0" onClick={() => {setMusic1(t); setIsOpen1(false); setSearch1(t.title);}}>{t.title}</button>)}</div>}
            </div>
          </div>
          <div className="px-2">
            <audio controls src={music1?.sound_track_url} className={`w-full h-8 transition-opacity ${music1 ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
          </div>
        </div>
        <div ref={containerRef2} className="space-y-2">
          <div className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[12px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Music size={12}/> Target style(Moder Track)</label>
              <div className="flex p-0.5 rounded-lg" style={{ backgroundColor: COLORS.bgToggle }}>
                {["audio", "text"].map(m => <button key={m} onClick={() => setFusionMode(m as any)} className={`px-2 py-1 rounded-md text-[12px] font-bold ${fusionMode === m ? "shadow-sm bg-white" : ""}`} style={{ color: fusionMode === m ? COLORS.info : COLORS.textMuted }}>{m === "audio" ? "Audio" : "Text"}</button>)}
              </div>
            </div>
            {fusionMode === "text" ? (
              <div className="flex gap-2">
                <input className="w-full p-2 text-sm rounded-xl outline-none" style={{ backgroundColor: COLORS.bgSlate }} value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Describe style..." />
                <button onClick={() => setShowPrompts(!showPrompts)} className="px-2 rounded-xl" style={{ backgroundColor: COLORS.bgToggle }}><ChevronDown size={14}/></button>
                {showPrompts && <div className="absolute z-30 w-full top-full border rounded-xl shadow-xl p-1 bg-white">{prompts.map(p => <button key={p} onClick={() => {setCustomText(p); setShowPrompts(false);}} className="w-full text-left p-2 rounded-lg text-[10px]">{p}</button>)}</div>}
              </div>
            ) : (
              <div className="relative">
                <input className="w-full p-2 text-sm rounded-xl outline-none" style={{ backgroundColor: COLORS.bgSlate }} value={search2} onChange={e => {setSearch2(e.target.value); setIsOpen2(true);}} onFocus={() => {setSearch2(""); setIsOpen2(true); setMusic2(null);}} placeholder="Select style..." />
                {isOpen2 && <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-40 overflow-auto shadow-xl bg-white">{fM.map(t => <button key={t.sound_id} className="w-full text-left p-2 text-xs border-b last:border-0" onClick={() => {setMusic2(t); setIsOpen2(false); setSearch2(t.category || t.title);}}>{t.category || t.title}</button>)}</div>}
              </div>
            )}
          </div>
          <div className="px-2">
            {fusionMode === "audio" && <audio controls src={music2?.modernaudio_url} className={`w-full h-8 transition-opacity ${music2 ? "opacity-100" : "opacity-0 pointer-events-none"}`} />}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-6 pt-4">
        <button 
          onClick={handleFusion} 
          disabled={isFusing || !music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText)} 
          className="px-8 py-2.5 rounded-full text-sm font-normal transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 border" 
          style={{ backgroundColor: COLORS.primaryColor, color: 'white', borderColor: COLORS.primaryColor }}
        >
          {isFusing && <Loader2 size={16} className="animate-spin" />}
          {isFusing ? `Fusing ${progress}%` : "Fuse track"}
        </button>
        <button onClick={handleReset} className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide opacity-60 hover:opacity-100" style={{ color: COLORS.textMuted }}><RefreshCw size={10} /> Reset track selection</button>
        {url && (
          <div className="w-full flex items-center gap-4 p-4 rounded-2xl border animate-in slide-in-from-bottom-2 bg-white" style={{ borderColor: COLORS.borderLight }}>
            <Volume2 style={{ color: COLORS.primaryColor }} size={20} />
            <audio controls src={url} className="flex-1 h-8" />
            
            <div className="flex flex-col items-center">
              <TransactionManager 
                item={{
                  id: String(music1?.sound_id || Date.now()),
                  user_mail: music1?.contributor || "anonymous",
                  heritage_sound: music1?.title || "Fused Session",
                  community: music1?.community || "General",
                  contributor_email: music1?.contributor || "anonymous"
                } as any}
                currentUserEmail={userEmail}
                downloadUrl={url}
                onOpenLogin={() => setLoginModal(true)}
                price={fusionPrice}
                variant="fused"
              />
              <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>
                {fusionPrice} usd
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicFusion;