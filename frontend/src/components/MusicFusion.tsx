import React, { useState, useRef, useEffect } from "react";
import { Track } from "../types";

interface Props {
  tracks: Track[];
  modernTracks: Track[];
}

const MusicFusion: React.FC<Props> = ({ tracks, modernTracks }) => {
  const [music1, setMusic1] = useState<Track | null>(null);
  const [music2, setMusic2] = useState<Track | null>(null);
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);

  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref1.current && !ref1.current.contains(e.target as Node)) { setIsOpen1(false); setSearch1(""); }
      if (ref2.current && !ref2.current.contains(e.target as Node)) { setIsOpen2(false); setSearch2(""); }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const fTrks = tracks.filter(t => !!t.isapproved && `${t.title} ${t.country}`.toLowerCase().includes(search1.toLowerCase()));
  const fMod = modernTracks.filter(t => !!t.isapproved && `${t.category} ${t.country}`.toLowerCase().includes(search2.toLowerCase()));

  const Dropdown = ({ open, items, onSel, search, setS, active, label, setO, type }: any) => (
    <div className={`p-4 rounded-2xl border transition-all duration-500 ${active ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
      <label className="block text-[10px] font-black text-[#E67E22] mb-2">{label}</label>
      <div className="relative">
        <input type="text" className="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-sm font-semibold outline-none" 
          placeholder={`Select ${type} track`} value={open ? search : (active ? `${type === 'modern' ? active.category : active.title} (${active.country})` : search)}
          onChange={e => { setS(e.target.value); setO(true); }} onFocus={() => setO(true)} />
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {items.length ? items.map((t: Track) => (
              <div key={t.sound_id} className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm font-medium border-b border-gray-50"
                onClick={() => { onSel(t); setS(""); setO(false); }}>
                {type === 'modern' ? t.category : t.title} <span className="text-[10px] text-gray-400">({t.country})</span>
              </div>
            )) : <div className="p-3 text-xs text-gray-400">No results</div>}
          </div>
        )}
      </div>
      {active && (
        <div className="mt-4 animate-in zoom-in-95">
          <div className="flex justify-between mb-2"><span className="text-xs font-bold truncate pr-2">{type === 'modern' ? active.category : active.title}</span>
            <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-[#E67E22] rounded-full font-bold">{type === 'modern' ? active.country : active.performer}</span></div>
          <audio key={active.sound_id} controls className="w-full h-8 scale-90 -ml-4"><source src={type === 'modern' ? active.modernaudio_url : active.sound_track_url} type="audio/mpeg" /></audio>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-extrabold text-gray-800">AI Sound Fusion</h2>
        <p className="text-[11px] text-gray-400 italic">blend heritage with modernity</p>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-10 relative">
        <div className="w-full md:w-1/2" ref={ref1}><Dropdown label="Heritage source" type="traditional" items={fTrks} active={music1} onSel={setMusic1} search={search1} setS={setSearch1} open={isOpen1} setO={setIsOpen1} /></div>
        <div className="hidden md:flex items-center pt-8"><div className={`w-12 h-12 rounded-full border flex items-center justify-center ${music1 && music2 ? 'bg-[#E67E22]/10 border-[#E67E22]/30 text-[#E67E22]' : 'text-gray-300'}`}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></div></div>
        <div className="w-full md:w-1/2" ref={ref2}><Dropdown label="Modern base" type="modern" items={fMod} active={music2} onSel={setMusic2} search={search2} setS={setSearch2} open={isOpen2} setO={setIsOpen2} /></div>
      </div>
      <div className="flex justify-center">
        <button 
          onClick={() => alert('Under Development')} 
          disabled={!music1 || !music2} 
          className={`px-10 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
            music1 && music2 
            ? "bg-[#E67E22] text-white hover:bg-[#D35400] shadow-lg shadow-orange-200" 
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Fuse tracks
        </button>
      </div>
    </div>
  );
};

export default MusicFusion;