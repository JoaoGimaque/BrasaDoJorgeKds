import { Platform } from 'react-native';

const API_HOSTS = {
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
} as const;

export const API_BASE_URL = Platform.select(API_HOSTS) ?? API_HOSTS.default;