# QuizApp-v5 Critical Fixes — Bugfix Design

## Overview

QuizApp-v5 contains ten bugs that collectively make the admin panel inoperable, prevent quiz
results from being saved, break admin authentication, leave protected routes completely open,
cause quiz navigation to silently fail in the user frontend, and create a split-collection
inconsistency in the database layer.

The fix strategy is targeted and minimal: each bug is corrected in isolation with no changes
to unaffected code paths. The guiding rule for every change is **isBugCondition(X) → fix;
¬isBugCondition(X) → leave unchanged.**

---

## Glossary

| Term | Definition |
| --- | --- |
| **Bug_Condition (C)** | The condition C(X) that identifies inputs or states that trigger a specific bug |
| **Property (P)** | The desired behavior P(result) that must hold for all inputs where C(X) is true |
| **Preservation** | All behaviors that must remain byte-for-byte identical for inputs where C(X) is false |
| **F** | The original (unfixed) function or code path |
| **F'** | The fixed function or code path |
| **Counterexample** | A concrete input that demonstrates the bug on the unfixed code |
| `API_BASE_URL` | Constant exported from `AdminFrontend/src/config/api.js`; used by every admin API call |
| `VITE_API_BASE_URL` | Vite build-time environment variable; takes priority over the hardcoded fallback |
| `adminToken` | Key name in `localStorage` used to store the admin JWT (set by `adminLogin.jsx`) |
| `verifyToken` | Express middleware in `authController.js` responsible for JWT verification |
| `requireAdmin` | Express middleware (to be added in `index.js`) that enforces `req.user.role === 'admin'` |
| Bearer token | HTTP Authorization header value in the form `Bearer <jwt>` |
| `quiz._id` | The MongoDB ObjectId of a quiz document as returned in plain JSON; `quiz.id` is a Mongoose virtual that does not exist on plain objects |
| alphanumeric userId | User identifier in the format `U` followed one or more digits, e.g. `"U001"` |
| `SignUp` collection | MongoDB collection backed by `logModel.js`; stores email + password only |
| `User` collection | MongoDB collection backed by `userModel.js`; stores userId, name, email, password, role |

---

## Bug Details

### Bug 1 — Self-referencing `API_BASE_URL` in `api.js`

**Affected file:** `AdminFrontend/src/config/api.js`

The constant declaration reads its own identifier before it has been assigned:

```js
// DEFECTIVE
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}`;
```

The template literal `` `${API_BASE_URL}` `` on the right-hand side references `API_BASE_URL`,
which is in the temporal dead zone at that point. The JavaScript engine throws a `ReferenceError`
at module load time, causing every single admin API call to fail before it is even issued.

**Formal Specification:**

```
FUNCTION isBugCondition_1(env)
  INPUT: env — the Vite import.meta.env object at module evaluation time
  OUTPUT: boolean

  RETURN env.VITE_API_BASE_URL is undefined
         AND the fallback expression references API_BASE_URL itself
END FUNCTION
```

**Concrete Examples:**

- `.env` absent → `VITE_API_BASE_URL` is `undefined` → fallback evaluates `` `${API_BASE_URL}` `` → ReferenceError thrown.
- `.env` present with `VITE_API_BASE_URL=http://localhost:4000` → short-circuit prevents the fallback from being evaluated → no error (but the fallback is still broken for anyone without `.env`).

---

### Bug 2 — ObjectId cast error on alphanumeric `userId`

**Affected file:** `Backend/models/quizResultModel.js`

```js
// DEFECTIVE
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
```

The user frontend stores user identifiers as strings like `"U001"`. Mongoose attempts to cast
this to a MongoDB ObjectId, which fails and throws `CastError: Cast to ObjectId failed for
value "U001"`, returning HTTP 500 to the student.

**Formal Specification:**

```
FUNCTION isBugCondition_2(quizResult)
  INPUT: quizResult — the document being saved to QuizResult
  OUTPUT: boolean

  RETURN quizResult.userId matches /^U\d+$/
         AND quizResultSchema.userId.type = mongoose.Schema.Types.ObjectId
END FUNCTION
```

**Concrete Examples:**

