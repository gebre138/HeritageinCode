import React, { useState, useRef, useEffect, useCallback } from "react";
import { Track } from "../types";
import { Download, Play, Square, Zap, Activity, Cpu, Type, Music } from "lucide-react";

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
  const [isFusing, setIsFusing] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "";

  const samplePrompts = [
    "High-energy Cyberpunk techno with heavy bass",
    "Lo-fi hip hop with rainy atmosphere and jazzy piano",
    "Cinematic orchestral with powerful war drums",
    "80s Synthwave with neon-soaked pads",
    "Acoustic folk with soft guitar and clean vocals"
  ];

  useEffect(() => {
    const fetchModern = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/modern/jamendo`);
        if (res.ok) {
          const data = await res.json();
          setJamendoTracks(data.map((t: Track) => ({ ...t, isapproved: true })));
        }
      } catch (e) {}
    };
    fetchModern();
  }, [API_BASE]);

  const handleFusionModelStart = async () => {
    if (!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText)) return;
    setIsFusing(true);
    setUrl(null);
    try {
      const res1 = await fetch(music1.sound_track_url!);
      const b1 = await res1.blob();
      
      const formData = new FormData();
      formData.append("melody", b1, "melody.wav");

      if (fusionMode === "audio" && music2) {
        const res2 = await fetch(music2.modernaudio_url!);
        const b2 = await res2.blob();
        formData.append("style", b2, "style.wav");
      } else {
        formData.append("description", customText);
      }

      const response = await fetch(`${API_BASE}/api/modern/ai-fusion`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "FusionModel failed");
      }

      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(new Blob([resultBlob], { type: "audio/wav" }));
      setUrl(resultUrl);
    } catch (error: any) {
      console.error(error);
      alert(`AI Fusion failed: ${error.message}`);
    } finally {
      setIsFusing(false);
    }
  };

  const fH = tracks.filter(t => t.title.toLowerCase().includes(search1.toLowerCase()));
  const fM = [...initialModernTracks, ...jamendoTracks].filter(t => (t.category || t.title || "").toLowerCase().includes(search2.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded-lg bg-white relative h-full">
          <label className="text-xs font-bold block mb-2 uppercase text-slate-400">1. Heritage Base (Melody)</label>
          <input className="w-full border p-2 text-sm rounded outline-blue-500" placeholder="Search heritage track..." value={search1} onChange={e => {setSearch1(e.target.value); setIsOpen1(true);}} onFocus={() => setIsOpen1(true)} />
          {isOpen1 && (
            <div className="absolute z-20 w-full left-0 mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
              {fH.length > 0 ? fH.map(t => (
                <div key={t.sound_id} className="p-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-0" onClick={() => {setMusic1(t); setIsOpen1(false); setSearch1(t.title);}}>
                  {t.title} <span className="text-[10px] text-slate-400 block">{t.performer}</span>
                </div>
              )) : <div className="p-2 text-xs text-slate-400">No tracks found</div>}
            </div>
          )}
          {music1 && <audio controls src={music1.sound_track_url} className="w-full h-8 mt-2" />}
        </div>

        <div className="border p-4 rounded-lg bg-white relative h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase text-slate-400">2. Fusion Style</label>
            <div className="flex bg-slate-100 p-1 rounded-md">
              <button onClick={() => setFusionMode("audio")} className={`p-1 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${fusionMode === "audio" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}>
                <Music size={12} /> AUDIO
              </button>
              <button onClick={() => setFusionMode("text")} className={`p-1 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${fusionMode === "text" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}>
                <Type size={12} /> TEXT
              </button>
            </div>
          </div>

          {fusionMode === "audio" ? (
            <div className="relative flex-1">
              <input className="w-full border p-2 text-sm rounded outline-blue-500" placeholder="Search modern track..." value={search2} onChange={e => {setSearch2(e.target.value); setIsOpen2(true);}} onFocus={() => setIsOpen2(true)} />
              {isOpen2 && (
                <div className="absolute z-20 w-full left-0 mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                  {fM.length > 0 ? fM.map(t => (
                    <div key={t.sound_id} className="p-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-0" onClick={() => {setMusic2(t); setIsOpen2(false); setSearch2(t.category || t.title);}}>
                      {t.category || t.title}
                    </div>
                  )) : <div className="p-2 text-xs text-slate-400">No tracks found</div>}
                </div>
              )}
              {music2 && <audio controls src={music2.modernaudio_url} className="w-full h-8 mt-4" />}
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <textarea 
                className="w-full border p-2 text-sm rounded outline-blue-500 resize-none h-20" 
                placeholder="Describe the style (e.g. 80s pop, techno...)"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                {samplePrompts.map(p => (
                  <button key={p} onClick={() => setCustomText(p)} className="text-[9px] bg-slate-50 hover:bg-blue-50 border border-slate-200 px-2 py-1 rounded text-slate-500 transition-colors">
                    + {p.split(' ').slice(0, 2).join(' ')}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border p-6 rounded-lg bg-slate-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={handleFusionModelStart} 
            disabled={!music1 || (fusionMode === "audio" && !music2) || (fusionMode === "text" && !customText) || isFusing} 
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-black uppercase transition-all disabled:opacity-30"
          >
            {isFusing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                Processing Fusion...
              </div>
            ) : (
              <>
                <Zap size={16} fill="white" /> Generate AI Fusion
              </>
            )}
          </button>
          
          {url && (
            <a href={url} download="fusion_result.wav" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs font-black uppercase">
              <Download size={16}/> Download Result
            </a>
          )}
        </div>
        
        {isFusing && (
          <div className="mt-4 animate-pulse">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full animate-[progress_3s_ease-in-out_infinite]" style={{width: '45%'}}></div>
            </div>
          </div>
        )}

        {url && (
          <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 mb-3 text-green-400">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Mastered Audio Ready</span>
            </div>
            <audio controls src={url} className="w-full h-10" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicFusion;