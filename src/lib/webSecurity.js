import { getPreference, setPreference } from "@/lib/localDb";

const LOCK_PREF_KEY = "app_lock";
export const LOCKOUT_DURATION_MS = 4 * 60 * 1000;
export const MAX_PIN_ATTEMPTS = 5;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8Array(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateSaltHex() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(bytes);
}

export async function hashPin(pin, saltHex) {
  const cleanPin = String(pin ?? "");
  if (!/^\d{4}$/.test(cleanPin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(cleanPin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltHex),
      iterations: 60000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toHex(derived);
}

export async function getAppLockState(ownerId = null) {
  const pref = await getPreference(ownerId, LOCK_PREF_KEY);
  return {
    enabled: Boolean(pref?.enabled && pref?.pinHash && pref?.salt),
    passkeyEnabled: Boolean(pref?.passkeyEnabled && pref?.passkeyCredentialId),
    failedAttempts: Number(pref?.failedAttempts || 0),
    lockedUntil: pref?.lockedUntil || null,
    updatedAt: pref?.updatedAt || null,
  };
}

export async function enablePinLock(ownerId = null, pin) {
  const clean = String(pin ?? "");
  if (!/^\d{4}$/.test(clean)) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  const existing = (await getPreference(ownerId, LOCK_PREF_KEY)) || {};
  const salt = generateSaltHex();
  const pinHash = await hashPin(clean, salt);
  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    {
      enabled: true,
      salt,
      pinHash,
      passkeyEnabled: Boolean(existing.passkeyEnabled),
      passkeyCredentialId: existing.passkeyCredentialId || null,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    },
    { enqueueSync: false }, // Never sync device-local lock secrets
  );
  return true;
}

export async function disablePinLock(ownerId = null) {
  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    {
      enabled: false,
      salt: null,
      pinHash: null,
      passkeyEnabled: false,
      passkeyCredentialId: null,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    },
    { enqueueSync: false },
  );
  return true;
}

export async function verifyPinAttempt(ownerId = null, candidatePin) {
  const pref = await getPreference(ownerId, LOCK_PREF_KEY);
  if (!pref?.enabled || !pref?.pinHash || !pref?.salt) {
    return { valid: true, lockedRemainingSeconds: 0 };
  }

  const now = Date.now();
  if (pref.lockedUntil && pref.lockedUntil > now) {
    const remaining = Math.ceil((pref.lockedUntil - now) / 1000);
    return { valid: false, lockedRemainingSeconds: remaining, attemptsLeft: 0 };
  }

  const clean = String(candidatePin ?? "");
  if (!/^\d{4}$/.test(clean)) {
    return { valid: false, lockedRemainingSeconds: 0, error: "Enter 4 digits." };
  }

  const computed = await hashPin(clean, pref.salt);
  if (computed === pref.pinHash) {
    await setPreference(
      ownerId,
      LOCK_PREF_KEY,
      { ...pref, failedAttempts: 0, lockedUntil: null },
      { enqueueSync: false },
    );
    return { valid: true, lockedRemainingSeconds: 0 };
  }

  const nextFailed = (Number(pref.failedAttempts) || 0) + 1;
  const triggeredLockout = nextFailed >= MAX_PIN_ATTEMPTS;
  const lockedUntil = triggeredLockout ? now + LOCKOUT_DURATION_MS : null;

  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    {
      ...pref,
      failedAttempts: triggeredLockout ? 0 : nextFailed,
      lockedUntil,
    },
    { enqueueSync: false },
  );

  return {
    valid: false,
    lockedRemainingSeconds: triggeredLockout
      ? Math.ceil(LOCKOUT_DURATION_MS / 1000)
      : 0,
    attemptsLeft: triggeredLockout ? 0 : MAX_PIN_ATTEMPTS - nextFailed,
  };
}

export function isPasskeySupported() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.PublicKeyCredential &&
      navigator.credentials &&
      typeof navigator.credentials.create === "function" &&
      typeof navigator.credentials.get === "function",
  );
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isPasskeySupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Registers a device-local WebAuthn passkey used strictly as a browser user-presence
 * unlock convenience (no server assertion verification; PIN stays primary).
 */
export async function registerLocalPasskey(ownerId = null, label = "SpendScope User") {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys are not supported in this browser.");
  }
  const pref = await getPreference(ownerId, LOCK_PREF_KEY);
  if (!pref?.enabled || !pref?.pinHash) {
    throw new Error("Enable a 4-digit PIN first before adding a passkey.");
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userIdBytes = new TextEncoder().encode(ownerId || "guest-local");

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "SpendScope (Device Local)",
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: label,
        displayName: label,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
      },
      timeout: 60000,
    },
  });

  if (!credential?.rawId) {
    throw new Error("Passkey setup was cancelled.");
  }

  const passkeyCredentialId = bufferToBase64Url(credential.rawId);
  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    {
      ...pref,
      passkeyEnabled: true,
      passkeyCredentialId,
      updatedAt: new Date().toISOString(),
    },
    { enqueueSync: false },
  );

  return true;
}

export async function verifyLocalPasskey(ownerId = null) {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys are unavailable.");
  }
  const pref = await getPreference(ownerId, LOCK_PREF_KEY);
  if (!pref?.passkeyEnabled || !pref?.passkeyCredentialId) {
    throw new Error("No local passkey registered.");
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: base64UrlToUint8Array(pref.passkeyCredentialId),
          type: "public-key",
        },
      ],
      userVerification: "preferred",
      timeout: 60000,
    },
  });

  if (!assertion) {
    return false;
  }

  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    { ...pref, failedAttempts: 0, lockedUntil: null },
    { enqueueSync: false },
  );
  return true;
}

export async function disableLocalPasskey(ownerId = null) {
  const pref = await getPreference(ownerId, LOCK_PREF_KEY);
  if (!pref) return false;
  await setPreference(
    ownerId,
    LOCK_PREF_KEY,
    {
      ...pref,
      passkeyEnabled: false,
      passkeyCredentialId: null,
      updatedAt: new Date().toISOString(),
    },
    { enqueueSync: false },
  );
  return true;
}
