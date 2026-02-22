// Enhanced Workflow Risk Detection: Smart doc predictor, predictive student triggers, guidance in output
const parentTrackingId = (() => {
  try {
    return getContext("parentTrackingId")
  } catch (e) {
    console.warn("Missing parentTrackingId context; using empty fallback.", e)
    return null
  }
})()
let studentSubTasks
try {
  studentSubTasks = getContext("studentSubTasks")
  if (!Array.isArray(studentSubTasks)) throw new Error("Not array")
} catch (e) {
  console.warn("Missing or invalid studentSubTasks; using empty array fallback.", e)
  studentSubTasks = []
}
let approvalLog
try {
  approvalLog = typeof getContext("approvalLog") !== "undefined" ? getContext("approvalLog") : []
  if (!approvalLog || !Array.isArray(approvalLog)) {
    approvalLog = []
    console.warn("ApprovalLog context missing or not an array. Using empty fallback.")
  }
} catch (e) {
  approvalLog = []
  console.warn("Error retrieving approvalLog from context. Using empty fallback.", e)
}
let examCalendar
try {
  examCalendar = typeof getContext("examCalendar") !== "undefined" ? getContext("examCalendar") : null
  if (!examCalendar || !Array.isArray(examCalendar)) {
    throw new Error("examCalendar is not set or not an array.")
  }
} catch (e) {
  examCalendar = [{ name: "Internal Exams", start: "2026-02-25", end: "2026-02-28" }]
  console.warn("Error retrieving examCalendar from context. Using default fallback.", e)
}
const now = new Date()

// CRITICAL PATCH: Crash-proof: emit minified fallback JSON if no input to process
defaultNoDataExit = () => {
  const fallbackOutput = { status: "no_data", message: "No input for risk detection" }
  console.warn("No input/sub-tasks found for Workflow Risk Detection. Emitting fallback output. Workflow will complete with exit code 0.")
  console.log(JSON.stringify(fallbackOutput))
  setContext("riskResults", [])
  setContext("groupWarnings", {})
  setContext("groupEscalate", {})
  setContext("groupEscalationReason", {})
  setContext("groupAiCompliance", {})
  setContext("groupDocumentGuidance", {})
  setContext("groupStudentSupport", {})
  process.exit(0)
}
if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
  // Check for classic student input fallback
  let hasFallback = false
  try {
    const studentInput = getContext("studentInput")
    if (typeof studentInput === "object" && studentInput !== null) {
      hasFallback = true
    }
  } catch (e) {
    console.warn("Context key studentInput not set; no fallback classic input.", e)
  }
  if (!hasFallback) defaultNoDataExit()
  // Optionally: Could insert old-style fallback risk analysis here, but per atomic update, emit fallback when none.
  defaultNoDataExit()
}
const riskResults = []
const groupWarnings = {}
const groupEscalate = {}
const groupEscalationReason = {}
const groupAiCompliance = {}
const groupDocumentGuidance = {}
const groupStudentSupport = {}

async function checkCompliance(reason) {
  const resp = await TurboticOpenAI([{ role: "user", content: `Check the following student text for inappropriate language, fake or repeated medical claims, or policy violations. Flag any issues.\nRequest: ${reason}` }], { model: "gpt-4.1", temperature: 0 })
  return resp.content
}

;(async () => {
  for (const subTask of studentSubTasks) {
    const attendancePct = subTask.attendancePct ?? 74
    const feePending = subTask.feePending ?? true
    const leaveStart = new Date(subTask.leaveStartDate)
    const leaveEnd = new Date(subTask.leaveEndDate)
    const urgency = subTask.urgency || "normal"
    const subTaskWarnings = []
    if (attendancePct < 75) subTaskWarnings.push("Attendance below 75% minimum policy.")
    if (feePending) subTaskWarnings.push("Fee payment pending.")
    examCalendar.forEach(exam => {
      const examStart = new Date(exam.start)
      const examEnd = new Date(exam.end)
      if (leaveStart <= examEnd && leaveEnd >= examStart) subTaskWarnings.push(`Leave overlaps with ${exam.name}.`)
    })
    let escalate = false
    let escalationReason = ""
    const pendingEntry = approvalLog.find(r => r.trackingId === subTask.trackingId && !r.approved)
    if (pendingEntry) {
      const daysPending = (now - new Date(pendingEntry.requestDate)) / (1000 * 60 * 60 * 24)
      if (daysPending > 5) {
        escalate = true
        escalationReason = "Pending > 5 days"
      }
    }
    if (urgency === "high") {
      escalate = true
      escalationReason = escalationReason ? escalationReason + ", High urgency" : "High urgency"
    }
    const inExamWeek = examCalendar.some(exam => leaveStart <= new Date(exam.end) && leaveEnd >= new Date(exam.start))
    if (inExamWeek) {
      escalate = true
      escalationReason = escalationReason ? escalationReason + ", Exam week conflict" : "Exam week conflict"
    }
    let documentGuidance = ""
    if (subTask.category === "medical" && leaveStart && leaveEnd) {
      const leaveDays = (leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)
      if (leaveDays > 3) {
        documentGuidance = "Medical certificate required for leave longer than 3 days."
        subTaskWarnings.push(documentGuidance)
      }
    }
    groupDocumentGuidance[subTask.subTaskId] = documentGuidance
    let studentSupportRecommendation = ""
    let urgentCount = subTask.urgentRequestsCount ?? 0
    let leaveFreq = subTask.leaveFrequency ?? 0
    if (attendancePct < 75 || urgentCount >= 2 || leaveFreq >= 2) {
      studentSupportRecommendation = "Recommend academic counseling."
      subTaskWarnings.push("Academic counseling recommended (low attendance/high urgency/high leave frequency)")
    }
    groupStudentSupport[subTask.subTaskId] = studentSupportRecommendation
    const aiCompliance = await checkCompliance(subTask.reason || "")
    riskResults.push({
      parentTrackingId,
      subTaskId: subTask.subTaskId,
      warnings: subTaskWarnings,
      escalate,
      escalationReason,
      aiCompliance,
      documentGuidance,
      studentSupportRecommendation
    })
    groupWarnings[subTask.subTaskId] = subTaskWarnings
    groupEscalate[subTask.subTaskId] = escalate
    groupEscalationReason[subTask.subTaskId] = escalationReason
    groupAiCompliance[subTask.subTaskId] = aiCompliance
    groupDocumentGuidance[subTask.subTaskId] = documentGuidance
    groupStudentSupport[subTask.subTaskId] = studentSupportRecommendation
    console.log(`Risk detected for sub-task ${subTask.subTaskId}: warnings=${subTaskWarnings}, escalate=${escalate}, reason=${escalationReason}, AI compliance=${aiCompliance}, doc=${documentGuidance}, support=${studentSupportRecommendation}`)
  }
  setContext("riskResults", riskResults)
  setContext("groupWarnings", groupWarnings)
  setContext("groupEscalate", groupEscalate)
  setContext("groupEscalationReason", groupEscalationReason)
  setContext("groupAiCompliance", groupAiCompliance)
  setContext("groupDocumentGuidance", groupDocumentGuidance)
  setContext("groupStudentSupport", groupStudentSupport)
  console.log("Risk detection batch complete for multi-intent context.")
})()
