// ========================================================
// WILMAR PINEDA - PRÉSTAMOS COLOMBIA - CLIENT LOGIC (SPA)
// ========================================================

const API_BASE = '';
let currentMonto = 500000;
let currentCuotas = 1;
let currentPrestamosList = [];
let currentFiltroAdmin = 'todos';
let currentSearchAdmin = '';
let prestamoSeleccionadoParaPago = null;

// Currency Formatter for Colombian Pesos
function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(num);
}

// Format date nicely
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  actualizarSimulador();
  cargarMetricasYPrestamos();
});

// ---------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------
function showSection(sectionId) {
  const sections = ['simulador', 'consulta', 'metodos', 'admin'];
  sections.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    const navBtn = document.getElementById(`nav-${s}`);
    if (el) {
      if (s === sectionId) {
        el.classList.remove('hidden');
        el.classList.add('block');
      } else {
        el.classList.add('hidden');
        el.classList.remove('block');
      }
    }
    if (navBtn) {
      if (s === sectionId) {
        navBtn.className = 'px-5 py-2 rounded-full text-sm font-semibold text-brand-700 bg-white shadow-sm transition-all flex items-center gap-2';
      } else {
        navBtn.className = 'px-5 py-2 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2';
      }
    }
  });

  if (sectionId === 'admin') {
    cargarMetricasYPrestamos();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('hidden');
}

// ---------------------------------------------------------
// SIMULATOR LOGIC (20% FIJO - $50.000 a $3.000.000 COP)
// ---------------------------------------------------------
function actualizarSimulador() {
  const slider = document.getElementById('slider-monto');
  currentMonto = parseInt(slider.value, 10);

  const displayMonto = document.getElementById('display-monto');
  const resumenMonto = document.getElementById('resumen-monto');
  const resumenInteres = document.getElementById('resumen-interes');
  const resumenTotal = document.getElementById('resumen-total');
  const resumenCuotaDetalle = document.getElementById('resumen-cuota-detalle');

  const interes = Math.round(currentMonto * 0.20);
  const total = currentMonto + interes;
  const valorCuota = Math.round(total / currentCuotas);

  displayMonto.textContent = `${formatCOP(currentMonto)} COP`;
  resumenMonto.textContent = `${formatCOP(currentMonto)} COP`;
  resumenInteres.textContent = `+${formatCOP(interes)} COP`;
  resumenTotal.textContent = `${formatCOP(total)} COP`;

  if (currentCuotas === 1) {
    resumenCuotaDetalle.textContent = `1 pago único a 30 días de ${formatCOP(total)}`;
  } else {
    resumenCuotaDetalle.textContent = `${currentCuotas} cuotas mensuales de ${formatCOP(valorCuota)}`;
  }
}

function setMonto(valor) {
  const slider = document.getElementById('slider-monto');
  slider.value = valor;
  actualizarSimulador();
}

function setCuotas(cuotas) {
  currentCuotas = cuotas;
  const displayCuotas = document.getElementById('display-cuotas');
  displayCuotas.textContent = `${cuotas} ${cuotas === 1 ? 'Cuota (30 días)' : `Cuotas (${cuotas * 30} días)`}`;

  document.querySelectorAll('.cuota-btn').forEach(btn => {
    btn.className = 'cuota-btn py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  });

  const activeBtn = document.getElementById(`btn-cuota-${cuotas}`);
  if (activeBtn) {
    activeBtn.className = 'cuota-btn py-2 text-xs font-bold rounded-xl border border-brand-600 bg-brand-50 text-brand-700';
  }

  actualizarSimulador();
}

// ---------------------------------------------------------
// MODAL: SOLICITUD DE PRÉSTAMO
// ---------------------------------------------------------
function abrirModalSolicitud() {
  document.getElementById('modal-solicitud').classList.remove('hidden');
  actualizarResumenModal();
  if (window.lucide) lucide.createIcons();
}

function abrirModalSolicitudConDatos() {
  abrirModalSolicitud();
}

function cerrarModalSolicitud() {
  document.getElementById('modal-solicitud').classList.add('hidden');
}

function actualizarResumenModal() {
  const interes = Math.round(currentMonto * 0.20);
  const total = currentMonto + interes;

  document.getElementById('solicitud-monto').value = currentMonto;
  document.getElementById('solicitud-cuotas').value = currentCuotas;

  document.getElementById('modal-resumen-monto').textContent = `${formatCOP(currentMonto)} COP`;
  document.getElementById('modal-resumen-interes').textContent = `+${formatCOP(interes)}`;
  document.getElementById('modal-resumen-total').textContent = `${formatCOP(total)} COP`;
}

async function enviarSolicitudPrestamo(e) {
  e.preventDefault();
  const form = document.getElementById('form-solicitud');
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  payload.monto_solicitado = currentMonto;
  payload.plazo_cuotas = currentCuotas;

  const btn = document.getElementById('btn-submit-solicitud');
  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Procesando...`;

  try {
    const res = await fetch(`${API_BASE}/api/solicitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al procesar la solicitud');
    }

    cerrarModalSolicitud();
    form.reset();

    // Congratulation alert
    Swal.fire({
      icon: 'success',
      title: '¡Préstamo Aprobado y Registrado!',
      html: `
        <div class="text-left text-sm space-y-2 mt-3">
          <p>Felicidades <strong>${data.prestamo.nombre_completo}</strong>, tu solicitud ha sido aprobada con éxito.</p>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p><strong>Código de Crédito:</strong> <span class="font-mono text-emerald-800 font-bold">${data.prestamo.codigo}</span></p>
            <p><strong>Monto Solicitado:</strong> ${formatCOP(data.prestamo.monto_solicitado)}</p>
            <p><strong>Interés Fijo (20%):</strong> ${formatCOP(data.prestamo.valor_interes)}</p>
            <p><strong>Total a Pagar:</strong> <span class="text-navy-950 font-black">${formatCOP(data.prestamo.total_a_pagar)}</span></p>
            <p><strong>Desembolso programado a:</strong> ${data.prestamo.banco_desembolso} (${data.prestamo.tipo_cuenta})</p>
          </div>
          <p class="text-xs text-slate-500">La información ya fue guardada en la base de datos de deudores y cartera.</p>
        </div>
      `,
      confirmButtonText: 'Ir al Panel de Control',
      showCancelButton: true,
      cancelButtonText: 'Ver Mi Crédito',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#3b82f6'
    }).then((result) => {
      cargarMetricasYPrestamos();
      if (result.isConfirmed) {
        showSection('admin');
      } else {
        document.getElementById('input-consulta-cedula').value = payload.numero_documento;
        showSection('consulta');
        consultarCreditoPorCedula(payload.numero_documento);
      }
    });

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error en la solicitud',
      text: err.message,
      confirmButtonColor: '#ef4444'
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 mr-2"></i> Confirmar y Enviar Solicitud`;
    if (window.lucide) lucide.createIcons();
  }
}

// ---------------------------------------------------------
// CONSULTA DE CLIENTE Y ESTADO DE CUENTA (CÉDULA)
// ---------------------------------------------------------
function probarCedula(cedula) {
  document.getElementById('input-consulta-cedula').value = cedula;
  consultarCreditoPorCedula(cedula);
}

function consultarCredito(e) {
  e.preventDefault();
  const cedula = document.getElementById('input-consulta-cedula').value.trim();
  if (!cedula) return;
  consultarCreditoPorCedula(cedula);
}

async function consultarCreditoPorCedula(cedula) {
  const container = document.getElementById('resultado-consulta');
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="bg-white p-8 rounded-3xl border border-slate-200 text-center">
      <div class="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-slate-600 text-sm">Consultando estado en la base de datos...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/clientes/consulta?documento=${encodeURIComponent(cedula)}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <div class="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
          <div class="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h3 class="text-xl font-bold text-slate-800">No se encontraron créditos activos</h3>
          <p class="text-sm text-slate-600 max-w-md mx-auto">${data.error || 'No tienes créditos registrados con este número de cédula.'}</p>
          <button onclick="setMonto(500000); abrirModalSolicitud();" class="mt-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow">
            ¡Solicita tu primer crédito ahora!
          </button>
        </div>
      `;
      return;
    }

    renderConsultaCliente(data.cliente, data.prestamos);

  } catch (err) {
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 text-sm text-center">
        Error al conectar con la base de datos: ${err.message}
      </div>
    `;
  }
}

function renderConsultaCliente(cliente, prestamos) {
  const container = document.getElementById('resultado-consulta');

  let prestamosHtml = prestamos.map(pr => {
    const debe = pr.saldo_pendiente > 0;
    const esMora = pr.estado === 'EN_MORA';
    const esPazYSalvo = pr.saldo_pendiente === 0 && pr.estado === 'PAGADO';

    let estadoBadge = '';
    let cardBorder = '';

    if (esPazYSalvo) {
      estadoBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1"><i data-lucide="check-check" class="w-3.5 h-3.5"></i> Paz y Salvo (100% Pagado)</span>`;
      cardBorder = 'border-emerald-300 bg-emerald-50/20';
    } else if (esMora) {
      estadoBadge = `<span class="bg-red-100 text-red-800 text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> En Mora (Vencido)</span>`;
      cardBorder = 'border-red-300 bg-red-50/20';
    } else {
      estadoBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Debe Dinero (Al Día)</span>`;
      cardBorder = 'border-amber-300 bg-amber-50/20';
    }

    const porcentajePagado = Math.min(100, Math.round(((pr.total_a_pagar - pr.saldo_pendiente) / pr.total_a_pagar) * 100));

    // Pagos realizados
    let pagosListHtml = '';
    if (pr.pagos && pr.pagos.length > 0) {
      pagosListHtml = `
        <div class="mt-4 pt-4 border-t border-slate-200">
          <h5 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Historial de Pagos Realizados:</h5>
          <div class="space-y-1.5 text-xs">
            ${pr.pagos.map(p => `
              <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span class="font-bold text-slate-800">${formatCOP(p.monto_pagado)}</span>
                  <span class="text-slate-600">vía ${p.metodo_pago}</span>
                  <span class="font-mono text-[10px] text-slate-600 ml-1">(${p.referencia_transaccion})</span>
                </div>
                <span class="text-slate-600">${formatDate(p.fecha_pago)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 ${cardBorder} space-y-5">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">${pr.codigo}</span>
              <span class="text-xs text-slate-600">Fecha: ${formatDate(pr.fecha_solicitud)}</span>
            </div>
            <h4 class="text-lg font-black text-navy-950 mt-1">Crédito Personal ${formatCOP(pr.monto_solicitado)} COP</h4>
          </div>
          <div>${estadoBadge}</div>
        </div>

        <!-- Metric badges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-600 font-semibold block">Monto Inicial</span>
            <span class="text-sm font-bold text-slate-900">${formatCOP(pr.monto_solicitado)}</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-600 font-semibold block">Interés Fijo (20%)</span>
            <span class="text-sm font-bold text-emerald-600">+${formatCOP(pr.valor_interes)}</span>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-600 font-semibold block">Total con Interés</span>
            <span class="text-sm font-bold text-slate-900">${formatCOP(pr.total_a_pagar)}</span>
          </div>
          <div class="p-3 rounded-2xl ${debe ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'} border">
            <span class="text-[11px] font-bold block ${debe ? 'text-amber-700' : 'text-emerald-700'}">
              ${debe ? 'SALDO QUE DEBE' : 'ESTADO FINAL'}
            </span>
            <span class="text-base font-black ${debe ? 'text-amber-800' : 'text-emerald-800'}">
              ${formatCOP(pr.saldo_pendiente)}
            </span>
          </div>
        </div>

        <!-- Barra de Progreso de Pago -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-semibold text-slate-600">
            <span>Progreso de Pago</span>
            <span>${porcentajePagado}% Cancelado (Abonado: ${formatCOP(pr.total_abonado)})</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div class="h-3 rounded-full ${esPazYSalvo ? 'bg-emerald-500' : 'bg-brand-500'} transition-all duration-500" style="width: ${porcentajePagado}%"></div>
          </div>
          <div class="flex justify-between text-[11px] text-slate-600">
            <span>Vence el: <strong class="text-slate-800 font-mono">${formatDate(pr.fecha_vencimiento)}</strong></span>
            <span>${pr.plazo_cuotas} cuota(s) pactada(s)</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex flex-wrap items-center justify-between gap-3">
          ${debe ? `
            <button 
              onclick='abrirModalPagoParaCredito(${JSON.stringify(pr)}, ${JSON.stringify(cliente)})'
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
              <i data-lucide="credit-card" class="w-4 h-4"></i>
              <span>Pagar / Abonar a este Crédito (PSE, Nequi, etc.)</span>
            </button>
          ` : `
            <button 
              onclick='verCertificadoPazYSalvo(${JSON.stringify(pr)}, ${JSON.stringify(cliente)})'
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
              <i data-lucide="award" class="w-4 h-4"></i>
              <span>Descargar Certificado de Paz y Salvo Oficial</span>
            </button>
          `}

          <span class="text-xs text-slate-600 font-medium">
            Desembolsado en: ${cliente.banco_desembolso} (${cliente.tipo_cuenta})
          </span>
        </div>

        ${pagosListHtml}

      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Client Info Bar -->
    <div class="bg-navy-900 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <span class="text-xs font-bold text-brand-400 uppercase tracking-wider">Cliente Registrado</span>
        <h3 class="text-2xl font-black">${cliente.nombre_completo}</h3>
        <p class="text-xs text-slate-300 mt-0.5">
          Cédula: <strong class="font-mono text-white">${cliente.numero_documento}</strong> • Teléfono: ${cliente.telefono} • ${cliente.ciudad || 'Colombia'}
        </p>
      </div>
      <div class="text-left sm:text-right">
        <span class="text-xs text-slate-400 block">Total de Créditos</span>
        <span class="text-xl font-black text-brand-400">${prestamos.length} Crédito(s)</span>
      </div>
    </div>

    <!-- Loan Cards -->
    <div class="space-y-6">
      ${prestamosHtml}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------
// MODAL: PASARELA DE PAGO INTERACTIVA
// ---------------------------------------------------------
function abrirModalPagoParaCredito(prestamo, cliente) {
  prestamoSeleccionadoParaPago = prestamo;
  document.getElementById('modal-pago').classList.remove('hidden');

  document.getElementById('pago-prestamo-id').value = prestamo.id;
  document.getElementById('pago-codigo-prestamo').textContent = prestamo.codigo;
  document.getElementById('pago-cliente-nombre').textContent = cliente ? cliente.nombre_completo : (prestamo.nombre_completo || 'Cliente');
  document.getElementById('pago-saldo-pendiente').textContent = `${formatCOP(prestamo.saldo_pendiente)} COP`;

  // Default payment amount = remaining balance
  const montoInput = document.getElementById('pago-monto');
  montoInput.value = prestamo.saldo_pendiente;
  montoInput.max = prestamo.saldo_pendiente;

  if (window.lucide) lucide.createIcons();
}

function cerrarModalPago() {
  document.getElementById('modal-pago').classList.add('hidden');
  prestamoSeleccionadoParaPago = null;
}

function setMontoPagoCompleto() {
  if (!prestamoSeleccionadoParaPago) return;
  document.getElementById('pago-monto').value = prestamoSeleccionadoParaPago.saldo_pendiente;
}

function setMontoPagoMitad() {
  if (!prestamoSeleccionadoParaPago) return;
  const mitad = Math.round(prestamoSeleccionadoParaPago.saldo_pendiente / 2);
  document.getElementById('pago-monto').value = mitad;
}

function seleccionarMetodo(radio) {
  document.querySelectorAll('.pago-metodo-card').forEach(card => {
    card.classList.remove('border-brand-500', 'bg-brand-50/50');
    card.classList.add('border-slate-200', 'bg-white');
  });

  const parent = radio.closest('.pago-metodo-card');
  if (parent) {
    parent.classList.add('border-brand-500', 'bg-brand-50/50');
    parent.classList.remove('border-slate-200', 'bg-white');
  }

  const detalles = document.getElementById('pago-detalles-metodo');
  const val = radio.value;

  if (val === 'PSE') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Datos para transacción PSE:</p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-slate-600 mb-1">Banco emisor:</label>
          <select class="w-full p-2 rounded-lg border border-slate-300 font-medium">
            <option>Bancolombia</option>
            <option>Davivienda</option>
            <option>Banco de Bogotá</option>
            <option>BBVA Colombia</option>
            <option>Scotiabank Colpatria</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-600 mb-1">Tipo de Cliente:</label>
          <select class="w-full p-2 rounded-lg border border-slate-300 font-medium">
            <option>Persona Natural</option>
            <option>Persona Jurídica</option>
          </select>
        </div>
      </div>
    `;
  } else if (val === 'NEQUI') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Pago inmediato con Nequi:</p>
      <div class="space-y-2">
        <label class="block text-slate-600">Número de celular Nequi para notificación Push:</label>
        <input type="tel" placeholder="3101234567" value="3101234567" class="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold">
        <p class="text-[11px] text-slate-600">Recibirás un mensaje en tu App Nequi para aprobar el débito de forma segura.</p>
      </div>
    `;
  } else if (val === 'DAVIPLATA') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Pago con Daviplata:</p>
      <div class="space-y-2">
        <label class="block text-slate-600">Número de teléfono Daviplata:</label>
        <input type="tel" placeholder="3001234567" value="3001234567" class="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold">
        <p class="text-[11px] text-slate-600">Te enviaremos un código OTP de 6 dígitos por SMS para confirmar el pago.</p>
      </div>
    `;
  } else if (val === 'TARJETA') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Datos de Tarjeta Crédito / Débito:</p>
      <div class="space-y-2">
        <input type="text" placeholder="Número de Tarjeta (4500 0000 0000 0000)" class="w-full p-2 rounded-lg border border-slate-300 font-mono">
        <div class="grid grid-cols-2 gap-2">
          <input type="text" placeholder="MM/AA" class="w-full p-2 rounded-lg border border-slate-300 font-mono">
          <input type="password" placeholder="CVV (3 dígitos)" maxlength="4" class="w-full p-2 rounded-lg border border-slate-300 font-mono">
        </div>
      </div>
    `;
  } else if (val === 'EFECTY') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Pago en Efectivo (Efecty / Baloto / SuRed):</p>
      <div class="p-2.5 bg-yellow-50 rounded-lg border border-yellow-200 text-slate-700">
        <p><strong>Convenio Wilmar Pineda:</strong> <span class="font-mono font-bold">#110945</span></p>
        <p><strong>Referencia de Pago:</strong> <span class="font-mono font-bold">${prestamoSeleccionadoParaPago ? prestamoSeleccionadoParaPago.codigo : 'WP-PAGO'}</span></p>
        <p class="text-[11px] text-slate-600 mt-1">Acércate a cualquier punto físico del país con esta referencia.</p>
      </div>
    `;
  } else if (val === 'TRANSFERENCIA') {
    detalles.innerHTML = `
      <p class="font-bold text-slate-800">Transferencia Bancaria Directa:</p>
      <div class="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-slate-700">
        <p><strong>Cuenta de Ahorros Bancolombia:</strong> <span class="font-mono font-bold">241-009876-44</span></p>
        <p><strong>Titular:</strong> Wilmar Pineda</p>
      </div>
    `;
  }
}

async function procesarPago(e) {
  e.preventDefault();
  const form = document.getElementById('form-pago');
  const formData = new FormData(form);
  const prestamoId = formData.get('prestamo_id');
  const monto = parseFloat(formData.get('monto'));
  const metodo = formData.get('metodo_pago') || 'PSE';

  const btn = document.getElementById('btn-submit-pago');
  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Conectando con pasarela ${metodo}...`;

  try {
    const res = await fetch(`${API_BASE}/api/pagar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prestamo_id: prestamoId,
        monto: monto,
        metodo_pago: metodo,
        referencia: `${metodo}-${Date.now().toString().slice(-6)}`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al procesar pago');

    cerrarModalPago();

    // Check if debt reached 0 (PAZ Y SALVO)
    const saldoFinal = data.pago.saldo_restante;

    if (saldoFinal === 0) {
      // Trigger celebratory confetti
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 }
        });
      }

      Swal.fire({
        icon: 'success',
        title: '¡Crédito Totalmente Liquidado!',
        html: `
          <div class="text-left text-sm space-y-2 mt-3">
            <p class="text-emerald-700 font-bold text-base">¡Felicitaciones! Has quedado a Paz y Salvo.</p>
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p><strong>Monto Pagado:</strong> ${formatCOP(monto)}</p>
              <p><strong>Método de Pago:</strong> ${metodo}</p>
              <p><strong>Referencia:</strong> <span class="font-mono">${data.pago.referencia}</span></p>
              <p><strong>Saldo Restante:</strong> <span class="text-emerald-800 font-black">$ 0 COP</span></p>
            </div>
            <p class="text-xs text-slate-500">Ya no debes dinero en este crédito. Puedes descargar tu Certificado de Paz y Salvo Oficial.</p>
          </div>
        `,
        confirmButtonText: 'Ver Certificado de Paz y Salvo',
        confirmButtonColor: '#059669',
        showCancelButton: true,
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        cargarMetricasYPrestamos();
        if (result.isConfirmed) {
          verCertificadoPazYSalvo(data.prestamo_actualizado, null);
        }
      });

    } else {
      Swal.fire({
        icon: 'success',
        title: '¡Abono Registrado con Éxito!',
        html: `
          <div class="text-left text-sm space-y-2 mt-3">
            <p>Se ha procesado tu abono de <strong>${formatCOP(monto)} COP</strong> a través de <strong>${metodo}</strong>.</p>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p><strong>Referencia de Aprobación:</strong> <span class="font-mono">${data.pago.referencia}</span></p>
              <p><strong>Nuevo Saldo Pendiente:</strong> <span class="text-amber-700 font-black">${formatCOP(saldoFinal)} COP</span></p>
            </div>
            <p class="text-xs text-slate-500">Tu pago fue registrado automáticamente en la base de datos.</p>
          </div>
        `,
        confirmButtonColor: '#059669'
      });
      cargarMetricasYPrestamos();
    }

    // Refresh lookup view if active
    const inputCed = document.getElementById('input-consulta-cedula');
    if (inputCed && inputCed.value) {
      consultarCreditoPorCedula(inputCed.value);
    }

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Fallo en la pasarela de pago',
      text: err.message,
      confirmButtonColor: '#ef4444'
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4 mr-2"></i> Confirmar y Pagar Ahora`;
    if (window.lucide) lucide.createIcons();
  }
}

