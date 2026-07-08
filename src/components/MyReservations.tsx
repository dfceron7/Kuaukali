/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Reservation, User } from "../types";
import { 
  Clock, 
  Calendar, 
  Users, 
  Eye, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Search, 
  Bell, 
  BellRing, 
  Info 
} from "lucide-react";

interface MyReservationsProps {
  currentUser: User;
  reservations: Reservation[];
  notificationPermission?: string;
  onRequestPermission?: () => Promise<void>;
  onResetPermission?: () => void;
  onCancelReservation: (reservationId: string) => Promise<void>;
}

export default function MyReservations({ 
  currentUser, 
  reservations, 
  notificationPermission,
  onRequestPermission,
  onResetPermission,
  onCancelReservation 
}: MyReservationsProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Filter reservations made by this exact user
  const myRequests = reservations.filter((r) => r.userId === currentUser.id);

  // Also filter all other approved/pending requests for search/verification so residents "pueden ver todas las reservas, la casa que reservó y las horas"
  const allOtherRequests = reservations.filter(
    (r) => r.userId !== currentUser.id && r.status !== "rejected"
  );

  const filteredOthers = allOtherRequests.filter(
    (r) =>
      r.house.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      {/* Native Browser Notification Permission Prompt */}
      {notificationPermission === "default" && onRequestPermission && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shrink-0">
              <BellRing className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                ¡Recibe Alertas en Tiempo Real!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Activa las notificaciones del navegador para recibir un aviso al instante cuando la administración apruebe o rechace tu comprobante de reserva de Casa Club.
              </p>
            </div>
          </div>
          <button
            id="btn-enable-browser-notifications"
            onClick={onRequestPermission}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors border border-slate-800 select-none"
          >
            🔔 Activar Notificaciones
          </button>
        </div>
      )}

      {/* My bookings list section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Clock className="text-amber-500 h-5 w-5" />
            <h3 className="font-bold text-base font-sans">Historial de Mis Reservas ({myRequests.length})</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Notification Status Badge */}
            {notificationPermission && (
              <div className="flex items-center space-x-1.5">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1 border ${
                  notificationPermission === "granted" || notificationPermission === "granted_simulated"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : notificationPermission === "denied"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                    notificationPermission === "granted" || notificationPermission === "granted_simulated"
                      ? "bg-emerald-400 animate-pulse" 
                      : notificationPermission === "denied" 
                      ? "bg-rose-400" 
                      : "bg-slate-500"
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
                
                {/* Reset Action to re-trigger configuration banner */}
                {notificationPermission !== "default" && onResetPermission && (
                  <button
                    onClick={onResetPermission}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 cursor-pointer transition-colors font-medium"
                    title="Restablecer para volver a mostrar el banner de configuración de alertas"
                  >
                    Configurar
                  </button>
                )}
              </div>
            )}

            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono border border-slate-700">
              {currentUser.house}
            </span>
          </div>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 stroke-1" />
            <span className="block font-bold mt-2 text-slate-700">No tienes reservas activas</span>
            <p className="text-xs text-slate-400 mt-1">Haz clic en la pestaña "Reservar Casa Club" para realizar tu primera solicitud.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...myRequests].reverse().map((res) => (
              <div key={res.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                        Estadía: <strong>{res.date}</strong>
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          res.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : res.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : res.status === "cancelled"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {res.status === "approved"
                          ? "Aprobado"
                          : res.status === "rejected"
                          ? "Rechazado"
                          : res.status === "cancelled"
                          ? "Cancelado"
                          : "Pendiente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Horario: {res.startTime} - {res.endTime} ({res.durationHours} horas)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>Invitados: {res.guestsCount} personas</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px]">Comp: {res.proofFileName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-view-proof-mine-${res.id}`}
                      onClick={() => setSelectedProofUrl(res.proofFileUrl)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold select-none flex items-center space-x-1 transition-colors border border-slate-200 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Comprobante</span>
                    </button>

                    {res.status !== "cancelled" && res.status !== "rejected" && (
                      <button
                        id={`btn-cancel-res-${res.id}`}
                        onClick={async () => {
                          if (window.confirm("¿Está seguro de que desea cancelar esta reserva y liberar el espacio?")) {
                            await onCancelReservation(res.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold select-none flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub status alert descriptions */}
                {res.status === "approved" && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-900">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-sans">¡Reserva Autorizada con Correo Enviado!</strong>
                      <p className="text-emerald-700/90 mt-0.5">
                        La administración validó tu comprobante correctamente. Se ha disparado una notificación con las normativas (dejar limpio, lista de invitados a vigilantes y aforo máximo de 50). Puedes ver la plantilla en tu pestaña <strong>Buzón de Correos</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {res.status === "rejected" && (
                  <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-900">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-sans">Solicitud Rechazada por Administración</strong>
                      <p className="text-rose-700/90 mt-0.5">
                        <strong>Motivo:</strong> "{res.rejectionReason}". Tu transacción bancaria o el horario especificado infringió reglas. El horario se encuentra liberado para re-reservar.
                      </p>
                    </div>
                  </div>
                )}

                {res.status === "pending" && (
                  <div className="mt-4 bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-900">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Esperando Firma de Validación</strong>
                      <p className="text-amber-700/90 mt-0.5">
                        El administrador ha recibido la alerta con el comprobante bancario adjunto y revisará la transacción a la brevedad.
                      </p>
                    </div>
                  </div>
                )}

                {res.status === "cancelled" && (
                  <div className="mt-4 bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-slate-700">
                    <XCircle className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-sans">Solicitud Cancelada por Residente</strong>
                      <p className="text-slate-500 mt-0.5">
                        Has cancelado esta reserva correctamente. Los horarios y espacio han sido liberados de inmediato para toda la comunidad residencial.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Directory list of all other reserves so residents can cross-refer reservations */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-sans">Reservas de Otros Inmuebles</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Consulta quién se encuentra utilizando las amenities de Casa Club y sus respectivos bloques de uso.
              </p>
            </div>
            
            {/* Search Input bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-reserves"
                type="text"
                placeholder="Buscar por casa o fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {filteredOthers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Ningún registro de otro residente coincide en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-slate-500 font-mono text-xs uppercase uppercase-tracking-wider">
                <tr>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Fecha del Evento</th>
                  <th className="px-6 py-3">Horario</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                {filteredOthers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.house}</td>
                    <td className="px-6 py-4 font-mono text-xs">{item.date}</td>
                    <td className="px-6 py-4">
                      {item.startTime} hs. - {item.endTime} hs. ({item.durationHours} horas)
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded-full ${
                        item.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.status === "approved" ? "Confirmado" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal image viewer */}
      {selectedProofUrl && (
        <div id="proof-modal-mine" className="fixed inset-0 bg-slate-950/70 z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-250 shadow-2xl relative">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <span className="font-bold font-sans text-sm">Mi Comprobante Adjunto</span>
              <button
                id="btn-close-modal-mine"
                onClick={() => setSelectedProofUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex justify-center">
              <img
                src={selectedProofUrl}
                alt="Comprobante Subido"
                referrerPolicy="no-referrer"
                className="max-h-[300px] object-contain rounded border"
              />
            </div>
            <div className="px-6 py-4 flex justify-end bg-slate-100">
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
