# SCRUM-84 — Home greeting and goal line test report

**Run date:** 2026-11-04  
**Environment:** `https://app.myukdream.com`  
**Browser:** Chromium, headed (visible GUI)  
**Command:** `npm.cmd run test:home -- --headed`

## Summary

| Result | Count |
|---|---:|
| Passed | 20 |
| Failed | 1 |
| Skipped | 1 |
| Total | 22 |

## Results by test case

| Test case | Result | Summary |
|---|---|---|
| TC-01 | Passed | Morning greeting and display font |
| TC-02 | Passed | Afternoon greeting and display font |
| TC-03 | Passed | Evening greeting and display font |
| TC-04 | Passed | Correct account first name |
| TC-05 | Passed | Empty name handled without malformed greeting |
| TC-06 | Passed | Greeting updates after profile name change |
| TC-07 | Passed | Personalized goal appears below greeting |
| TC-08 | Passed | Goal reflects course level and start date |
| TC-09 | Passed | Studying status goal |
| TC-10 | Passed | Graduate status goal |
| TC-11 | Passed | Sponsored-job goal |
| TC-12 | Passed | Bachelor's and Master's levels |
| TC-13 | Passed | Supported course start dates |
| TC-14 | Passed | Greeting/goal order and alignment |
| TC-15 | Passed | Display font size and weight |
| TC-16 | Passed | Long text does not clip |
| TC-17 | Passed | Desktop, tablet, and mobile layouts |
| TC-18 | Passed | Personalization persists after refresh |
| TC-19 | Skipped | Requires a second, distinct student account |
| TC-20 | Passed | Early journey stages display an appropriate goal |
| TC-21 | Passed | Supported course levels are offered and reflected |
| TC-22 | Failed | Lowercase first name is not capitalized |

TC-21 passed for the levels the application currently offers. PhD/Doctorate was not present in the level selector; the product requirement for supporting it was not supplied.

## Failed-test evidence

See the [TC-22 bug report](./SCRUM-84-TC-22-bug-report.md) and its [reproduction screenshot](./screenshots/TC-22-lowercase-first-name-reproduction.png).

## Account cleanup

The test run's temporary profile and plan changes were restored. The account was verified with its original name and journey stage after the run.
