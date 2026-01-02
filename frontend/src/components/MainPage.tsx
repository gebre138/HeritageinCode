import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MENUS, MenuKey } from "./supportives/menus";
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
import { Track } from "../types";

const MainPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMobileUploadOptions, setShowMobileUploadOptions] = useState(false);
  const [showMobileLibraryOptions, setShowMobileLibraryOptions] = useState(false);
  const [showMobileUserOptions, setShowMobileUserOptions] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modernTracks, setModernTracks] = useState<Track[]>([]);
  const [libraryType, setLibraryType] = useState<"traditional" | "modern">("traditional");
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending">("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAttr, setSearchAttr] = useState("all");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [uploadType, setUploadType] = useState<"traditional" | "modern" | null>(null);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const pendingTradCount = tracks.filter(t => !t.isapproved).length;
  const pendingModernCount = modernTracks.filter(t => !t.isapproved).length;
  const totalPendingCount = pendingTradCount + pendingModernCount;

  const fetch_data = async () => {
    const api = process.env.REACT_APP_API_URL || "";
    try {
      const [trad, mod] = await Promise.all([
        axios.get(`${api}/api/tracks`), 
        axios.get(`${api}/api/modern`)
      ]);
      setTracks(trad.data || []);
      setModernTracks(mod.data || []);
    } catch (e) { 
      console.error(e); 
    }
  };

  useEffect(() => {
    const interval = setInterval(() => { fetch_data(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false); 
        setShowUploadDropdown(false); 
        setShowLibraryDropdown(false); 
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("userToken");
    const role = sessionStorage.getItem("role");
    
    if (token && role) { 
      setUserRole(role); 
      setIsLoggedIn(true); 
    } else {
      setUserRole(null);
      setIsLoggedIn(false);
    }
    
    fetch_data();
    const scroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", scroll);
    return () => window.removeEventListener("scroll", scroll);
  }, [activeMenu, libraryType, approvalStatus]);

  const getFilteredList = (list: Track[]) => list.filter(t => {
    const statusMatch = (userRole === "admin" || userRole === "superadmin") 
      ? (!!t.isapproved === (approvalStatus === "approved")) 
      : !!t.isapproved;
    if (!statusMatch) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (searchAttr === "all") return ["title", "performer", "country", "category"].some(k => (t as any)[k]?.toLowerCase().includes(term));
    return (t as any)[searchAttr]?.toString().toLowerCase().includes(term);
  });

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
    setIsMenuOpen(false); 
    setShowUserDropdown(false); 
    setShowMobileUserOptions(false);
    setApprovalStatus("approved");
    setEditingTrack(null);
  };

  const handleMenuClick = (key: MenuKey) => {
    if (key === "upload") { 
      setShowMobileUploadOptions(!showMobileUploadOptions); 
      setShowMobileLibraryOptions(false); 
      setShowMobileUserOptions(false);
    }
    else if (key === "library") { 
      setShowMobileLibraryOptions(!showMobileLibraryOptions); 
      setShowMobileUploadOptions(false); 
      setShowMobileUserOptions(false);
    }
    else { 
      setActiveMenu(key); 
      setUploadType(null); 
      setEditingTrack(null); 
      setSearchTerm(""); 
      setIsMenuOpen(false); 
      setShowMobileUploadOptions(false); 
      setShowMobileLibraryOptions(false); 
      setShowMobileUserOptions(false);
    }
  };

  const selectLibraryType = (type: "traditional" | "modern") => {
    setLibraryType(type); 
    setApprovalStatus("approved"); 
    setActiveMenu("library"); 
    setEditingTrack(null);
    setUploadType(null);
    setShowLibraryDropdown(false); 
    setIsMenuOpen(false); 
    setShowMobileLibraryOptions(false); 
    setSearchTerm("");
  };

  const selectUploadType = (type: "traditional" | "modern") => {
    setEditingTrack(null);
    setUploadType(type); 
    setActiveMenu("upload"); 
    setShowUploadDropdown(false); 
    setIsMenuOpen(false); 
    setShowMobileUploadOptions(false);
  };

  const visibleMenus = MENUS.filter(m => 
    m.key !== "contact" && 
    m.key !== "statistics" && 
    (m.key !== "accounts" || userRole === "admin" || userRole === "superadmin") && 
    (m.key !== "settings" || userRole === "superadmin") && 
    (m.key !== "upload" || isLoggedIn) && 
    (m.key !== "fusion" || isLoggedIn)
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 flex flex-col font-sans relative">
      <header ref={navContainerRef} className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center shrink-0">
            {!isMenuOpen && (
              <button className="lg:hidden mr-3" onClick={() => setIsMenuOpen(true)}>
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex items-center cursor-pointer select-none group" onClick={() => { setActiveMenu("home"); setUploadType(null); setEditingTrack(null); setIsMenuOpen(false); }}>
              <img src="/Wits_MIND.jpg" alt="Logo" className="h-8 md:h-12 w-auto mr-3 transition-transform group-hover:scale-105" />
              <div className="text-lg md:text-2xl font-normal" style={{ fontFamily: "Calibri" }}>HERITAGE IN CODE</div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center space-x-6 text-[17px] font-normal" style={{ fontFamily: "Calibri" }}>
            <nav className="flex space-x-6">
              {visibleMenus.map((m: any) => (
                <div key={m.key} className="relative group" onMouseEnter={() => m.key === 'upload' ? setShowUploadDropdown(true) : m.key === 'library' && setShowLibraryDropdown(true)} onMouseLeave={() => { setShowUploadDropdown(false); setShowLibraryDropdown(false); }}>
                  <button onClick={() => handleMenuClick(m.key)} className={`py-2 px-1 flex items-center whitespace-nowrap ${activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics') ? "text-[#E67E22]" : "hover:text-[#E67E22]"}`}>
                    {m.label}
                    {(m.key === 'upload' || m.key === 'library') && <div className="flex items-center">{(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white">{totalPendingCount}</span>}<span className="ml-1 text-[10px]">▼</span></div>}
                  </button>
                  {m.key === "library" && showLibraryDropdown && (
                    <div className="absolute left-0 w-56 bg-white border shadow-xl rounded-lg py-2 z-60">
                      <button onClick={() => selectLibraryType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 font-normal flex justify-between items-center">Heritage {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && <span className="bg-orange-500 text-white text-[9px] px-1.5 rounded-full">{pendingTradCount}</span>}</button>
                      <button onClick={() => selectLibraryType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 font-normal flex justify-between items-center">Modern {(userRole === "admin" || userRole === "superadmin") && pendingModernCount > 0 && <span className="bg-orange-500 text-white text-[9px] px-1.5 rounded-full">{pendingModernCount}</span>}</button>
                      {(userRole === "admin" || userRole === "superadmin") && (
                        <button onClick={() => { setActiveMenu("statistics"); setShowLibraryDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 font-normal border-t">Statistics</button>
                      )}
                    </div>
                  )}
                  {m.key === "upload" && showUploadDropdown && (
                    <div className="absolute left-0 w-56 bg-white border shadow-xl rounded-lg py-2 z-60">
                      <button onClick={() => selectUploadType("traditional")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 font-normal">Heritage Track</button>
                      <button onClick={() => selectUploadType("modern")} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 font-normal">Modern Track</button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            {isLoggedIn ? (
              <div className="relative">
                <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="h-10 w-10 bg-gray-100 rounded-full border-2 border-orange-200 flex items-center justify-center hover:border-orange-500 transition-all overflow-hidden"><svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></button>
                {showUserDropdown && <div className="absolute right-0 mt-2 w-56 bg-white border shadow-xl rounded-xl py-2 z-70"><div className="px-4 py-2 border-b text-sm font-normal truncate">{sessionStorage.getItem("userEmail")}</div><button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">Logout</button></div>}
              </div>
            ) : <button onClick={() => setShowSignup(true)} className="text-[16px] font-normal hover:text-[#E67E22]">Login</button>}
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-[210px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 font-normal text-[17px]" style={{ fontFamily: "Calibri" }}>
              
              <div className="w-full bg-white px-4 py-4 flex items-center border-b border-orange-500/30">
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-900">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="ml-4 text-[15px] font-normal tracking-tight text-gray-900">
                  HERITAGE IN CODE
                </div>
              </div>

              <div className="flex flex-col py-2">
                {visibleMenus.map((m: any, index: number) => (
                  <div key={m.key} className={`flex flex-col ${index % 2 === 0 ? "bg-orange-50/40" : "bg-white"}`}>
                    <button 
                      onClick={() => handleMenuClick(m.key)} 
                      className={`flex justify-between items-center py-3 px-4 transition-colors ${activeMenu === m.key || (m.key === 'library' && activeMenu === 'statistics') ? "text-[#E67E22]" : "text-gray-800"}`}
                    >
                      <div className="flex items-center">
                        <span className="text-[15px]">{m.label}</span>
                        {(userRole === "admin" || userRole === "superadmin") && totalPendingCount > 0 && m.key === "library" && <span className="ml-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] text-white font-normal">{totalPendingCount}</span>}
                      </div>
                      {(m.key === 'upload' || m.key === 'library') && <span className={`text-[10px] transition-transform ${(m.key === 'upload' ? showMobileUploadOptions : showMobileLibraryOptions) ? "rotate-180" : ""}`}>▼</span>}
                    </button>
                    
                    {m.key === 'library' && showMobileLibraryOptions && (
                      <div className="flex flex-col border-l-2 border-orange-100 bg-orange-50/20">
                        <button onClick={() => selectLibraryType("traditional")} className="text-left px-6 py-2 text-[13px] flex justify-between items-center">Heritage {(userRole === "admin" || userRole === "superadmin") && pendingTradCount > 0 && <span className="bg-orange-500 text-white text-[9px] px-1.5 rounded-full">{pendingTradCount}</span>}</button>
                        <button onClick={() => selectLibraryType("modern")} className="text-left px-6 py-2 text-[13px] flex justify-between items-center">Modern {(userRole === "admin" || userRole === "superadmin") && pendingModernCount > 0 && <span className="bg-orange-500 text-white text-[9px] px-1.5 rounded-full">{pendingModernCount}</span>}</button>
                        {(userRole === "admin" || userRole === "superadmin") && (
                          <button onClick={() => { setActiveMenu("statistics"); setIsMenuOpen(false); }} className="text-left px-6 py-2 text-[13px] border-t border-orange-100/30">Statistics</button>
                        )}
                      </div>
                    )}
                    {m.key === 'upload' && showMobileUploadOptions && (
                      <div className="flex flex-col border-l-2 border-orange-100 bg-orange-50/20">
                        <button onClick={() => selectUploadType("traditional")} className="text-left px-6 py-2 text-[13px]">Traditional Track</button>
                        <button onClick={() => selectUploadType("modern")} className="text-left px-6 py-2 text-[13px]">Modern Track</button>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className={`mt-2 border-t border-gray-100 ${visibleMenus.length % 2 === 0 ? "bg-orange-50/40" : "bg-white"}`}>
                  {!isLoggedIn ? (
                    <button onClick={() => { setShowSignup(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-4 text-[15px] text-gray-800">Login</button>
                  ) : (
                    <div className="flex flex-col">
                      <button 
                        onClick={() => setShowMobileUserOptions(!showMobileUserOptions)}
                        className="flex items-center w-full px-4 py-4"
                      >
                        <div className="h-9 w-9 bg-gray-100 rounded-full border-2 border-orange-200 flex items-center justify-center overflow-hidden transition-all hover:border-orange-500">
                          <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      </button>
                      
                      {showMobileUserOptions && (
                        <div className="flex flex-col border-l-2 border-orange-100 bg-orange-50/20">
                          <p className="px-6 pt-3 pb-1 text-[11px] truncate text-gray-400 italic font-normal">
                            {sessionStorage.getItem("userEmail")}
                          </p>
                          <button onClick={handleLogout} className="text-red-600 px-6 py-3 text-[14px] text-left">
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {activeMenu === "home" ? <Homebody tracks={tracks} onMenuChange={setActiveMenu} /> : (
          <div className="max-w-7xl mx-auto px-6 py-10">
            {activeMenu === "library" && (
              <div className="flex flex-col">
                <div className="bg-[#FFFBEB] rounded-2xl p-4 mb-8 border border-orange-100 shadow-sm space-y-4">
                  {(userRole === "admin" || userRole === "superadmin") && (
                    <div className="relative flex p-1 bg-gray-100/50 rounded-xl border w-full max-md mx-auto">
                      <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-md transition-transform duration-300 ${approvalStatus === "pending" ? "translate-x-full" : "translate-x-0"}`} />
                      <button className={`relative flex-1 py-2.5 text-sm font-bold ${approvalStatus === "approved" ? "text-[#E67E22]" : "text-gray-500"}`} onClick={() => setApprovalStatus("approved")}>Approved sounds</button>
                      <button className={`relative flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 ${approvalStatus === "pending" ? "text-[#E67E22]" : "text-gray-500"}`} onClick={() => setApprovalStatus("pending")}>
                        Pending 
                        {((libraryType === "traditional" && pendingTradCount > 0) || (libraryType === "modern" && pendingModernCount > 0)) && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white font-normal">
                            {libraryType === "traditional" ? pendingTradCount : pendingModernCount}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row bg-white rounded-xl border border-orange-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 overflow-hidden">
                    <div className="relative flex-grow flex items-center border-b md:border-b-0 md:border-r border-orange-100"><div className="absolute left-4 text-gray-400"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div><input type="text" placeholder={`Search ${libraryType} tracks...`} className="w-full pl-12 pr-10 h-14 bg-transparent outline-none font-normal" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <div className="flex items-center px-4 bg-orange-50/20 h-14"><span className="text-[10px] font-bold uppercase text-orange-400 mr-2">filter:</span><select className="bg-transparent font-normal text-gray-700 outline-none text-sm" value={searchAttr} onChange={(e) => setSearchAttr(e.target.value)}><option value="all">All</option><option value="title">Title</option><option value="performer">Performer</option><option value="country">Country</option><option value="category">Category</option></select></div>
                  </div>
                </div>
                {libraryType === "traditional" ? (
                  <MusicList 
                    tracks={getFilteredList(tracks)} 
                    onEdit={(t) => { setEditingTrack(t); setUploadType("traditional"); setActiveMenu("upload"); }} 
                    onRefresh={fetch_data}
                    userRole={userRole}
                    isLoggedIn={isLoggedIn}
                    userEmail={sessionStorage.getItem("userEmail")}
                  />
                ) : (
                  <ModernMusicList 
                    tracks={getFilteredList(modernTracks)} 
                    onEdit={() => {}} 
                    onRefresh={fetch_data}
                    userRole={userRole}
                    isLoggedIn={isLoggedIn}
                    userEmail={sessionStorage.getItem("userEmail")}
                  />
                )}
              </div>
            )}
            {activeMenu === "statistics" && (userRole === "admin" || userRole === "superadmin") && <Soundstatistics tracks={tracks} />}
            {activeMenu === "fusion" && <MusicFusion tracks={tracks} modernTracks={modernTracks} />}
            {activeMenu === "accounts" && (userRole === "admin" || userRole === "superadmin") && <AccountsList />}
            {activeMenu === "settings" && userRole === "superadmin" && <SystemSettings />}
            {(activeMenu === "ethics" || activeMenu === "about") && <div className="text-center py-20"><h2 className="text-2xl font-normal uppercase mb-2">{activeMenu}</h2><p className="text-gray-400 text-sm tracking-widest italic">under development</p></div>}
            {activeMenu === "upload" && (uploadType === "traditional" ? <MusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onTrackUpdated={() => { setEditingTrack(null); setActiveMenu("library"); fetch_data(); }} onCancelEdit={() => { setEditingTrack(null); setUploadType(null); setActiveMenu("home"); }} editingTrack={editingTrack} /> : <ModernMusicForm onTrackAdded={() => { setActiveMenu("library"); fetch_data(); }} onCancel={() => { setUploadType(null); setActiveMenu("home"); }} />)}
          </div>
        )}
      </main>
      
      {showBackToTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-10 right-10 bg-[#E67E22] text-white p-3 rounded-full shadow-2xl z-50"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>}
      
      <footer className="bg-[#121212] text-white pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8 items-start">
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">About</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Our Mission</li>
              <li className="hover:text-white cursor-pointer transition-colors">Team</li>
              <li className="hover:text-white cursor-pointer transition-colors">Partners</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#E67E22] font-normal mb-5 text-[14px] uppercase tracking-widest">Resources</h4>
            <ul className="space-y-3 text-gray-400 text-[13px]">
              <li className="hover:text-white cursor-pointer transition-colors">Sound Library</li>
              <li className="hover:text-white cursor-pointer transition-colors">Guide Documentation</li>
              <li className="hover:text-white cursor-pointer transition-colors">Fusion</li>
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