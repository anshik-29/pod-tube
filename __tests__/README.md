# Test Suite Documentation

This directory contains comprehensive tests for all new features implemented in PodNow.

## Test Coverage

### API Endpoint Tests

#### Episode Search & Filter (`episodes-search-filter.test.ts`)
- ✅ Returns all episodes when no filters are provided
- ✅ Filters episodes by search query (title/ID)
- ✅ Filters episodes by state (ready, processing, failed)
- ✅ Combines search and state filters
- ✅ Handles date filters (dateFrom, dateTo)
- ✅ Handles errors gracefully

#### User Settings (`user-settings.test.ts`)
**Email Update:**
- ✅ Updates user email successfully
- ✅ Rejects duplicate email addresses
- ✅ Rejects unchanged email
- ✅ Validates email format

**Password Update:**
- ✅ Updates password successfully
- ✅ Rejects incorrect current password
- ✅ Validates password length (minimum 8 characters)
- ✅ Requires all password fields

#### Episode Description (`episode-description.test.ts`)
- ✅ Updates episode description successfully
- ✅ Clears description when null is provided
- ✅ Rejects unauthorized access
- ✅ Validates description type
- ✅ Handles episode not found

### Database Query Tests

#### Episode Filtering (`episodes-filter.test.ts`)
- ✅ Queries without filters
- ✅ Adds search filter (ILIKE on title/ID)
- ✅ Adds state filter
- ✅ Adds date filters
- ✅ Combines all filters correctly

#### Episode Description (`episodes-description.test.ts`)
- ✅ Updates episode description
- ✅ Clears description when null
- ✅ Handles long descriptions (1000+ characters)
- ✅ Handles multi-line descriptions

#### User Updates (`users-update.test.ts`)
- ✅ Updates user email
- ✅ Handles email with special characters
- ✅ Updates user password and clears reset tokens

### Processing Tests

#### Progress Tracking (`progress-tracking.test.ts`)
- ✅ Updates progress without changing status
- ✅ Preserves existing progress when undefined
- ✅ Updates progress to 100 on completion
- ✅ Handles incremental progress updates (10%, 25%, 50%, 75%, 95%, 100%)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test episodes-search-filter.test.ts
```

## Test Structure

Tests are organized by feature area:
- `__tests__/api/` - API endpoint tests
- `__tests__/lib/db/queries/` - Database query tests
- `__tests__/lib/processing/` - Processing logic tests

## Mocking Strategy

- **Database queries**: Mocked using Jest to avoid requiring a real database connection
- **Authentication middleware**: Mocked to bypass auth in unit tests
- **External dependencies**: All external services are mocked

## Future Test Additions

Consider adding:
- Integration tests with a test database
- E2E tests for complete user flows
- Component tests for React UI components
- Performance tests for processing pipeline
