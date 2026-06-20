# Bugfix Requirements Document

## Introduction

QuizApp-v5 contains ten distinct bugs spanning the admin frontend, user frontend, and backend. Collectively they make the admin panel inoperable (all API calls fail with a ReferenceError), prevent quiz results from ever being saved, break admin authentication, leave protected routes completely unguarded, cause quiz navigation to silently fail in the user frontend, and leave dead model files that risk stale-collection usage. This document captures the defective behaviors, the correct target behaviors, and the existing behaviors that must be preserved.

---

## Glossary

| Term | Definition |
|---|---|
| `API_BASE_URL` | The base URL constant exported from `AdminFrontend/src/config/api.js` used by every admin API call |
| `VITE_API_BASE_URL` | Vite environment variable injected at build time; takes priority over the hardcoded fallback |
| `adminToken` | The key name used in `localStorage` to store the admin JWT (set in `adminLogin.jsx`) |
| `verifyToken` | Express middleware in `authController.js` responsible for JWT verification |
| `requireAdmin` | Express middleware (to be added in `index.js`) that checks `req.user.role === 'admin'` |
| Bearer token | HTTP Authorization header value in the form `Bearer <jwt>` |
| `quiz._id` | The MongoDB ObjectId of a quiz document, returned by Mongoose as `_id`; the virtual `id` field is a string alias but is absent on plain objects |
| alphanumeric userId | A user identifier in the format `U` followed by digits (e.g. `"U001"`), used throughout the user frontend |

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the admin frontend module `AdminFrontend/src/config/api.js` is evaluated by the JavaScript engine THEN the engine throws a `ReferenceError: API_BASE_URL is not defined` because the constant is declared as `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || \`${API_BASE_URL}\`` — the right-hand side template literal references the identifier being declared before it has a value — causing every admin API call to fail at module load time.

1.2 WHEN a student submits a quiz result to `POST /api/quizzes/:quizId/submit` with a `userId` value such as `"U001"` THEN the system returns HTTP 500 with a Mongoose `CastError: Cast to ObjectId failed for value "U001"` because `quizResultModel.js` declares `userId` as `{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }` and the value cannot be cast to a MongoDB ObjectId.

1.3 WHEN an admin attempts to log in via `POST /api/user/logging` with an email and password that exist in the `User` collection THEN the system returns HTTP 404 `"User not found."` because `sinupRoute.js` queries `logModel.js` (the `SignUp` collection, which stores only standalone registrations) instead of `userModel.js` (the unified `User` collection), so accounts created via User Management are never found.

1.4 WHEN any request arrives at `GET /api/auth/verify` — the only route that currently mounts `verifyToken` — THEN the middleware calls `next()` unconditionally without reading the `Authorization` header or calling `jwt.verify`, so any request, with or without a token, passes through unchallenged.

1.5 WHEN any HTTP request targets an admin-protected route (all routes in `userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`) THEN the system processes the request with no identity check because `index.js` mounts these route groups with no authentication middleware — neither `verifyToken` nor `requireAdmin` is applied.

1.6 WHEN the admin frontend makes an HTTP call to any backend endpoint that requires authentication THEN the request is sent without an `Authorization` header because the admin frontend has no centralized axios interceptor or fetch wrapper that injects the `adminToken` stored in `localStorage`, causing the backend to return HTTP 401 or 403.

1.7 WHEN an admin clicks the Logout button in the admin header (`AdminFrontend/src/components/adminHeader.jsx`) THEN the browser navigates to the literal path `"LoginPage"` (a non-existent route that renders a 404) and the `adminToken`, `token`, and `userId` keys remain in `localStorage`, leaving the session active.

1.8 WHEN the admin frontend makes any request to a category endpoint (`/api/add-category`, `/api/categories`, `/api/delete-category/:id`, `/api/update-category/:id`) THEN the backend returns HTTP 404 because `categoryRoutes.js` does not exist in `Backend/routes/` and no category route group is mounted in `index.js`.

1.9 WHEN the user frontend renders the quiz list in `quizList.jsx` and a user clicks "Start Quiz" THEN the application navigates to `/quiz/undefined` because the component references `quiz.id` (a virtual Mongoose string alias that is absent on plain JSON objects) instead of `quiz._id`. Additionally, the `navigate()` call passes no route state, so the destination `quizCard` component receives no question data and crashes with a "No question data" error.

1.10 WHEN `sinupRoute.js` imports `logModel.js` THEN the backend uses a standalone `SignUp` collection (email and password only, no `userId`, no `role`) that duplicates authentication concerns already handled by `userModel.js`, creating a split-collection bug where admin registrations land in `SignUp` while User Management reads from `User`.

---

### Expected Behavior (Correct)

2.1 WHEN the admin frontend module `AdminFrontend/src/config/api.js` is evaluated THEN the system SHALL export `API_BASE_URL` as the value of `import.meta.env.VITE_API_BASE_URL` when that variable is defined, or as the string literal `'http://localhost:4000'` when it is not defined, with no self-reference on the right-hand side.

2.2 WHEN a student submits a quiz result with a `userId` matching the pattern `U` followed by one or more digits (e.g. `"U001"`, `"U42"`) THEN the system SHALL accept the value and persist the result document — including `userId`, `quizId`, `score`, `answers`, and `timestamp` — returning HTTP 200.

2.2.1 IF the `userId` field is absent or empty in the request body THEN the system SHALL return HTTP 400 with an error message indicating that `userId` is required.

2.3 WHEN an admin submits valid credentials (`email`, `password`) to `POST /api/user/logging` and an account with `role: 'admin'` exists in the `User` collection for that email THEN the system SHALL verify the password using `userModel`'s `comparePassword` method and return HTTP 200 with a signed JWT containing `{ id, email, role: 'admin' }` and a 1-hour expiry.

2.3.1 IF no `User` document with the submitted email and `role: 'admin'` exists THEN the system SHALL return HTTP 404.

2.3.2 IF the password does not match THEN the system SHALL return HTTP 401.

2.3.3 IF a `User` document exists for the email but its `role` is not `'admin'` THEN the system SHALL return HTTP 403 to prevent non-admin users from obtaining an admin token.

2.4 WHEN a request arrives at a protected route and the `Authorization` header is present and well-formed (`Bearer <jwt>`) THEN the `verifyToken` middleware SHALL call `jwt.verify(token, process.env.JWT_SECRET)`, attach the decoded payload (at minimum `{ id, role }`) to `req.user`, and call `next()`.

2.4.1 IF the `Authorization` header is absent THEN `verifyToken` SHALL return HTTP 401 with `{ message: 'Authentication token required' }`.

2.4.2 IF the `Authorization` header is present but the token is expired, malformed, or signed with a different secret THEN `verifyToken` SHALL return HTTP 401 with `{ message: 'Invalid or expired token' }`.

2.4.3 IF the `Authorization` header is present but does not start with `Bearer ` THEN `verifyToken` SHALL return HTTP 401 with `{ message: 'Authentication token required' }`.

2.5 WHEN `index.js` mounts the admin-protected route groups (`userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`) THEN each group SHALL be preceded by both `verifyToken` and `requireAdmin` middleware in that order.

2.5.1 WHEN `requireAdmin` runs after a successful `verifyToken` call and `req.user.role` equals `'admin'` THEN it SHALL call `next()`.

2.5.2 WHEN `requireAdmin` runs and `req.user.role` is any value other than `'admin'` THEN it SHALL return HTTP 403 with `{ message: 'Admin access required' }`.

2.5.3 WHEN `index.js` mounts the public routes (`sinupRoute` at `/api/user`, `contactRoutes` at `/api/contact`, `authRoutes` at `/api/auth`) THEN these routes SHALL be accessible without any authentication middleware.

2.5.4 WHEN `index.js` mounts `quizResultRoutes` THEN this route group SHALL be preceded by `verifyToken` only (no `requireAdmin`), allowing authenticated non-admin users to submit results.

2.6 WHEN the admin frontend creates an axios instance in `AdminFrontend/src/config/axios.js` THEN the instance SHALL attach a request interceptor that reads `localStorage.getItem('adminToken')` and sets `config.headers.Authorization = 'Bearer ' + token` on every outgoing request when the token is present.

