// CRT Theme System
export interface CrtTheme {
  name: string
  displayName: string
  colors: {
    primary: string
    primaryLight: string
    primaryDark: string
    glowPrimary: string
    glowLight: string
    glowMedium: string
    glowSubtle: string
    glowFaint: string
    glowVeryFaint: string
    glowUltraFaint: string
    bgDark: string
    bgBlack: string
    bgTransparentDark: string
  }
}

export const CRT_THEMES: Record<string, CrtTheme> = {
  green: {
    name: 'green',
    displayName: 'Classic Green',
    colors: {
      primary: '74, 222, 128',
      primaryLight: '34, 197, 94',
      primaryDark: '22, 163, 74',
      glowPrimary: '0, 255, 0',
      glowLight: 'rgba(0, 255, 0, 0.8)',
      glowMedium: 'rgba(0, 255, 0, 0.5)',
      glowSubtle: 'rgba(0, 255, 0, 0.3)',
      glowFaint: 'rgba(0, 255, 0, 0.1)',
      glowVeryFaint: 'rgba(0, 255, 0, 0.02)',
      glowUltraFaint: 'rgba(0, 255, 0, 0.01)',
      bgDark: '#0a1f0a',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
  amber: {
    name: 'amber',
    displayName: 'Classic Amber',
    colors: {
      primary: '251, 191, 36',
      primaryLight: '245, 158, 11',
      primaryDark: '217, 119, 6',
      glowPrimary: '255, 191, 0',
      glowLight: 'rgba(255, 191, 0, 0.8)',
      glowMedium: 'rgba(255, 191, 0, 0.5)',
      glowSubtle: 'rgba(255, 191, 0, 0.3)',
      glowFaint: 'rgba(255, 191, 0, 0.1)',
      glowVeryFaint: 'rgba(255, 191, 0, 0.02)',
      glowUltraFaint: 'rgba(255, 191, 0, 0.01)',
      bgDark: '#1f1a0a',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
  cyan: {
    name: 'cyan',
    displayName: 'Retro Cyan',
    colors: {
      primary: '34, 211, 238',
      primaryLight: '6, 182, 212',
      primaryDark: '8, 145, 178',
      glowPrimary: '0, 255, 255',
      glowLight: 'rgba(0, 255, 255, 0.8)',
      glowMedium: 'rgba(0, 255, 255, 0.5)',
      glowSubtle: 'rgba(0, 255, 255, 0.3)',
      glowFaint: 'rgba(0, 255, 255, 0.1)',
      glowVeryFaint: 'rgba(0, 255, 255, 0.02)',
      glowUltraFaint: 'rgba(0, 255, 255, 0.01)',
      bgDark: '#0a1a1f',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
  white: {
    name: 'white',
    displayName: 'Paper Terminal',
    colors: {
      primary: '229, 231, 235',
      primaryLight: '209, 213, 219',
      primaryDark: '156, 163, 175',
      glowPrimary: '255, 255, 255',
      glowLight: 'rgba(255, 255, 255, 0.8)',
      glowMedium: 'rgba(255, 255, 255, 0.5)',
      glowSubtle: 'rgba(255, 255, 255, 0.3)',
      glowFaint: 'rgba(255, 255, 255, 0.1)',
      glowVeryFaint: 'rgba(255, 255, 255, 0.02)',
      glowUltraFaint: 'rgba(255, 255, 255, 0.01)',
      bgDark: '#1a1a1a',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
  red: {
    name: 'red',
    displayName: 'Alert Red',
    colors: {
      primary: '248, 113, 113',
      primaryLight: '239, 68, 68',
      primaryDark: '220, 38, 38',
      glowPrimary: '255, 0, 0',
      glowLight: 'rgba(255, 0, 0, 0.8)',
      glowMedium: 'rgba(255, 0, 0, 0.5)',
      glowSubtle: 'rgba(255, 0, 0, 0.3)',
      glowFaint: 'rgba(255, 0, 0, 0.1)',
      glowVeryFaint: 'rgba(255, 0, 0, 0.02)',
      glowUltraFaint: 'rgba(255, 0, 0, 0.01)',
      bgDark: '#1f0a0a',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
  purple: {
    name: 'purple',
    displayName: 'Neon Purple',
    colors: {
      primary: '196, 181, 253',
      primaryLight: '167, 139, 250',
      primaryDark: '139, 92, 246',
      glowPrimary: '147, 51, 234',
      glowLight: 'rgba(147, 51, 234, 0.8)',
      glowMedium: 'rgba(147, 51, 234, 0.5)',
      glowSubtle: 'rgba(147, 51, 234, 0.3)',
      glowFaint: 'rgba(147, 51, 234, 0.1)',
      glowVeryFaint: 'rgba(147, 51, 234, 0.02)',
      glowUltraFaint: 'rgba(147, 51, 234, 0.01)',
      bgDark: '#1a0a1f',
      bgBlack: '#000000',
      bgTransparentDark: 'rgba(0, 0, 0, 0.3)',
    },
  },
}

export class ThemeManager {
  private currentTheme: string = 'green'
  private readonly STORAGE_KEY = 'crt-display-theme'

  constructor() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem(this.STORAGE_KEY)
    if (savedTheme && CRT_THEMES[savedTheme]) {
      this.currentTheme = savedTheme
    }

    // Apply the theme on initialization
    this.applyTheme(this.currentTheme)
  }

  /**
   * Apply a theme by setting CSS custom properties
   */
  applyTheme(themeName: string): boolean {
    const theme = CRT_THEMES[themeName]
    if (!theme) {
      console.warn(`Theme "${themeName}" not found`)
      return false
    }

    const root = document.documentElement
    const { colors } = theme

    // Set all CSS custom properties
    root.style.setProperty('--crt-primary', colors.primary)
    root.style.setProperty('--crt-primary-light', colors.primaryLight)
    root.style.setProperty('--crt-primary-dark', colors.primaryDark)
    root.style.setProperty('--crt-glow-primary', colors.glowPrimary)
    root.style.setProperty('--crt-glow-light', colors.glowLight)
    root.style.setProperty('--crt-glow-medium', colors.glowMedium)
    root.style.setProperty('--crt-glow-subtle', colors.glowSubtle)
    root.style.setProperty('--crt-glow-faint', colors.glowFaint)
    root.style.setProperty('--crt-glow-very-faint', colors.glowVeryFaint)
    root.style.setProperty('--crt-glow-ultra-faint', colors.glowUltraFaint)
    root.style.setProperty('--crt-bg-dark', colors.bgDark)
    root.style.setProperty('--crt-bg-black', colors.bgBlack)
    root.style.setProperty('--crt-bg-transparent-dark', colors.bgTransparentDark)

    this.currentTheme = themeName
    localStorage.setItem(this.STORAGE_KEY, themeName)

    console.log(`Applied theme: ${theme.displayName}`)
    return true
  }

  /**
   * Switch to the next theme in the list
   */
  nextTheme(): string {
    const themeNames = Object.keys(CRT_THEMES)
    const currentIndex = themeNames.indexOf(this.currentTheme)
    const nextIndex = (currentIndex + 1) % themeNames.length
    const nextTheme = themeNames[nextIndex]

    this.applyTheme(nextTheme)
    return nextTheme
  }

  /**
   * Switch to the previous theme in the list
   */
  previousTheme(): string {
    const themeNames = Object.keys(CRT_THEMES)
    const currentIndex = themeNames.indexOf(this.currentTheme)
    const prevIndex = currentIndex === 0 ? themeNames.length - 1 : currentIndex - 1
    const prevTheme = themeNames[prevIndex]

    this.applyTheme(prevTheme)
    return prevTheme
  }

  /**
   * Get current theme name
   */
  getCurrentTheme(): string {
    return this.currentTheme
  }

  /**
   * Get current theme object
   */
  getCurrentThemeObject(): CrtTheme {
    return CRT_THEMES[this.currentTheme]
  }

  /**
   * Get all available themes
   */
  getAllThemes(): CrtTheme[] {
    return Object.values(CRT_THEMES)
  }

  /**
   * Check if a theme exists
   */
  hasTheme(themeName: string): boolean {
    return themeName in CRT_THEMES
  }
}

// Export a singleton instance
export const themeManager = new ThemeManager()
