# Pushing to GitHub

## Step-by-Step Guide

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `abundant-take-home-alt` (or your preferred name)
   - **Description**: "Monorepo boilerplate based on Shadow architecture with Clerk and Supabase"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### 2. Push Your Code

Run these commands in your terminal (from the project root):

```bash
# Make sure you're in the project directory
cd /home/yash/Code/Abundant_Take_Home_Alt

# Add all files (except those in .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Monorepo setup with Clerk, Prisma, and Supabase"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/abundant-take-home-alt.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Verify

1. Go to your GitHub repository page
2. You should see all your files
3. Verify that `.env` files are **NOT** visible (they should be ignored)

## Important: Environment Variables

**Never commit `.env` files!** They contain secrets. Your `.gitignore` is already configured to exclude:
- `.env`
- `.env.local`
- `packages/db/.env`
- `apps/*/.env.local`

## Setting Up Environment Variables in Production

When deploying or sharing with team members, you'll need to:

1. **Create `.env.example` files** (template files without secrets)
2. **Document required variables** in README
3. **Set environment variables** in:
   - GitHub Secrets (for CI/CD)
   - Vercel/Railway/etc. (for deployment)
   - Each team member's local `.env` files

## Quick Commands Reference

```bash
# Check what will be committed
git status

# See what's ignored
git status --ignored

# Add files
git add .

# Commit
git commit -m "Your commit message"

# Push
git push

# Pull latest changes
git pull
```

## Next Steps After Pushing

1. **Add a LICENSE file** (if you want)
2. **Set up GitHub Actions** for CI/CD (optional)
3. **Add collaborators** (if working with a team)
4. **Create issues** for tracking features/bugs
5. **Set up branch protection** (for production repos)
