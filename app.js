/* La Santa Barber · PWA V7
 * Agenda local de apoyo: no sustituye una base de datos compartida.
 */
'use strict';

const CONFIG = {
  shopName: 'La Santa Barber',
  address: 'Calle 38 No. 44 – 42, Calle Vieja',
  ownerEmail: 'neiker_2532@icloud.com',
  instagram: 'https://www.instagram.com/la_santa.barber_/',
  facebook: '',
  mainWhatsApp: '573001100102',
  adminPinDefault: '2580', // PIN local de demostración; no es autenticación segura.
  holidays: [
    '2026-12-08','2026-12-25','2027-01-01','2027-01-11','2027-03-22','2027-03-25','2027-03-26',
    '2027-05-01','2027-05-10','2027-05-31','2027-06-07','2027-07-05','2027-07-20','2027-08-07',
    '2027-08-16','2027-10-18','2027-11-01','2027-11-15','2027-12-08','2027-12-25'
  ],
  services: [
    {id:'corte',name:'Corte de cabello caballero',price:22000,duration:30,description:'Incluye pulido y arreglo de cejas.'},
    {id:'barba',name:'Corte caballero + barba',price:27000,duration:45,description:'Corte, perfilado y cuidado de barba.'},
    {id:'diseno',name:'Corte especial con diseño',price:30000,duration:45,description:'Diseños personalizados y acabados.'}
  ],
  barbers: [
    {id:'junior',name:'Junior',role:'Fade, estilos y arte en tu cabello.',phone:'573045369661',initials:'J'},
    {id:'gabriel',name:'Gabriel',role:'Cortes artísticos, barba y fade.',phone:'573001100102',initials:'G'},
    {id:'esteban',name:'Esteban',role:'Navaja, barba, bigote y cortes precisos.',phone:'573502885169',initials:'E'}
  ]
};

const $ = id => document.getElementById(id);
const STORE = 'lsb_v7_local_appointments';
const PINKEY = 'lsb_v7_local_pin';
const money = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const dateISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let bookings = loadBookings();
let activeFilter = 'all';
let deferredInstallPrompt = null;
let waitingWorker = null;
let refreshingAfterUpdate = false;

