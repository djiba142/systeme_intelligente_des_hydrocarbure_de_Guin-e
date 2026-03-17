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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alertes: {
        Row: {
          created_at: string
          entreprise_id: string | null
          id: string
          message: string
          niveau: string
          resolu: boolean
          resolu_at: string | null
          resolu_par: string | null
          station_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          entreprise_id?: string | null
          id?: string
          message: string
          niveau: string
          resolu?: boolean
          resolu_at?: string | null
          resolu_par?: string | null
          station_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          entreprise_id?: string | null
          id?: string
          message?: string
          niveau?: string
          resolu?: boolean
          resolu_at?: string | null
          resolu_par?: string | null
          station_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertes_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertes_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          contact_email: string | null
          contact_nom: string | null
          contact_telephone: string | null
          created_at: string
          id: string
          logo_url: string | null
          nom: string
          numero_agrement: string
          region: string
          sigle: string
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nom: string
          numero_agrement: string
          region: string
          sigle: string
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nom?: string
          numero_agrement?: string
          region?: string
          sigle?: string
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      historique_stocks: {
        Row: {
          created_at: string
          date_releve: string
          id: string
          station_id: string
          stock_essence: number
          stock_gasoil: number
          stock_gpl: number
          stock_lubrifiants: number
        }
        Insert: {
          created_at?: string
          date_releve: string
          id?: string
          station_id: string
          stock_essence?: number
          stock_gasoil?: number
          stock_gpl?: number
          stock_lubrifiants?: number
        }
        Update: {
          created_at?: string
          date_releve?: string
          id?: string
          station_id?: string
          stock_essence?: number
          stock_gasoil?: number
          stock_gpl?: number
          stock_lubrifiants?: number
        }
        Relationships: [
          {
            foreignKeyName: "historique_stocks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      importations: {
        Row: {
          carburant: string
          created_at: string
          created_by: string | null
          date_arrivee_effective: string | null
          date_arrivee_prevue: string | null
          date_depart: string | null
          id: string
          navire_nom: string
          notes: string | null
          port_origine: string | null
          quantite_tonnes: number
          statut: string
          updated_at: string
        }
        Insert: {
          carburant: string
          created_at?: string
          created_by?: string | null
          date_arrivee_effective?: string | null
          date_arrivee_prevue?: string | null
          date_depart?: string | null
          id?: string
          navire_nom: string
          notes?: string | null
          port_origine?: string | null
          quantite_tonnes: number
          statut?: string
          updated_at?: string
        }
        Update: {
          carburant?: string
          created_at?: string
          created_by?: string | null
          date_arrivee_effective?: string | null
          date_arrivee_prevue?: string | null
          date_depart?: string | null
          id?: string
          navire_nom?: string
          notes?: string | null
          port_origine?: string | null
          quantite_tonnes?: number
          statut?: string
          updated_at?: string
        }
        Relationships: []
      },
      dossiers: {
        Row: {
          id: string
          numero_dossier: string
          type_demande: string
          entite_id: string
          entite_type: string
          entite_nom: string
          statut: string
          priorite: string | null
          observations: string | null
          pieces_jointes: Json | null
          qr_code_url: string | null
          date_soumission: string
          updated_at: string
          valide_par_dsa: string | null
          valide_par_da: string | null
          valide_par_djc: string | null
          valide_par_dsi: string | null
          valide_par_dg: string | null
          rccm_url: string | null
          nif_url: string | null
          statuts_url: string | null
          autorisation_url: string | null
        }
        Insert: {
          id?: string
          numero_dossier: string
          type_demande: string
          entite_id: string
          entite_type: string
          entite_nom: string
          statut?: string
          priorite?: string | null
          observations?: string | null
          pieces_jointes?: Json | null
          qr_code_url?: string | null
          date_soumission?: string
          updated_at?: string
          valide_par_dsa?: string | null
          valide_par_da?: string | null
          valide_par_djc?: string | null
          valide_par_dsi?: string | null
          rccm_url?: string | null
          nif_url?: string | null
          statuts_url?: string | null
          autorisation_url?: string | null
        }
        Update: {
          id?: string
          numero_dossier?: string
          type_demande?: string
          entite_id?: string
          entite_type?: string
          entite_nom?: string
          statut?: string
          priorite?: string | null
          observations?: string | null
          pieces_jointes?: Json | null
          qr_code_url?: string | null
          date_soumission?: string
          updated_at?: string
          valide_par_dsa?: string | null
          valide_par_da?: string | null
          valide_par_djc?: string | null
          valide_par_dsi?: string | null
          rccm_url?: string | null
          nif_url?: string | null
          statuts_url?: string | null
          autorisation_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_valide_par_djc_fkey"
            columns: ["valide_par_djc"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_valide_par_dsa_fkey"
            columns: ["valide_par_dsa"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_valide_par_dsi_fkey"
            columns: ["valide_par_dsi"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_valide_par_da_fkey"
            columns: ["valide_par_da"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      livraisons: {
        Row: {
          bon_livraison: string | null
          camion_immatriculation: string | null
          carburant: string
          chauffeur_nom: string | null
          created_at: string
          created_by: string | null
          date_livraison: string
          id: string
          quantite: number
          source: string | null
          station_id: string
          statut: string
        }
        Insert: {
          bon_livraison?: string | null
          camion_immatriculation?: string | null
          carburant: string
          chauffeur_nom?: string | null
          created_at?: string
          created_by?: string | null
          date_livraison?: string
          id?: string
          quantite: number
          source?: string | null
          station_id: string
          statut?: string
        }
        Update: {
          bon_livraison?: string | null
          camion_immatriculation?: string | null
          carburant?: string
          chauffeur_nom?: string | null
          created_at?: string
          created_by?: string | null
          date_livraison?: string
          id?: string
          quantite?: number
          source?: string | null
          station_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "livraisons_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      ordres_livraison: {
        Row: {
          approuve_par: string | null
          carburant: string
          created_at: string
          created_by: string | null
          date_approbation: string | null
          date_demande: string
          date_expedition: string | null
          date_livraison: string | null
          id: string
          notes: string | null
          priorite: string
          quantite_demandee: number
          station_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          approuve_par?: string | null
          carburant: string
          created_at?: string
          created_by?: string | null
          date_approbation?: string | null
          date_demande?: string
          date_expedition?: string | null
          date_livraison?: string | null
          id?: string
          notes?: string | null
          priorite?: string
          quantite_demandee: number
          station_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          approuve_par?: string | null
          carburant?: string
          created_at?: string
          created_by?: string | null
          date_approbation?: string | null
          date_demande?: string
          date_expedition?: string | null
          date_livraison?: string | null
          id?: string
          notes?: string | null
          priorite?: string
          quantite_demandee?: number
          station_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordres_livraison_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      prix_officiels: {
        Row: {
          carburant: string
          created_at: string
          date_effet: string
          id: string
          modifie_par: string | null
          prix_litre: number
        }
        Insert: {
          carburant: string
          created_at?: string
          date_effet?: string
          id?: string
          modifie_par?: string | null
          prix_litre: number
        }
        Update: {
          carburant?: string
          created_at?: string
          date_effet?: string
          id?: string
          modifie_par?: string | null
          prix_litre?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          entreprise_id: string | null
          full_name: string
          id: string
          phone: string | null
          station_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          entreprise_id?: string | null
          full_name: string
          id?: string
          phone?: string | null
          station_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          entreprise_id?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          station_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          adresse: string
          capacite_essence: number
          capacite_gasoil: number
          capacite_gpl: number
          capacite_lubrifiants: number
          code: string
          created_at: string
          entreprise_id: string
          gestionnaire_email: string | null
          gestionnaire_nom: string | null
          gestionnaire_telephone: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nom: string
          nombre_pompes: number
          region: string
          statut: string
          stock_essence: number
          stock_gasoil: number
          stock_gpl: number
          stock_lubrifiants: number
          type: string
          updated_at: string
          ville: string
        }
        Insert: {
          adresse: string
          capacite_essence?: number
          capacite_gasoil?: number
          capacite_gpl?: number
          capacite_lubrifiants?: number
          code: string
          created_at?: string
          entreprise_id: string
          gestionnaire_email?: string | null
          gestionnaire_nom?: string | null
          gestionnaire_telephone?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom: string
          nombre_pompes?: number
          region: string
          statut?: string
          stock_essence?: number
          stock_gasoil?: number
          stock_gpl?: number
          stock_lubrifiants?: number
          type: string
          updated_at?: string
          ville: string
        }
        Update: {
          adresse?: string
          capacite_essence?: number
          capacite_gasoil?: number
          capacite_gpl?: number
          capacite_lubrifiants?: number
          code?: string
          created_at?: string
          entreprise_id?: string
          gestionnaire_email?: string | null
          gestionnaire_nom?: string | null
          gestionnaire_telephone?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string
          nombre_pompes?: number
          region?: string
          statut?: string
          stock_essence?: number
          stock_gasoil?: number
          stock_gpl?: number
          stock_lubrifiants?: number
          type?: string
          updated_at?: string
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_level: {
        Args: {
          _required_level: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_user_entreprise_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_station_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
      | "super_admin"
      | "admin_etat"
      | "directeur_general"
      | "directeur_adjoint"
      | "directeur_aval"
      | "directeur_adjoint_aval"
      | "chef_division_distribution"
      | "chef_bureau_aval"
      | "agent_supervision_aval"
      | "controleur_distribution"
      | "technicien_support_dsa"
      | "technicien_flux"
      | "inspecteur"
      | "personnel_admin"
      | "service_it"
      | "responsable_entreprise"
      | "directeur_administratif"
      | "chef_service_administratif"
      | "agent_administratif"
      | "gestionnaire_documentaire"
      | "responsable_stock"
      | "agent_station"
      | "technicien_aval"
      | "directeur_importation"
      | "agent_importation"
      | "secretaire_general"
      | "responsable_stations"
      | "gestionnaire_livraisons"
      | "operateur_entreprise"
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
    Enums: {
      app_role: [
        "super_admin",
        "admin_etat",
        "directeur_general",
        "directeur_adjoint",
        "directeur_aval",
        "directeur_adjoint_aval",
        "chef_division_distribution",
        "chef_bureau_aval",
        "agent_supervision_aval",
        "controleur_distribution",
        "technicien_support_dsa",
        "technicien_flux",
        "inspecteur",
        "analyste",
        "personnel_admin",
        "service_it",
        "responsable_entreprise",
      ],
    },
  },
} as const