2.6.1 IF `localStorage.getItem('adminToken')` returns `null` or an empty string THEN the interceptor SHALL send the request without an `Authorization` header.

2.6.2 WHEN admin frontend components that currently use bare `fetch()` calls to protected endpoints are updated THEN those calls SHALL include the `Authorization: Bearer <adminToken>` header explicitly.

2.7 WHEN an admin clicks the Logout button in `adminHeader.jsx` THEN the `onClick` handler SHALL call `localStorage.removeItem('adminToken')`, `localStorage.removeItem('token')`, and `localStorage.removeItem('userId')`, and the anchor's `href` SHALL be `/logging` so the browser navigates to the correct login page.

2.8 WHEN a `GET /api/categories` request is received THEN the system SHALL return HTTP 200 with a JSON array of all category documents sorted by `createdAt` descending.

2.8.1 WHEN a `POST /api/add-category` request is received with a `name` field in the body THEN the system SHALL create the category document and return HTTP 201 with `{ message, category }`.

2.8.2 IF a `POST /api/add-category` request is received without a `name` field THEN the system SHALL return HTTP 400.

2.8.3 WHEN a `PUT /api/update-category/:id` request is received with a valid document id THEN the system SHALL update the document and return HTTP 200 with the updated category.

2.8.4 WHEN a `DELETE /api/delete-category/:id` request is received with a valid document id THEN the system SHALL delete the document and return HTTP 200.

2.8.5 IF any category request targets an id that does not exist in the database THEN the system SHALL return HTTP 404.

2.9 WHEN `quizList.jsx` renders the quiz list THEN each list item's `key` prop and the `navigate()` call inside the "Start Quiz" button SHALL both use `quiz._id`.

2.9.1 WHEN a user clicks "Start Quiz" THEN the `navigate()` call SHALL pass route state `{ quizId: quiz._id, quizName: quiz.quizName, question: quiz.question }` so that `quizCard` receives the data it needs to render without crashing.

2.10 WHEN `sinupRoute.js` handles admin registration and login THEN it SHALL import and query `userModel.js` (the `User` collection) instead of `logModel.js` (the `SignUp` collection), so that admin accounts are stored in and retrieved from the same collection used by User Management.

