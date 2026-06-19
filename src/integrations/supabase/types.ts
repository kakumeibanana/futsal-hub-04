export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string | null
          event_id: string | null
          id: string
          member_name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          member_name: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          member_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_dates: {
        Row: {
          date: string
          event_id: string | null
          id: string
          time_slot: string | null
        }
        Insert: {
          date: string
          event_id?: string | null
          id?: string
          time_slot?: string | null
        }
        Update: {
          date?: string
          event_id?: string | null
          id?: string
          time_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          decide_count: number
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          decide_count?: number
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          decide_count?: number
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string | null
          display_role: string | null
          grade: string | null
          hidden: boolean
          id: string
          name: string
          name_roman: string | null
          number: number | null
          photo_url: string | null
          positions: string[] | null
          role: string
        }
        Insert: {
          created_at?: string | null
          display_role?: string | null
          grade?: string | null
          hidden?: boolean
          id?: string
          name: string
          name_roman?: string | null
          number?: number | null
          photo_url?: string | null
          positions?: string[] | null
          role?: string
        }
        Update: {
          created_at?: string | null
          display_role?: string | null
          grade?: string | null
          hidden?: boolean
          id?: string
          name?: string
          name_roman?: string | null
          number?: number | null
          photo_url?: string | null
          positions?: string[] | null
          role?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          availability: string
          created_at: string | null
          date: string
          event_id: string | null
          id: string
          member_name: string
        }
        Insert: {
          availability: string
          created_at?: string | null
          date: string
          event_id?: string | null
          id?: string
          member_name: string
        }
        Update: {
          availability?: string
          created_at?: string | null
          date?: string
          event_id?: string | null
          id?: string
          member_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          id: string
          name: string
          type: string
          title: string
          location: string
          detail: string
          belongings: string
          start_time: string | null
          end_time: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          title?: string
          location?: string
          detail?: string
          belongings?: string
          start_time?: string | null
          end_time?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          title?: string
          location?: string
          detail?: string
          belongings?: string
          start_time?: string | null
          end_time?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
schedule_events: {
        Row: {
          belongings: string
          created_at: string
          created_by: string
          date: string
          detail: string
          end_time: string | null
          id: string
          is_all_day: boolean
          line_notify_type: string
          line_send_at: string | null
          line_sent: boolean
          location: string
          start_time: string | null
          title: string
          type: string
        }
        Insert: {
          belongings?: string
          created_at?: string
          created_by?: string
          date: string
          detail?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          line_notify_type?: string
          line_send_at?: string | null
          line_sent?: boolean
          location?: string
          start_time?: string | null
          title: string
          type?: string
        }
        Update: {
          belongings?: string
          created_at?: string
          created_by?: string
          date?: string
          detail?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          line_notify_type?: string
          line_send_at?: string | null
          line_sent?: boolean
          location?: string
          start_time?: string | null
          title?: string
          type?: string
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
} as const
