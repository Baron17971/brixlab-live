const API="https://tbibhrainfpvukafgdmo.supabase.co/functions/v1/brixlab-api";
const root=document.getElementById("app");

async function api(action,payload={}){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"request_failed");
  return j.data;
}
function shell(content,cls=""){root.innerHTML='<div class="shell '+cls+'">'+content+'</div>'}
function brand(){return '<div class="brand brand-image"><img src="/public/screens/brix-logo.png" alt="BrixLab - מתוק ומדויק"></div>'}
function go(view){location.hash=view}
window.addEventListener("hashchange",router);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function imageScreen(kind, desktop, mobile, overlay){
  shell('<section class="image-screen '+kind+'"><picture class="screen-picture"><source media="(max-width:850px)" srcset="'+mobile+'"><img src="'+desktop+'" alt=""></picture>'+overlay+'</section>','image-shell');
}

function home(){
  imageScreen(
    "home-screen",
    "/public/screens/home-brixlab-desktop1.png",
    "/public/screens/home-brixlab-mobile1.png",
    '<div class="home-hotspots"><button aria-label="כניסת תלמיד" class="hotspot student-hotspot" onclick="go(\'student\')"></button><button aria-label="כניסת מורה" class="hotspot teacher-hotspot" onclick="go(\'teacher\')"></button></div>'
  );
}

function studentLogin(){
  imageScreen(
    "student-login-screen clean-login-screen",
    "/public/screens/brixlab-desktop.png",
    "/public/screens/brixlab-mobile.png",
    '<div class="auth-wrap"><div class="auth-card"><h1>כניסת תלמיד</h1><div id="msg"></div><label class="auth-field"><span>קוד כיתה</span><input id="classCode" inputmode="numeric" maxlength="6" placeholder="הקלידו קוד כיתה"></label><label class="auth-field"><span>שם פרטי</span><input id="firstName" placeholder="הקלידו שם פרטי"></label><label class="auth-field"><span>מספר קבוצה</span><input id="groupNumber" inputmode="numeric" min="1" max="20" placeholder="לפי הקצאת המורה"></label><button class="auth-primary" onclick="joinClass()">נכנסים למעבדה <span>‹</span></button><button class="auth-link" onclick="go(\'home\')">חזרה למסך הבית</button></div></div>'
  );
}
async function joinClass(){
 const classCode=document.getElementById("classCode").value.trim();
 const firstName=document.getElementById("firstName").value.trim();
 const groupNumber=Number(document.getElementById("groupNumber").value);
 const msg=document.getElementById("msg");
 msg.innerHTML="";
 if(!classCode||!firstName||!Number.isInteger(groupNumber)||groupNumber<1){msg.innerHTML='<div class="floating-error">צריך למלא קוד כיתה, שם פרטי ומספר קבוצה.</div>';return}
 try{
  const data=await api("join_session",{class_code:classCode,first_name:firstName,group_number:groupNumber});
  localStorage.setItem("brix_student",JSON.stringify(data)); go("student-room");
 }catch(e){msg.innerHTML='<div class="floating-error">לא ניתן להצטרף. בדקו את קוד הכיתה ואת מספר הקבוצה שהמורה הקצתה.</div>'}
}
async function studentRoom(){
 const s=JSON.parse(localStorage.getItem("brix_student")||"null");
 if(!s){go("student");return}
 let state;
 try{state=await api("student_state",{student_id:s.student_id})}
 catch(e){go("student");return}

 if(state.current_stage===0 && !state.opening_submitted){
   studentOpening(s);
   return;
 }

 if(state.current_stage===0 && state.opening_submitted){
   imageScreen(
     "student-room-screen clean-login-screen",
     "/public/screens/brixlab-desktop.png",
     "/public/screens/brixlab-mobile.png",
     '<div class="auth-wrap"><div class="auth-card waiting-card opening-wait"><h1>סיימנו את הפתיחה ✓</h1><p class="room-meta">'+esc(s.class_name)+' · '+esc(s.group_name)+'</p><div class="room-note">התשובות נקלטו. ממתינים לפתיחת הניסוי.</div><div class="wait-pulse"><span></span><span></span><span></span></div><button class="auth-link exit-link" onclick="localStorage.removeItem(\'brix_student\');go(\'home\')">יציאה</button></div></div>'
   );
   clearTimeout(window.__studentTimer);
   window.__studentTimer=setTimeout(()=>{if(location.hash.startsWith("#student-room"))studentRoom()},3000);
   return;
 }

 shell('<div class="student-lab-shell"><div class="student-lab-top">'+brand()+'</div><div class="card student-next-card"><span class="student-kicker">הניסוי נפתח</span><h1>מוכנים להתחיל?</h1><p>הפתיחה הסתיימה. מכאן תתקדמו בקצב הקבוצה לאורך רצף הניסוי.</p><button class="btn primary" disabled>רצף הניסוי ייפתח בשלב הבא</button></div></div>');
}

