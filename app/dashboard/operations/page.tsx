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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Operation, Instrument, Alyc, AppSettings } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function OperationsPage() {
  const { data: operations, isLoading } = useSWR<Operation[]>('/api/operations', fetcher)
  const { data: instruments } = useSWR<Instrument[]>('/api/instruments', fetcher)
  const { data: alycs } = useSWR<Alyc[]>('/api/alycs', fetcher)
  const { data: settings } = useSWR<AppSettings>('/api/settings', fetcher)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    instrument_id: '',
    alyc_id: '',
    operation_type: 'compra' as 'compra' | 'venta',
    quantity: '',
    price: '',
    commission: '0',
    notes: '',
  })

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      instrument_id: '',
      alyc_id: settings?.default_alyc_id?.toString() || '',
      operation_type: 'compra',
      quantity: '',
      price: '',
      commission: '0',
      notes: '',
    })
    setEditingOperation(null)
  }

  const openNewDialog = () => {
    resetForm()
    if (settings?.default_alyc_id) {
      setFormData(prev => ({ ...prev, alyc_id: settings.default_alyc_id!.toString() }))
    }
    setIsDialogOpen(true)
  }

  const openEditDialog = (operation: Operation) => {
    setEditingOperation(operation)
    setFormData({
      date: operation.date,
      instrument_id: operation.instrument_id.toString(),
      alyc_id: operation.alyc_id.toString(),
      operation_type: operation.operation_type,
      quantity: operation.quantity.toString(),
      price: operation.price.toString(),
      commission: operation.commission.toString(),
      notes: operation.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      date: formData.date,
      instrument_id: parseInt(formData.instrument_id),
      alyc_id: parseInt(formData.alyc_id),
      operation_type: formData.operation_type,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      commission: parseFloat(formData.commission) || 0,
      notes: formData.notes || null,
    }

    if (editingOperation) {
      await fetch(`/api/operations/${editingOperation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    mutate('/api/operations')
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta operación?')) return
    
    await fetch(`/api/operations/${id}`, { method: 'DELETE' })
    mutate('/api/operations')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operaciones</h1>
          <p className="text-muted-foreground">Registro de compras y ventas</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Operación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : operations && operations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ALYC</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{formatDate(op.date)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{op.instrument?.ticker}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {op.instrument?.instrument_type?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={op.operation_type === 'compra' ? 'text-primary' : 'text-destructive'}>
                        {op.operation_type === 'compra' ? 'Compra' : 'Venta'}
                      </span>
                    </TableCell>
                    <TableCell>{op.alyc?.name}</TableCell>
                    <TableCell className="text-right">{op.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(op.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(op.quantity * op.price)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(op)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(op.id)}
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
              No hay operaciones registradas
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? 'Editar Operación' : 'Nueva Operación'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="operation_type">Tipo</Label>
                  <Select
                    value={formData.operation_type}
                    onValueChange={(value: 'compra' | 'venta') => 
                      setFormData({ ...formData, operation_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="venta">Venta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="instrument">Instrumento</Label>
                <Select
                  value={formData.instrument_id}
                  onValueChange={(value) => setFormData({ ...formData, instrument_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar instrumento" />
                  </SelectTrigger>
                  <SelectContent>
                    {instruments?.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id.toString()}>
                        {inst.ticker} - {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="alyc">ALYC</Label>
                <Select
                  value={formData.alyc_id}
                  onValueChange={(value) => setFormData({ ...formData, alyc_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ALYC" />
                  </SelectTrigger>
                  <SelectContent>
                    {alycs?.map((alyc) => (
                      <SelectItem key={alyc.id} value={alyc.id.toString()}>
                        {alyc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="commission">Comisión</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas opcionales"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingOperation ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
