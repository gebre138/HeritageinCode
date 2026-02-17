import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Track } from "../types";
import { COLORS } from "./supportives/colors";

interface Props {
  tracks: Track[];
  onEdit: (track: Track) => void;
  onRefresh?: () => void;
  userRole: string | null;
  isLoggedIn: boolean;
  userEmail: string | null;
}

const TrackCard = React.memo(({ track, isAdmin, isLoggedIn, userEmail, expandedTrackId, setExpandedTrackId, onEdit, setModal }: any) => {
  const isExpanded = expandedTrackId === track.sound_id;
  const isPending = !track.isapproved;
  const isContributor = isLoggedIn && userEmail === track.contributor;

  return (
    <div className="flex flex-col border relative shadow-sm w-[220px] p-4" style={{ borderRadius: "20px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }}>
      <div className="flex flex-col text-center">
        <div className="flex items-center justify-center gap-1 mb-3">
          <h3 className="font-bold truncate text-[16px]" style={{ color: COLORS.textDark }}>{track.category || "modern track"}</h3>
          {isContributor && (
            <div className="shrink-0 cursor-pointer relative" style={{ color: COLORS.statusContributor }}>
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
          )}
          {isPending && <span className="text-[11px] px-1.5 py-0.5 rounded-full text-white ml-1" style={{ backgroundColor: COLORS.statusPending }}>Pending</span>}
        </div>
        <div className="p-1.5 rounded-xl border mb-3" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <audio controls controlsList="nodownload" className="w-full h-8"><source src={track.modernaudio_url} type="audio/mpeg" /></audio>
        </div>
        <div className="mt-1 border-t pt-2 flex items-center justify-between px-1 h-8" style={{ borderColor: COLORS.borderMain }}>
          <button onClick={() => setExpandedTrackId(isExpanded ? null : track.sound_id)} className="text-[13px] font-semibold" style={{ color: COLORS.actionDetails }}>{isExpanded ? "Less" : "Details"}</button>
          {(isAdmin || isContributor) && (
            <div className={`flex items-center ${isPending && isAdmin ? "w-[120px] justify-between" : "gap-3"}`}>
              
              {isAdmin && (
                isPending ? (
                  <>
                    <button onClick={() => setModal({ show: true, id: track.sound_id, title: track.category, type: "approve", contributor: track.contributor })} className="text-[13px] font-semibold" style={{ color: COLORS.actionApprove }}>Approve</button>
                    <button onClick={() => setModal({ show: true, id: track.sound_id, title: track.category, type: "reject", contributor: track.contributor })} className="text-[13px] font-semibold" style={{ color: COLORS.dangerColor }}>Reject</button>
                  </>
                ) : (
                  <button onClick={() => setModal({ show: true, id: track.sound_id, title: track.category, type: "unapprove" })} className="text-[13px] font-semibold" style={{ color: COLORS.dangerColor }}>Remove</button>
                )
              )}
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="mt-2 text-[11px] text-left border-t pt-2 space-y-1" style={{ borderColor: COLORS.bgGray }}>
            <div className="flex justify-between items-center py-0.5"><span className="font-bold" style={{ color: COLORS.textDark }}>category:</span><span style={{ color: COLORS.textColor }}>{track.category}</span></div>
            <div className="flex justify-between items-center py-0.5"><span className="font-bold" style={{ color: COLORS.textDark }}>rhythm style:</span><span style={{ color: COLORS.textColor }}>{track.rhythm_style}</span></div>
            <div className="flex justify-between items-center py-0.5"><span className="font-bold" style={{ color: COLORS.textDark }}>bpm:</span><span style={{ color: COLORS.textColor }}>{track.bpm}</span></div>
            <div className="flex justify-between items-center py-0.5"><span className="font-bold" style={{ color: COLORS.textDark }}>mood:</span><span style={{ color: COLORS.textColor }}>{track.mood}</span></div>
          </div>
        )}
      </div>
    </div>
  );
});

const ModernMusicList: React.FC<Props> = ({ tracks, onEdit, onRefresh, userRole, isLoggedIn, userEmail }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | number | null>(null);
  const [modal, setModal] = useState<any>({ show: false, id: null, title: "", type: null, contributor: "" });
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [groupSettings, setGroupSettings] = useState({ group_by_category: 0, group_by_rhythm: 0 });

  const API = process.env.REACT_APP_API_URL || "";
  const token = sessionStorage.getItem("userToken");
  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");

  const fetchGroupSettings = useCallback(async () => {
    try {
      const controlsRes = await axios.get(`${API}/api/tracks/admin/controls`);
      setGroupSettings({
        group_by_category: Number(controlsRes.data.group_by_category) || 0,
        group_by_rhythm: Number(controlsRes.data.group_by_rhythm) || 0,
      });
    } catch (err) {
      console.warn("failed to fetch settings", err);
    }
  }, [API]);

  useEffect(() => {
    fetchGroupSettings();
    const i = setInterval(() => { onRefresh?.(); fetchGroupSettings(); }, 15000);
    return () => clearInterval(i);
  }, [onRefresh, fetchGroupSettings]);

  const activeGroupKey = groupSettings.group_by_category === 1 ? 'category' : groupSettings.group_by_rhythm === 1 ? 'rhythm_style' : null;

  useEffect(() => {
    if (!activeGroupKey) setActiveFolder(null);
  }, [activeGroupKey]);

  const approvedTracks = useMemo(() => tracks.filter(t => t.isapproved), [tracks]);
  const mainTracks = useMemo(() => isAdmin ? tracks : approvedTracks, [tracks, approvedTracks, isAdmin]);
  
  const groupedData = useMemo(() => {
    if (!activeGroupKey) return null;
    return mainTracks.reduce((acc: any, t: any) => {
      const n = t[activeGroupKey] || "uncategorized";
      if (!acc[n]) acc[n] = [];
      acc[n].push(t);
      return acc;
    }, {});
  }, [mainTracks, activeGroupKey]);

  const handleAction = async () => {
    if (!modal.id || !modal.type || !token) return;
    setIsProcessing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const ep = modal.type === "approve" ? `approve-track/${modal.id}` : modal.type === "unapprove" ? `unapprove-track/${modal.id}` : `delete-track/${modal.id}`;
      if (modal.type === "reject") {
        await axios.delete(`${API}/api/modern/delete-track/${modal.id}`, { ...cfg, data: { email: modal.contributor, title: modal.title } });
      } else {
        await axios.patch(`${API}/api/modern/${ep}`, {}, cfg);
      }
      setModal({ show: false, id: null, title: "", type: null, contributor: "" });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full text-[13px]">
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: COLORS.bgModal }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl mb-4" style={{ color: "black" }}>{modal.type === "approve" ? "approve" : modal.type === "reject" ? "reject" : "remove"} {modal.title}?</h4>
            <div className="flex gap-3">
              <button onClick={handleAction} disabled={isProcessing} className="flex-1 py-2 rounded-xl transition-colors border flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.primaryTransparent, color: COLORS.primaryColor, borderColor: COLORS.primaryColor }}>
                {isProcessing ? <><div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div><span>processing...</span></> : "confirm"}
              </button>
              <button onClick={() => setModal({ show: false, id: null, title: "", type: null, contributor: "" })} className="flex-1 py-2" style={{ color: COLORS.textLight }}>cancel</button>
            </div>
          </div>
        </div>
      )}

      {activeGroupKey && groupedData && (
        <div className="flex flex-wrap justify-start sm:justify-center gap-x-4 gap-y-6 sm:gap-8 mb-8 px-2">
          {Object.entries(groupedData).map(([name, groupTracks]: any) => (
            <div key={name} className="flex flex-col items-center w-[75px] sm:w-[90px]">
              <div onClick={() => setActiveFolder(activeFolder === name ? null : name)} className="relative cursor-pointer transition-transform hover:scale-105" style={{ color: activeFolder === name ? COLORS.primaryColor : COLORS.textMuted }}>
                <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white mt-1">{groupTracks.length}</span>
              </div>
              <h3 className="mt-1 font-bold text-[9px] sm:text-[10px] text-center uppercase truncate w-full px-1" style={{ color: COLORS.textDark }}>{name}</h3>
            </div>
          ))}
        </div>
      )}

      {activeFolder && groupedData?.[activeFolder] && (
        <div className="mb-12 p-4 sm:p-6 rounded-3xl relative border" style={{ backgroundColor: COLORS.bgPage, borderColor: COLORS.borderLight }}>
          <button onClick={() => setActiveFolder(null)} className="absolute top-4 right-4 text-2xl" style={{ color: COLORS.textLight }}>&times;</button>
          <h3 className="text-lg font-bold mb-6 uppercase border-l-4 pl-3" style={{ borderColor: COLORS.primaryColor, color: COLORS.textDark }}>{activeFolder}</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {groupedData[activeFolder].map((t: any) => (
              <TrackCard 
                key={t.sound_id} 
                track={t} 
                isAdmin={isAdmin} 
                isLoggedIn={isLoggedIn} 
                userEmail={userEmail} 
                expandedTrackId={expandedTrackId} 
                setExpandedTrackId={setExpandedTrackId} 
                onEdit={onEdit} 
                setModal={setModal} 
              />
            ))}
          </div>
        </div>
      )}

      {!activeFolder && (
        <div className="mb-12">
          {!activeGroupKey && <h2 className="text-2xl font-bold mb-6 border-l-4 pl-4" style={{ color: COLORS.textDark, borderColor: COLORS.primaryColor }}>modern sounds library</h2>}
          <div className="flex flex-wrap justify-start gap-4">
            {mainTracks.map(t => (
              <TrackCard 
                key={t.sound_id} 
                track={t} 
                isAdmin={isAdmin} 
                isLoggedIn={isLoggedIn} 
                userEmail={userEmail} 
                expandedTrackId={expandedTrackId} 
                setExpandedTrackId={setExpandedTrackId} 
                onEdit={onEdit} 
                setModal={setModal} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernMusicList;