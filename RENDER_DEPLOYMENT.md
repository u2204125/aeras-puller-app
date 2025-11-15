# Deploy AERAS Puller App to Render

This guide walks you through deploying the AERAS Puller PWA to **Render** as a static site.

## Overview

The Puller App is a Progressive Web App (PWA) that will be deployed as a **Static Site** on Render. Since it's a frontend app built with Vite, we'll serve the built `dist/` folder.

## Prerequisites

- ✅ GitHub account
- ✅ Render account ([render.com](https://render.com))
- ✅ Puller App code pushed to GitHub
- ✅ Backend API deployed and accessible

## Deployment Steps

### 1. Push Code to GitHub

If you haven't already:

```bash
cd puller-app
git init
git add .
git commit -m "Initial commit: AERAS Puller App"
git remote add origin https://github.com/u2204125/aeras-puller-app.git
git push -u origin master
```

### 2. Create Static Site on Render

1. **Log in to Render**: Go to [render.com](https://render.com) and sign in

2. **Create New Static Site**:
   - Click **"New +"** button
   - Select **"Static Site"**

3. **Connect Repository**:
   - Choose **"Connect a repository"**
   - Select your GitHub repository: `u2204125/aeras-puller-app`
   - Click **"Connect"**

### 3. Configure Build Settings

In the Render configuration form:

| Setting | Value |
|---------|-------|
| **Name** | `aeras-puller-app` (or your preferred name) |
| **Branch** | `master` (or `main`) |
| **Root Directory** | `.` (leave blank or `.`) |
| **Build Command** | `pnpm install && pnpm build` |
| **Publish Directory** | `dist` |

**Advanced Settings**:
- **Auto-Deploy**: ✅ Enabled (deploys automatically on git push)

### 4. Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

**Example**:
```
VITE_API_BASE_URL=https://aeras-backend.onrender.com
VITE_SOCKET_URL=https://aeras-backend.onrender.com
```

> ⚠️ **Important**: Replace with your actual backend URL from backend deployment.

### 5. Configure SPA Routing

Since this is a PWA/SPA, you need to handle client-side routing:

**Option A: Using `render.yaml` (Recommended)**

Create `render.yaml` in your project root (already included):

```yaml
services:
  - type: web
    name: aeras-puller-app
    env: static
    buildCommand: pnpm install && pnpm build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

**Option B: Manual Configuration in Render Dashboard**

After deployment:
1. Go to your service in Render Dashboard
2. Click **"Redirects/Rewrites"**
3. Add a rewrite rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Type**: Rewrite

### 6. Deploy

1. Click **"Create Static Site"**
2. Render will automatically:
   - Install dependencies with `pnpm`
   - Build the app with `pnpm build`
   - Deploy the `dist/` directory
3. Wait for deployment to complete (~3-5 minutes)

### 7. Verify Deployment

Once deployed, you'll get a URL like: `https://aeras-puller-app.onrender.com`

**Test these features**:
- [ ] App loads successfully
- [ ] Login with phone number works
- [ ] WebSocket connects to backend
- [ ] GPS/location tracking works
- [ ] PWA install prompt appears
- [ ] Service worker registers
- [ ] Offline mode works

## Custom Domain (Optional)

To use a custom domain:

1. In Render Dashboard, go to your static site
2. Click **"Settings"** → **"Custom Domains"**
3. Add your domain (e.g., `puller.aeras.com`)
4. Follow DNS configuration instructions
5. Render will automatically provision SSL certificate

## Troubleshooting

### Build Fails

**Problem**: `pnpm: command not found`

**Solution**: Render might not have pnpm by default. Add a `package.json` script:
```json
{
  "scripts": {
    "build": "npm install -g pnpm && pnpm install && pnpm build"
  }
}
```

Or specify Node version in `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### App Loads But Shows Blank Screen

**Check**:
1. Open browser DevTools → Console for errors
2. Verify `VITE_API_BASE_URL` is correct
3. Check if backend is accessible

**Fix**: Update environment variables in Render Dashboard.

### WebSocket Connection Fails

**Problem**: `WebSocket connection failed`

**Solution**: Ensure backend URL uses HTTPS/WSS:
```
VITE_SOCKET_URL=https://aeras-backend.onrender.com
```

Backend must support WebSocket over HTTPS.

### PWA Install Not Working

**Requirements for PWA**:
- ✅ Served over HTTPS (Render provides this)
- ✅ Valid `manifest.webmanifest`
- ✅ Service worker registered
- ✅ Icons in correct sizes

**Test**: Open DevTools → Application → Manifest

### CORS Errors

**Problem**: API requests blocked by CORS

**Solution**: Configure CORS on backend to allow your Render URL:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://aeras-puller-app.onrender.com',
    'http://localhost:3001'
  ],
  credentials: true
});
```

## Performance Optimization

### Enable Compression

Render automatically enables gzip compression for static sites.

### Cache Headers

Add `_headers` file to `public/` directory:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: public, max-age=86400
```

Then update build to copy it:
```json
// vite.config.ts - already configured with vite-plugin-pwa
```

### Service Worker Caching

The app uses Workbox for intelligent caching (already configured).

## Monitoring

### Check Deployment Logs

In Render Dashboard:
1. Go to your static site
2. Click **"Logs"** tab
3. View build and deployment logs

### Analytics (Optional)

Consider adding analytics:
- **Google Analytics**: For user tracking
- **Sentry**: For error monitoring
- **LogRocket**: For session replay

## CI/CD

Render automatically deploys when you push to your default branch.

**Manual Deploy**:
1. Go to Render Dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

**Deploy from Branch**:
```bash
git checkout -b production
git push origin production
```

Then configure Render to deploy from `production` branch.

## Update Deployed App

### For Code Changes

```bash
git add .
git commit -m "Update: feature description"
git push origin master
```

Render auto-deploys in ~3-5 minutes.

### For Environment Variables

1. Go to Render Dashboard
2. Click **"Environment"**
3. Update variables
4. Click **"Save Changes"**
5. Render will rebuild and redeploy

## Costs

**Render Free Tier**:
- ✅ 100 GB bandwidth/month
- ✅ Automatic SSL
- ✅ Continuous deployment
- ✅ Global CDN

For high traffic, upgrade to **Paid Plan** ($7/month):
- 100 GB → 1 TB bandwidth
- Faster builds
- Priority support

## Security Checklist

- [x] HTTPS enabled (automatic on Render)
- [x] Environment variables for sensitive config
- [x] Service worker caching only public assets
- [x] CORS properly configured on backend
- [x] No API keys in frontend code

## Next Steps

1. ✅ Deploy puller app
2. ✅ Test PWA installation on mobile
3. ✅ Configure custom domain (optional)
4. ✅ Set up error monitoring
5. ✅ Test with real e-rickshaw drivers

## Support

- **Render Docs**: [render.com/docs/static-sites](https://render.com/docs/static-sites)
- **Render Community**: [community.render.com](https://community.render.com)
- **AERAS Issues**: [GitHub Issues](https://github.com/u2204125/aeras-puller-app/issues)

---

**Deployment Status**: 🚀 Ready for Production

Your AERAS Puller App is now live and accessible to e-rickshaw drivers!