// ---------------------------------------------------------
// MODAL: CERTIFICADO DE PAZ Y SALVO / RECIBO
// ---------------------------------------------------------
function verCertificadoPazYSalvo(prestamo, cliente) {
  const modal = document.getElementById('modal-recibo');
  modal.classList.remove('hidden');

  const nombre = cliente ? cliente.nombre_completo : (prestamo.nombre_completo || 'Cliente');
  const cedula = cliente ? cliente.numero_documento : (prestamo.numero_documento || 'No registrada');

  document.getElementById('recibo-nombre').textContent = nombre;
  document.getElementById('recibo-cedula').textContent = cedula;
  document.getElementById('recibo-codigo').textContent = prestamo.codigo;
  document.getElementById('recibo-monto-prestado').textContent = formatCOP(prestamo.monto_solicitado);
  document.getElementById('recibo-total-pactado').textContent = `${formatCOP(prestamo.total_a_pagar)} (Incluye 20% de interés)`;
  document.getElementById('recibo-id-ref').textContent = `CERT-${prestamo.codigo}-${Date.now().toString().slice(-4)}`;
  document.getElementById('recibo-fecha').textContent = `Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`;

  const esPazYSalvo = prestamo.saldo_pendiente === 0;
  const titulo = document.getElementById('recibo-tipo-titulo');
  const estadoBox = document.getElementById('recibo-estado-box');
  const watermark = document.getElementById('recibo-watermark');

  if (esPazYSalvo) {
    titulo.className = 'px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800';
    titulo.textContent = 'Certificado de Paz y Salvo';
    watermark.classList.remove('hidden');
    estadoBox.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium';
    estadoBox.innerHTML = `Se hace constar que dicho crédito se encuentra a la fecha <strong>TOTALMENTE CANCELADO Y A PAZ Y SALVO</strong> por todo concepto de capital e intereses del 20%.`;
  } else {
    titulo.className = 'px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800';
    titulo.textContent = 'Estado de Cuenta Parcial';
    watermark.classList.add('hidden');
    estadoBox.className = 'p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium';
    estadoBox.innerHTML = `Crédito activo con abonos parciales. Saldo pendiente actual por cancelar: <strong>${formatCOP(prestamo.saldo_pendiente)} COP</strong>.`;
  }

  if (window.lucide) lucide.createIcons();
}

