import React from "react";
import SecretViewer from "@/components/secret/SecretViewer";

export const metadata = {
  title: "Reveal Secret — KDROP",
  description: "One-Time self-destructing secret. Encrypted in browser.",
  robots: "noindex, nofollow",
};

export default function SecretPage() {
  return <SecretViewer />;
}
