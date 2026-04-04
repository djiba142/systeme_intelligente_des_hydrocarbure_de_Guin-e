import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
}

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'super_admin' | 'admin_etat' | 'inspecteur' | 'responsable_entreprise' | 'gestionnaire_station';
  phone?: string;
  entreprise_id?: string;
  station_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header to verify calling user has permission
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader) {
      // Verify the calling user is an admin
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user has admin privileges
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!roleData || !['super_admin', 'admin_etat'].includes(roleData.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Allow initial admin creation with special key (for bootstrapping)
      const adminKey = req.headers.get('x-admin-key')
      if (adminKey !== 'SIHG_BOOTSTRAP_2026') {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const payload: CreateUserPayload = await req.json()

    // Validate required fields
    if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user with admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Update profile with additional info
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: payload.full_name,
        phone: payload.phone || null,
        entreprise_id: payload.entreprise_id || null,
        station_id: payload.station_id || null
      })
      .eq('user_id', userId)

    // Update role (trigger already creates default role)
    await supabaseAdmin
      .from('user_roles')
      .update({ role: payload.role })
      .eq('user_id', userId)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userId,
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create user error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
