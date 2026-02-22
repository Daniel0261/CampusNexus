;(async () => {
  // Constants
  const SLA_THRESHOLD = 3
  /**
   * Utility: Safe context fetch with fallback and logging
   */
  async function safeGetContext(key, fallback = null) {
    try {
      const val = await getContext(key)
      if (typeof val === "undefined" || val === null) throw new Error("Context key not set")
      return val
    } catch (error) {
      process.stdout.write(`[INFO] Context key ${key} not set; using fallback. Error: ${error.message}\n`)
      return fallback
    }
  }

  /**
   * Utility: Robustly log and set status/result
   */
  async function finish(status, message, details) {
    const output = { status, message, details }
    process.stdout.write(JSON.stringify(output) + "\n")
    await setContext("emailFollowUpStatus", output)
    return output
  }

  try {
    // 1. Try batch mode
    const studentSubTasks = await safeGetContext("studentSubTasks", null)
    const parentTrackingId = await safeGetContext("parentTrackingId", null)

    if (Array.isArray(studentSubTasks) && studentSubTasks.length > 0) {
      // Multi-intent mode
      let results = []
      for (let [i, sub] of studentSubTasks.entries()) {
        try {
          // Extraction/validation
          const studentName = sub?.studentName || null
          const rollNumber = sub?.rollNumber || null
          const leaveDates = sub?.leaveDates || null
          const reason = sub?.reason || null
          const pendingDays = Number.isFinite(sub?.pendingDays) ? sub.pendingDays : null
          const email = sub?.email || null
          if (!studentName || !rollNumber || !Array.isArray(leaveDates) || !reason || pendingDays === null || !email) {
            results.push({ idx: i, status: "skipped", reason: "Missing required fields", sub })
            continue
          }
          if (pendingDays <= SLA_THRESHOLD) {
            results.push({ idx: i, status: "skipped", reason: "Within SLA", sub })
            continue
          }

          // Prepare OpenAI prompt
          const prompt = `Compose a polite reminder email to ${studentName} (Roll: ${rollNumber}) regarding ${reason} (dates ${leaveDates.join(", ")}) pending for ${pendingDays} days.`
          let draft
          try {
            const aiResp = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
            if (!aiResp || typeof aiResp.content !== "string" || !aiResp.content.trim()) {
              throw new Error("No AI response")
            }
            draft = aiResp.content.trim()
          } catch (aiErr) {
            results.push({ idx: i, status: "failed", reason: `OpenAI error: ${aiErr.message}`, sub })
            continue
          }

          // Send email
          let mailRes
          try {
            mailRes = await sendEmailViaTurbotic({
              to: email,
              subject: `Reminder: Action Required for ${reason}`,
              text: draft,
              html: `<p>${draft.replace(/\n/g, "<br>")}</p>`
            })
            if (!mailRes || mailRes.success !== true) {
              throw new Error(mailRes && mailRes.message ? mailRes.message : "Unknown")
            }
          } catch (mailErr) {
            results.push({ idx: i, status: "failed", reason: `Email send error: ${mailErr.message}`, sub })
            continue
          }
          results.push({ idx: i, status: "success", sub })
          process.stdout.write(`[INFO] Batch sub-task #${i} processed successfully.\n`)
        } catch (innerErr) {
          results.push({ idx: i, status: "failed", reason: `Fatal error: ${innerErr.message}`, sub })
        }
      }
      // Summarize
      const nSuccess = results.filter(r => r.status === "success").length
      const nFailed = results.filter(r => r.status === "failed").length
      const nSkipped = results.filter(r => r.status === "skipped").length
      let status = nFailed > 0 && nSuccess === 0 ? "failed" : nSuccess > 0 ? "success" : "skipped"
      let message = `Batch mode: ${nSuccess} succeeded, ${nFailed} failed, ${nSkipped} skipped.`
      await finish(status, message, results)
      return
    }

    // Fallback: try legacy single mode
    const studentInput = await safeGetContext("studentInput", null)
    const tracking = await safeGetContext("tracking", null)

    if (studentInput && typeof studentInput === "object") {
      const studentName = studentInput?.studentName || null
      const rollNumber = studentInput?.rollNumber || null
      const leaveDates = studentInput?.leaveDates || null
      const reason = studentInput?.reason || null
      const pendingDays = Number.isFinite(studentInput?.pendingDays) ? studentInput.pendingDays : null
      const email = studentInput?.email || null
      if (!studentName || !rollNumber || !Array.isArray(leaveDates) || !reason || pendingDays === null || !email) {
        await finish("skipped", "Single mode: missing required fields", [
          {
            status: "skipped",
            reason: "Missing required fields",
            input: studentInput
          }
        ])
        return
      }
      if (pendingDays <= SLA_THRESHOLD) {
        await finish("skipped", "Single mode: within SLA", [
          {
            status: "skipped",
            reason: "Within SLA",
            input: studentInput
          }
        ])
        return
      }
      // OpenAI generation
      let draft
      try {
        const aiResp = await TurboticOpenAI([{ role: "user", content: `Compose a polite reminder email to ${studentName} (Roll: ${rollNumber}) regarding ${reason} (dates ${leaveDates.join(", ")}) pending for ${pendingDays} days.` }], { model: "gpt-4.1", temperature: 0 })
        if (!aiResp || typeof aiResp.content !== "string" || !aiResp.content.trim()) {
          throw new Error("No AI response")
        }
        draft = aiResp.content.trim()
      } catch (aiErr) {
        await finish("failed", `Single mode: OpenAI error - ${aiErr.message}`, [
          {
            status: "failed",
            reason: "OpenAI error",
            error: aiErr.message,
            input: studentInput
          }
        ])
        return
      }
      // send email
      try {
        const mailRes = await sendEmailViaTurbotic({
          to: email,
          subject: `Reminder: Action Required for ${reason}`,
          text: draft,
          html: `<p>${draft.replace(/\n/g, "<br>")}</p>`
        })
        if (!mailRes || mailRes.success !== true) {
          throw new Error(mailRes && mailRes.message ? mailRes.message : "Unknown")
        }
        await finish("success", "Single mode: email sent", [{ status: "success", input: studentInput }])
        return
      } catch (mailErr) {
        await finish("failed", `Single mode: Email send error - ${mailErr.message}`, [
          {
            status: "failed",
            reason: "Email send error",
            error: mailErr.message,
            input: studentInput
          }
        ])
        return
      }
    }
    await finish("skipped", "No eligible input for email follow-up", [])
    return
  } catch (fatalErr) {
    process.stdout.write(`[FATAL] Step error: ${fatalErr.message}\n`)
    await finish("failed", `Fatal step error: ${fatalErr.message}`, [])
    return
  }
})()
