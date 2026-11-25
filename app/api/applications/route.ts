import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";
export async function POST(request: Request) {
 try {
  const body=await request.json();
  const required=["name","email","country","department","level","motivation"];
  if(required.some(k=>typeof body[k]!=="string"||!body[k].trim()))return NextResponse.json({error:"Please complete all required fields."},{status:400});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return NextResponse.json({error:"Enter a valid email address."},{status:400});
  if(!body.agree)return NextResponse.json({error:"Please accept the privacy notice."},{status:400});
  const url=getSupabaseUrl(),key=getSupabaseServiceRoleKey();
  if(!url||!key)return NextResponse.json({error:"Application submission is being configured. Please try again shortly."},{status:503});
  const supabase=createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await supabase.from("applications").insert({
   full_name:body.name.trim(),email:body.email.trim().toLowerCase(),country:body.country.trim(),
   department:body.department,assessment_level:body.level,motivation:body.motivation.trim(),
   experience:typeof body.experience==="string"?body.experience.trim():"",weekly_commitment:body.hours??null,status:"submitted"
  }).select("reference").single();
  if(error)return NextResponse.json({error:"We could not save your application. Please try again later."},{status:503});
  return NextResponse.json({reference:data.reference},{status:201});
 }catch{return NextResponse.json({error:"Invalid application request."},{status:400});}
}