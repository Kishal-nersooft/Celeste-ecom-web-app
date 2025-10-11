import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBUrCGwe15aSuujsajtRE6YWPzr6M6xhEY",
  authDomain: "celeste-470811.firebaseapp.com",
  projectId: "celeste-470811",
  storageBucket: "celeste-470811.firebasestorage.app",
  messagingSenderId: "846811285865",
  appId: "1:846811285865:web:b9faec291b004de62e15f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics: any;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };
