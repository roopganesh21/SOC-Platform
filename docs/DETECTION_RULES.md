# Detection Rules

## 1. Brute Force Attack
- **Trigger:** 5+ failed login attempts from same IP within 2 minutes
- **Severity:** High
- **Confidence:** 0.85

## 2. Unauthorized Sudo Access
- **Trigger:** User not in sudoers attempts sudo
- **Severity:** Medium
- **Confidence:** 0.90

## 3. Invalid User Login Attempt
- **Trigger:** Login attempt with non-existent user
- **Severity:** Medium
- **Confidence:** 0.75

## 4. Suspicious IP Pattern
- **Trigger:** Same user login from 3+ different IPs in 10 minutes
- **Severity:** High
- **Confidence:** 0.80
