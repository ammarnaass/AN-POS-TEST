// generateQR — توليد QR Code حقيقي عبر qrcode package
import QRCode from 'qrcode';

/** توليد QR Code كـ data URL (PNG base64) */
export async function generateQRDataURL(text: string, opts?: { size?: number; margin?: number }): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts?.size ?? 120,
    margin: opts?.margin ?? 1,
    errorCorrectionLevel: 'M',
  });
}

/** توليد QR Code كـ SVG string */
export async function generateQRSVG(text: string, opts?: { size?: number; margin?: number }): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: opts?.size ?? 120,
    margin: opts?.margin ?? 1,
    errorCorrectionLevel: 'M',
  });
}
