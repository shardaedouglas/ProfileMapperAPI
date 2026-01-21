# Profile Matcher API

A RESTful API that matches person identifying information against candidate social media profiles, returning ranked results with confidence scores.

## Prerequisites

- Node.js 18+ 
- npm, pnpm, or yarn

## Installation & Setup

```bash
# Clone the repository
git clone <repo-url>
cd ProfileMatcherAPI

# Install dependencies
npm install       # or: pnpm install / yarn

# Build TypeScript
npm run build
```

## Running the Server

```bash
# Production
npm start              # Runs on http://localhost:3000

# Development (with auto-reload)
npm run dev
```

## Running Tests

## Running Tests

```bash
npm test               # Run all 125 tests
```

## Example Usage

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Match request
curl -X POST http://localhost:3000/match \
  -H "Content-Type: application/json" \
  -d '{
    "person": {"name": "Jane Doe", "email": "jane.doe@example.com", "employer": "Acme Corp"},
    "profiles": [
      {"platform": "linkedin", "username": "janedoe", "display_name": "Jane Doe", "bio": "Engineer at Acme Corp"}
    ]
  }'
```

### Using PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/match" -Method Post `
  -ContentType "application/json" `
  -Body '{"person":{"name":"Jane Doe"},"profiles":[{"platform":"linkedin","username":"janedoe","display_name":"Jane Doe"}]}'
```

## API Reference

### GET /health
Returns server status.

### POST /match

```json
{
  "person": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "555-123-4567",
    "location": "San Francisco, CA",
    "dateOfBirth": "1990-05-15",
    "employer": "Acme Corp",
    "jobTitle": "Software Engineer"
  },
  "profiles": [
    {
      "platform": "linkedin",
      "username": "janedoe",
      "display_name": "Jane Doe",
      "bio": "Software Engineer at Acme Corp | Born 1990",
      "location": "SF Bay Area"
    }
  ]
}
```

Returns ranked profiles with scores (0.0-1.0) and factor breakdown.

**Note:** Both `display_name` (snake_case) and `displayName` (camelCase) are supported.

## Matching Algorithm

### Weights
| Factor | Weight | Description |
|--------|--------|-------------|
| Name | 30% | Fuzzy match with nickname support (Bill↔William) |
| Email→Username | 18% | Derives username from email address |
| Employer | 18% | Keyword extraction from bio |
| Location | 12% | Alias mapping (SF↔San Francisco, NYC↔New York) |
| Job Title | 10% | Matches job titles in bio |
| Phone | 7% | Finds phone numbers in bio |
| Date of Birth | 5% | Matches birth year or age in bio |

### Features
- **Nicknames**: William↔Bill, Robert↔Bob, Elizabeth↔Liz, etc.
- **Location aliases**: SF↔San Francisco, NYC↔New York, LA↔Los Angeles
- **Fuzzy matching**: Levenshtein distance for typo tolerance
- **Graceful degradation**: Missing fields don't penalize scores

## Sample Response

```json
{
  "matches": [
    {
      "profile": { "platform": "linkedin", "username": "janedoe" },
      "score": 0.96,
      "factors": {
        "name_match": 1,
        "location_match": 0.9,
        "employer_in_bio": 1,
        "email_username_match": 0.9
      }
    }
  ]
}
```

## Error Handling

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Validation error (invalid input, empty profiles, etc.) |
| 500 | Internal server error |

## Project Structure

```
src/
├── index.ts      # Express server & routes
├── types.ts      # Zod schemas & TypeScript types
└── matching.ts   # Core matching algorithms
tests/
├── matching.test.ts      # Unit tests (30)
├── comprehensive.test.ts # Edge case tests (72)
└── api.test.ts           # Integration tests (23)
```

## Design Decisions

1. **Weighted scoring**: Only factors with available data are considered, so missing fields don't artificially lower scores
2. **No external APIs**: All matching logic is self-contained
3. **Nickname support**: Common name variants are mapped (Bill↔William, Bob↔Robert)
4. **Location normalization**: Handles common abbreviations (SF, NYC, LA)
