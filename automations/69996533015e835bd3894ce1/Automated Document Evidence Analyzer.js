// Step 5: ULTRA-STABLE Automated Document Evidence Analyzer (No external dependency)
module.exports = async function (context) {
  const safeResult = {
    status: "completed",
    evidenceAnalysis: []
  }
  try {
    const studentSubTasks = Array.isArray(context?.studentSubTasks) ? context.studentSubTasks : []
    const evidenceFiles = Array.isArray(context?.evidenceFiles) ? context.evidenceFiles : []
    if (studentSubTasks.length === 0 || evidenceFiles.length === 0) {
      return {
        status: "no_data",
        evidenceAnalysis: []
      }
    }
    for (const task of studentSubTasks) {
      const taskResult = {
        trackingId: task?.trackingId || "unknown",
        files: []
      }
      for (const file of evidenceFiles) {
        let extractedText = ""
        try {
          if (!file || !file.buffer) {
            throw new Error("Invalid file buffer")
          }
          // Safe text extraction from buffer (platform managed files only)
          extractedText = file.buffer.toString("utf8").slice(0, 5000)
        } catch {
          taskResult.files.push({
            fileName: file?.name || "unknown",
            status: "extraction_failed"
          })
          continue
        }
        if (!extractedText || extractedText.length < 50) {
          taskResult.files.push({
            fileName: file?.name || "unknown",
            status: "insufficient_text"
          })
          continue
        }
        let aiResponse = "{}"
        try {
          if (typeof callAI !== "function") {
            throw new Error("AI not available")
          }
          // Use ultra-strict prompt as per user requirement
          const strictPrompt = `Robust AI Prompt (Strict JSON Enforcement)\nYou are a strict document validation engine.\n\nAnalyze the extracted document text and determine whether it is valid evidence for a student request.\n\nIMPORTANT RULES:\n1. Return ONLY valid JSON.\n2. Do NOT include explanations.\n3. Do NOT include markdown.\n4. Do NOT include code blocks.\n5. Do NOT include any text before or after the JSON.\n6. If information is missing, use null.\n7. The response MUST be a single valid JSON object.\n8. Do NOT pretty print. Return minified JSON.\n\nRequired JSON structure:\n\n{\n  \"isRelevant\": true,\n  \"documentType\": \"Medical Certificate | Fee Receipt | Leave Letter | Complaint Proof | Other\",\n  \"confidenceScore\": 0.0,\n  \"extractedKeyDetails\": {\n    \"studentName\": \"\",\n    \"datesMentioned\": \"\",\n    \"issuingAuthority\": \"\",\n    \"referenceNumber\": \"\"\n  },\n  \"validationStatus\": \"valid | partially_valid | invalid\",\n  \"reasonIfInvalid\": \"\"\n}\n\nNow analyze the following document text:\n\n${extractedText}`
          aiResponse = await callAI(strictPrompt)
        } catch {
          taskResult.files.push({
            fileName: file?.name || "unknown",
            status: "ai_call_failed"
          })
          continue
        }
        let parsed
        try {
          parsed = JSON.parse(aiResponse)
        } catch {
          parsed = {
            validationStatus: "analysis_failed",
            confidenceScore: 0
          }
        }
        taskResult.files.push({
          fileName: file?.name || "unknown",
          status: "analyzed",
          result: parsed
        })
      }
      safeResult.evidenceAnalysis.push(taskResult)
    }
    return safeResult
  } catch (outerError) {
    return {
      status: "error",
      message: outerError?.message || "unknown_error",
      evidenceAnalysis: []
    }
  }
}
