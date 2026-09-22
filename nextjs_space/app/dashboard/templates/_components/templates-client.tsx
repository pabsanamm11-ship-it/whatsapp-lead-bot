'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FileText, Plus, Pencil, Trash2, Eye, Variable } from 'lucide-react'

interface Template {
  id: string; name: string; content: string; createdAt: string; updatedAt: string
}

function previewContent(content: string): string {
  return (content ?? '')
    .replace(/\{\{name\}\}/gi, 'Juan Pérez')
    .replace(/\{\{phone\}\}/gi, '+506 8888-1234')
    .replace(/\{\{notes\}\}/gi, 'Cliente potencial')
}

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [form, setForm] = useState({ name: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const fetchTemplates = useCallback(() => {
    fetch('/api/templates').then(r => r.json()).then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({ name: t.name, content: t.content })
    setShowForm(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', content: '' })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editing ? `/api/templates/${editing.id}` : '/api/templates'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d?.error ?? 'Error'); setSaving(false); return }
      toast.success(editing ? 'Plantilla actualizada' : 'Plantilla creada')
      setShowForm(false)
      fetchTemplates()
    } catch { toast.error('Error al guardar') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      toast.success('Plantilla eliminada')
      fetchTemplates()
    } catch { toast.error('Error') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Plantillas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Mensajes predefinidos con variables dinámicas</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Nueva plantilla</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nueva'} plantilla</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Saludo inicial" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Contenido</Label>
                <Textarea placeholder="Hola {{name}}, le contactamos de..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5} required />
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Variable className="w-3 h-3 mt-0.5" />
                  Variables: <code className="bg-muted px-1 rounded">{`{{name}}`}</code> <code className="bg-muted px-1 rounded">{`{{phone}}`}</code> <code className="bg-muted px-1 rounded">{`{{notes}}`}</code>
                </div>
              </div>
              {form.content && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Vista previa:</p>
                  <p className="text-sm">{previewContent(form.content)}</p>
                </div>
              )}
              <Button type="submit" className="w-full" loading={saving}>Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        <strong>Nota:</strong> Los mensajes iniciados por el negocio requieren plantillas aprobadas por Meta. Configure sus plantillas en la consola de Twilio y úselas aquí como referencia.
      </div>

      {templates.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No hay plantillas. Cree la primera.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((t: Template) => (
            <div key={t.id} className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{t.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button size="icon-sm" variant="ghost" onClick={() => setPreviewId(previewId === t.id ? null : t.id)} title="Vista previa">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(t)} title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(t.id)} title="Eliminar" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {previewId === t.id && (
                <div className="mt-3 bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Vista previa con datos de ejemplo:</p>
                  <p className="text-sm">{previewContent(t.content)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
