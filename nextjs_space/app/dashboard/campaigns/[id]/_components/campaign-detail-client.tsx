'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import { toast } from 'sonner'
import { ArrowLeft, Play, Pause, Square, Send, Clock } from 'lucide-react'
import Link from 'next/link'

interface CampaignDetail {
  id: string; name: string; status: string; dailyLimit: number; startDate: string
  template: { name: string; content: string } | null
  campaignLeads: { id: string; status: string; sentAt: string | null; error: string | null; lead: { id: string; name: string; phone: string } }[]
  _count: { campaignLeads: number; messageLogs: number }
}

export default function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchCampaign = useCallback(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then(d => { setCampaign(d); setLoading(false) }).catch(() => setLoading(false))
  }, [campaignId])

  useEffect(() => { fetchCampaign() }, [fetchCampaign])

  const updateStatus = async (status: string) => {
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success(`Estado cambiado a ${status}`)
      fetchCampaign()
    } catch { toast.error('Error') }
  }

  const triggerNow = async () => {
    setTriggering(true)
    try {
      await fetch('/api/cron/process-campaigns', { method: 'POST' })
      toast.success('Procesamiento ejecutado')
      fetchCampaign()
    } catch { toast.error('Error') }
    setTriggering(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!campaign) return <div className="text-center p-12 text-muted-foreground">Campaña no encontrada</div>

  const cls = campaign.campaignLeads ?? []
  const sent = cls.filter((cl: any) => cl.status === 'sent').length
  const failed = cls.filter((cl: any) => cl.status === 'failed').length
  const pending = cls.filter((cl: any) => cl.status === 'pending').length
  const total = cls.length
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0

  const statusLabels: Record<string, string> = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', completed: 'Completada' }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns"><Button size="icon-sm" variant="ghost"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">Plantilla: {campaign.template?.name ?? '-'}</p>
        </div>
        <Badge variant="outline" className="text-sm">{statusLabels[campaign.status] ?? campaign.status}</Badge>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {campaign.status === 'draft' && <Button size="sm" onClick={() => updateStatus('active')}><Play className="w-4 h-4" /> Iniciar</Button>}
        {campaign.status === 'active' && <Button size="sm" variant="outline" onClick={() => updateStatus('paused')}><Pause className="w-4 h-4" /> Pausar</Button>}
        {campaign.status === 'paused' && <Button size="sm" onClick={() => updateStatus('active')}><Play className="w-4 h-4" /> Reanudar</Button>}
        {(campaign.status === 'active' || campaign.status === 'paused') && <Button size="sm" variant="outline" onClick={() => updateStatus('completed')}><Square className="w-4 h-4" /> Detener</Button>}
        {campaign.status === 'active' && <Button size="sm" variant="secondary" onClick={triggerNow} loading={triggering}><Send className="w-4 h-4" /> Disparar ahora</Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold font-display text-primary">{sent}</p>
          <p className="text-xs text-muted-foreground">Enviados</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold font-display text-destructive">{failed}</p>
          <p className="text-xs text-muted-foreground">Fallidos</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold font-display">{pending}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold font-display">{campaign.dailyLimit}</p>
          <p className="text-xs text-muted-foreground">Límite / día</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso</span>
          <span className="text-sm font-mono text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">{sent} de {total} leads procesados</p>
      </div>

      {/* Leads table */}
      <div className="bg-card rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3">Lead</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Enviado</th>
              <th className="p-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cls.map((cl: any) => (
              <tr key={cl.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{cl.lead?.name ?? '-'}</td>
                <td className="p-3 font-mono text-xs">{formatPhoneDisplay(cl.lead?.phone ?? '')}</td>
                <td className="p-3">
                  <Badge variant={cl.status === 'sent' ? 'default' : cl.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                    {cl.status === 'sent' ? 'Enviado' : cl.status === 'failed' ? 'Fallido' : cl.status === 'skipped' ? 'Omitido' : 'Pendiente'}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {cl.sentAt ? new Date(cl.sentAt).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="p-3 text-xs text-destructive max-w-[200px] truncate">{cl.error ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
