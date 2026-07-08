/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  X, 
  Check, 
  Loader2, 
  Building, 
  User, 
  Phone, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  UserX, 
  CheckCircle 
} from "lucide-react";

interface Property {
  id: string;
  name: string;
  ownerName?: string;
  ownerPhone?: string;
  createdAt?: string;
}

interface PropertyDetails {
  property: Property;
  users: {
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  }[];
  paymentStatus: {
    house: string;
    status: "mora" | "al_dia";
    pendingMonthsCount: number;
    pendingMonths: string[];
    paidMonths: string[];
  };
}

export default function PropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [propertyName, setPropertyName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerPhone, setOwnerPhone] = useState<string>("");

  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editOwnerName, setEditOwnerName] = useState<string>("");
  const [editOwnerPhone, setEditOwnerPhone] = useState<string>("");

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Detail Modal / Sidebar State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

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

  const fetchPropertyDetails = async (id: string) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${id}/details`);
      if (res.ok) {
        const data = await res.json();
        setPropertyDetails(data);
      } else {
        const err = await res.json();
        setError(err.error || "No se pudo cargar los detalles del inmueble.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al cargar los detalles del inmueble.");
    } finally {
      setLoadingDetails(false);
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
        body: JSON.stringify({ 
          name: propertyName,
          ownerName: ownerName,
          ownerPhone: ownerPhone
        })
      });

      if (res.ok) {
        const newProp = await res.json();
        setProperties((prev) => [...prev, newProp]);
        setPropertyName("");
        setOwnerName("");
        setOwnerPhone("");
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
        body: JSON.stringify({ 
          name: editName,
          ownerName: editOwnerName,
          ownerPhone: editOwnerPhone
        })
      });

      if (res.ok) {
        const updatedProp = await res.json();
        setProperties((prev) =>
          prev.map((p) => (p.id === updatedProp.id ? updatedProp : p))
        );
        setSuccess(`Inmueble actualizado a "${updatedProp.name}" exitosamente.`);
        setEditingProperty(null);
        setEditName("");
        setEditOwnerName("");
        setEditOwnerPhone("");

        // If the updated property is the currently active detail view, reload details
        if (selectedPropertyId === updatedProp.id) {
          fetchPropertyDetails(updatedProp.id);
        }
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
        if (selectedPropertyId === id) {
          setSelectedPropertyId(null);
          setPropertyDetails(null);
        }
        if (editingProperty?.id === id) {
          setEditingProperty(null);
        }
      } else {
        const err = await res.json();
        setError(err.error || "Error al eliminar el inmueble.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al eliminar el inmueble.");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar definitivamente al usuario residente "${email}"? Esta acción no se puede deshacer y revocará su acceso a la residencial.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setSuccess(`Usuario residente "${email}" eliminado exitosamente.`);
        if (selectedPropertyId) {
          fetchPropertyDetails(selectedPropertyId);
        }
      } else {
        const err = await res.json();
        setError(err.error || "No se pudo eliminar el usuario.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red al intentar eliminar el usuario.");
    }
  };

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-black tracking-tight uppercase font-sans">
              Configuración de Inmuebles
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Gestione las propiedades residenciales (Casas / Lotes / Apts). Registre los encargados oficiales y acceda a detalles de residentes y estado de morosidad al instante.
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
                  Nombre del Inmueble / Lote / Casa *
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ej. Casa 101, Lote 25, Apto 3B"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Nombre del Encargado / Propietario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ej. Juan Pérez"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Teléfono del Encargado
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="ej. +503 7123-4567"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Registrar Inmueble
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="h-4 w-4 text-amber-500" /> Modificar Inmueble
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setEditName("");
                    setEditOwnerName("");
                    setEditOwnerPhone("");
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Editar Nombre de Inmueble *
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Nombre del Encargado
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Teléfono del Encargado
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={editOwnerPhone}
                    onChange={(e) => setEditOwnerPhone(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setEditName("");
                    setEditOwnerName("");
                    setEditOwnerPhone("");
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
                className="w-full text-xs pl-10 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 text-slate-900 font-medium"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Haga clic en la fila de cualquier inmueble para ver la información de contacto, residentes registrados y estado de solvencia.
          </p>

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
                    <th className="px-4 py-3">Encargado / Contacto</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredProperties.map((p) => {
                    const isSelected = selectedPropertyId === p.id;
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => {
                          setSelectedPropertyId(p.id);
                          fetchPropertyDetails(p.id);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-amber-50/70 hover:bg-amber-100/80 font-semibold" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                          <Home className={`h-4 w-4 ${isSelected ? "text-amber-500" : "text-slate-400"}`} />
                          <div>
                            <span className={isSelected ? "text-amber-950 font-extrabold" : "text-slate-900 font-semibold"}>
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.ownerName ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{p.ownerName}</span>
                              {p.ownerPhone && (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                  <Phone className="h-2.5 w-2.5" /> {p.ownerPhone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No asignado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingProperty(p);
                                setEditName(p.name);
                                setEditOwnerName(p.ownerName || "");
                                setEditOwnerPhone(p.ownerPhone || "");
                                setError(null);
                                setSuccess(null);
                              }}
                              className="p-1.5 hover:bg-amber-100 hover:text-amber-600 rounded-lg text-slate-400 transition-all cursor-pointer"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail view for selected property */}
      {selectedPropertyId && (
        <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-6 shadow-sm animate-fade-in space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-500 animate-pulse" />
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Detalles del Inmueble: {propertyDetails?.property.name || "Cargando..."}
              </h2>
            </div>
            <button
              onClick={() => {
                setSelectedPropertyId(null);
                setPropertyDetails(null);
              }}
              className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              <span className="ml-2 text-xs font-semibold text-slate-500">Obteniendo información consolidada...</span>
            </div>
          ) : propertyDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Encargado de Inmueble */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-amber-500" /> Información del Encargado
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Nombre Completo</span>
                    <span className="font-semibold text-slate-900">
                      {propertyDetails.property.ownerName || <span className="text-slate-400 italic">No asignado</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Teléfono de Contacto</span>
                    {propertyDetails.property.ownerPhone ? (
                      <a 
                        href={`tel:${propertyDetails.property.ownerPhone}`} 
                        className="font-mono font-bold text-amber-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" /> {propertyDetails.property.ownerPhone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No registrado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Estado de Solvencia */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Estado de Solvencia
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Estado de Pago</span>
                    {propertyDetails.paymentStatus.status === "al_dia" ? (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                        <CheckCircle className="h-4 w-4 text-emerald-600" /> Al Día / Solvente
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
                        <AlertCircle className="h-4 w-4 text-rose-600" /> En Mora
                      </div>
                    )}
                  </div>

                  {propertyDetails.paymentStatus.status === "mora" && (
                    <div>
                      <span className="block text-[10px] text-rose-500 font-bold uppercase flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" /> Meses Pendientes de Pago:
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {propertyDetails.paymentStatus.pendingMonths.map((month) => (
                          <span 
                            key={month} 
                            className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 font-mono"
                          >
                            {month}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {propertyDetails.paymentStatus.status === "al_dia" && (
                    <p className="text-[10px] text-slate-450 italic">
                      Este inmueble se encuentra solvente de todas las cuotas de mantenimiento emitidas hasta el mes en curso.
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: Residentes Registrados */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 md:col-span-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-amber-500" /> Usuarios Registrados ({propertyDetails.users.length})
                </h3>

                {propertyDetails.users.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-150">
                    <UserX className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-[11px] text-slate-450 italic">No hay residentes registrados.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {propertyDetails.users.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <span className="block text-[10px] font-bold text-slate-700 truncate">{user.username}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{user.role}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={user.id === "u_admin"}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Eliminar usuario definitivamente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-rose-500">Error al cargar la información.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
