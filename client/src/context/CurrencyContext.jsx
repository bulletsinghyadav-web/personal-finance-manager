import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState('INR');

  useEffect(() => {
    if (user?.defaultCurrency) setDisplayCurrency(user.defaultCurrency);
  }, [user?.defaultCurrency]);

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
