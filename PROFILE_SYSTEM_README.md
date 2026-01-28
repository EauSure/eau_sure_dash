# User Profile & Settings System

## Overview

Complete user profile and settings management system integrated with NextAuth and MongoDB.

## Features Implemented

### 1. **User Dropdown Menu** (`components/user-dropdown.tsx`)
- Avatar button in top-right corner of dashboard
- Displays user name, email, and avatar
- Menu items:
  - Profile → `/dashboard/profile`
  - Settings → `/dashboard/settings`
  - Sign out

### 2. **Profile Page** (`/dashboard/profile`)
Features:
- Avatar URL input with live preview
- Name (required)
- Bio (optional, max 500 characters)
- Organization (optional)
- Role/Title (optional)
- Phone number (optional)
- Real-time form validation with Zod
- Save/Discard buttons (disabled when no changes)
- Toast notifications for success/error

### 3. **Settings Page** (`/dashboard/settings`)
Features:
- **Regional Settings:**
  - Timezone selection (defaults to Africa/Tunis)
  - Language preference (English, Français, العربية)
  - Unit preferences:
    - Temperature: Celsius/Fahrenheit
    - Distance: Metric/Imperial

- **Notification Preferences:**
  - Email alerts toggle
  - Critical only mode
  - Daily summary emails
  - Maintenance reminders

### 4. **Backend API**

#### `GET /api/user/me`
Returns current user's profile. Creates default profile if none exists.

**Response:**
```json
{
  "userId": "user@example.com",
  "name": "John Doe",
  "email": "user@example.com",
  "image": "https://example.com/avatar.jpg",
  "bio": "Water quality specialist",
  "organization": "SONEDE",
  "role": "Engineer",
  "phone": "+216 XX XXX XXX",
  "timezone": "Africa/Tunis",
  "preferences": {
    "notifications": {
      "emailAlerts": true,
      "criticalOnly": false,
      "dailySummary": true,
      "maintenanceReminders": true
    },
    "units": {
      "temperature": "celsius",
      "distance": "metric"
    },
    "language": "en"
  },
  "createdAt": "2026-01-28T...",
  "updatedAt": "2026-01-28T..."
}
```

#### `PATCH /api/user/me`
Updates user profile with validation.

**Request Body Example:**
```json
{
  "name": "Updated Name",
  "bio": "New bio",
  "timezone": "Europe/Paris",
  "preferences": {
    "notifications": {
      "emailAlerts": false
    }
  }
}
```

**Validation:**
- Name: 1-100 characters (required if provided)
- Image: Valid URL or empty string
- Bio: Max 500 characters
- Phone: Max 20 characters
- All other fields: Validated by Zod schema

### 5. **MongoDB Data Model**

**Collection:** `userProfiles`

**Schema:**
```typescript
{
  userId: string;           // User's email (from NextAuth)
  name: string;
  email: string;
  image?: string;
  bio?: string;
  organization?: string;
  role?: string;
  phone?: string;
  timezone: string;         // Default: "Africa/Tunis"
  preferences: {
    notifications: {
      emailAlerts: boolean;
      criticalOnly: boolean;
      dailySummary: boolean;
      maintenanceReminders: boolean;
    };
    units: {
      temperature: 'celsius' | 'fahrenheit';
      distance: 'metric' | 'imperial';
    };
    language: string;       // Default: "en"
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Technology Stack

- **Form Management:** React Hook Form
- **Validation:** Zod
- **UI Components:** shadcn/ui
- **Notifications:** Sonner (toast)
- **Styling:** Tailwind CSS (token-based only)
- **Database:** MongoDB
- **Authentication:** NextAuth

## Files Created

```
types/
  user-profile.ts                    # TypeScript types

lib/
  user-profile.ts                    # MongoDB CRUD operations

app/api/user/me/
  route.ts                           # GET and PATCH handlers

app/dashboard/
  profile/
    page.tsx                         # Profile page
  settings/
    page.tsx                         # Settings page

components/
  user-dropdown.tsx                  # Avatar dropdown menu
  
components/ui/                       # shadcn components (installed)
  form.tsx
  textarea.tsx
  select.tsx
  switch.tsx
  sonner.tsx
```

## Usage

### Accessing Profile/Settings
1. User must be signed in
2. Click avatar in top-right corner of dashboard
3. Select "Profile" or "Settings" from dropdown

### Editing Profile
1. Navigate to `/dashboard/profile`
2. Update any fields
3. Click "Save Changes" (enabled when dirty)
4. Or click "Discard" to revert changes
5. Toast notification confirms save/discard

### Editing Settings
1. Navigate to `/dashboard/settings`
2. Toggle switches or change selects
3. Save/Discard workflow same as Profile

## Form Features

### Validation
- Client-side validation with Zod
- Real-time error messages
- Server-side validation in API route

### State Management
- Form tracks dirty state
- Save button disabled when clean
- Discard resets to last saved state
- Success resets dirty state

### User Experience
- Loading states with spinners
- Toast notifications (success/error/info)
- Avatar preview updates in real-time
- Fallback to user initials if no avatar

## Database Operations

### Auto-Creation
When a user first accesses `/api/user/me`, a default profile is created with:
- Name from NextAuth session or email prefix
- Email from session
- Image from session (if available)
- Default timezone: Africa/Tunis
- All notifications enabled
- Metric units
- English language

### Updates
- Uses `findOneAndUpdate` with `returnDocument: 'after'`
- Only updates provided fields
- Preferences are merged (not replaced)
- `updatedAt` timestamp updated on each save

## Integration Points

### Dashboard Layout
- `components/dashboard-layout.tsx` includes `UserDropdown`
- Positioned in top-right header area
- Next to theme toggle

### Root Layout
- `app/layout.tsx` includes `<Toaster />` for toast notifications
- Works across all pages

### Authentication
- Uses `getServerSession(authOptions)` on server
- Uses `useSession()` hook on client
- Redirects to `/auth/signin` if unauthenticated

## Future Enhancements

Potential additions:
- [ ] Image upload (UploadThing/Cloudinary integration)
- [ ] Password change functionality
- [ ] Two-factor authentication
- [ ] Account deletion
- [ ] Export user data
- [ ] Activity log
- [ ] Email verification
- [ ] Profile visibility settings

## Notes

- All components use token-based Tailwind classes only
- No hardcoded colors
- Fully typed with TypeScript
- Following Next.js App Router conventions
- Server components where possible, client components when needed
