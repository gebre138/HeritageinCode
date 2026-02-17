import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface FusionAnalysis {
  h: number;
  p: number;
  label: string;
}

interface FusionState {
  isFusing: boolean;
  progress: number;
  url: string | null;
  error: string | null;
  analysis: FusionAnalysis | null;
}

interface FusionContextType {
  fusionState: FusionState;
  startFusion: (formData: FormData, endpoint: string, metadata: any) => Promise<void>;
  resetFusionState: () => void;
}

const FusionContext = createContext<FusionContextType | undefined>(undefined);

export const useFusion = () => {
  const context = useContext(FusionContext);
  if (!context) {
    throw new Error('useFusion must be used within FusionProvider');
  }
  return context;
};

export const FusionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fusionState, setFusionState] = useState<FusionState>({
    isFusing: false,
    progress: 0,
    url: null,
    error: null,
    analysis: null
  });

  const resetFusionState = () => {
    setFusionState({
      isFusing: false,
      progress: 0,
      url: null,
      error: null,
      analysis: null
    });
  };

  const startFusion = async (formData: FormData, endpoint: string, metadata: any) => {
    setFusionState(prev => ({ ...prev, isFusing: true, progress: 0, error: null }));
    
    try {
      const progressInterval = setInterval(() => {
        setFusionState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 1000);

      const response = await axios.post(endpoint, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFusionState(prev => ({ ...prev, progress: Math.min(percentCompleted, 50) }));
          }
        }
      });

      clearInterval(progressInterval);
      
      const harmonicPercent = parseFloat(response.headers['x-harmonic-percent'] || '0');
      const percussivePercent = parseFloat(response.headers['x-percussive-percent'] || '0');
      const analysisLabel = response.headers['x-analysis-label'] || 'balanced fusion';

      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      setFusionState({
        isFusing: false,
        progress: 100,
        url: audioUrl,
        error: null,
        analysis: {
          h: harmonicPercent,
          p: percussivePercent,
          label: analysisLabel
        }
      });

    } catch (error: any) {
      console.error('Fusion error:', error);
      setFusionState({
        isFusing: false,
        progress: 0,
        url: null,
        error: error.response?.data?.error || error.message || 'Fusion failed',
        analysis: null
      });
    }
  };

  return (
    <FusionContext.Provider value={{ fusionState, startFusion, resetFusionState }}>
      {children}
    </FusionContext.Provider>
  );
};