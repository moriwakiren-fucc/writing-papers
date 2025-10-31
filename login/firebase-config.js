// Firebase v10+ SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// login/firebase-config.js
export const firebaseConfig = {
  apiKey: "AIzaSyB64DJKPuX8MOhqV4fEBl6jwl1B5PjleRQ",
  authDomain: "writing-papers.firebaseapp.com",
  databaseURL: "https://writing-papers-default-rtdb.firebaseio.com",
  projectId: "writing-papers",
  storageBucket: "writing-papers.firebasestorage.app",
  messagingSenderId: "14120068197",
  appId: "1:14120068197:web:699751e2e6cd58f7f6128c",
  measurementId: "G-B43V1G22CV"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
