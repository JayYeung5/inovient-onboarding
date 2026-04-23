import { GoogleGenerativeAI } from "@google/generative-ai"
import { normalizeCampaignTaxonomy } from "@/lib/normalizeCampaignTaxonomy";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {

  const { rawMetadataFields } = await req.json();
  const taxonomy = normalizeCampaignTaxonomy(rawMetadataFields);

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview"
  })

  const parsers: Record<string, any> = {}
  const channel = "Generic";

  const exampleLuaScript = `
-- ============================================================
-- FUNCTION 1: compaign_extract_meta (isActive: true)
-- ============================================================
function campaign_extract_meta(name)
if not name or name == "" then
return {
country = nil,
region = nil,
product = nil
}
end

local country = nil
local region = nil
local product = nil

-- Helper function to match country codes with word boundaries
local function match_code(name, code)
return string.match(name, "[_%-]" .. code .. "[_%-]") or
string.match(name, "^" .. code .. "[_%-]") or
string.match(name, "[_%-]" .. code .. "$") or
string.match(name, "^" .. code .. "$")
end

-- Helper function to check if "SEM" is adjacent to a code (for BR brand vs country)
local function is_sem_adjacent(name, code)
-- Check if SEM appears before or after the code
-- Patterns: SEM_BR, SEM-BR, BR_SEM, BR-SEM
return string.match(name, "SEM[_%-]" .. code) or
string.match(name, code .. "[_%-]SEM")
end

-- ========================================================================
-- COUNTRY DETECTION (with full names + 2-letter ISO codes)
-- ========================================================================

-- AMER REGION
if string.find(name, "India") or string.find(name, "INDIA") or match_code(name, "IN") then
country = "IN"; region = region or "APAC"
elseif string.find(name, "United States") or string.find(name, "USA") or match_code(name, "US") then
country = "US"; region = region or "AMER"
elseif string.find(name, "Canada") or string.find(name, "CANADA") or match_code(name, "CA") then
country = "CA"; region = region or "AMER"

-- LATAM REGION
elseif string.find(name, "Argentina") or string.find(name, "ARGENTINA") or match_code(name, "AR") then
country = "AR"; region = region or "LATAM"
elseif string.find(name, "Bolivia") or string.find(name, "BOLIVIA") or match_code(name, "BO") then
country = "BO"; region = region or "LATAM"
elseif string.find(name, "Brazil") or string.find(name, "BRAZIL") or
string.match(name, "[_%-]AMER[_%-]BR[_%-]") or
string.match(name, "[_%-]LATAM[_%-]BR[_%-]") or
string.match(name, "[_%-]APAC[_%-]BR[_%-]") or
string.match(name, "[_%-]EMEA[_%-]BR[_%-]") or
string.match(name, "[_%-]Japan[_%-]BR[_%-]") then
country = "BR"; region = region or "LATAM"
elseif string.find(name, "Chile") or string.find(name, "CHILE") or match_code(name, "CL") then
country = "CL"; region = region or "LATAM"
elseif string.find(name, "Colombia") or string.find(name, "COLOMBIA") or match_code(name, "CO") then
country = "CO"; region = region or "LATAM"
elseif string.find(name, "Costa Rica") or string.find(name, "COSTA RICA") or match_code(name, "CR") then
country = "CR"; region = region or "LATAM"
elseif string.find(name, "Dominican Republic") or string.find(name, "DOMINICAN REPUBLIC") or match_code(name, "DO") then
country = "DO"; region = region or "LATAM"
elseif string.find(name, "Ecuador") or string.find(name, "ECUADOR") or match_code(name, "EC") then
country = "EC"; region = region or "LATAM"
elseif string.find(name, "Guatemala") or string.find(name, "GUATEMALA") or match_code(name, "GT") then
country = "GT"; region = region or "LATAM"
elseif string.find(name, "Honduras") or string.find(name, "HONDURAS") or match_code(name, "HN") then
country = "HN"; region = region or "LATAM"
elseif string.find(name, "Mexico") or string.find(name, "MEXICO") or match_code(name, "MX") then
country = "MX"; region = region or "LATAM"
elseif string.find(name, "Nicaragua") or string.find(name, "NICARAGUA") or match_code(name, "NI") then
country = "NI"; region = region or "LATAM"
elseif string.find(name, "Panama") or string.find(name, "PANAMA") or match_code(name, "PA") then
country = "PA"; region = region or "LATAM"
elseif string.find(name, "Peru") or string.find(name, "PERU") or match_code(name, "PE") then
country = "PE"; region = region or "LATAM"
elseif string.find(name, "Puerto Rico") or string.find(name, "PUERTO RICO") or match_code(name, "PR") then
country = "PR"; region = region or "LATAM"
elseif string.find(name, "Paraguay") or string.find(name, "PARAGUAY") or match_code(name, "PY") then
country = "PY"; region = region or "LATAM"
elseif string.find(name, "El Salvador") or string.find(name, "EL SALVADOR") or match_code(name, "SV") then
country = "SV"; region = region or "LATAM"
elseif string.find(name, "Uruguay") or string.find(name, "URUGUAY") or match_code(name, "UY") then
country = "UY"; region = region or "LATAM"

-- APAC REGION
elseif string.find(name, "Australia") or string.find(name, "AUSTRALIA") or match_code(name, "AU") then
country = "AU"; region = region or "APAC"
elseif string.find(name, "Hong Kong") or string.find(name, "HONG KONG") or match_code(name, "HK") then
country = "HK"; region = region or "APAC"
elseif string.find(name, "Indonesia") or string.find(name, "INDONESIA") or match_code(name, "ID") then
country = "ID"; region = region or "APAC"
elseif string.find(name, "Japan") or string.find(name, "JAPAN") or match_code(name, "JP") then
country = "JP"; region = region or "Japan"
elseif string.find(name, "South Korea") or string.find(name, "Korea") or string.find(name, "KOREA") or match_code(name, "KR") then
country = "KR"; region = region or "APAC"
elseif string.find(name, "Malaysia") or string.find(name, "MALAYSIA") or match_code(name, "MY") then
country = "MY"; region = region or "APAC"
elseif string.find(name, "New Zealand") or string.find(name, "NEW ZEALAND") or match_code(name, "NZ") then
country = "NZ"; region = region or "APAC"
elseif string.find(name, "Philippines") or string.find(name, "PHILIPPINES") or match_code(name, "PH") then
country = "PH"; region = region or "APAC"
elseif string.find(name, "Singapore") or string.find(name, "SINGAPORE") or match_code(name, "SG") then
country = "SG"; region = region or "APAC"
elseif string.find(name, "Thailand") or string.find(name, "THAILAND") or match_code(name, "TH") then
country = "TH"; region = region or "APAC"
elseif string.find(name, "Taiwan") or string.find(name, "TAIWAN") or match_code(name, "TW") then
country = "TW"; region = region or "APAC"
elseif string.find(name, "Vietnam") or string.find(name, "VIETNAM") or match_code(name, "VN") then
country = "VN"; region = region or "APAC"
elseif string.find(name, "China") or string.find(name, "CHINA") or match_code(name, "CN") then
country = "CN"; region = region or "APAC"

-- EMEA REGION
elseif string.find(name, "United Arab Emirates") or string.find(name, "UAE") or match_code(name, "AE") then
country = "AE"; region = region or "EMEA"
elseif string.find(name, "Austria") or string.find(name, "AUSTRIA") or match_code(name, "AT") then
country = "AT"; region = region or "EMEA"
elseif string.find(name, "Belgium") or string.find(name, "BELGIUM") or match_code(name, "BE") then
country = "BE"; region = region or "EMEA"
elseif string.find(name, "Bahrain") or string.find(name, "BAHRAIN") or match_code(name, "BH") then
country = "BH"; region = region or "EMEA"
elseif string.find(name, "Switzerland") or string.find(name, "SWITZERLAND") or match_code(name, "CH") then
country = "CH"; region = region or "EMEA"
elseif string.find(name, "Czech Republic") or string.find(name, "CZECH REPUBLIC") or match_code(name, "CZ") then
country = "CZ"; region = region or "EMEA"
elseif string.find(name, "Germany") or string.find(name, "GERMANY") or match_code(name, "DE") then
country = "DE"; region = region or "EMEA"
elseif string.find(name, "Denmark") or string.find(name, "DENMARK") or match_code(name, "DK") then
country = "DK"; region = region or "EMEA"
elseif string.find(name, "Egypt") or string.find(name, "EGYPT") or match_code(name, "EG") then
country = "EG"; region = region or "EMEA"
elseif string.find(name, "Spain") or string.find(name, "SPAIN") or match_code(name, "ES") then
country = "ES"; region = region or "EMEA"
elseif string.find(name, "Finland") or string.find(name, "FINLAND") or match_code(name, "FI") then
country = "FI"; region = region or "EMEA"
elseif string.find(name, "France") or string.find(name, "FRANCE") or match_code(name, "FR") then
country = "FR"; region = region or "EMEA"
elseif string.find(name, "United Kingdom") or string.find(name, "UK") or match_code(name, "GB") then
country = "UK"; region = region or "EMEA"
elseif string.find(name, "Greece") or string.find(name, "GREECE") or match_code(name, "GR") then
country = "GR"; region = region or "EMEA"
elseif string.find(name, "Ireland") or string.find(name, "IRELAND") or match_code(name, "IE") then
country = "IE"; region = region or "EMEA"
elseif string.find(name, "Israel") or string.find(name, "ISRAEL") or match_code(name, "IL") then
country = "IL"; region = region or "EMEA"
elseif string.find(name, "Italy") or string.find(name, "ITALY") or match_code(name, "IT") then
country = "IT"; region = region or "EMEA"
elseif string.find(name, "Kuwait") or string.find(name, "KUWAIT") or match_code(name, "KW") then
country = "KW"; region = region or "EMEA"
elseif string.find(name, "Netherlands") or string.find(name, "NETHERLANDS") or match_code(name, "NL") then
country = "NL"; region = region or "EMEA"
elseif string.find(name, "Norway") or string.find(name, "NORWAY") or match_code(name, "NO") then
country = "NO"; region = region or "EMEA"
elseif string.find(name, "Oman") or string.find(name, "OMAN") or match_code(name, "OM") then
country = "OM"; region = region or "EMEA"
elseif string.find(name, "Pakistan") or string.find(name, "PAKISTAN") or match_code(name, "PK") then
country = "PK"; region = region or "EMEA"
elseif string.find(name, "Poland") or string.find(name, "POLAND") or match_code(name, "PL") then
country = "PL"; region = region or "EMEA"
elseif string.find(name, "Qatar") or string.find(name, "QATAR") or match_code(name, "QA") then
country = "QA"; region = region or "EMEA"
elseif string.find(name, "Saudi Arabia") or string.find(name, "SAUDI ARABIA") or match_code(name, "SA") then
country = "SA"; region = region or "EMEA"
elseif string.find(name, "Sweden") or string.find(name, "SWEDEN") or match_code(name, "SE") then
country = "SE"; region = region or "EMEA"
elseif string.find(name, "Turkey") or string.find(name, "TURKEY") or match_code(name, "TR") then
country = "TR"; region = region or "EMEA"
end

-- ========================================================================
-- PRODUCT DETECTION (BUNDLES FIRST, THEN FALLBACK)
-- ========================================================================

-- 1) Bundle / Collection products FIRST (higher priority than generic AEC, DM, ME)
if string.find(name, "AEC%-Collection") or string.find(name, "AEC_Collection") then
product = "AEC Collection"
elseif string.find(name, "PDMC%-Core") or string.find(name, "PDMCCore") then
product = "PDMC"
elseif string.find(name, "PDMC%-Collection") then
product = "PDMC"
elseif string.find(name, "Collection") and string.find(name, "AEC") then
product = "AEC Collection"
end

-- 2) If no bundle matched above, fall back to detailed logic
if not product then

-- Multi-product combinations (check first - most specific)
if string.find(name, "Civil%-3D%-Revit") or string.find(name, "Civil3D%-Revit") then
product = "Civil 3D + Revit"

-- Individual products with hyphens/complex names
elseif string.find(name, "BIM%-Collaborate%-Pro") or string.find(name, "BIMCollaboratePro") then
product = "BIM Collaborate Pro"
elseif string.find(name, "AutoCAD%-LT") or string.find(name, "Autocad%-LT") then
product = "AutoCAD LT"
elseif string.find(name, "AutoCAD%-Web") then
product = "AutoCAD Web"
elseif string.find(name, "Revit%-LT") then
product = "Revit LT"
elseif string.find(name, "Civil%-3D") or string.find(name, "Civil3D") then
product = "Civil 3D"
elseif string.find(name, "3ds%-Max") or string.find(name, "3dsMax") then
product = "3ds Max"

-- NEW: Fusion family (most specific first)
elseif string.find(name, "Fusion 360 SHT VID") or string.find(name, "Fusion%-360%-SHT%-VID") or string.find(name, "Fusion360SHTVID") then
product = "Fusion 360 SHT VID"
elseif string.find(name, "Fusion 360 CST") or string.find(name, "Fusion%-360%-CST") or string.find(name, "Fusion360CST") then
product = "Fusion 360 CST"
elseif string.find(name, "Fusion Ops") or string.find(name, "FusionOps") or string.find(name, "FUSION OPS") then
product = "Fusion Ops"
elseif string.find(name, "Fusion Extensions") or string.find(name, "Fusion%-Extensions") then
product = "Fusion Extensions"
elseif string.find(name, "Fusion 360") or string.find(name, "Fusion%-360") or string.find(name, "Fusion360") or string.find(name, "FUSION 360") then
product = "Fusion 360"

-- Collection/Bundle products (safety)
elseif string.find(name, "AEC%-Collection") or string.find(name, "AECCollection") then
product = "AEC Collection"
elseif string.find(name, "PDMC%-Core") or string.find(name, "PDMCCore") then
product = "PDMC"
elseif string.match(name, "[_%-]PDMC[_%-]") or string.match(name, "^PDMC[_%-]") or string.match(name, "[_%-]PDMC$") then
product = "PDMC"

-- Standalone products (with word boundaries)
elseif string.find(name, "AutoCAD") or string.find(name, "Autocad") then
product = "AutoCAD"
elseif string.find(name, "Revit") then
product = "Revit"
elseif string.find(name, "Inventor") then
product = "Inventor"
elseif string.find(name, "Maya") then
product = "Maya"
elseif string.find(name, "Shotgrid") or string.find(name, "ShotGrid") then
product = "Shotgrid"

-- NEW: CAD (generic) and FLOW (generic)
elseif string.match(name, "[_%-]CAD[_%-]") or string.match(name, "^CAD[_%-]") or string.match(name, "[_%-]CAD$") or string.match(name, "^CAD$") then
product = "CAD"
elseif string.match(name, "[_%-]FLOW[_%-]") or string.match(name, "^FLOW[_%-]") or string.match(name, "[_%-]FLOW$") or string.match(name, "^FLOW$") then
product = "FLOW"

-- Industry/Category codes (hyphenated)
elseif string.find(name, "D%-M") or string.find(name, "D&M") then
product = "D&M"
elseif string.find(name, "M%-E") then
product = "Media & Entertainment"
elseif string.find(name, "Cross%-Ind") or string.find(name, "CrossInd") then
product = "Cross Industry"

-- General/Brand identifiers
elseif string.find(name, "All%-Products") or string.find(name, "AllProducts") then
product = "All Products"
elseif string.find(name, "PerformanceMax") then
product = "PerformanceMax"
elseif string.find(name, "AUTODESK KEYWORD") or string.find(name, "Autodesk%-Keyword") then
product = "Autodesk Keyword"
elseif string.find(name, "PureBrand") then
product = "Autodesk Brand"
elseif string.find(name, "Autodesk") then
product = "Autodesk"

-- Industry-specific codes (with word boundaries)
elseif string.match(name, "[_%-]ACAD[_%-]") or string.match(name, "^ACAD[_%-]") or string.match(name, "[_%-]ACAD$") then
product = "AutoCAD"
elseif string.match(name, "[_%-]AEC[_%-]") or string.match(name, "^AEC[_%-]") or string.match(name, "[_%-]AEC$") then
product = "AEC"
elseif string.match(name, "[_%-]DEC[_%-]") or string.match(name, "^DEC[_%-]") or string.match(name, "[_%-]DEC$") then
product = "E-commerce"
elseif string.find(name, "[_%-]Cross[_%-]") or string.match(name, "^Cross[_%-]") then
product = "Cross Industry"
end
end

return {
country = country,
region = region,
product = product
}
end
`;

  const taxonomyText =
    taxonomy.length > 0
      ? taxonomy
          .map(
            (field) =>
              `Field: ${field.fieldLabel}\nValues: ${field.values.join(", ")}`
          )
          .join("\n\n")
      : "No metadata taxonomy provided.";
  
  const prompt = `
Generate a Lua script that parses campaign names for a company.

The company has provided metadata fields and the allowed values that may appear in campaign names.

Metadata fields:
${taxonomyText}

Requirements:
- Generate Lua code only.
- The Lua function should inspect the campaign name and detect matching values from the provided metadata lists.
- Do NOT assume a fixed positional order unless clearly necessary.
- Prefer lookup-based matching over simple delimiter splitting.
- Return a Lua table with one key per metadata field.
- Use snake_case keys based on the field names.
- If a value is not found, return nil for that field.
- If the field is Country and a region can reasonably be derived, also return region.
- Prefer more specific matches before generic ones.
- Follow the style and structure of the example Lua script below.

Example Lua style reference:
${exampleLuaScript}
`;

  const result = await model.generateContent(prompt)

  const rawText = result.response.text().trim();
  const luaScript = rawText
    .replace(/^```lua\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  parsers[channel] = {
    structure: "lookup_based_parser",
    lua: luaScript
  };

  return Response.json({
    parsers
  })

}