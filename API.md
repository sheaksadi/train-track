# Train Track API Documentation

This document describes all API endpoints used by the Train Track application.

## Overview

The application uses two internal API endpoints that proxy requests to the BVG (Berlin Public Transport) REST API v6.

**Base External API:** `https://v6.bvg.transport.rest/`

---

## Endpoints

### 1. GET `/api/u5-positions`

Fetches real-time positions of U-Bahn and RE1 trains within the Berlin-Magdeburg area.

#### Request

```
GET /api/u5-positions
```

No parameters required.

#### Response

```json
{
  "trains": [
    {
      "tripId": "1|12345|0|86|25122024",
      "latitude": 52.5123,
      "longitude": 13.4167,
      "direction": "S+U Alexanderplatz",
      "lineName": "U5",
      "product": "subway",
      "delay": 60
    },
    {
      "tripId": "1|67890|0|86|25122024",
      "latitude": 52.4012,
      "longitude": 12.5543,
      "direction": "Brandenburg Hbf",
      "lineName": "RE1",
      "product": "regional",
      "delay": 0
    }
  ],
  "timestamp": "2024-12-25T01:45:00.000Z"
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| tripId | string | Unique trip identifier |
| latitude | number | Current latitude position |
| longitude | number | Current longitude position |
| direction | string | Final destination of the train |
| lineName | string | Line name (U1-U9, RE1) |
| product | string | Transport type: "subway" or "regional" |
| delay | number | Delay in seconds (0 = on time) |

#### External API Call

```
GET https://v6.bvg.transport.rest/radar?north=52.65&west=11.50&south=52.05&east=14.60&results=512&duration=30&frames=1
```

---

### 2. GET `/api/station-departures`

Fetches upcoming departures for a station, grouped by transport type.

#### Request

```
GET /api/station-departures?station=Alexanderplatz
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | Yes | Station name to search for |

#### Response

```json
{
  "stationId": "900000100003",
  "stationName": "S+U Alexanderplatz",
  "departures": [...],
  "grouped": {
    "U-Bahn": [
      {
        "line": "U5",
        "destination": "Hönow",
        "plannedTime": "2024-12-25T01:50:00+01:00",
        "actualTime": "2024-12-25T01:51:00+01:00",
        "delay": 60,
        "platform": "1",
        "product": "subway",
        "category": "U-Bahn"
      }
    ],
    "Regional": [
      {
        "line": "RE1",
        "destination": "Frankfurt (Oder)",
        "plannedTime": "2024-12-25T02:00:00+01:00",
        "actualTime": "2024-12-25T02:00:00+01:00",
        "delay": 0,
        "platform": "13",
        "product": "regional",
        "category": "Regional"
      }
    ],
    "S-Bahn": [...],
    "Tram": [...],
    "Bus": [...]
  }
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| stationId | string | BVG station ID |
| stationName | string | Official station name |
| departures | array | Flat list of all departures |
| grouped | object | Departures grouped by category |

**Departure object:**

| Field | Type | Description |
|-------|------|-------------|
| line | string | Line name (e.g., "U5", "RE1", "M10") |
| destination | string | Final destination |
| plannedTime | string | Planned departure time (ISO 8601) |
| actualTime | string | Actual departure time (with delays) |
| delay | number | Delay in seconds |
| platform | string | Platform/track number |
| product | string | BVG product type |
| category | string | Grouped category name |

#### Category Order

Categories are returned in this order:
1. U-Bahn
2. Regional
3. S-Bahn
4. Tram
5. Bus
6. other

#### External API Calls

1. **Station Search:**
   ```
   GET https://v6.bvg.transport.rest/locations?query={stationName}&results=5
   ```

2. **Departures:**
   ```
   GET https://v6.bvg.transport.rest/stops/{stationId}/departures?duration=60&results=30
   ```

---

## Rate Limiting

The application tracks API requests to stay within BVG's rate limits:

- **Limit:** 100 requests per minute
- **Auto-throttling:** Refresh interval adjusts based on usage (3s to 30s)
- **Priority system:** Hovered items get higher priority for API slots

---

## Error Handling

All endpoints return standard HTTP error responses:

| Status | Description |
|--------|-------------|
| 400 | Bad Request (missing required parameters) |
| 500 | Internal Server Error (upstream API failure) |

Example error response:
```json
{
  "statusCode": 500,
  "message": "Failed to fetch train positions"
}
```
