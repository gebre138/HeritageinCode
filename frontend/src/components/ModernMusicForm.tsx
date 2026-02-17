import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Track } from "../types";
import { COLORS } from "./supportives/colors";
import { CheckCircle2, XCircle, Upload, Loader2, AlertCircle } from "lucide-react";

const REQUIRED_COLUMNS = ["Sound type", "Rhythm style", "Bpm", "Mood"];
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

const ModernMusicForm: React.FC<{editingTrack?: Track | null; onTrackAdded?: () => void; onTrackUpdated?: () => void; onCancel: () => void;}> = ({ editingTrack, onTrackAdded, onTrackUpdated, onCancel }) => {
  const [excelMode, setExcelMode] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [rowFiles, setRowFiles] = useState<Record<string, File>>({});
  const [formData, setFormData] = useState<Record<string, any>>({ category: "", rhythm_style: "", bpm: "", mood: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFinalPop, setShowFinalPop] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const role = sessionStorage.getItem("role");
  const token = sessionStorage.getItem("userToken");
  const isAuthorized = role === "admin" || role === "superadmin";

  useEffect(() => { 
    if (editingTrack) {
      setFormData({ 
        category: editingTrack.category || "", 
        rhythm_style: editingTrack.rhythm_style || "", 
        bpm: editingTrack.bpm || "", 
        mood: editingTrack.mood || "" 
      }); 
      setExcelMode(false);
    }
  }, [editingTrack]);

  const validateManual = () => {
    const errs: Record<string, string> = {};
    if (!formData.category) errs.category = "sound type is required";
    if (!formData.rhythm_style) errs.rhythm_style = "rhythm style is required";
    if (!formData.bpm) errs.bpm = "bpm is required";
    if (!formData.mood) errs.mood = "mood is required";
    if (!editingTrack && !audioFile) errs.audio = "audio file is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const processSubmission = async (data: any, file: File | null) => {
    const fd = new FormData();
    fd.append("category", data.category || data["Sound type"] || "");
    fd.append("rhythm_style", data.rhythm_style || data["Rhythm style"] || "");
    fd.append("bpm", String(data.bpm || data["Bpm"] || 0));
    fd.append("mood", data.mood || data["Mood"] || "");
    fd.append("isapproved", String(role === "admin" || role === "superadmin"));
    
    if (file) {
      fd.append("modernaudio", file);
    }

    const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };
    
    if (editingTrack) {
      return api.put(`/api/modern/update-track/${editingTrack.sound_id}`, fd, config);
    }
    return api.post(`/api/modern/upload`, fd, config);
  };

  const handleBatch = async () => {
    setFieldErrors({});
    if (excelData.length === 0) {
      setFieldErrors({ batch: "please upload an excel file first" });
      return;
    }

    const missingFiles = excelData.some((_, i) => !rowFiles[`${i}-a`]);
    if (missingFiles) {
      setFieldErrors({ batch: "please attach audio files for all rows in the list" });
      return;
    }

    setLoading(true); 
    let successCount = 0;
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const audioKey = `${i}-a`;
      if (rowFiles[audioKey]) {
        try { 
          await processSubmission(row, rowFiles[audioKey]); 
          successCount++; 
        } catch (e: any) {
          console.error(`row ${i} failed`, e.response?.data || e.message);
        }
      }
    }
    setShowFinalPop({ msg: `Completed. ${successCount} Tracks are Uploaded.`, type: successCount > 0 ? "success" : "error" });
    setLoading(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateManual()) return;

    setLoading(true); 
    try { 
      await processSubmission(formData, audioFile); 
      setShowFinalPop({msg: editingTrack ? "track updated" : "Track Uploaded", type: "success"}); 
    } catch(err) { 
      setShowFinalPop({msg: "Uploading failed", type: "error"}); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isAuthorized) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 text-center">
        <p className="text-sm font-bold text-red-500 uppercase">Access Denied: Admins Only</p>
      </div>
    );
  }

  const renderError = (field: string) => fieldErrors[field] && (
    <p className="text-[9px] text-red-500 font-bold mt-1 lowercase flex items-center gap-1">
      <AlertCircle size={8} /> {fieldErrors[field]}
    </p>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-4" style={{ color: COLORS.textDark }}>
      {showFinalPop && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              {showFinalPop.type === 'success' ? <CheckCircle2 size={40} className="text-green-500" /> : <XCircle size={40} className="text-red-500" />}
            </div>
            <h3 className="text-[12px] font-bold mb-6 tracking-tight">{showFinalPop.msg}</h3>
            <button onClick={() => { 
              setShowFinalPop(null); 
              if(showFinalPop.type === "success") {
                editingTrack ? onTrackUpdated?.() : onTrackAdded?.(); 
              }
            }} className="w-full py-2 text-white rounded-full text-xs font-bold" style={{ backgroundColor: COLORS.primaryColor }}>close</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl shadow-xl border overflow-hidden bg-white" style={{ borderColor: COLORS.borderLight }}>
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <span className="text-xs font-bold tracking-wider">{editingTrack ? "Edit Modern Track" : "Modern Sound Management"}</span>
          {!editingTrack && (
            <button onClick={() => { setExcelMode(!excelMode); setFieldErrors({}); }} className="text-[10px] font-bold px-4 py-1.5 border rounded-full bg-white hover:bg-gray-50 transition-colors">
              {excelMode ? "Back" : "Batch Upload"}
            </button>
          )}
        </div>

        <div className="p-6">
          {excelMode ? (
            <div className="space-y-6">
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${fieldErrors.batch ? 'border-red-300' : ''}`} style={{ borderColor: !fieldErrors.batch ? COLORS.borderLight : undefined }}>
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 font-medium">Upload excel file</p>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
                  const f = e.target.files?.[0]; if (!f) return; 
                  const r = new FileReader(); r.onload = ev => {
                    const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    setExcelData(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
                    setFieldErrors({});
                  };
                  r.readAsArrayBuffer(f); 
                }} />
              </label>
              {renderError("batch")}

              {excelData.length > 0 && (
                <div className="overflow-x-auto border rounded-xl" style={{ borderColor: COLORS.borderLight }}>
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        {REQUIRED_COLUMNS.map(c => <th key={c} className="p-3 border-b uppercase font-bold text-gray-600">{c}</th>)}
                        <th className="p-3 border-b uppercase font-bold text-gray-600">audio file</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {excelData.map((row, i) => (
                        <tr key={i}>
                          {REQUIRED_COLUMNS.map(col => <td key={col} className="p-2 text-gray-500">{row[col]}</td>)}
                          <td className="p-2"><input type="file" accept="audio/*" className="text-[9px]" onChange={e => { setRowFiles(p => ({ ...p, [`${i}-a`]: e.target.files![0] })); setFieldErrors({}); }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4 border-t">
                <button onClick={handleBatch} disabled={loading} className="px-12 py-2 text-[11px] font-bold text-white rounded-full flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  {loading ? "uploading..." : "Upload"}
                </button>
                <button onClick={onCancel} className="px-8 py-2 text-[11px] font-bold border rounded-full">Cancel</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">sound type</label>
                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full p-2 border rounded-xl text-xs outline-none focus:border-amber-500 ${fieldErrors.category ? 'border-red-500 bg-red-50' : ''}`} />
                {renderError("category")}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">rhythm style</label>
                <input value={formData.rhythm_style} onChange={e => setFormData({...formData, rhythm_style: e.target.value})} className={`w-full p-2 border rounded-xl text-xs outline-none focus:border-amber-500 ${fieldErrors.rhythm_style ? 'border-red-500 bg-red-50' : ''}`} />
                {renderError("rhythm_style")}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">bpm</label>
                <input type="number" value={formData.bpm} onChange={e => setFormData({...formData, bpm: e.target.value})} className={`w-full p-2 border rounded-xl text-xs outline-none focus:border-amber-500 ${fieldErrors.bpm ? 'border-red-500 bg-red-50' : ''}`} />
                {renderError("bpm")}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">mood</label>
                <input value={formData.mood} onChange={e => setFormData({...formData, mood: e.target.value})} className={`w-full p-2 border rounded-xl text-xs outline-none focus:border-amber-500 ${fieldErrors.mood ? 'border-red-500 bg-red-50' : ''}`} />
                {renderError("mood")}
              </div>
              <div className={`md:col-span-1 border-2 border-dashed p-4 rounded-xl text-center h-fit self-end ${fieldErrors.audio ? 'border-red-500 bg-red-50' : 'bg-gray-50'}`}>
                <label className="text-[10px] block mb-2 font-bold uppercase text-gray-400">
                  {editingTrack ? "replace audio (optional)" : "audio file (required)"}
                </label>
                <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="text-[10px]" />
                {renderError("audio")}
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 flex justify-center gap-4 pt-4 border-t mt-4">
                <button type="submit" disabled={loading} className="px-14 py-2.5 text-[11px] font-bold text-white rounded-full flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  {loading ? "Processing..." : (editingTrack ? "Update track" : "Upload track")}
                </button>
                <button type="button" onClick={onCancel} className="px-10 py-2.5 text-[11px] font-bold border rounded-full">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernMusicForm;