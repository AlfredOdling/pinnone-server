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
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      tools: {
        Row: {
          budget_owner_id: string | null
          cancelled_at: string | null
          cost: number | null
          created_at: string
          currency: string | null
          department_id: string | null
          id: string
          is_tracking: boolean | null
          name: string
          next_renewal_date: string | null
          number_of_units: number | null
          organization_id: string
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          renewal_frequency:
            | Database["public"]["Enums"]["renewal_frequency"]
            | null
          starts_at: string
          status: Database["public"]["Enums"]["tool_status"] | null
          vendor_id: string
        }
        Insert: {
          budget_owner_id?: string | null
          cancelled_at?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          department_id?: string | null
          id?: string
          is_tracking?: boolean | null
          name: string
          next_renewal_date?: string | null
          number_of_units?: number | null
          organization_id: string
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          renewal_frequency?:
            | Database["public"]["Enums"]["renewal_frequency"]
            | null
          starts_at?: string
          status?: Database["public"]["Enums"]["tool_status"] | null
          vendor_id: string
        }
        Update: {
          budget_owner_id?: string | null
          cancelled_at?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          department_id?: string | null
          id?: string
          is_tracking?: boolean | null
          name?: string
          next_renewal_date?: string | null
          number_of_units?: number | null
          organization_id?: string
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          renewal_frequency?:
            | Database["public"]["Enums"]["renewal_frequency"]
            | null
          starts_at?: string
          status?: Database["public"]["Enums"]["tool_status"] | null
          vendor_id?: string
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
            foreignKeyName: "tools_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      untracked_tools: {
        Row: {
          created_at: string
          id: number
          org_id: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          org_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          org_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_untracked_tools_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_untracked_tools_vendor_id_fkey"
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
          id: string
          last_visited: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_visited?: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_visited?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
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
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          is_tracked: boolean | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          completed_onboarding?: boolean | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_tracked?: boolean | null
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_onboarding?: boolean | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_tracked?: boolean | null
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_organizations_roles: {
        Row: {
          created_at: string
          id: number
          organization_id: string
          role_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          organization_id: string
          role_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          organization_id?: string
          role_id?: number
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
          id: string
          logo_url: string | null
          name: string
          pricing_info: string | null
          root_domain: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          pricing_info?: string | null
          root_domain?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pricing_info?: string | null
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
      pricing_model: "FLAT_FEE" | "PER_SEAT" | "USAGE_BASED" | "OTHER"
      renewal_frequency: "MONTHLY" | "QUARTERLY" | "YEARLY"
      tool_status: "ACTIVE" | "EXPIRED"
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

