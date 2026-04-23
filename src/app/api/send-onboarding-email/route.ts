import { Resend } from "resend"
import { QUESTIONS } from "@/lib/onboardingQuestions"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {

  const { companyId, answers } = await req.json()

  const formatted = Object.entries(answers).map(([qid, answer]) => {

    const questionText = QUESTIONS[qid]?.question || qid

    let value = answer

    if (Array.isArray(value)) {
      value = value.join(", ")
    }

    return `
      <div style="margin-bottom:12px">
        <strong>${questionText}</strong><br/>
        ${value}
      </div>
    `
  }).join("")


  const html = `
  <div style="font-family:Arial;padding:30px">

    <h2>New Morpheus Company Onboarding</h2>

    <p><strong>Company ID:</strong> ${companyId}</p>

    <hr/>

    <h3>Onboarding Answers</h3>

    ${formatted}

  </div>
  `


  await resend.emails.send({
    from: "onboarding@resend.dev", 
    to: ["jayyeungkh@gmail.com"], 
    subject: "New Company Onboarding Completed",
    html
  })

  return Response.json({
    success: true
  })
}