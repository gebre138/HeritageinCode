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

const ModernMusicList: React.FC<Props> = ({ tracks, onRefresh, userRole, isLoggedIn, userEmail }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; trackId: string | number | null; title: string; type: "approve" | "reject" | "unapprove" | null; }>({ show: false, trackId: null, title: "", type: null });

  const api_url = process.env.REACT_APP_API_URL || "";
  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");

  const handleAction = async () => {
    const token = sessionStorage.getItem("userToken");
    if (!confirmModal.trackId || !confirmModal.type || !token) return;
    setIsProcessing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const ep = confirmModal.type === "approve" ? `approve-track/${confirmModal.trackId}` : confirmModal.type === "unapprove" ? `unapprove-track/${confirmModal.trackId}` : `delete-track/${confirmModal.trackId}`;
      if (confirmModal.type === "reject") {
        await axios.delete(`${api_url}/api/modern/${ep}`, config);
      } else {
        await axios.patch(`${api_url}/api/modern/${ep}`, {}, config);
      }
      setConfirmModal({ show: false, trackId: null, title: "", type: null });
      if (onRefresh) onRefresh();
    } catch {
      alert(`Failed to ${confirmModal.type} track`);
    } finally { setIsProcessing(false); }
  };

  if (!tracks || tracks.length === 0) return <p className="italic mt-6" style={{ color: COLORS.textLight }}>No modern tracks found in the archive.</p>;

  return (
    <div className="mt-12 w-full">
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border" style={{ borderColor: COLORS.borderLight }}>
            <h4 className="text-xl mb-4" style={{ color: COLORS.textDark }}>
              {confirmModal.type === "approve" ? "Approve" : confirmModal.type === "reject" ? "Reject" : "Remove"} {confirmModal.title}?
            </h4>
            <div className="flex gap-3">
              <button disabled={isProcessing} onClick={handleAction} className="flex-1 py-2 rounded-xl border flex items-center justify-center gap-2 transition-colors font-semibold" style={{ backgroundColor: COLORS.primaryTransparent, color: COLORS.primaryColor, borderColor: COLORS.primaryColor }}>
                {isProcessing ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : "Confirm"}
              </button>
              <button onClick={() => setConfirmModal({ show: false, trackId: null, title: "", type: null })} className="flex-1 py-2 font-semibold" style={{ color: COLORS.textLight }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 border-l-4 pl-4" style={{ color: COLORS.textDark, borderColor: COLORS.primaryColor }}>Modern Sounds Library</h2>
      
      <div className="flex flex-wrap justify-left gap-4">
        {tracks.map((track) => {
          const trackId = track.sound_id;
          const isExpanded = expandedTrackId === trackId;
          const isPending = !track.isapproved;
          const isContributor = isLoggedIn && userEmail === track.contributor;
          const flagUrl = track.country ? getCountryFlagUrl(track.country) : "";

          return (
            /* Layout without cover image */
            <div key={trackId} className="flex flex-col border relative shadow-sm w-[220px] p-4" style={{ borderRadius: "20px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }}>
              
              <div className="flex flex-col text-center">
                <div className="flex items-center justify-center gap-1 mb-3">
                  <h3 className="font-bold truncate text-[16px]" style={{ color: COLORS.textDark }}>{track.category || "Modern Track"}</h3>
                  {isContributor && <div title="Your upload" style={{ color: COLORS.statusContributor }}><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>}
                  {isPending && <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white ml-1" style={{ backgroundColor: COLORS.statusPending }}>Pending</span>}
                </div>

                <div className="p-1.5 rounded-xl border mb-3" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
                  {track.modernaudio_url ? (
                    <audio controls controlsList="nodownload" className="w-full h-8"><source src={track.modernaudio_url} type="audio/mpeg" /></audio>
                  ) : <p className="text-[10px] italic">No audio preview</p>}
                </div>

                <div className="flex justify-between items-center text-[12px] mb-2 px-1">
                   <span className="font-medium" style={{ color: COLORS.textColor }}>{track.country || "Global"}</span>
                   {flagUrl && <img src={flagUrl} className="w-5 h-3.5 shadow-sm rounded-sm" alt="" />}
                </div>

                <div className="mt-1 border-t pt-2 flex items-center justify-between px-1 h-8" style={{ borderColor: COLORS.borderMain }}>
                  <button onClick={() => setExpandedTrackId(isExpanded ? null : trackId)} className="text-[13px] font-semibold" style={{ color: COLORS.actionDetails }}>{isExpanded ? "Less" : "Details"}</button>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button onClick={() => setConfirmModal({ show: true, trackId, title: track.category || "Modern", type: "approve" })} className="text-[12px] font-bold" style={{ color: COLORS.actionApprove }}>Approve</button>
                      ) : (
                        <button onClick={() => setConfirmModal({ show: true, trackId, title: track.category || "Modern", type: "unapprove" })} className="text-[12px] font-bold" style={{ color: COLORS.dangerColor }}>Remove</button>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  /* Expanded details matching the 'moderntrack' database table schema */
                  <div className="mt-2 text-[11px] text-left border-t pt-2 space-y-1" style={{ borderColor: COLORS.bgGray }}>
                    {[
                      { label: 'Category', val: track.category },
                      { label: 'Country', val: track.country },
                      { label: 'Rhythm Style', val: track.rhythm_style },
                      { label: 'Harmony Type', val: track.harmony_type },
                      { label: 'BPM', val: track.bpm }
                    ].map(f => f.val && (
                      <div key={f.label} className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: COLORS.textDark }}>{f.label}:</span>
                        <span style={{ color: COLORS.textColor }}>{f.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModernMusicList;