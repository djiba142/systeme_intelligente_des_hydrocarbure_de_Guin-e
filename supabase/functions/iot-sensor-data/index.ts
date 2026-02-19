import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sensor-key',
}

interface SensorData {
  station_code: string;
  sensor_type: 'niveau' | 'debit' | 'ouverture' | 'temperature';
  carburant?: 'essence' | 'gasoil' | 'gpl' | 'lubrifiants';
  valeur: number;
  unite: string;
  timestamp?: string;
  sensor_id?: string;
  batterie_niveau?: number;
  signal_qualite?: number;
}

interface SensorPayload {
  sensor_key: string;
  data: SensorData[];
}

interface ProcessResult {
  station_code: string;
  sensor_type: string;
  carburant?: string;
  valeur?: number;
  status: string;
  alert_created?: boolean;
}

interface ProcessError {
  station_code: string;
  sensor_type?: string;
  error: string;
}

interface Station {
  id: string;
  nom: string;
  entreprise_id: string;
  stock_essence: number;
  stock_gasoil: number;
  stock_gpl: number;
  stock_lubrifiants: number;
  capacite_essence: number;
  capacite_gasoil: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const sensorKey = req.headers.get('x-sensor-key')
    const payload: SensorPayload = await req.json()
    const validKey = sensorKey || payload.sensor_key
    
    if (!validKey || validKey.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid sensor key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Correction: Types explicites au lieu de any[]
    const results: ProcessResult[] = []
    const errors: ProcessError[] = []

    for (const data of payload.data) {
      try {
        const { data: station, error: stationError } = await supabase
          .from('stations')
          .select('id, nom, entreprise_id, stock_essence, stock_gasoil, stock_gpl, stock_lubrifiants, capacite_essence, capacite_gasoil')
          .eq('code', data.station_code)
          .single()

        const typedStation = station as Station;

        if (stationError || !typedStation) {
          errors.push({ 
            station_code: data.station_code, 
            error: 'Station not found' 
          })
          continue
        }

        if (data.sensor_type === 'niveau' && data.carburant) {
          const stockField = `stock_${data.carburant}`;
          const newStock = Math.round(data.valeur);

          // Correction: Record<string, number> au lieu de any
          const updateData: Record<string, number> = {
            [stockField]: newStock
          }

          const { error: updateError } = await supabase
            .from('stations')
            .update(updateData)
            .eq('id', typedStation.id)

          if (updateError) {
            errors.push({ 
              station_code: data.station_code, 
              sensor_type: data.sensor_type,
              error: updateError.message 
            })
          } else {
            await supabase.from('historique_stocks').insert({
              station_id: typedStation.id,
              date_releve: data.timestamp || new Date().toISOString().split('T')[0],
              stock_essence: data.carburant === 'essence' ? newStock : typedStation.stock_essence,
              stock_gasoil: data.carburant === 'gasoil' ? newStock : typedStation.stock_gasoil,
              stock_gpl: data.carburant === 'gpl' ? newStock : typedStation.stock_gpl,
              stock_lubrifiants: data.carburant === 'lubrifiants' ? newStock : typedStation.stock_lubrifiants,
            })

            results.push({
              station_code: data.station_code,
              sensor_type: data.sensor_type,
              carburant: data.carburant,
              valeur: newStock,
              status: 'updated'
            })
          }
        } 
        else if (data.sensor_type === 'ouverture') {
          if (data.valeur === 1) {
            const now = new Date()
            const hour = now.getHours()
            const isAuthorizedHour = hour >= 6 && hour <= 22

            if (!isAuthorizedHour) {
              await supabase.from('alertes').insert({
                station_id: typedStation.id,
                entreprise_id: typedStation.entreprise_id,
                type: 'securite',
                niveau: 'critique',
                message: `ALERTE SÉCURITÉ: Ouverture non autorisée détectée - Station ${typedStation.nom} à ${now.toLocaleTimeString('fr-FR')}`
              })

              results.push({
                station_code: data.station_code,
                sensor_type: data.sensor_type,
                alert_created: true,
                status: 'security_alert'
              })
            } else {
              results.push({
                station_code: data.station_code,
                sensor_type: data.sensor_type,
                status: 'logged_authorized'
              })
            }
          }
        }
        else if (data.sensor_type === 'debit') {
          results.push({
            station_code: data.station_code,
            sensor_type: data.sensor_type,
            valeur: data.valeur,
            status: 'logged'
          })
        }
        else if (data.sensor_type === 'temperature') {
          if (data.valeur > 45) {
            await supabase.from('alertes').insert({
              station_id: typedStation.id,
              entreprise_id: typedStation.entreprise_id,
              type: 'securite',
              niveau: 'critique',
              message: `ALERTE TEMPÉRATURE: ${data.valeur}°C détecté - Station ${typedStation.nom}`
            })
          }
          results.push({
            station_code: data.station_code,
            sensor_type: data.sensor_type,
            valeur: data.valeur,
            status: 'logged'
          })
        }
      } catch (err) {
        errors.push({ 
          station_code: data.station_code, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})