import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface FusionContextType {
  fusionState: { isFusing: boolean; progress: number; url: string | null; error: boolean; showNotification: boolean; metadata: any };
  startFusion: (fd: FormData, apiBase: string, metadata: any) => Promise<void>;
  resetFusionState: () => void;
  closeNotification: () => void;
}

const FusionContext = createContext<FusionContextType | undefined>(undefined);

export const FusionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fusionState, setFusionState] = useState({
    isFusing: false, progress: 0, url: null as string | null, error: false, showNotification: false, metadata: null as any
  });

  const closeNotification = () => setFusionState(prev => ({ ...prev, showNotification: false }));
  const resetFusionState = () => setFusionState({ isFusing: false, progress: 0, url: null, error: false, showNotification: false, metadata: null });

  const startFusion = useCallback(async (fd: FormData, apiBase: string, metadata: any) => {
    setFusionState(prev => ({ ...prev, isFusing: true, progress: 0, error: false, showNotification: false, url: null, metadata }));
    const interval = setInterval(() => {
      setFusionState(prev => ({ ...prev, progress: prev.progress < 95 ? prev.progress + 2 : prev.progress }));
    }, 300);

    try {
      const res = await axios.post(`${apiBase}/api/fusion/process`, fd, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "audio/wav" });
      const fusedUrl = URL.createObjectURL(blob);
      
      const storageFd = new FormData();
      storageFd.append("audio", blob, "fused.wav");
      storageFd.append("sound_id", metadata.sound_id || "");
      storageFd.append("heritage_sound", metadata.heritage_sound || "unknown");
      storageFd.append("modern_sound", metadata.modern_sound || "modern");
      storageFd.append("user_mail", metadata.user_mail || "anonymous");
      storageFd.append("community", metadata.community || "general");
      await axios.post(`${apiBase}/api/fusion/save`, storageFd);

      setFusionState(prev => ({ ...prev, isFusing: false, progress: 100, url: fusedUrl, showNotification: true }));
    } catch (e) {
      setFusionState(prev => ({ ...prev, isFusing: false, error: true, showNotification: true }));
    } finally {
      clearInterval(interval);
    }
  }, []);

  return (
    <FusionContext.Provider value={{ fusionState, startFusion, resetFusionState, closeNotification }}>
      {children}
      {fusionState.showNotification && (
        <div className="fixed bottom-6 right-6 z-[300] w-80 p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-5 bg-white border-gray-100" style={{ borderLeft: `4px solid ${fusionState.error ? '#ef4444' : '#22c55e'}` }}>
          <div className="flex items-start gap-3">
            {fusionState.error ? <AlertCircle className="text-red-500 shrink-0" /> : <CheckCircle2 className="text-green-500 shrink-0" />}
            <div className="flex-1 text-left">
              <h4 className="text-[13px] font-bold text-gray-900">{fusionState.error ? "fusion failed" : "fusion complete"}</h4>
              <p className="text-[11px] opacity-70 mt-1 text-gray-500">{fusionState.error ? "something went wrong." : `track "${fusionState.metadata?.heritage_sound || 'unknown'}" is ready.`}</p>
            </div>
            <button onClick={closeNotification} className="opacity-40 hover:opacity-100"><X size={14}/></button>
          </div>
        </div>
      )}
    </FusionContext.Provider>
  );
};

export const useFusion = () => {
  const context = useContext(FusionContext);
  if (!context) throw new Error("usefusion must be used within fusionprovider");
  return context;
};