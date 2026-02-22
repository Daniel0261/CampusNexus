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
          aiResponse = await callAI(extractedText)
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
