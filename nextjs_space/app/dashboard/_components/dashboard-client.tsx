'use client'
import { useEffect, useState, useCallback } from 'react'
import StatCard from '@/components/stat-card'
import TwilioBanner from '@/components/twilio-banner'
import { Users, CheckCircle, XCircle, HelpCircle, Send, TrendingUp, Megaphone, MessageCircle, Clock, ScrollText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatPhoneDisplay } from '@/lib/phone-utils'

interface Stats {
  leads: { total: number; valid: number; invalid: number; unknown: number; messaged: number }
  messages: { today: number; week: number; month: number; allTime: number; successRate: number }
  activeCampaigns: { id: string; name: string; total: number; sent: number; templateName: string }[]
  recentLogs: any[]
}

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cronRunning, setCronRunning] = useState(false)
  const [nextRun, setNextRun] = useState(30)

  const fetchStats = useCallback(() => {
    fetch('/api/dashboard/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Countdown for next auto-run
  useEffect(() => {
    const timer = setInterval(() => setNextRun(prev => (prev <= 0 ? 30 : prev - 1)), 60000)
    return () => clearInterval(timer)
  }, [])

  // Auto-trigger every 30 minutes
  useEffect(() => {
    if (nextRun === 0) {
      handleTriggerCron()
      setNextRun(30)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRun])

  const handleTriggerCron = async () => {
    setCronRunning(true)
    try {
      await fetch('/api/cron/process-campaigns', { method: 'POST' })
      fetchStats()
    } catch { /* noop */ }
    setCronRunning(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const leads = stats?.leads ?? { total: 0, valid: 0, invalid: 0, unknown: 0, messaged: 0 }
  const messages = stats?.messages ?? { today: 0, week: 0, month: 0, allTime: 0, successRate: 0 }
  const activeCampaigns = stats?.activeCampaigns ?? []
  const recentLogs = stats?.recentLogs ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Panel de control</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen de actividad y campañas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Próximo envío: {nextRun} min
          </div>
          <Button size="sm" onClick={handleTriggerCron} loading={cronRunning}>
            <Send className="w-4 h-4 mr-1" /> Disparar ahora
          </Button>
        </div>
      </div>

      <TwilioBanner />

      {/* Lead stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={leads.total} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Válidos (WA)" value={leads.valid} icon={<CheckCircle className="w-5 h-5" />} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Inválidos" value={leads.invalid} icon={<XCircle className="w-5 h-5" />} color="bg-red-100 text-red-500" />
        <StatCard label="Sin validar" value={leads.unknown} icon={<HelpCircle className="w-5 h-5" />} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Message stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Hoy" value={messages.today} icon={<Send className="w-5 h-5" />} />
        <StatCard label="Esta semana" value={messages.week} icon={<Send className="w-5 h-5" />} color="bg-blue-100 text-blue-600" />
        <StatCard label="Este mes" value={messages.month} icon={<Send className="w-5 h-5" />} color="bg-violet-100 text-violet-600" />
        <StatCard label="Total enviados" value={messages.allTime} icon={<MessageCircle className="w-5 h-5" />} color="bg-teal-100 text-teal-600" />
        <StatCard label="Tasa éxito" value={messages.successRate} icon={<TrendingUp className="w-5 h-5" />} color="bg-emerald-100 text-emerald-600" suffix="%" />
      </div>

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Campañas activas
          </h2>
          <div className="space-y-3">
            {activeCampaigns.map((c: any) => {
              const pct = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0
              return (
                <div key={c.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.sent}/{c.total} enviados</p>
                  </div>
                  <div className="w-32"><Progress value={pct} className="h-2" /></div>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent logs */}
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" /> Últimos envíos
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay mensajes enviados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Lead</th>
                  <th className="pb-2 pr-4">Teléfono</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2">Campaña</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 pr-4">{log.lead?.name ?? '-'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{formatPhoneDisplay(log.phone)}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{log.campaign?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
