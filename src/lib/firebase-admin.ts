// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// This is a server-only file.
// Do not import this on the client.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You might need to add your database URL here
    databaseURL: `https://mind-bloom-vdm4y.firebaseio.com`
  });
}

const auth = admin.auth();
const db = admin.firestore();

export { auth, db };
