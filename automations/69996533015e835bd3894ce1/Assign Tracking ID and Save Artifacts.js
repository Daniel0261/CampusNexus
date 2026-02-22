// This step generates a tracking ID, saves request as JSON, and outputs PDF path, email, ID
const fs = require("fs-extra")
const { v4: uuidv4 } = require("uuid")

function safeGetContext(key) {
  try {
    return getContext(key)
  } catch (e) {
    console.warn(`Context key '${key}' not set. Using fallback/null.`)
    return null
  }
}

const input = safeGetContext("studentInput")
const aiProcessed = safeGetContext("aiProcessed")
const pdfPath = safeGetContext("pdfPath")
const emailDraft = safeGetContext("emailDraft")

// Check if minimum required context is present
if (!input || !aiProcessed) {
  const message = `Missing required context key(s): ${!input ? "studentInput" : ""}${!input && !aiProcessed ? ", " : ""}${!aiProcessed ? "aiProcessed" : ""}. Skipping artifact generation.`
  console.warn(message)
  setContext("tracking", { status: "no_data", message })
  console.log({ status: "no_data", message })
  process.exit(0)
}

const trackingId = uuidv4()
const artifact = {
  trackingId,
  input,
  aiProcessed,
  pdfPath,
  emailDraft,
  status: "Pending",
  createdAt: new Date().toISOString()
}

// Save or append to local JSON store
const storePath = "student_requests.json"
let store = []
if (fs.existsSync(storePath)) {
  try {
    store = fs.readJsonSync(storePath)
    if (!Array.isArray(store)) store = []
  } catch (e) {
    store = []
  }
}
store.push(artifact)
fs.writeJsonSync(storePath, store, { spaces: 2 })

setContext("tracking", { trackingId, pdfPath, emailDraft })
console.log("Artifacts saved:", { trackingId, pdfPath, emailDraft })