- `userId = "U001"` → CastError, HTTP 500.
- `userId = "U42"` → CastError, HTTP 500.
- `userId = "507f1f77bcf86cd799439011"` (valid ObjectId string) → no error (not a bug condition).

---

### Bug 3 — Wrong model in `sinupRoute.js` for admin login

**Affected file:** `Backend/routes/sinupRoute.js`

```js
// DEFECTIVE
import SignUp from '../models/logModel.js';
// ...
const user = await SignUp.findOne({ email }); // queries SignUp / logModel collection
```

Admin accounts created through User Management are stored in the `User` collection
(via `userModel.js`). The login route queries the `SignUp` (`logModel`) collection instead,
so it never finds those accounts and always returns HTTP 404.

**Formal Specification:**

```
FUNCTION isBugCondition_3(loginRequest)
  INPUT: loginRequest — POST /api/user/logging with { email, password }
  OUTPUT: boolean

  RETURN User collection contains a document with loginRequest.email
         AND sinupRoute queries SignUp collection (logModel) not User collection
END FUNCTION
```

**Concrete Examples:**

- Admin account `{ email: "admin@quiz.com", role: "admin" }` exists in `User` → `SignUp.findOne({ email })` returns `null` → HTTP 404 "User not found."
- Registration via `sinupRoute /register` creates a doc in `SignUp` → login finds it; but this doc has no `role` field (split-collection issue, see Bug 10).

---

### Bug 4 — No-op `verifyToken` middleware

**Affected file:** `Backend/controllers/authController.js`

```js
// DEFECTIVE
export const verifyToken = (req, res, next) => {
  // Middleware placeholder
  next();
};
```

The middleware unconditionally calls `next()` without inspecting the `Authorization` header or
verifying the JWT. Every request — authenticated or not — passes through as if it were valid.

**Formal Specification:**

```
FUNCTION isBugCondition_4(request)
  INPUT: request — any HTTP request reaching verifyToken
  OUTPUT: boolean

  RETURN verifyToken calls next() WITHOUT reading request.headers.authorization
         AND WITHOUT calling jwt.verify(token, secret)
END FUNCTION
```

**Concrete Examples:**

- Request with no `Authorization` header → passes through → reaches protected handler → unintended data exposure.
- Request with a completely fabricated token → passes through → caller gets admin-level response.

---

### Bug 5 — No authentication middleware on admin-protected routes

**Affected file:** `Backend/index.js`

```js
// DEFECTIVE — no middleware before admin route groups
app.use('/api', userRoutes);
app.use('/api', moduleRoutes);
app.use('/api', quizRoutes);
// ...
```

None of the admin-protected route groups have `verifyToken` or `requireAdmin` in their
middleware chain. Any unauthenticated request reaches the route handlers directly.

**Formal Specification:**

```
FUNCTION isBugCondition_5(request)
  INPUT: request — any HTTP request targeting an admin-protected route group
  OUTPUT: boolean

  RETURN request.path is within userRoutes, moduleRoutes, quizRoutes,
                            bookRoutes, voiceExamRoutes, OR dashboardRoutes
         AND middleware chain contains no verifyToken or requireAdmin
END FUNCTION
```

**Concrete Examples:**

- `GET /api/users` with no token → returns user list (HTTP 200) — should be HTTP 401.
- `DELETE /api/quizzes/123` with no token → deletes the quiz — should be HTTP 401.

---

### Bug 6 — Missing `Authorization` header injection in admin frontend API calls

**Missing file:** `AdminFrontend/src/config/axios.js` (does not exist)

The admin frontend has no centralized axios instance with a request interceptor. Every API call
to a protected endpoint is sent without an `Authorization` header, causing the backend to return
HTTP 401/403 after Bug 4 and Bug 5 are fixed.

**Formal Specification:**

```
FUNCTION isBugCondition_6(apiCall)
  INPUT: apiCall — an outgoing HTTP request from the admin frontend
  OUTPUT: boolean

  RETURN localStorage.getItem('adminToken') is not null
         AND apiCall.headers.Authorization is absent
         AND apiCall targets a protected backend endpoint
END FUNCTION
```

**Concrete Examples:**

- Admin logged in, `adminToken` in localStorage, `GET /api/users` called → no Authorization header → HTTP 401.
- After Bug 5 is fixed, all existing admin page requests will fail until this bug is also fixed.

