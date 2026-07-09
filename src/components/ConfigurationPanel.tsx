/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from "react";
import { User } from "../types";
import { 
  Settings, 
  AlertTriangle, 
  Calendar, 
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Save, 
  TrendingUp, 
  CheckCircle, 
  HelpCircle,
  Building
} from "lucide-react";

interface ConfigurationPanelProps {
  currentUser: User;
}

interface AppConfig {
  moraThresholdMonths: number;
  moraStartMonth: string;
  reservationNorms: string[];
  monthlyFee?: number;
  feeHistory?: any[];
}

interface PaymentStatusReport {
  house: string;
  status: "mora" | "al_dia";
  pendingMonthsCount: number;
  pendingMonths: string[];
  paidMonths: string[];
}

export default function ConfigurationPanel({ currentUser }: ConfigurationPanelProps) {
  // Config States
  const [moraThreshold, setMoraThreshold] = useState<number>(1);
  const [moraStartMonth, setMoraStartMonth] = useState<string>("Enero 2026");
  const [norms, setNorms] = useState<string[]>([]);
  const [newNorm, setNewNorm] = useState<string>("");
  const [monthlyFee, setMonthlyFee] = useState<number>(50);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [resettingDb, setResettingDb] = useState<boolean>(false);

  // Report States
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("todos");
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatusReport[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState<boolean>(true);

  const monthsList = [
    "Enero 2026",
    "Febrero 2026",
    "Marzo 2026",
    "Abril 2026",
    "Mayo 2026",
    "Junio 2026",
    "Julio 2026",
    "Agosto 2026",
    "Septiembre 2026",
    "Octubre 2026",
    "Noviembre 2026",
    "Diciembre 2026"
  ];

  // Fetch Config
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data: AppConfig = await res.json();
        setMoraThreshold(data.moraThresholdMonths ?? 1);
        setMoraStartMonth(data.moraStartMonth ?? "Enero 2026");
        setNorms(data.reservationNorms ?? []);
        setMonthlyFee(data.monthlyFee ?? 50);
        setFeeHistory(data.feeHistory ?? []);
      }
    } catch (e) {
      console.error("Error fetching config:", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Fetch Report Data
  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      // Fetch consolidated payment statuses
      const statusRes = await fetch("/api/payments/status");
      const statuses = await statusRes.json();
      setPaymentStatuses(statuses);

      // Fetch raw payments list
      const paymentsRes = await fetch(`/api/payments?role=admin`);
      const payments = await paymentsRes.json();
      setRawPayments(payments);
    } catch (e) {
      console.error("Error fetching report data:", e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchReportData();
  }, []);

  // Save General Config (Mora)
  const handleSaveMoraConfig = async () => {
    setSaveStatus(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moraThresholdMonths: Number(moraThreshold),
          moraStartMonth,
          monthlyFee: Number(monthlyFee)
        })
      });
      if (res.ok) {
        setSaveStatus({ type: "success", message: "Configuración de cuota y mora guardada exitosamente." });
        // Refresh statuses and local config state
        await fetchReportData();
        await fetchConfig();
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setSaveStatus({ type: "error", message: "Error al guardar la configuración." });
      }
    } catch (e) {
      setSaveStatus({ type: "error", message: "Error de conexión." });
    }
  };

  // Factory reset to zero (Sys Admin only)
  const handleFactoryReset = async () => {
    const isConfirmed = confirm(
      "⚠️ ¿ADVERTENCIA CRÍTICA DE RESTABLECIMIENTO TOTAL! ⚠️\n\n¿Estás seguro de que deseas restablecer absolutamente TODO el sistema a cero?\n\n" +
      "Esto vaciará permanentemente:\n" +
      "- Todas las reservas registradas.\n" +
      "- Todos los pases de visitas y accesos.\n" +
      "- Todos los pagos de vigilancia y comprobantes.\n" +
      "- Todos los usuarios y directivas creadas.\n" +
      "- Todos los inmuebles/lotes.\n" +
      "- Todos los registros en el simulador de correo.\n" +
      "- Las configuraciones de mora volverán por defecto.\n\n" +
      "Solo se conservará el usuario Administrador del Sistema actual.\n" +
      "Esta acción NO se puede deshacer."
    );

    if (!isConfirmed) return;

    const confirmationInput = prompt("Para confirmar y continuar, por favor escribe exactamente: CONFIRMAR");
    if (confirmationInput !== "CONFIRMAR") {
      alert("Operación cancelada. El texto ingresado no coincide con 'CONFIRMAR'.");
      return;
    }

    setResettingDb(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST"
      });
      if (res.ok) {
        alert("¡Sistema restablecido con éxito! Reiniciando el portal para aplicar los cambios.");
        window.location.reload();
      } else {
        const err = await res.json();
        alert("Error al restablecer el sistema: " + (err.error || "Error desconocido"));
      }
    } catch (e: any) {
      alert("Error de conexión al intentar restablecer el sistema: " + e.message);
    } finally {
      setResettingDb(false);
    }
  };

  // Add reservation norm
  const handleAddNorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNorm.trim()) return;
    
    const updatedNorms = [...norms, newNorm.trim()];
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationNorms: updatedNorms })
      });
      if (res.ok) {
        setNorms(updatedNorms);
        setNewNorm("");
      }
    } catch (e) {
      alert("Error de red al agregar normativa.");
    }
  };

  // Delete reservation norm
  const handleDeleteNorm = async (indexToDelete: number) => {
    const updatedNorms = norms.filter((_, idx) => idx !== indexToDelete);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationNorms: updatedNorms })
      });
      if (res.ok) {
        setNorms(updatedNorms);
      }
    } catch (e) {
      alert("Error de red al eliminar normativa.");
    }
  };

  // Calculate stats based on filters
  const getFilteredStats = () => {
    // 1. Total Collected
    // Filter approved payments by year/month
    const approvedPayments = rawPayments.filter(p => p.status === "approved");
    let totalCollected = 0;

    approvedPayments.forEach(p => {
      if (selectedMonth === "todos") {
        // sum all payments belonging to the chosen year
        const matchesYear = p.months && p.months.some((m: string) => m.includes(selectedYear));
        if (matchesYear) {
          totalCollected += Number(p.amount || 0);
        }
      } else {
        // sum payments that specifically include the chosen month
        const matchesMonth = p.months && p.months.includes(selectedMonth);
        if (matchesMonth) {
          // Since payments can bundle multiple months, we prorate or just count the full amount if it matches
          totalCollected += Number(p.amount || 0);
        }
      }
    });

    // 2. Count statuses in selected period
    // If selectedMonth is "todos", we use the consolidated year statuses directly.
    // If a specific month is selected, we calculate if a house has paid that specific month.
    let upToDateCount = 0;
    let inMoraCount = 0;
    const details: Array<{
      house: string;
      statusLabel: "Al día" | "Mora";
      paidInPeriod: string[];
      pendingInPeriod: string[];
      amountPaid: number;
    }> = [];

    paymentStatuses.forEach(ps => {
      const housePayments = approvedPayments.filter(p => p.house.toLowerCase() === ps.house.toLowerCase());
      
      if (selectedMonth === "todos") {
        // Consolidated
        const isMora = ps.status === "mora";
        if (isMora) inMoraCount++;
        else upToDateCount++;

        // Calculate amount paid for the whole year 2026 by this house
        const amountPaid = housePayments
          .filter(p => p.months && p.months.some((m: string) => m.includes(selectedYear)))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        details.push({
          house: ps.house,
          statusLabel: isMora ? "Mora" : "Al día",
          paidInPeriod: ps.paidMonths,
          pendingInPeriod: ps.pendingMonths,
          amountPaid
        });
      } else {
        // Specific month query
        const hasPaidMonth = ps.paidMonths.includes(selectedMonth);
        if (hasPaidMonth) {
          upToDateCount++;
        } else {
          inMoraCount++;
        }

        const amountPaid = housePayments
          .filter(p => p.months && p.months.includes(selectedMonth))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        details.push({
          house: ps.house,
          statusLabel: hasPaidMonth ? "Al día" : "Mora",
          paidInPeriod: hasPaidMonth ? [selectedMonth] : [],
          pendingInPeriod: !hasPaidMonth ? [selectedMonth] : [],
          amountPaid
        });
      }
    });

    return {
      totalCollected,
      upToDateCount,
      inMoraCount,
      details
    };
  };

  const { totalCollected, upToDateCount, inMoraCount, details } = getFilteredStats();

  // Export to CSV
  const handleExportCSV = () => {
    const periodName = selectedMonth === "todos" ? `Anual_${selectedYear}` : selectedMonth.replace(" ", "_");
    const filename = `Reporte_Pagos_${periodName}.csv`;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Reporte de Estado de Pagos Residencial Kuaukali\n";
    csvContent += `Periodo: ${selectedMonth === "todos" ? `Todo el ${selectedYear}` : selectedMonth}\n`;
    csvContent += `Monto Total Recaudado: $${totalCollected.toFixed(2)}\n`;
    csvContent += `Inmuebles al Dia: ${upToDateCount}\n`;
    csvContent += `Inmuebles en Mora: ${inMoraCount}\n\n`;
    csvContent += "Inmueble,Estado,Monto Pagado en Periodo,Meses Pagados,Meses Pendientes\n";

    details.forEach(row => {
      const paidStr = `"${row.paidInPeriod.join(", ")}"`;
      const pendingStr = `"${row.pendingInPeriod.join(", ")}"`;
      csvContent += `${row.house},${row.statusLabel},$${row.amountPaid.toFixed(2)},${paidStr},${pendingStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:p-0 font-sans" id="config-panel">
      
      {/* Title Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex items-center justify-between border border-slate-850 shadow-md print:hidden">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Panel de Configuración de la Directiva</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Herramientas exclusivas para gestionar parámetros de mora, actualizar normativas de reserva de la Casa Club y exportar estados financieros consolidados de las propiedades.
          </p>
        </div>
        <div className="bg-purple-950 border border-purple-800 text-purple-300 rounded-full px-4 py-1 text-xs font-mono font-bold hidden sm:block">
          {currentUser.role === "directiva" ? "Rol: Directiva" : "Rol: Sys Admin"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:space-y-8">
        
        {/* Left column - Settings */}
        <div className="lg:col-span-1 space-y-8 print:hidden">
          
          {/* Mora Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wide">Parámetros de Vigilancia y Mora</h3>
            </div>

            {loadingConfig ? (
              <div className="text-xs text-slate-400 text-center py-4">Cargando parámetros...</div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Monto de Cuota Mensual (USD):
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-extrabold text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-24 pl-3 pr-2 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-hidden text-center text-xs"
                    />
                    <span className="text-slate-500 font-medium">USD al mes</span>
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium bg-amber-50/70 border border-amber-200 rounded-xl p-3 mt-1.5 leading-relaxed">
                    ⚠️ <strong>Regla Financiera:</strong> Cualquier cambio en la cuota aplicará a partir del <strong>siguiente mes</strong> (Julio 2026). El mes actual en curso (Junio 2026) se mantiene con la cuota previa para proteger cobros conciliados.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Meses para considerar en MORA:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={moraThreshold}
                      onChange={(e) => setMoraThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 pl-3 pr-2 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-hidden text-center"
                    />
                    <span className="text-slate-500 font-medium">meses o más sin pagar</span>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Si una propiedad tiene este número (o más) de meses pendientes de pago, su estado cambiará automáticamente a "Mora".
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Contar mora a partir del mes:
                  </label>
                  <select
                    value={moraStartMonth}
                    onChange={(e) => setMoraStartMonth(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-hidden"
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Los meses anteriores a la fecha seleccionada no serán contabilizados en la deuda pendiente de los residentes.
                  </p>
                </div>

                {/* Historical Log */}
                {feeHistory && feeHistory.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    <label className="block font-bold text-slate-700">
                      Historial de Ajustes de Cuota:
                    </label>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 divide-y divide-slate-200/60 max-h-36 overflow-y-auto">
                      {feeHistory.map((h: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 first:pt-0 last:pb-0 text-[10px] text-slate-600 font-mono">
                          <div>
                            <span className="font-bold text-teal-600 font-sans text-xs">${h.fee}.00</span>
                            <span className="text-slate-400 font-sans ml-1">desde {h.effectiveFromMonth}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-sans">
                            {new Date(h.updatedAt).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {saveStatus && (
                  <div className={`p-2.5 rounded text-[11px] font-medium leading-relaxed ${
                    saveStatus.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                  }`}>
                    {saveStatus.message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveMoraConfig}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Parámetros</span>
                </button>
              </div>
            )}
          </div>

          {/* Reservation Norms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wide">Normativas de Reserva</h3>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[11px] text-slate-500">
                Estas reglas aparecen en los correos automáticos de confirmación enviados a los residentes tras aprobarse sus reservas.
              </p>

              {loadingConfig ? (
                <div className="text-xs text-slate-400 text-center py-4">Cargando normativas...</div>
              ) : (
                <>
                  <ul className="space-y-3 bg-slate-50 p-3 rounded-xl max-h-60 overflow-y-auto border border-slate-150">
                    {norms.length === 0 ? (
                      <li className="text-slate-400 text-center py-3 italic">No hay normativas configuradas.</li>
                    ) : (
                      norms.map((norm, idx) => (
                        <li key={idx} className="flex items-start justify-between space-x-2 bg-white p-2 rounded-lg border border-slate-100 shadow-3xs group">
                          <span className="text-slate-700 font-medium leading-relaxed flex-1">{norm}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNorm(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors shrink-0 opacity-100 group-hover:opacity-100 cursor-pointer"
                            title="Eliminar normativa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>

                  <form onSubmit={handleAddNorm} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva normativa de uso..."
                      value={newNorm}
                      onChange={(e) => setNewNorm(e.target.value)}
                      className="flex-1 pl-3 pr-2 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden text-xs"
                    />
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center"
                      title="Agregar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Admin System Maintenance (Only for Sys Admin u_admin or admin role) */}
          {(currentUser.id === "u_admin" || currentUser.role === "admin") && (
            <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-rose-150 pb-3 flex items-center space-x-2 text-rose-800">
                <Trash2 className="h-5 w-5 text-rose-600 animate-pulse" />
                <h3 className="font-bold font-sans text-xs uppercase tracking-wider">Mantenimiento de Sistema</h3>
              </div>
              
              <p className="text-xs text-rose-700 leading-relaxed font-sans">
                <strong>Atención:</strong> Esta acción realizará un vaciado total de la base de datos (restablecimiento de fábrica a cero).
              </p>
              
              <ul className="text-[10px] text-rose-650 list-disc list-inside space-y-1 font-sans">
                <li>Se eliminarán todas las reservas de la Casa Club.</li>
                <li>Se eliminarán todos los pases de visita de caseta.</li>
                <li>Se eliminarán todos los pagos y comprobantes bancarios.</li>
                <li>Se eliminarán todos los usuarios (excepto este administrador).</li>
                <li>Se eliminarán todos los inmuebles y lotes configurados.</li>
                <li>Se limpiarán los registros del simulador de correos.</li>
                <li>Las configuraciones volverán a valores por defecto.</li>
              </ul>

              {resettingDb ? (
                <div className="text-xs text-rose-700 text-center py-2 font-bold flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando vaciado de datos...</span>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-factory-reset"
                  onClick={handleFactoryReset}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm text-xs font-sans border border-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Restablecer Todo a Cero</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Right column - Reports Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Export & Reporting Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
            
            {/* Header with Period Controls */}
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wide flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <span>Reporte Financiero y Estado de Pagos</span>
                </h3>
                <p className="text-xs text-slate-450">Filtre por mes o año y exporte el documento consolidador.</p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                <div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="2026">Año 2026</option>
                  </select>
                </div>
                <div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="todos">Todo el año</option>
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Print Header (Visible ONLY during print) */}
            <div className="hidden print:block space-y-3 pb-6 border-b border-slate-300">
              <div className="flex items-center space-x-3">
                <div className="bg-slate-900 text-white p-2.5 rounded-lg">
                  <Building className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Residencial KuauKali</h1>
                  <p className="text-xs font-semibold text-amber-600 tracking-wider uppercase font-mono">Nuevo Cuscatlán</p>
                </div>
              </div>
              <div className="pt-2">
                <h2 className="text-base font-bold text-slate-800">REPORTE FINANCIERO Y ESTADO DE PAGOS RESIDENCIALES</h2>
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-600 font-mono mt-1.5">
                  <p><strong>Fecha de Generación:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Período Auditado:</strong> {selectedMonth === "todos" ? `Anual ${selectedYear}` : selectedMonth}</p>
                </div>
              </div>
            </div>

            {loadingReport ? (
              <div className="text-xs text-slate-400 text-center py-12">Procesando reportes financieros...</div>
            ) : (
              <div className="space-y-6">
                
                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Total Collected */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 flex items-center space-x-3.5 relative overflow-hidden">
                    <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-lg shrink-0">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-450 font-mono">Total Recaudado</p>
                      <h4 className="text-lg font-bold text-slate-900 font-mono mt-0.5">${totalCollected.toLocaleString("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    </div>
                  </div>

                  {/* Properties Al Dia */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 flex items-center space-x-3.5 relative overflow-hidden">
                    <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-lg shrink-0">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-450 font-mono">Inmuebles Al Día</p>
                      <h4 className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{upToDateCount}</h4>
                    </div>
                  </div>

                  {/* Properties in Mora */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 flex items-center space-x-3.5 relative overflow-hidden">
                    <div className="bg-rose-500/10 text-rose-600 p-3 rounded-lg shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-450 font-mono">Inmuebles en Mora</p>
                      <h4 className="text-lg font-bold text-rose-700 font-mono mt-0.5">{inMoraCount}</h4>
                    </div>
                  </div>

                </div>

                {/* Properties detailed status table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-sans">
                      Detalle de Solvencia por Propiedad
                    </h4>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 print:hidden">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                        title="Exportar a archivo de Excel/CSV"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Exportar CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                        title="Imprimir reporte en papel o PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-mono">
                          <th className="px-4 py-3">Inmueble / Lote</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Recaudado</th>
                          <th className="px-4 py-3">Meses Pagados</th>
                          <th className="px-4 py-3">Meses Pendientes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 font-sans text-slate-700">
                        {details.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3.5 font-bold text-slate-900">{row.house}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                row.statusLabel === "Al día"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {row.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900 text-right font-mono">
                              ${row.amountPaid.toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono text-[10px] max-w-[200px] truncate" title={row.paidInPeriod.join(", ")}>
                              {row.paidInPeriod.length === 0 ? "Ninguno" : row.paidInPeriod.join(", ")}
                            </td>
                            <td className="px-4 py-3.5 text-slate-400 font-mono text-[10px] max-w-[200px] truncate" title={row.pendingInPeriod.join(", ")}>
                              {row.pendingInPeriod.length === 0 ? "Ninguno" : row.pendingInPeriod.join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
