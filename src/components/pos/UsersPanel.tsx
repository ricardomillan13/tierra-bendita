import { useState } from 'react';
import {
  UserPlus, ToggleLeft, ToggleRight, Loader2,
  ShieldCheck, ShoppingBag, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSellers, useCreateSeller, useToggleSellerActive } from '@/hooks/useSellers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRole = 'admin' | 'seller';

// ── Create User Dialog ────────────────────────────────────────────────────────
function CreateUserDialog() {
  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<UserRole>('seller');
  const [loading, setLoading]   = useState(false);

  const createSeller  = useCreateSeller();
  const { toast }     = useToast();
  const queryClient   = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      if (role === 'seller') {
        // Use existing seller creation flow
        await createSeller.mutateAsync({ name: name.trim(), email: email.trim(), password });
      } else {
        // Admin creation — signUp + assign admin role
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: authData.user.id, role: 'admin' as any });
        if (roleError) throw roleError;

        queryClient.invalidateQueries({ queryKey: ['sellers'] });
        toast({ title: `Admin "${name}" creado`, description: 'Ya puede iniciar sesión en el POS' });
      }

      setOpen(false);
      setName(''); setEmail(''); setPassword(''); setRole('seller');
    } catch (err: any) {
      toast({ title: 'Error al crear usuario', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('seller')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                style={{
                  borderColor: role === 'seller' ? '#c9a84c' : 'hsl(var(--border))',
                  background: role === 'seller' ? 'rgba(201,168,76,0.08)' : 'transparent',
                }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color: role === 'seller' ? '#c9a84c' : undefined }} />
                <span className="text-sm font-semibold" style={{ color: role === 'seller' ? '#c9a84c' : undefined }}>
                  Vendedor
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Acceso a la app de ventas
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                style={{
                  borderColor: role === 'admin' ? '#c9a84c' : 'hsl(var(--border))',
                  background: role === 'admin' ? 'rgba(201,168,76,0.08)' : 'transparent',
                }}
              >
                <ShieldCheck className="w-5 h-5" style={{ color: role === 'admin' ? '#c9a84c' : undefined }} />
                <span className="text-sm font-semibold" style={{ color: role === 'admin' ? '#c9a84c' : undefined }}>
                  Admin
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Acceso total al POS
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              placeholder={role === 'seller' ? 'Nombre del vendedor' : 'Nombre del admin'}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="usuario@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Contraseña temporal</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {role === 'seller'
              ? 'El vendedor iniciará sesión en /sales con estas credenciales.'
              : 'El admin tendrá acceso completo al POS, dashboard y configuración.'}
          </p>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main UsersPanel ───────────────────────────────────────────────────────────
export function UsersPanel() {
  const { data: sellers = [], isLoading } = useSellers();
  const toggleActive = useToggleSellerActive();

  // For now sellers list represents field users; admins would need a separate query
  // but we show sellers here since admins are managed separately in Supabase

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Usuarios del sistema</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administra accesos al POS y a la app de ventas
          </p>
        </div>
        <CreateUserDialog />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <Users className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">No hay usuarios aún</p>
          <p className="text-xs">Usa "Nuevo usuario" para crear el primero</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Section: Vendedores */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Vendedores en campo
          </p>
          {sellers.map(seller => (
            <div key={seller.id}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{seller.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Creado {new Date(seller.created_at).toLocaleDateString('es')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={seller.is_active ? 'default' : 'secondary'}>
                  {seller.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                <button
                  onClick={() => toggleActive.mutate({ id: seller.id, is_active: !seller.is_active })}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={seller.is_active ? 'Desactivar' : 'Activar'}
                >
                  {seller.is_active
                    ? <ToggleRight className="w-6 h-6 text-green-500" />
                    : <ToggleLeft className="w-6 h-6" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
