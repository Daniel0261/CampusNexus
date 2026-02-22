// Step 6: Refactored Automated Document Evidence Analyzer with Bulletproof Reliability Checklist
const textract = require("textract")
const fs = require("fs")

async function main() {
  // Strict context defaults
  let studentSubTasks = []
  let evidenceFiles = []
  let parentTrackingId = "UNKNOWN_TRACKING_ID"

  try {
    const subTasksRaw = getContext("studentSubTasks")
    studentSubTasks = Array.isArray(subTasksRaw) ? subTasksRaw : []
  } catch (e) {
    studentSubTasks = []
  }

  try {
    const filesRaw = getContext("evidenceFiles")
    evidenceFiles = Array.isArray(filesRaw) ? filesRaw : []
  } catch (e) {
    evidenceFiles = []
  }

  try {
    const trackingIdRaw = getContext("parentTrackingId")
    parentTrackingId = trackingIdRaw || "UNKNOWN_TRACKING_ID"
  } catch (e) {
    parentTrackingId = "UNKNOWN_TRACKING_ID"
  }

  function minified(obj) {
    return JSON.stringify(obj)
  }

  async function extractTextSafe(filePath) {
    try {
      const ext = ("" + filePath).split(".").pop().toLowerCase()
      if (ext === "pdf") {
        try {
          const dataBuffer = fs.readFileSync(filePath)
          const pdfParse = require("pdf-parse")
          const result = await pdfParse(dataBuffer)
          return result.text
        } catch (e) {
          return ""
        }
      } else {
        return await new Promise(resolve => {
          textract.fromFileWithPath(filePath, (err, text) => {
            if (err || !text) resolve("")
            else resolve(text)
          })
        })
      }
    } catch (e) {
      return ""
    }
  }

  let output = []
  try {
    // Process for studentSubTasks if array, else fallback
    const tasks = Array.isArray(studentSubTasks) ? studentSubTasks : []
    const files = Array.isArray(evidenceFiles) ? evidenceFiles : []
    if (tasks.length > 0) {
      for (const subTask of tasks) {
        let taskResults = []
        if (files.length === 0) {
          output.push({ parentTrackingId, subTaskId: subTask.subTaskId || "", evidenceResults: [] })
          continue
        }
        // Sequential file evidence processing
        for (const file of files) {
          let extracted_text = null
          try {
            extracted_text = await extractTextSafe(file.path)
          } catch (error) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "system_error", error: error && error.message ? error.message : "file extraction failed" })
            continue
          }
          if (!extracted_text || typeof extracted_text !== "string" || extracted_text.trim().length < 50) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "extraction_failed", error: "Insufficient readable text", confidence_score: 0 })
            continue
          }
          let safe_text = extracted_text
          if (safe_text.length > 3000) safe_text = safe_text.substring(0, 3000)
          const aiInput = `You are a document evidence validation engine. STRICT RULES: Return ONLY valid minified JSON. No markdown. No explanation. No additional text. If extracted_text is null, empty, or < 50 characters: Return: {\"status\": \"extraction_failed\", \"reason\": \"Insufficient readable text\", \"confidence_score\": 0} Otherwise: 1. Identify document_type (Medical Certificate, Fee Receipt, Internship Letter, Identity Proof, Unknown) 2. Extract: Student Name, Issue Date, Validity Date (if present), Institution Name 3. Check consistency (name match, date overlap, relevance to request type) 4. Flag risks (missing signature indicators, missing date, suspicious wording) Return EXACT structure: {\"status\": \"success\",\"document_type\": \"\",\"extracted_fields\": {},\"consistency_check\": {\"name_match\":true,\"date_match\":true,\"relevant\":true},\"risk_flags\":[],\"confidence_score\":0} This prevents malformed output. extracted_text:\n${safe_text}\nrequest_type:${subTask.intentType || ""}\ncontext:${JSON.stringify(subTask)}`
          let aiResult = null
          let aiParseAttempted = false
          try {
            const resp = await TurboticOpenAI([{ role: "user", content: aiInput }], { model: "gpt-4.1", temperature: 0 })
            aiResult = resp.content
            aiParseAttempted = true
          } catch (err) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "ai_failed", error: err && err.message ? err.message : "AI not available" })
            continue
          }
          let parsedJson = null
          if (aiParseAttempted) {
            try {
              parsedJson = JSON.parse(aiResult)
              if (!parsedJson.status) parsedJson.status = "success"
              parsedJson.fileName = file.fileName || file.path || "unknown"
              taskResults.push(parsedJson)
            } catch (parseErr) {
              taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "analysis_failed", error: "Invalid AI JSON", raw_output: (aiResult || "").slice(0, 350) })
            }
          } else {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "analysis_failed", error: "AI output not attempted" })
          }
        }
        output.push({ parentTrackingId, subTaskId: subTask.subTaskId || "", evidenceResults: taskResults })
      }
    } else {
      // Fallback legacy (classic flat input)
      let studentInput = null
      try {
        studentInput = getContext("studentInput")
      } catch (e) {
        studentInput = null
      }
      if (!studentInput || files.length === 0) {
        output = []
      } else {
        let taskResults = []
        for (const file of files) {
          let extracted_text = null
          try {
            extracted_text = await extractTextSafe(file.path)
          } catch (error) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "system_error", error: error && error.message ? error.message : "file extraction failed" })
            continue
          }
          if (!extracted_text || typeof extracted_text !== "string" || extracted_text.trim().length < 50) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "extraction_failed", error: "Insufficient readable text", confidence_score: 0 })
            continue
          }
          let safe_text = extracted_text
          if (safe_text.length > 3000) safe_text = safe_text.substring(0, 3000)
          const aiInput = `You are a document evidence validation engine. STRICT RULES: Return ONLY valid minified JSON. No markdown. No explanation. No additional text. If extracted_text is null, empty, or < 50 characters: Return: {\"status\": \"extraction_failed\", \"reason\": \"Insufficient readable text\", \"confidence_score\": 0} Otherwise: 1. Identify document_type (Medical Certificate, Fee Receipt, Internship Letter, Identity Proof, Unknown) 2. Extract: Student Name, Issue Date, Validity Date (if present), Institution Name 3. Check consistency (name match, date overlap, relevance to request type) 4. Flag risks (missing signature indicators, missing date, suspicious wording) Return EXACT structure: {\"status\": \"success\",\"document_type\": \"\",\"extracted_fields\": {},\"consistency_check\": {\"name_match\":true,\"date_match\":true,\"relevant\":true},\"risk_flags\":[],\"confidence_score\":0} This prevents malformed output. extracted_text:\n${safe_text}\nrequest_type:${studentInput.intentType || ""}\ncontext:${JSON.stringify(studentInput)}`
          let aiResult = null
          let aiParseAttempted = false
          try {
            const resp = await TurboticOpenAI([{ role: "user", content: aiInput }], { model: "gpt-4.1", temperature: 0 })
            aiResult = resp.content
            aiParseAttempted = true
          } catch (err) {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "ai_failed", error: err && err.message ? err.message : "AI not available" })
            continue
          }
          let parsedJson = null
          if (aiParseAttempted) {
            try {
              parsedJson = JSON.parse(aiResult)
              if (!parsedJson.status) parsedJson.status = "success"
              parsedJson.fileName = file.fileName || file.path || "unknown"
              taskResults.push(parsedJson)
            } catch (parseErr) {
              taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "analysis_failed", error: "Invalid AI JSON", raw_output: (aiResult || "").slice(0, 350) })
            }
          } else {
            taskResults.push({ fileName: file.fileName || file.path || "unknown", status: "analysis_failed", error: "AI output not attempted" })
          }
        }
        output.push({ parentTrackingId, subTaskId: studentInput.subTaskId || "", evidenceResults: taskResults })
      }
    }
    // Evidence array validation
    if (!Array.isArray(output)) output = []
    setContext("evidenceAnalysis", { status: "completed", evidenceAnalysis: output })
    return { status: "completed", evidenceAnalysis: output }
  } catch (systemError) {
    // Catastrophic system error (outside processing logic)
    setContext("evidenceAnalysis", { status: "failed", evidenceAnalysis: [] })
    return { status: "failed", evidenceAnalysis: [] }
  }
}

;(async () => {
  try {
    await main()
  } catch (catError) {
    setContext("evidenceAnalysis", { status: "failed", evidenceAnalysis: [] })
    return { status: "failed", evidenceAnalysis: [] }
  }
})()
