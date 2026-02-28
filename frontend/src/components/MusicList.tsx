import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { Track } from "../types";
import { FORM_FIELDS } from "./supportives/attributes";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";
import { TriangleAlert } from "lucide-react";
import TransactionManager from "./TransactionManager";

interface Props { 
  tracks: Track[]; 
  onEdit: (track: Track) => void; 
  onRefresh?: () => void; 
  userRole: string | null;
  isLoggedIn: boolean;
  userEmail: string | null;
  setActiveTab?: (tab: any) => void;
  setSelectedTrackForFusion?: (track: Track) => void;
}

const TrackCard = React.memo(({ t, isAdmin, isLoggedIn, userEmail, setFullImg, onEdit, setModal, setLoginModal, heritagePrice, setActiveTab, setSelectedTrackForFusion }: any) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [activePanel, setActivePanel] = useState<"context" | "detail" | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cCode = useMemo(() => COUNTRIES.find(c => c.name === t.country)?.code.toLowerCase(), [t.country]);
  const isPending = !t.isapproved;
  const isOwner = isLoggedIn && userEmail === t.contributor;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [t.sound_track_url]);

  const CULTURAL_FIELDS = [
    { key: "traditional_use", label: "Traditional Use" },
    { key: "ensemble_role", label: "Ensemble Role" },
    { key: "cultural_function", label: "Cultural Function" },
    { key: "musical_behaviour", label: "Musical Behaviour" },
    { key: "modern_use_tip", label: "Modern Use Tip" }
  ];

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2000);
  };

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePanel(activePanel === "detail" ? null : "detail");
  };

  const toggleContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePanel(activePanel === "context" ? null : "context");
  };

  const handleFuse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    if (setSelectedTrackForFusion && setActiveTab) {
      setSelectedTrackForFusion(t);
      setActiveTab("fusion");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getButtonStyle = (panelType: "detail" | "context") => ({
    color: activePanel === panelType ? "#f59e0b" : COLORS.actionDetails,
    textDecorationColor: activePanel === panelType ? "#f59e0b" : "inherit"
  });

  return (
    <div className="flex flex-col border-x border-b relative shadow-sm w-[260px] mx-auto sm:mx-0" style={{ borderRadius: "1000px 1000px 166px 166px", height: 'fit-content', backgroundColor: COLORS.bgWhite, borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }}>
      <div className="w-full aspect-square rounded-full overflow-hidden cursor-pointer relative border flex items-center justify-center" style={{ borderColor: isPending ? COLORS.borderPending : COLORS.borderLight }} onClick={() => setFullImg(t.album_file_url || "/placeholder.png")}>
        <img src={t.album_file_url || "/placeholder.png"} className="w-[96%] h-[96%] object-contain rounded-full" alt="" />
        {isPending && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-white text-[10px] px-2 py-0.5 rounded-full shadow-md" style={{ backgroundColor: COLORS.statusPending }}>Pending</span></div>}
      </div>
      <div className="px-3 py-3 flex flex-col text-center">
        <div className="flex items-center justify-center gap-1 mb-0 relative">
          <h3 className="font-bold truncate text-[16px]" style={{ color: COLORS.textDark }}>{t.title}</h3>
          {isOwner && (
            <div className="shrink-0 cursor-pointer relative" style={{ color: COLORS.statusContributor }} onClick={handleIconClick}>
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap animate-in fade-in zoom-in duration-200 z-50">
                  Your Upload
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-[13px] truncate mb-2 italic leading-tight" style={{ color: COLORS.textColor }}>{t.performer}</p>
        <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <audio ref={audioRef} src={t.sound_track_url} controls preload="metadata" controlsList="nodownload" className="flex-1 h-8" />
          <div className="flex flex-col items-center">
            <TransactionManager 
              item={{
                id: String(t.sound_id),
                user_mail: t.contributor,
                heritage_sound: t.title,
                community: t.community
              }}
              currentUserEmail={userEmail}
              downloadUrl={t.sound_track_url}
              onOpenLogin={() => setLoginModal(true)}
              price={heritagePrice}
              variant="heritage"
            />
            <span className="text-[8px] font-bold mt-0.5 uppercase opacity-70" style={{ color: COLORS.primaryColor }}>
              {heritagePrice} USD
            </span>
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center text-[12px]"><span className="font-bold px-1" style={{ color: COLORS.textColor }}>{t.category}</span>{cCode && <img src={`https://flagcdn.com/w20/${cCode}.png`} className="w-5 h-3.5 shadow-sm rounded-sm" alt="" />}</div>
        <div className="mt-2 border-t pt-2" style={{ borderColor: COLORS.borderMain }}>
          <div className="flex items-center justify-between px-1 h-8">
            <button onClick={toggleDetails} className="text-[12px] font-bold underline cursor-pointer transition-colors" style={getButtonStyle("detail")}>Detail</button>
            <button onClick={toggleContext} className="text-[12px] font-bold underline cursor-pointer transition-colors" style={getButtonStyle("context")}>Context</button>
            <button type="button" onClick={handleFuse} className="text-[12px] font-bold underline cursor-pointer" style={{ color: COLORS.actionDetails }}>Fuse</button>
            {isAdmin && (
              <>
                <button onClick={() => onEdit(t)} className="text-[12px] font-bold underline cursor-pointer" style={{ color: COLORS.actionEdit }}>Edit</button>
                {isPending ? (
                  <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "reject", contributor: t.contributor })} className="text-[12px] font-bold underline cursor-pointer" style={{ color: COLORS.dangerColor }}>Reject</button>
                ) : (
                  <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "unapprove" })} className="text-[12px] font-bold underline cursor-pointer" style={{ color: COLORS.dangerColor }}>Remove</button>
                )}
              </>
            )}
          </div>
          {isPending && isAdmin && (
            <button onClick={() => setModal({ show: true, id: t.sound_id, title: t.title, type: "approve", contributor: t.contributor })} className="w-full py-1 text-[11px] font-bold rounded-lg border border-green-500 text-green-600 bg-green-50 mb-1 mt-2">Approve Now</button>
          )}
        </div>
        {activePanel === "context" && (
          <div className="mt-3 text-[12px] text-left border-t border-orange-100 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {CULTURAL_FIELDS.map(cf => (
              <p key={cf.key} className="py-1" style={{ color: COLORS.textColor }}>
                <span className="font-bold" style={{ color: COLORS.textDark }}>{cf.label}:</span> {(t as any)[cf.key] || "--"}
              </p>
            ))}
          </div>
        )}
        {activePanel === "detail" && (
          <div className="mt-3 text-[12px] text-left border-t pt-2 animate-in fade-in slide-in-from-top-1 duration-200" style={{ borderColor: COLORS.bgGray }}>
            {FORM_FIELDS.filter(f => !["file", "id", "sound_id", "contributor", "sound_track", "album_file", "sound_track_url", "album_file_url"].includes(f.name)).map(f => (
              <p key={f.name} className="py-1" style={{ color: COLORS.textColor }}>
                <span className="font-bold" style={{ color: COLORS.textDark }}>{f.label}:</span> {(t as any)[f.name] || "-"}
              </p>
            ))}
            {(isAdmin || isOwner) && (
              <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: COLORS.borderLight }}>
                <span className="font-bold" style={{ color: COLORS.textDark }}>Total Fusion:</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border" style={{ borderColor: COLORS.primaryColor, color: "#000000" }}>
                  {t.fusion_count || 0}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const MusicList: React.FC<Props> = ({ tracks, onEdit, onRefresh, userRole, isLoggedIn, userEmail, setActiveTab, setSelectedTrackForFusion }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullImg, setFullImg] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [groupSettings, setGroupSettings] = useState({ group_by_category: 0, group_by_country: 0, heritage_download: 1.00 });
  const [modal, setModal] = useState<any>({ show: false, id: null, title: "", type: null, contributor: "" });
  const [loginModal, setLoginModal] = useState(false);
  const API = process.env.REACT_APP_API_URL || "";
  const token = sessionStorage.getItem("userToken");
  const isAdmin = isLoggedIn && (userRole === "admin" || userRole === "superadmin");

  const fetchGroupSettings = useCallback(async () => {
    try {
      const [controlsRes, pricingRes] = await Promise.all([
        axios.get(`${API}/api/tracks/admin/controls`),
        axios.get(`${API}/api/payment/pricing`)
      ]);
      setGroupSettings({
        group_by_category: Number(controlsRes.data.group_by_category) || 0,
        group_by_country: Number(controlsRes.data.group_by_country) || 0,
        heritage_download: pricingRes.data.heritage_download !== undefined ? Number(pricingRes.data.heritage_download) : 1.00
      });
    } catch (err) { console.warn(err); }
  }, [API]);

  useEffect(() => { 
    fetchGroupSettings(); 
    const i = setInterval(() => { onRefresh?.(); fetchGroupSettings(); }, 10000); 
    return () => clearInterval(i); 
  }, [onRefresh, fetchGroupSettings]);

  const activeGroupKey = groupSettings.group_by_category === 1 ? 'category' : groupSettings.group_by_country === 1 ? 'country' : null;
  useEffect(() => { if (!activeGroupKey) setActiveFolder(null); }, [activeGroupKey]);

  const approvedTracks = useMemo(() => tracks.filter(t => t.isapproved), [tracks]);
  const mainTracks = useMemo(() => isAdmin ? tracks : approvedTracks, [tracks, approvedTracks, isAdmin]);
  const groupedData = useMemo(() => activeGroupKey ? mainTracks.reduce((acc: any, t: any) => { const n = t[activeGroupKey] || "Uncategorized"; if (!acc[n]) acc[n] = []; acc[n].push(t); return acc; }, {}) : null, [mainTracks, activeGroupKey]);

  const handleAction = async () => {
    if (!modal.id || !modal.type || !token) return;
    setIsProcessing(true);
    try {
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const ep = modal.type === "approve" ? `approve-track/${modal.id}` : modal.type === "unapprove" ? `unapprove-track/${modal.id}` : `delete-track/${modal.id}`;
      if (modal.type === "reject") {
        await axios.delete(`${API}/api/tracks/${ep}`, { ...cfg, data: { email: modal.contributor, title: modal.title } });
      } else {
        await axios.patch(`${API}/api/tracks/${ep}`, {}, cfg);
      }
      setModal({ show: false, id: null, title: "", type: null, contributor: "" });
      onRefresh?.();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  if (!tracks?.length) return <p className="text-center py-10" style={{ color: COLORS.textDark }}>No tracks available</p>;

  return (
    <div className="w-full">
      {fullImg && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95" onClick={() => setFullImg(null)}><img src={fullImg} alt="" className="max-w-full max-h-[90vh] rounded-lg" /></div>}
      {loginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-t-8" style={{ borderColor: COLORS.primaryColor }}>
            <TriangleAlert className="mx-auto mb-4" size={48} style={{ color: COLORS.primaryColor }} />
            <p className="text-sm mb-6 px-4" style={{ color: COLORS.textGray }}>Please login to download or fuse tracks.</p>
            <button onClick={() => setLoginModal(false)} className="w-full py-3 rounded-xl font-bold transition-all active:scale-95" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>OK</button>
          </div>
        </div>
      )}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: COLORS.bgModal }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl mb-4" style={{ color: "black" }}>{modal.type === "approve" ? "Approve" : modal.type === "reject" ? "Reject" : "Remove"} {modal.title}?</h4>
            <div className="flex gap-3">
              <button onClick={handleAction} disabled={isProcessing} className="flex-1 py-2 rounded-xl border flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.primaryTransparent, color: COLORS.primaryColor, borderColor: COLORS.primaryColor }}>
                {isProcessing ? <><div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div><span>Processing...</span></> : "Confirm"}
              </button>
              <button onClick={() => setModal({ show: false, id: null, title: "", type: null, contributor: "" })} className="flex-1 py-2" style={{ color: COLORS.textLight }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {activeGroupKey && groupedData && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 sm:gap-8 mb-8 px-2">
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
                t={t} 
                isAdmin={isAdmin} 
                isLoggedIn={isLoggedIn} 
                userEmail={userEmail} 
                setFullImg={setFullImg} 
                onEdit={onEdit} 
                setModal={setModal} 
                setLoginModal={setLoginModal} 
                heritagePrice={groupSettings.heritage_download} 
                setActiveTab={setActiveTab} 
                setSelectedTrackForFusion={setSelectedTrackForFusion} 
              />
            ))}
          </div>
        </div>
      )}
      {!activeFolder && (
        <div className="mb-12">
          {!activeGroupKey && <h2 className="text-2xl font-bold mb-6 border-l-4 pl-4" style={{ color: COLORS.textDark, borderColor: COLORS.primaryColor }}>Heritage Sounds Library</h2>}
          <div className="flex flex-wrap justify-center gap-4">
            {mainTracks.map(t => (
              <TrackCard 
                key={t.sound_id} 
                t={t} 
                isAdmin={isAdmin} 
                isLoggedIn={isLoggedIn} 
                userEmail={userEmail} 
                setFullImg={setFullImg} 
                onEdit={onEdit} 
                setModal={setModal} 
                setLoginModal={setLoginModal} 
                heritagePrice={groupSettings.heritage_download} 
                setActiveTab={setActiveTab} 
                setSelectedTrackForFusion={setSelectedTrackForFusion} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicList;