import React from "react";
import RoomChat from "@/components/room/RoomChat";

export const metadata = {
  title: "Encrypted Room — KDROP",
  description: "End-to-End Encrypted Ephemeral Room. Zero message persistence.",
  robots: "noindex, nofollow",
};

export default function RoomPage() {
  return <RoomChat />;
}
