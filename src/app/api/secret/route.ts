import { NextRequest, NextResponse } from "next/server";
import { saveSecret } from "@/lib/store/memory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ciphertext, iv, salt, ttlSeconds = 86400, burnOnRead = true, maxViews = 1 } = body;

    if (!id || typeof id !== "string" || !ciphertext || typeof ciphertext !== "string" || !iv) {
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // Safety checks: max ciphertext payload size 5MB
    if (ciphertext.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload exceeds 5MB limit" }, { status: 413 });
    }

    // Cap TTL between 60 seconds (1 minute) and 7 days (604800 seconds)
    const validTtl = Math.max(60, Math.min(Number(ttlSeconds) || 86400, 604800));
    const expiresAt = Date.now() + validTtl * 1000;

    saveSecret({
      id,
      ciphertext,
      iv,
      salt: salt || undefined,
      expiresAt,
      burnOnRead: Boolean(burnOnRead),
      maxViews: Math.max(1, Number(maxViews) || 1),
    });

    return NextResponse.json(
      {
        success: true,
        id,
        expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to store encrypted secret" }, { status: 500 });
  }
}
