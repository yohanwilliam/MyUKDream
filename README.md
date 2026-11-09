# MyUKDream Home greeting tests

This repository contains Playwright automation test cases for User Story 82. The standalone suite automates the 22 SCRUM-84 Home greeting and goal-line cases.

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Set `TEST_EMAIL` and `TEST_PASSWORD` to a student test account.
4. For TC-19, set `TEST_USER_TWO_EMAIL` and `TEST_USER_TWO_PASSWORD` to a distinct student test account with a different first name and goal. TC-19 is skipped until both are configured.
5. Run `npm install` and `npx playwright install chromium`.

The suite defaults to `https://app.myukdream.com`; set `BASE_URL` to use another deployment.
Profile-changing tests are blocked on the live host unless `ALLOW_LIVE_MUTATIONS=1` is explicitly set.

## Run

- `npm test` runs the full suite.
- `npm run test:home` runs the SCRUM-84 suite.
- `npm run test:list` lists the discovered test cases.

Tests that exercise profile setup answers temporarily save profile changes and restore the original name, journey stage, course start, level, and subject in a `finally` block. Changing the journey stage can also re-tick earlier path steps, as warned by the application. Use a test account; the suite runs sequentially to avoid competing profile updates.
