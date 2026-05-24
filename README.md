# S.T.E.P. — Snooze Time Extension Protocol

> **Enterprise-Grade Morning Decision Architecture on AWS Step Functions**
>
> _ATL Cloud Conference 2026 — Basil Udoudoh_

---

## What is this?

A fully working AWS Step Functions demo that orchestrates the most critical workflow of your morning: **deciding whether to hit snooze**.

Every major Step Functions feature has a real role in the workflow:

| State | Feature | Role in S.T.E.P. |
|---|---|---|
| `AlarmFires` | **Task** | Lambda invocation, builds execution context |
| `ParallelAssessment` | **Parallel** | Calendar + Weather + Weekend checks simultaneously |
| `IsItWeekend` | **Choice** | Weekend = instant Succeed (sleep in!) |
| `MapExcuses` | **Map** | Iterates the excuse inventory, scores each |
| `CalculateSnoozeWindow` | **Task + Retry** | Synthesizes results → snooze duration |
| `ExecuteSnooze` | **Wait** | _Literally pauses execution_ for the snooze |
| `WakeUpCheck` | **Retry + Backoff** | Retries 3× with exponential backoff |
| `AwaitConfirmation` | **waitForTaskToken** | Paused until human confirms they're vertical |

---

## Project Structure

```
step-demo/
├── bin/
│   └── step-demo.ts          # CDK app entry point
├── lib/
│   └── step-stack.ts         # CDK Stack — state machine, Lambdas, API GW
├── lambdas/
│   ├── alarm-handler.ts      # Registers alarm + wake-up check
│   ├── calendar-check.ts     # First meeting of the day
│   ├── weather-check.ts      # Outfit complexity score
│   ├── weekend-check.ts      # Is it a weekend?
│   ├── excuse-scorer.ts      # Scores a single excuse (runs in Map)
│   ├── snooze-calculator.ts  # Calculates the optimal snooze window
│   ├── wake-up-verifier.ts   # Issues the task token (waitForTaskToken)
│   ├── trigger.ts            # POST /start — kicks off the execution
│   └── confirm.ts            # POST /confirm — unblocks the callback
├── package.json
├── tsconfig.json
└── cdk.json
```

---

## Prerequisites

- Node.js 20+
- AWS CDK v2: `npm install -g aws-cdk`
- AWS credentials configured (`aws configure` or SSO)

---

## Deploy

```bash
npm install
cdk bootstrap   # first time only
cdk deploy
```

CDK outputs two URLs:
- `StartEndpoint`  — POST here to start an execution
- `ConfirmEndpoint` — POST `{ "taskToken": "..." }` here to unblock the callback state

---

## Run the demo

### 1. Start an execution
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/demo/start \
  -H "Content-Type: application/json" \
  -d '{ "name": "monday-morning-attempt-1" }'
```

### 2. Watch it in the AWS Console
Go to **Step Functions → State Machines → snooze-time-extension-protocol** and open the execution.

### 3. Confirm you're awake (unblock the callback)
When the execution reaches `AwaitConfirmation`, grab the task token from the execution events and POST it to `/confirm`:

```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/demo/confirm \
  -H "Content-Type: application/json" \
  -d '{ "taskToken": "<token from execution context>" }'
```

### Auto-confirm mode (for live demos)
Set `AUTO_CONFIRM=true` on the `WakeUpVerifier` Lambda environment to skip manual confirmation.

---

## The Workflow

```
START
  ↓
⏰ ALARM FIRES                  [Task]
  ↓
⚡ PARALLEL ASSESSMENT           [Parallel]
   ├── 📅 Check Calendar
   ├── 🌤  Check Weather / Outfit Score
   └── 📆 Check Weekend
  ↓
🔀 IS IT WEEKEND?                [Choice]
   ├── YES → 😴 SLEEP IN         [Succeed]
   └── NO  ↓
📋 MAP: EVALUATE EXCUSES         [Map × 6 excuses]
  ↓
🧮 CALCULATE SNOOZE WINDOW       [Task + Retry]
  ↓
😴 EXECUTE SNOOZE                [Wait — actually pauses!]
  ↓
🔁 WAKE UP CHECK                 [Task + Retry ×3 + backoff]
  ↓
📞 AWAIT CONFIRMATION            [waitForTaskToken — paused]
  ↓
☕ SUCCEED: You made it!    OR   🚨 FAIL: You're late.
```

---

## Teardown

```bash
cdk destroy
```

---

_Built for ATL Cloud Conference 2026. Enterprise reliability. Zero morning guarantees._
