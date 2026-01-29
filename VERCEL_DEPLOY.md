# Quick Vercel Deployment Steps

## Your Generated NEXTAUTH_SECRET:
```
EjodFH2eTeSgKUXOeR+kBim8M+rY/YzyvcQiIwf7vUc=
```

## Step-by-Step Deployment Guide

### STEP 1: Push to GitHub

Open PowerShell in your project folder and run:

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Water monitoring dashboard"
```

Then:
1. Go to https://github.com/new
2. Create a new repository named "eau_sure_dash" (or your choice)
3. **Don't** check any boxes (no README, no .gitignore)
4. Click "Create repository"
5. Copy the commands shown and run them:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### STEP 2: Deploy on Vercel

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Click "Sign Up" (use GitHub account)

2. **Import Project**
   - Click "Add New" → "Project"
   - Find your repository and click "Import"

3. **Configure Environment Variables**
   Click "Environment Variables" and add these 3 variables:

   **Variable 1:**
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string
     ```
     mongodb+srv://username:password@cluster.mongodb.net/database
     ```

   **Variable 2:**
   - Name: `NEXTAUTH_SECRET`
   - Value: `EjodFH2eTeSgKUXOeR+kBim8M+rY/YzyvcQiIwf7vUc=`

   **Variable 3:**
   - Name: `NEXTAUTH_URL`
   - Value: Leave empty for now (Vercel will set it automatically)
   - Or use: `https://YOUR_PROJECT_NAME.vercel.app`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes

### STEP 3: Configure MongoDB

1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Click "Network Access" in left menu
3. Click "Add IP Address"
4. Choose "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"

### STEP 4: Update NEXTAUTH_URL (if needed)

After deployment, Vercel will show your URL (e.g., `https://eau-sure-dash.vercel.app`)

1. Go to your Vercel project
2. Click "Settings" → "Environment Variables"
3. Find `NEXTAUTH_URL`
4. Update it to your actual URL: `https://your-actual-url.vercel.app`
5. Click "Save"
6. Go to "Deployments" tab
7. Click "..." on latest deployment → "Redeploy"

### STEP 5: Test Your App

Visit your Vercel URL and test:
- ✓ Sign up
- ✓ Sign in
- ✓ Dashboard pages
- ✓ Profile/Settings
- ✓ Theme toggle
- ✓ Language switch

## Troubleshooting

**If signup/signin doesn't work:**
- Check MongoDB Network Access allows 0.0.0.0/0
- Verify all 3 environment variables are set in Vercel
- Check Vercel logs: Project → "Functions" tab

**If pages don't load:**
- Check Vercel build logs
- Ensure all environment variables are set correctly

**Database errors:**
- Verify MongoDB connection string format
- Check database user permissions (read/write)

## Need Help?

- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting
- Vercel support: https://vercel.com/support
