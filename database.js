const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, 'data', 'prestamos.db');

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initDb() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      tipo_documento TEXT DEFAULT 'CC',
      numero_documento TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT NOT NULL,
      ciudad TEXT,
      direccion TEXT,
      ingresos_mensuales REAL DEFAULT 0,
      ocupacion TEXT,
      banco_desembolso TEXT,
      tipo_cuenta TEXT,
      numero_cuenta TEXT,
      fecha_registro TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
      monto_solicitado REAL NOT NULL,
      porcentaje_interes REAL NOT NULL DEFAULT 20.0,
      valor_interes REAL NOT NULL,
      total_a_pagar REAL NOT NULL,
      saldo_pendiente REAL NOT NULL,
      plazo_cuotas INTEGER NOT NULL DEFAULT 1,
      valor_cuota REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'APROBADO',
      fecha_solicitud TEXT NOT NULL,
      fecha_aprobacion TEXT,
      fecha_vencimiento TEXT NOT NULL,
      observaciones TEXT
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prestamo_id INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE RESTRICT,
      monto_pagado REAL NOT NULL,
      metodo_pago TEXT NOT NULL,
      referencia_transaccion TEXT UNIQUE NOT NULL,
      estado TEXT NOT NULL DEFAULT 'APROBADO',
      fecha_pago TEXT NOT NULL,
      comprobante TEXT,
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );
  `);

  // Check if we need to seed demo data
  const countRow = db.prepare('SELECT COUNT(*) as count FROM prestamos').get();
  if (countRow.count === 0) {
    seedDemoData();
  }
}

function seedDemoData() {
  const insertCliente = db.prepare(`
    INSERT INTO clientes (
      nombre_completo, tipo_documento, numero_documento, telefono, email,
      ciudad, direccion, ingresos_mensuales, ocupacion, banco_desembolso,
      tipo_cuenta, numero_cuenta, fecha_registro
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPrestamo = db.prepare(`
    INSERT INTO prestamos (
      codigo, cliente_id, monto_solicitado, porcentaje_interes, valor_interes,
      total_a_pagar, saldo_pendiente, plazo_cuotas, valor_cuota, estado,
      fecha_solicitud, fecha_aprobacion, fecha_vencimiento, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPago = db.prepare(`
    INSERT INTO pagos (
      prestamo_id, monto_pagado, metodo_pago, referencia_transaccion,
      estado, fecha_pago, comprobante, notas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];

  const dateSubDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return formatDate(d);
  };

  const dateAddDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  // 1. Cliente que DEBE DINERO (Al día)
  insertCliente.run(
    'Carlos Andrés Restrepo', 'CC', '1020304050', '3104567890', 'carlos.restrepo@gmail.com',
    'Medellín', 'Calle 50 # 45-20', 2500000, 'Empleado Comercial', 'Bancolombia',
    'Ahorros', '241-987654-12', dateSubDays(15)
  );
  // Prestó 1.000.000 + 20% (200.000) = 1.200.000. Debe 1.200.000
  insertPrestamo.run(
    'SOLV-1001', 1, 1000000, 20.0, 200000,
    1200000, 1200000, 2, 600000, 'APROBADO',
    dateSubDays(15), dateSubDays(15), dateAddDays(15), 'Préstamo personal para emprendimiento'
  );

  // 2. Cliente que DEBE DINERO (En MORA - Fecha vencida)
  insertCliente.run(
    'Diana Marcela Gómez', 'CC', '1035987654', '3157891234', 'diana.gomez@hotmail.com',
    'Bogotá', 'Carrera 15 # 85-30', 1800000, 'Independiente', 'Nequi',
    'Billetera Digital', '3157891234', dateSubDays(40)
  );
  // Prestó 300.000 + 20% (60.000) = 360.000. Debe 360.000. Venció hace 5 días.
  insertPrestamo.run(
    'SOLV-1002', 2, 300000, 20.0, 60000,
    360000, 360000, 1, 360000, 'EN_MORA',
    dateSubDays(40), dateSubDays(40), dateSubDays(5), 'Recordatorio enviado por WhatsApp'
  );

  // 3. Cliente que YA NO DEBE (PAZ Y SALVO - PAGADO 100%)
  insertCliente.run(
    'Felipe Santamaría', 'CC', '1098765432', '3001234567', 'felipe.santa@yahoo.com',
    'Cali', 'Avenida 6N # 22-10', 3200000, 'Ingeniero de Sistemas', 'Daviplata',
    'Billetera Digital', '3001234567', dateSubDays(60)
  );
  // Prestó 500.000 + 20% (100.000) = 600.000. Pagó 600.000. Saldo 0.
  insertPrestamo.run(
    'SOLV-1003', 3, 500000, 20.0, 100000,
    600000, 0, 1, 600000, 'PAGADO',
    dateSubDays(60), dateSubDays(60), dateSubDays(30), 'Pagado en su totalidad. Certificado de Paz y Salvo emitido.'
  );
  insertPago.run(
    3, 600000, 'PSE', 'PSE-789456123',
    'APROBADO', dateSubDays(31), 'Comprobante Banco Davivienda', 'Pago total del crédito anticipado'
  );

  // 4. Cliente que HIZO ABONO PARCIAL (Prestó 2.000.000, debe todavía una parte)
  insertCliente.run(
    'Laura Camila Ortiz', 'CC', '1014567890', '3209876543', 'laura.ortiz@gmail.com',
    'Barranquilla', 'Calle 72 # 53-40', 2100000, 'Contadora', 'Bancolombia',
    'Ahorros', '543-123456-99', dateSubDays(25)
  );
  // Prestó 2.000.000 + 20% (400.000) = 2.400.000. Abonó 1.200.000. Debe 1.200.000.
  insertPrestamo.run(
    'SOLV-1004', 4, 2000000, 20.0, 400000,
    2400000, 1200000, 2, 1200000, 'APROBADO',
    dateSubDays(25), dateSubDays(25), dateAddDays(20), 'Primera cuota pagada al día por Nequi'
  );
  insertPago.run(
    4, 1200000, 'NEQUI', 'NEQ-554433221',
    'APROBADO', dateSubDays(5), 'Comprobante Nequi QR', 'Abono Cuota 1 de 2'
  );

  // 5. Cliente con SOLICITUD PENDIENTE (Monto mínimo $50.000)
  insertCliente.run(
    'Mateo Valencia', 'CC', '1088776655', '3187654321', 'mateo.valencia@outlook.com',
    'Bucaramanga', 'Carrera 27 # 36-15', 1300000, 'Estudiante / Freelance', 'Nequi',
    'Billetera Digital', '3187654321', dateSubDays(1)
  );
  // Prestó 50.000 + 20% (10.000) = 60.000.
  insertPrestamo.run(
    'SOLV-1005', 5, 50000, 20.0, 10000,
    60000, 60000, 1, 60000, 'PENDIENTE',
    dateSubDays(1), null, dateAddDays(30), 'Pendiente de verificación de cuenta y desembolso'
  );
}

