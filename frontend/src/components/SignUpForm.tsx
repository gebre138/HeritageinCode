import React, { useState, useRef } from "react";
import axios from "axios";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";

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

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);

  const API = process.env.REACT_APP_API_URL || "";

  const getVal = (f: string) => {
    if (f === "email") return { v: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email), m: "invalid email address", ref: emailRef };
    if (isLogin && f === "password") return { v: !!formData.password, m: "password required", ref: passwordRef };
    if (isLogin) return { v: true, m: "" };
    if (f === "name") return { v: /^[a-zA-Z\s]{3,}$/.test(formData.name), m: "name must be at least 3 characters (letters only)", ref: nameRef };
    if (f === "country") return { v: !!formData.country, m: "please select a country", ref: countryRef };
    if (f === "password") return { v: formData.password.length >= 6, m: "minimum 6 characters", ref: passwordRef };
    if (f === "confirmPassword") return { v: formData.confirmPassword === formData.password && !!formData.confirmPassword, m: "passwords do not match", ref: confirmRef };
    return { v: true, m: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const fields = isLogin ? ["email", "password"] : ["name", "country", "email", "password", "confirmPassword"];
    
    setTouched(fields.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}));

    for (const field of fields) {
      const validation = getVal(field);
      if (!validation.v) {
        validation.ref?.current?.focus();
        return;
      }
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/${isLogin ? "login" : "signup"}`, isLogin ? { email: formData.email, password: formData.password } : formData);
      if (isLogin && res.data.token) onAuthSuccess(res.data.token, formData.email, res.data.role || "user");
      else if (!isLogin) {
        setServerError("check your email to verify account");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" });
        setTouched({});
      }
    } catch (err: any) { 
        setServerError(err.response?.data?.error || "auth failed"); 
    } finally { 
        setLoading(false); 
    }
  };

  const s = (f: string) => {
    const b = "w-full p-4 border rounded-2xl outline-none transition-all text-sm ";
    const style = { backgroundColor: COLORS.bgLight };
    if (!touched[f]) return { className: b + "border-gray-200", style };
    return getVal(f).v 
      ? { className: b + "border-green-500", style } 
      : { className: b + "border-red-500", style };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4" style={{ backgroundColor: COLORS.bgBackdrop }}>
      <div className="w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh]" style={{ backgroundColor: COLORS.bgWhite }}>
        <button onClick={onClose} className="absolute top-8 right-8" style={{ color: COLORS.textMuted }}>✕</button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: COLORS.textDark }}>HERITAGE IN CODE</h2>
          <p className="text-[10px] uppercase font-bold mt-1" style={{ color: COLORS.primaryColor }}>{isLogin ? "access account" : "new account"}</p>
        </div>
        {serverError && (
          <div 
            className="p-3 rounded-2xl text-[10px] font-black uppercase mb-4 border text-center"
            style={{ 
              backgroundColor: serverError.includes("check") ? COLORS.successBg : COLORS.dangerBg, 
              color: serverError.includes("check") ? COLORS.successText : COLORS.dangerText,
              borderColor: serverError.includes("check") ? COLORS.successBorder : COLORS.dangerBorder
            }}
          >
            {serverError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {!isLogin && (
              <>
                <input ref={nameRef} type="text" placeholder="Full name" {...s("name")} value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setTouched({...touched, name: true}); }} />
                {touched.name && !getVal("name").v && <p className="text-[9px] ml-3 font-bold" style={{ color: COLORS.dangerColor }}>{getVal("name").m}</p>}
                
                <select 
                  ref={countryRef} 
                  className="w-full p-4 border rounded-2xl text-sm outline-none" 
                  style={{ backgroundColor: COLORS.bgLight, borderColor: touched.country && !getVal("country").v ? COLORS.dangerColor : COLORS.borderLight }} 
                  value={formData.country} 
                  onChange={e => { setFormData({ ...formData, country: e.target.value }); setTouched({...touched, country: true}); }}
                >
                  <option value="">select country</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
                {touched.country && !getVal("country").v && <p className="text-[9px] ml-3 font-bold" style={{ color: COLORS.dangerColor }}>{getVal("country").m}</p>}
              </>
            )}
            
            <input ref={emailRef} type="email" placeholder="Email address" {...s("email")} value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setTouched({...touched, email: true}); }} />
            {touched.email && !getVal("email").v && <p className="text-[9px] ml-3 font-bold" style={{ color: COLORS.dangerColor }}>{getVal("email").m}</p>}
            
            <div className={isLogin ? "space-y-3" : "grid grid-cols-2 gap-3"}>
              <div className="flex flex-col">
                <input ref={passwordRef} type="password" placeholder="Password" {...s("password")} value={formData.password} onChange={e => { setFormData({ ...formData, password: e.target.value }); setTouched({...touched, password: true}); }} />
                {touched.password && !getVal("password").v && <p className="text-[9px] ml-3 font-bold" style={{ color: COLORS.dangerColor }}>{getVal("password").m}</p>}
              </div>
              {!isLogin && (
                <div className="flex flex-col">
                  <input ref={confirmRef} type="password" placeholder="Confirm" {...s("confirmPassword")} value={formData.confirmPassword} onChange={e => { setFormData({ ...formData, confirmPassword: e.target.value }); setTouched({...touched, confirmPassword: true}); }} />
                  {touched.confirmPassword && !getVal("confirmPassword").v && <p className="text-[9px] ml-3 font-bold" style={{ color: COLORS.dangerColor }}>{getVal("confirmPassword").m}</p>}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4" style={{ backgroundColor: COLORS.bgWhite }}>
            <button type="submit" disabled={loading} className="w-full text-white py-5 rounded-3xl text-[14px] tracking-[0.3em] flex items-center justify-center gap-3 min-h-[60px]" style={{ backgroundColor: COLORS.primaryColor }}>
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              <span className="font-medium">{isLogin ? "Login" : "Register"}</span>
            </button>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setServerError(null); setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" }); setTouched({}); setLoading(false); }} className="w-full mt-4 text-[11px] font-bold hover:opacity-80" style={{ color: COLORS.authText }}>{isLogin ? "Have no account yet? create new" : "Have already an account? login"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;