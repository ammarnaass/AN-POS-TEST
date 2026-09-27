import type { PairingData } from '@/features/settings/components/PairingQR';

export interface DiscoveredServer {
  ip: string;
  port: number;
  serverUrl: string;
  shopName?: string;
  deviceName?: string;
  protocol?: string;
  pingMs?: number;
  version?: string;
}

export interface TestConnectionResult {
  success: boolean;
  msg: string;
  pingMs?: number;
  version?: string;
}

export interface PairingStatusResult {
  success: boolean;
  msg: string;
  deviceId?: string;
  sessionToken?: string;
}

export type ActiveSection = 'pairing' | 'server_info';
export type ConnectionMethod = 'discovery' | 'manual';

export interface ClientTerminalState {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  connectionMethod: ConnectionMethod;
  setConnectionMethod: (method: ConnectionMethod) => void;
  clientUrlInput: string;
  setClientUrlInput: (url: string) => void;
  clientTermCodeInput: string;
  setClientTermCodeInput: (code: string) => void;
  pairingKeyInput: string;
  setPairingKeyInput: (key: string) => void;
  showPairKeyInput: boolean;
  setShowPairKeyInput: (show: boolean | ((prev: boolean) => boolean)) => void;
  showMasterServerKey: boolean;
  setShowMasterServerKey: (show: boolean | ((prev: boolean) => boolean)) => void;
  isPairingLoading: boolean;
  isUnpairingLoading: boolean;
  isScanningServers: boolean;
  discoveredServers: DiscoveredServer[];
  scanPerformed: boolean;
  testClientUrlLoading: boolean;
  testClientUrlResult: TestConnectionResult | null;
  pairingStatusResult: PairingStatusResult | null;
  copiedField: string | null;
  showSetupWizard: boolean;
  setShowSetupWizard: (show: boolean) => void;
  serverPairingInfo: PairingData | null;
  liveEventBusStatus: {
    state: string;
    transport?: string;
    lastPingMs?: number;
    [key: string]: unknown;
  };
  isPaired: boolean;
  activeServerUrl?: string;
  activeDeviceId?: string;
  isConnected: boolean;
  effectiveServerKey: string;
  effectivePairingData: PairingData;
  handleCopy: (text: string, key: string) => void;
  handleTestServerConnection: (urlToTest?: string) => Promise<void>;
  handleScanLanServers: () => Promise<void>;
  handlePairWithServer: () => Promise<void>;
  handleUnpairServer: () => Promise<void>;
  handleMakeServerMaster: () => void;
  handleWizardCompleted: (newRole: 'server' | 'client' | 'standalone') => void;
}
