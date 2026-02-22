try {
  // Dummy fallback for evidence
  const evidenceResult = "No evidence provided"
  setContext("evidenceResult", evidenceResult)
  return { status: "completed", evidenceResult }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, evidenceResult: "No evidence provided" }
}
