;(async () => {
  try {
    let studentInput = getContext("studentInput")
    if (!studentInput || studentInput.trim() === "") {
      studentInput = `\nMy name is Daniel Thomas.\nRoll Number: 23CS104.\nDepartment: Computer Science.\nClass: 3rd Year.\nI request leave from 24 Feb 2026 to 27 Feb 2026 due to medical reasons.\n`
    }
    // Use OpenAI (Turbotic helper) to extract fields
    const extractionPrompt = `Extract the following structured fields from the student input.\nStudent input: ${studentInput}\n\nReturn a JSON object with: studentName, rollNumber, department, class, leaveDates (try your best to fill these fields based on content). Also return trackingId if available.`
    let studentStructuredFields = {
      studentName: "Unknown",
      rollNumber: "Unknown",
      department: "Unknown",
      class: "Unknown",
      leaveDates: "Unknown"
    }
    let trackingId = undefined
    try {
      const openAiResult = await TurboticOpenAI([{ role: "user", content: extractionPrompt }], { model: "gpt-4.1", temperature: 0 })
      try {
        // Try JSON parsing
        const parsed = JSON.parse(openAiResult.content)
        if (parsed && typeof parsed === "object") {
          studentStructuredFields = { ...studentStructuredFields, ...parsed }
          // Use AI-provided trackingId if present and valid
          trackingId = parsed.trackingId && typeof parsed.trackingId === "string" && parsed.trackingId.trim().length > 0 ? parsed.trackingId : undefined
        }
      } catch (_) {
        /* Parsing failed, use fallback */
      }
    } catch (err) {
      // Fallback fields already set
    }
    setContext("studentInput", studentInput)
    setContext("studentStructuredFields", studentStructuredFields)
    // Only set trackingId if not available from AI
    if (!trackingId) {
      trackingId = `TRK-${Date.now()}`
      console.log("trackingId missing from AI output — generating fallback.")
    }
    setContext("trackingId", trackingId)
    console.log("Student Structured Fields:", JSON.stringify(studentStructuredFields))
    return { status: "completed", studentInput, studentStructuredFields }
  } catch (err) {
    return {
      status: "completed_with_warning",
      error: err.message,
      studentInput: `My name is Daniel Thomas.\nRoll Number: 23CS104.\nDepartment: Computer Science.\nClass: 3rd Year.\nI request leave from 24 Feb 2026 to 27 Feb 2026 due to medical reasons.`,
      studentStructuredFields: {
        studentName: "Unknown",
        rollNumber: "Unknown",
        department: "Unknown",
        class: "Unknown",
        leaveDates: "Unknown"
      }
    }
  }
})()
