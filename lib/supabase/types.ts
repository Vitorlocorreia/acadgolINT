export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Unit {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  min_age: number
  max_age: number
  description: string | null
  created_at: string
}

export interface Coach {
  id: string
  name: string
  phone: string | null
  email: string | null
  cref: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  frequency_per_week: number
  price: number
  registration_fee: number
  sibling_discount_percent: number
  duration_months: number
  includes_uniform: boolean
  is_active: boolean
  created_at: string
}

export interface ClassItem {
  id: string
  name: string
  unit_id: string
  category_id: string
  coach_id: string | null
  days_of_week: string[]
  start_time: string
  end_time: string
  max_students: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Relações
  unit?: Unit
  category?: Category
  coach?: Coach
  enrolled_count?: number
}

export interface Student {
  id: string
  name: string
  birth_date: string
  cpf: string | null
  rg: string | null
  photo_url: string | null
  preferred_position: string // 'Goleiro' | 'Zagueiro' | 'Lateral' | 'Volante' | 'Meia' | 'Atacante'
  dominant_foot: string // 'Destro' | 'Canhoto' | 'Ambidestro'
  uniform_size: string // '4' | '6' | '8' | '10' | '12' | '14' | '16' | 'P' | 'M' | 'G'
  status: 'active' | 'inactive' | 'paused'
  created_at: string
  updated_at: string
  // Relações opcionais
  guardian?: Guardian
  medical_record?: MedicalRecord
  enrollment?: Enrollment
}

export interface Guardian {
  id: string
  student_id: string
  name: string
  relationship: string // 'Pai' | 'Mãe' | 'Avô/Avó' | 'Tio/Tia' | 'Outro'
  cpf: string
  phone: string
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  created_at: string
  updated_at: string
}

export interface MedicalRecord {
  id: string
  student_id: string
  blood_type: string | null
  allergies: string | null
  continuous_medications: string | null
  health_insurance: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_notes: string | null
  has_medical_clearance: boolean
  image_use_authorized: boolean
  terms_accepted_at: string
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  class_id: string
  plan_id: string
  start_date: string
  due_day: number
  monthly_fee: number
  status: 'active' | 'paused' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  // Relações
  student?: Student
  class?: ClassItem
  plan?: Plan
}

export interface Invoice {
  id: string
  enrollment_id: string | null
  student_id: string
  reference_month: string // 'YYYY-MM'
  due_date: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method: string | null // 'pix' | 'cartao' | 'dinheiro' | 'boleto'
  paid_at: string | null
  pix_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relações
  student?: Student
}

export interface AttendanceLog {
  id: string
  class_id: string
  training_date: string
  student_id: string
  status: 'present' | 'absent' | 'justified'
  coach_notes: string | null
  created_at: string
  student?: Student
}

export interface TechnicalEvaluation {
  id: string
  student_id: string
  coach_id: string | null
  evaluation_date: string
  period: string
  score_pass: number
  score_shooting: number
  score_dribble: number
  score_control: number
  score_marking: number
  score_speed: number
  score_stamina: number
  score_discipline: number
  score_teamwork: number
  strengths: string | null
  areas_to_improve: string | null
  coach_feedback: string | null
  created_at: string
  coach?: Coach
  student?: Student
}

export interface TrialClass {
  id: string
  student_name: string
  student_age: number | null
  guardian_name: string
  guardian_phone: string
  guardian_email: string | null
  unit_id: string | null
  category_id: string | null
  scheduled_date: string
  scheduled_time: string | null
  status: 'scheduled' | 'attended' | 'missed' | 'enrolled' | 'lost'
  feedback: string | null
  created_at: string
  updated_at: string
  unit?: Unit
  category?: Category
}
