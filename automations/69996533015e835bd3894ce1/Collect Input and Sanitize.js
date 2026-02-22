try {
  let studentInput = getContext("studentInput")
  if (!studentInput || studentInput.trim() === "") {
    studentInput = `\nMy name is Daniel Thomas.\nRoll Number: 23CS104.\nDepartment: Computer Science.\nClass: 3rd Year.\nI request leave from 24 Feb 2026 to 27 Feb 2026 due to medical reasons.\n`
  }
  setContext("studentInput", studentInput)
  return { status: "completed", studentInput }
} catch (err) {
  return {
    status: "completed_with_warning",
    error: err.message,
    studentInput: `My name is Daniel Thomas.\nRoll Number: 23CS104.\nDepartment: Computer Science.\nClass: 3rd Year.\nI request leave from 24 Feb 2026 to 27 Feb 2026 due to medical reasons.`
  }
}
