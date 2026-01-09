import React, { useState, useRef, useEffect, useCallback } from "react";
import { Track } from "../types";
import { Zap } from "lucide-react";

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
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  const [fuseProgress, setFuseProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [heritageVol, setHeritageVol] = useState(0.8);
  const [modernVol, setModernVol] = useState(0.5);
  const [tone, setTone] = useState(2500);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodes = useRef<{ heritage: GainNode | null; modern: GainNode | null }>({ heritage: null, modern: null });
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const buffersRef = useRef<{ buf1: AudioBuffer | null; buf2: AudioBuffer | null; m1Id: string | null; m2Id: string | null }>({ buf1: null, buf2: null, m1Id: null, m2Id: null });
  
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "";
  const FUSE_DURATION = 15000;

  const stopFusion = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current = [];
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    }
  }, []);

  const fetchAudioBuffer = useCallback(async (url: string, isModern: boolean, context: AudioContext) => {
    let fetchUrl = url;
    if (isModern && (url.includes('jamendo.com') || url.includes('storage.googleapis.com'))) {
      fetchUrl = `${API_BASE}/api/modern/proxy-audio?url=${encodeURIComponent(url)}`;
    }
    const resp = await fetch(fetchUrl);
    const arrayBuffer = await resp.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  }, [API_BASE]);

  const loadAllBuffers = useCallback(async (m1: Track, m2: Track) => {
    if (buffersRef.current.m1Id === m1.sound_id && buffersRef.current.m2Id === m2.sound_id) return;
    
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const [b1, b2] = await Promise.all([
        fetchAudioBuffer(m1.sound_track_url || "", false, context),
        fetchAudioBuffer(m2.modernaudio_url || "", true, context)
      ]);
      buffersRef.current = { buf1: b1, buf2: b2, m1Id: m1.sound_id, m2Id: m2.sound_id };
      await context.close();
    } catch (err) { 
      console.error("Audio Load Error", err); 
    }
  }, [fetchAudioBuffer]);

  const startEngine = useCallback(async (isSilent: boolean = false) => {
    if (!buffersRef.current.buf1 || !buffersRef.current.buf2) return null;
    
    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => {});
    }

    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = context;

    const source1 = context.createBufferSource();
    const source2 = context.createBufferSource();
    source1.buffer = buffersRef.current.buf1;
    source2.buffer = buffersRef.current.buf2;
    source1.loop = true;
    source2.loop = true;

    const gH = context.createGain();
    const gM = context.createGain();
    const filter = context.createBiquadFilter();
    
    filter.type = "lowpass";
    filter.frequency.value = tone;
    gH.gain.value = heritageVol;
    gM.gain.value = modernVol;

    source1.connect(filter).connect(gH);
    source2.connect(gM);

    if (!isSilent) {
      gH.connect(context.destination);
      gM.connect(context.destination);
    }

    gainNodes.current = { heritage: gH, modern: gM };
    filterRef.current = filter;
    
    source1.start(0);
    source2.start(0);
    sourcesRef.current = [source1, source2];
    
    return { gH, gM, context };
  }, [tone, heritageVol, modernVol]);

  useEffect(() => {
    const fetchModern = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/modern/jamendo`);
        if (res.ok) {
            const data = await res.json();
            setJamendoTracks(data.map((t: Track) => ({ ...t, country: "Global" })));
        } else {
            throw new Error("Jamendo API path failed");
        }
      } catch (err) { 
        console.warn("Jamendo fetch failed, using fallback repository", err);
        try {
          const fallback = await fetch(`${API_BASE}/api/modern/repository`);
          if (fallback.ok) {
            setJamendoTracks(await fallback.json());
          }
        } catch (e) {}
      }
    };
    fetchModern();
  }, [API_BASE]);

  const handleSelect1 = (track: Track) => {
    if (music1?.sound_id === track.sound_id) return;
    setMusic1(track);
    setDownloadUrl(null);
    setIsDone(false);
    if (music2) loadAllBuffers(track, music2);
  };

  const handleSelect2 = (track: Track) => {
    if (music2?.sound_id === track.sound_id) return;
    setMusic2(track);
    setDownloadUrl(null);
    setIsDone(false);
    if (music1) loadAllBuffers(music1, track);
  };

  const handleTogglePlay = async () => {
    if (isFusing) return;

    if (isPlaying) {
      stopFusion();
      setIsPlaying(false);
    } else {
      if (buffersRef.current.buf1 && buffersRef.current.buf2) {
        setIsDone(false);
        await startEngine(false);
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'running') {
      const now = ctx.currentTime;
      if (gainNodes.current.heritage) {
        gainNodes.current.heritage.gain.setTargetAtTime(heritageVol, now, 0.05);
      }
      if (gainNodes.current.modern) {
        gainNodes.current.modern.gain.setTargetAtTime(modernVol, now, 0.05);
      }
      if (filterRef.current) {
        filterRef.current.frequency.setTargetAtTime(tone, now, 0.05);
      }
    }
  }, [heritageVol, modernVol, tone]);

  const handleFuse = async () => {
    if (isFusing || !buffersRef.current.buf1 || !buffersRef.current.buf2) return;
    
    stopFusion();
    setIsPlaying(false);
    setIsFusing(true);
    setIsDone(false);
    setFuseProgress(0);

    const engine = await startEngine(true);
    if (!engine || !engine.context) {
      setIsFusing(false);
      return;
    }

    const streamDest = engine.context.createMediaStreamDestination();
    engine.gH.connect(streamDest);
    engine.gM.connect(streamDest);

    const recorder = new MediaRecorder(streamDest.stream, { mimeType: 'audio/webm' });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setDownloadUrl(URL.createObjectURL(blob));
      setIsFusing(false);
      setFuseProgress(100);
      setIsDone(true);
      stopFusion();
    };
    
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(Math.floor((elapsed / FUSE_DURATION) * 100), 99);
      setFuseProgress(progress);
    }, 100);

    recorderRef.current = recorder;
    recorder.start();
    
    setTimeout(() => {
      clearInterval(progressInterval);
      if (recorder.state === "recording") recorder.stop();
    }, FUSE_DURATION); 
  };

  const getTrackBackground = (val: number, max: number) => {
    const percentage = (val / max) * 100;
    return `linear-gradient(to right, #f59e0b 0%, #f59e0b ${percentage}%, #1e293b ${percentage}%, #1e293b 100%)`;
  };

  const combinedModern = [...initialModernTracks, ...jamendoTracks];
  const fTrks = tracks.filter(t => !!t.isapproved && `${t.title} ${t.country}`.toLowerCase().includes(search1.toLowerCase()));
  const fMod = combinedModern.filter(t => !!t.isapproved && `${t.category} ${t.country}`.toLowerCase().includes(search2.toLowerCase()));

  const Dropdown = ({ open, items, onSel, search, setS, active, label, setO, type, isFusing }: any) => (
    <div className={`p-3 rounded-xl border transition-all ${active ? 'bg-amber-50/20 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
      <label className="block text-[9px] font-medium text-amber-600 mb-1 uppercase tracking-tight">{label}</label>
      <div className="relative">
        <input type="text" className="w-full bg-white border border-gray-200 p-2 rounded-lg text-[11px] outline-none focus:border-amber-400" 
          placeholder={`Select ${type}`} value={open ? search : (active ? `${type === 'modern' ? active.category : active.title}` : search)}
          onChange={e => { setS(e.target.value); setO(true); }} onFocus={() => setO(true)} />
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {items.length ? items.map((t: Track) => (
              <div key={t.sound_id} className="px-3 py-2 hover:bg-amber-50 cursor-pointer text-[11px] border-b border-gray-50 last:border-0"
                onClick={() => { onSel(t); setS(""); setO(false); }}>
                {type === 'modern' ? t.category : t.title} <span className="text-[9px] text-gray-400 uppercase ml-1">{t.country}</span>
              </div>
            )) : <div className="p-2 text-[10px] text-gray-400 italic">No results</div>}
          </div>
        )}
      </div>
      {active && !isFusing && (
        <div className="mt-3">
          <audio controls className="w-full h-6 scale-90 -ml-4" src={type === 'modern' ? active.modernaudio_url : active.sound_track_url} />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div ref={ref1}><Dropdown label="Heritage" type="traditional" items={fTrks} active={music1} onSel={handleSelect1} search={search1} setS={setSearch1} open={isOpen1} setO={setIsOpen1} isFusing={isFusing} /></div>
          <div ref={ref2}><Dropdown label="Modern" type="modern" items={fMod} active={music2} onSel={handleSelect2} search={search2} setS={setSearch2} open={isOpen2} setO={setIsOpen2} isFusing={isFusing} /></div>
        </div>

        <div className="lg:col-span-2 relative">
          <div className={`transition-all duration-700 h-full ${(!music1 || !music2) ? 'grayscale opacity-30 pointer-events-none' : 'grayscale-0 opacity-100'}`}>
            <div className="bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-800 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] text-amber-500 uppercase tracking-widest font-bold">Mixer panel</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-white text-[11px] opacity-60 tracking-tighter">{music1?.title || '...'}</p>
                    <Zap size={10} className="text-amber-500 fill-amber-500" />
                    <p className="text-white text-[11px] opacity-60 tracking-tighter">{music2?.category || '...'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={isFusing} onClick={handleTogglePlay} className={`px-6 py-1.5 rounded-full text-[10px] font-bold transition-all ${isFusing ? 'bg-slate-800 text-slate-600' : isPlaying ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                    {isPlaying ? 'Stop' : 'Play preview'}
                  </button>
                  <button onClick={() => { setMusic1(null); setMusic2(null); setIsPlaying(false); setIsDone(false); stopFusion(); setFuseProgress(0); buffersRef.current = { buf1: null, buf2: null, m1Id: null, m2Id: null }; }} className="text-[9px] text-slate-500 px-2 hover:text-red-400 font-bold transition-colors">Clear</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 flex-grow">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase"><span>Heritage</span><span>{Math.round(heritageVol * 100)}%</span></div>
                    <input type="range" min="0" max="1.5" step="0.05" value={heritageVol} onChange={(e) => setHeritageVol(Number(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ background: getTrackBackground(heritageVol, 1.5) }} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase"><span>Modern</span><span>{Math.round(modernVol * 100)}%</span></div>
                    <input type="range" min="0" max="1.5" step="0.05" value={modernVol} onChange={(e) => setModernVol(Number(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ background: getTrackBackground(modernVol, 1.5) }} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase"><span>Filter</span><span>{(tone/1000).toFixed(1)}kHz</span></div>
                    <input type="range" min="500" max="8000" step="10" value={tone} onChange={(e) => setTone(Number(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ background: getTrackBackground(tone - 500, 7500) }} />
                  </div>
                  
                  {isDone && downloadUrl ? (
                    <div className="flex flex-col gap-2">
                      <audio src={downloadUrl} controls className="w-full h-8 scale-90" />
                      <a href={downloadUrl} download="fused_master.webm" className="w-full py-2 bg-amber-500 text-slate-900 rounded-xl text-[10px] font-bold text-center shadow-lg">Download Result</a>
                    </div>
                  ) : (
                    <button onClick={handleFuse} disabled={isFusing} className={`w-full py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all border-2 ${!isFusing ? "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-slate-900" : "border-slate-800 text-slate-600"}`}>
                      {isFusing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent animate-spin rounded-full" />
                          Fusing {fuseProgress}%
                        </div>
                      ) : "Fuse Tracks"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-1 items-end h-8 justify-center opacity-30">
                {[...Array(25)].map((_, i) => (
                  <div key={i} className={`w-1 rounded-full transition-all ${isPlaying ? 'bg-amber-500' : isFusing ? 'bg-amber-400 animate-pulse' : 'bg-slate-800'}`} style={{ height: (isPlaying || isFusing) ? `${20 + Math.random() * 80}%` : '2px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicFusion;