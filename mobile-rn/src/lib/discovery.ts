import { AnposNetwork } from '@/modules/AnposNetwork';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

export interface DiscoveredDevice {  ip: string;
  port: number;
  deviceName: string;
  shopName: string;
  version: string;
  responseTime: number;
}

const DISCOVERY_PORT = 4321;
const DISCOVERY_TIMEOUT = 2000;

export async function getCurrentSubnet(): Promise<string> {
  try {
    const subnet = await AnposNetwork.getSubnet();
    if (subnet) return subnet;
    
    const gateway = await AnposNetwork.getGateway();
    if (gateway) {
      const match = gateway.match(/(\d+\.\d+\.\d+)\.\d+/);
      if (match) return match[1];
    }
    
    return '192.168.1';
  } catch {
    return '192.168.1';
  }
}

async function probeHost(ip: string, port: number): Promise<DiscoveredDevice | null> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

    const response = await fetch(`http://${ip}:${port}/api/discover`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'X-Discovery': 'anpos-mobile' },
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      const responseTime = Math.round(Date.now() - start);
      return {
        ip,
        port: data.port || port,
        deviceName: data.deviceName || data.device_name || 'حاسوب AN POS',
        shopName: data.shopName || data.shop_name || '',
        version: data.version || '',
        responseTime,
      };
    }
  } catch {
    // Host unreachable or timeout
  }
  return null;
}

/**
 * Scan only the most likely IPs in the subnet for speed
 * Scans .1, .254, and then random 10 IPs
 */
async function scanSubnetFast(
  subnet: string,
  port: number,
  onProgress?: (current: number, total: number) => void,
): Promise<DiscoveredDevice[]> {
  const results: DiscoveredDevice[] = [];
  const likelyIPs = [
    `${subnet}.1`, `${subnet}.254`,
    `${subnet}.${Math.floor(Math.random() * 100) + 50}`,
    `${subnet}.${Math.floor(Math.random() * 100) + 100}`,
  ];

  const batch: Promise<DiscoveredDevice | null>[] = likelyIPs.map(ip => probeHost(ip, port));
  const batchResults = await Promise.allSettled(batch);
  
  for (const result of batchResults) {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
    }
  }

  onProgress?.(likelyIPs.length, likelyIPs.length);
  return results;
}

export async function detectLocalServer(
  onProgress?: (current: number, total: number) => void,
): Promise<DiscoveredDevice[]> {
  const allResults: DiscoveredDevice[] = [];

  const subnet = await getCurrentSubnet();

  const localResults = await scanSubnetFast(subnet, DISCOVERY_PORT, onProgress);
  allResults.push(...localResults);

  const knownServer = await AnposSecureStore.get('anpos_last_discovered_ip');
  if (knownServer) {
    const result = await probeHost(knownServer, DISCOVERY_PORT);
    if (result) allResults.push(result);
  }

  if (allResults.length === 0) {
    const commonSubnets = ['192.168.1', '192.168.0', '10.0.0'];
    for (const subnet of commonSubnets) {
      const results = await scanSubnetFast(subnet, DISCOVERY_PORT, onProgress);
      allResults.push(...results);
      if (results.length > 0) break;
    }
  }

  if (allResults.length > 0) {
    await AnposSecureStore.set('anpos_last_discovered_ip', allResults[0].ip);
  }

  return allResults;
}

export async function checkServer(ip: string, port: number = DISCOVERY_PORT): Promise<DiscoveredDevice | null> {
  return probeHost(ip, port);
}
