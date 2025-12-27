import React, { useState, useRef, useMemo, useCallback } from "react";
import { Track } from "../../types";
import { COUNTRIES } from "../supportives/countries";

type HomeTrack = Track & {
  playCount?: number;
  sound_id?: string;
};

interface HomebodyProps {
  tracks: HomeTrack[];
  onMenuChange: (key: any) => void;
}

const Homebody: React.FC<HomebodyProps> = ({ tracks, onMenuChange }) => {
  const [activeDetail, setActiveDetail] = useState<{ title: string; items: string[] } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const approvedTracks = useMemo(() => tracks.filter((t) => t.isapproved), [tracks]);

  const stats = useMemo(() => [
    { title: "Regions", data: Array.from(new Set(approvedTracks.map((t) => t.region))).filter(Boolean) as string[] },
    { title: "Countries", data: Array.from(new Set(approvedTracks.map((t) => t.country))).filter(Boolean) as string[] },
    { title: "Categories", data: Array.from(new Set(approvedTracks.map((t) => t.category))).filter(Boolean) as string[] },
    { title: "Communities", data: Array.from(new Set(approvedTracks.map((t) => t.community))).filter(Boolean) as string[] }
  ], [approvedTracks]);

  const featuredTracks = useMemo(() => approvedTracks.slice(0, 4), [approvedTracks]);

  const togglePlay = useCallback((track: HomeTrack) => {
    const t = track as any;
    const trackId = t.sound_id || t._id;
    const audioUrl = t.sound_track_url || t.url || t.audio_url;

    if (!audioUrl) return;

    if (playingId === trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(() => {});
      setPlayingId(trackId);
    }
  }, [playingId]);

  const handleCardClick = useCallback((title: string, items: string[]) => {
    setActiveDetail(prev => prev?.title === title ? null : { title, items });
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden animate-in fade-in duration-700">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        onPause={() => setPlayingId(null)}
      />

      {fullImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={() => setFullImage(null)}>
          <button 
            className="absolute top-6 right-8 text-white text-5xl font-light hover:text-gray-400 transition-colors z-[120]"
            onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
          >
            &times;
          </button>
          <img src={fullImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300" />
        </div>
      )}

      <section className="relative h-screen min-h-[700px] flex flex-col justify-center px-6 lg:px-20 overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <img src="/mainpage.png" alt="Heritage" className="w-full h-full object-cover grayscale opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90" />
        </div>

        <div className="absolute inset-0 z-10 flex items-center pointer-events-none transform translate-y-0 translate-x-16">
          <div className="w-full h-[1px] bg-orange-500/10 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-80 text-[#E67E22] opacity-40">
                <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M0,100 L350,100 L365,70 L380,130 L395,40 L410,160 L425,20 L440,180 L455,50 L470,150 L485,80 L500,120 L515,95 L530,105 L545,100 L1000,100" />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-20 w-full mb-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#374151] mb-3 tracking-tight">Heritage in Code AI</h1>
            <p className="text-lg md:text-xl text-gray-500 mb-8 font-medium">Preserving African sound heritage for the AI age.</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => onMenuChange("library")} className="bg-white border-2 border-[#E67E22] text-[#E67E22] px-8 py-3 rounded-md text-sm font-bold hover:bg-orange-50 transition-all">Sound Library</button>
              <button onClick={() => onMenuChange("fusion")} className="bg-white border-2 border-[#E67E22] text-[#E67E22] px-8 py-3 rounded-md text-sm font-bold hover:bg-orange-50 transition-all">Apply AI Fusion</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-30 w-full mt-10 min-h-[120px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const isActive = activeDetail?.title === stat.title;
              return (
                <button
                  key={stat.title}
                  onClick={() => handleCardClick(stat.title, stat.data)}
                  className={`p-5 rounded-xl shadow-xl border flex flex-col items-center justify-center text-center h-20 transition-all ${
                    isActive ? "bg-[#E67E22] border-[#E67E22]" : "bg-white/70 backdrop-blur-md border-white/50 hover:-translate-y-1"
                  }`}
                >
                  <span className={`text-3xl font-black ${isActive ? "text-white" : "text-gray-800"}`}>{stat.data.length}</span>
                  <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isActive ? "text-white/80" : "text-gray-400"}`}>{stat.title}</span>
                </button>
              );
            })}
          </div>

          {activeDetail && (
            <div className="absolute top-4 left-0 right-0 p-6 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-2xl z-40 max-w-2xl">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h4 className="text-xs font-bold text-[#E67E22] uppercase tracking-widest">Listing {activeDetail.title}</h4>
                <button onClick={() => setActiveDetail(null)} className="text-[10px] font-bold text-gray-400">Close ✕</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {activeDetail.items.map((item, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-gray-50 border rounded-full text-[10px] font-bold text-gray-600 uppercase">{item}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#F9F9F9] py-16 px-6 lg:px-20 border-t border-gray-100">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">What We Do</h2>
        <div className="max-w-7xl mx-auto space-y-4">
          {[
            {
              title: "Preserve",
              desc: "Digitizing traditional African sounds with full cultural context, ensuring heritage is documented for future generations."
            },
            {
              title: "Protect",
              desc: "Ethical attribution, informed consent, and community governance at every step of the collection process."
            },
            {
              title: "Create",
              desc: "Enabling modern artists and AI systems to engage responsibly with African sonic heritage."
            }
          ].map((item) => (
            <div key={item.title} className="bg-white p-6 rounded-xl border-l-4 border-[#E67E22] shadow-sm w-full">
              <h3 className="text-[#E67E22] text-xl font-bold mb-2 uppercase">{item.title}</h3>
              <p className="text-gray-700 text-justify">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F3F4F6] py-16 px-6 lg:px-20">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">Featured Sounds</h2>
        <div className="max-w-7xl mx-auto overflow-x-auto pb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-6 min-w-fit sm:min-w-0">
            {featuredTracks.map((track) => {
              const t = track as any;
              const trackId = t.sound_id || t._id;
              const isPlaying = playingId === trackId;
              const country = COUNTRIES.find((c) => c.name === t.country);
              const cCode = country?.code.toLowerCase();

              return (
                <div 
                  key={trackId} 
                  className="bg-white flex flex-col border-x-2 border-b-2 relative shadow-sm transition-transform hover:scale-[0.97] flex-shrink-0 w-[240px] mx-auto sm:mx-0" 
                  style={{ borderRadius: "1000px 1000px 20px 20px" }}
                >
                  <div 
                    className="w-full aspect-square rounded-full overflow-hidden cursor-pointer relative border-2 bg-gray-50 flex items-center justify-center border-gray-200"
                    onClick={() => setFullImage(t.album_file_url || "/placeholder.png")}
                  >
                    <img 
                      src={t.album_file_url || "/placeholder.png"} 
                      alt={t.title} 
                      className="w-[92%] h-[92%] object-contain rounded-full" 
                      loading="lazy" 
                    />
                  </div>
                  
                  <div className="p-3 flex flex-col text-center">
                    <h4 className="font-bold truncate text-sm text-black">{t.title || "Lorem ipsum"}</h4>
                    <p className="text-[10px] text-gray-700 truncate mb-3 italic">{t.performer || "Artist name"}</p>
                    
                    <button
                      onClick={() => togglePlay(track)}
                      className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all border-2 mb-2 ${
                        isPlaying ? "bg-[#E67E22] border-[#E67E22] text-white" : "bg-white border-[#E67E22] text-[#E67E22] hover:bg-orange-50"
                      }`}
                    >
                      {isPlaying ? "Pause sound" : "Listen / Play"}
                    </button>

                    <div className="mt-1 flex justify-between items-center text-[9px]">
                      <span className="text-gray-800 px-1.5 py-0.5 font-bold">
                        {t.category || "Culture"}
                      </span>
                      {cCode && (
                        <img 
                          src={`https://flagcdn.com/w20/${cCode}.png`} 
                          className="w-4 h-3 shadow-sm rounded-sm" 
                          alt="" 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <button 
              onClick={() => onMenuChange("library")} 
              className="border-b-2 border-[#E67E22] text-[#E67E22] pb-1 text-sm font-bold uppercase tracking-widest hover:text-[#D35400] transition-all"
            >
              View Full Sound Library →
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white pt-20 pb-10 px-6 lg:px-20 text-gray-800 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="w-full text-center">
            <h2 className="text-3xl font-bold mb-6 uppercase text-black">Why This Matters</h2>
            <p className="text-base text-gray-600 font-normal leading-relaxed max-w-5xl mx-auto text-justify">
              African sounds are largely absent from AI. Current models often lack the nuanced rhythmic and harmonic complexities inherent to our diverse heritage. Heritage in Code AI fills this gap by building culturally grounded tracks that empower researchers and creators to interact with our sonic legacy ethically.
            </p>
          </div>

          <div className="w-full border-t border-gray-50 pt-10">
            <h2 className="text-2xl font-bold mb-8 uppercase text-gray-800 text-center">The Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Malkia Music", role: "Musician, track recorder and founder", img: "/linda.png", linkedin: "#", email: "mailto:malkiamusickenya@gmail.com" },
                { name: "Gebregziabihier Nigusie", role: "AI engineer, web portal and AI fusion model developer", img: "/gere.png", linkedin: "https://www.linkedin.com/in/gerenigusie/", email: "mailto:gerenigusie138@gmail.com" },
                { name: "Quinton Pretorius", role: "Project facilitator", img: "/quinton.png", linkedin: "https://www.linkedin.com/in/quintonpretorius/", email: "mailto:q.pretorius@icloud.com" }
              ].map((member, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <img src={member.img} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-gray-100 group-hover:border-[#E67E22] transition-all" loading="lazy" />
                  <div className="flex-1">
                    <h4 className="text-[13px] font-bold text-gray-900 leading-tight">{member.name}</h4>
                    <p className="text-[10px] text-[#E67E22] font-semibold tracking-wider mb-1">{member.role}</p>
                    <div className="flex gap-3">
                      <a href={member.linkedin} className="text-[#0077b5] hover:opacity-80 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
                      <a href={member.email} className="text-[#E67E22] hover:opacity-80 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-9.458l4.623 3.746zm-4.141-5.929h19.035l-9.517 7.713-9.518-7.713zm5.694 7.188l3.824 3.099 3.83-3.104 5.612 8.818h-18.895l5.629-8.813zm9.201-1.259l4.623-3.746v9.458l-4.623-5.712z"/></svg></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-gray-50 pt-16 mt-16 text-center">
          <h4 className="inline-block text-[11px] uppercase tracking-[0.3em] font-bold text-[#E67E22] border-b-2 border-[#E67E22]/30 pb-1 mb-10">Supported & Funded By</h4>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 transition-all">
            <img src="Wits_MIND.jpg" alt="Funder" className="h-8 object-contain" loading="lazy" />
            <img src="Wits_Innovation.jpg" alt="Funder" className="h-8 object-contain" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homebody;