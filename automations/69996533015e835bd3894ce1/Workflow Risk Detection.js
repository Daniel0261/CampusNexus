try {
  // Dummy fallback: always low risk
  const risk = "Low"
  setContext("risk", risk)
  return { status: "completed", risk }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, risk: "Low" }
}
