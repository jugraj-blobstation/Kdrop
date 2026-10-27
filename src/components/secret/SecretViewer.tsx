"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Lock,
  Flame,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  AlertOctagon,
  FileText,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { importKeyFromBase64Url, decryptAESGCM } from "@/lib/crypto/aes";
import { deriveKeyFromPassphrase } from "@/lib/crypto/pbkdf2";
import { bytesToString } from "@/lib/crypto/utils";
import { zeroizeBuffer } from "@/lib/crypto/zeroize";
import styles from "./SecretViewer.module.css";

interface DecryptedData {
  text: string;
  file?: {
    name: string;
    type: string;
    size: number;
    dataBase64: string;
  } | null;
  timestamp: number;
}

export default function SecretViewer() {
  const params = useParams();
  const router = useRouter();
  const secretId = params.id as string;

  const [hasRevealed, setHasRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);

  const [passphraseRequired, setPassphraseRequired] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [saltFromResponse, setSaltFromResponse] = useState<string | null>(null);

  const [isMasked, setIsMasked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isWiped, setIsWiped] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check URL hash for encryption key on client mount
  const [urlKeyHash, setUrlKeyHash] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash.startsWith("p=")) {
        setPassphraseRequired(true);
      }
      setUrlKeyHash(hash);
    }
  }, []);

  // Countdown timer for automatic memory wipe
  useEffect(() => {
    if (!hasRevealed || !decryptedData || isWiped) return;

    if (countdown <= 0) {
      handleWipeMemory();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasRevealed, decryptedData, countdown, isWiped]);

  // Handle wiping memory on unmount
  useEffect(() => {
    return () => {
      if (rawBuffer) {
        zeroizeBuffer(rawBuffer);
      }
    };
  }, [rawBuffer]);

  const handleRevealSecret = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!secretId) return;

    if (passphraseRequired && !passphraseInput.trim()) {
      setErrorMsg("Please enter the confidential passphrase to decrypt.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Fetch ciphertext from server (Server atomically burns it!)
      const res = await fetch(`/api/secret/${secretId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("This secret was already burned, has expired, or never existed.");
        }
        throw new Error("Failed to retrieve secret from server.");
      }

      const serverPayload = await res.json();
      const { ciphertext, iv, salt } = serverPayload;

      // 2. Prepare CryptoKey
      let cryptoKey: CryptoKey;
      if (salt || passphraseRequired) {
        setSaltFromResponse(salt);
        if (!passphraseInput) {
          setPassphraseRequired(true);
          setIsLoading(false);
          return;
        }
        cryptoKey = await deriveKeyFromPassphrase(passphraseInput.trim(), salt);
      } else {
        if (!urlKeyHash) {
          throw new Error(
            "Missing decryption key in URL #hash. Please check that you copied the complete link."
          );
        }
        cryptoKey = await importKeyFromBase64Url(urlKeyHash);
      }

      // 3. Client-Side AES-256-GCM Decryption
      const decryptedBuffer = await decryptAESGCM(ciphertext, iv, cryptoKey);
      setRawBuffer(decryptedBuffer);

      const plaintextJson = bytesToString(decryptedBuffer);
      const parsed: DecryptedData = JSON.parse(plaintextJson);

      setDecryptedData(parsed);
      setHasRevealed(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Decryption failed. Invalid key or passphrase."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!decryptedData?.text) return;
    navigator.clipboard.writeText(decryptedData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadFile = () => {
    if (!decryptedData?.file) return;
    const link = document.createElement("a");
    link.href = decryptedData.file.dataBase64;
    link.download = decryptedData.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWipeMemory = () => {
    if (rawBuffer) {
      zeroizeBuffer(rawBuffer);
    }
    setDecryptedData(null);
    setRawBuffer(null);
    setIsWiped(true);
  };

  return (
    <div className={styles.container}>
      {isWiped ? (
        /* Wiped State Card */
        <div className={`glass-panel ${styles.burnedCard}`}>
          <div className={styles.burnedIconBadge}>
            <Flame size={32} />
          </div>
          <h2 className={styles.burnedTitle}>Secret Burned & Destroyed</h2>
          <p className={styles.burnedSubtitle}>
            This secret has been permanently expunged from the server and wiped from browser RAM.
            It cannot be retrieved again by anyone.
          </p>
          <div className={styles.burnedActions}>
            <button
              onClick={() => router.push("/")}
              className="btn btn-primary"
              id="btn-create-new"
            >
              <RotateCcw size={16} /> Send a New Secret
            </button>
          </div>
        </div>
      ) : !hasRevealed ? (
        /* Pre-reveal Gate Card */
        <div className={`glass-panel ${styles.viewerCard}`}>
          <div className={styles.headerArea}>
            <div className={styles.shieldIconBadge}>
              <Lock size={32} />
            </div>
            <h1 className={styles.viewerTitle}>One-Time Encrypted Secret</h1>
            <p className={styles.viewerSubtitle}>
              You have received a confidential secret. Once you reveal it, the encrypted data
              will be permanently burned from the server.
            </p>
          </div>

          <div className={styles.securityAlertBox}>
            <Flame size={18} className={styles.burnNoticeIcon} />
            <div>
              <strong>Self-Destruction Warning:</strong>
              <p>
                Make sure you are ready to copy or view this information. You can only view it once.
              </p>
            </div>
          </div>

          {passphraseRequired && (
            <div className={styles.passphraseFieldGroup}>
              <label className={styles.passphraseLabel}>
                <Key size={14} /> Enter Decryption Passphrase
              </label>
              <input
                type="password"
                placeholder="Confidential passphrase..."
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                className={`input-field ${styles.passphraseInputField}`}
                disabled={isLoading}
              />
            </div>
          )}

          {errorMsg && (
            <div className={styles.errorMessage}>
              <AlertOctagon size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className={styles.revealActionRow}>
            <button
              onClick={handleRevealSecret}
              className={`btn btn-primary ${styles.revealBtn}`}
              disabled={isLoading}
              id="btn-reveal-secret"
            >
              <Flame size={18} />
              {isLoading ? "Decrypting Locally..." : "Reveal & Burn Secret"}
            </button>
          </div>
        </div>
      ) : (
        /* Decrypted Secret Card */
        <div className={`glass-panel ${styles.viewerCard}`}>
          <div className={styles.revealedHeader}>
            <div>
              <div className={styles.badgeBurnedNotice}>
                <Flame size={14} /> Burned from Server
              </div>
              <h2 className={styles.revealedTitle}>Confidential Secret</h2>
            </div>

            {/* Countdown Wipe Timer */}
            <div className={styles.countdownBadge}>
              <span className={styles.countdownLabel}>Auto-Wipe in:</span>
              <span className={styles.countdownValue}>{countdown}s</span>
            </div>
          </div>

          {/* Secret Text Area */}
          {decryptedData?.text && (
            <div className={styles.secretBoxWrapper}>
              <div className={styles.secretBoxHeader}>
                <span className={styles.boxTitle}>Plaintext Credentials</span>
                <div className={styles.boxControls}>
                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    className="btn btn-secondary btn-sm"
                    title={isMasked ? "Reveal text" : "Mask text"}
                  >
                    {isMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                    {isMasked ? "Show" : "Hide"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn btn-primary btn-sm"
                    id="btn-copy-secret"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <pre
                className={`${styles.secretCodeBlock} ${isMasked ? styles.maskedText : ""}`}
                id="decrypted-secret-text"
              >
                {decryptedData.text}
              </pre>
            </div>
          )}

          {/* Attached File Download */}
          {decryptedData?.file && (
            <div className={styles.fileDownloadCard}>
              <FileText size={24} className={styles.fileCardIcon} />
              <div className={styles.fileCardDetails}>
                <span className={styles.fileCardName}>{decryptedData.file.name}</span>
                <span className={styles.fileCardMeta}>
                  {(decryptedData.file.size / 1024).toFixed(1)} KB &middot; Decrypted File
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="btn btn-primary btn-sm"
                id="btn-download-file"
              >
                <Download size={14} /> Download File
              </button>
            </div>
          )}

          <div className={styles.wipeRow}>
            <button
              onClick={handleWipeMemory}
              className="btn btn-danger btn-sm"
              id="btn-wipe-now"
            >
              <Flame size={16} /> Burn & Wipe from Memory Now
            </button>
            <span className={styles.cryptoAuditNote}>
              <ShieldCheck size={14} /> Decrypted in browser via AES-256-GCM
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
