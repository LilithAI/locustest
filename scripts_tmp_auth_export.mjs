import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });
const all = [];
let page = 1;
while (true) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error(error); process.exit(1); }
  all.push(...data.users);
  if (data.users.length < 1000) break;
  page++;
}
const out = process.argv[2];
writeFileSync(out, JSON.stringify(all, null, 2));
console.log("users:", all.length, "->", out);
