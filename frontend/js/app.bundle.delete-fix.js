var mt="",Fe="miplata_supabase_session",te="miplata_bootstrap_cache",ft="demo@miplata.app";var _t=new Set(["/api/auth/login","/api/auth/demo"]),Ht=45,Ut=6e5,xe=new Map;function Ce(e){let t=String(e?.imageUrl||"");if(t.startsWith("data:")&&t.length>Ut)throw new Error("La imagen es demasiado grande. Elige una imagen m\xE1s peque\xF1a")}function bt(e){if(e?.code==="MIPLATA_NETWORK_ERROR")return!0;let t=String(e?.message||"");return e instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(t)}function Ft(){let e=new Error("No se pudo conectar con MiPlata. Verifica que el servidor est\xE9 activo e int\xE9ntalo de nuevo.");return e.code="MIPLATA_NETWORK_ERROR",e}function gt(e){return e?.name==="AbortError"?new Error("El servidor tard\xF3 demasiado en responder. Intenta nuevamente."):bt(e)?Ft():e}async function xt(e,t={},a=15e3){let s=new AbortController,o=window.setTimeout(()=>s.abort(),a);try{return await fetch(e,{...t,signal:s.signal})}catch(i){throw gt(i)}finally{window.clearTimeout(o)}}var k=null;function ae(e){return String(e?.email||"").trim().toLowerCase()===ft||String(e?.name||"").trim().toLowerCase()==="fixelar"}function q(e){return e===void 0?void 0:JSON.parse(JSON.stringify(e))}function Ue(){try{return JSON.parse(localStorage.getItem(te)||"null")}catch{return null}}function zt(){try{let e=JSON.parse(localStorage.getItem("miplata_user_cache")||"null");return String(e?.email||"").trim().toLowerCase()===ft}catch{return!1}}function he(e){return`${e}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}function Ae(){return new Date().toISOString().slice(0,10)}function ct(){if(!D())return 0;let e=k.transactions.filter(s=>s.type==="ingreso").reduce((s,o)=>s+(Number(o.amount)||0),0),t=k.transactions.filter(s=>s.type==="gasto").reduce((s,o)=>s+(Number(o.amount)||0),0),a=k.goalContributions.filter(s=>String(s.date||"").startsWith(Ae().slice(0,7))).reduce((s,o)=>s+(Number(o.amount)||0),0);return Math.max(0,e-t-a)}function je(e){if(!e?.user||!ae(e.user))return k=null,null;let t=q(e.goalContributions||[]);return k={isDemo:!0,user:q(e.user),transactions:q(e.transactions||[]),fixedObligations:q(e.fixedObligations||[]),savingsGoals:q(e.savingsGoals||[]),goalContributions:t,categoryBudgets:q(e.categoryBudgets||[]),availableMonths:q(e.availableMonths||[])},k}function D(){if(!k){let e=Ue();e?.user&&ae(e.user)&&je(e)}return!!k?.isDemo}function dt(){return D()?q({user:k.user,transactions:k.transactions,fixedObligations:k.fixedObligations,savingsGoals:k.savingsGoals,goalContributions:k.goalContributions,categoryBudgets:k.categoryBudgets,availableMonths:k.availableMonths}):null}function ve(){try{let e=localStorage.getItem(Fe);return e?JSON.parse(e):null}catch{return null}}function ht(e){e?.access_token&&localStorage.setItem(Fe,JSON.stringify(e))}function ce(){localStorage.removeItem(Fe),localStorage.removeItem("miplata_current_user_id"),localStorage.removeItem("miplata_user_cache"),localStorage.removeItem(te),k=null}function Vt(){let e=ve(),t={"Content-Type":"application/json"};return e?.access_token&&(t.Authorization=`Bearer ${e.access_token}`),t}var Ie=null;async function ut(){let e=ve();return e?.refresh_token?(Ie||(Ie=xt(`${mt}/api/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:e.refresh_token})}).then(async t=>{if(!t.ok)return!1;let a=await t.json();return a.session?.access_token?(ht({...e,...a.session}),!0):!1}).catch(()=>!1).finally(()=>{Ie=null})),Ie):!1}function Jt(e){let t=Number(e?.expires_at||0);return t?t<=Math.floor(Date.now()/1e3)+Ht:!1}function pt(){window.dispatchEvent(new CustomEvent("miplata:auth-expired"))}async function j(e,t={},a=!0,s=0){let o=String(t.method||"GET").toUpperCase(),i=a&&o!=="GET"&&o!=="HEAD"?`${o}:${e}:${t.body||""}`:"";if(i&&xe.has(i))return xe.get(i);let m=(async()=>{try{let v=ve();if(a&&v?.access_token&&Jt(v)&&!await ut())return ce(),pt(),new Response(JSON.stringify({error:"Tu sesi\xF3n expir\xF3. Ingresa nuevamente."}),{status:401,headers:{"Content-Type":"application/json"}});let d={...Vt(),...t.headers||{}},r=await xt(`${mt}${e}`,{...t,headers:d});if(r.status===401&&a&&e!=="/api/auth/refresh"){if(await ut()){let $=await j(e,t,!1);if($.status!==401)return $}ce(),pt()}return r}catch(v){let d=gt(v);if(s===0&&_t.has(e)&&bt(d))return await new Promise(r=>window.setTimeout(r,250)),j(e,t,a,1);if(a&&o==="GET"&&s===0)return await new Promise(r=>window.setTimeout(r,250)),j(e,t,!1,1);throw d}})();if(!i)return m;xe.set(i,m);try{return await m}finally{xe.get(i)===m&&xe.delete(i)}}async function T(e,t){let a=await e.json().catch(()=>({}));return e.status===401?"Tu sesi\xF3n expir\xF3. Ingresa nuevamente para continuar.":a.error||t}function He(e){if(e?.session?.access_token&&ht(e.session),e?.user?.id){try{let t=JSON.parse(localStorage.getItem(te)||"null");t?.user?.id&&t.user.id!==e.user.id&&localStorage.removeItem(te)}catch{localStorage.removeItem(te)}localStorage.setItem("miplata_current_user_id",e.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(e.user))}}var L={async getBootstrap(){let e=Ue();if(!ve()?.access_token)return ce(),null;let t=dt();if(t)return t;if(zt()&&e?.user&&ae(e.user)&&je(e))return dt();let a=await j("/api/bootstrap");if(a.status===401)return null;if(!a.ok)throw new Error(await T(a,"No se pudo cargar la aplicaci\xF3n"));let s=await a.json();ae(s.user)&&je(s),s.user&&(localStorage.setItem("miplata_current_user_id",s.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(s.user)));try{localStorage.setItem(te,JSON.stringify(s))}catch{}return s},async getMonthlyReport(e){let t=await j(`/api/reports/monthly?month=${encodeURIComponent(e)}`);if(!t.ok)throw new Error(await T(t,"No se pudo cargar el reporte mensual"));return t.json()},async getCurrentUser(){if(!ve()?.access_token)return ce(),null;if(D())return q(k.user);try{let e=await j("/api/user");if(e.status===401)return null;if(!e.ok)throw new Error("No se pudo consultar el usuario");let t=await e.json();return t.user&&(localStorage.setItem("miplata_current_user_id",t.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(t.user))),t.user}catch(e){return console.warn("API get user failed",e),null}},async loginDemo(){let e=await j("/api/auth/demo",{method:"POST"},!1);if(!e.ok)throw new Error(await T(e,"Error al iniciar demo"));let t=await e.json();return He(t),t.bootstrap&&je(t.bootstrap),t},async login(e,t){let a=await j("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:t})},!1);if(!a.ok)throw a.status===401?new Error("Correo o contrase\xF1a incorrectos."):new Error(await T(a,"Credenciales incorrectas"));let s=await a.json();k=null,He(s);let o=Ue();return o?.user?.id&&o.user.id===s?.user?.id&&(s.bootstrap=o),s},async register(e,t,a,s,o){Ce({imageUrl:o});let i=await j("/api/auth/register",{method:"POST",body:JSON.stringify({name:e,email:t,password:a,monthlySalary:s,avatarUrl:o})},!1);if(i.status===409)throw new Error("Correo ya registrado.");if(!i.ok)throw new Error(await T(i,"Error al crear cuenta"));let f=await i.json();return k=null,He(f),f},async requestPasswordReset(e,t){let a=await j("/api/auth/password-reset/request",{method:"POST",body:JSON.stringify({email:e,redirectTo:t})});if(!a.ok)throw new Error(await T(a,"No se pudo enviar el enlace de recuperaci\xF3n"));return a.json()},async confirmPasswordReset(e,t){let a=await j("/api/auth/password-reset/confirm",{method:"POST",body:JSON.stringify({accessToken:e,password:t})});if(!a.ok)throw new Error(await T(a,"No se pudo actualizar la contrase\xF1a"));return a.json()},async logout(){try{await j("/api/auth/logout",{method:"POST"},!1)}catch(e){console.warn("Logout error",e)}ce()},async updateProfile(e){if(Ce(e),D())return k.user={...k.user,...q(e)},e.budgetRule&&(k.user.budgetRule={...k.user.budgetRule||{},...q(e.budgetRule)}),{user:q(k.user),message:"Perfil actualizado"};let t=await j("/api/user/profile",{method:"PUT",body:JSON.stringify(e)});if(!t.ok)throw new Error(await T(t,"Error al actualizar perfil"));let a=await t.json();return a.user&&(localStorage.setItem("miplata_user_cache",JSON.stringify(a.user)),localStorage.removeItem(te)),a},async updateInitialBalance(e){if(D())return k.user.initialBalance=Number(e)||0,{user:q(k.user),message:"Saldo disponible base actualizado"};let t=await j("/api/user/balance",{method:"PUT",body:JSON.stringify({initialBalance:e})});if(!t.ok)throw new Error(await T(t,"Error al actualizar saldo"));let a=await t.json();return a.user&&localStorage.setItem("miplata_user_cache",JSON.stringify(a.user)),a},async resetUserData(){if(D())return{message:"Los datos demo se restauran al recargar la p\xE1gina"};let e=await j("/api/user/reset",{method:"POST"});if(!e.ok)throw new Error(await T(e,"Error al reiniciar datos"));return e.json()},async deleteAccount(){if(D())return{protected:!0,message:"La cuenta demo est\xE1 protegida y no se puede eliminar"};let e=await j("/api/user",{method:"DELETE"});if(!e.ok)throw new Error(await T(e,"Error al eliminar cuenta"));return ce(),e.json()},async getTransactions(){if(D())return q(k.transactions);let e=await j("/api/transactions");if(!e.ok)throw new Error(await T(e,"Error al obtener movimientos"));return e.json()},async addTransaction(e){if(D()){let a=e.id||he("tx_demo");return k.transactions.push({...q(e),id:a,userId:k.user.id,createdAt:e.createdAt||Date.now()}),{id:a,message:"Movimiento registrado con \xE9xito"}}let t=await j("/api/transactions",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await T(t,"Error al registrar movimiento"));return t.json()},async updateTransaction(e,t){if(D()){let s=k.transactions.find(o=>o.id===e);return s&&Object.assign(s,q(t)),{message:"Movimiento actualizado"}}let a=await j(`/api/transactions/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await T(a,"Error al actualizar movimiento"));return a.json()},async getFixedObligations(){if(D())return q(k.fixedObligations);let e=await j("/api/fixed-obligations");if(!e.ok)throw new Error(await T(e,"Error al obtener fijos"));return e.json()},async addFixedObligation(e){if(D()){let a=e.id||he("fix_demo");return k.fixedObligations.push({...q(e),id:a,userId:k.user.id,paidDate:e.paidDate||null}),{id:a,message:"Nuevo gasto fijo agregado"}}let t=await j("/api/fixed-obligations",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await T(t,"Error al agregar fijo"));return t.json()},async updateFixedObligation(e,t){if(D()){let s=k.fixedObligations.find(o=>o.id===e);return s&&Object.assign(s,q(t)),{message:"Compromiso recurrente actualizado"}}let a=await j(`/api/fixed-obligations/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await T(a,"Error al actualizar fijo"));return a.json()},async deleteFixedObligation(e){if(D())return k.fixedObligations=k.fixedObligations.filter(a=>a.id!==e),k.transactions=k.transactions.filter(a=>a.fixedObligationId!==e),{message:"Obligaci\xF3n eliminada"};let t=await j(`/api/fixed-obligations/${e}`,{method:"DELETE"});if(!t.ok)throw new Error(await T(t,"Error al eliminar fijo"));return t.json()},async togglePayFixedObligation(e){if(D()){let a=k.fixedObligations.find(m=>m.id===e);if(!a)throw new Error("Obligaci\xF3n no encontrada");let s=a.status!=="paid",o=ct();if(s&&Number(a.amount)>o)throw new Error(`Saldo insuficiente. Disponible: $${o.toLocaleString("es-CO")} COP`);a.status=s?"paid":"pending",a.paidDate=s?Ae():null;let i=k.transactions.some(m=>m.fixedObligationId===e),f=k.transactions.find(m=>m.fixedObligationId===e)?.id||null;return s&&!i?(f=he(`tx_fix_${e}`),k.transactions.push({id:f,userId:k.user.id,type:"gasto",amount:Number(a.amount)||0,category:a.category,description:`${a.name} (Gasto Fijo)`,date:Ae(),time:new Date().toTimeString().slice(0,8),accountMethod:"Fijo Mensual",isRecurring:!0,fixedObligationId:e,createdAt:Date.now()})):s||(k.transactions=k.transactions.filter(m=>m.fixedObligationId!==e)),{result:{status:a.status,isPaid:s,transactionId:f},message:s?"Marcado como pagado e integrado a gastos.":"Gasto fijo desmarcado (vuelve a pendiente)."}}let t=await j(`/api/fixed-obligations/${e}/toggle`,{method:"POST"});if(!t.ok)throw new Error(await T(t,"Error al cambiar estado de pago"));return t.json()},async getSavingsGoals(){if(D())return q(k.savingsGoals);let e=await j("/api/savings-goals");if(!e.ok)throw new Error(await T(e,"Error al obtener metas"));return e.json()},async addSavingsGoal(e){if(Ce(e),D()){let a=e.id||he("goal_demo");return k.savingsGoals.push({...q(e),id:a,userId:k.user.id,currentAmount:0,imageUrl:e.imageUrl||""}),{id:a,message:`Meta "${e.name}" creada con \xE9xito`}}let t=await j("/api/savings-goals",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await T(t,"Error al crear meta"));return t.json()},async updateSavingsGoal(e,t){if(Ce(t),D()){let s=k.savingsGoals.find(o=>o.id===e);if(s){let o={...q(t)};delete o.currentAmount,Object.assign(s,o)}return{message:"Meta actualizada"}}let a=await j(`/api/savings-goals/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await T(a,"Error al actualizar meta"));return a.json()},async deleteSavingsGoal(e){if(D())return k.savingsGoals=k.savingsGoals.filter(a=>a.id!==e),k.goalContributions=k.goalContributions.filter(a=>a.goalId!==e),{message:"Meta de ahorro eliminada"};let t=await j(`/api/savings-goals/${e}`,{method:"DELETE"});if(!t.ok)throw new Error(await T(t,"Error al eliminar meta"));return t.json()},async contributeToGoal(e,t,a="Manual"){if(D()){let o=k.savingsGoals.find(r=>r.id===e);if(!o)throw new Error("Meta no encontrada");let i=Number(t);if(!Number.isFinite(i)||i<=0)throw new Error("El monto debe ser mayor a 0");let f=ct();if(i>f)throw new Error(`No tienes suficiente dinero disponible. Te quedan $${f.toLocaleString("es-CO")} COP`);let v=k.goalContributions.filter(r=>r.goalId===e).reduce((r,p)=>r+(Number(p.amount)||0),0)+i;o.currentAmount=v;let d=he("contrib_demo");return k.goalContributions.unshift({id:d,userId:k.user.id,goalId:e,goalName:o.name,amount:i,date:Ae(),type:a,timestamp:Date.now()}),{result:{goalId:e,newAmount:v,contributionId:d},message:`\xA1Has reservado $${Number(t||0).toLocaleString("es-CO")} COP para tu meta!`}}let s=await j(`/api/savings-goals/${e}/contribute`,{method:"POST",body:JSON.stringify({amount:t,type:a})});if(!s.ok)throw new Error(await T(s,"Error al registrar aporte"));return s.json()},async getGoalContributions(){if(D())return q(k.goalContributions);let e=await j("/api/goal-contributions");if(!e.ok)throw new Error(await T(e,"Error al obtener aportes"));return e.json()},async getCategoryBudgets(){if(D())return q(k.categoryBudgets);let e=await j("/api/category-budgets");if(!e.ok)throw new Error(await T(e,"Error al obtener presupuestos"));return e.json()},async updateCategoryBudget(e,t){if(D()){let s=k.categoryBudgets.find(o=>o.category===e);return s&&(s.limit=Number(t)||0),{message:`Presupuesto para ${e} actualizado`}}let a=await j("/api/category-budgets",{method:"PUT",body:JSON.stringify({category:e,limit:t})});if(!a.ok)throw new Error(await T(a,"Error al actualizar presupuesto"));return a.json()}};var de=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];function g(e,t=!1){let s=(typeof e=="string"?parseInt(e.replace(/\D/g,"")||"0",10):Math.round(e||0)).toLocaleString("es-CO");return t?`$${s} COP`:`$${s}`}function ze(e){let t=Math.round(e||0);return t>=1e6?`$${(t/1e6).toFixed(1).replace(".0","")}M`:t>=1e3?`$${(t/1e3).toFixed(0)}k`:`$${t}`}function ye(e){if(!e)return 0;let t=String(e).replace(/\D/g,"");return t?parseInt(t,10):0}function Ve(){let e=new Date,t=e.getHours(),a=e.getMinutes(),s=t>=12?"PM":"AM";t=t%12,t=t||12;let o=a<10?`0${a}`:a;return`${t}:${o} ${s}`}function K(){let e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),s=String(e.getDate()).padStart(2,"0");return`${t}-${a}-${s}`}function Te(e){if(!e||!e.trim())return"MP";let a=e.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,"").split(/\s+/).filter(Boolean);return a.length===0?"MP":a.length===1?a[0].substring(0,2).toUpperCase():(a[0][0]+a[a.length-1][0]).toUpperCase()}function H(){let e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0");return`${t}-${a}`}function se(e){if(!e||!e.includes("-")){let i=new Date;return`${de[i.getMonth()]} ${i.getFullYear()}`}let[t,a]=e.split("-"),s=parseInt(a,10)-1;return`${de[s]||a} ${t}`}function Be(e="h-8 w-auto object-contain"){return`<img src="assets/optimized/Imagotipo.png" alt="MiPlata" width="434" height="144" fetchpriority="high" decoding="async" class="${e} select-none transition-transform duration-200 hover:scale-105" />`}function Le(e="h-6 w-auto object-contain"){return`<img src="assets/optimized/ImagotipoOscuroFixelar.png" alt="Fixelar" width="434" height="144" loading="lazy" decoding="async" class="${e} select-none" />`}var vt={home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',trendingUp:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',trendingDown:'<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',receiptText:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',fileText:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',calendarCheck:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>',piggyBank:'<path d="M4 10V8a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v1h1.5a1.5 1.5 0 0 1 0 3H19a7 7 0 0 1-6 3.5H9A7 7 0 0 1 3 13H2a1.5 1.5 0 0 1 0-3h2Z"/><path d="M7 16v5M17 16v5M8 3 7 1M16 3l1-2M10 8h.01M15 8h.01M12 3v2"/><path d="M20 9c1.5 0 2.5-1 3-2"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="m9 15 8-8"/><path d="M14 7h3v3"/>',user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06A1.7 1.7 0 0 0 16.44 18l-.16.07a1.7 1.7 0 0 0-1.03 1.56V19.7h-2.02v-.08A1.7 1.7 0 0 0 12.2 18l-.16-.07a1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.08 15l-.07-.16a1.7 1.7 0 0 0-1.56-1.03h-.08v-2.02h.08A1.7 1.7 0 0 0 9.01 10.8l.07-.16a1.7 1.7 0 0 0-.34-1.88l-.06-.06L10.1 7.28l.06.06a1.7 1.7 0 0 0 1.88.34l.16-.07a1.7 1.7 0 0 0 1.03-1.56v-.08h2.02v.08a1.7 1.7 0 0 0 1.03 1.56l.16.07a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06a1.7 1.7 0 0 0-.34 1.88l.07.16a1.7 1.7 0 0 0 1.56 1.03h.08v2.02h-.08A1.7 1.7 0 0 0 19.47 15l-.07.16Z"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',shieldCheck:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',eyeOff:'<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',plusCircle:'<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',arrowDownCircle:'<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/>',flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',pieChart:'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',bellRing:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/>',chevronRight:'<path d="m9 18 6-6-6-6"/>',chevronLeft:'<path d="m15 18-6-6 6-6"/>',chevronDown:'<path d="m6 9 6 6 6-6"/>',arrowUpRight:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',calendarDays:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',laptop:'<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',utensils:'<path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V2"/><path d="M9 2v4a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M12 14v8"/>',apple:'<path d="M12 20.5c-4.2 0-7-4.4-7-8.1C5 9.5 7.3 7 10.1 7c.9 0 1.8.4 2.4.4S14 7 15 7c2.8 0 5 2.2 5 5.4 0 3.7-2.8 8.1-7 8.1Z"/><path d="M12.5 6C12.2 4.2 13.3 2.8 15 2"/>',pizzaSlice:'<path d="M4 20 8.6 6.2c.35-1.05 1.7-1.4 2.5-.6l8.3 8.3c.8.8.45 2.15-.6 2.5L4 20Z"/><path d="M9.2 8.4a8.9 8.9 0 0 1 7.7 7.7"/><circle cx="10.2" cy="14.9" r="1"/><circle cx="13.8" cy="11.9" r="1"/><circle cx="16.5" cy="15.2" r="1"/>',bowlFood:'<path d="M4 10h16"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M7 15h10"/><path d="M8 5c0 1.5 1 2 1 3"/><path d="M12 3c0 1.5 1 2 1 3"/><path d="M16 5c0 1.5 1 2 1 3"/>',forkKnife:'<path fill="currentColor" stroke="none" d="M4 3h2v7h1V3h2v7h1V3h2v7c0 2.2-1.3 3.8-3 4.3V21H7v-6.7c-1.7-.5-3-2.1-3-4.3V3Z"/><path fill="currentColor" stroke="none" d="M17 3c3 1 4 3.8 4 6v12h-2V13h-4V8c0-2.3.7-4.1 2-5Z"/>',shoppingBag:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',heartPulse:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',gamepad2:'<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>',graduationCap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',moreHorizontal:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',moreVertical:'<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',sliders:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>',wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',check:'<path d="M20 6 9 17l-5-5"/>',checkCircle2:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',alertCircle:'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',alertTriangle:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',trash2:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',edit2:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',edit3:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',briefcase:'<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',building2:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',dollarSign:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',sparkles:'<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',wifi:'<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>',droplet:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',landmark:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',tv:'<rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>',smartphone:'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',creditCard:'<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',banknote:'<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',deleteKey:'<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',share2:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',arrowLeft:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',fileSpreadsheet:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',printer:'<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',keyboard:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M18 16H6"/>',coins:'<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',logOut:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',calendar:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',rotateCcw:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',lightbulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'};function l(e,t="w-5 h-5"){let a=vt[e]||vt.moreHorizontal;return`<svg class="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a}</svg>`}function Je(e,t="w-5 h-5"){switch(e){case"Alimentaci\xF3n":return`<span class="text-amber-600">${l("pizzaSlice",t)}</span>`;case"Transporte":return`<span class="text-emerald-600">${l("car",t)}</span>`;case"Compras":return`<span class="text-indigo-600">${l("shoppingBag",t)}</span>`;case"Servicios":return`<span class="text-sky-600">${l("zap",t)}</span>`;case"Salud":return`<span class="text-blue-600">${l("heartPulse",t)}</span>`;case"Entretenimiento":return`<span class="text-rose-600">${l("gamepad2",t)}</span>`;case"Educaci\xF3n":return`<span class="text-purple-600">${l("graduationCap",t)}</span>`;case"Viajes":return`<span class="text-cyan-600">${l("plane",t)}</span>`;case"Mascotas":return`<span class="text-amber-700">${l("heartPulse",t)}</span>`;case"Donaciones":return`<span class="text-rose-600">${l("gift",t)}</span>`;case"N\xF3mina":return`<span class="text-[#006c49]">${l("briefcase",t)}</span>`;case"Honorarios":return`<span class="text-[#0058bc]">${l("dollarSign",t)}</span>`;case"Negocio":return`<span class="text-amber-700">${l("building2",t)}</span>`;case"Inversi\xF3n":return`<span class="text-purple-700">${l("trendingUp",t)}</span>`;default:return`<span class="text-slate-600">${l("moreHorizontal",t)}</span>`}}function yt(){let e=new Date().getHours(),t=e>=5&&e<14;return{slot:t?"morning":"evening",label:t?"Turno Ma\xF1ana":"Turno Tarde/Noche",periodBadge:t?"\u2600\uFE0F Ma\xF1ana":"\u{1F319} Tarde/Noche",focusText:t?"Planeaci\xF3n y presupuesto diario":"Ahorro y balance de jornada",icon:t?"sun":"moon"}}function Ye(e,t=new Date().getDate()){let a=e.dueDay,s=a-t;if(s<0){let o=Math.abs(s);return{obligation:e,daysDiff:o,status:"overdue",label:o===1?`Venci\xF3 ayer (D\xEDa ${a})`:`Venci\xF3 hace ${o} d\xEDas (D\xEDa ${a})`,badgeColor:"bg-rose-100 text-rose-700 border-rose-200"}}return s===0?{obligation:e,daysDiff:0,status:"today",label:`\xA1Vence hoy! (D\xEDa ${a})`,badgeColor:"bg-amber-100 text-amber-800 border-amber-200 animate-pulse"}:s<=3?{obligation:e,daysDiff:s,status:"upcoming",label:s===1?`Vence ma\xF1ana (D\xEDa ${a})`:`Vence en ${s} d\xEDas (D\xEDa ${a})`,badgeColor:"bg-orange-100 text-orange-800 border-orange-200"}:{obligation:e,daysDiff:s,status:"far",label:`Vence el D\xEDa ${a}`,badgeColor:"bg-slate-100 text-slate-700 border-slate-200"}}function wt(e){let t=new Date().getDate();return e.filter(s=>s.status==="pending").map(s=>Ye(s,t)).sort((s,o)=>{let i=m=>m.status==="today"?0:m.status==="overdue"?1:m.status==="upcoming"?2:3,f=i(s)-i(o);return f!==0?f:s.daysDiff-o.daysDiff})}function $t(e){let t=[],{currentUser:a=null,alert80Percent:s,fixedObligations:o=[],totalIncome:i=0,totalExpenses:f=0,availableCash:m=0,fixedCommitted:v=0,monthlyBudgetLimit:d=0,monthlyBudgetSpent:r=0,monthlyBudgetRemaining:p=0,monthlyBudgetPercent:$=0}=e,w=s??a?.alert80Percent??!0;if(d>0&&w)if(r>d){let S=r-d;t.push({id:"alert_budget_exceeded",type:"danger",title:`Presupuesto mensual superado (+${$}%)`,description:`Has gastado ${g(r)}, excediendo tu l\xEDmite por ${g(S,!0)}. Te recomendamos pausar compras no urgentes.`,actionLabel:"Ver gastos",actionTab:"gastos"})}else $>=80&&t.push({id:"alert_budget_80",type:"warning",title:`Presupuesto usado al ${$}%`,description:`Disponible: ${g(p,!0)}.`,actionLabel:"Controlar gastos",actionTab:"gastos"});return i===0&&f>0&&t.push({id:"alert_no_income_registered",type:"info",title:"A\xFAn no registras ingresos este mes",description:`Tienes ${g(f)} en gastos. Registra tus ingresos recibidos para calcular con exactitud tu dinero disponible real.`,actionLabel:"Registrar ingreso",actionTab:"ingresos"}),t}function Mt(e){let{currentUser:t,transactions:a=[],fixedObligations:s=[],savingsGoals:o=[],totalIncome:i=0,effectiveMonthlyIncome:f=0,totalExpenses:m=0,availableCash:v=0,fixedTotal:d=0}=e,r=[],p=t?.monthlyBudgetLimit||f||t?.monthlySalary||i||0,$=(t?.budgetRule?.savings||20)/100,w=(t?.budgetRule?.needs||50)/100,S=(t?.budgetRule?.wants||30)/100,y=p>0?Math.round(p*w):0,C=p>0?Math.round(p*S):0,b=p>0?Math.round(p*$):0,M=p>0?Math.max(0,p-d-C):0,h=p>0?Math.min(b,M):Math.round(Math.max(0,v)*.2),A=Math.max(0,v),P=h,c=P>0?Math.min(A,Math.max(1e3,Math.round(P/2/1e4)*1e4)):0;if(p>0){let B=h,_=Math.round(B/2/1e4)*1e4;if(d>0&&d<=y){let Y=y-d;r.push({id:"tip_distrib_healthy",tag:"Distribuci\xF3n 50/30/20",title:`Distribuci\xF3n ideal para tus ${g(p,!0)}/mes`,message:`Para tu salario de ${g(p)}, la regla ideal sugiere: Necesidades ${g(y)} (50%), Gustos ${g(C)} (30%) y Ahorro ${g(B)} (20% o ${g(_,!0)} por quincena). Tus fijos actuales suman ${g(d)}, \xA1dej\xE1ndote ${g(Y,!0)} de margen favorable en necesidades!`,actionLabel:"Ver distribuci\xF3n",actionTab:"perfil",iconType:"budget"})}else if(d>y){let Y=d-y;r.push({id:"tip_distrib_high_fixed",tag:"Distribuci\xF3n 50/30/20",title:"Gastos fijos superan el 50% de tus ingresos",message:`Con un salario de ${g(p)}, el tope recomendado para fijos es ${g(y)}. Actualmente tienes ${g(d)} comprometidos (+${g(Y,!0)} sobre lo ideal). Evaluar suscripciones o renegociar tarifas te devolver\xE1 ox\xEDgeno mensual.`,actionLabel:"Revisar fijos",actionTab:"obligaciones",iconType:"fixed"})}else r.push({id:"tip_distrib_overview",tag:"Distribuci\xF3n 50/30/20",title:`Tu f\xF3rmula mensual con salario de ${g(p,!0)}`,message:`La distribuci\xF3n recomendada para tu ingreso es: ${g(y)} en compromisos b\xE1sicos, ${g(C)} para entretenimiento y estilo de vida, y ${g(B)} (${g(_,!0)} quincenal) para hacer crecer tus ahorros.`,actionLabel:"Configurar regla",actionTab:"perfil",iconType:"budget"})}let x=a.filter(B=>B.type==="gasto");if(x.length>0){let B={};x.forEach(ee=>{B[ee.category]=(B[ee.category]||0)+ee.amount});let _="",Y=0;if(Object.entries(B).forEach(([ee,lt])=>{lt>Y&&(Y=lt,_=ee)}),_&&Y>0&&m>0){let ee=Math.round(Y/m*100);r.push({id:"tip_category_focus",tag:"Concentraci\xF3n de Gastos",title:`${_} concentra el ${ee}% de tus gastos`,message:`Has destinado ${g(Y,!0)} en ${_} este mes. Es tu categor\xEDa principal de consumo. Monitorear peque\xF1os consumos diarios aqu\xED es el camino m\xE1s r\xE1pido para liberar liquidez.`,actionLabel:`Ver ${_}`,actionTab:"gastos",iconType:"category"})}}let I=o.find(B=>B.currentAmount<B.targetAmount);if(I){let B=I.targetAmount-I.currentAmount,_=Math.min(B,A,Math.max(1e3,Math.round(A*.12/1e4)*1e4),c||A);A>=5e4&&_>=5e4&&r.push({id:"tip_goal_boost",tag:"Impulso a Metas",title:`Acelera tu meta "${I.name}"`,message:`Tienes ${g(A)} disponibles. Si apartas ${g(_,!0)}, tu meta alcanzar\xE1 el ${Math.round((I.currentAmount+_)/I.targetAmount*100)}% sin superar tu saldo disponible.`,actionLabel:"Aportar ahora",actionTab:"metas",iconType:"goal"})}let N=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),V=Math.max(1,N-new Date().getDate()+1),O=Math.max(0,p-d-P),F=Math.max(0,Math.round(O/N/1e3)*1e3),re=p>0?Math.round(d/p*100):0,J=o.find(B=>/emergencia|emergency/i.test(B.name||"")),le=p>0?Math.round(p*3/1e5)*1e5:0,Se=J?.currentAmount||0,R=o.find(B=>B.currentAmount<B.targetAmount),ge=R?Math.max(0,R.targetAmount-R.currentAmount):0,it=R?Math.min(A,Math.max(1e3,Math.ceil(ge/6/1e4)*1e4)):P;for([{id:"tip_daily_limit",tag:"Control diario",title:F>0?`Tu ritmo diario ideal es ${g(F,!0)}`:"Protege tu dinero disponible",message:F>0?`Despu\xE9s de separar ${g(d,!0)} para compromisos y ${g(P,!0)} para ahorro, puedes usar hasta ${g(F,!0)} por d\xEDa en gastos variables durante este mes.`:`Tu salario de ${g(p,!0)} ya est\xE1 muy comprometido. Antes de realizar compras no esenciales, revisa cu\xE1nto dinero queda disponible y prioriza tus pagos pendientes.`,actionLabel:"Ver gastos",actionTab:"gastos",iconType:"daily"},{id:"tip_fixed_ratio",tag:"Compromisos fijos",title:re<=50?"Tus compromisos fijos est\xE1n en una zona saludable":"Tus compromisos fijos necesitan atenci\xF3n",message:p>0?`Tus gastos fijos representan aproximadamente el ${re}% de tu sueldo mensual (${g(d,!0)} de ${g(p,!0)}). ${re<=50?"Mantenerlos por debajo del 50% te deja espacio para vivir y ahorrar.":"Busca reducir suscripciones o renegociar servicios para recuperar margen."}`:"Registra tu sueldo mensual para calcular qu\xE9 proporci\xF3n de tus ingresos est\xE1 comprometida en gastos fijos.",actionLabel:"Revisar fijos",actionTab:"obligaciones",iconType:"fixed"},{id:"tip_emergency_buffer",tag:"Fondo de emergencia",title:J?"Haz crecer tu fondo de emergencia":"Construye un fondo de emergencia",message:p>0?`${J?`Ya tienes ${g(Se,!0)} protegidos. `:""}Una meta inicial razonable es reunir cerca de ${g(le,!0)}, equivalente a tres meses de tu sueldo. Separar ${g(P,!0)} cada mes te acercar\xE1 sin descuidar tus gastos.`:"Un fondo de emergencia te ayuda a cubrir imprevistos sin endeudarte. Empieza con un aporte peque\xF1o y constante.",actionLabel:J?"Aportar ahora":"Crear fondo",actionTab:"metas",iconType:"safety"},{id:"tip_goal_schedule",tag:"Plan de ahorro",title:R?`Programa tu pr\xF3xima meta: "${R.name}"`:"Convierte tu ahorro en una meta",message:R?it>0?`Te faltan ${g(ge,!0)}. Si separas alrededor de ${g(it,!0)} al mes, avanzar\xE1s de forma constante sin superar tu saldo disponible.`:`Te faltan ${g(ge,!0)}, pero ahora no tienes saldo disponible para aportar.`:`Con un sueldo de ${g(p,!0)}, apartar ${g(P,!0)} al mes puede convertirse en una meta concreta y medible.`,actionLabel:"Ver metas",actionTab:"metas",iconType:"goal"},{id:"tip_monthly_review",tag:"Cierre mensual",title:m>0?`Ya llevas ${g(m,!0)} en gastos este mes`:"Registra tus movimientos del mes",message:m>0?`Te quedan aproximadamente ${g(Math.max(0,p-m),!0)} de tu ingreso mensual antes de separar compromisos y ahorro. Revisar tus movimientos hoy evita sorpresas al cierre.`:`Registrar cada gasto te permite comparar tu comportamiento con el sueldo de ${g(p,!0)} y tomar decisiones antes de que el dinero se disperse.`,actionLabel:"Ver historial",actionTab:"gastos",iconType:"review"},{id:"tip_income_visibility",tag:"Ingresos y balance",title:i>0?"Tu balance se ve mejor cuando registras todo":"Registra tu ingreso mensual",message:i>0?`Has registrado ${g(i,!0)} este mes y tienes ${g(v,!0)} disponibles. Mant\xE9n tus ingresos al d\xEDa para que las recomendaciones se ajusten a tu realidad.`:`Conocer tu sueldo real de ${g(p,!0)} es el primer paso para distribuirlo entre necesidades, gustos, ahorro y metas.`,actionLabel:i>0?"Ver balance":"Registrar ingreso",actionTab:i>0?"inicio":"ingresos",iconType:"income"}].forEach(B=>{r.some(_=>_.id===B.id)||r.push(B)});r.length<7;)r.push({id:`tip_balance_${r.length}`,tag:"Bienestar financiero",title:"Haz que tu dinero trabaje para ti",message:`Con un ingreso mensual de ${g(p,!0)}, cada decisi\xF3n peque\xF1a cuenta. Separa primero tus compromisos y luego define un aporte autom\xE1tico para tus metas.`,actionLabel:"Ver metas",actionTab:"metas",iconType:"goal"});let rt=r.find(B=>B.id==="tip_goal_boost");return(rt?[rt,...r.filter(B=>B.id!=="tip_goal_boost")]:r).slice(0,7)}function we(e){let t=Number(e?.targetAmount)||0;return t>0&&(Number(e?.currentAmount)||0)>=t}function kt(e,t=[]){let a=Number(e?.targetAmount)||0;if(a<=0)return null;let s=0,o=t.filter(i=>String(i?.goalId||"")===String(e?.id||"")).sort((i,f)=>(Number(i?.timestamp)||0)-(Number(f?.timestamp)||0));for(let i of o)if(s+=Number(i?.amount)||0,s>=a)return i.date||null;return null}var n={currentUser:null,activeTab:"inicio",selectedMonth:H(),hideBalance:!1,transactions:[],fixedObligations:[],savingsGoals:[],goalContributions:[],categoryBudgets:[],availableMonths:[],monthlyReports:{},filterRecordsType:"all",filterExpensesCategory:"Todos",filterIncomesCategory:"Todos",filterObligationsStatus:"all",pastMonthFilterType:"all",pastMonthSearchQuery:"",quickAdd:{isOpen:!1,type:"gasto",rawValue:"0",category:"Alimentaci\xF3n",categoryManuallySelected:!1,smartSuggestion:"",description:"",date:K()},activeTipIndex:0},Pe=["Alimentaci\xF3n","Compras","Educaci\xF3n","Entretenimiento","Transporte"],Lt=H(),Et=null,Oe=null,ke=0,u={app:document.getElementById("app"),headerContainer:document.getElementById("header-container"),headerBrand:document.getElementById("header-brand"),headerSearchBtn:document.getElementById("header-search-btn"),headerProfileBtn:document.getElementById("header-profile-btn"),mainContent:document.getElementById("main-content"),fabContainer:document.getElementById("fab-container"),fabBtn:document.getElementById("fab-button"),bottomNav:document.getElementById("bottom-nav"),navItemsContainer:document.getElementById("nav-items-container"),viewAuth:document.getElementById("view-auth"),tabInicio:document.getElementById("tab-inicio"),tabIngresos:document.getElementById("tab-ingresos"),tabGastos:document.getElementById("tab-gastos"),tabObligaciones:document.getElementById("tab-obligaciones"),tabMetas:document.getElementById("tab-metas"),tabPerfil:document.getElementById("tab-perfil"),modalQuickAdd:document.getElementById("modal-quick-add"),modalSearch:document.getElementById("modal-search"),searchInput:document.getElementById("search-input"),searchInputIcon:document.getElementById("search-input-icon"),searchCloseBtn:document.getElementById("search-close-btn"),searchResultsList:document.getElementById("search-results-list"),modalFixedObligation:document.getElementById("modal-fixed-obligation"),modalSavingsGoal:document.getElementById("modal-savings-goal"),modalAporteGoal:document.getElementById("modal-aporte-goal"),modalEditTransaction:document.getElementById("modal-edit-transaction"),modalEditProfile:document.getElementById("modal-edit-profile"),modalEditBudget:document.getElementById("modal-edit-budget"),modalConfirmDelete:document.getElementById("modal-confirm-delete"),toastContainer:document.getElementById("toast-container"),toastPill:document.getElementById("toast-pill"),toastIcon:document.getElementById("toast-icon"),toastText:document.getElementById("toast-text")};window.addEventListener("miplata:auth-expired",()=>{n.currentUser=null,n.transactions=[],n.fixedObligations=[],n.savingsGoals=[],n.goalContributions=[],n.categoryBudgets=[],n.availableMonths=[],n.monthlyReports={},[u.modalQuickAdd,u.modalSearch,u.modalFixedObligation,u.modalSavingsGoal,u.modalAporteGoal,u.modalEditTransaction,u.modalEditProfile,u.modalEditBudget,u.modalConfirmDelete].forEach(e=>e?.classList.add("hidden")),U(),E("Tu sesi\xF3n expir\xF3. Ingresa nuevamente para continuar.","error")});var Qe=null;function E(e,t="success"){Qe&&clearTimeout(Qe),u.toastText.textContent=e;let a=l("checkCircle2","w-5 h-5 text-[#6cf8bb] shrink-0");t==="error"?a=l("alertCircle","w-5 h-5 text-rose-400 shrink-0"):t==="info"&&(a=l("info","w-5 h-5 text-sky-400 shrink-0")),u.toastIcon.innerHTML=a,u.toastContainer.classList.remove("hidden"),Qe=setTimeout(()=>{u.toastContainer.classList.add("hidden")},3200)}function at({title:e,message:t,successMessage:a,errorMessage:s,onConfirm:o}){u.modalConfirmDelete.classList.remove("hidden"),u.modalConfirmDelete.innerHTML=`
    <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
        ${l("alertTriangle","w-6 h-6")}
      </div>
      <div>
        <h3 id="delete-confirm-title" class="font-bold text-base text-[#0b1c30]"></h3>
        <p id="delete-confirm-message" class="text-xs text-slate-500 mt-1"></p>
      </div>
      <div class="flex items-center gap-2 pt-2">
        <button id="btn-cancel-delete" type="button" class="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer">Cancelar</button>
        <button id="btn-confirm-delete" type="button" class="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer">S\xED, eliminar</button>
      </div>
    </div>
  `,document.getElementById("delete-confirm-title").textContent=e,document.getElementById("delete-confirm-message").textContent=t;let i=()=>u.modalConfirmDelete.classList.add("hidden");document.getElementById("btn-cancel-delete").onclick=i,document.getElementById("btn-confirm-delete").onclick=async f=>{let m=f.currentTarget;m.disabled=!0,m.classList.add("opacity-60","cursor-wait"),m.textContent="Eliminando\u2026";try{await o(),i(),E(a)}catch(v){m.disabled=!1,m.classList.remove("opacity-60","cursor-wait"),m.textContent="S\xED, eliminar",E(v.message||s,"error")}}}function W(e,t,a="md",s=!1){let o={xs:"w-7 h-7 text-[10px]",sm:"w-8 h-8 text-xs",md:"w-10 h-10 text-xs font-semibold",lg:"w-14 h-14 text-base font-bold",xl:"w-20 h-20 text-xl font-bold",profile:"w-24 h-24 text-2xl font-bold"},i={xs:"w-2 h-2",sm:"w-2.5 h-2.5",md:"w-3 h-3",lg:"w-4 h-4",xl:"w-5 h-5"},f=Te(e),m=["from-[#0058bc] to-[#0070eb] text-white","from-[#006c49] to-[#10b981] text-white","from-[#4f46e5] to-[#7c3aed] text-white","from-[#0284c7] to-[#0ea5e9] text-white","from-[#0f766e] to-[#14b8a6] text-white"],v=((e||"A").charCodeAt(0)||65)+((e||"B").charCodeAt(1)||66),d=m[v%m.length],r=!!t,p=`<span class="tracking-tight select-none font-bold uppercase">${f}</span>`,$=r?`<img src="${t}" alt="${e}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.classList.remove('bg-slate-100'); this.parentElement.classList.add('bg-gradient-to-br', '${d}'); this.nextElementSibling.style.display='flex'" /><span style="display:none" class="w-full h-full items-center justify-center tracking-tight select-none font-bold uppercase">${f}</span>`:p,w=s?`<span class="absolute bottom-0 right-0 rounded-full bg-[#006c49] ring-2 ring-white flex items-center justify-center text-white ${i[a]||"w-3 h-3"}">${l("check","w-2 h-2")}</span>`:"";return`
    <div class="relative inline-block">
      <div class="rounded-full overflow-hidden flex items-center justify-center select-none shadow-sm transition-transform ${o[a]||o.md} ${r?"bg-slate-100 ring-2 ring-[#0058bc]/20":`bg-gradient-to-br ${d}`}">
        ${$}
      </div>
      ${w}
    </div>
  `}var Yt=["Vivienda","Servicios p\xFAblicos","Internet y telefon\xEDa","Transporte","Deudas y cr\xE9ditos","Salud y seguros","Suscripciones y membres\xEDas","Educaci\xF3n y familia","Otros"],Qt=[{name:"Vivienda",label:"Vivienda",icon:"home"},{name:"Servicios p\xFAblicos",label:"Servicios",icon:"droplet"},{name:"Internet y telefon\xEDa",label:"Internet",icon:"wifi"},{name:"Transporte",label:"Transporte",icon:"car"},{name:"Deudas y cr\xE9ditos",label:"Cr\xE9ditos",icon:"creditCard"},{name:"Salud y seguros",label:"Salud",icon:"heartPulse"},{name:"Suscripciones y membres\xEDas",label:"Suscripciones",icon:"tv"},{name:"Educaci\xF3n y familia",label:"Educaci\xF3n",icon:"graduationCap"},{name:"Otros",label:"Otros",icon:"banknote"}];function Wt(e){let t={Servicios:"Servicios p\xFAblicos","Servicios P\xFAblicos":"Servicios p\xFAblicos",Entretenimiento:"Suscripciones y membres\xEDas",Salud:"Salud y seguros",Educaci\u00F3n:"Educaci\xF3n y familia"},a=String(e||"").trim();return t[a]||(Yt.includes(a)?a:"Otros")}function Ot(e,t=""){let a=String(t||"").toLowerCase();return a.includes("arriendo")||a.includes("casa")||a.includes("apartamento")?"Vivienda":a.includes("internet")||a.includes("fibra")||a.includes("wifi")||a.includes("claro")||a.includes("celular")||a.includes("tigo")||a.includes("movistar")?"Internet y telefon\xEDa":a.includes("servicios")||a.includes("agua")||a.includes("luz")||a.includes("epm")||a.includes("energ\xEDa")?"Servicios p\xFAblicos":a.includes("transporte")||a.includes("parqueadero")||a.includes("soat")||a.includes("veh\xEDculo")?"Transporte":a.includes("cr\xE9dito")||a.includes("prestamo")||a.includes("banco")||a.includes("cuota")||a.includes("tarjeta")?"Deudas y cr\xE9ditos":a.includes("salud")||a.includes("seguro")||a.includes("eps")||a.includes("medicina")?"Salud y seguros":a.includes("netflix")||a.includes("spotify")||a.includes("streaming")||a.includes("hbo")||a.includes("disney")||a.includes("gimnasio")?"Suscripciones y membres\xEDas":a.includes("educaci\xF3n")||a.includes("colegio")||a.includes("universidad")||a.includes("guarder\xEDa")?"Educaci\xF3n y familia":Wt(e)}function Zt(e,t=""){let a=Ot(t,e).toLowerCase(),s=(e||"").toLowerCase();return a==="vivienda"||s.includes("arriendo")||s.includes("casa")||s.includes("apartamento")?`<span class="text-[#0058bc]">${l("home","w-5 h-5")}</span>`:a==="internet y telefon\xEDa"||s.includes("internet")||s.includes("fibra")||s.includes("claro")||s.includes("wifi")?`<span class="text-indigo-600">${l("wifi","w-5 h-5")}</span>`:a==="servicios p\xFAblicos"||s.includes("servicios")||s.includes("agua")||s.includes("luz")||s.includes("epm")||s.includes("energ\xEDa")?`<span class="text-[#006c49]">${l("droplet","w-5 h-5")}</span>`:a==="transporte"||s.includes("transporte")||s.includes("parqueadero")||s.includes("soat")||s.includes("veh\xEDculo")?`<span class="text-[#00826a]">${l("car","w-5 h-5")}</span>`:a==="deudas y cr\xE9ditos"||s.includes("cr\xE9dito")||s.includes("prestamo")||s.includes("banco")||s.includes("cuota")||s.includes("tarjeta")?`<span class="text-amber-700">${l("creditCard","w-5 h-5")}</span>`:a==="salud y seguros"||s.includes("salud")||s.includes("seguro")||s.includes("eps")||s.includes("medicina")?`<span class="text-rose-600">${l("heartPulse","w-5 h-5")}</span>`:a==="suscripciones y membres\xEDas"||s.includes("netflix")||s.includes("spotify")||s.includes("streaming")||s.includes("hbo")||s.includes("disney")||s.includes("gimnasio")?`<span class="text-purple-600">${l("tv","w-5 h-5")}</span>`:a==="educaci\xF3n y familia"||s.includes("educaci\xF3n")||s.includes("colegio")||s.includes("universidad")||s.includes("guarder\xEDa")?`<span class="text-[#0058bc]">${l("graduationCap","w-5 h-5")}</span>`:s.includes("celular")||s.includes("tigo")||s.includes("movistar")||s.includes("plan")?`<span class="text-teal-600">${l("smartphone","w-5 h-5")}</span>`:`<span class="text-slate-600">${l("banknote","w-5 h-5")}</span>`}function Pt(e){if(e==null||e==="")return 0;let t=Number(e);if(Number.isFinite(t)&&t>0)return t<1e11?t*1e3:t;let a=Date.parse(String(e));return Number.isFinite(a)?a:0}function St(e){let t=String(e.date||"").slice(0,10),a=String(e.time||"").trim(),s=/^\d{4}-\d{2}-\d{2}$/.test(t)?Date.parse(`${t}T00:00:00`):0,i=/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i.test(a)&&s?Date.parse(`${t}T${a}`)||Date.parse(`${t} ${a}`):0,f=Pt(e.createdAt),m=f?new Date(f).toISOString().slice(0,10):"",v=i||(f&&m===t?f:s)||f;return{dayTimestamp:s||v,executionTimestamp:v,explicitTimestamp:i,createdAt:f}}function Kt(e,t){let a=St(e),s=St(t),o=s.dayTimestamp-a.dayTimestamp;if(o)return o;let i=a.createdAt||a.explicitTimestamp||a.executionTimestamp;return(s.createdAt||s.explicitTimestamp||s.executionTimestamp)-i||s.executionTimestamp-a.executionTimestamp||s.createdAt-a.createdAt||String(t.id||"").localeCompare(String(e.id||""))}function st(e,t="w-5 h-5"){return e.isGoalContribution?`<span class="text-[#0058bc]">${l("flag",t)}</span>`:e.fixedObligationId?`<span class="text-[#0058bc]">${l("calendarCheck",t)}</span>`:e.type==="ingreso"?`<span class="text-[#006c49]">${l("arrowUpRight",t)}</span>`:Je(e.category,t)}function Xt(e=null,t=n.goalContributions){return t.filter(a=>!e||String(a.date||"").startsWith(e)).map(a=>{let s=Pt(a.timestamp),o=s?new Date(s):null,i=o?o.toISOString().slice(0,10):"",f=o?o.toTimeString().slice(0,8):"";return{id:`goal-contribution-${a.id}`,type:"gasto",amount:Number(a.amount)||0,category:"Ahorro / Metas",description:`Aporte a meta: ${a.goalName||"Meta de ahorro"}`,date:a.date||i,time:a.time||f,createdAt:s,accountMethod:"Meta de ahorro",isRecurring:!1,fixedObligationId:null,isGoalContribution:!0,goalId:a.goalId||null}})}function Re(e){let t=n.monthlyReports[e],a=t?t.transactions||[]:n.transactions.filter(o=>o.date&&o.date.startsWith(e)),s=t?t.goalContributions||[]:n.goalContributions;return[...a,...Xt(e,s)].sort(Kt)}function ea(e=n.currentUser){return Number(e?.monthlySalary)||Number(e?.monthlyBudgetLimit)||0}function ta(e=n.currentUser){return Number(e?.monthlyBudgetLimit)||Number(e?.monthlySalary)||0}function aa(e){return Re(e).filter(t=>t.type==="ingreso").reduce((t,a)=>t+(Number(a.amount)||0),0)}function Ge(e=n.selectedMonth,t=n.currentUser){let a=ea(t),s=ta(t),o=aa(e);if(!t?.autoAdjustVariable||o<=0)return{configuredIncome:a,recordedIncome:o,effectiveIncome:a,monthlyBudgetLimit:s,categoryScale:1,isAdjusted:!1};if(a<=0)return{configuredIncome:a,recordedIncome:o,effectiveIncome:o,monthlyBudgetLimit:o,categoryScale:1,isAdjusted:!0};let i=o/a;return{configuredIncome:a,recordedIncome:o,effectiveIncome:o,monthlyBudgetLimit:Math.max(0,Math.round(s*i)),categoryScale:i,isAdjusted:Math.round(o)!==Math.round(a)}}function sa(e=n.selectedMonth){let t=Ge(e);return n.categoryBudgets.filter(a=>Pe.includes(a.category)).sort((a,s)=>Pe.indexOf(a.category)-Pe.indexOf(s.category)).map(a=>({...a,limit:Math.max(0,Math.round((Number(a.limit)||0)*t.categoryScale))}))}function be(){let{transactions:e,fixedObligations:t,savingsGoals:a,currentUser:s,selectedMonth:o}=n,i=Re(o),f=i.filter(c=>c.type==="ingreso").reduce((c,x)=>c+x.amount,0),m=i.filter(c=>c.type==="gasto").reduce((c,x)=>c+x.amount,0),v=t.reduce((c,x)=>c+x.amount,0),d=t.filter(c=>c.status==="paid").reduce((c,x)=>c+x.amount,0),r=t.filter(c=>c.status==="pending").reduce((c,x)=>c+x.amount,0),p=t.filter(c=>c.status==="paid").length,$=t.filter(c=>c.status==="pending").length,w=a.reduce((c,x)=>c+x.currentAmount,0),S=a.reduce((c,x)=>c+x.targetAmount,0),y=i.filter(c=>c.isGoalContribution).reduce((c,x)=>c+x.amount,0),C=Math.max(0,f-m),b=Ge(o,s),M=f>0?f:0,h=m,A=Math.max(0,M-h),P=M>0?Math.min(100,Math.round(h/M*100)):0;return{totalIncome:f,totalExpenses:m,fixedTotal:v,fixedPaid:d,fixedCommitted:r,fixedPaidCount:p,fixedPendingCount:$,totalSavings:w,totalSavingsTarget:S,totalGoalContributions:y,availableCash:C,monthlyBudgetLimit:M,monthlyBudgetSpent:h,monthlyBudgetRemaining:A,monthlyBudgetPercent:P,effectiveMonthlyIncome:b.effectiveIncome,budgetAdjustment:b,monthTransactions:i}}function na(){let e=new Set([...n.availableMonths,...n.transactions.map(t=>String(t.date||"").slice(0,7)),...n.goalContributions.map(t=>String(t.date||"").slice(0,7))].filter(t=>/^\d{4}-\d{2}$/.test(t)));return e.add(H()),[...e].sort((t,a)=>a.localeCompare(t)).map(t=>({key:t,label:se(t)}))}function G(e){e==="ingresos"&&(e="gastos"),n.activeTab=e,["inicio","ingresos","gastos","obligaciones","metas","perfil"].forEach(a=>{let s=document.getElementById(`tab-${a}`);s&&(a===e||e==="fijos"&&a==="obligaciones"?s.classList.remove("hidden"):s.classList.add("hidden"))}),nt(),Rt(),Z(),window.scrollTo({top:0,behavior:"auto"})}function oa(e){let t=e.dataset.tab||"gastos";if(e.dataset.focus==="balance"){let s=()=>{let o=document.getElementById("dashboard-balance-card");o&&(o.scrollIntoView({behavior:"smooth",block:"center"}),o.classList.add("ring-2","ring-blue-200"),window.setTimeout(()=>o.classList.remove("ring-2","ring-blue-200"),1200))};n.activeTab!=="inicio"?(G("inicio"),requestAnimationFrame(()=>window.setTimeout(s,0))):s();return}G(t)}function ia(){try{let e=JSON.parse(localStorage.getItem("miplata_bootstrap_cache")||"null"),t=e?.user,a=JSON.parse(localStorage.getItem("miplata_user_cache")||"null");return!t?.id||t.id!==a?.id?!1:(n.currentUser=t,n.transactions=e.transactions||[],n.fixedObligations=e.fixedObligations||[],n.goalContributions=e.goalContributions||[],n.savingsGoals=e.savingsGoals||[],n.categoryBudgets=e.categoryBudgets||[],n.availableMonths=e.availableMonths||[],n.monthlyReports={},!0)}catch{return localStorage.removeItem("miplata_bootstrap_cache"),!1}}function qt(e){return e?.user?(n.currentUser=e.user,n.transactions=e.transactions||[],n.fixedObligations=e.fixedObligations||[],n.goalContributions=e.goalContributions||[],n.savingsGoals=e.savingsGoals||[],n.categoryBudgets=e.categoryBudgets||[],n.availableMonths=e.availableMonths||[],n.monthlyReports={},n.selectedMonth=H(),!0):!1}async function ie(e=null){try{let t=await L.getBootstrap();return t?.user?e!==null&&e!==ke?!1:(Lt=H(),qt(t)):(n.currentUser=null,U(),!1)}catch(t){return console.error("Error fetching data from backend",t),!1}}function z(...e){ke+=1,n.monthlyReports={};let t=new Set([H(),...n.availableMonths||[]]);e.flat().forEach(a=>{let s=String(a?.date||"").slice(0,7);/^\d{4}-\d{2}$/.test(s)&&t.add(s)}),n.availableMonths=[...t].sort((a,s)=>s.localeCompare(a)),!Nt()&&(()=>{try{localStorage.setItem("miplata_bootstrap_cache",JSON.stringify({user:n.currentUser,transactions:n.transactions,fixedObligations:n.fixedObligations,savingsGoals:n.savingsGoals,goalContributions:n.goalContributions,categoryBudgets:n.categoryBudgets,availableMonths:n.availableMonths}))}catch{}})()}function ra(e,t={}){let a={...e,id:t.id||e.id||`tx_local_${Date.now()}`,userId:n.currentUser?.id,amount:Number(e.amount)||0,createdAt:e.createdAt||Date.now()};return n.transactions=[...n.transactions.filter(s=>s.id!==a.id),a],z(a),a}function la(e,t){n.transactions=n.transactions.map(a=>a.id===e?{...a,...t}:a),z()}function ca(e,t=null){let a={...e,id:t||e.id||`fix_local_${Date.now()}`,userId:n.currentUser?.id,amount:Number(e.amount)||0,paidDate:e.paidDate||null};return n.fixedObligations=[...n.fixedObligations.filter(s=>s.id!==a.id),a],z(),a}function da(e,t){n.fixedObligations=n.fixedObligations.map(a=>a.id===e?{...a,...t}:a),z()}function ua(e){n.fixedObligations=n.fixedObligations.filter(t=>t.id!==e),n.transactions=n.transactions.filter(t=>t.fixedObligationId!==e),z()}function pa(e,t={}){let a=n.fixedObligations.find(i=>i.id===e);if(!a)return;let s=!!t.isPaid,o=s?K():null;n.fixedObligations=n.fixedObligations.map(i=>i.id===e?{...i,status:s?"paid":"pending",paidDate:o}:i),s&&!n.transactions.some(i=>i.fixedObligationId===e)?n.transactions=[...n.transactions,{id:t.transactionId||`tx_fix_${e}_local_${Date.now()}`,userId:n.currentUser?.id,type:"gasto",amount:Number(a.amount)||0,category:a.category,description:`${a.name} (Gasto Fijo)`,date:o,time:Ve(),accountMethod:"Fijo Mensual",isRecurring:!0,fixedObligationId:e,createdAt:Date.now()}]:s||(n.transactions=n.transactions.filter(i=>i.fixedObligationId!==e)),z()}function ma(e,t=null){let a={...e,id:t||e.id||`goal_local_${Date.now()}`,userId:n.currentUser?.id,targetAmount:Number(e.targetAmount)||0,currentAmount:Number(e.currentAmount)||0,imageUrl:e.imageUrl||""};return n.savingsGoals=[...n.savingsGoals.filter(s=>s.id!==a.id),a],z(),a}function fa(e,t){n.savingsGoals=n.savingsGoals.map(a=>a.id===e?{...a,...t}:a),z()}function Nt(){return ae(n.currentUser)||String(n.currentUser?.name||"").trim().toLowerCase()==="fixelar"}function ba(e){if(n.savingsGoals=n.savingsGoals.filter(t=>t.id!==e),n.goalContributions=n.goalContributions.filter(t=>t.goalId!==e),Nt()){ke+=1,n.monthlyReports={};return}z()}function ga(e,t,a,s={}){let o=n.savingsGoals.find(r=>r.id===e);if(!o)return;let i=Number(o.currentAmount)||0,f=s.result||{},m={id:f.contributionId||`contrib_local_${Date.now()}`,userId:n.currentUser?.id,goalId:e,goalName:o.name,amount:Number(t)||0,date:K(),type:a,timestamp:Date.now()},v=Number(f.newAmount);n.goalContributions=[m,...n.goalContributions.filter(r=>r.id!==m.id)];let d=Number.isFinite(v)?v:i+m.amount;return n.savingsGoals=n.savingsGoals.map(r=>r.id===e?{...r,currentAmount:d}:r),z(m),{goalName:o.name,completed:!we({...o,currentAmount:i})&&we({...o,currentAmount:d})}}function xa(){Et||(Et=window.setInterval(async()=>{if(!n.currentUser)return;let e=H();if(e===Lt)return;n.selectedMonth=e,await ie()&&U()},6e4))}function U(){if(!!!n.currentUser){u.headerContainer.classList.add("hidden"),u.bottomNav.classList.add("hidden"),u.fabContainer.classList.add("hidden"),u.viewAuth.classList.remove("hidden"),["inicio","ingresos","gastos","obligaciones","metas","perfil"].forEach(t=>{let a=document.getElementById(`tab-${t}`);a&&a.classList.add("hidden")}),fe();return}u.headerContainer.classList.remove("hidden"),u.bottomNav.classList.remove("hidden"),u.fabContainer.classList.remove("hidden"),u.viewAuth.classList.add("hidden"),nt(),Rt(),G(n.activeTab)}function nt(){u.headerBrand.innerHTML=Be("h-7 w-auto object-contain select-none"),u.headerSearchBtn.innerHTML=l("search","w-5 h-5 text-slate-600"),u.headerSearchBtn.setAttribute("aria-label","Buscar movimientos");let e=n.activeTab==="perfil";u.headerProfileBtn.className=`flex items-center justify-center rounded-full transition-all group p-0.5 cursor-pointer ${e?"ring-2 ring-[#0058bc]":"hover:opacity-90"}`,u.headerProfileBtn.innerHTML=W(n.currentUser?.name,n.currentUser?.avatarUrl,"sm")}function Rt(){let e=[{id:"inicio",label:"Inicio",icon:"home"},{id:"gastos",label:"Registros",icon:"receiptText"},{id:"obligaciones",label:"Fijos",icon:"calendarCheck"},{id:"metas",label:"Metas",icon:"flag"},{id:"perfil",label:"Perfil",icon:"sliders"}];u.navItemsContainer.innerHTML=e.map(t=>{let a=n.activeTab===t.id||t.id==="obligaciones"&&n.activeTab==="fijos",s=`p-1 rounded-xl transition-all ${a?"bg-[#0058bc]/10 text-[#0058bc] scale-105":""}`;return`
        <button
          id="nav-tab-${t.id}"
          data-tab="${t.id}"
          class="nav-tab-action flex-1 flex flex-col items-center justify-center min-w-0 h-12 gap-0.5 transition-all select-none active:scale-95 cursor-pointer ${a?"text-[#0058bc] font-bold":"text-slate-400 hover:text-slate-700 font-medium"}"
        >
          <div class="${s}">
            ${l(t.icon,"w-5 h-5")}
          </div>
          <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-[58px]">
            ${t.label}
          </span>
        </button>
      `}).join(""),u.navItemsContainer.querySelectorAll(".nav-tab-action").forEach(t=>{t.onclick=()=>G(t.dataset.tab)})}function Z(){switch(n.activeTab){case"inicio":Ne();break;case"ingresos":Ee();break;case"gastos":Ee();break;case"obligaciones":case"fijos":Ze();break;case"metas":$a();break;case"perfil":Me();break}}function ha(e){let t=e.icon||(e.type==="danger"?"alertTriangle":e.type==="warning"?"alertCircle":"info"),a=e.type==="danger"?"bg-orange-100 text-amber-700":(e.type==="warning","bg-blue-100 text-blue-600"),s=e.type==="danger"?"text-amber-700":(e.type==="warning","text-blue-600"),o=e.description||e.message||"";return`
    <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-full ${a} flex items-center justify-center shrink-0">${l(t,"w-5 h-5")}</div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[#0b1c30]">${e.title}</p>
          <p class="text-sm font-bold ${s}">${o}</p>
        </div>
      </div>
      <button data-tab="${e.actionTab||"gastos"}" data-focus="${e.actionFocus||""}" class="insight-alert-action shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">
        ${e.actionLabel||"Ver"}
      </button>
    </div>
  `}function Ne(){if(n.selectedMonth!==H()){ne(n.selectedMonth);return}let e=be(),t=n.currentUser||{},a=(t.name||"Camila").split(" ")[0],s=se(n.selectedMonth),o=na(),i=n.fixedObligations.filter(h=>h.status==="pending"),f=i.reduce((h,A)=>h+A.amount,0),m=e.monthlyBudgetLimit,v=m>0?Math.min(100,Math.round(e.monthlyBudgetSpent/m*100)):0,d=n.savingsGoals.slice(0,2),r=e.monthTransactions.slice(0,5),p=$t({...n,...e,alert80Percent:t.alert80Percent!==!1}),$=Mt({...n,...e}),w=$.length?n.activeTipIndex%$.length:0,S=$[w]||null,y=yt();u.tabInicio.innerHTML=`
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-[27px] leading-none font-extrabold tracking-tight text-[#0b1c30]">Hola, ${a} \u{1F44B}</h1>
          <p class="text-sm text-slate-600 mt-1">Tus finanzas van sobre ruedas<br class="sm:hidden" /> este mes</p>
        </div>
        <div class="relative shrink-0">
          <button id="month-dropdown-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#dce8ff] text-[#0b1c30] text-xs font-semibold cursor-pointer">
            ${l("calendarDays","w-4 h-4 text-[#0058bc]")}
            <span>${s}</span>
            ${l("chevronDown","w-3.5 h-3.5 text-slate-500")}
          </button>
          <div id="month-dropdown-menu" class="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 hidden">
            ${o.map(h=>`<button data-month="${h.key}" class="month-select-item w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 ${n.selectedMonth===h.key?"text-[#0058bc] bg-blue-50/50":"text-slate-700"}">${h.label}</button>`).join("")}
          </div>
        </div>
      </div>

      <div id="dashboard-balance-card" class="hero-card-dark mockup-home-hero p-5">
        <div class="hero-glow-1"></div><div class="hero-glow-2"></div>
        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
              ${l("shieldCheck","w-4 h-4 text-[#6cf8bb]")} DINERO DISPONIBLE
            </span>
            <button id="btn-toggle-hide-balance" aria-label="${n.hideBalance?"Mostrar saldo":"Ocultar saldo"}" title="${n.hideBalance?"Mostrar saldo":"Ocultar saldo"}" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer">
              ${l(n.hideBalance?"eyeOff":"eye","w-4 h-4")}
            </button>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[38px] leading-none font-extrabold tracking-tight text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022":g(e.availableCash)}</span>
            <span class="text-xs font-semibold text-slate-300">COP</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <div id="dash-pill-ingresos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-[#6cf8bb] font-semibold">\u2022 Ingresos</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":g(e.totalIncome,!0)}</strong></div>
            <div id="dash-pill-gastado" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-rose-400 font-semibold">\u2022 Egresos</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":g(e.totalExpenses,!0)}</strong></div>
            <div id="dash-pill-fijos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-slate-300 font-semibold">\u2022 Por Pagar</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":g(f,!0)}</strong></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button id="btn-quick-gasto" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-rose-600 py-3 border border-slate-100 cursor-pointer">${l("plusCircle","w-5 h-5")}<span class="text-[11px] font-semibold">Gasto</span></button>
        <button id="btn-quick-ingreso" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#006c49] py-3 border border-slate-100 cursor-pointer">${l("arrowDownCircle","w-5 h-5")}<span class="text-[11px] font-semibold">Ingreso</span></button>
        <button id="btn-quick-obligaciones" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#0058bc] py-3 border border-slate-100 cursor-pointer">${l("calendar","w-5 h-5")}<span class="text-[11px] font-semibold">Pagar Fijo</span></button>
        <button id="btn-quick-metas" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-amber-600 py-3 border border-slate-100 cursor-pointer">${l("flag","w-5 h-5")}<span class="text-[11px] font-semibold">Nueva Meta</span></button>
      </div>

      <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${l("pieChart","w-5 h-5")}</div>
            <div class="min-w-0"><h2 class="font-semibold text-base text-[#0b1c30]">Presupuesto del Mes</h2><p class="text-xs text-slate-500">L\xEDmite mensual responsable</p></div>
          </div>
          <span class="rounded-full bg-[#c7f7e3] px-3 py-1 text-xs font-semibold text-[#006c49] whitespace-nowrap">${v}% en regla</span>
        </div>
        <div class="mt-4 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc] transition-all duration-500" style="width:${v}%"></div></div>
        <div class="flex items-center justify-between gap-3 mt-3 text-sm"><span class="text-slate-600">Egresos: <strong class="text-[#0b1c30]">${g(e.monthlyBudgetSpent)} COP</strong></span><span class="text-right text-[#006c49]">Restante: <strong>${g(e.monthlyBudgetRemaining)} COP</strong></span></div>
      </div>

      ${p.length?`
        <div class="flex flex-col gap-2">
          ${p.map(h=>ha(h)).join("")}
        </div>
      `:""}

      ${i.length?`
        <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-full bg-[#ffe1e7] text-[#f3194d] flex items-center justify-center shrink-0">${l("bellRing","w-5 h-5")}</div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#0b1c30]">${i.length} ${i.length===1?"gasto fijo":"gastos fijos"} por pagar</p>
              <p class="text-sm font-bold text-[#f3194d]">${g(e.fixedCommitted)} COP este mes</p>
            </div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver fijos</button>
        </div>
      `:`
        <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${l("calendarCheck","w-5 h-5")}</div>
            <div class="min-w-0"><p class="text-sm font-semibold text-[#0b1c30]">Gastos fijos del mes</p><p class="text-xs text-slate-500">${n.fixedObligations.length?"\xA1Todo al d\xEDa este mes!":"No tienes gastos fijos registrados"}</p></div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver obligaciones</button>
        </div>
      `}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Metas Activas <span class="ml-1 rounded-full bg-[#dce8ff] px-2 py-0.5 text-xs">${n.savingsGoals.length}</span></h2><button id="dash-ver-metas-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Explorar ${l("chevronRight","w-3 h-3 inline")}</button></div>
        <div class="grid grid-cols-2 gap-2.5">
          ${d.map(h=>{let A=h.targetAmount>0?Math.min(100,Math.round(h.currentAmount/h.targetAmount*100)):0,P=h.imageUrl?"w-9 h-9 flex items-center justify-center overflow-hidden":"w-9 h-9 rounded-full flex items-center justify-center";return`<div data-goal="${h.id}" class="dash-goal-card rounded-3xl bg-white p-3.5 shadow-sm border border-slate-100 cursor-pointer"><div class="flex items-center justify-between"><div class="${P}" style="${h.imageUrl?"":`background-color:${h.color}25;color:${h.color}`}" >${Ke(h,"w-full h-full object-contain","w-4 h-4")}</div><span class="text-xs font-bold" style="color:${h.color}">${A}%</span></div><p class="mt-2 text-xs font-semibold truncate">${h.name}</p><p class="text-[11px] text-slate-600 tabular-nums">${ze(h.currentAmount)} / ${ze(h.targetAmount)}</p><div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${A}%;background:${h.color}"></div></div></div>`}).join("")}
        </div>
      </div>

      ${$.length?`
        <section class="financial-tips-shell rounded-[26px] border border-[#c6dcff] bg-gradient-to-br from-[#eef5ff] to-[#dceaff] p-4 shadow-sm overflow-hidden">
          <div id="financial-tips-scroll" class="financial-tips-scroll no-scrollbar">
            ${$.map((h,A)=>{let P={goal:"flag",budget:"pieChart",fixed:"calendarCheck",category:"receiptText",daily:"calendarDays",safety:"shieldCheck",review:"fileText",income:"trendingUp"}[h.iconType]||"lightbulb";return`
                <article class="financial-tip-card snap-start min-w-full flex flex-col gap-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${l(P,"w-5 h-5")}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-extrabold tracking-wide text-[#0058bc] uppercase truncate">Impulso inteligente <span class="text-[10px] font-semibold tracking-normal text-amber-600 normal-case">\u2600\uFE0F ${y.slot==="morning"?"Ma\xF1ana":"Tarde/Noche"}</span></p>
                        <p class="text-[11px] text-[#496b9d] truncate">Calculado con tu salario y gastos reales \u2022 ${y.label} \u2022 Rota 2 veces/d\xEDa</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 rounded-full bg-white/75 px-1.5 py-1 shadow-sm">
                      <button type="button" data-tip-direction="-1" aria-label="Consejo anterior" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${l("chevronLeft","w-4 h-4")}</button>
                      <span class="financial-tip-count text-xs font-bold text-[#0b1c30] tabular-nums">${A+1}/${$.length}</span>
                      <button type="button" data-tip-direction="1" aria-label="Siguiente consejo" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${l("chevronRight","w-4 h-4")}</button>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-[17px] leading-tight font-bold text-[#0b1c30]">${h.title}</h3>
                    <p class="mt-2 text-sm leading-relaxed text-[#365579]">${h.message}</p>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-t border-[#b9d2fa] pt-2">
                    <button type="button" data-tip-next class="text-sm font-medium text-[#1a4b89] flex items-center gap-1 cursor-pointer">${l("rotateCcw","w-4 h-4")} Ver otro consejo</button>
                    <button type="button" data-tip-action data-tip-tab="${h.actionTab||"inicio"}" class="text-sm font-bold text-[#0058bc] flex items-center gap-1 cursor-pointer whitespace-nowrap">${h.actionLabel||"Ver detalle"} ${l("chevronRight","w-4 h-4")}</button>
                  </div>
                </article>
              `}).join("")}
          </div>
        </section>
      `:""}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Movimientos Recientes</h2><button id="dash-ver-historial-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Ver historial</button></div>
        <div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
      ${r.map(h=>`<div data-tx-id="${h.isGoalContribution?"":h.id}" data-goal-contribution="${h.isGoalContribution?"true":"false"}" class="dash-tx-row flex items-center justify-between py-3 ${h.isGoalContribution?"cursor-default":"cursor-pointer"}"><div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-2xl ${h.type==="ingreso"?"bg-emerald-50 text-[#006c49]":"bg-slate-100 text-slate-600"} flex items-center justify-center shrink-0">${st(h,"w-5 h-5")}</div><div class="min-w-0"><p class="text-xs font-semibold truncate">${h.description}</p><p class="text-[11px] text-slate-500 truncate">${h.date} \u2022 ${h.category}</p></div></div><div class="text-right shrink-0"><strong class="text-sm tabular-nums ${h.type==="ingreso"?"text-[#006c49]":"text-[#0b1c30]"}">${h.type==="ingreso"?"+":"-"}${g(h.amount)}</strong><span class="block text-[10px] ${h.type==="ingreso"?"text-[#006c49]":"text-slate-500"}">${h.type==="ingreso"?"Ingreso":"Egreso"}</span></div></div>`).join("")}
        </div>
      </div>
    </div>
  `;let C=document.getElementById("month-dropdown-btn"),b=document.getElementById("month-dropdown-menu");C&&b&&(C.onclick=h=>{h.stopPropagation(),b.classList.toggle("hidden")},b.querySelectorAll(".month-select-item").forEach(h=>{h.onclick=()=>{n.selectedMonth=h.dataset.month,Ne()}}));let M=document.getElementById("financial-tips-scroll");if(M&&$.length){let h=Array.from(M.querySelectorAll(".financial-tip-card")),A=()=>Math.max(0,Math.min($.length-1,Math.round(M.scrollLeft/Math.max(M.clientWidth,1)))),P=(x=n.activeTipIndex)=>{let I=h[x]||h[0];I&&(M.style.height=`${I.offsetHeight}px`)},c=()=>{let x=A();n.activeTipIndex=x,P(x)},b=x=>{let I=(A()+x+$.length)%$.length;n.activeTipIndex=I,P(I),M.scrollTo({left:I*M.clientWidth,behavior:"smooth"})};M.addEventListener("scroll",c,{passive:!0}),P(),window.setTimeout(()=>P(),0),M.querySelectorAll("[data-tip-direction]").forEach(x=>{x.onclick=()=>b(Number(x.dataset.tipDirection)||1)}),M.querySelectorAll("[data-tip-next]").forEach(x=>{x.onclick=()=>b(1)}),M.querySelectorAll("[data-tip-action]").forEach(x=>{x.onclick=()=>G(x.dataset.tipTab||"inicio")}),requestAnimationFrame(()=>{let x=Math.max(0,Math.min($.length-1,w));n.activeTipIndex=x,M.scrollTo({left:x*M.clientWidth,behavior:"auto"}),P(x)})}document.getElementById("btn-toggle-hide-balance")?.addEventListener("click",()=>{n.hideBalance=!n.hideBalance,Ne()}),document.getElementById("dash-pill-ingresos")?.addEventListener("click",()=>G("gastos")),document.getElementById("dash-pill-gastado")?.addEventListener("click",()=>G("gastos")),document.getElementById("dash-pill-fijos")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("btn-quick-gasto")?.addEventListener("click",()=>Xe("gasto")),document.getElementById("btn-quick-ingreso")?.addEventListener("click",()=>Xe("ingreso")),document.getElementById("btn-quick-obligaciones")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("btn-quick-metas")?.addEventListener("click",()=>De(null)),document.getElementById("dash-ver-fijos-btn")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("dash-ver-metas-btn")?.addEventListener("click",()=>G("metas")),document.getElementById("dash-ver-historial-btn")?.addEventListener("click",()=>G("gastos")),document.querySelectorAll(".insight-alert-action").forEach(h=>{h.onclick=()=>oa(h)}),u.tabInicio.querySelectorAll(".dash-goal-card").forEach(h=>{h.onclick=()=>G("metas")}),u.tabInicio.querySelectorAll(".dash-tx-row").forEach(h=>{h.onclick=()=>{if(h.dataset.goalContribution==="true")return;let A=n.transactions.find(P=>P.id===h.dataset.txId);A&&_e(A)}})}function $e(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function va(e){let t=String(e??"").trim(),a=t.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(a))return t||"Sin fecha";let[s,o,i]=a.split("-");return`${i}/${o}/${s}`}function ne(e){if(!n.monthlyReports[e]){u.tabInicio.innerHTML=`
      <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
        <div class="w-10 h-10 rounded-full border-4 border-blue-100 border-t-[#0058bc] animate-spin"></div>
        <p class="text-sm font-semibold text-slate-600">Cargando reporte de ${se(e)}\u2026</p>
      </div>
    `,L.getMonthlyReport(e).then(b=>{n.monthlyReports[e]=b,n.selectedMonth===e&&ne(e)}).catch(b=>{console.error("Error loading monthly report",b),u.tabInicio.innerHTML=`
          <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
            <p class="text-sm font-semibold text-rose-600">No se pudo cargar este reporte.</p>
            <button id="retry-month-report" type="button" class="px-4 py-2 rounded-full bg-[#0058bc] text-white text-xs font-semibold cursor-pointer">Reintentar</button>
          </div>
        `,document.getElementById("retry-month-report")?.addEventListener("click",()=>ne(e))});return}let t=se(e),a=se(H()),s=Re(e),o=s.filter(b=>b.type==="ingreso").reduce((b,M)=>b+M.amount,0),i=s.filter(b=>b.type==="gasto").reduce((b,M)=>b+M.amount,0),f=o-i,m=o>0?f/o*100:0,d=Ge(e).monthlyBudgetLimit||o||0,r=d>0?Math.min(100,Math.round(i/d*100)):0,p={};s.filter(b=>b.type==="gasto").forEach(b=>{p[b.category]||(p[b.category]={amount:0,count:0}),p[b.category].amount+=b.amount,p[b.category].count+=1});let $=Object.entries(p).map(([b,M])=>({category:b,amount:M.amount,count:M.count,percentage:i>0?M.amount/i*100:0})).sort((b,M)=>M.amount-b.amount),w={};s.filter(b=>b.type==="ingreso").forEach(b=>{w[b.category]||(w[b.category]={amount:0,count:0}),w[b.category].amount+=b.amount,w[b.category].count+=1});let S=Object.entries(w).map(([b,M])=>({category:b,amount:M.amount,count:M.count,percentage:o>0?M.amount/o*100:0})).sort((b,M)=>M.amount-b.amount),y=s.filter(b=>{let M=n.pastMonthFilterType==="all"||b.type===n.pastMonthFilterType,h=String(b.description||""),A=String(b.category||""),P=!n.pastMonthSearchQuery.trim()||h.toLowerCase().includes(n.pastMonthSearchQuery.toLowerCase())||A.toLowerCase().includes(n.pastMonthSearchQuery.toLowerCase());return M&&P});u.tabInicio.innerHTML=`
    <div id="past-month-report" class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Return to Current Month Notice Bar -->
      <div class="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/70 text-slate-800 shadow-sm">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#0058bc] text-white flex items-center justify-center shrink-0 shadow-sm">
            ${l("calendar","w-4 h-4")}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-[#0058bc] truncate"><span class="screen-report-title">${t}</span><span class="print-report-title" style="display:none">${t}</span></p>
            <p class="text-[11px] text-slate-500 truncate">Balance consolidado</p>
          </div>
        </div>

        <button
          id="btn-back-current-month"
          class="no-print flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100/50 text-[#0058bc] text-xs font-semibold border border-blue-200 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          ${l("arrowLeft","w-3.5 h-3.5")}
          <span>Volver a ${a}</span>
        </button>
      </div>

      <!-- Main Executive Summary Card (Apple Wallet aesthetic) -->
      <div class="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0c1f38] via-[#0f2a4d] to-[#071526] text-white p-5 shadow-xl border border-slate-700/60">
        <div class="absolute -right-10 -bottom-10 w-52 h-52 rounded-full bg-[#0058bc]/25 blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#3cd59c]/15 blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#6cf8bb] text-[10px] font-bold uppercase tracking-wider mb-1">
                <span class="w-1.5 h-1.5 rounded-full bg-[#6cf8bb] animate-pulse"></span>
                Balance Consolidado
              </div>
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Resumen de ${t}
              </h2>
            </div>

          </div>

          <!-- 4 Core Financial Metrics -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Ingresos Totales</span>
                <span class="text-[#6cf8bb]">${l("trendingUp","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${g(o)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${s.filter(b=>b.type==="ingreso").length} transacciones</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Egresos Totales</span>
                <span class="text-rose-400">${l("trendingDown","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${g(i)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${s.filter(b=>b.type==="gasto").length} consumos</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Ahorro Neto</span>
                <span class="text-emerald-400">${l("banknote","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold ${f>=0?"text-[#6cf8bb]":"text-rose-400"} tabular-nums tracking-tight">
                  ${f>=0?"+":""}${g(f)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${f>=0?"Super\xE1vit mensual":"D\xE9ficit mensual"}</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Tasa de Ahorro</span>
                <span class="text-sky-300">${l("pieChart","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${m.toFixed(1)}%
                </p>
                <span class="text-[10px] text-slate-400 font-medium">Meta ideal: \u226520%</span>
              </div>
            </div>
          </div>

          <!-- Budget Consumed Progress Bar -->
          <div class="pt-2 border-t border-white/10 flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs text-slate-300">
              <span>Presupuesto Consumido</span>
              <span class="font-bold text-white tabular-nums">${r}% del salario</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500 ${r>100?"bg-rose-500":r>80?"bg-amber-400":"bg-[#6cf8bb]"}"
                style="width: ${r}%"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports are available only from Inicio when viewing a closed month. -->
      <section class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/60">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">
              ${l("fileSpreadsheet","w-5 h-5")}
            </div>
            <div class="min-w-0">
              <h3 class="font-bold text-sm text-[#0b1c30]">Reportes</h3>
              <p class="text-xs text-slate-500 truncate">Resumen de ${t}</p>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-[#0058bc]">Mes anterior</span>
        </div>
        <div class="mt-3">
          <button id="btn-past-print-pdf" type="button" aria-label="Descargar reporte mensual en PDF" class="no-print w-full h-10 rounded-2xl bg-[#eef3ff] text-[#0058bc] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#dce8ff] transition-colors">
            ${l("printer","w-3.5 h-3.5")}
            <span>Descargar PDF</span>
          </button>
        </div>
      </section>

      <!-- Expense Categories Breakdown -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <h3 class="font-bold text-sm text-[#0b1c30]">Distribuci\xF3n de Gastos por Categor\xEDa</h3>
        ${$.length===0?'<p class="text-xs text-slate-400">Sin gastos en este per\xEDodo.</p>':`
          <div class="flex flex-col gap-2.5">
            ${$.map(b=>`
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#0058bc]"></span>
                    <span class="font-semibold text-slate-800">${$e(b.category)}</span>
                    <span class="text-[11px] text-slate-400">(${b.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 tabular-nums">${g(b.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${b.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#0058bc]" style="width: ${b.percentage}%"></div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <!-- Income Sources Breakdown -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <h3 class="font-bold text-sm text-[#0b1c30]">Fuentes de Ingreso</h3>
        ${S.length===0?'<p class="text-xs text-slate-400">Sin ingresos en este per\xEDodo.</p>':`
          <div class="flex flex-col gap-2.5">
            ${S.map(b=>`
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#006c49]"></span>
                    <span class="font-semibold text-slate-800">${$e(b.category)}</span>
                    <span class="text-[11px] text-slate-400">(${b.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[#006c49] tabular-nums">+${g(b.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${b.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#006c49]" style="width: ${b.percentage}%"></div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <!-- Transaction Log for the Past Month with Search & Filter -->
      <div class="past-month-report__transactions-card bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-[#0b1c30]">Movimientos Registrados</h3>
          <span class="text-xs text-slate-400">${y.length} de ${s.length}</span>
        </div>

        <!-- Filter Segmented Control & Search -->
        <div class="past-month-report__filters flex flex-col sm:flex-row gap-2 no-print">
          <div class="bg-slate-100 p-1 rounded-full flex items-center shrink-0">
            <button id="filter-pm-all" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${n.pastMonthFilterType==="all"?"bg-white text-slate-800 shadow-sm":"text-slate-500"}">Todos</button>
            <button id="filter-pm-gasto" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${n.pastMonthFilterType==="gasto"?"bg-white text-rose-600 shadow-sm":"text-slate-500"}">Gastos</button>
            <button id="filter-pm-ingreso" class="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${n.pastMonthFilterType==="ingreso"?"bg-white text-[#006c49] shadow-sm":"text-slate-500"}">Ingresos</button>
          </div>

          <div class="relative flex-1">
            <input
              id="search-pm-input"
              type="text"
              placeholder="Buscar en este mes..."
              value="${n.pastMonthSearchQuery}"
              class="w-full px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]"
            />
          </div>
        </div>

        <!-- List -->
        <div class="past-month-report__transaction-list divide-y divide-slate-100 max-h-80 overflow-y-auto no-scrollbar">
          ${y.length===0?'<p class="text-xs text-slate-400 py-4 text-center">No hay movimientos que coincidan con la b\xFAsqueda.</p>':y.map(b=>`
                <div data-tx-id="${$e(b.id)}" class="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      ${st(b,"w-4 h-4")}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-slate-800 truncate">${$e(b.description||"Sin descripci\xF3n")}</span>
                      <span class="text-[10px] text-slate-400">${va(b.date)} \u2022 ${$e(b.category||"Sin categor\xEDa")}</span>
                    </div>
                  </div>
                  <span class="font-bold tabular-nums ${b.type==="ingreso"?"text-[#006c49]":"text-slate-800"}">
                    ${b.type==="ingreso"?"+":"-"}${g(b.amount)} COP
                  </span>
                </div>
              `).join("")}
        </div>
      </div>
    </div>
  `,document.getElementById("btn-back-current-month").onclick=()=>{n.selectedMonth=H(),Ne()},document.getElementById("btn-past-print-pdf").onclick=()=>{let b=document.title,M=!1,h=()=>{M||(M=!0,document.title=b)};document.title=`MiPlata - Reporte ${t}`,window.addEventListener("afterprint",h,{once:!0}),window.print(),window.setTimeout(h,15e3)},document.getElementById("filter-pm-all").onclick=()=>{n.pastMonthFilterType="all",ne(e)},document.getElementById("filter-pm-gasto").onclick=()=>{n.pastMonthFilterType="gasto",ne(e)},document.getElementById("filter-pm-ingreso").onclick=()=>{n.pastMonthFilterType="ingreso",ne(e)};let C=document.getElementById("search-pm-input");C&&(C.oninput=b=>{n.pastMonthSearchQuery=b.target.value,ne(e)}),u.tabInicio.querySelectorAll("[data-tx-id]").forEach(b=>{b.onclick=()=>{let M=n.transactions.find(h=>h.id===b.dataset.txId);M&&_e(M)}})}function Ee(){let e=Re(n.selectedMonth),t=e.filter(c=>c.type==="gasto"),a=e.filter(c=>c.type==="ingreso"),s=t.reduce((c,x)=>c+x.amount,0),o=a.reduce((c,x)=>c+x.amount,0),i=be(),f=sa(n.selectedMonth),m=t.filter(c=>!c.fixedObligationId&&String(c.accountMethod||"").trim().toLowerCase()!=="fijo mensual"&&!c.isGoalContribution&&Pe.includes(c.category)),v={};m.forEach(c=>{v[c.category]=(v[c.category]||0)+c.amount});let d="",r=0;Object.entries(v).forEach(([c,x])=>{x>r&&(r=x,d=c)});let p=m.reduce((c,x)=>c+x.amount,0),$=p>0?Math.round(r/p*100):0,w=f.filter(c=>c.limit>0&&(v[c.category]||0)>c.limit),S=n.filterRecordsType==="all"?e:e.filter(c=>c.type===n.filterRecordsType),y=n.filterExpensesCategory==="Todos"?S:S.filter(c=>c.category===n.filterExpensesCategory),C=K(),b=new Date(Date.now()-864e5).toISOString().split("T")[0],M={};y.forEach(c=>{let x=c.date;c.date===C?x="Hoy":c.date===b&&(x="Ayer"),M[x]||(M[x]=[]),M[x].push(c)});let h=["Alimentaci\xF3n","Transporte","Compras","Servicios","Salud","Entretenimiento","Educaci\xF3n","Viajes","Mascotas","Donaciones","Ahorro / Metas","Otros"],A=["N\xF3mina","Honorarios","Negocio","Inversi\xF3n","Otros"],P=["Todos",...n.filterRecordsType==="gasto"?h:n.filterRecordsType==="ingreso"?A:[...new Set([...h,...A])]];u.tabGastos.innerHTML=`
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Header Metric Card -->
      <div class="flex flex-col w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 gap-3">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700">
            ${l("calendar","w-3.5 h-3.5 text-[#0058bc]")}
             <span>Registros de ${se(n.selectedMonth)}</span>
          </div>
          ${i.monthlyBudgetLimit>0?`
            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${i.monthlyBudgetPercent<=80?"bg-emerald-50 text-[#006c49]":i.monthlyBudgetPercent<=100?"bg-amber-50 text-amber-800":"bg-rose-50 text-rose-700"}">
              <span class="w-1.5 h-1.5 rounded-full ${i.monthlyBudgetPercent<=80?"bg-[#006c49]":i.monthlyBudgetPercent<=100?"bg-amber-500":"bg-rose-500"}"></span>
              <span>${i.monthlyBudgetPercent<=100?`${i.monthlyBudgetPercent}% presupuesto`:`Excedido (+${i.monthlyBudgetPercent-100}%)`}</span>
            </div>
          `:`
            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <span>${e.length} registros</span>
            </div>
          `}
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs text-slate-500 font-medium">Resumen del mes</span>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-rose-50 px-3 py-2.5">
              <span class="block text-[11px] font-semibold text-rose-600">Egresos</span>
              <span class="block text-lg font-bold text-[#0b1c30] tabular-nums">-${g(s,!0)}</span>
            </div>
            <div class="rounded-2xl bg-emerald-50 px-3 py-2.5">
              <span class="block text-[11px] font-semibold text-[#006c49]">Ingresos</span>
              <span class="block text-lg font-bold text-[#006c49] tabular-nums">+${g(o,!0)}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 mt-1 text-slate-500 text-xs">
            ${d?`<span>Mayor gasto: <strong class="font-semibold text-slate-800">${d}</strong> (${g(r,!0)} \u2022 ${$}%)</span>`:"<span>A\xFAn no hay gastos registrados</span>"}
          </div>
        </div>

      </div>

      <!-- Exceeded Category Budgets Alert Box -->
      ${w.length>0?`
        <div class="rounded-2xl p-3.5 bg-rose-50 border border-rose-200 flex items-center gap-2.5 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            ${l("alertTriangle","w-4 h-4")}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-rose-700">
              L\xEDmite excedido en ${w.length} ${w.length===1?"categor\xEDa":"categor\xEDas"}
            </p>
            <p class="text-xs text-rose-800 truncate">
              ${w.map(c=>`${c.category} (${g(v[c.category]||0)})`).join(", ")}
            </p>
          </div>
        </div>
      `:""}

      <!-- Category Budgets (Traffic Light Progress Meters) -->
      <div class="flex flex-col w-full gap-2.5">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="font-semibold text-sm text-[#0b1c30]">Presupuestos por Categor\xEDa</h2>
             <p class="text-[11px] text-slate-500">${i.budgetAdjustment.isAdjusted?"L\xEDmites ajustados al ingreso del mes":"L\xEDmites activos en seguimiento"}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          ${f.map(c=>{let x=v[c.category]||0,I=c.limit>0?Math.round(x/c.limit*100):0,N=I>=75&&I<=100,V=I>100;return`
              <div class="flex flex-col bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/60 gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                      ${Je(c.category,"w-4 h-4")}
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1">
                        <span class="text-xs font-semibold text-[#0b1c30]">${c.category}</span>
                        ${V?`<span class="text-rose-500">${l("alertTriangle","w-3.5 h-3.5")}</span>`:""}
                      </div>
                      <span class="text-[11px] text-slate-500 tabular-nums">
                        ${g(x)} de ${g(c.limit)} COP
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${V?"bg-rose-100 text-rose-700":N?"bg-amber-100 text-amber-800":"bg-emerald-100 text-[#006c49]"}">
                      ${I}%
                    </span>
                    <button
                      type="button"
                      data-edit-category-budget="${c.category}"
                      class="category-budget-edit-btn w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-[#dce8ff] hover:text-[#0058bc] flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Modificar l\xEDmite de ${c.category}"
                      title="Modificar l\xEDmite"
                    >
                      ${l("sliders","w-3.5 h-3.5")}
                    </button>
                  </div>
                </div>

                <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 ${V?"bg-rose-500":N?"bg-amber-500":"bg-[#006c49]"}"
                    style="width: ${Math.min(100,I)}%"
                  ></div>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>

      <!-- Record filters -->
      <div class="flex flex-col w-full gap-2 pt-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
          Filtrar registros
        </span>
        <div class="flex overflow-x-auto no-scrollbar gap-1.5 py-1">
          ${[{key:"all",label:"Todos",count:e.length},{key:"gasto",label:"Gastos",count:t.length},{key:"ingreso",label:"Ingresos",count:a.length}].map(c=>`
              <button
                data-type="${c.key}"
                class="record-type-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${n.filterRecordsType===c.key?"bg-[#0058bc] text-white shadow-sm":"bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"}"
              >
                ${c.label} (${c.count})
              </button>
            `).join("")}
        </div>
        <span class="text-[11px] text-slate-500 px-1">Por categor\xEDa</span>
        <div class="flex overflow-x-auto no-scrollbar gap-1.5 py-1">
          ${P.map(c=>{let x=n.filterExpensesCategory===c;return`
              <button
                data-cat="${c}"
                class="expense-cat-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${x?"bg-[#0058bc] text-white shadow-sm":"bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"}"
              >
                ${c}
              </button>
            `}).join("")}
        </div>
      </div>

      <!-- Records Grouped List -->
      <div class="space-y-4">
        ${y.length===0?`
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
              ${l("receiptText","w-6 h-6")}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Sin registros encontrados</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">No hay movimientos para los filtros seleccionados.</p>
            </div>
          </div>
        `:Object.entries(M).map(([c,x])=>{let I=x.filter(O=>O.type==="gasto").reduce((O,F)=>O+F.amount,0),N=x.filter(O=>O.type==="ingreso").reduce((O,F)=>O+F.amount,0),V=[I>0?`-${g(I,!0)}`:"",N>0?`+${g(N,!0)}`:""].filter(Boolean).join(" \u2022 ");return`
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
                    <span>${c}</span>
                    <span class="tabular-nums font-bold text-slate-700">${V}</span>
                  </div>

                  <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
                    ${x.map(O=>`
                          <div data-tx-id="${O.isGoalContribution?"":O.id}" data-goal-contribution="${O.isGoalContribution?"true":"false"}" class="record-row-item flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors ${O.isGoalContribution?"cursor-default":"cursor-pointer"}">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-2xl ${O.type==="ingreso"?"bg-emerald-50 text-[#006c49]":"bg-slate-100 text-slate-600"} flex items-center justify-center shrink-0">
                            ${st(O,"w-5 h-5")}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <p class="text-xs font-semibold text-[#0b1c30] truncate">${O.description}</p>
                            <p class="text-[11px] text-slate-500 truncate">${O.date} \u2022 ${O.category}</p>
                          </div>
                        </div>
                        <div class="w-28 text-right shrink-0">
                          <span class="block text-xs sm:text-sm font-bold whitespace-nowrap ${O.type==="ingreso"?"text-[#006c49]":"text-[#0b1c30]"} tabular-nums">
                            ${O.type==="ingreso"?"+":"-"}${g(O.amount)}
                          </span>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `}).join("")}
      </div>
    </div>
  `,u.tabGastos.querySelectorAll(".record-type-chip").forEach(c=>{c.onclick=()=>{n.filterRecordsType=c.dataset.type,n.filterExpensesCategory="Todos",Ee()}}),u.tabGastos.querySelectorAll(".expense-cat-chip").forEach(c=>{c.onclick=()=>{n.filterExpensesCategory=c.dataset.cat,Ee()}}),u.tabGastos.querySelectorAll(".category-budget-edit-btn").forEach(c=>{c.onclick=()=>{let x=c.dataset.editCategoryBudget,I=n.categoryBudgets.find(N=>N.category===x);I&&Ba(I)}}),u.tabGastos.querySelectorAll(".record-row-item").forEach(c=>{c.onclick=()=>{if(c.dataset.goalContribution==="true")return;let x=n.transactions.find(I=>I.id===c.dataset.txId);x&&_e(x)}})}function Ze(){let e=be(),t=wt(n.fixedObligations),a=t.length>0?t[0]:null,s=e.fixedTotal>0?Math.round(e.fixedPaid/e.fixedTotal*100):0,o=e.effectiveMonthlyIncome||e.monthlyBudgetLimit||e.totalIncome,i=o>0?Math.round(e.fixedTotal/o*100):0,f=n.fixedObligations.filter(d=>n.filterObligationsStatus==="pending"?d.status==="pending":n.filterObligationsStatus==="paid"?d.status==="paid":!0);u.tabObligaciones.innerHTML=`
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-3.5 animate-in fade-in duration-200">
      <!-- Header -->
      <div style="display:none" class="flex items-center justify-between pt-1">
        <div>
          <span class="text-[11px] text-[#0058bc] uppercase tracking-wider font-semibold">Compromisos Recurrentes</span>
          <h1 class="text-2xl font-bold tracking-tight text-[#0b1c30]">Gastos Fijos</h1>
        </div>

        <button
          id="btn-add-obligation"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d8e2ff] text-[#001a41] hover:bg-[#c1d3fe] transition-transform active:scale-95 text-xs font-semibold shadow-sm cursor-pointer"
        >
          ${l("plusCircle","w-4 h-4 text-[#0058bc]")}
          <span>Nuevo</span>
        </button>
      </div>

      <!-- Hero Card: Cupertino Glassmorphism Metrics -->
      <div style="display:none" class="relative overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col gap-3">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs text-slate-500 font-medium">Total Obligaciones Mes</p>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-3xl sm:text-4xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
                ${g(e.fixedTotal)}
              </span>
              <span class="text-xs text-slate-500 uppercase font-semibold">COP</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#0058bc]">
            ${l("calendar","w-5 h-5")}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="flex flex-col gap-1 mt-0.5">
          <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              class="bg-[#006c49] h-full rounded-full transition-all duration-500 ease-out"
              style="width: ${s}%"
            ></div>
          </div>
          <div class="flex justify-between items-center text-slate-500 text-[11px] font-medium">
            <span>${s}% liquidado</span>
            <span>${n.fixedObligations.length} compromisos</span>
          </div>
        </div>

        <!-- Dual Metric Pills -->
        <div class="grid grid-cols-2 gap-2 pt-0.5">
          <div class="flex flex-col p-2.5 rounded-2xl bg-[#6cf8bb]/20 border border-[#6cf8bb]/30">
            <div class="flex items-center gap-1.5 text-[#006c49]">
              ${l("checkCircle2","w-3.5 h-3.5")}
              <span class="text-[11px] font-semibold">Pagado este mes</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${g(e.fixedPaid)}
            </span>
            <span class="text-[10px] text-[#00714d] font-medium mt-0.5">
              ${e.fixedPaidCount} obligaciones
            </span>
          </div>

          <div class="flex flex-col p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
            <div class="flex items-center gap-1.5 text-rose-600">
              ${l("clock","w-3.5 h-3.5")}
              <span class="text-[11px] font-semibold">Por pagar</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${g(e.fixedCommitted)}
            </span>
            <span class="text-[10px] text-rose-600 font-medium mt-0.5">
              ${e.fixedPendingCount} pendientes
            </span>
          </div>
        </div>

        <!-- Urgent Notification Banner -->
        ${a?`
          <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border ${a.status==="overdue"?"bg-rose-50 border-rose-200 text-rose-900":a.status==="today"?"bg-amber-50 border-amber-200 text-amber-950":"bg-blue-50 border-blue-200 text-[#0b1c30]"}">
            <div class="w-2.5 h-2.5 rounded-full shrink-0 ${a.status==="overdue"?"bg-rose-600 animate-ping":a.status==="today"?"bg-amber-500 animate-ping":"bg-[#0058bc]"}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-bold truncate ${a.status==="overdue"?"text-rose-700":a.status==="today"?"text-amber-800":"text-[#0058bc]"}">
                ${a.label}
              </p>
              <p class="text-xs text-slate-700 font-medium truncate">
                ${a.obligation.name} \u2022 ${g(a.obligation.amount,!0)}
              </p>
            </div>
            <button data-pay-id="${a.obligation.id}" class="obligation-toggle-btn px-2.5 py-1 rounded-full bg-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer">
              Pagar
            </button>
          </div>
        `:""}

        <!-- 50/30/20 Rule Financial Tip -->
        ${e.fixedTotal>0&&o>0?`
          <div class="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600 text-xs">
            ${l("info","w-4 h-4 text-[#0058bc] shrink-0")}
            <p class="leading-tight">
              Tus gastos fijos (${g(e.fixedTotal)}) ocupan el <strong>${i}%</strong> de tus ingresos ${i>50?"(recomendado: m\xE1x. 50%)":"(dentro del rango ideal 50/30/20)"}.
            </p>
          </div>
        `:""}
      </div>

      <!-- Segmented Control Tabs -->
      <div class="w-full bg-slate-200/80 p-1 rounded-full flex items-center shadow-inner">
        <button
          data-status="all"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${n.filterObligationsStatus==="all"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600 hover:text-slate-900"}"
        >
          Todos (${n.fixedObligations.length})
        </button>
        <button
          data-status="pending"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${n.filterObligationsStatus==="pending"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600 hover:text-slate-900"}"
        >
          Pendientes (${e.fixedPendingCount})
        </button>
        <button
          data-status="paid"
          class="ob-status-tab flex-1 py-1.5 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${n.filterObligationsStatus==="paid"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600 hover:text-slate-900"}"
        >
          Pagados (${e.fixedPaidCount})
        </button>
      </div>

      <!-- Synchronisation Hint -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eff4ff] text-slate-600 border border-slate-200/50">
        ${l("info","w-4 h-4 text-[#0058bc] shrink-0")}
        <p class="text-[11px] leading-tight">
          Los pagos marcados se sincronizan en los gastos del mes sin duplicar valores.
        </p>
      </div>

      <!-- Obligations List -->
      <div class="flex flex-col gap-2.5">
        ${f.length===0?`
          <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0058bc]">
              ${l("calendar","w-6 h-6")}
            </div>
            <div>
              <h3 class="font-semibold text-sm text-[#0b1c30]">
                ${n.filterObligationsStatus==="all"?"Sin gastos fijos registrados":n.filterObligationsStatus==="pending"?"No tienes pagos pendientes":"A\xFAn no has marcado pagos como realizados"}
              </h3>
              <p class="text-xs text-slate-500 max-w-xs mt-1">
                Registra tus compromisos que se repiten cada mes (arriendo, internet, celular, servicios) para controlarlos con tranquilidad.
              </p>
            </div>
          </div>
        `:`
          <div class="flex flex-col gap-3">
            ${f.map(d=>{let r=d.status==="paid",p=r?null:Ye(d),$=r?`<span class="inline-flex items-center gap-1 rounded-full bg-[#c7f7e3] px-3 py-1 text-[11px] font-semibold text-[#00714d] whitespace-nowrap">${l("check","w-3 h-3")}Pagado</span>`:`<span class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${p?.status==="overdue"?"border-[#ffc3cf] bg-[#ffe1e7] text-[#db2548]":p?.status==="today"?"border-[#ffd48a] bg-[#fff0d2] text-[#9a5b00]":"border-[#dce8ff] bg-[#eef4ff] text-[#0058bc]"}">${p?.label||`Vence D\xEDa ${d.dueDay}`}</span>`;return`
                <div class="rounded-[22px] bg-white border border-slate-200/70 shadow-sm overflow-hidden">
                  <div class="p-4 pb-3 flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                        ${Zt(d.name,d.category)}
                      </div>
                      <div class="flex flex-col min-w-0 pt-0.5">
                        <p class="text-base font-semibold text-[#0b1c30] truncate">${d.name}</p>
                        <p class="text-xs text-[#607797] mt-1">Vence D\xEDa ${d.dueDay} del mes</p>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 shrink-0">
                      <span class="text-base font-bold tabular-nums ${r?"text-slate-700":"text-[#0b1c30]"}">${g(d.amount)}</span>
                      ${$}
                    </div>
                  </div>
                  <div class="mx-4 border-t border-slate-100"></div>
                  <div class="px-4 py-3 flex items-center justify-between gap-2">
                    <button data-edit-ob="${d.id}" class="obligation-edit-trigger inline-flex items-center gap-1.5 text-sm text-[#607797] cursor-pointer hover:text-[#0058bc]">
                      ${l("sliders","w-4 h-4")}<span>${r?"Detalles":"Editar d\xEDa o valor"}</span>
                    </button>
                    <button data-pay-id="${d.id}" class="obligation-toggle-btn inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95 ${r?"bg-[#e7eefb] text-[#50627b] hover:bg-[#dce8ff]":"bg-[#0058bc] text-white shadow-sm hover:bg-[#004aa0]"}" title="${r?"Marcar como pendiente":"Marcar como pagada"}">
                      ${l(r?"rotateCcw":"creditCard","w-4 h-4")}<span>${r?"Desmarcar":"Pagar"}</span>
                    </button>
                  </div>
                </div>
              `}).join("")}
          </div>
        `}
      </div>
      <button id="btn-add-obligation-bottom" class="w-full rounded-full bg-[#eff4f8] text-[#0058bc] py-3.5 text-sm font-semibold cursor-pointer hover:bg-[#e4edf7] transition-colors">${l("plusCircle","w-4 h-4 inline mr-1")}Agregar Gasto Fijo</button>
    </div>
  `;let m=document.getElementById("btn-add-obligation"),v=document.getElementById("btn-add-obligation-bottom");m&&(m.onclick=()=>We(null)),v&&(v.onclick=()=>We(null)),u.tabObligaciones.querySelectorAll(".ob-status-tab").forEach(d=>{d.onclick=()=>{n.filterObligationsStatus=d.dataset.status,Ze()}}),u.tabObligaciones.querySelectorAll(".obligation-toggle-btn").forEach(d=>{d.onclick=async r=>{r.stopPropagation();let p=n.fixedObligations.find(S=>S.id===d.dataset.payId),$=p?.status!=="paid",w=be().availableCash;if($&&Number(p?.amount)>w){E(`Saldo insuficiente. Disponible: ${g(w,!0)}`,"error");return}try{let S=await L.togglePayFixedObligation(d.dataset.payId);pa(d.dataset.payId,S.result),Ze(),E(S.message)}catch(S){E(S.message||"No se pudo actualizar el gasto fijo","error")}}}),u.tabObligaciones.querySelectorAll(".obligation-edit-trigger").forEach(d=>{d.onclick=r=>{r.stopPropagation();let p=n.fixedObligations.find($=>$.id===d.dataset.editOb);p&&We(p)}})}function ya(e){return{security:"shield",laptop:"laptop",plane:"plane",car:"car",home:"home",star:"star"}[e?.icon]||"shield"}function Ke(e,t="w-full h-full object-cover",a="w-5 h-5"){let s=String(e?.imageUrl||"").trim(),o=l(ya(e),a);return s?`<img src="${s.replace(/"/g,"&quot;")}" alt="${String(e?.name||"Imagen de meta").replace(/"/g,"&quot;")}" loading="lazy" decoding="async" class="${t}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');" /><span class="hidden w-full h-full items-center justify-center">${o}</span>`:`<span class="w-full h-full flex items-center justify-center">${o}</span>`}function wa(e){document.getElementById("goal-completion-celebration")?.remove();let a=document.createElement("div");a.id="goal-completion-celebration",a.className="modal-backdrop",a.innerHTML=`
    <div class="modal-content max-w-sm text-center">
      <div class="w-16 h-16 mx-auto rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center animate-pulse">
        ${l("checkCircle2","w-9 h-9")}
      </div>
      <p class="text-[11px] uppercase tracking-wider font-bold text-[#006c49] mt-5">Meta cumplida</p>
      <h3 class="text-xl font-extrabold text-[#0b1c30] mt-1">\xA1Lo lograste!</h3>
      <p class="text-sm text-slate-600 mt-2">Completaste \u201C${String(e||"tu meta").replace(/"/g,"&quot;")}\u201D.</p>
      <button type="button" class="w-full h-11 mt-5 rounded-full bg-[#0058bc] text-white font-semibold cursor-pointer">Continuar</button>
    </div>
  `,document.body.appendChild(a);let s=()=>a.remove();a.querySelector("button")?.addEventListener("click",s,{once:!0}),window.setTimeout(s,3200)}function $a(){let e=be(),t=e.totalSavingsTarget>0?Math.min(100,Math.round(e.totalSavings/e.totalSavingsTarget*100)):0,a=n.savingsGoals.filter(r=>!we(r)),s=n.savingsGoals.filter(r=>we(r)).map(r=>({...r,completedDate:kt(r,n.goalContributions)})),o=a[0],i=o?Math.max(0,o.targetAmount-o.currentAmount):0,f=Math.max(0,e.availableCash),m=o?Math.min(i,f,f>0?Math.max(1e3,Math.round(f*.15/1e4)*1e4):0):0,v=o?`Impulso para "${o.name}"`:s.length?"Sigue construyendo tus logros":"Crea tu primera meta",d=o?m>0?`Tienes ${g(f)} disponibles. Puedes aportar ${g(m,!0)} sin superar tu saldo disponible.`:"No tienes dinero disponible para aportar a una meta en este momento.":s.length?`Ya cumpliste ${s.length===1?"una meta":`${s.length} metas`}. Crea una nueva para continuar avanzando sin descuidar tu saldo disponible.`:"Crea una meta para empezar a reservar dinero de forma autom\xE1tica.";u.tabMetas.innerHTML=`
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between"><div><span class="text-[11px] font-semibold uppercase tracking-wider text-[#006c49]">Tus sue\xF1os en marcha</span><h1 class="text-[25px] leading-tight font-extrabold">Mis Metas de Ahorro</h1></div><button id="btn-add-goal" class="w-10 h-10 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center cursor-pointer">${l("flag","w-5 h-5")}</button></div>
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between"><span class="text-xs font-medium flex items-center gap-2">${l("flag","w-4 h-4 text-[#0058bc]")} Total Acumulado Protegido</span><span class="rounded-full bg-[#6cf8bb] px-2.5 py-1 text-[10px] font-semibold text-[#006c49]">${t}% global</span></div>
        <p class="text-[34px] leading-none font-extrabold mt-4 tabular-nums">${g(e.totalSavings)} <span class="text-xs font-semibold text-slate-500">COP</span></p>
        <p class="text-xs mt-2">Objetivo: ${g(e.totalSavingsTarget)} <span class="font-semibold text-[#006c49]">Faltan ${g(Math.max(0,e.totalSavingsTarget-e.totalSavings),!0)}</span></p>
        <div class="mt-4 h-2.5 rounded-full bg-[#dce8ff] overflow-hidden"><div class="h-full rounded-full bg-[#006c49]" style="width:${t}%"></div></div>
        <div class="mt-4 rounded-3xl bg-[#eef3ff] p-3 text-xs text-slate-600 flex gap-2">${l("shield","w-4 h-4 text-[#0058bc] shrink-0")}<span>Dinero reservado de forma aut\xF3noma. No computable como gasto para proteger tu balance diario.</span></div>
      </div>
      <button id="btn-add-goal-large" class="w-full h-12 rounded-full bg-[#0058bc] text-white font-semibold text-sm shadow-md cursor-pointer">${l("plusCircle","w-4 h-4 inline mr-1")} Crear Nueva Meta</button>
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">Metas Activas</h2><span class="text-sm font-semibold text-[#0058bc]">${a.length} en curso</span></div>
        <div class="flex flex-col gap-3">
          ${a.length?a.map(r=>{let p=r.targetAmount>0?Math.min(100,Math.round(r.currentAmount/r.targetAmount*100)):0,$=Math.max(0,r.targetAmount-r.currentAmount);return`<article class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="${r.imageUrl?"w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden":"w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"}" style="${r.imageUrl?"":`background:${r.color}20;color:${r.color}`}" >${Ke(r,"w-full h-full object-contain","w-7 h-7")}</div>
                  <div class="min-w-0"><h3 class="font-semibold text-base truncate">${r.name}</h3><p class="text-xs text-slate-500 mt-0.5">${r.deadline?`L\xEDmite: ${It(r.deadline)}`:"Sin fecha l\xEDmite"}</p></div>
                </div>
                <span class="shrink-0 rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#0058bc]">${p}%</span>
              </div>
              <div class="mt-3 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc]" style="width:${p}%"></div></div>
              <div class="flex items-center justify-between gap-3 mt-2 text-sm"><span><strong>${g(r.currentAmount)}</strong> <span class="text-slate-500">de ${g(r.targetAmount)} COP</span></span><span class="font-semibold text-[#0058bc] text-right">Faltan ${g($)}</span></div>
              <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100"><button data-aporte-id="${r.id}" class="goal-aporte-btn flex-1 h-12 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer">${l("plus","w-5 h-5")} Aportar dinero</button><button data-edit-goal="${r.id}" class="goal-edit-btn w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" title="Ajustar meta">${l("sliders","w-5 h-5")}</button></div>
            </article>`}).join(""):'<div class="rounded-3xl bg-white p-6 text-center border border-slate-200/80"><p class="text-sm font-semibold">No tienes metas activas</p><p class="text-xs text-slate-500 mt-1">Crea una meta para comenzar a ahorrar.</p></div>'}
        </div>
      </section>
      ${s.length?`
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">Metas cumplidas</h2><span class="text-sm font-semibold text-[#006c49]">${s.length} lograda${s.length===1?"":"s"}</span></div>
        <div class="flex flex-col gap-3">
          ${s.map(r=>`
            <article class="rounded-3xl bg-[#f2fff9] p-4 shadow-sm border border-[#b9efd8]">
              <div class="flex items-center gap-3 min-w-0">
                <div class="${r.imageUrl?"w-14 h-14 flex items-center justify-center shrink-0 overflow-hidden":"w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"}" style="${r.imageUrl?"":`background:${r.color}20;color:${r.color}`}" >${Ke(r,"w-full h-full object-contain","w-6 h-6")}</div>
                <div class="min-w-0 flex-1"><h3 class="font-semibold text-base truncate">${r.name}</h3><p class="text-xs text-[#006c49] mt-0.5">${r.completedDate?`Cumplida el ${It(r.completedDate)}`:"Objetivo alcanzado"}</p></div>
                <span class="shrink-0 rounded-full bg-[#c7f7e3] px-3 py-1 text-xs font-bold text-[#006c49]">100%</span>
              </div>
              <div class="flex items-center justify-between gap-3 mt-3 text-sm"><span><strong>${g(r.currentAmount)}</strong> <span class="text-slate-500">de ${g(r.targetAmount)} COP</span></span><span class="font-semibold text-[#006c49]">${l("check","w-4 h-4 inline mr-1")}Completada</span></div>
            </article>
          `).join("")}
        </div>
      </section>`:""}
      ${f>0?`      <div class="rounded-3xl bg-[#eef3ff] border border-[#cfe0ff] p-4 flex gap-3"><div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${l("lightbulb","w-7 h-7")}</div><div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><p class="text-sm font-bold text-[#0058bc]">Consejo Inteligente</p><span class="text-[11px] text-slate-500">\u2022 Basado en tus datos</span></div><p class="text-sm font-semibold text-[#0b1c30] mt-1">${v}</p><p class="text-sm text-slate-600 leading-relaxed mt-1">${d}</p></div></div>`:""}
      <section class="flex flex-col gap-2"><div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">\xDAltimos Aportes</h2><span class="text-sm font-semibold text-[#0058bc]">Registro protegido</span></div><div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-200/80 divide-y divide-slate-100">${n.goalContributions.length?n.goalContributions.slice(0,3).map(r=>`<div class="flex items-center justify-between gap-3 py-3"><div class="flex items-center gap-3 min-w-0"><div class="w-11 h-11 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center shrink-0">${l("wallet","w-5 h-5")}</div><div class="min-w-0"><p class="text-sm font-semibold truncate">${r.goalName}</p><p class="text-xs text-slate-500 mt-0.5">${r.date} \u2022 ${r.type}</p></div></div><div class="text-right shrink-0"><span class="text-base font-bold text-[#006c49]">+${g(r.amount)}</span><small class="block text-[10px] text-slate-500">COP</small></div></div>`).join(""):'<p class="py-5 text-center text-sm text-slate-500">A\xFAn no hay aportes registrados.</p>'}</div></section>
    </div>
  `,document.getElementById("btn-add-goal")?.addEventListener("click",()=>De(null)),document.getElementById("btn-add-goal-large")?.addEventListener("click",()=>De(null)),u.tabMetas.querySelectorAll(".goal-aporte-btn").forEach(r=>{r.onclick=()=>ja(r.dataset.aporteId)}),u.tabMetas.querySelectorAll(".goal-edit-btn").forEach(r=>{r.onclick=()=>{let p=n.savingsGoals.find($=>$.id===r.dataset.editGoal);p&&De(p)}})}function Me(){let e=n.currentUser;if(!e)return;let t=Ge(H(),e),a=e.monthlyBudgetLimit||e.monthlySalary||58e5,s=Math.round(a*((e.budgetRule?.needs||50)/100)),o=Math.round(a*((e.budgetRule?.wants||30)/100)),i=Math.round(a*((e.budgetRule?.savings||20)/100)),f=Math.round(a*.8);u.tabPerfil.innerHTML=`
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- User Card -->
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative group">
              ${W(e.name,e.avatarUrl,"lg",!0)}
            </div>
            <div class="flex flex-col">
              <h2 class="text-lg font-bold text-[#0b1c30] leading-tight">${e.name}</h2>
              <p class="text-xs text-slate-500">${e.email}</p>
              <div class="mt-1">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006c49] text-[10px] font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#006c49]"></span>
                  ${e.plan}
                </span>
              </div>
            </div>
          </div>

          <button id="btn-edit-profile" class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#0058bc] active:scale-90 transition-transform cursor-pointer">
            ${l("edit3","w-4 h-4")}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${l("shieldCheck","w-4 h-4 text-[#0058bc] shrink-0")}
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-medium">Miembro activo</span>
              <span class="text-xs font-semibold text-slate-700">${e.memberSince||"Activo"}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${l("lock","w-4 h-4 text-[#006c49] shrink-0")}
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-medium">Privacidad</span>
              <span class="text-xs font-semibold text-slate-700">100% Local</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Salary & 50/30/20 Rule Card -->
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[#0058bc]">
              ${l("pieChart","w-4 h-4")}
            </div>
             <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Presupuesto Mensual</span>
          </div>

          <button id="btn-edit-salary" class="text-xs font-semibold text-[#0058bc] hover:underline flex items-center gap-0.5 cursor-pointer">
             Modificar L\xEDmite ${l("chevronRight","w-3.5 h-3.5")}
          </button>
        </div>

        <!-- Inner Budget Box -->
        <div class="rounded-2xl bg-[#eff4ff] p-4 flex flex-col gap-2.5 border border-blue-100">
          <div>
             <span class="text-[11px] text-slate-500 font-medium">L\xEDmite Mensual Asignado</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-2xl sm:text-3xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
                ${g(a)}
              </span>
              <span class="text-xs font-bold text-slate-500">COP</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5">
               ${t.isAdjusted?"Basado en el l\xEDmite mensual asignado bajo la regla 50/30/20:":"Distribuido bajo la regla inteligente MiPlata 50/30/20:"}
            </p>
          </div>

          <!-- 50/30/20 Progress Bar Strip -->
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-700 pt-1">
            <span>Distribuci\xF3n Estrat\xE9gica</span>
            <span>100% Planificado</span>
          </div>

          <div class="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 gap-0.5">
            <div class="bg-[#0058bc] h-full" style="width: 50%" title="50% Necesidades"></div>
            <div class="bg-[#0070eb] h-full" style="width: 30%" title="30% Estilo de vida"></div>
            <div class="bg-[#006c49] h-full" style="width: 20%" title="20% Ahorro"></div>
          </div>

          <!-- Breakdown Rows -->
          <div class="flex flex-col gap-2 pt-1 text-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#0058bc]"></span>
                <div>
                  <p class="font-semibold text-slate-800">50% Gastos Fijos & Necesidades</p>
                  <p class="text-[10px] text-slate-500">Arriendo, servicios y mercado</p>
                </div>
              </div>
              <span class="font-bold text-slate-800 tabular-nums">${g(s)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#0070eb]"></span>
                <div>
                  <p class="font-semibold text-slate-800">30% Ocasionales & Estilo de Vida</p>
                  <p class="text-[10px] text-slate-500">Salidas, compras y ocio</p>
                </div>
              </div>
              <span class="font-bold text-slate-800 tabular-nums">${g(o)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#006c49]"></span>
                <div>
                  <p class="font-semibold text-slate-800">20% Metas de Ahorro & Futuro</p>
                  <p class="text-[10px] text-slate-500">Fondo de emergencia e inversi\xF3n</p>
                </div>
              </div>
              <span class="font-bold text-[#006c49] tabular-nums">${g(i)}</span>
            </div>
          </div>
        </div>

        <!-- Toggles -->
        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div>
              <p class="text-xs font-semibold text-slate-800">Alerta preventiva al 80%</p>
              <p class="text-[11px] text-slate-500">Notificar al consumir ${g(f)}</p>
            </div>
            <button
              id="toggle-alert-80"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${e.alert80Percent?"bg-[#0058bc]":"bg-slate-300"}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${e.alert80Percent?"translate-x-5":"translate-x-0"}"></div>
            </button>
          </div>

          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div>
              <p class="text-xs font-semibold text-slate-800">Ajuste por ingresos variables</p>
              <p class="text-[11px] text-slate-500">Recalcular l\xEDmites autom\xE1ticamente</p>
            </div>
            <button
              id="toggle-variable-income"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer ${e.autoAdjustVariable?"bg-[#0058bc]":"bg-slate-300"}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${e.autoAdjustVariable?"translate-x-5":"translate-x-0"}"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Preferencias del Sistema -->
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[#0058bc]">
              ${l("sliders","w-4 h-4")}
            </div>
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Preferencias del Sistema</span>
          </div>
        </div>

        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${l("coins","w-4 h-4")}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800">Moneda Principal</p>
                <p class="text-[11px] text-slate-500">Formato est\xE1ndar de visualizaci\xF3n</p>
              </div>
            </div>
            <span class="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-full shrink-0">COP ($)</span>
          </div>

          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0058bc] shrink-0">${l("calendar","w-4 h-4")}</div>
              <div class="min-w-0"><p class="text-xs font-semibold text-slate-800">Reinicio mensual</p><p class="text-[11px] text-slate-500">Corte y balance peri\xF3dico</p></div>
            </div>
            <span class="text-xs font-semibold text-slate-700 text-right shrink-0">D\xEDa ${e.resetDay||1} de cada mes</span>
          </div>

          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${l("sparkles","w-4 h-4")}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800">Categorizaci\xF3n inteligente</p>
                <p class="text-[11px] text-slate-500">Sugerir seg\xFAn conceptos habituales</p>
              </div>
            </div>
            <button
              id="toggle-smart-cat"
              class="w-11 h-6 rounded-full transition-colors duration-200 p-0.5 relative cursor-pointer shrink-0 ${e.smartCategorization?"bg-[#0058bc]":"bg-slate-300"}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${e.smartCategorization?"translate-x-5":"translate-x-0"}"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="flex flex-col gap-2 pt-2">
        <button id="btn-logout" class="w-full h-12 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold active:scale-95 transition-all cursor-pointer">
          ${l("logOut","w-4 h-4")}
          <span>Cerrar sesi\xF3n</span>
        </button>

        ${ae(e)?`
        <div class="w-full rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex items-center gap-2.5 text-slate-500" aria-label="Cuenta demo protegida">
          <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
            ${l("lock","w-3.5 h-3.5")}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700">Cuenta demo protegida</p>
            <p class="text-[11px] text-slate-500">No se puede eliminar ni borrar sus datos compartidos</p>
          </div>
        </div>
        `:`
        <button id="btn-delete-account" class="w-full h-11 rounded-full text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 text-xs font-medium active:scale-95 transition-all cursor-pointer">
          ${l("trash2","w-3.5 h-3.5")}
          <span>Eliminar cuenta y datos locales</span>
        </button>
        `}

      </div>

      <!-- App Branding Footer -->
      <div class="flex flex-col items-center justify-center gap-1.5 py-4 text-center select-none">
        <p class="text-[11px] text-slate-400 font-medium">Control de finanzas personales 100% privado y local</p>
        <div class="flex items-center justify-center gap-1.5 pt-1.5 text-[11px] text-slate-400 font-medium">
          <span>By</span>
          ${Le("h-5 w-auto opacity-80")}
        </div>
      </div>
    </div>
  `,document.getElementById("btn-edit-profile").onclick=Ta,document.getElementById("btn-edit-salary").onclick=La,document.getElementById("toggle-alert-80").onclick=async()=>{let v=await L.updateProfile({alert80Percent:!e.alert80Percent});n.currentUser=v.user,Me(),E("Preferencia actualizada")},document.getElementById("toggle-variable-income").onclick=async()=>{let v=await L.updateProfile({autoAdjustVariable:!e.autoAdjustVariable});n.currentUser=v.user,Me(),E("Preferencia actualizada")},document.getElementById("toggle-smart-cat").onclick=async()=>{let v=await L.updateProfile({smartCategorization:!e.smartCategorization});n.currentUser=v.user,Me(),E("Preferencia actualizada")},document.getElementById("btn-logout").onclick=async()=>{await L.logout(),n.currentUser=null,U(),E("Sesi\xF3n cerrada")};let m=document.getElementById("btn-delete-account");m&&(m.onclick=()=>{at({title:"\xBFEliminar cuenta y datos?",message:"Esta acci\xF3n borrar\xE1 todas tus transacciones, metas y gastos fijos de forma irreversible.",successMessage:"Cuenta eliminada",errorMessage:"No se pudo eliminar la cuenta",onConfirm:async()=>{await L.deleteAccount(),n.currentUser=null,U()}})})}var oe=!0,ue="",Q=null,qe="",pe="",me="";function Ma(){return new URL("/reset-password",window.location.origin).toString()}function ka(){let e=window.location.hash.startsWith("#")?window.location.hash.slice(1):window.location.hash;if(!e)return"";let t=new URLSearchParams(e);return t.get("type")==="recovery"&&t.get("access_token")||""}function Ea(){let e=window.location.hash.startsWith("#")?window.location.hash.slice(1):window.location.hash;if(!e)return"";let t=new URLSearchParams(e),a=t.get("error_code")||"",s=(t.get("error_description")||"").toLowerCase();return!t.get("error")&&!a?"":a==="otp_expired"||s.includes("expired")?"El enlace de recuperaci\xF3n expir\xF3 o ya fue utilizado. Solicita uno nuevo.":"No se pudo validar el enlace de recuperaci\xF3n. Solicita uno nuevo."}function Sa(){let e=ka();if(e)return qe=e,Q="update",!0;let t=Ea();if(t){me=t,Q="request";let a=new URL(window.location.href);return a.hash="",window.history.replaceState({},document.title,`${a.pathname}${a.search}`),!0}let r=window.location.pathname.replace(/\/+$/g,"")||"/";return r==="/reset-password"||r==="/reset-password/index.html"||new URLSearchParams(window.location.search).get("password_reset")==="1"?(Q="request",!0):!1}function Gt(){let e=Q==="update",t=Q==="request",a=e?"Crear nueva contrase\xF1a":"Recuperar contrase\xF1a",s=e?"Escribe una nueva contrase\xF1a para volver a entrar a tu cuenta.":"Te enviaremos un enlace seguro al correo asociado a tu cuenta.";if(u.viewAuth.innerHTML=`
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${Be("h-11 sm:h-12 w-auto object-contain drop-shadow-sm")}
        </div>
        <p class="text-sm font-semibold text-[#0058bc] tracking-wide mt-1">Tu dinero claro, tus metas cerca.</p>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-extrabold text-[#0b1c30]">${a}</h2>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">${s}</p>
        </div>

        ${t?`
          <form id="form-password-reset-request" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electr\xF3nico</label>
              <input id="reset-email" type="email" autocomplete="email" required placeholder="camila.restrepo@email.com" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>
            <button id="reset-request-submit" type="submit" class="w-full py-3 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Enviar enlace de recuperaci\xF3n</button>
          </form>
          ${me?`<div class="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700">${me}</div>`:""}
          ${pe?`<div class="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-[#006c49]">${pe}</div>`:""}
        `:`
          <form id="form-password-reset-update" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Nueva contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="reset-new-password" type="password" autocomplete="new-password" minlength="6" required placeholder="M\xEDnimo 6 caracteres" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-password" type="button" aria-label="Mostrar contrase\xF1a" title="Mostrar contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${l("eye","w-4 h-4")}</button>
              </div>
            </div>
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Confirmar contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="reset-confirm-password" type="password" autocomplete="new-password" minlength="6" required placeholder="Repite la contrase\xF1a" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-confirm-password" type="button" aria-label="Mostrar confirmaci\xF3n de contrase\xF1a" title="Mostrar confirmaci\xF3n de contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${l("eye","w-4 h-4")}</button>
              </div>
            </div>
            <button id="reset-update-submit" type="submit" class="w-full py-3 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Guardar nueva contrase\xF1a</button>
          </form>
        `}

        <button id="back-to-login" type="button" class="text-xs font-semibold text-[#0058bc] hover:underline cursor-pointer">Volver a iniciar sesi\xF3n</button>
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium"><span>By</span>${Le("h-5 w-auto opacity-80")}</div>
    </div>
  `,document.getElementById("back-to-login").onclick=()=>{Q=null,qe="",pe="",me="",oe=!1,fe()},t){let d=document.getElementById("form-password-reset-request");d.onsubmit=async r=>{r.preventDefault();let p=document.getElementById("reset-email"),$=p.value.trim().toLowerCase();if(!p.checkValidity()){E("Ingresa un correo electr\xF3nico v\xE1lido","error"),p.focus();return}try{me="",pe=(await L.requestPasswordReset($,Ma())).message,Gt()}catch(w){E(w.message,"error")}};return}let o=document.getElementById("reset-new-password"),i=document.getElementById("reset-confirm-password"),f=document.getElementById("toggle-reset-password"),m=document.getElementById("toggle-reset-confirm-password"),v=(d,r,p)=>{r.onclick=()=>{let $=d.type==="password";d.type=$?"text":"password";let w=$?"Ocultar":"Mostrar";r.innerHTML=l($?"eyeOff":"eye","w-4 h-4"),r.setAttribute("aria-label",`${w} ${p}`),r.setAttribute("title",`${w} ${p}`)}};v(o,f,"contrase\xF1a"),v(i,m,"confirmaci\xF3n de contrase\xF1a"),document.getElementById("form-password-reset-update").onsubmit=async d=>{d.preventDefault();let r=o.value;if(r.length<6){E("La contrase\xF1a debe tener al menos 6 caracteres","error"),o.focus();return}if(r!==i.value){E("Las contrase\xF1as no coinciden","error"),i.focus();return}try{await L.confirmPasswordReset(qe,r);let p=new URL(window.location.href);p.searchParams.delete("password_reset"),p.pathname==="/reset-password"&&(p.pathname="/"),p.hash="",window.history.replaceState({},document.title,`${p.pathname}${p.search}`),Q=null,qe="",pe="",me="",oe=!1,fe(),E("Contrase\xF1a actualizada. Ya puedes iniciar sesi\xF3n")}catch(p){E(p.message,"error")}}}function fe(){if(Q){Gt();return}u.viewAuth.innerHTML=`
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <!-- Brand Header with Official Logo & Imagotipo -->
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${Be("h-11 sm:h-12 w-auto object-contain drop-shadow-sm")}
        </div>
        <p class="text-sm font-semibold text-[#0058bc] tracking-wide mt-1">
          Tu dinero claro, tus metas cerca.
        </p>
        <p class="text-xs text-slate-500 max-w-xs leading-relaxed">
          Organiza tus finanzas personales, controla tus gastos fijos y cumple tus metas de ahorro sin conectar bancos.
        </p>
      </div>

      <!-- Main Form Card -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <!-- Segmented Control -->
        <div class="w-full bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <button
            id="auth-tab-register"
            type="button"
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${oe?"bg-white text-[#0b1c30] shadow-sm":"text-slate-500 hover:text-slate-800"}"
          >
            Crear Cuenta
          </button>
          <button
            id="auth-tab-login"
            type="button"
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${oe?"text-slate-500 hover:text-slate-800":"bg-white text-[#0b1c30] shadow-sm"}"
          >
            Ya tengo cuenta
          </button>
        </div>

        ${oe?`
          <!-- Registration Form -->
          <form id="form-register" class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-[#eff4ff] border border-blue-100">
              <div class="flex items-center gap-3">
                <div id="auth-avatar-preview">${W("Tu Nombre",ue,"lg")}</div>
                <div class="flex flex-col">
                  <span id="auth-preview-name" class="text-xs font-bold text-[#0b1c30]">Tu perfil</span>
                  <span class="text-[11px] text-slate-500">Se usar\xE1n las iniciales de tu nombre</span>
                </div>
              </div>

              <label class="px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-blue-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all">
                ${l("camera","w-3.5 h-3.5")}
                <span>Foto</span>
                <input id="input-avatar-file" type="file" accept="image/*" class="sr-only" />
              </label>
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Nombre completo</label>
              <input id="reg-name" type="text" placeholder="ej. Camila Restrepo" required class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electr\xF3nico</label>
              <input id="reg-email" type="email" autocomplete="email" required placeholder="ej. camila@email.com" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="reg-pass" type="password" autocomplete="new-password" required minlength="6" placeholder="M\xEDnimo 6 caracteres" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reg-pass" type="button" aria-label="Mostrar contrase\xF1a" title="Mostrar contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">
                  ${l("eye","w-4 h-4")}
                </button>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-[#0b1c30]">Salario o ingreso mensual estimado (COP)</label>
                <span class="text-[10px] font-semibold text-slate-400">Opcional</span>
              </div>
              <input id="reg-salary" type="text" inputmode="decimal" autocomplete="off" placeholder="ej. 5.800.000" class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc] tabular-nums" />
              <div class="mt-2">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Valores frecuentes</p>
                <div class="flex flex-wrap gap-2 mt-2" role="group" aria-label="Valores de ingreso frecuentes">
                  <button type="button" data-salary-value="1300000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$1.300.000</button>
                  <button type="button" data-salary-value="2000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$2.000.000</button>
                  <button type="button" data-salary-value="3000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$3.000.000</button>
                  <button type="button" data-salary-value="5000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$5.000.000</button>
                  <button type="button" data-salary-value="8000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$8.000.000</button>
                  <button type="button" data-salary-value="10000000" aria-pressed="false" class="reg-salary-option flex-1 min-w-[78px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-[#0058bc]/50 hover:bg-[#f5f9ff] transition-colors cursor-pointer">$10.000.000</button>
                </div>
              </div>
              <p class="mt-1 text-[10px] text-slate-400">Tambi\xE9n puedes escribir un valor diferente.</p>
            </div>

            <button type="submit" class="w-full py-3 mt-2 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Comenzar a usar MiPlata
            </button>
          </form>
        `:`
          <!-- Login Form -->
          <form id="form-login" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Correo electr\xF3nico</label>
              <input id="login-email" type="email" placeholder="camila.restrepo@email.com" required class="w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
            </div>

            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="login-pass" type="password" autocomplete="current-password" placeholder="demo" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-login-pass" type="button" aria-label="Mostrar contrase\xF1a" title="Mostrar contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">
                  ${l("eye","w-4 h-4")}
                </button>
              </div>
            </div>

            <button type="submit" class="w-full py-3 mt-2 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
              Iniciar Sesi\xF3n
            </button>
            <button id="auth-forgot-password" type="button" class="text-xs font-semibold text-[#0058bc] hover:underline cursor-pointer">\xBFOlvidaste tu contrase\xF1a?</button>
          </form>
        `}

        ${`
        <!-- Demo Account Instant Shortcut -->
        <div class="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
          <span class="text-[11px] text-slate-400 font-medium">\xBFQuieres probar la app de inmediato?</span>
          <button
            id="btn-login-demo"
            type="button"
            class="w-full py-2.5 px-4 rounded-2xl bg-[#eff4ff] hover:bg-blue-100 text-[#0058bc] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            ${l("sparkles","w-4 h-4 text-[#0058bc]")}
            <span>Entrar con cuenta de demostraci\xF3n</span>
          </button>
        </div>
        `}
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium">
        <span>By</span>
        ${Le("h-5 w-auto opacity-80")}
      </div>
    </div>
  `,document.getElementById("auth-tab-register").onclick=()=>{oe=!0,fe()},document.getElementById("auth-tab-login").onclick=()=>{oe=!1,fe()};let e=document.getElementById("btn-login-demo");e&&(e.onclick=async()=>{try{let s=await L.loginDemo();if(qt(s.bootstrap))try{localStorage.setItem("miplata_bootstrap_cache",JSON.stringify(s.bootstrap))}catch{}else n.currentUser=s.user,await ie();U(),E(s.message)}catch(s){E(s?.message||"No se pudo conectar con MiPlata. Intenta nuevamente.","error")}});let t=document.getElementById("form-register");if(t){let s=document.getElementById("reg-name"),o=document.getElementById("reg-email"),i=document.getElementById("reg-pass"),f=document.getElementById("toggle-reg-pass"),m=document.getElementById("reg-salary"),v=Array.from(t.querySelectorAll("[data-salary-value]")),d=document.getElementById("input-avatar-file"),r=document.getElementById("auth-preview-name"),p=document.getElementById("auth-avatar-preview");t.noValidate=!0,f.onclick=()=>{let w=i.type==="password";i.type=w?"text":"password",f.innerHTML=l(w?"eyeOff":"eye","w-4 h-4"),f.setAttribute("aria-label",w?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a"),f.setAttribute("title",w?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a")},s.oninput=()=>{r.textContent=s.value.trim()||"Tu perfil",p.innerHTML=W(s.value||"Tu",ue,"lg")};let $=()=>{let w=parseInt(m.value.replace(/\D/g,""),10)||0;v.forEach(S=>{let y=Number(S.dataset.salaryValue)===w;S.setAttribute("aria-pressed",String(y)),S.classList.toggle("bg-[#0058bc]",y),S.classList.toggle("border-[#0058bc]",y),S.classList.toggle("text-white",y),S.classList.toggle("shadow-sm",y),S.classList.toggle("bg-white",!y),S.classList.toggle("border-slate-200",!y),S.classList.toggle("text-slate-600",!y)})};v.forEach(w=>{w.onclick=()=>{let S=Number(w.dataset.salaryValue);m.value=S.toLocaleString("es-CO"),$()}}),m.oninput=()=>{let w=parseInt(m.value.replace(/\D/g,""),10);m.value=isNaN(w)?"":w.toLocaleString("es-CO"),$()},d.onchange=async w=>{let S=w.target.files?.[0];if(S)try{ue=await ot(S),p.innerHTML=W(s.value||"Tu",ue,"lg")}catch(y){ue="",d.value="",E(y.message||"No se pudo cargar la imagen","error")}},t.onsubmit=async w=>{w.preventDefault();let S=s.value.trim(),y=o.value.trim().toLowerCase(),C=i.value,b=parseInt(m.value.replace(/\D/g,""),10)||0;if(!S){E("Escribe tu nombre completo para continuar","error"),s.focus();return}if(!y){E("Escribe un correo electr\xF3nico para crear la cuenta","error"),o.focus();return}if(!o.checkValidity()){E("Ingresa un correo electr\xF3nico v\xE1lido","error"),o.focus();return}if(!C){E("Escribe una contrase\xF1a para crear la cuenta","error"),i.focus();return}if(C.length<6){E("La contrase\xF1a debe tener al menos 6 caracteres","error"),i.focus();return}try{let M=await L.register(S,y,C,b,ue);n.currentUser=M.user,await ie(),U(),E(M.message)}catch(M){E(M.message,"error")}}}let a=document.getElementById("form-login");if(a){let s=document.getElementById("login-pass"),o=document.getElementById("toggle-login-pass"),i=document.getElementById("auth-forgot-password");i&&(i.onclick=()=>{Q="request",pe="",fe()}),o.onclick=()=>{let f=s.type==="password";s.type=f?"text":"password",o.innerHTML=l(f?"eyeOff":"eye","w-4 h-4"),o.setAttribute("aria-label",f?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a"),o.setAttribute("title",f?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a")},a.onsubmit=async f=>{f.preventDefault();let m=document.getElementById("login-email").value.trim(),v=s.value;try{let d=await L.login(m,v);if(n.currentUser=d.user,E("Cargando tus datos\u2026","info"),!await ie()||!n.currentUser){n.currentUser=null,U(),E("No se pudieron cargar tus datos. Intenta nuevamente.","error");return}U(),E(d.message,"success")}catch(d){E(d.message,"error")}}}}var Ca={"gasto":[{"category":"Alimentación","keywords":["alimentacion","almuerzo","desayuno","cena","comida","restaurante","supermercado","mercado","mercado mensual","carulla","exito","d1","ara","olimpica","fruver","fruta","frutas","verduras","pan","panaderia","cafe","cafeteria","empanada","domicilio","rappi","ifood","uber eats","comida rapida","pizza","hamburguesa","pollo","carne","tienda","plaza de mercado","minimercado","snacks","refresco","bebida"]},{"category":"Transporte","keywords":["transporte","uber","didi","cabify","taxi","bus","buseta","transmilenio","transmi","metro","metroplus","gasolina","combustible","parqueadero","parqueo","peaje","soat","pasaje","moto","motocicleta","bicicleta","bici","carro","vehiculo","mantenimiento carro","taller","llanta","llantas","reparacion carro","lavado carro"]},{"category":"Compras","keywords":["compra","compras","ropa","zapatos","tenis","vestido","electronica","electrodomestico","celular","computador","portatil","tablet","amazon","mercado libre","mercadolibre","falabella","regalo","hogar","muebles","accesorio","accesorios","juguete","maquillaje","cosmeticos","ferreteria","decoracion"]},{"category":"Servicios","keywords":["arriendo","alquiler","administracion","luz","agua","energia","gas","internet","wifi","telefono","telefonia","celular","plan celular","factura","factura de servicios","servicio","servicios","tv","cable","suscripcion","suscripciones"]},{"category":"Salud","keywords":["salud","medico","medicina","medicamento","medicamentos","farmacia","drogueria","consulta","cita medica","hospital","clinica","laboratorio","examen","urgencias","odontologo","dentista","terapia","psicologo","fisioterapia","vitamina","vitaminas","eps","seguro","cirugia","optica","lentes"]},{"category":"Entretenimiento","keywords":["cine","pelicula","concierto","teatro","netflix","spotify","disney","hbo","youtube premium","prime video","juego","videojuego","gimnasio","bar","fiesta","ocio","parque"]},{"category":"Educación","keywords":["colegio","universidad","curso","clase","libro","matricula","educacion","papeleria","cuaderno","lapiz","seminario","diplomado"]},{"category":"Viajes","keywords":["viaje","viajes","hotel","hospedaje","hostal","vuelo","vuelos","avion","aeropuerto","pasaje avion","pasaje aereo","airbnb","reserva hotel","tour","turismo","vacaciones","maleta","agencia de viajes","boleto"]},{"category":"Mascotas","keywords":["mascota","mascotas","perro","perros","gato","gatos","veterinario","veterinaria","alimento para perro","alimento perro","alimento para mi perro","comida para perro","comida perro","comida para mi perro","alimento para gato","alimento gato","alimento para mi gato","comida para gato","comida gato","comida para mi gato","concentrado","arena para gato","accesorios para mascota","baño mascota","vacuna mascota","petshop"]},{"category":"Donaciones","keywords":["donacion","donaciones","donar","aporte solidario","ayuda humanitaria","caridad","fundacion","iglesia","diezmo","colecta","solidaridad","voluntariado","ong"]}],"ingreso":[{"category":"Nómina","keywords":["salario","sueldo","nomina","quincena","pago laboral","pago de nomina","empresa","liquidacion","prima","cesantias","vacaciones","bonificacion","bono","prestaciones","pago de sueldo"]},{"category":"Honorarios","keywords":["honorario","honorarios","freelance","consultoria","asesoria","servicio profesional","servicios profesionales","proyecto","contrato","trabajo independiente","comision profesional","prestacion de servicios"]},{"category":"Negocio","keywords":["venta","ventas","negocio","cliente","pedido","emprendimiento","producto","tienda","factura cobrada","cobro","comercio","mi negocio","servicio vendido"]},{"category":"Inversión","keywords":["inversion","dividendos","intereses","rendimiento","interes","fondo","acciones","accion","rentabilidad","ganancia inversion","cdt","interes cdt","arriendo recibido","alquiler recibido","renta"]}]};function Ct(e){return String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}function containsSmartCategoryKeyword(e,t){let a=e.split(" ").filter(Boolean),s=Ct(t).split(" ").filter(Boolean);if(!s.length||s.length>a.length)return!1;for(let e=0;e<=a.length-s.length;e+=1)if(s.every((t,s)=>a[e+s]===t))return!0;return!1}function Ia(e,t){if(!n.currentUser?.smartCategorization)return"";let a=Ct(t);if(a.length<3)return"";let s=Ca[e]||[],o={category:"",score:0};return s.forEach(i=>{let f=i.keywords.reduce((m,v)=>{let d=Ct(v);if(!containsSmartCategoryKeyword(a,d))return m;let r=Math.max(0,d.split(" ").length-1)*4;return m+d.length+r},0);f>o.score&&(o={category:i.category,score:f})}),o.category}function Aa(e){let t=e||K(),[,a,s]=t.split("-").map(Number),o=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],i=t===K(),f=i?"Hoy, ":"",m=i?"Autom\xE1tica":"Manual";return`${f}${s} ${o[a-1]||""} (${m})`}function Xe(e="gasto"){n.quickAdd.isOpen=!0,document.documentElement.classList.add("quick-add-open"),document.body.classList.add("quick-add-open"),n.quickAdd.type=e,n.quickAdd.rawValue="0",n.quickAdd.category=e==="ingreso"?"N\xF3mina":"Alimentaci\xF3n",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",n.quickAdd.description="",n.quickAdd.date=K(),u.modalQuickAdd.classList.remove("hidden"),X()}function X(){let{type:e,rawValue:t,category:a,description:s,date:o,smartSuggestion:i}=n.quickAdd,f=parseInt(t,10)||0,d=e==="ingreso"?[{name:"N\xF3mina",label:"N\xF3mina",icon:"briefcase"},{name:"Honorarios",label:"Honorarios",icon:"dollarSign"},{name:"Negocio",label:"Negocio",icon:"building2"},{name:"Inversi\xF3n",label:"Inversi\xF3n",icon:"trendingUp"},{name:"Otros",label:"Otros",icon:"moreHorizontal"}]:[{name:"Alimentaci\xF3n",label:"Comida",icon:"pizzaSlice"},{name:"Transporte",label:"Transporte",icon:"car"},{name:"Compras",label:"Compras",icon:"shoppingBag"},{name:"Servicios",label:"Servicios",icon:"zap"},{name:"Salud",label:"Salud",icon:"heartPulse"},{name:"Entretenimiento",label:"Ocio",icon:"gamepad2"},{name:"Educaci\xF3n",label:"Educaci\xF3n",icon:"graduationCap"},{name:"Viajes",label:"Viajes",icon:"plane"},{name:"Mascotas",label:"Mascotas",icon:"heartPulse"},{name:"Donaciones",label:"Donaciones",icon:"gift"},{name:"Otros",label:"Otros",icon:"moreHorizontal"}];u.modalQuickAdd.innerHTML=`
    <div class="quick-add-page qa-form-shell bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="qa-header flex items-center justify-between mb-4 sm:mb-5">
        <button id="qa-close-btn" aria-label="Volver" class="w-9 h-9 flex items-center justify-center text-[#0058bc] cursor-pointer">${l("arrowLeft","w-7 h-7")}</button>
        <div class="flex items-center gap-2"><img src="assets/optimized/Logo.png" alt="MiPlata" width="160" height="160" decoding="async" class="w-10 h-10 rounded-xl" /><h1 class="text-xl font-semibold">Nuevo Registro</h1></div>
        ${W(n.currentUser?.name,n.currentUser?.avatarUrl,"sm")}
      </div>
      <div class="qa-drag-handle h-1.5 w-12 rounded-full bg-[#dce8ff] mx-auto mb-3 sm:mb-4"></div>

      <div class="qa-type-switch flex items-center bg-[#dce8ff] p-1 rounded-full mb-4 sm:mb-6">
        <button id="qa-type-gasto" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${e==="gasto"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600"}">Gasto</button>
        <button id="qa-type-ingreso" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${e==="ingreso"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600"}">Ingreso</button>
      </div>

      <div class="qa-amount-display text-center mb-4 sm:mb-5"><div class="flex items-baseline justify-center gap-1"><span class="qa-amount-value text-4xl sm:text-5xl font-extrabold text-[#0b1c30] tabular-nums"><span class="text-slate-300">$</span>${g(f).replace("$","")}</span><span class="text-base sm:text-xl font-medium text-slate-500">COP</span></div><p class="qa-amount-status mt-2 text-xs sm:text-sm font-semibold text-[#0058bc]"><span class="inline-block w-3 h-3 rounded-full bg-[#006c49] mr-1"></span>${e==="ingreso"?"Registrando ingreso inmediato":"Registrando egreso inmediato"}</p></div>

      <div class="qa-category-heading flex items-center justify-between mb-2.5 sm:mb-3"><h2 class="text-base sm:text-lg font-semibold uppercase tracking-wide text-slate-600">Categor\xEDa</h2><span id="qa-selected-category" class="text-base sm:text-lg font-semibold text-[#0058bc]">${a}</span></div>
      <div id="qa-categories-scroll" class="qa-category-scroller qa-categories-scroll flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1.5 sm:pb-2 mb-4 sm:mb-5" role="listbox" aria-label="Categor\xEDas de ${e==="ingreso"?"ingreso":"gasto"}">
        ${d.map(y=>`<button type="button" data-cat="${y.name}" role="option" aria-selected="${a===y.name}" class="qa-cat-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer"><span class="qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${a===y.name?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}">${l(y.icon,"w-6 h-6 sm:w-7 sm:h-7")}</span><span class="qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${a===y.name?"text-[#0058bc] font-semibold":"text-slate-700"}">${y.label}</span></button>`).join("")}
      </div>
      <p id="qa-smart-category-hint" aria-hidden="true" style="display: none !important;" class="qa-smart-hint qa-smart-hint-hidden text-[11px] text-[#0058bc] font-medium text-center -mt-3 mb-3 ${i?"":"invisible"}">${i?`Sugerencia autom\xE1tica: ${i}`:"Sugerencia autom\xE1tica"}</p>

      <div class="qa-details-card rounded-3xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-100 mb-4 sm:mb-6">
        <div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${l("fileText","w-5 h-5")}</span><input id="qa-description-input" type="text" placeholder="${e==="ingreso"?"Concepto del ingreso":"Caf\xE9 y empanada Juan Valdez"}" value="${s}" class="qa-description-input flex-1 min-w-0 text-lg bg-transparent focus:outline-none focus:ring-0" /></div>
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${l("calendar","w-5 h-5")}</span><div><p class="text-sm font-semibold text-slate-500">Fecha</p><p class="text-base font-semibold">${Aa(o)}</p></div></div><div class="relative"><button id="qa-change-date-btn" type="button" class="rounded-full bg-[#dce8ff] px-3 py-2 text-sm font-semibold text-[#0058bc] cursor-pointer">Cambiar</button><input id="qa-date-input" type="date" value="${o}" aria-label="Cambiar fecha del registro" class="absolute inset-0 h-full w-full opacity-0 pointer-events-none" /></div></div>
      </div>

      <div class="qa-keypad keypad-grid gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <button data-key="1" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">1</button><button data-key="2" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">2</button><button data-key="3" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">3</button>
        <button data-key="4" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">4</button><button data-key="5" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">5</button><button data-key="6" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">6</button>
        <button data-key="7" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">7</button><button data-key="8" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">8</button><button data-key="9" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">9</button>
        <button data-key="000" class="keypad-btn bg-[#eef3ff] border-0 text-[#0058bc] h-16 sm:h-[72px] rounded-full">+000</button><button data-key="0" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">0</button><button data-key="backspace" class="keypad-btn bg-[#eef3ff] border-0 h-16 sm:h-[72px] rounded-full">${l("deleteKey","w-7 h-7")}</button>
      </div>
      <button id="qa-submit-btn" class="qa-submit-button w-full h-14 sm:h-16 rounded-full ${f>0?"bg-[#0058bc]":"bg-slate-300 pointer-events-none"} text-white font-bold text-lg sm:text-xl shadow-md cursor-pointer flex items-center justify-center gap-2">${l("checkCircle2","w-6 h-6 sm:w-7 sm:h-7")}<span>Guardar ${e==="ingreso"?"Ingreso":"Gasto"}</span></button>
    </div>
  `,document.getElementById("qa-type-gasto").onclick=()=>{n.quickAdd.type="gasto",n.quickAdd.category="Alimentaci\xF3n",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",X()},document.getElementById("qa-type-ingreso").onclick=()=>{n.quickAdd.type="ingreso",n.quickAdd.category="N\xF3mina",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",X()},document.getElementById("qa-close-btn").onclick=()=>{u.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open")},u.modalQuickAdd.querySelectorAll(".qa-cat-btn").forEach(y=>{y.onclick=()=>{n.quickAdd.category=y.dataset.cat,n.quickAdd.categoryManuallySelected=!0,n.quickAdd.smartSuggestion="",X()}});let r=y=>{n.quickAdd.category=y;let C=document.getElementById("qa-selected-category");C&&(C.textContent=y),u.modalQuickAdd.querySelectorAll(".qa-cat-btn").forEach(b=>{let M=b.dataset.cat===y;b.setAttribute("aria-selected",String(M));let h=b.querySelector("span:first-child"),A=b.querySelector("span:last-child");h&&(h.className=`qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${M?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}`),A&&(A.className=`qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${M?"text-[#0058bc] font-semibold":"text-slate-700"}`)})},p=document.getElementById("qa-description-input");p&&(p.oninput=y=>{if(n.quickAdd.description=y.target.value,!n.quickAdd.categoryManuallySelected){let C=Ia(n.quickAdd.type,n.quickAdd.description);n.quickAdd.smartSuggestion=C,C&&r(C);let b=document.getElementById("qa-smart-category-hint");b&&(b.textContent=C?`Sugerencia autom\xE1tica: ${C}`:"Sugerencia autom\xE1tica",b.classList.toggle("invisible",!C))}});let $=document.getElementById("qa-change-date-btn"),w=document.getElementById("qa-date-input");$&&w&&($.onclick=()=>{typeof w.showPicker=="function"?w.showPicker():w.click()},w.onchange=y=>{y.target.value&&(n.quickAdd.date=y.target.value,X())}),u.modalQuickAdd.querySelectorAll(".keypad-btn").forEach(y=>{y.onclick=()=>{let C=y.dataset.key;C==="backspace"?n.quickAdd.rawValue.length<=1?n.quickAdd.rawValue="0":n.quickAdd.rawValue=n.quickAdd.rawValue.slice(0,-1):C==="000"?n.quickAdd.rawValue!=="0"&&n.quickAdd.rawValue.length<8&&(n.quickAdd.rawValue+="000"):n.quickAdd.rawValue==="0"?n.quickAdd.rawValue=C:n.quickAdd.rawValue.length<10&&(n.quickAdd.rawValue+=C),X()}});let S=document.getElementById("qa-submit-btn");S&&(S.onclick=async()=>{let y=parseInt(n.quickAdd.rawValue,10)||0;if(y<=0)return;let C=n.quickAdd.description.trim()||(n.quickAdd.type==="ingreso"?"Ingreso recibido":"Gasto ocasional"),b={type:n.quickAdd.type,amount:y,category:n.quickAdd.category,description:C,date:n.quickAdd.date,time:Ve(),isRecurring:!1};try{let M=await L.addTransaction(b);ra(b,M)}catch(M){E(M.message||"No se pudo guardar el movimiento","error");return}u.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open"),Z(),E(`${n.quickAdd.type==="ingreso"?"Ingreso":"Gasto"} de ${g(y)} guardado`)})}function _e(e){e&&(u.modalEditTransaction.classList.remove("hidden"),u.modalEditTransaction.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Editar nombre del movimiento</h3>
        <button id="edit-tx-close" type="button" aria-label="Cerrar edici\xF3n del movimiento" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <form id="form-edit-tx" class="flex flex-col gap-3">
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Concepto</label>
          <input id="edit-tx-desc" type="text" value="${e.description}" required class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Tipo</label>
            <input type="text" value="${e.type==="ingreso"?"Ingreso":"Gasto / Egreso"}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Monto (COP)</label>
            <input type="text" value="${e.amount.toLocaleString("es-CO")}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500 tabular-nums cursor-not-allowed" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Categor\xEDa</label>
            <input type="text" value="${e.category||"Otros"}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label class="text-xs font-bold text-[#0b1c30]">Fecha</label>
            <input type="text" value="${e.date||"Sin fecha"}" disabled class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed" />
          </div>
        </div>

        <p class="text-[11px] text-slate-400">Solo puedes cambiar el nombre. Los dem\xE1s datos permanecen protegidos.</p>

        <button type="submit" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar nombre
        </button>

      </form>
    </div>
  `,document.getElementById("edit-tx-close").onclick=()=>u.modalEditTransaction.classList.add("hidden"),document.getElementById("form-edit-tx").onsubmit=async t=>{t.preventDefault();let a=document.getElementById("edit-tx-desc").value.trim();if(!a){E("Escribe un concepto para el movimiento","error");return}try{await L.updateTransaction(e.id,{description:a}),la(e.id,{description:a}),u.modalEditTransaction.classList.add("hidden"),Z(),E("Movimiento actualizado")}catch(s){E(s.message||"No se pudo actualizar el movimiento","error")}})}function We(e=null){u.modalFixedObligation.classList.remove("hidden");let t=!!e,a=t?"Editar Gasto Fijo":"Nuevo Gasto Fijo",s=t?Number(e.reminderDaysBefore??3)>0:!0,o=Ot(t?e.category:"Servicios p\xFAblicos",t?e.name:"");u.modalFixedObligation.innerHTML=`
    <div class="fixed-obligation-page bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100dvh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">${a}</h3>
        <button id="ob-modal-close" type="button" aria-label="Cerrar gasto fijo" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <form id="form-obligation" class="flex flex-col gap-4">
        <div>
          <label class="text-sm font-medium text-[#607797]">Concepto</label>
          <input id="ob-input-name" type="text" placeholder="ej. Arriendo Apartamento, Internet, etc." value="${t?e.name:""}" required class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#25364d] placeholder:text-[#8d99aa] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff]" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-[#607797]">Valor mensual</label>
            <div class="relative mt-1.5">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#91a0b4]">$</span>
              <input id="ob-input-amount" type="text" inputmode="numeric" placeholder="0" value="${t?e.amount.toLocaleString("es-CO"):""}" required class="w-full h-12 pl-8 pr-3 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-bold text-[#25364d] placeholder:text-[#25364d] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff] tabular-nums" />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-[#607797]">D\xEDa de vencimiento</label>
            <input id="ob-input-day" type="number" min="1" max="31" value="${t?e.dueDay:5}" required class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-bold text-[#25364d] focus:outline-none focus:border-[#0058bc] focus:ring-2 focus:ring-[#dce8ff]" />
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-[#607797]">Categor\xEDa</label>
          <input id="ob-input-category" type="hidden" value="${o}" />
          <div id="ob-categories-scroll" class="qa-categories-scroll flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1.5 sm:pb-2 mt-1.5" role="listbox" aria-label="Categor\xEDas de gasto fijo">
            ${Qt.map(d=>`
              <button type="button" data-category="${d.name}" role="option" aria-selected="${o===d.name}" class="ob-category-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer">
                <span class="ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${o===d.name?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}">${l(d.icon,"w-6 h-6 sm:w-7 sm:h-7")}</span>
                <span class="ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${o===d.name?"text-[#0058bc] font-semibold":"text-slate-700"}">${d.label}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="flex items-center justify-between h-14 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc]">
          <span class="text-sm font-medium text-[#405572]">Recordatorio activo (3 d\xEDas antes)</span>
          <button id="ob-reminder-toggle" type="button" role="switch" aria-checked="${s}" class="relative w-12 h-7 rounded-full transition-colors cursor-pointer ${s?"bg-[#0058bc]":"bg-[#cbd5e1]"}">
            <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${s?"translate-x-5":"translate-x-0"}"></span>
          </button>
        </div>

        <button type="submit" class="w-full h-12 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          ${t?"Guardar Cambios":"Crear Obligaci\xF3n"}
        </button>

        ${t?`
          <button type="button" id="ob-delete-btn" class="w-full py-2.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5">
            ${l("trash2","w-4 h-4")}
            <span>Eliminar obligaci\xF3n</span>
          </button>
        `:""}
      </form>
    </div>
  `,document.getElementById("ob-modal-close").onclick=()=>u.modalFixedObligation.classList.add("hidden");let i=document.getElementById("ob-input-amount");i.oninput=()=>{let d=parseInt(i.value.replace(/\D/g,""),10);i.value=isNaN(d)?"":d.toLocaleString("es-CO")};let f=document.getElementById("ob-input-category");u.modalFixedObligation.querySelectorAll(".ob-category-btn").forEach(d=>{d.onclick=()=>{f.value=d.dataset.category,u.modalFixedObligation.querySelectorAll(".ob-category-btn").forEach(r=>{let p=r===d;r.setAttribute("aria-selected",String(p));let $=r.querySelector(".ob-category-icon"),w=r.querySelector(".ob-category-label");$&&($.className=`ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${p?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}`),w&&(w.className=`ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${p?"text-[#0058bc] font-semibold":"text-slate-700"}`)})}});let m=document.getElementById("ob-reminder-toggle");m&&(m.onclick=()=>{let d=m.getAttribute("aria-checked")!=="true";m.setAttribute("aria-checked",String(d)),m.className=`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${d?"bg-[#0058bc]":"bg-[#cbd5e1]"}`,m.firstElementChild.className=`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${d?"translate-x-5":"translate-x-0"}`}),document.getElementById("form-obligation").onsubmit=async d=>{d.preventDefault();let r=document.getElementById("ob-input-name").value.trim(),p=parseInt(i.value.replace(/\D/g,""),10)||0,$=parseInt(document.getElementById("ob-input-day").value,10)||1,w=document.getElementById("ob-input-category").value,S=document.getElementById("ob-reminder-toggle")?.getAttribute("aria-checked")==="true"?3:0;if(!(!r||p<=0))try{if(t){let y={name:r,amount:p,dueDay:$,category:w,reminderDaysBefore:S,notes:`Vence D\xEDa ${$} del mes`};await L.updateFixedObligation(e.id,y),da(e.id,y),E("Obligaci\xF3n actualizada")}else{let y={name:r,amount:p,dueDay:$,category:w,reminderDaysBefore:S,status:"pending",notes:`Vence D\xEDa ${$} del mes`},C=await L.addFixedObligation(y);ca(y,C.id),E("Gasto fijo agregado")}u.modalFixedObligation.classList.add("hidden"),Z()}catch(y){E(y.message||"No se pudo guardar el gasto fijo","error")}};let v=document.getElementById("ob-delete-btn");v&&t&&(v.onclick=()=>{at({title:"\xBFEliminar gasto fijo?",message:"Esta acci\xF3n eliminar\xE1 el gasto fijo y su registro asociado de forma permanente.",successMessage:"Obligaci\xF3n eliminada",errorMessage:"No se pudo eliminar el gasto fijo",onConfirm:async()=>{await L.deleteFixedObligation(e.id),ua(e.id),u.modalFixedObligation.classList.add("hidden"),Z()}})})}function et(e){let t=String(e||"").trim();if(!t)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;if(/^\d{4}-\d{2}$/.test(t))return`${t}-01`;let s=t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);if(s){let i=de.findIndex(f=>f.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===s[1]);if(i>=0)return`${s[2]}-${String(i+1).padStart(2,"0")}-01`}let o=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(o){let i=Number(o[1]),f=Number(o[2]),m=Number(o[3]);if(f>=1&&f<=12&&i>=1&&i<=31)return`${m}-${String(f).padStart(2,"0")}-${String(i).padStart(2,"0")}`}return null}function It(e){let t=et(e);if(!t)return String(e||"");let[,a,s]=t.match(/^(\d{4})-(\d{2})-/)||[];return a&&s?`${de[Number(s)-1]||s} ${a}`:String(e||"")}var At=6e5;function ot(e){return!e||!String(e.type||"").startsWith("image/")?Promise.reject(new Error("Selecciona una imagen v\xE1lida")):new Promise((t,a)=>{let s=new FileReader;s.onerror=()=>a(new Error("No se pudo leer la imagen")),s.onload=()=>{let o=new Image;o.onerror=()=>a(new Error("No se pudo procesar la imagen")),o.onload=()=>{let i=o.naturalWidth||o.width,f=o.naturalHeight||o.height;if(!i||!f){a(new Error("La imagen no tiene un tama\xF1o v\xE1lido"));return}let m=[1e3,800,650,500],v="";for(let d of m){let r=Math.min(1,d/i,d/f),p=document.createElement("canvas");p.width=Math.max(1,Math.round(i*r)),p.height=Math.max(1,Math.round(f*r));let $=p.getContext("2d");if(!$){a(new Error("El navegador no permite procesar la imagen"));return}if($.drawImage(o,0,0,p.width,p.height),v=p.toDataURL("image/webp",.78),v.startsWith("data:image/webp")||(v=p.toDataURL("image/jpeg",.78)),v.length<=At)break}if(v.length>At){a(new Error("La imagen es demasiado grande. Elige una imagen m\xE1s peque\xF1a"));return}t(v)},o.src=s.result},s.readAsDataURL(e)})}function jt(e,t){return`${Number(e)}-${String(Number(t)).padStart(2,"0")}`<H()}function De(e=null){u.modalSavingsGoal.classList.remove("hidden");let t=!!e,a=t&&e.imageUrl||"",s=t&&e.icon||"security",o=t&&et(e.deadline)||"",i=o.slice(5,7),f=o.slice(0,4),m=new Date().getFullYear(),v=Math.min(m,Number(f)||m),d=Math.max(m+10,Number(f)||m),p=[{value:"security",icon:"shield"},{value:"laptop",icon:"laptop"},{value:"plane",icon:"plane"},{value:"home",icon:"home"},{value:"car",icon:"car"},{value:"star",icon:"star"}].map(({value:c,icon:x})=>`
    <button type="button" data-goal-icon="${c}" class="goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${s===c?"bg-[#0058bc] text-white":"bg-[#f0f4f9] text-[#657993]"}">
      ${l(x,"w-5 h-5")}
    </button>
  `).join(""),$=de.map((c,x)=>`
    <option value="${String(x+1).padStart(2,"0")}" ${i===String(x+1).padStart(2,"0")?"selected":""}>${c}</option>
  `).join(""),w=Array.from({length:d-v+1},(c,x)=>v+x).map(c=>{let x=c<m,I=f===String(c),N=x&&I?`${c} (fecha anterior)`:c;return`<option value="${c}" ${I?"selected":""} ${x?"disabled":""}>${N}</option>`}).join("");u.modalSavingsGoal.innerHTML=`
    <div class="bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-[18px] text-[#0b1c30]">${t?"Editar Meta de Ahorro":"Nueva Meta de Ahorro"}</h3>
        <button id="goal-modal-close" type="button" aria-label="Cerrar meta de ahorro" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <form id="form-goal" class="flex flex-col gap-4">
        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Nombre de la meta</label>
          <input id="goal-input-name" type="text" placeholder="ej. Fondo de Emergencia o Vacaciones" value="${t?e.name:""}" required class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30" />
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Valor objetivo en COP</label>
          <input id="goal-input-target" type="text" inputmode="numeric" placeholder="30.000.000" value="${t?Number(e.targetAmount||0).toLocaleString("es-CO"):""}" required class="w-full h-12 mt-1.5 px-4 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-bold text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30 tabular-nums" />
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">Fecha l\xEDmite opcional</label>
          <div class="grid grid-cols-2 gap-2 mt-1.5">
            <select id="goal-input-deadline-month" aria-label="Mes de la fecha l\xEDmite" class="w-full h-12 px-3 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30">
              <option value="">Mes</option>
              ${$}
            </select>
            <select id="goal-input-deadline-year" aria-label="A\xF1o de la fecha l\xEDmite" class="w-full h-12 px-3 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30">
              <option value="">A\xF1o</option>
              ${w}
            </select>
          </div>
          <button type="button" id="goal-clear-deadline" class="text-xs text-[#0058bc] font-semibold mt-1.5 cursor-pointer">Quitar fecha l\xEDmite</button>
          <p class="text-xs text-slate-400 mt-1">Solo puedes elegir el mes actual o una fecha futura.</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="text-[15px] font-medium text-[#6b7d98]">Cargar imagen de la meta</label>
            <button type="button" id="goal-remove-image" class="${a?"":"hidden"} text-xs font-semibold text-rose-600 cursor-pointer">Quitar foto</button>
          </div>
          <div class="flex items-center gap-3 mt-2">
            <div id="goal-img-preview" class="w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden">
              ${a?`<img src="${a}" class="max-w-full max-h-full object-contain" />`:l("flag","w-7 h-7 text-[#0058bc]")}
            </div>
            <label class="flex-1 h-11 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[#0058bc] text-[15px] font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#eef3ff] transition-colors">
              ${l("camera","w-5 h-5")}
              <span>Cambiar foto</span>
              <input id="input-goal-file" type="file" accept="image/*" class="sr-only" />
            </label>
          </div>
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">O elige un icono</label>
          <div class="flex flex-wrap items-center gap-2 mt-2 max-w-full overflow-x-hidden">${p}</div>
        </div>

        <button type="submit" class="w-full h-11 mt-2 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer">
          ${t?"Guardar Cambios":"Crear Meta"}
        </button>

        ${t?`
          <button type="button" id="goal-delete-btn" class="w-full h-11 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5">
            ${l("trash2","w-4 h-4")}
            <span>Eliminar Meta</span>
          </button>
        `:""}
      </form>
    </div>
  `,document.getElementById("goal-modal-close").onclick=()=>u.modalSavingsGoal.classList.add("hidden");let S=document.getElementById("input-goal-file"),y=document.getElementById("goal-img-preview"),C=document.getElementById("goal-remove-image");S&&(S.onchange=async c=>{let x=c.target.files?.[0];if(x)try{a=await ot(x),y.innerHTML=`<img src="${a}" class="max-w-full max-h-full object-contain" />`,C?.classList.remove("hidden")}catch(I){a="",S.value="",E(I.message||"No se pudo cargar la imagen","error")}}),C&&(C.onclick=()=>{a="",y.innerHTML=l("flag","w-7 h-7 text-[#0058bc]"),C.classList.add("hidden"),S&&(S.value="")});let b=document.getElementById("goal-input-target");b.oninput=()=>{let c=ye(b.value);b.value=c?c.toLocaleString("es-CO"):""};let M=document.getElementById("goal-input-deadline-month"),h=document.getElementById("goal-input-deadline-year"),A=()=>{let c=Number(h.value)||m;Array.from(M.options).forEach(x=>{if(!x.value)return;let I=jt(c,x.value);x.disabled=I,I&&x.selected&&(M.value="")})};h.onchange=A,A(),document.getElementById("goal-clear-deadline").onclick=()=>{M.value="",h.value="",A()},u.modalSavingsGoal.querySelectorAll(".goal-icon-choice").forEach(c=>{c.onclick=()=>{s=c.dataset.goalIcon,u.modalSavingsGoal.querySelectorAll(".goal-icon-choice").forEach(x=>{let I=x.dataset.goalIcon===s;x.className=`goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${I?"bg-[#0058bc] text-white":"bg-[#f0f4f9] text-[#657993]"}`})}}),document.getElementById("form-goal").onsubmit=async c=>{c.preventDefault();let x=document.getElementById("goal-input-name").value.trim(),I=ye(b.value),N=M.value,V=h.value,O=!!N,F=!!V,re=O&&F?`${V}-${N}`:"",J=et(re),le=s;if(!x||I<=0){E("Escribe un nombre y un valor objetivo mayor que $0","error");return}if(O!==F){E("Selecciona el mes y el a\xF1o de la fecha l\xEDmite","error");return}if(re&&!J){E("La fecha l\xEDmite seleccionada no es v\xE1lida","error");return}if(J&&jt(V,N)){E("La fecha l\xEDmite debe ser el mes actual o un mes futuro","error");return}let Se={security:"#006c49",laptop:"#0058bc",plane:"#00838f",car:"#0284c7",home:"#4f46e5",star:"#d97706"};try{if(t){let R={name:x,targetAmount:I,deadline:J,icon:le,color:Se[le]||"#006c49",imageUrl:a};await L.updateSavingsGoal(e.id,R),fa(e.id,R),E(`Meta "${x}" actualizada`)}else{let R={name:x,targetAmount:I,currentAmount:0,deadline:J,icon:le,color:Se[le]||"#006c49",imageUrl:a},ge=await L.addSavingsGoal(R);ma(R,ge.id),E(`Meta "${x}" creada`)}u.modalSavingsGoal.classList.add("hidden"),Z()}catch(R){E(R.message||"No se pudo guardar la meta","error")}};let P=document.getElementById("goal-delete-btn");P&&t&&(P.onclick=()=>{at({title:"\xBFEliminar meta?",message:`Esta acci\xF3n eliminar\xE1 la meta "${e.name}" y sus aportes asociados de forma permanente.`,successMessage:"Meta eliminada",errorMessage:"No se pudo eliminar la meta",onConfirm:async()=>{await L.deleteSavingsGoal(e.id),ba(e.id),u.modalSavingsGoal.classList.add("hidden"),Z()}})})}function ja(e){let t=n.savingsGoals.find(s=>s.id===e);if(!t)return;u.modalAporteGoal.classList.remove("hidden"),u.modalAporteGoal.innerHTML=`
    <div class="bg-white rounded-[28px] p-6 max-w-lg w-full shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">
            ${l("plus","w-5 h-5")}
          </div>
          <h3 class="font-bold text-[18px] text-[#0b1c30] truncate">Aportar a ${t.name}</h3>
        </div>
        <button id="aporte-modal-close" type="button" aria-label="Cerrar aporte a la meta" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer shrink-0">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <div class="mt-7 text-center">
        <label class="block text-sm font-semibold tracking-wide text-[#6b7d98]">MONTO A RESERVAR</label>
        <div class="flex items-center justify-center gap-2 mt-2 w-full min-w-0 text-[#0058bc]">
          <span class="shrink-0 text-[34px] font-bold leading-none">$</span>
          <input id="aporte-input" type="text" inputmode="numeric" value="100.000" placeholder="100.000" class="min-w-0 flex-1 max-w-xs bg-transparent text-center text-3xl sm:text-[38px] font-extrabold leading-tight tabular-nums focus:outline-none" />
          <span class="shrink-0 text-sm font-semibold text-[#6b7d98]">COP</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5 mt-7">
        <button type="button" data-quick="50000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$50k</button>
        <button type="button" data-quick="100000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$100k</button>
        <button type="button" data-quick="200000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$200k</button>
      </div>

      <button id="aporte-submit-btn" class="w-full h-14 mt-6 rounded-full bg-[#0058bc] text-white font-bold text-[17px] shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
        ${l("checkCircle2","w-5 h-5")}
        <span>Confirmar Aporte</span>
      </button>
      <button id="aporte-cancel-btn" type="button" class="w-full mt-3 text-[#6b7d98] font-medium text-base cursor-pointer hover:text-[#0058bc]">Cancelar</button>
    </div>
  `,document.getElementById("aporte-modal-close").onclick=()=>u.modalAporteGoal.classList.add("hidden"),document.getElementById("aporte-cancel-btn").onclick=()=>u.modalAporteGoal.classList.add("hidden");let a=document.getElementById("aporte-input");u.modalAporteGoal.querySelectorAll(".aporte-quick-btn").forEach(s=>{s.onclick=()=>{let o=parseInt(s.dataset.quick,10);a.value=o.toLocaleString("es-CO")}}),a.oninput=()=>{let s=ye(a.value);a.value=s?s.toLocaleString("es-CO"):""},document.getElementById("aporte-submit-btn").onclick=async()=>{let s=ye(a.value);if(s<=0)return;let i=be().availableCash;if(s>i){E(`No puedes aportar m\xE1s de ${g(i,!0)} disponibles.`,"error");return}let f;try{let m=await L.contributeToGoal(e,s,"Manual");f=ga(e,s,"Manual",m)}catch(m){E(m.message||"No se pudo registrar el aporte","error");return}u.modalAporteGoal.classList.add("hidden"),Z(),f?.completed?wa(f.goalName):E(`\xA1Aporte de ${g(s)} registrado para ${t.name}!`)}}function Ta(){let e=n.currentUser;if(!e)return;let t=e.avatarUrl||"";u.modalEditProfile.classList.remove("hidden"),u.modalEditProfile.innerHTML=`
    <div class="bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100vh-4px)] overflow-y-auto">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">Editar Informaci\xF3n Personal</h3>
        <button id="edit-profile-close" aria-label="Cerrar" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <div class="flex flex-col items-center gap-3 mb-7">
        <div id="profile-modal-avatar-preview">${W(e.name,t,"profile")}</div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <label class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef4ff] text-[#0058bc] text-sm font-semibold cursor-pointer active:scale-95 transition-all">
            ${l("camera","w-4 h-4")}
            <span>Subir foto</span>
            <input id="input-profile-avatar" type="file" accept="image/*" class="sr-only" />
          </label>
          <button id="remove-profile-avatar-btn" type="button" aria-label="Quitar foto de perfil" ${t?"":"disabled"} class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${t?"bg-[#fff0f2] text-[#e61e4d] cursor-pointer active:scale-95":"bg-[#f1f5fa] text-[#a5b4c7] cursor-not-allowed"}">
            ${l("x","w-4 h-4")}
            <span>Quitar foto</span>
          </button>
        </div>
        <p id="profile-avatar-hint" class="text-xs text-[#8da0bd] text-center">${t?"Foto de perfil seleccionada":`Mostrando iniciales "${Te(e.name)}" seg\xFAn tu nombre`}</p>
      </div>

      <div class="flex flex-col gap-3">
        <div>
          <label class="text-sm font-medium text-[#607797]">Nombre completo</label>
          <input id="edit-name-input" type="text" value="${e.name}" class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#26364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div>
          <label class="text-sm font-medium text-[#607797]">Correo electr\xF3nico</label>
          <input id="edit-email-input" type="email" value="${e.email}" class="w-full mt-1.5 h-12 px-4 rounded-2xl border border-[#dce5ef] bg-[#f7f9fc] text-sm font-semibold text-[#26364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <div class="grid grid-cols-2 gap-3 pt-3">
          <button id="edit-profile-cancel-btn" class="h-12 rounded-full bg-[#eff4f8] text-[#50627b] font-semibold text-sm active:scale-95 transition-all cursor-pointer">Cancelar</button>
          <button id="edit-profile-save-btn" type="button" aria-label="Guardar perfil" class="h-12 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Guardar Cambios</button>
        </div>
      </div>
    </div>
  `;let a=()=>u.modalEditProfile.classList.add("hidden");document.getElementById("edit-profile-close").onclick=a,document.getElementById("edit-profile-cancel-btn").onclick=a;let s=document.getElementById("input-profile-avatar"),o=document.getElementById("profile-modal-avatar-preview"),i=document.getElementById("edit-name-input"),f=document.getElementById("profile-avatar-hint"),m=document.getElementById("remove-profile-avatar-btn"),v=()=>{let r=i.value.trim()||e.name;m&&(m.disabled=!t,m.classList.toggle("bg-[#fff0f2]",!!t),m.classList.toggle("text-[#e61e4d]",!!t),m.classList.toggle("cursor-pointer",!!t),m.classList.toggle("active:scale-95",!!t),m.classList.toggle("bg-[#f1f5fa]",!t),m.classList.toggle("text-[#a5b4c7]",!t),m.classList.toggle("cursor-not-allowed",!t)),t?f.textContent="Foto de perfil seleccionada":(o.innerHTML=W(r,"","profile"),f.textContent=`Mostrando iniciales "${Te(r)}" seg\xFAn tu nombre`)};i.oninput=v,s&&(s.onchange=async r=>{let p=r.target.files?.[0];if(p)try{t=await ot(p),o.innerHTML=W(i.value||e.name,t,"profile"),v()}catch($){t="",s.value="",v(),E($.message||"No se pudo cargar la imagen","error")}}),m?.addEventListener("click",()=>{t&&(t="",s&&(s.value=""),v())}),v();let d=async r=>{r?.preventDefault();let p=document.getElementById("edit-name-input").value.trim(),$=document.getElementById("edit-email-input").value.trim(),w=document.getElementById("edit-profile-save-btn");if(!p){E("Escribe tu nombre para continuar","error"),i.focus();return}w.disabled=!0,w.classList.add("opacity-70","cursor-wait"),w.textContent="Guardando\u2026";try{let S=await L.updateProfile({name:p,email:$,avatarUrl:t});n.currentUser=S.user,u.modalEditProfile.classList.add("hidden"),Me(),nt(),E("Perfil actualizado")}catch(S){E(S.message||"No se pudo actualizar el perfil","error")}finally{w.disabled=!1,w.classList.remove("opacity-70","cursor-wait"),w.textContent="Guardar Cambios"}};u.modalEditProfile.onclick=r=>{let p=r.target;p instanceof Element&&p.closest("#edit-profile-save-btn")&&d(r)}}function Ba(e){let t=Number(e.limit)||0;u.modalEditBudget.classList.remove("hidden"),u.modalEditBudget.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <div>
          <h3 class="font-bold text-sm text-[#0b1c30]">L\xEDmite de ${e.category}</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">Presupuesto mensual de la categor\xEDa</p>
        </div>
        <button id="edit-category-budget-close" type="button" aria-label="Cerrar presupuesto de categor\xEDa" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <div class="flex flex-col gap-1">
        <label for="edit-category-budget-input" class="text-xs font-bold text-[#0b1c30]">L\xEDmite mensual (COP)</label>
        <input id="edit-category-budget-input" type="text" inputmode="numeric" value="${t?t.toLocaleString("es-CO"):""}" placeholder="ej. 700.000" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
      </div>

      <div class="flex gap-2 pt-1">
        <button id="edit-category-budget-cancel" type="button" class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs cursor-pointer">Cancelar</button>
        <button id="edit-category-budget-save" type="button" class="flex-1 py-2.5 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/20 cursor-pointer">Guardar l\xEDmite</button>
      </div>
    </div>
  `;let a=()=>u.modalEditBudget.classList.add("hidden");document.getElementById("edit-category-budget-close").onclick=a,document.getElementById("edit-category-budget-cancel").onclick=a;let s=document.getElementById("edit-category-budget-input");s.oninput=()=>{let o=parseInt(s.value.replace(/\D/g,""),10);s.value=Number.isNaN(o)?"":o.toLocaleString("es-CO")},document.getElementById("edit-category-budget-save").onclick=async()=>{let o=parseInt(s.value.replace(/\D/g,""),10)||0;try{await L.updateCategoryBudget(e.category,o),e.limit=o,z(),a(),Ee(),E(`L\xEDmite de ${e.category} actualizado`)}catch(i){E(i.message||"No se pudo actualizar el l\xEDmite","error")}}}function La(){let e=n.currentUser;if(!e)return;let t=e.monthlyBudgetLimit||e.monthlySalary||0;u.modalEditBudget.classList.remove("hidden"),u.modalEditBudget.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Modificar L\xEDmite Mensual</h3>
        <button id="edit-budget-close" type="button" aria-label="Cerrar ajuste de salario" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${l("x","w-4 h-4")}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">Este valor se utiliza para calcular autom\xE1ticamente tu regla 50/30/20 y l\xEDmites del mes.</p>
        
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">L\xEDmite mensual (COP)</label>
          <input id="edit-salary-input" type="text" value="${t.toLocaleString("es-CO")}" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <button id="edit-budget-save-btn" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar l\xEDmite
        </button>
      </div>
    </div>
  `,document.getElementById("edit-budget-close").onclick=()=>u.modalEditBudget.classList.add("hidden");let a=document.getElementById("edit-salary-input");a.oninput=()=>{let s=parseInt(a.value.replace(/\D/g,""),10);a.value=isNaN(s)?"":s.toLocaleString("es-CO")},document.getElementById("edit-budget-save-btn").onclick=async()=>{let s=parseInt(a.value.replace(/\D/g,""),10)||0,o=await L.updateProfile({monthlyBudgetLimit:s});n.currentUser=o.user,await ie(),n.currentUser=n.currentUser||o.user,u.modalEditBudget.classList.add("hidden"),U(),E("L\xEDmite mensual actualizado")}}function tt(e){u.modalSearch.classList.toggle("hidden",!e),document.documentElement.classList.toggle("search-open",e),document.body.classList.toggle("search-open",e)}function Oa(){u.searchInputIcon.innerHTML=l("search","w-4 h-4 text-slate-400"),u.searchCloseBtn.innerHTML=l("x","w-4 h-4"),u.headerSearchBtn.onclick=()=>{tt(!0),u.searchInput.value="",u.searchInput.focus(),Tt("")},u.searchCloseBtn.onclick=()=>{tt(!1)},u.searchInput.oninput=e=>{Tt(e.target.value)}}function Tt(e){let t=e.trim().toLowerCase();if(!t){u.searchResultsList.innerHTML=`
      <p class="text-xs text-slate-400 py-4 text-center">
        Escribe para buscar cualquier movimiento registrado...
      </p>
    `;return}let a=n.transactions.filter(s=>s.description.toLowerCase().includes(t)||s.category.toLowerCase().includes(t)||String(s.amount).includes(t));if(a.length===0){u.searchResultsList.innerHTML=`
      <p class="text-xs text-slate-400 py-4 text-center">
        No se encontraron movimientos con "${e}"
      </p>
    `;return}u.searchResultsList.innerHTML=`
    <div class="divide-y divide-slate-100">
      ${a.map(s=>`
        <div data-search-tx="${s.id}" class="search-item-row py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
          <div>
            <p class="font-semibold text-slate-800">${s.description}</p>
            <p class="text-[11px] text-slate-500">${s.category} \u2022 ${s.date}</p>
          </div>
          <span class="font-semibold tabular-nums ${s.type==="ingreso"?"text-[#006c49]":"text-slate-800"}">
            ${s.type==="ingreso"?"+":"-"}${g(s.amount)} COP
          </span>
        </div>
      `).join("")}
    </div>
  `,u.searchResultsList.querySelectorAll(".search-item-row").forEach(s=>{s.onclick=()=>{tt(!1);let o=n.transactions.find(i=>i.id===s.dataset.searchTx);o&&_e(o)}})}function Pa(){window.addEventListener("keydown",e=>{if(!n.quickAdd.isOpen)return;let t=document.activeElement;if(t&&t.tagName.toLowerCase()==="input"&&t.type==="text"){e.key==="Escape"&&(u.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open"));return}if(e.key>="0"&&e.key<="9")e.preventDefault(),n.quickAdd.rawValue==="0"?n.quickAdd.rawValue=e.key:n.quickAdd.rawValue.length<10&&(n.quickAdd.rawValue+=e.key),X();else if(e.key==="Backspace")e.preventDefault(),n.quickAdd.rawValue.length<=1?n.quickAdd.rawValue="0":n.quickAdd.rawValue=n.quickAdd.rawValue.slice(0,-1),X();else if(e.key==="Escape")u.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open");else if(e.key==="Enter"){e.preventDefault();let a=document.getElementById("qa-submit-btn");a&&a.click()}})}async function Bt(){if(u.fabBtn.innerHTML=l("plus","w-7 h-7 text-white"),u.fabBtn.onclick=()=>Xe("gasto"),u.headerBrand.onclick=()=>G("inicio"),u.headerProfileBtn.onclick=()=>G("perfil"),Oa(),Pa(),xa(),Sa()){n.currentUser=null,U();return}let t=ia(),a=localStorage.getItem("miplata_bootstrap_cache");U();try{let s=await ie(),o=localStorage.getItem("miplata_bootstrap_cache");s&&(!t||a!==o)&&U()}catch(s){console.warn("Initial session check error",s)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Bt):Bt();export{U as renderApp,E as showToast};
