import React, { useState, useEffect } from "react";
import { Track } from "../types";
import { Download, Activity, Music, Sliders, Volume2, Mic2, ChevronDown, PlayCircle, RefreshCw } from "lucide-react";

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
  const [url, setUrl] = useState<string | null>(null);

  const [melodyStrength, setMelodyStrength] = useState(70);
  const [styleStrength, setStyleStrength] = useState(50);

  const API_BASE = process.env.REACT_APP_API_URL || "";
  const samplePrompts = ["Cyberpunk techno", "Rainy Lo-fi", "Cinematic Orchestral", "80s Synthwave", "Acoustic Folk"];

  useEffect(() => {
    const fetchModern = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/modern/jamendo`);
        if (res.ok) {
          const data = await res.json();
          setJamendoTracks(data.map((t: Track) => ({ ...t, isapproved: true })));
        }
      } catch (e) { console.error(e); }
    };
    fetchModern();
  }, [API_BASE]);

  const handleReset = () => {
    setMusic1(null);
    setMusic2(null);
    setSearch1("");
    setSearch2("");
    setCustomText("");
    setUrl(null);
    setMelodyStrength(70);
    setStyleStrength(50);
    setIsOpen1(false);
    setIsOpen2(false);
    setShowPrompts(false);
  };

  const handleFusionModelStart = async () => {
    if (!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText)) return;
    setIsFusing(true);
    setUrl(null);
    try {
      const res1 = await fetch(music1.sound_track_url!);
      const b1 = await res1.blob();
      const formData = new FormData();
      formData.append("melody", b1, "melody.wav");
      formData.append("melody_strength", melodyStrength.toString());
      formData.append("style_strength", styleStrength.toString());

      if (fusionMode === "audio" && music2) {
        const res2 = await fetch(music2.modernaudio_url!);
        const b2 = await res2.blob();
        formData.append("style", b2, "style.wav");
      } else { formData.append("description", customText); }
      
      const response = await fetch(`${API_BASE}/api/modern/ai-fusion`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Fusion failed");
      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(new Blob([resultBlob], { type: "audio/wav" }));
      setUrl(resultUrl);
    } catch (error: any) { alert(error.message); } finally { setIsFusing(false); }
  };

  const fH = tracks.filter(t => t.title.toLowerCase().includes(search1.toLowerCase()));
  const fM = [...initialModernTracks, ...jamendoTracks].filter(t => (t.category || t.title || "").toLowerCase().includes(search2.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-slate-800 font-sans">
      <div className="flex items-center justify-between border-b pb-2">
        <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic">Track Fusion Engine</h1>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Studio Mode</span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border p-4 rounded-2xl shadow-sm relative h-[100px]">
            <label className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1"><Mic2 size={12}/> 1. Heritage Melody</label>
            <div className="relative">
              <input className="w-full bg-slate-50 border-none p-2.5 text-sm rounded-xl outline-none focus:ring-1 ring-blue-500 font-medium" placeholder="Select heritage..." value={search1} onChange={e => {setSearch1(e.target.value); setIsOpen1(true);}} onFocus={() => setIsOpen1(true)} />
              {isOpen1 && (
                <div className="absolute z-30 w-full mt-1 bg-white border rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {fH.map(t => (
                    <button key={t.sound_id} className="w-full text-left p-2.5 hover:bg-blue-50 text-xs border-b last:border-0 font-bold" onClick={() => {setMusic1(t); setIsOpen1(false); setSearch1(t.title);}}>
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border p-4 rounded-2xl shadow-sm relative h-[100px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Music size={12}/> 2. Target Style</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button onClick={() => setFusionMode("audio")} className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${fusionMode === "audio" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>AUDIO</button>
                <button onClick={() => setFusionMode("text")} className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${fusionMode === "text" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>TEXT</button>
              </div>
            </div>

            <div className="relative h-10">
              {fusionMode === "audio" ? (
                <div className="animate-in fade-in duration-300">
                  <input className="w-full bg-slate-50 border-none p-2.5 text-sm rounded-xl outline-none focus:ring-1 ring-blue-500 font-medium" placeholder="Select modern style..." value={search2} onChange={e => {setSearch2(e.target.value); setIsOpen2(true);}} onFocus={() => setIsOpen2(true)} />
                  {isOpen2 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {fM.map(t => (
                        <button key={t.sound_id} className="w-full text-left p-2.5 hover:bg-blue-50 text-xs border-b last:border-0 font-bold" onClick={() => {setMusic2(t); setIsOpen2(false); setSearch2(t.category || t.title);}}>
                          {t.category || t.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300 flex gap-2">
                  <input className="w-full bg-slate-50 p-2.5 text-sm rounded-xl outline-none focus:ring-1 ring-blue-500 font-medium" placeholder="Describe style (e.g. 80s techno)..." value={customText} onChange={(e) => setCustomText(e.target.value)} />
                  <button onClick={() => setShowPrompts(!showPrompts)} className="bg-slate-100 px-3 rounded-xl text-slate-500 hover:bg-blue-100 transition-colors"><ChevronDown size={14}/></button>
                  {showPrompts && (
                    <div className="absolute z-30 w-full top-full mt-1 bg-white border rounded-xl shadow-2xl p-1">
                      {samplePrompts.map(p => (
                        <button key={p} onClick={() => {setCustomText(p); setShowPrompts(false);}} className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-[10px] font-bold text-slate-600">{p}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-start">
          <button onClick={handleReset} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full border border-slate-100 transition-all tracking-tighter">
            <RefreshCw size={12} /> Reset Tracks
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl text-white">
        <div className="flex items-center gap-2 mb-6">
          <Sliders size={16} className="text-yellow-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Mastering Control Board</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Melody Weight</span><span className="text-yellow-400">{melodyStrength}%</span></div>
              <input type="range" min="0" max="100" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400" value={melodyStrength} onChange={(e) => setMelodyStrength(parseInt(e.target.value))} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Style Power</span><span className="text-blue-400">{styleStrength}%</span></div>
              <input type="range" min="0" max="100" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400" value={styleStrength} onChange={(e) => setStyleStrength(parseInt(e.target.value))} />
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 space-y-3 min-h-[120px]">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <PlayCircle size={14} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Preview Monitor</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black text-slate-600 w-10 uppercase">Melody</span>
                <audio controls src={music1?.sound_track_url} className="flex-1 h-6 filter grayscale invert opacity-40 hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black text-slate-600 w-10 uppercase">Style</span>
                {fusionMode === "audio" ? (
                  <audio controls src={music2?.modernaudio_url} className="flex-1 h-6 filter grayscale invert opacity-40 hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="flex-1 bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 min-h-[24px] flex items-center">
                    <p className="text-[10px] font-medium text-blue-400 italic truncate">{customText || "No text description entered..."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleFusionModelStart} 
            disabled={!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText) || isFusing} 
            className="px-12 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-full text-[13px] font-normal transition-all shadow-xl shadow-yellow-900/20 active:scale-95 disabled:opacity-20"
          >
            {isFusing ? "Fusing..." : "Fuse Track"}
          </button>
        </div>
      </div>

      {(isFusing || url) && (
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">{url ? <Volume2 size={24}/> : <Activity size={24} className="animate-pulse"/>}</div>
              <div>
                <p className="font-black text-sm uppercase text-slate-800 tracking-tighter">{url ? "Fusion Result" : "Neural Mixing..."}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Mastered Output</p>
              </div>
            </div>
            {url && (
              <a href={url} download="fused_track.wav" className="bg-slate-900 text-white p-3 rounded-xl hover:scale-110 transition-transform"><Download size={20}/></a>
            )}
          </div>
          {url ? <div className="p-4 bg-slate-50 rounded-2xl border"><audio controls src={url} className="w-full h-10 shadow-sm" /></div> : (
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
              <div className="bg-yellow-400 h-full animate-[progress_2s_infinite]" style={{width: '65%'}}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicFusion;