import React from "react";
import { COUNTRIES } from "./supportives/countries";
import { COLORS } from "./supportives/colors";

export const getCountryFlagUrl = (countryName: string): string => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ? `https://flagcdn.com/w20/${country.code.toLowerCase()}.png` : "";
};

export const selectStyles = {
  control: (b: any, state: any) => ({
    ...b, minHeight: '32px', fontSize: '12px', minWidth: '150px',
    borderColor: state.selectProps?.error ? COLORS.dangerColor : b.borderColor,
    '&:hover': { borderColor: state.selectProps?.error ? COLORS.dangerColor : b.borderColor }
  }),
  option: (b: any) => ({ ...b, fontSize: '12px' }),
  singleValue: (b: any) => ({ ...b, fontSize: '12px' }),
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 })
};

interface ActionModalProps {
  show: boolean;
  title: string;
  type: "approve" | "reject" | "unapprove" | "confirm" | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
  description?: string;
}

export const ActionModal: React.FC<ActionModalProps> = ({ show, title, type, isProcessing, onConfirm, onClose, description }) => {
  if (!show) return null;
  const isDanger = type === "reject" || type === "unapprove";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: COLORS.bgBlackOverlay, backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border" style={{ borderColor: COLORS.bgLight }}>
        <h4 className="font-semibold text-xl mb-2" style={{ color: COLORS.primaryBlack }}>
          {type === "approve" ? "Approve track" : type === "unapprove" ? "Remove from library" : type === "reject" ? "Reject and delete" : "Confirm Action"}
        </h4>
        <p className="text-base mb-6" style={{ color: COLORS.textColor }}>
          {description || `Confirm action for ${title}?`}
        </p>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={onConfirm} 
            disabled={isProcessing} 
            className="flex-[2] min-w-[100px] px-4 py-2.5 rounded-xl text-sm border flex items-center justify-center gap-2 transition-colors"
            style={{ 
              backgroundColor: isDanger ? COLORS.dangerBg : COLORS.lightColor,
              color: isDanger ? COLORS.dangerText : COLORS.primaryColor,
              borderColor: isDanger ? COLORS.dangerBorder : COLORS.borderOrange
            }}
          >
            {isProcessing ? <><div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div><span>Processing</span></> : "Confirm"}
          </button>
          <button onClick={onClose} className="flex-1 min-w-[80px] text-sm font-semibold" style={{ color: COLORS.textGray }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ active: boolean; trueText: string; falseText: string }> = ({ active, trueText, falseText }) => (
  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight border" style={{ backgroundColor: active ? COLORS.successBg : COLORS.dangerBg, color: active ? "#16a34a" : COLORS.dangerText, borderColor: active ? COLORS.successBorder : COLORS.dangerBorder }}>
    {active ? trueText : falseText}
  </span>
);

export const SectionHeader: React.FC<{ title: string; light?: boolean }> = ({ title, light }) => (
  <h2 className="text-3xl font-bold text-center mb-10 uppercase tracking-tight" style={{ color: light ? COLORS.primaryBlack : COLORS.textDark }}>{title}</h2>
);

export const ContributorBadge: React.FC<{ visible: boolean; trackId: string; onShow: (id: string) => void; tooltipVisible: boolean }> = ({ visible, trackId, onShow, tooltipVisible }) => {
  if (!visible) return null;
  return (
    <div className="relative flex items-center">
      <div className="shrink-0 cursor-pointer active:scale-110 transition-transform" style={{ color: "#FACC15" }} onClick={(e) => { e.stopPropagation(); onShow(trackId); }}>
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
      </div>
      {tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in duration-200" style={{ backgroundColor: COLORS.textDark }}>
          Your upload
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: COLORS.textDark }}></div>
        </div>
      )}
    </div>
  );
};

export const TeamMember: React.FC<{ name: string; role: string; img: string; linkedin: string; email: string }> = ({ name, role, img, linkedin, email }) => (
  <div className="flex items-center gap-4 group">
    <img src={img} alt={name} className="w-12 h-12 rounded-full object-cover border transition-all group-hover:scale-105" style={{ borderColor: COLORS.bgGray }} loading="lazy" />
    <div className="flex-1">
      <h4 className="text-[13px] font-bold leading-tight" style={{ color: COLORS.textDark }}>{name}</h4>
      <p className="text-[10px] font-semibold tracking-wider mb-1" style={{ color: COLORS.primaryColor }}>{role}</p>
      <div className="flex gap-3">
        <a href={linkedin} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-colors" style={{ color: "#0077b5" }}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
        <a href={email} className="hover:opacity-80 transition-colors" style={{ color: COLORS.primaryColor }}><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-9.458l4.623 3.746zm-4.141-5.929h19.035l-9.517 7.713-9.518-7.713zm5.694 7.188l3.824 3.099 3.83-3.104 5.612 8.818h-18.895l5.629-8.813zm9.201-1.259l4.623-3.746v9.458l-4.623-5.712z"/></svg></a>
      </div>
    </div>
  </div>
);

/** NEW OPTIMIZED FORM HELPERS **/
export const FormField: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textLight }}>{label}</label>
    {children}
    {error && <p className="text-[9px]" style={{ color: COLORS.dangerColor }}>{error}</p>}
  </div>
);

export const FormContainer: React.FC<{ title: string; onModeToggle?: () => void; modeLabel?: string; children: React.ReactNode }> = ({ title, onModeToggle, modeLabel, children }) => (
  <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ borderColor: COLORS.borderLight }}>
    <div className="px-4 py-2 border-b flex justify-between items-center" style={{ backgroundColor: COLORS.bgSlate, borderColor: COLORS.borderLight }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.textLight }}>{title}</span>
      {onModeToggle && (
        <button onClick={onModeToggle} className="text-[10px] uppercase font-bold px-4 py-1.5 bg-white border rounded-full shadow-sm" style={{ borderColor: COLORS.borderLight }}>{modeLabel}</button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);