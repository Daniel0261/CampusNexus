;(async () => {
  try {
    const studentStructuredFields = getContext("studentStructuredFields")
    const studentInput = getContext("studentInput")
    const trackingId = getContext("trackingId")
    const prompt = `You are a university office assistant. Compose a formal request letter for the student based on the structured input below. Provide:\n1. formalLetter (ready to send),\n2. urgencyScore (0-10, integer),\n3. routingRecommendation (route to: Department Head, Principal, HR, etc, based on leave reason or context).\nStructured input: ${JSON.stringify(studentStructuredFields)}\nRaw input (for any extra context): ${studentInput}\nTracking ID: ${trackingId}`

    let aiProcessed = [
      {
        formalLetter: "No letter generated",
        urgencyScore: 0,
        routingRecommendation: "Not available"
      }
    ]

    try {
      const aiResult = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
      // Try to parse output as JSON
      const parsed = JSON.parse(aiResult.content)
      if (parsed && typeof parsed === "object") {
        aiProcessed = [parsed]
      }
    } catch (_) {}

    setContext("aiProcessed", aiProcessed)
    return { status: "completed", aiProcessed }
  } catch (err) {
    return {
      status: "completed_with_warning",
      error: err.message,
      aiProcessed: [{ formalLetter: "No letter generated", urgencyScore: 0, routingRecommendation: "Not available" }]
    }
  }
})()
