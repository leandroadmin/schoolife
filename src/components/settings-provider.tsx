import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SchoolSettings } from '@/types'

interface SettingsContextType {
    settings: Partial<SchoolSettings> | null
    loading: boolean
    refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
    settings: null,
    loading: true,
    refreshSettings: async () => { },
})

// Helper to convert hex to HSL for Tailwind v4
function hexToHsl(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '')

    // Parse hex
    let r = parseInt(hex.substring(0, 2), 16) / 255
    let g = parseInt(hex.substring(2, 4), 16) / 255
    let b = parseInt(hex.substring(4, 6), 16) / 255

    // Find min and max
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }

    // Convert to degrees and percentages
    h = Math.round(h * 360)
    s = Math.round(s * 100)
    l = Math.round(l * 100)

    // Return the format expected by our CSS variables (Hue Saturation% Lightness%)
    return `${h} ${s}% ${l}%`
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Partial<SchoolSettings> | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('school_settings')
                .select('*')
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching global settings:", error)
            }

            if (data) {
                console.log("SettingsProvider fetched:", { id: data.id, logo: data.logo_url, name: data.name })
                setSettings(data)

                // Inject primary color if available
                if (data.primary_color) {
                    const root = document.documentElement
                    const hex = data.primary_color

                    // Set all color variables to the hex color directly.
                    // Since our CSS now uses `initial` in @theme and full color values
                    // in :root, setting these inline overrides them correctly.
                    root.style.setProperty('--primary', hex)
                    root.style.setProperty('--color-primary', hex)
                    root.style.setProperty('--ring', hex)
                    root.style.setProperty('--color-ring', hex)
                    root.style.setProperty('--primary-hex', hex)
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => useContext(SettingsContext)
