// wsCodec.ts — تشفير وفك تشفير إطارات WebSocket وفق معيار RFC 6455
// مستقل تماماً دون أي تبعيات خارجية (Zero-Dependencies)

import { Buffer } from 'node:buffer';

/**
 * تشفير إطار نصي مطابق لمعيار RFC 6455 لنقله من الخادم إلى العميل (غير مقنع Unmasked)
 */
export function encodeWsFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header: Buffer;

  if (len <= 125) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payload]);
}

/**
 * فك تشفير إطارات WebSocket الواردة من العميل (المقنعة Masked بحسب معيار RFC 6455)
 */
export function decodeClientWsFrames(buffer: Buffer): {
  messages: Array<{ opcode: number; text: string }>;
  remaining: Buffer;
} {
  const messages: Array<{ opcode: number; text: string }> = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (buffer.length - offset < 2) break;

    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];
    const opcode = byte0 & 0x0f;
    const isMasked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (buffer.length - offset < 4) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (buffer.length - offset < 10) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    const totalFrameLen = headerLen + maskLen + payloadLen;
    if (buffer.length - offset < totalFrameLen) break;

    let payloadData: Buffer;
    if (isMasked) {
      const maskKey = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      const rawPayload = buffer.subarray(offset + headerLen + 4, offset + totalFrameLen);
      payloadData = Buffer.alloc(payloadLen);
      for (let i = 0; i < payloadLen; i++) {
        payloadData[i] = rawPayload[i] ^ maskKey[i % 4];
      }
    } else {
      payloadData = buffer.subarray(offset + headerLen, offset + totalFrameLen);
    }

    messages.push({ opcode, text: payloadData.toString('utf8') });
    offset += totalFrameLen;
  }

  return { messages, remaining: buffer.subarray(offset) };
}
