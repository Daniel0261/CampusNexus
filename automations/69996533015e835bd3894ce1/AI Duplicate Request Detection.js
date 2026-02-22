// AI Duplicate Request Detection: Multi-Intent sub-task support
;(async () => {
  let studentSubTasks, recentRequests
  try {
    studentSubTasks = getContext("studentSubTasks")
  } catch (e) {
    process.stdout.write('{"status":"no_current_request","duplicate_found":false,"highest_similarity_score":0}')
    process.exit(0)
  }
  try {
    recentRequests = getContext("recentRequests")
  } catch (_) {
    recentRequests = []
  }
  if (!Array.isArray(recentRequests) || recentRequests == null) {
    recentRequests = []
    process.stdout.write('{"status":"no_previous_requests","duplicate_found":false,"highest_similarity_score":0}')
    process.exit(0)
  }
  if (!Array.isArray(studentSubTasks) || studentSubTasks.length === 0) {
    // fallback for backwards compatibility: check classic studentInput
    let studentInput = null
    try {
      studentInput = getContext("studentInput")
    } catch (e) {
      studentInput = null
    }
    if (!studentInput || typeof studentInput !== "object") {
      process.stdout.write('{"status":"no_current_request","duplicate_found":false,"highest_similarity_score":0}')
      process.exit(0)
    }
    // ... legacy code block for single request detection ...
    process.exit(0)
  }
  // Iterate on every sub-task
  const duplicateMap = {}
  for (const subTask of studentSubTasks) {
    let maxScore = 0
    let topMatch = null
    let mostSimilarTrackingId = null
    let explanation = ""
    let atLeastOneValidComparison = false
    for (const req of recentRequests) {
      let similarity_score = 0
      let is_duplicate = false
      let reasoning = ""
      let trackingId = req && req.trackingId ? req.trackingId : null
      try {
        const aiResp = await TurboticOpenAI(
          [
            {
              role: "user",
              content: `Evaluate semantic similarity (0-100) between two student requests. Give integer score and state if exact/near/casual/none. Consider intent, dates, reason, type. Request A: ${JSON.stringify(subTask)} Request B: ${JSON.stringify(req)}`
            }
          ],
          { model: "gpt-4.1", temperature: 0 }
        )
        const content = aiResp.content.trim()
        const scoreMatch = content.match(/(\d{1,3})/)
        similarity_score = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1]))) : 0
        is_duplicate = similarity_score >= 85
        reasoning = content.replace(/\n/g, " ")
        atLeastOneValidComparison = true
        if (similarity_score > maxScore) {
          maxScore = similarity_score
          topMatch = req
          mostSimilarTrackingId = trackingId
          explanation = reasoning
        }
      } catch (cmpErr) {
        continue
      }
    }
    duplicateMap[subTask.subTaskId] = {
      duplicate_found: maxScore >= 85,
      highest_similarity_score: maxScore,
      most_similar_tracking_id: mostSimilarTrackingId,
      explanation: explanation || (maxScore >= 85 ? "Similar request found." : "No similar requests found."),
      status: "completed"
    }
    console.log(`Duplicate evaluation complete for sub-task ${subTask.subTaskId} -- score: ${maxScore} explanation: ${explanation}`)
  }
  setContext("duplicateCheckMap", duplicateMap)
  process.stdout.write(JSON.stringify({ status: "completed", duplicateCheckMap: duplicateMap }))
  process.exit(0)
})()