function cerrarModalRecibo() {
  document.getElementById('modal-recibo').classList.add('hidden');
}

// ---------------------------------------------------------
// PANEL DE ADMINISTRACIÓN Y BASE DE DATOS
// "QUIÉN DEBE DINERO Y QUIÉN NO"
// ---------------------------------------------------------
async function cargarMetricasYPrestamos() {
  try {
    // 1. Fetch Metrics
    const resM = await fetch(`${API_BASE}/api/metricas`);
    const metrics = await resM.json();

    document.getElementById('kpi-total-prestado').textContent = formatCOP(metrics.total_prestado);
    document.getElementById('kpi-intereses').textContent = formatCOP(metrics.total_intereses_generados);
    document.getElementById('kpi-por-cobrar').textContent = formatCOP(metrics.total_por_cobrar);
    document.getElementById('kpi-recaudado').textContent = formatCOP(metrics.total_recaudado);
    document.getElementById('kpi-mora-monto').textContent = formatCOP(metrics.en_mora_monto);

    document.getElementById('kpi-badge-deudores').textContent = metrics.deudores_activos;
    document.getElementById('kpi-deudores-label').textContent = `${metrics.deudores_activos} clientes con deuda activa`;

    document.getElementById('kpi-badge-paz').textContent = metrics.clientes_paz_y_salvo;
    document.getElementById('kpi-paz-label').textContent = `${metrics.clientes_paz_y_salvo} créditos pagados al 100%`;

    document.getElementById('kpi-mora-cantidad').textContent = `${metrics.en_mora_cantidad} préstamos vencidos`;

    // Navbar Badge
    const navBadge = document.getElementById('badge-deudores-nav');
    if (navBadge) {
      navBadge.textContent = `${metrics.deudores_activos} Deben | ${metrics.clientes_paz_y_salvo} Paz`;
    }

    // Filter counts
    document.getElementById('count-todos').textContent = metrics.total_solicitudes;
    document.getElementById('count-deben').textContent = metrics.deudores_activos;
    document.getElementById('count-pagados').textContent = metrics.clientes_paz_y_salvo;
    document.getElementById('count-mora').textContent = metrics.en_mora_cantidad;
    document.getElementById('count-pendientes').textContent = metrics.pendientes_aprobacion;

    // 2. Fetch Loans list with current filter & search
    await refrescarTablaPrestamos();

  } catch (err) {
    console.error('Error cargando métricas:', err);
  }
}

