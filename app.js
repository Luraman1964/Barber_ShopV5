const CONFIG = {
  shopName: "La Santa Barber",
  address: "Calle 38 No. 44 – 42, Calle Vieja",
  ownerEmail: "neiker_2532@icloud.com",
  instagram: "https://www.instagram.com/la_santa.barber_/",
  facebook: "",
  // Número de recepción principal: por defecto Gabriel. Modifica este valor si el negocio define otro encargado.
  mainWhatsApp: "573001100102",
  adminPinDefault: "2580",
  // Festivos nacionales de Colombia: actualizar cada año si se requiere calendario anual.
  holidays: ["2026-12-08","2026-12-25","2027-01-01","2027-01-11","2027-03-22","2027-03-25","2027-03-26","2027-05-01","2027-05-10","2027-05-31","2027-06-07","2027-07-05","2027-07-20","2027-08-07","2027-08-16","2027-10-18","2027-11-01","2027-11-15","2027-12-08","2027-12-25"],
  services: [
    {id:"corte",name:"Corte de cabello caballero",price:22000,duration:30,description:"Incluye pulido y arreglo de cejas."},
    {id:"barba",name:"Corte caballero + barba",price:27000,duration:45,description:"Corte, perfilado y cuidado de barba."},
    {id:"diseno",name:"Corte especial con diseño",price:30000,duration:45,description:"Diseños personalizados y acabados."}
  ],
  barbers: [
    {id:"junior",name:"Junior",role:"Fade, estilos y arte en tu cabello.",phone:"573045369661",initials:"J"},
    {id:"gabriel",name:"Gabriel",role:"Cortes artísticos, barba y fade.",phone:"573001100102",initials:"G"},
    {id:"esteban",name:"Esteban",role:"Navaja, barba, bigote y cortes precisos.",phone:"573502885169",initials:"E"}
  ]
};
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const dateISO=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const safe=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORE="lsb_v6_bookings", PINKEY="lsb_v6_pin";
let bookings=loadBookings(), activeFilter="all";
function loadBookings(){try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch{return []}}
function saveBookings(){localStorage.setItem(STORE,JSON.stringify(bookings))}
function init(){
 $("servicesGrid").innerHTML=CONFIG.services.map((s,i)=>`<article class="service-card"><span class="service-number">0${i+1} / SERVICIO</span><h3>${safe(s.name)}</h3><p>${safe(s.description)}</p><strong class="service-price">${money(s.price)}</strong></article>`).join("");
 $("serviceSelect").innerHTML='<option value="">Selecciona un servicio</option>'+CONFIG.services.map(s=>`<option value="${s.id}">${safe(s.name)} · ${money(s.price)}</option>`).join("");
 $("mService").innerHTML=CONFIG.services.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join("");
 $("barbersGrid").innerHTML=CONFIG.barbers.map(b=>`<article class="barber-card"><div class="avatar">${b.initials}</div><div><h3>${safe(b.name)}</h3><p>${safe(b.role)}<br>Más de 5 años de experiencia.</p></div></article>`).join("");
 $("barberSelect").innerHTML='<option value="">Selecciona un barbero</option>'+CONFIG.barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')+'<option value="Cualquiera">Cualquiera disponible</option>';
 $("mBarber").innerHTML=CONFIG.barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 $("shopTitle").textContent=CONFIG.shopName;
 $("mainWhatsapp").href=wa(CONFIG.mainWhatsApp,"Hola, quiero información sobre los servicios de La Santa Barber.");
 $("floatingWhatsapp").href=wa(CONFIG.mainWhatsApp,"Hola, quiero agendar una cita en La Santa Barber.");
 $("promoWhatsapp").href=wa(CONFIG.mainWhatsApp,"Hola, quisiera conocer las promociones y eventos de La Santa Barber.");
 if(CONFIG.facebook) $("facebookLink").href=CONFIG.facebook; else $("facebookLink").hidden=true;
 const today=dateISO(new Date()); $("bookingDate").min=today; $("bookingDate").value=today;
 $("adminDate").value=today; $("mDate").min=today;
 $("bookingDate").addEventListener("change",renderSlots);
 $("barberSelect").addEventListener("change",renderSlots);
 $("serviceSelect").addEventListener("change",renderSlots);
 $("bookingForm").addEventListener("submit",submitBooking);
 $("pinForm").addEventListener("submit",loginAdmin);
 $("closeAdmin").addEventListener("click",()=>location.hash="");
 $("adminLogout").addEventListener("click",logoutAdmin);
 $("adminDate").addEventListener("change",renderAdmin);
 $("exportCsv").addEventListener("click",exportCsv);
 $("changePin").addEventListener("click",changePin);
 $("addManual").addEventListener("click",()=>$("manualDialog").showModal());
 $("manualForm").addEventListener("submit",saveManual);
 $("clearCancelled").addEventListener("click",clearCancelled);
 document.querySelectorAll(".admin-filters button").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll(".admin-filters button").forEach(x=>x.classList.toggle("active",x===b));renderAdmin()}));
 window.addEventListener("hashchange",routeHash); routeHash(); renderSlots();
 if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
