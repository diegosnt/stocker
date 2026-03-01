export interface InstrumentType {
  id: number
  name: string
  created_at?: string
}

export interface Instrument {
  id: number
  ticker: string
  name: string
  instrument_type_id: number
  instrument_type?: InstrumentType
  created_at?: string
}

export interface Alyc {
  id: number
  name: string
  created_at?: string
}

export interface Operation {
  id: number
  date: string
  instrument_id: number
  instrument?: Instrument
  alyc_id: number
  alyc?: Alyc
  operation_type: 'compra' | 'venta'
  quantity: number
  price: number
  commission: number
  notes?: string
  created_at?: string
}

export interface AppSettings {
  id: number
  default_alyc_id: number | null
  default_alyc?: Alyc
  created_at?: string
}
