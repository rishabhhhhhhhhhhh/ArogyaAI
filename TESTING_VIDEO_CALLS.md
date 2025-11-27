# Testing Video Calls - Quick Guide

## Prerequisites

1. **Backend Server Running:**
   ```bash
   cd Backend
   npm start
   ```
   - Should see: "WebSocket signaling server initialized"
   - Port: 5000 (default)

2. **Frontend Running:**
   ```bash
   cd "ArogyaAI Telemedicine Platform"
   npm run dev
   ```
   - Port: 5173 (default)

3. **Browser Requirements:**
   - Chrome/Edge (recommended)
   - Camera and microphone permissions granted
   - Two browser windows/tabs or two devices

## Test Scenarios

### Scenario 1: Doctor-Patient Video Call

#### Setup
1. **Window 1 (Doctor):**
   - Login as doctor
   - Navigate to appointments
   - Click "Start Consultation" on an appointment

2. **Window 2 (Patient):**
   - Login as patient
   - Navigate to appointments
   - Click "Join Consultation" on the same appointment

#### Expected Behavior
1. Both users see their own video immediately (local video)
2. Signaling connection establishes (badge shows "Connected")
3. WebRTC negotiation happens automatically
4. Remote video appears within 2-5 seconds
5. Both users can see and hear each other

#### Console Logs to Monitor
```
Doctor (Initiator):
✅ "📡 ✅ Signaling Socket.IO connected successfully!"
✅ "🎥 Local media stream obtained"
✅ "📤 Creating WebRTC offer..."
✅ "📤 Offer created"
✅ "🧊 ✅ ICE candidate added successfully"
✅ "🎥 RECEIVED REMOTE TRACK EVENT"
✅ "🎥 ✅ Remote video playing successfully!"

Patient (Non-Initiator):
✅ "📡 ✅ Signaling Socket.IO connected successfully!"
✅ "🎥 Local media stream obtained"
✅ "📥 Received offer, creating answer..."
✅ "📥 Answer created"
✅ "🧊 ✅ ICE candidate added successfully"
✅ "🎥 RECEIVED REMOTE TRACK EVENT"
✅ "🎥 ✅ Remote video playing successfully!"
```

### Scenario 2: Simple WebRTC Test Page

#### Access
Navigate to: `http://localhost:5173/webrtc-test` or `/simple-webrtc-test`

#### Steps
1. Click "Start Local Media" - should see your camera
2. Click "Create Peer Connection" - creates RTCPeerConnection
3. Click "Add Stream to PC" - adds your media to connection
4. Click "Create Offer" - creates SDP offer
5. Monitor logs for ICE candidates

#### Purpose
- Test camera/microphone access
- Verify WebRTC basics work
- Debug ICE candidate generation
- Check browser compatibility

## Common Issues and Solutions

### Issue 1: "Camera/microphone access denied"
**Solution:**
- Check browser permissions (click lock icon in address bar)
- Grant camera and microphone access
- Reload the page

### Issue 2: "Signaling not connected"
**Solution:**
- Verify backend server is running
- Check backend logs for connection errors
- Verify CORS settings allow your frontend URL
- Check browser console for WebSocket errors

### Issue 3: "Local video works, but no remote video"
**Possible Causes:**
1. **Remote peer hasn't granted permissions**
   - Check remote peer's browser permissions
   
2. **ICE candidates not exchanging**
   - Check console for "🧊" logs
   - Verify signaling server is relaying messages
   
3. **NAT/Firewall blocking**
   - Test on same network first
   - May need TURN server for different networks
   
4. **Remote peer's video is disabled**
   - Check if remote peer toggled video off

### Issue 4: "Video freezes or stutters"
**Solution:**
- Check network quality badge
- Reduce video quality in constraints
- Check CPU usage
- Test with better network connection

### Issue 5: "Connection state stuck on 'connecting'"
**Solution:**
- Check ICE candidate exchange
- Verify STUN servers are reachable
- May need TURN server
- Check firewall settings

