import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";

interface UserAccount { 
  id: number; 
  name: string; 
  email: string; 
  country: string; 
  role: "superadmin" | "admin" | "user" | "deactivated"; 
  email_verified: boolean;
  last_active?: string; 
}

const AccountsList: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [modal, setModal] = useState({ show: false, id: 0, name: "", role: "" });

  const API = process.env.REACT_APP_API_URL || "";
  const token = sessionStorage.getItem("userToken");
  const currentUserRole = sessionStorage.getItem("role");

  const getStatusColor = (lastActive?: string) => {
    if (!lastActive) return null;
    const diffInMinutes = (new Date().getTime() - new Date(lastActive).getTime()) / 60000;
    if (diffInMinutes < 2) return "bg-green-500"; 
    if (diffInMinutes < 10) return "bg-yellow-400";
    return null;
  };

  const formatRelativeTime = (lastActive?: string) => {
    if (!lastActive) return "Never seen";
    const now = new Date();
    const lastSeen = new Date(lastActive);
    const diffInSec = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    if (diffInSec < 60) return "Just now";
    const min = Math.floor(diffInSec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const liveCount = users.filter(u => {
    if (!u.last_active) return false;
    return (new Date().getTime() - new Date(u.last_active).getTime()) / 60000 < 2;
  }).length;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data || []);
    } catch (e) { console.error("Fetch failed", e); } finally { setLoading(false); }
  }, [API, token]);

  const executeUpdate = async () => {
    setIsProcessing(true); 
    try {
      await axios.patch(`${API}/api/auth/users/${modal.id}/role`, { role: modal.role }, { headers: { Authorization: `Bearer ${token}` } });
      if (sessionStorage.getItem("userId") === String(modal.id) && modal.role !== "superadmin") {
        alert("Permissions changed. Logging out.");
        sessionStorage.clear();
        return window.location.href = "/";
      }
      setUsers(prev => prev.map(u => u.id === modal.id ? { ...u, role: modal.role as any } : u));
      setModal({ show: false, id: 0, name: "", role: "" });
    } catch { alert("Update failed."); } finally { setIsProcessing(false); }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
        fetchUsers();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  if (loading) return <div className="text-center py-10 text-[10px] tracking-widest" style={{ color: COLORS.textMuted }}>Loading Aounts...</div>;

  const isSuperAdmin = currentUserRole === "superadmin";

  return (
    <div className="rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderLight }}>
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="font-bold text-sm mb-1" style={{ color: COLORS.textDark }}>Change permission</h4>
            <p className="text-[10px] mb-6 tracking-tight" style={{ color: COLORS.textMuted }}>Change <span className="font-bold" style={{ color: COLORS.textDark }}>{modal.name.toLowerCase()}</span> to <span className="font-bold" style={{ color: COLORS.primaryColor }}>set as {modal.role.toLowerCase()}</span></p>
            <div className="flex gap-3">
              <button onClick={executeUpdate} disabled={isProcessing} className="flex-[2] py-2.5 rounded-xl text-[9px] border shadow-sm flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: COLORS.lightColor, color: COLORS.primaryColor, borderColor: COLORS.borderOrange }}>
                {isProcessing ? <><div className="h-3 w-3 border-2 rounded-full animate-spin" style={{ borderColor: `${COLORS.primaryColor}4D`, borderTopColor: COLORS.primaryColor }} /><span className="font-medium">Processing</span></> : <span className="font-medium">Confirm change</span>}
              </button>
              <button onClick={() => setModal({ ...modal, show: false })} className="flex-1 text-[9px] font-bold" style={{ color: COLORS.textMuted }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b flex justify-between items-center" style={{ backgroundColor: COLORS.bgWhite, borderColor: COLORS.borderMain }}>
        <h3 className="text-sm font-bold" style={{ color: COLORS.textDark }}>Account Management</h3>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-orange-50/20" style={{ borderColor: COLORS.borderLight }}>
          <span className="text-[10px] font-bold text-amber-500">Live:</span>
          <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
          <span className="text-[10px] font-black text-green-600">{liveCount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] border-b" style={{ color: COLORS.textMuted, backgroundColor: COLORS.bgPage, borderColor: COLORS.borderLight }}>
              {["Name", "Email", "Country", "Status", "Role", ...(isSuperAdmin ? ["Actions"] : [])].map(h => (
                <th key={h} className={`px-6 py-3 font-bold tracking-tight ${h === "Status" || h === "Actions" ? "text-center" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: COLORS.borderLight }}>
            {users.map((u, index) => (
              <tr key={u.id} className={`transition-all duration-200 hover:bg-orange-50/30`} style={{ backgroundColor: index % 2 === 0 ? COLORS.bgWhite : COLORS.bgPage }}>
                <td className="px-6 py-3 text-[11px]">
                   <div className="flex items-center gap-2 relative group">
                    <span title={!getStatusColor(u.last_active) ? formatRelativeTime(u.last_active) : undefined} className="cursor-default" style={{ color: COLORS.textColor }}>{u.name}</span>
                    {getStatusColor(u.last_active) && <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(u.last_active)}`}></span>}
                  </div>
                </td>
                <td className="px-6 py-3 text-[11px]" style={{ color: COLORS.textLight }}>{u.email}</td>
                <td className="px-6 py-3 text-[11px]" style={{ color: COLORS.textLight }}>{u.country}</td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight border" style={{ backgroundColor: u.email_verified ? COLORS.successBg : COLORS.dangerBg, color: u.email_verified ? COLORS.successText : COLORS.dangerText, borderColor: u.email_verified ? COLORS.successBorder : COLORS.dangerBorder }}>
                    {u.email_verified ? "verified" : "pending"}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] font-bold lowercase`} style={{ color: u.role === 'superadmin' ? '#A855F7' : u.role === 'admin' ? COLORS.primaryColor : '#3B82F6' }}>{u.role}</span>
                </td>
                {isSuperAdmin && (
                  <td className="px-6 py-3 text-center">
                    <select value={u.role} onChange={e => setModal({ show: true, id: u.id, name: u.name, role: e.target.value })} className="text-[10px] border px-2 py-1 rounded-lg bg-white/50 outline-none transition-all hover:border-orange-200" style={{ borderColor: COLORS.borderLight }}>
                      <option value="user">Set as user</option>
                      <option value="admin">Set as admin</option>
                      <option value="superadmin">Set as superadmin</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountsList;