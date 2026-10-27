import React from "react";
import SecretCreate from "@/components/secret/SecretCreate";

export default function Home() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <SecretCreate />
    </div>
  );
}
