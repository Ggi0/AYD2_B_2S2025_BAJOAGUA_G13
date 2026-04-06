// src/components/gerencial/EventosOrdenes.tsx
import React, { useEffect, useState } from "react";
import { getEventosOrdenes } from "../../services/Gerencial/gerencial";
import { FaExclamationCircle, FaExclamationTriangle, FaClock, FaCheckCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface Evento {
  eventoId: number;
  ordenId: number;
  numeroOrden: string;
  pilotoId: number | null;
  pilotoNombre: string;
  clienteNombre: string;
  tipoEvento: "NORMAL" | "INCIDENTE" | "RETRASO" | "CRITICO";
  descripcion: string;
  generaRetraso: boolean;
  fechaHora: string;
  origen: string;
  destino: string;
  ruta: string;
}

interface EventosData {
  desde: string;
  hasta: string;
  sede: string;
  tipoEvento: string;
  total: number;
  conteoTipos: {
    NORMAL: number;
    INCIDENTE: number;
    RETRASO: number;
    CRITICO: number;
  };
  eventos: Evento[];
  modoActualizacion: string;
  actualizadoEn: string;
}

interface EventosOrdenesProps {
  desde?: string;
  hasta?: string;
  sede?: string;
}

const TIPO_EVENTO_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  NORMAL: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: <FaCheckCircle className="text-green-600 text-lg" />,
  },
  INCIDENTE: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    icon: <FaExclamationTriangle className="text-yellow-600 text-lg" />,
  },
  RETRASO: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: <FaClock className="text-orange-600 text-lg" />,
  },
  CRITICO: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: <FaExclamationCircle className="text-red-600 text-lg" />,
  },
};

