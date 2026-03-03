# Tierra Bendita Chocolate & Coffee Shop — Sistema POS

Sistema de menú digital con punto de venta y notificaciones por WhatsApp.

## Tecnologías

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Estado/Datos:** TanStack React Query

## Vistas

| Ruta | Descripción |
|---|---|
| `/` | Landing page pública |
| `/menu` | Menú digital para clientes (vía QR) |
| `/pos` | Panel de administración (requiere rol admin) |
| `/display` | Pantalla para TV/monitor del local |
| `/auth` | Login / Registro |

## Instalación

```sh
git clone <GIT_URL>
cd tierra-bendita-coffee-shop
npm install
npm run dev
```

## Variables de entorno

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_SUPABASE_PROJECT_ID=<project_id>
```

## Base de datos

Las migraciones están en `supabase/migrations/`. Aplícalas con:

```sh
supabase db push
```

## Primer usuario administrador

Después de registrarte en `/auth`, ejecuta en el SQL Editor de Supabase:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<tu-user-id>', 'admin');
```

## Scripts

```sh
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run test     # Tests
npm run lint     # Linter
```