export interface Student {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    birth_date: string | null
    age: number | null
    address: string | null
    city: string | null
    state: string | null
    rg: string | null
    rg_uf: string | null
    cpf: string | null
    avatar_url: string | null
    class_id: string | null
    level_id: string | null
    teacher_id: string | null
    username: string | null
    password?: string
    status: "active" | "inactive" | "suspended"
    created_at: string
}

export interface Class {
    id: string
    name: string
    code: string | null
    teacher_id: string | null
    level: string | null
    type: "regular" | "intensive" | "conversation" | "private" | null
    days: string[] | null
    time_start: string | null
    time_end: string | null
    duration_minutes: number | null
    mode: "in-person" | "online" | null
    start_date: string | null
    end_date: string | null
    max_students: number
    description: string | null
    status: "active" | "paused" | "finished" | "full"
    created_at: string
}

export interface Enrollment {
    id: string
    student_id: string
    class_id: string
    status: "active" | "locked" | "transferred" | "cancelled"
    enrolled_at: string
    updated_at: string
}

export interface ClassLesson {
    id: string
    class_id: string
    date: string
    status: "scheduled" | "completed" | "cancelled" | "makeup"
    description: string | null
    created_at: string
}

export interface Teacher {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    rg: string | null
    rg_uf: string | null
    cpf: string | null
    birth_date: string | null
    age: number | null
    address: string | null
    city: string | null
    state: string | null
    avatar_url: string | null
    specialties: string[] | null
    hourly_rate: number | null
    username: string | null
    password?: string
    status: "active" | "inactive" | "suspended"
    created_at: string
}

export interface Transaction {
    id: string
    type: "income" | "expense"
    category: string | null
    amount: number
    description: string | null
    status: "pending" | "paid" | "overdue"
    date: string | null
    payment_method: string | null
    student_id: string | null
    supplier_id: string | null
    due_date: string | null
    installment: number | null
    total_installments: number | null
    recurring: boolean
    created_at: string
}

export interface Supplier {
    id: string
    name: string
    document: string | null
    phone: string | null
    email: string | null
    address: string | null
    notes: string | null
    created_at: string
}
export interface SchoolSettings {
    id: string
    name: string
    phone: string | null
    whatsapp: string | null
    email: string | null
    address: string | null
    facebook: string | null
    instagram: string | null
    operating_hours: string | null
    logo_url: string | null
    school_signature_url: string | null
    primary_color: string | null
    updated_at: string
}

export interface CourseType {
    id: string
    name: string
    description: string | null
    created_at: string
}

export interface CourseLevel {
    id: string
    name: string
    description: string | null
    created_at: string
}

export interface Attendance {
    id: string
    class_id: string
    lesson_id: string | null
    student_id: string
    date: string
    status: "present" | "absent" | "justified"
    notes: string | null
    created_at: string
}

export interface Announcement {
    id: string
    title: string
    content: string
    author_id: string | null
    type: "all" | "individual"
    start_date: string | null
    end_date: string | null
    created_at: string
    // Relational field for individual recipient
    recipient_name?: string
    read_count?: number
    total_count?: number
}

export interface AnnouncementStatus {
    id: string
    announcement_id: string
    student_id: string
    is_read: boolean
    read_at: string | null
    created_at: string
}

export interface Lead {
    id: string
    name: string
    email: string | null
    phone: string | null
    source: string | null
    status: "new" | "contacted" | "waiting" | "enrolled" | "lost"
    notes: string | null
    loss_reason: string | null
    converted_at: string | null
    created_at: string
}

export interface LeadInteraction {
    id: string
    lead_id: string
    content: string
    type: "note" | "status_change" | "conversion"
    created_at: string
}
