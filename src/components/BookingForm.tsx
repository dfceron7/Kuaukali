/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, DragEvent } from "react";
import { User, Reservation } from "../types";
import { Upload, FileText, Check, AlertCircle, Clock, Users, ArrowRight, ShieldCheck, CreditCard, RefreshCw } from "lucide-react";
import { compressBase64Image } from "../utils/image-compress";

interface BookingFormProps {
  currentUser: User;
  reservations: Reservation[];
  onReservationCreated: () => void;
}

export default function BookingForm({ currentUser, reservations, onReservationCreated }: BookingFormProps) {
  const [date, setDate] = useState<string>(
    new Date(Date.now() + 3600000 * 24).toISOString().split("T")[0] // default tomorrow
  );
  const [startTime, setStartTime] = useState<string>("12:00");
  const [endTime, setEndTime] = useState<string>("16:00");
  const [guestsCount, setGuestsCount] = useState<number>(30);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [solvencyLoading, setSolvencyLoading] = useState<boolean>(true);
  const [isEnMora, setIsEnMora] = useState<boolean>(false);
  const [pendingMonthsCount, setPendingMonthsCount] = useState<number>(0);

  React.useEffect(() => {
    const checkSolvency = async () => {
      try {
        const res = await fetch("/api/payments/status");
        if (res.ok) {
          const data = await res.json();
          const match = data.find((s: any) => s.house.toLowerCase() === currentUser.house.toLowerCase());
          if (match && match.status === "mora") {
            setIsEnMora(true);
            setPendingMonthsCount(match.pendingMonthsCount);
          } else {
            setIsEnMora(false);
            setPendingMonthsCount(0);
          }
        }
      } catch (err) {
        console.error("Error checking solvency:", err);
      } finally {
        setSolvencyLoading(false);
      }
    };
    checkSolvency();
  }, [currentUser]);

  // Time options (07:00 to 22:00 in steps of 30 mins)
  const timeOptions: string[] = [];
  for (let h = 7; h <= 22; h++) {
    const hh = String(h).padStart(2, "0");
    timeOptions.push(`${hh}:00`);
    timeOptions.push(`${hh}:30`);
  }

  // Parse hour minutes
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setErrorMsg("Por favor adjunte únicamente un archivo legible de imagen (JPG, PNG) o PDF.");
      return;
    }

    if (file.type === "application/pdf" && file.size > 350 * 1024) {
      setErrorMsg("El archivo PDF es demasiado grande (máximo 350 KB). Por favor, suba un PDF digital comprimido, o tome una foto/captura de pantalla para subirla como imagen.");
      return;
    }

    if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
      setErrorMsg("La imagen supera el límite de 10 MB. Por favor, suba una imagen de menor tamaño.");
      return;
    }
    
    setFileObject(file);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const compressed = await compressBase64Image(reader.result);
        setFileBase64(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const calculateHours = (): number => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    if (startMins >= endMins) return 0;
    return parseFloat(((endMins - startMins) / 60).toFixed(1));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    // Validation 1: correct interval
    if (startMins >= endMins) {
      setErrorMsg("La hora de finalización debe ser posterior a la hora de inicio.");
      return;
    }

    // Validation 2: Max 5 hours
    const durationMins = endMins - startMins;
    if (durationMins > 5 * 60) {
      setErrorMsg("El límite máximo por reserva de Casa Club es de 5 horas. Por favor reajuste el intervalo.");
      return;
    }

    // Validation 3: guest limits <= 50
    if (guestsCount > 50) {
      setErrorMsg("El reglamento de la residencia prohibe eventos de más de 50 invitados totales.");
      return;
    }

    // Validation 4: check target file upload
    if (!fileBase64) {
      setErrorMsg("Debe adjuntar el comprobante de transferencia bancaria de pago para validar la transacción.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: currentUser.id,
        date,
        startTime,
        endTime,
        guestsCount,
        proofFileName: fileObject ? fileObject.name : "transfer_proof.png",
        proofFileUrl: fileBase64
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al enviar la solicitud.");
      }

      setSuccessMsg(
        `¡Solicitud enviada con éxito! Su reserva para el ${date} está registrada con el estado "Pendiente". El administrador analizará su comprobante bancario adjunto.`
      );
      
      // Clean form state
      setFileObject(null);
      setFileBase64("");
      setGuestsCount(30);

      // Trigger load callback to refresh global lists
      onReservationCreated();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la reserva.");
    } finally {
      setLoading(false);
    }
  };

  const hoursDuration = calculateHours();

  if (solvencyLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
        <span>Verificando estado de solvencia de {currentUser.house}...</span>
      </div>
    );
  }

  if (isEnMora) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-rose-250 shadow-md overflow-hidden">
        <div className="bg-rose-900 text-white px-6 py-5 flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-rose-200 h-5 w-5 animate-pulse" />
            <h2 className="text-lg font-bold font-sans">RESERVACIÓN DE CASA CLUB DENEGADA</h2>
          </div>
          <span className="text-xs bg-rose-950 text-rose-300 px-3 py-1 rounded-full font-mono border border-rose-800 uppercase font-bold">
            Cuenta en Mora
          </span>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 border border-rose-200">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="font-extrabold text-slate-900 text-base">Su cuenta en la {currentUser.house} no se encuentra al día</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              De acuerdo con el reglamento vigente de Residencial KuauKali, los residentes que presenten adeudos de la cuota de vigilancia se encuentran suspendidos de hacer uso o reservar áreas comunes del condominio como la Casa Club.
            </p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 max-w-md mx-auto text-xs text-rose-950">
            Actualmente presenta un adeudo de <strong>{pendingMonthsCount} cuota(s) de vigilancia mensual(es)</strong> pendientes de validación.
          </div>

          <p className="text-[11px] text-slate-450 italic">
            * Una vez que realice el pago de sus cuotas pendientes y este sea aprobado por la administración, su acceso de reservaciones se habilitará inmediatamente.
          </p>

          <div className="pt-2">
            <p className="text-xs text-slate-500 mb-3">¿Ya realizó la transferencia bancaria? Registre su comprobante para regularizar su cuenta:</p>
            <button
              onClick={() => {
                const paymentsTabBtn = document.getElementById("bar-tab-payments");
                if (paymentsTabBtn) {
                  paymentsTabBtn.click();
                } else {
                  alert("Por favor use la barra de navegación superior e ingrese al módulo de 'Pagos' para regularizar.");
                }
              }}
              className="bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-slate-350" />
              <span>Ir al Módulo de Pagos</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Clock className="text-amber-400 h-5 w-5" />
          <h2 className="text-lg font-bold font-sans">Nueva Solicitud de Reserva</h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono border border-slate-700">
          Casa Club - Uso Común
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-4 rounded-r-lg flex items-start space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Error de Validación</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 p-4 rounded-r-lg flex items-start space-x-3 text-sm">
            <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Solicitud Recibida</span>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        {/* Input Date/Hours Selection row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fecha de Evento
            </label>
            <input
              id="input-date"
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 text-sm font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Hora de Inicio
            </label>
            <select
              id="select-start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 text-sm"
            >
              {timeOptions.map((t) => (
                <option key={`start-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Hora de Finalización
            </label>
            <select
              id="select-end-time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 text-sm"
            >
              {timeOptions.map((t) => (
                <option key={`end-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic hours length and summary label panel */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="text-amber-500 h-5 w-5" />
            <div>
              <span className="text-xs text-slate-500 font-mono block">Duración del Evento</span>
              <span className="text-sm font-bold text-slate-900 font-sans">
                {hoursDuration === 0 ? "Horas inválidas" : `${hoursDuration} horas totales de uso`}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded text-xs font-mono font-bold ${
              hoursDuration <= 5 && hoursDuration > 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {hoursDuration <= 5 && hoursDuration > 0 ? "Regla Horas OK (≤ 5 hs)" : "Supera límite (Máx 5 hs)"}
            </span>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Input numbers and parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Número Estimado de Invitados</span>
              <span className="text-slate-400 font-normal font-mono text-[11px]">(Menor o igual a 50)</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="input-guests"
                type="number"
                min="1"
                max="100"
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 text-sm"
                required
              />
            </div>
            {guestsCount > 50 && (
              <span className="text-rose-600 text-xs mt-1 block font-semibold">
                ⚠️ Supera la capacidad máxima del reglamento comunal (50 personas).
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Correo de Notificación
            </label>
            <div className="bg-slate-100 px-3 py-2 rounded-lg text-slate-600 text-sm border border-slate-200">
              {currentUser.email}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-mono">
              Recibirás las reglas y confirmación directa de administración.
            </span>
          </div>
        </div>

        {/* File proof input container (Drag and drop layout as requested by instructions) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Comprobante de Transferencia de Pago</span>
            <span className="text-[11px] text-amber-600 font-semibold uppercase flex items-center space-x-1">
              <CreditCard className="h-3 w-3" />
              <span>Validación Inmediata</span>
            </span>
          </label>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging
                ? "border-amber-500 bg-amber-50"
                : fileBase64
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-300 hover:border-amber-500 hover:bg-slate-50"
            }`}
          >
            <input
              id="input-proof-file"
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
              accept="image/*,application/pdf"
            />

            {!fileBase64 ? (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-600 font-medium">
                  Arrastre o seleccione el archivo de transferencia bancaria
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  Soporta formatos JPG, PNG, PDF (Máx. 10MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 block truncate max-w-xs md:max-w-md">
                      {fileObject?.name || "comprobante_transferencia.png"}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Carcasado con éxito • Imagen lista
                    </span>
                  </div>
                </div>
                
                {/* Visual miniature preview image tag with referrer no-referrer */}
                {fileBase64.startsWith("data:image/") && (
                  <img
                    src={fileBase64}
                    alt="Vista Previa de Pago"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 object-cover rounded-md border border-slate-200"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pre-purchase confirmation advisory banner */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50 flex space-x-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Garantía Residencial KuauKali:</strong> Al enviar esta solicitud usted reconoce conocer el reglamento de multas y buen uso del espacio comum, incluyendo el envío de la lista de invitados a vigilantes con 24 horas de antelación.
          </div>
        </div>

        {/* Submission Action */}
        <div className="pt-4 flex justify-end">
          <button
            id="btn-submit-booking"
            type="submit"
            disabled={loading || hoursDuration === 0 || hoursDuration > 5 || guestsCount > 50 || !fileBase64}
            className={`px-6 py-3 rounded-xl font-bold font-sans text-sm shadow-md transition-all flex items-center space-x-2 ${
              loading || hoursDuration === 0 || hoursDuration > 5 || guestsCount > 50 || !fileBase64
                ? "bg-slate-250 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-lg scale-100 hover:scale-[1.01]"
            }`}
          >
            <span>{loading ? "Procesando..." : "Enviar Solicitud de Reserva"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
