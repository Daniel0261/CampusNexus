// Step 1: Robust input validation, RegExp fix, and safe fallback output
let studentInput = typeof process.env.STUDENT_INPUT === "string" ? process.env.STUDENT_INPUT.trim() : ""
if (!studentInput || studentInput.includes("<REPLACE_WITH_ACTUAL_INPUT_FROM_FORM_OR_API>")) {
  return {
    status: "no_data",
    message: "No valid student input provided",
    sanitizedInput: {},
    studentSubTasks: []
  }
}

function detectLanguage(text) {
  if (/\u0C80-\u0CFF/.test(text)) return "Kannada"
  if (/\u0900-\u097F/.test(text)) return "Hindi"
  return "English"
}
const inputLanguage = detectLanguage(studentInput)
console.log(`Detected input language: ${inputLanguage}`)
const today = new Date()
const formattedToday = today.toISOString().split("T")[0]

const enhancedPrompt = `You are a multilingual conversational AI that parses student campus requests (English/Hindi/Kannada supported, reply in English).\n\nSTUDENT_MESSAGE: ${studentInput}\n\nDecompose this message into sub-tasks (multi-intent) by extracting strictly structured fields (dates, reason, urgency, documentType, category, any supporting files mentioned/requested, student ID, leave duration/frequency, and original chat text).\n\nFor each sub-task:\n1. Translate to official English.\n2. Extract all fields whether mentioned directly or implied in a conversational/natural phrasing.\n3. Assign a unique subTaskId.\n4. Output strict JSON: { trackingId, subTasks: [ { subTaskId, documentType, officialEnglish, extractedFields: { studentId, leaveStart, leaveEnd, leaveDurationDays, reason, urgency, category, supportingDocumentsRequired, chatOriginal }, original } ] }\n\nIf leave duration is >3 days, add 'supportingDocumentsRequired: ["medical certificate"]' to extractedFields.\nIf urgency is high, include a flag.\n\nReply in strict minified JSON only, never commentary or explanation.`

function generateTrackingId() {
  return "REQ-" + Math.random().toString(36).substr(2, 9).toUpperCase() + "-" + Date.now()
}

async function decomposeStudentInput() {
  try {
    const response = await TurboticOpenAI([{ role: "user", content: enhancedPrompt }], { model: "gpt-4.1", temperature: 0 })
    const jsonStr = response.content.match(/[\{\[].*[\}\]]/s)?.[0]
    if (!jsonStr) throw new Error("AI output missing valid array/object JSON")
    let decomposed
    try {
      decomposed = JSON.parse(jsonStr)
    } catch (err) {
      return {
        status: "ai_parse_error",
        message: "AI output invalid JSON",
        sanitizedInput: {},
        studentSubTasks: []
      }
    }
    // Safety: Ensure trackingId
    if (!decomposed.trackingId) decomposed.trackingId = generateTrackingId()
    if (!Array.isArray(decomposed.subTasks)) throw new Error("AI output missing subTasks array")
    decomposed.subTasks.forEach((task, i) => {
      if (!task.subTaskId) task.subTaskId = decomposed.trackingId + "-" + (i + 1)
    })
    setContext("parentTrackingId", decomposed.trackingId)
    setContext("studentSubTasks", decomposed.subTasks)
    setContext(
      "officialEnglishRequests",
      decomposed.subTasks.map(t => t.officialEnglish)
    )
    setContext(
      "studentStructuredFields",
      decomposed.subTasks.map(t => t.extractedFields)
    )
    // [Patch] Set main structured task in context as studentInput
    setContext("studentInput", decomposed.subTasks[0])
    console.log("Parent TrackingId:", decomposed.trackingId)
    console.log("Parsed student sub-tasks:", decomposed.subTasks)
  } catch (e) {
    console.error("Failed to parse/decompose student input:", e)
    return {
      status: "ai_parse_error",
      message: e.message,
      sanitizedInput: {},
      studentSubTasks: []
    }
  }
}

;(async () => {
  await decomposeStudentInput()
})()
