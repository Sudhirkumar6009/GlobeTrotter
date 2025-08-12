# GlobeTrotter API Documentation

## Overview

The GlobeTrotter API is a RESTful service for managing personalized travel planning. It provides endpoints for user authentication, trip management, stops, activities, and budget tracking.

**Base URL**: `http://localhost:5000/api`

**Content-Type**: `application/json` (unless specified otherwise)

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Limit**: 100 requests per IP
- **Window**: 15 minutes

## Data Models

### User
```json
{
  "_id": "ObjectId",
  "name": "string (required, max 100 chars)",
  "email": "string (required, unique, valid email)",
  "country": "string (required)",
  "phone": "string (required)",
  "profilePicture": "string (URL, optional)",
  "preferences": {
    "budget": "string (enum: 'budget', 'moderate', 'luxury')",
    "travelStyle": "string (enum: 'adventure', 'relaxation', 'cultural', 'business', 'family')",
    "preferredActivities": ["string (enum: 'sightseeing', 'food', 'adventure', 'other')"]
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Trip
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: User)",
  "name": "string (required, max 200 chars)",
  "startDate": "Date (required)",
  "endDate": "Date (required, >= startDate)",
  "startTime": "string (optional, format: HH:MM)",
  "endTime": "string (optional, format: HH:MM)",
  "description": "string (optional, max 1000 chars)",
  "coverPhoto": "string (URL, optional)",
  "budget": "number (min: 0, optional)",
  "status": "string (enum: 'planning', 'active', 'completed', 'cancelled', default: 'planning')",
  "visibility": "string (enum: 'public', 'private', default: 'private')",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Stop
```json
{
  "_id": "ObjectId",
  "tripId": "ObjectId (ref: Trip, required)",
  "userId": "ObjectId (ref: User, optional)",
  "city": "string (required, max 100 chars)",
  "category": "string (enum: 'accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other')",
  "startDate": "Date (required)",
  "endDate": "Date (required, >= startDate)",
  "startTime": "string (optional, format: HH:MM)",
  "endTime": "string (optional, format: HH:MM)",
  "address": "string (optional, max 200 chars)",
  "notes": "string (optional, max 500 chars)",
  "estimatedCost": "number (min: 0, optional)",
  "rating": "number (min: 1, max: 5, optional)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Activity
```json
{
  "_id": "ObjectId",
  "stopId": "ObjectId (ref: Stop, required)",
  "userId": "ObjectId (ref: User, optional)",
  "name": "string (required, max 200 chars)",
  "type": "string (enum: 'sightseeing', 'food', 'adventure', 'other')",
  "cost": "number (required, min: 0)",
  "duration": "number (required, min: 1, in minutes)",
  "priority": "string (enum: 'low', 'medium', 'high', default: 'medium')",
  "status": "string (enum: 'planned', 'completed', 'cancelled', default: 'planned')",
  "notes": "string (optional, max 500 chars)",
  "rating": "number (optional, min: 1, max: 5)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Budget
```json
{
  "_id": "ObjectId",
  "tripId": "ObjectId (ref: Trip, required, unique)",
  "userId": "ObjectId (ref: User, optional)",
  "transport": "number (required, min: 0)",
  "stay": "number (required, min: 0)",
  "activities": "number (required, min: 0)",
  "meals": "number (required, min: 0)",
  "miscellaneous": "number (required, min: 0)",
  "totalBudget": "number (calculated field)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## Authentication Endpoints

### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "country": "United States",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400`: Missing required fields
- `409`: Email already in use
- `500`: Server error

---

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Server error

---

### GET /api/auth/me
Get current user information.

**Headers:**
- `Authorization: Bearer <token>` OR
- Request body with `token` field

**Response (200):**
```json
{
  "user": {
    "_id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "country": "United States",
    "phone": "+1234567890",
    "profilePicture": "https://example.com/profile.jpg",
    "preferences": {
      "budget": "moderate",
      "travelStyle": "cultural",
      "preferredActivities": ["sightseeing", "food"]
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Token missing
- `401`: Invalid or expired token

---

### POST /api/auth/verify
Verify if JWT token is valid.

**Headers:**
- `Authorization: Bearer <token>` OR
- Request body with `token` field

**Response (200):**
```json
{
  "valid": true
}
```

**Error Response (401):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

### POST /api/auth/reset-password
Reset user password (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `400`: Missing passwords or new password too short (< 8 chars)
- `401`: Invalid old password or unauthorized
- `404`: User not found
- `500`: Server error

---

### PUT /api/auth/profile
Update user profile.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` OR `multipart/form-data` (for image upload)

**Request Body (JSON):**
```json
{
  "name": "Updated Name",
  "phone": "+9876543210",
  "country": "Canada",
  "preferences": {
    "budget": "luxury",
    "travelStyle": "adventure",
    "preferredActivities": ["adventure", "sightseeing"]
  }
}
```

**Request Body (Form Data):**
```
name: "Updated Name"
phone: "+9876543210"
country: "Canada"
preferences: "{"budget": "luxury", "travelStyle": "adventure"}"
profilePicture: [File]
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "_id": "user-id",
    "name": "Updated Name",
    "email": "john@example.com",
    "phone": "+9876543210",
    "country": "Canada",
    "profilePicture": "https://imagekit.io/uploaded-image-url",
    "preferences": {
      "budget": "luxury",
      "travelStyle": "adventure",
      "preferredActivities": ["adventure", "sightseeing"]
    }
  }
}
```

---

### POST /api/auth/profile/picture/delete
Delete profile picture by URL.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "url": "https://imagekit.io/image-to-delete"
}
```

**Response (200):**
```json
{
  "message": "Profile picture deleted successfully"
}
```

---

### DELETE /api/auth/account
Delete user account permanently.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Trip Endpoints

### GET /api/trips/public
Get all public trips (no authentication required).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "trips": [
    {
      "_id": "trip-id",
      "name": "European Adventure",
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-06-15T00:00:00.000Z",
      "description": "Amazing trip through Europe",
      "coverPhoto": "https://example.com/cover.jpg",
      "budget": 5000,
      "status": "completed",
      "visibility": "public",
      "userId": {
        "name": "John Doe",
        "profilePicture": "https://example.com/profile.jpg"
      }
    }
  ],
  "totalCount": 50,
  "currentPage": 1,
  "totalPages": 5
}
```

---

### POST /api/trips
Create a new trip.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` OR `multipart/form-data` (for image upload)

**Request Body (JSON):**
```json
{
  "name": "Summer Vacation",
  "startDate": "2024-07-01",
  "endDate": "2024-07-15",
  "startTime": "09:00",
  "endTime": "18:00",
  "description": "Relaxing summer vacation",
  "coverPhoto": "https://example.com/cover.jpg",
  "visibility": "private",
  "budget": 3000
}
```

**Response (201):**
```json
{
  "trip": {
    "_id": "trip-id",
    "userId": "user-id",
    "name": "Summer Vacation",
    "startDate": "2024-07-01T00:00:00.000Z",
    "endDate": "2024-07-15T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "18:00",
    "description": "Relaxing summer vacation",
    "coverPhoto": "https://example.com/cover.jpg",
    "budget": 3000,
    "status": "planning",
    "visibility": "private",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/trips
Get user's trips.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status ('planning', 'active', 'completed', 'cancelled')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "trips": [
    {
      "_id": "trip-id",
      "name": "Summer Vacation",
      "startDate": "2024-07-01T00:00:00.000Z",
      "endDate": "2024-07-15T00:00:00.000Z",
      "description": "Relaxing summer vacation",
      "coverPhoto": "https://example.com/cover.jpg",
      "budget": 3000,
      "status": "planning",
      "visibility": "private"
    }
  ],
  "totalCount": 5,
  "currentPage": 1,
  "totalPages": 1
}
```

---

### GET /api/trips/budget/stats
Get budget statistics for user's trips.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "totalTrips": 10,
  "totalBudget": 25000,
  "averageBudget": 2500,
  "budgetRanges": {
    "low": 3,
    "medium": 5,
    "high": 2
  }
}
```

---

### GET /api/trips/budget
Get trips filtered by budget range.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `minBudget` (optional): Minimum budget
- `maxBudget` (optional): Maximum budget

**Response (200):**
```json
{
  "trips": [
    {
      "_id": "trip-id",
      "name": "Budget Trip",
      "budget": 1500,
      "startDate": "2024-08-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/trips/:tripId
Get specific trip details.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "trip": {
    "_id": "trip-id",
    "userId": "user-id",
    "name": "Summer Vacation",
    "startDate": "2024-07-01T00:00:00.000Z",
    "endDate": "2024-07-15T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "18:00",
    "description": "Relaxing summer vacation",
    "coverPhoto": "https://example.com/cover.jpg",
    "budget": 3000,
    "status": "planning",
    "visibility": "private",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PUT /api/trips/:tripId
Update trip details.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json` OR `multipart/form-data`

**Request Body:**
```json
{
  "name": "Updated Trip Name",
  "description": "Updated description",
  "budget": 3500,
  "status": "active"
}
```

**Response (200):**
```json
{
  "message": "Trip updated successfully",
  "trip": {
    "_id": "trip-id",
    "name": "Updated Trip Name",
    "description": "Updated description",
    "budget": 3500,
    "status": "active"
  }
}
```

---

### DELETE /api/trips/:tripId
Delete a trip.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Trip deleted successfully"
}
```

---

### POST /api/trips/image/delete
Delete trip cover image by URL.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "imageUrl": "https://imagekit.io/image-to-delete"
}
```