function studentOpening(s){
 shell('<div class="student-opening-shell"><header class="student-opening-head">'+brand()+'<div><strong>'+esc(s.first_name)+'</strong><span>'+esc(s.group_name)+'</span></div></header><main class="student-opening-main"><section class="opening-card"><div class="opening-step">1 מתוך 2</div><h1>מה שותים אצלכם בבית?</h1><p>באיזו תדירות שותים משקאות ממותקים אצלך בבית?</p><div class="survey-options">'+[
   ["daily","פעם ביום"],
   ["weekly","פעם בשבוע"],
   ["events","רק באירועים מיוחדים"],
   ["never","לא שותה ממותק"]
 ].map(([v,l])=>'<label class="survey-choice"><input type="radio" name="survey" value="'+v+'"><span>'+l+'</span></label>').join("")+'</div></section><section class="opening-card guess-card"><div class="opening-step">2 מתוך 2</div><h2>ניחוש מתוק</h2><p>כמה כפיות סוכר לדעתכם יש ב־500 מ״ל? זה רק ניחוש — אין תשובה נכונה בשלב הזה.</p><div class="guess-grid">'+[
   ["cola","משקה קולה"],
   ["orange","משקה תפוזים"],
   ["iced_tea","תה קר"],
   ["energy","משקה אנרגיה"]
 ].map(([k,l])=>'<label class="guess-item"><span>'+l+'</span><div><input id="guess_'+k+'" type="range" min="0" max="20" step="1" value="8" oninput="document.getElementById(\'val_'+k+'\').textContent=this.value"><b id="val_'+k+'">8</b><small> כפיות</small></div></label>').join("")+'</div><div id="openingMsg"></div><button class="btn primary opening-submit" onclick="submitOpening()">שליחת התשובות</button></section></main></div>');
}

async function submitOpening(){
 const s=JSON.parse(localStorage.getItem("brix_student")||"null");
 if(!s)return;
 const survey=document.querySelector('input[name="survey"]:checked')?.value;
 const msg=document.getElementById("openingMsg");
 if(!survey){msg.innerHTML='<div class="inline-error">יש לבחור תשובה בסקר.</div>';return}
 const guesses={
   cola:Number(document.getElementById("guess_cola").value),
   orange:Number(document.getElementById("guess_orange").value),
   iced_tea:Number(document.getElementById("guess_iced_tea").value),
   energy:Number(document.getElementById("guess_energy").value)
 };
 msg.innerHTML='<div class="inline-error neutral">שולח...</div>';
 try{
   await api("submit_opening",{student_id:s.student_id,survey_option:survey,guesses});
   studentRoom();
 }catch(e){
   msg.innerHTML='<div class="inline-error">לא הצלחנו לשמור. נסו שוב.</div>';
 }
}

function teacherLogin(){
  imageScreen(
    "teacher-login-screen clean-login-screen",
    "/public/screens/brixlab-desktop.png",
    "/public/screens/brixlab-mobile.png",
    '<div class="auth-wrap"><div class="auth-card teacher-auth-card"><h1>כניסת מורה</h1><div id="teacherMsg"></div><label class="auth-field"><span>שם מורה</span><input id="teacherName" placeholder="הקלידו שם"></label><label class="auth-field"><span>סיסמת מורה</span><input id="teacherPassword" type="password" placeholder="הקלידו סיסמה" autocomplete="current-password"></label><button class="auth-primary" onclick="teacherEnter()">כניסה <span>‹</span></button><button class="auth-link" onclick="go(\'home\')">חזרה למסך הבית</button></div></div>'
  );
}

function teacherEnter(){
  const nameInput=document.getElementById("teacherName");
  const input=document.getElementById("teacherPassword");
  const msg=document.getElementById("teacherMsg");
  const teacherName=(nameInput?.value||"").trim();
  const password=(input?.value||"").trim();
  if(!teacherName){
    msg.innerHTML='<div class="inline-error">יש להזין שם מורה.</div>';
    nameInput?.focus();
    return;
  }
  if(!password){
    msg.innerHTML='<div class="inline-error">יש להזין סיסמת מורה.</div>';
    input?.focus();
    return;
  }
  sessionStorage.setItem("brix_teacher_unlocked","1");
  sessionStorage.setItem("brix_teacher_name",teacherName);
  go("teacher-menu");
}

