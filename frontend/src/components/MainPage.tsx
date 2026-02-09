import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { MENUS, MenuKey } from "./supportives/menus";
import { COLORS } from "./supportives/colors";
import Homebody from "./supportives/homebody";
import Soundstatistics from "./supportives/soundstatistics";
import MusicList from "./MusicList";
import FusedList from "./FusedList";
import MusicForm from "./MusicForm";
import ModernMusicForm from "./ModernMusicForm";
import SignUpForm from "./SignUpForm";
import MusicFusion from "./MusicFusion";
import AccountsList from "./AccountsList";
import SystemSettings from "./SystemSettings";
import Ethics from "./Ethics";
import About from "./About";
import BalanceDashboard from "./BalanceDashboard";
import TransactionManager from "./TransactionManager";
import ModernMusicList from "./ModernMusicList";
import TrackIdentifier from "./trackidentifier";
import { Track } from "../types";

const MainPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey | "balance" | "identify">("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOptions, setMobileOptions] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modernTracks, setModernTracks] = useState<Track[]>([]);
  const [libraryType, setLibraryType] = useState<"traditional" | "modern" | "fused">("traditional");
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending">("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAttrs, setSearchAttrs] = useState<string[]>(["all"]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [uploadType, setUploadType] = useState<"traditional" | "modern" | null>(null);
  const [dropdowns, setDropdowns] = useState({ upload: false, library: false, user: false, learn: false });
  const [showDataDropdown, setShowDataDropdown] = useState<string | null>(null);
  const [liveBalance, setLiveBalance] = useState<number>(0);
  const [selectedTrackForFusion, setSelectedTrackForFusion] = useState<Track | null>(null);
  const dataDropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "";

  const toSentenceCase = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const pendingTradCount = useMemo(() => tracks.filter(t => !t.isapproved).length, [tracks]);
  const pendingModernCount = useMemo(() => modernTracks.filter(t => !t.isapproved).length, [modernTracks]);
  const totalPendingCount = pendingTradCount + pendingModernCount;

  const fetch_data = useCallback(async () => {
    try {
      const email = sessionStorage.getItem("userEmail");
      const [trad, mod] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/tracks`), 
        axios.get(`${API_BASE}/api/modern`)
      ]);
      
      if (trad.status === 'fulfilled') {
        setTracks(trad.value.data || []);
      }
      
      if (mod.status === 'fulfilled') {
        setModernTracks(mod.value.data || []);
      }

      if (email) {
        const balRes = await axios.get(`${API_BASE}/api/transactions/get-balance/${email}`);
        if (balRes.data.success) {
          setLiveBalance(Number(balRes.data.balance || 0));
        } else {
          setLiveBalance(0);
        }
      }
    } catch (e) { 
      setLiveBalance(0);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetch_data();
    const interval = setInterval(fetch_data, 15000);
    const handleOut = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setDropdowns({ upload: false, library: false, user: false, learn: false });
        setIsMenuOpen(false);
      }
      if (dataDropdownRef.current && !dataDropdownRef.current.contains(e.target as Node)) setShowDataDropdown(null);
    };
    const scroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", scroll);
    document.addEventListener("mousedown", handleOut);
    return () => { clearInterval(interval); window.removeEventListener("scroll", scroll); document.removeEventListener("mousedown", handleOut); };
  }, [fetch_data]);

  useEffect(() => {
    setIsLoggedIn(!!sessionStorage.getItem("userToken"));
    setUserRole(sessionStorage.getItem("role"));
  }, [activeMenu]);

  const filteredList = useMemo(() => {
    if (libraryType === "fused") return []; 
    const list = libraryType === "traditional" ? tracks : modernTracks;
    return list.filter(t => {
      const statusMatch = (userRole === "admin" || userRole === "superadmin") ? (!!t.isapproved === (approvalStatus === "approved")) : !!t.isapproved;
      if (!statusMatch) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (term.includes(":")) {
        const [attr, val] = term.split(":").map(s => s.trim().toLowerCase());
        const targetAttr = attr === "rhythm style" ? "rhythm_style" : attr;
        return (t as any)[targetAttr]?.toString().toLowerCase().includes(val);
      }
      const keys = searchAttrs.includes("all") ? (libraryType === "modern" ? ["rhythm_style", "category"] : ["title", "performer", "country", "category"]) : searchAttrs.map(a => a === "rhythm_style" ? "rhythm_style" : a);
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
    setLiveBalance(0);
    setDropdowns({ upload: false, library: false, user: false, learn: false });
    setIsMenuOpen(false);
  };

  const handleMenuClick = (key: any) => {
    if (["upload", "library", "learn"].includes(key)) {
      setMobileOptions(mobileOptions === key ? null : key);
    } else {
      setActiveMenu(key);
      setUploadType(null);
      setEditingTrack(null);
      setIsMenuOpen(false);
      setMobileOptions(null);
    }
  };

  const selectLibraryType = (type: "traditional" | "modern" | "fused") => {
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

  const visibleMenus = MENUS.filter(m => 
    !["contact", "statistics", "identify", "guide"].includes(m.key) && 
    (m.key !== "accounts" || (userRole === "admin" || userRole === "superadmin")) && 
    (m.key !== "settings" || userRole === "superadmin") && 
    (m.key !== "upload" || isLoggedIn) && 
    (m.key !== "fusion" || isLoggedIn)
  );

  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ backgroundColor: COLORS.bgWarm, color: COLORS.textDark }}>
      <header ref={navContainerRef} className="sticky top-0 z-[500] bg-white shadow-md border-b" style={{ borderColor: COLORS.borderLight }}>
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center shrink-0">
            {!isMenuOpen && <button className="lg:hidden mr-3" onClick={() => setIsMenuOpen(true)}><svg className="h-9 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>}
            <div className="flex items-center cursor-pointer select-none group" onClick={() => { setActiveMenu("home"); setUploadType(null); setEditingTrack(null); setIsMenuOpen(false); }}>
              <img src="/logo.png" alt="logo" className="h-14 md:h-16 w-auto mr-3 transition-transform group-hover:scale-105" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6 text-[17px] font-normal" style={{ fontFamily: "calibri" }}>
            <nav className="hidden lg:flex space-x-6 items-center">
              {visibleMenus.map((m: any) => (
                <div key={m.key} className="relative group" onMouseEnter={() => setDropdowns(p => ({ ...p, [m.key]: true }))} onMouseLeave={() => setDropdowns(p => ({ ...p, [m.key]: false }))}>
                  <button onClick={() => handleMenuClick(m.key)} className="py-2 px-1 flex items-center whitespace-nowrap" style={{ color: (activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics') || (m.key === 'learn' && activeMenu === 'identify')) ? COLORS.primaryColor : 'inherit' }}>
                    {toSentenceCase(m.label)} {["upload", "library", "learn"].includes(m.key) && <div className="flex items-center">{(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white" style={{ backgroundColor: COLORS.primaryColor }}>{totalPendingCount}</span>}<span className="ml-1 text-[10px]">▼</span></div>}
                  </button>
                  {m.key === "library" && dropdowns.library && (
                    <div className="absolute left-0 w-56 bg-white border shadow-2xl rounded-lg py-2 z-[600]" style={{ borderColor: COLORS.borderLight }}>
                      <button onClick={() => selectLibraryType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex items-center gap-2">
                        <span>Heritage</span>
                        {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && (
                          <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingTradCount}</span>
                        )}
                      </button>
                      {(userRole === "admin" || userRole === "superadmin") && (
                        <button onClick={() => selectLibraryType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex items-center gap-2">
                          <span>Modern</span>
                          {pendingModernCount > 0 && (
                            <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingModernCount}</span>
                          )}
                        </button>
                      )}
                      <button onClick={() => selectLibraryType("fused")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 border-t" style={{ borderTopColor: COLORS.borderLight }}>Ai fused</button>
                      {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => { setActiveMenu("statistics"); setDropdowns(p => ({ ...p, library: false })); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 border-t" style={{ borderTopColor: COLORS.borderLight }}>Statistics</button>}
                    </div>
                  )}
                  {m.key === "upload" && dropdowns.upload && (
                    <div className="absolute left-0 w-56 bg-white border shadow-2xl rounded-lg py-2 z-[600]" style={{ borderColor: COLORS.borderLight }}>
                      <button onClick={() => selectUploadType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Heritage track</button>
                      {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => selectUploadType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Modern track</button>}
                    </div>
                  )}
                  {m.key === "learn" && dropdowns.learn && (
                    <div className="absolute left-0 w-56 bg-white border shadow-2xl rounded-lg py-2 z-[600]" style={{ borderColor: COLORS.borderLight }}>
                      <button onClick={() => { setActiveMenu("identify"); setDropdowns(p => ({ ...p, learn: false })); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Get track detail</button>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoggedIn && (
                <button 
                  onClick={() => setActiveMenu("balance")} 
                  title={`your current balance is $${liveBalance.toFixed(2)}`}
                  className="relative p-2 hover:bg-gray-50 rounded-full transition-colors group"
                >
                  <svg className={`h-6 w-6 transition-colors ${activeMenu === "balance" ? "text-orange-500" : "text-gray-600 group-hover:text-orange-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 003-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {liveBalance > 0 && (
                    <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                      ${liveBalance.toFixed(2)}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {isLoggedIn ? (
              <div className="relative">
                <button onClick={() => setDropdowns(p => ({ ...p, user: !p.user }))} className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 flex items-center justify-center transition-all overflow-hidden" style={{ borderColor: COLORS.borderOrange, backgroundColor: COLORS.bgGray }}>
                  <svg className="h-5 w-5 md:h-6 md:w-6" style={{ color: COLORS.textGray }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </button>
                {dropdowns.user && (
                  <div className="absolute right-0 mt-3 w-48 bg-white border shadow-2xl rounded-xl py-2 z-[600]" style={{ borderColor: COLORS.borderLight }}>
                    <div className="px-4 py-2 border-b text-[12px] md:text-sm font-normal truncate bg-gray-50/50" style={{ borderBottomColor: COLORS.borderLight }}>{sessionStorage.getItem("userEmail")}</div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-bold" style={{ color: COLORS.dangerColor }}>Logout</button>
                  </div>
                )}
              </div>
            ) : <button onClick={() => setShowSignup(true)} className="text-[15px] md:text-[16px] font-normal hover:opacity-80" style={{ color: COLORS.textColor }}>Login</button>}
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[500]" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute inset-0" style={{ backgroundColor: COLORS.bgModal }} />
            <div onClick={(e) => e.stopPropagation()} className="relative w-[210px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 font-normal text-[17px]" style={{ fontFamily: "calibri" }}>
              <div className="w-full bg-white px-4 py-4 flex items-center border-b" style={{ borderColor: COLORS.borderOrange }}>
                <button onClick={() => setIsMenuOpen(false)}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                <div className="ml-4 text-[15px]">Heritage in code</div>
              </div>
              <div className="flex flex-col py-2">
                {visibleMenus.map((m: any, idx) => (
                  <div key={m.key} className="flex flex-col" style={{ backgroundColor: idx % 2 === 0 ? COLORS.lightColor : COLORS.bgWhite }}>
                    <button onClick={() => handleMenuClick(m.key)} className="flex justify-between items-center py-3 px-4" style={{ color: (activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics') || (m.key === 'learn' && activeMenu === 'identify')) ? COLORS.primaryColor : COLORS.textDark }}>
                      <div className="flex items-center">
                        <span className="text-[15px]">{toSentenceCase(m.label)}</span>
                        {(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-2 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-white" style={{ backgroundColor: COLORS.primaryColor }}>{totalPendingCount}</span>}
                      </div>
                      {["upload", "library", "learn"].includes(m.key) && <span className={`text-[10px] transition-transform ${mobileOptions === m.key ? "rotate-180" : ""}`}>▼</span>}
                    </button>
                    {m.key === 'library' && mobileOptions === 'library' && (
                      <div className="flex flex-col border-l-2" style={{ borderColor: COLORS.primaryColor, backgroundColor: COLORS.bgLibrary }}>
                        <button onClick={() => selectLibraryType("traditional")} className="text-left px-6 py-2 text-[13px] flex items-center gap-2">
                          <span>Heritage</span>
                          {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && (
                            <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingTradCount}</span>
                          )}
                        </button>
                        {(userRole === "admin" || userRole === "superadmin") && (
                          <button onClick={() => selectLibraryType("modern")} className="text-left px-6 py-2 text-[13px] flex items-center gap-2">
                            <span>Modern</span>
                            {pendingModernCount > 0 && (
                              <span className="text-white text-[9px] px-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{pendingModernCount}</span>
                            )}
                          </button>
                        )}
                        <button onClick={() => selectLibraryType("fused")} className="text-left px-6 py-2 text-[13px]">Ai fused</button>
                        {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => { setActiveMenu("statistics"); setIsMenuOpen(false); }} className="text-left px-6 py-2 text-[13px] border-t" style={{ borderTopColor: COLORS.borderOrange }}>Statistics</button>}
                      </div>
                    )}
                    {m.key === 'upload' && mobileOptions === 'upload' && (
                      <div className="flex flex-col border-l-2" style={{ borderColor: COLORS.primaryColor, backgroundColor: COLORS.bgLibrary }}>
                        <button onClick={() => selectUploadType("traditional")} className="text-left px-6 py-2 text-[13px]">Heritage track</button>
                        {(userRole === "admin" || userRole === "superadmin") && <button onClick={() => selectUploadType("modern")} className="text-left px-6 py-2 text-[13px]">Modern track</button>}
                      </div>
                    )}
                    {m.key === 'learn' && mobileOptions === 'learn' && (
                      <div className="flex flex-col border-l-2" style={{ borderColor: COLORS.primaryColor, backgroundColor: COLORS.bgLibrary }}>
                        <button onClick={() => { setActiveMenu("identify"); setIsMenuOpen(false); }} className="text-left px-6 py-2 text-[13px]">Get track detail</button>
                      </div>
                    )}
                  </div>
                ))}

                {isLoggedIn && (
                  <button onClick={() => handleMenuClick("balance")} className="flex items-center justify-between py-3 px-4" style={{ color: activeMenu === "balance" ? COLORS.primaryColor : COLORS.textDark }}>
                    <span className="text-[15px]">Balance</span>
                    <div className="relative p-1">
                      <svg className={`h-6 w-6 transition-colors ${activeMenu === "balance" ? "text-orange-500" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 003-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      {liveBalance > 0 && (
                        <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                          ${liveBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {activeMenu === "home" ? (
          <Homebody tracks={tracks} onMenuChange={setActiveMenu} />
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
            {activeMenu === "library" && libraryType === "traditional" && (
              <div className="mb-8 p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start bg-amber-50/40 border-amber-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="text-[12px] leading-relaxed text-amber-900/90">
                  All sounds in this archive originate from living cultural traditions. each instrument carries specific social roles, meanings, and performance practices shaped by community, ceremony, and history. this library is designed to support creative exploration while encouraging cultural understanding. users are invited to engage with these sounds thoughtfully, respecting their traditional roles, avoiding caricature or misuse, and acknowledging their cultural origins where possible.
                </div>
              </div>
            )}
            
            {activeMenu === "about" && <About />}
            {activeMenu === "ethics" && <Ethics />}
            {activeMenu === "identify" && <TrackIdentifier />}
            {activeMenu === "balance" && (
              <BalanceDashboard 
                currentUser={{ 
                  email: sessionStorage.getItem("userEmail"), 
                  role: (userRole as "user" | "admin" | "superadmin") || "user" 
                }} 
              />
            )}
            {activeMenu === "library" && (
              <div className="flex flex-col">
                {libraryType !== "fused" && (
                  <div className="rounded-2xl p-4 mb-8 border shadow-sm space-y-4" style={{ backgroundColor: COLORS.bgLibrary, borderColor: COLORS.borderOrange }}>
                    {(userRole === "admin" || userRole === "superadmin") && (
                      <div className="relative flex p-1 rounded-xl border w-full max-m-md mx-auto" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
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
                          {searchAttrs.filter(a => a !== "all").map(attr => (<button key={attr} onClick={() => handleAttrToggle(attr)} className="text-white text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all animate-in zoom-in-90" style={{ backgroundColor: COLORS.primaryColor }}>{attr === 'rhythm_style' ? 'Rhythm style' : toSentenceCase(attr)} <span className="text-[14px] font-bold">×</span></button>))}
                          <input type="text" placeholder={searchAttrs.includes("all") ? `Search ${libraryType} tracks...` : `Type to search...`} className="flex-grow min-w-[120px] outline-none text-sm bg-transparent h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                          {searchTerm && <button onClick={() => setSearchTerm("")} className="text-xs px-2" style={{ color: COLORS.textLight }}>Clear</button>}
                        </div>
                      </div>
                      <div className="flex items-center px-4 min-h-[56px]" style={{ backgroundColor: COLORS.primaryTransparent }}>
                        <span className="text-[10px] font-bold uppercase mr-4" style={{ color: COLORS.primaryColor }}>Filter:</span>
                        <div className="flex gap-2 flex-wrap py-2">
                          {(libraryType === "modern" ? ["all", "rhythm_style", "category"] : ["all", "title", "performer", "country", "category"]).map((opt, idx, arr) => (
                            <div key={opt} className="relative">
                              <button onClick={() => handleAttrToggle(opt)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all border" style={{ backgroundColor: searchAttrs.includes(opt) ? COLORS.primaryColor : COLORS.bgWhite, color: searchAttrs.includes(opt) ? COLORS.bgWhite : COLORS.textLight, borderColor: searchAttrs.includes(opt) ? COLORS.primaryColor : COLORS.borderLight }}>{opt === 'rhythm_style' ? 'Rhythm style' : toSentenceCase(opt)}</button>
                              {showDataDropdown === opt && opt !== "all" && (
                                <div ref={dataDropdownRef} className={`absolute ${idx === arr.length - 1 ? 'right-0' : 'left-0'} top-full mt-3 w-48 bg-white border shadow-2xl rounded-xl z-[600] overflow-hidden animate-in fade-in zoom-in-95`} style={{ borderColor: COLORS.borderOrange }}>
                                  <div className="max-h-60 overflow-y-auto">
                                    {Array.from(new Set((libraryType === "traditional" ? tracks : modernTracks).filter(t => (userRole === "admin" || userRole === "superadmin") ? (!!t.isapproved === (approvalStatus === "approved")) : !!t.isapproved).map((t: any) => t[opt]))).filter(Boolean).sort().map((val: any) => (
                                      <button key={val} onClick={() => { setSearchAttrs(["all"]); setSearchTerm(`${opt === 'rhythm_style' ? 'Rhythm style' : toSentenceCase(opt)}: ${val}`); setShowDataDropdown(null); }} className="w-full text-left px-4 py-2.5 text-xs transition-colors border-b last:border-0 truncate hover:text-white" style={{ color: COLORS.textColor, borderBottomColor: COLORS.borderLight, backgroundColor: "transparent" }}>{val}</button>
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
                )}
                {libraryType === "traditional" && (
                  <MusicList tracks={filteredList} onEdit={(t) => { setEditingTrack(t); setUploadType("traditional"); setActiveMenu("upload"); }} onRefresh={fetch_data} userRole={userRole} isLoggedIn={isLoggedIn} userEmail={sessionStorage.getItem("userEmail") || ""} setActiveTab={(tab: string) => setActiveMenu(tab as any)} setSelectedTrackForFusion={setSelectedTrackForFusion} />
                )}
                {libraryType === "modern" && (userRole === "admin" || userRole === "superadmin") && (
                  <ModernMusicList tracks={filteredList} onEdit={() => {}} onRefresh={fetch_data} userRole={userRole} isLoggedIn={isLoggedIn} userEmail={sessionStorage.getItem("userEmail") || ""} />
                )}
                {libraryType === "fused" && (
                  <div className="mt-4">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: COLORS.textDark }}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: COLORS.primaryColor }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      Royalty free library
                    </h2>
                    <FusedList />
                  </div>
                )}
              </div>
            )}
            {activeMenu === "statistics" && (userRole === "admin" || userRole === "superadmin") && <Soundstatistics tracks={tracks} />}
            {activeMenu === "fusion" && (
              <MusicFusion 
                tracks={tracks} 
                modernTracks={modernTracks} 
                initialTrack={selectedTrackForFusion} 
              />
            )}
            {activeMenu === "accounts" && (userRole === "admin" || userRole === "superadmin") && <AccountsList />}
            {activeMenu === "settings" && userRole === "superadmin" && <SystemSettings />}
            {activeMenu === "upload" && (uploadType === "traditional" ? <MusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onTrackUpdated={() => { setEditingTrack(null); setActiveMenu("library"); fetch_data(); }} onCancelEdit={() => { setEditingTrack(null); setUploadType(null); setActiveMenu("home"); }} editingTrack={editingTrack} /> : <ModernMusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onCancel={() => { setUploadType(null); setActiveMenu("home"); }} />)}
          </div>
        )}
      </main>

      <div className="fixed bottom-4 right-1 flex flex-col items-center gap-3 z-[100]">
        {showBackToTop && (
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} 
            className="text-white p-3 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90" 
            style={{ backgroundColor: COLORS.primaryColor }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}
        <TransactionManager 
          mode="subscription"
          price={10.00}
          variant="monthly"
          currentUserEmail={sessionStorage.getItem("userEmail")}
          onOpenLogin={() => setShowSignup(true)}
          onSuccess={() => fetch_data()} 
        />
      </div>
      
      <footer className="bg-[#1A1A1A] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap justify-between gap-x-4 gap-y-12">
          <div className="flex-1 min-w-[140px] max-w-xs">
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest whitespace-nowrap">About</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Our mission</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Team</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Partners</li>
            </ul>
          </div>
          <div className="flex-1 min-w-[140px] max-w-xs">
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest whitespace-nowrap">Resources</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Sound library</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Fusion</li>
            </ul>
          </div>
          <div className="flex-1 min-w-[140px] max-w-xs">
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest whitespace-nowrap">Ethics</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Governance</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Attribution</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Consent</li>
            </ul>
          </div>
          <div className="flex-1 min-w-[140px] max-w-xs">
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest whitespace-nowrap">Support</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Support us</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Collaborate</li>
              <li className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Help center</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 pt-8 border-t border-[#E67E22] opacity-50 text-center">
          <p className="text-gray-500 text-[11px] tracking-[0.3em]">
            © {new Date().getFullYear()} Heritage in code
          </p>
        </div>
      </footer>
      {showSignup && <SignUpForm onClose={() => setShowSignup(false)} onAuthSuccess={handleAuthSuccess} />}
    </div>
  );
};

export default MainPage;