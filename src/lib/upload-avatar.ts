import { supabase } from "@/lib/supabase"

export async function uploadAvatar(file: File, folder: "students" | "teachers"): Promise<string | null> {
    try {
        const ext = file.name.split(".").pop()
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        const { error } = await supabase.storage
            .from("avatars")
            .upload(fileName, file, { upsert: true })

        if (error) throw error

        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
        return data.publicUrl
    } catch (err) {
        console.error("Erro ao fazer upload do avatar:", err)
        return null
    }
}
