import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  Square, 
  Zap, 
  SlidersHorizontal, 
  VolumeX, 
  Volume2,
  Maximize2,
  Music,
  WifiOff,
  RefreshCw
} from "lucide-react";

interface TrackMetadata {
  title: string;
  category: string;
  country: string;
  community: string;
  region: string;
  context: string;
  performer?: string;
  description?: string;
  sound_id: string;
  sound_track_url: string;
  album_file_url?: string;
}

const InstrumentGuide: React.FC<{ tracks: any[] }> = ({ tracks }) => {
  const [selectedTrack, setSelectedTrack] = useState<TrackMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState({ amp: 0, low: 0, mid: 0, high: 0 });
  const [fftData, setFftData] = useState<number[]>(new Array(40).fill(0));
  const [activeBands, setActiveBands] = useState({ low: true, mid: true, high: true });
  const [imageError, setImageError] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lowFilter = useRef<BiquadFilterNode | null>(null);
  const midFilter = useRef<BiquadFilterNode | null>(null);
  const highFilter = useRef<BiquadFilterNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => t.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tracks, searchTerm]);

  const toggleBand = (band: 'low' | 'mid' | 'high') => {
    const newState = { ...activeBands, [band]: !activeBands[band] };
    setActiveBands(newState);
    if (lowFilter.current && midFilter.current && highFilter.current && audioContextRef.current) {
      const gain = newState[band] ? 0 : -40;
      if (band === 'low') lowFilter.current.gain.setTargetAtTime(gain, audioContextRef.current.currentTime, 0.1);
      if (band === 'mid') midFilter.current.gain.setTargetAtTime(gain, audioContextRef.current.currentTime, 0.1);
      if (band === 'high') highFilter.current.gain.setTargetAtTime(gain, audioContextRef.current.currentTime, 0.1);
    }
  };

  const startEngine = () => {
    if (analyserRef.current) {
      const f = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(f);
      const low = f.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
      const mid = f.slice(10, 35).reduce((a, b) => a + b, 0) / 25;
      const high = f.slice(40, 80).reduce((a, b) => a + b, 0) / 40;
      setAnalysis({ amp: f.reduce((a, b) => a + b, 0) / f.length, low, mid, high });
      const reducedFft = [];
      for(let i = 0; i < 40; i++) reducedFft.push(f[i * 2]);
      setFftData(reducedFft);
      animationRef.current = requestAnimationFrame(startEngine);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setSelectedTrack(null);
    setImageError(false);
    setNetworkError(null);
    setAnalysis({ amp: 0, low: 0, mid: 0, high: 0 });
    setFftData(new Array(40).fill(0));
    setActiveBands({ low: true, mid: true, high: true });
  };

  const handleAudioError = () => {
    setNetworkError("Failed to load archival audio. Check your connection.");
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setFftData(new Array(40).fill(0));
  };

  const handleSelect = (t: any) => {
    setImageError(false);
    setNetworkError(null);
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      lowFilter.current = audioContextRef.current.createBiquadFilter();
      lowFilter.current.type = "lowshelf";
      lowFilter.current.frequency.value = 320;
      midFilter.current = audioContextRef.current.createBiquadFilter();
      midFilter.current.type = "peaking";
      midFilter.current.frequency.value = 1000;
      midFilter.current.Q.value = 0.5;
      highFilter.current = audioContextRef.current.createBiquadFilter();
      highFilter.current.type = "highshelf";
      highFilter.current.frequency.value = 3000;
      analyserRef.current.fftSize = 512;
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    setSelectedTrack(t);
    setIsOpen(false);
    if (audioRef.current && t.sound_track_url) {
      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(lowFilter.current!).connect(midFilter.current!).connect(highFilter.current!).connect(analyserRef.current!).connect(audioContextRef.current.destination);
      }
      audioRef.current.src = t.sound_track_url;
      audioRef.current.play().catch(() => setNetworkError("Playback blocked or network failed."));
      startEngine();
    }
  };

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  return (
    <div className="w-full max-w-[950px] mx-auto p-2 bg-slate-50 min-h-[520px] md:h-[520px] flex flex-col gap-2 font-sans overflow-hidden rounded-2xl border border-slate-200 shadow-xl relative text-slate-600">
      <audio ref={audioRef} crossOrigin="anonymous" onEnded={stopPlayback} onError={handleAudioError} />
      
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm relative z-[100] gap-3">
        <div className="flex items-center gap-2 self-start sm:self-center">
          <BookOpen size={16} className="text-amber-500" />
          <h2 className="text-[11px] font-black tracking-wider text-slate-700 uppercase whitespace-nowrap">Track Analysis</h2>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 relative">
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors hover:border-slate-300">
              <span className="text-[11px] font-bold text-slate-600 truncate">{selectedTrack ? selectedTrack.title : "Select archival track"}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
            {isOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-[200]">
                <div className="p-2 border-b border-slate-50 flex items-center gap-2 bg-slate-50">
                  <Search size={12} className="text-slate-400" />
                  <input autoFocus type="text" placeholder="Filter..." className="bg-transparent border-none outline-none text-[11px] font-bold w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {filteredTracks.map(t => (
                    <button key={t.sound_id} onClick={() => handleSelect(t)} className="w-full text-left p-2 rounded-md hover:bg-slate-50 text-[11px] font-bold text-slate-600 truncate border-b border-slate-50/50 last:border-0">{t.title}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={stopPlayback} className={`p-1.5 rounded-lg transition-all shrink-0 shadow-md border ${selectedTrack ? "bg-red-500 text-white border-red-400 hover:bg-red-600" : "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"}`}>
            <Square size={10} fill="currentColor" />
          </button>
        </div>
      </header>

      <section className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 shadow-inner flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={10} className="text-amber-500" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Heritage Pipeline</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { t: "Archival Fetch", a: "Retrieving original recording" },
            { t: "Spectral Mapping", a: "Analyzing frequency density" },
            { t: "Metadata Tagging", a: "Associating cultural context" }
          ].map((s, i) => (
            <div key={i} className="flex gap-3 bg-white/5 rounded-lg p-2 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-slate-900 border border-amber-500 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-black text-amber-500">{i + 1}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-100 uppercase">{s.t}</span>
                <span className="text-[9px] text-slate-400 font-bold">{s.a}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 overflow-y-auto lg:overflow-hidden">
        <main className="flex-1 flex flex-col gap-2 min-w-0">
          <section className="h-28 sm:h-36 bg-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700 shrink-0">
            <AnimatePresence>
              {networkError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-red-950/90 flex flex-col items-center justify-center p-4 text-center">
                  <WifiOff size={24} className="text-red-400 mb-2" />
                  <span className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">{networkError}</span>
                  <button onClick={() => selectedTrack && handleSelect(selectedTrack)} className="flex items-center gap-1.5 px-3 py-1 bg-red-500 rounded-lg text-[9px] font-black text-white uppercase hover:bg-red-600 transition-colors">
                    <RefreshCw size={10} /> Retry connection
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 flex items-end justify-center px-4 sm:px-8 gap-[1px] opacity-25">
              {fftData.map((v, i) => (<motion.div key={i} animate={{ height: selectedTrack ? `${(v/255)*85}%` : "2px" }} className="flex-1 bg-amber-400" />))}
            </div>
            {!selectedTrack && !networkError && <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Spectral Visualizer Offline</div>}
          </section>

          <section className="flex-1 bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col gap-2 w-full sm:w-28 shrink-0 sm:border-r border-slate-100 sm:pr-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Harmonics</span>
              <div className="flex-1 flex items-end gap-2 h-24 sm:h-full">
                {[{ l: "Sub", v: analysis.low, c: "bg-blue-500" }, { l: "Mid", v: analysis.mid, c: "bg-emerald-400" }, { l: "High", v: analysis.high, c: "bg-orange-500" }].map(x => (
                  <div key={x.l} className="flex-1 flex flex-col gap-1 h-full">
                    <div className="flex-1 w-full bg-slate-50 rounded-sm relative overflow-hidden min-h-[40px]">
                      <motion.div animate={{ height: (selectedTrack && !networkError) ? `${(x.v / 255) * 100}%` : "0%" }} className={`absolute bottom-0 w-full ${x.c} opacity-70`} />
                    </div>
                    <span className="text-[8px] font-black text-center text-slate-400 uppercase">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-slate-50 pb-1.5">
                <SlidersHorizontal size={12} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-700 uppercase">Isolation</span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2 py-1">
                {['low', 'mid', 'high'].map((id) => (
                  <button key={id} disabled={!selectedTrack || !!networkError} onClick={() => toggleBand(id as any)} className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all ${activeBands[id as keyof typeof activeBands] ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent grayscale opacity-50'}`}>
                    {activeBands[id as keyof typeof activeBands] ? <Volume2 size={14} className="text-slate-600"/> : <VolumeX size={14} className="text-slate-400"/>}
                    <span className="text-[9px] font-black uppercase text-slate-500">{id}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="w-full lg:w-80 shrink-0">
          <div className="h-full bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative min-h-[300px]">
            {!selectedTrack ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-20">
                <Maximize2 size={32} className="text-white" />
                <span className="text-[10px] font-black uppercase text-white tracking-[3px]">Waiting for input</span>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="w-full flex justify-center py-6 bg-slate-950/30">
                   <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-amber-500/50 p-1 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg">
                    {selectedTrack.album_file_url && !imageError ? (
                      <img 
                        src={selectedTrack.album_file_url} 
                        alt={selectedTrack.title}
                        className="w-full h-full object-cover rounded-full"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <Music size={40} className="text-slate-600" />
                    )}
                   </div>
                </div>
                <div className="p-6 pt-2 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 text-left">
                  <div className="flex flex-col gap-2 relative z-10">
                    {[
                      { l: "Title", v: selectedTrack.title },
                      { l: "Category", v: selectedTrack.category },
                      { l: "Country", v: selectedTrack.country },
                      { l: "Community", v: selectedTrack.community },
                      { l: "Region", v: selectedTrack.region },
                      { l: "Context", v: selectedTrack.context },
                      { l: "Performer", v: selectedTrack.performer }
                    ].map((row, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="text-[12px] font-bold text-slate-100 min-w-[75px] shrink-0">{row.l}:</span>
                        <span className="text-[12px] text-slate-300">{row.v}</span>
                      </div>
                    ))}
                    <div className="flex flex-col mt-2 pt-2 border-t border-slate-800 w-full">
                      <span className="text-[12px] font-bold text-slate-100 mb-1">Description:</span>
                      <span className="text-[11px] text-slate-400 leading-relaxed italic">{selectedTrack.description}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default InstrumentGuide;