'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import { ScrollText, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface MessageLog {
  id: string; phone: string; messageContent: string; status: string
  errorCode: string | null; errorMessage: string | null; sentAt: string
  lead: { name: string; phone: string } | null
  campaign: { name: string } | null
}

export default function MessagesClient() {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    fetch(`/api/messages?${params}`)
      .then(r => r.json())
      .then(d => {
        setLogs(d?.logs ?? [])
        setTotal(d?.total ?? 0)
        setPages(d?.pages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" /> Registro de mensajes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Historial completo de envíos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Estado</label>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="h-9 w-36" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="h-9 w-36" />
        </div>
        <div className="text-xs text-muted-foreground self-end pb-2">
          {total} registro(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Sin registros con estos filtros.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-3">Fecha</th>
                <th className="p-3">Lead</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Mensaje</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Error</th>
                <th className="p-3">Campaña</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log: MessageLog) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">{log.lead?.name ?? '-'}</td>
                  <td className="p-3 font-mono text-xs">{formatPhoneDisplay(log.phone)}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate">{log.messageContent}</td>
                  <td className="p-3">
                    <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                      {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-destructive">
                    {log.errorCode ? `${log.errorCode}: ${log.errorMessage ?? ''}` : '-'}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{log.campaign?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
