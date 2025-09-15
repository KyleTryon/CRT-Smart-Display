# CRT Smart Display

A retro-inspired digital display application that cycles through different full-screen modules with a CRT monitor aesthetic.

## Features

- **CRT Visual Effects**: Authentic CRT monitor appearance with scanlines, flicker, and green phosphor glow
- **4:3 Aspect Ratio**: Maintains classic CRT display proportions
- **Modular App System**: Easily extensible architecture for adding new display modules
- **Built-in Apps**:
  - Welcome Screen: Initial display with animated loading effect
  - Digital Clock: Full-screen clock with date display
  - ADS-B Tracker: Live aircraft tracking with custom Philadelphia map
  - Weather Display: Current conditions and 5-hour forecast

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Font**: VT323 (Google Fonts) for authentic terminal aesthetic
- **Code Quality**: ESLint + Prettier configured
- **Package Manager**: pnpm
- **Data Sources**:
  - ADS-B data via [adsb.fi](https://adsb.fi) OpenData API
  - Weather data via [Open-Meteo](https://open-meteo.com) API

## Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Adding New Display Modules

1. Create a new component in `src/apps/`
2. Import it in `src/App.tsx`
3. Add it to the `apps` array with a name

Example:

```typescript
// In src/apps/MyNewApp.tsx
import React from 'react'

const MyNewApp: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-6xl">My New Display</h1>
    </div>
  )
}

export default MyNewApp

// In src/App.tsx
import MyNewApp from './apps/MyNewApp'

const apps = [
  { component: WelcomeApp, name: 'Welcome' },
  { component: ClockApp, name: 'Clock' },
  { component: MyNewApp, name: 'My Display' }, // Add here
]
```

## Configuration

- **App Cycle Time**: Currently set to 10 seconds. Modify in `src/App.tsx`
- **CRT Effects**: Customize in `src/index.css` and `src/layouts/CrtLayout.tsx`
- **Colors**: Adjust the green phosphor color scheme in Tailwind classes

## Development

```bash
# Run linter
pnpm run lint

# Format code with Prettier
pnpm prettier --write .

# Type checking
pnpm tsc --noEmit
```

## Features

### Keyboard Controls

- **X**: Next app
- **Z**: Previous app
- **]**: Next CRT theme
- **[**: Previous CRT theme

### CRT Themes

- Classic Green (default)
- Classic Amber
- Retro Cyan
- Paper Terminal (white)
- Alert Red
- Neon Purple

### Configuration

Edit `src/config/config.json` to customize:

- App cycling behavior (`enableCycling: true/false`)
- Static app display (`staticApp: "weather"`)
- Cycle timing (`appCycleTime: 10000` ms)

## License

MIT
