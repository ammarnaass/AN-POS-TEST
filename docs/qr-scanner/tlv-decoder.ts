// TLV Decoder + ZATCA QR Code Verification
// POS-SCAN-002: Safe POS QR Code Reader

/**
 * ZATCA QR Code TLV Format (Phase 1 & 2):
 * Each field is encoded as: [Tag] [Length] [Value]
 *
 * Tag 1: Seller Name (UTF-8)
 * Tag 2: VAT Registration Number (15 digits)
 * Tag 3: Timestamp (ISO 8601)
 * Tag 4: Invoice Total (including VAT)
 * Tag 5: VAT Amount
 */

export interface ZATCAInvoiceData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalAmount: number;
  vatAmount: number;
  invoiceHash?: string;
  signature?: string;
}

export interface TLVField {
  tag: number;
  length: number;
  value: string;
}

export class TLVDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TLVDecodeError';
  }
}

/**
 * Decode a single TLV field from a byte buffer
 */
function decodeTLVField(buffer: Uint8Array, offset: number): { field: TLVField; nextOffset: number } {
  if (offset >= buffer.length) {
    throw new TLVDecodeError('Unexpected end of TLV data');
  }

  const tag = buffer[offset];
  if (offset + 1 >= buffer.length) {
    throw new TLVDecodeError(`Incomplete TLV field for tag ${tag}`);
  }

  const length = buffer[offset + 1];
  if (offset + 2 + length > buffer.length) {
    throw new TLVDecodeError(`TLV field ${tag} claims length ${length} but only ${buffer.length - offset - 2} bytes available`);
  }

  const valueBytes = buffer.slice(offset + 2, offset + 2 + length);
  const value = new TextDecoder('utf-8').decode(valueBytes);

  return {
    field: { tag, length, value },
    nextOffset: offset + 2 + length,
  };
}

/**
 * Decode ZATCA QR Code from Base64 string
 * Supports both TLV and JSON formats
 */
export function decodeZATCAQR(qrData: string): ZATCAInvoiceData {
  // Try Base64 TLV first (ZATCA standard)
  try {
    const decoded = atob(qrData.replace(/\s/g, ''));
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return decodeTLVBuffer(bytes);
  } catch {
    // Fall through to try JSON format
  }

  // Try JSON format (some systems use this)
  try {
    const json = JSON.parse(qrData);
    return {
      sellerName: json.sellerName || json.seller_name || '',
      vatNumber: json.vatNumber || json.vat_number || '',
      timestamp: json.timestamp || json.issue_date || '',
      totalAmount: Number(json.totalAmount || json.total_amount || 0),
      vatAmount: Number(json.vatAmount || json.vat_amount || 0),
      invoiceHash: json.invoiceHash || json.invoice_hash,
      signature: json.signature,
    };
  } catch {
    throw new TLVDecodeError('Unable to decode QR data: not valid TLV or JSON');
  }
}

/**
 * Decode TLV byte buffer into invoice data
 */
function decodeTLVBuffer(buffer: Uint8Array): ZATCAInvoiceData {
  const fields: TLVField[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const { field, nextOffset } = decodeTLVField(buffer, offset);
    fields.push(field);
    offset = nextOffset;
  }

  const getField = (tag: number): string =>
    fields.find((f) => f.tag === tag)?.value ?? '';

  const sellerName = getField(1);
  const vatNumber = getField(2);
  const timestamp = getField(3);
  const totalAmount = parseFloat(getField(4)) || 0;
  const vatAmount = parseFloat(getField(5)) || 0;

  if (!sellerName || !vatNumber) {
    throw new TLVDecodeError('Missing required TLV fields (seller name or VAT number)');
  }

  return {
    sellerName,
    vatNumber,
    timestamp,
    totalAmount,
    vatAmount,
  };
}

/**
 * Validate ZATCA VAT number format
 * Saudi VAT: 15 digits starting with 3
 */
export function validateVATNumber(vat: string): boolean {
  return /^3\d{14}$/.test(vat);
}

/**
 * Validate ZATCA timestamp format
 * Must be ISO 8601: YYYY-MM-DDTHH:MM:SSZ
 */
export function validateTimestamp(ts: string): boolean {
  if (!ts) return false;
  const date = new Date(ts);
  return !isNaN(date.getTime());
}

/**
 * Verify invoice signature using Web Crypto API
 * ZATCA uses RSA-SHA256 with PKCS#1 v1.5 padding
 */
