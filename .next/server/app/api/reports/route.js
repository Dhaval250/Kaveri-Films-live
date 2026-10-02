(()=>{var t={};t.id=867,t.ids=[867],t.modules={62849:t=>{function e(t){var e=Error("Cannot find module '"+t+"'");throw e.code="MODULE_NOT_FOUND",e}e.keys=()=>[],e.resolve=e,e.id=62849,t.exports=e},72934:t=>{"use strict";t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{"use strict";t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{"use strict";t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},78893:t=>{"use strict";t.exports=require("buffer")},84770:t=>{"use strict";t.exports=require("crypto")},17702:t=>{"use strict";t.exports=require("events")},98216:t=>{"use strict";t.exports=require("net")},35816:t=>{"use strict";t.exports=require("process")},76162:t=>{"use strict";t.exports=require("stream")},74026:t=>{"use strict";t.exports=require("string_decoder")},95346:t=>{"use strict";t.exports=require("timers")},82452:t=>{"use strict";t.exports=require("tls")},17360:t=>{"use strict";t.exports=require("url")},21764:t=>{"use strict";t.exports=require("util")},71568:t=>{"use strict";t.exports=require("zlib")},65714:t=>{"use strict";t.exports=require("node:diagnostics_channel")},31050:(t,e,r)=>{"use strict";r.r(e),r.d(e,{originalPathname:()=>m,patchFetch:()=>g,requestAsyncStorage:()=>d,routeModule:()=>l,serverHooks:()=>E,staticGenerationAsyncStorage:()=>_});var a={};r.r(a),r.d(a,{GET:()=>c});var s=r(49303),n=r(88716),i=r(60670),p=r(87070),o=r(75748),u=r(95456);async function c(t){try{if(!await (0,u.Gg)())return p.NextResponse.json({error:"Unauthorized"},{status:401});let e=t.nextUrl.searchParams,r=e.get("view")||"plans",a=["p.status NOT IN ('Draft')"],s=[];if(e.get("from")&&(a.push("p.plan_date >= ?"),s.push(e.get("from"))),e.get("to")&&(a.push("p.plan_date <= ?"),s.push(e.get("to"))),e.get("status")&&(a.push("p.status = ?"),s.push(e.get("status"))),e.get("product")&&(a.push("pr.name = ?"),s.push(e.get("product"))),e.get("product_id")&&(a.push("p.product_id = ?"),s.push(e.get("product_id"))),e.get("shift")&&(a.push(`EXISTS (
          SELECT 1 FROM production_assignments a
          WHERE a.production_plan_id = p.id AND a.shift_id = ?
        )`),s.push(e.get("shift"))),e.get("machine")&&(a.push(`EXISTS (
          SELECT 1 FROM production_assignments a
          WHERE a.production_plan_id = p.id AND a.machine_id = ?
        )`),s.push(e.get("machine"))),e.get("client")&&(a.push(`EXISTS (
          SELECT 1 FROM party_allocations pa2
          JOIN parties pt2 ON pt2.id = pa2.party_id
          WHERE pa2.production_plan_id = p.id AND pt2.name = ?
        )`),s.push(e.get("client"))),e.get("q")){let t=`%${e.get("q")}%`;a.push(`(p.planning_number LIKE ? OR pr.name LIKE ? OR d.name LIKE ? OR p.status LIKE ?
          OR EXISTS (
            SELECT 1 FROM party_allocations pa2
            JOIN parties pt2 ON pt2.id = pa2.party_id
            WHERE pa2.production_plan_id = p.id AND pt2.name LIKE ?
          ))`),s.push(t,t,t,t,t)}let n=`WHERE ${a.join(" AND ")}`,[i]=await o.d.query(`SELECT p.id, p.planning_number, p.status, p.plan_date,
              p.weight_kg, p.calculated_length, p.net_length_m,
              p.scrap_percentage, p.waste_kg, p.waste_percentage, p.productivity_pct,
              pr.name AS product_name,
              d.name AS department_name,
              (SELECT GROUP_CONCAT(pt.name ORDER BY pa.id SEPARATOR ', ')
               FROM party_allocations pa
               JOIN parties pt ON pt.id = pa.party_id
               WHERE pa.production_plan_id = p.id) AS client_names,
              (SELECT COALESCE(SUM(pa.weight_kg),0)
               FROM party_allocations pa WHERE pa.production_plan_id = p.id) AS client_weight_kg,
              (SELECT COUNT(*) FROM production_assignments a WHERE a.production_plan_id = p.id) AS assignment_count,
              (SELECT COUNT(*) FROM production_records r WHERE r.production_plan_id = p.id AND r.status IN ('Submitted','Approved')) AS record_count
       FROM production_plans p
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN departments d ON d.id = p.department_id
       ${n}
       ORDER BY p.plan_date DESC, p.id DESC`,s),c={totalPlans:i.length,totalWeight:i.reduce((t,e)=>t+Number(e.weight_kg||0),0),totalLength:i.reduce((t,e)=>t+Number(e.net_length_m||e.calculated_length||0),0),totalClientWeight:i.reduce((t,e)=>t+Number(e.client_weight_kg||0),0),ready:i.filter(t=>"Ready for Production"===t.status).length,inProgress:i.filter(t=>"In Progress"===t.status).length,partial:i.filter(t=>"Partially Completed"===t.status).length,completed:i.filter(t=>"Completed"===t.status).length,onHold:i.filter(t=>"On Hold"===t.status).length,cancelled:i.filter(t=>"Cancelled"===t.status).length,avgScrap:i.length>0?i.reduce((t,e)=>t+Number(e.scrap_percentage||0),0)/i.length:0},l=[],d=[],_={},E=[],m=[];try{let[t]=await o.d.query(`SELECT pt.id, pt.name AS client_name,
              COUNT(DISTINCT p.id) AS plan_count,
              COALESCE(SUM(pa.weight_kg), 0) AS total_weight_kg,
              COALESCE(SUM(pa.length_m), 0) AS total_length_m,
              COALESCE(SUM(pa.width_mm), 0) AS total_width_mm,
              COUNT(pa.id) AS allocation_count,
              MAX(p.plan_date) AS last_plan_date
       FROM parties pt
       LEFT JOIN party_allocations pa ON pa.party_id = pt.id
       LEFT JOIN production_plans p ON p.id = pa.production_plan_id AND p.status NOT IN ('Draft')
       WHERE COALESCE(pt.is_active, 1) = 1
       GROUP BY pt.id, pt.name
       HAVING plan_count > 0 OR allocation_count > 0
       ORDER BY total_weight_kg DESC, pt.name`);l=t||[]}catch(t){console.error("byClient",t)}try{let[t]=await o.d.query(`SELECT pr.id, pr.name AS product_name,
              COUNT(p.id) AS plan_count,
              COALESCE(SUM(p.weight_kg), 0) AS total_weight_kg,
              COALESCE(SUM(p.net_length_m), 0) AS total_length_m,
              COALESCE(AVG(p.scrap_percentage), 0) AS avg_scrap_pct,
              SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
              MAX(p.plan_date) AS last_plan_date
       FROM products pr
       LEFT JOIN production_plans p ON p.product_id = pr.id AND p.status NOT IN ('Draft')
       WHERE COALESCE(pr.is_active, 1) = 1
       GROUP BY pr.id, pr.name
       HAVING plan_count > 0
       ORDER BY total_weight_kg DESC, pr.name`);d=t||[]}catch(t){console.error("byProduct",t)}try{let[t]=await o.d.query("SELECT a.status, COUNT(*) AS c FROM production_assignments a GROUP BY a.status");t.forEach(t=>{_[t.status]=Number(t.c)})}catch(t){console.error("asgStats",t)}try{let[t]=await o.d.query("SELECT id, name FROM products WHERE COALESCE(is_active, 1) = 1 ORDER BY name");E=t||[];let[e]=await o.d.query("SELECT id, name FROM parties WHERE COALESCE(is_active, 1) = 1 ORDER BY name");m=e||[]}catch(t){console.error("masters lists",t)}return p.NextResponse.json({view:r,plans:i,summary:c,byClient:l||[],byProduct:d||[],assignmentStats:_,products:E||[],parties:m||[]})}catch(t){return p.NextResponse.json({error:t.message},{status:500})}}let l=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/reports/route",pathname:"/api/reports",filename:"route",bundlePath:"app/api/reports/route"},resolvedPagePath:"C:\\Users\\IBALL\\Downloads\\kaveri-production-planning\\src\\app\\api\\reports\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:d,staticGenerationAsyncStorage:_,serverHooks:E}=l,m="/api/reports/route";function g(){return(0,i.patchFetch)({serverHooks:E,staticGenerationAsyncStorage:_})}},95456:(t,e,r)=>{"use strict";r.d(e,{Gg:()=>d,I2:()=>E,MY:()=>_,Oe:()=>g,So:()=>S,c_:()=>m,fT:()=>l});var a=r(41482),s=r.n(a),n=r(71615),i=r(42023),p=r.n(i),o=r(75748);let u=process.env.JWT_SECRET||"kaveri-metallising-super-secret-key-change-in-production",c="kaveri_token";function l(t){return s().sign({id:t.id,name:t.name,email:t.email,role:t.role},u,{expiresIn:"7d"})}async function d(){let t=await (0,n.cookies)(),e=t.get(c)?.value;return e?function(t){try{let e=s().verify(t,u);return{id:e.id,name:e.name,email:e.email,role:e.role}}catch{return null}}(e):null}async function _(t){(await (0,n.cookies)()).set(c,t,{httpOnly:!0,secure:!0,sameSite:"lax",path:"/",maxAge:604800})}async function E(){(await (0,n.cookies)()).delete(c)}async function m(t){return p().hash(t,10)}async function g(t,e){return p().compare(t,e)}async function S(t,e){let[r]=await o.d.query("SELECT id, name, email, password, role, is_active FROM users WHERE email = ? LIMIT 1",[t]),a=r[0];return a&&Number(a.is_active)&&await g(e,a.password)?{id:Number(a.id),name:String(a.name),email:String(a.email),role:String(a.role)}:null}},75748:(t,e,r)=>{"use strict";r.d(e,{d:()=>n});var a=r(73785);let s={waitForConnections:!0,connectionLimit:25,queueLimit:0,enableKeepAlive:!0,keepAliveInitialDelay:1e4,namedPlaceholders:!0,dateStrings:!0,multipleStatements:!1,connectTimeout:1e4},n=globalThis.pool??function(){if(process.env.DB_HOST||process.env.DB_NAME)return a.createPool({host:process.env.DB_HOST||"localhost",port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||"root",password:process.env.DB_PASSWORD??"",database:process.env.DB_NAME||"kaveri_production",...s});let t=(process.env.DATABASE_URL||"").match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);if(t){let[,e,r,n,i,p]=t;return a.createPool({host:n,port:Number(i),user:e,password:r||void 0,database:p,...s})}return a.createPool({host:"localhost",port:3306,user:"root",password:"",database:"kaveri_production",...s})}()}};var e=require("../../../webpack-runtime.js");e.C(t);var r=t=>e(e.s=t),a=e.X(0,[276,978],()=>r(31050));module.exports=a})();