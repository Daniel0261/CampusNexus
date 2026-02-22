try {
  // Approval prediction aligned to 'approvalPrediction'
  const approvalPrediction = "likely approved"
  setContext("approvalPrediction", approvalPrediction)
  return { status: "completed", approvalPrediction }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, approvalPrediction: "likely approved" }
}
