import React from "react";
import {
  ShieldCheck,
  Lock,
  Cpu,
  ServerOff,
  Flame,
  CheckCircle2,
  FileCode,
  Key,
} from "lucide-react";
import styles from "./architecture.module.css";

export const metadata = {
  title: "Security Architecture & Cryptographic Proof — KDROP",
  description:
    "Mathematical and architectural security proof. Why KDROP cannot read your secrets.",
};

export default function ArchitecturePage() {
  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div className={styles.badge}>
          <ShieldCheck size={14} />
          <span>Zero-Knowledge Proof & Architecture</span>
        </div>
        <h1 className={styles.title}>Cryptographic Proof & Threat Model</h1>
        <p className={styles.subtitle}>
          How KDROP guarantees 100% security against server compromises, eavesdroppers, and rogue proxies.
        </p>
      </div>

      <div className={styles.sectionsList}>
        {/* Section 1: The #hash Guarantee */}
        <section className={`glass-panel ${styles.archCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <Key size={24} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>1. The URL Fragment (#hash) Guarantee</h2>
              <span className={styles.specRef}>RFC 3986 §3.5 Standard</span>
            </div>
          </div>
          <p className={styles.cardText}>
            When a secret or room link is generated, the decryption key is placed strictly
            inside the URL fragment after the hash character (e.g. <code>#AES_KEY_256</code>).
          </p>
          <div className={styles.calloutBox}>
            <strong className={styles.calloutTitle}>Crucial Web Architecture Law:</strong>
            <p className={styles.calloutText}>
              By web specification, browser clients <strong>never transmit the fragment identifier</strong> to
              the web server in HTTP request headers. Neither the server, Cloudflare, ISPs, nor intermediate
              proxies can ever see, log, or store the decryption key.
            </p>
          </div>
        </section>

        {/* Section 2: Hardware-Accelerated AES-256-GCM */}
        <section className={`glass-panel ${styles.archCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <Cpu size={24} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>2. Hardware-Accelerated AES-256-GCM</h2>
              <span className={styles.specRef}>W3C Web Cryptography API</span>
            </div>
          </div>
          <p className={styles.cardText}>
            All encryption executes directly inside the browser sandbox using <code>window.crypto.subtle</code>:
          </p>
          <div className={styles.bulletList}>
            <div className={styles.bulletItem}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span><strong>Cipher:</strong> Authenticated Encryption with Associated Data (AEAD) via AES-GCM-256.</span>
            </div>
            <div className={styles.bulletItem}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span><strong>IV / Nonce:</strong> Cryptographically fresh 96-bit random vector per payload.</span>
            </div>
            <div className={styles.bulletItem}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span><strong>Integrity:</strong> 128-bit authentication tag guarantees tampering causes immediate decryption abort.</span>
            </div>
          </div>
        </section>

        {/* Section 3: Passphrase Derivation */}
        <section className={`glass-panel ${styles.archCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <Lock size={24} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>3. Passphrase Hardening (PBKDF2)</h2>
              <span className={styles.specRef}>OWASP 2024 Standards</span>
            </div>
          </div>
          <p className={styles.cardText}>
            For passphrase-protected secrets, the key is derived using <strong>PBKDF2-HMAC-SHA256</strong> with:
          </p>
          <div className={styles.bulletList}>
            <div className={styles.bulletItem}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span><strong>600,000 Iterations:</strong> Renders brute-force and dictionary attacks computationally infeasible.</span>
            </div>
            <div className={styles.bulletItem}>
              <CheckCircle2 size={16} className={styles.checkIcon} />
              <span><strong>128-bit Random Salt:</strong> Completely prevents rainbow table and precomputed hash attacks.</span>
            </div>
          </div>
        </section>

        {/* Section 4: Ephemeral Zero-Persistence */}
        <section className={`glass-panel ${styles.archCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <Flame size={24} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>4. Volatile RAM & Atomic Burn-on-Read</h2>
              <span className={styles.specRef}>Zero-Persistence Engine</span>
            </div>
          </div>
          <p className={styles.cardText}>
            Ciphertext is stored solely in volatile RAM with atomic fetch-and-delete (<code>GETDEL</code>).
            Once revealed, the ciphertext is permanently expunged. Chat rooms run on blind streaming relays where
            messages exist only in peer RAM and leave no disk footprint.
          </p>
        </section>

        {/* Section 5: Defense-in-Depth */}
        <section className={`glass-panel ${styles.archCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <FileCode size={24} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>5. Defense-in-Depth Headers & Zero Telemetry</h2>
              <span className={styles.specRef}>Anti-Exfiltration Posture</span>
            </div>
          </div>
          <p className={styles.cardText}>
            Rigid Content Security Policy (CSP), HSTS, and zero external trackers (no Google Analytics, no third-party CDNs).
            Self-hosted assets only.
          </p>
        </section>
      </div>
    </div>
  );
}
