import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { COUNTRIES } from "./supportives/global_countries";

interface SignUpFormProps { 
  onClose: () => void; 
  onAuthSuccess: (token: string, email: string, role: string) => void; 
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onClose, onAuthSuccess }) => {
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState<any>({});
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "", country: "" });
  
  const [countryQuery, setCountryQuery] = useState("");
  const [showCountryResults, setShowCountryResults] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const countryContainerRef = useRef<HTMLDivElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const API = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryContainerRef.current && !countryContainerRef.current.contains(event.target as Node)) {
        setShowCountryResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getVal = (f: string) => {
    if (f === "email") return { v: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email), m: "Invalid email address", ref: emailRef };
    if (view === "forgot") return { v: true, m: "" };
    if (view === "login" && f === "password") return { v: !!formData.password, m: "Password required", ref: passwordRef };
    if (view === "login") return { v: true, m: "" };
    if (f === "name") return { v: /^[a-zA-Z\s]{3,}$/.test(formData.name), m: "Name must be at least 3 characters", ref: nameRef };
    if (f === "country") return { v: !!formData.country, m: "Please select a country" };
    if (f === "password") return { v: formData.password.length >= 6, m: "Minimum 6 characters", ref: passwordRef };
    if (f === "confirmPassword") return { v: formData.confirmPassword === formData.password && !!formData.confirmPassword, m: "Passwords do not match", ref: confirmRef };
    return { v: true, m: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const fields = view === "login" ? ["email", "password"] : view === "forgot" ? ["email"] : ["name", "country", "email", "password", "confirmPassword"];
    
    setTouched(fields.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}));

    for (const field of fields) {
      const validation = getVal(field);
      if (!validation.v) {
        if (field === "country") {
          setShowCountryResults(true);
        } else {
          validation.ref?.current?.focus();
        }
        return;
      }
    }

    setLoading(true);
    try {
      if (view === "forgot") {
        const res = await axios.post(`${API}/api/auth/forgot-password`, { email: formData.email });
        setServerError(res.data.message);
      } else {
        const endpoint = view === "login" ? "login" : "signup";
        const payload = view === "login" ? { email: formData.email, password: formData.password } : formData;
        const res = await axios.post(`${API}/api/auth/${endpoint}`, payload);
        
        if (view === "login" && res.data.token) {
          onAuthSuccess(res.data.token, formData.email, res.data.role || "user");
        } else if (view === "signup") {
          setServerError("Check your email to verify account");
          setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" });
          setCountryQuery("");
          setTouched({});
        }
      }
    } catch (err: any) { 
        setServerError(err.response?.data?.error || "Authentication failed"); 
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

  const toggleView = () => {
    setView(view === "login" ? "signup" : "login");
    setServerError(null);
    setFormData({ name: "", email: "", password: "", confirmPassword: "", country: "" });
    setCountryQuery("");
    setTouched({});
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const filteredCountries = countryQuery.trim() === "" 
    ? COUNTRIES 
    : COUNTRIES.filter(c => c.name.toLowerCase().includes(countryQuery.toLowerCase()));

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto backdrop-blur-sm p-4" style={{ backgroundColor: COLORS.bgBackdrop }}>
      <div className="w-full max-w-md my-auto p-8 rounded-[2.5rem] shadow-2xl relative flex flex-col" style={{ backgroundColor: COLORS.bgWhite }}>
        <button onClick={onClose} type="button" className="absolute top-8 right-8 z-10 p-2 hover:opacity-50 text-gray-400">✕</button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Heritage in Code</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {serverError && (
            <div 
              className="p-4 rounded-2xl text-xs border text-center"
              style={{ 
                backgroundColor: (serverError.toLowerCase().includes("check") || serverError.toLowerCase().includes("sent")) ? COLORS.successBg : COLORS.dangerBg, 
                color: (serverError.toLowerCase().includes("check") || serverError.toLowerCase().includes("sent")) ? COLORS.successText : COLORS.dangerText,
                borderColor: (serverError.toLowerCase().includes("check") || serverError.toLowerCase().includes("sent")) ? COLORS.successBorder : COLORS.dangerBorder
              }}
            >
              {serverError}
            </div>
          )}
          
          <div className="space-y-3">
            {view === "signup" && (
              <>
                <div className="flex flex-col">
                  <input ref={nameRef} type="text" placeholder="Full name" {...s("name")} value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setTouched({...touched, name: true}); }} />
                  {touched.name && !getVal("name").v && <p className="text-[10px] ml-3 text-red-500 mt-1">{getVal("name").m}</p>}
                </div>
                <div className="flex flex-col relative" ref={countryContainerRef}>
                  <input 
                    type="text" 
                    placeholder="Search country..." 
                    className={`w-full p-4 border rounded-2xl text-sm outline-none transition-all ${touched.country && !getVal("country").v ? "border-red-500" : "border-gray-200"}`}
                    style={{ backgroundColor: COLORS.bgLight }}
                    value={countryQuery}
                    onFocus={() => setShowCountryResults(true)}
                    onChange={(e) => {
                      setCountryQuery(e.target.value);
                      setShowCountryResults(true);
                      if (formData.country) setFormData({...formData, country: ""});
                    }}
                  />
                  {showCountryResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl z-[110]">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map(c => (
                          <button 
                            key={c.code} 
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-colors"
                            onClick={() => {
                              setFormData({ ...formData, country: c.name });
                              setCountryQuery(c.name);
                              setShowCountryResults(false);
                              setTouched({...touched, country: true});
                            }}
                          >
                            {c.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-xs text-gray-400 italic">No country found</div>
                      )}
                    </div>
                  )}
                  {touched.country && !getVal("country").v && <p className="text-[10px] ml-3 text-red-500 mt-1">{getVal("country").m}</p>}
                </div>
              </>
            )}
            
            <div>
              <input ref={emailRef} type="email" placeholder="Email address" {...s("email")} value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setTouched({...touched, email: true}); }} />
              {touched.email && !getVal("email").v && <p className="text-[10px] ml-3 text-red-500 mt-1">{getVal("email").m}</p>}
            </div>
            
            {view !== "forgot" && (
              <>
                <div className="flex flex-col relative">
                  <input 
                    ref={passwordRef} 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    {...s("password")} 
                    value={formData.password} 
                    onChange={e => { setFormData({ ...formData, password: e.target.value }); setTouched({...touched, password: true}); }} 
                    style={{ backgroundColor: COLORS.bgLight, paddingRight: '48px' }}
                  />
                  <div 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-[1.15rem] cursor-pointer z-20 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </div>
                  {touched.password && !getVal("password").v && <p className="text-[10px] ml-3 text-red-500 mt-1">{getVal("password").m}</p>}
                </div>
                {view === "signup" && (
                  <div className="flex flex-col relative">
                    <input 
                      ref={confirmRef} 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm password" 
                      {...s("confirmPassword")} 
                      value={formData.confirmPassword} 
                      onChange={e => { setFormData({ ...formData, confirmPassword: e.target.value }); setTouched({...touched, confirmPassword: true}); }} 
                      style={{ backgroundColor: COLORS.bgLight, paddingRight: '48px' }}
                    />
                    <div 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      className="absolute right-4 top-[1.15rem] cursor-pointer z-20 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </div>
                    {touched.confirmPassword && !getVal("confirmPassword").v && <p className="text-[10px] ml-3 text-red-500 mt-1">{getVal("confirmPassword").m}</p>}
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="mt-4">
            <button type="submit" disabled={loading} className="w-full text-white py-4 rounded-3xl text-sm flex items-center justify-center gap-3 min-h-[50px] active:scale-[0.98] transition-transform" style={{ backgroundColor: COLORS.primaryColor }}>
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              <span>{view === "login" ? "Login" : view === "signup" ? "Register" : "Reset password"}</span>
            </button>

            <div className={`grid mt-6 ${view === "login" ? "grid-cols-2 gap-4" : "grid-cols-1"}`}>
              <button type="button" onClick={toggleView} className={`text-xs text-center py-2 px-1 hover:opacity-70 transition-opacity ${view === "login" ? "border-r border-gray-100" : ""}`} style={{ color: COLORS.authText }}>
                {view === "login" ? "Create account" : "Back to login"}
              </button>
              
              {view === "login" && (
                <button type="button" onClick={() => { setView("forgot"); setServerError(null); }} className="text-xs text-center py-2 px-1 hover:opacity-70 transition-opacity text-gray-500">
                  Forgot password?
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;