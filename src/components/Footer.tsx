import React from "react";
import { Lock, EyeOff, ServerOff, Terminal } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.pillarsGrid}>
          <div className={styles.pillar}>
            <div className={styles.pillarIcon}>
              <ServerOff size={18} />
            </div>
            <div>
              <h4 className={styles.pillarTitle}>No Accounts & No Logs</h4>
              <p className={styles.pillarDesc}>
                We do not track IPs, browser fingerprints, or message payloads. Zero persistence.
              </p>
            </div>
          </div>

          <div className={styles.pillar}>
            <div className={styles.pillarIcon}>
              <Lock size={18} />
            </div>
            <div>
              <h4 className={styles.pillarTitle}>Client-Side AES-256-GCM</h4>
              <p className={styles.pillarDesc}>
                Encrypted with W3C WebCrypto before leaving your browser. Server only sees blind ciphertext.
              </p>
            </div>
          </div>

          <div className={styles.pillar}>
            <div className={styles.pillarIcon}>
              <EyeOff size={18} />
            </div>
            <div>
              <h4 className={styles.pillarTitle}>Zero-Knowledge Keys (#hash)</h4>
              <p className={styles.pillarDesc}>
                Decryption keys reside in the URL fragment (#hash) which browsers never send to HTTP servers.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            KDROP — Privacy Architecture for Confidential Communication.
          </p>
          <div className={styles.techBadges}>
            <span className={styles.badge}>
              <Terminal size={12} /> W3C SubtleCrypto
            </span>
            <span className={styles.badge}>PBKDF2-HMAC-SHA256 (600k)</span>
            <span className={styles.badge}>RFC 3986 §3.5 Client Hash</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