**Response (200):**
```json
{
  "message": "Image deleted successfully"
}
```

---

## Stop Endpoints

### GET /api/stops/categories
Get all available stop categories.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "categories": [
    "accommodation",
    "transport", 
    "sightseeing",
    "dining",
    "shopping",
    "entertainment",
    "other"
  ]
}
```

---

### GET /api/stops/category/:category
Get stops by category.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "stops": [
    {
      "_id": "stop-id",
      "tripId": "trip-id",
      "city": "Paris",
      "category": "sightseeing",
      "startDate": "2024-07-05T00:00:00.000Z",
      "endDate": "2024-07-05T00:00:00.000Z",
      "address": "Eiffel Tower, Paris",
      "estimatedCost": 25
    }
  ]
}
```

---

### POST /api/stops
Create a new stop.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tripId": "trip-id",
  "city": "Paris",
  "category": "sightseeing",
  "startDate": "2024-07-05",
  "endDate": "2024-07-05",
  "startTime": "10:00",
  "endTime": "16:00",
  "address": "Eiffel Tower, Champ de Mars",
  "notes": "Visit during sunset",
  "estimatedCost": 25,
  "rating": 5
}
```

**Response (201):**
```json
{
  "stop": {
    "_id": "stop-id",
    "tripId": "trip-id",
    "userId": "user-id",
    "city": "Paris",
    "category": "sightseeing",
    "startDate": "2024-07-05T00:00:00.000Z",
    "endDate": "2024-07-05T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "16:00",
    "address": "Eiffel Tower, Champ de Mars",
    "notes": "Visit during sunset",
    "estimatedCost": 25,
    "rating": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/stops/trip/:tripId
Get all stops for a specific trip.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "stops": [
    {
      "_id": "stop-id",
      "tripId": "trip-id",
      "city": "Paris",
      "category": "sightseeing",
      "startDate": "2024-07-05T00:00:00.000Z",
      "endDate": "2024-07-05T00:00:00.000Z",
      "address": "Eiffel Tower",
      "estimatedCost": 25,
      "rating": 5
    }
  ]
}
```

---

### PUT /api/stops/:stopId
Update stop details.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "city": "Updated City",
  "notes": "Updated notes",
  "estimatedCost": 30,
  "rating": 4
}
```

**Response (200):**
```json
{
  "message": "Stop updated successfully",
  "stop": {
    "_id": "stop-id",
    "city": "Updated City",
    "notes": "Updated notes",
    "estimatedCost": 30,
    "rating": 4
  }
}
```

---

### DELETE /api/stops/:stopId
Delete a stop.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Stop deleted successfully"
}
```

---

## Activity Endpoints

### POST /api/activities
Create a new activity.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "stopId": "stop-id",
  "name": "Eiffel Tower Visit",
  "type": "sightseeing",
  "cost": 25,
  "duration": 180,
  "priority": "high",
  "status": "planned",
  "notes": "Take photos at sunset",
  "rating": 5
}
```