async function refrescarTablaPrestamos() {
  try {
    const url = `${API_BASE}/api/prestamos?filtro=${encodeURIComponent(currentFiltroAdmin)}&search=${encodeURIComponent(currentSearchAdmin)}`;
    const res = await fetch(url);
    const prestamos = await res.json();
    currentPrestamosList = prestamos;
    renderTablaAdmin(prestamos);
  } catch (err) {
    console.error('Error al obtener lista de préstamos:', err);
  }
}

function filtrarPrestamos(filtro) {
  currentFiltroAdmin = filtro;

  const botones = ['todos', 'deben', 'pagados', 'mora', 'pendientes'];
  botones.forEach(b => {
    const btn = document.getElementById(`btn-filtro-${b}`);
    if (btn) {
      if (b === filtro) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 text-white shadow-sm';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200';
      }
    }
  });

  refrescarTablaPrestamos();
}

let searchTimeout = null;
function onSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearchAdmin = document.getElementById('admin-search').value.trim();
    refrescarTablaPrestamos();
  }, 250);
}

function renderTablaAdmin(prestamos) {
  const tbody = document.getElementById('tabla-prestamos-body');
  const info = document.getElementById('tabla-registros-info');

  if (!prestamos || prestamos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-12 text-slate-600">
          <div class="flex flex-col items-center justify-center gap-1">
            <span class="text-2xl">🔍</span>
            <p class="font-bold text-slate-800">No se encontraron préstamos con este filtro</p>
            <p class="text-xs">Prueba cambiando el filtro o la búsqueda</p>
          </div>
        </td>
      </tr>
    `;
    info.textContent = `Mostrando 0 registros`;
    return;
  }

  info.textContent = `Mostrando ${prestamos.length} registros en la base de datos`;

  tbody.innerHTML = prestamos.map(pr => {
    const debe = pr.saldo_pendiente > 0;
    const esPazYSalvo = pr.saldo_pendiente === 0 && pr.estado === 'PAGADO';
    const esMora = pr.estado === 'EN_MORA';

    let estadoBadge = '';
    let rowBg = '';

    if (esPazYSalvo) {
      estadoBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">🟢 PAZ Y SALVO</span>`;
      rowBg = 'hover:bg-emerald-50/30';
    } else if (esMora) {
      estadoBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800">⚠️ EN MORA</span>`;
      rowBg = 'bg-red-50/30 hover:bg-red-50/60';
    } else if (pr.estado === 'PENDIENTE') {
      estadoBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">⏳ POR APROBAR</span>`;
      rowBg = 'hover:bg-blue-50/30';
    } else {
      estadoBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">🔴 DEBE DINERO</span>`;
      rowBg = 'hover:bg-amber-50/30';
    }

    // Phone cleanup for WhatsApp
    const telRaw = (pr.telefono || '').replace(/\D/g, '');
    const telColombia = telRaw.length === 10 ? `57${telRaw}` : telRaw;

    // WhatsApp collection message
    const mensajeCobro = encodeURIComponent(
      `Hola ${pr.nombre_completo}, te saludamos de parte de Wilmar Pineda (Préstamos). Te informamos que tienes un saldo pendiente de ${formatCOP(pr.saldo_pendiente)} correspondiente a tu crédito ${pr.codigo} (Vencimiento: ${formatDate(pr.fecha_vencimiento)}). Puedes realizar tu pago fácilmente por PSE o Nequi en nuestra plataforma. ¡Agradecemos tu puntualidad!`
    );

    return `
      <tr class="transition-colors ${rowBg}">
        
        <!-- Código / Fecha -->
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-slate-900">${pr.codigo}</div>
          <div class="text-[11px] text-slate-600">${formatDate(pr.fecha_solicitud)}</div>
        </td>

        <!-- Cliente / Cédula -->
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${pr.nombre_completo}</div>
          <div class="text-[11px] font-mono text-slate-600">CC ${pr.numero_documento}</div>
        </td>

        <!-- Contacto -->
        <td class="py-3 px-4">
          <div class="text-xs text-slate-800 font-medium">${pr.telefono}</div>
          <div class="text-[11px] text-slate-600">${pr.ciudad || 'Colombia'}</div>
        </td>

        <!-- Monto Original -->
        <td class="py-3 px-4 text-right font-medium text-slate-700">
          ${formatCOP(pr.monto_solicitado)}
        </td>

        <!-- Total c/ 20% -->
        <td class="py-3 px-4 text-right">
          <div class="font-bold text-slate-900">${formatCOP(pr.total_a_pagar)}</div>
          <div class="text-[10px] text-emerald-600 font-semibold">+20% (${formatCOP(pr.valor_interes)})</div>
        </td>

        <!-- Abonado -->
        <td class="py-3 px-4 text-right text-emerald-700 font-bold">
          ${formatCOP(pr.total_abonado)}
        </td>

        <!-- Saldo Deuda -->
        <td class="py-3 px-4 text-right">
          <span class="font-black text-sm ${debe ? 'text-amber-700' : 'text-emerald-700'}">
            ${formatCOP(pr.saldo_pendiente)}
          </span>
        </td>

        <!-- Estado -->
        <td class="py-3 px-4 text-center">
          ${estadoBadge}
        </td>

        <!-- Acciones Rápidas -->
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            
            ${debe ? `
              <!-- Botón WhatsApp Cobro -->
              <a 
                href="https://wa.me/${telColombia}?text=${mensajeCobro}" 
                target="_blank" 
                class="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors" 
                title="Enviar recordatorio de cobro por WhatsApp"
              >
                <i data-lucide="message-circle" class="w-4 h-4"></i>
              </a>

              <!-- Botón Pagar / Registrar Abono -->
              <button 
                onclick='abrirModalPagoParaCredito(${JSON.stringify(pr)}, null)' 
                class="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors" 
                title="Registrar pago / abono"
              >
                <i data-lucide="credit-card" class="w-4 h-4"></i>
              </button>
            ` : `
              <!-- Botón Ver Paz y Salvo -->
              <button 
                onclick='verCertificadoPazYSalvo(${JSON.stringify(pr)}, null)' 
                class="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
                title="Ver Certificado de Paz y Salvo"
              >
                <i data-lucide="award" class="w-4 h-4"></i>
              </button>
            `}

            <!-- Cambiar estado si está pendiente -->
            ${pr.estado === 'PENDIENTE' ? `
              <button 
                onclick="cambiarEstadoPrestamo(${pr.id}, 'APROBADO')" 
                class="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors" 
                title="Aprobar Solicitud"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
            ` : ''}

            <!-- Marcar en Mora toggle si debe dinero y no está en mora -->
            ${debe && !esMora ? `
              <button 
                onclick="cambiarEstadoPrestamo(${pr.id}, 'EN_MORA')" 
                class="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 transition-colors" 
                title="Marcar como En Mora"
              >
                <i data-lucide="alert-octagon" class="w-4 h-4"></i>
              </button>
            ` : ''}

          </div>
        </td>

      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

async function cambiarEstadoPrestamo(id, nuevoEstado) {
  try {
    const res = await fetch(`${API_BASE}/api/prestamos/${id}/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!res.ok) throw new Error('No se pudo actualizar el estado');

    Swal.fire({
      icon: 'success',
      title: 'Estado Actualizado',
      text: `El crédito ha cambiado a estado: ${nuevoEstado}`,
      timer: 1500,
      showConfirmButton: false
    });

    cargarMetricasYPrestamos();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ---------------------------------------------------------
