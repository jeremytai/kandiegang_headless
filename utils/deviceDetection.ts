export type DeviceWalletPriority = 'apple_pay' | 'google_pay' | 'neutral';

export interface DeviceInfo {
  isIOS: boolean;
  isMac: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isSafari: boolean;
  walletPriority: DeviceWalletPriority;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isMac: false,
      isAndroid: false,
      isChrome: false,
      isSafari: false,
      walletPriority: 'neutral',
    };
  }
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMac = /Mac/.test(platform);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome\//.test(ua) && !/Edge\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);

  let walletPriority: DeviceWalletPriority = 'neutral';
  if (isIOS || (isMac && isSafari)) walletPriority = 'apple_pay';
  else if (isAndroid && isChrome) walletPriority = 'google_pay';

  return {
    isIOS,
    isMac,
    isAndroid,
    isChrome,
    isSafari,
    walletPriority,
  };
}

let cached: DeviceInfo | null = null;

export function getDeviceWalletOrder(): DeviceWalletPriority {
  if (!cached) cached = getDeviceInfo();
  return cached.walletPriority;
}

export function getDeviceInfoForOrdering(): DeviceInfo {
  if (!cached) cached = getDeviceInfo();
  return cached;
}