---

### Bug 7 — Broken logout `href` and missing token cleanup

**Affected file:** `AdminFrontend/src/components/adminHeader.jsx`

```jsx
// DEFECTIVE
<a id="logout" href="LoginPage">Logout</a>
```

`href="LoginPage"` is a relative path that resolves to `/LoginPage`, which has no matching route
and renders a 404. Additionally, no `onClick` handler clears `adminToken`, `token`, or `userId`
from `localStorage`, so the admin session persists after the user believes they have logged out.

**Formal Specification:**

```
FUNCTION isBugCondition_7(logoutClick)
  INPUT: logoutClick — a click event on the Logout anchor
  OUTPUT: boolean

  RETURN anchor.href resolves to a non-existent route ("LoginPage")
         OR localStorage still contains 'adminToken', 'token', or 'userId'
            after the click is handled
END FUNCTION
```

**Concrete Examples:**

- Admin clicks Logout → browser navigates to `/LoginPage` → 404 page.
- Admin revisits the app in the same tab → `adminToken` still in localStorage → treated as logged in.

---

### Bug 8 — Missing category routes

**Missing file:** `Backend/routes/categoryRoutes.js` (does not exist)

The admin frontend makes requests to `/api/categories`, `/api/add-category`,
`/api/update-category/:id`, and `/api/delete-category/:id`. Neither the route file nor the
`app.use(...)` mount exist in `index.js`, so all category requests return HTTP 404.

**Formal Specification:**

```
FUNCTION isBugCondition_8(request)
  INPUT: request — any HTTP request
  OUTPUT: boolean

  RETURN request.path matches one of:
           GET  /api/categories
           POST /api/add-category
           PUT  /api/update-category/:id
           DELETE /api/delete-category/:id
         AND categoryRoutes is not mounted in index.js
END FUNCTION
```

**Concrete Examples:**

- Admin opens Category Management page → `GET /api/categories` → HTTP 404 → empty list, no CRUD possible.
- Admin tries to add a category → `POST /api/add-category` → HTTP 404 → silent failure.

---

### Bug 9 — `quiz.id` vs `quiz._id` and missing route state

**Affected file:** `userFrontend/src/components/quizList.jsx`

```jsx
// DEFECTIVE
<li key={quiz.id}>
  <button onClick={() => navigate(`/quiz/${quiz.id}`)}>Start Quiz</button>
```

Plain JSON objects returned by `axios.get` do not carry the Mongoose virtual `id` getter.
`quiz.id` is `undefined` for every item, causing:

1. React renders all list items with `key={undefined}` (duplicate key warning, unpredictable rendering).
2. Navigation goes to `/quiz/undefined` — the route exists but receives no valid ID.
3. The `navigate()` call passes no route state, so `quizCard` receives no question data and crashes.

**Formal Specification:**

```
FUNCTION isBugCondition_9(quiz)
  INPUT: quiz — a plain JSON object from the axios response array
  OUTPUT: boolean

  RETURN quiz.id is undefined (Mongoose virtual absent on plain JSON)
         AND component uses quiz.id for key prop and navigate path
         AND navigate() is called without route state
END FUNCTION
```

**Concrete Examples:**

- `quiz = { _id: "64abc...", quizName: "Math", question: {...} }` → `quiz.id` is `undefined` → `navigate("/quiz/undefined")`.
- `quizCard` reads `location.state` → `undefined` → crashes with "No question data".

---

### Bug 10 — `logModel` split-collection bug in `sinupRoute.js`

**Affected file:** `Backend/routes/sinupRoute.js`

The route imports `logModel` (the `SignUp` collection), which stores only `email` and `password`
with no `userId`, `name`, or `role` fields. Admin registrations via `/api/user/register` land in
`SignUp`, while all User Management operations read from `User`. This creates two divergent stores
for admin accounts, making cross-component lookups impossible.

**Formal Specification:**

```
FUNCTION isBugCondition_10(route)
  INPUT: route — the sinupRoute module
  OUTPUT: boolean

  RETURN route imports logModel (SignUp collection)
         AND admin accounts are intended to live in User collection
         AND SignUp documents lack userId, role, and name fields
END FUNCTION
```

**Concrete Examples:**

