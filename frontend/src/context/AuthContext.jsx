import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { clearSession, getStoredUser, setSession } from "../api/client";
import { medoraApi } from "../api/medoraApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [sessionExpired, setSessionExpired] = useState(() => {
        try {
            const flag = sessionStorage.getItem("medora_session_expired");
            sessionStorage.removeItem("medora_session_expired");
            return flag === "1";
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const syncStoredSession = () => setUser(getStoredUser());
        const clearExpiredSession = (e) => {
            setUser(null);
            if (e?.detail?.wasAuthenticated) setSessionExpired(true);
        };

        window.addEventListener("storage", syncStoredSession);
        window.addEventListener("medora:auth-expired", clearExpiredSession);

        return () => {
            window.removeEventListener("storage", syncStoredSession);
            window.removeEventListener("medora:auth-expired", clearExpiredSession);
        };
    }, []);

    useEffect(() => {
        if (!sessionExpired) return;
        const timer = setTimeout(() => setSessionExpired(false), 6000);
        return () => clearTimeout(timer);
    }, [sessionExpired]);

    useEffect(() => {
        if (!user?.preferredLanguage) return;
        void import("../utils/languagePreference").then(({ applyServerLanguagePreference }) => {
            void applyServerLanguagePreference(user.preferredLanguage);
        });
    }, [user?.preferredLanguage]);

    const login = useCallback((userData) => {
        setSession(userData);
        setUser(userData);
        void import("../utils/languagePreference").then(({ applyServerLanguagePreference }) => {
            void applyServerLanguagePreference(userData?.preferredLanguage);
        });
    }, []);

    const logout = useCallback(async () => {
        await medoraApi.logout().catch(() => undefined);
        clearSession();
        setUser(null);
        setSessionExpired(false);
    }, []);

    const refreshMe = useCallback(async () => {
        const me = await medoraApi.me();
        const nextUser = { ...getStoredUser(), ...me };
        setSession(nextUser);
        setUser(nextUser);
        void import("../utils/languagePreference").then(({ applyServerLanguagePreference }) => {
            void applyServerLanguagePreference(nextUser?.preferredLanguage);
        });
        return nextUser;
    }, []);

    const value = useMemo(() => ({ user, login, logout, refreshMe, isAuthenticated: Boolean(user?.token) }), [user, login, logout, refreshMe]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {sessionExpired && <SessionExpiredBanner onClose={() => setSessionExpired(false)} />}
        </AuthContext.Provider>
    );
}

function SessionExpiredBanner({ onClose }) {
    const isRtl = typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";
    return (
        <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed top-4 left-1/2 z-[10000] -translate-x-1/2 rounded-xl bg-[#119a8a] px-5 py-3 text-white shadow-lg flex items-center gap-3"
            style={{ fontFamily: "'Cairo', sans-serif" }}
        >
            <span className="text-sm font-bold">
                {isRtl ? "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى" : "Your session has expired. Please sign in again."}
            </span>
            <button onClick={onClose} className="text-white/80 hover:text-white text-lg font-bold leading-none">×</button>
        </div>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
