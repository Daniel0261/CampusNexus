// Sentiment Analysis and Complaint Rewriter: Multi-intent support
const parentTrackingId = getContext("parentTrackingId")
const studentSubTasks = getContext("studentSubTasks")

// Backward compatibility: fallback to classic input
if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
  const studentInput = getContext("studentInput")
  if (studentInput.reason && studentInput.category === "complaint") {
    const complaintText = studentInput.reason
    const sentimentPrompt = `Detect if this complaint sounds aggressive, emotional, or unprofessional. If so, rewrite it in a calm, respectful manner for college authorities.\nComplaint: ${complaintText}`
    async function handleSentiment() {
      const response = await TurboticOpenAI([{ role: "user", content: sentimentPrompt }], {
        model: "gpt-4.1",
        temperature: 0
      })
      const rewritten = response.content
      setContext("professionalComplaint", rewritten)
      console.log("Complaint rewritten (if needed):", rewritten)
    }
    ;(async () => {
      await handleSentiment()
    })()
    process.exit(0)
  } else {
    console.log("No emotional complaint detected in this request.")
    process.exit(0)
  }
}

const rewrittenComplaints = {}

async function rewriteComplaint(subTask) {
  const complaintText = subTask.reason
  const sentimentPrompt = `Detect if this complaint sounds aggressive, emotional, or unprofessional. If so, rewrite it in a calm, respectful manner for college authorities.\nComplaint: ${complaintText}`
  const response = await TurboticOpenAI([{ role: "user", content: sentimentPrompt }], {
    model: "gpt-4.1",
    temperature: 0
  })
  return response.content
}

;(async () => {
  for (const subTask of studentSubTasks) {
    if (subTask.reason && subTask.category === "complaint") {
      const rewritten = await rewriteComplaint(subTask)
      rewrittenComplaints[subTask.subTaskId] = rewritten
      console.log(`Complaint rewritten for sub-task ${subTask.subTaskId}:`, rewritten)
    }
  }
  setContext("professionalComplaints", rewrittenComplaints)
  console.log("Sentiment analysis and rewriting complete for all complaint sub-tasks.")
})()