// -------------------------------------------------------------
// RECÁLCULO AUTOMÁTICO DE INTERESES (20% CADA 4 SEMANAS)
// Si un préstamo tiene más de 4 semanas sin pagarse,
// se cobra un 20% adicional sobre el monto original
// por cada periodo de 4 semanas transcurrido.
// -------------------------------------------------------------

function recalcularInteresesVencidos() {
  const hoy = new Date();
  const prestamosActivos = db.prepare(`
    SELECT * FROM prestamos
    WHERE saldo_pendiente > 0
    AND estado IN ('APROBADO', 'EN_MORA')
  `).all();

  for (const pr of prestamosActivos) {
    const fechaSolicitud = new Date(pr.fecha_solicitud);
    const diasTranscurridos = Math.floor((hoy - fechaSolicitud) / (1000 * 60 * 60 * 24));
    const periodosVencidos = Math.floor(diasTranscurridos / 28); // Cada 4 semanas = 28 días

    // Mínimo 1 periodo (el interés inicial del 20%)
    const periodosTotal = Math.max(1, periodosVencidos);

    // Interés acumulado = 20% del monto original × número de periodos de 4 semanas
    const nuevoValorInteres = Math.round(pr.monto_solicitado * 0.20 * periodosTotal);
    const nuevoTotal = pr.monto_solicitado + nuevoValorInteres;

    // Calcular cuánto se ha pagado (abonado) hasta ahora
    const totalAbonado = pr.total_a_pagar - pr.saldo_pendiente;

    // Nuevo saldo = nuevo total - lo que ya pagó
    const nuevoSaldo = Math.max(0, nuevoTotal - totalAbonado);

    // Determinar estado de mora
    const nuevoEstado = periodosVencidos > 1 ? 'EN_MORA' : pr.estado;

    // Solo actualizar si cambió
    if (nuevoValorInteres !== pr.valor_interes || nuevoTotal !== pr.total_a_pagar) {
      db.prepare(`
        UPDATE prestamos SET
          valor_interes = ?,
          total_a_pagar = ?,
          saldo_pendiente = ?,
          estado = ?,
          valor_cuota = ?,
          observaciones = ?
        WHERE id = ?
      `).run(
        nuevoValorInteres,
        nuevoTotal,
        nuevoSaldo,
        nuevoEstado,
        Math.round(nuevoTotal / pr.plazo_cuotas),
        `Interés recalculado: ${periodosTotal} periodo(s) de 4 semanas × 20% = ${periodosTotal * 20}% acumulado`,
        pr.id
      );
    }
  }
}

// -------------------------------------------------------------
// METRICS & QUERIES
// -------------------------------------------------------------

function getMetrics() {
  // Recalcular intereses antes de obtener métricas
  recalcularInteresesVencidos();

  const query = `
    SELECT
      COUNT(*) as total_solicitudes,
      COALESCE(SUM(monto_solicitado), 0) as total_prestado,
      COALESCE(SUM(valor_interes), 0) as total_intereses_generados,
      COALESCE(SUM(total_a_pagar), 0) as total_cartera,
      COALESCE(SUM(saldo_pendiente), 0) as total_por_cobrar,
      COALESCE(SUM(total_a_pagar - saldo_pendiente), 0) as total_recaudado,
      COUNT(CASE WHEN saldo_pendiente > 0 AND estado IN ('APROBADO', 'EN_MORA', 'PENDIENTE') THEN 1 END) as deudores_activos,
      COUNT(CASE WHEN saldo_pendiente = 0 AND estado = 'PAGADO' THEN 1 END) as clientes_paz_y_salvo,
      COUNT(CASE WHEN estado = 'EN_MORA' THEN 1 END) as en_mora_cantidad,
      COALESCE(SUM(CASE WHEN estado = 'EN_MORA' THEN saldo_pendiente ELSE 0 END), 0) as en_mora_monto,
      COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as pendientes_aprobacion
    FROM prestamos
  `;
  return db.prepare(query).get();
}

function getAllLoans(filter = 'todos', search = '') {
  // Recalcular intereses antes de listar
  recalcularInteresesVencidos();

  let whereClauses = [];
  let params = [];

  if (filter === 'deben') {
    whereClauses.push("p.saldo_pendiente > 0 AND p.estado IN ('APROBADO', 'EN_MORA', 'PENDIENTE')");
  } else if (filter === 'pagados') {
    whereClauses.push("p.saldo_pendiente = 0 AND p.estado = 'PAGADO'");
  } else if (filter === 'mora') {
    whereClauses.push("p.estado = 'EN_MORA'");
  } else if (filter === 'pendientes') {
    whereClauses.push("p.estado = 'PENDIENTE'");
  }

  if (search && search.trim() !== '') {
    const s = `%${search.trim()}%`;
    whereClauses.push("(c.nombre_completo LIKE ? OR c.numero_documento LIKE ? OR p.codigo LIKE ? OR c.telefono LIKE ?)");
    params.push(s, s, s, s);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT
      p.id,
      p.codigo,
      p.monto_solicitado,
      p.porcentaje_interes,
      p.valor_interes,
      p.total_a_pagar,
      p.saldo_pendiente,
      (p.total_a_pagar - p.saldo_pendiente) as total_abonado,
      p.plazo_cuotas,
      p.valor_cuota,
      p.estado,
      p.fecha_solicitud,
      p.fecha_aprobacion,
      p.fecha_vencimiento,
      p.observaciones,
      c.id as cliente_id,
      c.nombre_completo,
      c.tipo_documento,
      c.numero_documento,
      c.telefono,
      c.email,
      c.ciudad,
      c.banco_desembolso,
      c.tipo_cuenta,
      c.numero_cuenta
    FROM prestamos p
    JOIN clientes c ON p.cliente_id = c.id
    ${whereSql}
    ORDER BY
      CASE
        WHEN p.estado = 'EN_MORA' THEN 1
        WHEN p.saldo_pendiente > 0 THEN 2
        ELSE 3
      END,
      p.id DESC
  `;

  return db.prepare(sql).all(...params);
}

function getClientByDocument(numero_documento) {
  const cliente = db.prepare('SELECT * FROM clientes WHERE numero_documento = ?').get(numero_documento);
  if (!cliente) return null;

  const prestamos = db.prepare(`
    SELECT
      p.*,
      (p.total_a_pagar - p.saldo_pendiente) as total_abonado
    FROM prestamos p
    WHERE p.cliente_id = ?
    ORDER BY p.id DESC
  `).all(cliente.id);

  // Attach payments to each loan
  const prestamosConPagos = prestamos.map(pr => {
    const pagos = db.prepare(`
      SELECT * FROM pagos WHERE prestamo_id = ? ORDER BY id DESC
    `).all(pr.id);
    return { ...pr, pagos };
  });

  return {
    cliente,
    prestamos: prestamosConPagos
  };
}

function getLoanById(id) {
  const prestamo = db.prepare(`
    SELECT
      p.*,
      (p.total_a_pagar - p.saldo_pendiente) as total_abonado,
      c.nombre_completo,
      c.tipo_documento,
      c.numero_documento,
      c.telefono,
      c.email,
      c.ciudad,
      c.direccion,
      c.banco_desembolso,
      c.tipo_cuenta,
      c.numero_cuenta
    FROM prestamos p
    JOIN clientes c ON p.cliente_id = c.id
    WHERE p.id = ?
  `).get(id);

  if (!prestamo) return null;

  const pagos = db.prepare('SELECT * FROM pagos WHERE prestamo_id = ? ORDER BY id DESC').all(id);
  return { ...prestamo, pagos };
}

function createLoanApplication(data) {
  const {
    nombre_completo,
    tipo_documento = 'CC',
    numero_documento,
    telefono,
    email,
    ciudad,
    direccion,
    ingresos_mensuales = 0,
    ocupacion = 'Independiente',
    banco_desembolso = 'Bancolombia',
    tipo_cuenta = 'Ahorros',
    numero_cuenta = '',
    monto_solicitado,
    plazo_cuotas = 1
  } = data;

  const monto = parseFloat(monto_solicitado);
  if (isNaN(monto) || monto < 50000 || monto > 3000000) {
    throw new Error('El monto solicitado debe ser entre $50.000 COP y $3.000.000 COP.');
  }

  const cuotas = parseInt(plazo_cuotas, 10) || 1;
  const porcentaje_interes = 20.0;
  const valor_interes = Math.round(monto * 0.20);
  const total_a_pagar = monto + valor_interes;
  const valor_cuota = Math.round(total_a_pagar / cuotas);

  const now = new Date();
  const fecha_solicitud = now.toISOString().split('T')[0];

  // Due date: 28 days (4 weeks) per installment
  const vencimiento = new Date(now);
  vencimiento.setDate(vencimiento.getDate() + (28 * cuotas));
  const fecha_vencimiento = vencimiento.toISOString().split('T')[0];

  // 1. Get or Create Client
  let cliente = db.prepare('SELECT id FROM clientes WHERE numero_documento = ?').get(numero_documento);
  let cliente_id;

  if (cliente) {
    cliente_id = cliente.id;
    // Update contact and bank info
    db.prepare(`
      UPDATE clientes SET
        nombre_completo = ?, telefono = ?, email = ?, ciudad = ?,
        direccion = ?, ingresos_mensuales = ?, ocupacion = ?,
        banco_desembolso = ?, tipo_cuenta = ?, numero_cuenta = ?
      WHERE id = ?
    `).run(
      nombre_completo, telefono, email, ciudad,
      direccion, ingresos_mensuales, ocupacion,
      banco_desembolso, tipo_cuenta, numero_cuenta,
      cliente_id
    );
  } else {
    const res = db.prepare(`
      INSERT INTO clientes (
        nombre_completo, tipo_documento, numero_documento, telefono, email,
        ciudad, direccion, ingresos_mensuales, ocupacion, banco_desembolso,
        tipo_cuenta, numero_cuenta, fecha_registro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nombre_completo, tipo_documento, numero_documento, telefono, email,
      ciudad, direccion, ingresos_mensuales, ocupacion, banco_desembolso,
      tipo_cuenta, numero_cuenta, fecha_solicitud
    );
    cliente_id = Number(res.lastInsertRowid);
  }

  // 2. Generate unique loan code (e.g., SOLV-8392)
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const codigo = `SOLV-${randNum}`;

  // 3. Create Loan
  const resPrestamo = db.prepare(`
    INSERT INTO prestamos (
      codigo, cliente_id, monto_solicitado, porcentaje_interes, valor_interes,
      total_a_pagar, saldo_pendiente, plazo_cuotas, valor_cuota, estado,
      fecha_solicitud, fecha_aprobacion, fecha_vencimiento, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APROBADO', ?, ?, ?, 'Aprobado de manera inmediata')
  `).run(
    codigo, cliente_id, monto, porcentaje_interes, valor_interes,
    total_a_pagar, total_a_pagar, cuotas, valor_cuota,
    fecha_solicitud, fecha_solicitud, fecha_vencimiento
  );

  return getLoanById(Number(resPrestamo.lastInsertRowid));
}

