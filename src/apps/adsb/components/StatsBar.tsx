import React from 'react'

interface AdsbStats {
  totalAircraft: number
  withPosition: number
  emergency: number
  military: number
  commercial: number
  helicopters: number
}

interface StatsBarProps {
  stats: AdsbStats
  showTotal?: boolean
  showCommercial?: boolean
  showHelicopters?: boolean
  showMilitary?: boolean
  showEmergency?: boolean
  className?: string
  itemClassName?: string
  titleClassName?: string
  valueClassName?: string
}

const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  showTotal = true,
  showCommercial = true,
  showHelicopters = true,
  showMilitary = true,
  showEmergency = true,
  className = "grid grid-cols-5 gap-4 text-center text-lg mb-8",
  itemClassName = "border p-3 bg-black/75",
  titleClassName = "opacity-80 text-lg",
  valueClassName = "text-3xl font-bold",
}) => {
  const statsItems = []

  if (showTotal) {
    statsItems.push({
      value: stats.totalAircraft,
      label: 'TOTAL',
      className: valueClassName,
    })
  }

  if (showCommercial) {
    statsItems.push({
      value: stats.commercial,
      label: 'COMMERCIAL',
      className: valueClassName,
    })
  }

  if (showHelicopters) {
    statsItems.push({
      value: stats.helicopters,
      label: 'HELICOPTERS',
      className: valueClassName,
    })
  }

  if (showMilitary) {
    statsItems.push({
      value: stats.military,
      label: 'MILITARY',
      className: valueClassName,
    })
  }

  if (showEmergency) {
    statsItems.push({
      value: stats.emergency,
      label: 'EMERGENCY',
      className: `${valueClassName} ${stats.emergency > 0 ? 'text-red-400 animate-pulse' : ''}`,
    })
  }

  // Adjust grid columns based on number of items
  const gridCols = statsItems.length === 1 ? 'grid-cols-1' :
                   statsItems.length === 2 ? 'grid-cols-2' :
                   statsItems.length === 3 ? 'grid-cols-3' :
                   statsItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'

  const finalClassName = className.replace('grid-cols-5', gridCols)

  return (
    <div className={finalClassName}>
      {statsItems.map((item, index) => (
        <div
          key={item.label}
          className={itemClassName}
          style={{ borderColor: `rgb(var(--crt-primary))` }}
        >
          <div className={item.className}>{item.value}</div>
          <div className={titleClassName}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export default StatsBar
