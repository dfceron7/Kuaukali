/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { User } from "../types";
import { 
  Building, 
  LogOut, 
  ShieldAlert, 
  UserCheck, 
  Menu, 
  X, 
  Calendar, 
  PlusCircle, 
  History, 
  Users, 
  Eye, 
  CreditCard, 
  Mail 
} from "lucide-react";

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ currentUser, onLogout, activeTab, setActiveTab }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg flex items-center justify-center shrink-0">
              <Building className="h-5 w-5 md:h-6 md:w-6" id="brand-logo" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold tracking-tight font-sans">
                Residencial KuauKali
              </h1>
              <p className="text-[9px] md:text-xs text-amber-500 font-mono tracking-wider uppercase">
                Casa Club & Amenities
              </p>
            </div>
          </div>

          {/* User Status / Navigation Actions */}
          {currentUser && (
            <div className="flex items-center space-x-2 md:space-x-6">
              {/* User Bio and Logout on Desktop */}
              <div className="hidden sm:flex items-center space-x-3 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-medium font-sans">
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center justify-end space-x-1">
                    {currentUser.id === "u_admin" ? (
                      <>
                        <ShieldAlert className="h-2.5 w-2.5 text-amber-400 inline" />
                        <span className="text-amber-400 font-bold">System Admin</span>
                      </>
                    ) : currentUser.role === "admin" ? (
                      <>
                        <ShieldAlert className="h-2.5 w-2.5 text-rose-400 inline" />
                        <span className="text-rose-400">Administrador</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-2.5 w-2.5 text-emerald-400 inline" />
                        <span className="text-slate-300">{currentUser.house}</span>
                      </>
                    )}
                  </span>
                </div>
                
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-1 px-2 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-all flex items-center space-x-1"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Logout Button (when menu is closed, just keep it clean) */}
              <div className="sm:hidden flex items-center bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-xs font-semibold mr-2 max-w-[80px] truncate">{currentUser.username}</span>
                <button
                  id="btn-logout-mobile-quick"
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-amber-400"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Hamburger Button for Mobile */}
              <button
                id="btn-mobile-menu-toggle"
                onClick={toggleMenu}
                className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                aria-label="Abrir menú de navegación"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {currentUser && isMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 animate-fade-in shadow-2xl">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
            <div>
              <p className="text-xs text-slate-400">Usuario Conectado:</p>
              <p className="text-sm font-bold text-white">{currentUser.username}</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 px-2.5 py-1 rounded-md text-amber-400 border border-slate-700 font-bold">
              {currentUser.id === "u_admin" ? "System Admin" : currentUser.role === "admin" ? "Administrador" : currentUser.house}
            </span>
          </div>

          <nav className="p-3 space-y-1.5" aria-label="Navegación Móvil">
            {/* Calendar Option */}
            <button
              id="mob-tab-calendar"
              onClick={() => handleSelectTab("calendar")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "calendar"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Calendario Interactivo</span>
            </button>

            {/* Resident Actions */}
            {currentUser.role === "resident" && (
              <>
                <button
                  id="mob-tab-reserve"
                  onClick={() => handleSelectTab("reserve")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "reserve"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span>Nueva Reserva</span>
                </button>

                <button
                  id="mob-tab-history"
                  onClick={() => handleSelectTab("history")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "history"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <History className="h-4 w-4 shrink-0" />
                  <span>Mis Reservaciones</span>
                </button>

                <button
                  id="mob-tab-visitors"
                  onClick={() => handleSelectTab("visitors")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "visitors"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>Control de Visitas</span>
                </button>
              </>
            )}

            {/* Guard Actions */}
            {currentUser.role === "vigilante" && (
              <button
                id="mob-tab-guard"
                onClick={() => handleSelectTab("guard")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "guard"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Eye className="h-4 w-4 shrink-0" />
                <span>Caseta de Vigilancia</span>
              </button>
            )}

            {/* Admin Actions */}
            {currentUser.role === "admin" && (
              <>
                <button
                  id="mob-tab-admin"
                  onClick={() => handleSelectTab("admin")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "admin"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Aprobación de Solicitudes</span>
                </button>

                <button
                  id="mob-tab-users"
                  onClick={() => handleSelectTab("users")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "users"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Control de Usuarios</span>
                </button>

                <button
                  id="mob-tab-guard-admin"
                  onClick={() => handleSelectTab("guard")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "guard"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>Monitoreo de Visitas</span>
                </button>
              </>
            )}

            {/* Payments Action */}
            <button
              id="mob-tab-payments"
              onClick={() => handleSelectTab("payments")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "payments"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>
                {currentUser.role === "resident" 
                  ? "Pagos de Vigilancia" 
                  : currentUser.role === "admin" 
                  ? "Control de Pagos" 
                  : "Matriz de Solvencia"}
              </span>
            </button>

            {/* Emails Simulator Action */}
            {currentUser.role !== "vigilante" && (
              <button
                id="mob-tab-emails"
                onClick={() => handleSelectTab("emails")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "emails"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span>Notificaciones de Correo</span>
              </button>
            )}

            {/* Logout Mobile Option */}
            <div className="pt-2 border-t border-slate-800">
              <button
                id="mob-btn-logout"
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-950/40 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
