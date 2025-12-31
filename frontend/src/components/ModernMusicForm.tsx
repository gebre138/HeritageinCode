import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";
import Select from "react-select";

interface Props {
  editingTrack?: Track | null;
  onTrackAdded?: () => void;
  onTrackUpdated?: () => void;
  onCancel: () => void;
}

const ModernMusicForm: React.FC<Props> = ({ editingTrack, onTrackAdded, onTrackUpdated, onCancel }) => {
  const [trackType, setTrackType] = useState(editingTrack?.category || "");
  const [country, setCountry] = useState(editingTrack?.country || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.REACT_APP_API_URL;
  const role = sessionStorage.getItem("role");
  const token = sessionStorage.getItem("userToken");

  useEffect(() => {
    inputRef.current?.focus();
    if (editingTrack) {
      setTrackType(editingTrack.category || "");
      setCountry(editingTrack.country || "");
    }
  }, [editingTrack]);

  const showPopup = (msg: string, type: "success" | "error" = "success", dur = 3000) => {
    setPopup({ msg, type });
    setTimeout(() => setPopup(null), dur);
  };

  const isCategoryInvalid = trackType.length > 0 && !/^[a-zA-Z\s,()]+$/.test(trackType);
  const isCategoryEmpty = trackType.trim() === "";
  const isCountryEmpty = !country;
  const isAudioEmpty = !editingTrack && !audioFile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    
    if (isCategoryEmpty || isCategoryInvalid) {
      inputRef.current?.focus();
      return;
    }

    if (isCountryEmpty || isAudioEmpty) return;

    const formData = new FormData();
    formData.append("category", trackType);
    formData.append("country", country);
    formData.append("isapproved", (role === "admin" || role === "superadmin") ? "true" : "false");
    if (audioFile) formData.append("modernaudio", audioFile);

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };
      if (editingTrack) {
        await axios.put(`${API_URL}/api/modern/${editingTrack.sound_id}`, formData, config);
        showPopup("Track updated", "success");
        setTimeout(() => onTrackUpdated?.(), 1500);
      } else {
        await axios.post(`${API_URL}/api/modern/upload`, formData, config);
        const isAdm = role === "admin" || role === "superadmin";
        showPopup(isAdm ? "Track uploaded" : "Thankyou for contributing track will be avilable public if coply with the rule after aproval", "success", isAdm ? 3000 : 4000);
        setTimeout(() => onTrackAdded?.(), isAdm ? 1500 : 3000);
      }
    } catch (err: any) {
      showPopup(`Error: ${err.response?.data?.message || "Failed to upload track."}`, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 relative">
      {popup && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/10 backdrop-blur-[2px]">
          <div className={`px-8 py-6 rounded-2xl shadow-2xl text-white font-bold text-center max-w-md animate-in zoom-in duration-300 ${popup.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {popup.msg}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-orange-50 px-6 py-6 border-b text-center">
          <h2 className="text-2xl font-semibold text-gray-900">{editingTrack ? "Edit Modern Track" : "Upload Modern Track"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input 
              ref={inputRef}
              type="text" 
              value={trackType} 
              onChange={(e) => setTrackType(e.target.value)} 
              placeholder="Afro-Fusion, Jazz, (Electronic)" 
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-0 focus:outline-none ${(touched && isCategoryEmpty) || isCategoryInvalid ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {touched && isCategoryEmpty && <p className="text-red-500 text-[10px] mt-1 font-bold italic">Category is required</p>}
            {isCategoryInvalid && <p className="text-red-500 text-[10px] mt-1 font-bold italic">Only letters, spaces, and ,() allowed</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
            <Select
              options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))}
              value={country ? { value: country, label: country } : null}
              onChange={(s) => setCountry(s?.value || "")}
              placeholder="Select country"
              styles={{
                control: (b, s) => ({ ...b, borderRadius: "0.5rem", borderColor: (touched && isCountryEmpty) ? "#ef4444" : "#D1D5DB", boxShadow: "none", "&:hover": { borderColor: "#D1D5DB" } }),
                menu: (b) => ({ ...b, zIndex: 50 })
              }}
            />
            {touched && isCountryEmpty && <p className="text-red-500 text-[10px] mt-1 font-bold italic">Country is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="audio-upload-input"
                accept="audio/*" 
                onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)} 
                style={{ display: 'none' }} 
              />
              <label 
                htmlFor="audio-upload-input"
                className={`cursor-pointer px-4 py-2 rounded-md bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 border transition-all ${touched && isAudioEmpty ? 'border-red-500' : 'border-orange-200'}`}
              >
                Choose File
              </label>
              {audioFile && (
                <span className="text-sm text-gray-600 truncate max-w-[200px]">
                  {audioFile.name}
                </span>
              )}
            </div>
            {touched && isAudioEmpty && <p className="text-red-500 text-[10px] mt-1 font-bold italic">Audio file is required</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 whitespace-nowrap flex items-center gap-2 focus:ring-0 focus:outline-none"
            >
              {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
              {loading ? "Processing..." : editingTrack ? "Update Track" : "Upload"}
            </button>
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 whitespace-nowrap focus:ring-0 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModernMusicForm;