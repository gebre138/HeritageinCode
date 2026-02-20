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
  setFusionUrl: (url: string, meta?: any) => void;
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

  const setFusionUrl = (url: string, meta?: any) => {
    setFusionState(prev => ({
      ...prev,
      url: url,
      isFusing: false,
      error: null,
      metadata: meta || prev.metadata
    }));
  };

  const startFusion = async (formData: FormData, endpoint: string, meta: any) => {
    setFusionState({
      isFusing: true,
      url: null,
      error: null,
      metadata: meta,
    });

    try {
      const response = await axios.post(endpoint, formData, {
        responseType: "blob",
        timeout: 900000,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'audio/wav'
        }
      });

      if (response.data && response.data.size > 0) {
        const audioBlob = new Blob([response.data], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);

        setFusionState({
          isFusing: false,
          url: audioUrl,
          error: null,
          metadata: meta,
        });
      } else {
        throw new Error("the engine returned an empty audio file");
      }

    } catch (err: any) {
      console.error("fusion error details:", err);
      setFusionState(prev => ({
        ...prev,
        isFusing: false,
        url: null,
        error: err.response?.data?.message || err.message || "fusion failed",
      }));
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
    <FusionContext.Provider value={{ fusionState, startFusion, setFusionUrl, resetFusionState }}>
      {children}
    </FusionContext.Provider>
  );
};

export const useFusion = () => {
  const context = useContext(FusionContext);
  if (!context) throw new Error("useFusion must be used within FusionProvider");
  return context;
};