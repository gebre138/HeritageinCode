import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { Loader2, Bell, Check, ChevronLeft, Lock, ChevronRight, X } from "lucide-react";

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
  const [rates, setRates] = useState({ ETB: 125.0, KES: 130.0 });
  
  const [paymentDetails, setPaymentDetails] = useState({
    phone: "",
    pin: "",
    cardNumber: "",
    expiry: "",
    cvv: ""
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState([
    { label: "Daily", value: "daily", price: 1.00 },
    { label: "Weekly", value: "weekly", price: 5.00 },
    { label: "Monthly", value: "monthly", price: 10.00 },
    { label: "Yearly", value: "yearly", price: 80.00 },
  ]);

  const [selectedPlan, setSelectedPlan] = useState(subscriptionPlans[2]);

  const benefits = [
    "Seamless download",
    "Unlimited access",
    "Discounts"
  ];

  const paymentMethods = [
    { id: 'visa', label: 'Visa', img: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg', h: 'h-3' },
    { id: 'mastercard', label: 'Mastercard', img: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', h: 'h-5' },
    { id: 'mpesa', label: 'M-Pesa', img: 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg', h: 'h-5' },
    { id: 'telebirr', label: 'Telebirr', img: '/telebirr.png', h: 'h-7' },
  ];

  const API_BASE = process.env.REACT_APP_API_URL || "";
  const trackName = item?.heritage_sound || item?.title || "Service";

  const fetchLiveExchangeRates = useCallback(async () => {
    try {
      const response = await axios.get("https://open.er-api.com/v6/latest/USD");
      if (response.data && response.data.rates) {
        setRates({
          ETB: Number(response.data.rates.ETB) || 125.0,
          KES: Number(response.data.rates.KES) || 130.0
        });
      }
    } catch (err) {
      console.warn("failed to fetch live official rates in TransactionManager", err);
    }
  }, []);

  const fetchDynamicPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/payment/pricing`);
      if (res.data) {
        const updatedPlans = [
          { label: "Daily", value: "daily", price: Number(res.data.daily_sub) || 1.00 },
          { label: "Weekly", value: "weekly", price: Number(res.data.weekly_sub) || 5.00 },
          { label: "Monthly", value: "monthly", price: Number(res.data.monthly_sub) || 10.00 },
          { label: "Yearly", value: "yearly", price: Number(res.data.yearly_sub) || 80.00 },
        ];
        setSubscriptionPlans(updatedPlans);
        setSelectedPlan(prev => updatedPlans.find(p => p.value === prev.value) || updatedPlans[2]);
      }
    } catch (err) {
      console.warn("Pricing fetch failed in TransactionManager", err);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (showModal) {
      fetchLiveExchangeRates();
      fetchDynamicPricing();
    }
  }, [showModal, fetchLiveExchangeRates, fetchDynamicPricing]);

  const baseUsdAmount = useMemo(() => {
    return mode === "subscription" ? selectedPlan.price : price;
  }, [mode, selectedPlan.price, price]);

  const localConversion = useMemo(() => {
    if (selectedPayment === 'mpesa') {
      return { amount: (baseUsdAmount * rates.KES).toFixed(2), unit: "KES", rate: rates.KES.toFixed(2) };
    }
    if (selectedPayment === 'telebirr') {
      return { amount: (baseUsdAmount * rates.ETB).toFixed(2), unit: "ETB", rate: rates.ETB.toFixed(2) };
    }
    return { amount: baseUsdAmount.toFixed(2), unit: "USD", rate: (1).toFixed(2) };
  }, [selectedPayment, baseUsdAmount, rates]);

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

  const validateCard = () => {
    const errs: string[] = [];
    const cardNum = paymentDetails.cardNumber.replace(/\s/g, '');
    if (cardNum.length < 13 || cardNum.length > 19 || !/^\d+$/.test(cardNum)) errs.push("cardNumber");
    
    const expiryRegex = /^(0[1-9]|1[0-2])\/?([2-9][0-9])$/;
    if (!expiryRegex.test(paymentDetails.expiry)) {
      errs.push("expiry");
    } else {
      const [m, y] = paymentDetails.expiry.split('/').map(n => parseInt(n));
      const now = new Date();
      const currentYear = parseInt(now.getFullYear().toString().slice(-2));
      const currentMonth = now.getMonth() + 1;
      if (y < currentYear || (y === currentYear && m < currentMonth)) errs.push("expiry");
    }

    if (!/^\d{3,4}$/.test(paymentDetails.cvv)) errs.push("cvv");
    return errs;
  };

  const validateMobile = () => {
    const errs: string[] = [];
    const phone = paymentDetails.phone.replace(/\s/g, '');
    if (!/^(09|07|\+2519|\+2517|\+254)\d+$/.test(phone)) errs.push("phone");
    if (paymentDetails.pin.length < 4) errs.push("pin");
    return errs;
  };

  const handleDetailsContinue = () => {
    const newErrors = isMobilePay ? validateMobile() : validateCard();
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors([]);
    setStep(3);
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    const providerPrefix = selectedPayment?.substring(0, 3).toUpperCase();
    const newTransactionId = `${providerPrefix}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    setGeneratedId(newTransactionId);
    
    try {
      const isSub = mode === "subscription";
      const endpoint = isSub ? "/api/transactions/subscribe" : "/api/transactions/insert";
      
      const transactionRecordPayload = {
        transaction_id: newTransactionId,
        sound_id: isSub ? "xxxx" : String(item?.id),
        payer_email: currentUserEmail,
        amount: baseUsdAmount,
        converted_amount: localConversion.amount,
        local_currency: localConversion.unit,
        exchange_rate: localConversion.rate,
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
        <button onClick={handleButtonClick} className="text-white px-6 py-3 rounded-full shadow-2xl font-bold text-[14px] transition-all hover:scale-105 active:scale-95 flex items-center gap-2" style={{ backgroundColor: COLORS.primaryColor }}>
          <Bell size={18} />
          subscribe
        </button>
      ) : (
        <button onClick={handleButtonClick} className="p-2 rounded-full border bg-white transition-all active:scale-95 flex items-center justify-center h-8 w-8" style={{ color: COLORS.textGray, borderColor: COLORS.borderLight }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-5 sm:p-7 max-w-[360px] w-full shadow-2xl border-t-4 transition-all duration-300 max-h-[85vh] overflow-y-auto smart-scroll relative" style={{ borderColor: isCompleted ? "#059669" : COLORS.primaryColor }}>
            
            {!isCompleted && (
              <button 
                onClick={resetAndClose} 
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            {isCompleted ? (
              <div className="text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h4 className="text-[20px] font-bold mb-1 text-gray-900 tracking-tight">payment successful</h4>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">ref: {generatedId}</p>
                <p className="text-[12px] font-bold text-emerald-600 mb-3 text-center">holder: gebregziabihier nigusie</p>
                <div className="bg-gray-50 rounded-xl p-3 mb-6">
                    <p className="text-[13px] text-gray-600 leading-snug">
                    {mode === "purchase" 
                        ? "your transaction has been verified. download starting now." 
                        : "your account has been upgraded. enjoy premium access."}
                    </p>
                </div>
                <button onClick={resetAndClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-[13px] transition-all hover:bg-black active:scale-95">
                  dismiss
                </button>
              </div>
            ) : step === 1 ? (
              <div className="text-center">
                <h4 className="text-[18px] font-semibold mb-1 tracking-tight text-gray-800">Subscription Plan</h4>
                
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 mb-5">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1 min-w-fit">
                      <div className="bg-emerald-100 rounded-full p-0.5">
                        <Check size={8} className="text-emerald-600" strokeWidth={5} />
                      </div>
                      <span className="text-[10px] font-normal text-gray-500">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                {mode === "subscription" && (
                  <div className="grid grid-cols-2 gap-2 my-3">
                    {subscriptionPlans.map((plan) => (
                      <button key={plan.value} onClick={() => setSelectedPlan(plan)} className="relative p-2 rounded-xl border transition-all flex flex-col items-center justify-center" style={{ borderColor: selectedPlan.value === plan.value ? COLORS.primaryColor : COLORS.borderLight, backgroundColor: selectedPlan.value === plan.value ? `${COLORS.primaryColor}08` : 'transparent' }}>
                        {selectedPlan.value === plan.value && <div className="absolute top-1 right-1 bg-orange-600 rounded-full p-0.5"><Check size={6} color="white" strokeWidth={5} /></div>}
                        <span className="text-[12px] font-medium text-gray-400">{plan.label}</span>
                        <span className="text-[13px] font-bold text-gray-900">${plan.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="my-5">
                  <p className="text-[12px] font-medium text-gray-400 mb-2 text-left ml-1">Select payment method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((pm) => (
                      <button key={pm.id} onClick={() => setSelectedPayment(pm.id)} className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all h-16 ${selectedPayment === pm.id ? 'border-orange-500 bg-orange-50/20 shadow-sm' : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50'}`}>
                        <img src={pm.img} className={`${pm.h} w-auto object-contain transition-all duration-200 ${selectedPayment === pm.id ? 'scale-105' : 'opacity-70'}`} alt={pm.label} />
                        <span className="text-[12px] font-medium text-gray-400 tracking-tighter">{pm.label}</span>
                        <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border flex items-center justify-center transition-all ${selectedPayment === pm.id ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-200'}`}>
                          {selectedPayment === pm.id && <Check size={8} className="text-white stroke-[4px]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button disabled={!selectedPayment} onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl font-medium text-[13px] transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50" style={{ backgroundColor: COLORS.primaryColor, color: "white" }}>
                    Continue <ChevronRight size={14} />
                  </button>
                  <button onClick={resetAndClose} className="flex-1 py-3 border border-gray-100 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : step === 2 ? (
              <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[12px] font-medium text-gray-400 mb-3 hover:text-gray-600"><ChevronLeft size={14}/> Back</button>
                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img src={paymentMethods.find(p => p.id === selectedPayment)?.img} className="h-4 w-auto object-contain" alt="gateway" />
                    <h4 className="text-[13px] font-medium text-gray-700">{selectedPayment} payment detail</h4>
                </div>
                
                <div className="space-y-3 mb-5">
                  {isMobilePay ? (
                    <>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[12px] font-medium text-gray-400">Phone number</label>
                          {errors.includes("phone") && <span className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">invalid format</span>}
                        </div>
                        <input type="tel" placeholder="09... / 07..." value={paymentDetails.phone} onChange={(e) => { setPaymentDetails({...paymentDetails, phone: e.target.value}); setErrors(errors.filter(err => err !== "phone")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-[13px] outline-none transition-all ${errors.includes("phone") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[12px] font-medium text-gray-400">Account pin</label>
                          {errors.includes("pin") && <span className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">required</span>}
                        </div>
                        <div className="relative">
                            <input type="password" maxLength={6} placeholder="••••" value={paymentDetails.pin} onChange={(e) => { setPaymentDetails({...paymentDetails, pin: e.target.value.replace(/\D/g, '')}); setErrors(errors.filter(err => err !== "pin")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-[13px] outline-none tracking-[0.4em] font-bold transition-all ${errors.includes("pin") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between mb-0.5 px-1">
                          <label className="text-[12px] font-medium text-gray-400">card number</label>
                          {errors.includes("cardNumber") && <span className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">invalid</span>}
                        </div>
                        <input type="text" maxLength={19} placeholder="0000 0000 0000 0000" value={paymentDetails.cardNumber} onChange={(e) => { setPaymentDetails({...paymentDetails, cardNumber: e.target.value.replace(/[^\d ]/g, '')}); setErrors(errors.filter(err => err !== "cardNumber")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-[13px] outline-none transition-all ${errors.includes("cardNumber") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100 focus:border-orange-500'}`} />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5 px-1">
                            <label className="text-[12px] font-medium text-gray-400">expiry</label>
                            {errors.includes("expiry") && <span className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">!</span>}
                          </div>
                          <input type="text" maxLength={5} placeholder="MM/YY" value={paymentDetails.expiry} onChange={(e) => { setPaymentDetails({...paymentDetails, expiry: e.target.value}); setErrors(errors.filter(err => err !== "expiry")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-[13px] transition-all ${errors.includes("expiry") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5 px-1">
                            <label className="text-[12px] font-medium text-gray-400">cvv</label>
                            {errors.includes("cvv") && <span className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">!</span>}
                          </div>
                          <input type="text" maxLength={4} placeholder="123" value={paymentDetails.cvv} onChange={(e) => { setPaymentDetails({...paymentDetails, cvv: e.target.value.replace(/\D/g, '')}); setErrors(errors.filter(err => err !== "cvv")); }} className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-[13px] transition-all ${errors.includes("cvv") ? 'border-red-400 bg-red-50 ring-1 ring-red-400' : 'border-gray-100'}`} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button 
                    onClick={handleDetailsContinue}
                    className="w-full py-3.5 rounded-xl font-medium text-[13px] transition-all active:scale-95 flex items-center justify-center gap-2" 
                    style={{ backgroundColor: COLORS.primaryColor, color: "white" }}
                >
                  Verify details <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="animate-in zoom-in-95 duration-300 text-center">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[13px] font-medium text-gray-400 mb-3 hover:text-gray-600"><ChevronLeft size={14}/> Edit details</button>
                <h4 className="text-[15px] font-bold text-gray-800 mb-4">Confirm Transaction</h4>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 mb-6 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-[12px] text-gray-400 font-medium">Account holder</span>
                    <span className="text-[12px] text-gray-800 font-bold ">Gebregziabihier Nigusie</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[12px] text-gray-400 font-medium">Payment type</span>
                    <span className="text-[12px] text-gray-700 font-semibold">{mode === "subscription" ? `sub (${selectedPlan.label})` : "download"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[12px] text-gray-400 font-medium">Method</span>
                    <div className="flex items-center gap-1">
                      <img src={paymentMethods.find(p => p.id === selectedPayment)?.img} className="h-3 w-auto" alt="" />
                      <span className="text-[12px] text-gray-700 font-semibold">{selectedPayment}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-[13px] text-gray-600 font-bold">Total amount</span>
                    <span className="text-[13px] text-orange-600 font-black">{localConversion.unit} {localConversion.amount}</span>
                  </div>
                </div>

                <div className="mb-4 text-[11px] text-gray-400 font-bold tracking-tight">
                    Rate: 1 USD = {localConversion.rate} {localConversion.unit}
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={handleConfirmAction} 
                        disabled={isProcessing} 
                        className="flex-[2] py-4 rounded-xl font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-200" 
                        style={{ backgroundColor: COLORS.primaryColor, color: "white" }}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `Confirm and pay`}
                    </button>
                    <button 
                        onClick={resetAndClose}
                        disabled={isProcessing}
                        className="flex-1 py-4 border border-gray-100 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        cancel
                    </button>
                </div>
                <p className="mt-3 text-[12px] text-gray-400 px-4 leading-tight">by clicking confirm, you authorize the charge of the specified amount to your account.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionManager;