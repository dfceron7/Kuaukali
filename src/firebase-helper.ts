import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

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

    const firebaseConfig = {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
    };

    if (!firebaseConfig.projectId) {
      console.warn("⚠️ projectId no definido en la configuración de Firebase.");
      return null;
    }

    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Target the named database if defined, otherwise default
    firestoreDb = appletConfig.firestoreDatabaseId 
      ? getFirestore(app, appletConfig.firestoreDatabaseId) 
      : getFirestore(app);
      
    isInitialized = true;
    console.log("🔥 Firebase Client conectado correctamente a Firestore. Database ID:", appletConfig.firestoreDatabaseId || "(default)");
    return firestoreDb;
  } catch (error) {
    console.error("❌ Error al inicializar Firebase Client:", error);
    return null;
  }
}

/**
 * Guarda un documento en Firestore en segundo plano (no bloqueante)
 */
export async function saveToFirestore(collectionName: string, docId: string, data: any) {
  try {
    const db = initFirebase();
    if (!db) return;

    // Sanitizar datos para Firestore (remover valores undefined o funciones)
    const sanitizedData = JSON.parse(JSON.stringify(data));
    
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, sanitizedData, { merge: true });
    console.log(`✅ [Firestore Sync] Guardado exitoso en /${collectionName}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo guardar en /${collectionName}/${docId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Carga todos los documentos de una colección en Firestore
 */
export async function loadFromFirestore(collectionName: string): Promise<any[] | null> {
  try {
    const db = initFirebase();
    if (!db) return null;

    const querySnapshot = await getDocs(collection(db, collectionName));
    if (querySnapshot.empty) {
      return [];
    }

    const items: any[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo cargar la colección /${collectionName}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Elimina un documento de Firestore en segundo plano
 */
export async function deleteFromFirestore(collectionName: string, docId: string) {
  try {
    const db = initFirebase();
    if (!db) return;

    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    console.log(`🗑️ [Firestore Sync] Eliminado exitoso de /${collectionName}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firestore Sync] No se pudo eliminar de /${collectionName}/${docId}:`, err instanceof Error ? err.message : err);
  }
}
