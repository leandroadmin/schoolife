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
