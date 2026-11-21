// =========================================================================
// OPTIONAL FOR SOLO BOTS, REQUIRED FOR 4-PLAYER ONLINE MULTIPLAYER
// =========================================================================
// 1. Go to https://console.firebase.google.com/ (works on phone Chrome too!)
// 2. Create a free project ("8 Card with Friends")
// 3. Authentication -> Sign-in method -> Enable "Anonymous"
// 4. Firestore Database -> Create Database -> Start in test mode
// 5. Project Settings -> Your Apps -> Web (</>) -> Copy firebaseConfig below
// =========================================================================

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

export const isFirebaseConfigured = () =>
  Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("PASTE_YOUR_") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith("PASTE_YOUR_")
  );
