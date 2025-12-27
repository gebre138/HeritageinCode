import React, { useState } from "react";
import axios from "axios";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";

interface Props {
  tracks: Track[];
  onEdit: (track: Track) => void;
  onRefresh?: () => void;
}

const getCountryFlagUrl = (countryName: string): string => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ? `https://flagcdn.com/w20/${country.code.toLowerCase()}.png` : "";
};

const ModernMusicList: React.FC<Props> = ({ tracks, onEdit, onRefresh }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ 
    show: boolean; 
    trackId: string | number | null; 
    title: string;
    type: "approve" | "reject" | "unapprove" | null;
  }>({
    show: false,
    trackId: null,
    title: "",
    type: null
  });

  const userRole = sessionStorage.getItem("role");
  const token = sessionStorage.getItem("userToken");
  const api_url = process.env.REACT_APP_API_URL || "";

  const handleAction = async () => {
    if (!confirmModal.trackId || !confirmModal.type) return;

    setIsProcessing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (confirmModal.type === "approve") {
        await axios.patch(`${api_url}/api/modern/approve-track/${confirmModal.trackId}`, {}, config);
      } else if (confirmModal.type === "unapprove") {
        await axios.patch(`${api_url}/api/modern/unapprove-track/${confirmModal.trackId}`, {}, config);
      } else {
        await axios.delete(`${api_url}/api/modern/delete-track/${confirmModal.trackId}`, config);
      }
      
      setConfirmModal({ show: false, trackId: null, title: "", type: null });
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(`Failed to ${confirmModal.type} modern track`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!tracks || tracks.length === 0) {
    return <p className="text-gray-400 italic mt-6">No modern tracks found in the archive.</p>;
  }

  return (
    <div className="mt-12 w-full">
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <h4 className="text-gray-900 font-bold text-lg mb-2">
              {confirmModal.type === "approve" ? "Approve track" : confirmModal.type === "unapprove" ? "Move to Pending" : "Reject & delete track"}
            </h4>
            <p className="text-gray-500 text-sm mb-6">Confirm action</p>
            <div className="flex gap-3">
              <button 
                disabled={isProcessing}
                onClick={handleAction} 
                className={`flex-[2] px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                  confirmModal.type === "reject"
                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                  : "bg-[#E67E22]/10 text-[#E67E22] border-[#E67E22]/30"
                }`}
              >
                {isProcessing ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Confirm"}
              </button>
              <button 
                disabled={isProcessing}
                onClick={() => setConfirmModal({ show: false, trackId: null, title: "", type: null })} 
                className="flex-1 text-gray-400 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-extrabold mb-6">Modern Sounds Library</h2>
      
      <div className="w-full overflow-x-auto pb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-6 min-w-fit sm:min-w-0">
          {tracks.map((track) => {
            const flagUrl = track.country ? getCountryFlagUrl(track.country) : "";
            const trackId = (track as any).sound_id;
            const isPending = !track.isapproved;
            
            return (
              <div 
                key={trackId} 
                className={`bg-white border-2 flex flex-col p-5 transition-all relative h-auto flex-shrink-0 w-[260px] mx-auto sm:mx-0 ${isPending ? "border-orange-400 shadow-orange-50" : "border-gray-200 shadow-sm"}`} 
                style={{ borderRadius: "20px" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <span className="bg-gray-100 text-[#E67E22] text-[10px] font-bold px-2 py-1 rounded uppercase w-fit">
                      {track.category || "Modern"}
                    </span>
                    {isPending && (
                      <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-bold w-fit">PENDING</span>
                    )}
                  </div>
                  {flagUrl && <img src={flagUrl} alt={track.country} className="w-5 h-4 rounded shadow-sm" />}
                </div>
                
                <div className="mb-4">
                  <h3 className="font-bold text-center text-lg truncate leading-tight text-gray-900">{track.country}</h3>
                </div>

                <div className="flex-1">
                  {track.modernaudio_url ? (
                    <audio controls controlsList="nodownload" className="w-full h-8 mt-2">
                      <source src={track.modernaudio_url} type="audio/mpeg" />
                    </audio>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-2 text-center">No audio found</p>
                  )}
                </div>

                <div className="mt-5 flex justify-between items-center border-t border-gray-100 pt-3">
                  <div className="flex gap-3">
                    {(userRole === "admin" || userRole === "superadmin") && (
                      isPending ? (
                        <>
                          <button 
                            onClick={() => setConfirmModal({ show: true, trackId: trackId, title: track.country || "Untitled", type: "approve" })}
                            className="text-[#E67E22] text-[11px] font-bold hover:underline"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setConfirmModal({ show: true, trackId: trackId, title: track.country || "Untitled", type: "reject" })}
                            className="text-red-500 text-[11px] font-bold hover:underline"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setConfirmModal({ show: true, trackId: trackId, title: track.country || "Untitled", type: "unapprove" })}
                          className="text-[#E67E22] text-[11px] font-bold hover:underline"
                        >
                          Remove
                        </button>
                      )
                    )}
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