// src/components/client/ModalNuevaOrden.tsx
import React, { useState } from "react";
import type { RutaAutorizada } from "../../services/api";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  rutas: RutaAutorizada[];
  onSubmit: (data: any) => Promise<void>;
}

const ModalNuevaOrden: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  rutas,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    ruta_idx: "",
    tipo_mercancia: "",
    peso_estimado: "",
    comentarios: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rutaSeleccionada = rutas[parseInt(formData.ruta_idx)];

    await onSubmit({
      origen: rutaSeleccionada.origen,
      destino: rutaSeleccionada.destino,
      tipo_mercancia: formData.tipo_mercancia,
      peso_estimado: parseFloat(formData.peso_estimado),
      comentarios: formData.comentarios,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
          <h3 className="text-lg font-bold text-orange-900">
            Solicitar Nueva Orden
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ruta Autorizada
            </label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
              value={formData.ruta_idx}
              onChange={(e) =>
                setFormData({ ...formData, ruta_idx: e.target.value })
              }
            >
              <option value="">Seleccione una ruta...</option>
              {rutas.map((ruta, index) => (
                <option key={index} value={index}>
                  {ruta.origen} → {ruta.destino} (
                  {ruta.tipo_carga || "Carga General"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Mercancía
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Alimentos"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.tipo_mercancia}
                onChange={(e) =>
                  setFormData({ ...formData, tipo_mercancia: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso Est. (kg)
              </label>
              <input
                type="number"
                required
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.peso_estimado}
                onChange={(e) =>
                  setFormData({ ...formData, peso_estimado: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium shadow-sm transition-all"
            >
              Confirmar Orden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevaOrden;
