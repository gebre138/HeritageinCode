import React, { useState } from "react";
import axios from "axios";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";

interface Props {
  tracks: Track[];
  onEdit: (track: Track) => void;
  onRefresh?: () => void;
  userRole: string | null;
  isLoggedIn: boolean;
  userEmail: string | null;
}

const getCountryFlagUrl = (countryName: string): string => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ? `https://flagcdn.com/w20/${country.code.toLowerCase()}.png` : "";
};

const ModernMusicList: React.FC<Props> = ({ tracks, onEdit, onRefresh, userRole, isLoggedIn, userEmail }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; trackId: string | number | null; title: string; type: "approve" | "reject" | "unapprove" | null; }>({ show: false, trackId: null, title: "", type: null });

  const api_url = process.env.REACT_APP_API_URL || "";

  const handleAction = async () => {
    const token = sessionStorage.getItem("userToken");
    if (!confirmModal.trackId || !confirmModal.type || !token) return;
    setIsProcessing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (confirmModal.type === "approve") await axios.patch(`${api_url}/api/modern/approve-track/${confirmModal.trackId}`, {}, config);
      else if (confirmModal.type === "unapprove") await axios.patch(`${api_url}/api/modern/unapprove-track/${confirmModal.trackId}`, {}, config);
      else await axios.delete(`${api_url}/api/modern/delete-track/${confirmModal.trackId}`, config);
      setConfirmModal({ show: false, trackId: null, title: "", type: null });
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(`Failed to ${confirmModal.type} modern track`);
    } finally { setIsProcessing(false); }
  };

  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");
  if (!tracks || tracks.length === 0) return <p className="italic mt-6" style={{ color: COLORS.textLight }}>No modern tracks found in the archive.</p>;

  return (
    <div className="mt-12 w-full">
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl border" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
            <h4 className="font-bold text-lg mb-2" style={{ color: COLORS.textDark }}>{confirmModal.type === "approve" ? "Approve track" : confirmModal.type === "unapprove" ? "Move to Pending" : "Reject & delete track"}</h4>
            <p className="text-sm mb-6" style={{ color: COLORS.textGray }}>Confirm action for {confirmModal.title}</p>
            <div className="flex gap-3">
              <button disabled={isProcessing} onClick={handleAction} className="flex-[2] px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2" style={{ backgroundColor: confirmModal.type === "reject" ? COLORS.dangerBg : COLORS.primaryTransparent, color: confirmModal.type === "reject" ? COLORS.dangerColor : COLORS.primaryColor, borderColor: confirmModal.type === "reject" ? COLORS.dangerColor : COLORS.primaryColor }}>
                {isProcessing ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Processing</span></> : "Confirm"}
              </button>
              <button disabled={isProcessing} onClick={() => setConfirmModal({ show: false, trackId: null, title: "", type: null })} className="flex-1 text-xs font-bold" style={{ color: COLORS.textLight }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-extrabold mb-6" style={{ color: COLORS.textDark }}>Modern Sounds Library</h2>
      <div className="w-full overflow-x-auto pb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-6 min-w-fit sm:min-w-0">
          {tracks.map((track) => {
            const flagUrl = track.country ? getCountryFlagUrl(track.country) : "";
            const trackId = (track as any).sound_id;
            const isPending = !track.isapproved, isContributor = isLoggedIn && userEmail && track.contributor === userEmail, isExpanded = expandedTrackId === trackId;
            return (
              <div key={trackId} className={`flex flex-col p-5 transition-all relative h-auto flex-shrink-0 w-[260px] mx-auto sm:mx-0 border-2 ${isExpanded ? "ring-2 ring-orange-100" : ""}`} style={{ borderRadius: "20px", backgroundColor: COLORS.bgWhite, borderColor: isPending ? COLORS.primaryColor : COLORS.borderLight, boxShadow: isPending ? `0 4px 12px ${COLORS.primaryTransparent}` : "none" }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">{isPending && <span className="text-white text-[10px] px-3 py-1 rounded-full font-bold w-fit" style={{ backgroundColor: COLORS.primaryColor }}>PENDING</span>}</div>
                  <div className="flex flex-col items-end gap-2">
                    {flagUrl && <img src={flagUrl} alt={track.country} className="w-5 h-4 rounded shadow-sm" />}
                    {isContributor && <span className="text-[9px] italic px-1 rounded" style={{ color: COLORS.textLight, backgroundColor: COLORS.bgGray }}>Your upload</span>}
                  </div>
                </div>
                <div className="mb-4"><h3 className="font-bold text-center text-lg truncate leading-tight first-letter:uppercase lowercase" style={{ color: COLORS.textDark }}>{track.category || "Modern Track"}</h3></div>
                <div className="flex-1">
                  {track.modernaudio_url ? <audio controls controlsList="nodownload" className="w-full h-8 mt-2"><source src={track.modernaudio_url} type="audio/mpeg" /></audio> : <p className="text-xs italic mt-2 text-center" style={{ color: COLORS.textLight }}>No audio found</p>}
                  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-48 mt-4" : "max-h-0"}`}>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
                      {[['Rhythm', track.rhythm_style], ['Harmony', track.harmony_type], ['BPM', track.bpm], ['Mood', track.mood]].map(([label, val]) => (
                        <div key={label}><p className="text-[9px] uppercase font-bold" style={{ color: COLORS.textLight }}>{label}</p><p className="text-[11px] font-medium truncate" style={{ color: COLORS.textGray }}>{val || "N/A"}</p></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-between items-center border-t pt-3" style={{ borderTopColor: COLORS.borderLight }}>
                  <div className="flex gap-3">
                    <button onClick={() => setExpandedTrackId(isExpanded ? null : trackId)} className="text-[11px] font-bold hover:underline" style={{ color: COLORS.primaryColor }}>{isExpanded ? "Less" : "Details"}</button>
                    {isAdmin && (isPending ? (
                      <><button onClick={() => setConfirmModal({ show: true, trackId, title: track.category || "Modern", type: "approve" })} className="text-[11px] font-bold hover:underline" style={{ color: COLORS.primaryColor }}>Approve</button>
                        <button onClick={() => setConfirmModal({ show: true, trackId, title: track.category || "Modern", type: "reject" })} className="text-[11px] font-bold hover:underline" style={{ color: COLORS.dangerColor }}>Reject</button></>
                    ) : <button onClick={() => setConfirmModal({ show: true, trackId, title: track.category || "Modern", type: "unapprove" })} className="text-[11px] font-bold hover:underline" style={{ color: COLORS.primaryColor }}>Remove</button>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModernMusicList;