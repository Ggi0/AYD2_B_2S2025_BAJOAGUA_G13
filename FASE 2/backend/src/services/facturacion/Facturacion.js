/**
 * @file facturacion.service.js
 * @description Capa de lógica de negocio para el módulo de Facturación Electrónica.
 *
 * Este servicio orquesta todos los actores involucrados:
 *   - FacturaFEL (model)        → operaciones de base de datos
 *   - felSimulador.service.js   → simulador del certificador SAT
 *   - Contrato (model externo)  → actualización del saldo de crédito
 *   - mailer (utils)            → notificaciones por correo (CDU003.4)
 *
 * Flujo principal del camino feliz (pasos 6 → 8):
 *
 *   Paso 6  Orden marcada "Entregada"
 *             ↓  generarBorrador()
 *   BORRADOR creado automáticamente
 *
 *   Paso 7  Agente financiero certifica
 *             ↓  validarYCertificar()
 *   VALIDACIÓN SAT simulada → CERTIFICACIÓN → CXC creada → CARGO al crédito
 *   → Notificación al cliente por correo
 *
 *   Paso 8  Agente financiero registra pago
 *             ↓  registrarPago()
 *   PAGO registrado → CXC actualizada → ABONO al crédito del contrato
 */

"use strict";

const FacturaFEL       = require("../../models/facturacion/FacturaFel");
const { certificarFEL, validarBorrador } = require("./fel_simulacion");
const Contrato         = require("../../models/contratos/Contrato");   // modelo existente
const { notificarCorrecto, notificarInformativo, notificarIncorrecto } = require("../../utils/mailer");

/* ─── Utilidades internas ─────────────────────────────── */

/**
 * Genera el número único de factura con el formato F-YYYYMMDD-XXXXX.
 * @returns {string}
 */
function generarNumeroFactura() {
  const ahora    = new Date();
  const fecha    = ahora.toISOString().slice(0, 10).replace(/-/g, "");
  const aleatorio = Math.floor(Math.random() * 90000) + 10000;
  return `F-${fecha}-${aleatorio}`;
}

/**
 * Redondea a 2 decimales de forma consistente (evita errores de punto flotante).
 * @param {number} valor
 * @returns {number}
 */
function r2(valor) {
  return Math.round(valor * 100) / 100;
}

/* 
   1. GENERAR BORRADOR (CDU003.1)
   Triggerado automáticamente cuando la orden se marca "Entregada"
    */

/**
 * Crea el borrador de factura FEL a partir de una orden entregada.
 *
 * Fórmula:
 *   bruto     = distancia_km * tarifa_aplicada
 *   descuento = bruto * (porcentaje_descuento / 100)   [si existe]
 *   subtotal  = bruto - descuento
 *   iva       = subtotal * 0.12
 *   total     = subtotal + iva
 *
 * Si la orden ya tiene una factura (cualquier estado), retorna la existente.
 *
 * @param {number} orden_id   - ID de la orden recién entregada
 * @param {number} usuario_id - ID del agente/sistema que dispara la acción
 * @returns {Promise<{ borrador: Object, calculoDetallado: Object }>}
 * @throws {Error} Si la orden no existe, no está entregada, o falta datos críticos
 */
