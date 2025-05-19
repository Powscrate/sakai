"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggleButton() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder or null to avoid hydration mismatch
    // and to maintain layout consistency.
    return <div className="h-9 w-9 aspect-square" />; 
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="text-primary hover:text-primary/80 transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.3rem] w-[1.3rem]" />
      ) : (
        <Moon className="h-[1.3rem] w-[1.3rem]" />
      )}
    </Button>
  )
}
