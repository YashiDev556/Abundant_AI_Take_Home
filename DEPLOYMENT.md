# Deployment Guide

Complete guide for deploying Harbor Task Review Tool to Vercel.

## 📋 Prerequisites

- Vercel account
- Supabase database (PostgreSQL)
- Clerk account for authentication
- GitHub repository connected to Vercel

## 🚀 Quick Deploy

### 1. Database Setup

#### Supabase Configuration

1. Create a new project in Supabase
2. Get your connection strings:
   - **Database URL** (pooled connection)
   - **Direct URL** (direct connection)

3. Run migrations:
```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
```

4. Enable Row Level Security (RLS):
   - Run the SQL scripts in `packages/db/prisma/migrations/`

### 2. Clerk Setup

1. Create a new application in Clerk
2. Enable email/password authentication
3. Configure user metadata to include `role` field
4. Get your API keys:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### 3. Vercel Deployment

#### Connect Repository

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the Next.js configuration

#### Configure Environment Variables

Add these environment variables in Vercel dashboard:

```env
# Database
DATABASE_URL="your-supabase-pooled-url"
DIRECT_URL="your-supabase-direct-url"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# API Configuration
NEXT_PUBLIC_SERVER_URL="https://your-app.vercel.app/api/server"
NEXT_PUBLIC_SIDECAR_URL="https://your-app.vercel.app/api/sidecar"

# Optional: For local development
SERVER_PORT=4000
SIDECAR_PORT=5000
FRONTEND_URL="https://your-app.vercel.app"
```

#### Build Settings

The `vercel.json` configuration handles routing automatically:
- Frontend: Next.js app (root path)
- Server API: `/api/server/*`
- Sidecar API: `/api/sidecar/*`

#### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployed URL

## 🔧 Configuration Details

### vercel.json Breakdown

```json
{
  "version": 2,
  "builds": [
    // Build configurations for each app
  ],
  "routes": [
    // Route API requests to correct handlers
  ],
  "functions": {
    // Memory and timeout settings
  }
}
```

### Monorepo Structure

The project is organized as a monorepo:

```
/
├── apps/
│   ├── frontend/    # Next.js app
│   ├── server/      # Express API
│   └── sidecar/     # Sidecar API
└── packages/
    ├── db/          # Prisma schema
    └── types/       # Shared types
```

Vercel builds each app independently but serves them as a unified application.

## 🔒 Security Checklist

- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Configure CORS properly
- [ ] Set up Clerk authentication webhooks
- [ ] Enable Supabase RLS policies
- [ ] Rotate API keys regularly
- [ ] Use environment-specific secrets
- [ ] Enable Vercel authentication for preview deployments

## 📊 Monitoring

### Vercel Analytics

Enable Vercel Analytics in the dashboard:
- Real-time traffic monitoring
- Core Web Vitals
- Error tracking

### Logging

Vercel automatically captures:
- Build logs
- Function logs
- Edge network logs

Access logs via:
```bash
vercel logs
```

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

## 🔄 CI/CD

### Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: For all pull requests

### Manual Deployments

Deploy from CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🧪 Testing Before Deploy

Run the build check script:
```bash
./scripts/build-check.sh
```

This validates:
- TypeScript compilation
- Linting
- Database migrations
- Build success

## 🐛 Troubleshooting

### Build Failures

**Problem**: Prisma generation fails
```
Solution: Ensure DATABASE_URL is set in Vercel environment variables
```

**Problem**: Type errors during build
```
Solution: Run `npx tsc --noEmit` locally to catch errors before pushing
```

### Runtime Issues

**Problem**: API routes return 404
```
Solution: Check vercel.json routes configuration
```

**Problem**: Database connection fails
```
Solution: 
1. Verify DATABASE_URL is correct
2. Check Supabase connection pooling
3. Ensure database is not paused
```

**Problem**: Clerk authentication not working
```
Solution:
1. Verify publishable key is set
2. Check Clerk domain configuration
3. Ensure webhook URLs are set
```

## 🔐 Environment Management

### Development

Use `.env.local` for local development:
```env
DATABASE_URL="your-local-db"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
# etc.
```

### Production

Set environment variables in Vercel dashboard:
1. Project Settings → Environment Variables
2. Add each variable
3. Select "Production" environment
4. Save and redeploy

### Preview

Vercel automatically creates preview environments:
- Unique URL for each PR
- Separate environment variables
- Isolated from production

## 📈 Performance Optimization

### Edge Functions

Consider moving hot paths to Edge:
```typescript
// vercel.json
{
  "functions": {
    "apps/server/src/routes/auth.ts": {
      "runtime": "edge"
    }
  }
}
```

### Caching

Enable ISR for static content:
```typescript
// Next.js page
export const revalidate = 3600 // 1 hour
```

### Database Optimization

- Use connection pooling (Supabase Pooler)
- Add database indexes (see schema.prisma)
- Enable query optimization

## 🌍 Custom Domains

1. Add domain in Vercel dashboard
2. Configure DNS records:
   - Type: `CNAME`
   - Name: `@` or `www`
   - Value: `cname.vercel-dns.com`
3. Wait for SSL certificate

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Clerk Production Setup](https://clerk.com/docs/deployments/overview)

## 🎯 Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate active
- [ ] Authentication working
- [ ] API routes responding
- [ ] Audit logs capturing events
- [ ] Diff view working
- [ ] Syntax highlighting enabled
- [ ] Error tracking configured
- [ ] Custom domain configured (optional)

## 💡 Tips

1. **Use Preview Deployments**: Test changes in production-like environment before merging
2. **Monitor Build Times**: Optimize dependencies if builds take too long
3. **Set Up Alerts**: Configure Vercel to notify you of deployment failures
4. **Review Logs Regularly**: Catch issues early
5. **Keep Secrets Secure**: Never commit `.env` files

## 🆘 Support

If you encounter issues:
1. Check Vercel build logs
2. Review function logs
3. Consult Vercel support
4. Check GitHub issues

---

**Ready to deploy?** Push your code to `main` and watch Vercel do the magic! ✨
