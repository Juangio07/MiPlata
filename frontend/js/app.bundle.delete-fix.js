var nt="",Ge="miplata_supabase_session",fe="miplata_bootstrap_cache",It="demo@miplata.app";var pe=new Map;function $e(e){let t=String(e?.imageUrl||"");if(t.startsWith("data:")&&t.length>6e5)throw new Error("La imagen es demasiado grande. Elige una imagen m\xE1s peque\xF1a")}async function ot(e,t={},a=15e3){let s=new AbortController,o=window.setTimeout(()=>s.abort(),a);try{return await fetch(e,{...t,signal:s.signal})}catch(i){throw i?.name==="AbortError"?new Error("El servidor tard\xF3 demasiado en responder. Intenta nuevamente."):i}finally{window.clearTimeout(o)}}var $=null;function Ee(e){return String(e?.email||"").trim().toLowerCase()===It||String(e?.name||"").trim().toLowerCase()==="fixelar"}function q(e){return e===void 0?void 0:JSON.parse(JSON.stringify(e))}function me(e){return`${e}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}function ke(){return new Date().toISOString().slice(0,10)}function Ct(){if(!P())return 0;let e=$.transactions.filter(s=>s.type==="ingreso").reduce((s,o)=>s+(Number(o.amount)||0),0),t=$.transactions.filter(s=>s.type==="gasto").reduce((s,o)=>s+(Number(o.amount)||0),0),a=$.goalContributions.filter(s=>String(s.date||"").startsWith(ke().slice(0,7))).reduce((s,o)=>s+(Number(o.amount)||0),0);return Math.max(0,e-t-a)}function tt(e){if(!e?.user||!Ee(e.user))return $=null,null;let t=q(e.goalContributions||[]);return $={isDemo:!0,user:q(e.user),transactions:q(e.transactions||[]),fixedObligations:q(e.fixedObligations||[]),savingsGoals:q(e.savingsGoals||[]),goalContributions:t,categoryBudgets:q(e.categoryBudgets||[]),availableMonths:q(e.availableMonths||[])},$}function P(){if(!$)try{let e=JSON.parse(localStorage.getItem(fe)||"null");e?.user&&Ee(e.user)&&tt(e)}catch{}return!!$?.isDemo}function At(){return P()?q({user:$.user,transactions:$.transactions,fixedObligations:$.fixedObligations,savingsGoals:$.savingsGoals,goalContributions:$.goalContributions,categoryBudgets:$.categoryBudgets,availableMonths:$.availableMonths}):null}function be(){try{let e=localStorage.getItem(Ge);return e?JSON.parse(e):null}catch{return null}}function it(e){e?.access_token&&localStorage.setItem(Ge,JSON.stringify(e))}function ne(){localStorage.removeItem(Ge),localStorage.removeItem("miplata_current_user_id"),localStorage.removeItem("miplata_user_cache"),localStorage.removeItem(fe),$=null}function jt(){let e=be(),t={"Content-Type":"application/json"};return e?.access_token&&(t.Authorization=`Bearer ${e.access_token}`),t}var Me=null;async function at(){let e=be();return e?.refresh_token?(Me||(Me=ot(`${nt}/api/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:e.refresh_token})}).then(async t=>{if(!t.ok)return!1;let a=await t.json();return a.session?.access_token?(it({...e,...a.session}),!0):!1}).catch(()=>!1).finally(()=>{Me=null})),Me):!1}function Tt(e){let t=Number(e?.expires_at||0);return t?t<=Math.floor(Date.now()/1e3)+45:!1}function st(){window.dispatchEvent(new CustomEvent("miplata:auth-expired"))}async function T(e,t={},a=!0){let s=String(t.method||"GET").toUpperCase(),o=a&&s!=="GET"&&s!=="HEAD"?`${s}:${e}:${t.body||""}`:"";if(o&&pe.has(o))return pe.get(o);let d=(async()=>{try{let g=be();if(a&&g?.access_token&&Tt(g)&&!await at())return ne(),st(),new Response(JSON.stringify({error:"Tu sesi\xF3n expir\xF3. Ingresa nuevamente."}),{status:401,headers:{"Content-Type":"application/json"}});let c={...jt(),...t.headers||{}},u=await ot(`${nt}${e}`,{...t,headers:c});if(u.status===401&&a&&e!=="/api/auth/refresh"){if(await at()){let b=await T(e,t,!1);if(b.status!==401)return b}ne(),st()}return u}catch(g){if(a&&s==="GET")return await new Promise(c=>window.setTimeout(c,250)),T(e,t,!1);throw g}})();if(!o)return d;pe.set(o,d);try{return await d}finally{pe.get(o)===d&&pe.delete(o)}}async function L(e,t){let a=await e.json().catch(()=>({}));return e.status===401?"Tu sesi\xF3n expir\xF3. Ingresa nuevamente para continuar.":a.error||t}function Re(e){if(e?.session?.access_token&&it(e.session),e?.user?.id){try{let t=JSON.parse(localStorage.getItem(fe)||"null");t?.user?.id&&t.user.id!==e.user.id&&localStorage.removeItem(fe)}catch{localStorage.removeItem(fe)}localStorage.setItem("miplata_current_user_id",e.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(e.user))}}var O={async getBootstrap(){let e=JSON.parse(localStorage.getItem(fe)||"null");if(!be()?.access_token)return e?.user&&Ee(e.user)?(tt(e),At()):(ne(),null);let s=At();if(s)return s;if(e?.user&&Ee(e.user)){let o=tt(e);if(o)return At()}let t=await T("/api/bootstrap");if(t.status===401)return null;if(!t.ok)throw new Error(await L(t,"No se pudo cargar la aplicaci\xF3n"));let a=await t.json();Ee(a.user)&&tt(a),a.user&&(localStorage.setItem("miplata_current_user_id",a.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(a.user)));try{localStorage.setItem(fe,JSON.stringify(a))}catch{}return a},async getMonthlyReport(e){let t=await T(`/api/reports/monthly?month=${encodeURIComponent(e)}`);if(!t.ok)throw new Error(await L(t,"No se pudo cargar el reporte mensual"));return t.json()},async getCurrentUser(){if(!be()?.access_token)return ne(),null;if(P())return q($.user);try{let e=await T("/api/user");if(e.status===401)return null;if(!e.ok)throw new Error("No se pudo consultar el usuario");let t=await e.json();return t.user&&(localStorage.setItem("miplata_current_user_id",t.user.id),localStorage.setItem("miplata_user_cache",JSON.stringify(t.user))),t.user}catch(e){return console.warn("API get user failed",e),null}},async loginDemo(){let e=await T("/api/auth/demo",{method:"POST"},!1);if(!e.ok)throw new Error(await L(e,"Error al iniciar demo"));let t=await e.json();return Re(t),t.bootstrap&&tt(t.bootstrap),t},async login(e,t){let a=await T("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:t})},!1);if(!a.ok)throw new Error(await L(a,"Credenciales incorrectas"));let s=await a.json();return $=null,Re(s),s},async register(e,t,a,s,o){$e({imageUrl:o});let i=await T("/api/auth/register",{method:"POST",body:JSON.stringify({name:e,email:t,password:a,monthlySalary:s,avatarUrl:o})},!1);if(i.status===409)throw new Error("Este correo ya est\xE1 registrado. Inicia sesi\xF3n o usa otro correo.");if(!i.ok)throw new Error(await L(i,"Error al crear cuenta"));let d=await i.json();return $=null,Re(d),d},async requestPasswordReset(e,t){let a=await T("/api/auth/password-reset/request",{method:"POST",body:JSON.stringify({email:e,redirectTo:t})});if(!a.ok)throw new Error(await L(a,"No se pudo enviar el enlace de recuperaci\xF3n"));return a.json()},async confirmPasswordReset(e,t){let a=await T("/api/auth/password-reset/confirm",{method:"POST",body:JSON.stringify({accessToken:e,password:t})});if(!a.ok)throw new Error(await L(a,"No se pudo actualizar la contrase\xF1a"));return a.json()},async logout(){try{await T("/api/auth/logout",{method:"POST"},!1)}catch(e){console.warn("Logout error",e)}ne()},async updateProfile(e){if($e(e),P())return $.user={...$.user,...q(e)},e.budgetRule&&($.user.budgetRule={...$.user.budgetRule||{},...q(e.budgetRule)}),{user:q($.user),message:"Perfil actualizado"};let t=await T("/api/user/profile",{method:"PUT",body:JSON.stringify(e)});if(!t.ok)throw new Error(await L(t,"Error al actualizar perfil"));let a=await t.json();return a.user&&localStorage.setItem("miplata_user_cache",JSON.stringify(a.user)),a},async updateInitialBalance(e){if(P())return $.user.initialBalance=Number(e)||0,{user:q($.user),message:"Saldo disponible base actualizado"};let t=await T("/api/user/balance",{method:"PUT",body:JSON.stringify({initialBalance:e})});if(!t.ok)throw new Error(await L(t,"Error al actualizar saldo"));let a=await t.json();return a.user&&localStorage.setItem("miplata_user_cache",JSON.stringify(a.user)),a},async resetUserData(){if(P())return{message:"Los datos demo se restauran al recargar la p\xE1gina"};let e=await T("/api/user/reset",{method:"POST"});if(!e.ok)throw new Error(await L(e,"Error al reiniciar datos"));return e.json()},async deleteAccount(){if(P())return{protected:!0,message:"La cuenta demo est\xE1 protegida y no se puede eliminar"};let e=await T("/api/user",{method:"DELETE"});if(!e.ok)throw new Error(await L(e,"Error al eliminar cuenta"));return ne(),e.json()},async getTransactions(){if(P())return q($.transactions);let e=await T("/api/transactions");if(!e.ok)throw new Error(await L(e,"Error al obtener movimientos"));return e.json()},async addTransaction(e){if(P()){let a=e.id||me("tx_demo");return $.transactions.push({...q(e),id:a,userId:$.user.id,createdAt:e.createdAt||Date.now()}),{id:a,message:"Movimiento registrado con \xE9xito"}}let t=await T("/api/transactions",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await L(t,"Error al registrar movimiento"));return t.json()},async updateTransaction(e,t){if(P()){let s=$.transactions.find(o=>o.id===e);return s&&Object.assign(s,q(t)),{message:"Movimiento actualizado"}}let a=await T(`/api/transactions/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await L(a,"Error al actualizar movimiento"));return a.json()},async getFixedObligations(){if(P())return q($.fixedObligations);let e=await T("/api/fixed-obligations");if(!e.ok)throw new Error(await L(e,"Error al obtener fijos"));return e.json()},async addFixedObligation(e){if(P()){let a=e.id||me("fix_demo");return $.fixedObligations.push({...q(e),id:a,userId:$.user.id,paidDate:e.paidDate||null}),{id:a,message:"Nuevo gasto fijo agregado"}}let t=await T("/api/fixed-obligations",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await L(t,"Error al agregar fijo"));return t.json()},async updateFixedObligation(e,t){if(P()){let s=$.fixedObligations.find(o=>o.id===e);return s&&Object.assign(s,q(t)),{message:"Compromiso recurrente actualizado"}}let a=await T(`/api/fixed-obligations/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await L(a,"Error al actualizar fijo"));return a.json()},async deleteFixedObligation(e){if(P())return $.fixedObligations=$.fixedObligations.filter(a=>a.id!==e),$.transactions=$.transactions.filter(a=>a.fixedObligationId!==e),{message:"Obligaci\xF3n eliminada"};let t=await T(`/api/fixed-obligations/${e}`,{method:"DELETE"});if(!t.ok)throw new Error(await L(t,"Error al eliminar fijo"));return t.json()},async togglePayFixedObligation(e){if(P()){let a=$.fixedObligations.find(d=>d.id===e);if(!a)throw new Error("Obligaci\xF3n no encontrada");let s=a.status!=="paid",c=Ct();if(s&&Number(a.amount)>c)throw new Error(`No tienes suficiente dinero disponible para pagar este gasto fijo. Te quedan $${c.toLocaleString("es-CO")} COP`);a.status=s?"paid":"pending",a.paidDate=s?ke():null;let o=$.transactions.some(d=>d.fixedObligationId===e),i=$.transactions.find(d=>d.fixedObligationId===e)?.id||null;return s&&!o?(i=me(`tx_fix_${e}`),$.transactions.push({id:i,userId:$.user.id,type:"gasto",amount:Number(a.amount)||0,category:a.category,description:`${a.name} (Gasto Fijo)`,date:ke(),time:new Date().toTimeString().slice(0,8),accountMethod:"Fijo Mensual",isRecurring:!0,fixedObligationId:e,createdAt:Date.now()})):s||($.transactions=$.transactions.filter(d=>d.fixedObligationId!==e)),{result:{status:a.status,isPaid:s,transactionId:i},message:s?"Marcado como pagado e integrado a gastos.":"Gasto fijo desmarcado (vuelve a pendiente)."}}let t=await T(`/api/fixed-obligations/${e}/toggle`,{method:"POST"});if(!t.ok)throw new Error(await L(t,"Error al cambiar estado de pago"));return t.json()},async getSavingsGoals(){if(P())return q($.savingsGoals);let e=await T("/api/savings-goals");if(!e.ok)throw new Error(await L(e,"Error al obtener metas"));return e.json()},async addSavingsGoal(e){if($e(e),P()){let a=e.id||me("goal_demo");return $.savingsGoals.push({...q(e),id:a,userId:$.user.id,currentAmount:0,imageUrl:e.imageUrl||""}),{id:a,message:`Meta "${e.name}" creada con \xE9xito`}}let t=await T("/api/savings-goals",{method:"POST",body:JSON.stringify(e)});if(!t.ok)throw new Error(await L(t,"Error al crear meta"));return t.json()},async updateSavingsGoal(e,t){if($e(t),P()){let s=$.savingsGoals.find(o=>o.id===e);if(s){let o={...q(t)};delete o.currentAmount,Object.assign(s,o)}return{message:"Meta actualizada"}}let a=await T(`/api/savings-goals/${e}`,{method:"PUT",body:JSON.stringify(t)});if(!a.ok)throw new Error(await L(a,"Error al actualizar meta"));return a.json()},async deleteSavingsGoal(e){if(P())return $.savingsGoals=$.savingsGoals.filter(a=>a.id!==e),$.goalContributions=$.goalContributions.filter(a=>a.goalId!==e),{message:"Meta de ahorro eliminada"};let t=await T(`/api/savings-goals/${e}`,{method:"DELETE"});if(!t.ok)throw new Error(await L(t,"Error al eliminar meta"));return t.json()},async contributeToGoal(e,t,a="Manual"){if(P()){let o=$.savingsGoals.find(x=>x.id===e);if(!o)throw new Error("Meta no encontrada");let i=Number(t);if(!Number.isFinite(i)||i<=0)throw new Error("El monto debe ser mayor a 0");let d=Ct();if(i>d)throw new Error(`No tienes suficiente dinero disponible. Te quedan $${d.toLocaleString("es-CO")} COP`);let c=$.goalContributions.filter(x=>x.goalId===e).reduce((x,b)=>x+(Number(b.amount)||0),0)+i;o.currentAmount=c;let u=me("contrib_demo");return $.goalContributions.unshift({id:u,userId:$.user.id,goalId:e,goalName:o.name,amount:i,date:ke(),type:a,timestamp:Date.now()}),{result:{goalId:e,newAmount:c,contributionId:u},message:`\xA1Has reservado $${Number(t||0).toLocaleString("es-CO")} COP para tu meta!`}}let s=await T(`/api/savings-goals/${e}/contribute`,{method:"POST",body:JSON.stringify({amount:t,type:a})});if(!s.ok)throw new Error(await L(s,"Error al registrar aporte"));return s.json()},async getGoalContributions(){if(P())return q($.goalContributions);let e=await T("/api/goal-contributions");if(!e.ok)throw new Error(await L(e,"Error al obtener aportes"));return e.json()},async getCategoryBudgets(){if(P())return q($.categoryBudgets);let e=await T("/api/category-budgets");if(!e.ok)throw new Error(await L(e,"Error al obtener presupuestos"));return e.json()},async updateCategoryBudget(e,t){if(P()){let s=$.categoryBudgets.find(o=>o.category===e);return s&&(s.limit=Number(t)||0),{message:`Presupuesto para ${e} actualizado`}}let a=await T("/api/category-budgets",{method:"PUT",body:JSON.stringify({category:e,limit:t})});if(!a.ok)throw new Error(await L(a,"Error al actualizar presupuesto"));return a.json()}};var oe=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];function f(e,t=!1){let s=(typeof e=="string"?parseInt(e.replace(/\D/g,"")||"0",10):Math.round(e||0)).toLocaleString("es-CO");return t?`$${s} COP`:`$${s}`}function _e(e){let t=Math.round(e||0);return t>=1e6?`$${(t/1e6).toFixed(1).replace(".0","")}M`:t>=1e3?`$${(t/1e3).toFixed(0)}k`:`$${t}`}function ge(e){if(!e)return 0;let t=String(e).replace(/\D/g,"");return t?parseInt(t,10):0}function He(){let e=new Date,t=e.getHours(),a=e.getMinutes(),s=t>=12?"PM":"AM";t=t%12,t=t||12;let o=a<10?`0${a}`:a;return`${t}:${o} ${s}`}function Z(){let e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),s=String(e.getDate()).padStart(2,"0");return`${t}-${a}-${s}`}function Se(e){if(!e||!e.trim())return"MP";let a=e.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,"").split(/\s+/).filter(Boolean);return a.length===0?"MP":a.length===1?a[0].substring(0,2).toUpperCase():(a[0][0]+a[a.length-1][0]).toUpperCase()}function _(){let e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0");return`${t}-${a}`}function ee(e){if(!e||!e.includes("-")){let i=new Date;return`${oe[i.getMonth()]} ${i.getFullYear()}`}let[t,a]=e.split("-"),s=parseInt(a,10)-1;return`${oe[s]||a} ${t}`}function Ie(e="h-8 w-auto object-contain"){return`<img src="assets/optimized/Imagotipo.png" alt="MiPlata" width="434" height="144" fetchpriority="high" decoding="async" class="${e} select-none transition-transform duration-200 hover:scale-105" />`}function Ce(e="h-6 w-auto object-contain"){return`<img src="assets/optimized/ImagotipoOscuroFixelar.png" alt="Fixelar" width="434" height="144" loading="lazy" decoding="async" class="${e} select-none" />`}var rt={home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',trendingUp:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',trendingDown:'<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',receiptText:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',fileText:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',calendarCheck:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>',piggyBank:'<path d="M4 10V8a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v1h1.5a1.5 1.5 0 0 1 0 3H19a7 7 0 0 1-6 3.5H9A7 7 0 0 1 3 13H2a1.5 1.5 0 0 1 0-3h2Z"/><path d="M7 16v5M17 16v5M8 3 7 1M16 3l1-2M10 8h.01M15 8h.01M12 3v2"/><path d="M20 9c1.5 0 2.5-1 3-2"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="m9 15 8-8"/><path d="M14 7h3v3"/>',user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06A1.7 1.7 0 0 0 16.44 18l-.16.07a1.7 1.7 0 0 0-1.03 1.56V19.7h-2.02v-.08A1.7 1.7 0 0 0 12.2 18l-.16-.07a1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.08 15l-.07-.16a1.7 1.7 0 0 0-1.56-1.03h-.08v-2.02h.08A1.7 1.7 0 0 0 9.01 10.8l.07-.16a1.7 1.7 0 0 0-.34-1.88l-.06-.06L10.1 7.28l.06.06a1.7 1.7 0 0 0 1.88.34l.16-.07a1.7 1.7 0 0 0 1.03-1.56v-.08h2.02v.08a1.7 1.7 0 0 0 1.03 1.56l.16.07a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06a1.7 1.7 0 0 0-.34 1.88l.07.16a1.7 1.7 0 0 0 1.56 1.03h.08v2.02h-.08A1.7 1.7 0 0 0 19.47 15l-.07.16Z"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',shieldCheck:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',eyeOff:'<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',plusCircle:'<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',arrowDownCircle:'<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/>',flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',pieChart:'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',bellRing:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/>',chevronRight:'<path d="m9 18 6-6-6-6"/>',chevronLeft:'<path d="m15 18-6-6 6-6"/>',chevronDown:'<path d="m6 9 6 6 6-6"/>',arrowUpRight:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',calendarDays:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',laptop:'<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',utensils:'<path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V2"/><path d="M9 2v4a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M12 14v8"/>',apple:'<path d="M12 20.5c-4.2 0-7-4.4-7-8.1C5 9.5 7.3 7 10.1 7c.9 0 1.8.4 2.4.4S14 7 15 7c2.8 0 5 2.2 5 5.4 0 3.7-2.8 8.1-7 8.1Z"/><path d="M12.5 6C12.2 4.2 13.3 2.8 15 2"/>',pizzaSlice:'<path d="M4 20 8.6 6.2c.35-1.05 1.7-1.4 2.5-.6l8.3 8.3c.8.8.45 2.15-.6 2.5L4 20Z"/><path d="M9.2 8.4a8.9 8.9 0 0 1 7.7 7.7"/><circle cx="10.2" cy="14.9" r="1"/><circle cx="13.8" cy="11.9" r="1"/><circle cx="16.5" cy="15.2" r="1"/>',bowlFood:'<path d="M4 10h16"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M7 15h10"/><path d="M8 5c0 1.5 1 2 1 3"/><path d="M12 3c0 1.5 1 2 1 3"/><path d="M16 5c0 1.5 1 2 1 3"/>',forkKnife:'<path fill="currentColor" stroke="none" d="M4 3h2v7h1V3h2v7h1V3h2v7c0 2.2-1.3 3.8-3 4.3V21H7v-6.7c-1.7-.5-3-2.1-3-4.3V3Z"/><path fill="currentColor" stroke="none" d="M17 3c3 1 4 3.8 4 6v12h-2V13h-4V8c0-2.3.7-4.1 2-5Z"/>',shoppingBag:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',heartPulse:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',gamepad2:'<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>',graduationCap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',moreHorizontal:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',moreVertical:'<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',sliders:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>',wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',check:'<path d="M20 6 9 17l-5-5"/>',checkCircle2:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',alertCircle:'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',alertTriangle:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',trash2:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',edit2:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',edit3:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',briefcase:'<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',building2:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',dollarSign:'<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',sparkles:'<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',wifi:'<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>',droplet:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',landmark:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',tv:'<rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>',smartphone:'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',creditCard:'<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',banknote:'<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',deleteKey:'<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',share2:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',arrowLeft:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',fileSpreadsheet:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',printer:'<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',keyboard:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M18 16H6"/>',coins:'<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',logOut:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',calendar:'<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',rotateCcw:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',lightbulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'};function r(e,t="w-5 h-5"){let a=rt[e]||rt.moreHorizontal;return`<svg class="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a}</svg>`}function Fe(e,t="w-5 h-5"){switch(e){case"Alimentaci\xF3n":return`<span class="text-amber-600">${r("pizzaSlice",t)}</span>`;case"Transporte":return`<span class="text-emerald-600">${r("car",t)}</span>`;case"Compras":return`<span class="text-indigo-600">${r("shoppingBag",t)}</span>`;case"Servicios":return`<span class="text-sky-600">${r("zap",t)}</span>`;case"Salud":return`<span class="text-blue-600">${r("heartPulse",t)}</span>`;case"Entretenimiento":return`<span class="text-rose-600">${r("gamepad2",t)}</span>`;case"Educaci\xF3n":return`<span class="text-purple-600">${r("graduationCap",t)}</span>`;case"N\xF3mina":return`<span class="text-[#006c49]">${r("briefcase",t)}</span>`;case"Honorarios":return`<span class="text-[#0058bc]">${r("dollarSign",t)}</span>`;case"Negocio":return`<span class="text-amber-700">${r("building2",t)}</span>`;case"Inversi\xF3n":return`<span class="text-purple-700">${r("trendingUp",t)}</span>`;default:return`<span class="text-slate-600">${r("moreHorizontal",t)}</span>`}}function lt(){let e=new Date().getHours(),t=e>=5&&e<14;return{slot:t?"morning":"evening",label:t?"Turno Ma\xF1ana":"Turno Tarde/Noche",periodBadge:t?"\u2600\uFE0F Ma\xF1ana":"\u{1F319} Tarde/Noche",focusText:t?"Planeaci\xF3n y presupuesto diario":"Ahorro y balance de jornada",icon:t?"sun":"moon"}}function Ue(e,t=new Date().getDate()){let a=e.dueDay,s=a-t;if(s<0){let o=Math.abs(s);return{obligation:e,daysDiff:o,status:"overdue",label:o===1?`Venci\xF3 ayer (D\xEDa ${a})`:`Venci\xF3 hace ${o} d\xEDas (D\xEDa ${a})`,badgeColor:"bg-rose-100 text-rose-700 border-rose-200"}}return s===0?{obligation:e,daysDiff:0,status:"today",label:`\xA1Vence hoy! (D\xEDa ${a})`,badgeColor:"bg-amber-100 text-amber-800 border-amber-200 animate-pulse"}:s<=3?{obligation:e,daysDiff:s,status:"upcoming",label:s===1?`Vence ma\xF1ana (D\xEDa ${a})`:`Vence en ${s} d\xEDas (D\xEDa ${a})`,badgeColor:"bg-orange-100 text-orange-800 border-orange-200"}:{obligation:e,daysDiff:s,status:"far",label:`Vence el D\xEDa ${a}`,badgeColor:"bg-slate-100 text-slate-700 border-slate-200"}}function ct(e){let t=new Date().getDate();return e.filter(s=>s.status==="pending").map(s=>Ue(s,t)).sort((s,o)=>{let i=g=>g.status==="today"?0:g.status==="overdue"?1:g.status==="upcoming"?2:3,d=i(s)-i(o);return d!==0?d:s.daysDiff-o.daysDiff})}function dt(e){let t=[],{currentUser:a=null,alert80Percent:s,fixedObligations:o=[],totalIncome:i=0,totalExpenses:d=0,availableCash:g=0,fixedCommitted:c=0,monthlyBudgetLimit:u=0,monthlyBudgetSpent:x=0,monthlyBudgetRemaining:b=0,monthlyBudgetPercent:k=0}=e,M=s??a?.alert80Percent??!0;if(u>0&&M)if(x>u){let S=x-u;t.push({id:"alert_budget_exceeded",type:"danger",title:`Presupuesto mensual superado (+${k}%)`,description:`Has gastado ${f(x)}, excediendo tu l\xEDmite por ${f(S,!0)}. Te recomendamos pausar compras no urgentes.`,actionLabel:"Ver gastos",actionTab:"gastos"})}else k>=80&&t.push({id:"alert_budget_80",type:"warning",title:`Presupuesto usado al ${k}%`,description:`Disponible: ${f(b,!0)}.`,actionLabel:"Controlar gastos",actionTab:"gastos"});i===0&&d>0&&t.push({id:"alert_no_income_registered",type:"info",title:"A\xFAn no registras ingresos este mes",description:`Tienes ${f(d)} en gastos. Registra tus ingresos recibidos para calcular con exactitud tu dinero disponible real.`,actionLabel:"Registrar ingreso",actionTab:"ingresos"});return t}function ut(e){let{currentUser:t,transactions:a=[],fixedObligations:s=[],savingsGoals:o=[],totalIncome:i=0,effectiveMonthlyIncome:d=0,totalExpenses:g=0,availableCash:c=0,fixedTotal:u=0}=e,x=[],F=s.filter(A=>A.status==="pending").reduce((A,N)=>A+(Number(N.amount)||0),0),b=t?.monthlyBudgetLimit||d||t?.monthlySalary||i||0,k=(t?.budgetRule?.savings||20)/100,M=(t?.budgetRule?.needs||50)/100,S=(t?.budgetRule?.wants||30)/100,neededBudget=b>0?Math.round(b*M):0,wantsBudget=b>0?Math.round(b*S):0,idealSavings=b>0?Math.round(b*k):0,plannedSavings=b>0?Math.min(idealSavings,Math.max(0,b-u-wantsBudget)):Math.round(Math.max(0,c)*.2),w=plannedSavings,I=w>0?Math.min(c,Math.max(1e3,Math.round(w/2/1e4)*1e4)):0;if(b>0){let A=Math.round(b*M),N=Math.round(b*S),Y=plannedSavings,z=Math.round(Y/2/1e4)*1e4;if(u>0&&u<=A){let se=A-u;x.push({id:"tip_distrib_healthy",tag:"Distribuci\xF3n 50/30/20",title:`Distribuci\xF3n ideal para tus ${f(b,!0)}/mes`,message:`Para tu salario de ${f(b)}, la regla ideal sugiere: Necesidades ${f(A)} (50%), Gustos ${f(N)} (30%) y Ahorro ${f(Y)} (20% o ${f(z,!0)} por quincena). Tus fijos actuales suman ${f(u)}, \xA1dej\xE1ndote ${f(se,!0)} de margen favorable en necesidades!`,actionLabel:"Ver distribuci\xF3n",actionTab:"perfil",iconType:"budget"})}else if(u>A){let se=u-A;x.push({id:"tip_distrib_high_fixed",tag:"Distribuci\xF3n 50/30/20",title:"Gastos fijos superan el 50% de tus ingresos",message:`Con un salario de ${f(b)}, el tope recomendado para fijos es ${f(A)}. Actualmente tienes ${f(u)} comprometidos (+${f(se,!0)} sobre lo ideal). Evaluar suscripciones o renegociar tarifas te devolver\xE1 ox\xEDgeno mensual.`,actionLabel:"Revisar fijos",actionTab:"obligaciones",iconType:"fixed"})}else x.push({id:"tip_distrib_overview",tag:"Distribuci\xF3n 50/30/20",title:`Tu f\xF3rmula mensual con salario de ${f(b,!0)}`,message:`La distribuci\xF3n recomendada para tu ingreso es: ${f(A)} en compromisos b\xE1sicos, ${f(N)} para entretenimiento y estilo de vida, y ${f(Y)} (${f(z,!0)} quincenal) para hacer crecer tus ahorros.`,actionLabel:"Configurar regla",actionTab:"perfil",iconType:"budget"})}let m=a.filter(A=>A.type==="gasto");if(m.length>0){let A={};m.forEach(z=>{A[z.category]=(A[z.category]||0)+z.amount});let N="",Y=0;if(Object.entries(A).forEach(([z,se])=>{se>Y&&(Y=se,N=z)}),N&&Y>0&&g>0){let z=Math.round(Y/g*100);x.push({id:"tip_category_focus",tag:"Concentraci\xF3n de Gastos",title:`${N} concentra el ${z}% de tus gastos`,message:`Has destinado ${f(Y,!0)} en ${N} este mes. Es tu categor\xEDa principal de consumo. Monitorear peque\xF1os consumos diarios aqu\xED es el camino m\xE1s r\xE1pido para liberar liquidez.`,actionLabel:`Ver ${N}`,actionTab:"gastos",iconType:"category"})}}let y=o.find(A=>A.currentAmount<A.targetAmount);if(y){let A=y.targetAmount-y.currentAmount,N=Math.min(A,c,Math.max(1e3,Math.round(c*.12/1e4)*1e4),I||c);c>=5e4&&N>=5e4&&x.push({id:"tip_goal_boost",tag:"Impulso a Metas",title:`Acelera tu meta "${y.name}"`,message:`Tienes ${f(c)} disponibles. Si apartas ${f(N,!0)}, tu meta alcanzará el ${Math.round((y.currentAmount+N)/y.targetAmount*100)}% sin superar tu saldo disponible.`,actionLabel:"Aportar ahora",actionTab:"metas",iconType:"goal"})}let v=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),B=Math.max(1,v-new Date().getDate()+1),D=Math.max(0,b-u-w),l=Math.max(0,Math.round(D/v/1e3)*1e3),h=b>0?Math.round(u/b*100):0,C=o.find(A=>/emergencia|emergency/i.test(A.name||"")),R=b>0?Math.round(b*3/1e5)*1e5:0,H=C?.currentAmount||0,j=o.find(A=>A.currentAmount<A.targetAmount),J=j?Math.max(0,j.targetAmount-j.currentAmount):0,we=j?Math.min(c,Math.max(1e3,Math.ceil(J/6/1e4)*1e4)):w;for([{id:"tip_daily_limit",tag:"Control diario",title:l>0?`Tu ritmo diario ideal es ${f(l,!0)}`:"Protege tu dinero disponible",message:l>0?`Despu\xE9s de separar ${f(u,!0)} para compromisos y ${f(w,!0)} para ahorro, puedes usar hasta ${f(l,!0)} por d\xEDa en gastos variables durante este mes.`:`Tu salario de ${f(b,!0)} ya est\xE1 muy comprometido. Antes de realizar compras no esenciales, revisa cu\xE1nto dinero queda disponible y prioriza tus pagos pendientes.`,actionLabel:"Ver gastos",actionTab:"gastos",iconType:"daily"},{id:"tip_fixed_ratio",tag:"Compromisos fijos",title:h<=50?"Tus compromisos fijos est\xE1n en una zona saludable":"Tus compromisos fijos necesitan atenci\xF3n",message:b>0?`Tus gastos fijos representan aproximadamente el ${h}% de tu sueldo mensual (${f(u,!0)} de ${f(b,!0)}). ${h<=50?"Mantenerlos por debajo del 50% te deja espacio para vivir y ahorrar.":"Busca reducir suscripciones o renegociar servicios para recuperar margen."}`:"Registra tu sueldo mensual para calcular qu\xE9 proporci\xF3n de tus ingresos est\xE1 comprometida en gastos fijos.",actionLabel:"Revisar fijos",actionTab:"obligaciones",iconType:"fixed"},{id:"tip_emergency_buffer",tag:"Fondo de emergencia",title:C?"Haz crecer tu fondo de emergencia":"Construye un fondo de emergencia",message:b>0?`${C?`Ya tienes ${f(H,!0)} protegidos. `:""}Una meta inicial razonable es reunir cerca de ${f(R,!0)}, equivalente a tres meses de tu sueldo. Separar ${f(w,!0)} cada mes te acercar\xE1 sin descuidar tus gastos.`:"Un fondo de emergencia te ayuda a cubrir imprevistos sin endeudarte. Empieza con un aporte peque\xF1o y constante.",actionLabel:C?"Aportar ahora":"Crear fondo",actionTab:"metas",iconType:"safety"},{id:"tip_goal_schedule",tag:"Plan de ahorro",title:j?`Programa tu pr\xF3xima meta: "${j.name}"`:"Convierte tu ahorro en una meta",message:j?`Te faltan ${f(J,!0)}. Si separas alrededor de ${f(we,!0)} al mes, avanzar\xE1s de forma constante sin superar tu saldo disponible.`:`Con un sueldo de ${f(b,!0)}, apartar ${f(w,!0)} al mes puede convertirse en una meta concreta y medible.`,actionLabel:"Ver metas",actionTab:"metas",iconType:"goal"},{id:"tip_monthly_review",tag:"Cierre mensual",title:g>0?`Ya llevas ${f(g,!0)} en gastos este mes`:"Registra tus movimientos del mes",message:g>0?`Te quedan aproximadamente ${f(Math.max(0,b-g),!0)} de tu ingreso mensual antes de separar compromisos y ahorro. Revisar tus movimientos hoy evita sorpresas al cierre.`:`Registrar cada gasto te permite comparar tu comportamiento con el sueldo de ${f(b,!0)} y tomar decisiones antes de que el dinero se disperse.`,actionLabel:"Ver historial",actionTab:"gastos",iconType:"review"},{id:"tip_income_visibility",tag:"Ingresos y balance",title:i>0?"Tu balance se ve mejor cuando registras todo":"Registra tu ingreso mensual",message:i>0?`Has registrado ${f(i,!0)} este mes y tienes ${f(c,!0)} disponibles. Mant\xE9n tus ingresos al d\xEDa para que las recomendaciones se ajusten a tu realidad.`:`Conocer tu sueldo real de ${f(b,!0)} es el primer paso para distribuirlo entre necesidades, gustos, ahorro y metas.`,actionLabel:i>0?"Ver balance":"Registrar ingreso",actionTab:i>0?"inicio":"ingresos",iconType:"income"}].forEach(A=>{x.some(N=>N.id===A.id)||x.push(A)});x.length<7;)x.push({id:`tip_balance_${x.length}`,tag:"Bienestar financiero",title:"Haz que tu dinero trabaje para ti",message:`Con un ingreso mensual de ${f(b,!0)}, cada decisi\xF3n peque\xF1a cuenta. Separa primero tus compromisos y luego define un aporte autom\xE1tico para tus metas.`,actionLabel:"Ver metas",actionTab:"metas",iconType:"goal"});let K=x.find(A=>A.id==="tip_goal_boost");return(K?[K,...x.filter(A=>A.id!=="tip_goal_boost")]:x).slice(0,7)}var n={currentUser:null,activeTab:"inicio",selectedMonth:_(),hideBalance:!1,transactions:[],fixedObligations:[],savingsGoals:[],goalContributions:[],categoryBudgets:[],availableMonths:[],monthlyReports:{},filterRecordsType:"all",filterExpensesCategory:"Todos",filterIncomesCategory:"Todos",filterObligationsStatus:"all",pastMonthFilterType:"all",pastMonthSearchQuery:"",quickAdd:{isOpen:!1,type:"gasto",rawValue:"0",category:"Alimentaci\xF3n",categoryManuallySelected:!1,smartSuggestion:"",description:"",date:Z()},activeTipIndex:0},je=["Alimentaci\xF3n","Compras","Educaci\xF3n","Entretenimiento","Transporte"],vt=_(),pt=null,Ae=null,Le=0,p={app:document.getElementById("app"),headerContainer:document.getElementById("header-container"),headerBrand:document.getElementById("header-brand"),headerSearchBtn:document.getElementById("header-search-btn"),headerProfileBtn:document.getElementById("header-profile-btn"),mainContent:document.getElementById("main-content"),fabContainer:document.getElementById("fab-container"),fabBtn:document.getElementById("fab-button"),bottomNav:document.getElementById("bottom-nav"),navItemsContainer:document.getElementById("nav-items-container"),viewAuth:document.getElementById("view-auth"),tabInicio:document.getElementById("tab-inicio"),tabIngresos:document.getElementById("tab-ingresos"),tabGastos:document.getElementById("tab-gastos"),tabObligaciones:document.getElementById("tab-obligaciones"),tabMetas:document.getElementById("tab-metas"),tabPerfil:document.getElementById("tab-perfil"),modalQuickAdd:document.getElementById("modal-quick-add"),modalSearch:document.getElementById("modal-search"),searchInput:document.getElementById("search-input"),searchInputIcon:document.getElementById("search-input-icon"),searchCloseBtn:document.getElementById("search-close-btn"),searchResultsList:document.getElementById("search-results-list"),modalFixedObligation:document.getElementById("modal-fixed-obligation"),modalSavingsGoal:document.getElementById("modal-savings-goal"),modalAporteGoal:document.getElementById("modal-aporte-goal"),modalEditTransaction:document.getElementById("modal-edit-transaction"),modalEditProfile:document.getElementById("modal-edit-profile"),modalEditBudget:document.getElementById("modal-edit-budget"),modalConfirmDelete:document.getElementById("modal-confirm-delete"),toastContainer:document.getElementById("toast-container"),toastPill:document.getElementById("toast-pill"),toastIcon:document.getElementById("toast-icon"),toastText:document.getElementById("toast-text")};window.addEventListener("miplata:auth-expired",()=>{n.currentUser=null,n.transactions=[],n.fixedObligations=[],n.savingsGoals=[],n.goalContributions=[],n.categoryBudgets=[],n.availableMonths=[],n.monthlyReports={},[p.modalQuickAdd,p.modalSearch,p.modalFixedObligation,p.modalSavingsGoal,p.modalAporteGoal,p.modalEditTransaction,p.modalEditProfile,p.modalEditBudget,p.modalConfirmDelete].forEach(e=>e?.classList.add("hidden")),F(),E("Tu sesi\xF3n expir\xF3. Ingresa nuevamente para continuar.","error")});var ze=null;function E(e,t="success"){ze&&clearTimeout(ze),p.toastText.textContent=e;let a=r("checkCircle2","w-5 h-5 text-[#6cf8bb] shrink-0");t==="error"?a=r("alertCircle","w-5 h-5 text-rose-400 shrink-0"):t==="info"&&(a=r("info","w-5 h-5 text-sky-400 shrink-0")),p.toastIcon.innerHTML=a,p.toastContainer.classList.remove("hidden"),ze=setTimeout(()=>{p.toastContainer.classList.add("hidden")},3200)}function Ze({title:e,message:t,successMessage:a,errorMessage:s,onConfirm:o}){p.modalConfirmDelete.classList.remove("hidden"),p.modalConfirmDelete.innerHTML=`
    <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
        ${r("alertTriangle","w-6 h-6")}
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
  `,document.getElementById("delete-confirm-title").textContent=e,document.getElementById("delete-confirm-message").textContent=t;let i=()=>p.modalConfirmDelete.classList.add("hidden");document.getElementById("btn-cancel-delete").onclick=i,document.getElementById("btn-confirm-delete").onclick=async d=>{let g=d.currentTarget;g.disabled=!0,g.classList.add("opacity-60","cursor-wait");try{await o(),i(),E(a)}catch(c){g.disabled=!1,g.classList.remove("opacity-60","cursor-wait"),E(c.message||s,"error")}}}function W(e,t,a="md",s=!1){let o={xs:"w-7 h-7 text-[10px]",sm:"w-8 h-8 text-xs",md:"w-10 h-10 text-xs font-semibold",lg:"w-14 h-14 text-base font-bold",xl:"w-20 h-20 text-xl font-bold",profile:"w-24 h-24 text-2xl font-bold"},i={xs:"w-2 h-2",sm:"w-2.5 h-2.5",md:"w-3 h-3",lg:"w-4 h-4",xl:"w-5 h-5"},d=Se(e),g=["from-[#0058bc] to-[#0070eb] text-white","from-[#006c49] to-[#10b981] text-white","from-[#4f46e5] to-[#7c3aed] text-white","from-[#0284c7] to-[#0ea5e9] text-white","from-[#0f766e] to-[#14b8a6] text-white"],c=((e||"A").charCodeAt(0)||65)+((e||"B").charCodeAt(1)||66),u=g[c%g.length],x=!!t,b=`<span class="tracking-tight select-none font-bold uppercase">${d}</span>`,k=x?`<img src="${t}" alt="${e}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.classList.remove('bg-slate-100'); this.parentElement.classList.add('bg-gradient-to-br', '${u}'); this.nextElementSibling.style.display='flex'" /><span style="display:none" class="w-full h-full items-center justify-center tracking-tight select-none font-bold uppercase">${d}</span>`:b,M=s?`<span class="absolute bottom-0 right-0 rounded-full bg-[#006c49] ring-2 ring-white flex items-center justify-center text-white ${i[a]||"w-3 h-3"}">${r("check","w-2 h-2")}</span>`:"";return`
    <div class="relative inline-block">
      <div class="rounded-full overflow-hidden flex items-center justify-center select-none shadow-sm transition-transform ${o[a]||o.md} ${x?"bg-slate-100 ring-2 ring-[#0058bc]/20":`bg-gradient-to-br ${u}`}">
        ${k}
      </div>
      ${M}
    </div>
  `}var Bt=["Vivienda","Servicios p\xFAblicos","Internet y telefon\xEDa","Transporte","Deudas y cr\xE9ditos","Salud y seguros","Suscripciones y membres\xEDas","Educaci\xF3n y familia","Otros"],Lt=[{name:"Vivienda",label:"Vivienda",icon:"home"},{name:"Servicios p\xFAblicos",label:"Servicios",icon:"droplet"},{name:"Internet y telefon\xEDa",label:"Internet",icon:"wifi"},{name:"Transporte",label:"Transporte",icon:"car"},{name:"Deudas y cr\xE9ditos",label:"Cr\xE9ditos",icon:"creditCard"},{name:"Salud y seguros",label:"Salud",icon:"heartPulse"},{name:"Suscripciones y membres\xEDas",label:"Suscripciones",icon:"tv"},{name:"Educaci\xF3n y familia",label:"Educaci\xF3n",icon:"graduationCap"},{name:"Otros",label:"Otros",icon:"banknote"}];function Ot(e){let t={Servicios:"Servicios p\xFAblicos","Servicios P\xFAblicos":"Servicios p\xFAblicos",Entretenimiento:"Suscripciones y membres\xEDas",Salud:"Salud y seguros",Educaci\u00F3n:"Educaci\xF3n y familia"},a=String(e||"").trim();return t[a]||(Bt.includes(a)?a:"Otros")}function yt(e,t=""){let a=String(t||"").toLowerCase();return a.includes("arriendo")||a.includes("casa")||a.includes("apartamento")?"Vivienda":a.includes("internet")||a.includes("fibra")||a.includes("wifi")||a.includes("claro")||a.includes("celular")||a.includes("tigo")||a.includes("movistar")?"Internet y telefon\xEDa":a.includes("servicios")||a.includes("agua")||a.includes("luz")||a.includes("epm")||a.includes("energ\xEDa")?"Servicios p\xFAblicos":a.includes("transporte")||a.includes("parqueadero")||a.includes("soat")||a.includes("veh\xEDculo")?"Transporte":a.includes("cr\xE9dito")||a.includes("prestamo")||a.includes("banco")||a.includes("cuota")||a.includes("tarjeta")?"Deudas y cr\xE9ditos":a.includes("salud")||a.includes("seguro")||a.includes("eps")||a.includes("medicina")?"Salud y seguros":a.includes("netflix")||a.includes("spotify")||a.includes("streaming")||a.includes("hbo")||a.includes("disney")||a.includes("gimnasio")?"Suscripciones y membres\xEDas":a.includes("educaci\xF3n")||a.includes("colegio")||a.includes("universidad")||a.includes("guarder\xEDa")?"Educaci\xF3n y familia":Ot(e)}function qt(e,t=""){let a=yt(t,e).toLowerCase(),s=(e||"").toLowerCase();return a==="vivienda"||s.includes("arriendo")||s.includes("casa")||s.includes("apartamento")?`<span class="text-[#0058bc]">${r("home","w-5 h-5")}</span>`:a==="internet y telefon\xEDa"||s.includes("internet")||s.includes("fibra")||s.includes("claro")||s.includes("wifi")?`<span class="text-indigo-600">${r("wifi","w-5 h-5")}</span>`:a==="servicios p\xFAblicos"||s.includes("servicios")||s.includes("agua")||s.includes("luz")||s.includes("epm")||s.includes("energ\xEDa")?`<span class="text-[#006c49]">${r("droplet","w-5 h-5")}</span>`:a==="transporte"||s.includes("transporte")||s.includes("parqueadero")||s.includes("soat")||s.includes("veh\xEDculo")?`<span class="text-[#00826a]">${r("car","w-5 h-5")}</span>`:a==="deudas y cr\xE9ditos"||s.includes("cr\xE9dito")||s.includes("prestamo")||s.includes("banco")||s.includes("cuota")||s.includes("tarjeta")?`<span class="text-amber-700">${r("creditCard","w-5 h-5")}</span>`:a==="salud y seguros"||s.includes("salud")||s.includes("seguro")||s.includes("eps")||s.includes("medicina")?`<span class="text-rose-600">${r("heartPulse","w-5 h-5")}</span>`:a==="suscripciones y membres\xEDas"||s.includes("netflix")||s.includes("spotify")||s.includes("streaming")||s.includes("hbo")||s.includes("disney")||s.includes("gimnasio")?`<span class="text-purple-600">${r("tv","w-5 h-5")}</span>`:a==="educaci\xF3n y familia"||s.includes("educaci\xF3n")||s.includes("colegio")||s.includes("universidad")||s.includes("guarder\xEDa")?`<span class="text-[#0058bc]">${r("graduationCap","w-5 h-5")}</span>`:s.includes("celular")||s.includes("tigo")||s.includes("movistar")||s.includes("plan")?`<span class="text-teal-600">${r("smartphone","w-5 h-5")}</span>`:`<span class="text-slate-600">${r("banknote","w-5 h-5")}</span>`}function wt(e){if(e==null||e==="")return 0;let t=Number(e);if(Number.isFinite(t)&&t>0)return t<1e11?t*1e3:t;let a=Date.parse(String(e));return Number.isFinite(a)?a:0}function mt(e){let t=String(e.date||"").slice(0,10),a=String(e.time||"").trim(),s=/^\d{4}-\d{2}-\d{2}$/.test(t)?Date.parse(`${t}T00:00:00`):0,i=/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i.test(a),d=i&&s?(Date.parse(`${t}T${a}`)||Date.parse(`${t} ${a}`)):0,g=wt(e.createdAt),c=g?new Date(g).toISOString().slice(0,10):"",u=d||(g&&c===t?g:s)||g;return{dayTimestamp:s||u,executionTimestamp:u,explicitTimestamp:d,createdAt:g}}function Xe(e,t="w-5 h-5"){return e.isGoalContribution?`<span class="text-[#0058bc]">${r("flag",t)}</span>`:e.fixedObligationId?`<span class="text-[#0058bc]">${r("calendarCheck",t)}</span>`:e.type==="ingreso"?`<span class="text-[#006c49]">${r("arrowUpRight",t)}</span>`:Fe(e.category,t)}function Pt(e=null,t=n.goalContributions){return t.filter(a=>!e||String(a.date||"").startsWith(e)).map(a=>{let s=wt(a.timestamp),o=s?new Date(s):null,i=o?o.toISOString().slice(0,10):"",d=o?o.toTimeString().slice(0,8):"";return{id:`goal-contribution-${a.id}`,type:"gasto",amount:Number(a.amount)||0,category:"Ahorro / Metas",description:`Aporte a meta: ${a.goalName||"Meta de ahorro"}`,date:a.date||i,time:a.time||d,createdAt:s,accountMethod:"Meta de ahorro",isRecurring:!1,fixedObligationId:null,isGoalContribution:!0,goalId:a.goalId||null}})}function qe(e){let t=n.monthlyReports[e],a=t?t.transactions||[]:n.transactions.filter(o=>o.date&&o.date.startsWith(e)),s=t?t.goalContributions||[]:n.goalContributions;return[...a,...Pt(e,s)].sort((o,i)=>{let d=mt(o),g=mt(i);let u=g.dayTimestamp-d.dayTimestamp;if(u)return u;let c=g.createdAt||g.explicitTimestamp||g.executionTimestamp,l=d.createdAt||d.explicitTimestamp||d.executionTimestamp;return c-l||g.executionTimestamp-d.executionTimestamp||g.createdAt-d.createdAt||String(i.id||" ").trim().localeCompare(String(o.id||" ").trim())})}function Dt(e=n.currentUser){return Number(e?.monthlySalary)||Number(e?.monthlyBudgetLimit)||0}function Nt(e=n.currentUser){return Number(e?.monthlyBudgetLimit)||Number(e?.monthlySalary)||0}function Rt(e){return qe(e).filter(t=>t.type==="ingreso").reduce((t,a)=>t+(Number(a.amount)||0),0)}function Pe(e=n.selectedMonth,t=n.currentUser){let a=Dt(t),s=Nt(t),o=Rt(e);if(!t?.autoAdjustVariable||o<=0)return{configuredIncome:a,recordedIncome:o,effectiveIncome:a,monthlyBudgetLimit:s,categoryScale:1,isAdjusted:!1};if(a<=0)return{configuredIncome:a,recordedIncome:o,effectiveIncome:o,monthlyBudgetLimit:o,categoryScale:1,isAdjusted:!0};let i=o/a;return{configuredIncome:a,recordedIncome:o,effectiveIncome:o,monthlyBudgetLimit:Math.max(0,Math.round(s*i)),categoryScale:i,isAdjusted:Math.round(o)!==Math.round(a)}}function Gt(e=n.selectedMonth){let t=Pe(e);return n.categoryBudgets.filter(a=>je.includes(a.category)).sort((a,s)=>je.indexOf(a.category)-je.indexOf(s.category)).map(a=>({...a,limit:Math.max(0,Math.round((Number(a.limit)||0)*t.categoryScale))}))}function ye(){let{transactions:e,fixedObligations:t,savingsGoals:a,currentUser:s,selectedMonth:o}=n,i=qe(o),d=i.filter(l=>l.type==="ingreso").reduce((l,h)=>l+h.amount,0),g=i.filter(l=>l.type==="gasto").reduce((l,h)=>l+h.amount,0),c=t.reduce((l,h)=>l+h.amount,0),u=t.filter(l=>l.status==="paid").reduce((l,h)=>l+h.amount,0),x=t.filter(l=>l.status==="pending").reduce((l,h)=>l+h.amount,0),b=t.filter(l=>l.status==="paid").length,k=t.filter(l=>l.status==="pending").length,M=a.reduce((l,h)=>l+h.currentAmount,0),S=a.reduce((l,h)=>l+h.targetAmount,0),w=i.filter(l=>l.isGoalContribution).reduce((l,h)=>l+h.amount,0),R=o===_()?x:0,I=Math.max(0,d-g),m=Pe(o,s),y=d>0?d:0,v=g,B=Math.max(0,y-v),D=y>0?Math.min(100,Math.round(v/y*100)):0;return{totalIncome:d,totalExpenses:g,fixedTotal:c,fixedPaid:u,fixedCommitted:x,fixedPaidCount:b,fixedPendingCount:k,totalSavings:M,totalSavingsTarget:S,totalGoalContributions:w,availableCash:I,monthlyBudgetLimit:y,monthlyBudgetSpent:v,monthlyBudgetRemaining:B,monthlyBudgetPercent:D,effectiveMonthlyIncome:m.effectiveIncome,budgetAdjustment:m,monthTransactions:i}}function _t(){let e=new Set([...n.availableMonths,...n.transactions.map(t=>String(t.date||"").slice(0,7)),...n.goalContributions.map(t=>String(t.date||"").slice(0,7))].filter(t=>/^\d{4}-\d{2}$/.test(t)));return e.add(_()),[...e].sort((t,a)=>a.localeCompare(t)).map(t=>({key:t,label:ee(t)}))}function G(e){e==="ingresos"&&(e="gastos"),n.activeTab=e,["inicio","ingresos","gastos","obligaciones","metas","perfil"].forEach(a=>{let s=document.getElementById(`tab-${a}`);s&&(a===e||e==="fijos"&&a==="obligaciones"?s.classList.remove("hidden"):s.classList.add("hidden"))}),Ke(),kt(),V(),window.scrollTo({top:0,behavior:"auto"})}function Ht(e){let t=e.dataset.tab||"gastos";if(e.dataset.focus==="balance"){let s=()=>{let o=document.getElementById("dashboard-balance-card");if(!o)return;o.scrollIntoView({behavior:"smooth",block:"center"}),o.classList.add("ring-2","ring-blue-200"),window.setTimeout(()=>o.classList.remove("ring-2","ring-blue-200"),1200)};n.activeTab!=="inicio"?(G("inicio"),requestAnimationFrame(()=>window.setTimeout(s,0))):s();return}G(t)}function Ft(){try{let e=JSON.parse(localStorage.getItem("miplata_bootstrap_cache")||"null"),t=e?.user,a=JSON.parse(localStorage.getItem("miplata_user_cache")||"null");return!t?.id||t.id!==a?.id?!1:(n.currentUser=t,n.transactions=e.transactions||[],n.fixedObligations=e.fixedObligations||[],n.goalContributions=e.goalContributions||[],n.savingsGoals=e.savingsGoals||[],n.categoryBudgets=e.categoryBudgets||[],n.availableMonths=e.availableMonths||[],n.monthlyReports={},!0)}catch{return localStorage.removeItem("miplata_bootstrap_cache"),!1}}function $t(e){return e?.user?(n.currentUser=e.user,n.transactions=e.transactions||[],n.fixedObligations=e.fixedObligations||[],n.goalContributions=e.goalContributions||[],n.savingsGoals=e.savingsGoals||[],n.categoryBudgets=e.categoryBudgets||[],n.availableMonths=e.availableMonths||[],n.monthlyReports={},n.selectedMonth=_(),!0):!1}async function ce(e=null){try{let t=await O.getBootstrap();return t?.user?e!==null&&e!==Le?!1:(vt=_(),$t(t)):(n.currentUser=null,F(),!1)}catch(t){return console.error("Error fetching data from backend",t),!1}}function U(...e){Le+=1,n.monthlyReports={};let t=new Set([_(),...n.availableMonths||[]]);e.flat().forEach(a=>{let s=String(a?.date||"").slice(0,7);/^\d{4}-\d{2}$/.test(s)&&t.add(s)}),n.availableMonths=[...t].sort((a,s)=>s.localeCompare(a));if(Ee(n.currentUser)||String(n.currentUser?.name||"").trim().toLowerCase()==="fixelar")return;Mt()}function Mt(){Ae&&window.clearTimeout(Ae);let e=Le;Ae=window.setTimeout(async()=>{Ae=null,await ce(e)?V():e!==Le&&Mt()},1500)}function Ut(e,t={}){let a={...e,id:t.id||e.id||`tx_local_${Date.now()}`,userId:n.currentUser?.id,amount:Number(e.amount)||0,createdAt:e.createdAt||Date.now()};return n.transactions=[...n.transactions.filter(s=>s.id!==a.id),a],U(a),a}function zt(e,t){n.transactions=n.transactions.map(a=>a.id===e?{...a,...t}:a),U()}function Vt(e,t=null){let a={...e,id:t||e.id||`fix_local_${Date.now()}`,userId:n.currentUser?.id,amount:Number(e.amount)||0,paidDate:e.paidDate||null};return n.fixedObligations=[...n.fixedObligations.filter(s=>s.id!==a.id),a],U(),a}function Jt(e,t){n.fixedObligations=n.fixedObligations.map(a=>a.id===e?{...a,...t}:a),U()}function Yt(e){n.fixedObligations=n.fixedObligations.filter(t=>t.id!==e),n.transactions=n.transactions.filter(t=>t.fixedObligationId!==e),U()}function Qt(e,t={}){let a=n.fixedObligations.find(i=>i.id===e);if(!a)return;let s=!!t.isPaid,o=s?Z():null;n.fixedObligations=n.fixedObligations.map(i=>i.id===e?{...i,status:s?"paid":"pending",paidDate:o}:i),s&&!n.transactions.some(i=>i.fixedObligationId===e)?n.transactions=[...n.transactions,{id:t.transactionId||`tx_fix_${e}_local_${Date.now()}`,userId:n.currentUser?.id,type:"gasto",amount:Number(a.amount)||0,category:a.category,description:`${a.name} (Gasto Fijo)`,date:o,time:He(),accountMethod:"Fijo Mensual",isRecurring:!0,fixedObligationId:e,createdAt:Date.now()}]:s||(n.transactions=n.transactions.filter(i=>i.fixedObligationId!==e)),U()}function Wt(e,t=null){let a={...e,id:t||e.id||`goal_local_${Date.now()}`,userId:n.currentUser?.id,targetAmount:Number(e.targetAmount)||0,currentAmount:Number(e.currentAmount)||0,imageUrl:e.imageUrl||""};return n.savingsGoals=[...n.savingsGoals.filter(s=>s.id!==a.id),a],U(),a}function Zt(e,t){n.savingsGoals=n.savingsGoals.map(a=>a.id===e?{...a,...t}:a),U()}function Xt(e){n.savingsGoals=n.savingsGoals.filter(t=>t.id!==e),n.goalContributions=n.goalContributions.filter(t=>t.goalId!==e);if(Ee(n.currentUser)||String(n.currentUser?.name||"").trim().toLowerCase()==="fixelar")return Le+=1,n.monthlyReports={};U()}function Kt(e,t,a,s={}){let o=n.savingsGoals.find(c=>c.id===e);if(!o)return;let i=s.result||{},d={id:i.contributionId||`contrib_local_${Date.now()}`,userId:n.currentUser?.id,goalId:e,goalName:o.name,amount:Number(t)||0,date:Z(),type:a,timestamp:Date.now()},g=Number(i.newAmount);n.goalContributions=[d,...n.goalContributions.filter(c=>c.id!==d.id)],n.savingsGoals=n.savingsGoals.map(c=>c.id===e?{...c,currentAmount:Number.isFinite(g)?g:(Number(c.currentAmount)||0)+d.amount}:c),U(d)}function ea(){pt||(pt=window.setInterval(async()=>{if(!n.currentUser)return;let e=_();if(e===vt)return;n.selectedMonth=e,await ce()&&F()},6e4))}function F(){if(!!!n.currentUser){p.headerContainer.classList.add("hidden"),p.bottomNav.classList.add("hidden"),p.fabContainer.classList.add("hidden"),p.viewAuth.classList.remove("hidden"),["inicio","ingresos","gastos","obligaciones","metas","perfil"].forEach(t=>{let a=document.getElementById(`tab-${t}`);a&&a.classList.add("hidden")}),de();return}p.headerContainer.classList.remove("hidden"),p.bottomNav.classList.remove("hidden"),p.fabContainer.classList.remove("hidden"),p.viewAuth.classList.add("hidden"),Ke(),kt(),G(n.activeTab)}function Ke(){p.headerBrand.innerHTML=Ie("h-7 w-auto object-contain select-none"),p.headerSearchBtn.innerHTML=r("search","w-5 h-5 text-slate-600"),p.headerSearchBtn.setAttribute("aria-label","Buscar movimientos");let e=n.activeTab==="perfil";p.headerProfileBtn.className=`flex items-center justify-center rounded-full transition-all group p-0.5 cursor-pointer ${e?"ring-2 ring-[#0058bc]":"hover:opacity-90"}`,p.headerProfileBtn.innerHTML=W(n.currentUser?.name,n.currentUser?.avatarUrl,"sm")}function kt(){let e=[{id:"inicio",label:"Inicio",icon:"home"},{id:"gastos",label:"Registros",icon:"receiptText"},{id:"obligaciones",label:"Fijos",icon:"calendarCheck"},{id:"metas",label:"Metas",icon:"flag"},{id:"perfil",label:"Perfil",icon:"sliders"}];p.navItemsContainer.innerHTML=e.map(t=>{let a=n.activeTab===t.id||t.id==="obligaciones"&&n.activeTab==="fijos",s=`p-1 rounded-xl transition-all ${a?"bg-[#0058bc]/10 text-[#0058bc] scale-105":""}`;return`
        <button
          id="nav-tab-${t.id}"
          data-tab="${t.id}"
          class="nav-tab-action flex-1 flex flex-col items-center justify-center min-w-0 h-12 gap-0.5 transition-all select-none active:scale-95 cursor-pointer ${a?"text-[#0058bc] font-bold":"text-slate-400 hover:text-slate-700 font-medium"}"
        >
          <div class="${s}">
            ${r(t.icon,"w-5 h-5")}
          </div>
          <span class="text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-[58px]">
            ${t.label}
          </span>
        </button>
      `}).join(""),p.navItemsContainer.querySelectorAll(".nav-tab-action").forEach(t=>{t.onclick=()=>G(t.dataset.tab)})}function V(){switch(n.activeTab){case"inicio":Oe();break;case"ingresos":ve();break;case"gastos":ve();break;case"obligaciones":case"fijos":Je();break;case"metas":na();break;case"perfil":he();break}}function ta(e){let t=e.icon||(e.type==="danger"?"alertTriangle":e.type==="warning"?"alertCircle":"info"),a=e.type==="danger"?"bg-orange-100 text-amber-700":e.type==="warning"?"bg-blue-100 text-blue-600":"bg-blue-100 text-blue-600",s=e.type==="danger"?"text-amber-700":e.type==="warning"?"text-blue-600":"text-blue-600",o=e.description||e.message||"";return`
    <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-full ${a} flex items-center justify-center shrink-0">${r(t,"w-5 h-5")}</div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[#0b1c30]">${e.title}</p>
          <p class="text-sm font-bold ${s}">${o}</p>
        </div>
      </div>
      <button data-tab="${e.actionTab||"gastos"}" data-focus="${e.actionFocus||""}" class="insight-alert-action shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">
        ${e.actionLabel||"Ver"}
      </button>
    </div>  `}function Oe(){if(n.selectedMonth!==_()){te(n.selectedMonth);return}let e=ye(),t=n.currentUser||{},a=(t.name||"Camila").split(" ")[0],s=ee(n.selectedMonth),o=_t(),i=n.fixedObligations.filter(v=>v.status==="pending"),d=i.reduce((v,B)=>v+B.amount,0),g=e.monthlyBudgetLimit,c=g>0?Math.min(100,Math.round(e.monthlyBudgetSpent/g*100)):0,u=n.savingsGoals.slice(0,2),x=e.monthTransactions.slice(0,5),b=dt({...n,...e,alert80Percent:t.alert80Percent!==!1}),k=ut({...n,...e}),M=k.length?n.activeTipIndex%k.length:0,S=k[M]||null,w=lt();p.tabInicio.innerHTML=`
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-[27px] leading-none font-extrabold tracking-tight text-[#0b1c30]">Hola, ${a} \u{1F44B}</h1>
          <p class="text-sm text-slate-600 mt-1">Tus finanzas van sobre ruedas<br class="sm:hidden" /> este mes</p>
        </div>
        <div class="relative shrink-0">
          <button id="month-dropdown-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#dce8ff] text-[#0b1c30] text-xs font-semibold cursor-pointer">
            ${r("calendarDays","w-4 h-4 text-[#0058bc]")}
            <span>${s}</span>
            ${r("chevronDown","w-3.5 h-3.5 text-slate-500")}
          </button>
          <div id="month-dropdown-menu" class="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 hidden">
            ${o.map(v=>`<button data-month="${v.key}" class="month-select-item w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 ${n.selectedMonth===v.key?"text-[#0058bc] bg-blue-50/50":"text-slate-700"}">${v.label}</button>`).join("")}
          </div>
        </div>
      </div>

      <div id="dashboard-balance-card" class="hero-card-dark mockup-home-hero p-5">
        <div class="hero-glow-1"></div><div class="hero-glow-2"></div>
        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
              ${r("shieldCheck","w-4 h-4 text-[#6cf8bb]")} DINERO DISPONIBLE
            </span>
            <button id="btn-toggle-hide-balance" aria-label="${n.hideBalance?"Mostrar saldo":"Ocultar saldo"}" title="${n.hideBalance?"Mostrar saldo":"Ocultar saldo"}" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer">
              ${r(n.hideBalance?"eyeOff":"eye","w-4 h-4")}
            </button>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[38px] leading-none font-extrabold tracking-tight text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022":f(e.availableCash)}</span>
            <span class="text-xs font-semibold text-slate-300">COP</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <div id="dash-pill-ingresos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-[#6cf8bb] font-semibold">\u2022 Ingresos</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":f(e.totalIncome,!0)}</strong></div>
            <div id="dash-pill-gastado" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-rose-400 font-semibold">\u2022 Egresos</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":f(e.totalExpenses,!0)}</strong></div>
            <div id="dash-pill-fijos" class="rounded-2xl bg-white/10 px-2.5 py-2 cursor-pointer"><span class="block text-[10px] text-slate-300 font-semibold">\u2022 Por Pagar</span><strong class="block text-sm text-white tabular-nums">${n.hideBalance?"\u2022\u2022\u2022\u2022":f(d,!0)}</strong></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button id="btn-quick-gasto" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-rose-600 py-3 border border-slate-100 cursor-pointer">${r("plusCircle","w-5 h-5")}<span class="text-[11px] font-semibold">Gasto</span></button>
        <button id="btn-quick-ingreso" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#006c49] py-3 border border-slate-100 cursor-pointer">${r("arrowDownCircle","w-5 h-5")}<span class="text-[11px] font-semibold">Ingreso</span></button>
        <button id="btn-quick-obligaciones" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-[#0058bc] py-3 border border-slate-100 cursor-pointer">${r("calendar","w-5 h-5")}<span class="text-[11px] font-semibold">Pagar Fijo</span></button>
        <button id="btn-quick-metas" class="mockup-quick-action flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white text-amber-600 py-3 border border-slate-100 cursor-pointer">${r("flag","w-5 h-5")}<span class="text-[11px] font-semibold">Nueva Meta</span></button>
      </div>

      <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${r("pieChart","w-5 h-5")}</div>
            <div class="min-w-0"><h2 class="font-semibold text-base text-[#0b1c30]">Presupuesto del Mes</h2><p class="text-xs text-slate-500">L\xEDmite mensual responsable</p></div>
          </div>
          <span class="rounded-full bg-[#c7f7e3] px-3 py-1 text-xs font-semibold text-[#006c49] whitespace-nowrap">${c}% en regla</span>
        </div>
        <div class="mt-4 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc] transition-all duration-500" style="width:${c}%"></div></div>
        <div class="flex items-center justify-between gap-3 mt-3 text-sm"><span class="text-slate-600">Egresos: <strong class="text-[#0b1c30]">${f(e.monthlyBudgetSpent)} COP</strong></span><span class="text-right text-[#006c49]">Restante: <strong>${f(e.monthlyBudgetRemaining)} COP</strong></span></div>
      </div>

      ${b.length?`
        <div class="flex flex-col gap-2">
          ${b.map(v=>ta(v)).join("")}
        </div>
      `:""}

      ${i.length?`
        <div class="mockup-card rounded-[28px] bg-[#eef4ff] p-4 shadow-sm border border-[#dce8ff] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-full bg-[#ffe1e7] text-[#f3194d] flex items-center justify-center shrink-0">${r("bellRing","w-5 h-5")}</div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[#0b1c30]">${i.length} ${i.length===1?"gasto fijo":"gastos fijos"} por pagar</p>
              <p class="text-sm font-bold text-[#f3194d]">${f(e.fixedCommitted)} COP este mes</p>
            </div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver fijos</button>
        </div>
      `:`
        <div class="mockup-card bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">${r("calendarCheck","w-5 h-5")}</div>
            <div class="min-w-0"><p class="text-sm font-semibold text-[#0b1c30]">Gastos fijos del mes</p><p class="text-xs text-slate-500">${n.fixedObligations.length?"\xA1Todo al d\xEDa este mes!":"No tienes gastos fijos registrados"}</p></div>
          </div>
          <button id="dash-ver-fijos-btn" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0058bc] border border-slate-200 shadow-sm cursor-pointer hover:bg-[#eef3ff] whitespace-nowrap">Ver obligaciones</button>
        </div>
      `}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Metas Activas <span class="ml-1 rounded-full bg-[#dce8ff] px-2 py-0.5 text-xs">${n.savingsGoals.length}</span></h2><button id="dash-ver-metas-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Explorar ${r("chevronRight","w-3 h-3 inline")}</button></div>
        <div class="grid grid-cols-2 gap-2.5">
          ${u.map(v=>{let B=v.targetAmount>0?Math.min(100,Math.round(v.currentAmount/v.targetAmount*100)):0,D=v.imageUrl?"w-9 h-9 flex items-center justify-center overflow-hidden":"w-9 h-9 rounded-full flex items-center justify-center";return`<div data-goal="${v.id}" class="dash-goal-card rounded-3xl bg-white p-3.5 shadow-sm border border-slate-100 cursor-pointer"><div class="flex items-center justify-between"><div class="${D}" style="${v.imageUrl?"":`background-color:${v.color}25;color:${v.color}`}" >${Et(v,"w-full h-full object-contain","w-4 h-4")}</div><span class="text-xs font-bold" style="color:${v.color}">${B}%</span></div><p class="mt-2 text-xs font-semibold truncate">${v.name}</p><p class="text-[11px] text-slate-600 tabular-nums">${_e(v.currentAmount)} / ${_e(v.targetAmount)}</p><div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${B}%;background:${v.color}"></div></div></div>`}).join("")}
        </div>
      </div>

      ${k.length?`
        <section class="financial-tips-shell rounded-[26px] border border-[#c6dcff] bg-gradient-to-br from-[#eef5ff] to-[#dceaff] p-4 shadow-sm overflow-hidden">
          <div id="financial-tips-scroll" class="financial-tips-scroll no-scrollbar">
            ${k.map((v,B)=>{let D={goal:"flag",budget:"pieChart",fixed:"calendarCheck",category:"receiptText",daily:"calendarDays",safety:"shieldCheck",review:"fileText",income:"trendingUp"}[v.iconType]||"lightbulb";return`
                <article class="financial-tip-card snap-start min-w-full flex flex-col gap-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${r(D,"w-5 h-5")}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-extrabold tracking-wide text-[#0058bc] uppercase truncate">Impulso inteligente <span class="text-[10px] font-semibold tracking-normal text-amber-600 normal-case">\u2600\uFE0F ${w.slot==="morning"?"Ma\xF1ana":"Tarde/Noche"}</span></p>
                        <p class="text-[11px] text-[#496b9d] truncate">Calculado con tu salario y gastos reales \u2022 ${w.label} \u2022 Rota 2 veces/d\xEDa</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 rounded-full bg-white/75 px-1.5 py-1 shadow-sm">
                      <button type="button" data-tip-direction="-1" aria-label="Consejo anterior" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${r("chevronLeft","w-4 h-4")}</button>
                      <span class="financial-tip-count text-xs font-bold text-[#0b1c30] tabular-nums">${B+1}/${k.length}</span>
                      <button type="button" data-tip-direction="1" aria-label="Siguiente consejo" class="w-6 h-6 rounded-full flex items-center justify-center text-[#496b9d] hover:bg-white cursor-pointer">${r("chevronRight","w-4 h-4")}</button>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-[17px] leading-tight font-bold text-[#0b1c30]">${v.title}</h3>
                    <p class="mt-2 text-sm leading-relaxed text-[#365579]">${v.message}</p>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-t border-[#b9d2fa] pt-2">
                    <button type="button" data-tip-next class="text-sm font-medium text-[#1a4b89] flex items-center gap-1 cursor-pointer">${r("rotateCcw","w-4 h-4")} Ver otro consejo</button>
                    <button type="button" data-tip-action data-tip-tab="${v.actionTab||"inicio"}" class="text-sm font-bold text-[#0058bc] flex items-center gap-1 cursor-pointer whitespace-nowrap">${v.actionLabel||"Ver detalle"} ${r("chevronRight","w-4 h-4")}</button>
                  </div>
                </article>
              `}).join("")}
          </div>
        </section>
      `:""}

      <div>
        <div class="flex items-center justify-between mb-2"><h2 class="text-lg font-bold">Movimientos Recientes</h2><button id="dash-ver-historial-btn" class="text-xs font-semibold text-[#0058bc] cursor-pointer">Ver historial</button></div>
        <div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
      ${x.map(v=>`<div data-tx-id="${v.isGoalContribution?"":v.id}" data-goal-contribution="${v.isGoalContribution?"true":"false"}" class="dash-tx-row flex items-center justify-between py-3 ${v.isGoalContribution?"cursor-default":"cursor-pointer"}"><div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-2xl ${v.type==="ingreso"?"bg-emerald-50 text-[#006c49]":"bg-slate-100 text-slate-600"} flex items-center justify-center shrink-0">${Xe(v,"w-5 h-5")}</div><div class="min-w-0"><p class="text-xs font-semibold truncate">${v.description}</p><p class="text-[11px] text-slate-500 truncate">${v.date} \u2022 ${v.category}</p></div></div><div class="text-right shrink-0"><strong class="text-sm tabular-nums ${v.type==="ingreso"?"text-[#006c49]":"text-[#0b1c30]"}">${v.type==="ingreso"?"+":"-"}${f(v.amount)}</strong><span class="block text-[10px] ${v.type==="ingreso"?"text-[#006c49]":"text-slate-500"}">${v.type==="ingreso"?"Ingreso":"Egreso"}</span></div></div>`).join("")}
        </div>
      </div>
    </div>
  `;let I=document.getElementById("month-dropdown-btn"),m=document.getElementById("month-dropdown-menu");I&&m&&(I.onclick=v=>{v.stopPropagation(),m.classList.toggle("hidden")},m.querySelectorAll(".month-select-item").forEach(v=>{v.onclick=()=>{n.selectedMonth=v.dataset.month,Oe()}}));let y=document.getElementById("financial-tips-scroll");if(y&&k.length){let v=Array.from(y.querySelectorAll(".financial-tip-card")),B=(h=n.activeTipIndex)=>{let C=v[h]||v[0];C&&(y.style.height=`${C.offsetHeight}px`)},D=()=>{let h=Math.max(0,Math.min(k.length-1,Math.round(y.scrollLeft/Math.max(y.clientWidth,1))));n.activeTipIndex=h,B(h)},l=h=>{let C=(n.activeTipIndex+h+k.length)%k.length;n.activeTipIndex=C,B(C),y.scrollTo({left:C*y.clientWidth,behavior:"smooth"})};y.addEventListener("scroll",D,{passive:!0}),B(),window.setTimeout(()=>B(),0),y.querySelectorAll("[data-tip-direction]").forEach(h=>{h.onclick=()=>l(Number(h.dataset.tipDirection)||1)}),y.querySelectorAll("[data-tip-next]").forEach(h=>{h.onclick=()=>l(1)}),y.querySelectorAll("[data-tip-action]").forEach(h=>{h.onclick=()=>G(h.dataset.tipTab||"inicio")}),requestAnimationFrame(()=>{y.scrollLeft=M*y.clientWidth})}document.getElementById("btn-toggle-hide-balance")?.addEventListener("click",()=>{n.hideBalance=!n.hideBalance,Oe()}),document.getElementById("dash-pill-ingresos")?.addEventListener("click",()=>G("gastos")),document.getElementById("dash-pill-gastado")?.addEventListener("click",()=>G("gastos")),document.getElementById("dash-pill-fijos")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("btn-quick-gasto")?.addEventListener("click",()=>Ye("gasto")),document.getElementById("btn-quick-ingreso")?.addEventListener("click",()=>Ye("ingreso")),document.getElementById("btn-quick-obligaciones")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("btn-quick-metas")?.addEventListener("click",()=>Be(null)),document.getElementById("dash-ver-fijos-btn")?.addEventListener("click",()=>G("obligaciones")),document.getElementById("dash-ver-metas-btn")?.addEventListener("click",()=>G("metas")),document.getElementById("dash-ver-historial-btn")?.addEventListener("click",()=>G("gastos")),document.querySelectorAll(".insight-alert-action").forEach(v=>{v.onclick=()=>Ht(v)}),p.tabInicio.querySelectorAll(".dash-goal-card").forEach(v=>{v.onclick=()=>G("metas")}),p.tabInicio.querySelectorAll(".dash-tx-row").forEach(v=>{v.onclick=()=>{if(v.dataset.goalContribution==="true")return;let B=n.transactions.find(D=>D.id===v.dataset.txId);B&&De(B)}})}function xe(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function aa(e){let t=String(e??"").trim(),a=t.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(a))return t||"Sin fecha";let[s,o,i]=a.split("-");return`${i}/${o}/${s}`}function te(e){if(!n.monthlyReports[e]){p.tabInicio.innerHTML=`
      <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
        <div class="w-10 h-10 rounded-full border-4 border-blue-100 border-t-[#0058bc] animate-spin"></div>
        <p class="text-sm font-semibold text-slate-600">Cargando reporte de ${ee(e)}\u2026</p>
      </div>
    `,O.getMonthlyReport(e).then(m=>{n.monthlyReports[e]=m,n.selectedMonth===e&&te(e)}).catch(m=>{console.error("Error loading monthly report",m),p.tabInicio.innerHTML=`
          <div class="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-6 text-center">
            <p class="text-sm font-semibold text-rose-600">No se pudo cargar este reporte.</p>
            <button id="retry-month-report" type="button" class="px-4 py-2 rounded-full bg-[#0058bc] text-white text-xs font-semibold cursor-pointer">Reintentar</button>
          </div>
        `,document.getElementById("retry-month-report")?.addEventListener("click",()=>te(e))});return}let t=ee(e),a=ee(_()),s=qe(e),o=s.filter(m=>m.type==="ingreso").reduce((m,y)=>m+y.amount,0),i=s.filter(m=>m.type==="gasto").reduce((m,y)=>m+y.amount,0),d=o-i,g=o>0?d/o*100:0,u=Pe(e).monthlyBudgetLimit||o||0,x=u>0?Math.min(100,Math.round(i/u*100)):0,b={};s.filter(m=>m.type==="gasto").forEach(m=>{b[m.category]||(b[m.category]={amount:0,count:0}),b[m.category].amount+=m.amount,b[m.category].count+=1});let k=Object.entries(b).map(([m,y])=>({category:m,amount:y.amount,count:y.count,percentage:i>0?y.amount/i*100:0})).sort((m,y)=>y.amount-m.amount),M={};s.filter(m=>m.type==="ingreso").forEach(m=>{M[m.category]||(M[m.category]={amount:0,count:0}),M[m.category].amount+=m.amount,M[m.category].count+=1});let S=Object.entries(M).map(([m,y])=>({category:m,amount:y.amount,count:y.count,percentage:o>0?y.amount/o*100:0})).sort((m,y)=>y.amount-m.amount),w=s.filter(m=>{let y=n.pastMonthFilterType==="all"||m.type===n.pastMonthFilterType,v=String(m.description||""),B=String(m.category||""),D=!n.pastMonthSearchQuery.trim()||v.toLowerCase().includes(n.pastMonthSearchQuery.toLowerCase())||B.toLowerCase().includes(n.pastMonthSearchQuery.toLowerCase());return y&&D});p.tabInicio.innerHTML=`
    <div id="past-month-report" class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Return to Current Month Notice Bar -->
      <div class="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/70 text-slate-800 shadow-sm">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#0058bc] text-white flex items-center justify-center shrink-0 shadow-sm">
            ${r("calendar","w-4 h-4")}
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
          ${r("arrowLeft","w-3.5 h-3.5")}
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
                <span class="text-[#6cf8bb]">${r("trendingUp","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${f(o)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${s.filter(m=>m.type==="ingreso").length} transacciones</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Egresos Totales</span>
                <span class="text-rose-400">${r("trendingDown","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${f(i)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${s.filter(m=>m.type==="gasto").length} consumos</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Ahorro Neto</span>
                <span class="text-emerald-400">${r("banknote","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold ${d>=0?"text-[#6cf8bb]":"text-rose-400"} tabular-nums tracking-tight">
                  ${d>=0?"+":""}${f(d)}
                </p>
                <span class="text-[10px] text-slate-400 font-medium">${d>=0?"Super\xE1vit mensual":"D\xE9ficit mensual"}</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-[11px] font-medium">Tasa de Ahorro</span>
                <span class="text-sky-300">${r("pieChart","w-3.5 h-3.5")}</span>
              </div>
              <div class="mt-2">
                <p class="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                  ${g.toFixed(1)}%
                </p>
                <span class="text-[10px] text-slate-400 font-medium">Meta ideal: \u226520%</span>
              </div>
            </div>
          </div>

          <!-- Budget Consumed Progress Bar -->
          <div class="pt-2 border-t border-white/10 flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs text-slate-300">
              <span>Presupuesto Consumido</span>
              <span class="font-bold text-white tabular-nums">${x}% del salario</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500 ${x>100?"bg-rose-500":x>80?"bg-amber-400":"bg-[#6cf8bb]"}"
                style="width: ${x}%"
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
              ${r("fileSpreadsheet","w-5 h-5")}
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
            ${r("printer","w-3.5 h-3.5")}
            <span>Descargar PDF</span>
          </button>
        </div>
      </section>

      <!-- Expense Categories Breakdown -->
      <div class="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex flex-col gap-3">
        <h3 class="font-bold text-sm text-[#0b1c30]">Distribuci\xF3n de Gastos por Categor\xEDa</h3>
        ${k.length===0?'<p class="text-xs text-slate-400">Sin gastos en este per\xEDodo.</p>':`
          <div class="flex flex-col gap-2.5">
            ${k.map(m=>`
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#0058bc]"></span>
                    <span class="font-semibold text-slate-800">${xe(m.category)}</span>
                    <span class="text-[11px] text-slate-400">(${m.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 tabular-nums">${f(m.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${m.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#0058bc]" style="width: ${m.percentage}%"></div>
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
            ${S.map(m=>`
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#006c49]"></span>
                    <span class="font-semibold text-slate-800">${xe(m.category)}</span>
                    <span class="text-[11px] text-slate-400">(${m.count})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[#006c49] tabular-nums">+${f(m.amount)}</span>
                    <span class="text-[11px] text-slate-500 font-semibold w-10 text-right">${m.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-[#006c49]" style="width: ${m.percentage}%"></div>
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
          <span class="text-xs text-slate-400">${w.length} de ${s.length}</span>
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
          ${w.length===0?'<p class="text-xs text-slate-400 py-4 text-center">No hay movimientos que coincidan con la b\xFAsqueda.</p>':w.map(m=>`
                <div data-tx-id="${xe(m.id)}" class="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      ${Xe(m,"w-4 h-4")}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-slate-800 truncate">${xe(m.description||"Sin descripci\xF3n")}</span>
                      <span class="text-[10px] text-slate-400">${aa(m.date)} \u2022 ${xe(m.category||"Sin categor\xEDa")}</span>
                    </div>
                  </div>
                  <span class="font-bold tabular-nums ${m.type==="ingreso"?"text-[#006c49]":"text-slate-800"}">
                    ${m.type==="ingreso"?"+":"-"}${f(m.amount)} COP
                  </span>
                </div>
              `).join("")}
        </div>
      </div>
    </div>
  `,document.getElementById("btn-back-current-month").onclick=()=>{n.selectedMonth=_(),Oe()},document.getElementById("btn-past-print-pdf").onclick=()=>{let m=document.title,y=!1,v=()=>{y||(y=!0,document.title=m)};document.title=`MiPlata - Reporte ${t}`,window.addEventListener("afterprint",v,{once:!0}),window.print(),window.setTimeout(v,15e3)},document.getElementById("filter-pm-all").onclick=()=>{n.pastMonthFilterType="all",te(e)},document.getElementById("filter-pm-gasto").onclick=()=>{n.pastMonthFilterType="gasto",te(e)},document.getElementById("filter-pm-ingreso").onclick=()=>{n.pastMonthFilterType="ingreso",te(e)};let I=document.getElementById("search-pm-input");I&&(I.oninput=m=>{n.pastMonthSearchQuery=m.target.value,te(e)}),p.tabInicio.querySelectorAll("[data-tx-id]").forEach(m=>{m.onclick=()=>{let y=n.transactions.find(v=>v.id===m.dataset.txId);y&&De(y)}})}function ve(){let e=qe(n.selectedMonth),t=e.filter(l=>l.type==="gasto"),a=e.filter(l=>l.type==="ingreso"),s=t.reduce((l,h)=>l+h.amount,0),o=a.reduce((l,h)=>l+h.amount,0),i=ye(),d=Gt(n.selectedMonth),g=t.filter(l=>!l.fixedObligationId&&String(l.accountMethod||"").trim().toLowerCase()!=="fijo mensual"&&!l.isGoalContribution&&je.includes(l.category)),c={};g.forEach(l=>{c[l.category]=(c[l.category]||0)+l.amount});let u="",x=0;Object.entries(c).forEach(([l,h])=>{h>x&&(x=h,u=l)});let b=g.reduce((l,h)=>l+h.amount,0),k=b>0?Math.round(x/b*100):0,M=d.filter(l=>l.limit>0&&(c[l.category]||0)>l.limit),S=n.filterRecordsType==="all"?e:e.filter(l=>l.type===n.filterRecordsType),w=n.filterExpensesCategory==="Todos"?S:S.filter(l=>l.category===n.filterExpensesCategory),I=Z(),m=new Date(Date.now()-864e5).toISOString().split("T")[0],y={};w.forEach(l=>{let h=l.date;l.date===I?h="Hoy":l.date===m&&(h="Ayer"),y[h]||(y[h]=[]),y[h].push(l)});let v=["Alimentaci\xF3n","Transporte","Compras","Servicios","Salud","Entretenimiento","Educaci\xF3n","Ahorro / Metas","Otros"],B=["N\xF3mina","Honorarios","Negocio","Inversi\xF3n","Otros"],D=["Todos",...n.filterRecordsType==="gasto"?v:n.filterRecordsType==="ingreso"?B:[...new Set([...v,...B])]];p.tabGastos.innerHTML=`
    <div class="flex flex-col w-full px-4 pt-2 pb-24 max-w-xl mx-auto gap-4 animate-in fade-in duration-200">
      <!-- Header Metric Card -->
      <div class="flex flex-col w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 gap-3">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700">
            ${r("calendar","w-3.5 h-3.5 text-[#0058bc]")}
             <span>Registros de ${ee(n.selectedMonth)}</span>
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
              <span class="block text-lg font-bold text-[#0b1c30] tabular-nums">-${f(s,!0)}</span>
            </div>
            <div class="rounded-2xl bg-emerald-50 px-3 py-2.5">
              <span class="block text-[11px] font-semibold text-[#006c49]">Ingresos</span>
              <span class="block text-lg font-bold text-[#006c49] tabular-nums">+${f(o,!0)}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 mt-1 text-slate-500 text-xs">
            ${u?`<span>Mayor gasto: <strong class="font-semibold text-slate-800">${u}</strong> (${f(x,!0)} \u2022 ${k}%)</span>`:"<span>A\xFAn no hay gastos registrados</span>"}
          </div>
        </div>

      </div>

      <!-- Exceeded Category Budgets Alert Box -->
      ${M.length>0?`
        <div class="rounded-2xl p-3.5 bg-rose-50 border border-rose-200 flex items-center gap-2.5 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            ${r("alertTriangle","w-4 h-4")}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-rose-700">
              L\xEDmite excedido en ${M.length} ${M.length===1?"categor\xEDa":"categor\xEDas"}
            </p>
            <p class="text-xs text-rose-800 truncate">
              ${M.map(l=>`${l.category} (${f(c[l.category]||0)})`).join(", ")}
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
          ${d.map(l=>{let h=c[l.category]||0,C=l.limit>0?Math.round(h/l.limit*100):0,R=C>=75&&C<=100,H=C>100;return`
              <div class="flex flex-col bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/60 gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                      ${Fe(l.category,"w-4 h-4")}
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1">
                        <span class="text-xs font-semibold text-[#0b1c30]">${l.category}</span>
                        ${H?`<span class="text-rose-500">${r("alertTriangle","w-3.5 h-3.5")}</span>`:""}
                      </div>
                      <span class="text-[11px] text-slate-500 tabular-nums">
                        ${f(h)} de ${f(l.limit)} COP
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${H?"bg-rose-100 text-rose-700":R?"bg-amber-100 text-amber-800":"bg-emerald-100 text-[#006c49]"}">
                      ${C}%
                    </span>
                    <button
                      type="button"
                      data-edit-category-budget="${l.category}"
                      class="category-budget-edit-btn w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-[#dce8ff] hover:text-[#0058bc] flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Modificar l\xEDmite de ${l.category}"
                      title="Modificar l\xEDmite"
                    >
                      ${r("sliders","w-3.5 h-3.5")}
                    </button>
                  </div>
                </div>

                <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 ${H?"bg-rose-500":R?"bg-amber-500":"bg-[#006c49]"}"
                    style="width: ${Math.min(100,C)}%"
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
          ${[{key:"all",label:"Todos",count:e.length},{key:"gasto",label:"Gastos",count:t.length},{key:"ingreso",label:"Ingresos",count:a.length}].map(l=>`
              <button
                data-type="${l.key}"
                class="record-type-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${n.filterRecordsType===l.key?"bg-[#0058bc] text-white shadow-sm":"bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"}"
              >
                ${l.label} (${l.count})
              </button>
            `).join("")}
        </div>
        <span class="text-[11px] text-slate-500 px-1">Por categor\xEDa</span>
        <div class="flex overflow-x-auto no-scrollbar gap-1.5 py-1">
          ${D.map(l=>{let h=n.filterExpensesCategory===l;return`
              <button
                data-cat="${l}"
                class="expense-cat-chip shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${h?"bg-[#0058bc] text-white shadow-sm":"bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"}"
              >
                ${l}
              </button>
            `}).join("")}
        </div>
      </div>

      <!-- Records Grouped List -->
      <div class="space-y-4">
        ${w.length===0?`
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-200/60 shadow-sm flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-[#0058bc] flex items-center justify-center">
              ${r("receiptText","w-6 h-6")}
            </div>
            <div>
              <p class="font-bold text-sm text-[#0b1c30]">Sin registros encontrados</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">No hay movimientos para los filtros seleccionados.</p>
            </div>
          </div>
        `:Object.entries(y).map(([l,h])=>{let C=h.filter(j=>j.type==="gasto").reduce((j,J)=>j+J.amount,0),R=h.filter(j=>j.type==="ingreso").reduce((j,J)=>j+J.amount,0),H=[C>0?`-${f(C,!0)}`:"",R>0?`+${f(R,!0)}`:""].filter(Boolean).join(" \u2022 ");return`
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
                    <span>${l}</span>
                    <span class="tabular-nums font-bold text-slate-700">${H}</span>
                  </div>

                  <div class="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-slate-100">
                    ${h.map(j=>`
                          <div data-tx-id="${j.isGoalContribution?"":j.id}" data-goal-contribution="${j.isGoalContribution?"true":"false"}" class="record-row-item flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors ${j.isGoalContribution?"cursor-default":"cursor-pointer"}">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-2xl ${j.type==="ingreso"?"bg-emerald-50 text-[#006c49]":"bg-slate-100 text-slate-600"} flex items-center justify-center shrink-0">
                            ${Xe(j,"w-5 h-5")}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <p class="text-xs font-semibold text-[#0b1c30] truncate">${j.description}</p>
                            <p class="text-[11px] text-slate-500 truncate">${j.date} \u2022 ${j.category}</p>
                          </div>
                        </div>
                        <div class="w-28 text-right shrink-0">
                          <span class="block text-xs sm:text-sm font-bold whitespace-nowrap ${j.type==="ingreso"?"text-[#006c49]":"text-[#0b1c30]"} tabular-nums">
                            ${j.type==="ingreso"?"+":"-"}${f(j.amount)}
                          </span>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `}).join("")}
      </div>
    </div>
  `,p.tabGastos.querySelectorAll(".record-type-chip").forEach(l=>{l.onclick=()=>{n.filterRecordsType=l.dataset.type,n.filterExpensesCategory="Todos",ve()}}),p.tabGastos.querySelectorAll(".expense-cat-chip").forEach(l=>{l.onclick=()=>{n.filterExpensesCategory=l.dataset.cat,ve()}}),p.tabGastos.querySelectorAll(".category-budget-edit-btn").forEach(l=>{l.onclick=()=>{let h=l.dataset.editCategoryBudget,C=n.categoryBudgets.find(R=>R.category===h);C&&ba(C)}}),p.tabGastos.querySelectorAll(".record-row-item").forEach(l=>{l.onclick=()=>{if(l.dataset.goalContribution==="true")return;let h=n.transactions.find(C=>C.id===l.dataset.txId);h&&De(h)}})}function Je(){let e=ye(),t=ct(n.fixedObligations),a=t.length>0?t[0]:null,s=e.fixedTotal>0?Math.round(e.fixedPaid/e.fixedTotal*100):0,o=e.effectiveMonthlyIncome||e.monthlyBudgetLimit||e.totalIncome,i=o>0?Math.round(e.fixedTotal/o*100):0,d=n.fixedObligations.filter(u=>n.filterObligationsStatus==="pending"?u.status==="pending":n.filterObligationsStatus==="paid"?u.status==="paid":!0);p.tabObligaciones.innerHTML=`
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
          ${r("plusCircle","w-4 h-4 text-[#0058bc]")}
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
                ${f(e.fixedTotal)}
              </span>
              <span class="text-xs text-slate-500 uppercase font-semibold">COP</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#0058bc]">
            ${r("calendar","w-5 h-5")}
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
              ${r("checkCircle2","w-3.5 h-3.5")}
              <span class="text-[11px] font-semibold">Pagado este mes</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${f(e.fixedPaid)}
            </span>
            <span class="text-[10px] text-[#00714d] font-medium mt-0.5">
              ${e.fixedPaidCount} obligaciones
            </span>
          </div>

          <div class="flex flex-col p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
            <div class="flex items-center gap-1.5 text-rose-600">
              ${r("clock","w-3.5 h-3.5")}
              <span class="text-[11px] font-semibold">Por pagar</span>
            </div>
            <span class="text-base font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              ${f(e.fixedCommitted)}
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
                ${a.obligation.name} \u2022 ${f(a.obligation.amount,!0)}
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
            ${r("info","w-4 h-4 text-[#0058bc] shrink-0")}
            <p class="leading-tight">
              Tus gastos fijos (${f(e.fixedTotal)}) ocupan el <strong>${i}%</strong> de tus ingresos ${i>50?"(recomendado: m\xE1x. 50%)":"(dentro del rango ideal 50/30/20)"}.
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
        ${r("info","w-4 h-4 text-[#0058bc] shrink-0")}
        <p class="text-[11px] leading-tight">
          Los pagos marcados se sincronizan en los gastos del mes sin duplicar valores.
        </p>
      </div>

      <!-- Obligations List -->
      <div class="flex flex-col gap-2.5">
        ${d.length===0?`
          <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0058bc]">
              ${r("calendar","w-6 h-6")}
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
            ${d.map(u=>{let x=u.status==="paid",b=x?null:Ue(u),k=x?`<span class="inline-flex items-center gap-1 rounded-full bg-[#c7f7e3] px-3 py-1 text-[11px] font-semibold text-[#00714d] whitespace-nowrap">${r("check","w-3 h-3")}Pagado</span>`:`<span class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${b?.status==="overdue"?"border-[#ffc3cf] bg-[#ffe1e7] text-[#db2548]":b?.status==="today"?"border-[#ffd48a] bg-[#fff0d2] text-[#9a5b00]":"border-[#dce8ff] bg-[#eef4ff] text-[#0058bc]"}">${b?.label||`Vence D\xEDa ${u.dueDay}`}</span>`;return`
                <div class="rounded-[22px] bg-white border border-slate-200/70 shadow-sm overflow-hidden">
                  <div class="p-4 pb-3 flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                        ${qt(u.name,u.category)}
                      </div>
                      <div class="flex flex-col min-w-0 pt-0.5">
                        <p class="text-base font-semibold text-[#0b1c30] truncate">${u.name}</p>
                        <p class="text-xs text-[#607797] mt-1">Vence D\xEDa ${u.dueDay} del mes</p>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 shrink-0">
                      <span class="text-base font-bold tabular-nums ${x?"text-slate-700":"text-[#0b1c30]"}">${f(u.amount)}</span>
                      ${k}
                    </div>
                  </div>
                  <div class="mx-4 border-t border-slate-100"></div>
                  <div class="px-4 py-3 flex items-center justify-between gap-2">
                    <button data-edit-ob="${u.id}" class="obligation-edit-trigger inline-flex items-center gap-1.5 text-sm text-[#607797] cursor-pointer hover:text-[#0058bc]">
                      ${r("sliders","w-4 h-4")}<span>${x?"Detalles":"Editar d\xEDa o valor"}</span>
                    </button>
                    <button data-pay-id="${u.id}" class="obligation-toggle-btn inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95 ${x?"bg-[#e7eefb] text-[#50627b] hover:bg-[#dce8ff]":"bg-[#0058bc] text-white shadow-sm hover:bg-[#004aa0]"}" title="${x?"Marcar como pendiente":"Marcar como pagada"}">
                      ${r(x?"rotateCcw":"creditCard","w-4 h-4")}<span>${x?"Desmarcar":"Pagar"}</span>
                    </button>
                  </div>
                </div>
              `}).join("")}
          </div>
        `}
      </div>
      <button id="btn-add-obligation-bottom" class="w-full rounded-full bg-[#eff4f8] text-[#0058bc] py-3.5 text-sm font-semibold cursor-pointer hover:bg-[#e4edf7] transition-colors">${r("plusCircle","w-4 h-4 inline mr-1")}Agregar Gasto Fijo</button>
    </div>
  `;let g=document.getElementById("btn-add-obligation"),c=document.getElementById("btn-add-obligation-bottom");g&&(g.onclick=()=>Ve(null)),c&&(c.onclick=()=>Ve(null)),p.tabObligaciones.querySelectorAll(".ob-status-tab").forEach(u=>{u.onclick=()=>{n.filterObligationsStatus=u.dataset.status,Je()}}),p.tabObligaciones.querySelectorAll(".obligation-toggle-btn").forEach(u=>{u.onclick=async x=>{x.stopPropagation();try{let b=await O.togglePayFixedObligation(u.dataset.payId);Qt(u.dataset.payId,b.result),Je(),E(b.message)}catch(b){E(b.message||"No se pudo actualizar el gasto fijo","error")}}}),p.tabObligaciones.querySelectorAll(".obligation-edit-trigger").forEach(u=>{u.onclick=x=>{x.stopPropagation();let b=n.fixedObligations.find(k=>k.id===u.dataset.editOb);b&&Ve(b)}})}function sa(e){return{security:"shield",laptop:"laptop",plane:"plane",car:"car",home:"home",star:"star"}[e?.icon]||"shield"}function Et(e,t="w-full h-full object-cover",a="w-5 h-5"){let s=String(e?.imageUrl||"").trim(),o=r(sa(e),a);return s?`<img src="${s.replace(/"/g,"&quot;")}" alt="${String(e?.name||"Imagen de meta").replace(/"/g,"&quot;")}" loading="lazy" decoding="async" class="${t}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');" /><span class="hidden w-full h-full items-center justify-center">${o}</span>`:`<span class="w-full h-full flex items-center justify-center">${o}</span>`}function na(){let e=ye(),t=e.totalSavingsTarget>0?Math.min(100,Math.round(e.totalSavings/e.totalSavingsTarget*100)):0,a=n.savingsGoals.filter(c=>c.currentAmount<c.targetAmount),s=a[0]||n.savingsGoals[0],o=s?Math.max(0,s.targetAmount-s.currentAmount):0,R=Math.max(0,e.availableCash),i=s?Math.min(o,R,R>0?Math.max(1000,Math.round(R*.15/1e4)*1e4):0):0,d=s?`Impulso para "${s.name}"`:"Crea tu primera meta",g=s?i>0?`Tienes ${f(R)} disponibles. Puedes aportar ${f(i,!0)} sin superar tu saldo disponible.`:"No tienes dinero disponible para aportar a una meta en este momento.":"Crea una meta para empezar a reservar dinero de forma automática.";p.tabMetas.innerHTML=`
    <div class="mockup-shell flex flex-col w-full px-4 pt-4 pb-28 gap-5 animate-in fade-in duration-200">
      <div class="flex items-start justify-between"><div><span class="text-[11px] font-semibold uppercase tracking-wider text-[#006c49]">Tus sue\xF1os en marcha</span><h1 class="text-[25px] leading-tight font-extrabold">Mis Metas de Ahorro</h1></div><button id="btn-add-goal" class="w-10 h-10 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center cursor-pointer">${r("flag","w-5 h-5")}</button></div>
      <div class="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between"><span class="text-xs font-medium flex items-center gap-2">${r("flag","w-4 h-4 text-[#0058bc]")} Total Acumulado Protegido</span><span class="rounded-full bg-[#6cf8bb] px-2.5 py-1 text-[10px] font-semibold text-[#006c49]">${t}% global</span></div>
        <p class="text-[34px] leading-none font-extrabold mt-4 tabular-nums">${f(e.totalSavings)} <span class="text-xs font-semibold text-slate-500">COP</span></p>
        <p class="text-xs mt-2">Objetivo: ${f(e.totalSavingsTarget)} <span class="font-semibold text-[#006c49]">Faltan ${f(Math.max(0,e.totalSavingsTarget-e.totalSavings),!0)}</span></p>
        <div class="mt-4 h-2.5 rounded-full bg-[#dce8ff] overflow-hidden"><div class="h-full rounded-full bg-[#006c49]" style="width:${t}%"></div></div>
        <div class="mt-4 rounded-3xl bg-[#eef3ff] p-3 text-xs text-slate-600 flex gap-2">${r("shield","w-4 h-4 text-[#0058bc] shrink-0")}<span>Dinero reservado de forma aut\xF3noma. No computable como gasto para proteger tu balance diario.</span></div>
      </div>
      <button id="btn-add-goal-large" class="w-full h-12 rounded-full bg-[#0058bc] text-white font-semibold text-sm shadow-md cursor-pointer">${r("plusCircle","w-4 h-4 inline mr-1")} Crear Nueva Meta</button>
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">Metas Activas</h2><span class="text-sm font-semibold text-[#0058bc]">${a.length} en curso</span></div>
        <div class="flex flex-col gap-3">
          ${a.length?a.map(c=>{let u=c.targetAmount>0?Math.min(100,Math.round(c.currentAmount/c.targetAmount*100)):0,x=Math.max(0,c.targetAmount-c.currentAmount);return`<article class="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80">
                <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="${c.imageUrl?"w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden":"w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"}" style="${c.imageUrl?"":`background:${c.color}20;color:${c.color}`}" >${Et(c,"w-full h-full object-contain","w-7 h-7")}</div>
                  <div class="min-w-0"><h3 class="font-semibold text-base truncate">${c.name}</h3><p class="text-xs text-slate-500 mt-0.5">${c.deadline?`L\xEDmite: ${pa(c.deadline)}`:"Sin fecha l\xEDmite"}</p></div>
                </div>
                <span class="shrink-0 rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#0058bc]">${u}%</span>
              </div>
              <div class="mt-3 h-2.5 rounded-full bg-[#edf2f8] overflow-hidden"><div class="h-full rounded-full bg-[#0058bc]" style="width:${u}%"></div></div>
              <div class="flex items-center justify-between gap-3 mt-2 text-sm"><span><strong>${f(c.currentAmount)}</strong> <span class="text-slate-500">de ${f(c.targetAmount)} COP</span></span><span class="font-semibold text-[#0058bc] text-right">Faltan ${f(x)}</span></div>
              <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100"><button data-aporte-id="${c.id}" class="goal-aporte-btn flex-1 h-12 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer">${r("plus","w-5 h-5")} Aportar dinero</button><button data-edit-goal="${c.id}" class="goal-edit-btn w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" title="Ajustar meta">${r("sliders","w-5 h-5")}</button></div>
            </article>`}).join(""):'<div class="rounded-3xl bg-white p-6 text-center border border-slate-200/80"><p class="text-sm font-semibold">No tienes metas activas</p><p class="text-xs text-slate-500 mt-1">Crea una meta para comenzar a ahorrar.</p></div>'}
        </div>
      </section>
      <div class="rounded-3xl bg-[#eef3ff] border border-[#cfe0ff] p-4 flex gap-3"><div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#0058bc] shrink-0 shadow-sm">${r("lightbulb","w-7 h-7")}</div><div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><p class="text-sm font-bold text-[#0058bc]">Consejo Inteligente</p><span class="text-[11px] text-slate-500">\u2022 Basado en tus datos</span></div><p class="text-sm font-semibold text-[#0b1c30] mt-1">${d}</p><p class="text-sm text-slate-600 leading-relaxed mt-1">${g}</p></div></div>
      <section class="flex flex-col gap-2"><div class="flex items-center justify-between px-1"><h2 class="text-lg font-bold">\xDAltimos Aportes</h2><span class="text-sm font-semibold text-[#0058bc]">Registro protegido</span></div><div class="rounded-3xl bg-white px-4 shadow-sm border border-slate-200/80 divide-y divide-slate-100">${n.goalContributions.length?n.goalContributions.slice(0,3).map(c=>`<div class="flex items-center justify-between gap-3 py-3"><div class="flex items-center gap-3 min-w-0"><div class="w-11 h-11 rounded-full bg-[#c7f7e3] text-[#006c49] flex items-center justify-center shrink-0">${r("wallet","w-5 h-5")}</div><div class="min-w-0"><p class="text-sm font-semibold truncate">${c.goalName}</p><p class="text-xs text-slate-500 mt-0.5">${c.date} \u2022 ${c.type}</p></div></div><div class="text-right shrink-0"><span class="text-base font-bold text-[#006c49]">+${f(c.amount)}</span><small class="block text-[10px] text-slate-500">COP</small></div></div>`).join(""):'<p class="py-5 text-center text-sm text-slate-500">A\xFAn no hay aportes registrados.</p>'}</div></section>
    </div>
  `,document.getElementById("btn-add-goal")?.addEventListener("click",()=>Be(null)),document.getElementById("btn-add-goal-large")?.addEventListener("click",()=>Be(null)),p.tabMetas.querySelectorAll(".goal-aporte-btn").forEach(c=>{c.onclick=()=>ma(c.dataset.aporteId)}),p.tabMetas.querySelectorAll(".goal-edit-btn").forEach(c=>{c.onclick=()=>{let u=n.savingsGoals.find(x=>x.id===c.dataset.editGoal);u&&Be(u)}})}function he(){let e=n.currentUser;if(!e)return;let t=Pe(_(),e),a=e.monthlyBudgetLimit||e.monthlySalary||58e5,s=Math.round(a*((e.budgetRule?.needs||50)/100)),o=Math.round(a*((e.budgetRule?.wants||30)/100)),i=Math.round(a*((e.budgetRule?.savings||20)/100)),d=Math.round(a*.8);p.tabPerfil.innerHTML=`
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
            ${r("edit3","w-4 h-4")}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${r("shieldCheck","w-4 h-4 text-[#0058bc] shrink-0")}
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-medium">Miembro activo</span>
              <span class="text-xs font-semibold text-slate-700">${e.memberSince||"Activo"}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            ${r("lock","w-4 h-4 text-[#006c49] shrink-0")}
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
              ${r("pieChart","w-4 h-4")}
            </div>
             <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Presupuesto Mensual</span>
          </div>

          <button id="btn-edit-salary" class="text-xs font-semibold text-[#0058bc] hover:underline flex items-center gap-0.5 cursor-pointer">
             Modificar L\xEDmite ${r("chevronRight","w-3.5 h-3.5")}
          </button>
        </div>

        <!-- Inner Budget Box -->
        <div class="rounded-2xl bg-[#eff4ff] p-4 flex flex-col gap-2.5 border border-blue-100">
          <div>
             <span class="text-[11px] text-slate-500 font-medium">L\xEDmite Mensual Asignado</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-2xl sm:text-3xl font-bold tracking-tight text-[#0b1c30] tabular-nums">
                ${f(a)}
              </span>
              <span class="text-xs font-bold text-slate-500">COP</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5">
               ${t.isAdjusted?`Ajustado al ingreso registrado de ${f(t.effectiveIncome)} bajo la regla 50/30/20:`:"Distribuido bajo la regla inteligente MiPlata 50/30/20:"}
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
              <span class="font-bold text-slate-800 tabular-nums">${f(s)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#0070eb]"></span>
                <div>
                  <p class="font-semibold text-slate-800">30% Ocasionales & Estilo de Vida</p>
                  <p class="text-[10px] text-slate-500">Salidas, compras y ocio</p>
                </div>
              </div>
              <span class="font-bold text-slate-800 tabular-nums">${f(o)}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#006c49]"></span>
                <div>
                  <p class="font-semibold text-slate-800">20% Metas de Ahorro & Futuro</p>
                  <p class="text-[10px] text-slate-500">Fondo de emergencia e inversi\xF3n</p>
                </div>
              </div>
              <span class="font-bold text-[#006c49] tabular-nums">${f(i)}</span>
            </div>
          </div>
        </div>

        <!-- Toggles -->
        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div>
              <p class="text-xs font-semibold text-slate-800">Alerta preventiva al 80%</p>
              <p class="text-[11px] text-slate-500">Notificar al consumir ${f(d)}</p>
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
              ${r("sliders","w-4 h-4")}
            </div>
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Preferencias del Sistema</span>
          </div>
        </div>

        <div class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${r("coins","w-4 h-4")}
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
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0058bc] shrink-0">${r("calendar","w-4 h-4")}</div>
              <div class="min-w-0"><p class="text-xs font-semibold text-slate-800">Reinicio mensual</p><p class="text-[11px] text-slate-500">Corte y balance peri\xF3dico</p></div>
            </div>
            <span class="text-xs font-semibold text-slate-700 text-right shrink-0">D\xEDa ${e.resetDay||1} de cada mes</span>
          </div>

          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shrink-0">
                ${r("sparkles","w-4 h-4")}
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
          ${r("logOut","w-4 h-4")}
          <span>Cerrar sesi\xF3n</span>
        </button>

        ${Ee(e)?`
        <div class="w-full rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex items-center gap-2.5 text-slate-500" aria-label="Cuenta demo protegida">
          <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
            ${r("lock","w-3.5 h-3.5")}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700">Cuenta demo protegida</p>
            <p class="text-[11px] text-slate-500">No se puede eliminar ni borrar sus datos compartidos</p>
          </div>
        </div>
        `:`
        <button id="btn-delete-account" class="w-full h-11 rounded-full text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 text-xs font-medium active:scale-95 transition-all cursor-pointer">
          ${r("trash2","w-3.5 h-3.5")}
          <span>Eliminar cuenta y datos locales</span>
        </button>
        `}

      </div>

      <!-- App Branding Footer -->
      <div class="flex flex-col items-center justify-center gap-1.5 py-4 text-center select-none">
        <p class="text-[11px] text-slate-400 font-medium">Control de finanzas personales 100% privado y local</p>
        <div class="flex items-center justify-center gap-1.5 pt-1.5 text-[11px] text-slate-400 font-medium">
          <span>By</span>
          ${Ce("h-5 w-auto opacity-80")}
        </div>
      </div>
    </div>
  `,document.getElementById("btn-edit-profile").onclick=fa,document.getElementById("btn-edit-salary").onclick=ga,document.getElementById("toggle-alert-80").onclick=async()=>{let c=await O.updateProfile({alert80Percent:!e.alert80Percent});n.currentUser=c.user,he(),E("Preferencia actualizada")},document.getElementById("toggle-variable-income").onclick=async()=>{let c=await O.updateProfile({autoAdjustVariable:!e.autoAdjustVariable});n.currentUser=c.user,he(),E("Preferencia actualizada")},document.getElementById("toggle-smart-cat").onclick=async()=>{let c=await O.updateProfile({smartCategorization:!e.smartCategorization});n.currentUser=c.user,he(),E("Preferencia actualizada")},document.getElementById("btn-logout").onclick=async()=>{await O.logout(),n.currentUser=null,F(),E("Sesi\xF3n cerrada")};let g=document.getElementById("btn-delete-account");g&&(g.onclick=()=>{Ze({title:"\xBFEliminar cuenta y datos?",message:"Esta acci\xF3n borrar\xE1 todas tus transacciones, metas y gastos fijos de forma irreversible.",successMessage:"Cuenta eliminada",errorMessage:"No se pudo eliminar la cuenta",onConfirm:async()=>{await O.deleteAccount(),n.currentUser=null,F()}})})}var ae=!0,ie="",Q=null,Te="",re="",le="";function oa(){let e=new URL(window.location.origin);return e.searchParams.set("password_reset","1"),e.toString()}function ia(){let e=window.location.hash.startsWith("#")?window.location.hash.slice(1):window.location.hash;if(!e)return"";let t=new URLSearchParams(e);return t.get("type")==="recovery"&&t.get("access_token")||""}function ra(){let e=window.location.hash.startsWith("#")?window.location.hash.slice(1):window.location.hash;if(!e)return"";let t=new URLSearchParams(e),a=t.get("error_code")||"",s=(t.get("error_description")||"").toLowerCase();return!t.get("error")&&!a?"":a==="otp_expired"||s.includes("expired")?"El enlace de recuperaci\xF3n expir\xF3 o ya fue utilizado. Solicita uno nuevo.":"No se pudo validar el enlace de recuperaci\xF3n. Solicita uno nuevo."}function la(){let e=ia();if(e)return Te=e,Q="update",!0;let t=ra();if(t){le=t,Q="request";let a=new URL(window.location.href);return a.hash="",window.history.replaceState({},document.title,`${a.pathname}${a.search}`),!0}return new URLSearchParams(window.location.search).get("password_reset")==="1"?(Q="request",!0):!1}function St(){let e=Q==="update",t=Q==="request",a=e?"Crear nueva contrase\xF1a":"Recuperar contrase\xF1a",s=e?"Escribe una nueva contrase\xF1a para volver a entrar a tu cuenta.":"Te enviaremos un enlace seguro al correo asociado a tu cuenta.";if(p.viewAuth.innerHTML=`
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${Ie("h-11 sm:h-12 w-auto object-contain drop-shadow-sm")}
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
          ${le?`<div class="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700">${le}</div>`:""}
          ${re?`<div class="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-[#006c49]">${re}</div>`:""}
        `:`
          <form id="form-password-reset-update" class="flex flex-col gap-3.5">
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Nueva contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="reset-new-password" type="password" autocomplete="new-password" minlength="6" required placeholder="M\xEDnimo 6 caracteres" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-password" type="button" aria-label="Mostrar contrase\xF1a" title="Mostrar contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${r("eye","w-4 h-4")}</button>
              </div>
            </div>
            <div>
              <label class="text-xs font-bold text-[#0b1c30]">Confirmar contrase\xF1a</label>
              <div class="relative mt-1">
                <input id="reset-confirm-password" type="password" autocomplete="new-password" minlength="6" required placeholder="Repite la contrase\xF1a" class="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
                <button id="toggle-reset-confirm-password" type="button" aria-label="Mostrar confirmaci\xF3n de contrase\xF1a" title="Mostrar confirmaci\xF3n de contrase\xF1a" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0058bc] cursor-pointer transition-colors">${r("eye","w-4 h-4")}</button>
              </div>
            </div>
            <button id="reset-update-submit" type="submit" class="w-full py-3 rounded-2xl bg-[#0058bc] text-white font-bold text-xs shadow-md shadow-[#0058bc]/25 hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">Guardar nueva contrase\xF1a</button>
          </form>
        `}

        <button id="back-to-login" type="button" class="text-xs font-semibold text-[#0058bc] hover:underline cursor-pointer">Volver a iniciar sesi\xF3n</button>
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium"><span>By</span>${Ce("h-5 w-auto opacity-80")}</div>
    </div>
  `,document.getElementById("back-to-login").onclick=()=>{Q=null,Te="",re="",le="",ae=!1,de()},t){let u=document.getElementById("form-password-reset-request");u.onsubmit=async x=>{x.preventDefault();let b=document.getElementById("reset-email"),k=b.value.trim().toLowerCase();if(!b.checkValidity()){E("Ingresa un correo electr\xF3nico v\xE1lido","error"),b.focus();return}try{le="",re=(await O.requestPasswordReset(k,oa())).message,St()}catch(M){E(M.message,"error")}};return}let o=document.getElementById("reset-new-password"),i=document.getElementById("reset-confirm-password"),d=document.getElementById("toggle-reset-password"),g=document.getElementById("toggle-reset-confirm-password"),c=(u,x,b)=>{x.onclick=()=>{let k=u.type==="password";u.type=k?"text":"password";let M=k?"Ocultar":"Mostrar";x.innerHTML=r(k?"eyeOff":"eye","w-4 h-4"),x.setAttribute("aria-label",`${M} ${b}`),x.setAttribute("title",`${M} ${b}`)}};c(o,d,"contrase\xF1a"),c(i,g,"confirmaci\xF3n de contrase\xF1a"),document.getElementById("form-password-reset-update").onsubmit=async u=>{u.preventDefault();let x=o.value;if(x.length<6){E("La contrase\xF1a debe tener al menos 6 caracteres","error"),o.focus();return}if(x!==i.value){E("Las contrase\xF1as no coinciden","error"),i.focus();return}try{await O.confirmPasswordReset(Te,x);let b=new URL(window.location.href);b.searchParams.delete("password_reset"),b.hash="",window.history.replaceState({},document.title,`${b.pathname}${b.search}`),Q=null,Te="",re="",le="",ae=!1,de(),E("Contrase\xF1a actualizada. Ya puedes iniciar sesi\xF3n")}catch(b){E(b.message,"error")}}}function de(){if(Q){St();return}p.viewAuth.innerHTML=`
    <div class="max-w-md w-full flex flex-col gap-5 animate-in fade-in duration-300">
      <!-- Brand Header with Official Logo & Imagotipo -->
      <div class="flex flex-col items-center text-center gap-2">
        <div class="px-5 py-2.5 rounded-3xl bg-white border border-[#dce8ff] shadow-[0_8px_24px_rgba(0,88,188,0.12)]">
          ${Ie("h-11 sm:h-12 w-auto object-contain drop-shadow-sm")}
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
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${ae?"bg-white text-[#0b1c30] shadow-sm":"text-slate-500 hover:text-slate-800"}"
          >
            Crear Cuenta
          </button>
          <button
            id="auth-tab-login"
            type="button"
            class="flex-1 py-2 text-center rounded-full text-xs font-semibold transition-all cursor-pointer ${ae?"text-slate-500 hover:text-slate-800":"bg-white text-[#0b1c30] shadow-sm"}"
          >
            Ya tengo cuenta
          </button>
        </div>

        ${ae?`
          <!-- Registration Form -->
          <form id="form-register" class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-[#eff4ff] border border-blue-100">
              <div class="flex items-center gap-3">
                <div id="auth-avatar-preview">${W("Tu Nombre",ie,"lg")}</div>
                <div class="flex flex-col">
                  <span id="auth-preview-name" class="text-xs font-bold text-[#0b1c30]">Tu perfil</span>
                  <span class="text-[11px] text-slate-500">Se usar\xE1n las iniciales de tu nombre</span>
                </div>
              </div>

              <label class="px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0058bc] border border-blue-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all">
                ${r("camera","w-3.5 h-3.5")}
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
                  ${r("eye","w-4 h-4")}
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
                  ${r("eye","w-4 h-4")}
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
            ${r("sparkles","w-4 h-4 text-[#0058bc]")}
            <span>Entrar con cuenta de demostraci\xF3n</span>
          </button>
        </div>
        `}
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-slate-400 font-medium">
        <span>By</span>
        ${Ce("h-5 w-auto opacity-80")}
      </div>
    </div>
  `,document.getElementById("auth-tab-register").onclick=()=>{ae=!0,de()},document.getElementById("auth-tab-login").onclick=()=>{ae=!1,de()};let e=document.getElementById("btn-login-demo");e&&(e.onclick=async()=>{try{let s=await O.loginDemo();if($t(s.bootstrap))try{localStorage.setItem("miplata_bootstrap_cache",JSON.stringify(s.bootstrap))}catch{}else n.currentUser=s.user,await ce();F(),E(s.message)}catch{E("Error al conectar con la demo","error")}});let t=document.getElementById("form-register");if(t){let s=document.getElementById("reg-name"),o=document.getElementById("reg-email"),i=document.getElementById("reg-pass"),d=document.getElementById("toggle-reg-pass"),g=document.getElementById("reg-salary"),c=Array.from(t.querySelectorAll("[data-salary-value]")),u=document.getElementById("input-avatar-file"),x=document.getElementById("auth-preview-name"),b=document.getElementById("auth-avatar-preview");t.noValidate=!0,d.onclick=()=>{let M=i.type==="password";i.type=M?"text":"password",d.innerHTML=r(M?"eyeOff":"eye","w-4 h-4"),d.setAttribute("aria-label",M?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a"),d.setAttribute("title",M?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a")},s.oninput=()=>{x.textContent=s.value.trim()||"Tu perfil",b.innerHTML=W(s.value||"Tu",ie,"lg")};let k=()=>{let M=parseInt(g.value.replace(/\D/g,""),10)||0;c.forEach(S=>{let w=Number(S.dataset.salaryValue)===M;S.setAttribute("aria-pressed",String(w)),S.classList.toggle("bg-[#0058bc]",w),S.classList.toggle("border-[#0058bc]",w),S.classList.toggle("text-white",w),S.classList.toggle("shadow-sm",w),S.classList.toggle("bg-white",!w),S.classList.toggle("border-slate-200",!w),S.classList.toggle("text-slate-600",!w)})};c.forEach(M=>{M.onclick=()=>{let S=Number(M.dataset.salaryValue);g.value=S.toLocaleString("es-CO"),k()}}),g.oninput=()=>{let M=parseInt(g.value.replace(/\D/g,""),10);g.value=isNaN(M)?"":M.toLocaleString("es-CO"),k()},u.onchange=async M=>{let S=M.target.files?.[0];if(S)try{ie=await et(S),b.innerHTML=W(s.value||"Tu",ie,"lg")}catch(w){ie="",u.value="",E(w.message||"No se pudo cargar la imagen","error")}},t.onsubmit=async M=>{M.preventDefault();let S=s.value.trim(),w=o.value.trim().toLowerCase(),I=i.value,m=parseInt(g.value.replace(/\D/g,""),10)||0;if(!S){E("Escribe tu nombre completo para continuar","error"),s.focus();return}if(!w){E("Escribe un correo electr\xF3nico para crear la cuenta","error"),o.focus();return}if(!o.checkValidity()){E("Ingresa un correo electr\xF3nico v\xE1lido","error"),o.focus();return}if(!I){E("Escribe una contrase\xF1a para crear la cuenta","error"),i.focus();return}if(I.length<6){E("La contrase\xF1a debe tener al menos 6 caracteres","error"),i.focus();return}try{let y=await O.register(S,w,I,m,ie);n.currentUser=y.user,await ce(),F(),E(y.message)}catch(y){E(y.message,"error")}}}let a=document.getElementById("form-login");if(a){let s=document.getElementById("login-pass"),o=document.getElementById("toggle-login-pass"),i=document.getElementById("auth-forgot-password");i&&(i.onclick=()=>{Q="request",re="",de()}),o.onclick=()=>{let d=s.type==="password";s.type=d?"text":"password",o.innerHTML=r(d?"eyeOff":"eye","w-4 h-4"),o.setAttribute("aria-label",d?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a"),o.setAttribute("title",d?"Ocultar contrase\xF1a":"Mostrar contrase\xF1a")},a.onsubmit=async d=>{d.preventDefault();let g=document.getElementById("login-email").value.trim(),c=s.value;try{let u=await O.login(g,c);n.currentUser=u.user,F(),E("Sesión iniciada. Cargando tus datos…","info"),ce().then(M=>{M?F():E("Sesión iniciada, pero no se pudieron sincronizar todos los datos.","error")}).catch(()=>E("Sesión iniciada, pero no se pudieron sincronizar todos los datos.","error"))}catch(u){E(u.message,"error")}}}}var ca={gasto:[{category:"Alimentaci\xF3n",keywords:["almuerzo","desayuno","cena","comida","restaurante","supermercado","mercado","carulla","exito","d1","fruta","pan","cafe","empanada","domicilio","rappi","comida rapida"]},{category:"Transporte",keywords:["uber","taxi","bus","transmilenio","metro","gasolina","combustible","parqueadero","peaje","soat","pasaje","moto","bicicleta"]},{category:"Compras",keywords:["compra","ropa","zapatos","electronica","amazon","mercado libre","falabella","regalo","hogar"]},{category:"Servicios",keywords:["arriendo","alquiler","luz","agua","energia","gas","internet","telefono","celular","factura","servicio"]},{category:"Salud",keywords:["salud","medico","medicina","medicamento","medicamentos","farmacia","drogueria","consulta","hospital","laboratorio","examen","urgencias","odontologo","dentista","terapia","psicologo","vitamina","vitaminas","eps","seguro"]},{category:"Entretenimiento",keywords:["cine","concierto","netflix","spotify","juego","videojuego","gimnasio","bar","fiesta","ocio"]},{category:"Educaci\xF3n",keywords:["colegio","universidad","curso","clase","libro","matricula","educacion","papeleria"]}],ingreso:[{category:"N\xF3mina",keywords:["salario","sueldo","nomina","nomina","quincena","pago laboral","empresa"]},{category:"Honorarios",keywords:["honorario","freelance","consultoria","asesoria","servicio profesional","cliente"]},{category:"Negocio",keywords:["venta","negocio","cliente","pedido","emprendimiento","producto"]},{category:"Inversi\xF3n",keywords:["inversion","dividendos","intereses","rendimiento","interes","fondo"]}]};function ft(e){return String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}function da(e,t){if(!n.currentUser?.smartCategorization)return"";let a=ft(t);if(a.length<3)return"";let s=ca[e]||[],o={category:"",score:0};return s.forEach(i=>{let d=i.keywords.reduce((g,c)=>{let u=ft(c);return g+(a.includes(u)?u.length:0)},0);d>o.score&&(o={category:i.category,score:d})}),o.category}function ua(e){let t=e||Z(),[,a,s]=t.split("-").map(Number),o=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],i=t===Z(),d=i?"Hoy, ":"",g=i?"Autom\xE1tica":"Manual";return`${d}${s} ${o[a-1]||""} (${g})`}function Ye(e="gasto"){n.quickAdd.isOpen=!0,document.documentElement.classList.add("quick-add-open"),document.body.classList.add("quick-add-open"),n.quickAdd.type=e,n.quickAdd.rawValue="0",n.quickAdd.category=e==="ingreso"?"N\xF3mina":"Alimentaci\xF3n",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",n.quickAdd.description="",n.quickAdd.date=Z(),p.modalQuickAdd.classList.remove("hidden"),X()}function X(){let{type:e,rawValue:t,category:a,description:s,date:o,smartSuggestion:i}=n.quickAdd,d=parseInt(t,10)||0,u=e==="ingreso"?[{name:"N\xF3mina",label:"N\xF3mina",icon:"briefcase"},{name:"Honorarios",label:"Honorarios",icon:"dollarSign"},{name:"Negocio",label:"Negocio",icon:"building2"},{name:"Inversi\xF3n",label:"Inversi\xF3n",icon:"trendingUp"},{name:"Otros",label:"Otros",icon:"moreHorizontal"}]:[{name:"Alimentaci\xF3n",label:"Comida",icon:"pizzaSlice"},{name:"Transporte",label:"Transporte",icon:"car"},{name:"Compras",label:"Compras",icon:"shoppingBag"},{name:"Servicios",label:"Servicios",icon:"zap"},{name:"Salud",label:"Salud",icon:"heartPulse"},{name:"Entretenimiento",label:"Ocio",icon:"gamepad2"},{name:"Educaci\xF3n",label:"Educaci\xF3n",icon:"graduationCap"},{name:"Otros",label:"Otros",icon:"moreHorizontal"}];p.modalQuickAdd.innerHTML=`
    <div class="quick-add-page qa-form-shell bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="qa-header flex items-center justify-between mb-4 sm:mb-5">
        <button id="qa-close-btn" aria-label="Volver" class="w-9 h-9 flex items-center justify-center text-[#0058bc] cursor-pointer">${r("arrowLeft","w-7 h-7")}</button>
        <div class="flex items-center gap-2"><img src="assets/optimized/Logo.png" alt="MiPlata" width="160" height="160" decoding="async" class="w-10 h-10 rounded-xl" /><h1 class="text-xl font-semibold">Nuevo Registro</h1></div>
        ${W(n.currentUser?.name,n.currentUser?.avatarUrl,"sm")}
      </div>
      <div class="qa-drag-handle h-1.5 w-12 rounded-full bg-[#dce8ff] mx-auto mb-3 sm:mb-4"></div>

      <div class="qa-type-switch flex items-center bg-[#dce8ff] p-1 rounded-full mb-4 sm:mb-6">
        <button id="qa-type-gasto" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${e==="gasto"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600"}">Gasto</button>
        <button id="qa-type-ingreso" class="flex-1 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all cursor-pointer ${e==="ingreso"?"bg-white text-[#0b1c30] shadow-sm":"text-slate-600"}">Ingreso</button>
      </div>

      <div class="qa-amount-display text-center mb-4 sm:mb-5"><div class="flex items-baseline justify-center gap-1"><span class="qa-amount-value text-4xl sm:text-5xl font-extrabold text-[#0b1c30] tabular-nums"><span class="text-slate-300">$</span>${f(d).replace("$","")}</span><span class="text-base sm:text-xl font-medium text-slate-500">COP</span></div><p class="qa-amount-status mt-2 text-xs sm:text-sm font-semibold text-[#0058bc]"><span class="inline-block w-3 h-3 rounded-full bg-[#006c49] mr-1"></span>${e==="ingreso"?"Registrando ingreso inmediato":"Registrando egreso inmediato"}</p></div>

      <div class="qa-category-heading flex items-center justify-between mb-2.5 sm:mb-3"><h2 class="text-base sm:text-lg font-semibold uppercase tracking-wide text-slate-600">Categor\xEDa</h2><span id="qa-selected-category" class="text-base sm:text-lg font-semibold text-[#0058bc]">${a}</span></div>
      <div id="qa-categories-scroll" class="qa-category-scroller qa-categories-scroll flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1.5 sm:pb-2 mb-4 sm:mb-5" role="listbox" aria-label="Categor\xEDas de ${e==="ingreso"?"ingreso":"gasto"}">
        ${u.map(w=>`<button type="button" data-cat="${w.name}" role="option" aria-selected="${a===w.name}" class="qa-cat-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer"><span class="qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${a===w.name?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}">${r(w.icon,"w-6 h-6 sm:w-7 sm:h-7")}</span><span class="qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${a===w.name?"text-[#0058bc] font-semibold":"text-slate-700"}">${w.label}</span></button>`).join("")}
      </div>
      <p id="qa-smart-category-hint" aria-hidden="true" style="display: none !important;" class="qa-smart-hint qa-smart-hint-hidden text-[11px] text-[#0058bc] font-medium text-center -mt-3 mb-3 ${i?"":"invisible"}">${i?`Sugerencia autom\xE1tica: ${i}`:"Sugerencia autom\xE1tica"}</p>

      <div class="qa-details-card rounded-3xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-100 mb-4 sm:mb-6">
        <div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${r("fileText","w-5 h-5")}</span><input id="qa-description-input" type="text" placeholder="${e==="ingreso"?"Concepto del ingreso":"Caf\xE9 y empanada Juan Valdez"}" value="${s}" class="qa-description-input flex-1 min-w-0 text-lg bg-transparent focus:outline-none focus:ring-0" /></div>
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"><div class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-[#dce8ff] text-slate-600 flex items-center justify-center">${r("calendar","w-5 h-5")}</span><div><p class="text-sm font-semibold text-slate-500">Fecha</p><p class="text-base font-semibold">${ua(o)}</p></div></div><div class="relative"><button id="qa-change-date-btn" type="button" class="rounded-full bg-[#dce8ff] px-3 py-2 text-sm font-semibold text-[#0058bc] cursor-pointer">Cambiar</button><input id="qa-date-input" type="date" value="${o}" aria-label="Cambiar fecha del registro" class="absolute inset-0 h-full w-full opacity-0 pointer-events-none" /></div></div>
      </div>

      <div class="qa-keypad keypad-grid gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <button data-key="1" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">1</button><button data-key="2" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">2</button><button data-key="3" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">3</button>
        <button data-key="4" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">4</button><button data-key="5" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">5</button><button data-key="6" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">6</button>
        <button data-key="7" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">7</button><button data-key="8" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">8</button><button data-key="9" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">9</button>
        <button data-key="000" class="keypad-btn bg-[#eef3ff] border-0 text-[#0058bc] h-16 sm:h-[72px] rounded-full">+000</button><button data-key="0" class="keypad-btn bg-white border-0 shadow-sm h-16 sm:h-[72px] rounded-full">0</button><button data-key="backspace" class="keypad-btn bg-[#eef3ff] border-0 h-16 sm:h-[72px] rounded-full">${r("deleteKey","w-7 h-7")}</button>
      </div>
      <button id="qa-submit-btn" class="qa-submit-button w-full h-14 sm:h-16 rounded-full ${d>0?"bg-[#0058bc]":"bg-slate-300 pointer-events-none"} text-white font-bold text-lg sm:text-xl shadow-md cursor-pointer flex items-center justify-center gap-2">${r("checkCircle2","w-6 h-6 sm:w-7 sm:h-7")}<span>Guardar ${e==="ingreso"?"Ingreso":"Gasto"}</span></button>
    </div>
  `,document.getElementById("qa-type-gasto").onclick=()=>{n.quickAdd.type="gasto",n.quickAdd.category="Alimentaci\xF3n",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",X()},document.getElementById("qa-type-ingreso").onclick=()=>{n.quickAdd.type="ingreso",n.quickAdd.category="N\xF3mina",n.quickAdd.categoryManuallySelected=!1,n.quickAdd.smartSuggestion="",X()},document.getElementById("qa-close-btn").onclick=()=>{p.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open")},p.modalQuickAdd.querySelectorAll(".qa-cat-btn").forEach(w=>{w.onclick=()=>{n.quickAdd.category=w.dataset.cat,n.quickAdd.categoryManuallySelected=!0,n.quickAdd.smartSuggestion="",X()}});let x=w=>{n.quickAdd.category=w;let I=document.getElementById("qa-selected-category");I&&(I.textContent=w),p.modalQuickAdd.querySelectorAll(".qa-cat-btn").forEach(m=>{let y=m.dataset.cat===w;m.setAttribute("aria-selected",String(y));let v=m.querySelector("span:first-child"),B=m.querySelector("span:last-child");v&&(v.className=`qa-cat-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${y?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}`),B&&(B.className=`qa-cat-label text-[11px] sm:text-sm whitespace-nowrap ${y?"text-[#0058bc] font-semibold":"text-slate-700"}`)})},b=document.getElementById("qa-description-input");b&&(b.oninput=w=>{if(n.quickAdd.description=w.target.value,!n.quickAdd.categoryManuallySelected){let I=da(n.quickAdd.type,n.quickAdd.description);n.quickAdd.smartSuggestion=I,I&&x(I);let m=document.getElementById("qa-smart-category-hint");m&&(m.textContent=I?`Sugerencia autom\xE1tica: ${I}`:"Sugerencia autom\xE1tica",m.classList.toggle("invisible",!I))}});let k=document.getElementById("qa-change-date-btn"),M=document.getElementById("qa-date-input");k&&M&&(k.onclick=()=>{typeof M.showPicker=="function"?M.showPicker():M.click()},M.onchange=w=>{w.target.value&&(n.quickAdd.date=w.target.value,X())}),p.modalQuickAdd.querySelectorAll(".keypad-btn").forEach(w=>{w.onclick=()=>{let I=w.dataset.key;I==="backspace"?n.quickAdd.rawValue.length<=1?n.quickAdd.rawValue="0":n.quickAdd.rawValue=n.quickAdd.rawValue.slice(0,-1):I==="000"?n.quickAdd.rawValue!=="0"&&n.quickAdd.rawValue.length<8&&(n.quickAdd.rawValue+="000"):n.quickAdd.rawValue==="0"?n.quickAdd.rawValue=I:n.quickAdd.rawValue.length<10&&(n.quickAdd.rawValue+=I),X()}});let S=document.getElementById("qa-submit-btn");S&&(S.onclick=async()=>{let w=parseInt(n.quickAdd.rawValue,10)||0;if(w<=0)return;let I=n.quickAdd.description.trim()||(n.quickAdd.type==="ingreso"?"Ingreso recibido":"Gasto ocasional"),m={type:n.quickAdd.type,amount:w,category:n.quickAdd.category,description:I,date:n.quickAdd.date,time:He(),isRecurring:!1};try{let y=await O.addTransaction(m);Ut(m,y)}catch(y){E(y.message||"No se pudo guardar el movimiento","error");return}p.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open"),V(),E(`${n.quickAdd.type==="ingreso"?"Ingreso":"Gasto"} de ${f(w)} guardado`)})}function De(e){e&&(p.modalEditTransaction.classList.remove("hidden"),p.modalEditTransaction.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Editar nombre del movimiento</h3>
        <button id="edit-tx-close" type="button" aria-label="Cerrar edici\xF3n del movimiento" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${r("x","w-4 h-4")}
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
  `,document.getElementById("edit-tx-close").onclick=()=>p.modalEditTransaction.classList.add("hidden"),document.getElementById("form-edit-tx").onsubmit=async t=>{t.preventDefault();let a=document.getElementById("edit-tx-desc").value.trim();if(!a){E("Escribe un concepto para el movimiento","error");return}try{await O.updateTransaction(e.id,{description:a}),zt(e.id,{description:a}),p.modalEditTransaction.classList.add("hidden"),V(),E("Movimiento actualizado")}catch(s){E(s.message||"No se pudo actualizar el movimiento","error")}})}function Ve(e=null){p.modalFixedObligation.classList.remove("hidden");let t=!!e,a=t?"Editar Gasto Fijo":"Nuevo Gasto Fijo",s=t?Number(e.reminderDaysBefore??3)>0:!0,o=yt(t?e.category:"Servicios p\xFAblicos",t?e.name:"");p.modalFixedObligation.innerHTML=`
    <div class="bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col border border-slate-100 max-h-[calc(100vh-4px)] overflow-y-auto">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">${a}</h3>
        <button id="ob-modal-close" type="button" aria-label="Cerrar gasto fijo" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${r("x","w-4 h-4")}
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
            ${Lt.map(u=>`
              <button type="button" data-category="${u.name}" role="option" aria-selected="${o===u.name}" class="ob-category-btn shrink-0 w-[68px] sm:w-[76px] flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer">
                <span class="ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${o===u.name?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}">${r(u.icon,"w-6 h-6 sm:w-7 sm:h-7")}</span>
                <span class="ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${o===u.name?"text-[#0058bc] font-semibold":"text-slate-700"}">${u.label}</span>
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
            ${r("trash2","w-4 h-4")}
            <span>Eliminar obligaci\xF3n</span>
          </button>
        `:""}
      </form>
    </div>
  `,document.getElementById("ob-modal-close").onclick=()=>p.modalFixedObligation.classList.add("hidden");let i=document.getElementById("ob-input-amount");i.oninput=()=>{let u=parseInt(i.value.replace(/\D/g,""),10);i.value=isNaN(u)?"":u.toLocaleString("es-CO")};let d=document.getElementById("ob-input-category");p.modalFixedObligation.querySelectorAll(".ob-category-btn").forEach(u=>{u.onclick=()=>{d.value=u.dataset.category,p.modalFixedObligation.querySelectorAll(".ob-category-btn").forEach(x=>{let b=x===u;x.setAttribute("aria-selected",String(b));let k=x.querySelector(".ob-category-icon"),M=x.querySelector(".ob-category-label");k&&(k.className=`ob-category-icon w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-3xl flex items-center justify-center ${b?"bg-[#0058bc] text-white shadow-md":"bg-[#dce8ff] text-slate-600"}`),M&&(M.className=`ob-category-label text-[11px] sm:text-sm whitespace-nowrap ${b?"text-[#0058bc] font-semibold":"text-slate-700"}`)})}});let g=document.getElementById("ob-reminder-toggle");g&&(g.onclick=()=>{let u=g.getAttribute("aria-checked")!=="true";g.setAttribute("aria-checked",String(u)),g.className=`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${u?"bg-[#0058bc]":"bg-[#cbd5e1]"}`,g.firstElementChild.className=`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${u?"translate-x-5":"translate-x-0"}`}),document.getElementById("form-obligation").onsubmit=async u=>{u.preventDefault();let x=document.getElementById("ob-input-name").value.trim(),b=parseInt(i.value.replace(/\D/g,""),10)||0,k=parseInt(document.getElementById("ob-input-day").value,10)||1,M=document.getElementById("ob-input-category").value,S=document.getElementById("ob-reminder-toggle")?.getAttribute("aria-checked")==="true"?3:0;if(!(!x||b<=0))try{if(t){let w={name:x,amount:b,dueDay:k,category:M,reminderDaysBefore:S,notes:`Vence D\xEDa ${k} del mes`};await O.updateFixedObligation(e.id,w),Jt(e.id,w),E("Obligaci\xF3n actualizada")}else{let w={name:x,amount:b,dueDay:k,category:M,reminderDaysBefore:S,status:"pending",notes:`Vence D\xEDa ${k} del mes`},I=await O.addFixedObligation(w);Vt(w,I.id),E("Gasto fijo agregado")}p.modalFixedObligation.classList.add("hidden"),V()}catch(w){E(w.message||"No se pudo guardar el gasto fijo","error")}};let c=document.getElementById("ob-delete-btn");c&&t&&(c.onclick=()=>{Ze({title:"\xBFEliminar gasto fijo?",message:"Esta acci\xF3n eliminar\xE1 el gasto fijo y su registro asociado de forma permanente.",successMessage:"Obligaci\xF3n eliminada",errorMessage:"No se pudo eliminar el gasto fijo",onConfirm:async()=>{await O.deleteFixedObligation(e.id),Yt(e.id),p.modalFixedObligation.classList.add("hidden"),V()}})})}function Qe(e){let t=String(e||"").trim();if(!t)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;if(/^\d{4}-\d{2}$/.test(t))return`${t}-01`;let s=t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);if(s){let i=oe.findIndex(d=>d.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===s[1]);if(i>=0)return`${s[2]}-${String(i+1).padStart(2,"0")}-01`}let o=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(o){let i=Number(o[1]),d=Number(o[2]),g=Number(o[3]);if(d>=1&&d<=12&&i>=1&&i<=31)return`${g}-${String(d).padStart(2,"0")}-${String(i).padStart(2,"0")}`}return null}function pa(e){let t=Qe(e);if(!t)return String(e||"");let[,a,s]=t.match(/^(\d{4})-(\d{2})-/)||[];return a&&s?`${oe[Number(s)-1]||s} ${a}`:String(e||"")}var bt=6e5;function et(e){return!e||!String(e.type||"").startsWith("image/")?Promise.reject(new Error("Selecciona una imagen v\xE1lida")):new Promise((t,a)=>{let s=new FileReader;s.onerror=()=>a(new Error("No se pudo leer la imagen")),s.onload=()=>{let o=new Image;o.onerror=()=>a(new Error("No se pudo procesar la imagen")),o.onload=()=>{let i=o.naturalWidth||o.width,d=o.naturalHeight||o.height;if(!i||!d){a(new Error("La imagen no tiene un tama\xF1o v\xE1lido"));return}let g=[1e3,800,650,500],c="";for(let u of g){let x=Math.min(1,u/i,u/d),b=document.createElement("canvas");b.width=Math.max(1,Math.round(i*x)),b.height=Math.max(1,Math.round(d*x));let k=b.getContext("2d");if(!k){a(new Error("El navegador no permite procesar la imagen"));return}if(k.drawImage(o,0,0,b.width,b.height),c=b.toDataURL("image/webp",.78),c.startsWith("data:image/webp")||(c=b.toDataURL("image/jpeg",.78)),c.length<=bt)break}if(c.length>bt){a(new Error("La imagen es demasiado grande. Elige una imagen m\xE1s peque\xF1a"));return}t(c)},o.src=s.result},s.readAsDataURL(e)})}function gt(e,t){return`${Number(e)}-${String(Number(t)).padStart(2,"0")}`<_()}function Be(e=null){p.modalSavingsGoal.classList.remove("hidden");let t=!!e,a=t&&e.imageUrl||"",s=t&&e.icon||"security",o=t&&Qe(e.deadline)||"",i=o.slice(5,7),d=o.slice(0,4),g=new Date().getFullYear(),c=Math.min(g,Number(d)||g),u=Math.max(g+10,Number(d)||g),b=[{value:"security",icon:"shield"},{value:"laptop",icon:"laptop"},{value:"plane",icon:"plane"},{value:"home",icon:"home"},{value:"car",icon:"car"},{value:"star",icon:"star"}].map(({value:l,icon:h})=>`
    <button type="button" data-goal-icon="${l}" class="goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${s===l?"bg-[#0058bc] text-white":"bg-[#f0f4f9] text-[#657993]"}">
      ${r(h,"w-5 h-5")}
    </button>
  `).join(""),k=oe.map((l,h)=>`
    <option value="${String(h+1).padStart(2,"0")}" ${i===String(h+1).padStart(2,"0")?"selected":""}>${l}</option>
  `).join(""),M=Array.from({length:u-c+1},(l,h)=>c+h).map(l=>{let h=l<g,C=d===String(l),R=h&&C?`${l} (fecha anterior)`:l;return`<option value="${l}" ${C?"selected":""} ${h?"disabled":""}>${R}</option>`}).join("");p.modalSavingsGoal.innerHTML=`
    <div class="bg-white rounded-[26px] p-6 max-w-md w-full min-w-0 max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden no-scrollbar shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-[18px] text-[#0b1c30]">${t?"Editar Meta de Ahorro":"Nueva Meta de Ahorro"}</h3>
        <button id="goal-modal-close" type="button" aria-label="Cerrar meta de ahorro" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer">
          ${r("x","w-4 h-4")}
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
              ${k}
            </select>
            <select id="goal-input-deadline-year" aria-label="A\xF1o de la fecha l\xEDmite" class="w-full h-12 px-3 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[15px] font-medium text-[#25364d] focus:outline-none focus:ring-2 focus:ring-[#0058bc]/30">
              <option value="">A\xF1o</option>
              ${M}
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
              ${a?`<img src="${a}" class="max-w-full max-h-full object-contain" />`:r("flag","w-7 h-7 text-[#0058bc]")}
            </div>
            <label class="flex-1 h-11 rounded-2xl border border-[#dbe3ed] bg-[#f7f9fc] text-[#0058bc] text-[15px] font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#eef3ff] transition-colors">
              ${r("camera","w-5 h-5")}
              <span>Cambiar foto</span>
              <input id="input-goal-file" type="file" accept="image/*" class="sr-only" />
            </label>
          </div>
        </div>

        <div>
          <label class="block text-[15px] font-medium text-[#6b7d98]">O elige un icono</label>
          <div class="flex flex-wrap items-center gap-2 mt-2 max-w-full overflow-x-hidden">${b}</div>
        </div>

        <button type="submit" class="w-full h-11 mt-2 rounded-full bg-[#0058bc] text-white font-bold text-sm shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer">
          ${t?"Guardar Cambios":"Crear Meta"}
        </button>

        ${t?`
          <button type="button" id="goal-delete-btn" class="w-full h-11 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5">
            ${r("trash2","w-4 h-4")}
            <span>Eliminar Meta</span>
          </button>
        `:""}
      </form>
    </div>
  `,document.getElementById("goal-modal-close").onclick=()=>p.modalSavingsGoal.classList.add("hidden");let S=document.getElementById("input-goal-file"),w=document.getElementById("goal-img-preview"),I=document.getElementById("goal-remove-image");S&&(S.onchange=async l=>{let h=l.target.files?.[0];if(h)try{a=await et(h),w.innerHTML=`<img src="${a}" class="max-w-full max-h-full object-contain" />`,I?.classList.remove("hidden")}catch(C){a="",S.value="",E(C.message||"No se pudo cargar la imagen","error")}}),I&&(I.onclick=()=>{a="",w.innerHTML=r("flag","w-7 h-7 text-[#0058bc]"),I.classList.add("hidden"),S&&(S.value="")});let m=document.getElementById("goal-input-target");m.oninput=()=>{let l=ge(m.value);m.value=l?l.toLocaleString("es-CO"):""};let y=document.getElementById("goal-input-deadline-month"),v=document.getElementById("goal-input-deadline-year"),B=()=>{let l=Number(v.value)||g;Array.from(y.options).forEach(h=>{if(!h.value)return;let C=gt(l,h.value);h.disabled=C,C&&h.selected&&(y.value="")})};v.onchange=B,B(),document.getElementById("goal-clear-deadline").onclick=()=>{y.value="",v.value="",B()},p.modalSavingsGoal.querySelectorAll(".goal-icon-choice").forEach(l=>{l.onclick=()=>{s=l.dataset.goalIcon,p.modalSavingsGoal.querySelectorAll(".goal-icon-choice").forEach(h=>{let C=h.dataset.goalIcon===s;h.className=`goal-icon-choice w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${C?"bg-[#0058bc] text-white":"bg-[#f0f4f9] text-[#657993]"}`})}}),document.getElementById("form-goal").onsubmit=async l=>{l.preventDefault();let h=document.getElementById("goal-input-name").value.trim(),C=ge(m.value),R=y.value,H=v.value,j=!!R,J=!!H,we=j&&J?`${H}-${R}`:"",ue=Qe(we),K=s;if(!h||C<=0){E("Escribe un nombre y un valor objetivo mayor que $0","error");return}if(j!==J){E("Selecciona el mes y el a\xF1o de la fecha l\xEDmite","error");return}if(we&&!ue){E("La fecha l\xEDmite seleccionada no es v\xE1lida","error");return}if(ue&&gt(H,R)){E("La fecha l\xEDmite debe ser el mes actual o un mes futuro","error");return}let Ne={security:"#006c49",laptop:"#0058bc",plane:"#00838f",car:"#0284c7",home:"#4f46e5",star:"#d97706"};try{if(t){let A={name:h,targetAmount:C,deadline:ue,icon:K,color:Ne[K]||"#006c49",imageUrl:a};await O.updateSavingsGoal(e.id,A),Zt(e.id,A),E(`Meta "${h}" actualizada`)}else{let A={name:h,targetAmount:C,currentAmount:0,deadline:ue,icon:K,color:Ne[K]||"#006c49",imageUrl:a},N=await O.addSavingsGoal(A);Wt(A,N.id),E(`Meta "${h}" creada`)}p.modalSavingsGoal.classList.add("hidden"),V()}catch(A){E(A.message||"No se pudo guardar la meta","error")}};let D=document.getElementById("goal-delete-btn");D&&t&&(D.onclick=()=>{Ze({title:"\xBFEliminar meta?",message:`Esta acci\xF3n eliminar\xE1 la meta "${e.name}" y sus aportes asociados de forma permanente.`,successMessage:"Meta eliminada",errorMessage:"No se pudo eliminar la meta",onConfirm:async()=>{await O.deleteSavingsGoal(e.id),Xt(e.id),p.modalSavingsGoal.classList.add("hidden"),V()}})})}function ma(e){let t=n.savingsGoals.find(s=>s.id===e);if(!t)return;p.modalAporteGoal.classList.remove("hidden"),p.modalAporteGoal.innerHTML=`
    <div class="bg-white rounded-[28px] p-6 max-w-lg w-full shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-[#dce8ff] text-[#0058bc] flex items-center justify-center shrink-0">
            ${r("plus","w-5 h-5")}
          </div>
          <h3 class="font-bold text-[18px] text-[#0b1c30] truncate">Aportar a ${t.name}</h3>
        </div>
        <button id="aporte-modal-close" type="button" aria-label="Cerrar aporte a la meta" class="w-9 h-9 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#6b7d98] cursor-pointer shrink-0">
          ${r("x","w-4 h-4")}
        </button>
      </div>

      <div class="mt-7 text-center">
        <label class="block text-sm font-semibold tracking-wide text-[#6b7d98]">MONTO A RESERVAR</label>
        <div class="flex items-center justify-center gap-2 mt-2 w-full min-w-0 text-[#0058bc]">
          <span class="text-[34px] font-bold leading-none">$</span>
          <input id="aporte-input" type="text" inputmode="numeric" value="100.000" placeholder="100.000" class="min-w-0 flex-1 max-w-xs bg-transparent text-center text-3xl sm:text-[38px] font-extrabold leading-tight tabular-nums focus:outline-none" />
          <span class="text-sm font-semibold text-[#6b7d98]">COP</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5 mt-7">
        <button type="button" data-quick="50000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$50k</button>
        <button type="button" data-quick="100000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$100k</button>
        <button type="button" data-quick="200000" class="aporte-quick-btn h-10 rounded-2xl bg-[#f0f4f9] hover:bg-[#dce8ff] text-[#25364d] text-sm font-medium transition-all cursor-pointer">+$200k</button>
      </div>

      <button id="aporte-submit-btn" class="w-full h-14 mt-6 rounded-full bg-[#0058bc] text-white font-bold text-[17px] shadow-md hover:bg-[#004a9f] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
        ${r("checkCircle2","w-5 h-5")}
        <span>Confirmar Aporte</span>
      </button>
      <button id="aporte-cancel-btn" type="button" class="w-full mt-3 text-[#6b7d98] font-medium text-base cursor-pointer hover:text-[#0058bc]">Cancelar</button>
    </div>
  `,document.getElementById("aporte-modal-close").onclick=()=>p.modalAporteGoal.classList.add("hidden"),document.getElementById("aporte-cancel-btn").onclick=()=>p.modalAporteGoal.classList.add("hidden");let a=document.getElementById("aporte-input");p.modalAporteGoal.querySelectorAll(".aporte-quick-btn").forEach(s=>{s.onclick=()=>{let o=parseInt(s.dataset.quick,10);a.value=o.toLocaleString("es-CO")}}),a.oninput=()=>{let s=ge(a.value);a.value=s?s.toLocaleString("es-CO"):""},document.getElementById("aporte-submit-btn").onclick=async()=>{let s=ge(a.value);if(s<=0)return;let m=ye(),o=m.availableCash;if(s>o){E(`No puedes aportar más de ${f(o,!0)} disponibles.`,"error");return}try{let i=await O.contributeToGoal(e,s,"Manual");Kt(e,s,"Manual",i)}catch(i){E(i.message||"No se pudo registrar el aporte","error");return}p.modalAporteGoal.classList.add("hidden"),V(),E(`\xA1Aporte de ${f(s)} registrado para ${t.name}!`)}}function fa(){let e=n.currentUser;if(!e)return;let t=e.avatarUrl||"";p.modalEditProfile.classList.remove("hidden"),p.modalEditProfile.innerHTML=`
    <div class="bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100vh-4px)] overflow-y-auto">
      <div class="w-12 h-1 rounded-full bg-[#c7d6e8] mx-auto mb-4 sm:hidden"></div>
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-extrabold text-lg text-[#0b1c30]">Editar Informaci\xF3n Personal</h3>
        <button id="edit-profile-close" aria-label="Cerrar" class="w-9 h-9 rounded-full bg-[#f1f5fa] flex items-center justify-center text-[#607797] cursor-pointer">
          ${r("x","w-4 h-4")}
        </button>
      </div>

      <div class="flex flex-col items-center gap-3 mb-7">
        <div id="profile-modal-avatar-preview">${W(e.name,t,"profile")}</div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <label class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef4ff] text-[#0058bc] text-sm font-semibold cursor-pointer active:scale-95 transition-all">
            ${r("camera","w-4 h-4")}
            <span>Subir foto</span>
            <input id="input-profile-avatar" type="file" accept="image/*" class="sr-only" />
          </label>
          <button id="remove-profile-avatar-btn" type="button" aria-label="Quitar foto de perfil" ${t ? "" : "disabled"} class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${t ? "bg-[#fff0f2] text-[#e61e4d] cursor-pointer active:scale-95" : "bg-[#f1f5fa] text-[#a5b4c7] cursor-not-allowed"}">
            ${r("x","w-4 h-4")}
            <span>Quitar foto</span>
          </button>
        </div>
                <p id="profile-avatar-hint" class="text-xs text-[#8da0bd] text-center">${t?"Foto de perfil seleccionada":`Mostrando iniciales "${Se(e.name)}" seg\xFAn tu nombre`}</p>
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
  `;let a=()=>p.modalEditProfile.classList.add("hidden");document.getElementById("edit-profile-close").onclick=a,document.getElementById("edit-profile-cancel-btn").onclick=a;let s=document.getElementById("input-profile-avatar"),o=document.getElementById("profile-modal-avatar-preview"),i=document.getElementById("edit-name-input"),d=document.getElementById("profile-avatar-hint"),m=document.getElementById("remove-profile-avatar-btn"),g=()=>{let c=i.value.trim()||e.name,f=Boolean(t);m&&(m.disabled=!f,m.classList.toggle("bg-[#fff0f2]",f),m.classList.toggle("text-[#e61e4d]",f),m.classList.toggle("cursor-pointer",f),m.classList.toggle("active:scale-95",f),m.classList.toggle("bg-[#f1f5fa]",!f),m.classList.toggle("text-[#a5b4c7]",!f),m.classList.toggle("cursor-not-allowed",!f)),t?d.textContent="Foto de perfil seleccionada":(o.innerHTML=W(c,"","profile"),d.textContent=`Mostrando iniciales "${Se(c)}" seg\xFAn tu nombre`)};i.oninput=g,s&&(s.onchange=async c=>{let u=c.target.files?.[0];if(u)try{t=await et(u),o.innerHTML=W(i.value||e.name,t,"profile"),g()}catch(x){t="",s.value="",g(),E(x.message||"No se pudo cargar la imagen","error")}}),m&&m.addEventListener("click",()=>{t&&(t="",s&&(s.value=""),g())}),g();let h=document.getElementById("edit-profile-save-btn"),v=async x=>{x?.preventDefault();let c=document.getElementById("edit-name-input").value.trim(),u=document.getElementById("edit-email-input").value.trim();if(!c){E("Escribe tu nombre para continuar","error"),i.focus();return}h.disabled=!0,h.classList.add("opacity-70","cursor-wait"),h.textContent="Guardando…";try{let x=await O.updateProfile({name:c,email:u,avatarUrl:t});n.currentUser=x.user,p.modalEditProfile.classList.add("hidden"),he(),Ke(),E("Perfil actualizado")}catch(x){E(x.message||"No se pudo actualizar el perfil","error")}finally{h.disabled=!1,h.classList.remove("opacity-70","cursor-wait"),h.textContent="Guardar Cambios"}};p.modalEditProfile.onclick=x=>{let e=x.target;e instanceof Element&&e.closest("#edit-profile-save-btn")&&v(x)}}function ba(e){let t=Number(e.limit)||0;p.modalEditBudget.classList.remove("hidden"),p.modalEditBudget.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <div>
          <h3 class="font-bold text-sm text-[#0b1c30]">L\xEDmite de ${e.category}</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">Presupuesto mensual de la categor\xEDa</p>
        </div>
        <button id="edit-category-budget-close" type="button" aria-label="Cerrar presupuesto de categor\xEDa" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${r("x","w-4 h-4")}
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
  `;let a=()=>p.modalEditBudget.classList.add("hidden");document.getElementById("edit-category-budget-close").onclick=a,document.getElementById("edit-category-budget-cancel").onclick=a;let s=document.getElementById("edit-category-budget-input");s.oninput=()=>{let o=parseInt(s.value.replace(/\D/g,""),10);s.value=Number.isNaN(o)?"":o.toLocaleString("es-CO")},document.getElementById("edit-category-budget-save").onclick=async()=>{let o=parseInt(s.value.replace(/\D/g,""),10)||0;try{await O.updateCategoryBudget(e.category,o),e.limit=o,U(),a(),ve(),E(`L\xEDmite de ${e.category} actualizado`)}catch(i){E(i.message||"No se pudo actualizar el l\xEDmite","error")}}}function ga(){let e=n.currentUser;if(!e)return;let t=e.monthlyBudgetLimit||e.monthlySalary||0;p.modalEditBudget.classList.remove("hidden"),p.modalEditBudget.innerHTML=`
    <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 border border-slate-100">
      <div class="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 class="font-bold text-sm text-[#0b1c30]">Modificar Límite Mensual</h3>
        <button id="edit-budget-close" type="button" aria-label="Cerrar ajuste de salario" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
          ${r("x","w-4 h-4")}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">Este valor se utiliza para calcular autom\xE1ticamente tu regla 50/30/20 y l\xEDmites del mes.</p>
        
        <div>
          <label class="text-xs font-bold text-[#0b1c30]">Límite mensual (COP)</label>
          <input id="edit-salary-input" type="text" value="${t.toLocaleString("es-CO")}" class="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0058bc]" />
        </div>

        <button id="edit-budget-save-btn" class="w-full py-2.5 mt-2 rounded-xl bg-[#0058bc] text-white font-bold text-xs shadow-md hover:bg-[#004bb0] active:scale-95 transition-all cursor-pointer">
          Guardar límite
        </button>
      </div>
    </div>
  `,document.getElementById("edit-budget-close").onclick=()=>p.modalEditBudget.classList.add("hidden");let a=document.getElementById("edit-salary-input");a.oninput=()=>{let s=parseInt(a.value.replace(/\D/g,""),10);a.value=isNaN(s)?"":s.toLocaleString("es-CO")},document.getElementById("edit-budget-save-btn").onclick=async()=>{let s=parseInt(a.value.replace(/\D/g,""),10)||0,o=await O.updateProfile({monthlyBudgetLimit:s});n.currentUser=o.user,await ce(),n.currentUser=n.currentUser||o.user,p.modalEditBudget.classList.add("hidden"),F(),E("Límite mensual actualizado")}}function We(e){p.modalSearch.classList.toggle("hidden",!e),document.documentElement.classList.toggle("search-open",e),document.body.classList.toggle("search-open",e)}function xa(){p.searchInputIcon.innerHTML=r("search","w-4 h-4 text-slate-400"),p.searchCloseBtn.innerHTML=r("x","w-4 h-4"),p.headerSearchBtn.onclick=()=>{We(!0),p.searchInput.value="",p.searchInput.focus(),xt("")},p.searchCloseBtn.onclick=()=>{We(!1)},p.searchInput.oninput=e=>{xt(e.target.value)}}function xt(e){let t=e.trim().toLowerCase();if(!t){p.searchResultsList.innerHTML=`
      <p class="text-xs text-slate-400 py-4 text-center">
        Escribe para buscar cualquier movimiento registrado...
      </p>
    `;return}let a=n.transactions.filter(s=>s.description.toLowerCase().includes(t)||s.category.toLowerCase().includes(t)||String(s.amount).includes(t));if(a.length===0){p.searchResultsList.innerHTML=`
      <p class="text-xs text-slate-400 py-4 text-center">
        No se encontraron movimientos con "${e}"
      </p>
    `;return}p.searchResultsList.innerHTML=`
    <div class="divide-y divide-slate-100">
      ${a.map(s=>`
        <div data-search-tx="${s.id}" class="search-item-row py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer rounded-xl px-2">
          <div>
            <p class="font-semibold text-slate-800">${s.description}</p>
            <p class="text-[11px] text-slate-500">${s.category} \u2022 ${s.date}</p>
          </div>
          <span class="font-semibold tabular-nums ${s.type==="ingreso"?"text-[#006c49]":"text-slate-800"}">
            ${s.type==="ingreso"?"+":"-"}${f(s.amount)} COP
          </span>
        </div>
      `).join("")}
    </div>
  `,p.searchResultsList.querySelectorAll(".search-item-row").forEach(s=>{s.onclick=()=>{We(!1);let o=n.transactions.find(i=>i.id===s.dataset.searchTx);o&&De(o)}})}function ha(){window.addEventListener("keydown",e=>{if(!n.quickAdd.isOpen)return;let t=document.activeElement;if(t&&t.tagName.toLowerCase()==="input"&&t.type==="text"){e.key==="Escape"&&(p.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open"));return}if(e.key>="0"&&e.key<="9")e.preventDefault(),n.quickAdd.rawValue==="0"?n.quickAdd.rawValue=e.key:n.quickAdd.rawValue.length<10&&(n.quickAdd.rawValue+=e.key),X();else if(e.key==="Backspace")e.preventDefault(),n.quickAdd.rawValue.length<=1?n.quickAdd.rawValue="0":n.quickAdd.rawValue=n.quickAdd.rawValue.slice(0,-1),X();else if(e.key==="Escape")p.modalQuickAdd.classList.add("hidden"),n.quickAdd.isOpen=!1,document.documentElement.classList.remove("quick-add-open"),document.body.classList.remove("quick-add-open");else if(e.key==="Enter"){e.preventDefault();let a=document.getElementById("qa-submit-btn");a&&a.click()}})}async function ht(){if(p.fabBtn.innerHTML=r("plus","w-7 h-7 text-white"),p.fabBtn.onclick=()=>Ye("gasto"),p.headerBrand.onclick=()=>G("inicio"),p.headerProfileBtn.onclick=()=>G("perfil"),xa(),ha(),ea(),la()){n.currentUser=null,F();return}let t=Ft(),a=localStorage.getItem("miplata_bootstrap_cache");F();try{let s=await ce(),o=localStorage.getItem("miplata_bootstrap_cache");s&&(!t||a!==o)&&F()}catch(s){console.warn("Initial session check error",s)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ht):ht();export{F as renderApp,E as showToast};
