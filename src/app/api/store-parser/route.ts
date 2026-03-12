import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"

export async function POST(req: Request) {

  const { companyId, channel, structure, luaScript } = await req.json()

  await addDoc(collection(db, "parsers"), {
    companyId,
    channel,
    structure,
    luaScript,
    createdAt: Date.now()
  })

  return Response.json({ success: true })
}