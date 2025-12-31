import React, { useState, useEffect } from "react";
import axios from "axios";
import { Track } from "../types";
import { FORM_FIELDS } from "./supportives/attributes";
import { COUNTRIES } from "./supportives/countries";

interface Props { 
  tracks: Track[]; 
  onEdit: (track: Track) => void; 
  onRefresh?: () => void; 
  userRole: string | null;
  isLoggedIn: boolean;
  userEmail: string | null;
}

const MusicList: React.FC<Props> = ({ 
  tracks, 
  onEdit, 
  onRefresh, 
  userRole, 
  isLoggedIn, 
  userEmail 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullImg, setFullImg] = useState<string | null>(null);
  const [visibleTooltip, setVisibleTooltip] = useState<string | null>(null);
  const [modal, setModal] = useState<{ show: boolean; id: string | null; title: string; type: "approve" | "reject" | "unapprove" | null }>({ show: false, id: null, title: "", type: null });

  const API = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh?.();
    }, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");
  const isStandardUser = !isAdmin;
  
  const approvedTracks = tracks.filter(t => t.isapproved);
  const myPendingTracks = tracks.filter(t => !t.isapproved && t.contributor === userEmail);
  const mainDisplayTracks = isStandardUser ? approvedTracks : tracks;

  const handleAction = async () => {
    const token = sessionStorage.getItem("userToken");
    if (!modal.id || !modal.type || !token) return;
    setIsProcessing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const ep = modal.type === "approve" ? `approve-track/${modal.id}` : modal.type === "unapprove" ? `unapprove-track/${modal.id}` : `delete-track/${modal.id}`;
      const url = `${API}/api/tracks/${ep}`;
      modal.type === "reject" ? await axios.delete(url, cfg) : await axios.patch(url, {}, cfg);
      setModal({ show: false, id: null, title: "", type: null });
      onRefresh?.();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${fileName}.mp3`;
      link.click();
    } catch (e) { console.error("Download failed", e); }
  };

  const showTooltip = (id: string) => {
    setVisibleTooltip(id);
    setTimeout(() => {
      setVisibleTooltip((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const renderTrackCard = (t: Track) => {
    const cCode = COUNTRIES.find(c => c.name === t.country)?.code.toLowerCase();
    const isPending = !t.isapproved, isExp = expandedId === t.sound_id;
    const isContributor = isLoggedIn && userEmail && t.contributor === userEmail;

    return (
      <div key={t.sound_id} className={`bg-white flex flex-col border-x border-b relative shadow-sm w-[220px] mx-auto sm:mx-0 ${isPending ? "border-orange-500" : "border-gray-200"}`} style={{ borderRadius: "1000px 1000px 16px 16px", height: 'fit-content' }}>
        <div className={`w-full aspect-square rounded-full overflow-hidden cursor-pointer relative border flex items-center justify-center ${isPending ? "border-orange-500" : "border-gray-200"}`} onClick={() => setFullImg(t.album_file_url || "/placeholder.png")}>
          <img src={t.album_file_url || "/placeholder.png"} className="w-[96%] h-[96%] object-contain rounded-full" alt="" />
          {isPending && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md">Pending</span></div>}
        </div>

        <div className="px-3 py-3 flex flex-col text-center">
          <div className="flex items-center justify-center gap-1 mb-0 relative">
            <h3 className="font-bold truncate text-[16px] text-gray-900">{t.title}</h3>

            {isContributor && (
              <div className="relative flex items-center">
                <div 
                  className="text-yellow-400 shrink-0 cursor-pointer active:scale-110 transition-transform" 
                  onClick={(e) => {
                    e.stopPropagation();
                    showTooltip(t.sound_id);
                  }}
                  title="your uploads"
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>

                {visibleTooltip === t.sound_id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in duration-200">
                    Your upload
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[13px] text-gray-700 truncate mb-2 italic leading-tight">{t.performer}</p>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <audio controls controlsList="nodownload" className="flex-1 h-8"><source src={t.sound_track_url} type="audio/mpeg" /></audio>
            {isAdmin && <button onClick={() => handleDownload(t.sound_track_url!, t.title)} className="p-2 bg-white text-gray-700 hover:text-[#E67E22] rounded-full border border-gray-200 flex-shrink-0"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>}
          </div>
          <div className="mt-2 flex justify-between items-center text-[12px]">
            <span className="text-gray-800 font-bold px-1">{t.category}</span>
            {cCode && <img src={`https://flagcdn.com/w20/${cCode}.png`} className="w-5 h-3.5 shadow-sm rounded-sm" alt="" />}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2">
            <div className="flex justify-between items-center w-full px-1">
              <button onClick={() => setExpandedId(isExp ? null : t.sound_id)} className="text-indigo-700 text-[11px] font-semibold">
                {isExp ? "Less" : "Details"}
              </button>

              {isAdmin && (
                <>
                  {isPending ? (
                    <>
                      <button onClick={() => onEdit(t)} className="text-blue-700 text-[11px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "approve" })} className="text-amber-600 text-[11px] font-semibold hover:underline">Approve</button>
                      <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "reject" })} className="text-red-700 text-[11px] font-semibold hover:underline">Reject</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onEdit(t)} className="text-blue-700 text-[11px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "unapprove" })} className="text-red-700 text-[11px] font-semibold hover:underline">Remove</button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {isExp && (
            <div className="mt-2 text-[11px] text-left border-t border-gray-50 pt-2">
              {FORM_FIELDS.filter(f => f.type !== "file" && f.name !== "id" && f.name !== "sound_id" && f.name !== "contributor").map(f => (
                  <p key={f.name} className="py-0.5 text-gray-800"><span className="font-bold text-gray-900">{f.label}:</span> {(t as any)[f.name] || "-"}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!tracks?.length) return <p className="text-center py-10 text-gray-900 text-lg">No tracks available</p>;

  return (
    <div className="w-full">
      {fullImg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={() => setFullImg(null)}>
          <button className="absolute top-6 right-8 text-white text-6xl font-light" onClick={() => setFullImg(null)}>&times;</button>
          <img src={fullImg} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="font-semibold text-xl mb-2 text-gray-900">{modal.type === "approve" ? "Approve track" : modal.type === "unapprove" ? "Remove from library" : "Reject and delete track"}</h4>
            <p className="text-gray-700 text-base mb-6">{modal.type === "unapprove" ? `Move ${modal.title} back to pending?` : `Confirm action for ${modal.title}?`}</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleAction} disabled={isProcessing} className={`flex-[2] min-w-[100px] px-4 py-2.5 rounded-xl text-sm border flex items-center justify-center gap-2 ${modal.type === "reject" ? "bg-red-50 text-red-700 border-red-200" : "bg-orange-50 text-[#E67E22] border-orange-200"}`}>
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    <span>Processing</span>
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
              <button onClick={() => setModal({ show: false, id: null, title: "", type: null })} className="flex-1 min-w-[80px] text-gray-600 text-sm font-semibold border border-transparent">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 text-gray-900">Heritage Sounds Library</h2>

      <div className="w-full overflow-x-auto pb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-4 min-w-fit sm:min-w-0">
          {mainDisplayTracks.map(t => renderTrackCard(t))}
        </div>
      </div>

      {isLoggedIn && isStandardUser && myPendingTracks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6 text-orange-600 uppercase tracking-wide">Your uploads currently under review</h2>
          <div className="w-full overflow-x-auto pb-6">
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-4 min-w-fit sm:min-w-0">
              {myPendingTracks.map(t => renderTrackCard(t))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicList;