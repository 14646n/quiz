import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB7uvpBwBsS_BEaCwC9XOhFYrGI-tXUE8c",
  authDomain: "education-service-f2f0e.firebaseapp.com",
  projectId: "education-service-f2f0e",
  storageBucket: "education-service-f2f0e.firebasestorage.app",
  messagingSenderId: "900654669940",
  appId: "1:900654669940:web:bed0f3fafcf0e85a70f121",
  measurementId: "G-F1ED2MJW7J",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)