async function generarBorrador(orden_id, usuario_id) {
  // 1. Obtener todos los datos necesarios de la orden
  const datos = await FacturaFEL.obtenerDatosParaBorrador(orden_id);

  if (!datos) {
    throw Object.assign(new Error(`Orden ${orden_id} no encontrada o faltan datos de contrato/vehículo.`), { status: 404 });
  }

  if (datos.estado_orden !== "ENTREGADA") {
    throw Object.assign(
      new Error(`La orden ${orden_id} debe estar en estado ENTREGADA para generar factura. Estado actual: ${datos.estado_orden}`),
      { status: 422 }
    );
  }

  // 2. Verificar que no exista ya una factura para esta orden
  const facturaExistente = await FacturaFEL.buscarPorOrden(orden_id);
  if (facturaExistente) {
    // Idempotente: retornamos la existente sin error
    return {
      borrador: facturaExistente,
      calculoDetallado: null,
      yaExistia: true,
    };
  }

  // 3. Calcular montos
  if (!datos.distancia_km || datos.distancia_km <= 0) {
    throw Object.assign(
      new Error("La ruta autorizada no tiene distancia_km configurada. Configure la ruta en el contrato."),
      { status: 422 }
    );
  }

  const bruto                = r2(datos.distancia_km * datos.tarifa_aplicada);
  const porcentajeDescuento  = datos.porcentaje_descuento || 0;
  const descuento_aplicado   = r2(bruto * (porcentajeDescuento / 100));
  const subtotal             = r2(bruto - descuento_aplicado);
  const iva                  = r2(subtotal * 0.12);
  const total_factura        = r2(subtotal + iva);

  const calculoDetallado = {
    distancia_km:       datos.distancia_km,
    tarifa_aplicada:    datos.tarifa_aplicada,
    tipo_unidad:        datos.tipo_unidad,
    bruto,
    porcentaje_descuento: porcentajeDescuento,
    descuento_aplicado,
    subtotal,
    iva_porcentaje:     12,
    iva,
    total_factura,
  };

  // 4. Crear el borrador en BD
  const borrador = await FacturaFEL.crearBorrador({
    orden_id,
    cliente_id:                 datos.cliente_id,
    contrato_id:                datos.contrato_id,
    numero_factura:             generarNumeroFactura(),
    distancia_km:               datos.distancia_km,
    tarifa_aplicada:            datos.tarifa_aplicada,
    descuento_aplicado,
    subtotal,
    iva,
    total_factura,
    nit_cliente:                datos.cliente_nit,
    nombre_cliente_facturacion: datos.cliente_nombre,
  });

  return { borrador, calculoDetallado, yaExistia: false };
}

/* 
   2. VALIDAR BORRADOR (CDU003.2)
   Puede llamarse antes de certificar para pre-validar
    */

/**
 * Valida el borrador de una factura contra las reglas de la SAT (simuladas).
 * Si la validación es aprobada, cambia el estado a VALIDADA.
 * Si es rechazada, registra el resultado pero NO cambia el estado.
 *
 * @param {number} factura_id
 * @param {number} validado_por   - ID del agente financiero
 * @returns {Promise<{ resultado: Object, factura: Object, validacion: Object }>}
 */
async function validarFactura(factura_id, validado_por) {
  const factura = await FacturaFEL.buscarPorId(factura_id);

  if (!factura) {
    throw Object.assign(new Error(`Factura ${factura_id} no encontrada.`), { status: 404 });
  }

  if (factura.estado !== "BORRADOR") {
    throw Object.assign(
      new Error(`Solo se pueden validar facturas en estado BORRADOR. Estado actual: ${factura.estado}`),
      { status: 422 }
    );
  }

  // Ejecutar validación simulada
  const resultado = validarBorrador(factura);

  // Registrar en validacion_fel
  const validacion = await FacturaFEL.registrarValidacion({
    factura_id,
    nit_validado:                  factura.nit_cliente,
    nit_valido:                    resultado.nitValido,
    campos_obligatorios_completos: resultado.camposCompletos,
    resultado_validacion:          resultado.aprobada ? "APROBADA" : "RECHAZADA",
    mensaje_validacion:            resultado.aprobada
      ? "Validación exitosa. Factura lista para certificación."
      : resultado.errores.join("; "),
    uuid_generado: null,   // UUID se genera en la certificación, no aquí
    validado_por,
  });

  // Si aprobada → cambiar estado a VALIDADA
  let facturaActualizada = factura;
  if (resultado.aprobada) {
    facturaActualizada = await FacturaFEL.actualizarEstado(factura_id, "VALIDADA");
  }

  return {
    resultado,
    factura: facturaActualizada,
    validacion,
  };
}

