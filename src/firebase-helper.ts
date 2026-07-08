import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

interface FirebaseConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

let firestoreDb: any = null;
let isInitialized = false;

export function initFirebase() {
  if (isInitialized) return firestoreDb;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("⚠️ No se encontró firebase-applet-config.json. Se omitirá la persistencia en Firebase.");
      return null;
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const appletConfig = JSON.parse(configContent);

    const projectId = appletConfig.projectId;
    const databaseId = appletConfig.firestoreDatabaseId;

    if (!projectId) {
      console.warn("⚠️ projectId no definido en la configuración de Firebase.");
      return null;
    }

  if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

    // Target the named database if defined, otherwise default
    firestoreDb = databaseId ? getFirestore(databaseId) : getFirestore();
    isInitialized = true;
    console.log("🔥 Firebase Admin conectado correctamente a Firestore. Database ID:", databaseId || "(default)");
    return firestoreDb;
  } catch (error) {
    console.error("❌ Error al inicializar Firebase Admin:", error);
    return null;
  }
}

/**
 * Guarda un documento en Firestore en segundo plano (no bloqueante)
 */
export async function saveToFirestore(collection: string, docId: string, data: any) {
  try {
    const db = initFirebase();
    if (!db) return;

    // Sanitizar datos para Firestore (remover valores undefined o funciones)
    const sanitizedData = JSON.parse(JSON.stringify(data));
    
    await db.collection(collection).doc(docId).set(sanitizedData, { merge: true });
    console.log(`✅ [Firestore Sync] Guardado exitoso en /${collection}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo guardar en /${collection}/${docId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Carga todos los documentos de una colección en Firestore
 */
export async function loadFromFirestore(collection: string): Promise<any[] | null> {
  try {
    const db = initFirebase();
    if (!db) return null;

    const snapshot = await db.collection(collection).get();
    if (snapshot.empty) {
      return [];
    }

    const items: any[] = [];
    snapshot.forEach((doc: any) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo cargar la colección /${collection}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Elimina un documento de Firestore en segundo plano
 */
export async function deleteFromFirestore(collection: string, docId: string) {
  try {
    const db = initFirebase();
    if (!db) return;

    await db.collection(collection).doc(docId).delete();
    console.log(`🗑️ [Firestore Sync] Eliminado exitoso de /${collection}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo eliminar de /${collection}/${docId}:`, err instanceof Error ? err.message : err);
  }
}
