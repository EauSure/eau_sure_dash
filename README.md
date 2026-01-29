<div align="center">

# 💧 EauSûre Dashboard

### IoT Water Quality Monitoring Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deployment)

</div>

---

## 📋 Overview

**EauSûre** is a modern, full-stack IoT water monitoring dashboard built with Next.js 16 and the App Router. It provides real-time water quality analysis, device management, and intelligent alerting for water infrastructure monitoring.

### ✨ Key Highlights

- 🌊 **Real-time Monitoring** - Track water quality metrics across multiple wells and reservoirs
- 🔐 **Secure Authentication** - NextAuth.js with MongoDB adapter for robust user management
- 🌍 **Multi-language Support** - English, French, and Arabic (RTL) with next-intl
- 🎨 **Modern UI/UX** - shadcn/ui components with Tailwind CSS v4
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile
- 🌓 **Dark Mode** - Automatic theme switching with next-themes
- ⚡ **Animated Background** - Beautiful tsParticles water bubble effects
- 📊 **Data Visualization** - Interactive charts and KPI cards
- 🔔 **Smart Alerts** - Real-time notifications for water quality issues

---

## 🎯 Features

### 🏠 Dashboard
- **Overview KPIs** - Water status, active alerts, gateway connectivity
- **Animated Cards** - Smooth framer-motion animations
- **Quick Stats** - At-a-glance water quality metrics

### 💧 Wells & Reservoirs
- Comprehensive water source management
- Real-time quality metrics
- Historical data trends

### 🚨 Alerts & Notifications
- Critical water quality warnings
- Customizable alert thresholds
- Email notification support

### 🔧 Device Management
- IoT device inventory
- Gateway connectivity status
- Device configuration

### 👤 User Profile
- Avatar customization
- Personal information management
- Organization and role settings

### ⚙️ Settings
- **Preferences** - Timezone, units (metric/imperial)
- **Notifications** - Email alerts, daily summaries
- **Language** - English, French, Arabic
- **Theme** - Light/Dark mode toggle

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16.1.6 (App Router + Turbopack)
- **Language:** TypeScript 5
- **UI Library:** React 19.2
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI
- **Animations:** Framer Motion + tsParticles
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### Backend
- **Authentication:** NextAuth.js v4
- **Database:** MongoDB Atlas
- **ODM:** MongoDB Node.js Driver
- **Password Hashing:** bcryptjs

### Internationalization
- **i18n:** next-intl
- **Languages:** English, French, Arabic (RTL support)

### DevOps
- **Hosting:** Vercel
- **Version Control:** Git
- **Package Manager:** npm

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- MongoDB Atlas account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/EauSure/eau_pure_dash.git
cd eau_pure_dash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**Generate NEXTAUTH_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## 📦 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/EauSure/eau_pure_dash)

#### Manual Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   Add these in Vercel dashboard:
   - `MONGODB_URI` - Your MongoDB connection string
   - `NEXTAUTH_SECRET` - Generated secret key
   - `NEXTAUTH_URL` - Auto-set by Vercel (optional)

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build

📖 **Detailed Guide:** See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

---

## 📁 Project Structure

```
eau-pure-dashboard/
├── app/                      # Next.js App Router
│   ├── [locale]/            # Internationalized routes
│   │   ├── auth/           # Authentication pages
│   │   └── dashboard/      # Dashboard pages
│   ├── api/                # API routes
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   └── ...                # Custom components
├── lib/                   # Utility functions
├── messages/              # i18n translations
├── types/                 # TypeScript definitions
└── public/               # Static assets
```

---

## 🎨 Screenshots

### Dashboard Overview
> Modern, clean interface with real-time water quality metrics

### Dark Mode
> Beautiful dark theme with animated particle background

### Multi-language Support
> Seamless language switching (EN/FR/AR)

---

## 🔧 Configuration

### Customization

**Theme Colors:** Edit `app/globals.css`
```css
:root {
  --primary: oklch(0.45 0.18 250);
  --background: oklch(0.985 0.003 240);
  /* ... */
}
```

**Animations:** Modify `components/ui/particles-background.tsx`
```typescript
const DEBUG = false; // Set to true for testing
```

**Sidebar:** Collapsible sidebar state persists in localStorage

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

## � Authors

### 👤 **Adam Farjeoui**

- 🌐 Website: [farjeoui-portfolio.vercel.app](https://farjeoui-portfolio.vercel.app)
- 💻 Github: [@adam-dev-hub](https://github.com/adam-dev-hub)
- 💼 LinkedIn: [@Adam Al Farjeoui](https://www.linkedin.com/in/adam-al-farjeoui)

### 👤 **Med Rayen Trabelsi**

- 🌐 Website: [trabelsimedrayen.tech](https://www.trabelsimedrayen.tech/)
- 💻 Github: [@Mohamed Rayen Trabelsi](https://github.com/Mohamed-Rayen-Trabelsi)
- 💼 LinkedIn: [@Mohamed Rayen Trabelsi](https://www.linkedin.com/in/mohamed-rayen-trabelsi)

---

## 📧 Contact

**Project Link:** [https://github.com/EauSure/eau_pure_dash](https://github.com/EauSure/eau_pure_dash)

---

<div align="center">

### 🌟 Star this repo if you find it helpful!

Made with ❤️ and Next.js

</div>
