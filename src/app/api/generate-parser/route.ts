import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {

  const { examples } = await req.json()

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview"
  })

  const parsers: Record<string, any> = {}

  for (const channel in examples) {

    const example = examples[channel]

    const prompt = `
A company uses this campaign naming example for ${channel}:

${example}

Infer the campaign naming structure.

Campaign names may use different separators such as "-", "|", "_", or others.

Return ONLY the decoded naming convention using this format:

Field1 - Field2 - Field3 - Field4 - ...

Example output:
Platform - Geography Targeted - Offering/Asset - Product - Ad Type - Campaign Objective

Choose between the most common fields used in campaign naming conventions:
Platform - Geography Targeted - Offering/Asset - Product - Type of Ad - Campaign Objective - Keyword Group - Product Date - Region - Type of Campaign - Agency Code - Free Field Campaign Name - Free Field Initials - Fiscal Year - Fiscal Quarter - Fiscal Year & Quarter - Country - Agency Code - Goal - Free Field
`


    const result = await model.generateContent(prompt)

    const structure = result.response.text().trim()

    const fields = structure
      .split(" - ")
      .map((f: string) =>
        f
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      )

    const mappings = fields
      .map((field: string, i: number) => `    ${field} = parts[${i + 1}]`)
      .join(",\n")

    const luaScript = `
function parse_campaign_name(campaign_name)

  local parts = {}

  for part in string.gmatch(campaign_name, "[^%-|_]+") do
    table.insert(parts, part)
  end

  local result = {
${mappings}
  }

  return result

end

return parse_campaign_name
`
    parsers[channel] = {
      structure,
      lua: luaScript
    }

  }
  return Response.json({
    parsers
  })

}