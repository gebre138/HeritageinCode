import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Loader2, AlertCircle, Search, ChevronDown, Trash2, User, Globe, Download } from "lucide-react";
import { COLORS } from "./supportives/colors";
import TransactionManager from "./TransactionManager";

interface FusedTrack {
  id: number;
  sound_id: string;
  heritage_sound: string;
  modern_sound: string;
  fusedtrack_url: string;
  style: string;
  user_mail: string;
  community?: string;
}

const FusedCard = ({ track, setLoginModal, fusedPrice, onDelete }: any) => {
  const [isExp, setIsExp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cleanHeritage = track.heritage_sound?.trim() || "unknown heritage";
  const cleanModern = track.modern_sound?.trim() || "unknown modern";
  const isDuplicate = cleanHeritage.toLowerCase() === cleanModern.toLowerCase();
  const currentUserEmail = sessionStorage.getItem("userEmail");
  const userRole = sessionStorage.getItem("role");
  const isOwner = currentUserEmail && track.user_mail === currentUserEmail;
  const isSuperAdmin = userRole === "superadmin";

  const handleDirectDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(track.fusedtrack_url);
      if (!response.ok) throw new Error("network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `fused_${cleanHeritage.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsDownloading(false);
      }, 100);
    } catch (err) {
      console.error("download error:", err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col border-x border-b relative shadow-sm w-[220px] shrink-0" style={{ borderRadius: "1000px 1000px 166px 166px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: isOwner || isSuperAdmin ? COLORS.primaryColor : COLORS.borderLight }}>
      <div className="w-full aspect-square rounded-full overflow-hidden relative border flex items-center justify-center bg-gray-50" style={{ borderColor: COLORS.borderLight }}>
        <div className="w-[94%] h-[94%] rounded-full bg-white flex items-center justify-center overflow-hidden border border-dashed relative group cursor-pointer" style={{ borderColor: COLORS.borderLight }}>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10"></div>
          <img src="/fuse.png" alt="fuse" className="w-1/2 h-1/2 object-contain transition-transform duration-500 group-hover:scale-110" />
        </div>
      </div>
      <div className="px-3 py-3 flex flex-col text-center">
        <div className="flex items-center justify-center gap-1 mb-2 relative">
          <h3 className="text-[12px] leading-tight px-1 flex flex-wrap justify-center items-center" style={{ color: COLORS.textDark }}>
            <span className="opacity-60 mr-1">fusion of:</span>
            <span className="font-bold underline capitalize" style={{ color: COLORS.primaryColor }}>{cleanHeritage}</span>
            {!isDuplicate && (
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
            {isSuperAdmin ? (
              <button 
                onClick={handleDirectDownload}
                disabled={isDownloading}
                className="p-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:bg-slate-300"
                title="admin download"
              >
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              </button>
            ) : (
              <TransactionManager 
                item={{ 
                  id: String(track.sound_id || track.id), 
                  user_mail: track.user_mail, 
                  heritage_sound: track.heritage_sound, 
                  community: track.community || "", 
                  contributor_email: track.user_mail 
                }} 
                currentUserEmail={currentUserEmail} 
                downloadUrl={track.fusedtrack_url} 
                onOpenLogin={() => setLoginModal(true)} 
                price={fusedPrice} 
                variant="fused" 
              />
            )}
            <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>{isSuperAdmin ? "" : `${fusedPrice} usd`}</span>
          </div>
        </div>
        <div className="mt-2 border-t pt-2 flex items-center justify-between px-3 h-8 relative" style={{ borderColor: COLORS.borderMain }}>
          <button onClick={() => setIsExp(!isExp)} className="text-[13px] font-semibold" style={{ color: COLORS.actionDetails }}>{isExp ? "Less" : "Details"}</button>
          {(isOwner || isSuperAdmin) && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(track); }} className="p-1 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center">
              <Trash2 size={16} style={{ color: COLORS.dangerColor }} />
            </button>
          )}
        </div>
        {isExp && (
          <div className="mt-2 text-[11px] text-left border-t pt-2 space-y-1" style={{ borderColor: COLORS.bgGray }}>
            <p className="lowercase" style={{ color: COLORS.textColor }}><span className="font-bold capitalize" style={{ color: COLORS.textDark }}>heritage:</span> {cleanHeritage}</p>
            {!isDuplicate && <p className="lowercase" style={{ color: COLORS.textColor }}><span className="font-bold capitalize" style={{ color: COLORS.textDark }}>modern:</span> {cleanModern}</p>}
            {track.community && <p className="lowercase" style={{ color: COLORS.textColor }}><span className="font-bold capitalize" style={{ color: COLORS.textDark }}>community:</span> {track.community}</p>}
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
  const [fusedPrice, setFusedPrice] = useState(1.00);
  const [confirmDelete, setConfirmDelete] = useState<{show: boolean, track: FusedTrack | null}>({ show: false, track: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine" | "all">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.REACT_APP_API_URL;
  const userEmail = sessionStorage.getItem("userEmail");

  const fetchFusions = useCallback(async () => {
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
  }, [API_BASE]);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/payment/pricing`);
      if (res.data && res.data.fused_download !== undefined) setFusedPrice(Number(res.data.fused_download));
    } catch (err) { console.warn(err); }
  }, [API_BASE]);

  useEffect(() => { fetchFusions(); fetchPricing(); }, [fetchFusions, fetchPricing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setActiveDropdown(null); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete.track) return;
    setIsDeleting(true);
    const targetId = confirmDelete.track.id;
    try {
      await axios.delete(`${API_BASE}/api/fusion/delete/${targetId}`);
      setFusions(prev => prev.filter(f => f.id !== targetId));
      setConfirmDelete({ show: false, track: null });
    } catch (err: any) {
      alert("delete failed: " + (err.response?.data?.error || "server error"));
    } finally { setIsDeleting(false); }
  };

  const myFusions = fusions.filter(f => f.user_mail === userEmail);
  const displayList = (userEmail && activeTab === "mine") ? myFusions : fusions;

  const heritageTitles = Array.from(new Set(displayList.map(f => f.heritage_sound || ""))).filter(Boolean).sort();
  const modernTitles = Array.from(new Set(displayList.map(f => f.modern_sound || ""))).filter(Boolean).sort();
  const filteredFusions = displayList.filter(t => (t.heritage_sound || "").toLowerCase().includes(searchTerm.toLowerCase()) || (t.modern_sound || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex flex-col items-center justify-center p-20 gap-4"><Loader2 className="animate-spin" style={{ color: COLORS.primaryColor }} /><p className="text-[10px] tracking-widest" style={{ color: COLORS.textMuted }}>loading library</p></div>;

  return (
    <div className="w-full relative">
      {userEmail && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <button 
            onClick={() => { setActiveTab("mine"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all shadow-sm ${activeTab === "mine" ? "bg-orange-600 text-white" : "bg-white text-slate-400 border"}`}
          >
            <User size={14}/> My fusions ({myFusions.length})
          </button>
          <button 
            onClick={() => { setActiveTab("all"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all shadow-sm ${activeTab === "all" ? "bg-orange-600 text-white" : "bg-white text-slate-400 border"}`}
          >
            <Globe size={14}/> All ({fusions.length})
          </button>
        </div>
      )}

      {confirmDelete.show && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-t-8" style={{ borderColor: COLORS.dangerColor }}>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} style={{ color: COLORS.dangerColor }} /></div>
            <h4 className="text-xl font-bold mb-2" style={{ color: COLORS.textDark }}>remove fusion?</h4>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete({ show: false, track: null })} className="flex-1 py-3 rounded-xl border font-bold text-sm" style={{ borderColor: COLORS.borderLight, color: COLORS.textGray }}>cancel</button>
              <button disabled={isDeleting} onClick={handleDelete} className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center" style={{ backgroundColor: COLORS.dangerColor }}>{isDeleting ? <Loader2 size={18} className="animate-spin" /> : "delete"}</button>
            </div>
          </div>
        </div>
      )}
      {loginModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-t-8" style={{ borderColor: COLORS.primaryColor }}>
            <AlertCircle className="mx-auto mb-4" size={48} style={{ color: COLORS.primaryColor }} />
            <p className="text-sm mb-6 px-4" style={{ color: COLORS.textGray }}>please login to download tracks.</p>
            <button onClick={() => setLoginModal(false)} className="w-full py-3 rounded-xl transition-all active:scale-95" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>ok</button>
          </div>
        </div>
      )}
      <div className="mb-10 w-full" ref={dropdownRef}>
        <div className="relative flex flex-col md:flex-row md:items-center w-full rounded-2xl md:rounded-full p-1.5 border gap-2" style={{ backgroundColor: "#FDF5ED", borderColor: COLORS.borderLight }}>
          <div className="flex items-center flex-1">
            <div className="flex items-center pl-3 pr-2 pointer-events-none"><Search size={18} style={{ color: COLORS.textMuted }} /></div>
            <input type="text" placeholder={`search ${userEmail && activeTab === 'mine' ? 'your' : 'all'} tracks...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent py-3 outline-none text-sm" style={{ color: COLORS.textDark }} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-2 border-t md:border-t-0 md:border-l py-2 md:py-0" style={{ borderColor: COLORS.borderLight }}>
            <button onClick={() => setSearchTerm("")} className="px-4 py-1.5 rounded-xl text-xs" style={{ backgroundColor: searchTerm === "" ? "#E67E22" : "#FFF", color: searchTerm === "" ? "#FFF" : "#666", border: searchTerm === "" ? "none" : "1px solid #E5E7EB" }}>all</button>
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === "heritage" ? null : "heritage")} className="px-4 py-1.5 rounded-xl text-xs flex items-center gap-1" style={{ backgroundColor: activeDropdown === "heritage" ? "#E67E22" : "#FFF", color: activeDropdown === "heritage" ? "#FFF" : "#666", border: activeDropdown === "heritage" ? "none" : "1px solid #E5E7EB" }}>heritage <ChevronDown size={12} /></button>
              {activeDropdown === "heritage" && <div className="absolute top-full right-0 md:left-0 mt-2 w-56 bg-white border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto">{heritageTitles.map(t => <button key={t} onClick={() => { setSearchTerm(t); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-200 rounded-lg truncate">{t}</button>)}</div>}
            </div>
            <div className="relative">
              <button onClick={() => setActiveDropdown(activeDropdown === "modern" ? null : "modern")} className="px-4 py-1.5 rounded-xl text-xs flex items-center gap-1" style={{ backgroundColor: activeDropdown === "modern" ? "#E67E22" : "#FFF", color: activeDropdown === "modern" ? "#FFF" : "#666", border: activeDropdown === "modern" ? "none" : "1px solid #E5E7EB" }}>modern <ChevronDown size={12} /></button>
              {activeDropdown === "modern" && <div className="absolute top-full right-0 md:left-0 mt-2 w-56 bg-white border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto">{modernTitles.map(t => <button key={t} onClick={() => { setSearchTerm(t); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-200 rounded-lg truncate">{t}</button>)}</div>}
            </div>
          </div>
        </div>
      </div>
      {error ? <div className="p-8 text-center rounded-3xl" style={{ color: COLORS.dangerColor }}><AlertCircle size={24} className="mx-auto mb-2" /><p className="text-[10px] mt-2 font-mono">{error}</p></div> : 
      filteredFusions.length === 0 ? <div className="text-center py-10"><p className="text-xs" style={{ color: COLORS.textMuted }}>no tracks available in this view</p></div> : 
      <div className="flex flex-wrap justify-center gap-8 md:gap-10 px-2 pb-10">
        {filteredFusions.map((t) => (
          <FusedCard 
            key={t.id} 
            track={t} 
            setLoginModal={setLoginModal} 
            fusedPrice={fusedPrice} 
            onDelete={(track: FusedTrack) => setConfirmDelete({ show: true, track })} 
          />
        ))}
      </div>}
    </div>
  );
};

export default FusedList;