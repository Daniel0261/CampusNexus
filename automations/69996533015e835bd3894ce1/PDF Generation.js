const fs = require("fs-extra")
let PDFDocument
try {
  PDFDocument = require("pdfkit")
} catch (e) {
  console.error("PDFKit module not found: ", e)
  setContext("pdfResult", { status: "error", message: "Missing dependency: pdfkit module not found. PDF generation skipped." })
  process.exit(0)
}

;(async () => {
  try {
    let input = null,
      aiProcessed = {},
      docType = "leave letter",
      englishRequest = ""
    // Robust null-safe context reading
    try {
      input = getContext("studentInput")
    } catch (err) {
      input = null
    }
    try {
      aiProcessed = getContext("aiProcessed") || {}
    } catch (err) {
      aiProcessed = {}
    }
    try {
      docType = (getContext("documentType") || "leave letter").toLowerCase()
    } catch (err) {
      docType = "leave letter"
    }
    try {
      englishRequest = getContext("officialEnglishRequest") || ""
    } catch (err) {
      englishRequest = ""
    }

    if (!input || typeof input !== "object") {
      // Missing context, output minified strict result and exit gracefully
      console.warn("No valid studentInput found in context: skipping PDF generation.")
      setContext("pdfResult", { status: "no_data", message: "No student input for PDF generation" })
      process.exit(0)
    }

    const pdfPath = `letter_${input.name || "student"}_${Date.now()}.pdf`
    const doc = new PDFDocument()
    const stream = fs.createWriteStream(pdfPath)
    doc.pipe(stream)

    // Custom formatting for each document type
    if (docType === "leave letter") {
      doc.fontSize(18).text("Leave Letter - Official Campus Format", { align: "center" })
      doc.moveDown()
      doc.fontSize(12).text(`Name: ${input.name || ""}\nRoll No: ${input.rollNumber || ""}\nDepartment: ${input.department || ""}\nCategory: ${input.category || ""}\nLeave Start: ${input.leaveStartDate || ""}\nLeave End: ${input.leaveEndDate || ""}\nReason: ${input.reason || ""}\n\n`, { align: "left" })
      doc.text(aiProcessed.letterBody || englishRequest, { align: "left" })
    } else if (docType === "bonafide certificate request") {
      doc.fontSize(18).text("Bonafide Certificate Request", { align: "center" })
      doc.moveDown()
      doc.fontSize(12).text(`Name: ${input.name || ""}\nRoll No: ${input.rollNumber || ""}\nDepartment: ${input.department || ""}\nPurpose: ${input.purpose || "For certificate"}\n\n`, { align: "left" })
      doc.text(aiProcessed.letterBody || englishRequest, { align: "left" })
    } else if (docType === "internship permission letter") {
      doc.fontSize(18).text("Internship Permission Letter", { align: "center" })
      doc.moveDown()
      doc.fontSize(12).text(`Name: ${input.name || ""}\nRoll No: ${input.rollNumber || ""}\nDepartment: ${input.department || ""}\nOrganization: ${input.organization || ""}\nDuration: ${input.duration || ""}\n\n`, { align: "left" })
      doc.text(aiProcessed.letterBody || englishRequest, { align: "left" })
    } else {
      doc.fontSize(18).text("Student Request Document", { align: "center" })
      doc.moveDown()
      doc.fontSize(12).text(`Name: ${input.name || ""}\nRoll No: ${input.rollNumber || ""}\nDepartment: ${input.department || ""}\n\n`, { align: "left" })
      doc.text(aiProcessed.letterBody || englishRequest, { align: "left" })
    }

    doc.end()

    // Wait until PDF is written
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve)
      stream.on("error", reject)
    })
    setContext("pdfPath", pdfPath)
    console.log(`PDF file (${docType}) generated at`, pdfPath)
  } catch (e) {
    console.error("Error during PDF generation:", e)
    // On any other fatal/unknown error, fail safe but log as warning
    setContext("pdfResult", { status: "error", message: (e && e.message) || "Unknown PDF generation error" })
    process.exit(0)
  }
})()
