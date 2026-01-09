import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";

interface Props {
  editingTrack?: Track | null;
  onTrackAdded?: () => void;
  onTrackUpdated?: () => void;
  onCancel: () => void;
}

const REQUIRED_COLUMNS = ["Sound type", "Country", "Rhythm style", "Harmony type", "Bpm", "Mood"];
const API_URL = process.env.REACT_APP_API_URL;

const ModernMusicForm: React.FC<Props> = ({ editingTrack, onTrackAdded, onTrackUpdated, onCancel }) => {
  const [excelMode, setExcelMode] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [rowFiles, setRowFiles] = useState<{ [key: string]: File }>({});
  const [formData, setFormData] = useState<Record<string, any>>({
    category: "",
    country: "",
    rhythm_style: "",
    harmony_type: "",
    bpm: "",
    mood: "",
    description: "",
    performer: ""
  });
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [excelErrors, setExcelErrors] = useState<Record<string, boolean>>({});
  const [popup, setPopup] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const role = sessionStorage.getItem("role");
  const token = sessionStorage.getItem("userToken");

  const getSelectStyles = (hasError: boolean) => ({
    control: (b: any) => ({
      ...b,
      minHeight: '32px',
      fontSize: '12px',
      borderColor: hasError ? '#ef4444' : '#e5e7eb',
      borderRadius: '4px',
      boxShadow: 'none',
      '&:hover': { borderColor: hasError ? '#ef4444' : '#d1d5db' }
    }),
    indicatorsContainer: (b: any) => ({ ...b, height: '30px' }),
    valueContainer: (b: any) => ({ ...b, padding: '0 8px' }),
    menuPortal: (b: any) => ({ ...b, zIndex: 9999 })
  });

  useEffect(() => {
    if (editingTrack) {
      setFormData({
        category: editingTrack.category || "",
        country: editingTrack.country || "",
        description: editingTrack.description || "",
        performer: editingTrack.performer || "",
        rhythm_style: editingTrack.rhythm_style || "",
        harmony_type: editingTrack.harmony_type || "",
        bpm: editingTrack.bpm || "",
        mood: editingTrack.mood || ""
      });
    }
  }, [editingTrack]);

  const showPopup = (msg: string, type: "success" | "error" = "success") => {
    setPopup({ msg, type });
    setTimeout(() => setPopup(null), 3000);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      setExcelData(json);
      setExcelErrors({});
    };
    reader.readAsArrayBuffer(f);
  };

  const processSubmission = async (data: any, file: File | null) => {
    const apiData = new FormData();
    apiData.append("category", data.Category || data.category || "");
    apiData.append("country", data.Country || data.country || "");
    apiData.append("rhythm_style", data["Rhythm style"] || data.rhythm_style || "");
    apiData.append("harmony_type", data["Harmony type"] || data.harmony_type || "");
    apiData.append("bpm", data.Bpm || data.bpm || "");
    apiData.append("mood", data.Mood || data.mood || "");
    apiData.append("isapproved", (role === "admin" || role === "superadmin") ? "true" : "false");
    apiData.append("is_modern", "true");
    if (file) apiData.append("modernaudio", file);

    const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };
    if (editingTrack) {
      return await axios.put(`${API_URL}/api/modern/${editingTrack.sound_id}`, apiData, config);
    } else {
      return await axios.post(`${API_URL}/api/modern/upload`, apiData, config);
    }
  };

  const validateManualForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category) newErrors.category = "Required";
    if (!formData.country) newErrors.country = "Required";
    if (!formData.rhythm_style) newErrors.rhythm_style = "Required";
    if (!formData.harmony_type) newErrors.harmony_type = "Required";
    if (!formData.bpm) newErrors.bpm = "Required";
    if (!formData.mood) newErrors.mood = "Required";
    if (!editingTrack && !audioFile) newErrors.audio = "Audio Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validateManualForm()) {
      showPopup("Please fill all required fields", "error");
      return;
    }
    setLoading(true);
    try {
      await processSubmission(formData, audioFile);
      showPopup("Success!");
      setTimeout(() => editingTrack ? onTrackUpdated?.() : onTrackAdded?.(), 1500);
    } catch (err) {
      showPopup("Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (excelData.length === 0) {
      showPopup("No data to upload", "error");
      return;
    }

    const newExcelErrors: Record<string, boolean> = {};
    let hasError = false;

    excelData.forEach((row, i) => {
      REQUIRED_COLUMNS.forEach(col => {
        if (!row[col]) {
          newExcelErrors[`${i}-${col}`] = true;
          hasError = true;
        }
      });
      if (!rowFiles[`${i}-audio`]) {
        newExcelErrors[`${i}-audio`] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setExcelErrors(newExcelErrors);
      showPopup("Missing fields in excel rows", "error");
      return;
    }

    setLoading(true);
    let count = 0;
    for (let i = 0; i < excelData.length; i++) {
      try {
        await processSubmission(excelData[i], rowFiles[`${i}-audio`]);
        count++;
      } catch (err) { console.error(err); }
    }
    
    if (count > 0) {
      showPopup(`Successfully uploaded ${count} tracks`, "success");
      setTimeout(() => onTrackAdded?.(), 1500);
    } else {
      showPopup("No tracks were uploaded", "error");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2">
      {popup && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl ${popup.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          {popup.msg}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {editingTrack ? "Edit Track" : "Modern Upload"}
          </span>
          {!editingTrack && (
            <button 
              onClick={() => { setExcelMode(!excelMode); setErrors({}); setExcelErrors({}); }} 
              className="text-[10px] uppercase font-bold px-4 py-1.5 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-all shadow-sm"
            >
              {excelMode ? "Manual Form" : "Batch Excel"}
            </button>
          )}
        </div>

        <div className="p-4">
          {excelMode ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-md p-4 text-center bg-gray-50">
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="text-xs" />
                <p className="text-[10px] text-gray-400 mt-1">Upload Excel matching your provided column structure</p>
              </div>

              {excelData.length > 0 && (
                <div className="overflow-x-auto border border-gray-100 rounded">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        {REQUIRED_COLUMNS.map(c => <th key={c} className="p-2 border-b font-semibold">{c}</th>)}
                        <th className="p-2 border-b font-semibold text-orange-600">Audio File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          {REQUIRED_COLUMNS.map(col => (
                            <td key={col} className={`p-1 border-b ${excelErrors[`${i}-${col}`] ? 'bg-red-50' : ''}`}>
                              {col === "Country" ? (
                                <Select
                                  options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))}
                                  value={row[col] ? { value: row[col], label: row[col] } : null}
                                  onChange={(s: any) => {
                                    const newData = [...excelData];
                                    newData[i][col] = s?.value;
                                    setExcelData(newData);
                                  }}
                                  styles={getSelectStyles(!!excelErrors[`${i}-${col}`])}
                                  menuPortalTarget={document.body}
                                />
                              ) : (
                                <input 
                                  value={row[col] || ""} 
                                  onChange={(e) => {
                                    const newData = [...excelData];
                                    newData[i][col] = e.target.value;
                                    setExcelData(newData);
                                  }}
                                  placeholder="Required"
                                  className={`w-full p-1 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-200 rounded ${excelErrors[`${i}-${col}`] ? 'placeholder-red-400' : ''}`}
                                />
                              )}
                            </td>
                          ))}
                          <td className={`p-1 border-b ${excelErrors[`${i}-audio`] ? 'bg-red-50' : ''}`}>
                            <input 
                              type="file" 
                              accept="audio/*" 
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setRowFiles(prev => ({ ...prev, [`${i}-audio`]: f }));
                                  setExcelErrors(prev => ({ ...prev, [`${i}-audio`]: false }));
                                }
                              }}
                              className="w-24 text-[9px]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="flex justify-center gap-4 pt-6">
                <button onClick={onCancel} className="px-8 py-2 text-[11px] font-bold uppercase border border-gray-300 rounded-full bg-white hover:bg-gray-50 shadow-sm transition-all">Cancel</button>
                <button 
                  onClick={handleBatchSubmit} 
                  disabled={loading || !excelData.length}
                  className="px-10 py-2 text-[11px] font-bold uppercase bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? "Uploading..." : `Upload ${excelData.length} Tracks`}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Sound Type</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={`w-full p-2 border rounded text-xs outline-none ${errors.category ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.category && <p className="text-[9px] text-red-500">{errors.category}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Country</label>
                <Select 
                  options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} 
                  value={formData.country ? { value: formData.country, label: formData.country } : null}
                  onChange={(s) => setFormData({...formData, country: s?.value || ""})}
                  styles={getSelectStyles(!!errors.country)}
                />
                {errors.country && <p className="text-[9px] text-red-500">{errors.country}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Rhythm Style</label>
                <input type="text" value={formData.rhythm_style} onChange={(e) => setFormData({...formData, rhythm_style: e.target.value})} className={`w-full p-2 border rounded text-xs outline-none ${errors.rhythm_style ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.rhythm_style && <p className="text-[9px] text-red-500">{errors.rhythm_style}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Harmony Type</label>
                <input type="text" value={formData.harmony_type} onChange={(e) => setFormData({...formData, harmony_type: e.target.value})} className={`w-full p-2 border rounded text-xs outline-none ${errors.harmony_type ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.harmony_type && <p className="text-[9px] text-red-500">{errors.harmony_type}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">BPM</label>
                <input type="number" value={formData.bpm} onChange={(e) => setFormData({...formData, bpm: e.target.value})} className={`w-full p-2 border rounded text-xs outline-none ${errors.bpm ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.bpm && <p className="text-[9px] text-red-500">{errors.bpm}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Mood</label>
                <input type="text" value={formData.mood} onChange={(e) => setFormData({...formData, mood: e.target.value})} className={`w-full p-2 border rounded text-xs outline-none ${errors.mood ? 'border-red-500' : 'border-gray-200'}`} />
                {errors.mood && <p className="text-[9px] text-red-500">{errors.mood}</p>}
              </div>
              
              <div className={`md:col-span-3 p-4 rounded-xl border mt-2 text-center ${errors.audio ? 'bg-red-50 border-red-200' : 'bg-orange-50/50 border-orange-100'}`}>
                <label className={`block text-[10px] font-bold uppercase mb-2 ${errors.audio ? 'text-red-700' : 'text-orange-800'}`}>Audio Track</label>
                <input type="file" accept="audio/*" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setErrors(p => ({...p, audio: ""})); }} className="text-xs mx-auto" />
                {errors.audio && <p className="text-[9px] text-red-500 mt-1">{errors.audio}</p>}
              </div>

              <div className="md:col-span-3 flex justify-center gap-4 pt-6 border-t mt-2">
                <button type="button" onClick={onCancel} className="px-8 py-2 text-[11px] font-bold uppercase border border-gray-300 rounded-full bg-white hover:bg-gray-50 shadow-sm transition-all">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-12 py-2 text-[11px] font-bold uppercase bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all min-w-[160px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    editingTrack ? "Update Master" : "Submit Track"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernMusicForm;