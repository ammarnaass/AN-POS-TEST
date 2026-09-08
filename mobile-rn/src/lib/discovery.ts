import { AnposNetwork } from '@/modules/AnposNetwork';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { STORAGE_KEYS } from './storageKeys';

export interface DiscoveredDevice {
  ip: string;
  port: number;
  deviceName: string;
  shopName: string;
  version: string;
  requiresPairing?: boolean;
  responseTime: number;
}

export const DEFAULT_DISCOVERY_PORT = 4321;
export const FALLBACK_DISCOVERY_PORT = 3000;
export const DISCOVERY_PORT = DEFAULT_DISCOVERY_PORT;
const PROBE_TIMEOUT_MS = 650;
export const AUTO_DISCOVERY_TIMEOUT_MS = 8000;

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
    if (subnet && subnet !== '0.0.0' && subnet.split('.').length === 3) {
      return subnet;
    }

    const gateway = await AnposNetwork.getGateway();
    if (gateway) {
      const match = gateway.match(/^(\d+\.\d+\.\d+)\.\d+$/);
      if (match && match[1] !== '0.0.0') return match[1];
    }

    return '192.168.1';
  } catch {
    return '192.168.1';
  }
}

export async function probeHost(
  ip: string,
  port: number = DEFAULT_DISCOVERY_PORT,
  parentSignal?: AbortSignal
): Promise<DiscoveredDevice | null> {
  if (parentSignal?.aborted) return null;

  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    // 1. Primary endpoint according to PRD §7: GET /api/discover
    let response = await fetch(`http://${ip}:${port}/api/discover`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
    }).catch(() => null);

    // 2. Secondary fallback: /api/pair/info
    if (!response || !response.ok) {
      if (parentSignal?.aborted) return null;
      response = await fetch(`http://${ip}:${port}/api/pair/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
      }).catch(() => null);
    }

    // 3. Tertiary fallback: /api/settings
    if (!response || !response.ok) {
      if (parentSignal?.aborted) return null;
      response = await fetch(`http://${ip}:${port}/api/settings`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
      }).catch(() => null);
    }

    clearTimeout(timeoutId);
    parentSignal?.removeEventListener('abort', onParentAbort);

    if (response && response.ok) {
      const data = await response.json().catch(() => ({}));
      const responseTime = Math.max(1, Math.round(Date.now() - start));
      const shopName =
        data.shopName ||
        data.shop_name ||
        data.store_name ||
        data.name ||
        data.settings?.shop_name ||
        'AN POS Desktop';
      const deviceName =
        data.deviceName ||
        data.device_name ||
        shopName ||
        `AN POS (${ip})`;

      return {
        ip,
        port: data.port || port,
        deviceName,
        shopName,
        version: data.version || '3.0',
        requiresPairing: data.requiresPairing ?? true,
        responseTime,
      };
    }
  } catch {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
  return null;
}

/**
 * Scan all IPs in a subnet in fast parallel batches
 */
