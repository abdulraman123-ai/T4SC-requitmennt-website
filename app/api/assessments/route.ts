import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseServiceRoleKey,getSupabaseUrl} from "@/lib/env";
const departments=["AI & Machine Learning","Game Development","Full Stack Development & System Architecture","Cybersecurity & Systems Security"];
const allowed=["general","department","practical"];
export async function POST(request:Request){
 try{
  const body=await request.json();
  if(typeof body.reference!=="string"||typeof body.email!=="string"||!allowed.includes(body.pathway)||typeof body.level!=="string"||!body.answers||typeof body.answers!=="object")return NextResponse.json({error:"Assessment details are incomplete."},{status:400});
  if(!["Beginner","Developing","Advanced"].includes(body.level))return NextResponse.json({error:"Invalid assessment level."},{status:400});
  if(body.pathway==="department"&&!departments.includes(body.department))return NextResponse.json({error:"Invalid department."},{status:400});
  const url=getSupabaseUrl(),key=getSupabaseServiceRoleKey();
  if(!url||!key)return NextResponse.json({error:"Assessment submission is not available until the private application database is connected."},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:app,error:lookupError}=await db.from("applications").select("id,reference").eq("reference",body.reference).eq("email",body.email.toLowerCase()).maybeSingle();
  if(lookupError||!app)return NextResponse.json({error:"We could not verify this application. Check your reference and email."},{status:404});
  const pathway=body.pathway==="department"?"department: "+body.department:body.pathway;
  const {error}=await db.from("assessment_submissions").insert({application_id:app.id,pathway,level:body.level,answers:body.answers,score:Number.isFinite(body.score)?body.score:null});
  if(error)return NextResponse.json({error:"We could not save this assessment. Please try again."},{status:503});
  const nextStatus=body.pathway==="general"?"department_assessment":body.pathway==="department"?"practical_task":"under_review";
  await db.from("applications").update({status:nextStatus,updated_at:new Date().toISOString()}).eq("id",app.id);
  return NextResponse.json({ok:true,nextStatus},{status:201});
 }catch{return NextResponse.json({error:"Invalid assessment submission."},{status:400});}
}