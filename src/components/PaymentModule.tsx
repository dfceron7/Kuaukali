/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, VigilancePayment, HousePaymentStatus } from "../types";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  FileText, 
  Upload, 
  RefreshCw, 
  Download, 
  Eye, 
  Check, 
  Clock,
  ChevronRight,
  Info,
  Shield,
  Home,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface PaymentModuleProps {
  currentUser: User;
}

const ALL_MONTHS_2026 = [
  // 2026
  "Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026", "Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026",
  // 2027
  "Enero 2027", "Febrero 2027", "Marzo 2027", "Abril 2027", "Mayo 2027", "Junio 2027", "Julio 2027", "Agosto 2027", "Septiembre 2027", "Octubre 2027", "Noviembre 2027", "Diciembre 2027",
  // 2028
  "Enero 2028", "Febrero 2028", "Marzo 2028", "Abril 2028", "Mayo 2028", "Junio 2028", "Julio 2028", "Agosto 2028", "Septiembre 2028", "Octubre 2028", "Noviembre 2028", "Diciembre 2028",
  // 2029
  "Enero 2029", "Febrero 2029", "Marzo 2029", "Abril 2029", "Mayo 2029", "Junio 2029", "Julio 2029", "Agosto 2029", "Septiembre 2029", "Octubre 2029", "Noviembre 2029", "Diciembre 2029",
  // 2030
  "Enero 2030", "Febrero 2030", "Marzo 2030", "Abril 2030", "Mayo 2030", "Junio 2030", "Julio 2030", "Agosto 2030", "Septiembre 2030", "Octubre 2030", "Noviembre 2030", "Diciembre 2030"
];

const MONTHLY_FEE = 50; // $50 USD per month

