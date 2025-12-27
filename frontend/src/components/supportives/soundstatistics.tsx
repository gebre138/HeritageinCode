import React, { useState, useMemo, useRef } from "react";
import { Track } from "../../types";
import { ChevronDown, Activity, BarChart3, PieChart as PieIcon, Download, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const VIBRANT = ["#E67E22", "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#1ABC9C", "#E74C3C", "#34495E", "#FF6B6B", "#483D8B", "#20B2AA", "#D2691E"];

const Soundstatistics: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
  const [activeTab, setActiveTab] = useState<"Region" | "Community" | "Category">("Region");
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentUserName = sessionStorage.getItem("userFullName") || sessionStorage.getItem("userName") || "Authorized";
  const currentUserEmail = sessionStorage.getItem("userEmail") || "archive@heritage.org";

  const approvedTracks = useMemo(() => tracks.filter(t => t.isapproved), [tracks]);
  const pendingTracks = useMemo(() => tracks.filter(t => !t.isapproved), [tracks]);

  const datagroups = useMemo(() => {
    const groups: Record<string, Record<string, number>> = { Region: {}, Community: {}, Category: {} };
    tracks.forEach((t) => {
      if (t.country) groups.Region[t.country] = (groups.Region[t.country] || 0) + 1;
      if (t.community) groups.Community[t.community] = (groups.Community[t.community] || 0) + 1;
      if (t.category) groups.Category[t.category] = (groups.Category[t.category] || 0) + 1;
    });
    return groups;
  }, [tracks]);

  const chartData = useMemo(() => 
    Object.entries(datagroups[activeTab])
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value), 
  [datagroups, activeTab]);

  const downloadReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reportRef.current!, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          width: 1000, 
          windowWidth: 1000
        });
        
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Heritage_In_Code_Detailed_Report.pdf`);
      } catch (error) {
        console.error(error);
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 animate-in fade-in duration-700">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white"><Activity size={18} /></div>
          <div><p className="text-sm font-bold text-gray-900 leading-none">Heritage Analytics</p></div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={downloadReport} disabled={isExporting} className="flex items-center gap-2 px-5 py-3 bg-[#E67E22] text-white rounded-xl text-xs font-bold hover:bg-[#D35400] transition-all">
            <Download size={16} /> {isExporting ? "Processing..." : "Download Report"}
          </button>
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as any)} className="bg-white border border-gray-100 text-gray-900 py-3 px-5 rounded-xl text-xs font-medium cursor-pointer">
            {["Region", "Community", "Category"].map((v) => <option key={v} value={v}>Group by {v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
        <div className="h-[350px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {chartData.map((_, j) => <Cell key={j} fill={VIBRANT[j % VIBRANT.length]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="h-[350px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Volume</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={15}>
                {chartData.map((_, j) => <Cell key={j} fill={VIBRANT[j % VIBRANT.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PDF Export Template */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={reportRef} className="w-[1000px] bg-white p-12 text-gray-900">
          <div className="border-b border-gray-200 pb-4 mb-8 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-widest">Heritage in Code</h1>
          </div>

          <div className="space-y-12">
            {/* Approved Table */}
            <section>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <CheckCircle2 size={14}/> Approved Tracks
              </h2>
              <table className="w-full text-left border-t border-gray-100">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-gray-600 bg-gray-50">
                    <th className="py-3 px-2 border-b">Title</th>
                    <th className="py-3 px-2 border-b">Performer</th>
                    <th className="py-3 px-2 border-b">Category</th>
                    <th className="py-3 px-2 border-b">Country</th>
                    <th className="py-3 px-2 border-b">Community</th>
                    <th className="py-3 px-2 border-b">Region</th>
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {approvedTracks.map((t, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 px-2 font-bold">{t.title}</td>
                      <td className="py-2 px-2">{t.performer}</td>
                      <td className="py-2 px-2">{t.category}</td>
                      <td className="py-2 px-2">{t.country}</td>
                      <td className="py-2 px-2">{t.community}</td>
                      <td className="py-2 px-2">{t.region || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Updated Pending Table with Full Columns */}
            <section>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Clock size={14}/> Pending Tracks
              </h2>
              <table className="w-full text-left border-t border-gray-100">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-gray-600 bg-gray-50">
                    <th className="py-3 px-2 border-b">Title</th>
                    <th className="py-3 px-2 border-b">Contributor</th>
                    <th className="py-3 px-2 border-b">Category</th>
                    <th className="py-3 px-2 border-b">Country</th>
                    <th className="py-3 px-2 border-b">Community</th>
                    <th className="py-3 px-2 border-b">Region</th>
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {pendingTracks.length > 0 ? pendingTracks.map((t, idx) => (
                    <tr key={idx} className="border-b border-gray-50 text-gray-500 italic">
                      <td className="py-2 px-2">{t.title}</td>
                      <td className="py-2 px-2">{t.performer || 'Archive Member'}</td>
                      <td className="py-2 px-2">{t.category}</td>
                      <td className="py-2 px-2">{t.country || "N/A"}</td>
                      <td className="py-2 px-2">{t.community || "N/A"}</td>
                      <td className="py-2 px-2">{t.region || "N/A"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-6 text-center text-gray-300">No pending records in this batch.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Visual Analytics in PDF */}
            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-gray-100 h-[280px]">
               <div className="flex flex-col items-center">
                  <p className="text-[9px] font-bold uppercase text-gray-400 mb-4">Distribution Analysis</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={75}>
                        {chartData.map((_, j) => <Cell key={j} fill={VIBRANT[j % VIBRANT.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex flex-col items-center">
                  <p className="text-[9px] font-bold uppercase text-gray-400 mb-4">Volume Analysis</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 9}} width={120} axisLine={false} tickLine={false} />
                      <Bar dataKey="value" barSize={12}>
                        {chartData.map((_, j) => <Cell key={j} fill={VIBRANT[j % VIBRANT.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Footer */}
            <div className="pt-10 border-t border-gray-200 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Downloader</p>
                <p className="text-lg font-bold text-gray-900 leading-none mb-1">{currentUserName}</p>
                <p className="text-xs font-medium text-gray-500">{currentUserEmail}</p>
                <p className="text-[9px] text-gray-400 mt-4 italic">Generated Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="w-40 border-b border-gray-300 mb-2 ml-auto"></div>
                <p className="text-[9px] font-bold uppercase text-gray-400">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Soundstatistics;