- Admin registers via `/api/user/register` → document saved to `SignUp` (no role, no userId).
- User Management `GET /api/users` queries `User` collection → newly registered admin is invisible.
- After Bug 3 fix (querying `User` for login), any account registered via the old `logModel` path is permanently unreachable.

---

## Expected Behavior

### Preservation Requirements

The following behaviors must remain completely unchanged after all fixes are applied:

**Unchanged Behaviors:**
- When `VITE_API_BASE_URL` is set in `.env`, it continues to be used as `API_BASE_URL` (Bug 1 fix only changes the fallback expression).
- Quiz results submitted with a valid `quizId` (MongoDB ObjectId) and any `userId` string continue to persist `score`, `answers`, and `timestamp` exactly as before (Bug 2 fix only relaxes the `userId` type).
- Regular user (non-admin) login via `POST /api/users/login` continues to authenticate against the `User` collection and return a valid JWT without any change (Bug 3 fix does not touch `userRoutes`).
- A request carrying a valid, unexpired JWT continues to pass through `verifyToken` and reach the protected route handler (Bug 4 fix only adds rejection logic for invalid/absent tokens).
- Public routes (`POST /api/user/register`, `POST /api/user/logging`, `POST /api/contact`, `GET /api/auth/verify`) continue to be accessible without an `Authorization` header (Bug 5 fix only wraps admin route groups).
- The user frontend's existing axios setup in `userFrontend/src/config/api.js` is not modified (Bug 6 fix is admin-frontend-only).
- An already-authenticated admin continues to navigate between admin pages with their session intact (Bug 7 fix only adds token-clearing logic on logout).
- Existing category documents in the database continue to be returned by `GET /api/categories` once the route exists (Bug 8 fix is additive).
- Quiz name (`quiz.quizName`) and question text (`quiz.question.questionText`) continue to display correctly in `quizList.jsx` after the `_id` fix (Bug 9 fix does not change data fetching).
- All admin route groups (`userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`, `quizResultRoutes`) continue to handle requests and return responses exactly as before when called with a valid admin JWT (Bug 5 fix wraps them; internal logic is untouched).

**Scope:**
All inputs that do not satisfy any of the ten bug conditions above must be completely unaffected.
This includes all user-frontend flows, all public API endpoints, all existing admin API handlers
(their internal logic), and all Mongoose schemas not explicitly modified.

---

## Hypothesized Root Cause

### Bug 1
**Copy-paste or refactoring error.** The developer likely intended to reference a string literal
like `'http://localhost:4000'` but accidentally typed `` `${API_BASE_URL}` `` (perhaps copying
from a usage site), creating a circular reference in the declaration.

### Bug 2
**Schema designed for ObjectId-based user references without accounting for the user frontend's
string-based `userId` scheme.** The `User` model defines `userId` as a `String`, but the
`QuizResult` schema was written expecting a MongoDB ObjectId reference. The two schemas were
authored independently without alignment.

### Bug 3
**`sinupRoute.js` was written early in development using `logModel` as a standalone auth store,
before `userModel` became the canonical user collection.** The login route was never updated to
point at `userModel` when User Management was built.

### Bug 4
**`authController.js` was scaffolded as a placeholder and never completed.** The `next()` call
is the default stub. The developer forgot to replace it with actual JWT verification logic before
shipping.

### Bug 5
**`index.js` mounts routes without middleware guards.** Either the developer assumed `verifyToken`
was already functional (it was not — Bug 4), or the authentication middleware application was
deferred and never completed.

### Bug 6
**No centralized HTTP client was created for the admin frontend.** Each page component makes
standalone `fetch()` or `axios` calls without knowledge of the auth token, a common oversight
when authentication is added after the API layer is already written.

### Bug 7
**The `href` value is a component name rather than a URL path.** The developer likely confused
the React component name `LoginPage` with the route path `/logging`. The missing `onClick`
cleanup suggests the logout handler was never implemented, only the navigation link.

### Bug 8
**Category management was added to the admin frontend UI but the backend route file was never
created.** The route mounting in `index.js` was likewise omitted.

