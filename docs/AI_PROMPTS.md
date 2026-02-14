# AI Prompts – SOC Platform

This document tracks prompt templates and usage patterns for the Gemini-based AI explanation layer.

## 1. Use Case Overview

The AI layer takes:
- Parsed security events and incidents (from the rule engine)
- Context about detection rules and log patterns

and produces:
- Human-readable explanations for analysts
- Suggested next investigation steps
- Risk summaries and potential impact

## 2. Core Prompt Templates

### 2.1 Incident Explanation Prompt

**Goal:** Explain a single detected incident in clear analyst language.

**Template (pseudo-JSON):**
```text
System:
You are a senior security analyst in a SOC. Explain security incidents clearly and concisely for other analysts. Use neutral, professional language.

User:
You are given a detected incident and its related logs.

Incident:
- Type: {incidentType}
- Severity: {severity}
- Confidence: {confidence}
- Description: {description}
- Affected user: {affectedUser}
- Source IP: {sourceIP}
- Timestamp: {timestamp}

Related log lines (up to {maxLogs}):
{logLines}

Tasks:
1. Briefly explain what is happening.
2. Assess the likely risk.
3. Suggest 2–4 recommended next investigation steps.
4. Mention any notable patterns (IPs, users, timing).
Return your answer in markdown with short sections.
```

### 2.2 Brute Force Attack Summary Prompt

**Use when rule = BruteForceAttack.**

```text
System:
You are helping a SOC analyst review authentication brute force activity.

User:
Summarize the brute force login activity described below.

Details:
- Source IP: {sourceIP}
- Number of failed attempts: {failedCount}
- Time window: {windowMinutes} minutes
- Target user(s): {users}
- First event time: {firstSeen}
- Last event time: {lastSeen}

Provide:
1. A short summary (2–3 sentences).
2. Risk level explanation.
3. Recommended security controls or immediate actions.
```

### 2.3 Sudo Violation Explanation Prompt

```text
System:
You explain privilege escalation attempts to SOC analysts.

User:
Explain the following sudo violation.

Details:
- User: {user}
- Host: {host}
- Timestamp: {timestamp}
- Command/context (if available): {commandContext}
- Raw log: {rawLog}

Tasks:
1. Explain why this event is noteworthy.
2. Suggest what the analyst should verify next (user role, history, etc.).
3. Provide 2–3 follow-up questions the analyst might ask.
```

### 2.4 Multi-Login Suspicious IP Pattern Prompt

```text
System:
You analyze account takeover risk.

User:
A user has logged in from multiple IP addresses in a short period.

Details:
- User: {user}
- Number of distinct IPs: {ipCount}
- IPs: {ipList}
- Time window: {windowMinutes} minutes
- Example log lines:
{logLines}

Tasks:
1. Assess whether this pattern is consistent with normal behavior.
2. List possible explanations (legitimate and malicious).
3. Recommend monitoring and verification steps.
```

## 3. Example Outputs (High Level)

### Example: Brute Force Attack

- **Summary:** "Multiple failed SSH login attempts were observed from 192.168.1.100 targeting account `admin` within a 2-minute period, consistent with password guessing."
- **Risk:** High – potential brute force attack against privileged account.
- **Next steps:** Block IP (if appropriate), check for successful logins, enforce MFA, review related activity from same IP.

### Example: Unauthorized Sudo Access

- **Summary:** "User `alice` attempted to run commands via sudo but is not configured in the sudoers file, indicating either misconfiguration or an unauthorized privilege escalation attempt."
- **Risk:** Medium – depends on user role and frequency of similar attempts.
- **Next steps:** Verify `alice`’s role, review recent login locations, and check for other failed or successful escalations.

## 4. Token Optimization Strategies

To avoid unnecessary token usage:

- **Truncate logs:**
  - Limit `relatedLogs` to the most recent N lines (e.g., 10–20), or collapse repeated similar entries.
- **Summarize before sending:**
  - Pre-aggregate counts (e.g., "15 failed logins from 192.168.1.100") instead of sending all raw lines.
- **Use compact field names:**
  - Avoid verbose labels in the prompt; rely on bullet points.
- **Reuse templates:**
  - Keep consistent structure so the model learns to respond efficiently.
- **Limit history:**
  - Only include the current incident context, not full conversation history, when generating one-off explanations.

## 5. Next Steps

- Implement a small AI service module (e.g., `services/aiExplainer.js`) that:
  - Builds prompts from incidents and logs.
  - Calls Gemini via `@google/generative-ai` using `GEMINI_API_KEY`.
  - Stores explanations in `ai_explanations` table.
- Add configuration for model name, temperature, and max output tokens.
