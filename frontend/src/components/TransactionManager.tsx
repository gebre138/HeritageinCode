import React, { useState } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { Loader2, Bell, Check, ChevronLeft, Lock, ChevronRight } from "lucide-react";

interface TransactionManagerProps {
  item?: {
    id: string | number;
    user_mail?: string;
    heritage_sound?: string;
    community?: string;
    contributor_email?: string;
    contributor?: string;
    title?: string;
  };
  currentUserEmail: string | null;
  downloadUrl?: string;
  onOpenLogin: () => void;
  price: number;
  variant: string;
  mode?: "purchase" | "subscription";
  onSuccess?: () => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({
  item,
  currentUserEmail,
  downloadUrl,
  onOpenLogin,
  price,
  variant,
  mode = "purchase",
  onSuccess
}) => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [paymentDetails, setPaymentDetails] = useState({
    phone: "",
    pin: "",
    cardNumber: "",
    expiry: "",
    cvv: ""
  });

  const [selectedPlan, setSelectedPlan] = useState({
    label: "Monthly",
    value: "monthly",
    price: 10.00
  });

  const subscriptionPlans = [
    { label: "Daily", value: "daily", price: 1.00 },
    { label: "Weekly", value: "weekly", price: 5.00 },
    { label: "Monthly", value: "monthly", price: 10.00 },
    { label: "Yearly", value: "yearly", price: 80.00 },
  ];

  const benefits = [
    "Seamless download of heritage tracks",
    "Unlimited access of track fusion",
    "Exclusive discounts"
  ];