function wa(phone,msg){return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`}
function getService(id){return CONFIG.services.find(s=>s.id===id)}
function getBarber(id){return CONFIG.barbers.find(b=>b.id===id)}
function opening(date){const d=new Date(date+"T12:00:00").getDay();return d===0||CONFIG.holidays.includes(date)?{start:10*60,end:18*60}:{start:9*60,end:20*60+30}}
function durationFor(){return getService($("serviceSelect").value)?.duration||30}
function renderSlots(){
 const date=$("bookingDate").value, barber=$("barberSelect").value, service=$("serviceSelect").value, sel=$("bookingTime");
 if(!date){sel.innerHTML='<option value="">Selecciona una fecha</option>';sel.disabled=true;return}
 const hours=opening(date), duration=service?durationFor():30, busy=bookings.filter(b=>b.date===date&&b.status!=="cancelada"&&b.status!=="completada"&&(barber==="Cualquiera"||!barber||b.barberId===barber)).map(b=>({start:toMin(b.time),end:toMin(b.time)+(b.duration||30)}));
 const now=new Date(), isToday=date===dateISO(now), opts=['<option value="">Selecciona una hora</option>'];
 for(let t=hours.start;t+duration<=hours.end;t+=30){
  if(isToday&&t<=now.getHours()*60+now.getMinutes()+15)continue;
  const conflict=busy.some(x=>t<x.end&&t+duration>x.start);
  if(!conflict)opts.push(`<option value="${minToTime(t)}">${minToTime(t)}</option>`);
 }
 sel.innerHTML=opts.join("");sel.disabled=opts.length===1;
 if(opts.length===1)sel.innerHTML='<option value="">No hay horarios locales registrados; consulta por WhatsApp</option>';
}
function toMin(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function minToTime(t){return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}
function submitBooking(e){
 e.preventDefault();
 const name=$("clientName").value.trim(),phone=$("clientPhone").value.trim(),service=getService($("serviceSelect").value),barberId=$("barberSelect").value,date=$("bookingDate").value,time=$("bookingTime").value;
 if(!name||!phone||!service||!barberId||!date||!time||!$("privacyConsent").checked){$("bookingFeedback").textContent="Completa los campos obligatorios y autoriza el tratamiento de datos.";return}
 const barber=barberId==="Cualquiera"?null:getBarber(barberId);
 const target=barber?.phone||CONFIG.mainWhatsApp;
 const message=[
 "💈 *SOLICITUD DE CITA — LA SANTA BARBER*","",
 `*Cliente:* ${name}`,`*WhatsApp:* ${phone}`,`*Servicio:* ${service.name}`,`*Valor:* ${money(service.price)}`,
 `*Barbero:* ${barber?barber.name:"Cualquiera disponible"}`,`*Fecha:* ${date}`,`*Hora solicitada:* ${time}`,
 `*Dirección/barrio:* ${$("clientAddress").value.trim()||"No indicada"}`,`*Nota:* ${$("clientNote").value.trim()||"Sin observaciones"}`,"",
 "⚠️ Solicitud pendiente de confirmación por el barbero."
 ].join("\n");
 // Se guarda localmente solo como respaldo en el dispositivo del cliente; la agenda oficial debe confirmarse en WhatsApp.
 const local={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,phone,serviceId:service.id,barberId:barber?.id||"cualquiera",date,time,duration:service.duration,status:"pendiente",createdAt:new Date().toISOString(),address:$("clientAddress").value.trim(),note:$("clientNote").value.trim()};
 try{bookings.push(local);saveBookings()}catch{}
 $("bookingFeedback").textContent="Abriendo WhatsApp. Recuerda pulsar ENVIAR para remitir tu solicitud.";
 window.open(wa(target,message),"_blank","noopener");
}
function routeHash(){
 const admin=location.hash==="#admin";
 $("adminGate").classList.toggle("hidden",!admin);
 if(admin){$("adminPanel").classList.add("hidden");$("adminPin").value="";$("pinError").textContent="";setTimeout(()=>$("adminPin").focus(),50)}
 else $("adminPanel").classList.add("hidden");
}
function loginAdmin(e){e.preventDefault();const saved=localStorage.getItem(PINKEY)||CONFIG.adminPinDefault;if($("adminPin").value!==saved){$("pinError").textContent="PIN incorrecto.";return}
 $("adminGate").classList.add("hidden");$("adminPanel").classList.remove("hidden");renderAdmin();$("adminPanel").scrollIntoView({behavior:"smooth"});
}
function logoutAdmin(){$("adminPanel").classList.add("hidden");location.hash=""}
function renderAdmin(){
 const date=$("adminDate").value;
 const visible=bookings.filter(b=>(activeFilter==="all"||b.status===activeFilter)&&(!date||b.date===date)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const today=bookings.filter(b=>b.date===dateISO(new Date())&&b.status!=="cancelada");
 $("adminStats").innerHTML=`<div class="stat"><b>${today.length}</b><span>Citas registradas hoy en este dispositivo</span></div><div class="stat"><b>${bookings.filter(b=>b.status==="pendiente"||b.status==="confirmada").length}</b><span>Activas locales</span></div><div class="stat"><b>${money(bookings.filter(b=>b.status!=="cancelada").reduce((n,b)=>n+(getService(b.serviceId)?.price||0),0))}</b><span>Valor estimado local</span></div>`;
 $("adminBookings").innerHTML=visible.length?visible.map(b=>{const s=getService(b.serviceId),bar=getBarber(b.barberId);return `<article class="booking-row"><div><h4>${safe(b.name)}</h4><p>${safe(b.phone)} · ${safe(s?.name||"Servicio")} · ${money(s?.price||0)}</p><p>${safe(b.date)} · ${safe(b.time)} · ${safe(bar?.name||"Por asignar")}</p><span class="status">${safe(b.status)}</span></div><div><p>${safe(b.note||"Sin nota")}</p><p>${safe(b.address||"Sin dirección")}</p></div><div class="row-actions"><button data-action="confirm" data-id="${b.id}">Confirmar</button><button data-action="complete" data-id="${b.id}">Completar</button><button data-action="cancel" data-id="${b.id}">Cancelar</button><button data-action="wa" data-id="${b.id}">WhatsApp</button></div></article>`}).join(""):'<div class="empty">No hay citas para este filtro en el almacenamiento local de este dispositivo.</div>';
 $("adminBookings").querySelectorAll("button[data-action]").forEach(btn=>btn.addEventListener("click",()=>bookingAction(btn.dataset.id,btn.dataset.action)));
}
function bookingAction(id,action){const b=bookings.find(x=>x.id===id);if(!b)return;if(action==="wa"){const bar=getBarber(b.barberId),phone=bar?.phone||CONFIG.mainWhatsApp;window.open(wa(phone,`Hola ${bar?.name||""}, seguimiento de la cita de ${b.name} para ${b.date} a las ${b.time}. Estado: ${b.status}.`),"_blank","noopener");return}
 if(action==="cancel"&&!confirm("¿Cancelar esta cita local?"))return;b.status=({confirm:"confirmada",complete:"completada",cancel:"cancelada"})[action]||b.status;saveBookings();renderAdmin()}
function saveManual(e){e.preventDefault();const entry={id:String(Date.now()),name:$("mName").value.trim(),phone:$("mPhone").value.trim(),serviceId:$("mService").value,barberId:$("mBarber").value,date:$("mDate").value,time:$("mTime").value,duration:getService($("mService").value)?.duration||30,status:"confirmada",createdAt:new Date().toISOString(),note:"Registrada manualmente desde WhatsApp"};if(!entry.name||!entry.phone||!entry.date||!entry.time)return;bookings.push(entry);saveBookings();$("manualDialog").close();$("manualForm").reset();renderAdmin()}
function changePin(){const old=localStorage.getItem(PINKEY)||CONFIG.adminPinDefault;if(prompt("PIN actual:")!==old)return;const next=prompt("Nuevo PIN (mínimo 6 caracteres):");if(!next||next.length<6){alert("El PIN debe tener al menos 6 caracteres.");return}localStorage.setItem(PINKEY,next);alert("PIN actualizado en este dispositivo. Recuerda: esto no sustituye autenticación segura en servidor.")}
function clearCancelled(){if(!confirm("¿Eliminar definitivamente las citas canceladas guardadas en este dispositivo?"))return;bookings=bookings.filter(b=>b.status!=="cancelada");saveBookings();renderAdmin()}
function exportCsv(){const rows=[["Cliente","Teléfono","Servicio","Barbero","Fecha","Hora","Estado"],...bookings.map(b=>[b.name,b.phone,getService(b.serviceId)?.name||b.serviceId,getBarber(b.barberId)?.name||b.barberId,b.date,b.time,b.status])];const csv=rows.map(r=>r.map(x=>`"${String(x??"").replace(/"/g,'""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="la-santa-barber-citas-locales.csv";a.click();URL.revokeObjectURL(a.href)}
document.addEventListener("DOMContentLoaded",init);