const EventosOrdenes: React.FC<EventosOrdenesProps> = ({ desde, hasta, sede }) => {
  const [eventos, setEventos] = useState<EventosData | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordenesExpandidas, setOrdenesExpandidas] = useState<Set<number>>(new Set());

  const cargarEventos = async () => {
    try {
      setCargando(true);
      setError(null);

      const response = await getEventosOrdenes({
        desde: desde || new Date().toISOString().split("T")[0],
        hasta: hasta || new Date().toISOString().split("T")[0],
        sede: sede,
        tipo_evento: filtroTipo !== "TODOS" ? filtroTipo : undefined,
        limite: 200,
      });

      if (response.ok && response.data) {
        setEventos(response.data);
      } else {
        setError(response.mensaje || "Error al cargar eventos");
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar eventos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, [desde, hasta, sede, filtroTipo]);

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando eventos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!eventos) {
    return null;
  }

  const eventosFiltrados =
    filtroTipo === "TODOS"
      ? eventos.eventos
      : eventos.eventos.filter((e) => e.tipoEvento === filtroTipo);

  // Agrupar eventos por orden
  const ordenesAgrupadas = new Map<number, Evento[]>();
  eventosFiltrados.forEach((evento) => {
    if (!ordenesAgrupadas.has(evento.ordenId)) {
      ordenesAgrupadas.set(evento.ordenId, []);
    }
    ordenesAgrupadas.get(evento.ordenId)?.push(evento);
  });

  const toggleOrden = (ordenId: number) => {
    const newSet = new Set(ordenesExpandidas);
    if (newSet.has(ordenId)) {
      newSet.delete(ordenId);
    } else {
      newSet.add(ordenId);
    }
    setOrdenesExpandidas(newSet);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Encabezado */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">
            Bitácora de Eventos - Anomalías en Operaciones
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          Detección de anomalías en la operación: retrasos constantes, exceso de consumo de combustible, 
          cambios en volumen de carga de clientes y otros eventos críticos.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{eventos.total}</p>
          <p className="text-xs text-blue-600">Total Eventos</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{eventos.conteoTipos.NORMAL}</p>
          <p className="text-xs text-green-600">Normal</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{eventos.conteoTipos.INCIDENTE}</p>
          <p className="text-xs text-yellow-600">Incidentes</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{eventos.conteoTipos.RETRASO}</p>
          <p className="text-xs text-orange-600">Retrasos</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{eventos.conteoTipos.CRITICO}</p>
          <p className="text-xs text-red-600">Críticos</p>
        </div>
      </div>

      {/* Filtro por tipo */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {["TODOS", "NORMAL", "INCIDENTE", "RETRASO", "CRITICO"].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroTipo(tipo)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filtroTipo === tipo
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tipo}
          </button>
        ))}
      </div>

      {/* Grid de órdenes agrupadas */}
      <div className="space-y-4">
        {Array.from(ordenesAgrupadas.entries()).length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>No hay eventos para mostrar en este período</p>
          </div>
        ) : (
          Array.from(ordenesAgrupadas.entries()).map(([ordenId, eventosOrden]) => {
            const primerevento = eventosOrden[0];
            const isExpandido = ordenesExpandidas.has(ordenId);
            
            // Contar eventos por tipo en esta orden
            const conteoEventos = {
              NORMAL: eventosOrden.filter(e => e.tipoEvento === 'NORMAL').length,
              INCIDENTE: eventosOrden.filter(e => e.tipoEvento === 'INCIDENTE').length,
              RETRASO: eventosOrden.filter(e => e.tipoEvento === 'RETRASO').length,
              CRITICO: eventosOrden.filter(e => e.tipoEvento === 'CRITICO').length,
            };

            // Determinar si hay evento crítico
            const tieneCritico = conteoEventos.CRITICO > 0;
            const tieneRetraso = conteoEventos.RETRASO > 0;

            return (
              <div
                key={ordenId}
                className={`border rounded-lg transition-all ${
                  tieneCritico
                    ? 'border-red-300 bg-red-50'
                    : tieneRetraso
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 bg-white'
                } shadow-md hover:shadow-lg`}
              >
                {/* Encabezado de la orden */}
                <button
                  onClick={() => toggleOrden(ordenId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-opacity-75 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Info de la orden */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          Orden #{primerevento.numeroOrden}
                        </h3>
                        {tieneCritico && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                            <FaExclamationCircle className="text-sm" />
                            CRÍTICO
                          </span>
                        )}
                      </div>
                      
                      {/* Detalles */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Cliente</p>
                          <p className="font-semibold text-gray-800">{primerevento.clienteNombre}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Ruta</p>
                          <p className="font-semibold text-gray-800">{primerevento.ruta}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Piloto</p>
                          <p className="font-semibold text-gray-800">{primerevento.pilotoNombre}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Eventos</p>
                          <p className="font-semibold text-gray-800">{eventosOrden.length} total</p>
                        </div>
                      </div>
                    </div>

                    {/* Conteo de eventos por tipo */}
                    <div className="flex gap-2">
                      {conteoEventos.CRITICO > 0 && (
                        <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          {conteoEventos.CRITICO}
                        </div>
                      )}
                      {conteoEventos.RETRASO > 0 && (
                        <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          {conteoEventos.RETRASO}
                        </div>
                      )}
                      {conteoEventos.INCIDENTE > 0 && (
                        <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          {conteoEventos.INCIDENTE}
                        </div>
                      )}
                      {conteoEventos.NORMAL > 0 && (
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                          {conteoEventos.NORMAL}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón expandir */}
                  <div className="ml-4 text-gray-600">
                    {isExpandido ? (
                      <FaChevronUp className="text-xl" />
                    ) : (
                      <FaChevronDown className="text-xl" />
                    )}
                  </div>
                </button>

                {/* Detalle de eventos (expandible) */}
                {isExpandido && (
                  <div className="border-t p-4 bg-opacity-50">
                    <h4 className="font-semibold text-gray-800 mb-4">Bitácora de Eventos</h4>
                    <div className="space-y-3">
                      {eventosOrden.map((evento) => {
                        const colores = TIPO_EVENTO_COLORS[evento.tipoEvento];
                        const fecha = new Date(evento.fechaHora);

                        return (
                          <div
                            key={evento.eventoId}
                            className={`border-l-4 ${colores.border} ${colores.bg} rounded p-3`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div>{colores.icon}</div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colores.text} ${colores.bg} border ${colores.border}`}>
                                  {evento.tipoEvento}
                                </span>
                              </div>
                              {evento.generaRetraso && (
                                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 mb-2">{evento.descripcion}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>
                                {fecha.toLocaleDateString("es-ES")} {fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Información de datos */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        <p>
          Período: {eventos.desde} a {eventos.hasta} | Sede: {eventos.sede} | Filtro: {eventos.tipoEvento} | 
          Actualizado: {new Date(eventos.actualizadoEn).toLocaleTimeString("es-ES")}
        </p>
      </div>
    </div>
  );
};

export default EventosOrdenes;
