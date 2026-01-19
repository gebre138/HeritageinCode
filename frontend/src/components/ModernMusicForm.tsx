import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Track } from "../types";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";

const REQUIRED_COLUMNS = ["Sound type", "Country", "Rhythm style", "Harmony type", "Bpm", "Mood"];
const API_URL = process.env.REACT_APP_API_URL;

const ModernMusicForm: React.FC<{editingTrack?: Track | null; onTrackAdded?: () => void; onTrackUpdated?: () => void; onCancel: () => void;}> = ({ editingTrack, onTrackAdded, onTrackUpdated, onCancel }) => {
  const [excelMode, setExcelMode] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [rowFiles, setRowFiles] = useState<Record<string, File>>({});
  const [formData, setFormData] = useState<Record<string, any>>({ category: "", country: "", rhythm_style: "", harmony_type: "", bpm: "", mood: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [popup, setPopup] = useState<{ msg: string; type: string } | null>(null);

  const role = sessionStorage.getItem("role"), token = sessionStorage.getItem("userToken");

  const showPopup = (msg: string, type = "success") => { setPopup({ msg, type }); setTimeout(() => setPopup(null), 3000); };

  const getSelectStyles = (err: boolean) => ({
    control: (b: any) => ({ ...b, minHeight: '32px', fontSize: '12px', borderColor: err ? COLORS.dangerColor : COLORS.borderLight, borderRadius: '4px', boxShadow: 'none' }),
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

  const handleBatch = async () => {
    setLoading(true); let count = 0;
    for (let i = 0; i < excelData.length; i++) {
      if (REQUIRED_COLUMNS.every(c => excelData[i][c]) && rowFiles[`${i}-a`]) {
        try { await processSubmission(excelData[i], rowFiles[`${i}-a`]); count++; } catch (e) {}
      }
    }
    showPopup(`Uploaded ${count} tracks`); if (count > 0) onTrackAdded?.();
    setLoading(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2" style={{ color: COLORS.textDark }}>
      {popup && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-2 rounded-full text-sm font-bold shadow-xl" style={{ backgroundColor: popup.type === 'error' ? COLORS.dangerColor : COLORS.primaryBlack, color: "#fff" }}>{popup.msg}</div>}
      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: "#fff", borderColor: COLORS.borderLight }}>
        <div className="px-4 py-2 border-b flex justify-between items-center" style={{ backgroundColor: COLORS.bgGray, borderColor: COLORS.borderLight }}>
          <span className="text-xs font-bold uppercase">{editingTrack ? "Edit Track" : "Modern Upload"}</span>
          <button onClick={() => setExcelMode(!excelMode)} className="text-[10px] uppercase font-bold px-4 py-1 border rounded-full bg-white shadow-sm">{excelMode ? "Manual" : "Batch"}</button>
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
                        {col === "Country" ? <Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={row[col] ? { value: row[col], label: row[col] } : null} onChange={(s: any) => { const d = [...excelData]; d[i][col] = s?.value; setExcelData(d); }} styles={getSelectStyles(false)} menuPortalTarget={document.body} /> : <input value={row[col] || ""} onChange={e => { const d = [...excelData]; d[i][col] = e.target.value; setExcelData(d); }} className="w-full p-1 bg-transparent outline-none" />}
                      </td>)}
                      <td className="p-1 border-b"><input type="file" className="w-24 text-[9px]" onChange={e => setRowFiles(p => ({ ...p, [`${i}-a`]: e.target.files![0] }))} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex justify-center gap-4"><button onClick={onCancel} className="px-6 py-1.5 text-[11px] border rounded-full">Cancel</button><button onClick={handleBatch} disabled={loading || !excelData.length} className="px-8 py-1.5 text-[11px] text-white rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{loading ? "..." : `Upload ${excelData.length}`}</button></div>
            </div>
          ) : (
            <form onSubmit={async e => { e.preventDefault(); setLoading(true); try { await processSubmission(formData, audioFile); showPopup("Success"); editingTrack ? onTrackUpdated?.() : onTrackAdded?.(); } catch (err) { showPopup("Error", "error"); } finally { setLoading(false); } }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["category", "rhythm_style", "harmony_type", "bpm", "mood"].map(f => (
                <div key={f} className="space-y-1"><label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textLight }}>{f.replace("_", " ")}</label><input type={f === "bpm" ? "number" : "text"} value={formData[f]} onChange={e => setFormData({ ...formData, [f]: e.target.value })} className="w-full p-2 border rounded text-xs outline-none" style={{ borderColor: COLORS.borderLight }} required /></div>
              ))}
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textLight }}>Country</label><Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={formData.country ? { value: formData.country, label: formData.country } : null} onChange={(s: any) => setFormData({ ...formData, country: s?.value || "" })} styles={getSelectStyles(false)} required /></div>
              <div className="md:col-span-3 p-4 border rounded-xl text-center" style={{ backgroundColor: COLORS.bgLibrary, borderColor: COLORS.borderOrange }}><label className="block text-[10px] font-bold uppercase mb-2" style={{ color: COLORS.primaryColor }}>Audio Track</label><input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="text-xs" required={!editingTrack} /></div>
              <div className="md:col-span-3 flex justify-center gap-4 pt-4 border-t" style={{ borderTopColor: COLORS.borderLight }}><button type="button" onClick={onCancel} className="px-8 py-2 text-[11px] font-bold border rounded-full">Cancel</button><button type="submit" disabled={loading} className="px-12 py-2 text-[11px] font-bold text-white rounded-full" style={{ backgroundColor: COLORS.primaryColor }}>{loading ? "..." : (editingTrack ? "Update" : "Submit")}</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ModernMusicForm;