async function scanSubnetBatch(
  subnet: string,
  port: number,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<DiscoveredDevice[]> {
  const results: DiscoveredDevice[] = [];
  const allIPs: string[] = [];
  for (let i = 1; i <= 254; i++) {
    allIPs.push(`${subnet}.${i}`);
  }

  const BATCH_SIZE = 50;
  let scannedCount = 0;

  for (let i = 0; i < allIPs.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const chunk = allIPs.slice(i, i + BATCH_SIZE);
    const batch = chunk.map((ip) => probeHost(ip, port, signal));
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

export interface DiscoveryOptions {
  preferredPort?: number;
}

/**
 * Persists both the last known IP and port of the discovered server.
 */
export async function rememberDevice(device: { ip: string; port: number }): Promise<void> {
  try {
    if (!device?.ip) return;
    await Promise.all([
      AnposSecureStore.set(STORAGE_KEYS.LAST_DISCOVERED_IP, device.ip),
      device.port ? AnposSecureStore.set(STORAGE_KEYS.LAST_DISCOVERED_PORT, String(device.port)) : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn('[discovery] Failed to remember device:', err);
  }
}

/**
 * Extracts and persists host and port from a full server URL string.
 */
export async function rememberServerUrl(rawUrl: string): Promise<void> {
  try {
    if (!rawUrl) return;
    const trimmed = rawUrl.trim();
    let urlString = trimmed;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = `http://${urlString}`;
    }
    const u = new URL(urlString);
    const ip = u.hostname;
    const port = Number(u.port) || (u.protocol === 'https:' ? 443 : DEFAULT_DISCOVERY_PORT);
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      await rememberDevice({ ip, port });
    }
  } catch {}
}

/**
 * Computes an ordered, deduplicated list of candidate ports (max 4).
 * Priority: User preferredPort > Last remembered port > URL port > DEFAULT_PORT (4321) > FALLBACK_PORT (3000).
 */
export async function getCandidatePorts(preferredPort?: number): Promise<number[]> {
  const ports: number[] = [];

  const isValidPort = (p: unknown): p is number => {
    const num = Number(p);
    return !isNaN(num) && num >= 1 && num <= 65535;
  };

  // 1. Explicitly preferred port (from user input / override)
  if (isValidPort(preferredPort)) {
    ports.push(Number(preferredPort));
  }

  // 2. Last remembered discovered port
  try {
    const lastPortRaw = await AnposSecureStore.get(STORAGE_KEYS.LAST_DISCOVERED_PORT);
    if (isValidPort(lastPortRaw)) {
      ports.push(Number(lastPortRaw));
    }
  } catch {}

  // 3. Port extracted from saved SERVER_URL
  try {
    const serverUrl = await AnposSecureStore.get(STORAGE_KEYS.SERVER_URL);
    if (serverUrl) {
      const u = new URL(serverUrl.includes('://') ? serverUrl : `http://${serverUrl}`);
      if (isValidPort(u.port)) {
        ports.push(Number(u.port));
      }
    }
  } catch {}

  // 4. Built-in defaults
  ports.push(DEFAULT_DISCOVERY_PORT);
  ports.push(FALLBACK_DISCOVERY_PORT);

  // Deduplicate and cap at 4 ports to prevent slow subnet scans
  return Array.from(new Set(ports)).filter(isValidPort).slice(0, 4);
}

/**
 * Fast port-independent auto-discovery via UDP broadcast (port 41999).
 * The Desktop responds with its dynamically configured server_port and shop name.
 */
export async function detectViaUdpBroadcast(timeoutMs = 1200): Promise<DiscoveredDevice[]> {
  try {
    const raw = await AnposNetwork.discoverDesktop(timeoutMs);
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const discovered: DiscoveredDevice[] = [];
    const seenIps = new Set<string>();

    for (const r of raw) {
      try {
        const parsed = typeof r.raw === 'string' ? JSON.parse(r.raw) : r.raw;
        if (parsed?.type !== 'anpos-discover-reply') continue;

        const ip = r.ip || parsed.ip;
        if (!ip || seenIps.has(ip)) continue;
        seenIps.add(ip);

        discovered.push({
          ip,
          port: Number(parsed.port) || DEFAULT_DISCOVERY_PORT,
          deviceName: parsed.deviceName || `AN POS (${ip})`,
          shopName: parsed.shopName || 'AN POS',
          version: parsed.v?.toString() || '1',
          requiresPairing: parsed.requiresPairing ?? true,
          responseTime: 0,
        });
      } catch {
        // Ignore unparseable packet
      }
    }

    return discovered;
  } catch {
    return [];
  }
}

/**
 * PRD §5.1: Automatic Discovery
 * 1. UDP Broadcast First: Ultra-fast (<1s) and port-independent (resolves actual server_port).
 * 2. Quick Probing Fallback: Checks last known IP, emulator host (10.0.2.2), and gateway across candidate ports.
 * 3. Subnet Sweep Fallback: Sequential batch scans on candidate ports if Wi-Fi client isolation blocks UDP.
 */
export async function detectLocalServer(
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  options?: DiscoveryOptions
): Promise<DiscoveredDevice[]> {
  if (signal?.aborted) return [];

  // 1. Primary: Ultra-fast UDP broadcast to discover port dynamically
  try {
    const udpResults = await detectViaUdpBroadcast(1200);
    if (udpResults.length > 0) {
      onProgress?.(100, 100);
      await rememberDevice(udpResults[0]);
      return udpResults;
    }
  } catch {}

  if (signal?.aborted) return [];

  const allResults: DiscoveredDevice[] = [];
  const candidatePorts = await getCandidatePorts(options?.preferredPort);

  // 2. Secondary fallback: Check last known IP + emulator + gateway across candidate ports in parallel
  const quickHosts: string[] = [];
  const knownServer = await AnposSecureStore.get(STORAGE_KEYS.LAST_DISCOVERED_IP).catch(() => null);
  if (knownServer) quickHosts.push(knownServer);
  quickHosts.push('10.0.2.2'); // Android emulator host

  try {
    const gateway = await AnposNetwork.getGateway();
    if (gateway && !quickHosts.includes(gateway)) quickHosts.push(gateway);
  } catch {}

  const quickProbes = quickHosts.flatMap((h) => candidatePorts.map((p) => probeHost(h, p, signal)));
  const quickSettled = await Promise.allSettled(quickProbes);
  for (const res of quickSettled) {
    if (res.status === 'fulfilled' && res.value) {
      allResults.push(res.value);
    }
  }

  if (allResults.length > 0) {
    onProgress?.(100, 100);
    await rememberDevice(allResults[0]);
    return allResults;
  }

  if (signal?.aborted) return [];

  // 3. Tertiary fallback: Rapid sweep of current active subnet (/24) across candidate ports
  const subnet = await getCurrentSubnet();

  for (const port of candidatePorts) {
    if (signal?.aborted) break;
    const localResults = await scanSubnetBatch(subnet, port, onProgress, signal);
    if (localResults.length > 0) {
      allResults.push(...localResults);
      await rememberDevice(allResults[0]);
      return allResults;
    }
  }

  return allResults;
}

/**
 * PRD §5.3: Deep Manual Network Scan (Fallback path)
 * Checks UDP first, then active subnet and common fallback subnets across candidate ports
 */
export async function deepManualSubnetScan(
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  options?: DiscoveryOptions
): Promise<DiscoveredDevice[]> {
  if (signal?.aborted) return [];

  // Quick check via UDP first
  const udpResults = await detectViaUdpBroadcast(1200);
  if (udpResults.length > 0) {
    onProgress?.(100, 100);
    await rememberDevice(udpResults[0]);
    return udpResults;
  }

  if (signal?.aborted) return [];

  const allResults: DiscoveredDevice[] = [];
  const subnet = await getCurrentSubnet();

  const subnetsToScan = [
    subnet,
    '192.168.1',
    '192.168.0',
    '192.168.8',
    '192.168.100',
    '192.168.43',
    '172.20.10',
    '10.0.2',
  ].filter((s, idx, arr) => arr.indexOf(s) === idx);

  const candidatePorts = await getCandidatePorts(options?.preferredPort);
  const totalOperations = subnetsToScan.length * 254 * candidatePorts.length;
  let overallScanned = 0;

  for (const port of candidatePorts) {
    for (const s of subnetsToScan) {
      if (signal?.aborted) break;

      const results = await scanSubnetBatch(
        s,
        port,
        (scanned) => {
          onProgress?.(overallScanned + scanned, totalOperations);
        },
        signal
      );

      overallScanned += 254;
      if (results.length > 0) {
        allResults.push(...results);
        await rememberDevice(allResults[0]);
        return allResults;
      }
    }
    if (allResults.length > 0 || signal?.aborted) break;
  }

  return allResults;
}

export async function checkServer(ip: string, port?: number): Promise<DiscoveredDevice | null> {
  if (port) {
    return probeHost(ip, port);
  }
  const ports = await getCandidatePorts();
  for (const p of ports) {
    const res = await probeHost(ip, p);
    if (res) return res;
  }
  return null;
}
