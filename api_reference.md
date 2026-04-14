# GA Scheduler — REST API Reference

> Base URL: `http://localhost:3000`  
> All responses follow `{ success: boolean, data?: ..., error?: { code, message } }`

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |

---

## Lecturers `/api/lecturers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lecturers` | List all lecturers |
| GET | `/api/lecturers/:id` | Get one lecturer |
| POST | `/api/lecturers` | Create lecturer |
| PUT | `/api/lecturers/:id` | Update lecturer |
| DELETE | `/api/lecturers/:id` | Delete lecturer |

**POST / PUT body:**
```json
{
  "name": "Dr. Ahmad",
  "isStructural": false
}
```

---

## Program Studies `/api/programs`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/programs` | List all programs (includes courses) |
| GET | `/api/programs/:id` | Get one program |
| POST | `/api/programs` | Create program |
| PUT | `/api/programs/:id` | Update program |
| DELETE | `/api/programs/:id` | Delete program |

**POST body:**
```json
{ "name": "Informatika" }
```

---

## Courses `/api/courses`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courses` | List all courses |
| GET | `/api/courses?programStudyId=1` | Filter by program study |
| GET | `/api/courses/:id` | Get course (incl. facilities & offerings) |
| POST | `/api/courses` | Create course |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |

**POST body:**
```json
{
  "name": "Algoritma",
  "credits": 3,
  "requiresSpecialRoom": false,
  "programStudyId": 1,
  "facilityIds": [1, 2]
}
```

---

## Rooms `/api/rooms`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rooms` | List all rooms (incl. facilities) |
| GET | `/api/rooms?roomType=CLASSROOM` | Filter by room type |
| GET | `/api/rooms/:id` | Get room |
| POST | `/api/rooms` | Create room |
| PUT | `/api/rooms/:id` | Update room |
| DELETE | `/api/rooms/:id` | Delete room |

**POST body:**
```json
{
  "name": "Lab A",
  "capacity": 40,
  "roomType": "LAB",
  "facilityIds": [1]
}
```

---

## Facilities `/api/facilities`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/facilities` | List all facilities |
| GET | `/api/facilities/:id` | Get facility |
| POST | `/api/facilities` | Create facility |
| PUT | `/api/facilities/:id` | Update facility |
| DELETE | `/api/facilities/:id` | Delete facility |

**POST body:**
```json
{ "name": "Projector", "description": "LCD projector" }
```

---

## Time Slots `/api/timeslots`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timeslots` | List all time slots |
| GET | `/api/timeslots?day=Monday` | Filter by day |
| GET | `/api/timeslots/:id` | Get time slot |
| POST | `/api/timeslots` | Create time slot |
| PUT | `/api/timeslots/:id` | Update time slot |
| DELETE | `/api/timeslots/:id` | Delete time slot |

**POST body:**
```json
{ "day": "Monday", "startTime": "08:00", "endTime": "09:40" }
```

---

## Course Offerings `/api/offerings`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/offerings` | List offerings |
| GET | `/api/offerings?academicYear=2024&semester=Ganjil` | Filter |
| GET | `/api/offerings/:id` | Get full offering detail |
| POST | `/api/offerings` | Create offering |
| PUT | `/api/offerings/:id` | Update offering fields |
| DELETE | `/api/offerings/:id` | Delete offering |
| PATCH | `/api/offerings/:id/lecturers` | Replace lecturer list |

**POST body:**
```json
{
  "courseId": 1,
  "academicYear": "2024/2025",
  "semester": "Ganjil",
  "effectiveStudentCount": 35,
  "totalSessions": 2,
  "isParallel": false,
  "roomId": 5,
  "lecturerIds": [1, 2]
}
```

**PATCH /lecturers body:**
```json
{ "lecturerIds": [3, 4] }
```

---

## Scheduler `/api/scheduler`

> [!WARNING]
> GA runs are CPU-intensive. Rate limit: **5 requests per 5 minutes**.

### POST `/api/scheduler/run`

Runs GA with a **single crossover strategy** and returns the best schedule.

**Body (all optional):**
```json
{
  "populationSize": 200,
  "generations": 70,
  "tournamentSize": 3,
  "mutationRate": 0.30,
  "elitismCount": 2,
  "crossover": "singlePoint"
}
```

- `crossover`: `"singlePoint"` | `"uniform"` | `"pmx"` (default: `"singlePoint"`)

**Response:**
```json
{
  "success": true,
  "data": {
    "preGASummary": {
      "feasible": 42,
      "infeasible": 3,
      "infeasibleDetails": [{ "offeringId": 7, "reason": "No room assigned" }]
    },
    "diversity": {
      "uniqueSlotCount": 35,
      "avgPoolSize": 35.0,
      "overlapDensity": 0.87,
      "rating": "MEDIUM"
    },
    "config": { ... },
    "bestResult": {
      "crossoverUsed": "singlePoint",
      "bestFitness": 2.5,
      "hardViolations": 0,
      "softPenalty": 2,
      "history": [...],
      "avgHistory": [...],
      "entries": [
        {
          "offeringId": 1,
          "courseName": "Algoritma",
          "roomId": 5,
          "roomName": "Ruang A101",
          "lecturerIds": [3],
          "lecturerNames": ["Dr. Ahmad"],
          "timeSlotIds": [12, 18],
          "timeSlots": [
            { "id": 12, "day": "Monday", "startTime": "08:00", "endTime": "09:40" },
            { "id": 18, "day": "Wednesday", "startTime": "10:00", "endTime": "11:40" }
          ]
        }
      ]
    }
  }
}
```

---

### POST `/api/scheduler/compare`

Runs GA with **all three crossover strategies** (Single Point, Uniform, PMX) sequentially and returns results for each plus the overall best.

**Body (all optional — same as `/run` minus `crossover`):**
```json
{
  "populationSize": 200,
  "generations": 70,
  "tournamentSize": 3,
  "mutationRate": 0.30,
  "elitismCount": 2
}
```

**Response** is the same shape as `/run` but `results` contains 3 entries (one per crossover), and `bestResult` is the winner.

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `NOT_FOUND` | 404 | Endpoint doesn't exist |
| `*_NOT_FOUND` | 404 | Resource not found (e.g. `LECTURER_NOT_FOUND`) |
| `NO_FEASIBLE_CANDIDATES` | 422 | Pre-GA found 0 valid offerings — check data integrity |
| `TOO_MANY_REQUESTS` | 429 | General API rate limit hit |
| `TOO_MANY_SCHEDULER_REQUESTS` | 429 | Scheduler-specific rate limit hit |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error |

---

## Running the API

```bash
# Development (with file watching)
npm run api:watch

# One-shot start
npm run api:dev
```

Environment variables ([.env](file:///Users/zikarnurizky/Desktop/01_Project/Tugas%20Akhir/ga_scheduler_lab/.env)):
```
DATABASE_URL="file:./dev.db"
PORT=3000              # optional, defaults to 3000
CORS_ORIGIN=*          # optional, restrict to your frontend origin
```
