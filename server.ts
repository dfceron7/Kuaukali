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
  }
} catch (e) {
  // Ignored
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
  properties?: any[];
  config?: any;
}

// Seed Data
const defaultDB: DBStructure = {
  users: [
    { id: "u_admin", username: "diego7ceron@gmail.com", password: "Kuaukali007*", role: "admin", house: "Administración", email: "diego7ceron@gmail.com", isActive: true }
  ],
  reservations: [],
  emails: [],
  visitorPasses: [],
  payments: [],
  properties: [
    { id: "prop_1", name: "Casa 101" },
    { id: "prop_2", name: "Casa 102" },
    { id: "prop_3", name: "Casa 103" },
    { id: "prop_4", name: "Casa 104" },
    { id: "prop_5", name: "Casa 105" },
    { id: "prop_6", name: "Casa 201" },
    { id: "prop_7", name: "Casa 202" },
    { id: "prop_8", name: "Administración" }
  ]
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

const syncCache: Record<string, string> = {};

function getDocCacheKey(collectionName: string, id: string): string {
  return `${collectionName}:${id}`;
}

async function saveToFirestoreCached(collectionName: string, id: string, data: any, promises: Promise<any>[]) {
  const cacheKey = getDocCacheKey(collectionName, id);
  const dataStr = JSON.stringify(data);
  
  if (syncCache[cacheKey] === dataStr) {
    return; // Ya sincronizado
  }
  
  promises.push(
    saveToFirestore(collectionName, id, data).then(() => {
      syncCache[cacheKey] = dataStr;
    })
  );
}

function syncDeletions(collectionName: string, activeIds: Set<string>, promises: Promise<any>[]) {
  const prefix = `${collectionName}:`;
  for (const cacheKey of Object.keys(syncCache)) {
    if (cacheKey.startsWith(prefix)) {
      const id = cacheKey.substring(prefix.length);
      if (!activeIds.has(id)) {
        console.log(`🗑️ [Firestore Sync] Detectada eliminación de /${collectionName}/${id} localmente. Sincronizando eliminación...`);
        promises.push(
          deleteFromFirestore(collectionName, id).then(() => {
            delete syncCache[cacheKey];
          })
        );
      }
    }
  }
}

// Background collection sync to Firestore
async function syncCollectionsToFirestore(data: DBStructure) {
  try {
    const promises: Promise<any>[] = [];

    if (data.users) {
      const activeIds = new Set<string>();
      for (const item of data.users) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("users", item.id, item, promises);
        }
      }
      syncDeletions("users", activeIds, promises);
    }
    if (data.reservations) {
      const activeIds = new Set<string>();
      for (const item of data.reservations) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("reservations", item.id, item, promises);
        }
      }
      syncDeletions("reservations", activeIds, promises);
    }
    if (data.emails) {
      const activeIds = new Set<string>();
      for (const item of data.emails) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("emails", item.id, item, promises);
        }
      }
      syncDeletions("emails", activeIds, promises);
    }
    if (data.visitorPasses) {
      const activeIds = new Set<string>();
      for (const item of data.visitorPasses) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("visitorPasses", item.id, item, promises);
        }
      }
      syncDeletions("visitorPasses", activeIds, promises);
    }
    if (data.payments) {
      const activeIds = new Set<string>();
      for (const item of data.payments) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("payments", item.id, item, promises);
        }
      }
      syncDeletions("payments", activeIds, promises);
    }
    if (data.properties) {
      const activeIds = new Set<string>();
      for (const item of data.properties) {
        if (item && item.id) {
          activeIds.add(item.id);
          await saveToFirestoreCached("properties", item.id, item, promises);
        }
      }
      syncDeletions("properties", activeIds, promises);
    }
    if (data.config) {
      await saveToFirestoreCached("config", "app_config", data.config, promises);
    }

    if (promises.length > 0) {
      console.log(`⚡ [Firestore Sync] Sincronizando ${promises.length} cambios en paralelo...`);
      await Promise.all(promises);
      console.log(`✅ [Firestore Sync] Sincronización en paralelo de ${promises.length} cambios completada.`);
    }
  } catch (err) {
    console.error("Error in background Firestore sync:", err);
  }
}

let isBootSynced = false;

function saveDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    if (isBootSynced) {
      // Trigger asynchronous firestore sync in background
      syncCollectionsToFirestore(data).catch((err) => {
        console.warn("Background firestore sync failed:", err);
      });
    } else {
      console.log("ℹ️ [saveDB] Guardado local únicamente. Sincronización de arranque aún en curso.");
    }
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

if (!db.properties || db.properties.length === 0) {
  db.properties = defaultDB.properties;
  saveDB(db);
}

if (!db.config) {
  db.config = {
    moraThresholdMonths: 3,
    moraStartMonth: "Enero 2026",
    monthlyFee: 100,
    feeHistory: [],
    maxReservationHours: 5,
    reservationNorms: [
      "Duración máxima permitida: 5 horas por reserva.",
      "Separación mínima entre eventos: 1 hora limpia de por medio.",
      "Se requiere comprobante de transferencia bancaria visible para estudio administrativo."
    ]
  };
  saveDB(db);
} else {
  let changed = false;
  if (db.config.maxReservationHours === undefined) {
    db.config.maxReservationHours = 5;
    changed = true;
  }
  if (db.config.monthlyFee === 50) {
    db.config.monthlyFee = 100;
    changed = true;
  }
  if (db.config.moraThresholdMonths === 1) {
    db.config.moraThresholdMonths = 3;
    changed = true;
  }
  if (changed) {
    saveDB(db);
  }
}

async function syncFromFirestoreOnBoot() {
  console.log("🔄 Iniciando sincronización de arranque con Firestore...");
  try {
    let retries = 5;
    let fireUsers: any[] | null = null;
    
    while (retries > 0) {
      fireUsers = await loadFromFirestore("users");
      if (fireUsers !== null) {
        break;
      }
      console.warn(`⚠️ Error al cargar usuarios de Firestore. Reintentando en 5 segundos... (${retries} reintentos restantes)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      retries--;
    }

    if (fireUsers === null) {
      console.error("❌ No se pudo conectar con Firestore después de varios intentos. Se desactiva la sincronización de subida para proteger los datos locales.");
      isBootSynced = false;
      return;
    }

    const isNewAdminMissing = fireUsers.length === 0 || !fireUsers.some(u => 
      u.username === "diego7ceron@gmail.com" || 
      u.username === "TecnologiasInteractivasTI@gmail.com"
    );

    // If Firestore already has users, we do NOT reset anything. We load the clean state from Firestore.
    if (fireUsers.length > 0) {
      console.log(`📈 Se encontraron ${fireUsers.length} usuarios en Firestore. Sincronizando a memoria local...`);
      const fireReservations = await loadFromFirestore("reservations");
      const fireEmails = await loadFromFirestore("emails");
      const firePasses = await loadFromFirestore("visitorPasses");
      const firePayments = await loadFromFirestore("payments");
      const fireProperties = await loadFromFirestore("properties");
      const fireConfig = await loadFromFirestore("config");

      db.users = fireUsers;
      for (const u of fireUsers) {
        syncCache[getDocCacheKey("users", u.id)] = JSON.stringify(u);
      }

      if (fireReservations !== null) {
        db.reservations = fireReservations;
        for (const r of fireReservations) {
          syncCache[getDocCacheKey("reservations", r.id)] = JSON.stringify(r);
        }
        console.log(`📥 Sincronizadas ${fireReservations.length} reservaciones.`);
      } else {
        console.warn("⚠️ No se pudieron cargar las reservaciones de Firestore. Se mantienen las locales.");
      }

      if (fireEmails !== null) {
        db.emails = fireEmails;
        for (const em of fireEmails) {
          syncCache[getDocCacheKey("emails", em.id)] = JSON.stringify(em);
        }
      }

      if (firePasses !== null) {
        db.visitorPasses = firePasses;
        for (const p of firePasses) {
          syncCache[getDocCacheKey("visitorPasses", p.id)] = JSON.stringify(p);
        }
      }

      if (firePayments !== null) {
        db.payments = firePayments;
        for (const py of firePayments) {
          syncCache[getDocCacheKey("payments", py.id)] = JSON.stringify(py);
        }
        console.log(`📥 Sincronizados ${firePayments.length} pagos.`);
      } else {
        console.warn("⚠️ No se pudieron cargar los pagos de Firestore. Se mantienen los locales.");
      }

      if (fireProperties !== null && fireProperties.length > 0) {
        db.properties = fireProperties;
        for (const pr of fireProperties) {
          syncCache[getDocCacheKey("properties", pr.id)] = JSON.stringify(pr);
        }
      } else if (fireProperties !== null) {
        db.properties = defaultDB.properties;
        for (const pr of defaultDB.properties) {
          syncCache[getDocCacheKey("properties", pr.id)] = JSON.stringify(pr);
        }
      }

      if (fireConfig !== null && fireConfig.length > 0) {
        const appConfigDoc = fireConfig.find(c => c.id === "app_config");
        if (appConfigDoc) {
          const { id, ...cleanConfig } = appConfigDoc;
          db.config = cleanConfig;
          syncCache[getDocCacheKey("config", "app_config")] = JSON.stringify(appConfigDoc);
        }
      }

      // If for some reason the main admin accounts are missing from the existing database, append them safely
      if (isNewAdminMissing) {
        console.log("➕ Agregando cuentas de administración faltantes para asegurar el acceso...");
        const admin1 = { 
          id: "u_admin", 
          username: "diego7ceron@gmail.com", 
          password: "Kuaukali007*", 
          role: "admin", 
          house: "Administración", 
          email: "diego7ceron@gmail.com", 
          isActive: true 
        };
        const admin2 = { 
          id: "u_admin_ti", 
          username: "TecnologiasInteractivasTI@gmail.com", 
          password: "Kuaukali007*", 
          role: "admin", 
          house: "Administración", 
          email: "TecnologiasInteractivasTI@gmail.com", 
          isActive: true 
        };

        if (!db.users.some(u => u.username === admin1.username)) {
          db.users.push(admin1);
          await saveToFirestore("users", admin1.id, admin1);
          syncCache[getDocCacheKey("users", admin1.id)] = JSON.stringify(admin1);
        }
        if (!db.users.some(u => u.username === admin2.username)) {
          db.users.push(admin2);
          await saveToFirestore("users", admin2.id, admin2);
          syncCache[getDocCacheKey("users", admin2.id)] = JSON.stringify(admin2);
        }
      }

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
      console.log("✅ Base de datos local sincronizada correctamente con Firestore.");
    } else {
      console.log("🌱 Firestore vacío (0 usuarios). Inicializando estado limpio de inicio con administradores y propiedades...");
      // Initialize with default admin accounts
      const defaultAdmins = [
        { 
          id: "u_admin", 
          username: "diego7ceron@gmail.com", 
          password: "Kuaukali007*", 
          role: "admin", 
          house: "Administración", 
          email: "diego7ceron@gmail.com", 
          isActive: true 
        },
        { 
          id: "u_admin_ti", 
          username: "TecnologiasInteractivasTI@gmail.com", 
          password: "Kuaukali007*", 
          role: "admin", 
          house: "Administración", 
          email: "TecnologiasInteractivasTI@gmail.com", 
          isActive: true 
        }
      ];

      db.users = defaultAdmins;
      db.reservations = [];
      db.emails = [];
      db.visitorPasses = [];
      db.payments = [];
      db.properties = defaultDB.properties;

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");

      // Save seeds to Firestore
      for (const adm of defaultAdmins) {
        await saveToFirestore("users", adm.id, adm);
        syncCache[getDocCacheKey("users", adm.id)] = JSON.stringify(adm);
      }
      if (db.properties) {
        for (const prop of db.properties) {
          await saveToFirestore("properties", prop.id, prop);
          syncCache[getDocCacheKey("properties", prop.id)] = JSON.stringify(prop);
        }
      }
      console.log("✅ Inicialización y siembra completadas.");
    }
    isBootSynced = true;
  } catch (error) {
    console.warn("⚠️ Error en sincronización de arranque con Firestore:", error);
    isBootSynced = true;
  }
}

// Trigger background boot synchronization
syncFromFirestoreOnBoot().catch((err) => {
  console.warn("Boot synchronization failed:", err);
});

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

app.get("/api/auth/validate", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ valid: false, error: "userId es requerido" });
  }
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user || user.isActive === false) {
    return res.json({ valid: false });
  }
  res.json({ valid: true });
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

  if (user.id === "u_admin") {
    return res.status(403).json({ error: "No se permite inactivar al Administrador de Sistema principal." });
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

  if (user.id === "u_admin") {
    return res.status(403).json({ error: "No se permite editar al Administrador de Sistema principal." });
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

  const user = db.users[userIndex];
  if (user.id === "u_admin") {
    return res.status(403).json({ error: "No se permite eliminar al Administrador de Sistema principal." });
  }

  db.users.splice(userIndex, 1);
  saveDB(db);

  res.json({ success: true, message: "Usuario eliminado definitivamente." });
});

// --- PROPERTIES MANAGEMENT API ---
// Retrieve all properties
app.get("/api/properties", (req, res) => {
  res.json(db.properties || []);
});

// Retrieve specific property details with users and payment status
app.get("/api/properties/:id/details", (req, res) => {
  const { id } = req.params;
  const properties = db.properties || [];
  const property = properties.find(p => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Inmueble no encontrado." });
  }

  const users = (db.users || []).filter(u => u.house && u.house.toLowerCase() === property.name.toLowerCase()).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive !== false
  }));

  const paymentStatus = getHousePaymentStatus(property.name);

  res.json({
    property,
    users,
    paymentStatus
  });
});

// Create property
app.post("/api/properties", (req, res) => {
  const { name, ownerName, ownerPhone } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "El nombre del inmueble es requerido." });
  }

  const cleanName = name.trim();
  const properties = db.properties || [];
  
  if (properties.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
    return res.status(400).json({ error: "Ya existe un inmueble con este nombre." });
  }

  const newProperty = {
    id: "prop_" + Math.random().toString(36).substr(2, 9),
    name: cleanName,
    ownerName: (ownerName || "").trim(),
    ownerPhone: (ownerPhone || "").trim(),
    createdAt: new Date().toISOString()
  };

  if (!db.properties) db.properties = [];
  db.properties.push(newProperty);
  saveDB(db);

  res.status(201).json(newProperty);
});

// Update property
app.put("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  const { name, ownerName, ownerPhone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "El nombre del inmueble es requerido." });
  }

  const cleanName = name.trim();
  if (!db.properties) db.properties = [];

  const propIndex = db.properties.findIndex(p => p.id === id);
  if (propIndex === -1) {
    return res.status(404).json({ error: "Inmueble no encontrado." });
  }

  // Check if name already exists for another property
  if (db.properties.some(p => p.id !== id && p.name.toLowerCase() === cleanName.toLowerCase())) {
    return res.status(400).json({ error: "Ya existe otro inmueble con este nombre." });
  }

  const oldName = db.properties[propIndex].name;
  db.properties[propIndex].name = cleanName;
  db.properties[propIndex].ownerName = (ownerName || "").trim();
  db.properties[propIndex].ownerPhone = (ownerPhone || "").trim();

  // Propagate name change to associated entities
  if (db.users) {
    db.users.forEach(user => {
      if (user.house === oldName) {
        user.house = cleanName;
      }
    });
  }
  if (db.visitorPasses) {
    db.visitorPasses.forEach(pass => {
      if (pass.house === oldName) {
        pass.house = cleanName;
      }
    });
  }
  if (db.reservations) {
    db.reservations.forEach(res => {
      if (res.house === oldName) {
        res.house = cleanName;
      }
    });
  }
  if (db.payments) {
    db.payments.forEach(pay => {
      if (pay.house === oldName) {
        pay.house = cleanName;
      }
    });
  }

  saveDB(db);
  res.json(db.properties[propIndex]);
});

// Delete property
app.delete("/api/properties/:id", (req, res) => {
  const { id } = req.params;
  if (!db.properties) db.properties = [];

  const propIndex = db.properties.findIndex(p => p.id === id);
  if (propIndex === -1) {
    return res.status(404).json({ error: "Inmueble no encontrado." });
  }

  const propName = db.properties[propIndex].name;

  // Check if there are users associated with this house
  const associatedUsers = db.users.filter(u => u.house === propName);
  if (associatedUsers.length > 0) {
    return res.status(400).json({ 
      error: `No se puede eliminar el inmueble '${propName}' porque está asignado a ${associatedUsers.length} usuario(s). Cambie el inmueble de los usuarios antes de eliminarlo.` 
    });
  }

  db.properties.splice(propIndex, 1);
  saveDB(db);

  res.json({ success: true, message: "Inmueble eliminado exitosamente." });
});

// Helpers for dynamic monthly fee and historical pricing
function getFeeForMonth(monthName: string): number {
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
  if (!db.config) return 100;
  const defaultFee = db.config.monthlyFee !== undefined ? Number(db.config.monthlyFee) : 100;
  const history = db.config.feeHistory || [];
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
}

function calculateTotalAmount(months: string[]): number {
  return months.reduce((total: number, m: string) => total + getFeeForMonth(m), 0);
}

// Admin registers direct payment for a property
app.post("/api/admin/properties/:id/pay", (req, res) => {
  const { id } = req.params;
  const { months, paymentMethod, transactionReference, proofFileUrl, amount } = req.body;

  const property = (db.properties || []).find((p) => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Inmueble no encontrado." });
  }

  if (!months || !Array.isArray(months) || months.length === 0) {
    return res.status(400).json({ error: "Debe seleccionar al menos un mes a pagar." });
  }

  if (!transactionReference || !transactionReference.trim()) {
    return res.status(400).json({ error: "El número de comprobante es requerido." });
  }

  if (proofFileUrl && proofFileUrl.length > 800000) {
    return res.status(400).json({ error: "El archivo de comprobante adjunto es demasiado grande (máximo ~600KB comprimido). Por favor tome una captura de pantalla o reduzca el tamaño del archivo antes de subirlo." });
  }

  // Find a user associated with this property if any
  const associatedUser = (db.users || []).find(u => u.house && u.house.toLowerCase() === property.name.toLowerCase());
  const userId = associatedUser ? associatedUser.id : "admin_direct";
  const userName = associatedUser ? associatedUser.username : (property.ownerName || "Administración");
  const userEmail = associatedUser ? associatedUser.email : "contacto_inmueble@kuaukali.com";

  const correlativeNum = (db.payments || []).length + 1;
  const correlative = `REC-2026-${String(correlativeNum).padStart(4, "0")}`;
  const passCode = `VP-${Math.floor(10000 + Math.random() * 90000)}`;

  const newPayment = {
    id: "pay_" + Math.random().toString(36).substring(2, 9),
    userId,
    userName,
    house: property.name,
    userEmail,
    months,
    amount: amount || calculateTotalAmount(months),
    correlative,
    passCode,
    transactionReference: transactionReference.trim(),
    proofFileName: "pago_administracion.jpg",
    proofFileUrl: proofFileUrl || "",
    status: "approved", // Directly approved by admin
    paymentMethod: paymentMethod || "Efectivo",
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (!db.payments) {
    db.payments = [];
  }
  db.payments.push(newPayment);
  saveDB(db);

  // Broadcast to all connected administrators and residents for real-time reactive UI
  broadcastPaymentUpdate({ type: "payment_created", paymentId: newPayment.id, house: newPayment.house, status: "approved" });

  // Send virtual email receipt (same style as other approved payments)
  let subject = `✓ Comprobante de Pago Aprobado - Recibo ${newPayment.correlative} - KuauKali`;
  let bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px;">
        <span style="font-size: 11px; font-weight: bold; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em;">Residencial KuauKali</span>
        <h2 style="margin: 6px 0 0 0; color: #0d9488; text-transform: uppercase;">RECIBO VIRTUAL DE PAGO (ADMINISTRACIÓN)</h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #10b981; font-weight: bold;">✓ PAGO COMPROBADO Y CONCILIADO EN OFICINA</p>
      </div>
      
      <div style="padding: 20px 0; font-size: 13px; line-height: 1.6;">
        <p>Estimado(a) residente de la <strong>${newPayment.house}</strong>,</p>
        <p>Le informamos que la administración ha registrado y validado su pago directo en oficina. Su cuenta de vigilancia se encuentra al día para los meses cancelados.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Correlativo Recibo:</td>
              <td style="text-align: right; font-weight: bold; color: #0f172a;">${newPayment.correlative}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Método de Pago:</td>
              <td style="text-align: right; font-weight: bold; color: #0f172a;">${newPayment.paymentMethod}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Número de Referencia / Comprobante:</td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; color: #0f172a;">${newPayment.transactionReference}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Destino / Casa:</td>
              <td style="text-align: right; font-weight: bold; color: #0f172a;">${newPayment.house}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Meses Cancelados:</td>
              <td style="text-align: right; font-weight: bold; color: #0f172a;">${newPayment.months.join(", ")}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0; font-weight: bold;">Monto Total:</td>
              <td style="text-align: right; font-weight: bold; color: #0d9488; font-size: 14px;">$${newPayment.amount}.00 USD</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;

  if (!db.emails) {
    db.emails = [];
  }
  db.emails.push({
    id: "mail_" + Math.random().toString(36).substring(2, 9),
    toEmail: userEmail,
    subject,
    bodyHtml,
    sentAt: new Date().toISOString(),
    status: "sent"
  });

  saveDB(db);

  const users = (db.users || []).filter(u => u.house && u.house.toLowerCase() === property.name.toLowerCase()).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive !== false
  }));

  const paymentStatus = getHousePaymentStatus(property.name);

  res.json({
    success: true,
    payment: newPayment,
    details: {
      property,
      users,
      paymentStatus
    }
  });
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

  if (user.id === "u_admin") {
    return res.status(403).json({ error: "No se permite restablecer clave temporal para el Administrador de Sistema principal." });
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

  if (proofFileUrl && proofFileUrl.length > 800000) {
    return res.status(400).json({ error: "El archivo de comprobante adjunto es demasiado grande (máximo ~600KB comprimido). Por favor tome una captura de pantalla o reduzca el tamaño del archivo antes de subirlo." });
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

  // rule: max reservation hours
  const maxHours = db.config?.maxReservationHours ?? 5;
  const durationMinutes = endMins - startMins;
  if (durationMinutes > maxHours * 60) {
    return res.status(400).json({ error: `El máximo de horas permitidas es de ${maxHours} horas por reserva` });
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
    const targetUser = db.users.find(u => u.email && u.email.toLowerCase() === (email as string).toLowerCase());
    if (targetUser && targetUser.house) {
      // Find all emails of users belonging to the same house
      const houseEmails = db.users
        .filter(u => u.house && u.house.toLowerCase() === targetUser.house.toLowerCase())
        .map(u => u.email ? u.email.toLowerCase() : "")
        .filter(Boolean);
      
      emails = emails.filter(
        (e) => e.toEmail && houseEmails.includes(e.toEmail.toLowerCase())
      );
    } else {
      emails = emails.filter(
        (e) => e.toEmail && e.toEmail.toLowerCase() === (email as string).toLowerCase()
      );
    }
  }

  // Sort descending: most recent first (using sentAt or timestamp)
  const sortedEmails = [...emails].sort((a: any, b: any) => {
    const dateA = new Date(a.sentAt || a.timestamp || 0).getTime();
    const dateB = new Date(b.sentAt || b.timestamp || 0).getTime();
    return dateB - dateA;
  });

  res.json(sortedEmails);
});

// Send a custom communication (admin, sysadmin, directiva)
app.post("/api/communications/send", (req, res) => {
  const { senderEmail, senderRole, recipientMode, selectedEmails, subject, bodyText, imageUrl } = req.body;

  // Validate authorization
  const allowedRoles = ["admin", "sysadmin", "directiva"];
  if (!allowedRoles.includes(senderRole)) {
    return res.status(403).json({ error: "No tiene permisos para enviar comunicados." });
  }

  if (!subject || !bodyText) {
    return res.status(400).json({ error: "El asunto y el contenido de texto son obligatorios." });
  }

  // Get recipient users
  let recipients: string[] = [];
  if (recipientMode === "all") {
    // Send to all residents (non-admin, or just any user with email)
    recipients = (db.users || [])
      .filter(u => u.email && u.role === "resident")
      .map(u => u.email.toLowerCase());
  } else {
    // Send to specific selected emails
    recipients = (selectedEmails || []).map((e: string) => e.toLowerCase());
  }

  // Deduplicate emails
  recipients = Array.from(new Set(recipients));

  if (recipients.length === 0) {
    return res.status(400).json({ error: "No se encontraron destinatarios válidos seleccionados." });
  }

  if (!db.emails) db.emails = [];

  // Generate html body
  let imgHtml = "";
  if (imageUrl && imageUrl.trim()) {
    imgHtml = `
      <div style="margin-top: 20px; text-align: center;">
        <img src="${imageUrl.trim()}" alt="Imagen del comunicado" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0;" referrerPolicy="no-referrer" />
      </div>
    `;
  }

  const baseHtml = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b; font-size: 20px; font-weight: 850; letter-spacing: -0.025em;">🔔 COMUNICADO DE ADMINISTRACIÓN</h2>
        <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">Residencial KuauKali</p>
      </div>
      <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">
        ${bodyText}
      </div>
      ${imgHtml}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 11px; font-style: italic;">
        Este es un comunicado oficial enviado por la Administración/Directiva de Residencial KuauKali a través de su bandeja de notificaciones.
      </div>
    </div>
  `;

  const newEmails: any[] = [];
  recipients.forEach(email => {
    const emailObj = {
      id: "comm_" + Math.random().toString(36).substr(2, 9),
      reservationId: "communication",
      toEmail: email,
      subject: `[COMUNICADO] ${subject}`,
      bodyHtml: baseHtml,
      sentAt: new Date().toISOString()
    };
    db.emails.unshift(emailObj); // Prepend so it appears first
    newEmails.push(emailObj);
  });

  saveDB(db);

  // Broadcast communication_sent to all connected SSE clients (e.g., residents) for real-time notification
  broadcastPaymentUpdate({
    type: "communication_sent",
    subject,
    bodyText,
    recipients,
    imageUrl
  });

  return res.json({ success: true, count: recipients.length });
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
    const user = db.users.find(u => u.id === userId);
    if (user) {
      passes = passes.filter(p => p.house === user.house);
    } else {
      passes = [];
    }
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
  // Dynamic calculation representing current month from system date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-based
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthStr = `${monthNames[currentMonthIdx]} ${currentYear}`;
  const currentMonthGlobalIdx = monthsList.indexOf(currentMonthStr);
  
  // Required months are all months prior to the current month in course
  const availableMonths = currentMonthGlobalIdx !== -1 
    ? monthsList.slice(0, currentMonthGlobalIdx)
    : monthsList.slice(0, 6); // fallback

  // Filter based on configured start month
  const config = db.config || {};
  const startMonth = config.moraStartMonth || "Enero 2026";
  const startIdx = monthsList.indexOf(startMonth);
  if (startIdx !== -1) {
    return availableMonths.filter(m => monthsList.indexOf(m) >= startIdx);
  }
  return availableMonths;
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
  
  // Use config threshold
  const config = db.config || {};
  const moraThreshold = typeof config.moraThresholdMonths === 'number' ? config.moraThresholdMonths : 1;
  const status = pendingMonths.length >= moraThreshold ? "mora" : "al_dia";
  
  return {
    house: houseName,
    status,
    pendingMonthsCount: pendingMonths.length,
    pendingMonths,
    paidMonths: paid
  };
}

// Real-time payments event synchronization via Server-Sent Events (SSE)
let sseClients: any[] = [];

function broadcastPaymentUpdate(data?: any) {
  const payload = JSON.stringify(data || { type: "refresh" });
  console.log(`📡 [SSE Broadcast] Enviando actualización a ${sseClients.length} cliente(s)...`);
  sseClients.forEach((c) => {
    try {
      c.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.warn("⚠️ Error enviando evento a cliente SSE:", err);
    }
  });
}

// SSE Endpoint for payments and system events
app.get(["/api/payments/events", "/api/system-events"], (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  console.log(`🔌 [SSE Connection] Cliente conectado id: ${clientId} en ruta: ${req.path}`);
  
  const newClient = {
    id: clientId,
    res
  };
  sseClients.push(newClient);

  req.on("close", () => {
    console.log(`🔌 [SSE Connection] Cliente desconectado id: ${clientId}`);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Get vigilance payment records
app.get("/api/payments", (req, res) => {
  const { userId, role, email, username, house } = req.query;
  let payments = db.payments || [];
  
  const userRole = role ? String(role).trim().toLowerCase() : "";

  if (userRole === "resident") {
    // Collect all search keys in lowercase for comparison
    const uId = userId ? String(userId).trim().toLowerCase() : "";
    const uEmail = email ? String(email).trim().toLowerCase() : "";
    const uName = username ? String(username).trim().toLowerCase() : "";
    const uHouse = house ? String(house).trim().toLowerCase() : "";

    // Find user in DB to enrich search keys if possible
    let user = userId ? db.users.find(u => u.id === userId) : null;
    if (!user && email) {
      user = db.users.find(u => u.email && u.email.toLowerCase() === uEmail);
    }
    if (!user && username) {
      user = db.users.find(u => u.username && u.username.toLowerCase() === uName);
    }

    const possibleIds = new Set<string>();
    const possibleEmails = new Set<string>();
    const possibleHouses = new Set<string>();

    if (uId) possibleIds.add(uId);
    if (uEmail) possibleEmails.add(uEmail);
    if (uName) possibleEmails.add(uName);
    if (uHouse) possibleHouses.add(uHouse);

    if (user) {
      if (user.id) possibleIds.add(user.id.trim().toLowerCase());
      if (user.email) possibleEmails.add(user.email.trim().toLowerCase());
      if (user.username) possibleEmails.add(user.username.trim().toLowerCase());
      if (user.house) possibleHouses.add(user.house.trim().toLowerCase());
    }

    payments = payments.filter((p) => {
      const pUserId = p.userId ? String(p.userId).trim().toLowerCase() : "";
      const pUserEmail = p.userEmail ? String(p.userEmail).trim().toLowerCase() : "";
      const pUserName = p.userName ? String(p.userName).trim().toLowerCase() : "";
      const pHouse = p.house ? String(p.house).trim().toLowerCase() : "";

      // Check for matching House (highly reliable for resident tracking)
      if (pHouse && possibleHouses.has(pHouse)) return true;
      // Check for matching User ID
      if (pUserId && possibleIds.has(pUserId)) return true;
      // Check for matching Email
      if (pUserEmail && possibleEmails.has(pUserEmail)) return true;
      // Check for matching Username
      if (pUserName && possibleEmails.has(pUserName)) return true;

      return false;
    });
  }
  res.json(payments);
});

// Get consolidated payment statuses of all resident houses
app.get("/api/payments/status", (req, res) => {
  const residentUsers = db.users.filter((u) => u.role === "resident" && u.isActive !== false);
  const uniqueHouses = Array.from(new Set(residentUsers.map((u) => u.house).filter(Boolean)));
  const statusList = uniqueHouses.map((houseName) => {
    return getHousePaymentStatus(houseName);
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

  if (proofFileUrl && proofFileUrl.length > 800000) {
    return res.status(400).json({ error: "El archivo de comprobante adjunto es demasiado grande (máximo ~600KB comprimido). Por favor tome una captura de pantalla o reduzca el tamaño del archivo antes de subirlo." });
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

  // Broadcast to all connected administrators and residents for real-time reactive UI
  broadcastPaymentUpdate({ type: "payment_created", paymentId: newPayment.id, house: newPayment.house });

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

  // Broadcast to all connected administrators and residents for real-time reactive UI
  broadcastPaymentUpdate({ type: "payment_verified", paymentId: payment.id, house: payment.house, status: action });

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


// Reset database to complete zero (only sys admin u_admin)
app.post("/api/admin/reset", async (req, res) => {
  try {
    console.log("🧹 [SISTEMA] Iniciando restablecimiento total a cero solicitado...");
    
    // 1. Delete all existing elements from Firestore to avoid orphaned documents
    // Users
    try {
      const fireUsers = await loadFromFirestore("users") || [];
      for (const u of fireUsers) {
        await deleteFromFirestore("users", u.id);
      }
    } catch (e) { console.error("Error clearing users:", e); }

    // Reservations
    try {
      const fireRes = await loadFromFirestore("reservations") || [];
      for (const r of fireRes) {
        await deleteFromFirestore("reservations", r.id);
      }
    } catch (e) { console.error("Error clearing reservations:", e); }

    // Emails
    try {
      const fireEmails = await loadFromFirestore("emails") || [];
      for (const em of fireEmails) {
        await deleteFromFirestore("emails", em.id);
      }
    } catch (e) { console.error("Error clearing emails:", e); }

    // Visitor Passes
    try {
      const firePasses = await loadFromFirestore("visitorPasses") || [];
      for (const p of firePasses) {
        await deleteFromFirestore("visitorPasses", p.id);
      }
    } catch (e) { console.error("Error clearing visitorPasses:", e); }

    // Payments
    try {
      const firePayments = await loadFromFirestore("payments") || [];
      for (const py of firePayments) {
        await deleteFromFirestore("payments", py.id);
      }
    } catch (e) { console.error("Error clearing payments:", e); }

    // Properties
    try {
      const fireProps = await loadFromFirestore("properties") || [];
      for (const pr of fireProps) {
        await deleteFromFirestore("properties", pr.id);
      }
    } catch (e) { console.error("Error clearing properties:", e); }

    // 2. Set database to pure clean state
    db = {
      users: [
        { 
          id: "u_admin", 
          username: "diego7ceron@gmail.com", 
          password: "Kuaukali007*", 
          role: "admin", 
          house: "Administración", 
          email: "diego7ceron@gmail.com", 
          isActive: true 
        }
      ],
      reservations: [],
      emails: [],
      visitorPasses: [],
      payments: [],
      properties: [], // empty properties!
      config: {
        moraThresholdMonths: 3,
        moraStartMonth: "Enero 2026",
        monthlyFee: 100,
        feeHistory: [],
        reservationNorms: [
          "Duración máxima permitida: 5 horas por reserva.",
          "Separación mínima entre eventos: 1 hora limpia de por medio.",
          "Se requiere comprobante de transferencia bancaria visible para estudio administrativo."
        ]
      }
    };

    // Save locally
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");

    // Save only sys admin to Firestore
    await saveToFirestore("users", "u_admin", db.users[0]);

    console.log("✅ Restablecimiento total completado exitosamente.");
    res.json({ success: true, message: "Sistema restablecido a cero correctamente. Solo el usuario administrador ha sido conservado." });
  } catch (err: any) {
    console.error("Error en restablecimiento de base de datos:", err);
    res.status(500).json({ error: "Fallo al restablecer la base de datos a cero: " + err.message });
  }
});

// Download Complete Backup
app.get("/api/admin/backup", (req, res) => {
  try {
    const database = loadDB();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=respaldo_residencial_kuaukali.json");
    res.json(database);
  } catch (err: any) {
    console.error("Error al descargar respaldo:", err);
    res.status(500).json({ error: "Fallo al generar el archivo de respaldo: " + err.message });
  }
});

// Restore Database from Backup JSON
app.post("/api/admin/restore", async (req, res) => {
  try {
    const backupData = req.body;
    
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ error: "Datos de respaldo no válidos" });
    }
    
    // Simple schema validation
    if (!backupData.users || !Array.isArray(backupData.users)) {
      return res.status(400).json({ error: "El respaldo debe contener la lista de usuarios ('users')" });
    }
    
    console.log("📥 [SISTEMA] Iniciando restauración de base de datos desde respaldo...");
    
    // Clear old collections from Firestore
    const collectionsToClear = ["users", "reservations", "emails", "visitorPasses", "payments", "properties"];
    for (const coll of collectionsToClear) {
      try {
        const items = await loadFromFirestore(coll) || [];
        for (const item of items) {
          if (item && item.id) {
            await deleteFromFirestore(coll, item.id);
          }
        }
      } catch (e) {
        console.warn(`Error clearing collection ${coll} during restore:`, e);
      }
    }
    
    // Assign to in-memory db
    db = {
      users: backupData.users || [],
      reservations: backupData.reservations || [],
      emails: backupData.emails || [],
      visitorPasses: backupData.visitorPasses || [],
      payments: backupData.payments || [],
      properties: backupData.properties || [],
      config: backupData.config || {}
    };
    
    // Save locally
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    
    // Sync all backup items to Firestore
    const promises: Promise<any>[] = [];
    const saveCollection = async (collectionName: string, items: any[]) => {
      for (const item of items) {
        if (item && item.id) {
          promises.push(saveToFirestore(collectionName, item.id, item));
        }
      }
    };
    
    await saveCollection("users", db.users);
    await saveCollection("reservations", db.reservations);
    await saveCollection("emails", db.emails);
    await saveCollection("visitorPasses", db.visitorPasses || []);
    await saveCollection("payments", db.payments || []);
    await saveCollection("properties", db.properties || []);
    
    if (db.config) {
      promises.push(saveToFirestore("config", "app_config", db.config));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    // Clear sync cache to avoid stale hits
    for (const key of Object.keys(syncCache)) {
      delete syncCache[key];
    }
    
    console.log("✅ Restauración de respaldo completada exitosamente.");
    res.json({ success: true, message: "Base de datos restaurada correctamente desde el respaldo." });
  } catch (err: any) {
    console.error("Error al restaurar respaldo:", err);
    res.status(500).json({ error: "Fallo al restaurar el respaldo de la base de datos: " + err.message });
  }
});


// Configurations API
app.get("/api/config", (req, res) => {
  const config = db.config || {
    moraThresholdMonths: 3,
    moraStartMonth: "Enero 2026",
    monthlyFee: 100,
    feeHistory: [],
    maxReservationHours: 5,
    reservationNorms: [
      "Duración máxima permitida: 5 horas por reserva.",
      "Separación mínima entre eventos: 1 hora limpia de por medio.",
      "Se requiere comprobante de transferencia bancaria visible para estudio administrativo."
    ]
  };
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const { moraThresholdMonths, moraStartMonth, reservationNorms, monthlyFee, enabledFeatures, maxReservationHours } = req.body;
  
  if (!db.config) {
    db.config = {
      moraThresholdMonths: 3,
      moraStartMonth: "Enero 2026",
      monthlyFee: 100,
      feeHistory: [],
      maxReservationHours: 5,
      reservationNorms: [
        "Duración máxima permitida: 5 horas por reserva.",
        "Separación mínima entre eventos: 1 hora limpia de por medio.",
        "Se requiere comprobante de transferencia bancaria visible para estudio administrativo."
      ]
    };
  }
  
  if (enabledFeatures !== undefined) {
    db.config.enabledFeatures = enabledFeatures;
  }
  
  if (maxReservationHours !== undefined) {
    db.config.maxReservationHours = Number(maxReservationHours);
  }
  
  if (moraThresholdMonths !== undefined) {
    db.config.moraThresholdMonths = Number(moraThresholdMonths);
  }
  if (moraStartMonth !== undefined) {
    db.config.moraStartMonth = moraStartMonth;
  }
  if (reservationNorms !== undefined && Array.isArray(reservationNorms)) {
    db.config.reservationNorms = reservationNorms;
  }
  if (monthlyFee !== undefined) {
    const newFee = Number(monthlyFee);
    const oldFee = db.config.monthlyFee !== undefined ? Number(db.config.monthlyFee) : 100;
    
    if (newFee !== oldFee) {
      db.config.monthlyFee = newFee;
      if (!db.config.feeHistory) {
        db.config.feeHistory = [];
      }
      
      // Calculate next month dynamically based on current date
      const now = new Date();
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const nextMonthIdx = (now.getMonth() + 1) % 12;
      const nextMonthYear = now.getFullYear() + (now.getMonth() + 1 >= 12 ? 1 : 0);
      const nextMonthStr = `${monthNames[nextMonthIdx]} ${nextMonthYear}`;
      
      db.config.feeHistory.push({
        fee: newFee,
        effectiveFromMonth: nextMonthStr,
        updatedAt: now.toISOString()
      });
    }
  }
  
  saveDB(db);
  res.json({ success: true, config: db.config });
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
