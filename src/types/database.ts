
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "badges": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"display_order": number,"house_id": string,"id": string,"is_system": boolean,"name": string
                  }
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order": number,"house_id": string,"id"?: string,"is_system"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"display_order"?: number,"house_id"?: string,"id"?: string,"is_system"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "badges_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    }
                  ]
                },"cleaning_badges": {
                  Row: {
                    "badge_id": string,"cleaning_record_id": string
                  }
                  Insert: {
                    "badge_id": string,"cleaning_record_id": string
                  }
                  Update: {
                    "badge_id"?: string,"cleaning_record_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cleaning_badges_badge_id_fkey"
      columns: ["badge_id"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cleaning_badges_cleaning_record_id_fkey"
      columns: ["cleaning_record_id"]
isOneToOne: false
      referencedRelation: "cleaning_records"
      referencedColumns: ["id"]
    }
                  ]
                },"cleaning_records": {
                  Row: {
                    "cleaning_date": string,"created_at": string,"house_id": string,"id": string,"notes": string | null,"registered_by_id": string,"responsible_name": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "cleaning_date": string,"created_at"?: string,"house_id": string,"id"?: string,"notes"?: string | null,"registered_by_id": string,"responsible_name": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cleaning_date"?: string,"created_at"?: string,"house_id"?: string,"id"?: string,"notes"?: string | null,"registered_by_id"?: string,"responsible_name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cleaning_records_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cleaning_records_registered_by_id_fkey"
      columns: ["registered_by_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cleaning_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"exclusion_logs": {
                  Row: {
                    "created_at": string,"deleted_at": string,"entity_id": string,"entity_name": string,"entity_type": string,"house_id": string | null,"id": string,"metadata": NonNullable<Json>,"user_email": string | null,"user_id": string,"user_name": string
                  }
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string,"entity_id": string,"entity_name": string,"entity_type": string,"house_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"user_email"?: string | null,"user_id": string,"user_name": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string,"entity_id"?: string,"entity_name"?: string,"entity_type"?: string,"house_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"user_email"?: string | null,"user_id"?: string,"user_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"house_members": {
                  Row: {
                    "house_id": string,"joined_at": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "house_id": string,"joined_at"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "house_id"?: string,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "house_members_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "house_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"houses": {
                  Row: {
                    "created_at": string,"creator_id": string,"id": string,"invite_code": string,"name": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"creator_id": string,"id"?: string,"invite_code": string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"creator_id"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "houses_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string,"id": string,"name": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email": string,"id": string,"name": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_error":
{ Args: { "p_code": string,"p_detail": string }; Returns: undefined
                           },
"business_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"create_badge":
{ Args: { "p_house_id": string,"p_name": string }; Returns: {
              "created_at": string,
"deleted_at": string | null,
"display_order": number,
"house_id": string,
"id": string,
"is_system": boolean,
"name": string
            }
                          SetofOptions: {
        from: "*"
        to: "badges"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_cleaning":
{ Args: { "p_badge_ids": (string)[],"p_cleaning_date": string,"p_house_id": string,"p_notes"?: string,"p_responsible_id": string }; Returns: {
              "cleaning_date": string,
"created_at": string,
"house_id": string,
"id": string,
"notes": string | null,
"registered_by_id": string,
"responsible_name": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "cleaning_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_house":
{ Args: { "p_name": string }; Returns: {
              "created_at": string,
"creator_id": string,
"id": string,
"invite_code": string,
"name": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "houses"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_badge":
{ Args: { "p_badge_id": string }; Returns: undefined
                           },
"delete_cleaning":
{ Args: { "p_cleaning_id": string }; Returns: undefined
                           },
"delete_house":
{ Args: { "p_house_id": string }; Returns: undefined
                           },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_system_capacity":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"is_house_creator":
{ Args: { "p_house_id": string }; Returns: boolean
                           },
"is_house_member":
{ Args: { "p_house_id": string }; Returns: boolean
                           },
"join_house":
{ Args: { "p_invite_code": string }; Returns: {
              "created_at": string,
"creator_id": string,
"id": string,
"invite_code": string,
"name": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "houses"
        isOneToOne: true
        isSetofReturn: false
      } },
"leave_house":
{ Args: { "p_house_id": string }; Returns: undefined
                           },
"max_users":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"regenerate_invite_code":
{ Args: { "p_house_id": string }; Returns: string
                           },
"remove_member":
{ Args: { "p_house_id": string,"p_user_id": string }; Returns: undefined
                           },
"rename_badge":
{ Args: { "p_badge_id": string,"p_name": string }; Returns: {
              "created_at": string,
"deleted_at": string | null,
"display_order": number,
"house_id": string,
"id": string,
"is_system": boolean,
"name": string
            }
                          SetofOptions: {
        from: "*"
        to: "badges"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_active_badge":
{ Args: { "p_badge_id": string }; Returns: {
              "created_at": string,
"deleted_at": string | null,
"display_order": number,
"house_id": string,
"id": string,
"is_system": boolean,
"name": string
            }
                          SetofOptions: {
        from: "*"
        to: "badges"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_editable_cleaning":
{ Args: { "p_cleaning_id": string }; Returns: {
              "cleaning_date": string,
"created_at": string,
"house_id": string,
"id": string,
"notes": string | null,
"registered_by_id": string,
"responsible_name": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "cleaning_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_house_member":
{ Args: { "p_house_id": string }; Returns: {
              "created_at": string,
"creator_id": string,
"id": string,
"invite_code": string,
"name": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "houses"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_house_owner":
{ Args: { "p_house_id": string }; Returns: {
              "created_at": string,
"creator_id": string,
"id": string,
"invite_code": string,
"name": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "houses"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"shares_house_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"update_cleaning":
{ Args: { "p_badge_ids": (string)[],"p_cleaning_date": string,"p_cleaning_id": string,"p_notes"?: string,"p_responsible_id": string }; Returns: {
              "cleaning_date": string,
"created_at": string,
"house_id": string,
"id": string,
"notes": string | null,
"registered_by_id": string,
"responsible_name": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "cleaning_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"validate_badge_name":
{ Args: { "p_house_id": string,"p_ignore_badge_id": string,"p_name": string }; Returns: string
                           },
"validate_cleaning_input":
{ Args: { "p_badge_ids": (string)[],"p_check_responsible": boolean,"p_cleaning_date": string,"p_current_badge_ids": (string)[],"p_house_id": string,"p_notes": string,"p_responsible_id": string }; Returns: undefined
                           },
"week_start":
{ Args: { "p_date": string }; Returns: string
                           },
"write_exclusion_log":
{ Args: { "p_entity_id": string,"p_entity_name": string,"p_entity_type": string,"p_house_id": string,"p_metadata": Json }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
