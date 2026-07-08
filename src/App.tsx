/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Reservation, VisitorPass } from "./types";
import Header from "./components/Header";
import CalendarView from "./components/CalendarView";
import BookingForm from "./components/BookingForm";
import AdminPanel from "./components/AdminPanel";
import MyReservations from "./components/MyReservations";
import EmailSimulator from "./components/EmailSimulator";
import UserManagement from "./components/UserManagement";
import PropertyManagement from "./components/PropertyManagement";
import VisitorManagement from "./components/VisitorManagement";
import GuardPanel from "./components/GuardPanel";
import PaymentModule from "./components/PaymentModule";
import { 
  Calendar, 
  Building, 
  Lock, 
  User as UserIcon, 
  RefreshCw, 
  AlertTriangle, 
  Key, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  XCircle, 
  X,
  Smartphone,
  Download,
  Share,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  date: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cl_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [loadingRes, setLoadingRes] = useState<boolean>(false);

  // Notifications & Toasts state
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("cl_user");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          const saved = localStorage.getItem(`cl_notifications_config_${user.id}`);
          if (saved) return saved;
        } catch (e) {}
      }
      const savedGlobal = localStorage.getItem("cl_notifications_config");
      if (savedGlobal) return savedGlobal;
    }
    return "default"; // Start as 'default' so the alert configuration banner is always visible first
  });

  // Synchronize notification permission state when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`cl_notifications_config_${currentUser.id}`);
      setNotificationPermission(saved || "default");
    } else {
      setNotificationPermission("default");
    }
  }, [currentUser]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if already installed / standalone
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches || 
                            (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Detect if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // If on iOS and not standalone, show installation support
    if (ios && !checkStandalone) {
      const dismissed = sessionStorage.getItem("pwa_dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = sessionStorage.getItem("pwa_dismissed");
      if (!checkStandalone && !dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuario eligió instalar PWA: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa_dismissed", "true");
  };

  // Auth Form State
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [house, setHouse] = useState<string>("Casa 101");
  const [email, setEmail] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Use a ref to keep track of current reservations to prevent stale closure in polling
  const reservationsRef = useRef<Reservation[]>([]);
  useEffect(() => {
    reservationsRef.current = reservations;
  }, [reservations]);

  // Visitor Passes notifications tracking
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>([]);
  const visitorPassesRef = useRef<VisitorPass[]>([]);
  const visitorPassesInitializedRef = useRef<boolean>(false);
  useEffect(() => {
    visitorPassesRef.current = visitorPasses;
  }, [visitorPasses]);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined") return;

    const userKey = currentUser ? `cl_notifications_config_${currentUser.id}` : "cl_notifications_config";

    if (!("Notification" in window)) {
      setNotificationPermission("granted_simulated");
      localStorage.setItem("cl_notifications_config", "granted_simulated");
      if (currentUser) {
        localStorage.setItem(userKey, "granted_simulated");
      }
      
      const newToastId = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
        {
          id: newToastId,
          title: "🔔 Alertas Activas (Simulación)",
          message: "Este navegador no soporta notificaciones de escritorio nativas. Hemos activado las alertas visuales en tiempo real dentro del portal.",
          type: "success",
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        },
        ...prev
      ]);
      return;
    }

    try {
      // Inside iframe previews, requestPermission() may either throw or return denied.
      // We wrap it securely and if it's denied or throws, we enable simulated mode.
      const permission = await Notification.requestPermission().catch(() => "denied");
      
      if (permission === "granted") {
        setNotificationPermission("granted");
        localStorage.setItem("cl_notifications_config", "granted");
        if (currentUser) {
          localStorage.setItem(userKey, "granted");
        }
        try {
          new Notification("🔔 Notificaciones Activas", {
            body: "Recibirás alertas en tiempo real sobre el estado de tus reservas.",
          });
        } catch (e) {
          console.warn("Could not display native test notification inside iframe. Alertas are configured.");
        }
      } else {
        // Fallback to simulated mode so the user can fully test real-time alerts!
        setNotificationPermission("granted_simulated");
        localStorage.setItem("cl_notifications_config", "granted_simulated");
        if (currentUser) {
          localStorage.setItem(userKey, "granted_simulated");
        }
        
        const newToastId = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [
          {
            id: newToastId,
            title: "🔔 Alertas Activas (Portal)",
            message: "El entorno restringió las notificaciones de escritorio, pero hemos activado las alertas visuales en tiempo real para tu cuenta.",
            type: "success",
            date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.warn("Could not request notification permission. Falling back to simulated mode.", err);
      setNotificationPermission("granted_simulated");
      localStorage.setItem("cl_notifications_config", "granted_simulated");
      if (currentUser) {
        localStorage.setItem(userKey, "granted_simulated");
      }
    }
  };

  const handleResetNotificationPermission = () => {
    setNotificationPermission("default");
    localStorage.removeItem("cl_notifications_config");
    if (currentUser) {
      localStorage.removeItem(`cl_notifications_config_${currentUser.id}`);
    }
  };

  const triggerNotification = (res: Reservation) => {
    const isApproved = res.status === "approved";
    const statusText = isApproved ? "APROBADA ✅" : "RECHAZADA ❌";

    const title = `Reserva ${statusText}`;
    const message = `Tu reserva para la Casa Club el día ${res.date} (${res.startTime} - ${res.endTime}) ha sido ${isApproved ? "aprobada" : "rechazada"}.`;

    // 1. Trigger in-app toast
    const newToastId = Math.random().toString(36).substring(2, 9);
    const newToast: ToastAlert = {
      id: newToastId,
      title,
      message,
      type: isApproved ? "success" : "error",
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setToasts((prev) => [newToast, ...prev]);

    // Auto-dismiss toast after 10 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToastId));
    }, 10000);

    // 2. Trigger native Web Notification if permission granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.warn("Could not trigger browser Notification (likely due to iframe sandbox constraints):", err);
      }
    }
  };

  const triggerVisitorNotification = (pass: VisitorPass, action: "approved" | "rejected", notes?: string) => {
    const isApproved = action === "approved";
    const statusText = isApproved ? "INGRESO AUTORIZADO ✅" : "INGRESO RECHAZADO ❌";

    const title = `${pass.firstName} ${pass.lastName} - ${statusText}`;
    const message = isApproved 
      ? `Tu invitado ${pass.firstName} ${pass.lastName} ha ingresado a la residencial rumbo a tu domicilio (${pass.house}).` + (notes ? ` Notas del guardia: "${notes}"` : "")
      : `Se ha rechazado el acceso de ${pass.firstName} ${pass.lastName} en la caseta principal.` + (notes ? ` Motivo: "${notes}"` : "");

    // 1. Trigger in-app toast
    const newToastId = Math.random().toString(36).substring(2, 9);
    const newToast: ToastAlert = {
      id: newToastId,
      title,
      message,
      type: isApproved ? "success" : "error",
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setToasts((prev) => [newToast, ...prev]);

    // Auto-dismiss toast after 10 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToastId));
    }, 10000);

    // 2. Trigger native Web Notification if permission granted
    if (typeof window !== "undefined" && "Notification" in window && (Notification.permission === "granted" || notificationPermission === "granted")) {
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.warn("Could not trigger browser Notification for visitor:", err);
      }
    }
  };

  const fetchVisitorPasses = async () => {
    if (!currentUser || currentUser.role !== "resident") return;
    try {
      const res = await fetch(`/api/visitor-passes?userId=${currentUser.id}&role=${currentUser.role}`);
      if (res.ok) {
        const data: VisitorPass[] = await res.json();

        if (visitorPassesInitializedRef.current) {
          // Compare passes to detect newly added logs
          data.forEach((newPass) => {
            const oldPass = visitorPassesRef.current.find((p) => p.id === newPass.id);
            if (oldPass) {
              if (newPass.logs && oldPass.logs && newPass.logs.length > oldPass.logs.length) {
                // Find any logs that are newly appended
                for (let i = oldPass.logs.length; i < newPass.logs.length; i++) {
                  const log = newPass.logs[i];
                  triggerVisitorNotification(newPass, log.action, log.notes);
                }
              }
            } else {
              // It's a brand new pass (maybe registered by another device or active tab).
              // Since it wasn't tracked before, if it has log entries, it means it was just approved/rejected.
              if (newPass.logs && newPass.logs.length > 0) {
                newPass.logs.forEach((log) => {
                  triggerVisitorNotification(newPass, log.action, log.notes);
                });
              }
            }
          });
        } else {
          visitorPassesInitializedRef.current = true;
        }

        setVisitorPasses(data);
      }
    } catch (e) {
      console.error("Error fetching visitor passes for notifications", e);
    }
  };

  const fetchReservations = async (silent = false) => {
    if (!silent) setLoadingRes(true);
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        const data: Reservation[] = await res.json();

        // If we have previous loaded data, look for status transitions on resident's reservations
        if (currentUser && currentUser.role === "resident" && reservationsRef.current.length > 0) {
          data.forEach((newRes) => {
            if (newRes.userId === currentUser.id) {
              const oldRes = reservationsRef.current.find((r) => r.id === newRes.id);
              if (oldRes && oldRes.status === "pending" && (newRes.status === "approved" || newRes.status === "rejected")) {
                triggerNotification(newRes);
              }
            }
          });
        }

        setReservations(data);
      }
    } catch (e) {
      console.error("Error fetching reservations list", e);
    } finally {
      if (!silent) setLoadingRes(false);
    }
  };

  // Real-time polling
  useEffect(() => {
    fetchReservations();
    fetchVisitorPasses();

    // Poll every 6 seconds when logged in to achieve real-time status transitions
    const interval = setInterval(() => {
      if (currentUser) {
        fetchReservations(true);
        fetchVisitorPasses();
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Update visual route defaults depending on logged user
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        setActiveTab("admin");
      } else if (currentUser.role === "vigilante") {
        setActiveTab("guard");
      } else {
        setActiveTab("calendar");
      }
    } else {
      setActiveTab("calendar");
    }
  }, [currentUser]);

  // Handle standard user logins
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error de ingreso");
      }

      setCurrentUser(data);
      localStorage.setItem("cl_user", JSON.stringify(data));
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setAuthError(err.message || "Credenciales de acceso inválidas.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick-Login with demo credentials
  const bypassLogin = async (usr: string, psw: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usr, password: psw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setCurrentUser(data);
      localStorage.setItem("cl_user", JSON.stringify(data));
    } catch (err: any) {
      setAuthError(err.message || "Error al autenticar demostración.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle standard resident registers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, house, email })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la cuenta");
      }

      setAuthSuccess("¡Registro exitoso! Ya puede ingresar con sus datos en el portal de entrada.");
      setIsRegistering(false);
      setUsername("");
      setPassword("");
      setHouse("Casa 101");
      setEmail("");
    } catch (err: any) {
      setAuthError(err.message || "Ocurrió un error al registrar el usuario.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("cl_user");
  };

  // Temporary password change state and handler
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [tempPasswordError, setTempPasswordError] = useState<string | null>(null);
  const [tempPasswordSuccess, setTempPasswordSuccess] = useState<string | null>(null);
  const [tempPasswordLoading, setTempPasswordLoading] = useState<boolean>(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const handleChangeTemporaryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTempPasswordError(null);
    setTempPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
      setTempPasswordError("Todos los campos son obligatorios.");
      return;
    }

    if (newPassword.length < 3) {
      setTempPasswordError("La nueva contraseña debe tener al menos 3 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setTempPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setTempPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          newPassword: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cambiar la contraseña.");
      }

      setTempPasswordSuccess("¡Contraseña actualizada exitosamente!");
      // Update local storage and currentUser state
      const updatedUser = { ...currentUser, isTemporaryPassword: false } as User;
      setCurrentUser(updatedUser);
      localStorage.setItem("cl_user", JSON.stringify(updatedUser));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setTempPasswordError(err.message || "Error al actualizar contraseña.");
    } finally {
      setTempPasswordLoading(false);
    }
  };

  // Count pending reviews to alert admin with glowing badge
  const pendingCount = reservations.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-amber-500/30 text-slate-800">
      {/* Visual Navigation Bar */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* If user is not logged-in, show Entry Authentication views */}
        {!currentUser ? (
          <div className="max-w-md mx-auto my-12">
            
            {/* Logo heading */}
            <div className="text-center mb-8">
              <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl inline-flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
                <Building className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold font-sans text-slate-900">
                Residencial KuauKali
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Portal de Administración de Casa Club
              </p>
            </div>

            {/* Credential login card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-lg font-sans text-slate-900">
                  {isRegistering ? "Registro de Residente" : "Ingresar al Sistema"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegistering
                    ? "Cree su cuenta de acceso residencial para reservar fechas."
                    : "Coloque sus credenciales autorizadas."}
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-950 p-3 rounded text-xs leading-relaxed">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="bg-emerald-50 border-l-3 border-emerald-500 text-emerald-950 p-3 rounded text-xs leading-relaxed">
                  {authSuccess}
                </div>
              )}

              {/* Login Form */}
              {!isRegistering ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Nombre de Usuario
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="login-username"
                        type="text"
                        placeholder="ej. casa101"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                        title={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold select-none cursor-pointer transition-colors shadow-sm"
                  >
                    {authLoading ? "Cargando..." : "Ingresar"}
                  </button>
                </form>
              ) : (
                /* Admin-only info instead of registration form */
                <div className="space-y-4 text-center py-4 bg-amber-50/50 rounded-xl border border-amber-200 p-4">
                  <div className="flex justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-600 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed font-bold font-sans">
                    Normativa de Seguridad Girasol Residencial
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed text-center">
                    No se permite el auto-registro independiente de residentes. Las claves de acceso y los inmuebles deben ser pre-autorizados, creados e inactivados única y exclusivamente por los administradores del condominio mediante el panel central de control.
                  </p>
                  <button
                    onClick={() => setIsRegistering(false)}
                    className="mt-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Volver a Inicio de Sesión
                  </button>
                </div>
              )}

              {/* Toggle Entry State */}
              <div className="text-center pt-2">
                <button
                  id="btn-toggle-register"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError(null);
                  }}
                  className="text-xs text-amber-600 hover:underline font-semibold cursor-pointer"
                >
                  {isRegistering
                    ? "¿Ya tienes cuenta residencial? Iniciar Sesión"
                    : "ℹ️ ¿Cómo registrar mi residencia?"}
                </button>
              </div>
            </div>



          </div>
        ) : currentUser.isTemporaryPassword ? (
          <div className="max-w-md mx-auto my-12 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4 text-center">
                <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl inline-flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
                  <Lock className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="font-bold text-lg font-sans text-slate-900">
                  Actualización de Contraseña Obligatoria
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ha ingresado al sistema utilizando una contraseña temporal asignada por la administración. Por motivos de seguridad, debe definir una contraseña definitiva antes de continuar.
                </p>
              </div>

              {tempPasswordError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-950 p-3 rounded text-xs leading-relaxed">
                  {tempPasswordError}
                </div>
              )}

              {tempPasswordSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950 p-3 rounded text-xs leading-relaxed">
                  {tempPasswordSuccess}
                </div>
              )}

              <form onSubmit={handleChangeTemporaryPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Nueva Contraseña Definitiva
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 3 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-amber-500 text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                      title={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita la contraseña nueva"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-amber-500 text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                      title={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={tempPasswordLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold select-none cursor-pointer transition-colors shadow-sm"
                >
                  {tempPasswordLoading ? "Actualizando..." : "Establecer Contraseña Definitiva"}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Salir / Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Logged In Portal Panel views */
          <div className="space-y-6">

            {/* PWA App Installation Promotion Banner */}
            {showInstallBanner && !isStandalone && (
              <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden animate-fade-in">
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl shrink-0">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-amber-400 font-sans tracking-wide">
                        Instalar App Móvil - Portal Residencial
                      </h4>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Coloca este portal en la pantalla de inicio de tu celular (Android o iPhone) para acceder al instante, recibir notificaciones de visitas en tiempo real y gestionar tus reservas cómodamente.
                      </p>
                      
                      {/* Interactive Section */}
                      <div className="pt-3">
                        {isIOS ? (
                          /* iOS specific tutorial instruction */
                          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-[11px] text-slate-300 flex items-start space-x-2 max-w-lg">
                            <Share className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-white">Instrucciones para iPhone / iPad:</span>
                              <ol className="list-decimal pl-4 mt-1 space-y-1 text-slate-400">
                                <li>Toca el botón de <span className="text-white font-medium">Compartir</span> en la barra de Safari.</li>
                                <li>Desplázate hacia abajo y selecciona <span className="text-amber-400 font-bold">"Agregar al inicio"</span>.</li>
                                <li>¡Listo! Disfruta del portal como una app nativa en tu celular.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          /* Android & Desktop native installation */
                          <button
                            id="btn-install-pwa-banner"
                            onClick={handleInstallPWA}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 select-none border border-amber-400"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Instalar en este Dispositivo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dismiss Button */}
                  <button
                    onClick={handleDismissInstallBanner}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title="Cerrar banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Quick alert notifications block for the administrator */}
            {currentUser.role === "admin" && pendingCount > 0 && (
              <div className="bg-amber-500 text-slate-950 px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-500/15 animate-pulse-slow">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 shrink-0" />
                  <div className="text-sm">
                    <strong>Alerta de Transacción:</strong> Al momento hay{" "}
                    <strong>{pendingCount} solicitud(es) de reserva pendiente(s)</strong> de verificación en el sistema. Revise los comprobantes de transferencia en el Panel Administrativo.
                  </div>
                </div>
                <button
                  id="btn-alert-navigate-panel"
                  onClick={() => setActiveTab("admin")}
                  className="bg-white text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-slate-100 transition-colors shrink-0 font-sans"
                >
                  Revisar Ahora
                </button>
              </div>
            )}

            {/* Tab Controller for larger screen widths */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 max-w-max hidden md:flex items-center space-x-1.5 shadow-xs">
              <button
                id="bar-tab-calendar"
                onClick={() => setActiveTab("calendar")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "calendar"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Calendario Interactivo
              </button>

              {currentUser.role === "resident" && (
                <>
                  <button
                    id="bar-tab-reserve"
                    onClick={() => setActiveTab("reserve")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "reserve"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Nueva Reserva
                  </button>

                  <button
                    id="bar-tab-history"
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "history"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Mis Reservaciones
                  </button>

                  <button
                    id="bar-tab-visitors"
                    onClick={() => setActiveTab("visitors")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "visitors"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Control de Visitas
                  </button>
                </>
              )}

              {currentUser.role === "vigilante" && (
                <button
                  id="bar-tab-guard"
                  onClick={() => setActiveTab("guard")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "guard"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  Caseta de Vigilancia
                </button>
              )}

              {currentUser.role === "admin" && (
                <>
                  <button
                    id="bar-tab-admin"
                    onClick={() => setActiveTab("admin")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "admin"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Aprobación de Solicitudes ({pendingCount})
                  </button>

                  <button
                    id="bar-tab-users"
                    onClick={() => setActiveTab("users")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "users"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Control de Usuarios
                  </button>

                  <button
                    id="bar-tab-properties"
                    onClick={() => setActiveTab("properties")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "properties"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Control de Inmuebles
                  </button>

                  <button
                    id="bar-tab-guard-admin"
                    onClick={() => setActiveTab("guard")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      activeTab === "guard"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Monitoreo Visitas
                  </button>
                </>
              )}

              <button
                id="bar-tab-payments"
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "payments"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {currentUser.role === "resident" 
                  ? "Pagos de Vigilancia" 
                  : currentUser.role === "admin" 
                  ? "Control de Pagos" 
                  : "Matriz de Solvencia"}
              </button>

              {currentUser.role !== "vigilante" && (
                <button
                  id="bar-tab-emails"
                  onClick={() => setActiveTab("emails")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "emails"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  Notificaciones de Correo
                </button>
              )}
            </div>

            {/* TAB RENDERING SECTIONS */}
            {activeTab === "calendar" && (
              <CalendarView reservations={reservations} />
            )}

            {activeTab === "reserve" && currentUser.role === "resident" && (
              <BookingForm
                currentUser={currentUser}
                reservations={reservations}
                onReservationCreated={async () => {
                  await fetchReservations();
                  setActiveTab("history"); // Auto-redirect to history upon reservation success
                }}
              />
            )}

            {activeTab === "history" && currentUser.role === "resident" && (
              <MyReservations
                currentUser={currentUser}
                reservations={reservations}
                notificationPermission={notificationPermission}
                onRequestPermission={requestNotificationPermission}
                onResetPermission={handleResetNotificationPermission}
                onCancelReservation={async (id: string) => {
                  if (!window.confirm("¿Está seguro de que desea cancelar su reserva y liberar el espacio?")) {
                    return;
                  }
                  try {
                    const res = await fetch(`/api/reservations/${id}/cancel`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role: "resident" })
                    });
                    if (res.ok) {
                      await fetchReservations();
                    } else {
                      const data = await res.json();
                      alert(data.error || "No se pudo cancelar su reserva.");
                    }
                  } catch (e) {
                    alert("Error de red.");
                  }
                }}
              />
            )}

            {activeTab === "admin" && currentUser.role === "admin" && (
              <AdminPanel
                reservations={reservations}
                onActionTriggered={fetchReservations}
              />
            )}

            {activeTab === "users" && currentUser.role === "admin" && (
              <UserManagement currentUser={currentUser} />
            )}

            {activeTab === "properties" && currentUser.role === "admin" && (
              <PropertyManagement />
            )}

            {activeTab === "visitors" && currentUser.role === "resident" && (
              <VisitorManagement 
                currentUser={currentUser} 
                passes={visitorPasses}
                notificationPermission={notificationPermission}
                onRequestPermission={requestNotificationPermission}
                onResetPermission={handleResetNotificationPermission}
                onRefreshPasses={fetchVisitorPasses}
              />
            )}

            {activeTab === "guard" && (currentUser.role === "vigilante" || currentUser.role === "admin") && (
              <GuardPanel currentUser={currentUser} />
            )}

            {activeTab === "payments" && (
              <PaymentModule currentUser={currentUser} />
            )}

            {activeTab === "emails" && currentUser.role !== "vigilante" && <EmailSimulator currentUser={currentUser} />}

          </div>
        )}
      </main>

      {/* Footer footer information area */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 font-mono">
          <p>© 2026 Girasol Residencial KuauKali. Todos los derechos reservados.</p>
          <p className="mt-1">
            Diseñado bajo normativas estrictas de aforo y tiempos de descanso Casa Club.
          </p>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-55 space-y-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={`p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-start space-x-3 text-xs leading-relaxed ${
                toast.type === "success"
                  ? "bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10"
                  : "bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-500/10"
              }`}>
                <div className="mt-0.5 shrink-0">
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center justify-between text-slate-900 gap-2">
                    <span className="truncate">{toast.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">{toast.date}</span>
                  </div>
                  <p className="mt-1 text-slate-600 font-medium break-words">{toast.message}</p>
                  
                  {currentUser?.role === "resident" && (
                    <button
                      onClick={() => {
                        setActiveTab("history");
                        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                      }}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Ver mis reservaciones</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer p-0.5 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
