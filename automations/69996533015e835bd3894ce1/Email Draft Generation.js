// Atomic update: Email Draft Generation now robust against missing aiProcessed and input context.
let aiProcessed, input, pdfPath
try {
  aiProcessed = getContext("aiProcessed")
} catch (e) {
  console.warn("No AI processed context available for Email Draft Generation:", e.message)
  setContext("emailDraft", { status: "no_data", message: "No AI processed context for Email Draft Generation" })
  process.exit(0)
}
try {
  input = getContext("studentInput")
} catch (e) {
  console.warn("No student input available for Email Draft Generation:", e.message)
  setContext("emailDraft", { status: "no_data", message: "No student input for Email Draft Generation" })
  process.exit(0)
}
try {
  pdfPath = getContext("pdfPath")
} catch (e) {
  pdfPath = undefined // gracefully handle missing pdfPath
}

if (!aiProcessed || typeof aiProcessed !== "object" || !aiProcessed.subject || !aiProcessed.letterBody || !input || typeof input !== "object" || !input.name || !input.rollNumber || !input.department) {
  setContext("emailDraft", { status: "no_data", message: "Required input/context fields missing for Email Draft Generation" })
  console.log("Email draft skipped due to invalid or incomplete input/context.")
  process.exit(0)
}

const html = `<p>Dear Sir/Madam,</p>
<p>Please find below my official request:</p>
<p><b>Subject:</b> ${aiProcessed.subject}</p>
<p>${aiProcessed.letterBody.replace(/\n/g, "<br>")}</p>
<p>Sincerely,<br>${input.name} (${input.rollNumber})<br>Department: ${input.department}</p>`

const text = `Dear Sir/Madam,\n\nPlease find below my official request:\nSubject: ${aiProcessed.subject}\n${aiProcessed.letterBody}\n\nSincerely,\n${input.name} (${input.rollNumber})\nDepartment: ${input.department}`

setContext("emailDraft", { html, text })
console.log("Email draft prepared. PDF path:", pdfPath)
