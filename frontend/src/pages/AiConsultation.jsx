import { memo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Plus, MessageSquare, ChevronRight, ChevronLeft, MoreVertical, Paperclip, Pencil, Share2, Trash2, X } from "lucide-react";
import Logo from "../assets/images/Logo.png";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import {
    getAiChatUserKey,
    readAiChats,
    writeAiChats,
} from "../utils/aiChatStorage";
import { deleteAiConversation, sendAiMessage, AI_FALLBACK_MESSAGE, AI_MAINTENANCE_MESSAGE } from "../api/aiApi";

const SIDEBAR_COLOR = "#3a8a7a";

const LogoAvatar = memo(function LogoAvatar() {
    return <img src={Logo} alt="Medora" className="shrink-0 h-8 w-8 object-contain" />;
});

const ts = () =>
    new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function AiConsultationComponent() {
    const { t } = useLang();
    const { user, isAuthenticated } = useAuth();
    const [searchParams] = useSearchParams();
    useSEO({ title: t.ai_topbar, description: "احصل على استشارة طبية فورية من مساعد ميدورا الطبي على مدار الساعة." });
    const isRtl = t.dir === "rtl";
    const userChatKey = getAiChatUserKey(user);

    const SUGGESTIONS = [t.ai_s1, t.ai_s2, t.ai_s3, t.ai_s4];

    const [chats, setChats] = useState(() => readAiChats(isAuthenticated ? user : null));
    const [messages, setMessages] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [previewImg, setPreviewImg] = useState(null);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const fileRef = useRef(null);
    const idCounterRef = useRef(1);
    const chatsRef = useRef(chats);
    const loadedChatKeyRef = useRef(userChatKey);
    const handledRouteRef = useRef("");
    const sendRef = useRef(null);
    const isEmpty = messages.length === 0;
    const recentChats = chats.slice(0, 2);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, [input]);

    useEffect(() => {
        if (loadedChatKeyRef.current === userChatKey) return;

        loadedChatKeyRef.current = userChatKey;
        const storedChats = readAiChats(isAuthenticated ? user : null);
        queueMicrotask(() => {
            chatsRef.current = storedChats;
            setChats(storedChats);
            setMessages([]);
            setCurrentChatId(null);
            setInput("");
            setPreviewImg(null);
            setLoading(false);
        });
    }, [isAuthenticated, user, userChatKey]);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewImg(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const getNextId = () => {
        const nextId = idCounterRef.current;
        idCounterRef.current += 1;
        return `${Date.now()}-${nextId}`;
    };

    const updateChats = (updater) => {
        const nextChats = typeof updater === "function"
            ? updater(chatsRef.current)
            : updater;

        chatsRef.current = nextChats;
        setChats(nextChats);
        writeAiChats(isAuthenticated ? user : null, nextChats);
    };

    const appendBotMessage = (chatId, botMsg, serverConversationId) => {
        setMessages((prev) => [...prev, botMsg]);
        updateChats((prevChats) => {
            const activeChat = prevChats.find((chat) => String(chat.id) === String(chatId));
            if (!activeChat) return prevChats;
            const updatedChat = {
                ...activeChat,
                serverId: serverConversationId ?? activeChat.serverId ?? null,
                messages: [...(activeChat.messages || []), botMsg],
                updatedAt: Date.now(),
            };
            return [updatedChat, ...prevChats.filter((chat) => String(chat.id) !== String(chatId))];
        });
    };

    const send = async (text) => {
        const msg = (text ?? input).trim();
        const imageToSend = previewImg;
        if (!msg && !imageToSend) return;
        if (loading) return;

        const userMsg = { id: getNextId(), from: "user", text: msg, image: imageToSend, time: ts() };
        let chatId = currentChatId;
        if (messages.length === 0) {
            chatId = getNextId();
            setCurrentChatId(chatId);
            updateChats((prevChats) => [{
                id: chatId,
                title: msg || t.ai_image_caption,
                serverId: null,
                messages: [userMsg],
                updatedAt: Date.now(),
            }, ...prevChats]);
        } else {
            updateChats((prevChats) => {
                const activeChat = prevChats.find((chat) => String(chat.id) === String(chatId));
                if (!activeChat) return prevChats;
                const updatedChat = {
                    ...activeChat,
                    messages: [...(activeChat.messages || []), userMsg],
                    updatedAt: Date.now(),
                };
                return [updatedChat, ...prevChats.filter((chat) => String(chat.id) !== String(chatId))];
            });
        }

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setPreviewImg(null);
        setLoading(true);

        // Reuse the server-issued conversation id so the AI keeps memory of the case.
        const activeChat = chatsRef.current.find((chat) => String(chat.id) === String(chatId));
        const serverConversationId = activeChat?.serverId ?? null;
        const messageForApi = msg || (isRtl ? "صورة مرفقة" : "Attached image");

        try {
            const data = await sendAiMessage({
                message: messageForApi,
                user,
                conversationId: serverConversationId,
                attachedImage: imageToSend,
            });
            const botMsg = { id: getNextId(), from: "bot", text: data.response, time: ts() };
            appendBotMessage(chatId, botMsg, data.conversation_id);
        } catch (error) {
            // Service stopped/unreachable -> maintenance message; otherwise generic fallback.
            const text = error?.serviceDown
                ? (isRtl ? AI_MAINTENANCE_MESSAGE.ar : AI_MAINTENANCE_MESSAGE.en)
                : AI_FALLBACK_MESSAGE;
            const botMsg = { id: getNextId(), from: "bot", text, time: ts() };
            appendBotMessage(chatId, botMsg, serverConversationId);
        } finally {
            setLoading(false);
        }
    };

    const openChat = (id) => {
        const chat = chatsRef.current.find((item) => String(item.id) === String(id));
        if (!chat) return;
        setOpenActionMenuId(null);
        setCurrentChatId(chat.id);
        setMessages(chat.messages || []);
        setInput("");
        setPreviewImg(null);
    };

    const reset = () => {
        setMessages([]);
        setInput("");
        setPreviewImg(null);
        setCurrentChatId(null);
        setOpenActionMenuId(null);
    };

    const deleteChat = (id, event) => {
        event?.stopPropagation();
        if (loading) return;
        setOpenActionMenuId(null);

        const chat = chatsRef.current.find((item) => String(item.id) === String(id));
        if (!chat) return;

        const confirmed = window.confirm(isRtl ? "حذف هذه المحادثة؟" : "Delete this chat?");
        if (!confirmed) return;

        const isCurrent = String(currentChatId) === String(chat.id);
        updateChats((prevChats) => prevChats.filter((item) => String(item.id) !== String(chat.id)));
        if (isCurrent) reset();

        if (chat.serverId) {
            void deleteAiConversation(chat.serverId).catch((error) => {
                console.warn("Unable to delete AI conversation from server", error);
            });
        }
    };

    const renameChat = (id, event) => {
        event?.stopPropagation();
        setOpenActionMenuId(null);
        const chat = chatsRef.current.find((item) => String(item.id) === String(id));
        if (!chat) return;

        const nextTitle = window.prompt(
            isRtl ? "اكتب اسم المحادثة" : "Name this chat",
            chat.title || "",
        )?.trim();
        if (!nextTitle) return;

        updateChats((prevChats) => prevChats.map((item) => (
            String(item.id) === String(chat.id)
                ? { ...item, title: nextTitle }
                : item
        )));
    };

    const shareChat = async (id, event) => {
        event?.stopPropagation();
        setOpenActionMenuId(null);
        const chat = chatsRef.current.find((item) => String(item.id) === String(id));
        if (!chat || typeof window === "undefined") return;

        const title = chat.title || (isRtl ? "محادثة ميدورا" : "Medora chat");
        const transcript = (chat.messages || [])
            .map((message) => {
                const speaker = message.from === "user"
                    ? (isRtl ? "أنت" : "You")
                    : (isRtl ? "ميدورا" : "Medora");
                const content = message.text || (message.image ? (isRtl ? "صورة مرفقة" : "Attached image") : "");
                return content ? `${speaker}: ${content}` : "";
            })
            .filter(Boolean)
            .join("\n\n");
        const shareText = transcript ? `${title}\n\n${transcript}` : title;

        try {
            if (navigator.share) {
                await navigator.share({ title, text: shareText });
                return;
            }
            await navigator.clipboard.writeText(shareText);
            window.alert(isRtl ? "تم نسخ المحادثة" : "Chat copied");
        } catch (error) {
            if (error?.name !== "AbortError") {
                window.prompt(isRtl ? "انسخ المحادثة" : "Copy chat", shareText);
            }
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const canSend = Boolean((input.trim() || previewImg) && !loading);

    useEffect(() => {
        sendRef.current = send;
    });

    useEffect(() => {
        const routeKey = searchParams.toString();
        if (!routeKey || handledRouteRef.current === routeKey) return;

        const requestedChatId = searchParams.get("chat");
        if (requestedChatId) {
            const requestedChat = chatsRef.current.find(
                (chat) => String(chat.id) === requestedChatId,
            );
            if (!requestedChat) return;

            handledRouteRef.current = routeKey;
            queueMicrotask(() => {
                setCurrentChatId(requestedChat.id);
                setMessages(requestedChat.messages || []);
                setInput("");
                setPreviewImg(null);
            });
            return;
        }

        if (searchParams.get("new") === "1") {
            handledRouteRef.current = routeKey;
            const initialMessage = searchParams.get("message")?.trim() || "";
            queueMicrotask(() => {
                setMessages([]);
                setCurrentChatId(null);
                setPreviewImg(null);
                setInput(initialMessage);
                if (initialMessage) {
                    setTimeout(() => sendRef.current?.(initialMessage), 0);
                }
            });
        }
    }, [chats, searchParams]);

    const OpenIcon = isRtl ? ChevronLeft : ChevronRight;
    const CloseIcon = isRtl ? ChevronRight : ChevronLeft;

    return (
        <div dir={t.dir} style={{ fontFamily: "'Cairo', 'Inter', sans-serif" }}>
            <Navbar />
            <div
                className="flex overflow-hidden"
                style={{ height: "calc(100dvh - 64px)", flexDirection: "row" }}
            >

                {/* Sidebar */}
                <aside
                    style={{
                        flexShrink: 0,
                        width: sidebarOpen ? "240px" : "48px",
                        transition: "width 0.3s ease",
                        background: "#f2f7f7",
                        borderRight: isRtl ? "none" : "1px solid #d4e8e8",
                        borderLeft: isRtl ? "1px solid #d4e8e8" : "none",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "16px 6px",
                            gap: "8px",
                            flexShrink: 0,
                            justifyContent: sidebarOpen ? "space-between" : "center",
                            direction: isRtl ? "rtl" : "ltr",
                        }}
                    >
                        {sidebarOpen && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <img src={Logo} alt="Medora" style={{ height: 32, width: 32, objectFit: "contain" }} />
                                <span style={{ fontWeight: 800, color: SIDEBAR_COLOR, fontSize: 16, whiteSpace: "nowrap" }}>{t.brand}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen((v) => !v)}
                            aria-label={sidebarOpen ? t.ai_hide : t.ai_show}
                            style={{ height: 36, width: 36, minWidth: 36, borderRadius: 10, background: "#f0f0f0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: SIDEBAR_COLOR, flexShrink: 0, transition: "background 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e0e0")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                            title={sidebarOpen ? t.ai_hide : t.ai_show}
                        >
                            {sidebarOpen ? <CloseIcon style={{ width: 20, height: 20 }} /> : <OpenIcon style={{ width: 20, height: 20 }} />}
                        </button>
                    </div>

                    <div
                        style={{
                            flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "0 12px",
                            opacity: sidebarOpen ? 1 : 0,
                            pointerEvents: sidebarOpen ? "auto" : "none",
                            transition: "opacity 0.2s",
                            overflow: "hidden",
                        }}
                    >
                        <button
                            onClick={reset}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold w-full mb-3 transition-all"
                            style={{ background: "#f5f5f5", border: `1px solid ${SIDEBAR_COLOR}`, color: SIDEBAR_COLOR, textAlign: isRtl ? "right" : "left" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#efefef")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                        >
                            <Plus className="h-4 w-4 shrink-0" />
                            {t.ai_new_chat}
                        </button>

                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide mb-1"
                            style={{ color: "#999" }}>
                            {t.ai_recent}
                        </p>

                        {recentChats.map((chat) => (
                            <div
                                key={chat.id}
                                className="rounded-lg text-sm w-full transition-all"
                                style={{
                                    color: chat.id === currentChatId ? SIDEBAR_COLOR : "#555",
                                    background: chat.id === currentChatId ? "#e6f5f2" : "transparent",
                                }}
                                onMouseEnter={(e) => { if (chat.id !== currentChatId) e.currentTarget.style.background = "#f0f0f0"; }}
                                onMouseLeave={(e) => { if (chat.id !== currentChatId) e.currentTarget.style.background = "transparent"; }}
                            >
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => openChat(chat.id)}
                                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
                                        style={{ textAlign: isRtl ? "right" : "left" }}
                                    >
                                        <MessageSquare className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                        <span className="truncate">{chat.title}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenActionMenuId((current) => (
                                                String(current) === String(chat.id) ? null : chat.id
                                            ));
                                        }}
                                        aria-label={isRtl ? "خيارات المحادثة" : "Chat options"}
                                        title={isRtl ? "خيارات المحادثة" : "Chat options"}
                                        className="mx-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#3a8a7a] transition hover:bg-[#e6f5f2]"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>
                                {String(openActionMenuId) === String(chat.id) && (
                                    <div className="mx-2 mb-2 grid gap-1 rounded-xl border border-[#d4e8e8] bg-white p-1.5 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={(event) => renameChat(chat.id, event)}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#1e4a4a] transition hover:bg-[#e6f5f2]"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            {isRtl ? "إعادة تسمية" : "Rename"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => deleteChat(chat.id, event)}
                                            disabled={loading}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {isRtl ? "حذف" : "Delete"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => shareChat(chat.id, event)}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#1e4a4a] transition hover:bg-[#e6f5f2]"
                                        >
                                            <Share2 className="h-3.5 w-3.5" />
                                            {isRtl ? "مشاركة" : "Share"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {recentChats.length === 0 && (
                            <p className="px-3 text-[10px] text-center leading-relaxed mt-2"
                                style={{ color: "#bbb" }}>
                                {t.ai_disclaimer}
                            </p>
                        )}

                        <p className="mt-auto text-[10px] text-center leading-relaxed pb-3"
                            style={{ color: "#bbb" }}>
                            {t.ai_disclaimer}
                        </p>
                    </div>
                </aside>

                {/* Main */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: "#f2f7f7" }}>

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-3 shrink-0"
                        style={{ background: "#f2f7f7", borderBottom: "1px solid #d4e8e8" }}>
                        <div className="h-9 w-9 shrink-0" />
                        <div className="flex items-center gap-2">
                            <img src={Logo} alt="Medora" className="h-6 w-6 object-contain" />
                            <span className="text-sm font-bold" style={{ color: "#0b4040" }}>{t.ai_topbar}</span>
                        </div>
                        <div className="h-9 w-9 shrink-0" />
                    </div>

                    {/* Welcome */}
                    {isEmpty ? (
                        <div className="flex flex-col flex-1 items-center justify-center px-4 gap-7 overflow-y-auto py-8">
                            <img src={Logo} alt="Medora" className="h-16 w-16 object-contain" />
                            <div className="text-center">
                                <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "#0b4040" }}>{t.ai_greeting}</h1>
                                <p className="text-sm" style={{ color: "#5e8e8e" }}>{t.ai_greeting_sub}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                {SUGGESTIONS.map((s) => (
                                    <button key={s} onClick={() => send(s)}
                                        className="text-sm px-4 py-3 rounded-xl bg-white transition-all active:scale-[0.98]"
                                        style={{ border: "1px solid #c2dfdf", color: "#1e4a4a", textAlign: isRtl ? "right" : "left" }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = SIDEBAR_COLOR; e.currentTarget.style.color = SIDEBAR_COLOR; e.currentTarget.style.background = "#e6f5f2"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#c2dfdf"; e.currentTarget.style.color = "#1e4a4a"; e.currentTarget.style.background = "#fff"; }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto py-5" style={{ scrollbarWidth: "thin", scrollbarColor: "#b0d4d4 transparent" }}>
                            <div className="max-w-2xl mx-auto px-4 flex flex-col gap-5">
                                {messages.map((msg) => (
                                    <div key={msg.id}>
                                        {msg.from === "user" ? (
                                            <div className="flex justify-start">
                                                <div className="max-w-[85%] sm:max-w-[78%] text-sm text-white overflow-hidden"
                                                    style={{ background: "#0b9292", borderRadius: isRtl ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
                                                    {msg.image && <img src={msg.image} alt={t.ai_image_caption} className="w-full max-h-60 object-cover" style={{ borderRadius: "16px 16px 0 0" }} />}
                                                    {msg.text && <p className="px-4 py-3 leading-7 whitespace-pre-line">{msg.text}</p>}
                                                    {!msg.text && msg.image && <p className="px-4 py-2 text-white/70 text-xs">{t.ai_image_caption}</p>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 items-start">
                                                <LogoAvatar />
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="text-[11px] font-semibold" style={{ color: SIDEBAR_COLOR }}>{t.ai_label}</span>
                                                    <p className="text-sm leading-7 whitespace-pre-line" style={{ color: "#1e4a4a", textAlign: isRtl ? "right" : "left" }}>{msg.text}</p>
                                                    <span className="text-[10px]" style={{ color: "#5e8e8e" }}>{msg.time}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-3 items-start">
                                        <LogoAvatar />
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="text-[11px] font-semibold" style={{ color: SIDEBAR_COLOR }}>{t.ai_label}</span>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                {[0, 160, 320].map((d) => (
                                                    <span key={d} className="block h-2 w-2 rounded-full animate-bounce"
                                                        style={{ background: SIDEBAR_COLOR, animationDelay: `${d}ms` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>
                    )}

                    {/* Input area */}
                    <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #d4e8e8", background: "#f2f7f7" }}>
                        <div className="max-w-2xl mx-auto">
                            {previewImg && (
                                <div className="mb-2 flex">
                                    <div className="relative inline-block">
                                        <img src={previewImg} alt="preview" className="h-20 w-20 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                        <button
                                            onClick={() => setPreviewImg(null)}
                                            aria-label="حذف الصورة"
                                            className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-end gap-2 rounded-2xl px-3 py-3 bg-white"
                                style={{ border: "1px solid #c2dfdf", boxShadow: "0 1px 4px rgba(58,138,122,0.08)" }}>
                                <button onClick={() => send()} disabled={!canSend} aria-label="Send"
                                    className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 active:scale-95"
                                    style={{ background: canSend ? `linear-gradient(135deg,${SIDEBAR_COLOR},#14b8a6)` : "#e0f0ec" }}>
                                    <Send className="h-4 w-4 rotate-180" style={{ color: canSend ? "#fff" : "#5e8e8e" }} />
                                </button>

                                <textarea ref={textareaRef} value={input}
                                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                                    placeholder={t.ai_placeholder} rows={1} dir={t.dir}
                                    className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
                                    style={{ color: "#0b3a3a", maxHeight: 200, minHeight: 24, caretColor: SIDEBAR_COLOR }}
                                />

                                <button onClick={() => fileRef.current?.click()} aria-label="Attach image"
                                    className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all hover:bg-[#e6f5f2] active:scale-95"
                                    style={{ color: SIDEBAR_COLOR }}>
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                            </div>

                            <p className="text-center text-[10px] mt-2" style={{ color: "#8eb0b0" }}>
                                {t.ai_footer}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}

export default memo(AiConsultationComponent);
