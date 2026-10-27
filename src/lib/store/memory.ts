/**
 * KDROP Ephemeral In-Memory Store
 * Zero-Persistence RAM storage with atomic burn-on-read and TTL eviction.
 */

export interface StoredSecret {
  id: string;
  ciphertext: string;
  iv: string;
  salt?: string;
  expiresAt: number; // UNIX timestamp ms
  burnOnRead: boolean;
  maxViews: number;
  views: number;
  createdAt: number;
}

export interface EncryptedRoomMessage {
  id: string;
  roomId: string;
  ciphertext: string;
  iv: string;
  senderTag: string; // Anonymous sender pseudo-tag e.g. "anon-4f1b"
  timestamp: number;
}

export interface EphemeralRoom {
  id: string;
  createdAt: number;
  lastActivity: number;
  isLocked: boolean;
  peers: Set<string>; // Peer IDs
}

// Global in-memory storage singletons (survives Fast Refresh in dev)
declare global {
  // eslint-disable-next-line no-var
  var __kdrop_secrets: Map<string, StoredSecret> | undefined;
  // eslint-disable-next-line no-var
  var __kdrop_rooms: Map<string, EphemeralRoom> | undefined;
  // eslint-disable-next-line no-var
  var __kdrop_room_subscribers: Map<string, Set<(data: string) => void>> | undefined;
}

const secretsStore: Map<string, StoredSecret> =
  global.__kdrop_secrets ?? (global.__kdrop_secrets = new Map());

const roomsStore: Map<string, EphemeralRoom> =
  global.__kdrop_rooms ?? (global.__kdrop_rooms = new Map());

const roomSubscribers: Map<string, Set<(data: string) => void>> =
  global.__kdrop_room_subscribers ?? (global.__kdrop_room_subscribers = new Map());

// Periodic sweeper for expired secrets (runs every 60s)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, secret] of secretsStore.entries()) {
      if (secret.expiresAt <= now) {
        secretsStore.delete(id);
      }
    }
    // Clean up empty inactive rooms after 2 hours of inactivity
    for (const [roomId, room] of roomsStore.entries()) {
      if (now - room.lastActivity > 2 * 60 * 60 * 1000 && room.peers.size === 0) {
        roomsStore.delete(roomId);
        roomSubscribers.delete(roomId);
      }
    }
  }, 60_000);
}

// ---------------- Secret Operations ----------------

export function saveSecret(secret: Omit<StoredSecret, "views" | "createdAt">): void {
  secretsStore.set(secret.id, {
    ...secret,
    views: 0,
    createdAt: Date.now(),
  });
}

/**
 * Atomically retrieves and burns the secret if burnOnRead is true or max views reached.
 */
export function getAndBurnSecret(id: string): {
  ciphertext: string;
  iv: string;
  salt?: string;
  burned: boolean;
} | null {
  const secret = secretsStore.get(id);
  if (!secret) return null;

  // Check TTL expiration
  if (secret.expiresAt <= Date.now()) {
    secretsStore.delete(id);
    return null;
  }

  secret.views += 1;
  const shouldBurn = secret.burnOnRead || secret.views >= secret.maxViews;

  if (shouldBurn) {
    secretsStore.delete(id);
  }

  return {
    ciphertext: secret.ciphertext,
    iv: secret.iv,
    salt: secret.salt,
    burned: shouldBurn,
  };
}

export function burnSecretImmediately(id: string): boolean {
  return secretsStore.delete(id);
}

// ---------------- Room Operations ----------------

export function getOrCreateRoom(roomId: string): EphemeralRoom {
  let room = roomsStore.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isLocked: false,
      peers: new Set(),
    };
    roomsStore.set(roomId, room);
  }
  return room;
}

export function registerPeer(roomId: string, peerId: string): { success: boolean; error?: string } {
  const room = getOrCreateRoom(roomId);
  if (room.isLocked && !room.peers.has(peerId)) {
    return { success: false, error: "Room is locked by the host." };
  }
  room.peers.add(peerId);
  room.lastActivity = Date.now();
  broadcastRoomEvent(roomId, {
    type: "PEER_JOINED",
    peerId,
    peerCount: room.peers.size,
  });
  return { success: true };
}

export function unregisterPeer(roomId: string, peerId: string): void {
  const room = roomsStore.get(roomId);
  if (!room) return;
  room.peers.delete(peerId);
  room.lastActivity = Date.now();
  broadcastRoomEvent(roomId, {
    type: "PEER_LEFT",
    peerId,
    peerCount: room.peers.size,
  });
}

export function setRoomLock(roomId: string, isLocked: boolean): boolean {
  const room = roomsStore.get(roomId);
  if (!room) return false;
  room.isLocked = isLocked;
  broadcastRoomEvent(roomId, {
    type: "ROOM_LOCK_CHANGED",
    isLocked,
  });
  return true;
}

export function destroyRoom(roomId: string): void {
  broadcastRoomEvent(roomId, {
    type: "ROOM_DESTROYED",
    reason: "Host burned the chat room.",
  });
  roomsStore.delete(roomId);
  roomSubscribers.delete(roomId);
}

export function subscribeToRoom(roomId: string, listener: (data: string) => void): () => void {
  if (!roomSubscribers.has(roomId)) {
    roomSubscribers.set(roomId, new Set());
  }
  const subs = roomSubscribers.get(roomId)!;
  subs.add(listener);

  return () => {
    subs.delete(listener);
    if (subs.size === 0) {
      roomSubscribers.delete(roomId);
    }
  };
}

export function broadcastRoomMessage(
  roomId: string,
  message: { ciphertext: string; iv: string; senderTag: string }
): void {
  const room = roomsStore.get(roomId);
  if (room) {
    room.lastActivity = Date.now();
  }

  broadcastRoomEvent(roomId, {
    type: "MESSAGE",
    id: Math.random().toString(36).substring(2, 10),
    ciphertext: message.ciphertext,
    iv: message.iv,
    senderTag: message.senderTag,
    timestamp: Date.now(),
  });
}

function broadcastRoomEvent(roomId: string, payload: Record<string, unknown>): void {
  const subs = roomSubscribers.get(roomId);
  if (!subs) return;
  const json = JSON.stringify(payload);
  for (const listener of subs) {
    try {
      listener(json);
    } catch {
      // client connection closed
    }
  }
}