function registerPayment(prestamo_id, monto_pagado, metodo_pago, referencia_transaccion, notas = '') {
  const monto = parseFloat(monto_pagado);
  if (isNaN(monto) || monto <= 0) {
    throw new Error('El monto a pagar debe ser mayor a 0.');
  }

  const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(prestamo_id);
  if (!prestamo) {
    throw new Error('Préstamo no encontrado.');
  }

  if (prestamo.saldo_pendiente <= 0) {
    throw new Error('Este crédito ya se encuentra a Paz y Salvo (completamente pagado).');
  }

  const nuevo_saldo = Math.max(0, prestamo.saldo_pendiente - monto);
  const nuevo_estado = nuevo_saldo === 0 ? 'PAGADO' : prestamo.estado;

  const now = new Date();
  const fecha_pago = now.toISOString().split('T')[0];
  const ref = referencia_transaccion || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Insert payment
  db.prepare(`
    INSERT INTO pagos (
      prestamo_id, monto_pagado, metodo_pago, referencia_transaccion,
      estado, fecha_pago, comprobante, notas
    ) VALUES (?, ?, ?, ?, 'APROBADO', ?, ?, ?)
  `).run(
    prestamo_id, monto, metodo_pago, ref,
    fecha_pago, `Aprobado por pasarela ${metodo_pago}`, notas || 'Pago registrado con éxito'
  );

  // Update loan
  db.prepare(`
    UPDATE prestamos SET
      saldo_pendiente = ?,
      estado = ?
    WHERE id = ?
  `).run(nuevo_saldo, nuevo_estado, prestamo_id);

  return {
    prestamo_actualizado: getLoanById(prestamo_id),
    pago: {
      referencia: ref,
      monto,
      metodo_pago,
      fecha_pago,
      saldo_restante: nuevo_saldo,
      estado_final: nuevo_estado
    }
  };
}

function updateLoanStatus(prestamo_id, nuevo_estado, observaciones = null) {
  const validos = ['PENDIENTE', 'APROBADO', 'PAGADO', 'EN_MORA', 'RECHAZADO'];
  if (!validos.includes(nuevo_estado)) {
    throw new Error(`Estado inválido. Debe ser uno de: ${validos.join(', ')}`);
  }

  if (observaciones) {
    db.prepare('UPDATE prestamos SET estado = ?, observaciones = ? WHERE id = ?')
      .run(nuevo_estado, observaciones, prestamo_id);
  } else {
    db.prepare('UPDATE prestamos SET estado = ? WHERE id = ?')
      .run(nuevo_estado, prestamo_id);
  }

  return getLoanById(prestamo_id);
}

module.exports = {
  db,
  initDb,
  getMetrics,
  getAllLoans,
  getClientByDocument,
  getLoanById,
  createLoanApplication,
  registerPayment,
  updateLoanStatus
};
