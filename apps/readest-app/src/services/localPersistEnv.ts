import type { EnvConfigType } from '@/services/environment';

// Local store actions can fire outside React components. Keep the initialized
// environment here so those actions can persist their settings immediately.
let localPersistEnv: EnvConfigType | null = null;

export const enableLocalStoreAutoPersist = (envConfig: EnvConfigType | null): void => {
  localPersistEnv = envConfig;
};

export const getLocalPersistEnv = (): EnvConfigType | null => localPersistEnv;
