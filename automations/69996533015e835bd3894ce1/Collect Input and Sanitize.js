// Step 1: Enhanced user/student input processing with fallback and extended extraction
// Input: Prioritize user-supplied input via process.env.STUDENT_INPUT; fallback to default/demo example.
const rawStudentRequest = typeof process.env.STUDENT_INPUT === "string" && process.env.STUDENT_INPUT.trim() ? process.env.STUDENT_INPUT.trim() : "I am John Doe from Class 10, XYZ University. I need leave for 3 days due to illness."

function detectLanguage(text) {
  if (/[80-FF]/.test(text)) return "Kannada"
  if (/[	00-	7F]/.test(text)) return "Hindi"
  return "English"
}
const inputLanguage = detectLanguage(rawStudentRequest)
console.log(`Detected input language: ${inputLanguage}`)
const today = new Date()
const formattedToday = today.toISOString().split("T")[0]

// Enhanced prompt: now extract class and university info explicitly for each sub-task
const enhancedPrompt = `You are a multilingual conversational AI that parses student campus requests (English/Hindi/Kannada supported, reply in English).\n\nSTUDENT_MESSAGE: ${rawStudentRequest}\n\nDecompose this message into sub-tasks by extracting STRICTLY structured fields (dates, reason, type, urgency, documentType, category, any supporting files mentioned/requested, student ID, leave duration/frequency, CLASS (school/college/year), UNIVERSITY (or College/Institution), and original chat text). For each sub-task:\n1. Translate to official English.\n2. Extract all fields, even if only IMPLIED.\n3. Assign a unique subTaskId.\n4. OUTPUT STRICT MINIFIED JSON: { trackingId, subTasks: [ { subTaskId, documentType, officialEnglish, extractedFields: { studentId, leaveStart, leaveEnd, leaveDurationDays, reason, urgency, class, university, category, supportingDocumentsRequired, chatOriginal }, original } ] }\n\nIf leave duration is >3 days, add 'supportingDocumentsRequired: [\"medical certificate\"]' to extractedFields. If urgency is high, include a flag.\n\nReply in strict minified JSON only, no commentary or explanation.`

function generateTrackingId() {
  return "REQ-" + Math.random().toString(36).substr(2, 9).toUpperCase() + "-" + Date.now()
}

async function decomposeStudentInput() {
  try {
    const response = await TurboticOpenAI([{ role: "user", content: enhancedPrompt }], { model: "gpt-4.1", temperature: 0 })
    const jsonStr = response.content.match(/[\{\[].*[\}\]]/s)?.[0]
    if (!jsonStr) throw new Error("AI output missing valid array/object JSON")
    let decomposed = JSON.parse(jsonStr)
    // Safety: Ensure trackingId
    if (!decomposed.trackingId) decomposed.trackingId = generateTrackingId()
    if (!Array.isArray(decomposed.subTasks)) throw new Error("AI output missing subTasks array")
    // Safety: inject subTaskId if missing
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
    console.log("Parent TrackingId:", decomposed.trackingId)
    console.log("Parsed student sub-tasks:", decomposed.subTasks)
  } catch (e) {
    console.error("Failed to parse/decompose student input:", e)
    process.exit(1)
  }
}

;(async () => {
  await decomposeStudentInput()
})()
