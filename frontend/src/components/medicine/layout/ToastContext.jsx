import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          dir="rtl"
          style={{ fontFamily: 'Cairo, sans-serif', background: '#14b8a6' }}
          className="fixed top-4 right-4 z-[9999] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fadeInUp"
        >
          <span className="font-bold text-lg">✓</span>
          <span className="text-[14px] font-medium">{toast}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
