export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      email_account: {
        Row: {
          access_token: string | null
          created_at: string
          email: string | null
          expiry_date: number | null
          id: number
          last_scanned: string | null
          organization_id: string | null
          provider: string | null
          refresh_token: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expiry_date?: number | null
          id?: number
          last_scanned?: string | null
          organization_id?: string | null
          provider?: string | null
          refresh_token?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expiry_date?: number | null
          id?: number
          last_scanned?: string | null
          organization_id?: string | null
          provider?: string | null
          refresh_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_account_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      org_user: {
        Row: {
          created_at: string
          id: number
          organization_id: string
          removed: boolean
          role_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          organization_id: string
          removed?: boolean
          role_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          organization_id?: string
          removed?: boolean
          role_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_user_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_user_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_user_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          auto_audit_cron: string | null
          auto_audit_enabled: boolean | null
          created_at: string
          id: string
          name: string
          stripe_product_id: string | null
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          auto_audit_cron?: string | null
          auto_audit_enabled?: boolean | null
          created_at?: string
          id?: string
          name: string
          stripe_product_id?: string | null
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          auto_audit_cron?: string | null
          auto_audit_enabled?: boolean | null
          created_at?: string
          id?: string
          name?: string
          stripe_product_id?: string | null
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      overlapping_tool: {
        Row: {
          created_at: string
          description: string
          id: number
          organization_id: string
          overlappingtools: Json
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          organization_id: string
          overlappingtools: Json
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          organization_id?: string
          overlappingtools?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "overlapping_tool_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          created_at: string
          id: number
          role: string
        }
        Insert: {
          created_at?: string
          id?: number
          role: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
        }
        Relationships: []
      }
      subscription: {
        Row: {
          cancelled_at: string | null
          conflict_info: string | null
          created_at: string
          currency: string
          email_info: Json | null
          email_recipient: string | null
          flat_fee_cost: number | null
          has_conflict: boolean
          id: number
          next_renewal_date: string
          number_of_seats: number | null
          other_cost: number | null
          price_per_seat: number | null
          pricing_model: string
          receipt_file: string | null
          renewal_frequency: string
          source: string | null
          starts_at: string
          status: string
          tool_id: number
          updated_at: string
          usage_based_cost: number | null
        }
        Insert: {
          cancelled_at?: string | null
          conflict_info?: string | null
          created_at?: string
          currency: string
          email_info?: Json | null
          email_recipient?: string | null
          flat_fee_cost?: number | null
          has_conflict?: boolean
          id?: number
          next_renewal_date: string
          number_of_seats?: number | null
          other_cost?: number | null
          price_per_seat?: number | null
          pricing_model: string
          receipt_file?: string | null
          renewal_frequency: string
          source?: string | null
          starts_at: string
          status: string
          tool_id: number
          updated_at?: string
          usage_based_cost?: number | null
        }
        Update: {
          cancelled_at?: string | null
          conflict_info?: string | null
          created_at?: string
          currency?: string
          email_info?: Json | null
          email_recipient?: string | null
          flat_fee_cost?: number | null
          has_conflict?: boolean
          id?: number
          next_renewal_date?: string
          number_of_seats?: number | null
          other_cost?: number | null
          price_per_seat?: number | null
          pricing_model?: string
          receipt_file?: string | null
          renewal_frequency?: string
          source?: string | null
          starts_at?: string
          status?: string
          tool_id?: number
          updated_at?: string
          usage_based_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      tool: {
        Row: {
          created_at: string
          department: string | null
          file_urls: string | null
          id: number
          is_desktop_tool: boolean
          is_tracking: boolean
          organization_id: string
          owner_org_user_id: number | null
          status: string
          status_should_be: string | null
          updated_at: string
          vendor_id: number
        }
        Insert: {
          created_at?: string
          department?: string | null
          file_urls?: string | null
          id?: number
          is_desktop_tool?: boolean
          is_tracking?: boolean
          organization_id: string
          owner_org_user_id?: number | null
          status: string
          status_should_be?: string | null
          updated_at?: string
          vendor_id: number
        }
        Update: {
          created_at?: string
          department?: string | null
          file_urls?: string | null
          id?: number
          is_desktop_tool?: boolean
          is_tracking?: boolean
          organization_id?: string
          owner_org_user_id?: number | null
          status?: string
          status_should_be?: string | null
          updated_at?: string
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tool_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_owner_org_user_id_fkey"
            columns: ["owner_org_user_id"]
            isOneToOne: false
            referencedRelation: "org_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          created_at: string
          current_org_id: string | null
          email: string
          first_name: string
          id: string
          is_tracked: boolean
          last_name: string
          onboarded: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_org_id?: string | null
          email: string
          first_name?: string
          id?: string
          is_tracked?: boolean
          last_name?: string
          onboarded?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_org_id?: string | null
          email?: string
          first_name?: string
          id?: string
          is_tracked?: boolean
          last_name?: string
          onboarded?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_user_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          id: number
          last_visited: string
          org_user_id: number
          tool_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          last_visited: string
          org_user_id: number
          tool_id: number
        }
        Update: {
          created_at?: string
          id?: number
          last_visited?: string
          org_user_id?: number
          tool_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_org_user_id_fkey"
            columns: ["org_user_id"]
            isOneToOne: false
            referencedRelation: "org_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: number
          link_to_pricing_page: string | null
          logo_url: string | null
          name: string
          organization_id: string | null
          root_domain: string
          status: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: number
          link_to_pricing_page?: string | null
          logo_url?: string | null
          name: string
          organization_id?: string | null
          root_domain: string
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: number
          link_to_pricing_page?: string | null
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          root_domain?: string
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