### Bug 9
**Confusion between Mongoose document behavior and plain JSON.** When `mongoose.Document` is
serialized to JSON (e.g., via `axios` response), the virtual `id` getter is not present. The
developer used `quiz.id` (which works on in-process Mongoose documents) without realizing the
frontend receives plain objects. The missing route state is a separate omission — the developer
never passed the quiz data to `quizCard`.

### Bug 10
**Architectural drift.** `logModel` was the original auth model and `sinupRoute.js` was written
against it. As the project evolved, `userModel` became the authoritative user store, but
`sinupRoute.js` was never migrated.

---

## Correctness Properties

Property 1: Bug Condition — Admin Frontend Module Loads Without Error

_For any_ evaluation of `AdminFrontend/src/config/api.js` where `VITE_API_BASE_URL` is not
defined in the build environment, the fixed module SHALL export `API_BASE_URL` as the string
literal `'http://localhost:4000'` without throwing a `ReferenceError`.

**Validates: Requirements 2.1, 3.1**

---

Property 2: Bug Condition — Alphanumeric `userId` Accepted by `QuizResult`

_For any_ quiz result document where `userId` matches the pattern `/^U\d+$/` (e.g. `"U001"`),
the fixed `QuizResult.save()` SHALL succeed and persist the document, returning HTTP 200 to the
caller.

**Validates: Requirements 2.2, 2.2.1**

---

Property 3: Bug Condition — Admin Login Queries the Correct Collection

_For any_ login request to `POST /api/user/logging` where an account with the given email and
`role: 'admin'` exists in the `User` collection, the fixed route SHALL verify the password
using `userModel.comparePassword` and return HTTP 200 with a signed JWT.

**Validates: Requirements 2.3, 2.3.1, 2.3.2, 2.3.3**

---

Property 4: Bug Condition — `verifyToken` Rejects Invalid/Absent Tokens

_For any_ HTTP request where the `Authorization` header is absent, malformed, expired, or
signed with an incorrect secret, the fixed `verifyToken` middleware SHALL return HTTP 401
and not call `next()`.

**Validates: Requirements 2.4, 2.4.1, 2.4.2, 2.4.3**

---

Property 5: Preservation — `verifyToken` Passes Valid Tokens Through

_For any_ HTTP request where the `Authorization` header is present, well-formed, and contains
a valid unexpired JWT signed with the correct secret, the fixed `verifyToken` SHALL attach the
decoded payload to `req.user` and call `next()`, preserving all downstream behavior.

**Validates: Requirements 3.4**

---

Property 6: Bug Condition — Admin Routes Require Authentication

_For any_ HTTP request targeting `userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`,
`voiceExamRoutes`, or `dashboardRoutes` without a valid admin JWT, the fixed `index.js` SHALL
return HTTP 401 (missing/invalid token) or HTTP 403 (non-admin role) before the route handler
is reached.

**Validates: Requirements 2.5, 2.5.1, 2.5.2, 2.5.3, 2.5.4**

---

Property 7: Bug Condition — Admin Frontend Requests Include Authorization Header

_For any_ outgoing admin frontend API request where `localStorage.getItem('adminToken')` is
non-null, the fixed axios interceptor SHALL set `Authorization: Bearer <adminToken>` on the
request headers before the request is sent.

**Validates: Requirements 2.6, 2.6.1, 2.6.2**

---

Property 8: Bug Condition — Logout Clears Tokens and Navigates Correctly

_For any_ admin click on the Logout element, the fixed `adminHeader.jsx` SHALL remove
`adminToken`, `token`, and `userId` from `localStorage` and navigate to `/logging`.

**Validates: Requirements 2.7, 3.7**

---

Property 9: Bug Condition — Category Endpoints Return Expected HTTP Responses

_For any_ request to `GET /api/categories`, `POST /api/add-category`,
`PUT /api/update-category/:id`, or `DELETE /api/delete-category/:id`, the fixed backend SHALL
return the HTTP status code and payload specified in requirements 2.8–2.8.5 (not HTTP 404).

**Validates: Requirements 2.8, 2.8.1, 2.8.2, 2.8.3, 2.8.4, 2.8.5**

---

Property 10: Bug Condition — Quiz Navigation Uses `quiz._id`

_For any_ quiz object in the `quizzes` state array (a plain JSON object from axios), the fixed
`quizList.jsx` SHALL use `quiz._id` for the `key` prop and the navigate path, and SHALL pass
`{ quizId: quiz._id, quizName: quiz.quizName, question: quiz.question }` as route state.

