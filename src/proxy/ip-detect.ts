import { networkInterfaces } from 'os';
import { get } from 'https';

const PUBLIC_IP_SERVICES = ['https://api.ipify.org', 'https://ifconfig.me/ip'];

function getPrivateIp(): string | null {
  const interfaces = networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

function fetchPublicIp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => resolve(data.trim()));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function detectPublicIp(): Promise<string | null> {
  for (const url of PUBLIC_IP_SERVICES) {
    try {
      const ip = await fetchPublicIp(url);
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        return ip;
      }
    } catch {
      // try next service
    }
  }
  return null;
}

export interface DetectedIps {
  public: string | null;
  private: string | null;
}

let cached: DetectedIps | null = null;

export async function detectMachineIps(): Promise<DetectedIps> {
  if (cached) return cached;

  const privateIp = getPrivateIp();
  const publicIp = await detectPublicIp();

  cached = { public: publicIp, private: privateIp };
  return cached;
}

export function resetIpCache(): void {
  cached = null;
}
