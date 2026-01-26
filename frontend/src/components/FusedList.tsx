import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Loader2, AlertCircle, TriangleAlert, Search, ChevronDown } from "lucide-react";
import { COLORS } from "./supportives/colors";
import TransactionManager from "./TransactionManager";

interface FusedTrack {
  sound_id: string;
  heritage_sound: string;
  modern_sound: string;
  fusedtrack_url: string;
  style: string;
  user_mail: string;
  community?: string;
}

const FusedCard = ({ track, isLoggedIn, userEmail, setLoginModal }: any) => {
  const [isExp, setIsExp] = useState(false);

  const cleanHeritage = track.heritage_sound?.trim();
  const cleanModern = track.modern_sound?.trim();
  const isDuplicate = cleanHeritage?.toLowerCase() === cleanModern?.toLowerCase();

  return (
    <div className="flex flex-col border-x border-b relative shadow-sm w-[220px] shrink-0 mx-auto sm:mx-0" style={{ borderRadius: "1000px 1000px 166px 166px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
      <div className="w-full aspect-square rounded-full overflow-hidden relative border flex items-center justify-center bg-gray-50" style={{ borderColor: COLORS.borderLight }}>
        <div className="w-[94%] h-[94%] rounded-full bg-white flex items-center justify-center overflow-hidden border border-dashed relative group cursor-pointer" style={{ borderColor: COLORS.borderLight }}>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10"></div>
          <img 
            src="/fuse.png" 
            alt="fuse" 
            className="w-1/2 h-1/2 object-contain transition-transform duration-500 group-hover:scale-110"
            style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))" }}
          />
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col text-center">
        <div className="flex items-center justify-center gap-1 mb-2 relative">
          <h3 className="text-[12px] leading-tight px-1 flex flex-wrap justify-center items-center" style={{ color: COLORS.textDark }}>
            <span className="opacity-60 mr-1">Fusion of:</span>
            <span className="font-bold underline capitalize" style={{ color: COLORS.primaryColor }}>{cleanHeritage}</span>
            {!isDuplicate && (cleanHeritage && cleanModern) && (
              <>
                <span className="mx-1 opacity-40 italic font-medium">and</span>
                <span className="font-bold underline capitalize" style={{ color: COLORS.primaryColor }}>{cleanModern}</span>
              </>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <audio controls controlsList="nodownload" className="flex-1 h-8">
            <source src={track.fusedtrack_url} type="audio/wav" />
          </audio>
          
          <div className="flex flex-col items-center">
            <TransactionManager 
              item={{
                id: String(track.sound_id),
                user_mail: track.user_mail,
                heritage_sound: track.heritage_sound,
                community: track.community,
                contributor_email: track.user_mail
              }}
              currentUserEmail={userEmail}
              downloadUrl={track.fusedtrack_url}
              onOpenLogin={() => setLoginModal(true)}
              price={1.00}
              variant="fused"
            />
            <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>
              1 USD
            </span>
          </div>
        </div>

        <div className="mt-2 border-t pt-2 flex items-center justify-between px-1 h-8 relative" style={{ borderColor: COLORS.borderMain }}>
          <button onClick={() => setIsExp(!isExp)} className="text-[13px] font-semibold" style={{ color: COLORS.actionDetails }}>
            {isExp ? "less" : "details"}
          </button>
        </div>

        {isExp && (
          <div className="mt-2 text-[11px] text-left border-t pt-2 space-y-1" style={{ borderColor: COLORS.bgGray }}>
            <p className="lowercase" style={{ color: COLORS.textColor }}>
              <span className="font-bold capitalize" style={{ color: COLORS.textDark }}>heritage:</span> {cleanHeritage}
            </p>
            {!isDuplicate && (
              <p className="lowercase" style={{ color: COLORS.textColor }}>
                <span className="font-bold capitalize" style={{ color: COLORS.textDark }}>modern:</span> {cleanModern}
              </p>
            )}
            {track.community && (
              <p className="lowercase" style={{ color: COLORS.textColor }}>
                <span className="font-bold capitalize" style={{ color: COLORS.textDark }}>community:</span> {track.community}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FusedList: React.FC = () => {
  const [fusions, setFusions] = useState<FusedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModal, setLoginModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<"heritage" | "modern" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const userToken = sessionStorage.getItem("userToken");
  const isLoggedIn = !!userToken;
  const userEmail = sessionStorage.getItem("userEmail");
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchFusions = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/fusion/history`);
        setFusions(res.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFusions();
  }, [API_BASE]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const heritageTitles = Array.from(new Set(fusions.map(f => f.heritage_sound))).sort();
  const modernTitles = Array.from(new Set(fusions.map(f => f.modern_sound))).sort();

  const filteredFusions = fusions.filter((track) => 
    track.heritage_sound.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.modern_sound.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin" style={{ color: COLORS.primaryColor }} />
      <p className="text-[10px] tracking-widest" style={{ color: COLORS.textMuted }}>loading library</p>
    </div>
  );

  return (
    <div className="w-full relative">
      <div className="mb-10 w-full" ref={dropdownRef}>
        <div className="relative flex flex-col md:flex-row md:items-center w-full rounded-2xl md:rounded-full p-1.5 border gap-2" style={{ backgroundColor: "#FDF5ED", borderColor: COLORS.borderLight }}>
          <div className="flex items-center flex-1">
            <div className="flex items-center pl-3 pr-2 pointer-events-none">
              <Search size={18} style={{ color: COLORS.textMuted }} />
            </div>
            
            <input
              type="text"
              placeholder="search fused tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent py-3 outline-none text-sm"
              style={{ color: COLORS.textDark }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-2 border-t md:border-t-0 md:border-l py-2 md:py-0" style={{ borderColor: COLORS.borderLight }}>
            <span className="text-[10px] font-bold uppercase tracking-tight mr-1" style={{ color: "#D97706" }}>filter:</span>
            
            <button 
              onClick={() => setSearchTerm("")}
              className="px-4 py-1.5 rounded-xl text-xs transition-all"
              style={{ 
                backgroundColor: searchTerm === "" ? "#E67E22" : "#FFF", 
                color: searchTerm === "" ? "#FFF" : "#666",
                border: searchTerm === "" ? "none" : "1px solid #E5E7EB",
                fontWeight: 500
              }}
            >
              all
            </button>

            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === "heritage" ? null : "heritage")}
                className="px-4 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1"
                style={{ 
                  backgroundColor: activeDropdown === "heritage" ? "#E67E22" : "#FFF", 
                  color: activeDropdown === "heritage" ? "#FFF" : "#666",
                  border: activeDropdown === "heritage" ? "none" : "1px solid #E5E7EB",
                  fontWeight: 500
                }}
              >
                heritage <ChevronDown size={12} />
              </button>
              {activeDropdown === "heritage" && (
                <div className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-56 bg-white border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto" style={{ borderColor: COLORS.borderLight }}>
                  <div className="p-1">
                    {heritageTitles.map(title => (
                      <button 
                        key={title}
                        onClick={() => { setSearchTerm(title); setActiveDropdown(null); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-600 rounded-lg truncate hover:text-white"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === "modern" ? null : "modern")}
                className="px-4 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1"
                style={{ 
                  backgroundColor: activeDropdown === "modern" ? "#E67E22" : "#FFF", 
                  color: activeDropdown === "modern" ? "#FFF" : "#666",
                  border: activeDropdown === "modern" ? "none" : "1px solid #E5E7EB",
                  fontWeight: 500
                }}
              >
                modern <ChevronDown size={12} />
              </button>
              {activeDropdown === "modern" && (
                <div className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-56 bg-white border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto" style={{ borderColor: COLORS.borderLight }}>
                  <div className="p-1">
                    {modernTitles.map(title => (
                      <button 
                        key={title}
                        onClick={() => { setSearchTerm(title); setActiveDropdown(null); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-600 rounded-lg truncate hover:text-white"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {error ? (
        <div className="p-8 text-center rounded-3xl" style={{ color: COLORS.dangerColor }}>
          <AlertCircle className="mx-auto mb-2" size={24} />
          <p className="text-xs uppercase">database error</p>
          <p className="text-[10px] mt-2 font-mono">{error}</p>
        </div>
      ) : filteredFusions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            {searchTerm ? `no tracks match "${searchTerm.toLowerCase()}"` : "no fused tracks available"}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center sm:justify-start gap-10 px-2 pb-10">
          {filteredFusions.map((track) => (
            <FusedCard 
              key={track.sound_id} 
              track={track} 
              isLoggedIn={isLoggedIn} 
              userEmail={userEmail} 
              setLoginModal={setLoginModal}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FusedList;