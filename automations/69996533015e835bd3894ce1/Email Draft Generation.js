try {
  // Dummy fallback for email draft
  const emailDraft = "Dear Sir/Madam, please find attached my formal request letter."
  setContext("emailDraft", emailDraft)
  return { status: "completed", emailDraft }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, emailDraft: "Sample Draft Email" }
}
