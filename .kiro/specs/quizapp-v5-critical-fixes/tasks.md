# Implementation Plan

## Overview

Ten-bug bugfix for QuizApp-v5 following the exploratory bug condition methodology: write exploration and preservation tests on unfixed code first, then apply each fix and verify.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3", "4", "5"] },
    { "wave": 3, "tasks": ["6"] },
    { "wave": 4, "tasks": ["7"] },
    { "wave": 5, "tasks": ["8", "9", "10", "11"] },
    { "wave": 6, "tasks": ["12"] }
  ]
}
```

## Tasks

- [ ] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Ten Critical Bug Conditions Across QuizApp-v5
  - **CRITICAL**: Write ALL ten property-based tests BEFORE implementing any fix
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug exists; record them
  - **Scoped PBT Approach**: For deterministic bugs, scope to the concrete failing cases

  ---

  **Bug 1 — Self-referencing `API_BASE_URL`**
  - Test: Evaluate `AdminFrontend/src/config/api.js` in an environment where `VITE_API_BASE_URL` is `undefined`
  - `isBugCondition_1`: `VITE_API_BASE_URL` is undefined AND fallback references `API_BASE_URL` itself
  - Expected behavior: module exports `'http://localhost:4000'` as `API_BASE_URL` with no error
  - Run on UNFIXED code — **EXPECTED OUTCOME: `ReferenceError: API_BASE_URL is not defined`**
  - Document counterexample: "Evaluating api.js without .env throws ReferenceError at module load"

  **Bug 2 — ObjectId cast on alphanumeric `userId`**
  - Scoped property: for all strings matching `/^U\d+$/` (e.g. `"U001"`, `"U42"`) submitted to `POST /api/quizzes/:quizId/submit`
  - `isBugCondition_2`: `quizResult.userId` matches `/^U\d+$/` AND schema type is `ObjectId`
  - Expected behavior: `QuizResult.save()` succeeds; HTTP 200 returned
  - Run on UNFIXED code — **EXPECTED OUTCOME: HTTP 500 CastError for every `U\d+` userId**
  - Document counterexample: "`userId: 'U001'` → `CastError: Cast to ObjectId failed`"

  **Bug 3 — Wrong model in `sinupRoute.js` admin login**
  - Test: `POST /api/user/logging` with credentials of a user that exists in `User` collection with `role: 'admin'`
  - `isBugCondition_3`: admin account in `User` collection AND `sinupRoute` queries `SignUp` (logModel) not `User`
  - Expected behavior: HTTP 200 with signed JWT containing `{ id, email, role: 'admin' }`
  - Run on UNFIXED code — **EXPECTED OUTCOME: HTTP 404 "User not found." for any admin in `User` collection**
  - Document counterexample: "Admin `admin@quiz.com` in User collection → 404 because logModel queried"

  **Bug 4 — No-op `verifyToken` middleware**
  - Scoped property: for any request where `Authorization` header is absent or carries a fabricated/expired token
  - `isBugCondition_4`: `verifyToken` calls `next()` without reading `authorization` header or calling `jwt.verify`
  - Expected behavior: HTTP 401 returned; `next()` NOT called
  - Run on UNFIXED code — **EXPECTED OUTCOME: All such requests pass through as if authenticated**
  - Document counterexample: "Request with no Authorization header reaches protected handler, returns HTTP 200"

  **Bug 5 — No auth middleware on admin routes**
  - Scoped property: for any unauthenticated request targeting `userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`
  - `isBugCondition_5`: middleware chain for admin route groups contains no `verifyToken` or `requireAdmin`
  - Expected behavior: HTTP 401 before route handler is reached
  - Run on UNFIXED code — **EXPECTED OUTCOME: HTTP 200 returned with full data, no auth check**
  - Document counterexample: "`GET /api/users` with no token → HTTP 200 user list"

  **Bug 6 — Missing `Authorization` header in admin frontend**
  - Test: admin logged in with `adminToken` in localStorage; send any request to a protected endpoint
  - `isBugCondition_6`: `adminToken` exists in localStorage AND outgoing request has no `Authorization` header
  - Expected behavior: `Authorization: Bearer <adminToken>` header present on every protected request
  - Run on UNFIXED code — **EXPECTED OUTCOME: Requests sent without `Authorization` header**
  - Document counterexample: "Authenticated admin's `GET /api/users` call has no Authorization header"

  **Bug 7 — Broken logout `href` and missing token cleanup**
  - Test: simulate Logout anchor click in `adminHeader.jsx`
  - `isBugCondition_7`: `href` resolves to non-existent route OR localStorage tokens remain after click
  - Expected behavior: navigate to `/logging`; `adminToken`, `token`, `userId` removed from localStorage
  - Run on UNFIXED code — **EXPECTED OUTCOME: Navigate to `/LoginPage` (404); tokens remain in localStorage**
  - Document counterexample: "After logout click, `localStorage.getItem('adminToken')` is still non-null"

  **Bug 8 — Missing category routes**
  - Scoped property: for each of `GET /api/categories`, `POST /api/add-category`, `PUT /api/update-category/:id`, `DELETE /api/delete-category/:id`
  - `isBugCondition_8`: route path targets category endpoint AND `categoryRoutes` not mounted in `index.js`
  - Expected behavior: HTTP 200/201 with category data (not HTTP 404)
  - Run on UNFIXED code — **EXPECTED OUTCOME: HTTP 404 for all four category endpoints**
  - Document counterexample: "`GET /api/categories` → HTTP 404 Not Found"

  **Bug 9 — `quiz.id` vs `quiz._id` and missing route state**
  - Scoped property: for any quiz object from axios response where `quiz._id` is a valid ObjectId string
  - `isBugCondition_9`: `quiz.id` is `undefined` on plain JSON object AND `navigate()` has no route state
  - Expected behavior: navigation goes to `/quiz/<quiz._id>`; `quizCard` receives `{ quizId, quizName, question }` state
  - Run on UNFIXED code — **EXPECTED OUTCOME: Navigation to `/quiz/undefined`; `quizCard` crashes with "No question data"**
  - Document counterexample: "`quiz._id = '64abc...'` → `quiz.id` is `undefined` → navigate to `/quiz/undefined`"

  **Bug 10 — `logModel` split-collection in `sinupRoute.js`**
  - Test: call `POST /api/user/register` and then attempt to find the new document via `User` collection query
  - `isBugCondition_10`: `sinupRoute` imports `logModel` AND admin accounts are intended in `User` collection
  - Expected behavior: new document in `User` collection with `userId`, `name`, `email`, `password`, `role: 'admin'`
  - Run on UNFIXED code — **EXPECTED OUTCOME: document saved to `SignUp` collection, absent from `User` collection**
  - Document counterexample: "Registered admin invisible to `GET /api/users` because stored in `SignUp` not `User`"

  - Mark task complete when all ten tests are written, executed against unfixed code, and counterexamples are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

---

- [ ] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Buggy Inputs Produce Identical Behavior
  - **IMPORTANT**: Follow observation-first methodology — run each scenario on UNFIXED code first, record the response, then encode it as the assertion
  - **GOAL**: Capture the baseline behavior that must remain unchanged after fixes

  ---

  **Preservation P1 — `VITE_API_BASE_URL` set in `.env` continues to be used**
  - Non-bug condition: `VITE_API_BASE_URL` IS defined in environment
  - Observe on UNFIXED code: `API_BASE_URL` equals `VITE_API_BASE_URL` value (e.g. `'http://localhost:4000'`)
  - Write property: for all defined `VITE_API_BASE_URL` values, `API_BASE_URL === VITE_API_BASE_URL`
  - _Preservation Requirement_: Bug 1 fix only changes the fallback; env-var path unchanged

  **Preservation P2 — Valid quiz results with ObjectId `quizId` still persist correctly**
  - Non-bug condition: `userId` is a valid MongoDB ObjectId (not `/^U\d+$/`)
  - Observe on UNFIXED code: `score`, `answers`, `timestamp` persisted; HTTP 200 returned
  - Write property: for all ObjectId `userId` values, quiz result save behavior unchanged

  **Preservation P3 — Regular user login via `POST /api/users/login` unchanged**
  - Non-bug condition: request targets `userRoutes` login, not `sinupRoute /api/user/logging`
  - Observe on UNFIXED code: valid user credentials → HTTP 200 with JWT
  - Write property: Bug 3 and Bug 10 fixes do not affect `userRoutes` login handler

  **Preservation P4 — Valid JWTs continue to pass through `verifyToken`**
  - Non-bug condition: `Authorization` header present, well-formed, valid unexpired JWT
  - Observe on UNFIXED code: request reaches protected handler (due to no-op, but behavior is "pass through")
  - Write property: after Bug 4 fix, valid tokens still reach downstream handler with `req.user` populated

  **Preservation P5 — Public routes accessible without `Authorization` header**
  - Non-bug condition: request targets `POST /api/user/register`, `POST /api/user/logging`, `POST /api/contact`, `GET /api/auth/verify`
  - Observe on UNFIXED code: all four routes respond without requiring auth header
  - Write property: after Bug 5 fix, these routes remain accessible with no `Authorization` header

  **Preservation P6 — User frontend axios setup in `userFrontend/src/config/api.js` untouched**
  - Non-bug condition: API call originates from user frontend, not admin frontend
  - Observe on UNFIXED code: user frontend API calls function normally
  - Write property: Bug 6 fix is admin-frontend-only; user frontend behavior unchanged

  **Preservation P7 — Authenticated admin session persists between page navigations**
  - Non-bug condition: admin already logged in, navigating between admin pages (not clicking Logout)
  - Observe on UNFIXED code: `adminToken` remains in localStorage; all pages render correctly
  - Write property: Bug 7 fix only adds cleanup on Logout click; other navigation paths leave `adminToken` intact

  **Preservation P8 — Existing category documents returned by `GET /api/categories`**
  - Non-bug condition: route exists (after Bug 8 fix) and documents exist in DB
  - Observe: existing category docs must appear in response
  - Write property: `GET /api/categories` returns all pre-existing documents in response array

  **Preservation P9 — Quiz name and question text display correctly after `_id` fix**
  - Non-bug condition: display of `quiz.quizName` and `quiz.question.questionText` (not navigation)
  - Observe on UNFIXED code: text fields render correctly regardless of the `id`/`_id` bug
  - Write property: Bug 9 fix does not alter data-fetching or display of name/question text fields

  **Preservation P10 — Admin route handlers return identical responses with valid admin JWT**
  - Non-bug condition: request carries valid admin JWT and targets any admin route group
  - Observe on UNFIXED code: route handlers return their normal responses
  - Write property: after Bug 5 fix wraps them, internal handler logic unchanged; same HTTP status, body, side-effects

  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behaviors to preserve)
  - Mark task complete when all preservation tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

---

- [ ] 3. Fix Bug 1 — Self-referencing `API_BASE_URL` in `AdminFrontend/src/config/api.js`

  - [ ] 3.1 Implement the fix
    - In `AdminFrontend/src/config/api.js`, replace the self-referencing fallback with a string literal
    - Change: `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || \`${API_BASE_URL}\``
    - To: `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'`
    - _Bug_Condition: `isBugCondition_1(env)` — `VITE_API_BASE_URL` is undefined AND fallback references `API_BASE_URL` itself_
    - _Expected_Behavior: module exports `'http://localhost:4000'` as fallback without ReferenceError_
    - _Preservation: When `VITE_API_BASE_URL` is set in `.env`, continue using that value as `API_BASE_URL`_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.2 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Admin Frontend Module Loads Without Error
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Evaluate `api.js` without `VITE_API_BASE_URL` defined; assert `API_BASE_URL === 'http://localhost:4000'` with no error thrown
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed)
    - _Requirements: 2.1, 3.1_

  - [ ] 3.3 Verify preservation test P1 still passes
    - **Property 2: Preservation** - `VITE_API_BASE_URL` env var path unchanged
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (no regression on env-var path)

