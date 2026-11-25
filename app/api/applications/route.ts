import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseServiceRoleKey,getSupabaseUrl} from "@/lib/env";
const departments=["AI & Machine Learning","Game Development","Full Stack Development & System Architecture","Cybersecurity & Systems Security"];
const levels=["Beginner","Developing","Advanced"];
export async function POST(request:Request){
 try{
  const body=await request.json();
  const required=["preferredName","email","country","region","primaryDepartment","whyDepartment","experienceLevel","triedBuilt","motivation","problemToSolve","weeklyAvailability","sessionAvailability","deviceAccess","internetAccess"];
  for(const field of required)if(typeof body[field]!=="string"||!body[field].trim())return NextResponse.json({error:"Please complete all required fields."},{status:400});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return NextResponse.json({error:"Enter a valid email address."},{status:400});
  if(!departments.includes(body.primaryDepartment)||!levels.includes(body.experienceLevel))return NextResponse.json({error:"Choose a valid department and experience level."},{status:400});
  if(body.secondaryInterest&&!departments.includes(body.secondaryInterest))return NextResponse.json({error:"Choose a valid secondary interest."},{status:400});
  if(!body.rulesAccepted||!body.honestyAccepted||!body.privacyAccepted)return NextResponse.json({error:"Please accept the community rules and honesty declaration."},{status:400});
  const url=getSupabaseUrl(),key=getSupabaseServiceRoleKey();
  if(!url||!key)return NextResponse.json({error:"Applications are not accepting submissions yet because the private application database has not been connected."},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await db.from("applications").insert({
   full_name:body.preferredName.trim(),preferred_name:body.preferredName.trim(),email:body.email.trim().toLowerCase(),
   country:body.country.trim(),region:body.region.trim(),alternative_contact:body.alternativeContact||null,
   department:body.primaryDepartment,secondary_interest:body.secondaryInterest||null,why_department:body.whyDepartment,
   assessment_level:body.experienceLevel,experience:body.triedBuilt,tools_topics:body.toolsTopics||null,
   motivation:body.motivation,problem_to_solve:body.problemToSolve,weekly_availability:body.weeklyAvailability,
   session_availability:body.sessionAvailability,session_details:body.sessionDetails||null,device_access:body.deviceAccess,
   internet_access:body.internetAccess,rules_accepted:true,honesty_accepted:true,privacy_accepted:true,
   accessibility_needs:body.accessibilityNeeds||null,status:"submitted"
  }).select("reference").single();
  if(error)return NextResponse.json({error:"We could not save your application. Please try again later."},{status:503});
  return NextResponse.json({reference:data.reference},{status:201});
 }catch{return NextResponse.json({error:"Invalid application request."},{status:400});}
}