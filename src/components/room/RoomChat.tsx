"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Lock,
  Unlock,
  Flame,
  Send,
  Paperclip,
  Copy,
  Check,
  Users,
  ShieldCheck,
  User,
  Download,
  AlertTriangle,
  FileText,
  X,
  Share2,
} from "lucide-react";
import {
  importKeyFromBase64Url,
  encryptAESGCM,
  decryptAESGCM,
} from "@/lib/crypto/aes";
import { bytesToString } from "@/lib/crypto/utils";
import styles from "./RoomChat.module.css";

interface ChatMessage {
  id: string;
  senderTag: string;
  senderName: string;
  text: string;
  file?: {
    name: string;
    type: string;
    size: number;
    dataBase64: string;
  } | null;
  timestamp: number;
  isSelf?: boolean;
}

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  dataBase64: string;
}

export default function RoomChat() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [peerId, setPeerId] = useState("");
  const [nickName, setNickName] = useState("Anonymous");
  const [isEditingNick, setIsEditingNick] = useState(false);

  useEffect(() => {
    setPeerId(`peer-${Math.random().toString(36).substring(2, 8)}`);
    setNickName(`Anon-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  const [peerCount, setPeerCount] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract key from URL hash on mount
  useEffect(() => {
    const initKey = async () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        setKeyError("Missing decryption key in URL #hash. Encrypted room cannot be accessed.");
        return;
      }
      try {
        const key = await importKeyFromBase64Url(hash);
        setRoomKey(key);
      } catch {
        setKeyError("Invalid or corrupted room encryption key in URL #hash.");
      }
    };
    initKey();
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    if (!roomId || !roomKey || isDestroyed || !peerId) return;

    const eventSource = new EventSource(`/api/room/${roomId}/stream?peerId=${peerId}`);

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "INIT") {
          setIsLocked(data.isLocked);
          setPeerCount(data.peerCount);
        } else if (data.type === "PEER_JOINED" || data.type === "PEER_LEFT") {
          setPeerCount(data.peerCount);
        } else if (data.type === "ROOM_LOCK_CHANGED") {
          setIsLocked(data.isLocked);
        } else if (data.type === "ROOM_DESTROYED") {
          setIsDestroyed(true);
          setMessages([]);
          eventSource.close();
        } else if (data.type === "MESSAGE") {
          // Decrypt client-side using roomKey
          try {
            const decryptedBuffer = await decryptAESGCM(data.ciphertext, data.iv, roomKey);
            const plaintextJson = bytesToString(decryptedBuffer);
            const parsed = JSON.parse(plaintextJson);

            setMessages((prev) => [
              ...prev,
              {
                id: data.id,
                senderTag: data.senderTag,
                senderName: parsed.senderName || "Anonymous",
                text: parsed.text || "",
                file: parsed.file || null,
                timestamp: data.timestamp,
                isSelf: data.senderTag === peerId,
              },
            ]);
          } catch {
            // Failed to decrypt tampered message
          }
        }
      } catch {
        // Ignored parsing error
      }
    };

    eventSource.onerror = () => {
      // Stream error / disconnect
    };

    return () => {
      eventSource.close();
    };
  }, [roomId, roomKey, peerId, isDestroyed]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    if (!roomKey) return;

    setIsSending(true);

    try {
      const payload = JSON.stringify({
        senderName: nickName,
        text: inputText.trim(),
        file: attachedFile,
      });

      // Encrypt with AES-256-GCM before sending to relay
      const encrypted = await encryptAESGCM(payload, roomKey);

      await fetch(`/api/room/${roomId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          senderTag: peerId,
        }),
      });

      setInputText("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      alert("Failed to encrypt or deliver message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("File exceeds 3MB limit for zero-knowledge chat attachment.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataBase64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLock = async () => {
    try {
      await fetch(`/api/room/${roomId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOCK", isLocked: !isLocked }),
      });
    } catch {
      alert("Failed to toggle room lock.");
    }
  };

  const handleDestroyRoom = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently destroy this room and wipe all messages for all participants?"
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/room/${roomId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DESTROY" }),
      });
      setIsDestroyed(true);
      setMessages([]);
    } catch {
      alert("Failed to destroy room.");
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadAttachment = (file: AttachedFile) => {
    const link = document.createElement("a");
    link.href = file.dataBase64;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isDestroyed) {
    return (
      <div className={styles.destroyedContainer}>
        <div className={`glass-panel ${styles.destroyedCard}`}>
          <div className={styles.burnedBadge}>
            <Flame size={32} />
          </div>
          <h2 className={styles.destroyedTitle}>Chat Room Permanently Burned</h2>
          <p className={styles.destroyedSubtitle}>
            This room was terminated and all message buffers have been completely wiped from memory.
          </p>
          <button onClick={() => router.push("/room")} className="btn btn-primary">
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  if (keyError) {
    return (
      <div className={styles.destroyedContainer}>
        <div className={`glass-panel ${styles.destroyedCard}`}>
          <div className={styles.errorBadge}>
            <AlertTriangle size={32} />
          </div>
          <h2 className={styles.destroyedTitle}>Decryption Error</h2>
          <p className={styles.destroyedSubtitle}>{keyError}</p>
          <button onClick={() => router.push("/room")} className="btn btn-primary">
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatLayout}>
      {/* Top Header Bar */}
      <header className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <div className={styles.roomBadge}>
            <Lock size={14} className={styles.lockIcon} />
            <span className={styles.roomIdText}>Room: {roomId.slice(0, 8)}...</span>
          </div>

          <div className={styles.peerBadge}>
            <span className="pulse-dot"></span>
            <Users size={14} />
            <span>{peerCount} Online</span>
          </div>

          {isLocked && (
            <div className="badge-warning">
              <Lock size={12} /> Locked
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={styles.headerControls}>
          {/* Editable Nickname */}
          <div className={styles.nicknameTag}>
            <User size={14} className={styles.userIcon} />
            {isEditingNick ? (
              <input
                type="text"
                value={nickName}
                onChange={(e) => setNickName(e.target.value)}
                onBlur={() => setIsEditingNick(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingNick(false)}
                autoFocus
                className={styles.nickInput}
              />
            ) : (
              <span
                onClick={() => setIsEditingNick(true)}
                className={styles.nickDisplay}
                title="Click to change your alias"
                suppressHydrationWarning
              >
                {nickName}
              </span>
            )}
          </div>

          <button
            onClick={handleCopyInviteLink}
            className="btn btn-secondary btn-sm"
            id="btn-copy-invite"
          >
            {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
            {copiedLink ? "Link Copied!" : "Invite Link"}
          </button>

          <button
            onClick={handleToggleLock}
            className="btn btn-secondary btn-sm"
            title={isLocked ? "Unlock room" : "Lock room from new peers"}
            id="btn-toggle-lock"
          >
            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            {isLocked ? "Unlock" : "Lock"}
          </button>

          <button
            onClick={handleDestroyRoom}
            className="btn btn-danger btn-sm"
            id="btn-burn-chat"
          >
            <Flame size={14} /> Burn Chat
          </button>
        </div>
      </header>

      {/* Zero-Knowledge Indicator Notice */}
      <div className={styles.securityNoticeBar}>
        <ShieldCheck size={14} className={styles.noticeIcon} />
        <span>
          End-to-End Encrypted (AES-256-GCM). Messages exist only in RAM and are never saved to disk.
        </span>
      </div>

      {/* Message List */}
      <div className={styles.messageListArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBadge}>
              <Lock size={28} />
            </div>
            <h3 className={styles.emptyTitle}>Secure Confidential Room</h3>
            <p className={styles.emptySubtitle}>
              Share the invite link to start messaging. All messages and attachments are encrypted
              in your browser before sending.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.messageWrapper} ${msg.isSelf ? styles.selfWrapper : ""}`}
            >
              <div className={styles.messageBubble}>
                <div className={styles.messageMeta}>
                  <span className={styles.senderName}>{msg.isSelf ? "You" : msg.senderName}</span>
                  <span className={styles.messageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {msg.text && <p className={styles.messageText}>{msg.text}</p>}

                {msg.file && (
                  <div className={styles.fileAttachmentBadge}>
                    <FileText size={18} className={styles.attachFileIcon} />
                    <div className={styles.attachDetails}>
                      <span className={styles.attachName}>{msg.file.name}</span>
                      <span className={styles.attachSize}>
                        {(msg.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(msg.file!)}
                      className="btn btn-secondary btn-sm"
                      title="Download file"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className={styles.inputArea}>
        {attachedFile && (
          <div className={styles.fileSelectedBar}>
            <Paperclip size={14} />
            <span className={styles.selectedFileName}>{attachedFile.name}</span>
            <span className={styles.selectedFileSize}>
              ({(attachedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              onClick={() => setAttachedFile(null)}
              className={styles.removeAttachBtn}
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className={styles.formRow}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="chat-file-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.attachBtn}
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            placeholder="Type encrypted message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className={`input-field ${styles.chatInput}`}
            id="chat-message-input"
          />

          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !attachedFile)}
            className={`btn btn-primary ${styles.sendBtn}`}
            id="chat-send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </div>
  );
}
