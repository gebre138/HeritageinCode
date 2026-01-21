import React, { useState, useEffect, useRef } from "react";
import { Track } from "../types";
import { Download, Music, Volume2, Mic2, ChevronDown, PlayCircle, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { COLORS } from "./supportives/colors";

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

  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const gainNode1 = useRef<GainNode | null>(null);
  const gainNode2 = useRef<GainNode | null>(null);
  const connectedElements = useRef(new Set<HTMLMediaElement>());

  const API_BASE = process.env.REACT_APP_API_URL || "";
  const prompts = ["Cyberpunk techno", "Rainy Lo-fi", "Cinematic Orchestral", "80s Synthwave", "Acoustic Folk"];

  useEffect(() => {
    fetch(`${API_BASE}/api/modern/jamendo`).then(res => res.json()).then(data => setJamendoTracks(data.map((t: any) => ({ ...t, isapproved: true })))).catch(console.error);
  }, [API_BASE]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef1.current && !containerRef1.current.contains(event.target as Node)) setIsOpen1(false);
      if (containerRef2.current && !containerRef2.current.contains(event.target as Node)) setIsOpen2(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode1.current = audioCtx.current.createGain();
      gainNode2.current = audioCtx.current.createGain();
      gainNode1.current.connect(audioCtx.current.destination);
      gainNode2.current.connect(audioCtx.current.destination);
    }
  }, []);

  useEffect(() => {
    if (gainNode1.current) gainNode1.current.gain.value = melodyStrength / 100;
  }, [melodyStrength]);

  useEffect(() => {
    if (gainNode2.current) gainNode2.current.gain.value = styleStrength / 100;
  }, [styleStrength]);

  const setupAudio = (element: HTMLAudioElement | null, gainNode: React.MutableRefObject<GainNode | null>) => {
    if (!element || !audioCtx.current || !gainNode.current || connectedElements.current.has(element)) return;
    try {
      const source = audioCtx.current.createMediaElementSource(element);
      source.connect(gainNode.current);
      connectedElements.current.add(element);
    } catch (e) {
      console.error("Audio connection error", e);
    }
  };

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
      const res = await fetch(`${API_BASE}/api/modern/ai-fusion`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Fusion failed");
      const blob = await res.blob();
      setProgress(100);
      setUrl(URL.createObjectURL(blob));
    } catch (e) { 
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
    <div className="max-w-4xl mx-auto p-4 space-y-4 font-sans relative" style={{ color: COLORS.textColor }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ backgroundColor: COLORS.bgBlackOverlay }}>
          <div className="rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-6 animate-shake" style={{ backgroundColor: COLORS.bgWhite }}>
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: COLORS.dangerBg }}>
                <AlertCircle style={{ color: COLORS.dangerColor }} size={32} />
              </div>
            </div>
            <div className="space-y-2">
              
              <p className="text-sm leading-relaxed font-normal" style={{ color: COLORS.textLight }}>Fusion is not working currently, try later</p>
            </div>
            <button 
              onClick={() => setShowError(false)}
              className="w-full py-3 text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: COLORS.textDark }}
            >
              Ok
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center pb-2 w-full">
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: COLORS.textDark }}>Track Fusion Engine</h1>
        <div className="w-full h-[1px] mt-2 opacity-50" style={{ backgroundColor: COLORS.primaryColor }}></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div ref={containerRef1} className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <label className="text-[9px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Mic2 size={12}/> Heritage melody</label>
          <div className="relative mt-2">
            <input className="w-full p-2 text-sm rounded-xl outline-none font-normal" style={{ backgroundColor: COLORS.bgSlate }} value={search1} onChange={e => {setSearch1(e.target.value); setIsOpen1(true);}} onFocus={() => setIsOpen1(true)} placeholder="Select heritage..." />
            {isOpen1 && (
              <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-40 overflow-auto shadow-xl" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
                {fH.map(t => <button key={t.sound_id} className="w-full text-left p-2 text-xs border-b last:border-0 font-normal transition-colors" style={{ borderColor: COLORS.borderMain }} onClick={() => {setMusic1(t); setIsOpen1(false); setSearch1(t.title);}}>{t.title}</button>)}
              </div>
            )}
          </div>
        </div>

        <div ref={containerRef2} className="p-4 rounded-2xl h-[100px] relative border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[9px] font-bold flex items-center gap-1 tracking-wider" style={{ color: COLORS.textMuted }}><Music size={12}/> Target style</label>
            <div className="flex p-0.5 rounded-lg" style={{ backgroundColor: COLORS.bgToggle }}>
              {["audio", "text"].map(m => <button key={m} onClick={() => setFusionMode(m as any)} className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all ${fusionMode === m ? "shadow-sm" : ""}`} style={{ backgroundColor: fusionMode === m ? COLORS.bgWhite : "transparent", color: fusionMode === m ? COLORS.info : COLORS.textMuted }}>
                {m === "audio" ? "Audio" : "Text"}
              </button>)}
            </div>
          </div>
          {fusionMode === "text" ? (
            <div className="flex gap-2">
              <input className="w-full p-2 text-sm rounded-xl outline-none font-normal" style={{ backgroundColor: COLORS.bgSlate }} value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Describe style..." />
              <button onClick={() => setShowPrompts(!showPrompts)} className="px-2 rounded-xl" style={{ backgroundColor: COLORS.bgToggle }}><ChevronDown size={14}/></button>
              {showPrompts && <div className="absolute z-30 w-full top-full border rounded-xl shadow-xl p-1" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>{prompts.map(p => <button key={p} onClick={() => {setCustomText(p); setShowPrompts(false);}} className="w-full text-left p-2 rounded-lg text-[10px] font-normal" style={{ color: COLORS.textColor }}>{p}</button>)}</div>}
            </div>
          ) : (
            <div className="relative">
              <input className="w-full p-2 text-sm rounded-xl outline-none font-normal" style={{ backgroundColor: COLORS.bgSlate }} value={search2} onChange={e => {setSearch2(e.target.value); setIsOpen2(true);}} onFocus={() => setIsOpen2(true)} placeholder="Select style..." />
              {isOpen2 && (
                <div className="absolute z-30 w-full mt-1 border rounded-xl max-h-40 overflow-auto shadow-xl" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
                  {fM.map(t => <button key={t.sound_id} className="w-full text-left p-2 text-xs border-b last:border-0 font-normal transition-colors" style={{ borderColor: COLORS.borderMain }} onClick={() => {setMusic2(t); setIsOpen2(false); setSearch2(t.category || t.title);}}>{t.category || t.title}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button onClick={handleReset} className="flex items-center gap-1.5 text-[10px] font-bold transition-all tracking-widest" style={{ color: COLORS.textMuted }}><RefreshCw size={12} /> Reset tracks</button>

      <div className="rounded-[2rem] p-6 shadow-2xl" style={{ backgroundColor: COLORS.aiTerminal }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            {[ { n: "Melody weight", c: COLORS.warning, v: melodyStrength, set: setMelodyStrength },
               { n: "Style power", c: COLORS.info, v: styleStrength, set: setStyleStrength }
            ].map(s => (
              <div key={s.n} className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold tracking-wider" style={{ color: COLORS.textMuted }}><span>{s.n}</span><span style={{ color: s.c }} className="font-normal">{s.v}%</span></div>
                <input type="range" className="w-full h-1 rounded-lg appearance-none accent-current" style={{ backgroundColor: COLORS.bgBlackOverlay, color: s.c }} value={s.v} onChange={e => s.set(parseInt(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: COLORS.aiAccentMuted, borderColor: COLORS.textDark }}>
            <span className="text-[11px] font-bold flex items-center gap-2 tracking-wider" style={{ color: COLORS.textMuted }}><PlayCircle size={14}/> Preview monitor</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-bold w-10" style={{ color: COLORS.textMuted }}>Melody</span>
                <audio crossOrigin="anonymous" ref={el => setupAudio(el, gainNode1)} onPlay={() => audioCtx.current?.resume()} controls src={music1?.sound_track_url} className="flex-1 h-6 filter grayscale invert opacity-40 hover:opacity-100" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-bold w-10" style={{ color: COLORS.textMuted }}>Style</span>
                {fusionMode === "audio" ? (
                  <audio crossOrigin="anonymous" ref={el => setupAudio(el, gainNode2)} onPlay={() => audioCtx.current?.resume()} controls src={music2?.modernaudio_url} className="flex-1 h-6 filter grayscale invert opacity-40 hover:opacity-100" />
                ) : (
                  <div className="flex-1 text-[10px] italic truncate p-1 rounded font-normal" style={{ color: COLORS.info, backgroundColor: COLORS.bgBlackOverlay }}>{customText || "No description..."}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-6">
            <button onClick={handleFusion} disabled={isFusing || !music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText)} className="px-12 py-3.5 rounded-full text-[13px] font-normal transition-all flex items-center gap-3 active:scale-95 disabled:opacity-20 tracking-widest" style={{ backgroundColor: COLORS.primaryColor, color: COLORS.bgWhite }}>
              {isFusing && <Loader2 size={16} className="animate-spin" />}
              {isFusing ? "Processing..." : "Fuse track"}
            </button>
            {isFusing && <span className="text-xl font-normal tabular-nums" style={{ color: COLORS.warning }}>{progress}%</span>}
          </div>
          {url && (
            <div className="w-full flex items-center gap-4 p-4 rounded-2xl border animate-in zoom-in-95" style={{ backgroundColor: COLORS.bgBlackOverlay, borderColor: COLORS.textDark }}>
              <Volume2 style={{ color: COLORS.warning }} size={20} />
              <audio controls src={url} className="flex-1 h-8" />
              <a href={url} download="fused.wav" className="p-2 rounded-lg hover:scale-110 transition-transform" style={{ backgroundColor: COLORS.warning, color: COLORS.bgWhite }}><Download size={18}/></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicFusion;