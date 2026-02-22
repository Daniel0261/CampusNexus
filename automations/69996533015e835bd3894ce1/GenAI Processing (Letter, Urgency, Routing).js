try {
  const studentInput = getContext("studentInput")
  const trackingId = getContext("trackingId")
  // Dummy GenAI / fallback demo values
  const letter = `To Whom it may concern,\n${studentInput}`
  const urgency = "High"
  const routedTo = "Department Head"
  setContext("genaiLetter", letter)
  setContext("urgency", urgency)
  setContext("routedTo", routedTo)
  return { status: "completed", letter, urgency, routedTo }
} catch (err) {
  return {
    status: "completed_with_warning",
    error: err.message,
    letter: "Formal letter demo output.",
    urgency: "High",
    routedTo: "Department Head"
  }
}
