// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "mind-bloom-vdm4y",
  "appId": "1:387530632714:web:f2f49dc8454a9a3fa8b9f3",
  "storageBucket": "mind-bloom-vdm4y.firebasestorage.app",
  "apiKey": "AIzaSyD5lES72nwynLNFdaYog6lxVxrw_Lm72pI",
  "authDomain": "mind-bloom-vdm4y.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "387530632714"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
