import React, { useState, useEffect } from 'react';
import {
  FaUsers,
  FaSearch,
  FaSync,
  FaEdit,
  FaTrash,
  FaEye,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
} from 'react-icons/fa';
import LogisticHeader from '../../components/logistico/LogisticHeader';
import LogisticMenu from '../../components/logistico/LogisticMenu';
import { useClientes, type Cliente } from '../../services/Logistico/hooks/useClientes';
import { formatDate } from '../../services/Logistico/Logistico';

interface FilterOptions {
  searchTerm: string;
  tipo_usuario: string;
  estado: string;
}

const ClientesList: React.FC = () => {
  const { clientes, loading, error, listarClientes, modificarCliente, cambiarEstadoCliente, limpiarError } = useClientes();
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    tipo_usuario: '',
    estado: 'ACTIVO',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Partial<Cliente> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Cargar clientes al montar el componente
  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    await listarClientes({
      tipo_usuario: filters.tipo_usuario || undefined,
      estado: filters.estado || undefined,
      nombre: filters.searchTerm || undefined,
    });
  };

  // Cuando cambian los filtros principales, recargar
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.tipo_usuario, filters.estado]);

  // Filtrar clientes por búsqueda local
  const clientesFiltrados = clientes.filter(cliente => {
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      cliente.nombre?.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.nit?.toLowerCase().includes(searchLower)
    );
  });

  const tiposUsuario = [
    { value: '', label: 'Todos los tipos' },
    { value: 'CLIENTE_CORPORATIVO', label: 'Cliente Corporativo' },
    { value: 'AGENTE_OPERATIVO', label: 'Agente Operativo' },
    { value: 'AGENTE_LOGISTICO', label: 'Agente Logístico' },
    { value: 'AGENTE_FINANCIERO', label: 'Agente Financiero' },
    { value: 'ENCARGADO_PATIO', label: 'Encargado de Patio' },
    { value: 'AREA_CONTABLE', label: 'Área Contable' },
    { value: 'GERENCIA', label: 'Gerencia' },
    { value: 'PILOTO', label: 'Piloto' },
  ];

  const estadosCliente = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
    { value: 'SUSPENDIDO', label: 'Suspendido' },
  ];

  const handleViewDetail = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleEditClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditingCliente({ ...cliente });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditingCliente(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSaveEdit = async () => {
    if (!selectedCliente?.id || !editingCliente) return;
    
    setEditLoading(true);
    setEditError(null);
    try {
      await modificarCliente(selectedCliente.id, editingCliente);
      await cargarClientes();
      setShowEditModal(false);
      setSelectedCliente(null);
      setEditingCliente(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCliente?.id) return;
    
    setEditLoading(true);
    setEditError(null);
    try {
      await cambiarEstadoCliente(selectedCliente.id, 'INACTIVO', 'Cliente eliminado por usuario');
      await cargarClientes();
      setShowDeleteConfirm(false);
      setSelectedCliente(null);
      setShowDetailModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setEditLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      ACTIVO: { bg: 'bg-green-100', text: 'text-green-800', icon: <FaCheckCircle /> },
      INACTIVO: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <FaTimesCircle /> },
      SUSPENDIDO: { bg: 'bg-red-100', text: 'text-red-800', icon: <FaTimesCircle /> },
    };

    const badge = badges[estado] || badges['INACTIVO'];
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        <span>{estado}</span>
      </span>
    );
  };

  const getTipoUsuarioBadge = (tipo: string) => {
    const badges: Record<string, { bg: string; label: string }> = {
      CLIENTE_CORPORATIVO: { bg: 'bg-blue-100 text-blue-800', label: 'Cliente Corporativo' },
      AGENTE_OPERATIVO: { bg: 'bg-green-100 text-green-800', label: 'Agente Operativo' },
      AGENTE_LOGISTICO: { bg: 'bg-indigo-100 text-indigo-800', label: 'Agente Logístico' },
      AGENTE_FINANCIERO: { bg: 'bg-yellow-100 text-yellow-800', label: 'Agente Financiero' },
      ENCARGADO_PATIO: { bg: 'bg-orange-100 text-orange-800', label: 'Encargado de Patio' },
      AREA_CONTABLE: { bg: 'bg-cyan-100 text-cyan-800', label: 'Área Contable' },
      GERENCIA: { bg: 'bg-red-100 text-red-800', label: 'Gerencia' },
      PILOTO: { bg: 'bg-purple-100 text-purple-800', label: 'Piloto' },
    };

    const badge = badges[tipo] || { bg: 'bg-gray-100 text-gray-800', label: tipo };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badge.bg}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <>
      <LogisticHeader />
      <LogisticMenu />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Encabezado */}
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaUsers className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
                <p className="text-gray-600 mt-1">
                  Total: {clientesFiltrados.length} cliente(s)
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              <button
                onClick={limpiarError}
                className="ml-4 underline hover:no-underline"
              >
                Descartar
              </button>
            </div>
          )}

          {/* Búsqueda y Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 gap-4">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, NIT..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    showFilters
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FaFilter />
                  <span>Filtros</span>
                </button>

                <button
                  onClick={cargarClientes}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                  <FaSync className={loading ? 'animate-spin' : ''} />
                  <span>Recargar</span>
                </button>
              </div>
            </div>

            {/* Filtros expandibles */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cliente
                  </label>
                  <select
                    value={filters.tipo_usuario}
                    onChange={(e) =>
                      setFilters({ ...filters, tipo_usuario: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tiposUsuario.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) =>
                      setFilters({ ...filters, estado: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {estadosCliente.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Clientes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading && clientesFiltrados.length === 0 ? (
              <div className="p-8 text-center">
                <FaSync className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Cargando clientes...</p>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="p-8 text-center">
                <FaUsers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No hay clientes para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        NIT / Documento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientesFiltrados.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {cliente.nombre}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <a
                              href={`mailto:${cliente.email}`}
                              className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <FaEnvelope className="h-4 w-4" />
                              <span>{cliente.email}</span>
                            </a>
                            {cliente.telefono && (
                              <a
                                href={`tel:${cliente.telefono}`}
                                className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                              >
                                <FaPhone className="h-4 w-4" />
                                <span>{cliente.telefono}</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-600">{cliente.nit}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTipoUsuarioBadge(cliente.tipo_usuario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEstadoBadge(cliente.estado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetail(cliente)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Ver detalle"
                            >
                              <FaEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(cliente)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="Editar"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cliente)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detalle del Cliente</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <p className="text-gray-900">
                    {selectedCliente.nombre}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIT / Documento
                  </label>
                  <p className="text-gray-900 font-mono">{selectedCliente.nit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 break-all">{selectedCliente.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <p className="text-gray-900">{selectedCliente.telefono || 'No registrado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cliente
                  </label>
                  <p>{getTipoUsuarioBadge(selectedCliente.tipo_usuario)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <p>{getEstadoBadge(selectedCliente.estado)}</p>
                </div>
              </div>

              {selectedCliente.fecha_creacion && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Creación
                    </label>
                    <p className="text-gray-900">{formatDate(selectedCliente.fecha_creacion)}</p>
                  </div>
                  {selectedCliente.fecha_actualizacion && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Última Actualización
                      </label>
                      <p className="text-gray-900">{formatDate(selectedCliente.fecha_actualizacion)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  handleEditClick(selectedCliente!);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Editar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && editingCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Editar Cliente</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {editError && (
              <div className="m-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {editError}
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editingCliente.nombre || ''}
                    onChange={(e) => handleEditChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIT
                  </label>
                  <input
                    type="text"
                    value={editingCliente.nit || ''}
                    onChange={(e) => handleEditChange('nit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingCliente.email || ''}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editingCliente.telefono || ''}
                    onChange={(e) => handleEditChange('telefono', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Usuario
                  </label>
                  <select
                    value={editingCliente.tipo_usuario || ''}
                    onChange={(e) => handleEditChange('tipo_usuario', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tiposUsuario.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={editingCliente.estado || ''}
                    onChange={(e) => handleEditChange('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {estadosCliente.map(estado => (
                      <option key={estado.value} value={estado.value}>{estado.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <h2 className="text-lg font-bold text-red-900">Confirmar eliminación</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-2">
                ¿Estás seguro de que deseas eliminar (inactivar) el siguiente cliente?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{selectedCliente.nombre}</p>
                <p className="text-sm text-gray-600">{selectedCliente.email}</p>
                <p className="text-sm text-gray-600">NIT: {selectedCliente.nit}</p>
              </div>
              <p className="text-sm text-gray-600">
                Esta acción cambiará el estado del cliente a INACTIVO y no podrá ser revertida fácilmente.
              </p>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={editLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={editLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {editLoading ? 'Eliminando...' : 'Eliminar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientesList;
