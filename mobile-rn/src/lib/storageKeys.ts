/**
 * Central Storage Keys for AN POS Mobile (AnposSecureStore / AsyncStorage)
 * Prevents string duplication and key desynchronization across modules.
 */
export const STORAGE_KEYS = {
  APP_MODE: 'anpos_app_mode',
  SERVER_URL: 'anpos_server_url',
  SESSION_TOKEN: 'anpos_session_token',
  DEVICE_ID: 'anpos_device_id',
  CONNECTION_KEY: 'anpos_connection_key',
  USER_ID: 'anpos_user_id',
  LAST_DISCOVERED_IP: 'anpos_last_discovered_ip',
  LAST_DISCOVERED_PORT: 'anpos_last_discovered_port',
  PAIRED_DEVICE: 'anpos_paired_device',
  KNOWN_DEVICES: 'anpos_known_devices',
  STANDALONE_DEVICE_PREFIX: 'anpos_device_prefix',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
