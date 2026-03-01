'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Instrument, InstrumentType } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function InstrumentsPage() {
  const { data: instruments, isLoading } = useSWR<Instrument[]>('/api/instruments', fetcher)
  const { data: instrumentTypes } = useSWR<InstrumentType[]>('/api/instrument-types', fetcher)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null)
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    instrument_type_id: '',
  })

  const resetForm = () => {
    setFormData({ ticker: '', name: '', instrument_type_id: '' })
    setEditingInstrument(null)
  }

  const openNewDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (instrument: Instrument) => {
    setEditingInstrument(instrument)
    setFormData({
      ticker: instrument.ticker,
      name: instrument.name,
      instrument_type_id: instrument.instrument_type_id.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ticker: formData.ticker.toUpperCase(),
      name: formData.name,
      instrument_type_id: parseInt(formData.instrument_type_id),
    }

    if (editingInstrument) {
      await fetch(`/api/instruments/${editingInstrument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    mutate('/api/instruments')
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este instrumento?')) return
    
    await fetch(`/api/instruments/${id}`, { method: 'DELETE' })
    mutate('/api/instruments')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instrumentos</h1>
          <p className="text-muted-foreground">Gestión de instrumentos financieros</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Instrumento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Instrumentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : instruments && instruments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instruments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.ticker}</TableCell>
                    <TableCell>{inst.name}</TableCell>
                    <TableCell>{inst.instrument_type?.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(inst)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(inst.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay instrumentos registrados
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingInstrument ? 'Editar Instrumento' : 'Nuevo Instrumento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ticker">Ticker</Label>
                <Input
                  id="ticker"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                  placeholder="Ej: GGAL"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Grupo Financiero Galicia"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Instrumento</Label>
                <Select
                  value={formData.instrument_type_id}
                  onValueChange={(value) => setFormData({ ...formData, instrument_type_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {instrumentTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingInstrument ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