**Validates: Requirements 2.9, 2.9.1**

---

Property 11: Bug Condition — `sinupRoute` Uses `userModel` (Unified Collection)

_For any_ admin registration via `POST /api/user/register`, the fixed `sinupRoute.js` SHALL
store the new document in the `User` collection with `userId`, `name`, `email`, `password`
(hashed), and `role: 'admin'` fields.

**Validates: Requirements 2.10, 2.10.1**

---

Property 12: Preservation — Non-Buggy Inputs Produce Identical Behavior

_For any_ input X where none of the ten `isBugCondition_N(X)` functions return true, the fixed
codebase SHALL produce exactly the same response as the original codebase: same HTTP status,
same response body, same side effects.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

---

## Fix Implementation

### Bug 1 — `AdminFrontend/src/config/api.js`

**Change:** Replace the self-referencing template literal fallback with a string literal.

```js
// BEFORE
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}`;

// AFTER
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
```

---

### Bug 2 — `Backend/models/quizResultModel.js`

**Change:** Change `userId` type from `ObjectId` to `String`.

```js
// BEFORE
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

// AFTER
userId: { type: String, required: true },
```

The `ref: 'User'` is also removed because a String field cannot be populated via Mongoose
population against an ObjectId-keyed collection.

---

### Bug 3 — `Backend/routes/sinupRoute.js`

**Change:** Replace the `logModel` import with `userModel`; update the login query to filter
by `{ email, role: 'admin' }`; add an HTTP 403 check for non-admin accounts.

```js
// BEFORE
import SignUp from '../models/logModel.js';
// ...
const user = await SignUp.findOne({ email });

// AFTER
import User from '../models/userModel.js';
// ...
const user = await User.findOne({ email, role: 'admin' });
if (!user) return res.status(404).json({ message: 'User not found.' });
// (password check remains; add 403 if role check needed separately)
```

---

### Bug 4 — `Backend/controllers/authController.js`

**Change:** Implement full JWT verification with proper error responses.

```js
// AFTER
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

---

### Bug 5 — `Backend/index.js`

**Change 1:** Add `requireAdmin` middleware (can be defined inline in `index.js` or in
`authController.js`).

```js
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

**Change 2:** Wrap admin route groups with `verifyToken, requireAdmin`; wrap `quizResultRoutes`
with `verifyToken` only; leave public routes unwrapped.

```js
// Admin-protected routes
app.use('/api', verifyToken, requireAdmin, userRoutes);
app.use('/api', verifyToken, requireAdmin, moduleRoutes);
app.use('/api', verifyToken, requireAdmin, quizRoutes);
app.use('/api', verifyToken, requireAdmin, bookRoutes);
app.use('/api', verifyToken, requireAdmin, voiceExamRoutes);
app.use('/api', verifyToken, requireAdmin, dashboardRoutes);

// Authenticated (non-admin) routes
app.use('/api', verifyToken, quizResultRoutes);

// Public routes (no auth middleware)
app.use('/api/user', sinupRoute);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
```

---

### Bug 6 — `AdminFrontend/src/config/axios.js` (new file)

**Change:** Create a centralized axios instance with a request interceptor.

```js
import axios from 'axios';
import { API_BASE_URL } from './api.js';

const adminAxios = axios.create({ baseURL: API_BASE_URL });

adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminAxios;
```

All admin page components that call protected endpoints must be updated to use `adminAxios`
instead of bare `fetch()` or the default `axios` instance.

---

### Bug 7 — `AdminFrontend/src/components/adminHeader.jsx`

**Change:** Fix the `href` and add an `onClick` handler that clears localStorage tokens.

```jsx
// BEFORE
<a id="logout" href="LoginPage">Logout</a>

// AFTER
<a
  id="logout"
  href="/logging"
  onClick={() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  }}
>
  Logout
