import { NextRequest } from "next/server";
import {
  registerPeer,
  unregisterPeer,
  subscribeToRoom,
  getOrCreateRoom,
} from "@/lib/store/memory";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const { searchParams } = new URL(req.url);
  const peerId = searchParams.get("peerId") || `peer-${Math.random().toString(36).substring(2, 8)}`;

  const room = getOrCreateRoom(roomId);
  const registration = registerPeer(roomId, peerId);

  if (!registration.success) {
    return new Response(JSON.stringify({ error: registration.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialPayload = JSON.stringify({
        type: "INIT",
        roomId,
        peerId,
        isLocked: room.isLocked,
        peerCount: room.peers.size,
      });
      controller.enqueue(encoder.encode(`data: ${initialPayload}\n\n`));

      // Subscribe to room broadcast events
      const unsubscribe = subscribeToRoom(roomId, (payloadString: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payloadString}\n\n`));
        } catch {
          // Stream controller closed
        }
      });

      // Keepalive heartbeat every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15_000);

      // Clean up on disconnect / abort
      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        unsubscribe();
        unregisterPeer(roomId, peerId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      unregisterPeer(roomId, peerId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