/* 
   3. CERTIFICAR (FEL) — CDU003.3 + CDU003.4 + CDU003.5
   El agente financiero certifica la factura.
   Pasos que este método ejecuta:
     a) Certifica ante el simulador SAT
     b) Actualiza la factura en BD (estado CERTIFICADA + UUID)
     c) Crea la Cuenta por Cobrar automáticamente
     d) Carga el saldo del contrato (libera crédito hacia deuda)
     e) Registra movimiento de crédito (CARGO)
     f) Envía notificación al cliente (CDU003.4)
    */

/**
 * Certifica una factura validada. Orquesta todo el proceso FEL.
 *
 * @param {number} factura_id
 * @param {number} certificado_por   - ID del agente financiero (del JWT)
 * @returns {Promise<{
 *   factura: Object,
 *   cuentaPorCobrar: Object,
 *   movimiento: Object,
 *   uuid: string,
 *   mensajeSAT: string
 * }>}
 */
async function certificarFactura(factura_id, certificado_por) {
  // 1. Obtener factura con datos completos
  const factura = await FacturaFEL.buscarPorId(factura_id);

  if (!factura) {
    throw Object.assign(new Error(`Factura ${factura_id} no encontrada.`), { status: 404 });
  }

  if (factura.estado !== "VALIDADA") {
    throw Object.assign(
      new Error(`La factura debe estar en estado VALIDADA para certificar. Estado actual: ${factura.estado}. ` +
                `Si está en BORRADOR, primero ejecute la validación.`),
      { status: 422 }
    );
  }

  // 2. Ejecutar simulador FEL (equivale a llamar a Infile/Digifact)
  const resultadoFEL = certificarFEL(factura);

  if (!resultadoFEL.aprobada) {
    // El simulador rechazó — actualizar estado a BORRADOR para reintentar
    await FacturaFEL.actualizarEstado(factura_id, "BORRADOR",
      `Certificación rechazada: ${resultadoFEL.errores.join("; ")}`);

    throw Object.assign(
      new Error(`Certificación FEL rechazada: ${resultadoFEL.mensajeSAT}`),
      { status: 422, detallesSAT: resultadoFEL }
    );
  }

  // 3. Actualizar factura en BD (CERTIFICADA + UUID + XML + timestamp)
  const pdfUrl       = `/facturas/pdf/${factura.numero_factura}.pdf`;   // URL simulada
  const facturaCert  = await FacturaFEL.certificarFactura(
    factura_id,
    certificado_por,
    resultadoFEL.uuid,
    resultadoFEL.xml,
    pdfUrl
  );

  // 4. Obtener datos del contrato para plazo de pago y saldo actual
  const contrato = await Contrato.buscarPorId(factura.contrato_id);

  // 5. Crear Cuenta por Cobrar automáticamente (CDU003.5)
  const cxc = await FacturaFEL.crearCuentaPorCobrar({
    factura_id,
    cliente_id:     factura.cliente_id,
    contrato_id:    factura.contrato_id,
    monto_original: factura.total_factura,
    plazo_pago:     contrato.plazo_pago,
  });

  // 6. Cargar saldo al contrato (CARGO = aumenta deuda usada)
  const saldoAnterior = parseFloat(contrato.saldo_usado) || 0;
  const saldoNuevo    = r2(saldoAnterior + parseFloat(factura.total_factura));
  await Contrato.actualizarSaldo(factura.contrato_id, saldoNuevo);

  // 7. Registrar movimiento de crédito CARGO
  const movimiento = await FacturaFEL.registrarMovimientoCredito({
    contrato_id:     factura.contrato_id,
    factura_id,
    pago_id:         null,
    tipo_movimiento: "CARGO",
    monto_movimiento: parseFloat(factura.total_factura),
    saldo_anterior:   saldoAnterior,
    saldo_nuevo:      saldoNuevo,
    motivo:          `Factura certificada: ${factura.numero_factura} — UUID: ${resultadoFEL.uuid}`,
    registrado_por:   certificado_por,
  });

  // 8. Notificar al cliente por correo (CDU003.4) — no bloquea si falla
  try {
    await notificarInformativo(
      factura.cliente_email,
      factura.cliente_nombre,
      `Se ha emitido y certificado su Factura Electrónica correspondiente a su orden de servicio.`,
      {
        titulo: "Factura Electrónica FEL Certificada",
        datos: [
          { etiqueta: "N° Factura",      valor: factura.numero_factura         },
          { etiqueta: "N° Autorización", valor: resultadoFEL.uuid              },
          { etiqueta: "Subtotal",        valor: `Q ${factura.subtotal}`        },
          { etiqueta: "IVA (12%)",       valor: `Q ${factura.iva}`             },
          { etiqueta: "Total",           valor: `Q ${factura.total_factura}`   },
          { etiqueta: "Plazo de pago",   valor: `${contrato.plazo_pago} días`  },
          { etiqueta: "Vence",           valor: cxc.fecha_vencimiento          },
        ],
      }
    );
  } catch (mailError) {
    // El correo falla silenciosamente — la operación principal ya fue exitosa
    console.error("[facturacion.service] Error enviando correo de certificación:", mailError.message);
  }

  return {
    factura:        facturaCert,
    cuentaPorCobrar: cxc,
    movimiento,
    uuid:           resultadoFEL.uuid,
    mensajeSAT:     resultadoFEL.mensajeSAT,
  };
}

