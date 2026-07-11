/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User } from "../types";
import { 
  Calendar, 
  PlusCircle, 
  History, 
  Users, 
  CreditCard, 
  Mail, 
  ShieldAlert, 
  Building, 
  Eye, 
  Settings, 
  ArrowRight,
  Sparkles,
  QrCode
} from "lucide-react";
import { motion } from "motion/react";

interface HomeDashboardProps {
  currentUser: User;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  enabledFeatures?: Record<string, boolean>;
}

export default function HomeDashboard({ currentUser, setActiveTab, pendingCount, enabledFeatures = {} }: HomeDashboardProps) {
  // Define action card item structure
  interface ActionCard {
    tab: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    colorClass: string;
    iconColorClass: string;
    badge?: number | string;
  }

  const getCardsForRole = (): ActionCard[] => {
    const role = currentUser.role;

    if (role === "resident") {
      return [
        {
          tab: "calendar",
          title: "Calendario de Amenidades",
          description: "Consulte la disponibilidad de la casa club, piscina y áreas verdes en tiempo real.",
          icon: Calendar,
          colorClass: "from-teal-500/10 to-teal-600/5 hover:border-teal-400 bg-white",
          iconColorClass: "text-teal-600 bg-teal-50"
        },
        {
          tab: "reserve",
          title: "Nueva Reservación",
          description: "Reserve un espacio para sus eventos privados, asados o reuniones de forma rápida.",
          icon: PlusCircle,
          colorClass: "from-amber-500/10 to-amber-600/5 hover:border-amber-400 bg-white",
          iconColorClass: "text-amber-600 bg-amber-50"
        },
        {
          tab: "history",
          title: "Mis Reservaciones",
          description: "Revise el historial de sus solicitudes, estatus de aprobación y descargue sus recibos.",
          icon: History,
          colorClass: "from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400 bg-white",
          iconColorClass: "text-indigo-600 bg-indigo-50"
        },
        {
          tab: "visitors",
          title: "Control de Visitas",
          description: "Registre a sus invitados frecuentes, genere pases de acceso rápido QR y evite filas.",
          icon: QrCode,
          colorClass: "from-purple-500/10 to-purple-600/5 hover:border-purple-400 bg-white",
          iconColorClass: "text-purple-600 bg-purple-50"
        },
        {
          tab: "payments",
          title: "Pagos de Vigilancia",
          description: "Suba sus comprobantes de cuotas mensuales de mantenimiento y revise su estatus de solvencia.",
          icon: CreditCard,
          colorClass: "from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400 bg-white",
          iconColorClass: "text-emerald-600 bg-emerald-50"
        },
        {
          tab: "emails",
          title: "Bandeja de Notificaciones",
          description: "Consulte los avisos importantes, circulares oficiales y recibos enviados por la administración.",
          icon: Mail,
          colorClass: "from-blue-500/10 to-blue-600/5 hover:border-blue-400 bg-white",
          iconColorClass: "text-blue-600 bg-blue-50"
        }
      ];
    } else if (role === "admin" || role === "directiva") {
      const cards: ActionCard[] = [
        {
          tab: "calendar",
          title: "Calendario de Amenidades",
          description: "Supervise y filtre las reservas aprobadas y solicitudes activas del complejo residencial.",
          icon: Calendar,
          colorClass: "from-teal-500/10 to-teal-600/5 hover:border-teal-400 bg-white",
          iconColorClass: "text-teal-600 bg-teal-50"
        },
        {
          tab: "admin",
          title: "Aprobación de Reservas",
          description: "Verifique recibos de transferencias y autorice solicitudes de uso de áreas comunes.",
          icon: ShieldAlert,
          colorClass: "from-rose-500/10 to-rose-600/5 hover:border-rose-400 bg-white",
          iconColorClass: "text-rose-600 bg-rose-50",
          badge: pendingCount > 0 ? pendingCount : undefined
        },
        {
          tab: "users",
          title: "Control de Usuarios",
          description: "Administre altas, bajas, roles (residente, vigilante, directiva) y reinicio de claves.",
          icon: Users,
          colorClass: "from-purple-500/10 to-purple-600/5 hover:border-purple-400 bg-white",
          iconColorClass: "text-purple-600 bg-purple-50"
        },
        {
          tab: "properties",
          title: "Control de Inmuebles",
          description: "Consulte el padrón de propiedades, asigne inquilinos y audite el estado financiero de cada casa.",
          icon: Building,
          colorClass: "from-amber-500/10 to-amber-600/5 hover:border-amber-400 bg-white",
          iconColorClass: "text-amber-600 bg-amber-50"
        },
        {
          tab: "guard",
          title: "Monitoreo de Visitas",
          description: "Acceda a la bitácora de accesos peatonales y vehiculares registrados por seguridad.",
          icon: Eye,
          colorClass: "from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400 bg-white",
          iconColorClass: "text-indigo-600 bg-indigo-50"
        },
        {
          tab: "payments",
          title: "Control de Pagos",
          description: "Supervise las cuotas de seguridad recibidas, valide estados de cuenta de deudores y genere reportes.",
          icon: CreditCard,
          colorClass: "from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400 bg-white",
          iconColorClass: "text-emerald-600 bg-emerald-50"
        },
        {
          tab: "emails",
          title: "Notificaciones y Comunicados",
          description: "Redacte y despache circulares oficiales por correo electrónico a todos o algunos residentes.",
          icon: Mail,
          colorClass: "from-blue-500/10 to-blue-600/5 hover:border-blue-400 bg-white",
          iconColorClass: "text-blue-600 bg-blue-50"
        }
      ];

      if (currentUser.role === "directiva" || currentUser.id === "u_admin") {
        cards.push({
          tab: "config",
          title: "Configuración General",
          description: "Modifique tarifas mensuales, reglas del condominio, normativas de convivencia y reseteos.",
          icon: Settings,
          colorClass: "from-slate-500/10 to-slate-600/5 hover:border-slate-400 bg-white",
          iconColorClass: "text-slate-600 bg-slate-50"
        });
      }

      return cards;
    } else {
      // vigilante
      return [
        {
          tab: "calendar",
          title: "Calendario de Amenidades",
          description: "Consulte la disponibilidad de la casa club, piscina y áreas verdes en tiempo real.",
          icon: Calendar,
          colorClass: "from-teal-500/10 to-teal-600/5 hover:border-teal-400 bg-white",
          iconColorClass: "text-teal-600 bg-teal-50"
        },
        {
          tab: "guard",
          title: "Caseta de Vigilancia",
          description: "Registre entradas peatonales/vehiculares, escanee códigos QR y tome notas de incidentes.",
          icon: Eye,
          colorClass: "from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400 bg-white",
          iconColorClass: "text-indigo-600 bg-indigo-50"
        },
        {
          tab: "payments",
          title: "Matriz de Solvencia",
          description: "Consulte en tiempo real la lista de propiedades al día para agilizar el ingreso de visitas.",
          icon: CreditCard,
          colorClass: "from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400 bg-white",
          iconColorClass: "text-emerald-600 bg-emerald-50"
        }
      ];
    }
  };

  const rawCards = getCardsForRole();
  const actionCards = rawCards.filter(card => {
    if (card.tab === "config") return true;
    return enabledFeatures[card.tab] !== false;
  });

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Buenos días";
    if (hr < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const getRoleBadge = () => {
    switch(currentUser.role) {
      case "directiva":
        return { label: "Directiva", color: "bg-purple-100 text-purple-800 border-purple-200" };
      case "admin":
        return { label: "Administrador", color: "bg-rose-100 text-rose-800 border-rose-200" };
      case "vigilante":
        return { label: "Seguridad / Vigilancia", color: "bg-slate-100 text-slate-800 border-slate-200" };
      default:
        return { label: `Residente - ${currentUser.house}`, color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div id="home-dashboard-root">
      
      {/* ======================================================= */}
      {/* DESKTOP-ONLY VIEW */}
      {/* ======================================================= */}
      <div className="hidden md:flex flex-col space-y-8" id="desktop-home-view">
        {/* Welcome Banner Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-lg">
          {/* Background ambient lighting */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                <span className="text-slate-400 text-xs font-mono">• Sesión Activa</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                {getGreeting()}, <span className="text-amber-400">{currentUser.username}</span>
              </h2>
              
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Bienvenido al portal inteligente de <strong>Residencial KuauKali</strong>. Desde aquí tiene acceso directo a todas las herramientas de reservaciones, seguridad y control del condominio.
              </p>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl flex items-center space-x-3.5 md:self-stretch shrink-0 justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Ubicación</p>
                <p className="text-sm font-bold font-sans">Residencial KuauKali</p>
                <p className="text-xs text-amber-500 font-medium">Nuevo Cuscatlán, SV</p>
              </div>
              <div className="p-2.5 bg-slate-700/60 rounded-xl text-amber-400 border border-slate-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Title */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase font-sans">
            Módulos del Sistema
          </h3>
          <p className="text-xs text-slate-500">
            Seleccione cualquiera de los accesos rápidos a continuación para gestionar el módulo correspondiente:
          </p>
        </div>

        {/* Bento Grid layout of Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {actionCards.map((card, idx) => {
            const CardIcon = card.icon;
            return (
              <button
                key={idx}
                id={`dashboard-card-${card.tab}`}
                onClick={() => setActiveTab(card.tab)}
                className={`group relative flex flex-col text-left p-5 rounded-2xl border border-slate-200 hover:border-transparent bg-gradient-to-br ${card.colorClass} shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1 h-[190px]`}
              >
                {/* Highlight indicator */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-start justify-between w-full mb-3.5">
                  <div className={`p-3 rounded-xl border border-slate-100 shadow-2xs group-hover:scale-110 transition-transform ${card.iconColorClass}`}>
                    <CardIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {card.badge !== undefined && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                        {card.badge}
                      </span>
                    )}
                    <div className="p-1 rounded-full bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 font-sans tracking-tight group-hover:text-slate-950 transition-colors mb-1 flex items-center gap-1.5">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-500 group-hover:text-slate-600 line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-teal-600 font-bold group-hover:underline mt-2 inline-flex items-center space-x-1">
                    <span>Acceder</span>
                    <span className="text-xs">→</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================= */}
      {/* MOBILE-ONLY COMPACT RESPONSIVE VIEW (Fits on one screen) */}
      {/* ======================================================= */}
      <div className="flex md:hidden flex-col space-y-4 text-center py-1" id="mobile-home-view">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-teal-650 font-extrabold font-sans">BIENVENIDO</p>
          <h2 className="text-lg font-black text-slate-900 font-sans tracking-tight leading-tight">
            {getGreeting()}, <span className="text-teal-650">{currentUser.username}</span>
          </h2>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono border ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-left space-y-0.5">
          <h3 className="text-[11px] font-extrabold text-slate-800 tracking-wide uppercase font-sans">
            Módulos del Sistema
          </h3>
          <p className="text-[10px] text-slate-500 leading-snug">
            Seleccione cualquiera de los accesos rápidos a continuación para gestionar el módulo correspondiente:
          </p>
        </div>

        {/* Compact, dense Grid of Modules */}
        <div className="grid grid-cols-2 gap-2.5">
          {actionCards.map((card, idx) => {
            const CardIcon = card.icon;
            let mobileTitle = card.title;
            if (card.tab === "calendar") mobileTitle = "CALENDARIO";
            else if (card.tab === "reserve") mobileTitle = "NUEVA RESERVA";
            else if (card.tab === "history") mobileTitle = "MIS RESERVAS";
            else if (card.tab === "visitors") mobileTitle = "PASES DE VISITA";
            else if (card.tab === "payments") mobileTitle = currentUser.role === "resident" ? "ESTADO DE CUENTA" : "CONTROL PAGOS";
            else if (card.tab === "emails") mobileTitle = currentUser.role === "resident" ? "BUZÓN / AVISOS" : "COMUNICADOS";
            else if (card.tab === "admin") mobileTitle = "APROBACIONES";
            else if (card.tab === "users") mobileTitle = "USUARIOS";
            else if (card.tab === "properties") mobileTitle = "INMUEBLES";
            else if (card.tab === "guard") mobileTitle = "VIGILANCIA";
            else if (card.tab === "config") mobileTitle = "CONFIGURACIÓN";

            return (
              <button
                key={idx}
                id={`mobile-card-${card.tab}`}
                onClick={() => setActiveTab(card.tab)}
                className="relative bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-2xs hover:border-teal-500 hover:bg-teal-50/5 active:scale-95 transition-all h-[95px] cursor-pointer"
              >
                {card.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                    {card.badge}
                  </span>
                )}
                <div className={`p-2 rounded-xl mb-1 flex items-center justify-center ${card.iconColorClass}`}>
                  <CardIcon className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="text-[10px] font-extrabold tracking-tight text-slate-700 uppercase leading-none font-sans w-full truncate mt-1">
                  {mobileTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
