import { describe, it, expect } from 'vitest'
import { isMarketOpen, quoteTtl, formatAge } from './quote-freshness.js'

// Fechas en UTC: Argentina es UTC-3, así que las 14:00 UTC son las 11:00 ART
const utc = s => new Date(`${s}Z`)

describe('isMarketOpen', () => {
  it('abierto un día hábil dentro del horario (11 a 17 h ART)', () => {
    expect(isMarketOpen(utc('2026-10-14T14:00:00'))).toBe(true)  // miércoles 11:00 ART
    expect(isMarketOpen(utc('2026-10-14T19:59:00'))).toBe(true)  // miércoles 16:59 ART
  })

  it('cerrado antes y después del horario', () => {
    expect(isMarketOpen(utc('2026-10-14T13:59:00'))).toBe(false) // 10:59 ART
    expect(isMarketOpen(utc('2026-10-14T20:00:00'))).toBe(false) // 17:00 ART
  })

  it('cerrado el fin de semana', () => {
    expect(isMarketOpen(utc('2026-10-17T15:00:00'))).toBe(false) // sábado
    expect(isMarketOpen(utc('2026-10-18T15:00:00'))).toBe(false) // domingo
  })

  it('usa la fecha de Argentina cerca de medianoche UTC', () => {
    // sábado 01:00 UTC = viernes 22:00 ART → cerrado por horario, no por día
    expect(isMarketOpen(utc('2026-10-17T01:00:00'))).toBe(false)
  })
})

describe('quoteTtl', () => {
  it('15 minutos con el mercado abierto y 2 horas cerrado', () => {
    expect(quoteTtl(utc('2026-10-14T15:00:00'))).toBe(15 * 60 * 1000)
    expect(quoteTtl(utc('2026-10-17T15:00:00'))).toBe(2 * 60 * 60 * 1000)
  })
})

describe('formatAge', () => {
  it('formatea minutos y horas', () => {
    expect(formatAge(30 * 1000)).toBe('recién')
    expect(formatAge(12 * 60 * 1000)).toBe('hace 12 min')
    expect(formatAge(60 * 60 * 1000)).toBe('hace 1 h')
    expect(formatAge(70 * 60 * 1000)).toBe('hace 1 h 10 min')
    expect(formatAge(-5000)).toBe('recién')
  })
})
