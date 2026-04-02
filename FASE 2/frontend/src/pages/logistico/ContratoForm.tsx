// src/pages/logistico/ContratoForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { useContratos } from '../../services/Logistico/hooks/useContratos';
import { getTipoUnidadLabel, formatMoney } from '../../services/Logistico/Logistico';
import LogisticHeader from '../../components/logistico/LogisticHeader';
import LogisticMenu from '../../components/logistico/LogisticMenu';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { ContratoService } from '../../services/Logistico/Logistico';

interface TarifaForm {
  tarifario_id: number;
  costo_km_negociado: number;
  tipo_unidad: string;
}

interface RutaForm {
  origen: string;
  destino: string;
  distancia_km: number;
  tipo_carga: string;
  id?: number; // Para distinguir rutas existentes
}

interface TarifaFormConId extends TarifaForm {
  id?: number; // Para distinguir tarifas existentes
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

const ContratoForm: React.FC = () => {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const { user }  = useAuth();
  const {
    crearContrato,
    obtenerContrato,
    loading,
    error,
    limpiarError,
    tarifarios,
    loadingTarifarios
  } = useContratos();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    numero_contrato: '',
    cliente_id:      0,
    fecha_inicio:    '',
    fecha_fin:       '',
    limite_credito:  0,
    plazo_pago:      30,
    tarifas:         [] as TarifaFormConId[],
    rutas:           [] as RutaForm[]
  });

  const [nuevaTarifa, setNuevaTarifa] = useState<TarifaForm>({
    tarifario_id: 0, costo_km_negociado: 0, tipo_unidad: ''
  });

  const [nuevaRuta, setNuevaRuta] = useState<RutaForm>({
    origen: '', destino: '', distancia_km: 0, tipo_carga: ''
  });

  const [tipoRuta, setTipoRuta] = useState<'comun' | 'personalizada'>('comun');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>('');

  const [clientes, setClientes]               = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingSubmit, setLoadingSubmit]     = useState(false);
  const [success, setSuccess]                 = useState<string | null>(null);

  const userName = user?.nombres && user?.apellidos
    ? `${user.nombres} ${user.apellidos}`
    : user?.email?.split('@')[0] || 'Operador Logístico';

  // Cargar clientes corporativos
  useEffect(() => {
    const cargarClientes = async () => {
      setLoadingClientes(true);
      try {
        const response = await (apiService as any).request(
          '/usuarios?tipo_usuario=CLIENTE_CORPORATIVO',
          { method: 'GET' }
        );
        if (response.ok) setClientes(response.data);
      } catch (err) {
        console.error('Error al cargar clientes:', err);
      } finally {
        setLoadingClientes(false);
      }
    };
    cargarClientes();
  }, []);

  // Cargar próximo número de contrato
  useEffect(() => {
    const cargarNumeroContrato = async () => {
      try {
        const response = await apiService.obtenerProxNumeroContrato();
        if (response.ok && response.data?.numero_contrato) {
          setFormData(prev => ({
            ...prev,
            numero_contrato: response.data.numero_contrato
          }));
        }
      } catch (err) {
        console.error('Error al obtener número de contrato:', err);
      }
    };
    cargarNumeroContrato();
  }, []);

  // Cargar contrato si es edición
  useEffect(() => {
    if (isEdit && id) cargarContrato(parseInt(id));
  }, [isEdit, id]);

  const cargarContrato = async (contratoId: number) => {
    const contrato = await obtenerContrato(contratoId);
    if (contrato) {
      setFormData({
        numero_contrato: contrato.numero_contrato,
        cliente_id:      contrato.cliente_id,
        fecha_inicio:    contrato.fecha_inicio.split('T')[0],
        fecha_fin:       contrato.fecha_fin.split('T')[0],
        limite_credito:  contrato.limite_credito,
        plazo_pago:      contrato.plazo_pago,
        tarifas: contrato.tarifas?.map((t: any) => ({
          tarifario_id:       t.tarifario_id,
          costo_km_negociado: t.costo_km_negociado,
          tipo_unidad:        t.tipo_unidad,
          id:                 t.id // Marcar como existente
        })) || [],
        rutas: contrato.rutas?.map((r: any) => ({
          origen:       r.origen,
          destino:      r.destino,
          distancia_km: r.distancia_km || 0,
          tipo_carga:   r.tipo_carga || '',
          id:           r.id // Marcar como existente
        })) || []
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cliente_id' || name === 'limite_credito' || name === 'plazo_pago'
        ? Number(value) : value
    }));
  };

  const handleTarifarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tarifarioId           = parseInt(e.target.value);
    const tarifarioSeleccionado = tarifarios.find(t => t.id === tarifarioId);
    if (tarifarioSeleccionado) {
      setNuevaTarifa({
        tarifario_id:       tarifarioId,
        costo_km_negociado: tarifarioSeleccionado.costo_base_km,
        tipo_unidad:        tarifarioSeleccionado.tipo_unidad
      });
    }
  };

  const agregarTarifa = () => {
    if (nuevaTarifa.tarifario_id && nuevaTarifa.costo_km_negociado > 0) {
      const existe = formData.tarifas.some(t => t.tipo_unidad === nuevaTarifa.tipo_unidad);
      if (existe) {
        alert(`Ya existe una tarifa para ${getTipoUnidadLabel(nuevaTarifa.tipo_unidad)}`);
        return;
      }
      setFormData(prev => ({ ...prev, tarifas: [...prev.tarifas, { ...nuevaTarifa }] }));
      setNuevaTarifa({ tarifario_id: 0, costo_km_negociado: 0, tipo_unidad: '' });
    } else {
      alert('Seleccione un tipo de unidad y verifique el costo');
    }
  };

  const eliminarTarifa = (index: number) => {
    setFormData(prev => ({ ...prev, tarifas: prev.tarifas.filter((_, i) => i !== index) }));
  };

  const agregarRuta = () => {
    let rutaParaAgregar = nuevaRuta;
    
    // Si es ruta común, cargar datos de la ruta seleccionada
    if (tipoRuta === 'comun' && rutaSeleccionada) {
      const rutaComun = RUTAS_COMUNES[parseInt(rutaSeleccionada)];
      rutaParaAgregar = { ...nuevaRuta, origen: rutaComun.origen, destino: rutaComun.destino };
    }
    
    if (rutaParaAgregar.origen && rutaParaAgregar.destino) {
      // Verificar si la ruta ya existe
      const existe = formData.rutas.some(r => 
        r.origen === rutaParaAgregar.origen && r.destino === rutaParaAgregar.destino
      );
      
      if (existe) {
        alert(`La ruta ${rutaParaAgregar.origen} → ${rutaParaAgregar.destino} ya existe`);
        return;
      }
      
      setFormData(prev => ({ ...prev, rutas: [...prev.rutas, { ...rutaParaAgregar }] }));
      setNuevaRuta({ origen: '', destino: '', distancia_km: 0, tipo_carga: '' });
      setTipoRuta('comun');
      setRutaSeleccionada('');
    } else {
      alert('Complete los campos requeridos');
    }
  };

  const eliminarRuta = (index: number) => {
    setFormData(prev => ({ ...prev, rutas: prev.rutas.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && formData.tarifas.length === 0) {
      alert('Debe agregar al menos una tarifa negociada');
      return;
    }
    if (!formData.cliente_id || formData.cliente_id <= 0) {
      alert('Seleccione un cliente');
      return;
    }

    setLoadingSubmit(true);
    setSuccess(null);
    try {
      if (isEdit && id) {
        // Actualización del contrato base
        const payload = {
          fecha_inicio:   formData.fecha_inicio,
          fecha_fin:      formData.fecha_fin,
          limite_credito: formData.limite_credito,
          plazo_pago:     formData.plazo_pago,
          estado:         'VIGENTE'
        };
        await ContratoService.actualizar(parseInt(id), payload);

        // Agregar nuevas rutas (las que no tienen id)
        const rutasNuevas = formData.rutas.filter(r => !r.id);
        for (const ruta of rutasNuevas) {
          await ContratoService.agregarRuta(parseInt(id), {
            origen:       ruta.origen,
            destino:      ruta.destino,
            distancia_km: ruta.distancia_km || undefined,
            tipo_carga:   ruta.tipo_carga   || undefined
          });
        }

        // Mostrar mensaje de éxito
        setSuccess(' Contrato actualizado exitosamente');
        setTimeout(() => {
          navigate('/logistico/contratos');
        }, 2000); // Esperar 2 segundos antes de redirigir
      } else {
        // Crear nuevo contrato
        const payload = {
          numero_contrato: formData.numero_contrato,
          cliente_id:      formData.cliente_id,
          fecha_inicio:    formData.fecha_inicio,
          fecha_fin:       formData.fecha_fin,
          limite_credito:  formData.limite_credito,
          plazo_pago:      formData.plazo_pago,
          tarifas: formData.tarifas.map(t => ({
            tarifario_id:       t.tarifario_id,
            costo_km_negociado: t.costo_km_negociado
          })),
          rutas: formData.rutas.map(r => ({
            origen:       r.origen,
            destino:      r.destino,
            distancia_km: r.distancia_km || undefined,
            tipo_carga:   r.tipo_carga   || undefined
          }))
        };
        const result = await crearContrato(payload);
        if (result) {
          setSuccess(' Contrato creado exitosamente');
          setTimeout(() => {
            navigate('/logistico/contratos');
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Error al guardar contrato:', err);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LogisticHeader
        userName={userName}
        userRole={isEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
      />
      <LogisticMenu />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Modificar información del contrato' : 'Registrar un nuevo contrato de transporte'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={limpiarError} className="text-red-700 hover:text-red-900">×</button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex justify-between items-center animate-pulse">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Datos Principales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Contrato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Contrato *</label>
                <input
                  type="text"
                  name="numero_contrato"
                  value={formData.numero_contrato}
                  onChange={handleChange}
                  required
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-500 mt-1">Se genera automáticamente</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                {loadingClientes ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                    Cargando clientes...
                  </div>
                ) : (
                  <select
                    name="cliente_id"
                    value={formData.cliente_id}
                    onChange={handleChange}
                    required
                    disabled={isEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100"
                  >
                    <option value={0}>Seleccione un cliente...</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} — NIT: {cliente.nit}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
                <input
                  type="date" name="fecha_inicio" value={formData.fecha_inicio}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin *</label>
                <input
                  type="date" name="fecha_fin" value={formData.fecha_fin}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Límite de Crédito (GTQ) *</label>
                <input
                  type="number" name="limite_credito" value={formData.limite_credito}
                  onChange={handleChange} required step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plazo de Pago *</label>
                <select
                  name="plazo_pago" value={formData.plazo_pago}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
                >
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                  <option value={45}>45 días</option>
                </select>
              </div>

            </div>
          </div>

          {/* Tarifas Negociadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tarifas Negociadas</h2>
              {isEdit && formData.tarifas.length > 0 && (
                <p className="text-xs text-blue-600">
                  {formData.tarifas.filter(t => t.id).length} existentes
                </p>
              )}
            </div>

            {isEdit && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Las tarifas negociadas no pueden ser modificadas al editar un contrato existente. Solo se pueden agregar rutas autorizadas.
              </div>
            )}

            {formData.tarifas.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.tarifas.map((tarifa, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border-l-4 border-orange-500">
                    <div>
                      <span className="font-medium">{getTipoUnidadLabel(tarifa.tipo_unidad)}</span>
                      <span className="text-gray-500 ml-2">{formatMoney(tarifa.costo_km_negociado)}/km</span>
                      {tarifa.id && <span className="text-xs text-green-600 ml-2">(Existente)</span>}
                      {!tarifa.id && <span className="text-xs text-blue-600 ml-2">(Nueva)</span>}
                    </div>
                    {!isEdit && (
                      <button type="button" onClick={() => eliminarTarifa(index)} className="text-red-500 hover:text-red-700">
                        <FaTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isEdit && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidad *</label>
                  <select
                    value={nuevaTarifa.tarifario_id} onChange={handleTarifarioChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={loadingTarifarios}
                  >
                    <option value="">Seleccionar</option>
                    {tarifarios.map(t => (
                      <option key={t.id} value={t.id}>
                        {getTipoUnidadLabel(t.tipo_unidad)} - {formatMoney(t.costo_base_km)}/km (base)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo negociado por km (GTQ) *</label>
                  <input
                    type="number" value={nuevaTarifa.costo_km_negociado}
                    onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, costo_km_negociado: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01" placeholder="Ej: 7.50"
                  />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={agregarTarifa}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                  >
                    <FaPlus className="h-4 w-4 mr-2" />
                    Agregar Tarifa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rutas Autorizadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rutas Autorizadas (Opcional)</h2>
              {isEdit && formData.rutas.length > 0 && (
                <p className="text-xs text-blue-600">
                  {formData.rutas.filter(r => r.id).length} existentes, {formData.rutas.filter(r => !r.id).length} nuevas
                </p>
              )}
            </div>

            {isEdit && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                 Puedes agregar nuevas rutas autorizadas a este contrato.
              </div>
            )}

            {formData.rutas.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.rutas.map((ruta, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <div>
                      <span className="font-medium">{ruta.origen} → {ruta.destino}</span>
                      {ruta.distancia_km > 0 && <span className="text-gray-500 ml-2">{ruta.distancia_km} km</span>}
                      {ruta.tipo_carga && <span className="text-gray-500 ml-2">({ruta.tipo_carga})</span>}
                      {ruta.id && <span className="text-xs text-green-600 ml-2">(Existente)</span>}
                      {!ruta.id && <span className="text-xs text-blue-600 ml-2">(Nueva)</span>}
                    </div>
                    <button type="button" onClick={() => eliminarRuta(index)} className="text-red-500 hover:text-red-700">
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                    value={nuevaRuta.origen}
                    onChange={(e) => setNuevaRuta({ ...nuevaRuta, origen: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="ej: Escuintla"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <input
                    type="text"
                    value={nuevaRuta.destino}
                    onChange={(e) => setNuevaRuta({ ...nuevaRuta, destino: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="ej: Cobán"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distancia (km)</label>
                <input
                  type="number"
                  value={nuevaRuta.distancia_km}
                  onChange={(e) => setNuevaRuta({ ...nuevaRuta, distancia_km: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Carga</label>
                <select
                  value={nuevaRuta.tipo_carga}
                  onChange={(e) => setNuevaRuta({ ...nuevaRuta, tipo_carga: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">- Seleccionar -</option>
                  {TIPOS_CARGA.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={agregarRuta}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Agregar Ruta
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => navigate('/logistico/contratos')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <FaTimes className="h-4 w-4 mr-2" />
              Cancelar
            </button>
            <button type="submit" disabled={loading || loadingSubmit}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center disabled:opacity-50"
            >
              <FaSave className="h-4 w-4 mr-2" />
              {loading || loadingSubmit ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ContratoForm;