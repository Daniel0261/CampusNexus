// Step 6: Collect Input and Sanitize (Production-Grade Reliability)
// This step parses the AI response for structured student request objects.
// It NEVER crashes or exits fatally; fallback logic is always available.

;(async () => {
  try {
    const originalStudentInput = process.env.STUDENT_INPUT ? String(process.env.STUDENT_INPUT).trim() : ""

    if (!originalStudentInput) {
      setContext("parentTrackingId", null)
      setContext("studentSubTasks", null)
      setContext("officialEnglishRequests", null)
      setContext("studentStructuredFields", null)
      return { status: "failed", warning: "missing_student_input" }
    }

    // Detect input language (optional)
    let lang = "English"
    try {
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(originalStudentInput)) lang = "Japanese"
      else if (/[\u4e00-\u9faf]/.test(originalStudentInput)) lang = "Chinese"
      else if (/[ก-๙]/.test(originalStudentInput)) lang = "Thai"
      // Expand this for other languages as needed
      // Default: English
    } catch (langErr) {
      lang = "English"
    }

    // Request AI to parse input as structured minified JSON
    const prompt = `Parse and structure below student request. Reply ONLY with minified JSON array of sub-tasks. Each sub-task must contain: subTaskId, requestText, requestType. Student input (in ${lang}): ${originalStudentInput}`
    let aiResponse, subTasks, parentTrackingId, officialEnglishRequests, studentStructuredFields
    let fallbackUsed = false

    try {
      const aiResult = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
      aiResponse = aiResult.content || ""
      // First, try to parse the whole response directly
      subTasks = JSON.parse(aiResponse)
    } catch (err1) {
      // Log the raw AI response on parse failure
      if (aiResponse) console.error("AI raw response:", aiResponse)
      // Try regex extraction of JSON object
      try {
        const match = aiResponse && aiResponse.match(/\{[\s\S]*\}/)
        if (match) {
          subTasks = JSON.parse(match[0])
        }
      } catch (err2) {
        // Still nothing; fallback will be used
      }
    }

    // Fallback if subTasks is still invalid
    if (!subTasks || typeof subTasks !== "object" || (Array.isArray(subTasks) && subTasks.length === 0)) {
      fallbackUsed = true
      const now = Date.now()
      parentTrackingId = `AUTO-${now}`
      subTasks = [
        {
          subTaskId: `SUB-${now}`,
          requestText: originalStudentInput,
          requestType: "General Request"
        }
      ]
      officialEnglishRequests = subTasks.map(t => t.requestText)
      studentStructuredFields = { fallback: true }
    } else {
      // If valid, set outputs as expected
      parentTrackingId = typeof subTasks === "object" && subTasks.trackingId ? subTasks.trackingId : `AUTO-${Date.now()}`
      // Flatten: if response wraps subTasks, extract; else use as is
      if ("subTasks" in subTasks) {
        subTasks = subTasks.subTasks
      }
      officialEnglishRequests = Array.isArray(subTasks) ? subTasks.map(t => t.requestText) : []
      studentStructuredFields = subTasks
    }

    setContext("parentTrackingId", parentTrackingId)
    setContext("studentSubTasks", subTasks)
    setContext("officialEnglishRequests", officialEnglishRequests)
    setContext("studentStructuredFields", studentStructuredFields)

    if (fallbackUsed) {
      return {
        status: "completed_with_fallback",
        warning: "ai_parse_failed_using_fallback"
      }
    } else {
      return { status: "ok" }
    }
  } catch (fatalErr) {
    // Top-level catch: fallback as last resort
    console.error("Fatal error caught in Collect Input and Sanitize:", fatalErr)
    try {
      const now = Date.now()
      const parentTrackingId = `AUTO-${now}`
      const originalStudentInput = process.env.STUDENT_INPUT ? String(process.env.STUDENT_INPUT).trim() : ""
      const subTasks = [
        {
          subTaskId: `SUB-${now}`,
          requestText: originalStudentInput,
          requestType: "General Request"
        }
      ]
      const officialEnglishRequests = subTasks.map(t => t.requestText)
      const studentStructuredFields = { fallback: true }
      setContext("parentTrackingId", parentTrackingId)
      setContext("studentSubTasks", subTasks)
      setContext("officialEnglishRequests", officialEnglishRequests)
      setContext("studentStructuredFields", studentStructuredFields)
      return {
        status: "completed_with_fallback",
        warning: "ai_parse_failed_using_fallback"
      }
    } catch (fallbackError) {
      // Fallback even failed; output hard fail, but still do not throw/crash
      setContext("parentTrackingId", null)
      setContext("studentSubTasks", null)
      setContext("officialEnglishRequests", null)
      setContext("studentStructuredFields", null)
      return { status: "failed", warning: "double_fallback_failed" }
    }
  }
})()