function teacherMenu(){
  if(sessionStorage.getItem("brix_teacher_unlocked")!=="1"){go("teacher");return}
  imageScreen(
    "teacher-menu-screen clean-login-screen",
    "/public/screens/brixlab-desktop.png",
    "/public/screens/brixlab-mobile.png",
    '<div class="auth-wrap"><div class="auth-card teacher-menu-card"><h1>שלום, '+esc(sessionStorage.getItem("brix_teacher_name")||"")+'</h1><p class="auth-subtitle">מה נרצה לעשות?</p><button class="auth-primary" onclick="go(\'new-session\')">פתיחת כיתה חדשה <span>‹</span></button><button class="auth-secondary" onclick="go(\'existing-session\')">כניסה לכיתה קיימת</button><button class="auth-link" onclick="go(\'teacher\')">חזרה</button></div></div>'
  );
}

function existingSession(){
  if(sessionStorage.getItem("brix_teacher_unlocked")!=="1"){go("teacher");return}
  imageScreen(
    "existing-session-screen clean-login-screen",
    "/public/screens/brixlab-desktop.png",
    "/public/screens/brixlab-mobile.png",
    '<div class="auth-wrap"><div class="auth-card"><h1>כניסה לכיתה קיימת</h1><div id="existingMsg"></div><label class="auth-field"><span>קוד כיתה</span><input id="existingClassCode" inputmode="numeric" maxlength="6" placeholder="הקלידו קוד כיתה"></label><button class="auth-primary" onclick="resumeExistingSession()">כניסה לכיתה <span>‹</span></button><button class="auth-link" onclick="go(\'teacher-menu\')">חזרה</button></div></div>'
  );
}

async function resumeExistingSession(){
  const code=(document.getElementById("existingClassCode")?.value||"").trim();
  const msg=document.getElementById("existingMsg");
  const teacherName=sessionStorage.getItem("brix_teacher_name")||"";
  if(!code){msg.innerHTML='<div class="inline-error">יש להזין קוד כיתה.</div>';return}
  msg.innerHTML='<div class="inline-error neutral">מתחבר לכיתה...</div>';
  try{
    const data=await api("resume_session",{class_code:code,teacher_name:teacherName});
    localStorage.setItem("brix_teacher",JSON.stringify(data));
    go("dashboard");
  }catch(e){
    msg.innerHTML='<div class="inline-error">לא נמצאה כיתה פעילה עם הקוד הזה עבור המורה הנוכחי.</div>';
  }
}

function newSession(){
 if(sessionStorage.getItem("brix_teacher_unlocked")!=="1"){go("teacher");return}
 imageScreen(
   "new-session-screen clean-login-screen",
   "/public/screens/brixlab-desktop.png",
   "/public/screens/brixlab-mobile.png",
   '<div class="auth-wrap"><div class="auth-card new-session-card"><h1>פתיחת שיעור חדש</h1><p class="auth-subtitle">יוצרים כיתה, קוד כניסה וקבוצות אוטומטית.</p><div id="msg"></div><label class="auth-field"><span>שם הכיתה</span><input id="className" placeholder="לדוגמה ח׳2"></label><label class="auth-field"><span>מספר קבוצות</span><select id="groupCount">'+[4,5,6,7,8,9,10].map(n=>'<option '+(n===6?'selected':'')+'>'+n+'</option>').join("")+'</select></label><button class="auth-primary" onclick="createSession()">צור שיעור וקוד כיתה <span>‹</span></button><button class="auth-link" onclick="go(\'teacher-menu\')">חזרה</button></div></div>'
 );
}
async function createSession(){
 const className=document.getElementById("className").value.trim();
 const groupCount=Number(document.getElementById("groupCount").value);
 const teacherName=sessionStorage.getItem("brix_teacher_name")||"מורה";
 const msg=document.getElementById("msg"); msg.innerHTML="";
 if(!className){msg.innerHTML='<div class="error">צריך להזין שם כיתה.</div>';return}
 try{
  const data=await api("create_session",{class_name:className,group_count:groupCount,teacher_name:teacherName});
  localStorage.setItem("brix_teacher",JSON.stringify(data)); go("dashboard");
 }catch(e){msg.innerHTML='<div class="error">לא הצלחתי לפתוח שיעור. נסו שוב.</div>'}
}
async function toggleProjection(){
  const on=!document.body.classList.contains("projection-mode");
  document.body.classList.toggle("projection-mode",on);
  try{
    if(on && !document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    if(!on && document.fullscreenElement) await document.exitFullscreen?.();
  }catch(e){}
  if(location.hash.startsWith("#dashboard")) dashboard();
}

document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement && document.body.classList.contains("projection-mode")){
    document.body.classList.remove("projection-mode");
    if(location.hash.startsWith("#dashboard")) dashboard();
  }
});

