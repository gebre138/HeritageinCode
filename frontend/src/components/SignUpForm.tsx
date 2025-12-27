import React, { useState } from "react";
import axios from "axios";
import { COUNTRIES } from "./supportives/countries";

interface SignUpFormProps { 
  onClose: () => void; 
  onAuthSuccess: (token: string, email: string, role: string) => void; 
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState<any>({});
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "", country: "" });

  const API = process.env.REACT_APP_API_URL || "";

  const getVal = (f: string) => {
    if (f === "email") return { v: /\S+@\S+\.\S+/.test(formData.email), m: "invalid email address" };
    if (isLogin && f === "password") return { v: !!formData.password, m: "password required" };
    if (isLogin) return { v: true, m: "" };
    if (f === "password") return { v: formData.password.length >= 6, m: "minimum 6 characters" };
    if (f === "name") return { v: formData.name.length >= 3, m: "name too short" };
    if (f === "confirmPassword") return { v: formData.confirmPassword === formData.password && !!formData.confirmPassword, m: "passwords do not match" };
    if (f === "country") return { v: !!formData.country, m: "please select a country" };
    return { v: true, m: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setTouched({ name: true, email: true, password: true, confirmPassword: true, country: true });
    if (isLogin ? !getVal("email").v || !getVal("password").v : Object.keys(formData).some(k => !getVal(k).v)) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/${isLogin ? "login" : "signup"}`, isLogin ? { email: formData.email, password: formData.password } : formData);
      if (isLogin && res.data.token) onAuthSuccess(res.data.token, formData.email, res.data.role || "user");
      else if (!isLogin) {
        setServerError("check your email to verify account");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" });
        setTouched({});
      }
    } catch (err: any) { setServerError(err.response?.data?.error || "auth failed"); }
    finally { setLoading(false); }
  };

  const s = (f: string, v: string) => {
    const b = "w-full p-4 bg-gray-50 border rounded-2xl outline-none transition-all text-sm ";
    return (!v || (f === "password" && isLogin)) ? b + "border-gray-200" : getVal(f).v ? b + "border-green-500" : b + "border-red-500";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400">✕</button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">HERITAGE IN CODE</h2>
          <p className="text-[10px] uppercase text-orange-500 font-bold mt-1">{isLogin ? "access account" : "new account"}</p>
        </div>
        {serverError && <div className={`p-3 rounded-2xl text-[10px] font-black uppercase mb-4 border text-center ${serverError.includes("check") ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>{serverError}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {!isLogin && (
              <>
                <input type="text" placeholder="Full name" className={s("name", formData.name)} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onBlur={() => setTouched({ ...touched, name: true })} />
                {touched.name && !getVal("name").v && <p className="text-[9px] ml-3 font-bold text-red-500">{getVal("name").m}</p>}
                <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} onBlur={() => setTouched({ ...touched, country: true })}><option value="">select country</option>{COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}</select>
                {touched.country && !getVal("country").v && <p className="text-[9px] ml-3 font-bold text-red-500">{getVal("country").m}</p>}
              </>
            )}
            <input type="email" placeholder="Email address" className={s("email", formData.email)} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onBlur={() => setTouched({ ...touched, email: true })} />
            {touched.email && !getVal("email").v && <p className="text-[9px] ml-3 font-bold text-red-500">{getVal("email").m}</p>}
            <div className={isLogin ? "space-y-3" : "grid grid-cols-2 gap-3"}>
              <input type="password" placeholder="Password" className={s("password", formData.password)} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} onBlur={() => setTouched({ ...touched, password: true })} />
              {touched.password && isLogin && !getVal("password").v && <p className="text-[9px] ml-3 font-bold text-red-500">{getVal("password").m}</p>}
              {!isLogin && <input type="password" placeholder="Confirm" className={s("confirmPassword", formData.confirmPassword)} value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} onBlur={() => setTouched({ ...touched, confirmPassword: true })} />}
            </div>
          </div>
          <div className="pt-4 bg-white">
            <button type="submit" disabled={loading} className="w-full bg-[#E67E22] text-white font-black py-5 rounded-3xl text-[10px] tracking-[0.3em] flex items-center justify-center min-h-[60px]">{loading ? <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin"></div> : isLogin ? "Login" : "Register"}</button>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setServerError(null); setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" }); setTouched({}); }} className="w-full mt-4 text-[11px] font-bold text-gray-400 hover:text-orange-500">{isLogin ? "Have no account yet? create account" : "Have already an account? login"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;
