# Train Track API Documentation

All API calls are made **directly from the client-side** to the BVG REST API.

**Base URL:** `https://v6.bvg.transport.rest/`

---

## Endpoints

### 1. Train Positions (Radar)
```
GET /radar?north={n}&west={w}&south={s}&east={e}&results=512&duration=30&frames=1
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `north/south/west/east` | float | Bounding box coordinates |
| `results` | 512 | Max train results |
| `duration` | 30 | Time window in minutes |
| `frames` | 1 | Single snapshot |

**Response:**
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

### 2. Station Search (Locations)
```
GET /locations?query={stationName}&results=5&addresses=false&poi=false
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `query` | string | Station name to search |
| `results` | 5 | Max results |
| `addresses` | false | Exclude addresses |
| `poi` | false | Exclude POI |

**Response:**
```json
[
  { "id": "900000100003", "name": "S+U Alexanderplatz", "type": "stop" }
]
```

---

### 3. Station Departures
```
GET /stops/{stationId}/departures?duration=60&results=30
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `stationId` | string | Station ID from search |
| `duration` | 60 | Lookahead in minutes |
| `results` | 30 | Max departures |

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
- **Recommended refresh:** 3-30 seconds based on usage

---

## Category Order

Departures grouped by:
1. U-Bahn
2. Regional (RE/RB)
3. S-Bahn
4. Tram
5. Bus
