// Step 6: Crash-Proof Automated Document Evidence Analyzer - Strict Minified JSON Only, Robust Handling
const textract = require("textract")
const fs = require("fs")
let studentSubTasks, parentTrackingId, evidenceFiles

try {
  studentSubTasks = getContext("studentSubTasks")
  parentTrackingId = getContext("parentTrackingId")
} catch (e) {
  studentSubTasks = null
  parentTrackingId = null
}

try {
  evidenceFiles = getContext("evidenceFiles")
} catch (e) {
  evidenceFiles = null
}

function minified(obj) {
  // forcibly stringify/minify (no indentation)
  return JSON.stringify(obj)
}

async function extractTextSafe(filePath) {
  try {
    const ext = filePath.split(".").pop().toLowerCase()
    if (ext === "pdf") {
      // Load and parse PDF with buffer (use fallback logic if unavailable)
      const dataBuffer = fs.readFileSync(filePath)
      // Try catch PDF parse to avoid crash (user environment may not have PDFParse)
      try {
        const pdfParse = require("pdf-parse")
        const result = await pdfParse(dataBuffer)
        return result.text
      } catch (e) {
        /* If pdf-parse not present, fallback to empty */ return ""
      }
    } else {
      // Other docs use textract (hard fail yields empty text)
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

async function analyzeEvidenceBatch() {
  let output = []
  // Multi-intent group-aware
  if (studentSubTasks && Array.isArray(studentSubTasks) && studentSubTasks.length > 0) {
    for (const subTask of studentSubTasks) {
      let taskResults = []
      if (!evidenceFiles || !Array.isArray(evidenceFiles) || evidenceFiles.length === 0) {
        output.push({ parentTrackingId: parentTrackingId || "", subTaskId: subTask.subTaskId || "", evidenceResults: [] })
        continue
      }
      for (const file of evidenceFiles) {
        let extracted_text = null
        try {
          extracted_text = await extractTextSafe(file.path)
        } catch (ex) {
          taskResults.push({ status: "extraction_error", reason: ex.message || "file extraction failed" })
          continue
        }
        if (!extracted_text || typeof extracted_text !== "string" || extracted_text.trim().length < 50) {
          taskResults.push({ status: "extraction_failed", reason: "Insufficient readable text", confidence_score: 0 })
          continue
        }
        // Ensure token safety by trimming
        let safe_text = extracted_text
        if (safe_text.length > 3000) safe_text = safe_text.substring(0, 3000)
        // Compose safe AI prompt
        const aiInput = `You are a document evidence validation engine. STRICT RULES: Return ONLY valid minified JSON. No markdown. No explanation. No additional text. If extracted_text is null, empty, or < 50 characters: Return: {"status": "extraction_failed", "reason": "Insufficient readable text", "confidence_score": 0} Otherwise: 1. Identify document_type (Medical Certificate, Fee Receipt, Internship Letter, Identity Proof, Unknown) 2. Extract: Student Name, Issue Date, Validity Date (if present), Institution Name 3. Check consistency (name match, date overlap, relevance to request type) 4. Flag risks (missing signature indicators, missing date, suspicious wording) Return EXACT structure: {"status": "success","document_type": "","extracted_fields": {},"consistency_check": {"name_match":true,"date_match":true,"relevant":true},"risk_flags":[],"confidence_score":0} This prevents malformed output. extracted_text:\n${safe_text}\nrequest_type:${subTask.intentType || ""}\ncontext:${JSON.stringify(subTask)}`
        let aiResult = null
        let aiParseAttempted = false
        try {
          const resp = await TurboticOpenAI([{ role: "user", content: aiInput }], { model: "gpt-4.1", temperature: 0 })
          aiResult = resp.content
          aiParseAttempted = true
        } catch (err) {
          // AI call failed
          taskResults.push({ status: "ai_failed", reason: err.message || "AI not available" })
          continue
        }
        let parsedJson = null
        if (aiParseAttempted) {
          try {
            parsedJson = JSON.parse(aiResult)
            // If status missing, wrap
            if (!parsedJson.status) parsedJson.status = "success"
            taskResults.push(parsedJson)
          } catch (parseErr) {
            // Wrap as error per instructions
            taskResults.push({ status: "analysis_failed", reason: "Invalid AI JSON", raw_output: (aiResult || "").slice(0, 350) })
          }
        } else {
          taskResults.push({ status: "analysis_failed", reason: "AI output not attempted" })
        }
      }
      output.push({ parentTrackingId: parentTrackingId || "", subTaskId: subTask.subTaskId || "", evidenceResults: taskResults })
    }
  } else {
    // Fallback legacy (classic flat input)
    let studentInput = null
    try {
      studentInput = getContext("studentInput")
    } catch (e) {
      studentInput = null
    }
    if (!studentInput || !evidenceFiles || !Array.isArray(evidenceFiles) || evidenceFiles.length === 0) {
      setContext("evidenceAnalysis", { status: "completed", evidenceAnalysis: [] })
      return
    }
    let taskResults = []
    for (const file of evidenceFiles) {
      let extracted_text = null
      try {
        extracted_text = await extractTextSafe(file.path)
      } catch (ex) {
        taskResults.push({ status: "extraction_error", reason: ex.message || "file extraction failed" })
        continue
      }
      if (!extracted_text || typeof extracted_text !== "string" || extracted_text.trim().length < 50) {
        taskResults.push({ status: "extraction_failed", reason: "Insufficient readable text", confidence_score: 0 })
        continue
      }
      let safe_text = extracted_text
      if (safe_text.length > 3000) safe_text = safe_text.substring(0, 3000)
      const aiInput = `You are a document evidence validation engine. STRICT RULES: Return ONLY valid minified JSON. No markdown. No explanation. No additional text. If extracted_text is null, empty, or < 50 characters: Return: {"status": "extraction_failed", "reason": "Insufficient readable text", "confidence_score": 0} Otherwise: 1. Identify document_type (Medical Certificate, Fee Receipt, Internship Letter, Identity Proof, Unknown) 2. Extract: Student Name, Issue Date, Validity Date (if present), Institution Name 3. Check consistency (name match, date overlap, relevance to request type) 4. Flag risks (missing signature indicators, missing date, suspicious wording) Return EXACT structure: {"status": "success","document_type": "","extracted_fields": {},"consistency_check": {"name_match":true,"date_match":true,"relevant":true},"risk_flags":[],"confidence_score":0} This prevents malformed output. extracted_text:\n${safe_text}\nrequest_type:${studentInput.intentType || ""}\ncontext:${JSON.stringify(studentInput)}`
      let aiResult = null
      let aiParseAttempted = false
      try {
        const resp = await TurboticOpenAI([{ role: "user", content: aiInput }], { model: "gpt-4.1", temperature: 0 })
        aiResult = resp.content
        aiParseAttempted = true
      } catch (err) {
        // AI call failed
        taskResults.push({ status: "ai_failed", reason: err.message || "AI not available" })
        continue
      }
      let parsedJson = null
      if (aiParseAttempted) {
        try {
          parsedJson = JSON.parse(aiResult)
          if (!parsedJson.status) parsedJson.status = "success"
          taskResults.push(parsedJson)
        } catch (parseErr) {
          taskResults.push({ status: "analysis_failed", reason: "Invalid AI JSON", raw_output: (aiResult || "").slice(0, 350) })
        }
      } else {
        taskResults.push({ status: "analysis_failed", reason: "AI output not attempted" })
      }
    }
    output.push({ parentTrackingId: parentTrackingId || "", subTaskId: studentInput.subTaskId || "", evidenceResults: taskResults })
  }
  if (!Array.isArray(output)) output = []
  setContext("evidenceAnalysis", { status: "completed", evidenceAnalysis: output })
}

;(async () => {
  await analyzeEvidenceBatch()
})()
