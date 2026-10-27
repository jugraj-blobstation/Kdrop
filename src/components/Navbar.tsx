"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, KeyRound, MessageSquareCode, ShieldCheck } from "lucide-react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink} id="nav-brand">
          <div className={styles.logoIconWrapper}>
            <Shield className={styles.logoIcon} />
            <span className={styles.logoGlow}></span>
          </div>
          <div className={styles.logoTextGroup}>
            <span className={styles.brandTitle}>KDROP</span>
            <span className={styles.brandSubtitle}>Zero-Knowledge</span>
          </div>
        </Link>

        <nav className={styles.navLinks}>
          <Link
            href="/"
            className={`${styles.navItem} ${pathname === "/" ? styles.active : ""}`}
            id="nav-secret-tab"
          >
            <KeyRound size={16} />
            <span>One-Time Secret</span>
          </Link>
          <Link
            href="/room"
            className={`${styles.navItem} ${pathname.startsWith("/room") ? styles.active : ""}`}
            id="nav-room-tab"
          >
            <MessageSquareCode size={16} />
            <span>Encrypted Room</span>
          </Link>
          <Link
            href="/architecture"
            className={`${styles.navItem} ${pathname === "/architecture" ? styles.active : ""}`}
            id="nav-arch-tab"
          >
            <ShieldCheck size={16} />
            <span>Security Proof</span>
          </Link>
        </nav>

        <div className={styles.securityPill}>
          <div className="pulse-dot"></div>
          <span className={styles.securityPillText}>Client-Side AES-256-GCM</span>
        </div>
      </div>
    </header>
  );
}
