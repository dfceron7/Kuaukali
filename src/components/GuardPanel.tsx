/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, VisitorPass } from "../types";
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  XCircle, 
  Calendar, 
  Users, 
  Clock, 
  Home, 
  ListFilter,
  CheckCircle,
  FileText,
  BellRing,
  RefreshCw
} from "lucide-react";

interface GuardPanelProps {
  currentUser: User;
}

export default function GuardPanel({ currentUser }: GuardPanelProps) {
  const [searchCode, setSearchCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<VisitorPass | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Verification form
  const [notes, setNotes] = useState<string>("");
  
  // All passes feed for monitoring
  const [recentPasses, setRecentPasses] = useState<VisitorPass[]>([]);
  const [feedLoading, setFeedLoading] = useState<boolean>(false);

  const fetchRecentPasses = async () => {
    setFeedLoading(true);
    try {
      const res = await fetch("/api/visitor-passes");
      if (res.ok) {
        const data = await res.json();
        // Sort by creation date descending to see newest registrations first
        const sorted = data.sort(
          (a: VisitorPass, b: VisitorPass) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentPasses(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentPasses();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/visitor-passes/search/${encodeURIComponent(searchCode.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        const err = await res.json();
        setSearchError(err.error || "Código de pase no válido o no encontrado.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Error de comunicación con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (action: "approved" | "rejected") => {
    if (!searchResult) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/visitor-passes/${searchResult.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardId: currentUser.id,
          guardName: currentUser.username,
          action,
          notes: notes.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        if (action === "approved") {
          setActionSuccess(
            `¡INGRESO AUTORIZADO! Se ha enviado una notificación en tiempo real a los residentes de la ${searchResult.house} sobre el ingreso de ${searchResult.firstName} ${searchResult.lastName}.`
          );
        } else {
          setActionSuccess(
            `Ingreso Rechazado. Se ha registrado el rechazo de entrada para ${searchResult.firstName} ${searchResult.lastName} en el historial de la ${searchResult.house}.`
          );
        }

        // Reset inputs
        setNotes("");
        setSearchCode("");
        setSearchResult(data.pass); // update UI with fresh data (increased counters/logs)
        fetchRecentPasses(); // refresh live log feed
      } else {
        const err = await res.json();
        setSearchError(err.error || "Ocurrió un error al procesar el ingreso.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Error de red.");
    } finally {
      setLoading(false);
    }
  };

  const selectPassFromFeed = (pass: VisitorPass) => {
    setSearchResult(pass);
    setSearchCode(pass.passCode);
    setSearchError(null);
    setActionSuccess(null);
    setNotes("");
  };

  return (
    <div className="space-y-8" id="guard-panel-root">
      
      {/* Banner / Header */}
      <div className="bg-teal-900 rounded-2xl p-6 text-white border border-teal-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-md">
              Módulo de Vigilancia Activa
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-1 bg-teal-850 text-white font-semibold rounded-md border border-teal-700">
              Oficial: {currentUser.username}
            </span>
          </div>
          <h2 className="text-xl font-bold font-sans mt-3 text-white">
            Portal de Control de Accesos - Caseta Principal KuauKali
          </h2>
          <p className="text-xs text-teal-100 leading-relaxed max-w-2xl mt-1">
            Utilice este panel para buscar y comprobar pases de visita generados por los residentes de Residencial KuauKali. Al autorizar un ingreso válido, el propietario recibirá un correo instantáneo detallando la llegada de su invitado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Verification Engine */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="text-teal-600 h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-900 font-sans">Escanear o Ingresar Código de Pase</h3>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-450" />
                <input
                  id="guard-search-code"
                  type="text"
                  placeholder="Ingrese el código de acceso (ej. KK-123456 o use lector)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full text-xs pl-11 pr-3 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-teal-500 text-slate-900 font-mono placeholder:font-sans uppercase font-bold"
                />
              </div>
              <button
                id="btn-guard-search"
                type="submit"
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1.5 cursor-pointer disabled:bg-slate-300 select-none"
              >
                {loading ? "Validando..." : "Verificar Pase"}
              </button>
            </form>

            {searchError && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl text-xs flex items-start space-x-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">¡PASE NO RECONOCIDO!</strong>
                  <p className="mt-0.5">{searchError}</p>
                </div>
              </div>
            )}

            {actionSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl text-xs flex items-start space-x-2.5">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold">TRANSACCIÓN COMPLETADA</strong>
                  <p>{actionSuccess}</p>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-700 pt-1">
                    <BellRing className="h-3 w-3 animate-bounce" />
                    <span>Alerta enviada automáticamente a los propietarios.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Detail Card */}
            {searchResult && (
              <div className="border border-slate-250/80 rounded-2xl p-5 bg-slate-50/50 space-y-6">
                
                {/* Banner status check */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Estatus del Pase</span>
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      searchResult.status === "active"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse"
                        : searchResult.status === "used"
                        ? "bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-rose-100 text-rose-800 border-rose-200"
                    }`}>
                      {searchResult.status === "active" ? "✓ Pase Activo y Válido" : searchResult.status === "used" ? "⚠ Pase Ya Utilizado" : "✗ Pase Vencido"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Código Único</span>
                    <span className="font-mono font-black text-slate-900 text-base">{searchResult.passCode}</span>
                  </div>
                </div>

                {/* Main Guest details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-450 block">Nombre del Invitado:</span>
                        <strong className="text-slate-900 text-sm">{searchResult.firstName} {searchResult.lastName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-450 block">Lote / Casa de Destino:</span>
                        <strong className="text-slate-900 text-sm">{searchResult.house}</strong>
                        <span className="text-[10px] text-slate-500 block">Propietario: {searchResult.userName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-450 block">Fecha Programada de Entrada:</span>
                        <strong className="text-slate-800 text-xs">
                          {searchResult.entryDate} {searchResult.entryDate === new Date().toISOString().split("T")[0] ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md ml-1.5 font-mono uppercase">Hoy</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md ml-1.5 font-mono uppercase">Diferente</span>
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-450 block">Cantidad de Personas:</span>
                        <strong className="text-slate-800 text-xs">{searchResult.peopleCount} Persona(s)</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="text-[9px] uppercase font-mono text-slate-450 block">Ingresos del Pase:</span>
                        <strong className="text-slate-800 text-xs">{searchResult.entriesUsed} / {searchResult.maxEntries === 99 ? "Ilimitados" : searchResult.maxEntries} consumidos</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Guard Action Center */}
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center space-x-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Observaciones / Registro del Guardia (Opcional):</span>
                    </label>
                    <input
                      id="guard-notes"
                      type="text"
                      placeholder={searchResult.status === "active" ? "ej. Placas P-34928A, taxi, entrega DUI/Licencia, etc." : "Registro de pase cerrado"}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={searchResult.status !== "active"}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-100 disabled:bg-slate-100/60 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-hidden focus:border-teal-500 text-slate-900"
                    />
                  </div>

                  {searchResult.status !== "active" && (
                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                      <strong>Nota Informativa:</strong> Este pase ya ha sido procesado (utilizado, rechazado o vencido) y su estado actual es definitivo. No se permiten modificaciones ni acciones de aprobación/rechazo adicionales.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <button
                      id="btn-guard-reject"
                      onClick={() => handleVerify("rejected")}
                      disabled={loading || searchResult.status !== "active"}
                      className={`py-3 rounded-xl transition-all flex items-center justify-center space-x-2 select-none ${
                        searchResult.status === "active"
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Rechazar Entrada</span>
                    </button>
                    
                    <button
                      id="btn-guard-approve"
                      onClick={() => handleVerify("approved")}
                      disabled={loading || searchResult.status !== "active"}
                      className={`py-3 rounded-xl transition-all flex items-center justify-center space-x-2 select-none ${
                        searchResult.status === "active"
                          ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Aprobar Entrada</span>
                    </button>
                  </div>

                </div>

                {/* Historical Log list for this specific pass */}
                {searchResult.logs && searchResult.logs.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-2">Logs de Verificación del Pase:</span>
                    <div className="space-y-2">
                      {searchResult.logs.map((log, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-150 flex justify-between items-center text-xs font-sans">
                          <div>
                            <span className="font-bold text-slate-800">Oficial: {log.guardName}</span>
                            <span className="text-slate-400 block text-[10px]">{new Date(log.timestamp).toLocaleString("es-ES")}</span>
                            {log.notes && <span className="text-slate-500 italic block mt-0.5">"{log.notes}"</span>}
                          </div>
                          <span className={`px-2.5 py-0.5 font-black uppercase rounded-md text-[9px] ${
                            log.action === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {log.action === "approved" ? "Ingresó" : "Rechazado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

        {/* Live Gate Monitoring Feed */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <ListFilter className="text-teal-600 h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-900 font-sans">Pases Creados / Feed</h3>
              </div>
              <button
                onClick={fetchRecentPasses}
                disabled={feedLoading}
                className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center space-x-1 cursor-pointer font-semibold font-mono"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${feedLoading ? "animate-spin" : ""}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {feedLoading && recentPasses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">Cargando feed...</div>
            ) : recentPasses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No hay pases de visitas activos registrados.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
                {recentPasses.map((pass) => (
                  <div
                    key={pass.id}
                    onClick={() => selectPassFromFeed(pass)}
                    className="p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer space-y-2 font-sans"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 text-xs block">{pass.firstName} {pass.lastName}</strong>
                        <span className="text-[10px] text-slate-500">Destino: <strong className="text-slate-700">{pass.house}</strong></span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                        pass.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {pass.status === "active" ? "Activo" : pass.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-450 border-t border-slate-100 pt-1.5">
                      <span>Cód: <strong className="text-slate-700">{pass.passCode}</strong></span>
                      <span>{pass.entriesUsed} / {pass.maxEntries === 99 ? "∞" : pass.maxEntries} Usados</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
