/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, FormEvent } from "react";
import { EmailNotification, User } from "../types";
import { 
  Mail, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  User as UserIcon, 
  RefreshCw, 
  AlertCircle, 
  Send, 
  Users, 
  Image as ImageIcon, 
  Search, 
  Plus, 
  Check, 
  X, 
  FileText,
  Megaphone,
  Sparkles,
  ArrowLeft
} from "lucide-react";

interface EmailSimulatorProps {
  currentUser: User;
}

export default function EmailSimulator({ currentUser }: EmailSimulatorProps) {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Communication Composer States
  const isAuthorizedToSend = ["admin", "sysadmin", "directiva"].includes(currentUser.role);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [recipientMode, setRecipientMode] = useState<"all" | "some">("all");
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [submittingComm, setSubmittingComm] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset Unsplash images for easy insertion
  const presetImages = [
    {
      name: "Mantenimiento / Áreas Comunes",
      url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
      icon: "🔧"
    },
    {
      name: "Aviso de Seguridad",
      url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80",
      icon: "🛡️"
    },
    {
      name: "Evento Social / Asamblea",
      url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
      icon: "👥"
    },
    {
      name: "Aviso Financiero / Cuotas",
      url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
      icon: "💵"
    }
  ];

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/emails?email=${encodeURIComponent(currentUser.email)}&role=${currentUser.role}`
      );
      const data = await res.json();
      
      // Sort descending: most recent first (using sentAt or timestamp)
      const sorted = [...data].sort((a: any, b: any) => {
        const dateA = new Date(a.sentAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.sentAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      });
      
      setEmails(sorted);
      if (sorted.length > 0) {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
        if (isDesktop && (!selectedEmail || !sorted.some((m: EmailNotification) => m.id === selectedEmail.id))) {
          setSelectedEmail(sorted[0]);
        }
      } else {
        setSelectedEmail(null);
      }
    } catch (e) {
      console.error("Error loading simulated emails", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!isAuthorizedToSend) return;
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data: User[] = await res.json();
        // Show only residents who have email set
        setAllUsers(data.filter(u => u.role === "resident" && u.email));
      }
    } catch (e) {
      console.error("Error fetching users for communication form", e);
    }
  };

  useEffect(() => {
    fetchEmails();
    if (isAuthorizedToSend) {
      fetchUsers();
    }

    // Connect to real-time system events stream for instant email updates
    console.log("🔌 [SSE Emails] Conectando a canal de eventos en tiempo real...");
    const eventSource = new EventSource("/api/system-events");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "communication_sent") {
          const userEmailLower = currentUser.email ? currentUser.email.trim().toLowerCase() : "";
          const isRecipient = data.recipients && data.recipients.some((r: string) => r.toLowerCase() === userEmailLower);
          
          if (isRecipient || ["admin", "sysadmin", "directiva"].includes(currentUser.role)) {
            console.log("⚡ [SSE Emails Event] Nuevo comunicado detectado. Actualizando buzón...");
            fetchEmails();
          }
        }
      } catch (err) {
        console.error("Error al procesar evento en buzón de correos:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("⚠️ [SSE Emails] Error o desconexión en canal de eventos del buzón.", err);
    };

    return () => {
      console.log("🔌 [SSE Emails] Desconectando canal de eventos.");
      eventSource.close();
    };
  }, [currentUser]);

  const handleToggleHouseSelection = (houseName: string) => {
    setSelectedHouses(prev => {
      const isSelected = prev.includes(houseName);
      let nextHouses: string[];
      if (isSelected) {
        nextHouses = prev.filter(h => h !== houseName);
      } else {
        nextHouses = [...prev, houseName];
      }
      // Sync selectedEmails
      const houseEmails = allUsers.filter(u => u.house === houseName).map(u => u.email);
      setSelectedEmails(prevEmails => {
        if (isSelected) {
          return prevEmails.filter(e => !houseEmails.includes(e));
        } else {
          return Array.from(new Set([...prevEmails, ...houseEmails]));
        }
      });
      return nextHouses;
    });
  };

  const handleSelectAllFilteredHouses = (filtered: string[]) => {
    setSelectedHouses(prev => {
      const combined = Array.from(new Set([...prev, ...filtered]));
      // Sync selectedEmails
      const combinedEmails = allUsers.filter(u => combined.includes(u.house)).map(u => u.email);
      setSelectedEmails(combinedEmails);
      return combined;
    });
  };

  const handleClearHousesSelection = () => {
    setSelectedHouses([]);
    setSelectedEmails([]);
  };

  const handleSendCommunication = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setFeedbackMsg({ type: "error", text: "Por favor ingrese un asunto para el comunicado." });
      return;
    }
    if (!bodyText.trim()) {
      setFeedbackMsg({ type: "error", text: "Por favor escriba el contenido del mensaje." });
      return;
    }
    if (recipientMode === "some" && selectedEmails.length === 0) {
      setFeedbackMsg({ type: "error", text: "Debe seleccionar al menos un residente destinatario." });
      return;
    }

    setSubmittingComm(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail: currentUser.email,
          senderRole: currentUser.role,
          recipientMode,
          selectedEmails: recipientMode === "all" ? [] : selectedEmails,
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          imageUrl: imageUrl.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedbackMsg({ 
          type: "success", 
          text: `¡Comunicado oficial enviado con éxito a ${data.count} destinatarios!` 
        });
        // Reset form fields
        setSubject("");
        setBodyText("");
        setImageUrl("");
        setSelectedHouses([]);
        setSelectedEmails([]);
        setIsComposing(false);
        // Refresh emails feed to see the newly sent communication
        await fetchEmails();
      } else {
        setFeedbackMsg({ type: "error", text: data.error || "Error al enviar comunicado." });
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: "error", text: "Error de conexión al enviar el comunicado." });
    } finally {
      setSubmittingComm(false);
    }
  };

  // Get unique list of properties/houses
  const uniqueHouses = (Array.from(new Set(allUsers.map(u => u.house).filter(Boolean))).sort() as string[]);

  // Filter houses based on search term
  const filteredHouses = uniqueHouses.filter(h => {
    const searchLower = searchTerm.toLowerCase();
    const matchesHouse = h.toLowerCase().includes(searchLower);
    const matchesResident = allUsers.some(u => 
      u.house === h && (
        (u.username || "").toLowerCase().includes(searchLower) ||
        (u.email || "").toLowerCase().includes(searchLower)
      )
    );
    return matchesHouse || matchesResident;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col md:grid md:grid-cols-3 h-[750px]" id="email-simulator-root">
      
      {/* Sidebar List (Column 1) */}
      <div className={`border-r border-slate-200 bg-slate-50 flex-col h-full overflow-hidden ${(!isComposing && !selectedEmail) ? "flex" : "hidden md:flex"}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-bold text-sm font-sans tracking-wide">Bandeja de Envío</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                id="btn-refresh-simulator"
                onClick={fetchEmails}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Refrescar bandeja"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Compose button for Admin, Sysadmin, and Directiva roles */}
          {isAuthorizedToSend && (
            <button
              id="btn-compose-communication"
              onClick={() => {
                setIsComposing(true);
                setSelectedEmail(null);
                setFeedbackMsg(null);
                setSelectedHouses([]);
                setSelectedEmails([]);
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-sans flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer ${
                isComposing
                  ? "bg-amber-500 text-slate-950 scale-102"
                  : "bg-teal-600 hover:bg-teal-700 text-white hover:shadow-md"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>Nuevo Comunicado</span>
            </button>
          )}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {emails.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Mail className="mx-auto h-8 w-8 text-slate-300 mb-2 stroke-1" />
              <p>Ningún correo ha sido disparado aún.</p>
              <p className="text-[10px] mt-1.5 text-slate-450 leading-relaxed">
                Los correos se envían de forma automática cuando el Administrador valida pagos/reservaciones, o cuando se envía un Comunicado Oficial a los residentes.
              </p>
            </div>
          ) : (
            emails.map((m) => {
              const dateObj = new Date(m.sentAt || (m as any).timestamp || 0);
              const isSelected = !isComposing && selectedEmail?.id === m.id;
              const isOfficialComm = m.subject.includes("[COMUNICADO]");

              return (
                <button
                  key={m.id}
                  id={`email-item-${m.id}`}
                  onClick={() => {
                    setIsComposing(false);
                    setSelectedEmail(m);
                  }}
                  className={`w-full text-left p-4 transition-all block border-l-4 ${
                    isSelected 
                      ? "bg-amber-500/10 border-amber-500" 
                      : isOfficialComm 
                        ? "bg-slate-100/40 border-slate-300 hover:bg-slate-100" 
                        : "border-transparent hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      {dateObj.toLocaleDateString("es-ES", { day: '2-digit', month: 'short' })} a las {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOfficialComm ? (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold font-sans tracking-wide">
                        Comunicado
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        Notificación
                      </span>
                    )}
                  </div>
                  <strong className="text-xs text-slate-800 block truncate">{m.toEmail}</strong>
                  <span className="text-xs text-slate-500 font-sans block truncate mt-0.5 font-semibold">
                    {m.subject}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Reader / Composer Pane (Columns 2 & 3) */}
      <div className={`md:col-span-2 flex-col bg-white h-full overflow-hidden ${(isComposing || selectedEmail) ? "flex" : "hidden md:flex"}`}>
        {isComposing && isAuthorizedToSend ? (
          /* Compose Form Screen */
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans uppercase tracking-wider flex items-center space-x-1.5">
                  <Megaphone className="h-4 w-4 text-teal-600" />
                  <span>Redactar Comunicado Oficial</span>
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Envíe un aviso formal por correo a la bandeja de notificaciones de los residentes.</p>
              </div>
              <button
                onClick={() => setIsComposing(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendCommunication} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* Feedback messages */}
              {feedbackMsg && (
                <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                  feedbackMsg.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-850" 
                    : "bg-rose-50 border-rose-200 text-rose-850"
                }`}>
                  {feedbackMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span className="font-medium text-xs leading-relaxed">{feedbackMsg.text}</span>
                </div>
              )}

              {/* Recipient Selection Segment */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Destinatarios:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("all")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      recipientMode === "all"
                        ? "bg-teal-50 border-teal-500 text-teal-900 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Todos los Residentes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("some")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      recipientMode === "some"
                        ? "bg-teal-50 border-teal-500 text-teal-900 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>Seleccionar Específicos</span>
                  </button>
                </div>
              </div>

              {/* Specific residents picker */}
              {recipientMode === "some" && (
                <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-4 space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar inmueble o residente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectAllFilteredHouses(filteredHouses)}
                        className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Seleccionar Filtrados ({filteredHouses.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleClearHousesSelection}
                        className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 hover:text-rose-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Limpiar ({selectedHouses.length})
                      </button>
                    </div>
                  </div>

                  {/* Properties list checklist */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 p-1">
                    {filteredHouses.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 italic">No se encontraron inmuebles.</div>
                    ) : (
                      filteredHouses.map(houseName => {
                        const isChecked = selectedHouses.includes(houseName);
                        const houseResidents = allUsers.filter(u => u.house === houseName);
                        const residentCount = houseResidents.length;
                        return (
                          <div
                            key={houseName}
                            onClick={() => handleToggleHouseSelection(houseName)}
                            className={`flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              isChecked ? "bg-teal-500/5 font-semibold text-teal-950" : ""
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent div click
                                className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <div>
                                <p className="text-xs text-slate-850 font-extrabold">{houseName}</p>
                                <p className="text-[10px] text-slate-450 font-sans">
                                  {residentCount} residente{residentCount !== 1 ? "s" : ""}: {houseResidents.map(u => u.username).join(", ")}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">
                              Inmueble
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[10px] text-teal-650 font-semibold font-mono">
                    ✓ {selectedHouses.length} inmueble(s) seleccionado(s) ({selectedEmails.length} residentes que recibirán el comunicado).
                  </p>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Asunto del Comunicado:</label>
                <input
                  type="text"
                  placeholder="Ej: Mantenimiento anual de la piscina y áreas verdes este fin de semana"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 font-medium"
                  required
                />
              </div>

              {/* Message content */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Contenido del Mensaje:</label>
                <textarea
                  placeholder="Escriba aquí los detalles del comunicado. El formato respetará los saltos de línea ingresados..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 font-medium leading-relaxed"
                  required
                />
              </div>

              {/* Image upload / URL input */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block font-bold text-slate-700 flex items-center space-x-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Incrustar una Imagen en el comunicado (Opcional):</span>
                </label>
                
                {/* Image URL text field */}
                <input
                  type="url"
                  placeholder="Pegue un enlace de imagen (https://...) o seleccione una de las plantillas abajo"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 font-mono"
                />

                {/* Predefined image templates */}
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-sans">Plantillas Rápidas:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {presetImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImageUrl(img.url)}
                        className={`p-2 rounded-xl border text-[10px] font-bold text-left hover:bg-slate-50 transition-all flex items-center space-x-1.5 cursor-pointer ${
                          imageUrl === img.url ? "bg-teal-50 border-teal-500 text-teal-950" : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="text-xs">{img.icon}</span>
                        <span className="truncate">{img.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pre-visualization */}
                {imageUrl && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Vista Previa de la Imagen:</p>
                    <img
                      src={imageUrl}
                      alt="Vista previa"
                      className="max-h-28 mx-auto rounded-lg border border-slate-200/80 object-cover shadow-xs"
                      onError={() => {}}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[9px] text-rose-600 font-bold hover:underline"
                    >
                      Remover imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingComm}
                  className="py-2.5 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submittingComm ? "Enviando..." : "Enviar Comunicado por Correo"}</span>
                </button>
              </div>

            </form>
          </div>
        ) : selectedEmail ? (
          /* Email Viewer Screen */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Subject and general details */}
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-col space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setSelectedEmail(null)}
                      className="md:hidden flex items-center space-x-1.5 text-xs text-teal-700 font-bold mb-3 self-start hover:bg-slate-100 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Volver a la lista</span>
                    </button>
                    <h3 className="text-base font-bold text-slate-900 font-sans leading-snug">{selectedEmail.subject}</h3>
                    {selectedEmail.subject.includes("[COMUNICADO]") && (
                      <div className="mt-1 flex items-center space-x-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-150 text-amber-900 border border-amber-200">
                          <Megaphone className="h-2.5 w-2.5 text-amber-700 mr-1" />
                          Comunicado Oficial de Administración
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-slate-500 space-y-1 font-mono pt-2 border-t border-slate-200/50">
                  <p>
                    <span className="text-slate-400">De:</span> <strong className="text-slate-700">administracion@kuaukali.com</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Para:</span> <strong className="text-slate-800">{selectedEmail.toEmail}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Fecha:</span> {new Date(selectedEmail.sentAt || (selectedEmail as any).timestamp || 0).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>
            </div>

            {/* Email Body Frame */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-55 flex justify-center">
              <div className="max-w-2xl w-full">
                {/* Safely injected html */}
                <div
                  className="bg-white rounded-2xl border border-slate-200/60 p-1 shadow-xs"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder empty state */
          <div className="flex-grow flex items-center justify-center p-12 text-center text-slate-400 h-full">
            <div className="space-y-3.5">
              <div className="bg-slate-100 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-slate-200">
                <Mail className="h-6 w-6 text-slate-450 stroke-1.5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-extrabold text-slate-700">Visor de Correo y Notificaciones</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAuthorizedToSend 
                    ? "Seleccione un correo enviado para revisar su formato, o haga clic en 'Nuevo Comunicado' para enviar un aviso masivo."
                    : "Aquí se muestran todos los correos oficiales y recibos enviados a su cuenta por la Administración de Residencial KuauKali."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
