import { NextRequest, NextResponse } from "next/server";
import { setRoomLock, destroyRoom } from "@/lib/store/memory";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await req.json();
    const { action, isLocked } = body;

    if (action === "LOCK") {
      const updated = setRoomLock(roomId, Boolean(isLocked));
      return NextResponse.json({ success: updated, isLocked: Boolean(isLocked) });
    }

    if (action === "DESTROY") {
      destroyRoom(roomId);
      return NextResponse.json({ success: true, destroyed: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to perform room control action" }, { status: 500 });
  }
}
