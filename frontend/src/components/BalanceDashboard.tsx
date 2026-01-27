import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { COLORS } from "./supportives/colors";
import { Loader2, FileText, FileSpreadsheet, Mail, Download, Landmark, X, CheckCircle2, Search, ClipboardList, Check, Home, ArrowRightLeft } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: number;
  display_id: string;
  track_title: string;
  amount: string | number;
  payer_email: string;
  payer_name: string;
  created_at: string;
  category: string;
  expiry_date?: string | null;
}

interface UserProps {
  email: string | null;
  role: "user" | "admin" | "superadmin";
}

interface PlatformBalance {
  holder_name: string;
  holder_type: string;
  balance: number;
  withdraw_account?: string;
  account_type?: string;
}

const BalanceDashboard: React.FC<{ currentUser: UserProps }> = ({ currentUser }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [earnedBalance, setEarnedBalance] = useState<number>(0);
  const [platformBalances, setPlatformBalances] = useState<PlatformBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isConfiguringWithdraw, setIsConfiguringWithdraw] = useState(false);
  const [isConfirmingWithdraw, setIsConfirmingWithdraw] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSuccessData, setEmailSuccessData] = useState<{ email: string; id: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawDetails, setWithdrawDetails] = useState({ account: "", type: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [rates, setRates] = useState({ ETB: 125.0, KES: 130.0 });

  const API_BASE = process.env.REACT_APP_API_URL || "https://heritage-backend-f24y.onrender.com";

  const fetchLiveExchangeRates = useCallback(async () => {
    try {
      const response = await axios.get("https://open.er-api.com/v6/latest/USD");
      if (response.data && response.data.rates) {
        setRates({
          ETB: response.data.rates.ETB || 125.0,
          KES: response.data.rates.KES || 130.0
        });
      }
    } catch (err) {
      console.warn("failed to fetch live official rates, using fallback", err);
    }
  }, []);

  const localConversion = useMemo(() => {
    const usd = Number(withdrawAmount) || 0;
    if (withdrawDetails.type === 'M-Pesa') {
      return { amount: (usd * rates.KES).toFixed(2), unit: "KES", rate: rates.KES };
    }
    if (withdrawDetails.type === 'telebirr') {
      return { amount: (usd * rates.ETB).toFixed(2), unit: "ETB", rate: rates.ETB };
    }
    return { amount: usd.toFixed(2), unit: "USD", rate: 1 };
  }, [withdrawAmount, withdrawDetails.type, rates]);

  const fetchData = useCallback(async () => {
    if (!currentUser.email) return;
    try {
      setLoading(true);
      await fetchLiveExchangeRates();
      const [txRes, balRes, platRes, holderRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/transactions/all`),
        axios.get(`${API_BASE}/api/transactions/get-balance/${currentUser.email}`),
        axios.get(`${API_BASE}/api/transactions/platform-balances`),
        axios.get(`${API_BASE}/api/transactions/holder-balances`)
      ]);

      if (txRes.status === 'fulfilled' && txRes.value.data.success) {
        let data = txRes.value.data.data;
        if (currentUser.role !== "superadmin") {
          data = data.filter((t: Transaction) => t.payer_email === currentUser.email);
        }
        setTotalSpent(data.reduce((sum: number, t: Transaction) => sum + Number(t.amount || 0), 0));
        setTransactions(data);
      }
      if (balRes.status === 'fulfilled' && balRes.value.data.success) {
        setEarnedBalance(Number(balRes.value.data.balance || 0));
      }
      if (platRes.status === 'fulfilled' && platRes.value.data.success) {
        setPlatformBalances(platRes.value.data.data);
      }
      if (holderRes.status === 'fulfilled' && holderRes.value.data.success) {
        const mine = holderRes.value.data.data.find((b: any) => b.holder_name === currentUser.email);
        if (mine) {
          setWithdrawDetails({ 
            account: mine.withdraw_account || "", 
            type: mine.account_type || "" 
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, currentUser.email, currentUser.role, fetchLiveExchangeRates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveAccount = async () => {
    if (!withdrawDetails.account.trim()) {
        setErrors(["withdraw_account"]);
        return;
    }
    setErrors([]);
    try {
      await axios.post(`${API_BASE}/api/transactions/update-withdraw-account`, {
        email: currentUser.email,
        withdraw_account: withdrawDetails.account,
        account_type: withdrawDetails.type
      });
      fetchData();
    } catch (err) {
      alert("update failed");
    }
  };

  const processWithdrawal = async () => {
    const amt = Number(withdrawAmount);
    if (!withdrawAmount || amt <= 0 || amt > earnedBalance) {
        setErrors(["withdraw_amount"]);
        return;
    }
    setErrors([]);
    setProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/api/transactions/process-withdrawal`, {
        email: currentUser.email,
        amount: amt,
        local_amount: localConversion.amount,
        local_currency: localConversion.unit,
        exchange_rate: localConversion.rate,
        account_details: withdrawDetails.account,
        payment_method: withdrawDetails.type
      });
      if (res.data.success) {
        setIsConfirmingWithdraw(false);
        setIsSuccess(true);
        setWithdrawAmount("");
        fetchData();
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "error processing withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const createReceiptPDF = (tx: Transaction) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cat = (tx.category || "").toUpperCase();
    let dynamicDesc = cat.includes("SUBSCRIPTION") 
      ? `subscription expiry: ${getSubscriptionExpiry(tx)}` 
      : `track purchase: ${tx.track_title || "digital content"}`;
    const dateLabel = new Date(tx.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("HERITAGE IN CODE", 15, 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("electronic payment receipt", 15, 23);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER INFO", 15, 45);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(tx.payer_name || "valued customer", 15, 50);
    doc.text(tx.payer_email, 15, 54);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION DETAILS", 140, 45);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Ref: ${tx.display_id}`, 140, 50);
    doc.text(`Date: ${dateLabel}`, 140, 54);
    doc.text(`Status: COMPLETED`, 140, 58);
    autoTable(doc, {
      startY: 70,
      head: [['Product Description', 'Price (USD)']],
      body: [[{ content: dynamicDesc }, `$${Number(tx.amount).toFixed(2)}` ]],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1 },
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      columnStyles: { 1: { halign: 'right', cellWidth: 40 } }
    });
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT PAID", 140, finalY + 10);
    doc.text(`$${Number(tx.amount).toFixed(2)}`, 195, finalY + 10, { align: "right" });
    return doc;
  };

  const handleSendEmail = async (tx: Transaction) => {
    try {
      setEmailingId(tx.display_id);
      const response = await axios.post(`${API_BASE}/api/transactions/send-receipt-email`, {
        email: tx.payer_email,
        name: tx.payer_name,
        txData: {
          transaction_id: tx.display_id,
          amount: tx.amount,
          created_at: tx.created_at,
          payer_email: tx.payer_email,
          variant: tx.category,
          track_title: tx.track_title,
          expiry_date: tx.expiry_date
        }
      });
      if (response.data.success) {
        setEmailSuccessData({ email: tx.payer_email, id: tx.display_id });
        setShowEmailModal(true);
      }
    } catch (err: any) {
      alert("failed to send email. check backend logs.");
    } finally {
      setEmailingId(null);
    }
  };

  const downloadExcel = () => {
    const headers = ["Transaction ID", "Date", "Payer Name", "Payer Email", "Category", "Item", "Amount"];
    const rows = filteredTransactions.map(tx => [tx.display_id, new Date(tx.created_at).toLocaleString(), tx.payer_name, tx.payer_email, tx.category, tx.track_title, Number(tx.amount).toFixed(2)]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Registry_Report.csv`);
    link.click();
    setShowDownloadOptions(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setTextColor(217, 119, 6);
    doc.text("Heritage in code", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`financial report: ${currentUser.email}`, pageWidth / 2, 30, { align: "center" });
    doc.text(`generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: "center" });
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.line(14, 40, pageWidth - 14, 40);

    if (currentUser.role === "superadmin") {
      const devBalance = Number(platformBalances.find(b => b.holder_name === 'Heritage Developers')?.balance || 0);
      const witsBalance = Number(platformBalances.find(b => b.holder_name === 'Wits')?.balance || 0);
      const heritageRev = transactions.filter(t => t.category.toUpperCase().includes('HERITAGE')).reduce((s, t) => s + Number(t.amount), 0);
      const fusionRev = transactions.filter(t => t.category.toUpperCase().includes('FUSED')).reduce((s, t) => s + Number(t.amount), 0);
      const subscriptionRev = transactions.filter(t => t.category.toUpperCase() === 'SUBSCRIPTION').reduce((s, t) => s + Number(t.amount), 0);
      doc.setFontSize(11);
      doc.setTextColor(217, 119, 6);
      doc.text("Revenue Detail", 14, 48);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Total Revenue: $${totalSpent.toFixed(2)}`, 14, 56);
      doc.text(`Developer Revenue: $${devBalance.toFixed(2)}`, 14, 61);
      doc.text(`Funder (Wits) Revenue: $${witsBalance.toFixed(2)}`, 14, 66);
      doc.setTextColor(217, 119, 6);
      doc.setFontSize(11);
      doc.text("Revenue from tracks", 110, 48);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Heritage Download Revenue: $${heritageRev.toFixed(2)}`, 110, 56);
      doc.text(`Fusion Download Revenue: $${fusionRev.toFixed(2)}`, 110, 61);
      doc.text(`Subscription Revenue: $${subscriptionRev.toFixed(2)}`, 110, 66);
    }

    const tableRows = filteredTransactions.map(tx => [
      tx.display_id, 
      new Date(tx.created_at).toLocaleDateString(), 
      tx.payer_name, 
      tx.category.toUpperCase() === "SUBSCRIPTION" ? `EXPIRY: ${getSubscriptionExpiry(tx)}` : `${tx.category}: ${tx.track_title}`, 
      `$${Number(tx.amount).toFixed(2)}`
    ]);
    autoTable(doc, { 
      startY: currentUser.role === "superadmin" ? 78 : 45, 
      head: [['ID', 'Date', 'Payer', 'Item', 'Amount']], 
      body: tableRows, 
      theme: 'striped', 
      headStyles: { fillColor: [217, 119, 6] } 
    });
    doc.save(`Financial_Report_${new Date().getTime()}.pdf`);
    setShowDownloadOptions(false);
  };

  const filteredTransactions = transactions.filter(t => 
    t.display_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.payer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.payer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWithdrawalNext = () => {
    if (!withdrawDetails.account.trim()) {
        setErrors(["withdraw_account"]);
        return;
    }
    setErrors([]);
    setIsConfiguringWithdraw(false);
    setIsConfirmingWithdraw(true);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  const getSubscriptionExpiry = (tx: Transaction) => {
    if (tx.expiry_date) return formatDate(tx.expiry_date);
    const startDate = new Date(tx.created_at);
    const fallbackExpiry = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    return formatDate(fallbackExpiry.toISOString());
  };

  const getBrandIcon = (tx: Transaction) => {
    const desc = (tx.category + tx.track_title + tx.display_id).toLowerCase();
    if (desc.includes("visa") || desc.includes("vis")) return <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-2 w-auto object-contain" alt="Visa" />;
    if (desc.includes("master") || desc.includes("mas")) return <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-3 w-auto object-contain" alt="Mastercard" />;
    if (desc.includes("mpesa") || desc.includes("mpe")) return <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" className="h-3 w-auto object-contain" alt="M-Pesa" />;
    if (desc.includes("telebirr") || desc.includes("tel")) return <img src="/telebirr.png" className="h-4 w-auto object-contain" alt="telebirr" />;
    if (tx.category.toLowerCase().includes("subscription")) return <Home size={12} className="text-amber-600" />;
    return <Landmark size={12} className="text-gray-400" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="animate-spin text-amber-600" size={32} /><p className="text-gray-400 text-xs">syncing data...</p></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 shadow-sm">
          <p className="text-[9px] tracking-widest text-amber-600 font-bold mb-1">Balance</p>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-amber-700 truncate">${earnedBalance.toFixed(2)}</h2>
            <button onClick={() => setIsConfiguringWithdraw(true)} className="flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-sm flex-shrink-0">
              <Landmark size={10} /><span className="text-[10px] font-bold">Withdraw</span>
            </button>
          </div>
        </div>
        {currentUser.role === "superadmin" && (
          <>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] tracking-widest text-gray-400 font-bold mb-1">Dev share</p>
              <h2 className="text-lg font-bold text-gray-800 truncate">${Number(platformBalances.find(b => b.holder_name === 'Heritage Developers')?.balance || 0).toFixed(2)}</h2>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] tracking-widest text-gray-400 font-bold mb-1">Funders share</p>
              <h2 className="text-lg font-bold text-gray-800 truncate">${Number(platformBalances.find(b => b.holder_name === 'Wits')?.balance || 0).toFixed(2)}</h2>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] tracking-widest text-gray-400 font-bold mb-1">Total transaction</p>
              <h2 className="text-lg font-bold text-gray-800 truncate">${totalSpent.toFixed(2)}</h2>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: COLORS.borderLight }}>
        <div className="px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50" style={{ borderColor: COLORS.borderLight }}>
          <h3 className="text-[12px] font-bold tracking-widest text-gray-500">Transaction Detail</h3>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input type="text" placeholder="search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[9px] w-full md:w-48 outline-none focus:border-amber-400 transition-all" />
            </div>
            <div className="relative">
              <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all">
                <ClipboardList size={10} /><span className="text-[11px] font-bold">Reports</span>
              </button>
              {showDownloadOptions && (
                <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-xl z-50 overflow-hidden w-36">
                  <button onClick={downloadPDF} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-gray-600 hover:bg-amber-50 border-b border-gray-50"><FileText size={12} /> PDF Report</button>
                  <button onClick={downloadExcel} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-gray-600 hover:bg-amber-50"><FileSpreadsheet size={12} /> CSV Export</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] tracking-widest text-gray-400 border-b bg-gray-50/30">
                <th className="px-4 py-3 text-left font-bold uppercase">Transaction ID</th>
                <th className="px-4 py-3 text-left font-bold uppercase">Date</th>
                <th className="px-4 py-3 text-left font-bold uppercase">Payer</th>
                <th className="px-4 py-3 text-left font-bold uppercase">Payment Details</th>
                <th className="px-4 py-3 text-right font-bold uppercase">Amount</th>
                <th className="px-4 py-3 text-center font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map((tx, idx) => (
                <tr key={`${tx.id}-${tx.display_id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-[9px] font-mono text-amber-700">{tx.display_id}</td>
                  <td className="px-4 py-3 text-[9px] text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-medium block">{tx.payer_name}</span><span className="text-[10px] text-gray-400 block">{tx.payer_email}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        {getBrandIcon(tx)}
                        <span className="text-[10px] text-amber-600 font-bold uppercase">{tx.category}</span>
                    </div>
                    <span className="text-[9px] text-gray-500 block truncate max-w-[150px] font-medium">
                      {tx.category.toUpperCase() === "SUBSCRIPTION" 
                        ? `expiry: ${getSubscriptionExpiry(tx)}` 
                        : (tx.track_title || "access pass")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] font-bold">${Number(tx.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => { const d = createReceiptPDF(tx); d.save(`${tx.display_id}.pdf`); }} title="Download PDF" className="p-1.5 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-colors"><Download size={10} /></button>
                      <button onClick={() => handleSendEmail(tx)} disabled={emailingId !== null} title="Email Receipt" className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50">
                        {emailingId === tx.display_id ? <Loader2 size={10} className="animate-spin" /> : <Mail size={10} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isConfiguringWithdraw && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border relative">
            <button onClick={() => { setIsConfiguringWithdraw(false); setErrors([]); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4">payout method</h3>
            <div className="space-y-2 mb-4">
              {[
                { id: 'PayPal', img: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg', h: 'h-3' },
                { id: 'M-Pesa', img: 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg', h: 'h-4' },
                { id: 'telebirr', img: '/telebirr.png', h: 'h-6' },
                { id: 'Bank Transfer', icon: <Landmark size={14} className="text-gray-400" /> }
              ].map((method) => (
                <div key={method.id} onClick={() => { setWithdrawDetails({...withdrawDetails, type: method.id}); setErrors([]); }} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${withdrawDetails.type === method.id ? 'border-amber-500 bg-amber-50/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    {method.img ? <img src={method.img} className={`${method.h} w-auto`} alt={method.id} /> : method.icon}
                    <span className="text-[10px] font-bold text-gray-700 uppercase">{method.id}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${withdrawDetails.type === method.id ? 'bg-amber-600 border-amber-600' : 'bg-white border-gray-200'}`}>
                    {withdrawDetails.type === method.id && <Check size={10} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
            {withdrawDetails.type && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-1 px-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">account identifier</p>
                    {errors.includes("withdraw_account") && <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Required</span>}
                  </div>
                  <input className={`w-full px-3 py-2.5 border rounded-xl text-xs outline-none transition-all ${errors.includes("withdraw_account") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-amber-400 bg-gray-50'}`} placeholder={withdrawDetails.type === 'PayPal' ? "paypal email address" : "account number / phone"} value={withdrawDetails.account} onChange={e => { setWithdrawDetails({...withdrawDetails, account: e.target.value}); setErrors(errors.filter(err => err !== "withdraw_account")); }} />
                  <div className="flex gap-2 pt-2">
                      <button onClick={saveAccount} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-200">update info</button>
                      <button onClick={handleWithdrawalNext} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-amber-700 shadow-sm">next step</button>
                  </div>
                </div>
            )}
          </div>
        </div>
      )}

      {isConfirmingWithdraw && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border relative text-center">
            <button onClick={() => { setIsConfirmingWithdraw(false); setErrors([]); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-6">withdraw funds</h3>
            <p className="text-[10px] text-gray-400 mb-1">Available to payout</p>
            <h4 className="text-2xl font-bold text-gray-900 mb-6">${earnedBalance.toFixed(2)}</h4>
            <div className="relative mb-6">
                <div className="flex justify-between items-center mb-1 px-1">
                   <p className="text-[9px] text-gray-400 font-bold uppercase">amount to payout (USD)</p>
                   {errors.includes("withdraw_amount") && <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Invalid Amount</span>}
                </div>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm font-medium outline-none transition-all ${errors.includes("withdraw_amount") ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-amber-400'}`} placeholder="0.00" value={withdrawAmount} onChange={e => { setWithdrawAmount(e.target.value); setErrors(errors.filter(err => err !== "withdraw_amount")); }} />
                </div>
                {Number(withdrawAmount) > earnedBalance && <p className="text-[10px] text-red-500 mt-1 text-left px-1 font-bold italic">insufficient balance available</p>}
            </div>

            {withdrawAmount && Number(withdrawAmount) > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center animate-in zoom-in-95">
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-2">estimated payout ({localConversion.unit})</p>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-gray-400">$ {withdrawAmount}</span>
                        </div>
                        <ArrowRightLeft size={12} className="text-amber-500" />
                        <div className="text-left">
                            <span className="block text-sm font-black text-amber-600">{localConversion.unit} {localConversion.amount}</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 italic">rate: 1 USD = {localConversion.rate} {localConversion.unit}</p>
                    <p className="text-[9px] text-gray-300 uppercase tracking-tighter mt-1">source: official online rates</p>
                </div>
            )}

            <button disabled={processing || !withdrawAmount || Number(withdrawAmount) > earnedBalance} onClick={processWithdrawal} className="w-full py-3 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2">
              {processing ? (
                <>
                  <Loader2 className="animate-spin" size={12} />
                  <span>processing...</span>
                </>
              ) : (
                "confirm transfer"
              )}
            </button>
          </div>
        </div>
      )}

      {showEmailModal && emailSuccessData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-amber-100 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed mb-6">
              The electronic payment receipt for transaction <span className="text-amber-600 font-mono font-bold">{emailSuccessData.id}</span> has been sent to <span className="font-bold text-gray-800">{emailSuccessData.email}</span>.
            </p>
            <button onClick={() => setShowEmailModal(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-[12px] tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
              Closed
            </button>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={14} className="text-green-500" /> <span className="text-[9px] font-bold uppercase tracking-widest">withdrawal successful</span>
        </div>
      )}
    </div>
  );
};

export default BalanceDashboard;