async function setStage(stage){
  const t=JSON.parse(localStorage.getItem("brix_teacher")||"null");
  if(!t)return;
  try{
    await api("set_stage",{session_id:t.session_id,teacher_token:t.teacher_token,stage});
    dashboard();
  }catch(e){}
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
 const projecting=document.body.classList.contains("projection-mode");
 shell('<div class="topbar"><button class="btn ghost top-exit" onclick="localStorage.removeItem(\'brix_teacher\');document.body.classList.remove(\'projection-mode\');go(\'home\')">יציאה</button><div class="top-brand">'+brand()+'</div><button class="btn projection-btn" onclick="toggleProjection()">'+(projecting?'יציאה מהקרנה':'מצב הקרנה')+'</button></div><div class="dashboard"><aside class="side"><div class="card qr-card"><h3>כניסת תלמידים</h3><img src="'+qr+'" width="180" height="180" alt="QR לכניסת תלמידים"><div class="code">'+s.class_code+'</div><p>סריקה או הזנת קוד כיתה</p></div><div class="card phase-card"><h3>מהלך השיעור</h3><div class="phase-grid">'+["פתיחה","ניסוי עצמאי","סיכום כיתתי","רפלקציה"].map((x,i)=>'<div class="phase '+(i===s.current_stage?'active':'')+'"><span class="phase-num">'+(i+1)+'</span><span>'+x+'</span></div>').join("")+'</div><div class="experiment-flow"><strong>בתוך הניסוי:</strong><span>רפרקטומטר</span><span>כיול</span><span>חקר</span><span>השוואה</span><span>תכן</span></div><div class="phase-actions">'+(s.current_stage===0?'<button class="btn primary" onclick="setStage(1)">פתחו את הניסוי</button>':s.current_stage===1?'<button class="btn primary" onclick="setStage(2)">עברו לסיכום</button>':s.current_stage===2?'<button class="btn primary" onclick="setStage(3)">פתחו רפלקציה</button>':'<span class="phase-done">השיעור בשלב הרפלקציה</span>')+'</div></div></aside><section class="mainpanel"><div class="card"><h2>'+esc(s.class_name)+' · '+esc(s.teacher_name||"מורה")+'</h2><div class="statgrid"><div class="stat"><div class="n">'+data.student_count+'</div><div>תלמידים מחוברים</div></div><div class="stat"><div class="n">'+s.group_count+'</div><div>קבוצות</div></div><div class="stat"><div class="n">'+(s.student_entry_open?'פתוחה':'סגורה')+'</div><div>כניסת תלמידים</div></div></div></div>'+(s.current_stage===0?'<div class="card opening-live-card"><div class="opening-live-head"><div><span class="student-kicker">פתיחה כיתתית</span><h2>סקר + ניחוש מתוק</h2></div><strong>'+data.opening.submitted_count+' / '+data.student_count+' ענו</strong></div><div class="teacher-survey"><div><span>פעם ביום</span><b>'+data.opening.survey.daily+'</b></div><div><span>פעם בשבוע</span><b>'+data.opening.survey.weekly+'</b></div><div><span>רק באירועים</span><b>'+data.opening.survey.events+'</b></div><div><span>לא שותה ממותק</span><b>'+data.opening.survey.never+'</b></div></div><div class="guess-averages"><h3>ממוצע ניחושי הכיתה — כפיות ב־500 מ״ל</h3><div><span>קולה <b>'+data.opening.guess_averages.cola+'</b></span><span>תפוזים <b>'+data.opening.guess_averages.orange+'</b></span><span>תה קר <b>'+data.opening.guess_averages.iced_tea+'</b></span><span>אנרגיה <b>'+data.opening.guess_averages.energy+'</b></span></div></div><p class="opening-note">אין חשיפת תשובות באפליקציה בשלב זה — הדיון והעובדות נשארים במליאה דרך המצגת.</p></div>':'')+'<div class="card"><h2>התקדמות קבוצות</h2><div class="groups">'+data.groups.map(g=>'<article class="group"><span class="badge">'+g.student_count+' תלמידים</span><h3>'+esc(g.group_name)+'</h3><div class="students">'+(g.students.length?g.students.map(st=>'<span class="student">'+esc(st.first_name)+'</span>').join(""):'<span class="student">ממתינה לתלמידים</span>')+'</div></article>').join("")+'</div></div></section></div>');
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
 else if(view==="teacher-menu")teacherMenu();
 else if(view==="existing-session")existingSession();
 else if(view==="new-session")newSession();
 else if(view==="dashboard")dashboard();
 else home();
}
router();