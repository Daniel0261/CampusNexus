// Step 2: GenAI Processing for Multi-Intent Requests (letters, scientific scoring, routing, improvements)
;(async () => {
  const subTasks = getContext("studentSubTasks") || []
  const results = []

  for (const task of subTasks) {
    // Build OpenAI prompt for scientific priority & routing
    const prompt = `Given this student sub-request (intent):\\n${JSON.stringify(task, null, 2)}\\n\\nDo all of the following: 
1. Generate a formal, fully formatted letter addressing ONLY this sub-request. Subject, prose body, signature block. 
2. Scientifically score priority from 0 (not urgent) to 100 (maximum urgency) using: exam proximity, medical or financial hardship, pending days, academic risk, and give PRIORITY_JUSTIFICATION (e.g. 'Medical leave during finals week'). 
3. Route to correct department(s) using these rules: attendance < 60% → Academic Advisor; fee pending & leave → Accounts+Dean, complaint → Grievance Committee, else match Dean Office, Hostel, Accounts, Exam, Placement. Explain why this routing applies. 
4. List required policy clauses (from college rules, infer if known), required docs, missing attachments, and estimate approval timeline in days. 
5. Suggest improvements to the original request (clarity, tone, completeness).

Strictly output JSON array with these keys: letterBody, subject, priorityScore (0-100), priorityJustification, routeDepartments (array), routingExplanation, requiredPolicyClauses (array), requiredDocuments (array), missingAttachments (array), estimatedApprovalTimeDays, suggestionsForImprovement, healthScore (0-100, aggregated compliance+completeness+risk+approval probability), complianceScore, riskScore, approvalProbability, docCompletenessScore, professionalRewordedRequest`

    const aiRes = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
    let parsed
    try {
      parsed = JSON.parse(aiRes.content)
    } catch (e) {
      console.error("AI JSON parsing failed for sub-task", task, aiRes.content)
      continue
    }
    // Attach the tracking/subTask IDs for downstream linking
    parsed.parentTrackingId = getContext("parentTrackingId")
    parsed.subTaskId = task.subTaskId
    // Save (by sub-task) all useful context keys for downstream steps
    results.push(parsed)
    console.log(`Processed sub-task: ${task.subTaskId}`)
  }
  setContext("aiProcessedResults", results)
  console.log("All sub-tasks processed with GenAI:", results)
})()
