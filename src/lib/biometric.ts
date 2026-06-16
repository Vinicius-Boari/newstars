// Login por biometria (impressão digital / Face ID) usando WebAuthn.
// Funciona em Chrome Android (digital), iOS Safari 16+ (Face/Touch ID)
// e em apps instalados via PWA / Capacitor (WebView Chrome).

const CRED_KEY = "newstars:bio:credentialId";
const SESSION_KEY = "newstars:bio:session";
const RP_NAME = "NewStars";
let activeVerification: Promise<boolean> | null = null;

function b64uToBuf(b64u: string): ArrayBuffer {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function bufToB64u(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!window.PublicKeyCredential) return false;
    // @ts-ignore
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return !!available;
  } catch {
    return false;
  }
}

export function hasBiometricEnrolled(): boolean {
  return !!localStorage.getItem(CRED_KEY) && !!localStorage.getItem(SESSION_KEY);
}

export function clearBiometric() {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function saveBiometricSession(session: { access_token: string; refresh_token: string }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getBiometricSession(): { access_token: string; refresh_token: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function registerBiometric(username: string): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
        requireResidentKey: false,
      },
      // Sinaliza ao navegador para usar APENAS biometria do próprio
      // aparelho (sem mostrar opções de "salvar passkey", "outro
      // dispositivo" ou "chave de segurança").
      // @ts-ignore - 'hints' é um campo recente da spec WebAuthn
      hints: ["client-device"],
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(CRED_KEY, bufToB64u(cred.rawId));
  return true;
}

export async function verifyBiometric(): Promise<boolean> {
  if (activeVerification) return activeVerification;

  activeVerification = runBiometricVerification().finally(() => {
    activeVerification = null;
  });

  return activeVerification;
}

async function runBiometricVerification(): Promise<boolean> {
  const credIdB64 = localStorage.getItem(CRED_KEY);
  if (!credIdB64) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [
          { id: b64uToBuf(credIdB64), type: "public-key", transports: ["internal"] },
        ],
        // @ts-ignore
        hints: ["client-device"],
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}