## Debugging Steps

### Step 1: Check Browser Console
Open DevTools (F12) and look for:
- ✅ Green checkmarks = success
- ⚠️ Yellow warnings = non-critical issues
- ❌ Red X = errors that need fixing

### Step 2: Check WebRTC Internals
- **Chrome:** Navigate to `chrome://webrtc-internals`
- **Firefox:** Navigate to `about:webrtc`

Look for:
- Active peer connections
- ICE candidate pairs
- Selected candidate pair (should show "succeeded")
- Bytes sent/received (should be increasing)

### Step 3: Check Backend Logs
Look for:
```
✅ "User [email] connected to signaling server"
✅ "User [email] successfully joined session"
✅ "WebRTC offer relayed"
✅ "WebRTC answer relayed"
✅ "ICE candidate relayed"
```

### Step 4: Network Check
1. Open browser DevTools > Network tab
2. Filter by "WS" (WebSocket)
3. Should see active WebSocket connection
4. Check for messages being sent/received

## Performance Monitoring

### Good Connection Indicators
- Connection state: "connected"
- Network quality: "excellent" or "good"
- ICE connection state: "connected"
- Video playing smoothly
- Audio clear without echo

### Poor Connection Indicators
- Network quality: "fair" or "poor"
- Video stuttering or freezing
- Audio cutting out
- High latency in chat messages

## Test Checklist

- [ ] Local video appears immediately
- [ ] Remote video appears within 5 seconds
- [ ] Audio is clear (no echo, no distortion)
- [ ] Video quality is acceptable
- [ ] Can toggle video on/off
- [ ] Can toggle audio on/off
- [ ] Chat messages work
- [ ] Can end call successfully
- [ ] Connection recovers from brief network issues
- [ ] Works on different networks
- [ ] Works on mobile devices

## Browser Compatibility

### Tested Browsers
- ✅ Chrome 90+ (Best support)
- ✅ Edge 90+ (Best support)
- ✅ Firefox 88+ (Good support)
- ⚠️ Safari 14+ (May have autoplay restrictions)

### Mobile Browsers
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS 14.3+)
- ⚠️ May require user interaction to start video

## Network Requirements

### Minimum Requirements
- **Bandwidth:** 500 kbps upload/download
- **Latency:** < 200ms
- **Packet Loss:** < 5%

### Recommended Requirements
- **Bandwidth:** 2 Mbps upload/download
- **Latency:** < 100ms
- **Packet Loss:** < 1%

### Firewall/NAT
- **UDP ports:** 3478, 19302 (STUN)
- **TCP ports:** 443 (fallback)
- **TURN server:** Required for restrictive NATs

## Production Considerations

### Before Going Live
1. **Add TURN Server:**
   - Configure TURN server for NAT traversal
   - Add authentication
   - Monitor usage and costs

2. **Add Monitoring:**
   - Track connection success rate
   - Monitor video quality metrics
   - Alert on high failure rates

3. **Add Recording:**
   - Implement session recording
   - Store recordings securely
   - Comply with regulations (HIPAA, etc.)

4. **Add Reconnection:**
   - Handle temporary disconnections
   - Automatic reconnection attempts
   - User notifications

5. **Load Testing:**
   - Test with multiple concurrent calls
   - Monitor server resources
   - Scale infrastructure as needed

## Support Resources

### Documentation
- WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- Socket.IO: https://socket.io/docs/v4/
- ICE/STUN/TURN: https://webrtc.org/getting-started/peer-connections

### Debugging Tools
- Chrome WebRTC Internals: `chrome://webrtc-internals`
- Firefox WebRTC Stats: `about:webrtc`
- Network Monitor: Browser DevTools > Network tab

### Common Error Messages
- "NotAllowedError": Camera/mic permission denied
- "NotFoundError": No camera/mic found
- "OverconstrainedError": Requested constraints not supported
- "TypeError: Failed to execute 'addIceCandidate'": ICE candidate format issue
