'use client';
import { createContext, useContext, useState } from 'react';

type KassaContextType = {
  cafes: any[];
  setCafes: (val: any[]) => void;
  totals: any | null;
  setTotals: (val: any) => void;
};

const KassaContext = createContext<KassaContextType | undefined>(undefined);

export function KassaProvider({ children }: { children: React.ReactNode }) {
  const [cafes, setCafes] = useState<any[]>([]);
  const [totals, setTotals] = useState<any | null>(null);

  return (
    <KassaContext.Provider value={{ cafes, setCafes, totals, setTotals }}>
      {children}
    </KassaContext.Provider>
  );
}

export const useKassa = () => {
  const context = useContext(KassaContext);
  if (!context)
    throw new Error('useKassa должен использоваться внутри KassaProvider');
  return context;
};