**Response (201):**
```json
{
  "activity": {
    "_id": "activity-id",
    "stopId": "stop-id",
    "userId": "user-id",
    "name": "Eiffel Tower Visit",
    "type": "sightseeing",
    "cost": 25,
    "duration": 180,
    "priority": "high",
    "status": "planned",
    "notes": "Take photos at sunset",
    "rating": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/activities/stop/:stopId
Get all activities for a specific stop.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "activities": [
    {
      "_id": "activity-id",
      "stopId": "stop-id",
      "name": "Eiffel Tower Visit",
      "type": "sightseeing",
      "cost": 25,
      "duration": 180,
      "priority": "high",
      "status": "planned",
      "notes": "Take photos at sunset",
      "rating": 5
    }
  ]
}
```

---

### PUT /api/activities/:activityId
Update activity details.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Activity Name",
  "cost": 30,
  "status": "completed",
  "rating": 4
}
```

**Response (200):**
```json
{
  "message": "Activity updated successfully",
  "activity": {
    "_id": "activity-id",
    "name": "Updated Activity Name",
    "cost": 30,
    "status": "completed",
    "rating": 4
  }
}
```

---

### DELETE /api/activities/:activityId
Delete an activity.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Activity deleted successfully"
}
```

---

## Budget Endpoints

