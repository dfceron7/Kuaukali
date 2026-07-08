/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Reservation, ReservationStatus } from "../types";
import { ShieldAlert, AlertTriangle, Eye, Check, X, Calendar, DollarSign, Clock, Users, RefreshCw, FileText, Ban, RotateCcw } from "lucide-react";

interface AdminPanelProps {
  reservations: Reservation[];
  onActionTriggered: () => void;
}

export default function AdminPanel({ reservations, onActionTriggered }: AdminPanelProps) {
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingList = reservations.filter((r) => r.status === "pending");
  const approvedList = reservations.filter((r) => r.status === "approved");
  const rejectedList = reservations.filter((r) => r.status === "rejected");
  const cancelledList = reservations.filter((r) => r.status === "cancelled");

  const handleApprove = async (id: string) => {
    setActionError(null);
    setLoadingId(id);
    try {
      const response = await fetch(`/api/reservations/${id}/approve`, {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "No se pudo aprobar la reserva");
      }
      onActionTriggered(); // update stats is instant
    } catch (err: any) {
      setActionError(err.message || "Error al aprobar la reserva.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;

    setActionError(null);
    setLoadingId(rejectId);
    try {
      const response = await fetch(`/api/reservations/${rejectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason || "El archivo de comprobante no concuerda con la transferencia." })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "No se pudo rechazar la reserva");
      }
      
      setRejectId(null);
      setRejectionReason("");
      onActionTriggered();
    } catch (err: any) {
      setActionError(err.message || "Error al rechazar la reserva.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancelByAdmin = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea cancelar esta reserva y liberar el espacio?")) {
      return;
    }
    setActionError(null);
    setLoadingId(id);
    try {
      const response = await fetch(`/api/reservations/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "No se pudo cancelar la reserva");
      }
      onActionTriggered();
    } catch (err: any) {
      setActionError(err.message || "Error al cancelar la reserva.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRevertToPending = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea cambiar el estado de esta reserva de vuelta a PENDIENTE para volver a evaluarla?")) {
      return;
    }
    setActionError(null);
    setLoadingId(id);
    try {
      const response = await fetch(`/api/reservations/${id}/pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "No se pudo cambiar el estado");
      }
      onActionTriggered();
    } catch (err: any) {
      setActionError(err.message || "Error al cambiar estado.");
    } finally {
      setLoadingId(null);
    }
  };

  const resetAllDb = async () => {
    if (confirm("¿Estás seguro que deseas restablecer la base de datos de reservas?")) {
      await fetch("/api/admin/reset", { method: "POST" });
      onActionTriggered();
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick visual KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-mono block uppercase">Pendientes de Acción</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold font-sans">{pendingList.length}</span>
            <span className="text-xs text-amber-500 font-medium">Revisión requerida</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-mono block uppercase">Reservas Confirmadas</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 font-sans">{approvedList.length}</span>
            <span className="text-xs text-emerald-600 font-medium">Espacio bloqueado</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-mono block uppercase">Rechazadas / Canceladas</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 font-sans">{rejectedList.length + cancelledList.length}</span>
            <span className="text-xs text-rose-600 font-medium">Espacio libre</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-mono block uppercase">Mantenimiento de Datos</span>
            <button
              id="btn-fase-reset"
              onClick={resetAllDb}
              className="mt-2 text-xs text-slate-500 hover:text-amber-500 transition-colors flex items-center space-x-1 font-semibold"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Restablecer estados demo</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 text-rose-800 border-l-4 border-rose-600 p-4 rounded-r-lg text-sm flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Reservations Segment (Approvals & File Alert Checklist) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="text-amber-500 h-5 w-5" />
            <h3 className="font-bold text-base font-sans">
              Buzón de Solicitudes Pendientes ({pendingList.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono uppercase bg-slate-800 text-amber-500 px-2.5 py-1 rounded-md border border-amber-500/20">
            Requiere Verificación de Comprobante
          </span>
        </div>

        {pendingList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Check className="mx-auto h-12 w-12 text-emerald-500 bg-emerald-50 p-2.5 rounded-full border border-emerald-100" />
            <span className="block font-bold mt-2 text-slate-700">¡Al día con las solicitudes!</span>
            <p className="text-xs text-slate-400 mt-1">No hay comprobantes de transferencia esperando verificación.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingList.map((res) => (
              <div key={res.id} className="p-6 hover:bg-slate-50/50 transition-colors relative">
                
                {/* Visual Alert Notice exactly matching the instruction "el residente subio un comprobante de pago..." */}
                <div className="mb-4 bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-sans block text-slate-900">Alerta: Se ha subido un nuevo Comprobante de Coadyuvación Bancaria</strong>
                    <p className="text-slate-600 mt-0.5">
                      El residente de {res.house} adjuntó el archivo <strong>{res.proofFileName}</strong> para validar la reserva de {res.durationHours} horas programada para el {res.date}. Por favor revise el comprobante antes de emitir un fallo.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Reservation Overview info */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-bold text-slate-900 text-base">{res.house}</span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        @{res.userName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Fecha: <strong>{res.date}</strong></span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Horas: <strong>{res.startTime} - {res.endTime}</strong> ({res.durationHours} hs)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>Invitados: <strong>{res.guestsCount} personas</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Proof Document Button */}
                    <button
                      id={`btn-view-proof-${res.id}`}
                      onClick={() => setSelectedProofUrl(res.proofFileUrl)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold select-none flex items-center space-x-1.5 transition-colors border border-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver Comprobante</span>
                    </button>

                    {/* Reject Trigger with overlay state */}
                    <button
                      id={`btn-reject-trigger-${res.id}`}
                      onClick={() => {
                        setRejectId(res.id);
                        setRejectionReason("");
                      }}
                      className="px-3.5 py-2 hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold select-none flex items-center space-x-1 transition-colors"
                      disabled={loadingId !== null}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Rechazar</span>
                    </button>

                    {/* Approve Action */}
                    <button
                      id={`btn-approve-action-${res.id}`}
                      onClick={() => handleApprove(res.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs select-none flex items-center space-x-1 transition-all"
                      disabled={loadingId !== null}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{loadingId === res.id ? "Aprobando..." : "Aprobar Reserva"}</span>
                    </button>
                  </div>
                </div>

                {/* Inline rejection drawer input if triggered */}
                {rejectId === res.id && (
                  <form onSubmit={handleRejectSubmit} className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-rose-900 uppercase">
                      Especificar Motivo de Rechazo (Será notificado por correo):
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="input-rejection-reason"
                        type="text"
                        placeholder="Ej. El comprobante no incluye fecha válida... / El monto es incorrecto"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="flex-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-rose-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-1.5 rounded-lg font-bold"
                      >
                        Confirmar Rechazo
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History log ledger of Approved and Rejected reservations for the administrators */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-100 py-3.5 px-6 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-slate-800 text-sm font-bold font-sans">
            Histórico General de Eventos Procesados ({approvedList.length + rejectedList.length + cancelledList.length})
          </h4>
          <span className="text-[10px] bg-slate-250 text-slate-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded">
            Sólo lectura para tarjetas; acciones con botones abajo
          </span>
        </div>
        
        {approvedList.length + rejectedList.length + cancelledList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No se han procesado aprobaciones ni rechazos previos todavía.
          </div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-slate-500 font-mono text-xs uppercase uppercase-tracking-wider">
                <tr>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Horas</th>
                  <th className="px-6 py-3">Invitados</th>
                  <th className="px-6 py-3">Documento</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Controles Administrativos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                {[...approvedList, ...rejectedList, ...cancelledList].map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{row.house}</td>
                    <td className="px-6 py-4 font-mono text-xs">{row.date}</td>
                    <td className="px-6 py-4">{row.startTime} a {row.endTime}</td>
                    <td className="px-6 py-4 font-mono text-xs">{row.guestsCount} pers.</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedProofUrl(row.proofFileUrl)}
                        className="text-slate-500 hover:text-amber-500 hover:underline flex items-center space-x-1 font-semibold text-xs text-left cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px] inline-block">{row.proofFileName}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded-full border ${
                        row.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-250"
                          : row.status === "rejected"
                          ? "bg-rose-100 text-rose-800 border-rose-250"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {row.status === "approved"
                          ? "Aprobado"
                          : row.status === "rejected"
                          ? "Rechazado"
                          : "Cancelado"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status === "approved" && (
                          <button
                            id={`btn-admin-cancel-${row.id}`}
                            onClick={() => handleCancelByAdmin(row.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded text-[11px] px-2 py-1 flex items-center space-x-1 transition-colors cursor-pointer select-none"
                            disabled={loadingId !== null}
                          >
                            <Ban className="h-3 w-3" />
                            <span>Cancelar</span>
                          </button>
                        )}
                        
                        <button
                          id={`btn-admin-revert-${row.id}`}
                          onClick={() => handleRevertToPending(row.id)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 rounded text-[11px] px-2 py-1 flex items-center space-x-1 transition-colors cursor-pointer select-none"
                          disabled={loadingId !== null}
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Pendiente</span>
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

      {/* Interactive Modal to view high-resolution Proof document */}
      {selectedProofUrl && (
        <div id="proof-modal" className="fixed inset-0 bg-slate-950/75 z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl relative">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <span className="font-bold font-sans text-sm flex items-center space-x-2">
                <FileText className="text-amber-400 h-5 w-5" />
                <span>Vista de Comprobante de Transferencia</span>
              </span>
              <button
                id="btn-close-modal"
                onClick={() => setSelectedProofUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 flex justify-center bg-slate-50 border-b border-slate-100">
              {selectedProofUrl.startsWith("data:image/") ? (
                <img
                  src={selectedProofUrl}
                  alt="Comprobante Bancario"
                  referrerPolicy="no-referrer"
                  className="max-h-[350px] object-contain rounded-lg border shadow-sm"
                />
              ) : (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <FileText className="mx-auto h-16 w-16 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Comprobante de formato PDF u otro</p>
                  <p className="text-xs">Este documento no se puede previsualizar inline, pero ha sido captado por la base de datos.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end bg-slate-100">
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
