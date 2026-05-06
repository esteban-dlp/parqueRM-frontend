export interface DashboardSummary {
  visitorsToday?: number
  vehiclesToday?: number
  incomeToday?: number
  lodgingToday?: number
  occupancyPercent?: number
  capacity?: number
  currentOccupancy?: number
}

export interface DashboardTodayTotals {
  visitors?: number
  vehicles?: number
  lodging?: number
  income?: number
  expenses?: number
}

export interface LatestMovement {
  id: number
  movementType: 'INGRESO' | 'EGRESO'
  amount: number
  description: string | null
  conceptName?: string
  createdAt: string
}
