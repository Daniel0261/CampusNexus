try {
  // Workflow Risk Detection: align key to 'workflowRisk'
  const workflowRisk = "Low"
  setContext("workflowRisk", workflowRisk)
  return { status: "completed", workflowRisk }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, workflowRisk: "Low" }
}
