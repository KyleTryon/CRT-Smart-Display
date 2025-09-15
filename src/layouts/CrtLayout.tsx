import React from 'react'
import type { ReactNode } from 'react'

interface CrtLayoutProps {
  children: ReactNode
}

const CrtLayout: React.FC<CrtLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="crt-kiosk-container">
        <div className="w-full h-full crt-screen crt-flicker overflow-hidden relative">
          <div className="absolute inset-0 p-8 z-10">
            <div className="h-full crt-text-glow">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrtLayout
