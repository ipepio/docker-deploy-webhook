import { type LoadedConfig, type RepoConfig } from './schema';
import { loadConfig, type LoadConfigOptions } from './loader';

let loadedConfig: LoadedConfig | null = null;

export async function initConfig(options?: LoadConfigOptions): Promise<LoadedConfig> {
  loadedConfig = await loadConfig(options);
  return loadedConfig;
}

export function resetConfig(): void {
  loadedConfig = null;
}

export function getConfig(): LoadedConfig {
  if (!loadedConfig) {
    throw new Error('Configuration has not been initialized');
  }
  return loadedConfig;
}

export function getRepoConfig(repository: string): RepoConfig | undefined {
  return getConfig().repos.get(repository);
}
