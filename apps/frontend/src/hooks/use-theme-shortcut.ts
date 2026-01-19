"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

export function useThemeShortcut() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const isModifierPressed = isMac
        ? event.metaKey && event.shiftKey
        : event.ctrlKey && event.shiftKey

      if (isModifierPressed && event.key === "d") {
        event.preventDefault()
        const currentTheme = resolvedTheme || theme
        setTheme(currentTheme === "dark" ? "light" : "dark")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [theme, resolvedTheme, setTheme])
}
