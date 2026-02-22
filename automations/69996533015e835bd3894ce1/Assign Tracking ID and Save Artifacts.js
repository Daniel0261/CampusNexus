try {
  let trackingId = getContext("trackingId")
  if (!trackingId) {
    trackingId = "Unknown"
  }
  setContext("trackingId", trackingId)

  // Aggregation of all keys for unified final output
  const studentStructuredFields = getContext("studentStructuredFields") || { studentName: "Unknown", rollNumber: "Unknown" }
  const aiProcessed = getContext("aiProcessed") || [{}]
  const groupCompliance = getContext("groupCompliance") || "No policy summary"
  const workflowRisk = getContext("workflowRisk") || "Not evaluated"
  const approvalPrediction = getContext("approvalPrediction") || "Not calculated"
  const analyticsDashboard = getContext("analyticsDashboard") || "No analytics data"

  const finalOutput = {
    studentName: studentStructuredFields.studentName || "Unknown",
    rollNumber: studentStructuredFields.rollNumber || "Unknown",
    trackingId: trackingId || "Unknown",
    generatedLetter: aiProcessed[0]?.formalLetter || "No letter generated",
    urgencyScore: aiProcessed[0]?.urgencyScore || 0,
    routingRecommendation: aiProcessed[0]?.routingRecommendation || "Not available",
    policySummary: groupCompliance,
    riskLevel: workflowRisk,
    approvalPrediction: approvalPrediction,
    analyticsMetrics: analyticsDashboard
  }

  console.log("========== CAMPUSNEXUS WORKFLOW OUTPUT ==========")
  console.log(JSON.stringify(finalOutput, null, 2))
  console.log("=================================================")

  return { status: "completed", finalOutput }
} catch (err) {
  console.log("Final Output Logger Error:", err.message)
  return {
    status: "completed_with_warning",
    error: err.message
  }
}
