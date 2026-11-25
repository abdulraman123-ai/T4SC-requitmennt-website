import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseServiceRoleKey,getSupabaseUrl} from "@/lib/env";
export async function POST(request:Request){
 try{
  const {reference,email}=await request.json();
  if(typeof reference!=="string"||typeof email!=="string"||!reference.trim()||!email.trim())return NextResponse.json({error:"Enter your application reference and email."},{status:400});
  const url=getSupabaseUrl(),key=getSupabaseServiceRoleKey();
  if(!url||!key)return NextResponse.json({error:"Application status lookup is being configured."},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await db.from("applications").select("reference,preferred_name,status,created_at,updated_at").eq("reference",reference.trim().toUpperCase()).eq("email",email.trim().toLowerCase()).maybeSingle();
  if(error||!data)return NextResponse.json({error:"We could not find an application matching those details."},{status:404});
  return NextResponse.json({application:data});
 }catch{return NextResponse.json({error:"Invalid status request."},{status:400});}
}