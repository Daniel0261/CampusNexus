const PDFDocument = require("pdfkit")
const fs = require("fs")

try {
  // Fetch letter content from context with robust fallback
  let letterContent
  try {
    letterContent = getContext("letterContent")
  } catch (err) {
    console.warn("letterContent missing — using fallback")
    letterContent = "No letter was generated."
  }

  if (!letterContent || typeof letterContent !== "string" || letterContent.trim() === "") {
    console.warn("Letter content missing or empty in context. Using placeholder.")
    letterContent = "No letter was generated."
  }

  // Mandatory log before PDF creation
  console.log("Letter Content Before PDF:", letterContent)

  // Create a new PDF document
  const doc = new PDFDocument()
  const filename = "request_letter.pdf"
  const writeStream = fs.createWriteStream(filename)

  // Pipe PDF to write stream
  doc.pipe(writeStream)

  // Write the letter content
  doc.fontSize(12).text(letterContent, {
    align: "left"
  })

  // Finalize
  doc.end()

  writeStream.on("finish", () => {
    console.log(`PDF file created: ${filename}`)
    // File should now appear as artifact in Turbotic UI
  })

  setContext("pdfArtifact", {
    filename,
    status: "generated",
    path: filename,
    message: "PDF file created and saved as artifact."
  })

  console.log("PDF Generation complete. File:", filename)
  console.log("You can download this file from the Turbotic UI artifact panel after workflow completion.")

  // Return status immediately (PDF stream will finish async)
  return { status: "completed", artifact: { filename, type: "pdf" } }
} catch (err) {
  console.error("Error generating PDF:", err)
  return {
    status: "completed_with_warning",
    error: err.message,
    pdfArtifact: { filename: "request_letter.pdf", status: "failed" }
  }
}
