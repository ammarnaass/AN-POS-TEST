import { AnposNetwork } from '@/modules/AnposNetwork';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

export interface DiscoveredDevice {
  ip: string;
  port: number;
  deviceName: string;
  shopName: string;
  version: string;
  responseTime: number;
}

const DISCOVERY_PORT = 4321;
const DISCOVERY_TIMEOUT = 1200;

export async function getCurrentSubnet(): Promise<string> {
  try {
    const localIp = await AnposNetwork.getLocalIP();
    if (localIp) {
      const match = localIp.match(/^(\d+\.\d+\.\d+)\.\d+$/);
      if (match && match[1] !== '127.0.0' && match[1] !== '0.0.0') {
        return match[1];
      }
    }

    const subnet = await AnposNetwork.getSubnet();
    if (subnet && subnet !== '192.168.1' && subnet.split('.').length === 3) {
      return subnet;
    }

    const gateway = await AnposNetwork.getGateway();
    if (gateway) {
      const match = gateway.match(/^(\d+\.\d+\.\d+)\.\d+$/);
      if (match) return match[1];
    }

    return '192.168.1';
  } catch {
    return '192.168.1';
  }
}

async function probeHost(ip: string, port: number): Promise<DiscoveredDevice | null> {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

  try {
    let response = await fetch(`http://${ip}:${port}/api/discover`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
    }).catch(() => null);

    if (!response || !response.ok) {
      response = await fetch(`http://${ip}:${port}/api/pair/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
      }).catch(() => null);
    }

    clearTimeout(timeoutId);
    if (response && response.ok) {
      const data = await response.json().catch(() => ({}));
      const responseTime = Math.round(Date.now() - start);
      return {
        ip,
        port: data.port || port,
        deviceName: data.deviceName || data.device_name || data.shopName || 'حاسوب AN POS',
        shopName: data.shopName || data.shop_name || '',
        version: data.version || '3.0',
        responseTime,
      };
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Scan all IPs 1..254 in concurrent batches for comprehensive and rapid discovery
 */
async function scanSubnetThorough(
  subnet: string,
  port: number,
  onProgress?: (current: number, total: number) => void,
): Promise<DiscoveredDevice[]> {
  const results: DiscoveredDevice[] = [];
  const allIPs: string[] = [];
  for (let i = 1; i <= 254; i++) {
    allIPs.push(`${subnet}.${i}`);
  }

  const BATCH_SIZE = 35;
  let scannedCount = 0;

  for (let i = 0; i < allIPs.length; i += BATCH_SIZE) {
    const chunk = allIPs.slice(i, i + BATCH_SIZE);
    const batch = chunk.map((ip) => probeHost(ip, port));
    const batchResults = await Promise.allSettled(batch);

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    scannedCount += chunk.length;
    onProgress?.(scannedCount, allIPs.length);

    if (results.length > 0) {
      break;
    }
  }

  return results;
}

export async function detectLocalServer(
  onProgress?: (current: number, total: number) => void,
): Promise<DiscoveredDevice[]> {
  const allResults: DiscoveredDevice[] = [];

  // Check last known IP first for instant reconnection
  const knownServer = await AnposSecureStore.get('anpos_last_discovered_ip');
  if (knownServer) {
    const result = await probeHost(knownServer, DISCOVERY_PORT);
    if (result) {
      allResults.push(result);
      onProgress?.(100, 100);
      return allResults;
    }
  }

  const subnet = await getCurrentSubnet();
  const localResults = await scanSubnetThorough(subnet, DISCOVERY_PORT, onProgress);
  allResults.push(...localResults);

  if (allResults.length === 0) {
    const fallbackSubnets = ['192.168.1', '192.168.0', '192.168.8', '192.168.43', '172.20.10', '10.0.0'].filter(
      (s) => s !== subnet
    );
    for (const fbSubnet of fallbackSubnets) {
      const results = await scanSubnetThorough(fbSubnet, DISCOVERY_PORT, onProgress);
      allResults.push(...results);
      if (results.length > 0) break;
    }
  }

  // Also test port 3000 if nothing found on 4321
  if (allResults.length === 0) {
    const port3000Result = await probeHost(subnet + '.1', 3000);
    if (port3000Result) allResults.push(port3000Result);
  }

  if (allResults.length > 0) {
    await AnposSecureStore.set('anpos_last_discovered_ip', allResults[0].ip);
  }

  return allResults;
}

export async function checkServer(ip: string, port: number = DISCOVERY_PORT): Promise<DiscoveredDevice | null> {
  return probeHost(ip, port);
}