---

- [ ] 4. Fix Bug 2 — ObjectId cast error for alphanumeric `userId` in `Backend/models/quizResultModel.js`

  - [ ] 4.1 Implement the fix
    - In `Backend/models/quizResultModel.js`, change the `userId` field type from `ObjectId` to `String`
    - Change: `userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
    - To: `userId: { type: String, required: true }`
    - Remove the `ref: 'User'` association (a String field cannot be populated against an ObjectId-keyed collection)
    - _Bug_Condition: `isBugCondition_2(quizResult)` — `userId` matches `/^U\d+$/` AND schema type is `ObjectId`_
    - _Expected_Behavior: `QuizResult.save()` succeeds for any `U\d+` userId; HTTP 200 returned_
    - _Preservation: Valid quiz results continue to persist `score`, `answers`, `timestamp` exactly as before_
    - _Requirements: 2.2, 2.2.1, 3.2_

  - [ ] 4.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Alphanumeric `userId` Accepted by `QuizResult`
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Scoped property: for all strings matching `/^U\d+$/`, `QuizResult.save()` succeeds and returns HTTP 200
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed)
    - _Requirements: 2.2, 2.2.1_

  - [ ] 4.3 Verify preservation test P2 still passes
    - **Property 2: Preservation** - existing quiz result persistence unchanged
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (no regression on quiz result saves)

---

- [ ] 5. Fix Bug 10 + Bug 3 — `logModel` split-collection and wrong model in `Backend/routes/sinupRoute.js`
  > Fix Bug 10 first since it restructures the import; Bug 3's login query fix is applied in the same file in the same pass.

  - [ ] 5.1 Implement the combined fix in `sinupRoute.js`
    - Replace `import SignUp from '../models/logModel.js'` with `import User from '../models/userModel.js'`
    - Update `/register` handler: build `User` document with `userId` (derived from email local-part, e.g. `A${email.split('@')[0]}`), `name`, `email`, `password` (hashed by model hook), `role: 'admin'`; save to `User` collection
    - Update `/logging` handler: query `User.findOne({ email, role: 'admin' })`; return HTTP 404 if not found, HTTP 401 if password mismatch, HTTP 403 if user exists but `role !== 'admin'`, HTTP 200 with signed JWT `{ id, email, role: 'admin' }` on success
    - _Bug_Condition (Bug 10): `isBugCondition_10(route)` — `sinupRoute` imports `logModel`; admin accounts intended in `User` collection; `SignUp` docs lack `userId`, `role`, `name`_
    - _Bug_Condition (Bug 3): `isBugCondition_3(loginRequest)` — admin account in `User` collection; `sinupRoute` queries `SignUp` not `User`_
    - _Expected_Behavior: new registrations stored in `User` collection with all required fields; login queries `User` with role check_
    - _Preservation: Regular user login via `POST /api/users/login` (userRoutes) completely unaffected_
    - _Requirements: 2.3, 2.3.1, 2.3.2, 2.3.3, 2.10, 2.10.1, 3.3_

  - [ ] 5.2 Verify Bug 3 exploration test now passes
    - **Property 1: Expected Behavior** - Admin Login Queries the Correct Collection
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - `POST /api/user/logging` with valid admin credentials in `User` collection → HTTP 200 with JWT
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 3 is fixed)
    - _Requirements: 2.3, 2.3.1, 2.3.2, 2.3.3_

  - [ ] 5.3 Verify Bug 10 exploration test now passes
    - **Property 1: Expected Behavior** - `sinupRoute` Uses `userModel` (Unified Collection)
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - `POST /api/user/register` → new document in `User` collection with `userId`, `name`, `email`, `password`, `role: 'admin'`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 10 is fixed)
    - _Requirements: 2.10, 2.10.1_

  - [ ] 5.4 Verify preservation tests P3 still pass
    - **Property 2: Preservation** - Regular user login unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regression on `POST /api/users/login`)

---

- [ ] 6. Fix Bug 4 — No-op `verifyToken` middleware in `Backend/controllers/authController.js`

  - [ ] 6.1 Implement the fix
    - In `Backend/controllers/authController.js`, replace the stub with full JWT verification
    - Read `req.headers.authorization`; if absent or does not start with `'Bearer '` → return HTTP 401 `{ message: 'Authentication token required' }`
    - Extract token; call `jwt.verify(token, process.env.JWT_SECRET)`; on success attach decoded payload to `req.user` and call `next()`
    - On `JsonWebTokenError` or `TokenExpiredError` → return HTTP 401 `{ message: 'Invalid or expired token' }`
    - Import `jsonwebtoken` (`jwt`) at the top of the file
    - _Bug_Condition: `isBugCondition_4(request)` — `verifyToken` calls `next()` without reading `authorization` header or calling `jwt.verify`_
    - _Expected_Behavior: absent/malformed/expired/wrong-secret tokens → HTTP 401; valid token → `req.user` populated, `next()` called_
    - _Preservation: Requests carrying a valid unexpired JWT continue to pass through to the route handler_
    - _Requirements: 2.4, 2.4.1, 2.4.2, 2.4.3, 3.4_

  - [ ] 6.2 Verify Bug 4 exploration test now passes
    - **Property 1: Expected Behavior** - `verifyToken` Rejects Invalid/Absent Tokens
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - For requests with absent, malformed, expired, or wrong-secret tokens → assert HTTP 401 returned
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 4 is fixed)
    - _Requirements: 2.4, 2.4.1, 2.4.2, 2.4.3_

  - [ ] 6.3 Verify preservation test P4 still passes
    - **Property 2: Preservation** - Valid JWTs pass through unchanged
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (valid tokens still reach downstream handlers)

---

- [ ] 7. Fix Bug 5 — No auth middleware on admin routes in `Backend/index.js`

  - [ ] 7.1 Implement the fix
    - In `Backend/index.js`, define `requireAdmin` middleware: if `req.user?.role !== 'admin'` → return HTTP 403 `{ message: 'Admin access required' }`; else call `next()`
    - Wrap admin route groups with `verifyToken, requireAdmin` in the `app.use` calls: `userRoutes`, `moduleRoutes`, `quizRoutes`, `bookRoutes`, `voiceExamRoutes`, `dashboardRoutes`
    - Wrap `quizResultRoutes` with `verifyToken` only (no `requireAdmin`) — authenticated non-admin users need to submit results
    - Leave public routes unwrapped: `sinupRoute` at `/api/user`, `contactRoutes` at `/api/contact`, `authRoutes` at `/api/auth`
    - Import `verifyToken` from `authController.js` if not already imported
    - _Bug_Condition: `isBugCondition_5(request)` — request targets admin route group; no `verifyToken` or `requireAdmin` in chain_
    - _Expected_Behavior: unauthenticated requests → HTTP 401; authenticated non-admin → HTTP 403; valid admin JWT → passes through to handler_
    - _Preservation: Public routes remain accessible without auth; admin route handlers' internal logic untouched_
    - _Requirements: 2.5, 2.5.1, 2.5.2, 2.5.3, 2.5.4, 3.5, 3.10_

  - [ ] 7.2 Verify Bug 5 exploration test now passes
    - **Property 1: Expected Behavior** - Admin Routes Require Authentication
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Unauthenticated requests to admin routes → HTTP 401/403 before handler is reached
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 5 is fixed)
    - _Requirements: 2.5, 2.5.1, 2.5.2, 2.5.3, 2.5.4_

  - [ ] 7.3 Verify preservation tests P5 and P10 still pass
    - **Property 2: Preservation** - Public routes and authenticated admin requests unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (public routes accessible; admin handlers return same responses with valid JWT)

---

- [ ] 8. Fix Bug 6 — Missing `Authorization` header injection in admin frontend

  - [ ] 8.1 Create `AdminFrontend/src/config/axios.js`
    - Create new file `AdminFrontend/src/config/axios.js` with a centralized axios instance
    - `axios.create({ baseURL: API_BASE_URL })` importing `API_BASE_URL` from `'./api.js'`
    - Add request interceptor: read `localStorage.getItem('adminToken')`; if present and non-empty, set `config.headers.Authorization = 'Bearer ' + token`; if null/empty, send request without Authorization header
    - Export the instance as default: `export default adminAxios`
    - _Bug_Condition: `isBugCondition_6(apiCall)` — `adminToken` in localStorage; request has no `Authorization` header; targets protected endpoint_
    - _Expected_Behavior: every outgoing admin request where `adminToken` is non-null includes `Authorization: Bearer <adminToken>`_
    - _Preservation: User frontend axios setup in `userFrontend/src/config/api.js` is NOT modified_
    - _Requirements: 2.6, 2.6.1, 2.6.2, 3.6_

  - [ ] 8.2 Update admin page components to use `adminAxios`
    - Identify all admin page components (`Dashboard.jsx`, `userManagement.jsx`, `QuizManagement.jsx`, `QuestionManagement.jsx`, `ModuleManagement.jsx`, `BookManagement.jsx`, `VoiceExamManagement.jsx`, `Reports.jsx`, `ParentManager.jsx`, `AddUserModal.jsx`, `EditUserModal.jsx`, `profile.jsx`) that call protected backend endpoints via bare `fetch()` or default `axios`
    - Replace those calls with `adminAxios` imported from `'../config/axios.js'`
    - Do not modify `adminLogin.jsx` (it handles the login itself and stores the token; no auth header needed there)
    - _Requirements: 2.6, 2.6.2_

  - [ ] 8.3 Verify Bug 6 exploration test now passes
    - **Property 1: Expected Behavior** - Admin Frontend Requests Include Authorization Header
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - With `adminToken` in localStorage, any outgoing admin request → assert `Authorization: Bearer <token>` header present
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 6 is fixed)
    - _Requirements: 2.6, 2.6.1, 2.6.2_

  - [ ] 8.4 Verify preservation test P6 still passes
    - **Property 2: Preservation** - User frontend axios setup untouched
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (user frontend API calls unaffected)

---

- [ ] 9. Fix Bug 7 — Broken logout `href` and missing token cleanup in `AdminFrontend/src/components/adminHeader.jsx`

  - [ ] 9.1 Implement the fix
    - In `AdminFrontend/src/components/adminHeader.jsx`, locate the logout anchor element
    - Change `href="LoginPage"` to `href="/logging"`
    - Add `onClick` handler: `() => { localStorage.removeItem('adminToken'); localStorage.removeItem('token'); localStorage.removeItem('userId'); }`
    - Do not modify any other part of the header component
    - _Bug_Condition: `isBugCondition_7(logoutClick)` — `href` resolves to non-existent route (`"LoginPage"`) OR localStorage tokens remain after click_
    - _Expected_Behavior: navigate to `/logging`; `adminToken`, `token`, `userId` removed from localStorage on click_
    - _Preservation: Authenticated admin session (localStorage tokens) maintained during normal page navigation; only cleared on explicit Logout click_
    - _Requirements: 2.7, 3.7_

  - [ ] 9.2 Verify Bug 7 exploration test now passes
    - **Property 1: Expected Behavior** - Logout Clears Tokens and Navigates Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Simulate Logout click → assert `localStorage.getItem('adminToken')` is null AND navigation target is `/logging`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 7 is fixed)
    - _Requirements: 2.7, 3.7_

  - [ ] 9.3 Verify preservation test P7 still passes
    - **Property 2: Preservation** - Admin session intact during normal navigation
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (no regression on session persistence)

---

- [ ] 10. Fix Bug 8 — Missing category routes in Backend

  - [ ] 10.1 Create `Backend/models/categoryModel.js`
    - Create new file `Backend/models/categoryModel.js`
    - Define `categorySchema` with `name: { type: String, required: true, trim: true }` and `{ timestamps: true }` option
    - Export the model: `export default mongoose.model('Category', categorySchema)`
    - _Requirements: 2.8_

  - [ ] 10.2 Create `Backend/routes/categoryRoutes.js`
    - Create new file `Backend/routes/categoryRoutes.js`
    - Implement `GET /categories` → return HTTP 200 with array of all categories sorted by `createdAt` descending
    - Implement `POST /add-category` → validate `name` field present (HTTP 400 if absent); create document; return HTTP 201 `{ message, category }`
    - Implement `PUT /update-category/:id` → find by id (HTTP 404 if not found); update; return HTTP 200 with updated category
    - Implement `DELETE /delete-category/:id` → find by id (HTTP 404 if not found); delete; return HTTP 200
    - Import `Category` from `'../models/categoryModel.js'`
    - Export router as default
    - _Bug_Condition: `isBugCondition_8(request)` — request targets category endpoint AND `categoryRoutes` not mounted in `index.js`_
    - _Expected_Behavior: all four category endpoints return correct HTTP status and payload (not HTTP 404)_
    - _Preservation: Existing category documents continue to be returned by `GET /api/categories`_
    - _Requirements: 2.8, 2.8.1, 2.8.2, 2.8.3, 2.8.4, 2.8.5, 3.8_

  - [ ] 10.3 Mount category routes in `Backend/index.js`
    - Import `categoryRoutes` from `'./routes/categoryRoutes.js'`
    - Add: `app.use('/api', verifyToken, requireAdmin, categoryRoutes)` alongside the other admin-protected route groups
    - _Requirements: 2.8_

  - [ ] 10.4 Verify Bug 8 exploration test now passes
    - **Property 1: Expected Behavior** - Category Endpoints Return Expected HTTP Responses
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - All four category endpoints (`GET /api/categories`, `POST /api/add-category`, `PUT /api/update-category/:id`, `DELETE /api/delete-category/:id`) return specified HTTP statuses (not HTTP 404)
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 8 is fixed)
    - _Requirements: 2.8, 2.8.1, 2.8.2, 2.8.3, 2.8.4, 2.8.5_

  - [ ] 10.5 Verify preservation test P8 still passes
    - **Property 2: Preservation** - Existing category documents returned
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (pre-existing category docs appear in `GET /api/categories` response)

---

- [ ] 11. Fix Bug 9 — `quiz.id` vs `quiz._id` and missing route state in `userFrontend/src/components/quizList.jsx`

  - [ ] 11.1 Implement the fix
    - In `userFrontend/src/components/quizList.jsx`, locate the quiz list render and the "Start Quiz" button
    - Change `key={quiz.id}` to `key={quiz._id}`
    - Change `navigate(\`/quiz/${quiz.id}\`)` to `navigate(\`/quiz/${quiz._id}\`, { state: { quizId: quiz._id, quizName: quiz.quizName, question: quiz.question } })`
    - Do not change data-fetching logic, display of `quiz.quizName`, or display of `quiz.question.questionText`
    - _Bug_Condition: `isBugCondition_9(quiz)` — `quiz.id` is undefined on plain JSON object; `navigate()` called without route state_
    - _Expected_Behavior: navigation to `/quiz/<quiz._id>`; `quizCard` receives `{ quizId, quizName, question }` as route state_
    - _Preservation: `quiz.quizName` and `quiz.question.questionText` continue to display correctly_
    - _Requirements: 2.9, 2.9.1, 3.9_

  - [ ] 11.2 Verify Bug 9 exploration test now passes
    - **Property 1: Expected Behavior** - Quiz Navigation Uses `quiz._id`
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - For any quiz object with `_id = '64abc...'`: navigation goes to `/quiz/64abc...`; route state contains `{ quizId, quizName, question }`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 9 is fixed)
    - _Requirements: 2.9, 2.9.1_

  - [ ] 11.3 Verify preservation test P9 still passes
    - **Property 2: Preservation** - Quiz name and question text display unchanged
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (no regression on quiz list display)

