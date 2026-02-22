// Enhanced Approval Prediction: Outputs approval/rejection rates by department, emits fairness/bias metrics (AI)
function logAndFallback(reason) {
  console.warn(reason)
  setContext("approvalResults", [])
  setContext("approvalLog", [])
  setContext("departmentApprovalStats", {})
  setContext("fairnessAnalysis", {})
  const fallback = { status: "no_data", message: "No input for approval prediction" }
  try {
    console.log(JSON.stringify(fallback))
  } catch {}
  process.exit(0)
}

let parentTrackingId, studentSubTasks, groupWarnings
try {
  parentTrackingId = getContext("parentTrackingId")
} catch (e) {
  console.warn("Missing context: parentTrackingId")
  parentTrackingId = null
}
try {
  studentSubTasks = getContext("studentSubTasks")
} catch (e) {
  console.warn("Missing context: studentSubTasks")
  studentSubTasks = []
}
try {
  groupWarnings = getContext("groupWarnings") || {}
} catch (e) {
  groupWarnings = {}
}

if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
  let studentInput = null,
    riskWarnings = null
  try {
    studentInput = getContext("studentInput")
  } catch (e) {
    console.warn("Missing context: studentInput")
  }
  try {
    riskWarnings = getContext("riskWarnings")
  } catch (e) {}
  logAndFallback("No sub-tasks or studentInput for approval prediction; emitting fallback and exiting.")
}

const historicData = [
  { category: "medical", approvalRate: 0.88 },
  { category: "personal", approvalRate: 0.65 },
  { category: "academic", approvalRate: 0.93 },
  { category: "fee", approvalRate: 0.56 }
]

const approvalResults = [],
  approvalLog = []

async function predictApproval(subTask, warnings) {
  const match = historicData.find(d => d.category === (subTask.category || ""))
  const baseApproval = (match && match.approvalRate) || 0.7
  let probability = baseApproval
  let reasons = []
  if (warnings && warnings.length > 0) {
    probability -= 0.15
    reasons.push("Warnings detected: " + warnings.join(" | "))
  }
  if (probability < 0) probability = 0
  if (probability > 1) probability = 1
  const approvalPredictionPrompt = `Based on these request details and past approval patterns, predict likelihood of approval as a percentage. Explain reasoning briefly. Request: ${JSON.stringify(subTask)} Risk warnings: ${(warnings || []).join("; ")}`
  const response = await TurboticOpenAI([{ role: "user", content: approvalPredictionPrompt }], {
    model: "gpt-4.1",
    temperature: 0
  })
  const explanation = response.content
  return {
    parentTrackingId,
    subTaskId: subTask.subTaskId,
    probability: Math.round(probability * 100),
    explanation,
    reasons
  }
}

;(async () => {
  for (const subTask of studentSubTasks) {
    const warnings = groupWarnings[subTask.subTaskId] || []
    const prediction = await predictApproval(subTask, warnings)
    approvalResults.push(prediction)
    approvalLog.push({
      parentTrackingId,
      subTaskId: subTask.subTaskId,
      studentId: subTask.studentId || "unknown",
      department: subTask.department || "General",
      category: subTask.category || "Other",
      predictedApproval: prediction.probability,
      timestamp: new Date().toISOString(),
      warnings: typeof warnings === "string" ? [warnings] : warnings,
      reasons: prediction.reasons
    })
    console.log(`Approval predicted for sub-task ${subTask.subTaskId}: probability=${prediction.probability}, explanation=${prediction.explanation}`)
  }
  setContext("approvalResults", approvalResults)
  setContext("approvalLog", approvalLog)

  // Aggregate approval/rejection by department
  const deptAgg = {}
  for (const log of approvalLog) {
    const dept = log.department
    if (!deptAgg[dept]) deptAgg[dept] = { total: 0, approvals: 0, rejections: 0 }
    deptAgg[dept].total++
    if (log.predictedApproval >= 50) deptAgg[dept].approvals++
    else deptAgg[dept].rejections++
  }
  let deptStats = {}
  for (const dept in deptAgg) {
    const d = deptAgg[dept]
    deptStats[dept] = {
      total: d.total,
      approvalRate: +((d.approvals / d.total) * 100).toFixed(2),
      rejectionRate: +((d.rejections / d.total) * 100).toFixed(2)
    }
  }

  // OpenAI fairness/bias prompt
  let fairnessAnalysis = {}
  try {
    const fairnessPrompt = `You are a fairness/bias auditor. Analyze the following department statistics for disproportionate rejection or unfair approval. Stats: ${JSON.stringify(deptStats)}\nOutput JSON: { fairness_concern: true/false, reasons: "...", most_biased_department: "..." }.`
    const fairnessRes = await TurboticOpenAI([{ role: "user", content: fairnessPrompt }], {
      model: "gpt-4.1",
      temperature: 0
    })
    try {
      fairnessAnalysis = JSON.parse(fairnessRes.content)
    } catch {}
  } catch (e) {}

  setContext("departmentApprovalStats", deptStats)
  setContext("fairnessAnalysis", fairnessAnalysis)
  console.log("Approval prediction, fairness stats, and fairness analysis context updated.")
})()
