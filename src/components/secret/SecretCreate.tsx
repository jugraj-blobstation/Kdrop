"use client";

import React, { useState, useRef } from "react";
import {
  Lock,
  Flame,
  Key,
  Paperclip,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  X,
  ExternalLink,
  QrCode,
} from "lucide-react";
import {
  generateAESKey,
  exportKeyToBase64Url,
  encryptAESGCM,
} from "@/lib/crypto/aes";
import {
  generateSalt,
  deriveKeyFromPassphrase,
  bufferToBase64Url,
} from "@/lib/crypto/pbkdf2";
import { generateRandomId } from "@/lib/crypto/utils";
import styles from "./SecretCreate.module.css";

interface AttachedFileInfo {
  name: string;
  type: string;
  size: number;
  dataBase64: string;
}

export default function SecretCreate() {
  const [secretText, setSecretText] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState("86400"); // default 24h
  const [burnOnRead, setBurnOnRead] = useState(true);
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [secretId, setSecretId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 4MB max for in-browser file drop
    if (file.size > 4 * 1024 * 1024) {
      alert("File size exceeds 4MB limit for in-browser zero-knowledge encryption.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachedFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataBase64: result,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretText.trim() && !attachedFile) {
      setErrorMsg("Please enter a secret message or attach a sensitive file.");
      return;
    }
    if (usePassphrase && !passphrase.trim()) {
      setErrorMsg("Please provide a passphrase or uncheck the passphrase option.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Pack plaintext payload
      const payload = JSON.stringify({
        text: secretText,
        file: attachedFile,
        timestamp: Date.now(),
      });

      // 2. Client-side Cryptography (SubtleCrypto)
      let cryptoKey: CryptoKey;
      let keyHashFragment = "";
      let saltBase64: string | undefined = undefined;

      if (usePassphrase && passphrase.trim()) {
        const salt = generateSalt();
        saltBase64 = bufferToBase64Url(salt);
        cryptoKey = await deriveKeyFromPassphrase(passphrase.trim(), salt);
        // If passphrase is used, we also generate a random link token to ensure unique URL
        const randomToken = generateRandomId(16);
        keyHashFragment = `p=${randomToken}`;
      } else {
        cryptoKey = await generateAESKey();
        keyHashFragment = await exportKeyToBase64Url(cryptoKey);
      }

      // 3. Encrypt payload with AES-256-GCM
      const encrypted = await encryptAESGCM(payload, cryptoKey);
      const newSecretId = generateRandomId(20);

      // 4. Send ONLY ciphertext to server (Key NEVER sent!)
      const res = await fetch("/api/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newSecretId,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: saltBase64,
          ttlSeconds: Number(ttlSeconds),
          burnOnRead: burnOnRead,
          maxViews: 1,
        }),
      });

      if (!res.ok) {
        throw new Error("Server error storing encrypted secret.");
      }

      // 5. Construct URL where key is solely in #hash
      const shareUrl = `${window.location.origin}/secret/${newSecretId}#${keyHashFragment}`;
      setGeneratedUrl(shareUrl);
      setSecretId(newSecretId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Encryption or network error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBurnImmediately = async () => {
    if (!secretId) return;
    if (!confirm("Are you sure you want to burn this secret immediately?")) return;

    try {
      await fetch(`/api/secret/${secretId}`, { method: "DELETE" });
      resetForm();
    } catch {
      alert("Failed to burn secret.");
    }
  };

  const resetForm = () => {
    setSecretText("");
    setAttachedFile(null);
    setGeneratedUrl(null);
    setSecretId(null);
    setPassphrase("");
    setUsePassphrase(false);
    setErrorMsg(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div className={styles.heroBadge}>
          <ShieldCheck size={14} className={styles.heroBadgeIcon} />
          <span>Zero-Knowledge &middot; End-to-End Encrypted</span>
        </div>
        <h1 className={styles.mainTitle}>
          Stop leaking credentials in Slack & Email.
        </h1>
        <p className={styles.mainSubtitle}>
          Paste passwords, API keys, private certificates, or confidential files.
          Get a self-destructing link that decrypts exclusively in the recipient&apos;s browser.
        </p>
      </div>

      {!generatedUrl ? (
        <form onSubmit={handleCreateSecret} className={`glass-panel ${styles.formCard}`}>
          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="secret-content" className={styles.fieldLabel}>
                Secret Text or Credentials
              </label>
              <span className={styles.clientEncNotice}>
                <Lock size={12} /> Encrypted locally via AES-256-GCM
              </span>
            </div>
            <textarea
              id="secret-content"
              className={`textarea-field ${styles.secretTextarea}`}
              placeholder="Paste password, SSH private key, database URI, AWS credentials, or secret message..."
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Attached File Display */}
          {attachedFile && (
            <div className={styles.filePreviewBadge}>
              <FileText size={16} className={styles.fileIcon} />
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{attachedFile.name}</span>
                <span className={styles.fileSize}>
                  {(attachedFile.size / 1024).toFixed(1)} KB &middot; Encrypted in browser
                </span>
              </div>
              <button
                type="button"
                onClick={removeAttachedFile}
                className={styles.removeFileBtn}
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Controls & Options Bar */}
          <div className={styles.optionsSection}>
            <div className={styles.optionsGrid}>
              {/* Expiration Dropdown */}
              <div className={styles.optionBox}>
                <label className={styles.optionLabel}>
                  <Flame size={14} /> Self-Destruct Expiration
                </label>
                <select
                  value={ttlSeconds}
                  onChange={(e) => setTtlSeconds(e.target.value)}
                  className={`input-field ${styles.selectField}`}
                  disabled={isLoading}
                >
                  <option value="300">5 Minutes</option>
                  <option value="3600">1 Hour</option>
                  <option value="86400">24 Hours (Default)</option>
                  <option value="604800">7 Days</option>
                </select>
              </div>

              {/* Burn on Read Checkbox */}
              <div className={styles.optionBox}>
                <label className={styles.optionLabel}>
                  <Flame size={14} /> Destruction Policy
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={burnOnRead}
                    onChange={(e) => setBurnOnRead(e.target.checked)}
                    disabled={isLoading}
                    className={styles.checkboxInput}
                  />
                  <span>Burn immediately after 1 view</span>
                </label>
              </div>

              {/* File Attachment Button */}
              <div className={styles.optionBox}>
                <label className={styles.optionLabel}>
                  <Paperclip size={14} /> Attach File (Max 4MB)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="file-upload-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%" }}
                  disabled={isLoading}
                >
                  <Paperclip size={14} /> Choose File
                </button>
              </div>
            </div>

            {/* Passphrase Option */}
            <div className={styles.passphraseToggleArea}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={usePassphrase}
                  onChange={(e) => setUsePassphrase(e.target.checked)}
                  disabled={isLoading}
                  className={styles.checkboxInput}
                />
                <span className={styles.passphraseToggleText}>
                  <Key size={14} /> Add an optional decryption passphrase (PBKDF2-HMAC-SHA256)
                </span>
              </label>

              {usePassphrase && (
                <div className={styles.passphraseInputWrapper}>
                  <input
                    type="password"
                    placeholder="Enter confidential passphrase..."
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className={`input-field ${styles.passphraseInput}`}
                    disabled={isLoading}
                  />
                  <p className={styles.passphraseHint}>
                    The recipient must enter this passphrase to decrypt, even if they have the link.
                  </p>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className={styles.submitRow}>
            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={isLoading}
              id="btn-create-secret"
            >
              <Lock size={18} />
              {isLoading ? "Encrypting in Browser..." : "Generate One-Time Secret Link"}
            </button>
          </div>
        </form>
      ) : (
        /* Generated Link Display Card */
        <div className={`glass-panel ${styles.resultCard}`}>
          <div className={styles.resultHeader}>
            <div className={styles.successIconBadge}>
              <ShieldCheck size={28} />
            </div>
            <h2 className={styles.resultTitle}>Your One-Time Link is Ready</h2>
            <p className={styles.resultSubtitle}>
              Share this link with your recipient. The decryption key is embedded in the
              URL&apos;s <span className={styles.hashPill}>#hash</span> fragment. Our servers
              cannot decrypt this secret.
            </p>
          </div>

          <div className={styles.linkBox}>
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className={`input-field ${styles.linkInput}`}
              id="share-link-input"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className={`btn btn-primary ${styles.copyBtn}`}
              id="btn-copy-link"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Security Notice */}
          <div className={styles.zeroKnowledgeBanner}>
            <Lock size={16} className={styles.bannerIcon} />
            <div>
              <strong className={styles.bannerStrong}>Zero-Knowledge Guarantee:</strong>
              <p className={styles.bannerText}>
                Per RFC 3986 §3.5, the part of the URL after the <code>#</code> is never
                sent to the server. Once the recipient views this link, the server-side
                ciphertext is destroyed permanently.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.resultActions}>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="btn btn-secondary btn-sm"
            >
              <QrCode size={16} /> {showQr ? "Hide QR Code" : "Show QR Code"}
            </button>

            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <ExternalLink size={16} /> Test Link (Will Burn)
            </a>

            <button
              type="button"
              onClick={handleBurnImmediately}
              className="btn btn-danger btn-sm"
              id="btn-burn-immediately"
            >
              <Flame size={16} /> Burn Now
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: "auto" }}
            >
              Create Another Secret
            </button>
          </div>

          {showQr && (
            <div className={styles.qrContainer}>
              <div className={styles.qrPlaceholder}>
                <p className={styles.qrText}>Scan on Mobile Device</p>
                {/* Clean SVG QR Representation */}
                <div className={styles.qrBox}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      generatedUrl
                    )}`}
                    alt="QR code for secret link"
                    width={180}
                    height={180}
                    className={styles.qrImage}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
