import { listRepositories, showRepository } from './use-cases/repo-config';
import { selectFromList, type SelectOption } from './select';

export async function resolveRepository(flagValue?: string): Promise<string> {
  if (flagValue) return flagValue;

  const repos = listRepositories();
  if (repos.length === 0) {
    throw new Error('No repositories configured. Run: depctl repo add');
  }

  if (repos.length === 1) {
    return repos[0].repository;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Missing --repository flag');
  }

  const options: SelectOption[] = repos.map((r) => ({
    label: r.repository,
    value: r.repository,
  }));

  const selected = await selectFromList(options, 'Repository');
  if (selected === '__exit__') {
    process.stdout.write('Cancelled.\n');
    process.exit(0);
  }
  return selected;
}

export async function resolveEnvironment(
  repository: string,
  flagValue?: string,
): Promise<string> {
  if (flagValue) return flagValue;

  const repoYaml = showRepository(repository);
  const envNames = Object.keys(repoYaml.environments);

  if (envNames.length === 0) {
    throw new Error(`No environments configured for ${repository}. Run: depctl env add`);
  }

  if (envNames.length === 1) {
    return envNames[0];
  }

  if (!process.stdin.isTTY) {
    throw new Error('Missing --environment flag');
  }

  const options: SelectOption[] = envNames.map((e) => ({
    label: e,
    value: e,
  }));

  const selected = await selectFromList(options, 'Environment');
  if (selected === '__exit__') {
    process.stdout.write('Cancelled.\n');
    process.exit(0);
  }
  return selected;
}
