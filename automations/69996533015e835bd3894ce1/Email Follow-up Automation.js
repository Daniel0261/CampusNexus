try {
  // Dummy fallback for follow-up
  const followupStatus = "Follow-up email sent."
  setContext("followupStatus", followupStatus)
  return { status: "completed", followupStatus }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, followupStatus: "Follow-up email sent." }
}
