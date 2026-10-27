"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquareCode,
  ShieldCheck,
  Flame,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { generateAESKey, exportKeyToBase64Url } from "@/lib/crypto/aes";
import { generateRandomId } from "@/lib/crypto/utils";
import styles from "./room-launcher.module.css";

export default function RoomLauncherPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      // 1. Generate random room ID
      const roomId = generateRandomId(16);

      // 2. Generate 256-bit AES-GCM Key in browser
      const key = await generateAESKey();
      const keyBase64Url = await exportKeyToBase64Url(key);

      // 3. Navigate to room with key in URL #hash fragment (never touches HTTP request)
      router.push(`/room/${roomId}#${keyBase64Url}`);
    } catch {
      alert("Failed to initialize cryptographic room key.");
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const trimmed = joinUrl.trim();
    if (!trimmed) return;

    try {
      const url = new URL(trimmed);
      if (!url.pathname.startsWith("/room/") || !url.hash) {
        setJoinError("URL must contain /room/[id] and the #hash decryption key.");
        return;
      }
      window.location.href = trimmed;
    } catch {
      // Maybe user pasted only roomId#key
      if (trimmed.includes("#")) {
        window.location.href = `/room/${trimmed}`;
      } else {
        setJoinError("Please enter a valid room URL including the #hash encryption key.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div className={styles.badge}>
          <ShieldCheck size={14} />
          <span>Ephemeral End-to-End Encrypted Relay</span>
        </div>
        <h1 className={styles.title}>Encrypted Confidential Rooms</h1>
        <p className={styles.subtitle}>
          Real-time encrypted chat sessions. Zero accounts, zero message persistence.
          All messages and attachments exist solely in volatile client RAM.
        </p>
      </div>

      <div className={styles.cardsGrid}>
        {/* Create Room Card */}
        <div className={`glass-panel ${styles.actionCard}`}>
          <div className={styles.cardIconBadge}>
            <Sparkles size={24} />
          </div>
          <h2 className={styles.cardTitle}>Launch a New Room</h2>
          <p className={styles.cardDesc}>
            Generate an ephemeral room with a unique 256-bit AES-GCM encryption key.
            Keys are strictly client-side and never saved to any server.
          </p>

          <ul className={styles.featuresList}>
            <li>
              <Lock size={14} className={styles.checkIcon} /> Hardware AES-256-GCM encryption
            </li>
            <li>
              <Flame size={14} className={styles.checkIcon} /> Instant &quot;Burn Chat&quot; wipe button
            </li>
            <li>
              <ShieldCheck size={14} className={styles.checkIcon} /> Room Lock to prevent new joiners
            </li>
          </ul>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className={`btn btn-primary ${styles.createBtn}`}
            id="btn-launch-room"
          >
            <MessageSquareCode size={18} />
            {isCreating ? "Generating Cryptographic Key..." : "Create Encrypted Room"}
          </button>
        </div>

        {/* Join Room Card */}
        <div className={`glass-panel ${styles.actionCard}`}>
          <div className={styles.cardIconBadgeSecondary}>
            <Lock size={24} />
          </div>
          <h2 className={styles.cardTitle}>Join Existing Room</h2>
          <p className={styles.cardDesc}>
            Have an invite link? Paste the link below to enter the encrypted session.
          </p>

          <form onSubmit={handleJoinRoom} className={styles.joinForm}>
            <input
              type="text"
              placeholder="https://.../room/xyz#aesKey"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              className={`input-field ${styles.joinInput}`}
              id="input-join-room-url"
            />

            {joinError && <p className={styles.errorText}>{joinError}</p>}

            <button
              type="submit"
              disabled={!joinUrl.trim()}
              className={`btn btn-secondary ${styles.joinBtn}`}
              id="btn-join-room"
            >
              <span>Join Room</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
