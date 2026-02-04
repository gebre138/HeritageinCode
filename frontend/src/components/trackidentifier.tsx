import React, { useState, useMemo } from "react";
import axios from "axios";
import { 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  Upload, 
  Music4,
  Search,
  Music
} from "lucide-react";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";

interface TrackMetadata {
  title: string;
  category: string;
  country: string;
  community: string;
  region: string;
  context: string;
  album_file_url: string;
  sound_id: string;
  sound_track_url: string;
}

const TrackIdentifier: React.FC<{ tracks?: any[] }> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const [status, setStatus] = useState<"idle" | "unknown" | "identified">("idle");
  const [error, setError] = useState<string | null>(null);

  const api_base = process.env.REACT_APP_API_URL || "https://root-heritage-backend.onrender.com";

  const cCode = useMemo(() => {
    if (!metadata) return null;
    return COUNTRIES.find(c => c.name === metadata.country)?.code.toLowerCase();
  }, [metadata]);

  const toSentenceCase = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setMetadata(null);
      setError(null);
    }
  };

  const identifyTrack = async () => {
    if (!file) return;
    setIdentifying(true);
    setError(null);
    setStatus("idle");
    const formData = new FormData();
    formData.append("sound_track_url", file);
    formData.append("sound_id", "id_check_" + Date.now());
    formData.append("title", "identification_query");
    try {
      await axios.post(`${api_base}/api/tracks`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setStatus("unknown");
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        const errorInfo = err.response.data;
        if (errorInfo.step === "similarity" && errorInfo.similarTrack) {
          try {
            const res = await axios.get(`${api_base}/api/tracks/${errorInfo.similarTrack.sound_id}`);
            setMetadata(res.data);
            setStatus("identified");
          } catch (fetchErr) {
            setMetadata(errorInfo.similarTrack);
            setStatus("identified");
          }
        } else {
          setStatus("unknown");
        }
      } else {
        setStatus("unknown");
      }
    } finally {
      setIdentifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-white font-sans antialiased text-slate-600 p-4 md:p-6">
      <div className="w-full max-w-[900px] flex flex-col items-center">
        <div className="mb-10 w-full flex justify-center">
          <div className="p-4 md:px-10 bg-white border border-slate-100 rounded-2xl shadow-sm text-center w-full">
            <h1 className="text-[20px] md:text-[24px] font-black text-slate-900 tracking-tight leading-none flex items-center justify-center gap-3">
              <Music4 className="text-amber-500" size={24} />
              Root heritage analizer
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 w-full">
          {status !== "identified" && status !== "unknown" && (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="relative">
                <input type="file" id="audio-upload" accept="audio/*" onChange={handleFileSelect} className="hidden" />
                <label 
                  htmlFor="audio-upload" 
                  className="group relative flex flex-col items-center justify-center text-center p-4 w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-dashed border-amber-200 bg-amber-50/5 cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-all duration-300 overflow-hidden"
                >
                  {file ? (
                    <span className="text-[10px] font-bold text-amber-600 break-words px-2 lowercase">
                      {file.name}
                    </span>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black text-amber-500">Choice audio</span>
                    </div>
                  )}
                </label>
              </div>

              {file && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                  {!identifying ? (
                    <button 
                      onClick={identifyTrack} 
                      className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-full text-white text-[11px] font-black bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all"
                    >
                      Check track <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-3 px-8 py-2.5 bg-white rounded-full border border-amber-100">
                      <Loader2 className="animate-spin text-amber-500" size={14} />
                      <span className="text-[10px] font-black text-amber-400">Processing</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {status === "unknown" && (
            <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95">
              <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-100 rounded-[40px] shadow-xl max-w-sm w-full text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search size={40} className="text-slate-300" />
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-8">
                  We couldn't find detail for this audio.
                </p>
                <button 
                  onClick={() => { setStatus("idle"); setFile(null); }}
                  className="w-full py-3 bg-amber-500 text-white text-[11px] font-black rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                >
                  Try another
                </button>
              </div>
            </div>
          )}

          {error && status !== "unknown" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 max-w-sm w-full">
              <AlertCircle size={18} />
              <p className="text-[12px] font-bold uppercase text-center">{error}</p>
            </div>
          )}

          {status === "identified" && metadata && (
            <div className="w-full animate-in fade-in zoom-in-95 duration-500 flex justify-center">
              <div className="flex flex-col md:flex-row items-center md:items-stretch bg-white border border-slate-100 rounded-[40px] shadow-xl overflow-hidden max-w-[800px] w-full">
                <div className="w-full md:w-[300px] p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-50">
                  <div className="w-48 h-48 md:w-52 md:h-52 rounded-full overflow-hidden relative border-4 flex items-center justify-center bg-slate-50 shadow-inner" style={{ borderColor: COLORS.borderLight }}>
                    {metadata.album_file_url ? (
                      <img 
                        src={metadata.album_file_url} 
                        className="w-full h-full object-cover block" 
                        alt="Track artwork" 
                        crossOrigin="anonymous"
                        loading="eager"
                        onError={(e) => { 
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; 
                          target.style.display = 'none';
                          target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`fallback-icon ${metadata.album_file_url ? 'hidden' : ''}`}>
                      <Music size={48} className="text-slate-200" />
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 p-8 md:p-10 flex flex-col">
                  <div className="flex items-center gap-2 p-2 rounded-xl border mb-6" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
                    <audio controls controlsList="nodownload" className="flex-1 h-8">
                      <source src={metadata.sound_track_url} type="audio/mpeg" />
                    </audio>
                  </div>

                  <div className="space-y-1.5 text-slate-500">
                    <div className="text-[14px] font-normal flex gap-1">
                      <span className="font-bold">Category:</span>
                      <span>{toSentenceCase(metadata.category)}</span>
                    </div>
                    <div className="text-[14px] font-normal flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="font-bold">Country:</span>
                        <span>{toSentenceCase(metadata.country)}</span>
                      </div>
                      {cCode && <img src={`https://flagcdn.com/w20/${cCode}.png`} className="w-4 h-2.5 opacity-60" alt="Flag" />}
                    </div>
                    <div className="text-[14px] font-normal flex gap-1">
                      <span className="font-bold">Community:</span>
                      <span>{toSentenceCase(metadata.community)}</span>
                    </div>
                    <div className="text-[14px] font-normal flex gap-1">
                      <span className="font-bold">Region:</span>
                      <span>{toSentenceCase(metadata.region)}</span>
                    </div>
                    <div className="text-[14px] font-normal flex gap-1">
                      <span className="font-bold">Context:</span>
                      <span>{toSentenceCase(metadata.context)}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex">
                    <button 
                      onClick={() => { setMetadata(null); setStatus("idle"); setFile(null); }}
                      className="w-full py-2.5 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                    >
                      New scan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackIdentifier;