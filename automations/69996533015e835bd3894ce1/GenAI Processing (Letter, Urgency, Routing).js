;(async () => {
  try {
    const studentStructuredFields = getContext("studentStructuredFields")
    const studentInput = getContext("studentInput")
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
      const completion = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
      const aiResponse = completion.content
      console.log("========== AI RAW OUTPUT ==========")
      console.log(aiResponse)
      console.log("===================================")
      let parsed
      try {
        parsed = JSON.parse(aiResponse)
      } catch (error) {
        console.error("JSON Parsing Failed:", error)
        parsed = {
          formalLetter: "AI parsing failed",
          urgencyScore: 0,
          routingRecommendation: "Manual review required"
        }
      }
      if (parsed && typeof parsed === "object") {
        aiProcessed = [parsed]
      }
    } catch (e) {
      console.error("AI/TurboticOpenAI Call Failed:", e)
    }

    setContext("aiProcessed", aiProcessed)
    // Set formal letter in context for downstream steps
    if (aiProcessed[0] && aiProcessed[0].formalLetter) {
      setContext("letterContent", aiProcessed[0].formalLetter)
      console.log("letterContent context key set successfully.")
    } else {
      console.warn("Could not set letterContent context key (missing formalLetter).")
    }
    console.log("FINAL GENERATED LETTER:", aiProcessed[0].formalLetter)
    console.log("URGENCY:", aiProcessed[0].urgencyScore)
    console.log("ROUTING:", aiProcessed[0].routingRecommendation)
    return { status: "completed", aiProcessed }
  } catch (err) {
    return {
      status: "completed_with_warning",
      error: err.message,
      aiProcessed: [{ formalLetter: "No letter generated", urgencyScore: 0, routingRecommendation: "Not available" }]
    }
  }
})()
