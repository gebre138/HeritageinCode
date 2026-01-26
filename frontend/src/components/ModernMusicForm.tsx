import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const REQUIRED_COLUMNS = ["Sound type", "Country", "Rhythm style", "Harmony type", "Bpm", "Mood"];
const API_URL = process.env.REACT_APP_API_URL;

const ModernMusicForm: React.FC<{editingTrack?: Track | null; onTrackAdded?: () => void; onTrackUpdated?: () => void; onCancel: () => void;}> = ({ editingTrack, onTrackAdded, onTrackUpdated, onCancel }) => {
  const [excelMode, setExcelMode] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [rowFiles, setRowFiles] = useState<Record<string, File>>({});
  const [formData, setFormData] = useState<Record<string, any>>({ category: "", country: "", rhythm_style: "", harmony_type: "", bpm: "", mood: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFinalPop, setShowFinalPop] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const role = sessionStorage.getItem("role"), token = sessionStorage.getItem("userToken");

  const getSelectStyles = (hasError: boolean) => ({
    control: (b: any) => ({ ...b, minHeight: '32px', fontSize: '12px', borderColor: hasError ? "#ef4444" : COLORS.borderLight, borderRadius: '12px', boxShadow: 'none', backgroundColor: hasError ? "#fef2f2" : "#fff" }),
    option: (b: any, { isFocused, isSelected }: any) => ({ ...b, fontSize: '12px', backgroundColor: isSelected ? COLORS.primaryColor : isFocused ? COLORS.primaryTransparent : "#fff", color: isSelected ? "#fff" : COLORS.textDark })
  });

  useEffect(() => { if (editingTrack) setFormData({ category: editingTrack.category, country: editingTrack.country, rhythm_style: editingTrack.rhythm_style, harmony_type: editingTrack.harmony_type, bpm: editingTrack.bpm, mood: editingTrack.mood }); }, [editingTrack]);

  const processSubmission = async (data: any, file: File | null) => {
    const fd = new FormData();
    Object.entries({ category: data.Category || data["Sound type"] || data.category, country: data.Country || data.country, rhythm_style: data["Rhythm style"] || data.rhythm_style, harmony_type: data["Harmony type"] || data.harmony_type, bpm: data.Bpm || data.bpm, mood: data.Mood || data.mood, isapproved: (role === "admin" || role === "superadmin"), is_modern: "true" }).forEach(([k, v]) => fd.append(k, String(v)));
    if (file) fd.append("modernaudio", file);
    const cfg = { headers: { Authorization: `Bearer ${token}` } };
    return editingTrack ? axios.put(`${API_URL}/api/modern/${editingTrack.sound_id}`, fd, cfg) : axios.post(`${API_URL}/api/modern/upload`, fd, cfg);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    const fields = ["category", "rhythm_style", "harmony_type", "bpm", "mood", "country"];
    fields.forEach(f => { if (!formData[f]) newErrors[f] = true; });
    if (!editingTrack && !audioFile) newErrors["audio"] = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await processSubmission(formData, audioFile);
      setShowFinalPop({ msg: "Your track is uploaded success", type: "success" });
    } catch (err) {
      setShowFinalPop({ msg: "Failed upload", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBatch = async () => {
    setLoading(true); let count = 0;
    for (let i = 0; i < excelData.length; i++) {
      if (REQUIRED_COLUMNS.every(c => excelData[i][c]) && rowFiles[`${i}-a`]) {
        try { await processSubmission(excelData[i], rowFiles[`${i}-a`]); count++; } catch (e) {}
      }
    }
    if (count > 0) {
        setShowFinalPop({ msg: `Successfully uploaded ${count} tracks`, type: "success" });
    } else {
        setShowFinalPop({ msg: "Failed upload", type: "error" });
    }
    setLoading(false);
  };

  const closePop = () => {
    const isSuccess = showFinalPop?.type === "success";
    setShowFinalPop(null);
    if (isSuccess) {
        editingTrack ? onTrackUpdated?.() : onTrackAdded?.();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2" style={{ color: COLORS.textDark }}>
      {showFinalPop && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border text-center animate-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              {showFinalPop.type === 'success' ? <CheckCircle2 size={48} className="text-green-500" /> : <XCircle size={48} className="text-red-500" />}
            </div>
            <h3 className="text-sm font-bold mb-6" style={{ color: COLORS.textDark }}>{showFinalPop.msg}</h3>
            <button onClick={closePop} className="w-full py-2.5 text-white rounded-full text-xs font-bold shadow-lg shadow-amber-600/20 transition-transform active:scale-95" style={{ backgroundColor: COLORS.primaryColor }}>
              Okay
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: "#fff", borderColor: COLORS.borderLight }}>
        <div className="px-4 py-2 border-b flex justify-between items-center" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <span className="text-xs font-bold">{editingTrack ? "Edit track" : "Modern upload"}</span>
          <button onClick={() => setExcelMode(!excelMode)} className="text-[10px] font-bold px-4 py-1 border rounded-full bg-white shadow-sm">{excelMode ? "Manual" : "Batch"}</button>
        </div>
        <div className="p-4">
          {excelMode ? (
            <div className="space-y-4">
              <input type="file" accept=".xlsx,.xls" className="text-xs" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onload = ev => setExcelData(XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' }).SheetNames[0]]));
                r.readAsArrayBuffer(f);
              }} />
              <div className="overflow-x-auto border rounded" style={{ borderColor: COLORS.borderLight }}>
                <table className="w-full text-[11px] text-left">
                  <thead style={{ backgroundColor: COLORS.bgTableHead }}><tr>{REQUIRED_COLUMNS.map(c => <th key={c} className="p-2 border-b">{c}</th>)}<th className="p-2 border-b">Audio</th></tr></thead>
                  <tbody>{excelData.map((row, i) => (
                    <tr key={i} className="hover:bg-orange-50/30">
                      {REQUIRED_COLUMNS.map(col => <td key={col} className="p-1 border-b">
                        {col === "Country" ? <Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={row[col] ? { value: row[col], label: row[col] } : null} onChange={(s: any) => { const d = [...excelData]; d[i][col] = s?.value; setExcelData(d); }} styles={getSelectStyles(false)} menuPortalTarget={document.body} /> : <input value={row[col] || ""} onChange={e => { const d = [...excelData]; d[i][col] = e.target.value; setExcelData(d); }} className="w-full p-2 bg-transparent outline-none border rounded-[12px]" style={{ borderColor: COLORS.borderLight }} />}
                      </td>)}
                      <td className="p-1 border-b"><input type="file" className="w-24 text-[9px]" onChange={e => setRowFiles(p => ({ ...p, [`${i}-a`]: e.target.files![0] }))} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={handleBatch} disabled={loading || !excelData.length} className="px-8 py-1.5 text-[11px] text-white rounded-full flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
                  {loading ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : "Upload"}
                </button>
                <button onClick={onCancel} className="px-6 py-1.5 text-[11px] border rounded-full">Cancel</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} noValidate className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["category", "rhythm_style", "harmony_type", "bpm", "mood"].map(f => (
                <div key={f} className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold" style={{ color: COLORS.textLight }}>{f.replace("_", " ")}</label>
                    {errors[f] && <span className="text-[9px] font-bold text-red-500">Required</span>}
                  </div>
                  <input type={f === "bpm" ? "number" : "text"} value={formData[f]} onChange={e => { setFormData({ ...formData, [f]: e.target.value }); if(errors[f]) setErrors({...errors, [f]: false}); }} className={`w-full p-2 border rounded-[12px] text-xs outline-none transition-all ${errors[f] ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-amber-400'}`} />
                </div>
              ))}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold" style={{ color: COLORS.textLight }}>Country</label>
                  {errors.country && <span className="text-[9px] font-bold text-red-500">Required</span>}
                </div>
                <Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={formData.country ? { value: formData.country, label: formData.country } : null} onChange={(s: any) => { setFormData({ ...formData, country: s?.value || "" }); if(errors.country) setErrors({...errors, country: false}); }} styles={getSelectStyles(!!errors.country)} />
              </div>
              <div className={`md:col-span-3 p-4 border rounded-xl text-center transition-all ${errors.audio ? 'border-red-500 bg-red-50' : 'border-dashed border-gray-200 bg-gray-50'}`} style={{ borderColor: errors.audio ? '#ef4444' : COLORS.borderOrange }}>
                <div className="flex flex-col items-center gap-1">
                  <label className="block text-[10px] font-bold" style={{ color: errors.audio ? '#ef4444' : COLORS.primaryColor }}>Audio track</label>
                  {errors.audio && <span className="text-[9px] font-bold text-red-500 mb-1">File selection is required</span>}
                </div>
                <input type="file" accept="audio/*" onChange={e => { setAudioFile(e.target.files?.[0] || null); if(errors.audio) setErrors({...errors, audio: false}); }} className="text-xs" />
              </div>
              <div className="md:col-span-3 flex justify-center gap-4 pt-4 border-t" style={{ borderTopColor: COLORS.borderLight }}>
                <button type="submit" disabled={loading} className="px-12 py-2 text-[11px] font-bold text-white rounded-full flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
                  {loading ? <><Loader2 size={12} className="animate-spin" /> {editingTrack ? "Updating..." : "Uploading..."}</> : (editingTrack ? "Update" : "Submit")}
                </button>
                <button type="button" onClick={onCancel} className="px-8 py-2 text-[11px] font-bold border rounded-full">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ModernMusicForm;