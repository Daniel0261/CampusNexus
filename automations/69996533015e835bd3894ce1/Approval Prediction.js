try {
  // Dummy fallback for approval prediction
  const prediction = "likely approved"
  setContext("approvalPrediction", prediction)
  return { status: "completed", prediction }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, prediction: "likely approved" }
}
