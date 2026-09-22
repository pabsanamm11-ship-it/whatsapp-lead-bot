'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import TwilioBanner from '@/components/twilio-banner'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import { toast } from 'sonner'
import {
  Users, Plus, Upload, Download, Trash2, ShieldCheck, Search,
  UserPlus, Phone, StickyNote, CheckCircle, XCircle, HelpCircle,
  MessageCircle, AlertTriangle
} from 'lucide-react'

interface Lead {
  id: string; name: string; phone: string; notes: string | null
  whatsappStatus: string; lastContactedAt: string | null; createdAt: string
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  unknown: { label: 'Sin validar', variant: 'secondary', icon: HelpCircle },
  valid: { label: 'Válido', variant: 'default', icon: CheckCircle },
  invalid: { label: 'Inválido', variant: 'destructive', icon: XCircle },
  messaged: { label: 'Contactado', variant: 'default', icon: MessageCircle },
  failed: { label: 'Fallido', variant: 'destructive', icon: AlertTriangle },
}

export default function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', notes: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validProgress, setValidProgress] = useState({ current: 0, total: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchLeads = useCallback(() => {
    fetch('/api/leads').then(r => r.json()).then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = (leads ?? []).filter((l: Lead) =>
    l?.name?.toLowerCase()?.includes(search?.toLowerCase() ?? '') ||
    l?.phone?.includes(search ?? '')
  )

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(l => l.id)))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error'); setAddLoading(false); return }
      toast.success('Lead agregado')
      setAddForm({ name: '', phone: '', notes: '' })
      setShowAdd(false)
      fetchLeads()
    } catch { toast.error('Error al agregar') }
    setAddLoading(false)
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/leads/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error'); return }
      toast.success(`Importados: ${data?.imported ?? 0}, Omitidos: ${data?.skipped ?? 0}`)
      fetchLeads()
    } catch { toast.error('Error al importar') }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleExport = () => {
    const a = document.createElement('a')
    a.href = '/api/leads/export'
    a.download = 'leads.csv'
    a.click()
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`¿Eliminar ${selected.size} lead(s)?`)) return
    try {
      await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      toast.success(`${selected.size} leads eliminados`)
      setSelected(new Set())
      fetchLeads()
    } catch { toast.error('Error al eliminar') }
  }

  const handleValidate = async (ids?: string[]) => {
    const targetIds = ids ?? Array.from(selected)
    if (targetIds.length === 0) { toast.error('Seleccione leads para validar'); return }
    setValidating(true)
    setValidProgress({ current: 0, total: targetIds.length })
    try {
      const res = await fetch('/api/leads/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: targetIds }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error'); setValidating(false); return }
      const results = data?.results ?? []
      const valid = results.filter((r: any) => r.status === 'valid').length
      const invalid = results.filter((r: any) => r.status === 'invalid').length
      toast.success(`Validación completa: ${valid} válidos, ${invalid} inválidos`)
      fetchLeads()
    } catch { toast.error('Error al validar') }
    setValidating(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} contactos registrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> Agregar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar lead</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <div className="relative"><UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Nombre del contacto" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="pl-10" required /></div>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="+506 8888-8888" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} className="pl-10" required /></div>
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <div className="relative"><StickyNote className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input placeholder="Notas adicionales" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} className="pl-10" /></div>
                </div>
                <Button type="submit" className="w-full" loading={addLoading}>Guardar lead</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importar CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
        </div>
      </div>

      <TwilioBanner />

      {/* Validation progress */}
      {validating && (
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <p className="text-sm mb-2">Validando números... {validProgress.current}/{validProgress.total}</p>
          <Progress value={validProgress.total > 0 ? (validProgress.current / validProgress.total) * 100 : 0} className="h-2" />
        </div>
      )}

      {/* Action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-card rounded-lg p-3 shadow-sm">
          <span className="text-sm text-muted-foreground">{selected.size} seleccionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => handleValidate()} loading={validating}>
            <ShieldCheck className="w-4 h-4" /> Validar
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4" /> Eliminar
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 w-10">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              </th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Estado WA</th>
              <th className="p-3">Últ. contacto</th>
              <th className="p-3">Notas</th>
              <th className="p-3 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No hay leads aún. Agregue o importe contactos para comenzar.</td></tr>
            ) : (
              filtered.map((lead: Lead) => {
                const sc = statusConfig[lead.whatsappStatus] ?? statusConfig.unknown
                const Icon = sc.icon
                return (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => {
                        const next = new Set(selected)
                        next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id)
                        setSelected(next)
                      }} />
                    </td>
                    <td className="p-3 font-medium">{lead.name}</td>
                    <td className="p-3 font-mono text-xs">{formatPhoneDisplay(lead.phone)}</td>
                    <td className="p-3">
                      <Badge variant={sc.variant} className="text-xs gap-1">
                        <Icon className="w-3 h-3" /> {sc.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{lead.notes ?? '-'}</td>
                    <td className="p-3">
                      <Button size="xs" variant="ghost" onClick={() => handleValidate([lead.id])} disabled={validating} title="Validar">
                        <ShieldCheck className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
