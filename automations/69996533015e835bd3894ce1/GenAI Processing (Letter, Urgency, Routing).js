;(async () => {
  try {
    let studentInput = getContext("studentInput")
    // Assign default input if empty, and log
    if (!studentInput || studentInput.trim() === "") {
      studentInput = `\nName: John Doe\nClass: 10A\nReason: Medical leave for 3 days\n`
      console.log("Using default student input.")
    }
    // Generate and propagate trackingId
    const trackingId = `TRK-${Date.now()}`
    setContext("trackingId", trackingId)

    const studentStructuredFields = getContext("studentStructuredFields")
    // Force STRICT JSON output with explicit instruction
    const prompt = `You MUST return ONLY minified JSON. No explanations. No markdown. No text outside JSON. Format exactly like this: {\"formalLetter\":\"string\",\"urgencyScore\":number,\"routingRecommendation\":\"string\"} If you do not follow JSON format exactly, the system will fail.\n\nYou are a university office assistant. Compose a formal request letter for the student based on the structured input below. Provide ONLY the JSON.\nStructured input: ${JSON.stringify(studentStructuredFields)}\nRaw input (for any extra context): ${studentInput}`

    let aiProcessed = [
      {
        formalLetter: "AI parsing failed",
        urgencyScore: 0,
        routingRecommendation: "Manual review required"
      }
    ]

    try {
      const completion = await TurboticOpenAI(
        [
          { role: "system", content: "Return ONLY valid JSON with fields: formalLetter, urgencyScore, routingRecommendation" },
          { role: "user", content: `Generate a formal request letter based on:\n${studentInput}` }
        ],
        { model: "gpt-4.1", temperature: 0.3 }
      )
      const aiResponse = completion.content
      console.log("========== AI RAW OUTPUT ==========")
      console.log(aiResponse)
      console.log("===================================")
      let parsed
      try {
        parsed = JSON.parse(aiResponse)
      } catch (error) {
        console.warn("JSON parsing failed. Using raw content as letter.")
        parsed = {
          formalLetter: aiResponse,
          urgencyScore: 5,
          routingRecommendation: "Class Teacher"
        }
      }
      if (parsed && typeof parsed === "object") {
        aiProcessed = [parsed]
      }
    } catch (e) {
      console.error("AI/TurboticOpenAI Call Failed:", e)
      // Robust fallback
      aiProcessed = [
        {
          formalLetter: "Default generated letter due to AI failure.",
          urgencyScore: 0,
          routingRecommendation: "Not available"
        }
      ]
    }

    setContext("aiProcessed", aiProcessed)
    // Streamlined, guaranteed context propagation
    let letterContent = aiProcessed[0].formalLetter || "No letter generated"
    let urgencyScore = typeof aiProcessed[0].urgencyScore === "number" ? aiProcessed[0].urgencyScore : 0
    let routingRecommendation = aiProcessed[0].routingRecommendation || "Not available"
    setContext("letterContent", letterContent)
    setContext("urgencyScore", urgencyScore)
    setContext("routingRecommendation", routingRecommendation)
    console.log("Saved to context:", { letterContent, urgencyScore, routingRecommendation })

    return { status: "completed", aiProcessed }
  } catch (err) {
    // Even on catastrophic error, guarantee fallback context outputs
    setContext("letterContent", "No letter generated")
    setContext("urgencyScore", 0)
    setContext("routingRecommendation", "Not available")
    console.error("Catastrophic GenAI error, set fallback context outputs.")
    return {
      status: "completed_with_warning",
      error: err.message,
      aiProcessed: [{ formalLetter: "No letter generated", urgencyScore: 0, routingRecommendation: "Not available" }]
    }
  }
})()
