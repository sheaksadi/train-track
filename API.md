# Train Track API Documentation

This document describes all API calls made by the Train Track application.

## Overview

All API calls are made **directly from the client-side** to the BVG REST API. This ensures each user's IP address is used for rate limiting instead of a central server IP.

**Base API:** `https://v6.bvg.transport.rest/`

---

## API Calls

### 1. Train Positions (Radar)

Fetches real-time positions of U-Bahn and RE1 trains.

```
GET https://v6.bvg.transport.rest/radar?north=52.65&west=11.50&south=52.05&east=14.60&results=512&duration=30&frames=1
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| north/south/west/east | coords | Bounding box (Berlin to Magdeburg) |
| results | 512 | Max train results |
| duration | 30 | Time window in minutes |
| frames | 1 | Single snapshot |

**Response (filtered for U1-U9, RE1):**
```json
{
  "movements": [
    {
      "tripId": "1|12345|0|86|25122024",
      "location": { "latitude": 52.5123, "longitude": 13.4167 },
      "direction": "S+U Alexanderplatz",
      "line": { "name": "U5", "product": "subway" },
      "nextStopovers": [{ "departureDelay": 60 }]
    }
  ]
}
```

---

### 2. Station Search

Finds station ID by name.

```
GET https://v6.bvg.transport.rest/locations?query=Alexanderplatz&results=5
```

**Response:**
```json
[
  { "id": "900000100003", "name": "S+U Alexanderplatz", "type": "stop" }
]
```

---

### 3. Station Departures

Fetches departures for a specific station.

```
GET https://v6.bvg.transport.rest/stops/{stationId}/departures?duration=60&results=30
```

**Response:**
```json
{
  "departures": [
    {
      "line": { "name": "U5", "product": "subway" },
      "destination": { "name": "Hönow" },
      "direction": "Hönow",
      "plannedWhen": "2024-12-25T01:50:00+01:00",
      "when": "2024-12-25T01:51:00+01:00",
      "delay": 60,
      "platform": "1"
    }
  ]
}
```

---

## Rate Limiting

- **BVG Limit:** ~100 requests/minute per IP
- **Client-side tracking:** Each browser tracks its own usage
- **Auto-throttle:** Refresh interval adjusts (3s-30s) based on usage
- **Priority queue:** Hovered items get higher priority

---

## Category Order

Departures are grouped and sorted:
1. U-Bahn
2. Regional
3. S-Bahn  
4. Tram
5. Bus
