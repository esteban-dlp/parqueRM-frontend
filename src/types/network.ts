export interface LanAddress {
  ip: string
  interfaceName: string
}

export interface LocalAccessInfo {
  app: 'ParqueRM'
  status: 'ok' | 'unavailable'
  version: string
  instanceId: string
  primaryIp: string | null
  url: string | null
  loginUrl: string | null
  ips: LanAddress[]
  timestamp: string
}
