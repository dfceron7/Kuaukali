/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { 
  initFirebase, 
  loadFromFirestore, 
  saveToFirestore, 
  deleteFromFirestore 
} from "./src/firebase-helper.js";

// Construct path helpers for ES module and CommonJS compatibility
let resolvedFilename = "";
try {
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta && import.meta.url) {
    // @ts-ignore
    resolvedFilename = fileURLToPath(import.meta.url);
  } else {
    resolvedFilename = typeof __filename !== "undefined" ? __filename : "";
  }
} catch (e) {
  resolvedFilename = typeof __filename !== "undefined" ? __filename : "";
}

const __filename = resolvedFilename;
const __dirname = resolvedFilename ? path.dirname(resolvedFilename) : (typeof __dirname !== "undefined" ? __dirname : "");

const app = express();
const PORT = 3000;

// Body parsing with supportive payload limits for base64 receipts
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Database mock setup
const DB_FILE = path.join(process.cwd(), "db.json");

interface DBStructure {
  users: any[];
  reservations: any[];
  emails: any[];
  visitorPasses?: any[];
  payments?: any[];
}

// Seed Data
const defaultDB: DBStructure = {
  users: [
    { id: "u1", username: "admin", password: "123", role: "admin", house: "Administración", email: "admin@kuaukali.com", isActive: true },
    { id: "u2", username: "casa101", password: "101", role: "resident", house: "Casa 101", email: "casa101@kuaukali.com", isActive: true },
    { id: "u3", username: "casa204", password: "204", role: "resident", house: "Casa 204", email: "casa204@kuaukali.com", isActive: true },
    { id: "u4", username: "casa305", password: "305", role: "resident", house: "Casa 305", email: "casa305@kuaukali.com", isActive: true },
    { id: "u5", username: "vigilante1", password: "v1", role: "vigilante", house: "Caseta de Vigilancia", email: "vigilancia@kuaukali.com", isActive: true }
  ],
  reservations: [
    {
      id: "res1",
      userId: "u2",
      userName: "casa101",
      house: "Casa 101",
      userEmail: "casa101@kuaukali.com",
      date: new Date().toISOString().split("T")[0], // Today
      startTime: "10:00",
      endTime: "14:00",
      durationHours: 4,
      guestsCount: 25,
      proofFileName: "transferencia_101.jpg",
      proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23e2e8f0'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='16' text-anchor='middle' fill='%2364748b'>Comprobante de Transferencia: Ref #1092301</text></svg>",
      status: "approved",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: "res2",
      userId: "u3",
      userName: "casa204",
      house: "Casa 204",
      userEmail: "casa204@kuaukali.com",
      date: new Date(Date.now() + 3600000 * 24).toISOString().split("T")[0], // Tomorrow
      startTime: "16:00",
      endTime: "20:00",
      durationHours: 4,
      guestsCount: 40,
      proofFileName: "comprobante_banco.jpg",
      proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='15' text-anchor='middle' fill='%23475569'>Transferencia Exitosa - ClubHouse S.L. - 250 USD</text></svg>",
      status: "pending",
      createdAt: new Date().toISOString()
    }
  ],
  emails: [],
  payments: []
};

function loadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error reading database file, returning defaults", e);
  }
  return defaultDB;
}

// Background collection sync to Firestore
async function syncCollectionsToFirestore(data: DBStructure) {
  try {
    if (data.users) {
      for (const item of data.users) {
        if (item && item.id) {
          await saveToFirestore("users", item.id, item);
        }
      }
    }
    if (data.reservations) {
      for (const item of data.reservations) {
        if (item && item.id) {
          await saveToFirestore("reservations", item.id, item);
        }
      }
    }
    if (data.emails) {
      for (const item of data.emails) {
        if (item && item.id) {
          await saveToFirestore("emails", item.id, item);
        }
      }
    }
    if (data.visitorPasses) {
      for (const item of data.visitorPasses) {
        if (item && item.id) {
          await saveToFirestore("visitorPasses", item.id, item);
        }
      }
    }
    if (data.payments) {
      for (const item of data.payments) {
        if (item && item.id) {
          await saveToFirestore("payments", item.id, item);
        }
      }
    }
  } catch (err) {
    console.error("Error in background Firestore sync:", err);
  }
}

function saveDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    // Trigger asynchronous firestore sync in background
    syncCollectionsToFirestore(data).catch((err) => {
      console.warn("Background firestore sync failed:", err);
    });
  } catch (e) {
    console.error("Error saving database file", e);
  }
}

// Initialize database
let db = loadDB();
// Ensure it has structure
if (!db.users || !db.reservations || !db.emails) {
  db = defaultDB;
  saveDB(db);
}

if (!db.visitorPasses) {
  db.visitorPasses = [];
  saveDB(db);
}

async function syncFromFirestoreOnBoot() {
  console.log("🔄 Iniciando sincronización de arranque con Firestore...");
  try {
    const fireUsers = await loadFromFirestore("users");
    const fireReservations = await loadFromFirestore("reservations");
    const fireEmails = await loadFromFirestore("emails");
    const firePasses = await loadFromFirestore("visitorPasses");
    const firePayments = await loadFromFirestore("payments");

    let dbHasData = false;
    
    if (
      (fireUsers && fireUsers.length > 0) ||
      (fireReservations && fireReservations.length > 0) ||
      (fireEmails && fireEmails.length > 0) ||
      (firePasses && firePasses.length > 0) ||
      (firePayments && firePayments.length > 0)
    ) {
      dbHasData = true;
    }

    if (dbHasData) {
      console.log("📈 Se encontraron datos en Firestore. Sincronizando...");
      if (fireUsers && fireUsers.length > 0) db.users = fireUsers;
      if (fireReservations && fireReservations.length > 0) db.reservations = fireReservations;
      if (fireEmails && fireEmails.length > 0) db.emails = fireEmails;
      if (firePasses && firePasses.length > 0) db.visitorPasses = firePasses;
      if (firePayments && firePayments.length > 0) db.payments = firePayments;
      
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
      console.log("✅ Base de datos local sincronizada con el servidor en la nube.");
    } else {
      console.log("🌱 Firestore vacío. Subiendo datos iniciales...");
      await syncCollectionsToFirestore(db);
      console.log("✅ Datos iniciales sembrados correctamente en Firestore.");
    }
  } catch (error) {
    console.warn("⚠️ Error en sincronización de arranque con Firestore:", error);
  }
}

// Trigger background boot synchronization
syncFromFirestoreOnBoot().catch((err) => {
  console.warn("Boot synchronization failed:", err);
});

if (!db.payments) {
  db.payments = [
    {
      id: "pay1",
      userId: "u2",
      userName: "casa101",
      house: "Casa 101",
      userEmail: "casa101@kuaukali.com",
      months: ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026", "Mayo 2026"],
      amount: 250,
      correlative: "REC-2026-0001",
      passCode: "VP-58291",
      transactionReference: "TXN-83921029",
      proofFileName: "pago_mayo.png",
      proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0001 (Jan-May)</text></svg>",
      status: "approved",
      createdAt: "2026-05-28T10:15:30.000Z",
      processedAt: "2026-05-28T14:30:00.000Z"
    },
    {
      id: "pay2",
      userId: "u3",
      userName: "casa204",
      house: "Casa 204",
      userEmail: "casa204@kuaukali.com",
      months: ["Enero 2026", "Febrero 2026", "Marzo 2026"],
      amount: 150,
      correlative: "REC-2026-0002",
      passCode: "VP-48201",
      transactionReference: "TXN-10294819",
      proofFileName: "pago_marzo.png",
      proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0002 (Jan-Mar)</text></svg>",
      status: "approved",
      createdAt: "2026-03-25T11:00:00.000Z",
      processedAt: "2026-03-25T15:10:00.000Z"
    },
    {
      id: "pay3",
      userId: "u3",
      userName: "casa204",
      house: "Casa 204",
      userEmail: "casa204@kuaukali.com",
      months: ["Abril 2026", "Mayo 2026"],
      amount: 100,
      correlative: "REC-2026-0003",
      passCode: "VP-93210",
      transactionReference: "TXN-49201948",
      proofFileName: "transfer_abril_mayo.png",
      proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0003 (Apr-May)</text></svg>",
      status: "pending",
      createdAt: new Date().toISOString()
    }
  ];
  saveDB(db);
}

// Ensure at least one active vigilante exists
const hasVigilante = db.users.some(u => u.role === "vigilante");
if (!hasVigilante) {
  db.users.push({
    id: "u5",
    username: "vigilante1",
    password: "v1",
    role: "vigilante",
    house: "Caseta de Vigilancia",
    email: "vigilancia@kuaukali.com",
    isActive: true
  });
  saveDB(db);
}

// Guarantee all existing users have isActive state defined (retrocompatible check)
let modified = false;
db.users.forEach((u) => {
  if (u.isActive === undefined) {
    u.isActive = true;
    modified = true;
  }
});
if (modified) {
  saveDB(db);
}

// API Routes

// Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Nombre de usuario y contraseña son requeridos" });
  }

  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Credenciales de ingreso incorrectas" });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: "Su usuario se encuentra INACTIVO. Comuníquese con la administración para reactivarlo." });
  }

  // Exclude password in response
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, house, email } = req.body;
  
  if (!username || !password || !house || !email) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "El nombre de usuario ya existe" });
  }

  const newUser = {
    id: "u_" + Math.random().toString(36).substr(2, 9),
    username,
    password,
    house,
    email,
    role: "resident",
    isActive: true
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// Admin User Management API
app.get("/api/admin/users", (req, res) => {
  const safeUsers = db.users.map(({ password: _, ...u }) => u);
  res.json(safeUsers);
});

app.post("/api/admin/users", (req, res) => {
  const { username, password, house, email, role, isActive } = req.body;

  if (!username || !password || !house || !email || !role) {
    return res.status(400).json({ error: "Todos los campos son obligatorios: usuario, contraseña, casa/número, correo y rol." });
  }

  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "El nombre de usuario ya existe." });
  }

  const newUser = {
    id: "u_" + Math.random().toString(36).substr(2, 9),
    username,
    password,
    house,
    email,
    role,
    isActive: isActive !== undefined ? !!isActive : true
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.patch("/api/admin/users/:id/toggle-active", (req, res) => {
  const { id } = req.params;
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  user.isActive = !user.isActive;
  saveDB(db);

  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// Admin User Editing API
app.put("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, house, email, role, password, isTemporaryPassword } = req.body;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  if (username && username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "El nombre de usuario ya existe." });
    }
    user.username = username;
  }

  if (house) user.house = house;
  if (email) user.email = email;
  if (role) user.role = role;
  if (password) {
    user.password = password;
  }
  if (isTemporaryPassword !== undefined) {
    user.isTemporaryPassword = !!isTemporaryPassword;
  }

  saveDB(db);
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// Admin Definitive User Deletion API
app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const userIndex = db.users.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  db.users.splice(userIndex, 1);
  saveDB(db);

  res.json({ success: true, message: "Usuario eliminado definitivamente." });
});

