// Policy Checker: Multi-Intent/Grouped Sub-Task Support | ATOMIC PATCH FOR CONTEXT RESILIENCE ADDED
let parentTrackingId, studentSubTasks, studentInput
// Step 1: Fallback-safe context fetching with warnings
try {
  parentTrackingId = getContext("parentTrackingId")
} catch (e) {
  console.warn("parentTrackingId missing from context; using null fallback.", e)
  parentTrackingId = null
}
try {
  studentSubTasks = getContext("studentSubTasks")
} catch (e) {
  console.warn("studentSubTasks missing from context; using empty fallback.", e)
  studentSubTasks = []
}

// Step 2: Fallback on empty or missing sub-tasks for backward compatibility
if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
  try {
    studentInput = getContext("studentInput")
  } catch (e) {
    studentInput = null
    console.warn("studentInput missing from context; emitting fallback no-data output.", e)
  }
  // If still no input, fallback and exit
  if (!studentInput) {
    // ATOMIC PATCH: Strict fallback JSON and exit(0)
    setContext("policyResults", [])
    setContext("groupCompliance", {})
    setContext("groupAiPolicyFlagSummary", {})
    console.warn("No subTasks or studentInput for Policy Checker; emitting fallback minified output and exiting.")
    console.log('{"status":"no_data","message":"No input for policy checking"}')
    process.exit(0)
  }
  // ... (original legacy code block for single compliance check could run here if desired) ...
  setContext("policyResults", [])
  setContext("groupCompliance", {})
  setContext("groupAiPolicyFlagSummary", {})
  // If legacy handling needed, adapt here. Else exit(0) to avoid script error.
  process.exit(0)
}

const policy = {
  minAttendance: 75,
  leaveTypes: ["medical", "personal", "academic", "fee"],
  leaveMaxDays: 7
}

const policyResults = []
const groupCompliance = {}
const groupAiPolicyFlagSummary = {}

async function aiPolicyCheck(reason) {
  const resp = await TurboticOpenAI(
    [
      {
        role: "user",
        content: `Check if this student request violates college policy, uses inappropriate language, or shows false illness/fee extension claims. Flag and explain any issues.\nText: ${reason}`
      }
    ],
    { model: "gpt-4.1", temperature: 0 }
  )
  return resp.content
}

;(async () => {
  for (const subTask of studentSubTasks) {
    const attendancePct = subTask.attendancePct ?? 74
    const compliance = []
    if (attendancePct < policy.minAttendance) {
      compliance.push({
        field: "attendance",
        issue: `Minimum attendance required is ${policy.minAttendance}%. Current: ${attendancePct}%`,
        suggestedAction: "Contact admin for special approval or provide proof of medical emergency."
      })
    }
    const leaveDays = (new Date(subTask.leaveEndDate) - new Date(subTask.leaveStartDate)) / (1000 * 60 * 60 * 24) + 1
    if (leaveDays > policy.leaveMaxDays) {
      compliance.push({
        field: "leave duration",
        issue: `Max leave allowed: ${policy.leaveMaxDays} days. Requested: ${leaveDays}`,
        suggestedAction: "Shorten leave period or request special approval."
      })
    }
    const aiResult = await aiPolicyCheck(subTask.reason || "")
    policyResults.push({
      parentTrackingId,
      subTaskId: subTask.subTaskId,
      compliance,
      aiPolicyFlagSummary: aiResult
    })
    groupCompliance[subTask.subTaskId] = compliance
    groupAiPolicyFlagSummary[subTask.subTaskId] = aiResult
    console.log(`Policy checked for sub-task ${subTask.subTaskId}: compliance=${JSON.stringify(compliance)}, AI flag=${aiResult}`)
  }
  setContext("policyResults", policyResults)
  setContext("groupCompliance", groupCompliance)
  setContext("groupAiPolicyFlagSummary", groupAiPolicyFlagSummary)
  console.log("Policy compliance check batch complete for multi-intent sub-tasks.")
})()
