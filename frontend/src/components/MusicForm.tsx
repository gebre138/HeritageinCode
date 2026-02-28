import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Track } from "../types";
import { FORM_FIELDS } from "./supportives/attributes";
import { COUNTRIES } from "./supportives/countries";

interface MusicFormProps {
  onTrackAdded?: () => void;
  onTrackUpdated?: () => void;
  onCancelEdit?: () => void;
  editingTrack?: Track | null;
}

interface CheckStatus { status: string; error: string; }
interface CheckListState { lengthCheck: CheckStatus; audibilityCheck: CheckStatus; fingerprintCheck: CheckStatus; syncCheck: CheckStatus; }

const REQUIRED_COLUMNS = ["sound_id", "title", "performer", "category", "community", "region", "context", "country"];
const CULTURAL_FIELDS = [
  { name: "traditional_use", label: "Traditional Use" },
  { name: "ensemble_role", label: "Ensemble Role" },
  { name: "cultural_function", label: "Cultural Function" },
  { name: "musical_behaviour", label: "Musical Behaviour" },
  { name: "modern_use_tip", label: "Modern Use Tip" }
];
const API_URL = process.env.REACT_APP_API_URL;
const toSentenceCase = (str: string) => str ? str.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()) : "";

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

const MusicForm: React.FC<MusicFormProps> = ({ onTrackAdded, onTrackUpdated, onCancelEdit, editingTrack }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [excelErrors, setExcelErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [popup, setPopup] = useState<{ msg: string, type: "success" | "error" } | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [rowFiles, setRowFiles] = useState<{ [key: string]: File }>({});
  const [excelMode, setExcelMode] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [failedSummary, setFailedSummary] = useState<{ id: string, reason: string, similarTrack?: any, index?: number }[]>([]);
  const [successSummary, setSuccessSummary] = useState<string[]>([]);
  const [checkList, setCheckList] = useState<CheckListState>({
    lengthCheck: { status: "pending", error: "" },
    audibilityCheck: { status: "pending", error: "" },
    fingerprintCheck: { status: "pending", error: "" },
    syncCheck: { status: "pending", error: "" }
  });

  const fieldRefs = useRef<Record<string, any>>({});
  const role = sessionStorage.getItem("role"), token = sessionStorage.getItem("userToken"), userEmail = sessionStorage.getItem("userEmail") || "";

  const selectStyles = {
    control: (b: any, s: any) => ({ ...b, minHeight: '32px', fontSize: '12px', minWidth: '150px', borderColor: s.selectProps.error ? '#ef4444' : b.borderColor, '&:hover': { borderColor: s.selectProps.error ? '#ef4444' : b.borderColor } }),
    option: (b: any) => ({ ...b, fontSize: '12px' }), singleValue: (b: any) => ({ ...b, fontSize: '12px' }), menuPortal: (b: any) => ({ ...b, zIndex: 9999 })
  };

  useEffect(() => {
    const data: Record<string, any> = {};
    FORM_FIELDS.forEach(f => { data[f.name] = f.type === "file" ? null : editingTrack?.[f.name as keyof Track] || ""; });
    CULTURAL_FIELDS.forEach(f => { data[f.name] = editingTrack?.[f.name as keyof Track] || "--"; });
    setFormData(data); setErrors({}); setExcelErrors({}); setShowChecklist(false); setFailedSummary([]); setSuccessSummary([]); setExcelData([]); setRowFiles({});
  }, [editingTrack, excelMode]);

  const showPopup = (msg: string, type: "success" | "error" = "success") => { setPopup({ msg, type }); setTimeout(() => setPopup(null), 5000); };
  const getStatusIcon = (status: string) => {
    if (status === "loading") return <div className="animate-spin h-3.5 w-3.5 border-2 border-orange-400 border-t-transparent rounded-full"></div>;
    return status === "pass" ? <span className="text-green-500 font-medium text-sm">✓</span> : status === "fail" ? <span className="text-red-400 font-medium text-sm">✕</span> : <span className="text-gray-200 text-sm">○</span>;
  };

  const validateChars = (val: string) => /^[a-zA-Z_\s,():']*$/.test(val);
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    let error = (value.trim() === "" && !["description", "contributor", ...CULTURAL_FIELDS.map(f => f.name)].includes(fieldName)) ? `${toSentenceCase(fieldName)} is required.` : (["category", "community", "title", "region", "performer"].includes(fieldName) && !validateChars(value)) ? "Only characters, underscore, space, comma, brackets, colon and apostrophe allowed." : "";
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const processSingleSubmission = async (data: any, audioFile: any, coverFile: any, index?: number, isEdit: boolean = false) => {
    setCurrentTrackIndex(index !== undefined ? index + 1 : null);
    setCheckList({ lengthCheck: { status: "loading", error: "" }, audibilityCheck: { status: "pending", error: "" }, fingerprintCheck: { status: "pending", error: "" }, syncCheck: { status: "pending", error: "" } });
    setShowChecklist(true); setIsLoading(true);
    let apiResult: { success: boolean, error?: string, step?: string, similarTrack?: any };
    try {
      if (!token) throw new Error("missing authentication token. please log in.");
      const apiData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (!["sound_track_url", "album_file_url", "contributor"].includes(k)) apiData.append(k, String(v || "--")); });
      apiData.append("contributor", userEmail);
      if (audioFile instanceof File) apiData.append("sound_track_url", audioFile);
      if (coverFile instanceof File) apiData.append("album_file_url", coverFile);
      if (["admin", "superadmin"].includes(role || "")) apiData.append("isapproved", "true");
      const config = { headers: { "Content-Type": "multipart/form-data", "Authorization": `Bearer ${token}` } };
      isEdit && editingTrack ? await api.put(`/api/tracks/${editingTrack.sound_id}`, apiData, config) : await api.post(`/api/tracks`, apiData, config);
      apiResult = { success: true };
    } catch (err: any) { 
      const errorMessage = err.response?.status === 401 ? "session unauthorized or expired. please login again." : (err.response?.data?.error || err.message);
      apiResult = { success: false, error: String(errorMessage), step: err.response?.data?.step || "sync", similarTrack: err.response?.data?.similarTrack || null }; 
    }
    const steps = ["duration", "loudness", "similarity", "sync"], keys: (keyof CheckListState)[] = ["lengthCheck", "audibilityCheck", "fingerprintCheck", "syncCheck"];
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) { setCheckList(p => ({ ...p, [keys[i]]: { status: "loading", error: "" } })); await new Promise(r => setTimeout(r, 1000)); }
      if (!apiResult.success && apiResult.step === steps[i]) { setCheckList(p => ({ ...p, [keys[i]]: { status: "fail", error: apiResult.error || "" } })); setIsLoading(false); return apiResult; }
      setCheckList(p => ({ ...p, [keys[i]]: { status: "pass", error: "" } }));
    }
    setIsLoading(false); return apiResult;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFailedSummary([]); setSuccessSummary([]); const newErrors: Record<string, string> = {}; let first = "";
    FORM_FIELDS.forEach(f => {
      const val = String(formData[f.name] || ""), empty = (!editingTrack && f.type === "file" && !formData[f.name]) || (!["description", "contributor"].includes(f.name) && f.type !== "file" && !val);
      if (empty) { newErrors[f.name] = `${toSentenceCase(f.label)} is required.`; if (!first) first = f.name; }
      else if (["category", "community", "title", "region", "performer"].includes(f.name) && !validateChars(val)) { newErrors[f.name] = "Only chars, _, space, ,, (), : and ' allowed."; if (!first) first = f.name; }
    });
    if (!formData.country) { newErrors.country = "Required."; if (!first) first = "country"; }
    if (!editingTrack && !formData.sound_track_url) { newErrors.sound_track_url = "Required."; if (!first) first = "sound_track_url"; }
    if (!editingTrack && !formData.album_file_url) { newErrors.album_file_url = "Required."; if (!first) first = "album_file_url"; }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); fieldRefs.current[first]?.focus(); return; }
    const res = await processSingleSubmission(formData, formData.sound_track_url, formData.album_file_url, undefined, !!editingTrack);
    res.success ? setSuccessSummary([formData.sound_id]) : setFailedSummary([{ id: formData.sound_id, reason: res.error || "Failed", similarTrack: res.similarTrack }]);
  };

  const handleSubmitExcel = async () => {
    if (!excelData.length) return; setExcelErrors({}); setFailedSummary([]); setSuccessSummary([]); const newErr: Record<string, string> = {}; let fail = false;
    excelData.forEach((row, i) => {
      REQUIRED_COLUMNS.forEach(col => { const val = String(row[col] || "").trim(); if (!val) { newErr[`${i}-${col}`] = "Required"; fail = true; } else if (["category", "community", "title", "region", "performer"].includes(col) && !validateChars(val)) { newErr[`${i}-${col}`] = "Invalid"; fail = true; } });
      if (!rowFiles[`${i}-sound_track_url`]) { newErr[`${i}-sound_track_url`] = "Required"; fail = true; }
      if (!rowFiles[`${i}-album_file_url`]) { newErr[`${i}-album_file_url`] = "Required"; fail = true; }
    });
    if (fail) { setExcelErrors(newErr); showPopup("Missing Requiered Data", "error"); return; }
    for (let i = 0; i < excelData.length; i++) {
      const res = await processSingleSubmission(excelData[i], rowFiles[`${i}-sound_track_url`], rowFiles[`${i}-album_file_url`], i);
      if (res.success) { setSuccessSummary(p => [...p, excelData[i].sound_id || `Row ${i + 1}`]); } 
      else { setFailedSummary(p => [...p, { id: excelData[i].sound_id || `Row ${i + 1}`, reason: res.error || "Failed", similarTrack: res.similarTrack, index: i + 1 }]); }
    }
  };

  const orderedCols = useMemo(() => { if (!excelData.length) return []; const keys = Object.keys(excelData[0]), fixed = ["sound_id", "title", "performer", "category"]; return [...fixed, 'country', ...keys.filter(k => !fixed.includes(k) && k !== 'country')]; }, [excelData]);
  const fileInputClass = (n: string) => `block w-fit text-[11px] text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer ${errors[n] ? 'border border-red-500 rounded-md' : ''}`;

  return (
    <div className="w-full relative">
      {popup && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[120] animate-in slide-in-from-top"><div className={`px-6 py-2 rounded-full shadow-lg text-white text-xs font-medium ${popup.type === "error" ? "bg-red-500" : "bg-green-600"}`}>{popup.msg}</div></div>}
      {showChecklist && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100] backdrop-blur-[2px] p-2 sm:p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-sm sm:max-w-md border border-gray-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="text-center py-4 bg-[#E67E22]"><h3 className="text-white text-base sm:text-lg font-bold">{isLoading ? (currentTrackIndex !== null ? `Processing Track ${currentTrackIndex}` : "Processing Track") : 'Upload Summary'}</h3></div>
            <div className="space-y-4 overflow-y-auto p-4 sm:p-8 flex-grow bg-white">
              {!isLoading && (
                <div className="w-full mb-2 font-semibold">
                  {successSummary.length > 0 && <div className="text-green-700 text-[13px] sm:text-[14px]">{excelMode ? `Tracks uploaded: ${successSummary.length}` : 'Track uploaded'}</div>}
                  {failedSummary.length > 0 && <div className="text-red-700 text-[13px] sm:text-[14px]">{excelMode ? `Failed to upload tracks: ${failedSummary.length}` : 'The track could not be uploaded'}</div>}
                  {successSummary.length > 0 && role === "user" && <p className="mt-4 text-green-800 text-[11px] leading-relaxed font-bold">Thank you for uploading. The tracks will be available public after review if they comply with the rules.</p>}
                </div>
              )}
              {isLoading ? (
                <div className="space-y-4">{[{ l: "Audio Length", d: checkList.lengthCheck }, { l: "Audibility Check", d: checkList.audibilityCheck }, { l: "Audio Existence", d: checkList.fingerprintCheck }, { l: "Final Submission", d: checkList.syncCheck }].map((s, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-3"><span className={`text-[12px] ${s.d.status === 'loading' ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>{s.l}</span>{getStatusIcon(s.d.status)}</div>
                ))}</div>
              ) : (
                <div className="space-y-4">
                  {successSummary.map((id, i) => <div key={i} className="bg-green-50 p-2 sm:p-3 rounded-xl border border-green-100 flex items-center gap-2 text-[11px] text-green-700 font-medium">✓ Track ID: {id}</div>)}
                  {failedSummary.map((f, i) => (
                    <div key={i} className="bg-red-50 p-2 sm:p-3 rounded-xl border border-red-100 flex flex-col gap-2">
                      <div className="flex justify-between text-[11px] text-red-700"><div className="flex items-center gap-2 font-medium">✕ {f.index ? `Track ${f.index}, ` : ""}ID: {f.id}</div><span className="italic opacity-90 text-[10px] bg-red-100 px-2 py-0.5 rounded-full">{f.reason}</span></div>
                      {f.similarTrack && <div className="mt-1 pt-2 border-t border-red-200 flex items-center gap-3"><img src={f.similarTrack.album_file_url} alt="Similar Album Cover" className="w-10 h-10 rounded-full object-cover" onError={(e) => e.currentTarget.src = "/placeholder-image.png"} /><div className="flex flex-col max-w-[90px]"><p className="text-[10px] font-bold text-gray-800 truncate">{f.similarTrack.title}</p><p className="text-[9px] text-gray-600 truncate">{f.similarTrack.performer}</p></div><audio controls className="flex-grow h-7 scale-90 origin-right" src={f.similarTrack.sound_track_url} /></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isLoading && <div className="pb-6 sm:pb-8 flex justify-center bg-white px-4"><button onClick={() => { setShowChecklist(false); if (successSummary.length > 0) editingTrack ? onTrackUpdated?.() : onTrackAdded?.(); }} className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-xl text-white bg-orange-500 shadow-md">Close Summary</button></div>}
          </div>
        </div>
      )}

      <div className="w-full bg-orange-50 text-[#E67E22] p-5 rounded-t-2xl border border-orange-100 flex justify-between items-center"><h1 className="text-xl font-extrabold">{editingTrack ? "Update Heritage Sound" : excelMode ? "Batch Upload" : "Upload Heritage Sound"}</h1>{!editingTrack && <button className="bg-orange-100 px-6 py-2 rounded-xl text-sm font-bold border border-orange-200" onClick={() => setExcelMode(!excelMode)}>{excelMode ? "Back" : "Upload Excel"}</button>}</div>
      <div className="w-full bg-white p-6 rounded-b-2xl shadow-md border-x border-b border-orange-50">
        {excelMode ? (
          <>
            <div className="mb-6 p-4 border-2 border-dashed border-orange-100 rounded-xl bg-orange-50/30"><label className="block text-xs font-bold text-gray-500 mb-2">Select Excel File</label><input type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { const d = XLSX.utils.sheet_to_json(XLSX.read((ev.target as any).result, { type: "array" }).Sheets[XLSX.read((ev.target as any).result, { type: "array" }).SheetNames[0]], { defval: "" }); setExcelData(d); setRowFiles({}); setExcelErrors({}); }; r.readAsArrayBuffer(f); }} className={fileInputClass('')} /></div>
            {excelData.length > 0 && (
              <div className="border rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto max-h-[500px]"><table className="w-full text-left"><thead className="sticky top-0 bg-gray-100 z-20"><tr>{orderedCols.map(k => <th key={k} className="border p-2 text-[11px] font-black">{toSentenceCase(k)}</th>)}<th className="border p-2 text-[11px] font-black">Audio</th><th className="border p-2 text-[11px] font-black">Cover</th></tr></thead>
                <tbody>{excelData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 text-xs">{orderedCols.map(k => (
                    <td key={k} className={`border p-2 ${excelErrors[`${i}-${k}`] ? 'bg-red-50' : ''}`}>{k === 'country' ? <div className="flex flex-col gap-1"><Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={row.country ? { value: row.country, label: row.country } : null} onChange={(s: any) => { setExcelData(d => d.map((r, idx) => idx === i ? { ...r, country: s?.value || "" } : r)); setExcelErrors(prev => { const n = { ...prev }; delete n[`${i}-country`]; return n; }); }} styles={selectStyles} menuPortalTarget={document.body} {...({ error: !!excelErrors[`${i}-country`] } as any)} />{excelErrors[`${i}-country`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}</div> : <div className="flex flex-col"><input className="border-none bg-transparent outline-none w-full" value={String(row[k] || '')} onChange={(e) => { const v = e.target.value; setExcelData(d => d.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); let err = !v.trim() ? "Required" : (["category", "community", "title", "region", "performer"].includes(k) && !validateChars(v)) ? "Invalid" : ""; setExcelErrors(p => ({ ...p, [`${i}-${k}`]: err })); }} />{excelErrors[`${i}-${k}`] && <span className="text-red-500 text-[9px] font-bold">{excelErrors[`${i}-${k}`]}</span>}</div>}</td>
                  ))}
                  <td className={`border p-1 ${excelErrors[`${i}-sound_track_url`] ? 'bg-red-50' : ''}`}><input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setRowFiles(p => ({ ...p, [`${i}-sound_track_url`]: f })); setExcelErrors(p => { const n = { ...p }; delete n[`${i}-sound_track_url`]; return n; }); } }} className="w-32 text-[10px] cursor-pointer" />{excelErrors[`${i}-sound_track_url`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}</td>
                  <td className={`border p-1 ${excelErrors[`${i}-album_file_url`] ? 'bg-red-50' : ''}`}><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setRowFiles(p => ({ ...p, [`${i}-album_file_url`]: f })); setExcelErrors(p => { const n = { ...p }; delete n[`${i}-album_file_url`]; return n; }); } }} className="w-32 text-[10px] cursor-pointer" />{excelErrors[`${i}-album_file_url`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}</td></tr>
                ))}</tbody></table></div>
                <div className="p-4 flex flex-wrap justify-center gap-3 bg-gray-50 border-t"><button onClick={handleSubmitExcel} disabled={isLoading} className="px-6 py-2 bg-[#E67E22] text-white rounded-lg font-bold text-sm">Upload</button><button onClick={onCancelEdit} className="px-6 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg font-bold text-sm">Cancel</button></div>
              </div>
            )}
          </>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {FORM_FIELDS.filter(f => !["description", "sound_track_url", "album_file_url", "contributor"].includes(f.name)).map(f => (
                <div key={f.name}><label className="block text-xs font-bold text-gray-500 mb-1">{toSentenceCase(f.label)}</label>
                  {f.name === "country" ? <Select ref={(r) => { fieldRefs.current["country"] = r; }} options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={formData.country ? { value: formData.country, label: formData.country } : null} onChange={(s: any) => { setFormData({ ...formData, country: s?.value || "" }); setErrors(p => ({ ...p, country: s?.value ? "" : "Required." })); }} styles={selectStyles} menuPortalTarget={document.body} {...({ error: !!errors.country } as any)} />
                  : <input ref={(r) => { fieldRefs.current[f.name] = r; }} name={f.name} value={formData[f.name] || ""} onChange={(e) => handleFieldChange(e.target.name, e.target.value)} readOnly={f.name === "sound_id" && !!editingTrack} disabled={f.name === "sound_id" && !!editingTrack} className={`w-full p-3 border rounded-xl outline-none text-sm ${(f.name === "sound_id" && editingTrack) ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'} ${errors[f.name] ? 'border-red-500' : 'border-gray-200'}`} />}
                  {errors[f.name] && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors[f.name]}</p>}
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                <textarea name="description" rows={2} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm resize-none min-h-[46px]" />
              </div>
            </div>

            <div className="w-full py-2 border-b border-yellow-400">
              <h2 className="text-[14px] font-medium text-gray-500 text-center first-letter:uppercase">Historical usage of the track</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
              {CULTURAL_FIELDS.map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{f.label}</label>
                  <input 
                    name={f.name} 
                    value={formData[f.name] === "--" ? "" : formData[f.name] || ""} 
                    placeholder=""
                    onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value || "--" })} 
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm bg-white" 
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {["sound_track_url", "album_file_url"].map(n => (
                <div key={n}><label className="block text-xs font-bold text-gray-500 mb-1">{toSentenceCase(n.replace('_url', ''))} {editingTrack && <span className="text-[10px] text-orange-400 italic">(Current if empty)</span>}</label><input type="file" ref={(r) => { fieldRefs.current[n] = r; }} onChange={(e) => { const f = e.target.files?.[0] || null; setFormData({ ...formData, [n]: f }); setErrors(p => ({ ...p, [n]: (!editingTrack && !f) ? "Required." : "" })); }} className={fileInputClass(n)} accept={n === "sound_track_url" ? "audio/*" : "image/*"} />{errors[n] && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors[n]}</p>}</div>
              ))}
            </div>
            
            <div className="pt-4 flex flex-wrap justify-center gap-3"><button type="submit" disabled={isLoading} className="px-8 py-2 bg-[#E67E22] text-white font-bold rounded-lg text-sm">{editingTrack ? "Update" : "Upload"}</button><button type="button" onClick={onCancelEdit} className="px-8 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm">Cancel</button></div>
          </form>
        )}
      </div>
    </div>
  );
};
export default MusicForm;