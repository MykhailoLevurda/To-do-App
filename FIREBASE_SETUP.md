# Firebase Setup Guide

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable these providers:
   - **Email/Password** (required)
   - **Google** (optional but recommended)
   - **Anonymous** (optional for guest access)

## 3. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select your region
5. Click "Enable"

### Firestore Security Rules (for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tasks collection
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && (resource.data.createdBy == request.auth.uid 
            || request.auth.token.admin == true);
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Boards collection
    match /boards/{boardId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && resource.data.members[request.auth.uid] != null;
    }
  }
}
```

## 4. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click **Web** icon (</>)
4. Register your app (name: "Scrum Board")
5. Copy the configuration values

## 5. Configure Environment Variables

Create a `.env` file in the `scrum-board` directory:

```bash
# API Configuration
NUXT_PUBLIC_API_BASE=/api

# WebSocket Configuration (optional)
NUXT_PUBLIC_WS_ENABLED=false
# NUXT_PUBLIC_WS_URL=ws://localhost:3002

# App Configuration
NUXT_PUBLIC_APP_NAME=Scrum Board

# Firebase Configuration
# Replace with your actual values from Firebase Console
NUXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NUXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## 6. Install Dependencies

```bash
npm install
```

## 7. Run the Application

```bash
npm run dev
```

## 8. Test Firebase Connection

1. Open the app in your browser
2. Try to sign up / sign in
3. Create a task - it should sync to Firestore
4. Check Firebase Console > Firestore Database to see your data

## Firestore Collections Structure

### `tasks` Collection
```json
{
  "id": "task-uuid",
  "title": "Task title",
  "description": "Task description",
  "status": "todo" | "in-progress" | "done",
  "priority": "low" | "medium" | "high",
  "assignee": "user@example.com",
  "storyPoints": 5,
  "createdBy": "user-uid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `users` Collection
```json
{
  "uid": "user-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "color": "#3b82f6",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastSeen": "2024-01-01T00:00:00.000Z"
}
```

### `boards` Collection (Future feature)
```json
{
  "id": "board-uuid",
  "name": "Sprint 1",
  "description": "Sprint 1 board",
  "members": {
    "user-uid-1": "admin",
    "user-uid-2": "member"
  },
  "createdBy": "user-uid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure all Firebase environment variables are set correctly
- Restart the dev server after adding .env file

### "Missing or insufficient permissions"
- Update Firestore Security Rules
- Make sure user is authenticated

### "Firebase App not initialized"
- Check that nuxt-vuefire module is added to nuxt.config.ts
- Verify Firebase config in nuxt.config.ts

## Next Steps

- [ ] Set up Firebase Authentication UI
- [ ] Migrate tasks to Firestore
- [ ] Add real-time listeners
- [ ] Implement user profiles
- [ ] Add board/team management
