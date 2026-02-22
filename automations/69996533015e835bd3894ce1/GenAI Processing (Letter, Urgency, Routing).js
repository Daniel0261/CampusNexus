// Step 10: GenAI Processing (Letter, Urgency, Routing) - PRODUCTION UPGRADE
;(async () => {
  // Helper for defensive JSON extraction
  function extractJSON(text) {
    // Find the first {...} JSON block
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON found in AI output")
    return JSON.parse(match[0])
  }

  let subTasks
  try {
    subTasks = getContext("studentSubTasks") || []
  } catch (e) {
    subTasks = []
    console.warn("Context key studentSubTasks not set; using fallback. Error:", e?.message || e)
  }

  if (!Array.isArray(subTasks) || subTasks.length === 0) {
    setContext("aiProcessedResults", [])
    setContext("aiProcessed", {})
    console.warn("GenAI Processing: No valid studentSubTasks found in context. Returning strict fallback JSON.")
    return {
      status: "no_data",
      message: "Missing required context key: studentSubTasks",
      aiProcessedResults: []
    }
  }

  const results = []
  for (const task of subTasks) {
    // Strict prompt for reliable JSON extraction
    const basePrompt = `You are a Student Request Structuring Engine.\n\nCRITICAL RULES:\n- You MUST return ONLY valid JSON.\n- Do NOT include explanations.\n- Do NOT include markdown.\n- If you cannot extract a field, use null.\n- You must return EXACTLY this structure:\n{\n  \"requestType\": \"\",\n  \"studentName\": \"\",\n  \"rollNumber\": \"\",\n  \"department\": \"\",\n  \"dates\": \"\",\n  \"reason\": \"\",\n  \"urgencyLevel\": \"Low | Medium | High\"\n}\n\nINPUT:\nstudentText: ${JSON.stringify(task)}\n// Output ONLY JSON, nothing else.`
    let aiRes = null
    let parsed = null
    let retry = false

    // Main attempt: use JSON object mode if supported
    try {
      aiRes = await TurboticOpenAI([{ role: "user", content: basePrompt }], {
        model: "gpt-4.1",
        temperature: 0,
        response_format: { type: "json_object" }
      })
      parsed = typeof aiRes.content === "object" ? aiRes.content : extractJSON(aiRes.content)
    } catch (err) {
      console.warn("AI JSON object mode or parse failed, will retry with stricter prompt.", err?.message || err)
      retry = true
    }

    // Retry with stronger prompt if needed
    if (!parsed && retry) {
      const retryPrompt = `You are a Student Request Structuring Engine.\n\nYou MUST return ONLY valid JSON.\nDo NOT include explanations, markdown, or any text outside of the JSON object.\nIf you cannot extract a field, use null.\nReturn EXACTLY this structure:\n{\n  \"requestType\": \"\",\n  \"studentName\": \"\",\n  \"rollNumber\": \"\",\n  \"department\": \"\",\n  \"dates\": \"\",\n  \"reason\": \"\",\n  \"urgencyLevel\": \"Low | Medium | High\"\n}\nINPUT:\nstudentText: ${JSON.stringify(task)}\nRespond strictly with valid JSON only, no markdown or commentary.`
      try {
        aiRes = await TurboticOpenAI([{ role: "user", content: retryPrompt }], {
          model: "gpt-4.1",
          temperature: 0
        })
        parsed = extractJSON(aiRes.content)
        console.log("Retry succeeded on JSON extraction.")
      } catch (e2) {
        console.error("AI retry failed again, logging structured error.", e2?.message || e2)
        results.push({
          status: "ai_parse_error",
          message: "AI output invalid JSON after retry",
          studentText: task,
          structured: {
            requestType: null,
            studentName: null,
            rollNumber: null,
            department: null,
            dates: null,
            reason: null,
            urgencyLevel: "Low"
          }
        })
        continue
      }
    }

    if (parsed) {
      parsed.parentTrackingId = getContext("parentTrackingId")
      parsed.subTaskId = task.subTaskId
      results.push(parsed)
      console.log(`Processed sub-task: ${task.subTaskId}`)
    }
  }

  setContext("aiProcessedResults", results)
  setContext("aiProcessed", results[0])
  console.log("All sub-tasks processed with GenAI (production-robust):", results)
})()
