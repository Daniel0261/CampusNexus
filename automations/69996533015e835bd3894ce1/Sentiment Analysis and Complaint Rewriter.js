// Sentiment Analysis and Complaint Rewriter: Safe execution for missing context keys

;(async () => {
  try {
    // Atomically check for context with try/catch to never break step
    let parentTrackingId, studentSubTasks
    try {
      parentTrackingId = getContext("parentTrackingId")
      studentSubTasks = getContext("studentSubTasks")
    } catch (e) {
      // parentTrackingId missing, emit minified JSON and exit
      console.log('{"status":"skipped","message":"parentTrackingId missing"}')
      process.exit(0)
    }
    // Further guard: explicit skip if value missing (double protection)
    if (!parentTrackingId) {
      console.log('{"status":"skipped","message":"parentTrackingId missing"}')
      process.exit(0)
    }
    // Backward compatibility for classic input
    if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
      let studentInput
      try {
        studentInput = getContext("studentInput")
      } catch (_) {}
      if (studentInput && studentInput.reason && studentInput.category === "complaint") {
        const complaintText = studentInput.reason
        const sentimentPrompt = `Detect if this complaint sounds aggressive, emotional, or unprofessional. If so, rewrite it in a calm, respectful manner for college authorities.\nComplaint: ${complaintText}`
        const response = await TurboticOpenAI([{ role: "user", content: sentimentPrompt }], {
          model: "gpt-4.1",
          temperature: 0
        })
        const rewritten = response.content
        setContext("professionalComplaint", rewritten)
        console.log("Complaint rewritten (if needed):", rewritten)
        process.exit(0)
      } else {
        console.log("No emotional complaint detected in this request.")
        process.exit(0)
      }
    }

    // Array mode - rewrite all applicable complaints
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
    for (const subTask of studentSubTasks) {
      if (subTask.reason && subTask.category === "complaint") {
        const rewritten = await rewriteComplaint(subTask)
        rewrittenComplaints[subTask.subTaskId] = rewritten
        console.log(`Complaint rewritten for sub-task ${subTask.subTaskId}:`, rewritten)
      }
    }
    setContext("professionalComplaints", rewrittenComplaints)
    console.log("Sentiment analysis and rewriting complete for all complaint sub-tasks.")
  } catch (err) {
    // Fallback unexpected error (shouldn't happen)
    console.log('{"status":"error","message":"' + (err.message || "Unknown error") + '"}')
    process.exit(0)
  }
})()
