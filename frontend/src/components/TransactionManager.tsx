import React, { useState } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { TriangleAlert, Loader2, Bell, Check, ChevronLeft, Lock, ChevronRight } from "lucide-react";

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

  const paymentMethods = [
    { id: 'visa', label: 'Visa', img: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg', h: 'h-3' },
    { id: 'mastercard', label: 'Mastercard', img: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', h: 'h-6' },
    { id: 'mpesa', label: 'M-Pesa', img: 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg', h: 'h-6' },
    { id: 'telebirr', label: 'Telebirr', img: 'https://seeklogo.com/images/T/telebirr-logo-D6E90793D0-seeklogo.com.png', h: 'h-6' },
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-t-8 transition-all duration-300" style={{ borderColor: isCompleted ? "#059669" : COLORS.primaryColor }}>
            
            {isCompleted ? (
              <div className="text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h4 className="text-2xl font-black mb-2 text-gray-900 tracking-tight">Payment Successful</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ref: {generatedId}</p>
                <div className="bg-gray-50 rounded-2xl p-4 mb-8">
                    <p className="text-sm text-gray-600 leading-relaxed">
                    {mode === "purchase" 
                        ? "Your transaction has been verified. The download will start automatically." 
                        : "Your account has been upgraded. You now have full access to premium features."}
                    </p>
                </div>
                <button onClick={resetAndClose} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-black active:scale-95">
                  Dismiss
                </button>
              </div>
            ) : step === 1 ? (
              <div className="text-center">
                <TriangleAlert size={28} className="mx-auto mb-3" style={{ color: COLORS.primaryColor }} />
                <h4 className="text-xl font-black mb-1 tracking-tight">{mode === "subscription" ? "Upgrade Plan" : "Secure Checkout"}</h4>
                
                {mode === "subscription" && (
                  <div className="grid grid-cols-2 gap-2 my-4">
                    {subscriptionPlans.map((plan) => (
                      <button key={plan.value} onClick={() => setSelectedPlan(plan)} className="relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1" style={{ borderColor: selectedPlan.value === plan.value ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: selectedPlan.value === plan.value ? `${COLORS.primaryColor}10` : 'transparent' }}>
                        {selectedPlan.value === plan.value && <div className="absolute top-1.5 right-1.5 bg-orange-600 rounded-full p-0.5"><Check size={8} color="white" strokeWidth={5} /></div>}
                        <span className="text-[10px] font-black text-gray-400 uppercase">{plan.label}</span>
                        <span className="text-sm font-black text-gray-900">${plan.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="my-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 text-left ml-1">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((pm) => (
                      <button key={pm.id} onClick={() => setSelectedPayment(pm.id)} className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all h-24 ${selectedPayment === pm.id ? 'border-orange-500 bg-orange-50/30 shadow-sm' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-100'}`}>
                        <img src={pm.img} className={`${pm.h} w-auto object-contain transition-all duration-200 ${selectedPayment === pm.id ? 'scale-110' : 'opacity-80 grayscale-0'}`} alt={pm.label} />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{pm.label}</span>
                        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${selectedPayment === pm.id ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-200'}`}>
                          {selectedPayment === pm.id && <Check size={10} className="text-white stroke-[4px]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button disabled={!selectedPayment} onClick={() => setStep(2)} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>
                    Continue to Payment <ChevronRight size={14} />
                  </button>
                  <button onClick={resetAndClose} className="w-full py-2 text-[10px] font-black text-gray-400 uppercase hover:text-gray-600">Cancel Transaction</button>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 mb-4 hover:text-gray-600 transition-colors"><ChevronLeft size={14}/> Back</button>
                <div className="flex items-center gap-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <img src={paymentMethods.find(p => p.id === selectedPayment)?.img} className="h-4 w-auto object-contain" alt="Gateway" />
                    <h4 className="text-sm font-black tracking-tight uppercase text-gray-700">{selectedPayment} Secure Gateway</h4>
                </div>
                
                <div className="space-y-4 mb-6">
                  {isMobilePay ? (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</label>
                          {errors.includes("phone") && <span className="text-[9px] font-bold text-red-600 uppercase">Required</span>}
                        </div>
                        <input type="tel" placeholder="09... or 07..." value={paymentDetails.phone} onChange={(e) => { setPaymentDetails({...paymentDetails, phone: e.target.value}); setErrors(errors.filter(err => err !== "phone")); }} className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all font-medium ${errors.includes("phone") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div className="relative">
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Account PIN</label>
                          {errors.includes("pin") && <span className="text-[9px] font-bold text-red-600 uppercase">Required</span>}
                        </div>
                        <div className="relative">
                            <input type="password" maxLength={6} placeholder="••••" value={paymentDetails.pin} onChange={(e) => { setPaymentDetails({...paymentDetails, pin: e.target.value.replace(/\D/g, '')}); setErrors(errors.filter(err => err !== "pin")); }} className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all tracking-[0.5em] font-bold ${errors.includes("pin") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-orange-500'}`} />
                            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 ml-1">* Secure processing via {selectedPayment}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Card Number</label>
                          {errors.includes("cardNumber") && <span className="text-[9px] font-bold text-red-600 uppercase">Required</span>}
                        </div>
                        <input type="text" placeholder="0000 0000 0000 0000" value={paymentDetails.cardNumber} onChange={(e) => { setPaymentDetails({...paymentDetails, cardNumber: e.target.value}); setErrors(errors.filter(err => err !== "cardNumber")); }} className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all ${errors.includes("cardNumber") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-[2]">
                          <div className="flex justify-between items-center mb-1 px-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Expiry</label>
                            {errors.includes("expiry") && <span className="text-[9px] font-bold text-red-600 uppercase">!</span>}
                          </div>
                          <input type="text" placeholder="MM/YY" value={paymentDetails.expiry} onChange={(e) => { setPaymentDetails({...paymentDetails, expiry: e.target.value}); setErrors(errors.filter(err => err !== "expiry")); }} className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none ${errors.includes("expiry") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-orange-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1 px-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">CVV</label>
                            {errors.includes("cvv") && <span className="text-[9px] font-bold text-red-600 uppercase">!</span>}
                          </div>
                          <input type="text" placeholder="123" value={paymentDetails.cvv} onChange={(e) => { setPaymentDetails({...paymentDetails, cvv: e.target.value}); setErrors(errors.filter(err => err !== "cvv")); }} className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none ${errors.includes("cvv") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-orange-500'}`} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button 
                    onClick={handleConfirmAction} 
                    disabled={isProcessing} 
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-orange-600/20" 
                    style={{ backgroundColor: COLORS.primaryColor, color: "white" }}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : (
                    <span className="flex items-center gap-2">
                        Authorize ${(mode === "subscription" ? selectedPlan.price : price).toFixed(2)}
                    </span>
                  )}
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