export default function PaymentModule({ currentUser }: PaymentModuleProps) {
  const [payments, setPayments] = useState<VigilancePayment[]>([]);
  const [statusList, setStatusList] = useState<HousePaymentStatus[]>([]);
  const [myStatus, setMyStatus] = useState<HousePaymentStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [config, setConfig] = useState<any>(null);

  // Forms and state
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [transactionReference, setTransactionReference] = useState<string>("");
  const [proofFileName, setProofFileName] = useState<string>("");
  const [proofFileUrl, setProofFileUrl] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coupons / Slip generator
  const [provisionalCoupon, setProvisionalCoupon] = useState<{
    months: string[];
    amount: number;
    code: string;
    correlative: string;
    generatedAt: string;
  } | null>(null);

  // Modals & tabs
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<VigilancePayment | null>(null);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [adminTab, setAdminTab] = useState<"pending" | "history">("pending");

  const getFeeForMonth = (monthName: string) => {
    if (!config) return 100;
    const defaultFee = config.monthlyFee !== undefined ? Number(config.monthlyFee) : 100;
    const history = config.feeHistory || [];
    if (history.length === 0) return defaultFee;

    const targetIdx = ALL_MONTHS_2026.indexOf(monthName);
    if (targetIdx === -1) return defaultFee;

    let bestFee = defaultFee;
    let bestIdx = -1;

    for (const entry of history) {
      const entryIdx = ALL_MONTHS_2026.indexOf(entry.effectiveFromMonth);
      if (entryIdx !== -1 && entryIdx <= targetIdx) {
        if (entryIdx > bestIdx) {
          bestIdx = entryIdx;
          bestFee = Number(entry.fee);
        }
      }
    }
    return bestFee;
  };

  const calculateTotalAmount = (months: string[]): number => {
    return months.reduce((total, m) => total + getFeeForMonth(m), 0);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch payments list
      const resPayments = await fetch(`/api/payments?userId=${currentUser.id}&role=${currentUser.role}`);
      if (resPayments.ok) {
        const data = await resPayments.json();
        // Sort descending
        const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayments(sorted);
      }

      // 2. Fetch general status
      const resStatus = await fetch("/api/payments/status");
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        setStatusList(statusData);

        if (currentUser.role === "resident") {
          const match = statusData.find((s: HousePaymentStatus) => s.house.toLowerCase() === currentUser.house.toLowerCase());
          if (match) {
            setMyStatus(match);
          }
        }
      }

      // 3. Fetch config
      const resConfig = await fetch("/api/config");
      if (resConfig.ok) {
        const data = await resConfig.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Error fetching payment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Handle month selection
  const handleToggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  // Generate provisional coupon code
  const handleGenerateCoupon = () => {
    if (selectedMonths.length === 0) {
      setErrorMsg("Debe seleccionar al menos un mes para generar el recibo de pago provisional.");
      return;
    }
    setErrorMsg(null);
    const code = `TAL-${Math.floor(10000 + Math.random() * 90000)}`;
    const correlative = `PROV-2206-${Math.floor(100 + Math.random() * 900)}`;
    setProvisionalCoupon({
      months: [...selectedMonths],
      amount: calculateTotalAmount(selectedMonths),
      code,
      correlative,
      generatedAt: new Date().toLocaleDateString("es-ES")
    });
  };

  // Handle proof file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate mock proof for ease of testing
  const handleGenerateMockProof = () => {
    const mockRef = transactionReference.trim() || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    if (!transactionReference) {
      setTransactionReference(mockRef);
    }
    const svgContent = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'>
      <rect width='400' height='300' fill='%23f1f5f9'/>
      <rect x='20' y='20' width='360' height='260' fill='white' stroke='%23cbd5e1' stroke-width='2' rx='8'/>
      <text x='50%25' y='50' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle' fill='%230f172a'>COMPROBANTE DE TRANSFERENCIA</text>
      <text x='50%25' y='90' font-family='sans-serif' font-size='12' text-anchor='middle' fill='%2364748b'>Banco de la Comunidad S.A.</text>
      <line x1='40' y1='110' x2='360' y2='110' stroke='%23e2e8f0'/>
      <text x='50' y='140' font-family='sans-serif' font-size='11' fill='%23475569'>Referencia: ${mockRef}</text>
      <text x='50' y='165' font-family='sans-serif' font-size='11' fill='%23475569'>Destinatario: Residencial KuauKali S.A.</text>
      <text x='50' y='190' font-family='sans-serif' font-size='11' fill='%23475569'>Origen: ${currentUser.house}</text>
      <text x='50' y='215' font-family='sans-serif' font-size='11' fill='%23475569'>Meses: ${selectedMonths.join(", ")}</text>
      <text x='50' y='245' font-family='sans-serif' font-size='14' font-weight='bold' fill='%230d9488'>Monto: $${calculateTotalAmount(selectedMonths)}.00 USD</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    setProofFileUrl(dataUrl);
    setProofFileName(`transferencia_simulada_${mockRef.toLowerCase()}.png`);
  };

  // Submit payment registration
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonths.length === 0) {
      setErrorMsg("Debe seleccionar al menos un mes a cancelar.");
      return;
    }
    if (!transactionReference.trim()) {
      setErrorMsg("Ingrese el número de referencia de la transferencia.");
      return;
    }
    if (!proofFileUrl) {
      setErrorMsg("Debe adjuntar el comprobante de pago (transferencia).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.username,
          house: currentUser.house,
          userEmail: currentUser.email,
          months: selectedMonths,
          amount: calculateTotalAmount(selectedMonths),
          transactionReference: transactionReference.trim(),
          proofFileName,
          proofFileUrl
        })
      });

      if (res.ok) {
        setSuccessMsg("¡Pago registrado exitosamente! Ha sido enviado a la cola de validación de administración.");
        // Reset form
        setSelectedMonths([]);
        setTransactionReference("");
        setProofFileName("");
        setProofFileUrl("");
        setProvisionalCoupon(null);
        await fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Error al registrar el pago.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error de red al enviar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Actions (Approve/Reject)
  const handleVerifyPayment = async (id: string, action: "approved" | "rejected") => {
    if (action === "rejected" && !rejectionReason.trim()) {
      alert("Por favor ingrese un motivo de rechazo para el propietario.");
      return;
    }

    try {
      const res = await fetch(`/api/payments/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "rejected" ? rejectionReason.trim() : undefined
        })
      });

      if (res.ok) {
        // Reset states
        setRejectingPaymentId(null);
        setRejectionReason("");
        await fetchData();
        alert(action === "approved" ? "Pago aprobado correctamente y recibo enviado al cliente." : "Pago rechazado correctamente con la observación enviada al cliente.");
      } else {
        alert("Ocurrió un error al procesar el estado del pago.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de comunicación.");
    }
  };

  // Mock download function
  const triggerMockDownload = (payment: VigilancePayment) => {
    alert(`Iniciando descarga de Recibo Oficial ${payment.correlative} (Formato PDF simulado). Constancia de solvencia guardada exitosamente.`);
  };

  // Render Resident panel
  const renderResidentView = () => {
    const pendingToPay = ALL_MONTHS_2026.filter(m => {
      // Find out if already paid in approved payments
      const isPaid = (myStatus?.paidMonths || []).includes(m);
      // Or if currently pending in validation queue
      const isPending = payments.some(p => p.status === "pending" && p.months.includes(m));
      return !isPaid && !isPending;
    });

    const pendingInValidation = ALL_MONTHS_2026.filter(m => {
      return payments.some(p => p.status === "pending" && p.months.includes(m));
    });

    // Filter displayed lists based on user-selected year
    const displayedPendingToPay = pendingToPay.filter(m => m.endsWith(selectedYear));
    const displayedPendingInValidation = pendingInValidation.filter(m => m.endsWith(selectedYear));

    return (
      <div className="space-y-8" id="resident-payments-module">
        {/* Status banner */}
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          myStatus?.status === "al_dia" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
            : "bg-rose-50 border-rose-200 text-rose-950"
        }`}>
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-xl mt-0.5 ${
              myStatus?.status === "al_dia" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}>
              {myStatus?.status === "al_dia" ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Mi Cuenta de Vigilancia</span>
              <h2 className="text-xl font-bold font-sans mt-0.5">
                {currentUser.house}: {myStatus?.status === "al_dia" ? "SOLVENTE / AL DÍA" : "EN MORA"}
              </h2>
              <p className="text-xs leading-relaxed mt-1 text-slate-600 max-w-xl">
                {myStatus?.status === "al_dia" 
                  ? "¡Felicidades! Su cuenta de cuota de vigilancia se encuentra totalmente solvente al día de hoy. Puede realizar reservaciones de la casa club libremente."
                  : `Usted cuenta con ${myStatus?.pendingMonthsCount} mes(es) vencido(s) de cuota de vigilancia. Debido a políticas de condominio, no se le permitirá realizar reservaciones de la Casa Club hasta estar solvente.`}
              </p>
              {myStatus?.status === "mora" && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase font-mono">Meses pendientes:</span>
                  {myStatus?.pendingMonths.map((m, idx) => (
                    <span key={idx} className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-450 block">Precio de Cuota de Vigilancia</span>
            <span className="text-2xl font-black text-slate-900">${config?.monthlyFee ?? 100}.00 <span className="text-xs font-normal text-slate-500">USD / mes</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left panel: Registration */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 font-sans flex items-center space-x-2">
                  <CreditCard className="text-teal-600 h-4 w-4" />
                  <span>Registrar Pago de Cuota de Vigilancia</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pague de forma anticipada o salde sus meses pendientes mediante transferencia bancaria.
                </p>
              </div>

              {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-xl text-xs font-medium">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-6">
                
                {/* 1. Select Months with Year Filter */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      1. Seleccione los meses a pagar:
                    </label>
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-500 font-medium">Año:</span>
                      <select
                        id="filter-year-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-1 px-2.5 font-bold text-slate-700 focus:outline-hidden focus:border-teal-500 cursor-pointer transition-all"
                      >
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                        <option value="2029">2029</option>
                        <option value="2030">2030</option>
                      </select>
                    </div>
                  </div>
                  
                  {displayedPendingToPay.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl text-xs flex items-center space-x-2">
                      <CheckCircle className="text-emerald-500 h-4 w-4 shrink-0" />
                      <span>No hay cuotas pendientes ni adelantadas por registrar para el año <strong>{selectedYear}</strong> (ya están pagadas o en proceso de validación). Cambie el año para registrar otros periodos.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {displayedPendingToPay.map((month) => (
                        <button
                          key={month}
                          type="button"
                          id={`btn-toggle-month-${month.replace(/\s+/g, '-')}`}
                          onClick={() => handleToggleMonth(month)}
                          className={`p-3 rounded-xl border text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                            selectedMonths.includes(month)
                              ? "bg-teal-50 border-teal-500 text-teal-950 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span>{month}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-1.5 ${
                            selectedMonths.includes(month)
                              ? "bg-teal-600 border-teal-600 text-white"
                              : "border-slate-300"
                          }`}>
                            {selectedMonths.includes(month) && <Check className="h-2.5 w-2.5" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {displayedPendingInValidation.length > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-100 mt-2 flex items-start space-x-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        Meses en validación administrativa para el año <strong>{selectedYear}</strong>: <strong>{displayedPendingInValidation.join(", ")}</strong>. Espere la verificación para estos periodos.
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Amount and Coupon Generator */}
                {selectedMonths.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 uppercase font-mono">Meses seleccionados ({selectedMonths.length}):</span>
                      <strong className="text-slate-900">{selectedMonths.join(", ")}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 uppercase font-mono">Costo total a cancelar:</span>
                      <strong className="text-lg text-teal-700 font-sans">${calculateTotalAmount(selectedMonths)}.00 USD</strong>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateCoupon}
                        className="flex-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                        <span>Generar Talón de Pago / Referencia</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Provisional Coupon Display */}
                {provisionalCoupon && (
                  <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-amber-200 pb-2.5">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-amber-700 font-bold tracking-widest block">Residencial KuauKali</span>
                        <strong className="text-xs text-slate-900 font-sans">TALÓN DE PAGO PROVISIONAL</strong>
                      </div>
                      <span className="font-mono text-xs font-black text-slate-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">{provisionalCoupon.code}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Concepto:</span>
                        <span className="font-bold text-slate-800">Cuota Vigilancia {provisionalCoupon.months.join(", ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Monto a Transferir:</span>
                        <span className="font-extrabold text-slate-900">${provisionalCoupon.amount}.00 USD</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs">
                      <strong className="text-[10px] font-mono uppercase text-teal-800 block">Datos Bancarios para Transferencia:</strong>
                      <div className="grid grid-cols-3 gap-y-1 text-[11px] font-mono text-slate-700">
                        <span>Banco:</span> <strong className="col-span-2 text-slate-900">Banco de la Comunidad S.A.</strong>
                        <span>Cuenta:</span> <strong className="col-span-2 text-slate-900">9120-4820-2019</strong>
                        <span>CLABE:</span> <strong className="col-span-2 text-slate-900">012180009120482022</strong>
                        <span>Referencia:</span> <strong className="col-span-2 text-rose-700">{currentUser.house.replace(" ", "")}-{provisionalCoupon.code}</strong>
                      </div>
                    </div>

                    <p className="text-[10px] text-amber-800 leading-relaxed italic">
                      * Realice su transferencia bancaria por la banca de su preferencia, guarde el comprobante en su dispositivo, y prosiga a rellenar los datos de abajo.
                    </p>
                  </div>
                )}

                {/* 3. Transaction Info */}
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <span className="block text-xs font-bold text-slate-700 uppercase">
                    2. Ingrese los datos de la transferencia bancaria realizada:
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Número de Referencia de Transferencia:</label>
                      <input
                        type="text"
                        placeholder="ej. TXN-102948"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-teal-500 font-mono text-slate-950"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Adjuntar Comprobante de Pago:</label>
                      <div className="flex gap-2">
                        <label className="flex-1 w-full border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3 py-2.5 text-xs text-slate-500 flex items-center justify-center space-x-1.5 cursor-pointer font-bold select-none">
                          <Upload className="h-4 w-4 text-slate-450" />
                          <span className="truncate">{proofFileName || "Subir Comprobante"}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {proofFileUrl && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex justify-between items-center">
                      <span className="text-slate-500">Vista previa cargada: <strong className="text-slate-700">{proofFileName}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          // open a quick view
                          const win = window.open();
                          if (win) win.document.write(`<img src="${proofFileUrl}" />`);
                        }}
                        className="text-[11px] text-teal-600 font-bold hover:underline flex items-center space-x-0.5 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Ver Comprobante</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || selectedMonths.length === 0}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed select-none"
                >
                  {submitting ? "Procesando Registro..." : "Registrar Pago y Enviar a Validación"}
                </button>

              </form>
            </div>
          </div>

          {/* Right panel: History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900 font-sans flex items-center space-x-2">
                  <Clock className="text-teal-600 h-4 w-4" />
                  <span>Historial de Pagos Registrados</span>
                </h3>
                <button
                  onClick={fetchData}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Recargar pagos"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-sans">
                  No ha registrado ningún pago todavía.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-slate-900 block font-sans">{p.months.join(", ")}</strong>
                          <span className="text-[10px] text-slate-400 block">{new Date(p.createdAt).toLocaleDateString("es-ES")} • Ref: {p.correlative}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : p.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {p.status === "approved" ? "Aprobado" : p.status === "rejected" ? "Rechazado" : "Pendiente"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                        <span>Monto: <strong className="text-slate-800">${p.amount}.00 USD</strong></span>
                        <span className="truncate">Ref. Banco: <strong className="text-slate-800">{p.transactionReference}</strong></span>
                      </div>

                      {p.status === "rejected" && p.rejectionReason && (
                        <div className="bg-rose-50 border-l-3 border-rose-500 p-2.5 rounded-r-lg text-[10px] text-rose-900 mt-1">
                          <strong className="block font-bold">Observación de Administración:</strong>
                          <p className="italic mt-0.5">"{p.rejectionReason}"</p>
                        </div>
                      )}

                      {p.status === "approved" && (
                        <div className="pt-2 flex gap-1.5">
                          <button
                            onClick={() => setSelectedPaymentForModal(p)}
                            className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-800 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Ver Recibo Virtual</span>
                          </button>
                          
                          <button
                            onClick={() => triggerMockDownload(p)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="Descargar Recibo en PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal for Virtual Receipt */}
        {selectedPaymentForModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-300 overflow-hidden shadow-2xl space-y-6">
              
              <div className="bg-teal-900 p-5 text-white flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-teal-400" />
                  <h3 className="font-bold text-sm uppercase tracking-wide">Constancia Oficial de Solvencia</h3>
                </div>
                <button
                  onClick={() => setSelectedPaymentForModal(null)}
                  className="text-teal-200 hover:text-white font-black text-sm p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                
                <div className="text-center pb-4 border-b border-dashed border-slate-200">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Residencial KuauKali</span>
                  <h4 className="text-lg font-black text-slate-800 font-sans mt-0.5">RECIBO DE PAGO OFICIAL</h4>
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mt-2">
                    ✓ Comprobado y Solvente
                  </span>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Correlativo Oficial:</span>
                    <strong className="text-slate-900">{selectedPaymentForModal.correlative}</strong>
                  </div>
                  
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Código de Validación:</span>
                    <strong className="text-slate-900 font-mono">{selectedPaymentForModal.passCode}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Lote / Casa Destinatario:</span>
                    <strong className="text-slate-900">{selectedPaymentForModal.house}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Meses Solventados:</span>
                    <strong className="text-teal-700 font-bold">{selectedPaymentForModal.months.join(", ")}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Monto Cancelado:</span>
                    <strong className="text-slate-900">${selectedPaymentForModal.amount}.00 USD</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Referencia de Transferencia:</span>
                    <strong className="text-slate-900 font-mono">{selectedPaymentForModal.transactionReference}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-450 uppercase font-mono text-[10px]">Fecha de Conciliación:</span>
                    <span className="text-slate-600 font-medium">
                      {selectedPaymentForModal.processedAt ? new Date(selectedPaymentForModal.processedAt).toLocaleString("es-ES") : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center text-[10px] text-slate-500 leading-relaxed font-mono">
                  Sello Digital de Seguridad KuauKali:<br/>
                  SHA256:{Math.random().toString(36).substring(2, 15).toUpperCase()}
                </div>

                <button
                  onClick={() => triggerMockDownload(selectedPaymentForModal)}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar Recibo Virtual (PDF)</span>
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Admin panel (Queue)
  const renderAdminView = () => {
    const pendingPayments = payments.filter(p => p.status === "pending");
    const historicalPayments = payments.filter(p => p.status !== "pending");

    const currentList = adminTab === "pending" ? pendingPayments : historicalPayments;

    return (
      <div className="space-y-6" id="admin-payments-queue">
        
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">
              Cola de Validación de Cuotas de Vigilancia
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verifique las transferencias registradas por los residentes y apruebe para emitir el recibo de solvencia o rechace con comentarios.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setAdminTab("pending")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer select-none ${
                adminTab === "pending"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Pendientes ({pendingPayments.length})</span>
            </button>
            <button
              onClick={() => setAdminTab("history")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer select-none ${
                adminTab === "history"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Historial ({historicalPayments.length})</span>
            </button>
          </div>
        </div>

        {/* Payments List Table/Cards */}
        {currentList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-xs font-sans">
            No hay ningún registro de pago en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentList.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 font-sans text-xs"
              >
                
                {/* Heading details */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-teal-50 text-teal-800 p-2.5 rounded-xl border border-teal-150">
                      <Home className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Propietario / Unidad</span>
                      <strong className="text-slate-900 block text-sm">{p.house} ({p.userName})</strong>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Correlativo</span>
                    <strong className="text-slate-800 font-mono text-sm">{p.correlative}</strong>
                  </div>
                </div>

                {/* Sub details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-500 block font-mono text-[9px] uppercase">Meses Declarados:</span>
                    <strong className="text-teal-700 text-xs font-sans block mt-0.5">{p.months.join(", ")}</strong>
                  </div>
                  
                  <div>
                    <span className="text-slate-500 block font-mono text-[9px] uppercase">Monto Transferido:</span>
                    <strong className="text-slate-900 text-xs font-sans block mt-0.5">${p.amount}.00 USD</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-mono text-[9px] uppercase">Ref. de Transferencia Bancaria:</span>
                    <strong className="text-slate-950 font-mono text-xs block mt-0.5">{p.transactionReference}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-mono text-[9px] uppercase">Fecha de Registro:</span>
                    <span className="text-slate-600 block mt-0.5">{new Date(p.createdAt).toLocaleString("es-ES")}</span>
                  </div>
                </div>

                {/* Proof Attachment and Actions block */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  
                  {/* File Attachment info */}
                  <div className="flex items-center space-x-3 w-full md:w-auto">
                    <FileText className="text-slate-450 h-5 w-5 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">Comprobante adjunto</span>
                      <strong className="text-slate-700 truncate block text-[11px]">{p.proofFileName}</strong>
                    </div>
                    {p.proofFileUrl && (
                      <button
                        onClick={() => {
                          const win = window.open();
                          if (win) win.document.write(`<img src="${p.proofFileUrl}" style="max-width:100%; border-radius:8px;" />`);
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 flex items-center space-x-1 shrink-0 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspeccionar</span>
                      </button>
                    )}
                  </div>

                  {/* Operational buttons */}
                  {p.status === "pending" ? (
                    <div className="flex gap-2 w-full md:w-auto font-bold">
                      {rejectingPaymentId === p.id ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <input
                            type="text"
                            placeholder="Motivo de rechazo (obligatorio)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs text-rose-950 placeholder:text-rose-400 focus:outline-hidden focus:border-rose-500 w-full sm:w-64"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleVerifyPayment(p.id, "rejected")}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Confirmar Rechazo
                            </button>
                            <button
                              onClick={() => {
                                setRejectingPaymentId(null);
                                setRejectionReason("");
                              }}
                              className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setRejectingPaymentId(p.id)}
                            className="flex-1 md:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Rechazar Pago
                          </button>
                          
                          <button
                            onClick={() => handleVerifyPayment(p.id, "approved")}
                            className="flex-1 md:flex-initial bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Aprobar Pago
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-400 block text-right md:text-right">Estatus de Conciliación</span>
                      <strong className={`font-bold text-xs uppercase ${p.status === "approved" ? "text-emerald-700" : "text-rose-700"}`}>
                        {p.status === "approved" ? "✓ APROBADO Y REGISTRADO" : `✗ RECHAZADO: "${p.rejectionReason}"`}
                      </strong>
                    </div>
                  )}

                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    );
  };

  // Render Vigilante panel (Matrix of Houses with green/red status)
  const renderVigilanteView = () => {
    return (
      <div className="space-y-6 animate-fadeIn" id="vigilante-payments-matrix">
        
        {/* Sub Header */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-1.5">
              <Shield className="text-emerald-400 h-4 w-4" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">Residencial KuauKali • Privacidad Condóminos</span>
            </div>
            <h2 className="text-base font-bold font-sans mt-1.5 text-white">
              Matriz de Solvencia de Vigilancia
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl mt-1">
              Consulte el estado de pago de las viviendas del condominio. Por normativas de seguridad, este módulo solo despliega la nomenclatura de lotes y colores identificadores. Verde: Al día, Rojo: Cuenta en Mora (se indica el número de cuotas pendientes).
            </p>
          </div>

          <button
            onClick={fetchData}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl transition-all flex items-center space-x-1 font-mono font-bold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refrescar Matriz</span>
          </button>
        </div>

        {/* Matrix representation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pb-3 border-b border-slate-100">
            <span className="text-slate-550">Leyenda:</span>
            <div className="flex items-center space-x-1.5">
              <div className="w-4.5 h-4.5 bg-emerald-500 rounded-md border border-emerald-600"></div>
              <span className="text-slate-800">Al día (Solvente)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-4.5 h-4.5 bg-rose-500 rounded-md border border-rose-600 flex items-center justify-center text-[10px] text-white font-extrabold">2</div>
              <span className="text-slate-800">En Mora (# cuotas pendientes)</span>
            </div>
          </div>

          {statusList.length === 0 ? (
            <div className="py-12 text-center text-slate-450 text-xs">Cargando matriz de solvencia...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {statusList.map((st, idx) => (
                <div
                  key={idx}
                  className={`relative p-5 rounded-xl border flex flex-col items-center justify-center text-center font-bold aspect-square transition-all shadow-xs ${
                    st.status === "al_dia"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600"
                      : "bg-rose-500 hover:bg-rose-600 text-white border-rose-600"
                  }`}
                  title={`${st.house}: ${st.status === "al_dia" ? "Al día" : `Mora (${st.pendingMonthsCount} cuotas)`}`}
                >
                  <Home className="h-6 w-6 opacity-30 absolute top-2.5 left-2.5" />
                  
                  {/* House ID */}
                  <span className="text-base font-black tracking-tight uppercase font-sans z-10">{st.house}</span>
                  
                  {/* Solvency tag */}
                  <span className="text-[10px] font-mono opacity-85 mt-1 tracking-widest z-10">
                    {st.status === "al_dia" ? "Al Día" : "En Mora"}
                  </span>

                  {/* Pending count badge */}
                  {st.status === "mora" && (
                    <div className="absolute -top-2 -right-2 bg-slate-900 border-2 border-rose-400 text-rose-400 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-lg z-20" title={`Adeuda ${st.pendingMonthsCount} cuotas`}>
                      {st.pendingMonthsCount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-4" id="payments-main-root">
      {currentUser.role === "resident" && renderResidentView()}
      {currentUser.role === "admin" && renderAdminView()}
      {currentUser.role === "vigilante" && renderVigilanteView()}
    </div>
  );
}
