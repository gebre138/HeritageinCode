import React, { useState, useRef, useMemo, useCallback } from "react";
import { Track } from "../../types";
import { COUNTRIES } from "../supportives/countries";
import { COLORS } from "../supportives/colors";

type HomeTrack = Track & { playCount?: number; sound_id?: string; };
interface HomebodyProps { tracks: HomeTrack[]; onMenuChange: (key: any, searchTerm?: string) => void; }

const Homebody: React.FC<HomebodyProps> = ({ tracks, onMenuChange }) => {
  const [activeDetail, setActiveDetail] = useState<{ title: string; items: string[] } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const approvedTracks = useMemo(() => tracks.filter(t => t.isapproved), [tracks]);
  const featuredTracks = useMemo(() => approvedTracks.slice(0, 4), [approvedTracks]);

  const stats = useMemo(() => ["region", "country", "category", "community"].map(attr => ({
    title: attr.charAt(0).toUpperCase() + attr.slice(1) + "s",
    data: Array.from(new Set(approvedTracks.map(t => (t as any)[attr]))).filter(Boolean) as string[]
  })), [approvedTracks]);

  const handleFusionClick = () => {
    const token = sessionStorage.getItem("userToken") || localStorage.getItem("token");
    const isAuthenticated = token && token !== "undefined" && token !== "null";
    if (isAuthenticated) {
      onMenuChange("fusion");
    } else {
      setShowLoginAlert(true);
    }
  };

  const togglePlay = useCallback((track: HomeTrack) => {
    const t = track as any;
    const trackId = t.sound_id || t._id;
    const url = t.sound_track_url || t.url || t.audio_url;
    if (!url) return;
    if (playingId === trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
      setPlayingId(trackId);
    }
  }, [playingId]);

  return (
    <div className="flex flex-col w-full overflow-hidden animate-in fade-in duration-700 bg-white">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
      
      {showLoginAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-[280px] w-full shadow-2xl text-center border border-gray-100">
            <div className="mb-3 flex justify-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-5 leading-relaxed">Please login to access<br/>the AI fusion</p>
            <button onClick={() => setShowLoginAlert(false)} className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-orange-200" style={{ backgroundColor: COLORS.primaryColor }}>Ok</button>
          </div>
        </div>
      )}

      {fullImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={() => setFullImage(null)}>
          <button className="absolute top-6 right-8 text-white text-5xl font-light hover:text-gray-400 transition-colors z-[120]">&times;</button>
          <img src={fullImage} alt="full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heritageWave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(249,115,22,0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(249,115,22,0.8)); transform: scale(1.05); }
        }
        @keyframes rotatingRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatPulse {
          0%, 100% { transform: translateY(0); opacity: 0.1; }
          50% { transform: translateY(-20px); opacity: 0.3; }
        }
      `}} />

      <section className="relative min-h-screen flex flex-col justify-center px-6 lg:px-20 overflow-hidden bg-white pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <img src="/dj.png" alt="heritage background" className="w-full h-full object-cover opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90" />
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-96 flex items-center justify-center">
            <div className="absolute w-64 h-64 border border-orange-500/10 rounded-full" style={{ animation: 'glowPulse 4s infinite ease-in-out' }} />
            
            <div className="absolute flex items-center justify-center gap-[4px] h-40">
              {[...Array(40)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 rounded-full" 
                  style={{ 
                    height: `${20 + Math.random() * 60}%`,
                    backgroundColor: i % 2 === 0 ? COLORS.primaryColor : '#fb923c',
                    animation: `heritageWave ${1 + Math.random()}s infinite ease-in-out ${i * 0.05}s`,
                    boxShadow: '0 0 10px rgba(249,115,22,0.2)'
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-20 w-full mb-2">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-3 tracking-tight" style={{ color: COLORS.primaryBlack }}>Heritage in code AI</h1>
            <p className="text-lg md:text-xl text-gray-500 mb-8 font-medium">Preserving African heritage sound for the AI age.</p>
            
            <div className="flex flex-row items-center justify-between gap-2 md:gap-6 relative z-30 mb-2">
              <div className="flex flex-row gap-2 md:gap-4">
                <button onClick={() => onMenuChange("library")} className="bg-white border-2 px-2 md:px-8 py-2 md:py-3 rounded-md text-[9px] md:text-sm font-bold hover:bg-orange-50 transition-all shadow-sm whitespace-nowrap" style={{ borderColor: COLORS.primaryColor, color: COLORS.primaryColor }}>Sound library</button>
                <button onClick={handleFusionClick} className="bg-white border-2 px-2 md:px-8 py-2 md:py-3 rounded-md text-[9px] md:text-sm font-bold hover:bg-orange-50 transition-all shadow-sm whitespace-nowrap" style={{ borderColor: COLORS.primaryColor, color: COLORS.primaryColor }}>Apply AI fusion</button>
              </div>

              <div className="flex flex-row gap-2 md:gap-4">
                <button onClick={() => onMenuChange("identify")} className="bg-white border-2 px-2 md:px-8 py-2 md:py-3 rounded-md text-[9px] md:text-sm font-bold hover:bg-orange-50 transition-all shadow-sm whitespace-nowrap" style={{ borderColor: COLORS.primaryColor, color: COLORS.primaryColor }}>Analyze track</button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full flex items-center pointer-events-none mb-16">
          <div className="w-screen h-[1px] bg-orange-500/10 relative -ml-6 lg:-ml-20">
            <div className="absolute inset-0 flex items-center justify-start">
              <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-40 opacity-40" style={{ color: COLORS.primaryColor }}>
                <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M0,100 L1000,100" />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-30 w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
            {stats.map(s => {
              const isActive = activeDetail?.title === s.title;
              return (
                <button key={s.title} onClick={() => setActiveDetail(isActive ? null : { title: s.title, items: s.data })} className={`p-2.5 rounded-lg border flex flex-col items-center justify-center text-center h-14 transition-all shadow-sm ${isActive ? "" : "bg-white/70 backdrop-blur-md border-gray-100 hover:border-gray-300"}`} style={{ backgroundColor: isActive ? COLORS.primaryColor : "", borderColor: isActive ? COLORS.primaryColor : "", boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${COLORS.primaryColor}` : "", transform: isActive ? "scale(0.95)" : "scale(1)" }}>
                  <span className={`text-base font-black ${isActive ? "text-white" : "text-gray-800"}`}>{s.data.length}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[7px] uppercase tracking-[0.2em] font-bold ${isActive ? "text-white/80" : "text-gray-400"}`}>{s.title}</span>
                    <span className={`text-[7px] transition-transform duration-300 ${isActive ? "text-white/60 rotate-180" : "text-gray-400"}`}>▼</span>
                  </div>
                </button>
              );
            })}
          </div>
          {activeDetail && (
            <div className="mt-6 w-full animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border shadow-xl" style={{ borderColor: COLORS.borderLight }}>
                <div className="flex items-center gap-4 mb-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Browse {activeDetail.title}</h4>
                  <div className="h-px flex-1 bg-gray-100"></div>
                  <button onClick={() => setActiveDetail(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors">Close ✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeDetail.items.map((item, idx) => (
                    <button key={idx} onClick={() => { onMenuChange("library", item); setActiveDetail(null); }} className="group flex items-center justify-between p-2.5 bg-gray-50 hover:bg-orange-50 rounded-lg transition-all text-left">
                      <span className="text-[10px] font-bold text-gray-700 capitalize group-hover:text-orange-600 transition-colors truncate">{item}</span>
                      <span className="text-[8px] text-gray-300 group-hover:text-orange-400">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative py-16 px-6 lg:px-20 border-y overflow-hidden" style={{ backgroundColor: COLORS.bgSlate, borderColor: COLORS.borderLight }}>
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-10 w-96 h-96 border-2 border-orange-500/20 rounded-full flex items-center justify-center" style={{ animation: 'rotatingRing 20s linear infinite' }}>
            <div className="w-full h-[1px] bg-orange-500/10" />
            <div className="w-[1px] h-full bg-orange-500/10" />
          </div>
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] border-2 border-orange-600/10 rounded-full" style={{ animation: 'rotatingRing 35s linear infinite reverse' }} />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute text-[8px] font-bold tracking-[0.4em] text-orange-400 uppercase whitespace-nowrap" style={{ 
              top: `${15 + (i * 12)}%`, 
              left: `${5 + (i * 10)}%`, 
              animation: `floatPulse ${5 + i}s infinite ease-in-out` 
            }}>
              Recording Heritage Sound {i+1}
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10 text-black uppercase tracking-tighter relative z-10">Featured sounds</h2>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-row flex-wrap gap-4 md:gap-8 justify-center items-center">
            {featuredTracks.map(track => {
              const t = track as any;
              const isPlaying = playingId === (t.sound_id || t._id);
              const cCode = COUNTRIES.find(c => c.name === t.country)?.code.toLowerCase();
              return (
                <div key={t.sound_id || t._id} className="bg-white flex flex-col border-x-2 border-b-2 relative shadow-sm shrink-0" style={{ width: "220px", borderRadius: "1000px 1000px 20px 20px", borderColor: COLORS.borderLight }}>
                  <div className="w-full aspect-square rounded-full overflow-hidden cursor-pointer relative border-2 bg-gray-50 flex items-center justify-center border-gray-200" onClick={() => setFullImage(t.album_file_url || "/placeholder.png")}>
                    <img src={t.album_file_url || "/placeholder.png"} alt={t.title} className="w-[92%] h-[92%] object-contain rounded-full" loading="lazy" />
                  </div>
                  <div className="p-4 flex flex-col text-center">
                    <h4 className="font-bold truncate text-sm text-black capitalize">{t.title}</h4>
                    <p className="text-[10px] text-gray-700 truncate mb-3 italic font-normal capitalize">{t.performer || "Artist name"}</p>
                    <button onClick={() => togglePlay(track)} className="w-full py-2 rounded-xl text-[10px] font-bold transition-all border-2 mb-2" style={{ backgroundColor: isPlaying ? COLORS.primaryColor : "white", color: isPlaying ? "white" : COLORS.primaryColor, borderColor: COLORS.primaryColor }}>{isPlaying ? "Pause" : "Play"}</button>
                    <div className="mt-1 flex justify-between items-center text-[9px]">
                      <span className="text-gray-800 px-1 py-0.5 font-bold capitalize">{t.category}</span>
                      {cCode && <img src={`https://flagcdn.com/w20/${cCode}.png`} className="w-4 h-3 shadow-sm rounded-sm" alt="" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => onMenuChange("library")} className="border-b-2 pb-1 text-sm font-bold tracking-widest transition-all" style={{ color: COLORS.primaryColor, borderColor: COLORS.primaryColor }}>View full sound library →</button>
          </div>
        </div>
      </section>

      <section className="bg-white pt-20 pb-10 px-6 lg:px-20 text-gray-800 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="w-full text-center">
            <h2 className="text-3xl font-bold mb-6 text-black uppercase tracking-tighter">Why this matters</h2>
            <p className="text-base text-gray-600 font-normal leading-relaxed max-w-5xl mx-auto text-justify italic">African sounds are largely absent from AI. Current models often lack the nuanced rhythmic and harmonic complexities inherent to our diverse heritage. Heritage in code AI fills this gap by building culturally grounded tracks that empower researchers and creators to interact with our sonic legacy ethically.</p>
          </div>
          <div className="w-full border-t border-gray-50 pt-10">
            <h2 className="text-2xl font-bold mb-8 text-gray-800 text-center uppercase tracking-widest">The team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[["Malkia music", "Musician, track recorder and founder", "/linda.png", "#", "mailto:malkiamusickenya@gmail.com"], ["Gebregziabihier nigusie", "AI engineer, web portal and AI fusion model developer", "/gere.png", "https://www.linkedin.com/in/gerenigusie/", "mailto:gerenigusie138@gmail.com"], ["Quinton pretorius", "Project facilitator", "/quinton.png", "https://www.linkedin.com/in/quintonpretorius/", "mailto:q.pretorius@icloud.com"]].map(([n, r, img, l, e], i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <img src={img} alt={n} className="w-12 h-12 rounded-full object-cover border border-gray-100 transition-all group-hover:border-orange-500" loading="lazy" />
                  <div className="flex-1">
                    <h4 className="text-[13px] font-bold text-gray-900 leading-tight">{n}</h4>
                    <p className="text-[10px] font-semibold tracking-wider mb-1" style={{ color: COLORS.primaryColor }}>{r}</p>
                    <div className="flex gap-3">
                      <a href={l} className="text-[#0077b5] hover:opacity-80 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
                      <a href={e} className="hover:opacity-80 transition-colors" style={{ color: COLORS.primaryColor }}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-9.458l4.623 3.746zm-4.141-5.929h19.035l-9.517 7.713-9.518-7.713zm5.694 7.188l3.824 3.099 3.83-3.104 5.612 8.818h-18.895l5.629-8.813zm9.201-1.259l4.623-3.746v9.458l-4.623-5.712z"/></svg></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-gray-50 pt-16 mt-16 text-center">
          <h4 className="inline-block text-[11px] font-bold border-b-2 pb-1 mb-10 uppercase tracking-widest" style={{ color: COLORS.primaryColor, borderColor: COLORS.primaryColor + "4D" }}>Supported & funded by</h4>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 transition-all">
            <img src="Wits_MIND.jpg" alt="funder" className="h-8 object-contain" loading="lazy" />
            <img src="Wits_Innovation.jpg" alt="funder" className="h-8 object-contain" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homebody;