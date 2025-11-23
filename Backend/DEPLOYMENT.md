# Backend Deployment Guide

## Important Note About Vercel

⚠️ **Vercel Limitations**: Vercel's serverless functions do NOT support WebSocket connections, which are required for the video consultation feature (WebRTC signaling).

### What Works on Vercel:
- ✅ REST API endpoints (auth, appointments, doctors, patients, etc.)
- ✅ AI assessment features
- ✅ User management
- ✅ Prescription management

### What DOESN'T Work on Vercel:
- ❌ WebSocket/Socket.IO signaling for video calls
- ❌ Real-time video consultations
- ❌ WebRTC peer connections

## Recommended Deployment Options

### Option 1: Railway (Recommended for Full Features)
Railway supports WebSockets and is easy to deploy:

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables
4. Deploy automatically

### Option 2: Render
1. Create account at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your repository
4. Add environment variables
5. Deploy

### Option 3: Heroku
1. Create account at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run:
```bash
heroku create your-app-name
heroku config:set MONGO_URI=your_mongo_uri
heroku config:set JWT_SECRET=your_jwt_secret
# ... add other env variables
git push heroku main
```

### Option 4: VPS (DigitalOcean, AWS EC2, etc.)
For full control, deploy on a VPS with PM2:

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name arogyaai-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

## Environment Variables Required

Make sure to set these environment variables in your deployment platform:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=your_frontend_url
```

## Vercel Deployment (REST API Only)

If you still want to deploy to Vercel (without video features):

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd Backend
vercel
```

3. Add environment variables in Vercel dashboard

4. The `vercel.json` file is already configured

## Testing Deployment

After deployment, test your API:

```bash
# Health check
curl https://your-api-url/health

# Test auth endpoint
curl https://your-api-url/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Troubleshooting

### "FUNCTION_INVOCATION_FAILED" on Vercel
- Make sure `vercel.json` is in the Backend directory
- Ensure all environment variables are set in Vercel dashboard
- Check Vercel function logs for specific errors

### MongoDB Connection Issues
- Whitelist Vercel's IP addresses in MongoDB Atlas (or allow all: 0.0.0.0/0)
- Verify MONGO_URI is correct
- Check MongoDB Atlas cluster is running

### CORS Errors
- Update FRONTEND_URL environment variable
- Check CORS configuration in server.js

## Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas IP whitelist updated
- [ ] JWT_SECRET is secure and random
- [ ] NODE_ENV set to "production"
- [ ] Frontend URL configured correctly
- [ ] API endpoints tested
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
