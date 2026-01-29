# Vercel Deployment Guide

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - Water monitoring dashboard"
```

### 1.2 Create GitHub Repository
1. Go to [github.com](https://github.com/new)
2. Create a new repository (e.g., "eau-pure-dashboard")
3. **Do NOT** initialize with README, .gitignore, or license
4. Copy the repository URL

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/eau-pure-dashboard.git
git branch -M main
git push -u origin main
```

## Step 2: Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

Copy the output - you'll need it for Vercel.

## Step 3: Deploy to Vercel

### 3.1 Sign Up/Login to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up or login (use GitHub account for easier setup)

### 3.2 Import Project
1. Click "Add New" → "Project"
2. Click "Import" next to your GitHub repository
3. Vercel will auto-detect Next.js settings ✓

### 3.3 Configure Environment Variables

Before deploying, add these environment variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Will be auto-set by Vercel |
| `NEXTAUTH_SECRET` | Output from openssl command | The secret you generated |

**Important:** For NEXTAUTH_URL, use `https://your-project-name.vercel.app` (Vercel will show you this URL).

### 3.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your app will be live at `https://your-project-name.vercel.app`

## Step 4: MongoDB Configuration

### 4.1 Whitelist Vercel IPs
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

**Note:** For production, you should whitelist only Vercel's IP ranges. See: https://vercel.com/docs/concepts/deployments/ip-addresses

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Try signing up for a new account
3. Test signin/signout
4. Navigate through all pages
5. Test theme toggle and language switch

## Troubleshooting

### Build Errors
- Check Vercel build logs
- Ensure all environment variables are set
- Verify MongoDB connection string is correct

### Database Connection Issues
- Verify MongoDB Network Access allows 0.0.0.0/0
- Check MONGODB_URI format
- Ensure database user has read/write permissions

### Authentication Issues
- Verify NEXTAUTH_URL matches your Vercel domain
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again

## Post-Deployment

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update NEXTAUTH_URL to your custom domain
4. Redeploy

### Monitoring
- Vercel Analytics: Automatically enabled
- Check Vercel Dashboard for performance metrics
- Monitor MongoDB Atlas for database usage

## Environment Variables Summary

Copy these to Vercel's Environment Variables section:

```
MONGODB_URI=mongodb+srv://your-connection-string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generated-secret-from-openssl
```

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
