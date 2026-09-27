const API="https://tbibhrainfpvukafgdmo.supabase.co/functions/v1/brixlab-api";
const root=document.getElementById("app");

async function api(action,payload={}){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"request_failed");
  return j.data;
}
function shell(content){root.innerHTML='<div class="shell">'+content+'</div>'}
function brand(){return '<div class="brand"><div class="logo">Brix<span>Lab</span></div><div class="tag">מתוק מדויק</div><div class="subtag">חוקרים • מודדים • מתנסים • יוצרים</div></div>'}
function go(view){location.hash=view}
window.addEventListener("hashchange",router);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function home(){
 shell('<section class="hero"><div>'+brand()+'<div class="card"><h1>מעבדת BrixLab</h1><p>חוויית חקר כיתתית למדידת סוכר, עבודה בקבוצות ונתונים חיים.</p><div class="actions"><button class="btn primary" onclick="go(\'student\')">כניסת תלמיד</button><button class="btn secondary" onclick="go(\'teacher\')">כניסת מורה</button></div></div></div><div class="art"></div></section>')
}
function studentLogin(){
 shell('<section class="hero"><div>'+brand()+'<div class="card"><h2>כניסת תלמיד</h2><p>הזינו את קוד הכיתה ואת השם הפרטי.</p><div id="msg"></div><div class="field"><label>קוד כיתה</label><input id="classCode" inputmode="numeric" maxlength="6" placeholder="לדוגמה 482615"></div><div class="field"><label>שם פרטי</label><input id="firstName" placeholder="השם שלך"></div><button class="btn primary" style="width:100%" onclick="joinClass()">נכנסים למעבדה</button><a class="small-link" href="#home">חזרה למסך הבית</a></div></div><div class="art"></div></section>')
}
async function joinClass(){
 const classCode=document.getElementById("classCode").value.trim();
 const firstName=document.getElementById("firstName").value.trim();
 const msg=document.getElementById("msg");
 msg.innerHTML="";
 if(!classCode||!firstName){msg.innerHTML='<div class="error">צריך למלא קוד כיתה ושם פרטי.</div>';return}
 try{
  const data=await api("join_session",{class_code:classCode,first_name:firstName});
  localStorage.setItem("brix_student",JSON.stringify(data)); go("student-room");
 }catch(e){msg.innerHTML='<div class="error">לא מצאתי שיעור פתוח עם הקוד הזה.</div>'}
}
function studentRoom(){
 const s=JSON.parse(localStorage.getItem("brix_student")||"null");
 if(!s){go("student");return}
 shell('<section class="hero"><div>'+brand()+'<div class="card waiting"><div class="emoji">🧪</div><h2>ברוך הבא, '+esc(s.first_name)+'</h2><p>'+esc(s.class_name)+' · '+esc(s.group_name)+'</p><div class="notice">נכנסת בהצלחה. ממתינים שמיתר תפתח את השלב הראשון.</div><button class="btn ghost" onclick="localStorage.removeItem(\'brix_student\');go(\'home\')">יציאה</button></div></div><div class="art"></div></section>')
}
function teacherLogin(){
 shell('<section class="hero"><div>'+brand()+'<div class="card"><h2>כניסת מורה</h2><p>בגרסת ההרצה הנוכחית אפשר לפתוח שיעור חדש.</p><div class="notice">אימות מורה מאובטח יתווסף לפני שימוש רחב.</div><div class="actions"><button class="btn primary" onclick="go(\'new-session\')">פתיחת שיעור חדש</button></div><a class="small-link" href="#home">חזרה למסך הבית</a></div></div><div class="art"></div></section>')
}
function newSession(){
 shell('<section class="hero"><div>'+brand()+'<div class="card"><h2>פתיחת שיעור חדש</h2><p>יוצרים כיתה, קוד כניסה וקבוצות אוטומטית.</p><div id="msg"></div><div class="field"><label>שם הכיתה</label><input id="className" placeholder="לדוגמה ח׳2"></div><div class="field"><label>מספר קבוצות</label><select id="groupCount">'+[4,5,6,7,8,9,10].map(n=>'<option '+(n===6?'selected':'')+'>'+n+'</option>').join("")+'</select></div><button class="btn primary" style="width:100%" onclick="createSession()">צור שיעור וקוד כיתה</button><a class="small-link" href="#teacher">חזרה</a></div></div><div class="art"></div></section>')
}
async function createSession(){
 const className=document.getElementById("className").value.trim();
 const groupCount=Number(document.getElementById("groupCount").value);
 const msg=document.getElementById("msg"); msg.innerHTML="";
 if(!className){msg.innerHTML='<div class="error">צריך להזין שם כיתה.</div>';return}
 try{
  const data=await api("create_session",{class_name:className,group_count:groupCount});
  localStorage.setItem("brix_teacher",JSON.stringify(data)); go("dashboard");
 }catch(e){msg.innerHTML='<div class="error">לא הצלחתי לפתוח שיעור. נסו שוב.</div>'}
}
async function dashboard(){
 const t=JSON.parse(localStorage.getItem("brix_teacher")||"null");
 if(!t){go("new-session");return}
 let data;
 try{data=await api("dashboard",{session_id:t.session_id,teacher_token:t.teacher_token})}
 catch(e){shell('<div class="card"><div class="error">לא הצלחתי לטעון את הדשבורד.</div></div>');return}
 const s=data.session;
 const joinUrl=location.origin+location.pathname+'#student?code='+encodeURIComponent(s.class_code);
 const qr='https://quickchart.io/qr?size=180&text='+encodeURIComponent(joinUrl);
 shell('<div class="topbar"><div>'+brand()+'</div><button class="btn ghost" onclick="localStorage.removeItem(\'brix_teacher\');go(\'home\')">יציאה</button></div><div class="dashboard"><aside class="side"><div class="card qr-card"><h3>כניסת תלמידים</h3><img src="'+qr+'" width="180" height="180" alt="QR לכניסת תלמידים"><div class="code">'+s.class_code+'</div><p>סריקה או הזנת קוד כיתה</p></div><div class="card"><h3>שלבי השיעור</h3><div class="stage-row">'+["פתיחה","רפרקטומטר","כיול","חקר","השוואה","תכן","סיכום","רפלקציה"].map((x,i)=>'<div class="stage '+(i===s.current_stage?'active':'')+'">'+(i+1)+'. '+x+'</div>').join("")+'</div></div></aside><section class="mainpanel"><div class="card"><h2>'+esc(s.class_name)+' · דשבורד מורה</h2><p>מורה: מיתר</p><div class="statgrid"><div class="stat"><div class="n">'+data.student_count+'</div><div>תלמידים מחוברים</div></div><div class="stat"><div class="n">'+s.group_count+'</div><div>קבוצות</div></div><div class="stat"><div class="n">'+(s.student_entry_open?'פתוחה':'סגורה')+'</div><div>כניסת תלמידים</div></div></div></div><div class="card"><h2>התקדמות קבוצות</h2><div class="groups">'+data.groups.map(g=>'<article class="group"><span class="badge">'+g.student_count+' תלמידים</span><h3>'+esc(g.group_name)+'</h3><div class="students">'+(g.students.length?g.students.map(st=>'<span class="student">'+esc(st.first_name)+'</span>').join(""):'<span class="student">ממתינה לתלמידים</span>')+'</div></article>').join("")+'</div></div></section></div>');
 clearTimeout(window.__brixTimer);
 window.__brixTimer=setTimeout(()=>{if(location.hash.startsWith("#dashboard")) dashboard();},5000);
}
function router(){
 clearTimeout(window.__brixTimer);
 const raw=(location.hash||"#home").slice(1);
 const view=raw.split("?")[0];
 if(view==="student"){
  studentLogin();
  const p=new URLSearchParams(raw.split("?")[1]||""); const code=p.get("code");
  if(code)setTimeout(()=>{const el=document.getElementById("classCode");if(el)el.value=code},0);
 } else if(view==="student-room")studentRoom();
 else if(view==="teacher")teacherLogin();
 else if(view==="new-session")newSession();
 else if(view==="dashboard")dashboard();
 else home();
}
router();