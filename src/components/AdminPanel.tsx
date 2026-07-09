/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Reservation, ReservationStatus } from "../types";
import { ShieldAlert, AlertTriangle, Eye, Check, X, Calendar, DollarSign, Clock, Users, RefreshCw, FileText, Ban, RotateCcw, MessageSquare, Copy, CheckCheck } from "lucide-react";

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

  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [exportMonth, setExportMonth] = useState<string>("08"); // Default August (08)
  const [exportYear, setExportYear] = useState<string>("2026"); // Default 2026
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const monthsEngAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsList = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  function formatDateToWhatsApp(dateStr: string): string {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const monthLabel = monthsEngAbbr[monthIdx] || parts[1];
    return `${day}-${monthLabel}-${year}`;
  }

  function formatTimeWithSeconds(timeStr: string): string {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return `${timeStr}:00`;
    }
    return timeStr;
  }

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

  return (
    <div className="space-y-8">
      {/* Quick visual KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-xs text-slate-500 font-mono block uppercase">Exportación WhatsApp</span>
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Exportar para WhatsApp</span>
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

      {/* WhatsApp Export Modal */}
      {showWhatsAppModal && (
        <div id="whatsapp-export-modal" className="fixed inset-0 bg-slate-950/75 z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <span className="font-bold font-sans text-sm flex items-center space-x-2">
                <MessageSquare className="text-white h-5 w-5" />
                <span>Exportar Reservas para WhatsApp</span>
              </span>
              <button
                id="btn-close-whatsapp-modal"
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setCopiedSuccess(false);
                }}
                className="p-1 text-emerald-100 hover:text-white rounded hover:bg-emerald-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Select Month and Year */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 font-mono">
                    Seleccionar Mes:
                  </label>
                  <select
                    value={exportMonth}
                    onChange={(e) => {
                      setExportMonth(e.target.value);
                      setCopiedSuccess(false);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    {monthsList.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 font-mono">
                    Seleccionar Año:
                  </label>
                  <select
                    value={exportYear}
                    onChange={(e) => {
                      setExportYear(e.target.value);
                      setCopiedSuccess(false);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>

              {/* Filtering results */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-mono mb-3">
                  Vista de reservas encontradas ({
                    reservations.filter(r => {
                      if (r.status !== "approved") return false;
                      const parts = r.date.split("-");
                      return parts[0] === exportYear && parts[1] === exportMonth;
                    }).length
                  })
                </h4>

                {(() => {
                  const filtered = reservations
                    .filter(r => {
                      if (r.status !== "approved") return false;
                      const parts = r.date.split("-");
                      return parts[0] === exportYear && parts[1] === exportMonth;
                    })
                    .sort((a, b) => {
                      if (a.date !== b.date) return a.date.localeCompare(b.date);
                      return a.startTime.localeCompare(b.startTime);
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 bg-slate-50 text-center rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs italic">
                        No hay reservas aprobadas/confirmadas para el mes seleccionado.
                      </div>
                    );
                  }

                  const textToCopyVal = filtered.map(row => {
                    return `${row.userName || "N/A"} | ${row.house} | ${formatDateToWhatsApp(row.date)} | ${formatTimeWithSeconds(row.startTime)} | ${formatTimeWithSeconds(row.endTime)}`;
                  }).join("\n");

                  return (
                    <div className="space-y-4">
                      {/* Visual Table */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-mono">
                              <th className="px-4 py-2.5">Propietario</th>
                              <th className="px-4 py-2.5">Casa o Lote</th>
                              <th className="px-4 py-2.5">Fecha del Evento</th>
                              <th className="px-4 py-2.5">Hora de Inicio</th>
                              <th className="px-4 py-2.5">Hora de Fin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 font-sans text-slate-700">
                            {filtered.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-bold text-slate-900">{row.userName || "N/A"}</td>
                                <td className="px-4 py-2.5 text-slate-700 font-semibold">{row.house}</td>
                                <td className="px-4 py-2.5 font-mono text-xs">{formatDateToWhatsApp(row.date)}</td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-bold">
                                  {formatTimeWithSeconds(row.startTime)}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-bold">
                                  {formatTimeWithSeconds(row.endTime)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Monospaced text preview to copy */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">
                            Texto para Whatsapp (Formato exacto):
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">Copia y pega en WhatsApp</span>
                        </div>
                        <div className="relative">
                          <textarea
                            id="whatsapp-raw-text"
                            readOnly
                            value={textToCopyVal}
                            className="w-full h-40 p-4 font-mono text-xs text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-hidden resize-none leading-relaxed"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textToCopyVal)
                                .then(() => {
                                  setCopiedSuccess(true);
                                  setTimeout(() => setCopiedSuccess(false), 3000);
                                })
                                .catch(() => {
                                  // Fallback manual
                                  const tx = document.getElementById("whatsapp-raw-text") as HTMLTextAreaElement;
                                  if (tx) {
                                    tx.select();
                                    document.execCommand("copy");
                                    setCopiedSuccess(true);
                                    setTimeout(() => setCopiedSuccess(false), 3000);
                                  }
                                });
                            }}
                            className={`absolute top-3 right-3 p-2 rounded-lg border transition-all flex items-center space-x-1 text-xs font-bold cursor-pointer shadow-sm ${
                              copiedSuccess
                                ? "bg-emerald-600 text-white border-emerald-500"
                                : "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
                            }`}
                          >
                            {copiedSuccess ? (
                              <>
                                <CheckCheck className="h-4 w-4 shrink-0" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 shrink-0" />
                                <span>Copiar Tabla</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-between items-center bg-slate-100 border-t border-slate-200 shrink-0">
              <span className="text-[10px] text-slate-500 font-medium">
                Pega este formato directo en WhatsApp para mantener a los residentes informados.
              </span>
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setCopiedSuccess(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
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
