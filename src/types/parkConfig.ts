export interface ParkConfig {
  id: number
  parkName: string
  parkSubtitle: string | null
  sigapCode: string | null
  department: string | null
  municipality: string | null
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
  systemLanUrl: string | null
  maxCapacity: number
  createdAt: string
  updatedAt: string | null
}

export interface UpdateParkConfigDto {
  parkName?: string
  parkSubtitle?: string
  sigapCode?: string
  department?: string
  municipality?: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  systemLanUrl?: string
  maxCapacity?: number
}