---

- [ ] 12. Checkpoint — Ensure all tests pass

  - Re-run all ten Bug Condition exploration tests (Property 1 tests from task 1) — all must PASS
  - Re-run all preservation property tests (Property 2 tests from task 2) — all must PASS
  - Confirm no new test failures were introduced by any of the ten fixes
  - Verify the complete fix chain: Bug 1 → Bug 2 → Bug 10 + Bug 3 → Bug 4 → Bug 5 → Bug 6 → Bug 7 → Bug 8 → Bug 9
  - If any test fails, do NOT proceed — diagnose the regression and fix before marking complete
  - Ask the user if questions arise
  - _Requirements: 1.1–1.10, 2.1–2.10.1, 3.1–3.10_


## Notes

- Tasks 1 and 2 (exploration and preservation tests) MUST be completed before any fix task (3–11).
- Bugs 10 and 3 both live in `sinupRoute.js` and are fixed together in task 5 to avoid two conflicting edits to the same file.
- Bug 4 (verifyToken) must be fixed before Bug 5 (admin route auth wiring), since Bug 5 depends on a working `verifyToken`.
- Bug 5 must be fixed before Bug 6 (axios interceptor), since the interceptor is only meaningful once routes actually enforce auth.
- Bug 8 (category routes) must be mounted in `index.js` alongside the Bug 5 changes — coordinate those edits together.
- The `.config.kiro` file already exists at `.kiro/specs/quizapp-v5-critical-fixes/.config.kiro` with `specType: "bugfix"`.
