<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GymFlow

Treino, historico e calendario de progresso.

View your app in AI Studio: https://ai.studio/apps/drive/1lGXCyU_1lg3EXK5BPcsDzwRY6rUj_Y2X

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase

The app can run locally in the browser, but real cross-device persistence uses Firebase Auth + Firestore.

Enable these in Firebase Console:

- Authentication: Email/Password provider
- Firestore Database

GitHub Pages deploy reads these repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Firestore rules are in `firestore.rules`.
