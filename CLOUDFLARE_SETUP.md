# Cloudflare Pages Build Configuration

## Build Settings
- **Framework preset:** None (or Vite)
- **Build command:** `cd web && npm install && npm run build`
- **Build output directory:** `web/dist`
- **Root directory:** `/` (leave blank)

## Environment Variables
Add these in Cloudflare Pages → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://kpxiwgtqvdytqbeheflk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (your Supabase anon public key) |

## Steps to Deploy

1. Go to https://dash.cloudflare.com → Workers & Pages → Create
2. Connect your GitHub account if not already connected
3. Select the repository: `moahboostsupport-ship-it/data-solution`
4. Set the build settings above
5. Add the environment variables
6. Deploy

## Custom Domain (Optional)
After deployment, go to Pages → Custom Domains to add your domain (e.g., `datasolution.co.ke`).

## Notes
- The Supabase anon key is safe to expose publicly — it's restricted by RLS policies
- The ADMIN_JWT_SECRET and other backend secrets are already configured in Supabase project secrets
- Edge functions are already deployed and running
