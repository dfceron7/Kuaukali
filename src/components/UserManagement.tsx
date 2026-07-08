/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "../types";
import { User as UserIcon, Shield, Mail, Home, Key, Trash2, ToggleLeft, ToggleRight, UserPlus, Search, Edit2, X, Eye, EyeOff } from "lucide-react";

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [house, setHouse] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<"resident" | "admin" | "vigilante">("resident");

  // Editing and Reset states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState<string>("");

  // Filter/Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Properties list state
  const [properties, setProperties] = useState<any[]>([]);

  // Password visibility states
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (e) {
      console.error("Error loading properties in UserManagement", e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setError(err.error || "No se pudo cargar la lista de usuarios.");
      }
    } catch (e) {
      console.error("Error loading users", e);
      setError("Error de red al cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProperties();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password || !house || !email || !role) {
      setError("Por favor, rellene todos los campos requeridos.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, house, email, role, isActive: true })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el usuario.");
      }

      setSuccess(`Usuario "${username}" creado exitosamente.`);
      setUsername("");
      setPassword("");
      setHouse("");
      setEmail("");
      setRole("resident");
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "No se pudo procesar la solicitud.");
    }
  };

  const handleStartEdit = (user: User) => {
    if (user.id === "u_admin") {
      alert("No se permite editar al Administrador de Sistema principal.");
      return;
    }
    setEditingUser(user);
    setUsername(user.username);
    setHouse(user.house);
    setEmail(user.email);
    setRole(user.role);
    setPassword(""); // leave blank for no change
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setUsername("");
    setHouse("");
    setEmail("");
    setRole("resident");
    setPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccess(null);

    if (!username || !house || !email || !role) {
      setError("Por favor, rellene todos los campos requeridos.");
      return;
    }

    try {
      const payload: any = { username, house, email, role };
      if (password) {
        payload.password = password;
      }
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar el usuario.");
      }

      setSuccess(`Usuario "${username}" actualizado exitosamente.`);
      handleCancelEdit();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar el usuario.");
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser.id) {
      alert("No puedes eliminar tu propio usuario de administrador.");
      return;
    }

    if (userToDelete.id === "u_admin") {
      alert("No se permite eliminar al Administrador de Sistema principal.");
      return;
    }

    const confirmDelete = window.confirm(`¿Está seguro de que desea eliminar DEFINITIVAMENTE al usuario "${userToDelete.username}"? Esta acción borrará su cuenta para siempre.`);
    if (!confirmDelete) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`Usuario "${userToDelete.username}" eliminado definitivamente.`);
        fetchUsers();
      } else {
        setError(data.error || "Error al eliminar el usuario.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red al intentar eliminar el usuario.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setError(null);
    setSuccess(null);

    if (resettingUser.id === "u_admin") {
      alert("No se permite restablecer clave temporal para el Administrador de Sistema principal.");
      return;
    }

    if (!tempPasswordInput || tempPasswordInput.trim().length < 3) {
      alert("La contraseña temporal debe tener al menos 3 caracteres.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${resettingUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempPassword: tempPasswordInput })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`Contraseña restablecida exitosamente para "${resettingUser.username}". El usuario iniciará sesión con la contraseña temporal "${tempPasswordInput}" y el sistema le solicitará cambiarla obligatoriamente.`);
        setResettingUser(null);
        setTempPasswordInput("");
        fetchUsers();
      } else {
        setError(data.error || "Error al restablecer la contraseña.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red.");
    }
  };

  const handleToggleActive = async (userToToggle: User) => {
    if (userToToggle.id === currentUser.id) {
      alert("No puedes inactivar tu propia cuenta de administrador en sesión.");
      return;
    }

    if (userToToggle.id === "u_admin") {
      alert("No se permite inactivar al Administrador de Sistema principal.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userToToggle.id}/toggle-active`, {
        method: "PATCH"
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Error al cambiar estado del usuario.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.house.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8" id="user-management-panel">
      
      {/* Upper Create/Edit User Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserPlus className="text-amber-500 h-5 w-5" />
            <h3 className="font-bold text-base font-sans">
              {editingUser ? `Editar Detalles del Usuario: ${editingUser.username}` : "Registrar y Crear Nuevo Usuario"}
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-350 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
            Solo Administradores
          </span>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-r-lg text-xs leading-relaxed mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-r-lg text-xs leading-relaxed mb-4">
              {success}
            </div>
          )}

          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="admin-create-username"
                  type="text"
                  placeholder="ej. casa501"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Identificador usado para iniciar sesión.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                {editingUser ? "Contraseña Nueva (Opcional)" : "Contraseña"}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="admin-create-password"
                  type={showAdminPassword ? "text" : "password"}
                  placeholder={editingUser ? "Dejar en blanco para no cambiar" : "ej. ClaveRes492"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                  required={!editingUser}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  title={showAdminPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {editingUser ? "Deje vacío para mantener la contraseña actual." : "Mínimo 3 caracteres recomendados."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Rol
              </label>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRole("resident");
                    if (!house || house === "Caseta de Vigilancia" || house === "Administración") {
                      setHouse("");
                    }
                  }}
                  className={`flex-1 text-xs py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                    role === "resident"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Residente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole("vigilante");
                    setHouse("Caseta de Vigilancia");
                  }}
                  className={`flex-1 text-xs py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                    role === "vigilante"
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Vigilante
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole("admin");
                    if (!house || house === "Caseta de Vigilancia") {
                      setHouse("Administración");
                    }
                  }}
                  className={`flex-1 text-xs py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                    role === "admin"
                      ? "bg-amber-500 border-amber-500 text-slate-950"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Admin
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Los residentes pueden reservar; los vigilantes controlan entradas; administradores regulan.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Inmueble / Lote / Casa
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 z-10" />
                {role === "resident" ? (
                  <select
                    id="admin-create-house"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar Inmueble --</option>
                    {properties
                      .filter((p) => p.name !== "Administración" && p.name !== "Caseta de Vigilancia")
                      .map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    id="admin-create-house"
                    type="text"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-500 focus:outline-hidden"
                    required
                    disabled={role === "vigilante"}
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Correo Electrónico
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="admin-create-email"
                    type="email"
                    placeholder="ej. casa501@kuaukali.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                    required
                  />
                </div>

                {editingUser && (
                  <button
                    id="btn-admin-cancel-edit"
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}

                <button
                  id="btn-admin-submit-user"
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer"
                >
                  {editingUser ? "Actualizar Usuario" : "Guardar Usuario"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Database User Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-sans">Padrón de Usuarios Residenciales ({filteredUsers.length})</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Administre la activación, roles y detalles de contacto para regular las solicitudes.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-users-admin"
              type="text"
              placeholder="Buscar usuario, casa o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Cargando directorio residencial...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">Ningún usuario coincide con su búsqueda.</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-slate-500 font-mono text-xs uppercase uppercase-tracking-wider">
                <tr>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/50 ${u.isActive === false ? "bg-slate-50 text-slate-450" : ""}`}>
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${u.isActive === false ? "bg-rose-450 animate-none" : "bg-emerald-500 animate-pulse"}`} />
                      <span>{u.username}</span>
                    </td>
                    <td className="px-6 py-4">{u.house}</td>
                    <td className="px-6 py-4 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        u.id === "u_admin"
                          ? "bg-amber-500 text-slate-950 ring-1 ring-amber-400"
                          : u.role === "admin"
                          ? "bg-amber-100 text-amber-900"
                          : u.role === "vigilante"
                          ? "bg-teal-100 text-teal-900"
                          : "bg-slate-100 text-slate-800"
                      }`}>
                        {u.id === "u_admin" ? "System Admin" : u.role === "admin" ? "Administrador" : u.role === "vigilante" ? "Vigilante" : "Residente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        u.isActive !== false
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                      }`}>
                        {u.isActive !== false ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Button */}
                        {u.id === "u_admin" ? (
                          <button
                            id={`btn-edit-user-${u.id}`}
                            disabled
                            className="bg-slate-50 text-slate-350 p-1.5 rounded-lg border border-slate-100 flex items-center space-x-1 cursor-not-allowed opacity-50"
                            title="El Administrador de Sistema principal no se puede editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold hidden lg:inline">Editar</span>
                          </button>
                        ) : (
                          <button
                            id={`btn-edit-user-${u.id}`}
                            onClick={() => handleStartEdit(u)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200 flex items-center space-x-1"
                            title="Editar detalles del usuario"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold hidden lg:inline">Editar</span>
                          </button>
                        )}

                        {/* Reset Password Button */}
                        {u.id === "u_admin" ? (
                          <button
                            id={`btn-reset-password-${u.id}`}
                            disabled
                            className="bg-slate-50 text-slate-350 p-1.5 rounded-lg border border-slate-100 flex items-center space-x-1 cursor-not-allowed opacity-50"
                            title="No se puede restablecer clave temporal para el Administrador de Sistema principal"
                          >
                            <Key className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold hidden lg:inline">Clave Temp</span>
                          </button>
                        ) : (
                          <button
                            id={`btn-reset-password-${u.id}`}
                            onClick={() => { setResettingUser(u); setTempPasswordInput(""); }}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 p-1.5 rounded-lg transition-colors cursor-pointer border border-amber-200 flex items-center space-x-1"
                            title="Restablecer contraseña temporal"
                          >
                            <Key className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold hidden lg:inline">Clave Temp</span>
                          </button>
                        )}

                        {/* Toggle Active Button */}
                        <button
                          id={`btn-toggle-active-${u.id}`}
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentUser.id || u.id === "u_admin"}
                          className={`text-[10px] font-bold px-2 py-1.5 rounded transition-colors select-none ${
                            u.id === currentUser.id || u.id === "u_admin"
                              ? "text-slate-300 bg-slate-150 cursor-not-allowed"
                              : u.isActive !== false
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-pointer"
                          }`}
                        >
                          {u.isActive !== false ? "Inactivar" : "Reactivar"}
                        </button>

                        {/* Definitive Delete Button */}
                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser.id || u.id === "u_admin"}
                          className={`p-1.5 rounded-lg transition-colors flex items-center ${
                            u.id === currentUser.id || u.id === "u_admin"
                              ? "text-slate-300 bg-slate-100 cursor-not-allowed opacity-50"
                              : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                          }`}
                          title={u.id === "u_admin" ? "El Administrador de Sistema principal no se puede eliminar" : "Eliminar definitivamente"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <h4 className="font-bold text-sm">Restablecer Contraseña Temporal</h4>
              <button
                type="button"
                onClick={() => { setResettingUser(null); setTempPasswordInput(""); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Asigne una contraseña temporal para el usuario <strong>{resettingUser.username}</strong>. Al iniciar sesión con esta contraseña, el sistema le solicitará cambiarla inmediatamente por una contraseña definitiva.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Contraseña Temporal Nueva
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    placeholder="ej. Temp123"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-amber-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                    title={showResetPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Mínimo 3 caracteres.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setResettingUser(null); setTempPasswordInput(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Establecer Temporal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
