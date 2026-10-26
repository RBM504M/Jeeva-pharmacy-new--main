/**
 * Cryptographic & Integrity Utilities for Jeeva Pharmacy
 * - Pure TypeScript standard SHA-256 calculation (FIPS 180-2 compliant, synchronous, zero dependency)
 * - Real AES-256-GCM authenticated encryption & PBKDF2 key derivation using WebCrypto
 * - Cryptographic checksum verification for backup archives
 */

// Initial hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19)
const H = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

// Round constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Synchronous standard SHA-256 digest computation (RFC 6234 / FIPS 180-2).
 * Operates across all runtimes (Browser, Node.js, Electron, Vitest) without async requirements.
 */
export function computeSha256(asciiStr: string): string {
  // UTF-8 encode string to byte array
  const bytes: number[] = [];
  for (let i = 0; i < asciiStr.length; i++) {
    let code = asciiStr.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      // surrogate pair
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (asciiStr.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0x00);
  }

  // Append 64-bit length big-endian
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  for (let i = 3; i >= 0; i--) bytes.push((highBits >>> (i * 8)) & 0xff);
  for (let i = 3; i >= 0; i--) bytes.push((lowBits >>> (i * 8)) & 0xff);

  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
  }

  const h = [...H];
  const w = new Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
      const s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
      w[t] = (((w[t - 16] + s0) | 0) + ((w[t - 7] + s1) | 0)) | 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let h_val = h[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((h_val + S1) | 0) + ((ch + K[t]) | 0) + w[t]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h_val = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + h_val) | 0;
  }

  const hex = h.map((val) => (val >>> 0).toString(16).padStart(8, '0')).join('');
  return `sha256:${hex}`;
}

export function verifyChecksum(content: string, expectedChecksum: string): boolean {
  if (!expectedChecksum) return false;
  const computed = computeSha256(content);
  return computed.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Structure of an authenticated AES-256-GCM backup container
 */
export interface EncryptedBackupEnvelope {
  format: 'JEEVA_ENCRYPTED_BACKUP_V1';
  algorithm: 'AES-256-GCM';
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  sha256PlaintextChecksum: string;
}

const DEFAULT_SECRET = 'JeevaPharmacy_StatutoryRetailVaultKey_2026';

function bytesToHex(arr: Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive AES-GCM 256-bit key from passphrase using PBKDF2
 */
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt backup payload with AES-256-GCM and PBKDF2
 */
export async function encryptBackupPayload(
  plaintextJson: string,
  passphrase: string = DEFAULT_SECRET
): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;
  const plaintextChecksum = computeSha256(plaintextJson);

  const salt = new Uint8Array(16);
  cryptoObj.getRandomValues(salt);

  const iv = new Uint8Array(12);
  cryptoObj.getRandomValues(iv);

  const key = await deriveAesKey(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    enc.encode(plaintextJson)
  );

  const envelope: EncryptedBackupEnvelope = {
    format: 'JEEVA_ENCRYPTED_BACKUP_V1',
    algorithm: 'AES-256-GCM',
    saltHex: bytesToHex(salt),
    ivHex: bytesToHex(iv),
    ciphertextBase64: arrayBufferToBase64(ciphertextBuffer),
    sha256PlaintextChecksum: plaintextChecksum,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypt an AES-256-GCM backup envelope and verify integrity
 */
export async function decryptBackupPayload(
  content: string,
  passphrase: string = DEFAULT_SECRET
): Promise<{ success: boolean; plaintextJson?: string; error?: string }> {
  try {
    const parsed = JSON.parse(content);
    if (parsed.format !== 'JEEVA_ENCRYPTED_BACKUP_V1') {
      // Already plaintext JSON
      return { success: true, plaintextJson: content };
    }

    const envelope = parsed as EncryptedBackupEnvelope;
    const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : globalThis.crypto;

    const salt = hexToBytes(envelope.saltHex);
    const iv = hexToBytes(envelope.ivHex);
    const ciphertext = base64ToArrayBuffer(envelope.ciphertextBase64);

    const key = await deriveAesKey(passphrase, salt);
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const plaintextJson = dec.decode(decryptedBuffer);

    // Verify cryptographic checksum
    if (envelope.sha256PlaintextChecksum) {
      const computed = computeSha256(plaintextJson);
      if (computed !== envelope.sha256PlaintextChecksum) {
        return {
          success: false,
          error: `Backup checksum mismatch! Expected ${envelope.sha256PlaintextChecksum}, calculated ${computed}`,
        };
      }
    }

    return { success: true, plaintextJson };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to decrypt backup archive: ${err?.message || 'Invalid passphrase or corrupted data'}`,
    };
  }
}
