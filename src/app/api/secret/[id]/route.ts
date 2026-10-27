import { NextRequest, NextResponse } from "next/server";
import { getAndBurnSecret, burnSecretImmediately } from "@/lib/store/memory";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing secret ID" }, { status: 400 });
    }

    const result = getAndBurnSecret(id);
    if (!result) {
      return NextResponse.json(
        { error: "Secret not found, already burned, or expired." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ciphertext: result.ciphertext,
      iv: result.iv,
      salt: result.salt,
      burned: result.burned,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing secret ID" }, { status: 400 });
    }

    const deleted = burnSecretImmediately(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
