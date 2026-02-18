import React, { createContext, useContext, useState, ReactNode } from "react";
import axios from "axios";

interface FusionState {
  isFusing: boolean;
  url: string | null;
  error: string | null;
  metadata: {
    sound_id?: string;
    modern_sound?: string;
    heritage_sound?: string;
  } | null;
}

interface FusionContextType {
  fusionState: FusionState;
  startFusion: (formData: FormData, endpoint: string, meta: any) => Promise<void>;
  resetFusionState: () => void;
}

const FusionContext = createContext<FusionContextType | undefined>(undefined);

export const FusionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fusionState, setFusionState] = useState<FusionState>({
    isFusing: false,
    url: null,
    error: null,
    metadata: null,
  });

  const startFusion = async (formData: FormData, endpoint: string, meta: any) => {
    setFusionState({
      isFusing: true,
      url: null,
      error: null,
      metadata: meta,
    });

    try {
      const response = await axios.post(endpoint, formData, {
        responseType: "blob", // 🔥 critical
        timeout: 900000
      });

      const audioBlob = new Blob([response.data], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      setFusionState({
        isFusing: false,
        url: audioUrl,
        error: null,
        metadata: meta,
      });

    } catch (err: any) {
      setFusionState({
        isFusing: false,
        url: null,
        error: err.message || "fusion failed",
        metadata: meta,
      });
      throw err;
    }
  };

  const resetFusionState = () => {
    setFusionState({
      isFusing: false,
      url: null,
      error: null,
      metadata: null,
    });
  };

  return (
    <FusionContext.Provider value={{ fusionState, startFusion, resetFusionState }}>
      {children}
    </FusionContext.Provider>
  );
};

export const useFusion = () => {
  const context = useContext(FusionContext);
  if (!context) throw new Error("useFusion must be used within FusionProvider");
  return context;
};
