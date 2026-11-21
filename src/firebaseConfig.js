export const firebaseConfig = {
  apiKey: "AIzaSyCvGzq1R0LJT3Pll5pAUaPLk9Lqgx63GFI",
  authDomain: "card-with-friends.firebaseapp.com",
  projectId: "card-with-friends",
  storageBucket: "card-with-friends.firebasestorage.app",
  messagingSenderId: "245859006031",
  appId: "1:245859006031:web:8d1e0e01456242b01a1c3a"
};

export const isFirebaseConfigured = () =>
  Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("PASTE_YOUR_") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith("PASTE_YOUR_")
  );
