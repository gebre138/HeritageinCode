import React, { useState, useMemo, useRef } from "react";
import { Track } from "../../types";
import { Activity, Download, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { COLORS } from "../supportives/colors";

const Soundstatistics: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
  const [activeTab, setActiveTab] = useState<"Region" | "Community" | "Category">("Region");
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => ({
    approved: tracks.filter(t => t.isapproved),
    pending: tracks.filter(t => !t.isapproved),
    user: sessionStorage.getItem("userFullName") || "Authorized",
    email: sessionStorage.getItem("userEmail") || "archive@heritage.org"
  }), [tracks]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    tracks.forEach(t => {
      const key = (activeTab === "Region" ? t.country : activeTab === "Community" ? t.community : t.category) || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tracks, activeTab]);

  const downloadReport = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reportRef.current!, { scale: 2, useCORS: true, width: 1000, backgroundColor: COLORS.bgWhite });
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`Heritage_Report.pdf`);
      } finally { setIsExporting(false); }
    }, 500);
  };

  const TableHeader = () => (
    <thead>
      <tr className="text-[10px] uppercase font-bold" style={{ color: COLORS.textGray, backgroundColor: COLORS.bgTableHead }}>
        {["Title", "Performer", "Category", "Country", "Community", "Region"].map(h => <th key={h} className="py-3 px-2 border-b">{h}</th>)}
      </tr>
    </thead>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 animate-in fade-in duration-700">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: COLORS.primaryColor }}><Activity size={18} /></div>
          <p className="text-sm font-bold" style={{ color: COLORS.textDark }}>Heritage Analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={downloadReport} disabled={isExporting} className="flex items-center gap-2 px-5 py-3 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50" style={{ backgroundColor: COLORS.primaryColor }}>
            <Download size={16} /> {isExporting ? "Processing..." : "Download Report"}
          </button>
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as any)} className="border py-3 px-5 rounded-xl text-xs font-medium" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight, color: COLORS.textDark }}>
            {["Region", "Community", "Category"].map(v => <option key={v} value={v}>Group by {v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
        <div className="h-[350px]">
          <h3 className="text-xs font-bold uppercase mb-4 tracking-widest" style={{ color: COLORS.textMuted }}>Distribution</h3>
          <ResponsiveContainer><PieChart><Pie data={chartData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{chartData.map((_, j) => <Cell key={j} fill={COLORS.chartColors[j % COLORS.chartColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </div>
        <div className="h-[350px]">
          <h3 className="text-xs font-bold uppercase mb-4 tracking-widest" style={{ color: COLORS.textMuted }}>Volume</h3>
          <ResponsiveContainer><BarChart data={chartData} layout="vertical" margin={{ left: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: COLORS.textGray }} width={80} axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={15}>{chartData.map((_, j) => <Cell key={j} fill={COLORS.chartColors[j % COLORS.chartColors.length]} />)}</Bar><Tooltip cursor={{fill: 'transparent'}} /></BarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        <div ref={reportRef} className="w-[1000px] p-12" style={{ backgroundColor: COLORS.bgWhite, color: COLORS.primaryBlack }}>
          <div className="pb-4 mb-8 text-center" style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}><h1 className="text-2xl font-bold uppercase tracking-widest">Heritage in Code</h1></div>
          <div className="space-y-12">
            <section>
              <h2 className="text-[11px] font-bold uppercase mb-4 flex items-center gap-2" style={{ color: COLORS.textMuted }}><CheckCircle2 size={14}/> Approved Tracks</h2>
              <table className="w-full text-left" style={{ borderTop: `1px solid ${COLORS.borderMain}` }}>
                <TableHeader />
                <tbody className="text-[10px]">
                  {stats.approved.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.bgWarm}` }}>
                      <td className="py-2 px-2 font-bold">{t.title}</td><td>{t.performer}</td><td>{t.category}</td><td>{t.country}</td><td>{t.community}</td><td>{t.region || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section>
              <h2 className="text-[11px] font-bold uppercase mb-4 flex items-center gap-2" style={{ color: COLORS.textMuted }}><Clock size={14}/> Pending Tracks</h2>
              <table className="w-full text-left" style={{ borderTop: `1px solid ${COLORS.borderMain}` }}>
                <TableHeader />
                <tbody className="text-[10px]">
                  {stats.pending.length ? stats.pending.map((t, i) => (
                    <tr key={i} className="italic" style={{ borderBottom: `1px solid ${COLORS.bgWarm}`, color: COLORS.textLight }}>
                      <td className="py-2 px-2">{t.title}</td><td>{t.performer || 'Archive'}</td><td>{t.category}</td><td>{t.country || "N/A"}</td><td>{t.community || "N/A"}</td><td>{t.region || "N/A"}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="py-6 text-center" style={{ color: COLORS.textMuted }}>No pending records.</td></tr>}
                </tbody>
              </table>
            </section>
            <div className="grid grid-cols-2 gap-10 pt-10 h-[280px]" style={{ borderTop: `1px solid ${COLORS.borderMain}` }}>
               <div className="flex flex-col items-center"><p className="text-[9px] font-bold uppercase mb-4" style={{ color: COLORS.textMuted }}>Distribution</p><ResponsiveContainer><PieChart><Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={75}>{chartData.map((_, j) => <Cell key={j} fill={COLORS.chartColors[j % COLORS.chartColors.length]} />)}</Pie></PieChart></ResponsiveContainer></div>
               <div className="flex flex-col items-center"><p className="text-[9px] font-bold uppercase mb-4" style={{ color: COLORS.textMuted }}>Volume</p><ResponsiveContainer><BarChart data={chartData} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{fontSize: 9, fill: COLORS.textGray}} width={120} axisLine={false} tickLine={false} /><Bar dataKey="value" barSize={12}>{chartData.map((_, j) => <Cell key={j} fill={COLORS.chartColors[j % COLORS.chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
            <div className="pt-10 flex justify-between items-end" style={{ borderTop: `1px solid ${COLORS.borderLight}` }}>
              <div><p className="text-[9px] font-bold uppercase mb-2" style={{ color: COLORS.textMuted }}>Downloader</p><p className="text-lg font-bold leading-none mb-1">{stats.user}</p><p className="text-xs font-medium" style={{ color: COLORS.textGray }}>{stats.email}</p><p className="text-[9px] mt-4 italic" style={{ color: COLORS.textMuted }}>Date: {new Date().toLocaleDateString()}</p></div>
              <div className="text-right"><div className="w-40 mb-2 ml-auto" style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}></div><p className="text-[9px] font-bold uppercase" style={{ color: COLORS.textMuted }}>Authorized Signature</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Soundstatistics;