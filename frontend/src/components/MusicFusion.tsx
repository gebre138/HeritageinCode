import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { Track } from "../types";
import { Music, Volume2, Mic2, RefreshCw, Loader2, Upload, Sliders, ChevronDown, ChevronUp, MessageSquare, CloudUpload, CheckCircle2, AlertCircle } from "lucide-react";
import { COLORS } from "./supportives/colors";
import { FORM_FIELDS } from "./supportives/attributes";
import TransactionManager from "./TransactionManager";
import { useFusion } from "./FusionContext";

const MusicFusion: React.FC<{tracks: Track[], modernTracks: Track[], initialTrack: Track | null}> = ({ tracks, modernTracks, initialTrack }) => {
  const { fusionState, startFusion, resetFusionState } = useFusion();
  const [music1, setMusic1] = useState<Track | null>(null);
  const [music2, setMusic2] = useState<Track | null>(null);
  const [userFile, setUserFile] = useState<{file:File, url:string} | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [o1, setO1] = useState(false);
  const [o2, setO2] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const [activePanel, setActivePanel] = useState<"context" | "detail" | null>(null);
  const [fusionPrice, setFusionPrice] = useState<number>(0);
  const [gate, setGate] = useState("-45");
  const [clarity, setClarity] = useState("1");
  const [outputMode, setOutputMode] = useState("harmonic");
  const [isSaved, setIsSaved] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<string>("");
  const isAutoSaving = useRef(false);
  
  const API = process.env.REACT_APP_API_URL || "";
  const COLAB_URL = process.env.REACT_APP_COLAB_URL || API;

  const CULTURAL_FIELDS = [
    { key: "traditional_use", label: "traditional use" },
    { key: "ensemble_role", label: "ensemble role" },
    { key: "cultural_function", label: "cultural function" },
    { key: "musical_behaviour", label: "musical behaviour" },
    { key: "modern_use_tip", label: "modern use tip" }
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
      const userMail = sessionStorage.getItem("userEmail");
      if (!sid || !modernName || !userMail) return;
      const currentSelectionKey = `${sid}-${modernName}-${userMail}`;
      if (lastSelectionRef.current === currentSelectionKey) return;
      lastSelectionRef.current = currentSelectionKey;
      try {
        const res = await axios.get(`${API}/api/fusion/check`, {
          params: { sound_id: sid, modern_sound: modernName, user_mail: userMail }
        });
        if (res.data && res.data.fused_url) {
          fusionState.url = res.data.fused_url;
          setIsSaved(true);
        } else { setIsSaved(false); }
      } catch (e) { setIsSaved(false); }
    };
    checkExistingFusion();
  }, [music1, music2, userFile, API, localLoading, fusionState]);

  useEffect(() => {
    const autoSave = async () => {
      const sid = music1?.sound_id || (music1 as any)?.id;
      if (!fusionState.url || isSaved || isAutoSaving.current || !music1 || !sid) return;
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
        fd.append("user_mail", sessionStorage.getItem("userEmail") || "");
        fd.append("style", outputMode);
        fd.append("community", (music1 as any).community || "");
        fd.append("fused_url", fusionState.url);
        await axios.post(`${API}/api/fusion/save`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setIsSaved(true);
      } catch (err) { console.error("silent save error:", err); } finally { isAutoSaving.current = false; }
    };
    if (fusionState.url && !isSaved) autoSave();
  }, [fusionState.url, music1, music2, userFile, isSaved, API, outputMode]);

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
    setServerError(null);
    resetFusionState();
    console.log("[log] step 1: starting download of source blobs");
    try {
      const [b1, b2] = await Promise.all([
        fetch(getUrl(music1, 'h')).then(r => r.blob()),
        userFile ? Promise.resolve(userFile.file) : fetch(getUrl(music2!, 'm')).then(r => r.blob())
      ]);
      console.log("[log] step 2: blobs retrieved.");
      const fd = new FormData();
      fd.append("melody", b1, "m.wav");
      fd.append("style", b2, "s.wav");
      fd.append("gate", gate);
      fd.append("clarity", clarity);
      fd.append("mode", outputMode);
      const meta = {
        sound_id: String(sid),
        heritage_sound: music1.title,
        modern_sound: music2 ? ((music2 as any).category || (music2 as any).modern_category) : userFile?.file.name,
        user_mail: sessionStorage.getItem("userEmail"),
        community: (music1 as any).community
      };
      console.log("[log] step 3: sending payload to colab");
      await startFusion(fd, `${COLAB_URL}/api/fusion/process`, meta);
      console.log("[log] step 4: fusion complete. forcing ui update.");
      setLocalLoading(false);
    } catch (error) {
      console.error("[log] crash detected:", error);
      setServerError("fusion failed. check colab connection.");
      setLocalLoading(false);
    }
  };

  const isActuallyFusing = localLoading || fusionState.isFusing;
  const fH = useMemo(() => (tracks || []).filter(t => (t.title || "").toLowerCase().includes(s1.toLowerCase())), [tracks, s1]);
  const fM = useMemo(() => (modernTracks || []).filter(t => ((t as any).category || (t as any).modern_category || "").toLowerCase().includes(s2.toLowerCase()) || ((t as any).rhythm_style || "").toLowerCase().includes(s2.toLowerCase())), [modernTracks, s2]);
  const currentSoundId = music1?.sound_id || (music1 as any)?.id;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-[10px]" style={{ color: COLORS.textColor }}>
      {serverError && (
        <div className="p-2 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100 font-bold uppercase">
          <AlertCircle size={12}/> {serverError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div ref={box1Ref} className="p-3 border rounded-xl bg-white relative h-fit shadow-sm">
          <label className="font-bold opacity-50 flex items-center gap-1 uppercase"><Mic2 size={10}/> heritage melody</label>
          <input className="w-full mt-1 p-2 bg-slate-50 rounded-lg border outline-none" value={s1} onChange={(e) => setS1(e.target.value)} onClick={() => { setS1(""); setO1(true); }} placeholder="type to search..." />
          {o1 && (
            <div className="absolute z-[100] bg-white border w-full left-0 mt-1 max-h-48 overflow-auto shadow-2xl rounded-xl">
              {fH.length > 0 ? fH.map(t => (
                <div key={t.sound_id || (t as any).id} className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-orange-50 cursor-pointer" onClick={() => { setMusic1(t); setS1(t.title || ""); setO1(false); resetFusionState(); setIsSaved(false); lastSelectionRef.current = ""; }}>
                  <span className="font-medium">{t.title?.toLowerCase()}</span>
                  <MessageSquare size={10} className="text-orange-400"/>
                </div>
              )) : <div className="p-4 text-center opacity-40 italic">no tracks found</div>}
            </div>
          )}
          {music1 && (
            <div className="mt-2">
              <audio src={getUrl(music1, 'h')} controls className="w-full h-7 mb-2" />
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between mb-1">
                  <button onClick={() => setActivePanel(activePanel === "detail" ? null : "detail")} className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${activePanel === "detail" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>detail</button>
                  <button onClick={() => setActivePanel(activePanel === "context" ? null : "context")} className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${activePanel === "context" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>context</button>
                </div>
                {activePanel === "context" && <div className="p-1 bg-slate-50 rounded-lg">{CULTURAL_FIELDS.map(cf => <p key={cf.key}><span className="font-bold opacity-60">{cf.label}:</span> {(music1 as any)[cf.key] || "--"}</p>)}</div>}
                {activePanel === "detail" && <div className="p-1 bg-slate-50 rounded-lg">{FORM_FIELDS.filter(f => !["file", "id", "sound_id", "contributor", "sound_track", "album_file", "sound_track_url", "album_file_url"].includes(f.name)).map(f => (<p key={f.name}><span className="font-bold opacity-60">{f.label}:</span> {(music1 as any)[f.name] || "-"}</p>))}</div>}
              </div>
            </div>
          )}
        </div>
        <div ref={box2Ref} className="p-3 border rounded-xl bg-white relative h-fit shadow-sm">
          <div className="flex justify-between items-center">
            <label className="font-bold opacity-50 flex items-center gap-1 uppercase"><Music size={10}/> modern style</label>
            <button onClick={() => fileRef.current?.click()} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors shadow-sm" title="upload style">
              <Upload size={16}/>
            </button>
          </div>
          <input className="w-full mt-1 p-2 bg-slate-50 rounded-lg border outline-none" value={s2} onChange={(e) => setS2(e.target.value)} onClick={() => { setS2(""); setO2(true); }} placeholder="search style..." />
          <input type="file" ref={fileRef} hidden accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setUserFile({ file: f, url: URL.createObjectURL(f) }); setMusic2(null); setS2(f.name); setO2(false); resetFusionState(); setIsSaved(false); lastSelectionRef.current = ""; } }} />
          {o2 && (
            <div className="absolute z-[100] bg-white border w-full left-0 mt-1 max-h-48 overflow-auto shadow-2xl rounded-xl">
              {fM.length > 0 ? fM.map(t => (
                <div key={t.sound_id || (t as any).id} className="p-2 border-b last:border-0 hover:bg-orange-50 cursor-pointer" onClick={() => { setMusic2(t); setS2(`${(t as any).category || (t as any).modern_category} - ${(t as any).rhythm_style}`); setUserFile(null); setO2(false); resetFusionState(); setIsSaved(false); lastSelectionRef.current = ""; }}>
                  <span className="font-medium">{((t as any).category || (t as any).modern_category)?.toLowerCase()} - {(t as any).rhythm_style?.toLowerCase()}</span>
                </div>
              )) : <div className="p-4 text-center opacity-40 italic">no styles found</div>}
            </div>
          )}
          {(music2 || userFile) && <audio src={userFile?.url || getUrl(music2!, 'm')} controls className="w-full h-7 mt-2" />}
        </div>
      </div>
      <div className="flex justify-center"><button onClick={() => setShowAdv(!showAdv)} className="flex items-center gap-1 opacity-40 hover:opacity-100 font-bold uppercase tracking-widest transition-all"><Sliders size={10}/> advanced {showAdv ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</button></div>
      {showAdv && (
        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-1"><label className="font-bold flex justify-between uppercase opacity-50">gate <span>{gate}dB</span></label><input type="range" className="w-full accent-orange-600" min="-80" max="-20" value={gate} onChange={e => setGate(e.target.value)}/></div>
          <div className="space-y-1"><label className="font-bold flex justify-between uppercase opacity-50">clarity <span>{clarity}x</span></label><input type="range" className="w-full accent-orange-600" min="0" max="4" step="0.1" value={clarity} onChange={e => setClarity(e.target.value)}/></div>
          <div className="space-y-1"><label className="font-bold uppercase opacity-50">mode</label><select value={outputMode} onChange={e => setOutputMode(e.target.value)} className="w-full p-1 rounded border bg-white outline-none font-bold"><option value="harmonic">harmonic</option><option value="percussive">percussive</option><option value="balanced">balanced</option></select></div>
        </div>
      )}
      <div className="flex flex-col items-center gap-4">
        <button onClick={handleFusion} disabled={isActuallyFusing || !music1 || (!music2 && !userFile)} className="relative min-w-[200px] px-12 py-3 bg-orange-600 text-white uppercase rounded-full shadow-lg disabled:opacity-50 tracking-widest flex items-center justify-center gap-3 overflow-hidden">
          {isActuallyFusing ? (
            <>
              <Loader2 size={16} className="animate-spin flex-shrink-0" />
              <span>processing</span>
            </>
          ) : (
            "fuse sounds"
          )}
        </button>
        {fusionState.url && music1 && currentSoundId && (
          <div className="w-full p-4 bg-white border rounded-2xl shadow-md flex items-center gap-3 animate-in zoom-in duration-300">
            <Volume2 size={14} className="text-orange-500"/><audio key={fusionState.url} src={fusionState.url} controls className="flex-1 h-8"/>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-400 font-bold uppercase text-[8px]">
                {isSaved ? <><CheckCircle2 size={10} className="text-green-500" /> saved</> : <><CloudUpload size={10} /> syncing...</>}
              </div>
              <div className="flex flex-col items-center">
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
                <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>{fusionPrice} usd</span>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => { setMusic1(null); setMusic2(null); setS1(""); setS2(""); setUserFile(null); resetFusionState(); setIsSaved(false); setActivePanel(null); lastSelectionRef.current = ""; setServerError(null); }} className="opacity-30 hover:opacity-100 flex items-center gap-1 uppercase font-bold tracking-tighter"><RefreshCw size={10}/> reset session</button>
      </div>
    </div>
  );
};

export default MusicFusion;