</a>
```

---

### Bug 8 — `Backend/routes/categoryRoutes.js` (new file) + `Backend/index.js`

**Change 1:** Create `categoryRoutes.js` with full CRUD handlers using a `Category` model
(and create `Backend/models/categoryModel.js`).

```js
// categoryModel.js
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
}, { timestamps: true });
```

```js
// categoryRoutes.js — CRUD routes
router.get('/categories', async (req, res) => { ... });
router.post('/add-category', async (req, res) => { ... });
router.put('/update-category/:id', async (req, res) => { ... });
router.delete('/delete-category/:id', async (req, res) => { ... });
```

**Change 2:** Mount in `index.js` behind admin auth.

```js
import categoryRoutes from './routes/categoryRoutes.js';
// ...
app.use('/api', verifyToken, requireAdmin, categoryRoutes);
```

---

### Bug 9 — `userFrontend/src/components/quizList.jsx`

**Change:** Replace `quiz.id` with `quiz._id` in both the `key` prop and the `navigate` call;
add route state to the `navigate` call.

```jsx
// BEFORE
<li key={quiz.id}>
  <button onClick={() => navigate(`/quiz/${quiz.id}`)}>Start Quiz</button>

// AFTER
<li key={quiz._id}>
  <button
    onClick={() =>
      navigate(`/quiz/${quiz._id}`, {
        state: {
          quizId:   quiz._id,
          quizName: quiz.quizName,
          question: quiz.question,
        },
      })
    }
  >
    Start Quiz
  </button>
```

---

### Bug 10 — `Backend/routes/sinupRoute.js`

This fix overlaps with Bug 3. The combined change:

1. Replace `import SignUp from '../models/logModel.js'` with `import User from '../models/userModel.js'`.
2. Update `/register` to build a `User` document with `userId`, `name`, `email`, `password`, and `role: 'admin'`.
3. Update `/logging` to query `User` with `{ email, role: 'admin' }`.

```js
// AFTER — /register handler
const userId = `A${email.split('@')[0]}`; // derive userId from email local-part
const user = new User({ userId, name: email.split('@')[0], email, password, role: 'admin' });
await user.save();
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows the two-phase bug condition methodology:

1. **Exploratory phase** — run tests against the *unfixed* code to confirm the bug manifests and
   understand the root cause. Tests are expected to fail here; counterexamples are recorded.
2. **Fix checking** — after each fix is applied, re-run the corresponding tests and assert the
   correct behavior (Properties 1–11).
3. **Preservation checking** — run the preservation suite (Property 12) against the fixed code
   to confirm no regressions.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples on unfixed code to confirm the root cause hypotheses.

| Test | Action | Expected counterexample on unfixed code |
| --- | --- | --- |
| E1 | Import `api.js` in a Node context where `VITE_API_BASE_URL` is undefined | `ReferenceError: API_BASE_URL is not defined` |
| E2 | Call `QuizResult.save({ userId: 'U001', ... })` | Mongoose `CastError` |
| E3 | POST `/api/user/logging` with credentials of a `User`-collection admin | HTTP 404 "User not found." |
| E4 | GET any protected route with no `Authorization` header | HTTP 200 (middleware passes through) |
| E5 | DELETE `/api/quizzes/:id` with no token | HTTP 200 (route executes) |
| E6 | Inspect request headers from admin frontend page call | `Authorization` header absent |
| E7 | Click Logout in admin header | Browser navigates to `/LoginPage` (404); `adminToken` still in localStorage |
| E8 | GET `/api/categories` | HTTP 404 |
| E9 | Render `quizList.jsx` and inspect `navigate` call argument | `"/quiz/undefined"` |
| E10 | POST `/api/user/register`, then query `User` collection for the email | Document not found in `User` |

---

### Fix Checking

For each bug N, after applying fix F'_N:

```
FOR ALL input WHERE isBugCondition_N(input) DO
  result := F'_N(input)
  ASSERT Property_N(result)
END FOR
```

**Expected outcomes after fixes:**

- F'_1: Module evaluates without error; `API_BASE_URL === 'http://localhost:4000'` when env var absent.
- F'_2: `QuizResult.save({ userId: 'U001', ... })` succeeds; HTTP 200 returned.
- F'_3: Admin login with `User`-collection credentials returns HTTP 200 + JWT.
- F'_4: Request without token returns HTTP 401; request with valid token calls `next()`.
- F'_5: Unauthenticated request to admin route returns HTTP 401; non-admin returns HTTP 403.
- F'_6: All admin frontend requests include `Authorization: Bearer <token>` when `adminToken` is set.
- F'_7: Logout click clears all three localStorage keys and navigates to `/logging`.
- F'_8: `GET /api/categories` returns HTTP 200; CRUD operations return correct status codes.
- F'_9: `navigate` called with `/quiz/<valid-objectid>` and correct route state; `quizCard` renders.
- F'_10: Registration creates a `User` document with `role: 'admin'`; login finds it.

