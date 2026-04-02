// src/pages/logistico/ContratoDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaPlus,FaCalendarAlt, FaClock, FaShieldAlt } from 'react-icons/fa';
import { useContratos } from '../../services/Logistico/hooks/useContratos';
import { formatMoney, formatDate, getContratoEstadoInfo, type TarifaNegociada } from '../../services/Logistico/Logistico';
import type { RutaAutorizada } from '../../services/api';
import LogisticHeader from '../../components/logistico/LogisticHeader';
import LogisticMenu from '../../components/logistico/LogisticMenu';
import { useAuth } from '../../context/AuthContext';

interface DescuentoForm {
  tipo_unidad: string;
  porcentaje_descuento: number;
  observacion: string;
}

interface RutaForm {
  origen: string;
  destino: string;
  distancia_km: number;
  tipo_carga: string;
}

// Rutas comunes predefinidas
const RUTAS_COMUNES = [
  { origen: 'Quetzaltenango', destino: 'Guatemala' },
  { origen: 'Quetzaltenango', destino: 'Puerto Barrios' },
  { origen: 'Guatemala', destino: 'Quetzaltenango' },
  { origen: 'Guatemala', destino: 'Puerto Barrios' },
  { origen: 'Puerto Barrios', destino: 'Quetzaltenango' },
  { origen: 'Puerto Barrios', destino: 'Guatemala' }
];

// Tipos de carga disponibles
const TIPOS_CARGA = [
  'General',
  'Refrigerado',
  'Frágil',
  'Peligroso',
  'Granel',
  'Contenedor',
  'Carga Pesada'
];

const ContratoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contratoActual, obtenerContrato, agregarDescuento, agregarRuta, loading, error, limpiarError } = useContratos();
  
  const [showDescuentoForm, setShowDescuentoForm] = useState(false);
  const [showRutaForm, setShowRutaForm] = useState(false);
  
  const [descuentoData, setDescuentoData] = useState<DescuentoForm>({
    tipo_unidad: '',
    porcentaje_descuento: 0,
    observacion: ''
  });
  
  const [rutaData, setRutaData] = useState<RutaForm>({
    origen: '',
    destino: '',
    distancia_km: 0,
    tipo_carga: ''
  });

  const [tipoRuta, setTipoRuta] = useState<'comun' | 'personalizada'>('comun');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>('');

  const userName = user?.nombres && user?.apellidos 
    ? `${user.nombres} ${user.apellidos}`
    : user?.email?.split('@')[0] || 'Operador Logístico';

  useEffect(() => {
    if (id) {
      obtenerContrato(parseInt(id));
    }
  }, [id]);

  const handleAgregarDescuento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id && descuentoData.tipo_unidad && descuentoData.porcentaje_descuento > 0) {
      await agregarDescuento(
        parseInt(id),
        descuentoData.tipo_unidad,
        descuentoData.porcentaje_descuento,
        descuentoData.observacion
      );
      setShowDescuentoForm(false);
      setDescuentoData({ tipo_unidad: '', porcentaje_descuento: 0, observacion: '' });
      // Recargar contrato
      obtenerContrato(parseInt(id));
    }
  };

  const handleAgregarRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let rutaParaAgregar = rutaData;
    
    // Si es ruta común, cargar datos de la ruta seleccionada
    if (tipoRuta === 'comun' && rutaSeleccionada) {
      const rutaComun = RUTAS_COMUNES[parseInt(rutaSeleccionada)];
      rutaParaAgregar = { ...rutaData, origen: rutaComun.origen, destino: rutaComun.destino };
    }
    
    if (rutaParaAgregar.origen && rutaParaAgregar.destino) {
      // Verificar si la ruta ya existe
      const existe = contratoActual?.rutas?.some(r => 
        r.origen === rutaParaAgregar.origen && r.destino === rutaParaAgregar.destino
      );
      
      if (existe) {
        alert(`La ruta ${rutaParaAgregar.origen} → ${rutaParaAgregar.destino} ya existe`);
        return;
      }
      
      await agregarRuta(
        parseInt(id!),
        rutaParaAgregar.origen,
        rutaParaAgregar.destino,
        rutaParaAgregar.distancia_km || undefined,
        rutaParaAgregar.tipo_carga || undefined
      );
      setShowRutaForm(false);
      setRutaData({ origen: '', destino: '', distancia_km: 0, tipo_carga: '' });
      setTipoRuta('comun');
      setRutaSeleccionada('');
      obtenerContrato(parseInt(id!));
    } else {
      alert('Complete los campos requeridos');
    }
  };

  if (loading && !contratoActual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!contratoActual) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LogisticHeader userName={userName} userRole="Detalle Contrato" />
        <LogisticMenu />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">Contrato no encontrado</p>
          <button
            onClick={() => navigate('/logistico/contratos')}
            className="mt-4 text-orange-600 hover:text-orange-800"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const estadoInfo = getContratoEstadoInfo(contratoActual.estado);
  const saldoUsado = contratoActual.saldo_usado || 0;
  const creditoDisponible = contratoActual.limite_credito - saldoUsado;

  return (
    <div className="min-h-screen bg-gray-50">
      <LogisticHeader 
        userName={userName}
        userRole="Detalle de Contrato"
      />
      <LogisticMenu />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Mejorado */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate('/logistico/contratos')}
              className="flex items-center text-white hover:bg-orange-500 px-3 py-2 rounded-lg transition-colors"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">{contratoActual.numero_contrato}</h1>
              <p className="text-orange-100 mt-1"> {contratoActual.cliente_nombre}</p>
              <p className="text-orange-100 text-sm">NIT: {contratoActual.cliente_nit}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/logistico/contratos/${id}/editar`)}
            className="flex items-center px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold shadow-md"
          >
            <FaEdit className="h-4 w-4 mr-2" />
            Editar Contrato
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={limpiarError} className="text-red-700 hover:text-red-900">
              ×
            </button>
          </div>
        )}

        {/* Información General Mejorada */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* NIT Cliente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">NIT Cliente</p>
              <FaShieldAlt className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{contratoActual.cliente_nit || 'N/A'}</p>
          </div>
          
          {/* Vigencia */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Vigencia</p>
              <FaCalendarAlt className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm font-bold text-gray-900">{formatDate(contratoActual.fecha_inicio)}</p>
            <p className="text-xs text-gray-500">→ {formatDate(contratoActual.fecha_fin)}</p>
          </div>
          
          {/* Plazo de Pago */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Plazo Pago</p>
              <FaClock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{contratoActual.plazo_pago}</p>
            <p className="text-xs text-gray-500">días</p>
          </div>
          
          {/* Estado */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Estado</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${estadoInfo.bg} ${estadoInfo.color}`}>
                {estadoInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Crédito */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crédito Disponible</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Límite de Crédito</p>
              <p className="text-2xl font-bold text-blue-700">{formatMoney(contratoActual.limite_credito)}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Saldo Usado</p>
              <p className="text-2xl font-bold text-yellow-700">{formatMoney(saldoUsado)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Crédito Disponible</p>
              <p className="text-2xl font-bold text-green-700">{formatMoney(creditoDisponible)}</p>
            </div>
          </div>
        </div>

        {/* Tarifas Negociadas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarifas Negociadas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Costo por km</th>
                </tr>
              </thead>
              <tbody>
                {contratoActual.tarifas?.map((tarifa: TarifaNegociada, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{tarifa.tipo_unidad}</td>
                    <td className="px-4 py-2">{formatMoney(tarifa.costo_km_negociado)}/km</td>
                  </tr>
                ))}
                {(!contratoActual.tarifas || contratoActual.tarifas.length === 0) && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                      No hay tarifas negociadas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Descuentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Descuentos Aplicados</h2>
            <button
              onClick={() => setShowDescuentoForm(!showDescuentoForm)}
              className="text-orange-600 hover:text-orange-800 flex items-center text-sm"
            >
              <FaPlus className="h-3 w-3 mr-1" />
              Agregar Descuento
            </button>
          </div>
          
          {showDescuentoForm && (
            <form onSubmit={handleAgregarDescuento} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Unidad</label>
                  <select
                    value={descuentoData.tipo_unidad}
                    onChange={(e) => setDescuentoData({ ...descuentoData, tipo_unidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Seleccionar</option>
                    <option value="LIGERA">Ligera</option>
                    <option value="PESADA">Pesada</option>
                    <option value="CABEZAL">Cabezal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje Descuento (%)</label>
                  <input
                    type="number"
                    value={descuentoData.porcentaje_descuento}
                    onChange={(e) => setDescuentoData({ ...descuentoData, porcentaje_descuento: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                  <input
                    type="text"
                    value={descuentoData.observacion}
                    onChange={(e) => setDescuentoData({ ...descuentoData, observacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDescuentoForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}
          
          {contratoActual.descuentos && contratoActual.descuentos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo Unidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descuento</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {contratoActual.descuentos.map((desc, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{desc.tipo_unidad}</td>
                      <td className="px-4 py-2 text-green-600">{desc.porcentaje_descuento}%</td>
                      <td className="px-4 py-2 text-gray-500">{desc.observacion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay descuentos aplicados</p>
          )}
        </div>

        {/* Rutas Autorizadas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Rutas Autorizadas</h2>
            <button
              onClick={() => setShowRutaForm(!showRutaForm)}
              className="text-orange-600 hover:text-orange-800 flex items-center text-sm"
            >
              <FaPlus className="h-3 w-3 mr-1" />
              Agregar Ruta
            </button>
          </div>
          
          {showRutaForm && (
            <form onSubmit={handleAgregarRuta} className="mb-4 p-4 bg-gray-50 rounded-lg">
              {/* Tabs: Ruta Común o Personalizada */}
              <div className="flex space-x-4 mb-4 border-b border-gray-300">
                <button
                  type="button"
                  onClick={() => setTipoRuta('comun')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tipoRuta === 'comun'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ruta Común (6 habituales)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoRuta('personalizada')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tipoRuta === 'personalizada'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ruta Personalizada
                </button>
              </div>

              {tipoRuta === 'comun' ? (
                // Seleccionar ruta común
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona una ruta</label>
                  <select
                    value={rutaSeleccionada}
                    onChange={(e) => setRutaSeleccionada(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">- Seleccionar una ruta -</option>
                    {RUTAS_COMUNES.map((ruta, idx) => (
                      <option key={idx} value={idx}>
                        {ruta.origen} → {ruta.destino}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                // Ingresar ruta personalizada
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origen *</label>
                    <input
                      type="text"
                      value={rutaData.origen}
                      onChange={(e) => setRutaData({ ...rutaData, origen: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="ej: Escuintla"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                    <input
                      type="text"
                      value={rutaData.destino}
                      onChange={(e) => setRutaData({ ...rutaData, destino: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="ej: Cobán"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distancia (km)</label>
                  <input
                    type="number"
                    value={rutaData.distancia_km}
                    onChange={(e) => setRutaData({ ...rutaData, distancia_km: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Carga</label>
                  <select
                    value={rutaData.tipo_carga}
                    onChange={(e) => setRutaData({ ...rutaData, tipo_carga: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">- Seleccionar -</option>
                    {TIPOS_CARGA.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRutaForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}
          
          {contratoActual.rutas && contratoActual.rutas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Origen</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Destino</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Distancia</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {contratoActual.rutas.map((ruta: RutaAutorizada, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{ruta.origen}</td>
                      <td className="px-4 py-2">{ruta.destino}</td>
                      <td className="px-4 py-2">{ruta.distancia_km ? `${ruta.distancia_km} km` : '-'}</td>
                      <td className="px-4 py-2">{ruta.tipo_carga || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay rutas autorizadas</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContratoDetail;