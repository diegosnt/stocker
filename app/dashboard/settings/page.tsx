'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check } from 'lucide-react'
import type { Alyc, AppSettings } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SettingsPage() {
  const { data: settings } = useSWR<AppSettings>('/api/settings', fetcher)
  const { data: alycs } = useSWR<Alyc[]>('/api/alycs', fetcher)
  
  const [defaultAlycId, setDefaultAlycId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.default_alyc_id) {
      setDefaultAlycId(settings.default_alyc_id.toString())
    }
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_alyc_id: defaultAlycId ? parseInt(defaultAlycId) : null,
      }),
    })

    mutate('/api/settings')
    setIsSaving(false)
    setSaved(true)
    
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Preferencias de la aplicación</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valores por Defecto</CardTitle>
          <CardDescription>
            Configura los valores predeterminados para nuevas operaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="default-alyc">ALYC por Defecto</Label>
            <Select
              value={defaultAlycId}
              onValueChange={setDefaultAlycId}
            >
              <SelectTrigger id="default-alyc">
                <SelectValue placeholder="Seleccionar ALYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin ALYC por defecto</SelectItem>
                {alycs?.map((alyc) => (
                  <SelectItem key={alyc.id} value={alyc.id.toString()}>
                    {alyc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Esta ALYC se seleccionará automáticamente al crear nuevas operaciones
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Guardado
              </>
            ) : isSaving ? (
              'Guardando...'
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
