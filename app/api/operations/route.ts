import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('operations')
    .select(`
      *,
      instrument:instruments(*, instrument_type:instrument_types(*)),
      alyc:alycs(*)
    `)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  
  const { data, error } = await supabase
    .from('operations')
    .insert([{
      date: body.date,
      instrument_id: body.instrument_id,
      alyc_id: body.alyc_id,
      operation_type: body.operation_type,
      quantity: body.quantity,
      price: body.price,
      commission: body.commission || 0,
      notes: body.notes || null
    }])
    .select(`
      *,
      instrument:instruments(*, instrument_type:instrument_types(*)),
      alyc:alycs(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
