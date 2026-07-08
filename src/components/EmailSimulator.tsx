/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { EmailNotification, User } from "../types";
import { Mail, Clock, Calendar, CheckCircle2, User as UserIcon, RefreshCw, AlertCircle } from "lucide-react";

interface EmailSimulatorProps {
  currentUser: User;
}

export default function EmailSimulator({ currentUser }: EmailSimulatorProps) {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/emails?email=${encodeURIComponent(currentUser.email)}&role=${currentUser.role}`
      );
      const data = await res.json();
      setEmails(data);
      if (data.length > 0) {
        // If there's currently no selected email, or the current selected email is not in the new list, select the first
        if (!selectedEmail || !data.some((m: EmailNotification) => m.id === selectedEmail.id)) {
          setSelectedEmail(data[0]);
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

  useEffect(() => {
    fetchEmails();
  }, [currentUser]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-3 h-[700px]">
      
      {/* List Sidebar (1 Col) */}
      <div className="border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-sm font-sans">Bandeja de Envío</span>
          </div>
          <button
            id="btn-refresh-simulator"
            onClick={fetchEmails}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {emails.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Mail className="mx-auto h-8 w-8 text-slate-300 mb-2 stroke-1" />
              <p>Ningún correo ha sido disparado aún.</p>
              <p className="text-[10px] mt-1 text-slate-400/80">
                Los correos se envían de forma automática cuando el Administrador aprueba o rechaza una reservación en el Panel Administrativo.
              </p>
            </div>
          ) : (
            emails.map((m) => {
              const dateObj = new Date(m.sentAt);
              const isSelected = selectedEmail?.id === m.id;

              return (
                <button
                  key={m.id}
                  id={`email-item-${m.id}`}
                  onClick={() => setSelectedEmail(m)}
                  className={`w-full text-left p-4 transition-colors block ${
                    isSelected ? "bg-amber-500/10 border-l-4 border-amber-500" : "hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-400">
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      SMTP Sim.
                    </span>
                  </div>
                  <strong className="text-xs text-slate-800 block truncate">{m.toEmail}</strong>
                  <span className="text-xs text-slate-500 font-sans block truncate mt-0.5 font-medium">
                    {m.subject}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Reader View Pane (2 Cols) */}
      <div className="md:col-span-2 flex flex-col bg-white h-full overflow-hidden">
        {selectedEmail ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header sender info */}
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-col space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-sans">{selectedEmail.subject}</h3>
                </div>
                
                <div className="text-xs text-slate-500 space-y-1 font-mono pt-1 border-t border-slate-200/50">
                  <p>
                    <span className="text-slate-400">De:</span> <strong className="text-slate-700">administracion@kuaukali.com</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Para:</span> <strong className="text-slate-800">{selectedEmail.toEmail}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Fecha:</span> {new Date(selectedEmail.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Simulated iframe wrapper for direct raw html rendering safely */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <div
                className="max-w-2xl w-full"
                dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center p-12 text-center text-slate-400 h-full">
            <div className="space-y-2">
              <Mail className="mx-auto h-12 w-12 text-slate-300 stroke-1" />
              <h4 className="text-sm font-semibold text-slate-700">Visor de Notificaciones Automáticas</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Seleccione un correo enviado de la bandeja para comprobar su formato y reglas de uso adjuntas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
