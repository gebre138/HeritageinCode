import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

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
    const now = new Date();
    const lastSeen = new Date(lastActive);
    const diffInMinutes = (now.getTime() - lastSeen.getTime()) / 60000;

    if (diffInMinutes < 2) return "bg-green-500"; 
    if (diffInMinutes < 10) return "bg-yellow-400";
    return null;
  };

  const liveCount = users.filter(u => {
    if (!u.last_active) return false;
    const diff = (new Date().getTime() - new Date(u.last_active).getTime()) / 60000;
    return diff < 2;
  }).length;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data || []);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  const executeUpdate = async () => {
    setIsProcessing(true); 
    try {
      await axios.patch(`${API}/api/auth/users/${modal.id}/role`, 
        { role: modal.role }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (sessionStorage.getItem("userId") === String(modal.id) && modal.role !== "superadmin") {
        alert("Permissions changed. Logging out.");
        sessionStorage.clear();
        return window.location.href = "/";
      }
      setUsers(prev => prev.map(u => u.id === modal.id ? { ...u, role: modal.role as any } : u));
      setModal({ show: false, id: 0, name: "", role: "" });
    } catch { 
      alert("Update failed."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  if (loading) return <div className="text-center py-10 text-gray-400 text-[10px] uppercase tracking-widest">Loading registry...</div>;

  const isSuperAdmin = currentUserRole === "superadmin";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-slate-600">
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="font-bold text-sm mb-1 text-gray-900">Change permission?</h4>
            <p className="text-gray-500 text-[10px] mb-6 tracking-tight">Change <span className="text-gray-900 font-bold">{modal.name.toLowerCase()}</span> to <span className="text-orange-600 font-bold">set as {modal.role.toLowerCase()}</span>?</p>
            <div className="flex gap-3">
              <button 
                onClick={executeUpdate} 
                disabled={isProcessing}
                className="flex-[2] py-2.5 rounded-xl text-[9px] bg-orange-50 text-[#E67E22] border border-orange-100 shadow-sm flex items-center justify-center gap-2 transition-all hover:bg-orange-100"
              >
                {isProcessing ? (
                  <><div className="h-3 w-3 border-2 border-[#E67E22]/30 border-t-[#E67E22] rounded-full animate-spin" /><span className="font-medium">Processing</span></>
                ) : (
                  <span className="font-medium">Confirm change</span>
                )}
              </button>
              <button onClick={() => setModal({ ...modal, show: false })} className="flex-1 text-[9px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-yellow-100/50 bg-gray-50/30 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-800">Account Management</h3>
        <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
          <span className="text-[10px] font-bold text-green-700 tracking-wider">Live: {liveCount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-gray-400 bg-gray-50/50 border-b border-gray-100">
              {["Name", "Email", "Country", "Status", "Role", ...(isSuperAdmin ? ["Actions"] : [])].map(h => (
                <th key={h} className={`px-6 py-3 font-bold tracking-tight ${h === "Status" || h === "Actions" ? "text-center" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u, index) => (
              <tr key={u.id} className={`transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-orange-50/30`}>
                <td className="px-6 py-3 text-[11px]">
                   <div className="flex items-center gap-2">
                    <span>{u.name}</span>
                    {getStatusColor(u.last_active) && (
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(u.last_active)}`}></span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-[11px] text-gray-500">{u.email}</td>
                <td className="px-6 py-3 text-[11px] text-gray-500">{u.country}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight ${u.email_verified ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    {u.email_verified ? "verified" : "pending"}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] font-bold lowercase ${u.role === 'superadmin' ? 'text-purple-500' : u.role === 'admin' ? 'text-orange-500' : 'text-blue-500'}`}>
                    {u.role}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td className="px-6 py-3 text-center">
                    <select value={u.role} onChange={e => setModal({ show: true, id: u.id, name: u.name, role: e.target.value })} className="text-[10px] border-gray-200 border px-2 py-1 rounded-lg bg-white/50 focus:bg-yellow-50 focus:border-yellow-200 cursor-pointer outline-none transition-all hover:border-yellow-200">
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