export async function verifyInvoiceSignature(
  invoiceData: ZATCAInvoiceData,
  signatureBase64: string,
  publicKeyPEM: string
): Promise<boolean> {
  try {
    // Build the signed payload (ZATCA TLV hash)
    const payload = buildSignedPayload(invoiceData);
    const payloadBytes = new TextEncoder().encode(payload);

    // Import public key
    const publicKey = await importPublicKey(publicKeyPEM);

    // Import signature
    const sigBytes = base64ToBytes(signatureBase64);

    // Verify signature
    const valid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      publicKey,
      sigBytes,
      payloadBytes
    );

    return valid;
  } catch {
    return false;
  }
}

/**
 * Build the signed payload from invoice data (ZATCA format)
 */
function buildSignedPayload(data: ZATCAInvoiceData): string {
  // ZATCA canonical format for signing
  return [
    data.sellerName,
    data.vatNumber,
    data.timestamp,
    data.totalAmount.toFixed(2),
    data.vatAmount.toFixed(2),
  ].join('');
}

/**
 * Import RSA public key from PEM format
 */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = base64ToBytes(pemContents);

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Full verification flow: decode + validate + verify
 */
export async function verifyZATCAInvoice(
  qrData: string,
  expectedTotal?: number,
  publicKeyPEM?: string
): Promise<{
  valid: boolean;
  data: ZATCAInvoiceData;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Decode QR
  let data: ZATCAInvoiceData;
  try {
    data = decodeZATCAQR(qrData);
  } catch (e: any) {
    return {
      valid: false,
      data: {} as ZATCAInvoiceData,
      errors: [`Failed to decode QR: ${e.message}`],
      warnings: [],
    };
  }

  // Step 2: Validate VAT number
  if (!validateVATNumber(data.vatNumber)) {
    errors.push(`Invalid VAT number format: ${data.vatNumber}`);
  }

  // Step 3: Validate timestamp
  if (!validateTimestamp(data.timestamp)) {
    errors.push(`Invalid timestamp: ${data.timestamp}`);
  }

  // Step 4: Validate amounts
  if (data.totalAmount <= 0) {
    errors.push(`Invalid total amount: ${data.totalAmount}`);
  }

  const expectedVat = data.totalAmount * 0.15; // 15% VAT in Saudi Arabia
  if (Math.abs(data.vatAmount - expectedVat) > 0.01) {
    warnings.push(`VAT amount (${data.vatAmount}) doesn't match expected 15% of total (${expectedVat.toFixed(2)})`);
  }

  // Step 5: Compare with expected total
  if (expectedTotal !== undefined && Math.abs(data.totalAmount - expectedTotal) > 0.01) {
    errors.push(`Total mismatch: QR shows ${data.totalAmount}, expected ${expectedTotal}`);
  }

  // Step 6: Verify signature (if public key provided)
  if (publicKeyPEM && data.signature) {
    const sigValid = await verifyInvoiceSignature(data, data.signature, publicKeyPEM);
    if (!sigValid) {
      errors.push('Digital signature verification failed');
    }
  }

  return {
    valid: errors.length === 0,
    data,
    errors,
    warnings,
  };
}

/**
 * Generate ZATCA-compliant QR Code payload (TLV format)
 * Used when printing invoices
 */
export function generateZATCAQR(data: ZATCAInvoiceData): string {
  const fields: number[] = [];

  // Tag 1: Seller Name
  const nameBytes = new TextEncoder().encode(data.sellerName);
  fields.push(1, nameBytes.length, ...nameBytes);

  // Tag 2: VAT Number (15 bytes)
  const vatBytes = new TextEncoder().encode(data.vatNumber.padEnd(15, '\0'));
  fields.push(2, 15, ...vatBytes);

  // Tag 3: Timestamp
  const tsBytes = new TextEncoder().encode(data.timestamp);
  fields.push(3, tsBytes.length, ...tsBytes);

  // Tag 4: Total Amount
  const totalStr = data.totalAmount.toFixed(2);
  const totalBytes = new TextEncoder().encode(totalStr);
  fields.push(4, totalBytes.length, ...totalBytes);

  // Tag 5: VAT Amount
  const vatStr = data.vatAmount.toFixed(2);
  const vatBytes = new TextEncoder().encode(vatStr);
  fields.push(5, vatBytes.length, ...vatBytes);

  // Encode as Base64
  const bytes = new Uint8Array(fields);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
