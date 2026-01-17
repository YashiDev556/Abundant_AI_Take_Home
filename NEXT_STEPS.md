# Next Steps Guide

## ✅ What's Done

1. ✅ Monorepo structure set up with Turbo
2. ✅ Frontend (Next.js) with Clerk authentication
3. ✅ Backend (Express server + sidecar)
4. ✅ Prisma database setup
5. ✅ Database tables created (`users` table exists)
6. ✅ Environment variables configured

## 🚀 Next Steps

### 1. Test the Full Application Flow

Your dev servers should already be running. Test the authentication flow:

1. **Visit** `http://localhost:3000`
2. **Click "Sign Up"** to create an account
3. **After signing in**, you should see the UserButton in the header
4. **Test the API** by making a request to `http://localhost:4000/api/auth/me` (you'll need to be authenticated)

### 2. Test Database Connection via API

Once you're signed in, the `/api/auth/me` endpoint will:
- Get your Clerk user ID
- Sync/create your user in the database
- Return your user data

**To test:**
```bash
# After signing in, get your session token from browser cookies
# Or test via the frontend by calling the API
```

### 3. Set Up Clerk + Supabase Integration (Optional)

If you want to use Supabase RLS policies:

1. **Activate Clerk Supabase integration:**
   - Go to [Clerk Dashboard > Supabase Integration](https://dashboard.clerk.com/setup/supabase)
   - Activate and copy your Clerk domain

2. **Add Clerk as provider in Supabase:**
   - Go to [Supabase Dashboard > Authentication > Third-Party](https://supabase.com/dashboard/project/_/auth/third-party)
   - Add Clerk provider with your Clerk domain

3. **Set up RLS policies** (optional):
   - Run the SQL from `packages/db/prisma/migrations/0001_setup_rls_policies.sql` in Supabase SQL Editor

### 4. Build Your Features

Now you can start building:

#### Add More Database Models

Edit `packages/db/prisma/schema.prisma` to add new models, then:
1. Create tables manually via Supabase SQL Editor (since direct connection isn't available)
2. Or use the SQL script pattern from `create_tables.sql`

#### Create API Routes

Add new routes in:
- `apps/server/src/routes/api/` - Main API routes
- `apps/sidecar/src/routes/` - File operations

#### Build Frontend Pages

Create new pages in:
- `apps/frontend/src/app/` - Next.js App Router pages

### 5. Development Workflow

**For database changes:**
1. Update `packages/db/prisma/schema.prisma`
2. Create SQL script manually (or use Supabase SQL Editor)
3. Run `npm run db:generate` to regenerate Prisma client
4. Update your code to use new models

**For running the app:**
```bash
npm run dev  # Starts all services
```

**For database queries:**
```bash
npm run db:studio  # Opens Prisma Studio (if direct connection works)
# Or use Supabase SQL Editor
```

## 📝 Important Notes

### Database Connection

- **Connection Pooler** (port 6543): Works for regular queries ✅
- **Direct Connection** (port 5432): Requires IPv4 add-on (not available) ❌

**Workaround:** Use the pooler for both `DATABASE_URL` and `DIRECT_URL` in `packages/db/.env`

### Environment Variables

Make sure these are set:
- Root `.env` - General config
- `apps/frontend/.env.local` - Clerk keys for frontend
- `apps/server/.env.local` - Clerk secret for server
- `apps/sidecar/.env.local` - Clerk secret for sidecar
- `packages/db/.env` - Database URLs

## 🎯 Quick Test Checklist

- [ ] Frontend loads at `http://localhost:3000`
- [ ] Can sign up/sign in with Clerk
- [ ] UserButton appears after sign in
- [ ] Server running at `http://localhost:4000`
- [ ] Sidecar running at `http://localhost:4001`
- [ ] Database connection works (test via `/api/auth/me`)

## 🐛 Troubleshooting

**If Prisma can't connect:**
- Check `packages/db/.env` has correct `DATABASE_URL` (no quotes)
- Verify connection string works with `psql`

**If Clerk auth fails:**
- Check `apps/frontend/.env.local` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Verify keys in Clerk Dashboard

**If API returns 401:**
- Make sure you're signed in
- Check Clerk middleware is working
- Verify `CLERK_SECRET_KEY` in server `.env.local`

## 📚 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turbo Documentation](https://turbo.build/repo/docs)
