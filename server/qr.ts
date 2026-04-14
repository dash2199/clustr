import os from 'os';
import QRCode from 'qrcode';

export function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export interface PairInfo {
  localUrl: string;
  remoteUrl: string | null;
  token: string;
  qrSvg: string;
}

export async function generatePairInfo(port: number, token: string, remoteUrl: string | null): Promise<PairInfo> {
  const localIp = getLocalIp();
  const localUrl = `http://${localIp}:${port}`;

  const baseUrl = remoteUrl || localUrl;
  const qrUrl = `${baseUrl}?token=${token}`;

  const qrSvg = await QRCode.toString(qrUrl, {
    type: 'svg',
    color: { dark: '#ffffff', light: '#00000000' },
    margin: 1,
  });

  return { localUrl, remoteUrl, token, qrSvg };
}
