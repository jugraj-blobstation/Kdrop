import { NextRequest, NextResponse } from "next/server";
import { broadcastRoomMessage, getOrCreateRoom } from "@/lib/store/memory";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await req.json();
    const { ciphertext, iv, senderTag } = body;

    if (!ciphertext || !iv) {
      return NextResponse.json({ error: "Missing encrypted payload" }, { status: 400 });
    }

    // Size limit on messages (e.g. 5MB for encrypted text or attached files)
    if (ciphertext.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Message exceeds 5MB size limit" }, { status: 413 });
    }

    const room = getOrCreateRoom(roomId);
    if (room.isLocked) {
      // Room is locked against new joiners, but active participants can message.
    }

    broadcastRoomMessage(roomId, {
      ciphertext,
      iv,
      senderTag: senderTag || "anon",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to broadcast message" }, { status: 500 });
  }
}
