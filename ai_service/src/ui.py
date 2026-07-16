from __future__ import annotations

import html
import re
from typing import Any, Iterable

import streamlit as st


ARABIC_PATTERN = re.compile(r"[\u0600-\u06FF]")


def contains_arabic(text: str) -> bool:
    return bool(ARABIC_PATTERN.search(text or ""))


def inject_css() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background: #ffffff;
            color: #1f2933;
        }

        .block-container {
            max-width: none;
            padding-top: 1rem;
            padding-bottom: 5.5rem;
        }

        [data-testid="stSidebar"] {
            background: #f8fafc;
            border-right: 1px solid #e5e7eb;
            min-width: 280px !important;
            max-width: 280px !important;
            width: 280px !important;
            left: 0 !important;
            right: auto !important;
        }

        [data-testid="stSidebar"] * {
            word-break: normal !important;
            white-space: normal;
            overflow-wrap: break-word;
        }

        [data-testid="stSidebarContent"] {
            padding-top: 0.7rem;
        }

        .chat-main {
            max-width: 760px;
            margin: 0 auto;
            padding-bottom: 90px;
        }

        .app-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.25rem;
        }

        .app-subtitle {
            color: #6b7280;
            font-size: 0.88rem;
            margin-bottom: 0.9rem;
        }

        .topbar {
            margin-bottom: 0.8rem;
        }

        .main-title {
            font-size: 1.15rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 0.25rem;
        }

        .notice {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 0.75rem 0.9rem;
            color: #4b5563;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .chat-shell {
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 0;
        }

        .empty-chat {
            padding: 2.5rem 1rem;
            text-align: center;
            color: #6b7280;
            line-height: 1.7;
        }

        .chat-row {
            display: flex;
            width: 100%;
            margin: 6px 0;
        }

        .user-row {
            justify-content: flex-end;
        }

        .assistant-row {
            justify-content: flex-start;
        }

        .chat-bubble {
            display: inline-block;
            width: auto !important;
            max-width: 70%;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 8px 12px !important;
            border-radius: 18px;
            font-size: 15px;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: normal;
            box-sizing: border-box;
        }

        .user-bubble {
            background: #2f2f2f;
            color: white;
            direction: rtl;
            text-align: right;
        }

        .assistant-bubble {
            background: #f1f1f1;
            color: #111;
            direction: rtl;
            text-align: right;
        }

        .chat-bubble div,
        .chat-bubble p,
        .chat-bubble span {
            margin: 0 !important;
            padding: 0 !important;
        }

        .chat-title-button button {
            text-align: left !important;
            justify-content: flex-start !important;
            min-height: 2.5rem;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            overflow: hidden !important;
            padding-right: 0.6rem !important;
        }

        .chat-title-button button p {
            display: -webkit-box !important;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: normal !important;
            margin: 0 !important;
        }

        .stButton > button {
            border-radius: 10px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #111827;
            box-shadow: none;
        }

        [data-testid="stChatInput"] {
            position: sticky;
            bottom: 0;
            background: #ffffff;
            padding-top: 0.75rem;
            padding-bottom: 0.2rem;
            margin-top: 0;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
            z-index: 10;
        }

        .stChatInput > div {
            border-radius: 18px;
            border: 1px solid #d1d5db;
            background: #ffffff;
        }

        [data-testid="stChatInput"] textarea {
            direction: auto;
            text-align: start;
        }

        @media (max-width: 900px) {
            [data-testid="stSidebar"] {
                min-width: 260px;
                max-width: 260px;
                width: 260px !important;
            }

            .chat-bubble {
                max-width: 85%;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar(chats: list[dict[str, Any]], current_chat_id: str) -> dict[str, Any]:
    action: dict[str, Any] = {}
    with st.sidebar:
        st.markdown('<div class="app-title">Medical AI Assistant</div>', unsafe_allow_html=True)
        st.markdown('<div class="app-subtitle">Chat history and memory stay in the current case.</div>', unsafe_allow_html=True)

        if st.button("New Chat", use_container_width=True):
            action["new_chat"] = True

        st.markdown("#### Chats")
        if chats:
            for chat in chats:
                cols = st.columns([5, 1])
                with cols[0]:
                    container = st.container()
                    with container:
                        st.markdown('<div class="chat-title-button">', unsafe_allow_html=True)
                        if st.button(
                            chat.get("title") or "New Chat",
                            key=f"chat_select_{chat['id']}",
                            use_container_width=True,
                            type="primary" if chat["id"] == current_chat_id else "secondary",
                        ):
                            action["select_chat_id"] = chat["id"]
                        st.markdown("</div>", unsafe_allow_html=True)
                with cols[1]:
                    if st.button("✕", key=f"chat_delete_{chat['id']}", use_container_width=True):
                        action["delete_chat_id"] = chat["id"]
        else:
            st.caption("No saved chats yet.")

        st.markdown("---")
        if st.session_state.get("confirm_clear_all"):
            st.warning("Delete all chats?")
            confirm_cols = st.columns(2)
            with confirm_cols[0]:
                if st.button("Confirm", use_container_width=True):
                    action["clear_all"] = True
            with confirm_cols[1]:
                if st.button("Cancel", use_container_width=True):
                    action["cancel_clear_all"] = True
        else:
            if st.button("Clear All Chats", use_container_width=True):
                action["ask_clear_all"] = True
    return action


def render_header(api_ready: bool, title: str) -> None:
    st.markdown('<div class="chat-main"><div class="topbar">', unsafe_allow_html=True)
    st.markdown(
        f'<div class="main-title">{html.escape(title or "Medical AI Assistant")}</div>',
        unsafe_allow_html=True,
    )
    notice = (
        "This assistant gives general guidance only and does not replace a doctor, emergency service, or pharmacist."
        if api_ready
        else "OpenAI is not configured, so the app is using local fallback where possible."
    )
    st.markdown(f'<div class="notice">{html.escape(notice)}</div>', unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)


def render_chat(messages: Iterable[dict[str, Any]], container: Any | None = None) -> None:
    target = container if container is not None else st
    with target.container():
        st.markdown('<div class="chat-main"><div class="chat-shell">', unsafe_allow_html=True)
        message_list = list(messages)
        if not message_list:
            st.markdown(
                """
                <div class="empty-chat">
                    Start a new conversation in Arabic or English.
                    <br>
                    The assistant will remember the current case inside this chat.
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            for message in message_list:
                render_message(message)
        st.markdown("</div></div>", unsafe_allow_html=True)


def render_message(message: dict[str, Any]) -> None:
    role = str(message.get("role", "assistant"))
    content = str(message.get("content", ""))
    row_class = "user-row" if role == "user" else "assistant-row"
    is_arabic = contains_arabic(content)
    if role == "user":
        bubble_class = "user-bubble"
        direction = "rtl" if is_arabic else "ltr"
        alignment = "right" if is_arabic else "left"
    else:
        bubble_class = "assistant-bubble"
        direction = "rtl" if is_arabic else "ltr"
        alignment = "right" if is_arabic else "left"
    st.markdown(
        f"""
        <div class="chat-row {row_class}">
            <div class="chat-bubble {bubble_class}" dir="{direction}" style="text-align: {alignment};">
                <div>{html.escape(content)}</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
