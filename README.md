# 💰 Wilmar Pineda - Plataforma Web de Préstamos en Colombia

Plataforma web de préstamos personales de **Wilmar Pineda** en Colombia, desarrollada con una interfaz moderna, simulador interactivo de créditos, formulario de solicitud y desembolso, pasarela multicanal de pagos (PSE, Nequi, Daviplata, Tarjetas, Baloto/Efecty), y una **base de datos relacional SQLite** de alto rendimiento para el control y seguimiento en tiempo real de **quién debe dinero y quién ya pagó (Paz y Salvo)**.

---

## 📌 Especificaciones Cumplidas

1. **Rango de Préstamos:**
   - Monto mínimo: **$50.000 COP**
   - Monto máximo: **$3.000.000 COP**
   - Paso / Incrementos: $10.000 COP (con botones rápidos de $100.000, $300.000, $500.000, $1.000.000, $2.000.000 y $3.000.000).

2. **Tasa de Interés Fija:**
   - **20% de interés** aplicado de forma transparente sin cobros ocultos ni letra pequeña.
   - Fórmula en tiempo real:
     $$\text{Interés} = \text{Monto Solicitado} \times 0.20$$
     $$\text{Total a Pagar} = \text{Monto Solicitado} + \text{Interés}$$
     $$\text{Valor Cuota} = \frac{\text{Total a Pagar}}{\text{Número de Cuotas}}$$

3. **Multicanal de Pagos (Colombia):**
   - 🟡 **PSE:** Débito directo desde cualquier cuenta bancaria en Colombia (Bancolombia, Davivienda, Banco de Bogotá, BBVA, etc.).
   - 🟣 **Nequi:** Notificación push inmediata al celular o escaneo QR.
   - 🔴 **Daviplata:** Pago directo con número celular y código de confirmación.
   - 💳 **Tarjetas Débito y Crédito:** Visa, MasterCard, American Express con pasarela segura.
   - 🏪 **Efectivo (Efecty / Baloto / SuRed):** Generación de código de convenio y PIN para pago presencial en más de 20.000 corresponsales.
   - 🏢 **Transferencia Bancaria Directa:** Cuenta a nombre de Wilmar Pineda.

4. **Base de Datos Relacional (SQLite Local):**
   - Guarda y actualiza de inmediato la información de **quién debe dinero y quién no**.
   - Tablas: `clientes`, `prestamos`, `pagos`, `configuracion`.
   - Vistas filtradas:
     - 🔴 **Quién Debe Dinero:** Préstamos con saldo pendiente $> 0$.
     - 🟢 **Quién Ya Pagó (Paz y Salvo):** Préstamos con saldo pendiente $= 0$.
     - ⚠️ **En Mora:** Préstamos con fecha límite superada y saldo pendiente.
     - ⏳ **Solicitudes Nuevas:** En espera de aprobación.

5. **Herramientas de Gestión y Cobranza:**
   - 💬 **Cobro directo por WhatsApp:** Abre WhatsApp con mensaje pre-redactado de parte de Wilmar Pineda con el saldo exacto, código y link de pago.
   - 📄 **Certificado Oficial de Paz y Salvo:** Generación instantánea de certificado imprimible firmado por Wilmar Pineda al cancelar la deuda.
   - 📥 **Exportación a Excel / CSV:** Descarga la base de datos de deudores con un solo clic.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Con un solo clic en Windows
Haz doble clic sobre el archivo:
```
iniciar.bat
```

### Opción 2: Desde la terminal
```bash
cd C:\Users\LEIDY\.gemini\antigravity\scratch\prestamos-solventa
node server.js
```

Abre tu navegador en:
👉 **http://localhost:3000**
