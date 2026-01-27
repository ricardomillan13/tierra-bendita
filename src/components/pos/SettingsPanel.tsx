import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { QRCodeDisplay } from './QRCodeDisplay';

export function SettingsPanel() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [autoWhatsApp, setAutoWhatsApp] = useState(true);
  const [menuUrl, setMenuUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoWhatsApp(settings.whatsapp_auto_notify?.enabled ?? true);
      setMenuUrl(settings.menu_url || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: 'whatsapp_auto_notify',
          value: { enabled: autoWhatsApp },
        }),
        updateSetting.mutateAsync({
          key: 'menu_url',
          value: menuUrl,
        }),
      ]);

      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han aplicado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración del Sistema</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* WhatsApp Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notificaciones WhatsApp</CardTitle>
                <CardDescription>
                  Configura el comportamiento de las notificaciones automáticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-whatsapp">Envío automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar WhatsApp al marcar pedido como listo
                    </p>
                  </div>
                  <Switch
                    id="auto-whatsapp"
                    checked={autoWhatsApp}
                    onCheckedChange={setAutoWhatsApp}
                  />
                </div>
              </CardContent>
            </Card>

            {/* QR Code Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Código QR del Menú</CardTitle>
                <CardDescription>
                  URL del menú para generar el código QR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-url">URL del Menú</Label>
                  <Input
                    id="menu-url"
                    placeholder="https://tu-sitio.com/menu"
                    value={menuUrl}
                    onChange={(e) => setMenuUrl(e.target.value)}
                  />
                </div>
                {menuUrl && (
                  <div className="flex justify-center pt-2">
                    <QRCodeDisplay menuUrl={menuUrl} showButton={false} size={150} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
