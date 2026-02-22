try {
  // Dummy fallback for FAQ response
  const faqResponse = "Please contact support."
  setContext("faqResponse", faqResponse)
  return { status: "completed", faqResponse }
} catch (err) {
  return { status: "completed_with_warning", error: err.message, faqResponse: "Please contact support." }
}
