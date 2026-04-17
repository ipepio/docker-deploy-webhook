import { createServer } from 'net';

export interface PortCheckResult {
  port: number;
  available: boolean;
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

export async function checkRequiredPorts(): Promise<PortCheckResult[]> {
  const ports = [80, 443];
  return Promise.all(
    ports.map(async (port) => ({
      port,
      available: await checkPort(port),
    })),
  );
}

export function getUnavailablePorts(results: PortCheckResult[]): number[] {
  return results.filter((r) => !r.available).map((r) => r.port);
}
