# Barbers Plus — piloto en La Santa Barber

## Qué incluye esta entrega
- Web pública de La Santa Barber presentada bajo el producto Barbers Plus.
- PWA instalable: manifiesto, iconos y service worker con precarga tolerante a recursos faltantes.
- Reserva de citas con cálculo de duración, horario y comprobación de disponibilidad por barbero.
- Si el cliente elige “Cualquiera disponible”, se asigna un barbero libre en ese horario; no se bloquea falsamente porque otro profesional esté ocupado.
- Panel local con filtro por estado/fecha, confirmar, completar, cancelar, contacto WhatsApp, registro manual, CSV, respaldo/restauración JSON.
- Administración local de servicios, tarifas, duración y equipo.
- PIN de administración creado en primer uso (mínimo 8 caracteres).

## Cómo probar
1. Descomprime la carpeta y súbela a un hosting estático con HTTPS (por ejemplo, Cloudflare Pages). No abras el HTML con `file://`: el service worker y la instalación PWA requieren HTTP/HTTPS.
2. Abre la URL desde el teléfono y prueba una reserva completa. WhatsApp abre un mensaje preparado; el usuario debe pulsar Enviar.
3. En la URL agrega `#admin` para entrar al panel. En el primer acceso crea un PIN de al menos 8 caracteres.
4. Registra una cita manual, cambia estados, prueba filtros, exporta CSV y genera un respaldo JSON.
5. Instala la PWA desde el menú del navegador.

## Limitación crítica de esta versión
Esta es una **versión piloto local**, no el SaaS multiempresa de producción. Las citas, servicios, equipo y PIN viven en `localStorage` del navegador. No se sincronizan entre dispositivos, no hay autenticación real de servidor, roles, control de acceso por barbería ni protección frente a manipulación local. El PIN no debe considerarse seguridad de producción. No almacenar información sensible.

## Arquitectura SaaS objetivo
- Frontend PWA: Cloudflare Pages (estático, HTTPS).
- Backend: Supabase Auth + PostgreSQL + Edge Functions.
- Multiempresa: `tenants` como barberías; `tenant_members` como relación usuario/negocio/rol.
- Todas las tablas de negocio incluyen `tenant_id`; Row Level Security (RLS) debe verificar membresía y rol en cada operación.
- Restricción transaccional anti doble-reserva: la disponibilidad debe validarse en servidor dentro de transacción; la UI no es autoridad.
- Integraciones futuras: WhatsApp Business Platform con plantillas aprobadas/webhooks; pasarela de suscripción (Mercado Pago u otra) con webhooks verificados.

## Pasos que aún requieren configuración y pruebas externas
1. Crear proyecto Supabase y ejecutar `supabase/schema.sql` con revisión de un desarrollador.
2. Activar Auth, RLS y políticas; crear pruebas de aislamiento entre dos tenants.
3. Configurar variables públicas del frontend (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) en el entorno de despliegue; nunca incluir service-role key en navegador o repositorio.
4. Implementar y desplegar funciones de servidor para reservas, disponibilidad, webhooks y pagos.
5. Configurar dominio, backups, monitoreo, términos, política de datos y contratos de tratamiento.
6. Ejecutar piloto con dos dispositivos y varios usuarios; verificar simultaneidad y restauración de backups.

**No publicar como producto comercial hasta completar esos pasos.**
