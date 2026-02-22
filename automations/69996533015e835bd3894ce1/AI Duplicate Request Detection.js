try {
  const studentInput = getContext("studentInput")
  // Dummy logic: always no duplicates in fallback/demo
  const duplicateDetected = false
  setContext("duplicateDetected", duplicateDetected)
  return { status: "completed", duplicateDetected }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, duplicateDetected: false }
}
