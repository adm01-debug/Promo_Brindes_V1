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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_site_notification_provider_event: {
        Args: {
          p_bounce_reason?: string
          p_event_type: string
          p_occurred_at: string
          p_provider: string
          p_provider_event_id: string
          p_provider_message_id: string
        }
        Returns: Json
      }
      attach_my_briefing_assets_to_quote: {
        Args: { p_asset_ids: string[]; p_request_id: string }
        Returns: number
      }
      can_delete_my_unverified_briefing_asset_path: {
        Args: { p_path: string }
        Returns: boolean
      }
      claim_my_quote_requests: { Args: never; Returns: Json }
      claim_site_notification_deliveries: {
        Args: { p_batch_size?: number; p_channels: string[] }
        Returns: Json
      }
      claim_site_quote_notification: {
        Args: { p_channel: string; p_request_id: string }
        Returns: Json
      }
      confirm_site_briefing_asset_verification: {
        Args: {
          p_id: string
          p_mime_type: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      create_my_briefing_asset: {
        Args: {
          p_kind?: string
          p_mime_type: string
          p_original_name: string
          p_size_bytes: number
        }
        Returns: Json
      }
      create_site_contact_request: {
        Args: { p_payload: Json; p_request_meta: Json }
        Returns: Json
      }
      create_site_quote_request: {
        Args: { p_payload: Json; p_request_meta: Json }
        Returns: Json
      }
      create_site_shared_selection: {
        Args: {
          p_identifier_hash: string
          p_items: Json
          p_management_token_hash: string
        }
        Returns: Json
      }
      delete_my_briefing_asset: { Args: { p_id: string }; Returns: boolean }
      delete_my_selection: {
        Args: { p_expected_version: number; p_id: string }
        Returns: boolean
      }
      erase_customer_data: { Args: { p_email: string }; Returns: Json }
      finalize_briefing_asset_retention: {
        Args: { p_batch_size?: number; p_storage_paths: string[] }
        Returns: number
      }
      finalize_site_data_retention: {
        Args: {
          p_batch_size?: number
          p_quote_ids: string[]
          p_storage_paths: string[]
        }
        Returns: Json
      }
      finalize_site_notification_delivery: {
        Args: {
          p_delivery_id: string
          p_error_code?: string
          p_lease_token: string
          p_provider?: string
          p_provider_message_id?: string
          p_retry_after_seconds?: number
          p_status: string
        }
        Returns: boolean
      }
      finalize_site_storage_retention: {
        Args: { p_batch_size?: number; p_objects: Json }
        Returns: Json
      }
      get_briefing_asset_retention_candidates: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      get_my_briefing_asset_verification: {
        Args: { p_id: string }
        Returns: Json
      }
      get_my_proposal_document: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      get_my_quote_request: { Args: { p_request_id: string }; Returns: Json }
      get_my_quote_requests: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      get_site_data_retention_candidates: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      get_site_shared_selection: {
        Args: { p_identifier_hash: string; p_token: string }
        Returns: Json
      }
      list_my_briefing_assets: { Args: never; Returns: Json }
      list_my_occasion_favorites: { Args: never; Returns: Json }
      list_my_selections: {
        Args: { p_include_archived?: boolean }
        Returns: Json
      }
      matches_my_briefing_asset_upload: {
        Args: { p_metadata: Json; p_path: string }
        Returns: boolean
      }
      owns_my_briefing_asset_path: {
        Args: { p_path: string }
        Returns: boolean
      }
      purge_archived_customer_selections: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      purge_site_admin_audit_logs: {
        Args: { p_batch_size?: number; p_retention_days?: number }
        Returns: Json
      }
      record_site_notification_dispatch_started: {
        Args: { p_delivery_id: string; p_lease_token: string }
        Returns: boolean
      }
      record_site_notification_provider_acceptance: {
        Args: {
          p_delivery_id: string
          p_lease_token: string
          p_provider: string
          p_provider_message_id: string
        }
        Returns: boolean
      }
      request_my_quote_adjustment: {
        Args: {
          p_client_request_id: string
          p_message: string
          p_request_id: string
        }
        Returns: Json
      }
      revoke_site_shared_selection: {
        Args: {
          p_identifier_hash: string
          p_management_token_hash: string
          p_token: string
        }
        Returns: Json
      }
      save_my_selection: {
        Args: {
          p_campaign?: Json
          p_expected_version?: number
          p_id?: string
          p_references: Json
          p_title: string
        }
        Returns: Json
      }
      set_my_occasion_favorite: {
        Args: { p_occasion_id: string; p_saved: boolean }
        Returns: Json
      }
      set_my_selection_archived: {
        Args: { p_archived: boolean; p_expected_version: number; p_id: string }
        Returns: Json
      }
      site_notification_queue_health: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  site_private: {
    Tables: {
      admin_audit_log: {
        Row: {
          application_name: string | null
          id: number
          occurred_at: string
          operation: string
          performed_by: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          application_name?: string | null
          id?: never
          occurred_at?: string
          operation: string
          performed_by: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          application_name?: string | null
          id?: never
          occurred_at?: string
          operation?: string
          performed_by?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      admin_ddl_log: {
        Row: {
          command_tag: string
          id: number
          object_type: string | null
          occurred_at: string
          performed_by: string
          schema_name: string | null
        }
        Insert: {
          command_tag: string
          id?: never
          object_type?: string | null
          occurred_at?: string
          performed_by: string
          schema_name?: string | null
        }
        Update: {
          command_tag?: string
          id?: never
          object_type?: string | null
          occurred_at?: string
          performed_by?: string
          schema_name?: string | null
        }
        Relationships: []
      }
      consent_receipts: {
        Row: {
          accepted: boolean
          client_accepted_at: string
          contact_request_id: string | null
          id: string
          notice_version: string
          purpose: string
          quote_request_id: string | null
          request_kind: string
          server_recorded_at: string
        }
        Insert: {
          accepted: boolean
          client_accepted_at: string
          contact_request_id?: string | null
          id?: string
          notice_version: string
          purpose?: string
          quote_request_id?: string | null
          request_kind: string
          server_recorded_at?: string
        }
        Update: {
          accepted?: boolean
          client_accepted_at?: string
          contact_request_id?: string | null
          id?: string
          notice_version?: string
          purpose?: string
          quote_request_id?: string | null
          request_kind?: string
          server_recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_receipts_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: false
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_receipts_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          client_request_id: string
          client_submitted_at: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          page_url: string | null
          phone: string | null
          preferred_channel: string | null
          request_hash: string
          request_metadata: Json
          retention_until: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          client_request_id: string
          client_submitted_at: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          page_url?: string | null
          phone?: string | null
          preferred_channel?: string | null
          request_hash: string
          request_metadata?: Json
          retention_until?: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_request_id?: string
          client_submitted_at?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          page_url?: string | null
          phone?: string | null
          preferred_channel?: string | null
          request_hash?: string
          request_metadata?: Json
          retention_until?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_briefing_assets: {
        Row: {
          created_at: string
          customer_user_id: string
          expires_at: string
          id: string
          kind: string
          mime_type: string
          original_name: string
          quote_request_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          customer_user_id: string
          expires_at?: string
          id?: string
          kind: string
          mime_type: string
          original_name: string
          quote_request_id?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          customer_user_id?: string
          expires_at?: string
          id?: string
          kind?: string
          mime_type?: string
          original_name?: string
          quote_request_id?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_briefing_assets_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_occasion_favorites: {
        Row: {
          created_at: string
          customer_user_id: string
          occasion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_user_id: string
          occasion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_user_id?: string
          occasion_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          company: string | null
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
          verified_email: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
          verified_email: string
        }
        Update: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
          verified_email?: string
        }
        Relationships: []
      }
      customer_selections: {
        Row: {
          archived_at: string | null
          campaign: Json | null
          created_at: string
          customer_user_id: string
          id: string
          product_references: Json
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          campaign?: Json | null
          created_at?: string
          customer_user_id: string
          id?: string
          product_references: Json
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          campaign?: Json | null
          created_at?: string
          customer_user_id?: string
          id?: string
          product_references?: Json
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      erased_customer_identities: {
        Row: {
          auth_users_deleted: number
          email_sha256: string
          erased_at: string
        }
        Insert: {
          auth_users_deleted?: number
          email_sha256: string
          erased_at?: string
        }
        Update: {
          auth_users_deleted?: number
          email_sha256?: string
          erased_at?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempts: number
          audience: string
          bounce_reason: string | null
          channel: string
          claimed_at: string | null
          complained_at: string | null
          created_at: string
          delivery_state: string | null
          delivery_state_at: string | null
          delivery_state_source_event_id: string | null
          id: string
          last_error_at: string | null
          last_error_code: string | null
          lease_expires_at: string | null
          lease_token: string | null
          next_attempt_at: string
          provider: string | null
          provider_message_id: string | null
          request_id: string
          request_kind: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          audience: string
          bounce_reason?: string | null
          channel: string
          claimed_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivery_state?: string | null
          delivery_state_at?: string | null
          delivery_state_source_event_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          next_attempt_at?: string
          provider?: string | null
          provider_message_id?: string | null
          request_id: string
          request_kind: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          audience?: string
          bounce_reason?: string | null
          channel?: string
          claimed_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivery_state?: string | null
          delivery_state_at?: string | null
          delivery_state_source_event_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          next_attempt_at?: string
          provider?: string | null
          provider_message_id?: string | null
          request_id?: string
          request_kind?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_delivery_state_source_event_id_fkey"
            columns: ["delivery_state_source_event_id"]
            isOneToOne: false
            referencedRelation: "notification_provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_provider_events: {
        Row: {
          delivery_id: string | null
          event_type: string
          id: string
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          delivery_id?: string | null
          event_type: string
          id?: string
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          delivery_id?: string | null
          event_type?: string
          id?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_provider_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "notification_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
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
          window_started_at?: string
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
          revoked_at?: string | null
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
          retry_base_seconds: number
          retry_cap_seconds: number
        }[]
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

