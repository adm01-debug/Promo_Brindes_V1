type Json = boolean | number | string | null ? { [key: string]: Json | Json[]
type Database = {
  public: {
    Tables: {
      _retention_buckets: {
        Row: {
          created_at: string
          id: string
          published_at: string | null
          quote_request_id: string
          storage_bucket: string
          storage_path: string
          superseded_at: string | null
          title: string
          valid_until: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          published_at?: string | null
          quote_request_id: string
          storage_bucket?: string
          storage_path: string
          superseded_at?: string | null
          title: string
          valid_until?: string | null
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          published_at?: string | null
          quote_request_id?: string
          storage_bucket?: string
          storage_path?: string
          superseded_at?: string | null
          title?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_adjustment_requests: {
        Row: {
          client_request_id: string
          created_at: string
          id: string
          message: string
          quote_request_id: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          client_request_id: string
          created_at?: string
          id?: string
          message: string
          quote_request_id: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_request_id?: string
          created_at?: string
          id?: string
          message?: string
          quote_request_id?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_adjustment_requests_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          color_hex_snapshot: string | null
          color_name_snapshot: string | null
          created_at: string
          decision_group_snapshot: string
          id: string
          image_url_snapshot: string | null
          item_key: string
          kit_group_id: string | null
          kit_name_snapshot: string | null
          kit_quantity_snapshot: number | null
          minimum_quantity_snapshot: number
          position: number
          product_name_snapshot: string
          product_slug: string
          quantity: number
          quote_request_id: string
          sku_snapshot: string
          source_product_id: string
          units_per_kit_snapshot: number | null
          variant_id_snapshot: string | null
        }
        Insert: {
          color_hex_snapshot?: string | null
          color_name_snapshot?: string | null
          created_at?: string
          decision_group_snapshot?: string
          id?: string
          image_url_snapshot?: string | null
          item_key: string
          kit_group_id?: string | null
          kit_name_snapshot?: string | null
          kit_quantity_snapshot?: number | null
          minimum_quantity_snapshot: number
          position: number
          product_name_snapshot: string
          product_slug: string
          quantity: number
          quote_request_id: string
          sku_snapshot: string
          source_product_id: string
          units_per_kit_snapshot?: number | null
          variant_id_snapshot?: string | null
        }
        Update: {
          color_hex_snapshot?: string | null
          color_name_snapshot?: string | null
          created_at?: string
          decision_group_snapshot?: string
          id?: string
          image_url_snapshot?: string | null
          item_key?: string
          kit_group_id?: string | null
          kit_name_snapshot?: string | null
          kit_quantity_snapshot?: number | null
          minimum_quantity_snapshot?: number
          position?: number
          product_name_snapshot?: string
          product_slug?: string
          quantity?: number
          quote_request_id?: string
          sku_snapshot?: string
          source_product_id?: string
          units_per_kit_snapshot?: number | null
          variant_id_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_events: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          quote_request_id: string
          sequence: number
          status: string | null
          title: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          quote_request_id: string
          sequence?: never
          status?: string | null
          title: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          quote_request_id?: string
          sequence?: never
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_events_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          city: string | null
          client_request_id: string
          client_submitted_at: string
          company: string
          contact_name: string
          created_at: string
          customer_user_id: string | null
          desired_deadline: string | null
          email: string
          id: string
          notes: string | null
          page_url: string | null
          phone: string
          protocol: string
          request_hash: string
          request_metadata: Json
          retention_until: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_request_id: string
          client_submitted_at: string
          company: string
          contact_name: string
          created_at?: string
          customer_user_id?: string | null
          desired_deadline?: string | null
          email: string
          id?: string
          notes?: string | null
          page_url?: string | null
          phone: string
          protocol: string
          request_hash: string
          request_metadata?: Json
          retention_until?: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_request_id?: string
          client_submitted_at?: string
          company?: string
          contact_name?: string
          created_at?: string
          customer_user_id?: string | null
          desired_deadline?: string | null
          email?: string
          id?: string
          notes?: string | null
          page_url?: string | null
          phone?: string
          protocol?: string
          request_hash?: string
          request_metadata?: Json
          retention_until?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          identifier_hash: string
          request_count: number
          request_kind: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          identifier_hash: string
          request_count: number
          request_kind: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          identifier_hash?: string
          request_count?: number
          request_kind?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      shared_selection_rate_limits: {
        Row: {
          identifier_hash: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          identifier_hash: string
          request_count: number
          updated_at?: string
          window_started_at: string
        }
        Update: {
          identifier_hash?: string
          request_count?: number
          updated_at?: string
          window_started_at: string
        }
        Relationships: []
      }
      shared_selections: {
        Row: {
          created_at: string
          expires_at: string
          items: Json
          management_token_hash: string
          revoked_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          items: Json
          management_token_hash: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          items?: Json
          management_token_hash?: string
          revoked_at: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_transitions: {
        Row: {
          entity: string
          from_status: string
          to_status: string
        }
        Insert: {
          entity: string
          from_status: string
          to_status: string
        }
        Update: {
          entity?: string
          from_status?: string
          to_status?: string
        }
        Relationships: []
      }
      storage_deletion_queue: {
        Row: {
          bucket: string
          object_path: string
          queued_at: string
        }
        Insert: {
          bucket: string
          object_path: string
          queued_at?: string
        }
        Update: {
          bucket?: string
          object_path?: string
          queued_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_actor: { Args: never; Returns: string }
      commercial_team_alert_payload: { Args: { p_delivery_id: string }; Returns: Json }
      consume_rate_limit: {
        Args: {
          p_identifier_hash: string
          p_limit: number
          p_request_kind: string
          p_window: string
        }
        Returns: undefined
      }
      consume_shared_selection_action_limit: {
        Args: { p_identifier_hash: string; p_limit: number }
        Returns: undefined
      }
      finalize_expired_site_data: {
        Args: {
          p_batch_size?: number
          p_quote_ids?: string[]
          p_storage_paths?: string[]
        }
        Returns: Json
      }
      get_expired_site_data_candidates: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      has_unsafe_display_controls: {
        Args: { p_value: string }
        Returns: boolean
      }
      mod11_check_digit: { Args: { p_digits: string }; Returns: string }
      next_retry_at: {
        Args: { p_attempts: number; p_jitter?: number; p_now?: string }
        Returns: string
      }
      normalize_email: { Args: { p_email: string }; Returns: string }
      normalize_selection_references: { Args: { p_items: Json }; Returns: Json }
      notification_policy: {
        Args: never
        Returns: {
          batch_max: number
          lease_timeout: string
          max_attempts: number
          retry_base_secondsz: number
          retry_cap_seconds: number
        }[]
      }
      quote_notification_payload: {
        Args: { p_delivery_id: string }
        Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  site_private: {
    Enums: {},
  },
} as const

