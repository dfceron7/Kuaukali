/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, VisitorPass } from "../types";
import { 
  UserPlus, 
  Calendar, 
  Users, 
  QrCode, 
  Download, 
  Printer, 
  Check, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Trash2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Bell,
  BellRing
} from "lucide-react";

interface VisitorManagementProps {
  currentUser: User;
  passes?: VisitorPass[];
  notificationPermission?: string;
  onRequestPermission?: () => Promise<void>;
  onResetPermission?: () => void;
  onRefreshPasses?: () => Promise<void>;
}

export default function VisitorManagement({ 
  currentUser, 
  passes: propPasses, 
  notificationPermission,
  onRequestPermission,
  onResetPermission,
  onRefreshPasses 
}: VisitorManagementProps) {
  const [localPasses, setLocalPasses] = useState<VisitorPass[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passes = propPasses !== undefined ? propPasses : localPasses;

  // Form state
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [maxEntries, setMaxEntries] = useState<number>(1);
  const [peopleCount, setPeopleCount] = useState<number>(1);

  // Active viewing pass
  const [selectedPass, setSelectedPass] = useState<VisitorPass | null>(null);

  const fetchPasses = async () => {
    if (onRefreshPasses) {
      await onRefreshPasses();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/visitor-passes?userId=${currentUser.id}&role=${currentUser.role}`);
      if (res.ok) {
        const data = await res.json();
        setLocalPasses(data);
      } else {
        setError("Error al cargar los pases de visita.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de red.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propPasses === undefined) {
      fetchPasses();
    }
  }, [currentUser, propPasses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName || !lastName || !entryDate) {
      setError("Por favor, rellene todos los campos requeridos.");
      return;
    }

    try {
      const res = await fetch("/api/visitor-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.username,
          house: currentUser.house,
          firstName,
          lastName,
          entryDate,
          maxEntries,
          peopleCount
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`Pase de visita creado para ${firstName} ${lastName}.`);
        setFirstName("");
        setLastName("");
        setEntryDate(new Date().toISOString().split("T")[0]);
        setMaxEntries(1);
        setPeopleCount(1);
        
        // Auto-select newly created pass to show the QR popup
        setSelectedPass(data);
        fetchPasses();
      } else {
        const err = await res.json();
        setError(err.error || "No se pudo registrar el pase de visita.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red.");
    }
  };

  // Simulated printing or downloading
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8" id="visitor-management-resident">
      
      {/* Intro Header */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-md">
            Módulo de Visitas KuauKali
          </span>
          <h2 className="text-xl font-bold font-sans mt-3 text-slate-100">
            Registro de Invitados y Control de Accesos
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl mt-1">
            Genere pases de ingreso temporales con códigos de acceso únicos para sus familiares, amigos o personal de servicio. Los guardias de seguridad en caseta escanearán el código para autorizar la entrada, y usted recibirá una notificación de ingreso inmediata por correo.
          </p>
        </div>
        <div className="absolute right-6 bottom-0 top-0 w-36 h-full opacity-10 flex items-center justify-center">
          <QrCode className="h-28 w-28 text-white" />
        </div>
      </div>

      {/* Native Browser Notification Permission Prompt */}
      {notificationPermission === "default" && onRequestPermission && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shrink-0">
              <BellRing className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                ¡Recibe Alertas de Visitas en Tiempo Real!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Activa las notificaciones del navegador para recibir un aviso al instante cuando tus invitados y visitas ingresen por la caseta principal de vigilancia.
              </p>
            </div>
          </div>
          <button
            id="btn-enable-browser-notifications-visitors"
            onClick={onRequestPermission}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors border border-slate-800 select-none text-center"
          >
            🔔 Activar Notificaciones
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pass Creator Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <UserPlus className="text-amber-500 h-5 w-5" />
            <h3 className="font-bold text-sm text-slate-900 font-sans">Crear Pase de Visita</h3>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-r-lg text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-r-lg text-xs">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">
                Nombre(s) del Visitante
              </label>
              <input
                id="visitor-firstname"
                type="text"
                placeholder="ej. Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-3 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">
                Apellido(s) del Visitante
              </label>
              <input
                id="visitor-lastname"
                type="text"
                placeholder="ej. Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full pl-3 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">
                Fecha programada de ingreso
              </label>
              <div className="relative">
                <input
                  id="visitor-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  Ingresos Permitidos
                </label>
                <select
                  id="visitor-max-entries"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                >
                  <option value={1}>1 solo ingreso (Sencillo)</option>
                  <option value={2}>2 ingresos (Ida/Vuelta)</option>
                  <option value={5}>Multi-ingreso (5 veces)</option>
                  <option value={99}>Frecuente (Ilimitado)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  Num. de Personas
                </label>
                <input
                  id="visitor-people-count"
                  type="number"
                  min="1"
                  max="15"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-3 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <button
              id="btn-submit-visitor"
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs uppercase tracking-wider"
            >
              Registrar Visita y Generar Código
            </button>
          </form>
        </div>

        {/* Visitor Ledger / Passes Directory */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
              <div className="flex items-center space-x-2">
                <QrCode className="text-amber-500 h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-900 font-sans">Mis Pases Generados ({passes.length})</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Notification Status Badge */}
                {notificationPermission && (
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center space-x-1 border ${
                      notificationPermission === "granted" || notificationPermission === "granted_simulated"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : notificationPermission === "denied"
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full mr-1 ${
                        notificationPermission === "granted" || notificationPermission === "granted_simulated"
                          ? "bg-emerald-500 animate-pulse" 
                          : notificationPermission === "denied" 
                          ? "bg-rose-500" 
                          : "bg-slate-450"
                      }`}></span>
                      {notificationPermission === "granted" ? (
                        <span>Alertas: Activas</span>
                      ) : notificationPermission === "granted_simulated" ? (
                        <span>Alertas: Activas (Portal)</span>
                      ) : notificationPermission === "denied" ? (
                        <span>Alertas: Bloqueadas</span>
                      ) : (
                        <span>Alertas: Desactivadas</span>
                      )}
                    </span>
                    
                    {notificationPermission !== "default" && onResetPermission && (
                      <button
                        onClick={onResetPermission}
                        className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-850 px-1.5 py-0.5 rounded-md border border-slate-200 cursor-pointer transition-colors font-medium"
                        title="Restablecer para volver a mostrar el banner de configuración de alertas"
                      >
                        Configurar
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={fetchPasses}
                  className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center space-x-1 cursor-pointer font-semibold font-mono border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {loading && passes.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">Cargando pases de ingreso...</div>
            ) : passes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-300" />
                <p>No tienes pases de visitas creados actualmente.</p>
                <p className="text-[10px] text-slate-450">Los pases que registres aparecerán en este panel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
                {passes.map((pass) => (
                  <div
                    key={pass.id}
                    id={`visitor-pass-card-${pass.id}`}
                    onClick={() => setSelectedPass(pass)}
                    className={`p-4 rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between ${
                      selectedPass?.id === pass.id
                        ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500"
                        : "border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 font-sans text-sm truncate max-w-[140px]">
                          {pass.firstName} {pass.lastName}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full border ${
                          pass.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : pass.status === "used"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {pass.status === "active" ? "Activo" : pass.status === "used" ? "Utilizado" : "Vencido"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-slate-600 font-sans">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-450" />
                          <span>Ingreso: <strong className="text-slate-800">{pass.entryDate}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-450" />
                          <span>Personas: <strong className="text-slate-800">{pass.peopleCount}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-450" />
                          <span>Ingresos: <strong className="text-slate-800">{pass.entriesUsed} / {pass.maxEntries === 99 ? "∞" : pass.maxEntries}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-450">
                      <span className="font-bold text-slate-700">{pass.passCode}</span>
                      <span className="text-amber-600 hover:text-amber-700 flex items-center font-semibold">
                        Ver Pase <ChevronRight className="h-3 w-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Selected Pass Interactive Modal / Detail */}
      {selectedPass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="visitor-pass-modal">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-800">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="text-amber-500 h-5 w-5" />
                <h4 className="font-bold text-sm font-sans">Pase de Acceso Autorizado</h4>
              </div>
              <button
                onClick={() => setSelectedPass(null)}
                className="text-slate-400 hover:text-white font-mono text-sm uppercase px-2 py-1 rounded-md bg-slate-800 border border-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Pass Visual (Ticket Style) */}
            <div className="p-6 space-y-6">
              
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 bg-slate-50 relative overflow-hidden" id="print-pass-area">
                
                {/* Decorative cutouts for ticket aesthetic */}
                <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-white border-r border-slate-200 -translate-y-1/2"></div>
                <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-white border-l border-slate-200 -translate-y-1/2"></div>
                
                <div className="text-center pb-4 border-b border-dashed border-slate-200">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Residencial KuauKali</span>
                  <h3 className="text-lg font-black font-sans text-slate-900 mt-1 uppercase tracking-tight">
                    PASE DE INGRESO
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-bold font-mono tracking-wider mt-0.5">
                    ✓ PRE-APROBADO POR PROPIETARIO
                  </p>
                </div>

                {/* Details list */}
                <div className="py-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Visitante</span>
                      <strong className="text-slate-900 font-sans text-sm">{selectedPass.firstName} {selectedPass.lastName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Destino</span>
                      <strong className="text-slate-900 font-sans text-sm">{selectedPass.house}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Fecha Programada</span>
                      <strong className="text-slate-800">{selectedPass.entryDate}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Personas Autorizadas</span>
                      <strong className="text-slate-800">{selectedPass.peopleCount} Persona(s)</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Tipo de Pase</span>
                      <strong className="text-slate-800">
                        {selectedPass.maxEntries === 1 ? "Ingreso Sencillo" : selectedPass.maxEntries === 99 ? "Residente Frecuente" : `Multi-ingreso (${selectedPass.maxEntries} max)`}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">Uso del Pase</span>
                      <strong className="text-slate-800">{selectedPass.entriesUsed} de {selectedPass.maxEntries === 99 ? "∞" : selectedPass.maxEntries}</strong>
                    </div>
                  </div>
                </div>

                {/* Interactive Mock Barcode / QR Section */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 shadow-inner">
                  
                  {/* High fidelity Barcode illustration */}
                  <div className="flex items-center space-x-[1.5px] h-12 w-full max-w-[280px] bg-white justify-center overflow-hidden py-1">
                    <div className="h-10 w-2.5 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-1.5 bg-slate-900"></div>
                    <div className="h-10 w-[1px] bg-slate-900"></div>
                    <div className="h-10 w-2 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-1 bg-slate-900"></div>
                    <div className="h-10 w-2.5 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-1.5 bg-slate-900"></div>
                    <div className="h-10 w-1 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-2 bg-slate-900"></div>
                    <div className="h-10 w-[1.5px] bg-slate-900"></div>
                    <div className="h-10 w-1.5 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-2.5 bg-slate-900"></div>
                    <div className="h-10 w-1 bg-slate-900"></div>
                    <div className="h-10 w-1 bg-slate-900"></div>
                    <div className="h-10 w-[1.5px] bg-slate-900"></div>
                    <div className="h-10 w-2 bg-slate-900"></div>
                    <div className="h-10 w-0.5 bg-slate-900"></div>
                    <div className="h-10 w-1.5 bg-slate-900"></div>
                    <div className="h-10 w-2.5 bg-slate-900"></div>
                  </div>

                  <div className="text-center">
                    <span className="text-base font-black font-mono tracking-widest text-slate-900">
                      {selectedPass.passCode}
                    </span>
                    <p className="text-[9px] text-slate-450 font-sans mt-0.5">
                      Presente este código de barras impreso o en su celular al oficial en caseta.
                    </p>
                  </div>
                </div>

                {/* Verification Logs detail inside pass card */}
                {selectedPass.logs && selectedPass.logs.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <span className="text-[9px] uppercase font-mono text-slate-400 block mb-1">Registro de Entradas Recientes:</span>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                      {selectedPass.logs.map((log, index) => (
                        <div key={index} className="bg-white border border-slate-150 p-2 rounded text-[10px] leading-tight flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800">{log.guardName}</span>
                            <span className="text-slate-450 block text-[9px]">{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                            {log.notes && <span className="text-slate-500 italic block mt-0.5">"{log.notes}"</span>}
                          </div>
                          <span className={`px-1.5 py-0.5 font-bold uppercase rounded text-[8px] ${
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

              {/* Utility actions for sharing/saving */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold font-sans">
                <button
                  onClick={handlePrint}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl border border-slate-300 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Pase</span>
                </button>
                <button
                  onClick={() => {
                    alert(`El código de acceso "${selectedPass.passCode}" ha sido copiado al portapapeles para compartir por WhatsApp.`);
                    navigator.clipboard.writeText(
                      `Hola, te comparto el pase de acceso para Residencial KuauKali:\n\n*Invitado*: ${selectedPass.firstName} ${selectedPass.lastName}\n*Casa Destino*: ${selectedPass.house}\n*Código de Acceso*: ${selectedPass.passCode}\n*Fecha*: ${selectedPass.entryDate}\n\nPor favor preséntalo en caseta de vigilancia.`
                    );
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Compartir Pase</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-450 text-center leading-relaxed font-sans">
                Este pase es personal e intransferible. El uso indebido de los accesos residenciales generará cargos y multas según el artículo 15 del reglamento de condóminos de Residencial KuauKali.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
