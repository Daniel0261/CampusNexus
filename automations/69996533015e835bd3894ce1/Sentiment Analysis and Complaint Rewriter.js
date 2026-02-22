try {
  const studentInput = getContext("studentInput")
  // Dummy fallback: neutral, no complaint
  const sentiment = "neutral"
  const complaint = false
  setContext("sentiment", sentiment)
  setContext("complaintDetected", complaint)
  return { status: "completed", sentiment, complaint }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, sentiment: "neutral", complaint: false }
}