### POST /api/budgets
Create or update budget for a trip.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tripId": "trip-id",
  "transport": 1000,
  "stay": 1500,
  "activities": 800,
  "meals": 600,
  "miscellaneous": 300
}
```

**Response (201 or 200):**
```json
{
  "budget": {
    "_id": "budget-id",
    "tripId": "trip-id",
    "userId": "user-id",
    "transport": 1000,
    "stay": 1500,
    "activities": 800,
    "meals": 600,
    "miscellaneous": 300,
    "totalBudget": 4200,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/budgets/trip/:tripId
Get budget for a specific trip.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "budget": {
    "_id": "budget-id",
    "tripId": "trip-id",
    "transport": 1000,
    "stay": 1500,
    "activities": 800,
    "meals": 600,
    "miscellaneous": 300,
    "totalBudget": 4200,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (404) if no budget found:**
```json
{
  "error": "Budget not found for this trip"
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized - Invalid or missing token"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**409 Conflict:**
```json
{
  "error": "Resource already exists"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Server error"
}
```

## File Upload Guidelines

When uploading files (profile pictures, trip cover photos):

- **Supported formats**: JPEG, PNG, WebP
- **Maximum file size**: 5MB
- **Content-Type**: `multipart/form-data`
- Files are uploaded to ImageKit.io and URLs are returned

**Example multipart request:**
```
POST /api/auth/profile
Content-Type: multipart/form-data

name: "John Doe"
country: "USA"
profilePicture: [File object]
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing enabled
- **Rate limiting**: 100 requests per 15 minutes per IP
- **Input sanitization**: MongoDB injection protection
- **JWT expiration**: Tokens expire after 7 days
- **Password hashing**: bcrypt with salt rounds
- **File validation**: Size and type restrictions

## Health Check

### GET /
Simple health check endpoint.

**Response (200):**
```json
{
  "message": "GlobeTrotter API is running!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
- **Password hashing**: bcrypt with salt rounds
- **File validation**: Size and type restrictions

## Health Check

### GET /
Simple health check endpoint.

**Response (200):**
```json
{
  "message": "GlobeTrotter API is running!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
