import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, MessageCircle, Lock, QrCode, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { QRCodeDisplay } from './QRCodeDisplay';

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [autoWhatsApp, setAutoWhatsApp] = useState(true);
  const [menuUrl, setMenuUrl] = useState('');
  const [closedMessage, setClosedMessage] = useState('Estamos cerrados por el momento, vuelve pronto ☕');
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [autoCloseTime, setAutoCloseTime] = useState('23:00');
  const [autoOpenTime, setAutoOpenTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoWhatsApp(settings.whatsapp_auto_notify?.enabled ?? true);
      setMenuUrl(settings.menu_url || '');
      setClosedMessage(settings.closed_message || 'Estamos cerrados por el momento, vuelve pronto ☕');
      setAutoScheduleEnabled(settings.auto_schedule_enabled ?? false);
      setAutoCloseTime(settings.auto_close_time || '23:00');
      setAutoOpenTime(settings.auto_open_time || '12:00');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'whatsapp_auto_notify', value: { enabled: autoWhatsApp } }),
        updateSetting.mutateAsync({ key: 'menu_url', value: menuUrl }),
        updateSetting.mutateAsync({ key: 'closed_message', value: closedMessage }),
        updateSetting.mutateAsync({ key: 'auto_schedule_enabled', value: autoScheduleEnabled }),
        updateSetting.mutateAsync({ key: 'auto_close_time', value: autoCloseTime }),
        updateSetting.mutateAsync({ key: 'auto_open_time', value: autoOpenTime }),
      ]);
      toast({ title: '✓ Configuración guardada' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configuración
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-base font-semibold text-gray-900">Configuración</DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">Ajustes del sistema Tierra Bendita</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="px-6 overflow-y-auto max-h-[60vh]">

              <SettingRow
                icon={MessageCircle}
                label="WhatsApp automático"
                description="Enviar notificación al cliente cuando el pedido esté listo"
              >
                <Switch checked={autoWhatsApp} onCheckedChange={setAutoWhatsApp} />
              </SettingRow>

              <SettingRow
                icon={Lock}
                label="Mensaje de tienda cerrada"
                description="Texto visible en el menú cuando la tienda esté cerrada"
              >
                <Input
                  value={closedMessage}
                  onChange={e => setClosedMessage(e.target.value)}
                  className="text-sm h-9"
                  placeholder="Estamos cerrados..."
                />
              </SettingRow>

              <SettingRow
                icon={Clock}
                label="Cierre y apertura automática"
                description="Por seguridad: si olvidas dar clic en 'Cerrado', el sistema cierra y reabre la tienda solo en este horario."
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Activar horario automático</span>
                  <Switch checked={autoScheduleEnabled} onCheckedChange={setAutoScheduleEnabled} />
                </div>
                {autoScheduleEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Hora de cierre</label>
                      <Input
                        type="time"
                        value={autoCloseTime}
                        onChange={e => setAutoCloseTime(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Hora de apertura</label>
                      <Input
                        type="time"
                        value={autoOpenTime}
                        onChange={e => setAutoOpenTime(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                )}
              </SettingRow>

              <SettingRow
                icon={QrCode}
                label="URL del menú"
                description="Usada para generar el código QR"
              >
                <Input
                  value={menuUrl}
                  onChange={e => setMenuUrl(e.target.value)}
                  className="text-sm h-9"
                  placeholder="https://tu-sitio.com/menu"
                />
                {menuUrl && (
                  <div className="flex justify-center mt-4">
                    <QRCodeDisplay menuUrl={menuUrl} showButton={false} size={130} />
                  </div>
                )}
              </SettingRow>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button onClick={handleSave} className="w-full h-9 text-sm" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Guardar cambios</>}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}