/* 
   4. REGISTRAR PAGO (CDU003.6 / CDU003.8 / CDU003.9)
   El agente financiero registra el pago bancario.
   Libera el crédito del contrato automáticamente.
    */

/**
 * Registra un pago contra una factura certificada.
 *
 * Pasos que ejecuta:
 *   a) Valida que la factura esté CERTIFICADA
 *   b) Valida que la cuenta por cobrar exista y tenga saldo pendiente
 *   c) Registra el pago en pagos_factura
 *   d) Actualiza saldo de la cuenta por cobrar
 *   e) Libera crédito del contrato (ABONO)
 *   f) Registra movimiento ABONO
 *   g) Notifica confirmación al agente
 */
async function registrarPago(datos, registrado_por) {
  const {
    factura_id, cuenta_por_cobrar_id,
    forma_pago, monto_pagado, fecha_hora_pago,
    banco_origen, cuenta_origen,
    numero_autorizacion_bancaria, observacion,
  } = datos;

  // 1. Validar factura
  const factura = await FacturaFEL.buscarPorId(factura_id);
  if (!factura) {
    throw Object.assign(new Error(`Factura ${factura_id} no encontrada.`), { status: 404 });
  }
  if (factura.estado !== "CERTIFICADA") {
    throw Object.assign(
      new Error(`Solo se pueden registrar pagos contra facturas CERTIFICADAS. Estado: ${factura.estado}`),
      { status: 422 }
    );
  }

  // 2. Validar cuenta por cobrar
  const cuentas = await FacturaFEL.listarCuentasPorCobrar({ cliente_id: factura.cliente_id });
  const cxc     = cuentas.find(c => c.id === parseInt(cuenta_por_cobrar_id));

  if (!cxc) {
    throw Object.assign(new Error(`Cuenta por cobrar ${cuenta_por_cobrar_id} no encontrada.`), { status: 404 });
  }
  if (cxc.estado_cobro === "PAGADA") {
    throw Object.assign(new Error(`Esta cuenta ya está completamente pagada.`), { status: 422 });
  }
  if (parseFloat(monto_pagado) > parseFloat(cxc.saldo_pendiente)) {
    throw Object.assign(
      new Error(`El monto pagado (Q${monto_pagado}) supera el saldo pendiente (Q${cxc.saldo_pendiente}).`),
      { status: 422 }
    );
  }

  // 3. Registrar pago
  const pago = await FacturaFEL.registrarPago({
    factura_id,
    cuenta_por_cobrar_id,
    cliente_id:                   factura.cliente_id,
    forma_pago,
    monto_pagado:                 parseFloat(monto_pagado),
    fecha_hora_pago,
    banco_origen,
    cuenta_origen,
    numero_autorizacion_bancaria,
    registrado_por,
    observacion,
  });

  // 4. Actualizar cuenta por cobrar
  const nuevoSaldoCXC   = r2(parseFloat(cxc.saldo_pendiente) - parseFloat(monto_pagado));
  const cuentaActualizada = await FacturaFEL.actualizarCuentaPorCobrar(cuenta_por_cobrar_id, nuevoSaldoCXC);

  // 5. Liberar crédito del contrato (ABONO = reduce deuda usada)
  const contrato      = await Contrato.buscarPorId(factura.contrato_id);
  const saldoAnterior = parseFloat(contrato.saldo_usado) || 0;
  const saldoNuevo    = r2(Math.max(0, saldoAnterior - parseFloat(monto_pagado)));
  await Contrato.actualizarSaldo(factura.contrato_id, saldoNuevo);

  // 6. Registrar movimiento ABONO
  const movimiento = await FacturaFEL.registrarMovimientoCredito({
    contrato_id:      factura.contrato_id,
    factura_id,
    pago_id:          pago.id,
    tipo_movimiento:  "ABONO",
    monto_movimiento: parseFloat(monto_pagado),
    saldo_anterior:   saldoAnterior,
    saldo_nuevo:      saldoNuevo,
    motivo:           `Pago registrado: ${forma_pago} — Banco: ${banco_origen} — Auth: ${numero_autorizacion_bancaria}`,
    registrado_por,
  });

  // 7. Notificación al agente (correo opcional)
  try {
    await notificarCorrecto(
      factura.cliente_email,
      factura.cliente_nombre,
      `Se ha registrado correctamente un pago de Q${monto_pagado} para su factura ${factura.numero_factura}.`,
      {
        titulo: "Pago Registrado Exitosamente",
        detalle: `Su crédito disponible ha sido actualizado. Saldo utilizado actual: Q${saldoNuevo}.`,
      }
    );
  } catch (mailError) {
    console.error("[facturacion.service] Error enviando correo de pago:", mailError.message);
  }

  return {
    pago,
    cuentaActualizada,
    movimiento,
    creditoLiberado: parseFloat(monto_pagado),
    saldoContratoAnterior: saldoAnterior,
    saldoContratoNuevo:    saldoNuevo,
  };
}

/* 
   5. CONSULTAS (CDU003.6, CDU003.7, CDU003.8)
    */

/**
 * Obtiene una factura con sus pagos y cuenta por cobrar vinculada.
 * Para uso del agente financiero o del cliente.
 *
 * @param {number} factura_id
 * @returns {Promise<Object>}
 */
async function obtenerFacturaCompleta(factura_id) {
  const factura = await FacturaFEL.buscarPorId(factura_id);
  if (!factura) {
    throw Object.assign(new Error(`Factura ${factura_id} no encontrada.`), { status: 404 });
  }

  const pagos    = await FacturaFEL.listarPagosPorFactura(factura_id);
  const cuentas  = await FacturaFEL.listarCuentasPorCobrar({ cliente_id: factura.cliente_id });
  const cxc      = cuentas.find(c => c.factura_id === factura_id) || null;

  return { factura, pagos, cuentaPorCobrar: cxc };
}

module.exports = {
  generarBorrador,
  validarFactura,
  certificarFactura,
  registrarPago,
  obtenerFacturaCompleta,
};