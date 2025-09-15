import React, { useState, useEffect } from 'react'

const ClockApp: React.FC = () => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatDate = (date: Date) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]

    const dayName = days[date.getDay()]
    const monthName = months[date.getMonth()]
    const dayNum = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${dayName} ${monthName} ${dayNum}, ${year}`
  }

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <h1 className="text-4xl md:text-5xl opacity-80 mb-8">Digital Clock</h1>
      <div className="text-8xl md:text-9xl lg:text-[12rem] font-bold tracking-wider">
        {formatTime(time)}
      </div>
      <div className="text-3xl md:text-4xl opacity-90 mt-8">{formatDate(time)}</div>
    </div>
  )
}

export default ClockApp
