try {
  // Dummy analytics fallback
  const dashboard = {
    requestsToday: 1,
    trend: "stable"
  }
  setContext("dashboard", dashboard)
  return { status: "completed", dashboard }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, dashboard: { requestsToday: 1, trend: "stable" } }
}
