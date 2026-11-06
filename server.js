const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./database.js');

// Initialize database
db.initDb();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON inválido en el cuerpo de la petición'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // ---------------------------------------------------------
    // API ROUTES
    // ---------------------------------------------------------

    // 1. Simular Préstamo (Calculadora 20% interés)
    if (pathname === '/api/simular' && method === 'POST') {
      const body = await parseBody(req);
      const monto = parseFloat(body.monto) || 50000;
      const cuotas = parseInt(body.cuotas, 10) || 1;

      if (monto < 50000 || monto > 3000000) {
        return sendJSON(res, 400, {
          error: 'El monto debe estar entre $50.000 COP y $3.000.000 COP'
        });
      }

      const interes_porcentaje = 20.0;
      const valor_interes = Math.round(monto * 0.20);
      const total_a_pagar = monto + valor_interes;
      const valor_cuota = Math.round(total_a_pagar / cuotas);

      return sendJSON(res, 200, {
        monto_solicitado: monto,
        tasa_interes: interes_porcentaje,
        interes_total: valor_interes,
        total_a_pagar: total_a_pagar,
        cuotas: cuotas,
        valor_cuota: valor_cuota,
        frecuencia: 'Mensual'
      });
    }

    // 2. Métricas del Dashboard (Quién debe vs quién no, totales)
    if (pathname === '/api/metricas' && method === 'GET') {
      const metricas = db.getMetrics();
      return sendJSON(res, 200, metricas);
    }

    // 3. Listar Préstamos (Filtros: todos, deben, pagados, mora, pendientes)
    if (pathname === '/api/prestamos' && method === 'GET') {
      const filtro = parsedUrl.query.filtro || 'todos';
      const search = parsedUrl.query.search || '';
      const prestamos = db.getAllLoans(filtro, search);
      return sendJSON(res, 200, prestamos);
    }

    // 4. Detalle de un Préstamo con su historial de pagos
    if (pathname.startsWith('/api/prestamos/') && method === 'GET') {
      const parts = pathname.split('/');
      const id = parseInt(parts[3], 10);
      if (isNaN(id)) return sendJSON(res, 400, { error: 'ID inválido' });

      const prestamo = db.getLoanById(id);
      if (!prestamo) return sendJSON(res, 404, { error: 'Préstamo no encontrado' });

      return sendJSON(res, 200, prestamo);
    }

    // 5. Solicitar Préstamo (Cliente se registra y solicita)
    if (pathname === '/api/solicitar' && method === 'POST') {
      const body = await parseBody(req);

      if (!body.nombre_completo || !body.numero_documento || !body.telefono || !body.monto_solicitado) {
        return sendJSON(res, 400, {
          error: 'Faltan datos obligatorios: Nombre, Cédula, Teléfono y Monto son requeridos.'
        });
      }

      try {
        const prestamo = db.createLoanApplication(body);
        return sendJSON(res, 201, {
          success: true,
          mensaje: '¡Solicitud de préstamo aprobada exitosamente!',
          prestamo
        });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // 6. Registrar Pago (Abono o Cancelación Total)
    if (pathname === '/api/pagar' && method === 'POST') {
      const body = await parseBody(req);
      const { prestamo_id, monto, metodo_pago, referencia, notas } = body;

      if (!prestamo_id || !monto || !metodo_pago) {
        return sendJSON(res, 400, {
          error: 'Préstamo ID, monto a pagar y método de pago son requeridos.'
        });
      }

      try {
        const resultado = db.registerPayment(
          parseInt(prestamo_id, 10),
          parseFloat(monto),
          metodo_pago,
          referencia,
          notas
        );

        return sendJSON(res, 200, {
          success: true,
          mensaje: resultado.pago.saldo_restante === 0
            ? '¡Felicitaciones! Has cancelado el 100% de tu deuda. Se ha expedido tu Paz y Salvo.'
            : `Pago de $${parseFloat(monto).toLocaleString('es-CO')} procesado exitosamente. Saldo restante: $${resultado.pago.saldo_restante.toLocaleString('es-CO')}`,
          ...resultado
        });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // 7. Consultar Estado de Cuenta del Cliente por Documento
    if (pathname === '/api/clientes/consulta' && method === 'GET') {
      const doc = parsedUrl.query.documento;
      if (!doc) {
        return sendJSON(res, 400, { error: 'Por favor ingresa un número de cédula o documento' });
      }

      const info = db.getClientByDocument(doc.trim());
      if (!info) {
        return sendJSON(res, 404, {
          error: 'No se encontraron préstamos asociados a esta cédula. ¡Te invitamos a solicitar uno nuevo!'
        });
      }

      return sendJSON(res, 200, info);
    }

    // 8. Actualizar Estado de Préstamo (Admin: Aprobar, En Mora, Rechazar)
    if (pathname.match(/^\/api\/prestamos\/\d+\/estado$/) && method === 'POST') {
      const parts = pathname.split('/');
      const id = parseInt(parts[3], 10);
      const body = await parseBody(req);

      try {
        const actualizado = db.updateLoanStatus(id, body.estado, body.observaciones);
        return sendJSON(res, 200, { success: true, prestamo: actualizado });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // ---------------------------------------------------------
    // STATIC FILE SERVING
    // ---------------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Acceso denegado');
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA client navigation
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (err2, content) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Archivo no encontrado');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err3, content) => {
        if (err3) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Error interno del servidor al leer archivo');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

  } catch (globalErr) {
    console.error('Server error:', globalErr);
    sendJSON(res, 500, { error: 'Error interno del servidor: ' + globalErr.message });
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Wilmar Pineda - Préstamos Colombia Server activo en:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
