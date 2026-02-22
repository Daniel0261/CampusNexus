try {
  let policies = getContext("policies")
  if (!policies) {
    policies = {
      minAttendance: 75,
      maxLeaveDays: 7,
      respectfulLanguageRequired: true
    }
  }
  setContext("policies", policies)
  return { status: "completed", policies }
} catch (err) {
  return {
    status: "completed_with_warning",
    error: err.message,
    policies: {
      minAttendance: 75,
      maxLeaveDays: 7,
      respectfulLanguageRequired: true
    }
  }
}
