import { memo, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  AI_CHATS_UPDATED_EVENT,
  getRecentAiChats,
} from "../utils/aiChatStorage";

export default memo(function ChatButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { user, isAuthenticated } = useAuth();
  const isRtl = t.dir === "rtl";
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const widgetRef = useRef(null);
  const hideOnDocumentPages = location.pathname.toLowerCase().includes("/prescriptions");

  useEffect(() => {
    const refreshChats = () => {
      setRecentChats(isAuthenticated ? getRecentAiChats(user, 2) : []);
    };

    refreshChats();
    window.addEventListener(AI_CHATS_UPDATED_EVENT, refreshChats);
    window.addEventListener("storage", refreshChats);
    return () => {
      window.removeEventListener(AI_CHATS_UPDATED_EVENT, refreshChats);
      window.removeEventListener("storage", refreshChats);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!assistantOpen) return undefined;

    const closeOutside = (event) => {
      if (!widgetRef.current?.contains(event.target)) setAssistantOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAssistantOpen(false);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [assistantOpen]);

  const openConversation = (chatId) => {
    setAssistantOpen(false);
    navigate(`/ai-consultation?chat=${encodeURIComponent(chatId)}`);
  };

  const startConversation = (event) => {
    event.preventDefault();
    const message = draft.trim();
    setAssistantOpen(false);
    setDraft("");
    navigate(
      message
        ? `/ai-consultation?new=1&message=${encodeURIComponent(message)}`
        : "/ai-consultation?new=1",
    );
  };

  if (hideOnDocumentPages) return null;

  return (
    <div
      ref={widgetRef}
      className={`fixed bottom-20 z-40 flex flex-col gap-2.5 print:hidden md:bottom-6 ${
        isRtl ? "right-4 items-end md:right-6" : "left-4 items-start md:left-6"
      }`}
      style={{ fontFamily: "'Cairo', sans-serif", direction: "ltr" }}
    >
      {assistantOpen && (
        <div
          dir={t.dir}
          className="mb-1 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#d7e7e5] bg-white shadow-[0_24px_70px_rgba(8,64,54,0.22)]"
        >
          <div className="flex items-center justify-between bg-gradient-to-l from-[#2f7f7f] to-[#14b8a6] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Bot size={19} />
              </div>
              <div>
                <div className="text-sm font-extrabold">
                  {isRtl ? "مساعد ميدورا الذكي" : "Medora Smart Assistant"}
                </div>
                <div className="text-[10px] text-white/75">
                  {isRtl ? "ابدأ أو أكمل محادثتك" : "Start or continue a conversation"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssistantOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label={isRtl ? "إغلاق" : "Close"}
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4">
            {isAuthenticated && recentChats.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-extrabold text-[#5f7a7c]">
                  {isRtl ? "آخر محادثتين" : "Your latest conversations"}
                </div>
                <div className="space-y-2">
                  {recentChats.map((chat) => {
                    const lastMessage = chat.messages.at(-1)?.text || "";
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => openConversation(chat.id)}
                        className="w-full rounded-2xl border border-[#dcebea] bg-[#f7fbfb] px-3.5 py-3 text-start transition hover:border-[#14b8a6] hover:bg-[#eefaf8]"
                      >
                        <div className="truncate text-xs font-extrabold text-[#084036]">{chat.title}</div>
                        {lastMessage && (
                          <div className="mt-1 truncate text-[10px] text-slate-500">{lastMessage}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isAuthenticated && recentChats.length === 0 && (
              <p className="rounded-2xl bg-[#f7fbfb] px-3 py-2.5 text-center text-[11px] text-slate-500">
                {isRtl ? "لا توجد محادثات سابقة بعد" : "No previous conversations yet"}
              </p>
            )}

            <form onSubmit={startConversation} className={recentChats.length > 0 ? "mt-4" : "mt-1"}>
              <label className="mb-2 block text-[11px] font-extrabold text-[#5f7a7c]">
                {isRtl ? "محادثة جديدة" : "New conversation"}
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-[#d7e7e5] bg-white p-2 transition focus-within:border-[#14b8a6] focus-within:ring-3 focus-within:ring-[#14b8a6]/10">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={isRtl ? "اكتب سؤالك هنا..." : "Type your question..."}
                  className="h-9 min-w-0 flex-1 bg-transparent px-2 text-xs text-[#084036] outline-none"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#14b8a6] text-white transition hover:bg-[#119a8a]"
                  aria-label={isRtl ? "فتح محادثة جديدة" : "Start a new conversation"}
                >
                  <Send size={15} className={isRtl ? "rotate-180" : ""} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!assistantOpen && (
        <button
          dir={t.dir}
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-expanded={assistantOpen}
          aria-label={isRtl ? "فتح المساعد الذكي" : "Open smart assistant"}
          title={isRtl ? "المساعد الذكي" : "Smart Assistant"}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#14b8a6] text-white shadow-[0_12px_28px_rgba(20,184,166,0.3)] transition hover:-translate-y-1 hover:bg-[#119a8a]"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      <button
        dir={t.dir}
        type="button"
        onClick={() => navigate("/contact")}
        aria-label={isRtl ? "تواصل معنا" : "Contact us"}
        title={isRtl ? "تواصل معنا" : "Contact us"}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/90 text-white shadow-lg transition hover:-translate-y-1 hover:bg-black"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
});
