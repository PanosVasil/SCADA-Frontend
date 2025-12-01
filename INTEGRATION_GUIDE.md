# Backend Integration Guide

This guide explains how to integrate the SCADA Web Dashboard frontend with your FastAPI backend.

## Environment Configuration

### Step 1: Create Environment File

Copy the example environment file:
```bash
cp .env.example .env.local
```

### Step 2: Configure API Endpoints

Edit `.env.local` with your backend URLs:

**For Local Development:**
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_URL=ws://127.0.0.1:8000/ws
```

**For Production:**
```env
VITE_API_BASE_URL=https://api.yourcompany.com
VITE_WS_URL=wss://api.yourcompany.com/ws
```

## Backend Requirements

### Authentication

The frontend expects FastAPI-Users v14 authentication:

1. **Registration Endpoint**: `POST /auth/register`
   - Content-Type: `application/json`
   - Body: `{ "email": "user@example.com", "password": "password" }`
   - Returns: User object

2. **Login Endpoint**: `POST /auth/jwt/login`
   - Content-Type: `application/x-www-form-urlencoded`
   - Body: `username=user@example.com&password=password`
   - Returns: `{ "access_token": "...", "token_type": "bearer" }`

3. **Current User**: `GET /me`
   - Headers: `Authorization: Bearer <token>`
   - Returns: User object with fields:
     ```json
     {
       "id": "uuid",
       "email": "user@example.com",
       "is_active": true,
       "is_superuser": false,
       "is_verified": true,
       "organization_id": "optional",
       "default_park_id": "optional"
     }
     ```

### Telemetry Endpoints

1. **Initial Data**: `GET /data`
   - Headers: `Authorization: Bearer <token>`
   - Returns: TelemetryData object
   ```json
   {
     "plc_clients": [
       {
         "name": "Client Name",
         "url": "opc.tcp://192.168.1.100:4840",
         "status": "CONNECTED",  // or "DISCONNECTED", "ERROR"
         "nodes": [
           {
             "name": "Temperature",
             "value": 25.5,
             "timestamp": "2024-01-01T12:00:00Z"
           }
         ],
         "last_update": "2024-01-01T12:00:00Z"
       }
     ],
     "timestamp": "2024-01-01T12:00:00Z"
   }
   ```

2. **WebSocket Updates**: `WS /ws`
   - Connection with authentication:
     - Method 1 (Preferred): Use `Sec-WebSocket-Protocol` header
       ```
       Sec-WebSocket-Protocol: bearer,<JWT_TOKEN>
       ```
     - Method 2: Query parameter
       ```
       ws://api.example.com/ws?token=<JWT_TOKEN>
       ```
   - Message format:
     ```json
     {
       "type": "telemetry_update",
       "data": {
         // Same structure as /data endpoint
       }
     }
     ```

### Admin Endpoints

All admin endpoints require `is_superuser: true`

1. **Health Check**: `GET /admin/ping`
   - Returns: `{ "message": "pong" }`

2. **List Users**: `GET /admin/users`
   - Query params: `limit`, `offset`, `email`, `is_active`, `is_superuser`
   - Returns: Array of User objects with parks

3. **List Parks**: `GET /admin/parks`
   - Returns: Array of Park objects
   ```json
   [
     {
       "id": "park-1",
       "name": "Park Name",
       "url": "opc.tcp://192.168.1.100:4840"
     }
   ]
   ```

4. **Assign Park**: `POST /admin/users/{user_id}/parks/{park_id}`
   - Returns: Success/error

5. **Unassign Park**: `DELETE /admin/users/{user_id}/parks/{park_id}`
   - Returns: Success/error

6. **Write PLC Value**: `POST /write_value`
   - Body:
   ```json
   {
     "plc_url": "opc.tcp://192.168.1.100:4840",
     "node_name": "Temperature",
     "value": 25.5
   }
   ```
   - Returns: `{ "success": true, "message": "Value written" }`

## CORS Configuration

Your backend must allow the frontend origin. In FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## WebSocket Implementation

### Backend Example (FastAPI)

```python
from fastapi import WebSocket, Depends
from fastapi_users import FastAPIUsers

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user = Depends(get_websocket_user)  # Custom auth dependency
):
    await websocket.accept()
    
    try:
        while True:
            # Send telemetry updates
            data = await get_telemetry_data()
            await websocket.send_json({
                "type": "telemetry_update",
                "data": data
            })
            await asyncio.sleep(1)  # Update interval
    except WebSocketDisconnect:
        pass
