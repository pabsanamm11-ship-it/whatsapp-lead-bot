'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TwilioBanner from '@/components/twilio-banner'
import { toast } from 'sonner'
import { Megaphone, Plus, Play, Pause, Square, Trash2, Send, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string; name: string; templateId: string; dailyLimit: number
  status: string; startDate: string; createdAt: string
  template: { id: string; name: string } | null
  _count: { campaignLeads: number }
}
interface Template { id: string; name: string; content: string }
interface Lead { id: string; name: string; phone: string; whatsappStatus: string }

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  active: { label: 'Activa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'outline' },
  completed: { label: 'Completada', variant: 'secondary' },
}

export default function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', templateId: '', dailyLimit: 100, startDate: '' })
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('valid')

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, tRes, lRes] = await Promise.all([
        fetch('/api/campaigns'), fetch('/api/templates'), fetch('/api/leads')
      ])
      const [cData, tData, lData] = await Promise.all([cRes.json(), tRes.json(), lRes.json()])
      setCampaigns(Array.isArray(cData) ? cData : [])
      setTemplates(Array.isArray(tData) ? tData : [])
      setLeads(Array.isArray(lData) ? lData : [])
    } catch { /* noop */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filteredLeads = (leads ?? []).filter((l: Lead) => {
    if (statusFilter === 'all') return true
    return l.whatsappStatus === statusFilter
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedLeads.size === 0) { toast.error('Seleccione al menos un lead'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, leadIds: Array.from(selectedLeads) }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error'); setSaving(false); return }
      toast.success('Campaña creada')
      setShowForm(false)
      setSelectedLeads(new Set())
      fetchAll()
    } catch { toast.error('Error') }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success(`Campaña ${status === 'active' ? 'activada' : status === 'paused' ? 'pausada' : 'detenida'}`)
      fetchAll()
    } catch { toast.error('Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      toast.success('Campaña eliminada')
      fetchAll()
    } catch { toast.error('Error') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Campañas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Envíos automatizados a sus leads</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4" /> Nueva campaña</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Crear campaña</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Campaña Sept 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Plantilla</Label>
                  <Select value={form.templateId} onValueChange={v => setForm({ ...form, templateId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t: Template) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Límite diario (máx 100)</Label>
                  <Input type="number" min={1} max={100} value={form.dailyLimit} onChange={e => setForm({ ...form, dailyLimit: Math.min(parseInt(e.target.value) || 100, 100) })} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de inicio</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
              </div>

              {/* Lead selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Leads ({selectedLeads.size} seleccionados)</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="valid">Válidos</SelectItem>
                      <SelectItem value="unknown">Sin validar</SelectItem>
                      <SelectItem value="messaged">Contactados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {filteredLeads.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">Sin leads con este filtro</p>
                  ) : (
                    filteredLeads.map((l: Lead) => (
                      <label key={l.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 cursor-pointer text-sm">
                        <Checkbox checked={selectedLeads.has(l.id)} onCheckedChange={() => {
                          const next = new Set(selectedLeads)
                          next.has(l.id) ? next.delete(l.id) : next.add(l.id)
                          setSelectedLeads(next)
                        }} />
                        <span className="flex-1">{l.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{l.phone}</span>
                      </label>
                    ))
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
                }}>Seleccionar todos ({filteredLeads.length})</Button>
              </div>

              <Button type="submit" className="w-full" loading={saving}>Crear campaña</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <TwilioBanner />

      {campaigns.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-sm">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No hay campañas. Cree la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: Campaign) => {
            const st = statusMap[c.status] ?? statusMap.draft
            return (
              <div key={c.id} className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{c.name}</h3>
                      <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Plantilla: {c.template?.name ?? '-'} · {c._count?.campaignLeads ?? 0} leads · Límite: {c.dailyLimit}/día
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.status === 'draft' && (
                      <Button size="xs" variant="outline" onClick={() => updateStatus(c.id, 'active')}>
                        <Play className="w-3 h-3" /> Iniciar
                      </Button>
                    )}
                    {c.status === 'active' && (
                      <Button size="xs" variant="outline" onClick={() => updateStatus(c.id, 'paused')}>
                        <Pause className="w-3 h-3" /> Pausar
                      </Button>
                    )}
                    {c.status === 'paused' && (
                      <Button size="xs" variant="outline" onClick={() => updateStatus(c.id, 'active')}>
                        <Play className="w-3 h-3" /> Reanudar
                      </Button>
                    )}
                    {(c.status === 'active' || c.status === 'paused') && (
                      <Button size="xs" variant="outline" onClick={() => updateStatus(c.id, 'completed')}>
                        <Square className="w-3 h-3" /> Detener
                      </Button>
                    )}
                    <Button size="xs" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Link href={`/dashboard/campaigns/${c.id}`}>
                      <Button size="xs" variant="ghost"><ChevronRight className="w-4 h-4" /></Button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
