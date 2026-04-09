# Codeint API Endpoints Reference
**Base URL:** `/api/v1`  
**Auth:** Bearer JWT in `Authorization` header (except `/auth/login`)  
**Roles:** A = Admin | D = Doctor | R = Receptionist

---

## AUTH  `/auth`

| Method | Path             | Access | Description                          |
|--------|------------------|--------|--------------------------------------|
| POST   | `/auth/login`    | Public | Login with mobile + 4-digit PIN → JWT |
| POST   | `/auth/logout`   | All    | Invalidate session / token           |
| GET    | `/auth/me`       | All    | Get current user profile             |
| PUT    | `/auth/change-pin` | All  | Change own PIN (requires old PIN)    |

---

## USERS  `/users`

| Method | Path          | Access | Description                     |
|--------|---------------|--------|---------------------------------|
| GET    | `/users`      | A      | List all users (paginated)      |
| POST   | `/users`      | A      | Create new user                 |
| GET    | `/users/{id}` | A      | Get user by ID                  |
| PUT    | `/users/{id}` | A      | Update user (name, role, etc.)  |
| PATCH  | `/users/{id}/deactivate` | A | Soft-deactivate user      |

---

## TREATMENT TYPES  `/treatment-types`

| Method | Path                     | Access | Description                  |
|--------|--------------------------|--------|------------------------------|
| GET    | `/treatment-types`       | All    | List all active types        |
| POST   | `/treatment-types`       | A      | Create treatment type        |
| GET    | `/treatment-types/{id}`  | All    | Get by ID                    |
| PUT    | `/treatment-types/{id}`  | A      | Update treatment type        |
| DELETE | `/treatment-types/{id}`  | A      | Soft-delete treatment type   |

---

## PATIENTS  `/patients`

| Method | Path                         | Access | Description                                    |
|--------|------------------------------|--------|------------------------------------------------|
| GET    | `/patients`                  | A,D,R  | List/search patients (`?q=name/mobile`)        |
| POST   | `/patients`                  | A,D,R  | Create patient record                          |
| GET    | `/patients/{id}`             | A,D,R  | Full patient profile + dental summary          |
| PUT    | `/patients/{id}`             | A,D    | Update patient info                            |
| GET    | `/patients/{id}/history`     | A,D    | Full treatment timeline (all records)          |

---

## APPOINTMENTS  `/appointments`

| Method | Path                          | Access | Description                                        |
|--------|-------------------------------|--------|----------------------------------------------------|
| GET    | `/appointments`               | A,D,R  | List appointments (`?date=&doctor_id=&status=`)    |
| POST   | `/appointments`               | A,D,R  | Book new appointment                               |
| GET    | `/appointments/{id}`          | A,D,R  | Get appointment detail                             |
| PUT    | `/appointments/{id}`          | A,D,R  | Update appointment                                 |
| PATCH  | `/appointments/{id}/status`   | A,D,R  | Update status only (confirm / complete / cancel)   |
| DELETE | `/appointments/{id}`          | A      | Soft-delete (cancel) appointment                   |
| POST   | `/appointments/{id}/whatsapp-confirm` | A,R | Manually trigger WhatsApp confirmation      |

---

## TREATMENT RECORDS  `/patients/{patient_id}/records`

| Method | Path                                    | Access | Description                                       |
|--------|-----------------------------------------|--------|---------------------------------------------------|
| GET    | `/patients/{pid}/records`               | A,D,R* | List all treatment records (`?status=&doctor_id=`) |
| POST   | `/patients/{pid}/records`               | A,D    | Add treatment record                              |
| GET    | `/patients/{pid}/records/{id}`          | A,D,R* | Get single record                                 |
| PUT    | `/patients/{pid}/records/{id}`          | A,D†   | Edit record (doctor who created or Admin)         |
| DELETE | `/patients/{pid}/records/{id}`          | A      | Soft-delete with mandatory reason                 |

> *R = read-only (no clinical notes displayed to Receptionist)  
> †Doctor can only edit their own records; Admin can edit any

---

## PATIENT IMAGES  `/patients/{patient_id}/images`

