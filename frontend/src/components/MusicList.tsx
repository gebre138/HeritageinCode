import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Track } from "../types";
import { FORM_FIELDS } from "./supportives/attributes";
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

const TrackCard = React.memo(({ t, isAdmin, isLoggedIn, userEmail, expandedId, setExpandedId, setFullImg, onEdit, setModal, handleDownload, showTooltip }: any) => {
  const cCode = useMemo(() => COUNTRIES.find(c => c.name === t.country)?.code.toLowerCase(), [t.country]);
  const isPending = !t.isapproved;
  const isExp = expandedId === t.sound_id;
  return (
    <div className="flex flex-col border-x border-b relative shadow-sm w-[220px] mx-auto sm:mx-0" style={{ borderRadius: "1000px 1000px 166px 166px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }}>
      <div className="w-full aspect-square rounded-full overflow-hidden cursor-pointer relative border flex items-center justify-center" style={{ borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }} onClick={() => setFullImg(t.album_file_url || "/placeholder.png")}>
        <img src={t.album_file_url || "/placeholder.png"} className="w-[96%] h-[96%] object-contain rounded-full" alt="" />
        {isPending && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-white text-[10px] px-2 py-0.5 rounded-full shadow-md" style={{ backgroundColor: COLORS.statusPending }}>Pending</span></div>}
      </div>
      <div className="px-3 py-3 flex flex-col text-center">
        <div className="flex items-center justify-center gap-1 mb-0 relative">
          <h3 className="font-bold truncate text-[16px]" style={{ color: COLORS.textDark }}>{t.title}</h3>
          {isLoggedIn && userEmail === t.contributor && <div className="shrink-0 cursor-pointer" style={{ color: COLORS.statusContributor }} onClick={(e) => { e.stopPropagation(); showTooltip(t.sound_id); }}><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>}
        </div>
        <p className="text-[13px] truncate mb-2 italic leading-tight" style={{ color: COLORS.textColor }}>{t.performer}</p>
        <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <audio controls controlsList="nodownload" className="flex-1 h-8"><source src={t.sound_track_url} type="audio/mpeg" /></audio>
          {isAdmin && <button onClick={() => handleDownload(t.sound_track_url!, t.title)} className="p-2 rounded-full border bg-white transition-colors" style={{ color: COLORS.textGray, borderColor: COLORS.borderLight }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primaryColor} onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textGray}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>}
        </div>
        <div className="mt-2 flex justify-between items-center text-[12px]"><span className="font-bold px-1" style={{ color: COLORS.textColor }}>{t.category}</span>{cCode && <img src={`https://flagcdn.com/w20/${cCode}.png`} className="w-5 h-3.5 shadow-sm rounded-sm" alt="" />}</div>
        <div className="mt-2 border-t pt-2 flex items-center justify-between px-1 h-8 relative" style={{ borderColor: COLORS.borderMain }}>
          <button onClick={() => setExpandedId(isExp ? null : t.sound_id)} className="text-[13px] font-semibold" style={{ color: COLORS.actionDetails }}>{isExp ? "Less" : "Details"}</button>
          {isAdmin && (
            <div className={`flex items-center ${isPending ? "w-[120px] justify-between" : "gap-3"}`}>
              <button onClick={() => onEdit(t)} style={{ color: COLORS.actionEdit }}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
              {isPending ? (
                <><button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "approve" })} className="text-[13px] font-semibold" style={{ color: COLORS.actionApprove }}>Approve</button><button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "reject" })} className="text-[13px] font-semibold" style={{ color: COLORS.dangerColor }}>Reject</button></>
              ) : (
                <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "unapprove" })} className="text-[13px] font-semibold" style={{ color: COLORS.dangerColor }}>Remove</button>
              )}
            </div>
          )}
        </div>
        {isExp && (
          <div className="mt-2 text-[11px] text-left border-t pt-2" style={{ borderColor: COLORS.bgGray }}>
            {FORM_FIELDS.filter(f => !["file", "id", "sound_id", "contributor", "sound_track", "album_file", "sound_track_url", "album_file_url"].includes(f.name)).map(f => (
              <p key={f.name} className="py-0.5" style={{ color: COLORS.textColor }}>
                <span className="font-bold" style={{ color: COLORS.textDark }}>{f.label}:</span> {(t as any)[f.name] || "-"}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const MusicList: React.FC<Props> = ({ tracks, onEdit, onRefresh, userRole, isLoggedIn, userEmail }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullImg, setFullImg] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [groupSettings, setGroupSettings] = useState({ group_by_category: 0, group_by_country: 0 });
  const [modal, setModal] = useState<any>({ show: false, id: null, title: "", type: null });
  const API = process.env.REACT_APP_API_URL || "";
  const token = sessionStorage.getItem("userToken");
  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");

  const fetchGroupSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/tracks/admin/controls`);
      if (res.data) setGroupSettings(res.data.reduce((acc: any, item: any) => ({ ...acc, [item.key]: Number(item.value) }), {}));
    } catch (err) { console.error(err); }
  }, [API]);

  useEffect(() => { 
    fetchGroupSettings(); 
    const i = setInterval(() => { onRefresh?.(); fetchGroupSettings(); }, 5000); 
    return () => clearInterval(i); 
  }, [onRefresh, fetchGroupSettings]);

  const activeGroupKey = groupSettings.group_by_category === 1 ? 'category' : groupSettings.group_by_country === 1 ? 'country' : null;
  useEffect(() => { setActiveFolder(null); }, [activeGroupKey]);

  const pendingTracks = useMemo(() => tracks.filter(t => !t.isapproved), [tracks]);
  const approvedTracks = useMemo(() => tracks.filter(t => t.isapproved), [tracks]);
  const mainTracks = useMemo(() => isAdmin ? tracks : approvedTracks, [tracks, approvedTracks, isAdmin]);
  const groupedData = useMemo(() => activeGroupKey ? mainTracks.reduce((acc: any, t: any) => { const n = t[activeGroupKey] || "Uncategorized"; if (!acc[n]) acc[n] = []; acc[n].push(t); return acc; }, {}) : null, [mainTracks, activeGroupKey]);

  const handleAction = async () => {
    if (!modal.id || !modal.type || !token) return;
    setIsProcessing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const ep = modal.type === "approve" ? `approve-track/${modal.id}` : modal.type === "unapprove" ? `unapprove-track/${modal.id}` : `delete-track/${modal.id}`;
      await (modal.type === "reject" ? axios.delete(`${API}/api/tracks/${ep}`, cfg) : axios.patch(`${API}/api/tracks/${ep}`, {}, cfg));
      setModal({ show: false, id: null, title: "", type: null });
      onRefresh?.();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      const link = document.createElement("a"); link.href = window.URL.createObjectURL(new Blob([res.data])); link.setAttribute("download", `${fileName}.mp3`); document.body.appendChild(link); link.click(); link.remove();
    } catch (e) { console.error(e); }
  };

  if (!tracks?.length) return <p className="text-center py-10" style={{ color: COLORS.textDark }}>No tracks available</p>;

  return (
    <div className="w-full">
      {fullImg && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95" onClick={() => setFullImg(null)}><img src={fullImg} alt="" className="max-w-full max-h-[90vh] rounded-lg" /></div>}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: COLORS.bgModal }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl mb-4" style={{ color: "yellow" }}>
              {modal.type === "approve" ? "Approve" : modal.type === "reject" ? "Reject" : "Remove"} {modal.title}?
            </h4>
            <div className="flex gap-3">
              <button onClick={handleAction} disabled={isProcessing} className="flex-1 py-2 rounded-xl transition-colors border flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.primaryTransparent, color: COLORS.primaryColor, borderColor: COLORS.primaryColor }}>
                {isProcessing ? <><div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div><span>Processing...</span></> : "Confirm"}
              </button>
              <button onClick={() => setModal({ show: false, id: null, title: "", type: null })} className="flex-1 py-2" style={{ color: COLORS.textLight }}>Cancel</button>
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
          <div className="flex flex-wrap justify-center gap-4">{groupedData[activeFolder].map((t: any) => <TrackCard key={t.sound_id} t={t} isAdmin={isAdmin} isLoggedIn={isLoggedIn} userEmail={userEmail} expandedId={expandedId} setExpandedId={setExpandedId} setFullImg={setFullImg} onEdit={onEdit} setModal={setModal} handleDownload={handleDownload} />)}</div>
        </div>
      )}
      {!activeFolder && (
        <div className="mb-12">
          {!activeGroupKey && <h2 className="text-2xl font-bold mb-6 border-l-4 pl-4" style={{ color: COLORS.textDark, borderColor: COLORS.primaryColor }}>Heritage Sounds Library</h2>}
          {isAdmin && pendingTracks.length > 0 && (
            <div className="mb-10">
              {!activeGroupKey && <h3 className="text-sm font-bold mb-4 uppercase text-center" style={{ color: COLORS.statusPending }}>Pending Review</h3>}
              <div className="flex flex-wrap justify-center gap-4">
                {(activeGroupKey ? pendingTracks.slice(0, 4) : pendingTracks).map(t => <TrackCard key={t.sound_id} t={t} isAdmin={isAdmin} isLoggedIn={isLoggedIn} userEmail={userEmail} expandedId={expandedId} setExpandedId={setExpandedId} setFullImg={setFullImg} onEdit={onEdit} setModal={setModal} handleDownload={handleDownload} />)}
              </div>
            </div>
          )}
          <div className="mb-10">
            {isAdmin && approvedTracks.length > 0 && !activeGroupKey && <h3 className="text-sm font-bold mb-4 uppercase text-center" style={{ color: COLORS.textMuted }}>Approved Sounds</h3>}
            <div className="flex flex-wrap justify-center gap-4">
              {(activeGroupKey ? approvedTracks.slice(0, 4) : approvedTracks).map(t => <TrackCard key={t.sound_id} t={t} isAdmin={isAdmin} isLoggedIn={isLoggedIn} userEmail={userEmail} expandedId={expandedId} setExpandedId={setExpandedId} setFullImg={setFullImg} onEdit={onEdit} setModal={setModal} handleDownload={handleDownload} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicList;