import { describe, it, expect } from 'vitest'
import { esc, fmtDateShort, buildPageRange, getConcentrationAlert } from './utils.js'

describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes ampersands', () => {
    expect(esc('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })
})

describe('fmtDateShort', () => {
  it('returns em dash for empty input', () => {
    expect(fmtDateShort(null)).toBe('—')
    expect(fmtDateShort('')).toBe('—')
  })

  it('formats an ISO date as dd/mm/yyyy', () => {
    expect(fmtDateShort('2026-03-05')).toBe('05/03/2026')
  })

  it('strips the time portion from a full ISO timestamp', () => {
    expect(fmtDateShort('2026-03-05T14:30:00.000Z')).toBe('05/03/2026')
  })
})

describe('buildPageRange', () => {
  it('returns the full range when there are 7 pages or fewer', () => {
    expect(buildPageRange(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('adds a trailing ellipsis when the current page is near the start', () => {
    expect(buildPageRange(0, 10)).toEqual([0, 1, '...', 9])
  })

  it('adds ellipsis on both sides when the current page is in the middle', () => {
    expect(buildPageRange(5, 10)).toEqual([0, '...', 4, 5, 6, '...', 9])
  })

  it('adds a leading ellipsis when the current page is near the end', () => {
    expect(buildPageRange(9, 10)).toEqual([0, '...', 8, 9])
  })
})

describe('getConcentrationAlert', () => {
  const thresholds = { subject: 'tu cartera', thresholdWarning: 25, thresholdDanger: 40 }

  it('returns null when there are no items', () => {
    expect(getConcentrationAlert([], thresholds)).toBeNull()
  })

  it('returns null when the top weight is below the warning threshold', () => {
    const items = [{ label: 'AAPL', weight: 10 }]
    expect(getConcentrationAlert(items, thresholds)).toBeNull()
  })

  it('returns a warning-level alert between the warning and danger thresholds', () => {
    const items = [{ label: 'AAPL', weight: 30 }]
    const alert = getConcentrationAlert(items, thresholds)
    expect(alert.level).toBe('warning')
    expect(alert.message).toContain('30.0%')
    expect(alert.message).toContain('AAPL')
  })

  it('returns a danger-level alert at or above the danger threshold', () => {
    const items = [{ label: 'AAPL', weight: 45 }]
    expect(getConcentrationAlert(items, thresholds).level).toBe('danger')
  })

  it('picks the item with the highest weight', () => {
    const items = [{ label: 'A', weight: 10 }, { label: 'B', weight: 50 }]
    expect(getConcentrationAlert(items, thresholds).message).toContain('B')
  })

  it('escapes the label to avoid HTML injection in the message', () => {
    const items = [{ label: '<b>X</b>', weight: 30 }]
    expect(getConcentrationAlert(items, thresholds).message).toContain('&lt;b&gt;X&lt;/b&gt;')
  })
})
