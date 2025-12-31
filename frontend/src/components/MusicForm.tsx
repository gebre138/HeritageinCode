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

interface CheckStatus {
  status: string;
  error: string;
}

interface CheckListState {
  lengthCheck: CheckStatus;
  audibilityCheck: CheckStatus;
  fingerprintCheck: CheckStatus;
  syncCheck: CheckStatus;
}

const REQUIRED_COLUMNS = ["sound_id", "title", "performer", "category", "community", "region", "context", "country"];
const API_URL = process.env.REACT_APP_API_URL;

const toSentenceCase = (str: string) => str ? str.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()) : "";

const validateAudioMetrics = (file: File): Promise<{ duration: number; volume: number }> => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        let sumSquares = 0;
        for (let i = 0; i < rawData.length; i++) sumSquares += rawData[i] * rawData[i];
        resolve({ duration: audioBuffer.duration, volume: Math.sqrt(sumSquares / rawData.length) * 100 });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

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

  const role = sessionStorage.getItem("role");
  const token = sessionStorage.getItem("userToken");
  const userEmail = sessionStorage.getItem("userEmail") || "";

  const selectStyles = {
    control: (b: any, state: any) => ({
      ...b, minHeight: '32px', fontSize: '12px', minWidth: '150px',
      borderColor: state.selectProps.error ? '#ef4444' : b.borderColor,
      '&:hover': { borderColor: state.selectProps.error ? '#ef4444' : b.borderColor }
    }),
    option: (b: any) => ({ ...b, fontSize: '12px' }),
    singleValue: (b: any) => ({ ...b, fontSize: '12px' }),
    menuPortal: (b: any) => ({ ...b, zIndex: 9999 })
  };

  useEffect(() => {
    const data: Record<string, any> = {};
    FORM_FIELDS.forEach(f => {
      if (f.type === "file") { data[f.name] = null; }
      else { data[f.name] = editingTrack?.[f.name as keyof Track] || ""; }
    });
    setFormData(data);
    setErrors({});
    setExcelErrors({});
    setShowChecklist(false);
    setFailedSummary([]);
    setSuccessSummary([]);
    setExcelData([]);
    setRowFiles({});
  }, [editingTrack, excelMode]);

  const showPopup = (msg: string, type: "success" | "error" = "success") => {
    setPopup({ msg, type });
    setTimeout(() => setPopup(null), 5000);
  };

  const getStatusIcon = (status: string) => {
    if (status === "loading") return <div className="animate-spin h-3.5 w-3.5 border-2 border-orange-400 border-t-transparent rounded-full"></div>;
    if (status === "pass") return <span className="text-green-500 font-medium text-sm">✓</span>;
    if (status === "fail") return <span className="text-red-400 font-medium text-sm">✕</span>;
    return <span className="text-gray-200 text-sm">○</span>;
  };

  const validateChars = (val: string) => /^[a-zA-Z_\s,():']*$/.test(val);

  const handleFieldChange = (name: string, value: string) => {
    const restrictedFields = ["category", "community", "title", "region", "performer"];
    setFormData(prev => ({ ...prev, [name]: value }));

    let error = "";
    if (value.trim() === "" && name !== "description" && name !== "contributor") {
      error = `${toSentenceCase(name)} is required.`;
    } else if (restrictedFields.includes(name) && !validateChars(value)) {
      error = "Only characters, underscore, space, comma, brackets, colon and apostrophe allowed.";
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const processSingleSubmission = async (data: any, audioFile: any, coverFile: any, index?: number, isEdit: boolean = false) => {
    setCurrentTrackIndex(index !== undefined ? index + 1 : null);
    setCheckList({
      lengthCheck: { status: "loading", error: "" },
      audibilityCheck: { status: "pending", error: "" },
      fingerprintCheck: { status: "pending", error: "" },
      syncCheck: { status: "pending", error: "" }
    });
    setShowChecklist(true);
    setIsLoading(true);
    const pause = () => new Promise(res => setTimeout(res, 600));

    try {
      if (!isEdit) {
        try {
          const response = await axios.get(`${API_URL}/api/tracks/${data.sound_id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (response.status === 200) throw new Error("Sound ID already registered.");
        } catch (err: any) {
          if (err.response?.status !== 404 && err.message !== "Sound ID already registered.") throw new Error("Validation check failed");
          if (err.message === "Sound ID already registered.") throw err;
        }
      }

      if (audioFile instanceof File) {
        const stats = await validateAudioMetrics(audioFile);
        if (stats.duration < 10 || stats.duration > 120) {
          const msg = stats.duration < 10 ? "Too short (<10s)" : "Too long (>2min)";
          setCheckList(p => ({ ...p, lengthCheck: { status: "fail", error: msg } }));
          throw new Error(msg);
        }
        setCheckList(p => ({ ...p, lengthCheck: { status: "pass", error: "" } }));
        await pause();
      } else {
        setCheckList(p => ({ ...p, lengthCheck: { status: "pass", error: "" } }));
      }

      setCheckList(p => ({ ...p, audibilityCheck: { status: "loading", error: "" } }));
      const apiData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k !== "sound_track_url" && k !== "album_file_url" && k !== "contributor") {
          apiData.append(k, typeof v === "string" ? v : String(v));
        }
      });
      apiData.append("contributor", userEmail);
      if (audioFile instanceof File) apiData.append("sound_track_url", audioFile);
      if (coverFile instanceof File) apiData.append("album_file_url", coverFile);
      if (role === "admin" || role === "superadmin") apiData.append("isapproved", "true");

      const config = { headers: { "Content-Type": "multipart/form-data", "Authorization": `Bearer ${token}` } };
      if (isEdit && editingTrack) {
        await axios.put(`${API_URL}/api/tracks/${editingTrack.sound_id}`, apiData, config);
      } else {
        await axios.post(`${API_URL}/api/tracks`, apiData, config);
      }

      setCheckList(p => ({ ...p, audibilityCheck: { status: "pass", error: "" }, fingerprintCheck: { status: "loading", error: "" } }));
      await pause();
      setCheckList(p => ({ ...p, fingerprintCheck: { status: "pass", error: "" }, syncCheck: { status: "loading", error: "" } }));
      await pause();
      setCheckList(p => ({ ...p, syncCheck: { status: "pass", error: "" } }));
      await pause();
      return { success: true };
    } catch (err: any) {
      const errorMsg = String(err.response?.data?.error || err.message);
      const similarTrack = err.response?.data?.similarTrack || null;
      setCheckList(p => {
        if (errorMsg.includes("Audibility") || errorMsg.includes("quiet") || errorMsg.includes("Loudness")) return { ...p, audibilityCheck: { status: "fail", error: errorMsg } };
        if (errorMsg.includes("Duplicate") || errorMsg.includes("Detected") || errorMsg.includes("Similarity")) return { ...p, audibilityCheck: { status: "pass", error: "" }, fingerprintCheck: { status: "fail", error: errorMsg } };
        if (p.lengthCheck.status === "loading") return { ...p, lengthCheck: { status: "fail", error: errorMsg } };
        if (p.audibilityCheck.status === "loading") return { ...p, audibilityCheck: { status: "fail", error: errorMsg } };
        return { ...p, syncCheck: { status: "fail", error: errorMsg } };
      });
      return { success: false, error: errorMsg, similarTrack };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailedSummary([]);
    setSuccessSummary([]);
    const newErrors: Record<string, string> = {};
    const restrictedFields = ["category", "community", "title", "region", "performer"];

    let firstErrorField = "";

    for (let f of FORM_FIELDS) {
      const val = String(formData[f.name] || "");
      const isEmpty = (!editingTrack && f.type === "file" && !formData[f.name]) || (f.name !== "description" && f.name !== "contributor" && f.type !== "file" && !val);
      if (isEmpty) {
        newErrors[f.name] = `${toSentenceCase(f.label)} is required.`;
        if (!firstErrorField) firstErrorField = f.name;
      } else if (restrictedFields.includes(f.name) && !validateChars(val)) {
        newErrors[f.name] = "Only characters, underscore, space, comma, brackets, colon and apostrophe allowed.";
        if (!firstErrorField) firstErrorField = f.name;
      }
    }

    if (!formData.country) {
      newErrors.country = "Country is required.";
      if (!firstErrorField) firstErrorField = "country";
    }
    if (!editingTrack && !formData.sound_track_url) {
      newErrors.sound_track_url = "Audio file is required.";
      if (!firstErrorField) firstErrorField = "sound_track_url";
    }
    if (!editingTrack && !formData.album_file_url) {
      newErrors.album_file_url = "Cover image is required.";
      if (!firstErrorField) firstErrorField = "album_file_url";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (firstErrorField && fieldRefs.current[firstErrorField]) {
        fieldRefs.current[firstErrorField].focus();
      }
      return;
    }

    setErrors({});
    const res = await processSingleSubmission(formData, formData.sound_track_url, formData.album_file_url, undefined, !!editingTrack);
    if (res.success) { setSuccessSummary([formData.sound_id]); }
    else { setFailedSummary([{ id: formData.sound_id, reason: res.error || "Failed", similarTrack: res.similarTrack }]); }
  };

  const handleSubmitExcel = async () => {
    if (!excelData.length) return;
    setExcelErrors({});
    setFailedSummary([]);
    setSuccessSummary([]);
    const newExcelErrors: Record<string, string> = {};
    const restrictedFields = ["category", "community", "title", "region", "performer"];
    let preValidationFail = false;

    for (let i = 0; i < excelData.length; i++) {
      for (const col of REQUIRED_COLUMNS) {
        const val = String(excelData[i][col] || "").trim();
        if (!val) {
          newExcelErrors[`${i}-${col}`] = "Required";
          preValidationFail = true;
        } else if (restrictedFields.includes(col) && !validateChars(val)) {
          newExcelErrors[`${i}-${col}`] = "Invalid chars";
          preValidationFail = true;
        }
      }
      if (!rowFiles[`${i}-sound_track_url`]) { newExcelErrors[`${i}-sound_track_url`] = "Required"; preValidationFail = true; }
      if (!rowFiles[`${i}-album_file_url`]) { newExcelErrors[`${i}-album_file_url`] = "Required"; preValidationFail = true; }
    }
    if (preValidationFail) { setExcelErrors(newExcelErrors); showPopup("Validation errors in table", "error"); return; }
    for (let i = 0; i < excelData.length; i++) {
      const res = await processSingleSubmission(excelData[i], rowFiles[`${i}-sound_track_url`], rowFiles[`${i}-album_file_url`], i);
      if (res.success) { setSuccessSummary(prev => [...prev, excelData[i].sound_id || `Row ${i + 1}`]); }
      else { setFailedSummary(prev => [...prev, { id: excelData[i].sound_id || `Row ${i + 1}`, reason: res.error || "Failed", similarTrack: res.similarTrack, index: i + 1 }]); }
    }
    setIsLoading(false);
  };

  const orderedCols = useMemo(() => {
    if (!excelData.length) return [];
    const keys = Object.keys(excelData[0]);
    const fixed = ["sound_id", "title", "performer", "category"];
    return [...fixed, 'country', ...keys.filter(k => !fixed.includes(k) && k !== 'country')];
  }, [excelData]);

  const fileInputClass = (name: string) => `block w-fit max-w-[280px] text-[11px] text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer ${errors[name] ? 'border border-red-500 rounded-md' : ''}`;

  return (
    <div className="w-full relative">
      {popup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[120] animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-2 rounded-full shadow-lg text-white text-xs font-medium ${popup.type === "error" ? "bg-red-500" : "bg-green-600"}`}>
            {popup.msg}
          </div>
        </div>
      )}

      {showChecklist && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100] backdrop-blur-[2px] p-2 sm:p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-sm sm:max-w-md border border-gray-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="text-center py-4 sm:py-6 w-full bg-[#E67E22]">
              <h3 className="text-white text-base sm:text-lg font-bold px-2">
                {isLoading ? <>Processing Track {currentTrackIndex}</> : <>Upload Summary</>}
              </h3>
            </div>
            <div className="space-y-4 overflow-y-auto p-4 sm:p-8 custom-scrollbar flex-grow bg-white">
              {!isLoading && (
                <div className="w-full mb-2 sm:mb-4 font-semibold">
                  {successSummary.length > 0 && <div className="w-full text-green-700 text-[13px] sm:text-[14px]">{excelMode ? `Tracks uploaded: ${successSummary.length}` : 'Track uploaded'}</div>}
                  {failedSummary.length > 0 && <div className="w-full text-red-700 text-[13px] sm:text-[14px]">{excelMode ? `Failed to upload tracks: ${failedSummary.length}` : 'The track could not be uploaded'}</div>}
                  {successSummary.length > 0 && role === "user" && (
                    <div className="mt-4">
                      <p className="text-green-800 text-[11px] leading-relaxed font-bold">
                        Thank you for uploading the tracks will be avilable public after review if comply with the rule
                      </p>
                    </div>
                  )}
                </div>
              )}
              {isLoading ? (
                <div className="space-y-4">
                  {[
                    { label: "Audio Length", data: checkList.lengthCheck },
                    { label: "Audibility Check", data: checkList.audibilityCheck },
                    { label: "Audio Existence", data: checkList.fingerprintCheck },
                    { label: "Final Submission", data: checkList.syncCheck },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <span className={`text-[12px] ${s.data.status === 'loading' ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>{s.label}</span>
                      {getStatusIcon(s.data.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {successSummary.length > 0 && successSummary.map((id, i) => (
                    <div key={i} className="bg-green-50 p-2 sm:p-3 rounded-xl border border-green-100 flex items-center gap-2 text-[11px] sm:text-[12px] text-green-700 font-medium">
                      <span className="font-bold text-base">✓</span> Track ID: {id}
                    </div>
                  ))}
                  {failedSummary.length > 0 && failedSummary.map((f, idx) => (
                    <div key={idx} className="bg-red-50 p-2 sm:p-3 rounded-xl border border-red-100 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-[11px] sm:text-[12px] text-red-700">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="font-bold text-base">✕</span>
                          <span>{f.index ? `Track ${f.index}, ` : ""}ID: {f.id}</span>
                        </div>
                        <span className="italic opacity-90 text-[10px] bg-red-100 px-2 py-0.5 rounded-full mt-1 sm:mt-0 sm:ml-2">{f.reason}</span>
                      </div>
                      {f.similarTrack && (
                        <div className="mt-1 pt-2 border-t border-red-200">
                          <div className="flex items-center gap-3 w-full">
                            <img src={f.similarTrack.album_file_url} alt="Similar" className="w-10 h-10 rounded-full object-cover bg-white shadow-sm flex-shrink-0" onError={(e) => e.currentTarget.src = "/placeholder-image.png"} />
                            <div className="flex flex-col min-w-[70px] max-w-[90px] overflow-hidden">
                              <p className="text-[10px] sm:text-[11px] font-bold text-gray-800 leading-tight truncate">{f.similarTrack.title}</p>
                              <p className="text-[9px] text-gray-600 truncate">{f.similarTrack.performer}</p>
                            </div>
                            {f.similarTrack.sound_track_url && (
                              <div className="flex-grow">
                                <audio controls controlsList="nodownload" className="w-full h-7 scale-90 origin-right" crossOrigin="anonymous" preload="auto" src={f.similarTrack.sound_track_url} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isLoading && (
              <div className="pb-6 sm:pb-8 flex justify-center bg-white px-4">
                <button onClick={() => { setShowChecklist(false); if (successSummary.length > 0) { editingTrack ? onTrackUpdated?.() : onTrackAdded?.(); } }} className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-xl shadow-md transition-all hover:brightness-105 active:scale-[0.98] text-white bg-orange-500 tracking-wide whitespace-nowrap">Close Summary</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full bg-[#FFFBEB] text-[#E67E22] p-5 rounded-t-2xl border border-orange-100 flex justify-between items-center">
        <h1 className="text-xl font-extrabold">{editingTrack ? "Update Heritage Sound" : excelMode ? "Batch Upload" : "Upload Heritage Sound"}</h1>
        {!editingTrack && <button className="bg-orange-100 px-6 py-2 rounded-xl text-sm font-bold border border-orange-200" onClick={() => setExcelMode(!excelMode)}>{excelMode ? "Back" : "Upload Excel"}</button>}
      </div>

      <div className="w-full bg-white p-6 rounded-b-2xl shadow-md border-x border-b border-orange-50">
        {excelMode ? (
          <>
            <div className="mb-6 p-4 border-2 border-dashed border-orange-100 rounded-xl bg-orange-50/30">
              <label className="block text-xs font-bold text-gray-500 mb-2">Select Excel File</label>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onload = (ev) => {
                  const data = XLSX.utils.sheet_to_json(XLSX.read((ev.target as any).result, { type: "array" }).Sheets[XLSX.read((ev.target as any).result, { type: "array" }).SheetNames[0]], { defval: "" });
                  setExcelData(data);
                  setRowFiles({});
                  setExcelErrors({});
                };
                r.readAsArrayBuffer(f);
              }} className={fileInputClass('')} />
            </div>
            {excelData.length > 0 && (
              <div className="border rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-100 z-20">
                      <tr>{orderedCols.map(k => <th key={k} className="border p-2 text-[11px] font-black">{toSentenceCase(k)}</th>)}<th className="border p-2 text-[11px] font-black">Audio</th><th className="border p-2 text-[11px] font-black">Cover</th></tr>
                    </thead>
                    <tbody>
                      {excelData.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 text-xs">
                          {orderedCols.map(k => (
                            <td key={k} className={`border p-2 ${excelErrors[`${i}-${k}`] ? 'bg-red-50' : ''}`}>
                              {k === 'country' ? (
                                <div className="flex flex-col gap-1">
                                  <Select options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={row.country ? { value: row.country, label: row.country } : null} onChange={(s: any) => { const val = s?.value || ""; setExcelData(d => d.map((r, idx) => idx === i ? { ...r, country: val } : r)); setExcelErrors(prev => { const n = { ...prev }; delete n[`${i}-country`]; return n; }); }} styles={selectStyles} menuPortalTarget={document.body} {...({ error: !!excelErrors[`${i}-country`] } as any)} />
                                  {excelErrors[`${i}-country`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <input className="border-none bg-transparent outline-none w-full" value={String(row[k] || '')} onChange={(e) => { const val = e.target.value; const restrictedFields = ["category", "community", "title", "region", "performer"]; setExcelData(d => d.map((r, idx) => idx === i ? { ...r, [k]: val } : r)); let err = ""; if (!val.trim()) err = "Required"; else if (restrictedFields.includes(k) && !validateChars(val)) err = "Invalid chars"; setExcelErrors(prev => ({ ...prev, [`${i}-${k}`]: err })); }} />
                                  {excelErrors[`${i}-${k}`] && <span className="text-red-500 text-[9px] font-bold">{excelErrors[`${i}-${k}`]}</span>}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className={`border p-1 ${excelErrors[`${i}-sound_track_url`] ? 'bg-red-50' : ''}`}>
                            <div className="flex flex-col">
                              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setRowFiles(p => ({ ...p, [`${i}-sound_track_url`]: f })); setExcelErrors(prev => { const n = { ...prev }; delete n[`${i}-sound_track_url`]; return n; }); } }} className="w-32 text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700 cursor-pointer" />
                              {excelErrors[`${i}-sound_track_url`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}
                            </div>
                          </td>
                          <td className={`border p-1 ${excelErrors[`${i}-album_file_url`] ? 'bg-red-50' : ''}`}>
                            <div className="flex flex-col">
                              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setRowFiles(p => ({ ...p, [`${i}-album_file_url`]: f })); setExcelErrors(prev => { const n = { ...prev }; delete n[`${i}-album_file_url`]; return n; }); } }} className="w-32 text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700 cursor-pointer" />
                              {excelErrors[`${i}-album_file_url`] && <span className="text-red-500 text-[9px] font-bold">Required</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 flex flex-wrap justify-center items-center gap-3 bg-gray-50 border-t">
                  <button onClick={handleSubmitExcel} disabled={isLoading} className="px-6 py-2 bg-[#E67E22] text-white rounded-lg font-bold text-sm">Upload</button>
                  <button onClick={onCancelEdit} className="px-6 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg font-bold text-sm">Cancel</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FORM_FIELDS.filter(f => !["description", "sound_track_url", "album_file_url", "contributor"].includes(f.name)).map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{toSentenceCase(f.label)}</label>
                  {f.name === "country" ? (
                    <Select ref={(r) => { fieldRefs.current["country"] = r; }} options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))} value={formData.country ? { value: formData.country, label: formData.country } : null} onChange={(s: any) => { const val = s?.value || ""; setFormData({ ...formData, country: val }); setErrors(prev => ({ ...prev, country: val ? "" : "Country is required." })); }} styles={selectStyles} menuPortalTarget={document.body} {...({ error: !!errors.country } as any)} />
                  ) : (
                    <input ref={(r) => { fieldRefs.current[f.name] = r; }} name={f.name} value={formData[f.name] || ""} onChange={(e) => handleFieldChange(e.target.name, e.target.value)} readOnly={f.name === "sound_id" && !!editingTrack} disabled={f.name === "sound_id" && !!editingTrack} className={`w-full p-3 border rounded-xl outline-none text-sm ${(f.name === "sound_id" && editingTrack) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'} ${errors[f.name] ? 'border-red-500' : 'border-gray-200'}`} />
                  )}
                  {errors[f.name] && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors[f.name]}</p>}
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
              <textarea name="description" rows={3} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white items-start">
              {["sound_track_url", "album_file_url"].map(n => (
                <div key={n} className="w-fit">
                  <label className="block text-xs font-bold text-gray-500 mb-1">{toSentenceCase(n.replace('_url', ''))} {editingTrack && <span className="text-[10px] text-orange-400 italic">(Current if empty)</span>}</label>
                  <input ref={(r) => { fieldRefs.current[n] = r; }} type="file" onChange={(e) => { const file = e.target.files?.[0] || null; setFormData({ ...formData, [n]: file }); setErrors(prev => ({ ...prev, [n]: (!editingTrack && !file) ? "File is required." : "" })); }} className={fileInputClass(n)} accept={n === "sound_track_url" ? "audio/*" : "image/*"} />
                  {errors[n] && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors[n]}</p>}
                </div>
              ))}
            </div>
            <div className="pt-4 flex flex-wrap justify-center items-center gap-3">
              <button type="submit" disabled={isLoading} className="px-8 py-2 bg-[#E67E22] text-white font-bold rounded-lg text-sm">{editingTrack ? "Update" : "Upload"}</button>
              <button type="button" onClick={onCancelEdit} className="px-8 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MusicForm;