| Method | Path                                       | Access | Description                                      |
|--------|--------------------------------------------|--------|--------------------------------------------------|
| GET    | `/patients/{pid}/images`                   | A,D,R* | List images (`?category=&image_type=&record_id=`)|
| POST   | `/patients/{pid}/images`                   | A,D    | Upload image(s) — multipart/form-data            |
| GET    | `/patients/{pid}/images/{id}`              | A,D    | Get image metadata                               |
| GET    | `/patients/{pid}/images/{id}/url`          | A,D    | Get temporary signed S3 URL (15 min expiry)      |
| PATCH  | `/patients/{pid}/images/{id}`              | A,D    | Update metadata (description, category, teeth)   |
| DELETE | `/patients/{pid}/images/{id}`              | A      | Soft-delete with reason                          |

> *R = thumbnails listed, no signed URL access

---

## DENTAL CHART  `/patients/{patient_id}/dental-chart`

| Method | Path                                               | Access | Description                             |
|--------|----------------------------------------------------|--------|-----------------------------------------|
| GET    | `/patients/{pid}/dental-chart`                     | A,D,R  | Full 32-tooth chart state               |
| PUT    | `/patients/{pid}/dental-chart/{tooth_number}`      | A,D    | Update single tooth conditions/surfaces |
| DELETE | `/patients/{pid}/dental-chart/{tooth_number}`      | A      | Reset tooth to blank state              |

---

## TREATMENT PLANS  `/patients/{patient_id}/plans`

| Method | Path                                               | Access | Description                                     |
|--------|----------------------------------------------------|--------|-------------------------------------------------|
| GET    | `/patients/{pid}/plans`                            | A,D,R  | List treatment plans                            |
| POST   | `/patients/{pid}/plans`                            | A,D    | Create new plan                                 |
| GET    | `/patients/{pid}/plans/{id}`                       | A,D,R  | Get plan with all items                         |
| PUT    | `/patients/{pid}/plans/{id}`                       | A,D    | Update plan header                              |
| PATCH  | `/patients/{pid}/plans/{id}/status`                | A,D    | Update plan status                              |
| DELETE | `/patients/{pid}/plans/{id}`                       | A      | Soft-delete plan                                |
| POST   | `/patients/{pid}/plans/{id}/items`                 | A,D    | Add item to plan                                |
| PUT    | `/patients/{pid}/plans/{id}/items/{item_id}`       | A,D    | Update plan item                                |
| DELETE | `/patients/{pid}/plans/{id}/items/{item_id}`       | A,D    | Remove item from plan                           |
| POST   | `/patients/{pid}/plans/{id}/items/{item_id}/convert` | A,D  | Convert plan item → appointment                 |

---

## AUDIT LOGS  `/audit-logs`

| Method | Path                           | Access | Description                                           |
|--------|--------------------------------|--------|-------------------------------------------------------|
| GET    | `/audit-logs`                  | A      | Paginated logs (`?user_id=&entity_type=&from=&to=`)   |
| GET    | `/audit-logs/patient/{pid}`    | A      | All audit events for a specific patient               |

---

## DASHBOARD  `/dashboard`

| Method | Path                          | Access | Description                                           |
|--------|-------------------------------|--------|-------------------------------------------------------|
| GET    | `/dashboard/stats`            | A,D,R  | Today's counts (appointments, patients, completions)  |
| GET    | `/dashboard/appointments/today` | A,D,R | Today's appointment list with patient names          |
| GET    | `/dashboard/appointments/upcoming` | A,D,R | Next 7 days appointments                        |
| GET    | `/dashboard/doctor/{id}/schedule` | A,D | Doctor's weekly schedule                           |

---

## COMMON QUERY PARAMETERS

| Parameter  | Type    | Description                               |
|------------|---------|-------------------------------------------|
| `page`     | int     | Page number (default: 1)                  |
| `per_page` | int     | Items per page (default: 20, max: 100)    |
| `q`        | string  | Full-text search where supported          |
| `from`     | date    | Start date filter (ISO 8601)              |
| `to`       | date    | End date filter (ISO 8601)                |

## COMMON RESPONSE ENVELOPE

```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "pages": 8
  }
}
```

## ERROR RESPONSE

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have permission to access this resource"
  }
}
```

## HTTP STATUS CODES

| Code | Meaning                              |
|------|--------------------------------------|
| 200  | OK                                   |
| 201  | Created                              |
| 400  | Bad Request / Validation Error       |
| 401  | Unauthenticated (no/invalid token)   |
| 403  | Forbidden (role not allowed)         |
| 404  | Resource not found                   |
| 409  | Conflict (duplicate mobile, etc.)    |
| 413  | Payload too large (file upload)      |
| 422  | Unprocessable Entity (Pydantic)      |
| 500  | Internal Server Error                |