function loadBookings(){
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(value) ? value.filter(x => x && typeof x === 'object' && x.id) : [];
  } catch { return []; }
}
function saveBookings(){
  try { localStorage.setItem(STORE, JSON.stringify(bookings)); return true; }
  catch { showFeedback('No se pudo guardar en este dispositivo. Revisa el espacio disponible del navegador.', true); return false; }
}
function showFeedback(message, error=false){
  const el = $('bookingFeedback');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', error);
}
function wa(phone, message){
  const clean = String(phone || '').replace(/\D/g,'');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
function getService(id){ return CONFIG.services.find(s => s.id === id); }
function getBarber(id){ return CONFIG.barbers.find(b => b.id === id); }
function toMin(time){ const [h,m] = String(time||'0:0').split(':').map(Number); return h*60+m; }
function minToTime(value){ return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`; }
function opening(date){
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || CONFIG.holidays.includes(date) ? {start:600,end:1080} : {start:540,end:1230};
}
function appointmentConflicts(date, time, duration, barberId){
  const start = toMin(time), end = start + duration;
  return bookings.some(b => {
    if (b.date !== date || ['cancelada','completada'].includes(b.status)) return false;
    if (barberId && b.barberId !== barberId) return false;
    const otherStart = toMin(b.time), otherEnd = otherStart + (Number(b.duration)||30);
    return start < otherEnd && end > otherStart;
  });
}
function renderSlots(){
  const date = $('bookingDate').value;
  const barberId = $('barberSelect').value;
  const service = getService($('serviceSelect').value);
  const select = $('bookingTime');
  if (!date || !barberId || !service){
    select.innerHTML = '<option value="">Elige servicio, barbero y fecha</option>';
    select.disabled = true;
    return;
  }
  const hours = opening(date), duration = service.duration, now = new Date();
  const isToday = date === dateISO(now);
  const options = ['<option value="">Selecciona una hora</option>'];
  for(let t=hours.start; t+duration<=hours.end; t+=30){
    if(isToday && t<=now.getHours()*60+now.getMinutes()+15) continue;
    const time = minToTime(t);
    // Para "Cualquiera", basta con que uno de los barberos no tenga cruce local.
    const free = barberId === 'Cualquiera'
      ? CONFIG.barbers.some(b => !appointmentConflicts(date,time,duration,b.id))
      : !appointmentConflicts(date,time,duration,barberId);
    if(free) options.push(`<option value="${time}">${time}</option>`);
  }
  select.innerHTML = options.length > 1 ? options.join('') : '<option value="">Sin horarios orientativos. Consulta por WhatsApp.</option>';
  select.disabled = options.length === 1;
}
function populateContent(){
  $('servicesGrid').innerHTML = CONFIG.services.map((s,i) => `<article class="service-card"><span class="service-number">0${i+1} / SERVICIO</span><h3>${safe(s.name)}</h3><p>${safe(s.description)}</p><strong class="service-price">${money(s.price)}</strong></article>`).join('');
  $('serviceSelect').innerHTML = '<option value="">Selecciona un servicio</option>' + CONFIG.services.map(s => `<option value="${s.id}">${safe(s.name)} · ${money(s.price)}</option>`).join('');
  $('mService').innerHTML = CONFIG.services.map(s => `<option value="${s.id}">${safe(s.name)}</option>`).join('');
  $('barbersGrid').innerHTML = CONFIG.barbers.map(b => `<article class="barber-card"><div class="avatar" aria-hidden="true">${safe(b.initials)}</div><div><h3>${safe(b.name)}</h3><p>${safe(b.role)}<br>Atención personalizada.</p></div></article>`).join('');
  $('barberSelect').innerHTML = '<option value="">Selecciona un barbero</option>' + CONFIG.barbers.map(b => `<option value="${b.id}">${safe(b.name)}</option>`).join('') + '<option value="Cualquiera">Cualquiera disponible</option>';
  $('mBarber').innerHTML = CONFIG.barbers.map(b => `<option value="${b.id}">${safe(b.name)}</option>`).join('');
}
function setupLinks(){
  $('shopTitle').textContent = CONFIG.shopName.toUpperCase();
  $('mainWhatsapp').href = wa(CONFIG.mainWhatsApp,'Hola, quiero información sobre los servicios de La Santa Barber.');
  $('floatingWhatsapp').href = wa(CONFIG.mainWhatsApp,'Hola, quiero agendar una cita en La Santa Barber.');
  $('promoWhatsapp').href = wa(CONFIG.mainWhatsApp,'Hola, quisiera conocer las promociones y eventos de La Santa Barber.');
  $('instagramLink').href = CONFIG.instagram;
  $('facebookLink').hidden = !CONFIG.facebook;
  if(CONFIG.facebook) $('facebookLink').href = CONFIG.facebook;
  $('ownerEmailLink').href = `mailto:${CONFIG.ownerEmail}`;
}
function setupEvents(){
  ['bookingDate','barberSelect','serviceSelect'].forEach(id => $(id).addEventListener('change',renderSlots));
  $('bookingForm').addEventListener('submit',submitBooking);
  $('pinForm').addEventListener('submit',loginAdmin);
  $('closeAdmin').addEventListener('click',() => { location.hash = ''; });
  $('adminLogout').addEventListener('click',logoutAdmin);
  $('adminDate').addEventListener('change',renderAdmin);
  $('exportCsv').addEventListener('click',exportCsv);
  $('changePin').addEventListener('click',changePin);
  $('addManual').addEventListener('click',() => $('manualDialog').showModal());
  $('closeManual').addEventListener('click',() => $('manualDialog').close());
  $('manualForm').addEventListener('submit',saveManual);
  $('clearCancelled').addEventListener('click',clearCancelled);
  document.querySelectorAll('.admin-filters button').forEach(button => button.addEventListener('click',() => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.admin-filters button').forEach(item => item.classList.toggle('active',item === button));
    renderAdmin();
  }));
  $('menuToggle').addEventListener('click',toggleMobileMenu);
  document.querySelectorAll('#primaryNav a').forEach(link => link.addEventListener('click',closeMobileMenu));
  $('installApp').addEventListener('click',installOrExplain);
  $('closeInstall').addEventListener('click',() => $('installDialog').close());
  $('updateApp').addEventListener('click',updateApp);
  window.addEventListener('hashchange',routeHash);
  window.addEventListener('online',updateConnectionStatus);
  window.addEventListener('offline',updateConnectionStatus);
}
function submitBooking(event){
  event.preventDefault();
  const name = $('clientName').value.trim();
  const phone = $('clientPhone').value.trim();
  const service = getService($('serviceSelect').value);
  const barberId = $('barberSelect').value;
  const date = $('bookingDate').value;
  const time = $('bookingTime').value;
  const phoneDigits = phone.replace(/\D/g,'');
  if(!name || !service || !barberId || !date || !time || !$('privacyConsent').checked){
    showFeedback('Completa los campos obligatorios y autoriza el tratamiento de datos.',true); return;
  }
  if(phoneDigits.length < 7 || phoneDigits.length > 15){ showFeedback('Verifica el número de WhatsApp. Debe tener entre 7 y 15 dígitos.',true); $('clientPhone').focus(); return; }
  const barber = barberId === 'Cualquiera' ? null : getBarber(barberId);
  const target = barber?.phone || CONFIG.mainWhatsApp;
  const message = [
    '💈 *SOLICITUD DE CITA — LA SANTA BARBER*','',
    `*Cliente:* ${name}`,`*WhatsApp:* ${phone}`,`*Servicio:* ${service.name}`,`*Valor:* ${money(service.price)}`,
    `*Barbero:* ${barber ? barber.name : 'Cualquiera disponible'}`,`*Fecha:* ${date}`,`*Hora solicitada:* ${time}`,
    `*Dirección/barrio:* ${$('clientAddress').value.trim() || 'No indicada'}`,
    `*Nota:* ${$('clientNote').value.trim() || 'Sin observaciones'}`,'',
    '⚠️ *Solicitud pendiente:* el horario y la cita solo quedan confirmados cuando el barbero responda por WhatsApp.'
  ].join('\n');
  showFeedback('Abriendo WhatsApp. Revisa el mensaje y pulsa ENVIAR para compartir tu solicitud.');
  // No se guarda como reserva en el dispositivo del cliente: solo el negocio debe registrar citas confirmadas.
  const link = document.createElement('a');
  link.href = wa(target,message); link.target = '_blank'; link.rel = 'noopener noreferrer';
  document.body.appendChild(link); link.click(); link.remove();
}
function toggleMobileMenu(){
  const nav = $('primaryNav'), button = $('menuToggle');
  const open = nav.classList.toggle('is-open');
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
}
function closeMobileMenu(){ $('primaryNav').classList.remove('is-open'); $('menuToggle').setAttribute('aria-expanded','false'); $('menuToggle').setAttribute('aria-label','Abrir menú'); }
function routeHash(){
  const admin = location.hash === '#admin';
  $('adminGate').classList.toggle('hidden',!admin);
  if(admin){ $('adminPanel').classList.add('hidden'); $('adminPin').value=''; $('pinError').textContent=''; setTimeout(()=>$('adminPin').focus(),60); }
  else $('adminPanel').classList.add('hidden');
}
function loginAdmin(event){
  event.preventDefault();
  const saved = localStorage.getItem(PINKEY) || CONFIG.adminPinDefault;
  if($('adminPin').value !== saved){ $('pinError').textContent='PIN incorrecto.'; return; }
  $('adminGate').classList.add('hidden'); $('adminPanel').classList.remove('hidden'); renderAdmin(); $('adminPanel').scrollIntoView({behavior:'smooth'});
}
function logoutAdmin(){ $('adminPanel').classList.add('hidden'); location.hash=''; }
function renderAdmin(){
  const date = $('adminDate').value;
  const visible = bookings.filter(b => (activeFilter==='all'||b.status===activeFilter) && (!date||b.date===date)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const today = bookings.filter(b=>b.date===dateISO(new Date()) && b.status!=='cancelada');
  const active = bookings.filter(b=>['pendiente','confirmada'].includes(b.status));
  const revenue = bookings.filter(b=>b.status!=='cancelada' && b.status!=='completada').reduce((sum,b)=>sum+(getService(b.serviceId)?.price||0),0);
  $('adminStats').innerHTML = `<div class="stat"><b>${today.length}</b><span>Citas registradas hoy en este dispositivo</span></div><div class="stat"><b>${active.length}</b><span>Solicitudes y citas activas locales</span></div><div class="stat"><b>${money(revenue)}</b><span>Valor potencial local, no recaudo</span></div>`;
  $('adminBookings').innerHTML = visible.length ? visible.map(b=>{
    const service=getService(b.serviceId), barber=getBarber(b.barberId);
    return `<article class="booking-row"><div><h4>${safe(b.name)}</h4><p>${safe(b.phone)} · ${safe(service?.name||'Servicio')} · ${money(service?.price||0)}</p><p>${safe(b.date)} · ${safe(b.time)} · ${safe(barber?.name||'Por asignar')}</p><span class="status">${safe(b.status)}</span></div><div><p>${safe(b.note||'Sin nota')}</p><p>${safe(b.address||'Sin dirección')}</p></div><div class="row-actions"><button data-action="confirm" data-id="${safe(b.id)}">Confirmar</button><button data-action="complete" data-id="${safe(b.id)}">Completar</button><button data-action="cancel" data-id="${safe(b.id)}">Cancelar</button><button data-action="wa" data-id="${safe(b.id)}">WhatsApp</button></div></article>`;
  }).join('') : '<div class="empty">No hay citas para este filtro en los registros locales de este dispositivo.</div>';
  $('adminBookings').querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',()=>bookingAction(button.dataset.id,button.dataset.action)));
}
function bookingAction(id,action){
  const booking=bookings.find(item=>item.id===id); if(!booking)return;
  if(action==='wa'){
    const barber=getBarber(booking.barberId), phone=barber?.phone||CONFIG.mainWhatsApp;
    window.open(wa(phone,`Hola ${barber?.name||''}, seguimiento de la cita de ${booking.name} para ${booking.date} a las ${booking.time}. Estado: ${booking.status}.`),'_blank','noopener,noreferrer'); return;
  }
  if(action==='cancel'&&!confirm('¿Cancelar esta cita guardada localmente?'))return;
  booking.status=({confirm:'confirmada',complete:'completada',cancel:'cancelada'})[action]||booking.status;
  saveBookings(); renderAdmin(); renderSlots();
}
function saveManual(event){
  event.preventDefault();
  const entry={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),name:$('mName').value.trim(),phone:$('mPhone').value.trim(),serviceId:$('mService').value,barberId:$('mBarber').value,date:$('mDate').value,time:$('mTime').value,duration:getService($('mService').value)?.duration||30,status:'confirmada',createdAt:new Date().toISOString(),note:'Registrada manualmente desde WhatsApp'};
  if(!entry.name||!entry.phone||!entry.date||!entry.time)return;
  const conflict=appointmentConflicts(entry.date,entry.time,entry.duration,entry.barberId);
  if(conflict && !confirm('Ya existe un cruce de horario para este barbero. ¿Deseas guardar de todas formas?'))return;
  bookings.push(entry);
  if(!saveBookings()){bookings.pop();return;}
  $('manualDialog').close(); $('manualForm').reset(); renderAdmin(); renderSlots();
}
function changePin(){
  const old=localStorage.getItem(PINKEY)||CONFIG.adminPinDefault;
  if(prompt('PIN actual de este dispositivo:')!==old)return;
  const next=prompt('Nuevo PIN (mínimo 6 caracteres):');
  if(!next||next.length<6){alert('El PIN debe tener al menos 6 caracteres.');return;}
  localStorage.setItem(PINKEY,next); alert('PIN actualizado en este dispositivo. Atención: este panel local no sustituye autenticación segura en servidor.');
}
function clearCancelled(){
  if(!confirm('¿Eliminar definitivamente las citas canceladas de este dispositivo?'))return;
  const previous=bookings; bookings=bookings.filter(b=>b.status!=='cancelada');
  if(!saveBookings())bookings=previous;
  renderAdmin(); renderSlots();
}
function exportCsv(){
  const rows=[['Cliente','Teléfono','Servicio','Barbero','Fecha','Hora','Estado'],...bookings.map(b=>[b.name,b.phone,getService(b.serviceId)?.name||b.serviceId,getBarber(b.barberId)?.name||b.barberId,b.date,b.time,b.status])];
  const csv=rows.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a'); link.href=url; link.download='la-santa-barber-agenda-local.csv'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function installOrExplain(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null; $('installApp').classList.remove('install-ready');});
  } else $('installDialog').showModal();
}
async function registerPWA(){
  if(!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol))return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    if(registration.waiting){ waitingWorker=registration.waiting; $('updateNotice').classList.remove('hidden'); }
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){ waitingWorker=registration.waiting || worker; $('updateNotice').classList.remove('hidden'); }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(!refreshingAfterUpdate){refreshingAfterUpdate=true;location.reload();} });
  }catch(error){ console.warn('No fue posible registrar la PWA:',error); }
}
function updateApp(){ if(waitingWorker) waitingWorker.postMessage({type:'SKIP_WAITING'}); }
function updateConnectionStatus(){
  const status=$('connectionStatus');
  status.textContent=navigator.onLine?'En línea':'Sin conexión · modo disponible sin conexión';
  status.classList.toggle('offline',!navigator.onLine);
}
function setupInstallPrompt(){
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;$('installApp').classList.add('install-ready');$('installApp').setAttribute('aria-label','Instalar La Santa Barber');});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;$('installApp').classList.remove('install-ready');$('installApp').textContent='Aplicación instalada';});
}
function init(){
  populateContent(); setupLinks(); setupEvents(); setupInstallPrompt();
  const today=dateISO(new Date());
  $('bookingDate').min=today; $('bookingDate').value=today;
  const maxDate=new Date(); maxDate.setDate(maxDate.getDate()+90); $('bookingDate').max=dateISO(maxDate);
  $('adminDate').value=today; $('mDate').min=today; $('mDate').value=today;
  renderSlots(); routeHash(); updateConnectionStatus(); registerPWA();
}
document.addEventListener('DOMContentLoaded',init);
