# LA SANTA BARBER · PWA V7

Aplicación web progresiva estática para La Santa Barber. Está preparada para publicarse en GitHub Pages y abrirse desde celular, tableta o computador.

## Contenido

- `index.html`: página principal y formularios.
- `styles.css`: interfaz adaptable y estilos.
- `app.js`: servicios, barberos, horarios orientativos, WhatsApp y panel local.
- `sw.js`: caché de la aplicación y funcionamiento básico sin conexión.
- `manifest.webmanifest`: identidad e instalación PWA.
- `assets/`: iconos SVG y PNG para instalación.
- `privacidad.html`: borrador informativo de privacidad que debe revisar el responsable del negocio.

## Publicación en GitHub Pages

1. Descomprime este ZIP.
2. Entra en la carpeta donde están `index.html`, `app.js` y `styles.css`.
3. Sube **el contenido de esa carpeta** a la raíz de la rama `main` del repositorio.
4. En GitHub, abre Settings → Pages.
5. Selecciona `Deploy from a branch`, rama `main`, carpeta `/(root)`.
6. Abre la URL HTTPS de GitHub Pages.
7. Si ya habías instalado una versión anterior, cierra la PWA y vuelve a abrirla con conexión para que reciba la actualización.

No subas el ZIP como un único archivo. No necesitas Node.js, Cloudflare ni hosting adicional para esta versión.

## Datos que puedes modificar

Abre `app.js` y busca el objeto `CONFIG` al comienzo del archivo:

- `mainWhatsApp`: número principal en formato internacional, solo dígitos (Colombia: 57 + número).
- `services`: nombres, precios en pesos colombianos y duración estimada en minutos.
- `barbers`: nombres, descripciones y números de WhatsApp de cada barbero.
- `address`, `ownerEmail`, `instagram` y `facebook`: datos de contacto.
- `holidays`: fechas festivas que afectan el horario dominical/festivo. La lista debe actualizarse para cada año.

Después de modificar archivos, vuelve a subirlos a la raíz del repositorio. Cambia el nombre de caché en `sw.js` (variable `CACHE_NAME`) cuando hagas una actualización manual importante para forzar una nueva caché.

## Cómo funciona la agenda en V7

- El cliente elige servicio, barbero, fecha y hora y prepara la solicitud en WhatsApp.
- El cliente debe pulsar **Enviar** en WhatsApp.
- La cita solo queda confirmada cuando el negocio responde.
- El propietario puede abrir el panel local agregando `#admin` al final de la URL. PIN inicial de demostración: `2580`.
- El panel permite registrar manualmente citas recibidas por WhatsApp, cambiar estados y exportar CSV.

## Límites importantes

Esta entrega es una PWA estática. El panel guarda los registros únicamente en el navegador y dispositivo donde se usa. El PIN está en el JavaScript público y **no es autenticación segura**. Los horarios mostrados al cliente son orientativos: no se consultan reservas de otros celulares y no existe bloqueo central de turnos simultáneos.

Para una agenda profesional multiusuario, con disponibilidad en tiempo real, control de concurrencia, acceso privado real, respaldos y panel sincronizado para los tres barberos, la siguiente fase requiere una base de datos y un servicio backend (por ejemplo, Supabase o Firebase) con reglas de seguridad. No se debe presentar el panel local como una agenda central.

La PWA puede abrir su contenido estático sin conexión después de haber sido cargada al menos una vez. WhatsApp, mapas, Instagram y correo requieren conexión a Internet.

## Privacidad

`privacidad.html` es un borrador y no constituye por sí solo una política jurídica completa ni certifica cumplimiento legal. El responsable del establecimiento debe completar y validar los datos, finalidades, plazos, derechos, canales y procedimientos antes de operar.
