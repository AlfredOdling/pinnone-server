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
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: number
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          role?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string | null
          flat_fee_cost: number | null
          id: number
          next_renewal_date: string | null
          number_of_seats: number | null
          other_cost: number | null
          price_per_seat: number | null
          pricing_model: string | null
          renewal_frequency: string | null
          starts_at: string | null
          status: string | null
          tool_id: number | null
          updated_at: string
          usage_based_cost: number | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          flat_fee_cost?: number | null
          id?: number
          next_renewal_date?: string | null
          number_of_seats?: number | null
          other_cost?: number | null
          price_per_seat?: number | null
          pricing_model?: string | null
          renewal_frequency?: string | null
          starts_at?: string | null
          status?: string | null
          tool_id?: number | null
          updated_at?: string
          usage_based_cost?: number | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          flat_fee_cost?: number | null
          id?: number
          next_renewal_date?: string | null
          number_of_seats?: number | null
          other_cost?: number | null
          price_per_seat?: number | null
          pricing_model?: string | null
          renewal_frequency?: string | null
          starts_at?: string | null
          status?: string | null
          tool_id?: number | null
          updated_at?: string
          usage_based_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_subscription_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          budget_owner_id: string | null
          created_at: string
          department: string | null
          file_urls: string | null
          id: number
          is_tracking: boolean | null
          organization_id: string
          updated_at: string
          vendor_id: number
        }
        Insert: {
          budget_owner_id?: string | null
          created_at?: string
          department?: string | null
          file_urls?: string | null
          id?: number
          is_tracking?: boolean | null
          organization_id: string
          updated_at?: string
          vendor_id: number
        }
        Update: {
          budget_owner_id?: string | null
          created_at?: string
          department?: string | null
          file_urls?: string | null
          id?: number
          is_tracking?: boolean | null
          organization_id?: string
          updated_at?: string
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tools_budget_owner_id_fkey"
            columns: ["budget_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          id: number
          last_visited: string
          updated_at: string
          user_id: string
          vendor_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          last_visited: string
          updated_at?: string
          user_id: string
          vendor_id: number
        }
        Update: {
          created_at?: string
          id?: number
          last_visited?: string
          updated_at?: string
          user_id?: string
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          completed_onboarding: boolean | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_tracked: boolean | null
          last_name: string | null
          updated_at: string
        }
        Insert: {
          completed_onboarding?: boolean | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_tracked?: boolean | null
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          completed_onboarding?: boolean | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_tracked?: boolean | null
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users_organizations_roles: {
        Row: {
          created_at: string
          id: number
          organization_id: string
          role_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          organization_id: string
          role_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          organization_id?: string
          role_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organizations_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organizations_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organizations_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: number
          link_to_pricing_page: string | null
          logo_url: string | null
          name: string
          root_domain: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          link_to_pricing_page?: string | null
          logo_url?: string | null
          name: string
          root_domain?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          link_to_pricing_page?: string | null
          logo_url?: string | null
          name?: string
          root_domain?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
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