// EXPORTAR BASE DE DATOS A CSV (EXCEL)
// ---------------------------------------------------------
function exportarCSV() {
  if (!currentPrestamosList || currentPrestamosList.length === 0) {
    Swal.fire({ icon: 'warning', text: 'No hay datos para exportar' });
    return;
  }

  const headers = [
    'Codigo', 'Fecha Solicitud', 'Nombre Completo', 'Tipo Documento', 'Documento',
    'Telefono', 'Email', 'Ciudad', 'Banco Desembolso', 'Tipo Cuenta', 'Numero Cuenta',
    'Monto Solicitado', 'Tasa Interes (%)', 'Valor Interes (20%)', 'Total a Pagar',
    'Abonado', 'Saldo Pendiente (Debe)', 'Estado', 'Fecha Vencimiento'
  ];

  const rows = currentPrestamosList.map(pr => [
    `"${pr.codigo}"`,
    `"${pr.fecha_solicitud}"`,
    `"${pr.nombre_completo}"`,
    `"${pr.tipo_documento}"`,
    `"${pr.numero_documento}"`,
    `"${pr.telefono}"`,
    `"${pr.email}"`,
    `"${pr.ciudad || ''}"`,
    `"${pr.banco_desembolso || ''}"`,
    `"${pr.tipo_cuenta || ''}"`,
    `"${pr.numero_cuenta || ''}"`,
    pr.monto_solicitado,
    pr.porcentaje_interes,
    pr.valor_interes,
    pr.total_a_pagar,
    pr.total_abonado,
    pr.saldo_pendiente,
    `"${pr.estado}"`,
    `"${pr.fecha_vencimiento}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `wilmar_pineda_base_deudores_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------------------------------------------------------
// MODAL: NUEVO PRÉSTAMO MANUAL (ADMIN)
// ---------------------------------------------------------
function abrirModalNuevoPrestamoManual() {
  setMonto(1000000);
  abrirModalSolicitud();
}
