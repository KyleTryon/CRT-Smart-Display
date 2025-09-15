import React from 'react'

const WelcomeApp: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <h1 className="text-6xl md:text-8xl animate-pulse">Initializing Display...</h1>
      <p className="text-3xl md:text-4xl opacity-80">Stand by.</p>
      <div className="flex space-x-2 mt-8">
        <span className="animate-bounce delay-0">▓</span>
        <span className="animate-bounce delay-75">▓</span>
        <span className="animate-bounce delay-150">▓</span>
      </div>
    </div>
  )
}

export default WelcomeApp
