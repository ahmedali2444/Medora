import { useEffect, useState } from "react";

export default function AuthNoticeBanner() {
  const [message, setMessage] = useState(() => {
    try {
      const notice = sessionStorage.getItem("medora_auth_notice");
      if (notice) sessionStorage.removeItem("medora_auth_notice");
      return notice || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const isRtl = typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed top-4 left-1/2 z-[10000] -translate-x-1/2 rounded-xl bg-[#119a8a] px-5 py-3 text-white shadow-lg flex items-center gap-3 max-w-[90vw]"
    >
      <span className="text-sm font-bold">{message}</span>
      <button
        type="button"
        onClick={() => setMessage("")}
        className="text-white/80 hover:text-white text-lg font-bold leading-none"
      >
        ×
      </button>
    </div>
  );
}