2.10.1 WHEN `sinupRoute.js` creates a new admin account THEN the new `User` document SHALL include a `userId` field derived from the email local-part, a `name` field, an `email` field, a `password` field (hashed by the model's `pre('save')` hook), and `role: 'admin'`.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `VITE_API_BASE_URL` is explicitly set in the admin frontend's `.env` file THEN the system SHALL CONTINUE TO use that environment variable's value as `API_BASE_URL`, with the `'http://localhost:4000'` literal used only as a fallback.

3.2 WHEN a student submits a quiz result with a valid alphanumeric `userId` and a valid MongoDB ObjectId `quizId` THEN the system SHALL CONTINUE TO persist the `score`, `answers` map, and `timestamp` fields exactly as before.

3.3 WHEN a regular user (non-admin) logs in via the user frontend's `POST /api/users/login` endpoint THEN the system SHALL CONTINUE TO authenticate against the `User` collection and receive a valid JWT, without any change to that login flow.

3.4 WHEN a request carrying a valid, unexpired JWT arrives at a protected route after the `verifyToken` fix THEN the system SHALL CONTINUE TO allow the request through to the protected route handler.

3.5 WHEN a request is made to the public routes (`POST /api/user/register`, `POST /api/user/logging`, `POST /api/contact`, `GET /api/auth/verify`) THEN the system SHALL CONTINUE TO serve those routes without requiring an `Authorization` header.

3.6 WHEN the user frontend makes API calls using its existing `axios` setup in `userFrontend/src/config/api.js` THEN those calls SHALL CONTINUE TO function without modification.

3.7 WHEN a logged-in admin navigates between admin pages THEN the session stored in `localStorage` SHALL CONTINUE TO be maintained and all authenticated pages SHALL CONTINUE TO render correctly after the logout fix is applied.

3.8 WHEN category documents already exist in the database THEN `GET /api/categories` SHALL CONTINUE TO return them in the response array.

3.9 WHEN the quiz list is rendered in `quizList.jsx` THEN the quiz name (`quiz.quizName`) and question text (nested at `quiz.question.questionText`) SHALL CONTINUE TO display correctly for each quiz after the `_id` fix.

3.10 WHEN `userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`, and `quizResultRoutes` are called with a valid admin JWT THEN they SHALL CONTINUE TO handle requests and return responses exactly as before — the auth middleware wrapping must not alter their internal logic.

---

## Bug Condition Summary

```pascal
// Bug 1: Self-referencing API config
FUNCTION isBugCondition_1(env)
  RETURN env.VITE_API_BASE_URL is undefined AND API_BASE_URL fallback references itself
END FUNCTION
// Fix F': export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

// Bug 2: ObjectId cast on alphanumeric userId
FUNCTION isBugCondition_2(quizResult)
  RETURN quizResult.userId matches /^U\d+$/ (e.g. "U001")
    AND quizResultSchema.userId.type = mongoose.Schema.Types.ObjectId
END FUNCTION
// Fix F': quizResultSchema.userId = { type: String, required: true }

// Bug 3: Wrong model in sinupRoute login
FUNCTION isBugCondition_3(loginRequest)
  RETURN admin account stored in User collection
    AND sinupRoute queries SignUp (logModel) collection instead
END FUNCTION
// Fix F': sinupRoute imports User (userModel) and queries { email, role: 'admin' }

// Bug 4: No-op verifyToken middleware
FUNCTION isBugCondition_4(request)
  RETURN verifyToken calls next() without reading Authorization header
END FUNCTION
// Fix F': jwt.verify(token, JWT_SECRET); missing/invalid → HTTP 401

// Bug 5: No auth middleware on admin routes
FUNCTION isBugCondition_5(request)
  RETURN request.path matches any admin-protected route group
    AND no verifyToken or requireAdmin middleware in chain
END FUNCTION
// Fix F': app.use('/api', verifyToken, requireAdmin, <adminRouteGroup>)

// Bug 6: Missing Authorization header in admin frontend
FUNCTION isBugCondition_6(apiCall)
  RETURN apiCall originates from admin frontend
    AND localStorage.adminToken exists
    AND request has no Authorization header
END FUNCTION
// Fix F': axios interceptor reads adminToken and sets Authorization header

// Bug 7: Broken logout href and missing token cleanup
FUNCTION isBugCondition_7(logoutClick)
  RETURN admin clicks Logout
    AND href = "LoginPage" (non-existent route)
    AND localStorage tokens not cleared
END FUNCTION
// Fix F': href = "/logging"; onClick clears adminToken, token, userId from localStorage

// Bug 8: Missing category routes (404)
FUNCTION isBugCondition_8(request)
  RETURN request.path in ['/api/categories', '/api/add-category',
                           '/api/delete-category/:id', '/api/update-category/:id']
    AND categoryRoutes not mounted in index.js
END FUNCTION
// Fix F': categoryRoutes.js created; app.use('/api', verifyToken, requireAdmin, categoryRoutes)

// Bug 9: quiz.id vs quiz._id and missing route state
FUNCTION isBugCondition_9(quiz)
  RETURN quiz object is a plain JSON object from axios response
    AND component uses quiz.id (undefined on plain objects)
    AND navigate() passes no route state
END FUNCTION
// Fix F': key={quiz._id}; navigate(`/quiz/${quiz._id}`, { state: { quizId, quizName, question } })

// Bug 10: logModel split-collection bug
FUNCTION isBugCondition_10(route)
  RETURN route = sinupRoute
    AND route imports logModel (SignUp collection)
    AND admin accounts exist only in User collection
END FUNCTION
// Fix F': sinupRoute imports userModel; admin User doc includes userId, name, role fields

// Preservation property for all bugs:
FOR ALL X WHERE NOT isBugCondition_N(X) DO
  ASSERT F(X) = F'(X)   // existing behavior unchanged for non-buggy inputs
END FOR
```
