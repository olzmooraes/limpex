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
      users: {
        Row: {
          id: string
          name: string
          email: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      houses: {
        Row: {
          id: string
          name: string
          invite_code: string
          creator_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          creator_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          creator_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      house_members: {
        Row: {
          id: string
          house_id: string
          user_id: string
          role: 'CREATOR' | 'MEMBER'
          joined_at: string
        }
        Insert: {
          id?: string
          house_id: string
          user_id: string
          role: 'CREATOR' | 'MEMBER'
          joined_at?: string
        }
        Update: {
          id?: string
          house_id?: string
          user_id?: string
          role?: 'CREATOR' | 'MEMBER'
          joined_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          house_id: string
          name: string
          is_system: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          house_id: string
          name: string
          is_system?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          house_id?: string
          name?: string
          is_system?: boolean
          display_order?: number
          created_at?: string
        }
      }
      cleaning_records: {
        Row: {
          id: string
          house_id: string
          user_id: string
          registered_by_id: string
          day_of_week: 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
          cleaning_date: string
          week_number: number
          month: number
          year: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          house_id: string
          user_id: string
          registered_by_id: string
          day_of_week: 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
          cleaning_date?: string
          week_number: number
          month: number
          year: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          house_id?: string
          user_id?: string
          registered_by_id?: string
          day_of_week?: 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
          cleaning_date?: string
          week_number?: number
          month?: number
          year?: number
          notes?: string | null
          created_at?: string
        }
      }
      cleaning_badges: {
        Row: {
          cleaning_record_id: string
          badge_id: string
        }
        Insert: {
          cleaning_record_id: string
          badge_id: string
        }
        Update: {
          cleaning_record_id?: string
          badge_id?: string
        }
      }
      exclusion_logs: {
        Row: {
          id: string
          deleted_at: string
          user_id: string
          user_name: string
          entity_type: 'HOUSE' | 'BADGE'
          entity_id: string
          entity_name: string
          house_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          deleted_at?: string
          user_id: string
          user_name: string
          entity_type: 'HOUSE' | 'BADGE'
          entity_id: string
          entity_name: string
          house_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          deleted_at?: string
          user_id?: string
          user_name?: string
          entity_type?: 'HOUSE' | 'BADGE'
          entity_id?: string
          entity_name?: string
          house_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
  }
}
