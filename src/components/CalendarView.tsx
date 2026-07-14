/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Reservation } from "../types";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, HelpCircle, CheckCircle, Hourglass, ShieldAlert } from "lucide-react";

interface CalendarViewProps {
  reservations: Reservation[];
}

export default function CalendarView({ reservations }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [maxReservationHours, setMaxReservationHours] = useState<number>(5);

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.maxReservationHours !== undefined) {
            setMaxReservationHours(data.maxReservationHours);
          }
        }
      } catch (err) {
        console.error("Error fetching app config:", err);
      }
    };
    fetchAppConfig();
  }, []);

  // Helper calculation for calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday, etc. Let's adjust for Mon=0, Sun=6
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create grid days
  const daysArray = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(new Date(year, month, d));
  }

  // Find bookings for a date
  const getBookingsForDate = (dateStr: string) => {
    return reservations.filter((r) => r.date === dateStr);
  };

  const getApprovedBookingsForDate = (dateStr: string) => {
    return reservations.filter((r) => r.date === dateStr && r.status === "approved");
  };

  const selectedDateBookings = getBookingsForDate(selectedDateStr);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Primary Calendar Slate (2 cols wide) */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header month controls */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="text-amber-400 h-6 w-6" />
            <h2 className="text-lg font-bold font-sans">
              {monthNames[month]} {year}
            </h2>
          </div>
          <div className="flex space-x-2">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Calendar Grid Header (Weeks) */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 font-mono tracking-wider uppercase mb-3">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {daysArray.map((day, ix) => {
              if (day === null) {
                return <div key={`empty-${ix}`} className="aspect-square bg-slate-50/50 rounded-lg" />;
              }

              const dateStr = day.toISOString().split("T")[0];
              const approvedRequests = getApprovedBookingsForDate(dateStr);
              const allRequests = getBookingsForDate(dateStr);
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <button
                  key={`day-${dateStr}`}
                  id={`day-btn-${dateStr}`}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`aspect-square p-2 rounded-xl flex flex-col justify-between items-stretch text-left border relative transition-all group ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 text-slate-950 font-bold scale-[1.02] shadow-sm shadow-amber-500/20"
                      : isToday
                      ? "border-slate-800 bg-slate-100 text-slate-900"
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-sm font-sans">{day.getDate()}</span>
                  
                  {/* Miniature visualization indicators of events to show bookings on specific house cells */}
                  <div className="space-y-1">
                    {allRequests.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        className={`text-[9px] px-1 py-0.5 rounded leading-none truncate ${
                          b.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "rejected"
                            ? "bg-rose-100 text-rose-800 line-through"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                        title={`${b.house}: ${b.startTime} - ${b.endTime}`}
                      >
                        {b.house} ({b.startTime})
                      </div>
                    ))}
                    {allRequests.length > 2 && (
                      <span className="text-[8px] font-mono text-slate-500 block text-right mt-1">
                        +{allRequests.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color legends code */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 text-xs font-mono text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" />
              <span>Aprobado / Confirmado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" />
              <span>Pendiente de Revisión</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-rose-100 border border-rose-300 rounded" />
              <span>Rechazado (Liberado)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail sidebar panel for user's day query */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-base font-bold text-slate-900 font-sans flex items-center space-x-2">
            <Clock className="text-slate-500 h-5 w-5" />
            <span>Reservas del Día</span>
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {selectedDateStr} (Formato YYYY-MM-DD)
          </p>
        </div>

        {selectedDateBookings.length === 0 ? (
          <div className="py-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-slate-300 stroke-1" />
            <h4 className="text-sm font-semibold text-slate-700 mt-2">Día Completamente Libre</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Todo el horario de la Casa Club se encuentra libre para reservación. Recuerde dejar 1 hora de promedio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateBookings.map((res) => (
              <div
                key={res.id}
                className={`p-4 rounded-xl border bg-white shadow-xs transition-transform ${
                  res.status === "approved"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : res.status === "rejected"
                    ? "border-slate-100 bg-slate-50 opacity-60"
                    : "border-amber-200 bg-amber-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm font-sans">{res.house}</span>
                    <span className="text-slate-400 text-xs">| Residente</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono tracking-wider font-bold rounded-full uppercase border ${
                      res.status === "approved"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : res.status === "rejected"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    {res.status === "approved"
                      ? "Aprobado"
                      : res.status === "rejected"
                      ? "Rechazado"
                      : "Pendiente"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Hora: <strong>{res.startTime} - {res.endTime}</strong> ({res.durationHours} horas)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Invitados estimados: {res.guestsCount} personas</span>
                  </div>
                </div>

                {res.status === "approved" && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
                    <span className="flex items-center space-x-1 font-sans">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Transacción validada por Admin</span>
                    </span>
                  </div>
                )}

                {res.status === "rejected" && (
                  <div className="mt-2.5 pt-2 border-t border-rose-100 text-[11px] text-rose-700">
                    <strong>Motivo de rechazo:</strong>
                    <p className="mt-0.5 text-rose-900 italic">"{res.rejectionReason}"</p>
                  </div>
                )}

                {res.status === "pending" && (
                  <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800">
                    <span className="flex items-center space-x-1">
                      <Hourglass className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                      <span>Esperando aprobación</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic regulatory guide banner to always remind requirements */}
        <div className="mt-6 bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            Normativa de Reservas
          </h4>
          <ul className="text-[11px] text-slate-300 space-y-2 list-disc pl-4">
            <li>Duración máxima permitida: <strong>{maxReservationHours} horas</strong> por reserva.</li>
            <li>Separación mínima entre eventos: <strong>1 hora</strong> limpia de por medio. </li>
            <li>Se requiere comprobante de transferencia bancaria visible para estudio administrativo.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
