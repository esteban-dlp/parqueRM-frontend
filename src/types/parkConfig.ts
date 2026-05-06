export interface ParkConfig {
  id: number
  name: string
  subtitle: string | null
  sigapCode: string | null
  department: string | null
  municipality: string | null
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
  maxCapacity: number
  lanUrl: string | null
  updatedAt: string
}

export interface UpdateParkConfigDto {
  name?: string
  subtitle?: string
  sigapCode?: string
  department?: string
  municipality?: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  maxCapacity?: number
  lanUrl?: string
}
