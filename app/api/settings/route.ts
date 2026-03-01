import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select(`
      *,
      default_alyc:alycs(*)
    `)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || { default_alyc_id: null })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  
  // Verificar si existe un registro de settings
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .single()

  let result
  if (existing) {
    result = await supabase
      .from('app_settings')
      .update({ default_alyc_id: body.default_alyc_id })
      .eq('id', existing.id)
      .select(`
        *,
        default_alyc:alycs(*)
      `)
      .single()
  } else {
    result = await supabase
      .from('app_settings')
      .insert([{ default_alyc_id: body.default_alyc_id }])
      .select(`
        *,
        default_alyc:alycs(*)
      `)
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json(result.data)
}
