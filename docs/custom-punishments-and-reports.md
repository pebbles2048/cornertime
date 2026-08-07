# Cornertime: Custom Punishments & Punishment Reports

A guide for LLM agents that need to **create custom punishments** (`Preset`) or **read/parse punishment reports** (`Report`) for the Cornertime app. Everything below reflects the current source of truth in `src/models.ts`, `src/serialization.ts`, and `src/state.ts`.

## The two artifact types

| Artifact | JSON shape | Kind marker in the armored format |
|---|---|---|
| Custom punishment | `Preset` | `CUSTOM PUNISHMENT` |
| Punishment report | `Report` | `PUNISHMENT REPORT` |

Both are just JSON. They can be exchanged as plain JSON or inside an **armored envelope** (a base64 blob wrapped between `BEGIN`/`END` markers — see [Armored format](#armored-format)). All durations are **seconds**.

---

## Custom punishment (`Preset`)

The full schema, field by field:

```jsonc
{
    "title": "string",                     // shown to the person before the punishment starts
    "durationRange": {                     // the punishment's total length
        "minimum": 600,                    // inclusive
        "maximum": 900                     // EXCLUSIVE (random pick is in [minimum, maximum))
    },
    "penaltyRange": {                      // time added when a movement penalty triggers
        "minimum": 60,                     // inclusive
        "maximum": 180                     // random pick is in [minimum, maximum)
    },
    "penaltyProbabilities": [0.0, 1.0],    // see below
    "encouragementProbability": 0.1,       // 0.0–1.0, see below
    "phrases": {
        "getReady":   ["..."],  // spoken when the preparation delay starts
        "start":      ["..."],  // spoken when the punishment clock starts
        "encourage":  ["..."],  // optional praise at full minutes
        "scold":      ["..."],  // spoken when movement is detected but no penalty triggers
        "penalize":   ["..."],  // spoken when movement is detected and a penalty triggers
        "end":        ["..."]   // spoken when the punishment finishes
    }
}
```

### Field semantics

- **`durationRange` / `penaltyRange`** — ranges in seconds; `maximum` is exclusive. The actual duration and any penalty are picked randomly within the range via `randomInteger(minimum, maximum)`.
- **`penaltyProbabilities`** — one entry per *consecutive* movement violation. The first violation uses `penaltyProbabilities[0]`, the second uses `[1]`, and so on; when the array is exhausted the **last value is reused** for every further violation. Each value is the chance (0.0–1.0) that a detected movement results in a **penalty** (time added) rather than a **scold** (no time added). E.g. `[0.0, 1.0]` means "first offence is a warning, everything after that adds time."
- **`encouragementProbability`** — at each full minute of punishment there is a chance of speaking a random `encourage` phrase; this field is that probability (0.0–1.0).
- **`phrases`** — each key holds a non-empty array; when an event happens, one phrase is chosen at random. All six keys are required.

### Example

```json
{
    "title": "Little Brother Discipline",
    "durationRange": { "minimum": 60, "maximum": 300 },
    "penaltyRange": { "minimum": 15, "maximum": 45 },
    "penaltyProbabilities": [0.0, 0.5, 1.0],
    "encouragementProbability": 0.15,
    "phrases": {
        "getReady": ["Get in the corner, little brother."],
        "start": ["The punishment starts now."],
        "encourage": ["Doing well. Keep it up."],
        "scold": ["Did I see you move?"],
        "penalize": ["That is a penalty. Adding time."],
        "end": ["You may leave the corner now."]
    }
}
```

---

## Punishment report (`Report`)

Produced once a punishment reaches the `finished` state (`fsm.report()`). The full schema:

```jsonc
{
    "name": "string",           // the punished person's name (from settings)
    "presetTitle": "string",    // title of the preset that was used
    "initialDuration": 120,     // seconds, duration as drawn at start
    "totalDuration": 165,       // seconds, initial + all penalties added
    "startedAt": "2026-08-07T18:30:00.000Z",  // ISO-8601 timestamp
    "events": [
        {
            "eventType": "getReady", // or start | scold | encourage | penalize | end
            "time": -10,             // seconds relative to punishment start (0)
            "adjustment": 0          // seconds added to the clock (only > 0 on penalize)
        }
    ],
    "violations": 2             // == number of scold + penalize events
}
```

### Event semantics

- **`eventType`** — one of `getReady`, `start`, `scold`, `encourage`, `penalize`, `end`.
- **`time`** — the moment of the event in seconds **relative to the punishment start** (`0` = `start`). Times can be **negative**: a `getReady` event fires during the preparation delay, at `-10` by default (10 seconds before `start`).
- **`adjustment`** — seconds added to the clock. Only meaningful on `penalize` (a random pick from the preset's `penaltyRange`); it is `0` on every other event type. `totalDuration = initialDuration + Σ adjustments`.
- **`violations`** — equals the total number of `scold` + `penalize` events (i.e. every detected movement that resulted in either a scold or a penalty).

### Example

```json
{
    "name": "Anonymous",
    "presetTitle": "Little Brother Discipline",
    "initialDuration": 120,
    "totalDuration": 165,
    "startedAt": "2026-08-07T18:30:00.000Z",
    "events": [
        { "eventType": "getReady", "time": -10, "adjustment": 0 },
        { "eventType": "start", "time": 0, "adjustment": 0 },
        { "eventType": "scold", "time": 40, "adjustment": 0 },
        { "eventType": "penalize", "time": 80, "adjustment": 45 },
        { "eventType": "end", "time": 165, "adjustment": 0 }
    ],
    "violations": 2
}
```

---

## Armored format

Both artifact types can be wrapped in an armored envelope so they are safe to copy/paste as a single block:

```
-----BEGIN CORNERTIME CUSTOM PUNISHMENT-----
<base64 of JSON, wrapped at 76 characters per line>
-----END CORNERTIME CUSTOM PUNISHMENT-----
```

and

```
-----BEGIN CORNERTIME PUNISHMENT REPORT-----
<base64 of JSON, wrapped at 76 characters per line>
-----END CORNERTIME PUNISHMENT REPORT-----
```

Rules (implemented in `src/serialization.ts`):

1. Take `JSON.stringify` of the object.
2. Encode as base64 over **UTF-8** (the app encodes via `encodeURIComponent` + `btoa` so non-ASCII characters survive; a plain `Buffer.from(json, 'utf8').toString('base64')` produces identical output).
3. Wrap the base64 at **76 characters per line** with `\n`.
4. Surround with the exact `-----BEGIN CORNERTIME <KIND>-----` / `-----END CORNERTIME <KIND>-----` markers.

### Custom punishment, armored

```
-----BEGIN CORNERTIME CUSTOM PUNISHMENT-----
eyJ0aXRsZSI6IkxpdHRsZSBCcm90aGVyIERpc2NpcGxpbmUiLCJkdXJhdGlvblJhbmdlIjp7Im1p
bmltdW0iOjYwLCJtYXhpbXVtIjozMDB9LCJwZW5hbHR5UmFuZ2UiOnsibWluaW11bSI6MTUsIm1h
eGltdW0iOjQ1fSwicGVuYWx0eVByb2JhYmlsaXRpZXMiOlswLDAuNSwxXSwiZW5jb3VyYWdlbWVu
dFByb2JhYmlsaXR5IjowLjE1LCJwaHJhc2VzIjp7ImdldFJlYWR5IjpbIkdldCBpbiB0aGUgY29y
bmVyLCBsaXR0bGUgYnJvdGhlci4iXSwic3RhcnQiOlsiVGhlIHB1bmlzaG1lbnQgc3RhcnRzIG5v
dy4iXSwiZW5jb3VyYWdlIjpbIkRvaW5nIHdlbGwuIEtlZXAgaXQgdXAuIl0sInNjb2xkIjpbIkRp
ZCBJIHNlZSB5b3UgbW92ZT8iXSwicGVuYWxpemUiOlsiVGhhdCBpcyBhIHBlbmFsdHkuIEFkZGlu
ZyB0aW1lLiJdLCJlbmQiOlsiWW91IG1heSBsZWF2ZSB0aGUgY29ybmVyIG5vdy4iXX19
-----END CORNERTIME CUSTOM PUNISHMENT-----
```

### Punishment report, armored

```
-----BEGIN CORNERTIME PUNISHMENT REPORT-----
eyJuYW1lIjoiQW5vbnltb3VzIiwicHJlc2V0VGl0bGUiOiJMaXR0bGUgQnJvdGhlciBEaXNjaXBs
aW5lIiwiaW5pdGlhbER1cmF0aW9uIjoxMjAsInRvdGFsRHVyYXRpb24iOjE2NSwic3RhcnRlZEF0
IjoiMjAyNi0wOC0wN1QxODozMDowMC4wMDBaIiwiZXZlbnRzIjpbeyJldmVudFR5cGUiOiJnZXRS
ZWFkeSIsInRpbWUiOi0xMCwiYWRqdXN0bWVudCI6MH0seyJldmVudFR5cGUiOiJzdGFydCIsInRp
bWUiOjAsImFkanVzdG1lbnQiOjB9LHsiZXZlbnRUeXBlIjoic2NvbGQiLCJ0aW1lIjo0MCwiYWRq
dXN0bWVudCI6MH0seyJldmVudFR5cGUiOiJwZW5hbGl6ZSIsInRpbWUiOjgwLCJhZGp1c3RtZW50
Ijo0NX0seyJldmVudFR5cGUiOiJlbmQiLCJ0aW1lIjoxNjUsImFkanVzdG1lbnQiOjB9XSwidmlv
bGF0aW9ucyI6Mn0=
-----END CORNERTIME PUNISHMENT REPORT-----
```

---

## How the app consumes these formats

Both artifact types are stored and transmitted using the armored format (base64-UTF-8 wrapped at 76 chars). The app provides two ways to use them:

- **Import a custom punishment:** welcome screen → *"I Have a Custom Punishment"* (`PunishmentLoader`). It accepts **either** the armored format **or** raw JSON.
- **Design + export a custom punishment:** welcome screen → *"Custom"* (`PunishmentSetup`); the armored preset is printed at the bottom so it can be given to someone else without revealing its contents.
- **Read a report:** the person punished is given the armored report at the end; anyone can paste it into *"View the Report of a Previous Punishment"* (`ReportViewer`) to see its contents.
- **Bulk analysis:** `scripts/total_duration.py` sums `totalDuration` over concatenated armored reports piped on stdin.

## Gotchas

- The deserializer only validates the armored markers and parses the JSON; field types and ranges are not validated. When *creating* artifacts, emit the complete schema above so consumers get well-formed data.
- **`durationRange.maximum` and `penaltyRange.maximum` are exclusive**, `minimum` inclusive.
- **Event `time` values can be negative** (the `getReady` event during preparation).
- The report's UI table hides `getReady` and `start` events, but the raw JSON contains all six event types.
- Plain JSON in `PunishmentLoader` is accepted, but only armored presets have the `BEGIN`/`END` envelope; do not invent other markers.
- Non-ASCII characters in JSON values (phrases, names) survive safely because the armored format uses UTF-8 before base64 encoding.
