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
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Alyc } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AlycsPage() {
  const { data: alycs, isLoading } = useSWR<Alyc[]>('/api/alycs', fetcher)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAlyc, setEditingAlyc] = useState<Alyc | null>(null)
  const [name, setName] = useState('')

  const resetForm = () => {
    setName('')
    setEditingAlyc(null)
  }

  const openNewDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (alyc: Alyc) => {
    setEditingAlyc(alyc)
    setName(alyc.name)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingAlyc) {
      await fetch(`/api/alycs/${editingAlyc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    } else {
      await fetch('/api/alycs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    }

    mutate('/api/alycs')
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta ALYC?')) return
    
    await fetch(`/api/alycs/${id}`, { method: 'DELETE' })
    mutate('/api/alycs')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ALYCs</h1>
          <p className="text-muted-foreground">Agentes de Liquidación y Compensación</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva ALYC
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de ALYCs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : alycs && alycs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alycs.map((alyc) => (
                  <TableRow key={alyc.id}>
                    <TableCell className="font-medium">{alyc.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(alyc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alyc.id)}
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
              No hay ALYCs registradas
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingAlyc ? 'Editar ALYC' : 'Nueva ALYC'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: IOL, Balanz, PPI"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingAlyc ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