  const paymentMethods = [
    { id: 'visa', label: 'Visa', img: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg', h: 'h-3' },
    { id: 'mastercard', label: 'Mastercard', img: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', h: 'h-5' },
    { id: 'mpesa', label: 'M-Pesa', img: 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg', h: 'h-5' },
    { id: 'telebirr', label: 'Telebirr', img: '/telebirr.png', h: 'h-7' },
  ];

  const API_BASE = process.env.REACT_APP_API_URL || "https://heritage-backend-f24y.onrender.com";
  const trackName = item?.heritage_sound || item?.title || "Service";

  const triggerDownload = async () => {
    if (!downloadUrl) return;
    try {
      const res = await axios.get(downloadUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${trackName}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmAction = async () => {
    if (!currentUserEmail || !selectedPayment) return;

    const newErrors: string[] = [];
    if (isMobilePay) {
      if (!paymentDetails.phone) newErrors.push("phone");
      if (!paymentDetails.pin) newErrors.push("pin");
    } else {
      if (!paymentDetails.cardNumber) newErrors.push("cardNumber");
      if (!paymentDetails.expiry) newErrors.push("expiry");
      if (!paymentDetails.cvv) newErrors.push("cvv");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setIsProcessing(true);
    
    const providerPrefix = selectedPayment.substring(0, 3).toUpperCase();
    const newTransactionId = `${providerPrefix}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    setGeneratedId(newTransactionId);
    
    try {
      const isSub = mode === "subscription";
      const endpoint = isSub ? "/api/transactions/subscribe" : "/api/transactions/insert";
      
      const transactionRecordPayload = {
        transaction_id: newTransactionId,
        sound_id: isSub ? "xxxx" : String(item?.id),
        payer_email: currentUserEmail,
        amount: isSub ? selectedPlan.price : price,
        variant: isSub ? "subscription" : variant,
        payment_method: selectedPayment,
        plan_type: isSub ? selectedPlan.value : null
      };

      const dbRes = await axios.post(`${API_BASE}${endpoint}`, transactionRecordPayload);
      
      if (dbRes.data.success) {
        setIsCompleted(true);
        if (mode === "purchase") triggerDownload();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Transaction Error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "System error. Transaction could not be recorded.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setShowModal(false);
    setStep(1);
    setIsCompleted(false);
    setSelectedPayment(null);
    setGeneratedId("");
    setErrors([]);
    setPaymentDetails({ phone: "", pin: "", cardNumber: "", expiry: "", cvv: "" });
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserEmail) {
      onOpenLogin();
    } else {
      setShowModal(true);
    }
  };

  const isMobilePay = selectedPayment === 'mpesa' || selectedPayment === 'telebirr';

  return (
    <>
      <style>{`
        .smart-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s;
        }
        .smart-scroll:hover {
          scrollbar-color: #d1d5db transparent;
        }
        .smart-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .smart-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .smart-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
          transition: background 0.3s;
        }
        .smart-scroll:hover::-webkit-scrollbar-thumb {
          background: #d1d5db;
        }
      `}</style>

      {mode === "subscription" ? (
        <button onClick={handleButtonClick} className="text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
          <Bell size={18} />
          Subscribe
        </button>
      ) : (
        <button onClick={handleButtonClick} className="p-2 rounded-full border bg-white transition-all active:scale-95 flex items-center justify-center h-8 w-8" style={{ color: COLORS.textGray, borderColor: COLORS.borderLight }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-5 sm:p-7 max-w-[340px] w-full shadow-2xl border-t-4 transition-all duration-300 max-h-[85vh] overflow-y-auto smart-scroll" style={{ borderColor: isCompleted ? "#059669" : COLORS.primaryColor }}>
            
            {isCompleted ? (
              <div className="text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h4 className="text-xl font-bold mb-1 text-gray-900 tracking-tight">Payment Successful</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ref: {generatedId}</p>
                <div className="bg-gray-50 rounded-xl p-3 mb-6">
                    <p className="text-xs text-gray-600 leading-snug">
                    {mode === "purchase" 
                        ? "Your transaction has been verified. Download starting now." 
                        : "Your account has been upgraded. Enjoy premium access."}
                    </p>
                </div>
                <button onClick={resetAndClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-xs transition-all hover:bg-black active:scale-95">
                  Dismiss
                </button>
              </div>
            ) : step === 1 ? (
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-1 tracking-tight text-gray-800">Subscription Plan</h4>
                
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 mb-5">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1 min-w-fit">
                      <div className="bg-emerald-100 rounded-full p-0.5">
                        <Check size={7} className="text-emerald-600" strokeWidth={5} />
                      </div>
                      <span className="text-[8px] font-medium text-gray-500">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                {mode === "subscription" && (
                  <div className="grid grid-cols-2 gap-2 my-3">
                    {subscriptionPlans.map((plan) => (
                      <button key={plan.value} onClick={() => setSelectedPlan(plan)} className="relative p-2 rounded-xl border transition-all flex flex-col items-center justify-center" style={{ borderColor: selectedPlan.value === plan.value ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: selectedPlan.value === plan.value ? `${COLORS.primaryColor}08` : 'transparent' }}>
                        {selectedPlan.value === plan.value && <div className="absolute top-1 right-1 bg-orange-600 rounded-full p-0.5"><Check size={6} color="white" strokeWidth={5} /></div>}
                        <span className="text-[9px] font-medium text-gray-400">{plan.label}</span>
                        <span className="text-xs font-bold text-gray-900">${plan.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="my-5">
                  <p className="text-[9px] font-medium text-gray-400 mb-2 text-left ml-1">Select payment method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((pm) => (
                      <button key={pm.id} onClick={() => setSelectedPayment(pm.id)} className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all h-16 ${selectedPayment === pm.id ? 'border-orange-500 bg-orange-50/20 shadow-sm' : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50'}`}>
                        <img src={pm.img} className={`${pm.h} w-auto object-contain transition-all duration-200 ${selectedPayment === pm.id ? 'scale-105' : 'opacity-70'}`} alt={pm.label} />
                        <span className="text-[8px] font-medium text-gray-400 tracking-tighter">{pm.label}</span>
                        <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border flex items-center justify-center transition-all ${selectedPayment === pm.id ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-200'}`}>
                          {selectedPayment === pm.id && <Check size={8} className="text-white stroke-[4px]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button disabled={!selectedPayment} onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl font-medium text-[11px] transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>
                    Continue <ChevronRight size={12} />
                  </button>
                  <button onClick={resetAndClose} className="flex-1 py-3 border border-gray-100 rounded-xl text-[11px] font-medium text-gray-400 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[9px] font-medium text-gray-400 mb-3 hover:text-gray-600"><ChevronLeft size={12}/> Back</button>
                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img src={paymentMethods.find(p => p.id === selectedPayment)?.img} className="h-3.5 w-auto object-contain" alt="Gateway" />
                    <h4 className="text-xs font-medium text-gray-700">{selectedPayment} Payment Detail</h4>
                </div>
                
                <div className="space-y-3 mb-5">
                  {isMobilePay ? (
                    <>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[9px] font-medium text-gray-400">Phone number</label>
                          {errors.includes("phone") && <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">Required</span>}
                        </div>
                        <input type="tel" placeholder="09..." value={paymentDetails.phone} onChange={(e) => { setPaymentDetails({...paymentDetails, phone: e.target.value}); setErrors(errors.filter(err => err !== "phone")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs outline-none transition-all ${errors.includes("phone") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[9px] font-medium text-gray-400">Account pin</label>
                          {errors.includes("pin") && <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">Required</span>}
                        </div>
                        <div className="relative">
                            <input type="password" maxLength={6} placeholder="••••" value={paymentDetails.pin} onChange={(e) => { setPaymentDetails({...paymentDetails, pin: e.target.value.replace(/\D/g, '')}); setErrors(errors.filter(err => err !== "pin")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs outline-none tracking-[0.4em] font-bold transition-all ${errors.includes("pin") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                            <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[9px] font-medium text-gray-400">Card number</label>
                          {errors.includes("cardNumber") && <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">Required</span>}
                        </div>
                        <input type="text" placeholder="0000 0000 0000 0000" value={paymentDetails.cardNumber} onChange={(e) => { setPaymentDetails({...paymentDetails, cardNumber: e.target.value}); setErrors(errors.filter(err => err !== "cardNumber")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs outline-none transition-all ${errors.includes("cardNumber") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5 px-1">
                            <label className="text-[9px] font-medium text-gray-400">Expiry</label>
                            {errors.includes("expiry") && <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">!</span>}
                          </div>
                          <input type="text" placeholder="MM/YY" value={paymentDetails.expiry} onChange={(e) => { setPaymentDetails({...paymentDetails, expiry: e.target.value}); setErrors(errors.filter(err => err !== "expiry")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs transition-all ${errors.includes("expiry") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5 px-1">
                            <label className="text-[9px] font-medium text-gray-400">CVV</label>
                            {errors.includes("cvv") && <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">!</span>}
                          </div>
                          <input type="text" placeholder="123" value={paymentDetails.cvv} onChange={(e) => { setPaymentDetails({...paymentDetails, cvv: e.target.value}); setErrors(errors.filter(err => err !== "cvv")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs transition-all ${errors.includes("cvv") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100'}`} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button 
                    onClick={handleConfirmAction} 
                    disabled={isProcessing} 
                    className="w-full py-3.5 rounded-xl font-medium text-[11px] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50" 
                    style={{ backgroundColor: COLORS.primaryColor, color: "white" }}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : `Authorize $${(mode === "subscription" ? selectedPlan.price : price).toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionManager;