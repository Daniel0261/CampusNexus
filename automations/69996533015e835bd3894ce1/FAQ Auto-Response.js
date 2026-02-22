// This step answers common student queries using a sample knowledge base.

const faqs = [
  { question: /fee.*dead/i, answer: "Fee payment deadline is 10th March 2026." },
  { question: /reval/i, answer: "To apply for revaluation, fill the online form under Academic Services." }
  // Add more Q&A as needed
]

let studentInput = null
try {
  studentInput = getContext("studentInput")
} catch (e) {
  // Key not set or some error
  console.log("No FAQ match due to missing/invalid input (context key studentInput not set):", e.message)
  setContext("faqResponse", "no_faq_match")
  // Optionally, could also explicitly output the same result here
  return
}
if (!studentInput || typeof studentInput !== "object") {
  console.log("No FAQ match due to invalid or missing input object.")
  setContext("faqResponse", "no_faq_match")
  return
}

const text = (studentInput.reason ?? "") + "" // Ensure it's always a string

let faqResponse = null
for (const faq of faqs) {
  if (faq.question.test(text)) {
    faqResponse = faq.answer
    break
  }
}

if (faqResponse) {
  setContext("faqResponse", faqResponse)
  console.log("FAQ matched:", faqResponse)
} else {
  console.log("No FAQ match for this request.")
  setContext("faqResponse", "no_faq_match")
}
