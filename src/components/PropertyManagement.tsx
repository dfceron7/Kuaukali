/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Home, Plus, Trash2, Edit2, Search, X, Check, Loader2, Building } from "lucide-react";

interface Property {
  id: string;
  name: string;
  createdAt?: string;
}

export default function PropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [propertyName, setPropertyName] = useState<string>("");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editName, setEditName] = useState<string>("");

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      } else {
        const err = await res.json();
        setError(err.error || "No se pudo cargar la lista de inmuebles.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al cargar inmuebles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!propertyName.trim()) {
      setError("El nombre del inmueble no puede estar vacío.");
      return;
    }

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: propertyName })
      });

      if (res.ok) {
        const newProp = await res.json();
        setProperties((prev) => [...prev, newProp]);
        setPropertyName("");
        setSuccess(`Inmueble "${newProp.name}" creado exitosamente.`);
      } else {
        const err = await res.json();
        setError(err.error || "Error al crear el inmueble.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al crear el inmueble.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!editingProperty) return;
    if (!editName.trim()) {
      setError("El nombre del inmueble no puede estar vacío.");
      return;
    }

    try {
      const res = await fetch(`/api/properties/${editingProperty.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName })
      });

      if (res.ok) {
        const updatedProp = await res.json();
        setProperties((prev) =>
          prev.map((p) => (p.id === updatedProp.id ? updatedProp : p))
        );
        setSuccess(`Inmueble actualizado a "${updatedProp.name}" exitosamente.`);
        setEditingProperty(null);
        setEditName("");
      } else {
        const err = await res.json();
        setError(err.error || "Error al actualizar el inmueble.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al actualizar el inmueble.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar el inmueble "${name}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
        setSuccess(`Inmueble "${name}" eliminado exitosamente.`);
      } else {
        const err = await res.json();
        setError(err.error || "Error al eliminar el inmueble.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al eliminar el inmueble.");
    }
  };

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-black tracking-tight uppercase font-sans">
              Configuración de Inmuebles
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Configure las propiedades de la residencial (Inmuebles / Lotes / Casas). Estos aparecerán como opciones en los desplegables de registro de residentes.
          </p>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl text-xs font-semibold shadow-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-xl text-xs font-semibold shadow-xs">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Creation / Edit Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
          {!editingProperty ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Plus className="h-4 w-4 text-emerald-600" /> Agregar Inmueble
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Nombre del Inmueble / Lote / Casa
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ej. Casa 101, Lote 25, Apto 3B"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ingrese un identificador único para la propiedad de la residencial.
                </p>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Registrar Inmueble
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Edit2 className="h-4 w-4 text-amber-500" /> Modificar Inmueble
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Editar Nombre de Inmueble
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Al cambiar el nombre, se actualizarán todos los residentes, visitas y pagos vinculados.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setEditName("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Guardar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: List and Search Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4 text-slate-600" /> Listado de Inmuebles ({properties.length})
            </h2>
            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar inmueble..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 text-slate-900"
              />
            </div>
          </div>

          {loading && properties.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-slate-500 animate-spin" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Home className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">
                {searchTerm ? "No se encontraron inmuebles que coincidan con la búsqueda." : "No hay inmuebles registrados."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Inmueble / Lote / Casa</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredProperties.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <Home className="h-3.5 w-3.5 text-slate-400" />
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProperty(p);
                              setEditName(p.name);
                              setError(null);
                              setSuccess(null);
                            }}
                            className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                            title="Eliminar"
                            disabled={p.name === "Administración"}
                          >
                            <Trash2 className="h-4 w-4" />
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
  );
}
