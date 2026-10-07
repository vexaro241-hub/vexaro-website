import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const KEY = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(URL, KEY);

const TABLES = ["profiles","posts","post_likes","comments","follows","loadouts","settings_posts","reports","post_media","marketplace_sellers","marketplace_listings","marketplace_requests","marketplace_offers","membership_plans","memberships","site_analytics","notifications","business_expenses","admin_audit_log","profile_identities","twitch_connections","profile_social_links","saved_posts","post_drafts","moderation_actions","account_appeals","member_activity_history","member_notification_preferences","account_data_requests","push_subscriptions","spam_events","membership_events","account_security_events","account_devices","duplicate_account_flags","messages","mentions","video_processing_queue","platform_runtime_flags","data_retention_policies","privacy_requests","admin_tasks","system_activity","maintenance_schedule"];

const out=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});

async function makeBackup(){
 const started=Date.now();
 const snap:any={format:"vexaro-logical-backup-v1",created_at:new Date().toISOString(),project_id:"gyapnhfsbsnxkyfqlsxh",tables:{},auth_users:[]};
 for(const t of TABLES){const {data,error}=await sb.from(t).select("*");if(error)throw Error(`Backup failed on ${t}: ${error.message}`);snap.tables[t]=data||[];}
 let page=1,users:any[]=[];
 while(true){const {data,error}=await sb.auth.admin.listUsers({page,perPage:1000});if(error)throw Error(`Auth backup failed: ${error.message}`);const u=data?.users||[];users.push(...u);if(u.length<1000)break;page++;}
 snap.auth_users=users.map((u:any)=>({id:u.id,email:u.email,phone:u.phone,created_at:u.created_at,updated_at:u.updated_at,email_confirmed_at:u.email_confirmed_at,phone_confirmed_at:u.phone_confirmed_at,last_sign_in_at:u.last_sign_in_at,role:u.role,aud:u.aud,app_metadata:u.app_metadata,user_metadata:u.user_metadata,identities:u.identities}));
 const bytes=new TextEncoder().encode(JSON.stringify(snap));
 const stamp=new Date().toISOString().replace(/[:.]/g,"-");
 const path=`daily/${stamp}.json`;
 const {error}=await sb.storage.from("vexaro-backups").upload(path,bytes,{contentType:"application/json",cacheControl:"0",upsert:false});
 if(error)throw Error(`Backup upload failed: ${error.message}`);
 await sb.from("system_activity").insert({event_type:"backup_completed",details:{path,bytes:bytes.length,table_count:TABLES.length,auth_users:snap.auth_users.length,duration_ms:Date.now()-started}});
 return {path,bytes:bytes.length,table_count:TABLES.length,auth_users:snap.auth_users.length};
}

async function restoreTest(){
 const {data:files,error:listError}=await sb.storage.from("vexaro-backups").list("daily",{limit:100,sortBy:{column:"name",order:"desc"}});
 if(listError)throw Error(`Backup listing failed: ${listError.message}`);
 const file=files?.find((f:any)=>f.name.endsWith(".json"));
 if(!file)throw Error("No backup snapshot available");
 const path=`daily/${file.name}`;
 const {data:blob,error:downloadError}=await sb.storage.from("vexaro-backups").download(path);
 if(downloadError)throw Error(`Backup download failed: ${downloadError.message}`);
 const snap=JSON.parse(await blob.text());
 if(snap.format!=="vexaro-logical-backup-v1")throw Error("Unknown backup format");
 let rows=0,checked=0;
 for(const t of TABLES){if(!Array.isArray(snap.tables[t]))throw Error(`Missing table payload: ${t}`);rows+=snap.tables[t].length;checked++;}
 if(!Array.isArray(snap.auth_users))throw Error("Missing auth user payload");
 const {data:run,error:insertError}=await sb.from("backup_restore_tests").insert({source_path:path,status:"passed",completed_at:new Date().toISOString(),tables_checked:checked,rows_checked:rows,auth_users_checked:snap.auth_users.length}).select("id").single();
 if(insertError)throw Error(`Restore test record failed: ${insertError.message}`);
 return {run_id:run.id,source_path:path,status:"passed",tables_checked:checked,rows_checked:rows,auth_users_checked:snap.auth_users.length};
}

Deno.serve(async req=>{
 if(req.method!=="POST")return out({ok:false,error:"POST required"},405);
 try{
  const b=await req.json().catch(()=>({}));
  if(b.mode==="health"){const {error}=await sb.from("platform_runtime_flags").select("key").limit(1);return out({ok:!error,service:"vexaro-backup",mode:"health",error:error?.message||null},error?500:200);}
  if(b.mode==="restore-test")return out({ok:true,...await restoreTest()});
  return out({ok:true,...await makeBackup()});
 }catch(e){console.error(e);return out({ok:false,error:e instanceof Error?e.message:String(e)},500);}
});