// Admin Password Reset with Temporary Password API
app.post("/api/admin/users/:id/reset-password", (req, res) => {
  const { id } = req.params;
  const { tempPassword } = req.body;

  if (!tempPassword || tempPassword.trim().length < 3) {
    return res.status(400).json({ error: "Debe proporcionar una contraseña temporal válida de al menos 3 caracteres." });
  }

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  user.password = tempPassword.trim();
  user.isTemporaryPassword = true;

  saveDB(db);
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Client Password Change (Clears Temporary Password) API
app.post("/api/auth/change-password", (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword || newPassword.trim().length < 3) {
    return res.status(400).json({ error: "Todos los campos son obligatorios y la contraseña debe tener al menos 3 caracteres." });
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  user.password = newPassword.trim();
  user.isTemporaryPassword = false;

  saveDB(db);
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Retrieve all reservations
app.get("/api/reservations", (req, res) => {
  res.json(db.reservations);
});

// Helper validation for time ranges
// Converts HH:MM to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Request booking
app.post("/api/reservations", (req, res) => {
  const { userId, date, startTime, endTime, guestsCount, proofFileName, proofFileUrl } = req.body;

  if (!userId || !date || !startTime || !endTime || !guestsCount || !proofFileUrl) {
    return res.status(400).json({ error: "Faltan campos obligatorios en el formulario de reserva" });
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario residente no encontrado" });
  }

  // Parse times
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  if (startMins >= endMins) {
    return res.status(400).json({ error: "La hora de inicio debe ser anterior a la hora de finalización" });
  }

  // rule: max 5 hours
  const durationMinutes = endMins - startMins;
  if (durationMinutes > 5 * 60) {
    return res.status(400).json({ error: "El máximo de horas permitidas es de 5 horas por reserva" });
  }

  // Check overlapping or consecutive rules with existing bookings on the same day (except rejected and cancelled)
  const bookingsSameDay = db.reservations.filter(
    (r) => r.date === date && r.status !== "rejected" && r.status !== "cancelled"
  );

  for (const b of bookingsSameDay) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    // 1. Direct overlap
    const hasOverlap = (startMins < bEnd && endMins > bStart);
    if (hasOverlap) {
      return res.status(400).json({
        error: `Conflicto de horario: Ya existe una reserva para esta fecha de ${b.startTime} a ${b.endTime} (${b.house})`
      });
    }

    // 2. Continuous time buffer check (at least 1 hour apart / de por medio)
    // There must be >= 60 minutes difference between reservations
    // So current start must be >= bEnd + 60, OR current end must be <= bStart - 60
    const startDiff = startMins - bEnd; // diff between our start and their end
    const endDiff = bStart - endMins; // diff between their start and our end

    // If both are less than 60, and we are on different sides:
    // Actually, if we start after them, we need startMins - bEnd >= 60
    // If we start before them, we need bStart - endMins >= 60
    // So we fail if we are closer than 60 minutes either way.
    if (startMins > bStart && startDiff < 60) {
      return res.status(400).json({
        error: `Normativa de Casa Club: Debe haber al menos 1 hora de promedio (descanso) entre reservas. La reserva previa de ${b.house} finaliza a las ${b.endTime}`
      });
    }

    if (startMins < bStart && endDiff < 60) {
      return res.status(400).json({
        error: `Normativa de Casa Club: Debe haber al menos 1 hora de promedio (descanso) entre reservas. La siguiente reserva de ${b.house} comienza a las ${b.startTime}`
      });
    }
  }

  const newReservation = {
    id: "r_" + Math.random().toString(36).substr(2, 9),
    userId,
    userName: user.username,
    house: user.house,
    userEmail: user.email,
    date,
    startTime,
    endTime,
    durationHours: parseFloat((durationMinutes / 60).toFixed(1)),
    guestsCount: Number(guestsCount),
    proofFileName: proofFileName || "comprobante_transferencia.png",
    proofFileUrl,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  db.reservations.push(newReservation);
  saveDB(db);

  res.status(201).json(newReservation);
});

// Admin Review Actions
app.post("/api/reservations/:id/approve", (req, res) => {
  const { id } = req.params;
  const reservation = db.reservations.find((r) => r.id === id);

  if (!reservation) {
    return res.status(404).json({ error: "Reserva no encontrada para aprobación" });
  }

  reservation.status = "approved";

  // Simulate automatic email notification
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #1e3a8a; margin: 0;">Residencial KuauKali</h2>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Confirmación de Reserva de Casa Club</p>
      </div>

      <p style="font-size: 16px;">Estimado Residente de la <strong>${reservation.house}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.5; background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; border-radius: 0 4px 4px 0;">
        Nos complace informarle que su solicitud de reserva de la <strong>Casa Club</strong> ha sido <strong>APROBADA exitosamente</strong> por la administración después de verificar su comprobante de pago.
      </p>

      <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 16px;">Detalles de la Reserva</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 40%"><strong>Fecha:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;">${reservation.date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Horario Establecido:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;">${reservation.startTime} hs. a ${reservation.endTime} hs.</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Duración Total:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;">${reservation.durationHours} horas</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Cantidad de Invitados:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;">${reservation.guestsCount} personas</td>
          </tr>
        </table>
      </div>

      <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px;">
        <h3 style="color: #b91c1c; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ REGLAS ESTRICTAS DE USO Y CONDICIONES</h3>
        <ul style="padding-left: 20px; line-height: 1.6; font-size: 14px; color: #334155;">
          <li style="margin-bottom: 8px;">
            <strong>Limpieza del Lugar:</strong> Es responsabilidad obligatoria del residente dejar las instalaciones de la Casa Club en un estado de perfecta limpieza. De lo contrario, se cargará una multa automática a la cuota residencial.
          </li>
          <li style="margin-bottom: 8px;">
            <strong>Capacidad Máxima:</strong> El aforo máximo permitido es de <strong>50 invitados</strong>. Por favor, asegúrese de respetar este límite por seguridad vial y sanitaria.
          </li>
          <li style="margin-bottom: 8px;">
            <strong>Lista de Invitados:</strong> Es obligatorio enviar la lista detallada de invitados a la <strong>Caseta de Vigilantes</strong> con al menos 24 horas de anticipación para coordinar el ingreso seguro.
          </li>
          <li style="margin-bottom: 8px;">
            <strong>Horarios de Entrada y Salida:</strong> Los horarios autorizados son sumamente rígidos y están definidos exclusivamente para las horas de su reserva: <strong>${reservation.startTime} - ${reservation.endTime}</strong>. Deberá desalojar con puntualidad.
          </li>
        </ul>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
        Este es un correo de notificación automática del Girasol Residencial KuauKali. Por favor no responder a esta cuenta.
      </div>
    </div>
  `;

  const notification = {
    id: "mail_" + Math.random().toString(36).substr(2, 9),
    reservationId: reservation.id,
    toEmail: reservation.userEmail || "comunidad@kuaukali.com",
    subject: `Confirmación de Reserva Aprobada - ${reservation.house}`,
    bodyHtml,
    sentAt: new Date().toISOString()
  };

  db.emails.push(notification);
  saveDB(db);

  res.json({ success: true, reservation, notification });
});

app.post("/api/reservations/:id/reject", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const reservation = db.reservations.find((r) => r.id === id);

  if (!reservation) {
    return res.status(404).json({ error: "Reserva no encontrada para el rechazo" });
  }

  reservation.status = "rejected";
  reservation.rejectionReason = reason || "Documentación o comprobante de transferencia inválidos.";

  // Simulate rejection email
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #fca5a5; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #991b1b; margin: 0;">Residencial KuauKali</h2>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Solicitud Reclamada / Rechazada</p>
      </div>

      <p style="font-size: 16px;">Estimado Residente de la <strong>${reservation.house}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.5; background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 0 4px 4px 0; color: #991b1b;">
        Lamentamos informarle que su solicitud de reserva de la <strong>Casa Club</strong> para la fecha <strong>${reservation.date}</strong> ha sido <strong>RECHAZADA</strong>.
      </p>

      <div style="background-color: #fafafa; border-radius: 6px; padding: 15px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <strong style="color: #0f172a; font-size: 14px;">Motivo del Rechazo indicado por el administrador:</strong>
        <p style="margin: 8px 0 0 0; color: #ef4444; font-size: 14px; line-height: 1.5;">
          ${reservation.rejectionReason}
        </p>
      </div>

      <p style="font-size: 14px; line-height: 1.5;">
        Por favor vuelva a ingresar a la plataforma, registre su solicitud asegurando un comprobante válido legible con la fecha y horas correspondientes o contáctese con la administración para solucionar su situación de forma personalizada.
      </p>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
        Este es un correo automático. Residencial KuauKali.
      </div>
    </div>
  `;

  const notification = {
    id: "mail_" + Math.random().toString(36).substr(2, 9),
    reservationId: reservation.id,
    toEmail: reservation.userEmail || "comunidad@kuaukali.com",
    subject: `Solicitud de Casa Club Rechazada - ${reservation.house}`,
    bodyHtml,
    sentAt: new Date().toISOString()
  };

  db.emails.push(notification);
  saveDB(db);

  res.json({ success: true, reservation, notification });
});

// Retrieve simulated sent emails
app.get("/api/emails", (req, res) => {
  const { email, role } = req.query;
  let emails = db.emails || [];

  if (role === "resident" && email) {
    emails = emails.filter(
      (e) => e.toEmail && e.toEmail.toLowerCase() === (email as string).toLowerCase()
    );
  }
  res.json(emails);
});

// Cancel a reservation (resident or admin)
app.post("/api/reservations/:id/cancel", (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;

  const reservation = db.reservations.find((r) => r.id === id);
  if (!reservation) {
    return res.status(404).json({ error: "Reserva no encontrada para cancelación." });
  }

  // Check permission: must be owner or admin
  if (role !== "admin" && reservation.userId !== userId) {
    return res.status(403).json({ error: "No tiene permisos para cancelar esta reserva." });
  }

  reservation.status = "cancelled";

  // Simulate cancellation email notification
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #64748b; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #334155; margin: 0;">Residencial KuauKali</h2>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Reserva Cancelada y Liberada</p>
      </div>

      <p style="font-size: 16px;">Estimado Residente de la <strong>${reservation.house}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.5; background-color: #f8fafc; border-left: 4px solid #64748b; padding: 12px; border-radius: 0 4px 4px 0; color: #475569;">
        Le informamos que la reserva de la <strong>Casa Club</strong> registrada para el día <strong>${reservation.date}</strong> en horario de <strong>${reservation.startTime} hs. - ${reservation.endTime} hs.</strong> ha sido <strong>CANCELADA</strong> y el horario asignado ha quedado liberado para disponibilidad del resto de residentes.
      </p>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
        Este es un mensaje de notificación automático de Residencial KuauKali.
      </div>
    </div>
  `;

  const notification = {
    id: "mail_" + Math.random().toString(36).substr(2, 9),
    reservationId: reservation.id,
    toEmail: reservation.userEmail || "comunidad@kuaukali.com",
    subject: `Cancelación de Reserva - ${reservation.house}`,
    bodyHtml,
    sentAt: new Date().toISOString()
  };

  db.emails.push(notification);
  saveDB(db);

  res.json({ success: true, reservation, notification });
});

// Revert reservation back to pending (admin only)
app.post("/api/reservations/:id/pending", (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== "admin") {
    return res.status(403).json({ error: "No autorizado." });
  }

  const reservation = db.reservations.find((r) => r.id === id);
  if (!reservation) {
    return res.status(404).json({ error: "Reserva no encontrada." });
  }

  reservation.status = "pending";
  // remove rejection or cancellation reasons
  delete reservation.rejectionReason;

  saveDB(db);
  res.json({ success: true, reservation });
});


// --- VISITOR PASSES ENDPOINTS ---

// Get all visitor passes
app.get("/api/visitor-passes", (req, res) => {
  const { userId, role } = req.query;

  let passes = db.visitorPasses || [];

  if (role === "resident" && userId) {
    passes = passes.filter(p => p.userId === userId);
  }
  // Admins and vigilantes can see all passes
  res.json(passes);
});

// Create visitor pass
app.post("/api/visitor-passes", (req, res) => {
  const { userId, userName, house, firstName, lastName, entryDate, maxEntries, peopleCount } = req.body;

  if (!userId || !userName || !house || !firstName || !lastName || !entryDate) {
    return res.status(400).json({ error: "Faltan campos requeridos para el registro de visita." });
  }

  const passCode = `KK-${Math.floor(100000 + Math.random() * 900000)}`;

  const newPass = {
    id: "pass_" + Math.random().toString(36).substr(2, 9),
    userId,
    userName,
    house,
    firstName,
    lastName,
    entryDate,
    maxEntries: Number(maxEntries) || 1,
    entriesUsed: 0,
    peopleCount: Number(peopleCount) || 1,
    passCode,
    status: "active",
    createdAt: new Date().toISOString(),
    logs: []
  };

  if (!db.visitorPasses) {
    db.visitorPasses = [];
  }

  db.visitorPasses.push(newPass);
  saveDB(db);

  res.status(201).json(newPass);
});

// Search pass by code (case-insensitive)
app.get("/api/visitor-passes/search/:code", (req, res) => {
  const { code } = req.params;
  const uppercaseCode = code.toUpperCase().trim();

  const passes = db.visitorPasses || [];
  const pass = passes.find(p => p.passCode.toUpperCase() === uppercaseCode || p.id === code);

  if (!pass) {
    return res.status(404).json({ error: "Pase de visita no encontrado." });
  }

  res.json(pass);
});

// Guard checks/logs an entry attempt
app.post("/api/visitor-passes/:id/verify", (req, res) => {
  const { id } = req.params;
  const { guardId, guardName, action, notes } = req.body; // action: 'approved' | 'rejected'

  if (!action || !guardName) {
    return res.status(400).json({ error: "Faltan datos de acción o identificador de vigilante." });
  }

  const pass = (db.visitorPasses || []).find(p => p.id === id);
  if (!pass) {
    return res.status(404).json({ error: "Pase no encontrado." });
  }

  // Check if active or used/expired
  if (action === "approved") {
    if (pass.status !== "active") {
      return res.status(400).json({ error: `Este pase ya no se encuentra activo. Estado actual: ${pass.status}` });
    }

    pass.entriesUsed += 1;
    if (pass.entriesUsed >= pass.maxEntries) {
      pass.status = "used";
    }

    // CREATE NOTIFICATION FOR THE PROPERTY OWNER!
    // Search for user of the house or userId
    const resident = db.users.find(u => u.id === pass.userId);
    const destinationEmail = resident ? resident.email : "comunidad@kuaukali.com";

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #10b981; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #065f46; margin: 0;">¡Notificación de Ingreso!</h2>
          <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">Visita Registrada en Caseta de Vigilancia</p>
        </div>

        <p style="font-size: 16px;">Estimado Propietario de la <strong>${pass.house}</strong>,</p>
        
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Le informamos que un visitante ha ingresado a la residencial por la caseta principal y se dirige hacia su domicilio:
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin-top: 0; color: #065f46; font-size: 16px;">Detalles del Visitante:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 120px;">Nombre:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${pass.firstName} ${pass.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Acompañantes:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${pass.peopleCount} Persona(s)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Código de Acceso:</td>
              <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${pass.passCode}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Hora de Ingreso:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Vigilante:</td>
              <td style="padding: 4px 0; color: #334155;">${guardName}</td>
            </tr>
            ${notes ? `<tr><td style="padding: 4px 0; color: #64748b;">Observaciones:</td><td style="padding: 4px 0; font-style: italic; color: #475569;">"${notes}"</td></tr>` : ''}
          </table>
        </div>

        <p style="font-size: 14px; color: #475569;">
          Esta medida forma parte del protocolo de seguridad del condominio <strong>Residencial KuauKali</strong>.
        </p>

        <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este es un mensaje de notificación en tiempo real de Residencial KuauKali.
        </div>
      </div>
    `;

    const notification = {
      id: "mail_" + Math.random().toString(36).substr(2, 9),
      reservationId: pass.id, // reference visitor pass id
      toEmail: destinationEmail,
      subject: `⚠️ Ingreso Autorizado: ${pass.firstName} ${pass.lastName} va hacia tu casa`,
      bodyHtml,
      sentAt: new Date().toISOString()
    };

    if (!db.emails) {
      db.emails = [];
    }
    db.emails.push(notification);
  }

  // Add to logs
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    guardId,
    guardName,
    notes: notes || ""
  };

  if (!pass.logs) {
    pass.logs = [];
  }
  pass.logs.push(logEntry);

  saveDB(db);

  res.json({ success: true, pass });
});


// Vigilance Fee Payments Helpers
function getRequiredMonths(): string[] {
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
  // Dynamic calculation representing 2026-06-25 current month is June, past months are January to May
  const now = new Date("2026-06-25T14:57:20-07:00");
  const currentMonthIdx = now.getMonth(); // 5 for June (0-based)
  return monthsList.slice(0, currentMonthIdx); // returns ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026", "Mayo 2026"]
}

function getPaidMonthsForHouse(houseName: string): string[] {
  const approvedPayments = (db.payments || []).filter(
    (p) => p.house.toLowerCase() === houseName.toLowerCase() && p.status === "approved"
  );
  const paid = new Set<string>();
  approvedPayments.forEach((p) => {
    (p.months || []).forEach((m: string) => paid.add(m));
  });
  return Array.from(paid);
}

function getHousePaymentStatus(houseName: string) {
  const required = getRequiredMonths();
  const paid = getPaidMonthsForHouse(houseName);
  const pendingMonths = required.filter((m) => !paid.includes(m));
  const status = pendingMonths.length > 0 ? "mora" : "al_dia";
  return {
    house: houseName,
    status,
    pendingMonthsCount: pendingMonths.length,
    pendingMonths,
    paidMonths: paid
  };
}

// Get vigilance payment records
app.get("/api/payments", (req, res) => {
  const { userId, role } = req.query;
  let payments = db.payments || [];
  if (role === "resident" && userId) {
    payments = payments.filter((p) => p.userId === userId);
  }
  res.json(payments);
});

// Get consolidated payment statuses of all resident houses
app.get("/api/payments/status", (req, res) => {
  const residentUsers = db.users.filter((u) => u.role === "resident" && u.isActive !== false);
  const statusList = residentUsers.map((user) => {
    return getHousePaymentStatus(user.house);
  });
  res.json(statusList);
});

// Create a new vigilance fee payment registration
app.post("/api/payments", (req, res) => {
  const {
    userId,
    userName,
    house,
    userEmail,
    months,
    amount,
    transactionReference,
    proofFileName,
    proofFileUrl
  } = req.body;

  if (!userId || !months || months.length === 0 || !amount || !transactionReference) {
    return res.status(400).json({ error: "Faltan campos requeridos para registrar el pago." });
  }

  const correlativeNum = (db.payments || []).length + 1;
  const correlative = `REC-2026-${String(correlativeNum).padStart(4, "0")}`;
  const passCode = `VP-${Math.floor(10000 + Math.random() * 90000)}`;

  const newPayment = {
    id: "pay_" + Math.random().toString(36).substring(2, 9),
    userId,
    userName,
    house,
    userEmail,
    months,
    amount,
    correlative,
    passCode,
    transactionReference,
    proofFileName: proofFileName || "comprobante.jpg",
    proofFileUrl: proofFileUrl || "",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  if (!db.payments) {
    db.payments = [];
  }
  db.payments.push(newPayment);
  saveDB(db);

  res.status(201).json(newPayment);
});

// Verify a payment registration (Approve/Reject)
app.post("/api/payments/:id/verify", (req, res) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body; // action: 'approved' | 'rejected'

  const payment = (db.payments || []).find((p) => p.id === id);
  if (!payment) {
    return res.status(404).json({ error: "Pago no encontrado." });
  }

  payment.status = action;
  payment.processedAt = new Date().toISOString();
  if (action === "rejected") {
    payment.rejectionReason = rejectionReason || "Comprobante de pago inválido o no recibido.";
  } else {
    payment.rejectionReason = undefined;
  }

  saveDB(db);

  // Send simulated email
  let subject = "";
  let bodyHtml = "";

  if (action === "approved") {
    subject = `✓ Comprobante de Pago Aprobado - Recibo ${payment.correlative} - KuauKali`;
    bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px;">
          <span style="font-size: 11px; font-weight: bold; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em;">Residencial KuauKali</span>
          <h2 style="margin: 6px 0 0 0; color: #0d9488; text-transform: uppercase;">RECIBO VIRTUAL DE PAGO</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #10b981; font-weight: bold;">✓ PAGO COMPROBADO Y CONCILIADO</p>
        </div>
        
        <div style="padding: 20px 0; font-size: 13px; line-height: 1.6;">
          <p>Estimado(a) propietario(a) de la <strong>${payment.house}</strong>,</p>
          <p>Nos complace informarle que la administración ha validado con éxito su transferencia bancaria. Su cuenta de vigilancia se encuentra al día para los meses correspondientes.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Correlativo Recibo:</td>
                <td style="text-align: right; font-weight: bold; color: #0f172a;">${payment.correlative}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Código de Validación:</td>
                <td style="text-align: right; font-weight: bold; font-family: monospace; color: #0f172a;">${payment.passCode}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Destino / Casa:</td>
                <td style="text-align: right; font-weight: bold; color: #0f172a;">${payment.house}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Meses Cancelados:</td>
                <td style="text-align: right; font-weight: bold; color: #0d9488;">${payment.months.join(", ")}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Monto Validado:</td>
                <td style="text-align: right; font-weight: bold; color: #0f172a;">$${payment.amount}.00 USD</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Referencia de Transacción:</td>
                <td style="text-align: right; font-family: monospace; color: #475569;">${payment.transactionReference}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Fecha de Emisión:</td>
                <td style="text-align: right; color: #475569;">${new Date(payment.processedAt).toLocaleString("es-ES")}</td>
              </tr>
            </table>
          </div>
          
          <p>Este comprobante virtual representa su constancia oficial de solvencia. Puede consultar y descargar este recibo ingresando a su portal de condóminos en cualquier momento.</p>
        </div>
        
        <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">
          Este es un correo oficial del comité de administración y vigilancia. Residencial KuauKali.
        </div>
      </div>
    `;
  } else {
    subject = `⚠ Comprobante de Pago Rechazado - Recibo ${payment.correlative} - KuauKali`;
    bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px;">
          <span style="font-size: 11px; font-weight: bold; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em;">Residencial KuauKali</span>
          <h2 style="margin: 6px 0 0 0; color: #e11d48; text-transform: uppercase;">PAGO RECHAZADO / INCONSISTENCIA</h2>
        </div>
        
        <div style="padding: 20px 0; font-size: 13px; line-height: 1.6;">
          <p>Estimado(a) propietario(a) de la <strong>${payment.house}</strong>,</p>
          <p>Lamentamos informarle que su solicitud de registro de pago con el correlativo <strong>${payment.correlative}</strong> ha sido <strong>RECHAZADA</strong> por la administración debido a la siguiente observación:</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin: 16px 0; color: #991b1b; font-weight: bold;">
            "${payment.rejectionReason}"
          </div>
          
          <p>Detalles del intento de pago rechazado:</p>
          <ul style="padding-left: 20px; color: #475569;">
            <li>Meses intentados: <strong>${payment.months.join(", ")}</strong></li>
            <li>Monto de cuota declarado: <strong>$${payment.amount}.00 USD</strong></li>
            <li>Ref. Bancaria: <strong>${payment.transactionReference}</strong></li>
          </ul>
          
          <p><strong>¿Qué debe hacer ahora?</strong><br/>
          Por favor, ingrese de nuevo al portal de condóminos, verifique los datos de su transferencia bancaria y suba un nuevo comprobante que sea totalmente legible y que corresponda al movimiento bancario real. Si considera que se trata de un error, contáctese con la Administración.</p>
        </div>
        
        <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">
          Comité de Administración y Vigilancia. Residencial KuauKali.
        </div>
      </div>
    `;
  }

  const mailId = "mail_" + Math.random().toString(36).substr(2, 9);
  const notification = {
    id: mailId,
    reservationId: payment.id,
    toEmail: payment.userEmail || `${payment.userId}@kuaukali.com`,
    subject,
    bodyHtml,
    sentAt: new Date().toISOString()
  };

  if (!db.emails) {
    db.emails = [];
  }
  db.emails.push(notification);
  saveDB(db);

  res.json({ success: true, payment, notification });
});


// Reset database for debugging purposes
app.post("/api/admin/reset", (req, res) => {
  db = {
    users: [...defaultDB.users],
    reservations: [...defaultDB.reservations],
    emails: [],
    visitorPasses: [],
    payments: [
      {
        id: "pay1",
        userId: "u2",
        userName: "casa101",
        house: "Casa 101",
        userEmail: "casa101@kuaukali.com",
        months: ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026", "Mayo 2026"],
        amount: 250,
        correlative: "REC-2026-0001",
        passCode: "VP-58291",
        transactionReference: "TXN-83921029",
        proofFileName: "pago_mayo.png",
        proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0001 (Jan-May)</text></svg>",
        status: "approved",
        createdAt: "2026-05-28T10:15:30.000Z",
        processedAt: "2026-05-28T14:30:00.000Z"
      },
      {
        id: "pay2",
        userId: "u3",
        userName: "casa204",
        house: "Casa 204",
        userEmail: "casa204@kuaukali.com",
        months: ["Enero 2026", "Febrero 2026", "Marzo 2026"],
        amount: 150,
        correlative: "REC-2026-0002",
        passCode: "VP-48201",
        transactionReference: "TXN-10294819",
        proofFileName: "pago_marzo.png",
        proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0002 (Jan-Mar)</text></svg>",
        status: "approved",
        createdAt: "2026-03-25T11:00:00.000Z",
        processedAt: "2026-03-25T15:10:00.000Z"
      },
      {
        id: "pay3",
        userId: "u3",
        userName: "casa204",
        house: "Casa 204",
        userEmail: "casa204@kuaukali.com",
        months: ["Abril 2026", "Mayo 2026"],
        amount: 100,
        correlative: "REC-2026-0003",
        passCode: "VP-93210",
        transactionReference: "TXN-49201948",
        proofFileName: "transfer_abril_mayo.png",
        proofFileUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23cbd5e1'/><text x='50%25' y='50%25' font-family='sans-serif' font-size='14' text-anchor='middle' fill='%23334155'>Transferencia Bancaria: REC-2026-0003 (Apr-May)</text></svg>",
        status: "pending",
        createdAt: new Date().toISOString()
      }
    ]
  };
  saveDB(db);
  res.json({ success: true, message: "Database reset to defaults successful" });
});


// Vite static / dev support
const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist/index.html"));

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Clubhouse Booking system listening on host 0.0.0.0:${PORT}`);
  });
}

startServer();