```

### Authentication for WebSocket

Extract token from `Sec-WebSocket-Protocol`:

```python
async def get_websocket_user(websocket: WebSocket):
    protocol = websocket.headers.get("sec-websocket-protocol", "")
    if "," in protocol:
        _, token = protocol.split(",", 1)
        # Verify token and return user
        return await verify_jwt(token)
    raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
```

## Testing the Integration

### 1. Start Your Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 2. Verify Backend is Running
```bash
curl http://127.0.0.1:8000/docs
```

### 3. Create Test Users

Via Python backend:
```python
# Create admin user
admin = await user_manager.create(
    UserCreate(
        email="admin@example.com",
        password="admin123",
        is_superuser=True,
        is_verified=True
    )
)

# Create regular user
user = await user_manager.create(
    UserCreate(
        email="user@example.com",
        password="user123",
        is_superuser=False,
        is_verified=True
    )
)
```

### 4. Start Frontend
```bash
npm run dev
```

### 5. Test Authentication

1. Navigate to `http://localhost:8080/login`
2. Try logging in with test credentials
3. Verify JWT token is stored in localStorage
4. Check browser DevTools Network tab for API calls

### 6. Test WebSocket Connection

1. Open browser DevTools Console
2. Look for "WebSocket connected" message
3. Verify in Network tab that WS connection is established
4. Send test data from backend and verify it appears in dashboard

## Common Integration Issues

### Issue: CORS Errors
**Solution**: Add frontend URL to backend CORS allowed origins

### Issue: WebSocket Connection Fails
**Solutions**:
- Verify WebSocket URL in `.env.local`
- Check backend WebSocket endpoint is running
- Ensure JWT token is being sent correctly
- Check for proxy/firewall blocking WebSocket

### Issue: 401 Unauthorized
**Solutions**:
- Verify JWT token is stored in localStorage
- Check token expiration
- Ensure Authorization header format: `Bearer <token>`

### Issue: Data Not Updating
**Solutions**:
- Verify WebSocket connection is active (check console)
- Ensure backend is sending messages in correct format
- Check message type is "telemetry_update"

## Data Format Validation

Use this checklist to ensure your backend sends correct data:

- [ ] User object includes all required fields
- [ ] PLC status is one of: CONNECTED, DISCONNECTED, ERROR
- [ ] Timestamps are ISO 8601 format
- [ ] Node values can be any JSON type
- [ ] WebSocket messages include "type" field
- [ ] All IDs are strings (UUIDs recommended)

## Performance Recommendations

1. **WebSocket Updates**: 
   - Send updates at 1-5 second intervals
   - Only send changed data to reduce bandwidth
   
2. **API Responses**:
   - Implement pagination for large datasets
   - Add caching headers where appropriate
   
3. **Authentication**:
   - Set reasonable token expiration (e.g., 1 hour)
   - Implement token refresh mechanism

## Security Checklist

- [ ] HTTPS/WSS in production
- [ ] JWT tokens stored securely
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection headers
- [ ] CSRF protection for state-changing operations
- [ ] Secure WebSocket authentication

## Deployment

### Frontend Build
```bash
npm run build
```

Deploy `dist/` folder to your hosting service (Netlify, Vercel, etc.)

### Environment Variables in Production

Set these in your hosting platform:
- `VITE_API_BASE_URL`: Your production API URL
- `VITE_WS_URL`: Your production WebSocket URL

## Support

If you encounter integration issues:
1. Check backend logs for errors
2. Review frontend browser console
3. Verify environment variables
4. Test endpoints with curl/Postman
5. Check this guide's troubleshooting section