---

### Preservation Checking

```
FOR ALL input WHERE NOT isBugCondition_N(input) DO
  ASSERT F(input) = F'(input)
END FOR
```

**Preservation test plan:**

| Preservation Test | Scope | What to verify |
| --- | --- | --- |
| P1 | `api.js` with `VITE_API_BASE_URL` set | `API_BASE_URL` equals the env var value |
| P2 | `QuizResult.save` with valid ObjectId userId | Score, answers, timestamp persisted unchanged |
| P3 | Regular user login via `POST /api/users/login` | JWT returned, flow unmodified |
| P4 | Valid JWT on protected route after Bug 4 fix | Request passes through to handler |
| P5 | Public routes (`/api/user/register`, `/api/contact`) | No auth required, HTTP 200/201 |
| P6 | User frontend axios calls | No Authorization header added (different instance) |
| P7 | Admin navigating between pages (valid session) | Session maintained, pages render |
| P8 | Existing category documents in DB | `GET /api/categories` returns them |
| P9 | `quiz.quizName` and `quiz.question.questionText` display in `quizList` | Text renders correctly |
| P10 | Admin route handlers with valid admin JWT | Same responses as before auth wrapping |

**Property-based testing is particularly valuable for P4, P5, and P10** because these involve
a wide range of inputs. A PBT framework can generate many token variants (valid, expired,
wrong secret, malformed) and many route/method combinations to cover the full input space.

---

### Unit Tests

- Bug 1: `api.js` exports a defined string when env var is absent; does not throw.
- Bug 2: `QuizResult` schema accepts `"U001"`, `"U42"`, and arbitrary strings for `userId`.
- Bug 3: `sinupRoute /logging` returns HTTP 200 for a seeded `User` admin; HTTP 404 when absent; HTTP 403 when role is not 'admin'.
- Bug 4: `verifyToken` returns HTTP 401 for missing header, expired token, wrong-secret token; calls `next()` for valid token.
- Bug 5: `requireAdmin` returns HTTP 403 when `req.user.role !== 'admin'`; calls `next()` when `role === 'admin'`.
- Bug 6: Axios interceptor sets `Authorization` header when `adminToken` present; omits it when absent.
- Bug 7: Logout `onClick` removes `adminToken`, `token`, `userId` from localStorage; `href` attribute is `/logging`.
- Bug 8: Category CRUD endpoints return correct status codes and payloads; 404 for non-existent ids.
- Bug 9: `quizList.jsx` renders `key={quiz._id}` and calls navigate with correct path and state.
- Bug 10: `sinupRoute /register` creates a `User` document with `role: 'admin'`, `userId`, and `name`.

### Property-Based Tests

- Generate random strings matching `/^U\d+$/` and verify `QuizResult.save` never throws a CastError (Bug 2).
- Generate random `Authorization` header values (absent, malformed, expired, valid) and verify `verifyToken` returns exactly HTTP 401 or calls `next()` as specified (Bug 4).
- Generate random route paths from the admin-protected set and verify no unauthenticated request reaches the handler (Bug 5).
- Generate random quiz objects (plain JSON, all with `_id`) and verify `quizList.jsx` always navigates to `/quiz/<_id>` with correct state (Bug 9).

### Integration Tests

- Full admin login → protected route access flow: register → login → call protected endpoint → verify HTTP 200 (Bugs 3, 4, 5, 6 combined).
- Full logout flow: login → navigate to admin page → click logout → verify localStorage cleared → verify redirect to `/logging` (Bug 7).
- Full category CRUD flow: create → list → update → delete (Bug 8).
- Full quiz submission flow: fetch quiz list → click "Start Quiz" → submit result with `userId: "U001"` → verify HTTP 200 (Bugs 2, 9 combined).
- End-to-end admin registration → login → User Management lookup (Bugs 3, 10 combined).
