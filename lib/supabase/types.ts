export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      units: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          phone: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          min_age: number
          max_age: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          min_age: number
          max_age: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          min_age?: number
          max_age?: number
          description?: string | null
          created_at?: string
        }
      }
      coaches: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          cref_number: string | null
          specialties: string[] | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          cref_number?: string | null
          specialties?: string[] | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          cref_number?: string | null
          specialties?: string[] | null
          is_active?: boolean
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          billing_period: 'monthly' | 'quarterly' | 'semiannual' | 'annual'
          days_per_week: number
          sibling_discount_pct: number
          enrollment_fee: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          billing_period?: 'monthly' | 'quarterly' | 'semiannual' | 'annual'
          days_per_week?: number
          sibling_discount_pct?: number
          enrollment_fee?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          billing_period?: 'monthly' | 'quarterly' | 'semiannual' | 'annual'
          days_per_week?: number
          sibling_discount_pct?: number
          enrollment_fee?: number
          is_active?: boolean
          created_at?: string
        }
      }
      classes: {
        Row: {
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
        }
        Insert: {
          id?: string
          name: string
          unit_id: string
          category_id: string
          coach_id?: string | null
          days_of_week: string[]
          start_time: string
          end_time: string
          max_students?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit_id?: string
          category_id?: string
          coach_id?: string | null
          days_of_week?: string[]
          start_time?: string
          end_time?: string
          max_students?: number
          is_active?: boolean
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          birth_date: string
          cpf: string | null
          rg: string | null
          photo_url: string | null
          preferred_position: string
          dominant_foot: string
          uniform_size: string | null
          status: 'active' | 'paused' | 'cancelled'
          portal_token: string
          signature_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          birth_date: string
          cpf?: string | null
          rg?: string | null
          photo_url?: string | null
          preferred_position?: string
          dominant_foot?: string
          uniform_size?: string | null
          status?: 'active' | 'paused' | 'cancelled'
          portal_token?: string
          signature_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          birth_date?: string
          cpf?: string | null
          rg?: string | null
          photo_url?: string | null
          preferred_position?: string
          dominant_foot?: string
          uniform_size?: string | null
          status?: 'active' | 'paused' | 'cancelled'
          portal_token?: string
          signature_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guardians: {
        Row: {
          id: string
          student_id: string
          name: string
          relationship: string
          cpf: string
          phone: string
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          name: string
          relationship: string
          cpf: string
          phone: string
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          name?: string
          relationship?: string
          cpf?: string
          phone?: string
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
        }
      }
      medical_records: {
        Row: {
          id: string
          student_id: string
          blood_type: string | null
          allergies: string | null
          continuous_medications: string | null
          health_insurance: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          has_medical_clearance: boolean
          medical_notes: string | null
          image_use_authorized: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          blood_type?: string | null
          allergies?: string | null
          continuous_medications?: string | null
          health_insurance?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_medical_clearance?: boolean
          medical_notes?: string | null
          image_use_authorized?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          blood_type?: string | null
          allergies?: string | null
          continuous_medications?: string | null
          health_insurance?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_medical_clearance?: boolean
          medical_notes?: string | null
          image_use_authorized?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          class_id: string
          plan_id: string
          due_day: number
          monthly_fee: number
          status: 'active' | 'paused' | 'cancelled'
          enrolled_at: string
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          class_id: string
          plan_id: string
          due_day?: number
          monthly_fee: number
          status?: 'active' | 'paused' | 'cancelled'
          enrolled_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          class_id?: string
          plan_id?: string
          due_day?: number
          monthly_fee?: number
          status?: 'active' | 'paused' | 'cancelled'
          enrolled_at?: string
          cancelled_at?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          enrollment_id: string | null
          student_id: string
          reference_month: string
          due_date: string
          amount: number
          status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          pix_code: string | null
          pix_qr_url: string | null
          paid_at: string | null
          payment_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          enrollment_id?: string | null
          student_id: string
          reference_month: string
          due_date: string
          amount: number
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          pix_code?: string | null
          pix_qr_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          enrollment_id?: string | null
          student_id?: string
          reference_month?: string
          due_date?: string
          amount?: number
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          pix_code?: string | null
          pix_qr_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          created_at?: string
        }
      }
      attendance_logs: {
        Row: {
          id: string
          class_id: string
          training_date: string
          student_id: string
          status: 'present' | 'absent' | 'justified'
          coach_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          training_date: string
          student_id: string
          status: 'present' | 'absent' | 'justified'
          coach_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          training_date?: string
          student_id?: string
          status?: 'present' | 'absent' | 'justified'
          coach_notes?: string | null
          created_at?: string
        }
      }
      technical_evaluations: {
        Row: {
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
        }
        Insert: {
          id?: string
          student_id: string
          coach_id?: string | null
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
          strengths?: string | null
          areas_to_improve?: string | null
          coach_feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          coach_id?: string | null
          evaluation_date?: string
          period?: string
          score_pass?: number
          score_shooting?: number
          score_dribble?: number
          score_control?: number
          score_marking?: number
          score_speed?: number
          score_stamina?: number
          score_discipline?: number
          score_teamwork?: number
          strengths?: string | null
          areas_to_improve?: string | null
          coach_feedback?: string | null
          created_at?: string
        }
      }
      trial_classes: {
        Row: {
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
          status: 'scheduled' | 'attended' | 'enrolled' | 'missed'
          feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_name: string
          student_age?: number | null
          guardian_name: string
          guardian_phone: string
          guardian_email?: string | null
          unit_id?: string | null
          category_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: 'scheduled' | 'attended' | 'enrolled' | 'missed'
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_name?: string
          student_age?: number | null
          guardian_name?: string
          guardian_phone?: string
          guardian_email?: string | null
          unit_id?: string | null
          category_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: 'scheduled' | 'attended' | 'enrolled' | 'missed'
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      uniform_inventory: {
        Row: {
          id: string
          item_name: string
          item_type: string
          size: string
          quantity: number
          min_threshold: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          id?: string
          item_name: string
          item_type?: string
          size: string
          quantity?: number
          min_threshold?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          id?: string
          item_name?: string
          item_type?: string
          size?: string
          quantity?: number
          min_threshold?: number
          unit_price?: number
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          title: string
          opponent: string
          match_type: string
          unit_id: string | null
          category_id: string | null
          coach_id: string | null
          match_date: string
          match_time: string | null
          location: string
          our_score: number | null
          opponent_score: number | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          opponent: string
          match_type?: string
          unit_id?: string | null
          category_id?: string | null
          coach_id?: string | null
          match_date: string
          match_time?: string | null
          location: string
          our_score?: number | null
          opponent_score?: number | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          opponent?: string
          match_type?: string
          unit_id?: string | null
          category_id?: string | null
          coach_id?: string | null
          match_date?: string
          match_time?: string | null
          location?: string
          our_score?: number | null
          opponent_score?: number | null
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      match_callups: {
        Row: {
          id: string
          match_id: string
          student_id: string
          status: string
          goals: number
          assists: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          student_id: string
          status?: string
          goals?: number
          assists?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          student_id?: string
          status?: string
          goals?: number
          assists?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
