// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5lES72nwynLNFdaYog6lxVxrw_Lm72pI",
  authDomain: "mind-bloom-vdm4y.firebaseapp.com",
  projectId: "mind-bloom-vdm4y",
  storageBucket: "mind-bloom-vdm4y.firebasestorage.app",
  messagingSenderId: "387530632714",
  appId: "1:387530632714:web:f2f49dc8454a9a3fa8b9f3"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
