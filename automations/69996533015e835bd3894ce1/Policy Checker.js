try {
  let groupCompliance = getContext("groupCompliance")
  if (!groupCompliance) {
    groupCompliance = {
      minAttendance: 75,
      maxLeaveDays: 7,
      respectfulLanguageRequired: true
    }
  }
  setContext("groupCompliance", groupCompliance)
  return { status: "completed", groupCompliance }
} catch (err) {
  return {
    status: "completed_with_warning",
    error: err.message,
    groupCompliance: { minAttendance: 75, maxLeaveDays: 7, respectfulLanguageRequired: true }
  }
}
