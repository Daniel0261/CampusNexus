async function genAIProcessing() {
  try {
    // Get required context inputs
    const subTasks = getContext("studentSubTasks")
    const parentTrackingId = getContext("parentTrackingId")
    const results = []

    // If subTasks are missing or empty, handle per schema
    if (!Array.isArray(subTasks) || subTasks.length === 0) {
      setContext("aiProcessed", [])
      return {
        status: "completed_with_warning",
        aiProcessed: [],
        warning: "no_subtasks_provided"
      }
    }

    // Sequential async processing of each sub-task
    for (let i = 0; i < subTasks.length; i++) {
      const task = subTasks[i]
      let aiResult = null
      try {
        // Call AI (sequential)
        const aiResponse = await TurboticOpenAI(
          [
            {
              role: "user",
              content: `Analyze the following sub-task for urgency, letter style, routing, risk, compliance. Task: ${JSON.stringify(task)}`
            }
          ],
          { model: "gpt-4.1", temperature: 0 }
        )

        // Try to parse JSON
        aiResult = JSON.parse(aiResponse.content)

        // Defensive: ensure all required fields are present
        results.push({
          subTaskId: aiResult.subTaskId || task.subTaskId || "UNKNOWN",
          parentTrackingId: parentTrackingId || "UNKNOWN",
          status: aiResult.status || "ai_success",
          urgencyScore: typeof aiResult.urgencyScore === "number" ? aiResult.urgencyScore : 0,
          formalLetter: typeof aiResult.formalLetter === "string" ? aiResult.formalLetter : null,
          routingRecommendation: typeof aiResult.routingRecommendation === "string" ? aiResult.routingRecommendation : null,
          riskScore: typeof aiResult.riskScore === "number" ? aiResult.riskScore : 0,
          complianceScore: typeof aiResult.complianceScore === "number" ? aiResult.complianceScore : 0
        })
      } catch (err) {
        // On AI call or JSON parse failure, fallback object
        results.push({
          subTaskId: task.subTaskId || "UNKNOWN",
          parentTrackingId: parentTrackingId || "UNKNOWN",
          status: "ai_parse_failed",
          urgencyScore: 0,
          formalLetter: null,
          routingRecommendation: null,
          riskScore: 0,
          complianceScore: 0
        })
      }
    }

    setContext("aiProcessed", results)
    return {
      status: "completed",
      processedCount: results.length
    }
  } catch (outerErr) {
    // Handle ANY async or sync error at the top level
    setContext("aiProcessed", [])
    return {
      status: "completed_with_warning",
      aiProcessed: [],
      warning: "unexpected_error",
      errorMessage: outerErr && outerErr.message ? outerErr.message : "Unknown async error"
    }
  }
}

return genAIProcessing()
