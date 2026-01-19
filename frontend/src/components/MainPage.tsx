import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { MENUS, MenuKey } from "./supportives/menus";
import { COLORS } from "./supportives/colors";
import Homebody from "./supportives/homebody";
import Soundstatistics from "./supportives/soundstatistics";
import MusicList from "./MusicList";
import ModernMusicList from "./ModernMusicList";
import MusicForm from "./MusicForm";
import ModernMusicForm from "./ModernMusicForm";
import SignUpForm from "./SignUpForm";
import MusicFusion from "./MusicFusion";
import AccountsList from "./AccountsList";
import SystemSettings from "./SystemSettings";
import Ethics from "./Ethics";
import About from "./About";
import { Track } from "../types";

const MainPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOptions, setMobileOptions] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modernTracks, setModernTracks] = useState<Track[]>([]);
  const [libraryType, setLibraryType] = useState<"traditional" | "modern">("traditional");
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending">("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAttrs, setSearchAttrs] = useState<string[]>(["all"]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [uploadType, setUploadType] = useState<"traditional" | "modern" | null>(null);
  const [dropdowns, setDropdowns] = useState({ upload: false, library: false, user: false });
  const [showDataDropdown, setShowDataDropdown] = useState<string | null>(null);
  const dataDropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const toSentenceCase = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const pendingTradCount = useMemo(() => tracks.filter(t => !t.isapproved).length, [tracks]);
  const pendingModernCount = useMemo(() => modernTracks.filter(t => !t.isapproved).length, [modernTracks]);
  const totalPendingCount = pendingTradCount + pendingModernCount;

  const fetch_data = async () => {
    const api = process.env.REACT_APP_API_URL || "";
    try {
      const [trad, mod] = await Promise.all([axios.get(`${api}/api/tracks`), axios.get(`${api}/api/modern`)]);
      setTracks(trad.data || []);
      setModernTracks(mod.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetch_data();
    const interval = setInterval(fetch_data, 5000);
    const handleOut = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setDropdowns({ upload: false, library: false, user: false });
        setIsMenuOpen(false);
      }
      if (dataDropdownRef.current && !dataDropdownRef.current.contains(e.target as Node)) setShowDataDropdown(null);
    };
    const scroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", scroll);
    document.addEventListener("mousedown", handleOut);
    return () => { clearInterval(interval); window.removeEventListener("scroll", scroll); document.removeEventListener("mousedown", handleOut); };
  }, []);

  useEffect(() => {
    setIsLoggedIn(!!sessionStorage.getItem("userToken"));
    setUserRole(sessionStorage.getItem("role"));
  }, [activeMenu]);

  const filteredList = useMemo(() => {
    const list = libraryType === "traditional" ? tracks : modernTracks;
    return list.filter(t => {
      const statusMatch = (userRole === "admin" || userRole === "superadmin") ? (!!t.isapproved === (approvalStatus === "approved")) : !!t.isapproved;
      if (!statusMatch) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (term.includes(":")) {
        const [attr, val] = term.split(":").map(s => s.trim().toLowerCase());
        return (t as any)[attr]?.toString().toLowerCase().includes(val);
      }
      const keys = searchAttrs.includes("all") ? (libraryType === "modern" ? ["country", "category"] : ["title", "performer", "country", "category"]) : searchAttrs;
      return keys.some(k => (t as any)[k]?.toString().toLowerCase().includes(term));
    });
  }, [libraryType, tracks, modernTracks, userRole, approvalStatus, searchTerm, searchAttrs]);

  const handleAuthSuccess = (token: string, email: string, role: string) => {
    sessionStorage.setItem("userToken", token);
    sessionStorage.setItem("role", role);
    sessionStorage.setItem("userEmail", email);
    setUserRole(role);
    setIsLoggedIn(true);
    setShowSignup(false);
    fetch_data();
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUserRole(null);
    setIsLoggedIn(false);
    setActiveMenu("home");
    setDropdowns({ upload: false, library: false, user: false });
    setIsMenuOpen(false);
  };

  const handleMenuClick = (key: MenuKey) => {
    if (["upload", "library"].includes(key)) setMobileOptions(mobileOptions === key ? null : key);
    else {
      setActiveMenu(key);
      setUploadType(null);
      setEditingTrack(null);
      setIsMenuOpen(false);
      setMobileOptions(null);
    }
  };

  const selectLibraryType = (type: "traditional" | "modern") => {
    setLibraryType(type);
    setApprovalStatus("approved");
    setActiveMenu("library");
    setDropdowns(p => ({ ...p, library: false }));
    setIsMenuOpen(false);
    setMobileOptions(null);
  };

  const selectUploadType = (type: "traditional" | "modern") => {
    setUploadType(type);
    setActiveMenu("upload");
    setEditingTrack(null);
    setDropdowns(p => ({ ...p, upload: false }));
    setIsMenuOpen(false);
  };

  const handleAttrToggle = (attr: string) => {
    if (attr === "all") { setSearchAttrs(["all"]); setShowDataDropdown(null); setSearchTerm(""); return; }
    setSearchAttrs(prev => {
      const filtered = prev.filter(a => a !== "all");
      const next = filtered.includes(attr) ? filtered.filter(a => a !== attr) : [...filtered, attr];
      return next.length === 0 ? ["all"] : next;
    });
    setShowDataDropdown(p => p === attr ? null : attr);
  };

  const visibleMenus = MENUS.filter(m => !["contact", "statistics"].includes(m.key) && (m.key !== "accounts" || (userRole === "admin" || userRole === "superadmin")) && (m.key !== "settings" || userRole === "superadmin") && (m.key !== "upload" || isLoggedIn) && (m.key !== "fusion" || isLoggedIn));

  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ backgroundColor: COLORS.bgWarm, color: COLORS.textDark }}>
      <header ref={navContainerRef} className="sticky top-0 z-50 bg-white shadow-md border-b" style={{ borderColor: COLORS.borderLight }}>
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center shrink-0">
            {!isMenuOpen && <button className="lg:hidden mr-3" onClick={() => setIsMenuOpen(true)}><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>}
            <div className="flex items-center cursor-pointer select-none group" onClick={() => { setActiveMenu("home"); setUploadType(null); setEditingTrack(null); setIsMenuOpen(false); }}>
              {<img src="/logo.png" alt="Logo" className="h-8 md:h-12 w-auto mr-3 transition-transform group-hover:scale-105" /> }
              <div className="text-lg md:text-2xl font-normal" style={{ fontFamily: "Calibri" }}>HERITAGE IN CODE</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center space-x-6 text-[17px] font-normal" style={{ fontFamily: "Calibri" }}>
            <nav className="flex space-x-6">
              {visibleMenus.map((m: any) => (
                <div key={m.key} className="relative group" onMouseEnter={() => setDropdowns(p => ({ ...p, [m.key]: true }))} onMouseLeave={() => setDropdowns(p => ({ ...p, [m.key]: false }))}>
                  <button onClick={() => handleMenuClick(m.key)} className="py-2 px-1 flex items-center whitespace-nowrap" style={{ color: (activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics')) ? COLORS.primaryColor : 'inherit' }}>
                    {m.label} {["upload", "library"].includes(m.key) && <div className="flex items-center">{(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white" style={{ backgroundColor: COLORS.primaryColor }}>{totalPendingCount}</span>}<span className="ml-1 text-[10px]">▼</span></div>}
                  </button>
                  {m.key === "library" && dropdowns.library && (
                    <div className="absolute left-0 w-56 bg-white border shadow-xl rounded-lg py-2 z-60" style={{ borderColor: COLORS.borderLight }}>
                      <button onClick={() => selectLibraryType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex justify-between">Heritage {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingTradCount}</span>}</button>
                      <button onClick={() => selectLibraryType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex justify-between">Modern {(userRole === "admin" || userRole === "superadmin") && pendingModernCount > 0 && <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingModernCount}</span>}</button>
                      {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => { setActiveMenu("statistics"); setDropdowns(p => ({ ...p, library: false })); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 border-t" style={{ borderTopColor: COLORS.borderLight }}>Statistics</button>}
                    </div>
                  )}
                  {m.key === "upload" && dropdowns.upload && (
                    <div className="absolute left-0 w-56 bg-white border shadow-xl rounded-lg py-2 z-60" style={{ borderColor: COLORS.borderLight }}>
                      <button onClick={() => selectUploadType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Heritage Track</button>
                      <button onClick={() => selectUploadType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Modern Track</button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            {isLoggedIn ? (
              <div className="relative">
                <button onClick={() => setDropdowns(p => ({ ...p, user: !p.user }))} className="h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all overflow-hidden" style={{ borderColor: COLORS.borderOrange, backgroundColor: COLORS.bgGray }}><svg className="h-6 w-6" style={{ color: COLORS.textGray }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></button>
                {dropdowns.user && <div className="absolute right-0 mt-2 w-56 bg-white border shadow-xl rounded-xl py-2 z-70" style={{ borderColor: COLORS.borderLight }}><div className="px-4 py-2 border-b text-sm font-normal truncate" style={{ borderBottomColor: COLORS.borderLight }}>{sessionStorage.getItem("userEmail")}</div><button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm" style={{ color: COLORS.dangerColor }}>Logout</button></div>}
              </div>
            ) : <button onClick={() => setShowSignup(true)} className="text-[16px] font-normal hover:opacity-80" style={{ color: COLORS.textColor }}>Login</button>}
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute inset-0" style={{ backgroundColor: COLORS.bgModal }} />
            <div onClick={(e) => e.stopPropagation()} className="relative w-[210px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 font-normal text-[17px]" style={{ fontFamily: "Calibri" }}>
              <div className="w-full bg-white px-4 py-4 flex items-center border-b" style={{ borderColor: COLORS.borderOrange }}>
                <button onClick={() => setIsMenuOpen(false)}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                <div className="ml-4 text-[15px]">HERITAGE IN CODE</div>
              </div>
              <div className="flex flex-col py-2">
                {visibleMenus.map((m: any, idx) => (
                  <div key={m.key} className="flex flex-col" style={{ backgroundColor: idx % 2 === 0 ? COLORS.lightColor : COLORS.bgWhite }}>
                    <button onClick={() => handleMenuClick(m.key)} className="flex justify-between items-center py-3 px-4" style={{ color: (activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics')) ? COLORS.primaryColor : COLORS.textDark }}>
                      <div className="flex items-center">
                        <span className="text-[15px]">{m.label}</span>
                        {(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-2 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-white" style={{ backgroundColor: COLORS.primaryColor }}>{totalPendingCount}</span>}
                      </div>
                      {["upload", "library"].includes(m.key) && <span className={`text-[10px] transition-transform ${mobileOptions === m.key ? "rotate-180" : ""}`}>▼</span>}
                    </button>
                    {m.key === 'library' && mobileOptions === 'library' && (
                      <div className="flex flex-col border-l-2" style={{ borderColor: COLORS.primaryColor, backgroundColor: COLORS.bgLibrary }}>
                        <button onClick={() => selectLibraryType("traditional")} className="text-left px-6 py-2 text-[13px] flex justify-between items-center">Heritage {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingTradCount}</span>}</button>
                        <button onClick={() => selectLibraryType("modern")} className="text-left px-6 py-2 text-[13px] flex justify-between items-center">Modern {(userRole === "admin" || userRole === "superadmin") && pendingModernCount > 0 && <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingModernCount}</span>}</button>
                        {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => { setActiveMenu("statistics"); setIsMenuOpen(false); }} className="text-left px-6 py-2 text-[13px] border-t" style={{ borderTopColor: COLORS.borderOrange }}>Statistics</button>}
                      </div>
                    )}
                    {m.key === 'upload' && mobileOptions === 'upload' && (
                      <div className="flex flex-col border-l-2" style={{ borderColor: COLORS.primaryColor, backgroundColor: COLORS.bgLibrary }}>
                        <button onClick={() => selectUploadType("traditional")} className="text-left px-6 py-2 text-[13px]">Traditional Track</button>
                        <button onClick={() => selectUploadType("modern")} className="text-left px-6 py-2 text-[13px]">Modern Track</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="mt-2 border-t" style={{ borderTopColor: COLORS.borderLight }}>
                  {!isLoggedIn ? <button onClick={() => { setShowSignup(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-4 text-[15px]">Login</button> :
                    <button onClick={handleLogout} className="px-4 py-4 text-[14px] text-left" style={{ color: COLORS.dangerColor }}>Logout ({sessionStorage.getItem("userEmail")})</button>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {activeMenu === "home" ? (
          <Homebody tracks={tracks} onMenuChange={setActiveMenu} />
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-10">
            {activeMenu === "about" && <About />}
            {activeMenu === "ethics" && <Ethics />}
            {activeMenu === "library" && (
              <div className="flex flex-col">
                <div className="rounded-2xl p-4 mb-8 border shadow-sm space-y-4" style={{ backgroundColor: COLORS.bgLibrary, borderColor: COLORS.borderOrange }}>
                  {(userRole === "admin" || userRole === "superadmin") && (
                    <div className="relative flex p-1 rounded-xl border w-full max-w-md mx-auto" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
                      <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-md transition-transform duration-300 ${approvalStatus === "pending" ? "translate-x-full" : "translate-x-0"}`} />
                      <button className="relative flex-1 py-2.5 text-sm font-bold" style={{ color: approvalStatus === "approved" ? COLORS.primaryColor : COLORS.textLight }} onClick={() => { setApprovalStatus("approved"); setSearchTerm(""); }}>Approved sounds</button>
                      <button className="relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: approvalStatus === "pending" ? COLORS.primaryColor : COLORS.textLight }} onClick={() => { setApprovalStatus("pending"); setSearchTerm(""); }}>
                        Pending {((libraryType === "traditional" && pendingTradCount > 0) || (libraryType === "modern" && pendingModernCount > 0)) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white" style={{ backgroundColor: COLORS.primaryColor }}>{libraryType === "traditional" ? pendingTradCount : pendingModernCount}</span>}
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row bg-white rounded-xl border shadow-sm overflow-visible relative" style={{ borderColor: COLORS.borderOrange }}>
                    <div className="relative flex-grow flex items-center min-h-[56px] border-b md:border-b-0 md:border-r py-2" style={{ borderBottomColor: COLORS.borderLight, borderRightColor: COLORS.borderLight }}>
                      <div className="absolute left-4" style={{ color: COLORS.textLight }}><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                      <div className="flex flex-wrap items-center pl-12 pr-4 gap-2 w-full">
                        {searchAttrs.filter(a => a !== "all").map(attr => (<button key={attr} onClick={() => handleAttrToggle(attr)} className="text-white text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all animate-in zoom-in-90" style={{ backgroundColor: COLORS.primaryColor }}>{toSentenceCase(attr)} <span className="text-[14px] font-bold">×</span></button>))}
                        <input type="text" placeholder={searchAttrs.includes("all") ? `Search ${libraryType} tracks...` : `Type to search...`} className="flex-grow min-w-[120px] outline-none text-sm bg-transparent h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {searchTerm && <button onClick={() => setSearchTerm("")} className="text-xs px-2" style={{ color: COLORS.textLight }}>Clear</button>}
                      </div>
                    </div>
                    <div className="flex items-center px-4 min-h-[56px]" style={{ backgroundColor: COLORS.primaryTransparent }}>
                      <span className="text-[10px] font-bold uppercase mr-4" style={{ color: COLORS.primaryColor }}>Filter:</span>
                      <div className="flex gap-2 flex-wrap py-2">
                        {(libraryType === "modern" ? ["all", "country", "category"] : ["all", "title", "performer", "country", "category"]).map((opt, idx, arr) => (
                          <div key={opt} className="relative">
                            <button onClick={() => handleAttrToggle(opt)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all border" style={{ backgroundColor: searchAttrs.includes(opt) ? COLORS.primaryColor : COLORS.bgWhite, color: searchAttrs.includes(opt) ? COLORS.bgWhite : COLORS.textLight, borderColor: searchAttrs.includes(opt) ? COLORS.primaryColor : COLORS.borderLight }}>{toSentenceCase(opt)}</button>
                            {showDataDropdown === opt && opt !== "all" && (
                              <div ref={dataDropdownRef} className={`absolute ${idx === arr.length - 1 ? 'right-0' : 'left-0'} top-full mt-3 w-48 bg-white border shadow-2xl rounded-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95`} style={{ borderColor: COLORS.borderOrange }}>
                                <div className="max-h-60 overflow-y-auto">
                                  {Array.from(new Set((libraryType === "traditional" ? tracks : modernTracks).filter(t => (userRole === "admin" || userRole === "superadmin") ? (!!t.isapproved === (approvalStatus === "approved")) : !!t.isapproved).map((t: any) => t[opt]))).filter(Boolean).sort().map((val: any) => (
                                    <button key={val} onClick={() => { setSearchAttrs(["all"]); setSearchTerm(`${toSentenceCase(opt)}: ${val}`); setShowDataDropdown(null); }} className="w-full text-left px-4 py-2.5 text-xs transition-colors border-b last:border-0 truncate hover:text-white" style={{ color: COLORS.textColor, borderBottomColor: COLORS.borderLight, backgroundColor: "transparent" }}>{val}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {libraryType === "traditional" ? (
                  <MusicList tracks={filteredList} onEdit={(t) => { setEditingTrack(t); setUploadType("traditional"); setActiveMenu("upload"); }} onRefresh={fetch_data} userRole={userRole} isLoggedIn={isLoggedIn} userEmail={sessionStorage.getItem("userEmail") || ""} />
                ) : (
                  <ModernMusicList tracks={filteredList} onEdit={() => {}} onRefresh={fetch_data} userRole={userRole} isLoggedIn={isLoggedIn} userEmail={sessionStorage.getItem("userEmail") || ""} />
                )}
              </div>
            )}
            {activeMenu === "statistics" && (userRole === "admin" || userRole === "superadmin") && <Soundstatistics tracks={tracks} />}
            {activeMenu === "fusion" && <MusicFusion tracks={tracks} modernTracks={modernTracks} />}
            {activeMenu === "accounts" && (userRole === "admin" || userRole === "superadmin") && <AccountsList />}
            {activeMenu === "settings" && userRole === "superadmin" && <SystemSettings />}
            {activeMenu === "upload" && (uploadType === "traditional" ? <MusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onTrackUpdated={() => { setEditingTrack(null); setActiveMenu("library"); fetch_data(); }} onCancelEdit={() => { setEditingTrack(null); setUploadType(null); setActiveMenu("home"); }} editingTrack={editingTrack} /> : <ModernMusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onCancel={() => { setUploadType(null); setActiveMenu("home"); }} />)}
          </div>
        )}
      </main>
      
      {showBackToTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-10 right-10 text-white p-3 rounded-full shadow-2xl z-50" style={{ backgroundColor: COLORS.primaryColor }}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>}
      
      <footer className="bg-[#1A1A1A] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">About</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Mission</li>
              <li className="hover:text-white cursor-pointer transition-colors">Team</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">Resources</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
              <li className="hover:text-white cursor-pointer transition-colors">API Reference</li>
              <li className="hover:text-white cursor-pointer transition-colors">Case Studies</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">Ethics</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Governance</li>
              <li className="hover:text-white cursor-pointer transition-colors">Attribution</li>
              <li className="hover:text-white cursor-pointer transition-colors">Consent</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">Support</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Support Us</li>
              <li className="hover:text-white cursor-pointer transition-colors">Collaborate</li>
              <li className="hover:text-white cursor-pointer transition-colors">Help Center</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 pt-8 border-t border-[#E67E22] opacity-50 text-center">
          <p className="text-gray-500 text-[11px] tracking-[0.3em]">
            © {new Date().getFullYear()} Heritage in Code
          </p>
        </div>
      </footer>
      {showSignup && <SignUpForm onClose={() => setShowSignup(false)} onAuthSuccess={handleAuthSuccess} />}
    </div>
  );
};

export default MainPage;