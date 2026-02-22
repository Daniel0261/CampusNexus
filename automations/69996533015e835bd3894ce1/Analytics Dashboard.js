// Enhanced Analytics Dashboard: Now supports SLA breach rates per department, emits explicit department SLA breaches, strict minified JSON
defineSLALimits = () => ({ Accounts: 3, HR: 5, IT: 4, Unknown: 7 }) // SLA days by dept
defaultSLADays = 5

;(async () => {
  let workflowLogs
  try {
    workflowLogs = getContext("workflowLogs")
  } catch (e) {
    workflowLogs = null
  }
  if (!Array.isArray(workflowLogs) || workflowLogs.length === 0) {
    setContext("analytics_object", {})
    process.stdout.write(JSON.stringify({ status: "no_data", analytics_summary: {} }))
    process.exit(0)
  }

  let groupedLogs = {}
  for (const entry of workflowLogs) {
    const parentId = entry.parentTrackingId || "none"
    const subTaskId = entry.subTaskId || "none"
    if (!groupedLogs[parentId]) groupedLogs[parentId] = {}
    groupedLogs[parentId][subTaskId] = entry
  }
  const allEntries = Object.values(groupedLogs)
    .map(parent => Object.values(parent))
    .flat()

  // Enhanced metrics/init
  let total_requests = allEntries.length
  let total_delay = 0,
    highDelayCount = 0,
    overallSLABreachCount = 0
  let delayBuckets = {},
    departmentStats = {}
  const slaLimits = defineSLALimits()

  for (const log of allEntries) {
    const dept = log.department || "Unknown"
    let submD = log.submission_date || log.requestDate
    let apprD = log.approval_date || log.approvalDate
    const submDate = new Date(submD)
    const apprDate = new Date(apprD)
    const approvalDelay = (apprDate - submDate) / (1000 * 60 * 60 * 24)
    if (!departmentStats[dept]) departmentStats[dept] = { count: 0, totalDelay: 0, delays: [], slaBreaches: 0 }
    departmentStats[dept].count++
    departmentStats[dept].totalDelay += approvalDelay
    departmentStats[dept].delays.push(approvalDelay)
    if (approvalDelay > 7) highDelayCount++
    const sla = slaLimits[dept] ?? defaultSLADays
    if (approvalDelay > sla) {
      departmentStats[dept].slaBreaches++
      overallSLABreachCount++
    }
    const monthStr = submDate.toISOString().slice(0, 7)
    delayBuckets[monthStr] = (delayBuckets[monthStr] || 0) + 1
    total_delay += approvalDelay
  }
  let average_delay = total_requests ? total_delay / total_requests : 0
  const month_counts = Object.fromEntries(Object.entries(delayBuckets).sort())
  const top_departments = Object.entries(departmentStats)
    .sort((a, b) => b[1].totalDelay / b[1].count - a[1].totalDelay / a[1].count)
    .slice(0, 3)
    .map(([dept, _]) => dept)

  // New: SLA breach rates
  let departmentSLABreachRates = {}
  for (const dept in departmentStats) {
    const stats = departmentStats[dept]
    departmentSLABreachRates[dept] = stats.count ? +((stats.slaBreaches / stats.count) * 100).toFixed(2) : 0
  }
  const accountsDeptSLA = departmentSLABreachRates["Accounts"] || 0

  const analytics_object = {
    total_requests,
    average_delay,
    month_counts,
    top_departments,
    high_delay_count: highDelayCount,
    grouped_stats: groupedLogs,
    department_sla_breach: departmentSLABreachRates,
    accounts_dept_sla_breach_rate: accountsDeptSLA,
    overall_sla_breach_rate: total_requests ? +((overallSLABreachCount / total_requests) * 100).toFixed(2) : 0
  }

  // AI FORECAST
  let forecast = { forecast_peak_period: "Not available", risk_department: "Not determined", spike_reason: "", confidence_score: 0 }
  const prompt = `You are a workload forecasting and SLA engine.\n\nInput summary:\n- Monthly request counts: ${JSON.stringify(month_counts)}\n- Average delay: ${average_delay}\n- High delays (>7d): ${highDelayCount}\n- SLA breach rates: ${JSON.stringify(departmentSLABreachRates)}\n\nPredict:\n1. Next peak workload\n2. Most likely SLA bottleneck dept\n3. Metrics observed\n\nJSON only: { forecast_peak_period, risk_department, spike_reason, confidence_score } or { status: 'insufficient_data' }`
  try {
    const aiRes = await Promise.race([TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 }), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 18000))])
    let parsed
    try {
      parsed = JSON.parse(aiRes.content)
    } catch (e) {
      parsed = null
    }
    if (parsed && parsed.forecast_peak_period !== undefined) forecast = parsed
    else if (parsed && parsed.status === "insufficient_data") forecast = { status: "insufficient_data" }
  } catch (e) {}

  let analyticsCtx = getContext("analytics_object")
  if (typeof analyticsCtx !== "object" || !analyticsCtx) analyticsCtx = {}
  Object.assign(analyticsCtx, analytics_object, { forecast })
  setContext("analytics_object", analyticsCtx)

  process.stdout.write(JSON.stringify({ status: "completed", analytics_summary: analyticsCtx }))
  process.exit(0)
})()
