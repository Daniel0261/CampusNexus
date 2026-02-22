try {
  let trackingId = getContext("trackingId")
  if (!trackingId) {
    trackingId = "TRK-" + Date.now()
  }
  setContext("trackingId", trackingId)
  return { status: "completed", trackingId }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, trackingId: "TRK-0000" }
}
