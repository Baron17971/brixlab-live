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

function lessonProgress(current,active,onStudent=false){
  const labels=["פתיחה","ניסוי","סיכום","רפלקציה"];
  const steps=labels.map((label,i)=>{
    const unlocked=i<=current;
    const cls=['lesson-step',unlocked?'unlocked':'locked',i===active?'active':''].filter(Boolean).join(' ');
    const action=unlocked
      ? (onStudent
          ? (i===0?' onclick="showStudentOpeningReview()"':i===1?' onclick="showStudentExperiment()"':'')
          : '')
      : '';
    const status=i===active?'כעת':unlocked?'פתוח':'טרם נפתח';
    return '<button class="'+cls+'" '+(unlocked?'':'disabled')+action+'><span class="step-dot">'+(i+1)+'</span><span class="step-copy"><strong>'+label+'</strong><small>'+status+'</small></span></button>';
  }).join("");
  return (onStudent?'':'<div class="progress-heading"><strong>התקדמות השיעור</strong><span>שלב שנפתח נשאר זמין</span></div>')+'<nav class="lesson-progress" aria-label="התקדמות בשיעור">'+steps+'</nav>';
}

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
 try{state=await api("student_state",{student_id:s.student_id});sessionStorage.setItem("brix_student_stage",String(state.current_stage||0))}
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

 if(state.current_stage===1){
   studentExperiment(s,state);
   return;
 }

 shell('<div class="student-lab-shell"><div class="student-lab-top">'+brand()+'</div>'+lessonProgress(state.current_stage,state.current_stage,true)+'<div class="card student-next-card"><span class="student-kicker">השלב הכיתתי הבא</span><h1>ממתינים להנחיית המורה</h1><p>הניסוי העצמאי הסתיים. כל שלב שכבר נפתח נשאר זמין בסרגל ההתקדמות.</p></div></div>');
}

async function showStudentExperiment(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let state;
  try{
    state=await api("student_state",{student_id:s.student_id});
    sessionStorage.setItem("brix_student_stage",String(state.current_stage||0));
  }catch(e){return}
  if(Number(state.current_stage||0)<1)return;
  studentExperiment(s,state);
}

async function showStudentOpeningReview(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let state;
  try{state=await api("student_state",{student_id:s.student_id})}catch(e){return}
  sessionStorage.setItem("brix_student_stage",String(state.current_stage||0));
  const a=state.opening_answer||{};
  const labels={daily:"פעם ביום",weekly:"פעם בשבוע",events:"רק באירועים מיוחדים",never:"לא שותה ממותק"};
  const g=a.guesses||{};
  shell('<div class="student-opening-shell"><header class="student-opening-head">'+brand()+'<div><strong>'+esc(s.first_name)+'</strong><span>'+esc(s.group_name)+'</span></div></header>'+lessonProgress(state.current_stage,0,true)+'<main class="student-opening-main review-main"><section class="opening-card review-card"><span class="student-kicker">שלב פתיחה · נשאר פתוח</span><h1>התשובות שלכם</h1><div class="review-answer"><span>תדירות שתיית משקאות ממותקים</span><strong>'+esc(labels[a.survey_option]||"—")+'</strong></div><div class="review-guesses"><h3>הניחושים שלכם</h3><div><span>קולה <b>'+esc(g.cola??"—")+'</b></span><span>תפוזים <b>'+esc(g.orange??"—")+'</b></span><span>תה קר <b>'+esc(g.iced_tea??"—")+'</b></span><span>אנרגיה <b>'+esc(g.energy??"—")+'</b></span></div></div>'+(state.current_stage>=1?'<button class="btn primary" onclick="showStudentExperiment()">חזרה לניסוי</button>':'')+'</section></main></div>');
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

function studentExperiment(s,state){
  const step=Number(state.experiment_step||0);
  if(step>=3){
    renderCalibrationDone(s,state);
    return;
  }
  if(step>=2){
    renderCalibration(s,state);
    return;
  }
  if(step===1){
    renderBrixPractice(s);
    return;
  }

  shell('<div class="student-experiment-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(state.current_stage,1,true)+'<main class="experiment-intro"><section class="experiment-hero card"><span class="student-kicker">שלב 1 · מכירים את המכשיר</span><h1>רפרקטומטר — מה בעצם מודדים?</h1><p class="experiment-lead">הרפרקטומטר מודד את <strong>ריכוז כלל החומרים המומסים</strong> בתמיסה באמצעות שבירת אור. בתמיסות הסוכר שלנו ערך הקריאה יוצג ביחידות <strong>Brix</strong>.</p><div class="science-note"><strong>חשוב:</strong> המכשיר אינו “מזהה סוכר”. בפירות ובמשקאות הוא מגיב לכלל המומסים.</div></section><section class="how-grid"><article class="how-card"><b>1</b><h3>מניחים טיפות</h3><p>פותחים את המכסה ומניחים כמה טיפות על לוח הזכוכית.</p></article><article class="how-card"><b>2</b><h3>סוגרים</h3><p>סוגרים את המכסה כך שהנוזל יתפזר על פני המשטח.</p></article><article class="how-card"><b>3</b><h3>מול האור</h3><p>מביטים דרך העינית כשהמכשיר מופנה אל מקור אור.</p></article><article class="how-card"><b>4</b><h3>קוראים Brix</h3><p>קוראים את הערך במקום שבו נפגשים האזור הכחול והאזור הבהיר.</p></article></section><section class="cleaning-tip card"><div>🧻</div><div><strong>בין מדידה למדידה:</strong><br>מנגבים היטב את לוח הזכוכית לפני שמניחים דגימה חדשה.</div></section><button class="btn primary experiment-main-btn" onclick="startBrixPractice()">לתרגול עם המכשיר האמיתי</button></main></div>');
}

async function startBrixPractice(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  try{await api("update_student_progress",{student_id:s.student_id,experiment_step:1});}catch(e){}
  renderBrixPractice(s);
}

function renderBrixPractice(s){
  const stateStage=Number(sessionStorage.getItem("brix_student_stage")||1);
  shell('<div class="student-experiment-shell practice-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="practice-main"><section class="practice-card card real-device-card"><span class="student-kicker">שלב 2 · תרגול עם המכשיר האמיתי</span><h1>בדיקת מים</h1><p>קחו את הרפרקטומטר של הקבוצה. הניחו כמה טיפות מים, סגרו את המכסה, הביטו מול האור וקראו את ערך ה־Brix.</p><div class="real-device-steps"><span><b>1</b> טיפות מים</span><span><b>2</b> סוגרים</span><span><b>3</b> מול האור</span><span><b>4</b> קוראים</span></div><label class="real-reading"><span>מה קראתם?</span><div><input id="realBrixReading" type="number" inputmode="decimal" step="0.1" min="0" max="5" placeholder="0.0"><strong>°Brix</strong></div></label><div id="practiceFeedback" class="practice-feedback"></div><button class="btn primary experiment-main-btn" onclick="checkRealBrixReading()">בדיקת הקריאה</button><p class="micro-note">במים נקיים הקריאה צפויה להיות סביב 0° Brix. סטייה קטנה אפשרית; אם הקריאה גבוהה, נקו את המשטח ומדדו שוב.</p></section></main></div>');
}

function checkRealBrixReading(){
  const input=document.getElementById("realBrixReading");
  const fb=document.getElementById("practiceFeedback");
  const value=Number(input?.value);
  if(!Number.isFinite(value)){
    fb.innerHTML='<div class="feedback-try">הזינו את הערך שקראתם במכשיר.</div>';
    return;
  }
  if(value>=0 && value<=1){
    fb.innerHTML='<div class="feedback-good">מצוין ✓ בדיקת האפס תקינה. עוברים מיד למדידת תמיסות הכיול.</div>';
    setTimeout(()=>finishBrixPractice(1),700);
  }else{
    fb.innerHTML='<div class="feedback-try">הקריאה גבוהה מהצפוי למים. נקו את משטח הזכוכית, הניחו מים מחדש ומדדו שוב.</div>';
  }
}

async function finishBrixPractice(score){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  try{await api("update_student_progress",{student_id:s.student_id,experiment_step:2,practice_score:score});}catch(e){}
  let state;
  try{state=await api("student_state",{student_id:s.student_id})}catch(e){state={current_stage:Number(sessionStorage.getItem("brix_student_stage")||1),calibration:[]}}
  renderCalibration(s,state);
}

function renderCalibration(s,state){
  const stateStage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  const saved=Object.fromEntries((state?.calibration||[]).map(x=>[Number(x.solution_number),x.brix_value]));
  shell('<div class="student-experiment-shell calibration-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="calibration-main"><section class="calibration-card card"><span class="student-kicker">חלק א׳ · גרף כיול</span><h1>מדידת 6 תמיסות הכיול</h1><p class="calibration-lead">בדיקת המים הייתה רק בדיקת האפס. עכשיו נגבו את לוח הזכוכית ומדדו ברפרקטומטר את שש התמיסות הידועות, אחת אחרי השנייה.</p><div class="science-note"><strong>בין כל שתי מדידות:</strong> נגבו היטב את לוח הזכוכית לפני שמניחים את התמיסה הבאה.</div><div class="calibration-grid">'+[1,2,3,4,5,6].map(n=>{const row=(state?.calibration||[]).find(x=>Number(x.solution_number)===n)||{};return '<div class="calibration-input"><span>תמיסה '+n+'</span><label class="mini-field"><small>ריכוז סוכר</small><div><input id="conc_'+n+'" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="'+esc(row.sugar_concentration??"")+'" placeholder="גרם/100 מ״ל"><strong>g/100mL</strong></div></label><label class="mini-field"><small>מדידת מומסים</small><div><input id="cal_'+n+'" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="'+esc(saved[n]??"")+'" placeholder="Brix"><strong>°Brix</strong></div></label></div>'}).join("")+'</div><div id="calibrationMsg"></div><button class="btn primary experiment-main-btn" onclick="saveCalibration()">שמירת המדידות</button></section></main></div>');
}

async function saveCalibration(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  const msg=document.getElementById("calibrationMsg");
  const measurements=[];
  for(let n=1;n<=6;n++){
    const rawBrix=document.getElementById("cal_"+n)?.value;
    const rawConc=document.getElementById("conc_"+n)?.value;
    const value=Number(rawBrix);
    const concentration=Number(rawConc);
    if(rawBrix==="" || rawConc==="" || !Number.isFinite(value) || !Number.isFinite(concentration) || value<0 || value>100 || concentration<0 || concentration>100){
      msg.innerHTML='<div class="feedback-try">יש להזין לכל שש התמיסות גם ריכוז סוכר וגם ערך Brix.</div>';
      return;
    }
    measurements.push({solution_number:n,sugar_concentration:concentration,brix_value:value});
  }
  msg.innerHTML='<div class="inline-error neutral">שומר את מדידות הקבוצה...</div>';
  try{
    await api("save_calibration",{student_id:s.student_id,measurements});
    let state=await api("student_state",{student_id:s.student_id});
    renderCalibrationDone(s,state);
  }catch(e){
    msg.innerHTML='<div class="feedback-try">לא הצלחנו לשמור את המדידות. נסו שוב.</div>';
  }
}

function renderCalibrationDone(s,state){
  const stateStage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  window.__brixModelState=state;
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל</span><h1>לפני שבונים גרף — מה באמת בדקנו?</h1><p class="model-lead">בכיול שינינו דבר אחד ובדקנו כיצד המדידה משתנה בעקבותיו.</p><div class="variable-quiz"><div class="quiz-card"><h3>מהו המשתנה הבלתי־תלוי?</h3><button onclick="answerVariable(this,'x','ריכוז הסוכר בתמיסה',true)">ריכוז הסוכר בתמיסה</button><button onclick="answerVariable(this,'x','ריכוז המומסים ב־Brix',false)">ריכוז המומסים ב־Brix</button></div><div class="quiz-card"><h3>מהו המשתנה התלוי?</h3><button onclick="answerVariable(this,'y','ריכוז המומסים הנמדד ברפרקטומטר',true)">ריכוז המומסים הנמדד ברפרקטומטר</button><button onclick="answerVariable(this,'y','ריכוז הסוכר שהכנו',false)">ריכוז הסוכר שהכנו</button></div><div class="quiz-card"><h3>מה היחידות של ריכוז הסוכר?</h3><button onclick="answerVariable(this,'xu','גרם סוכר ל־100 מ״ל',true)">גרם סוכר ל־100 מ״ל</button><button onclick="answerVariable(this,'xu','°Brix',false)">°Brix</button></div><div class="quiz-card"><h3>מה היחידות של מדידת המומסים?</h3><button onclick="answerVariable(this,'yu','°Brix',true)">°Brix</button><button onclick="answerVariable(this,'yu','גרם/100 מ״ל',false)">גרם/100 מ״ל</button></div></div><div id="variableQuizMsg"></div><button id="toAxesBtn" class="btn primary experiment-main-btn" onclick="showAxisBuilder()" disabled>ממשיכים לבניית הצירים</button></section></main></div>');
}

window.__variableAnswers={};
function answerVariable(btn,key,value,correct){
  const box=btn.closest('.quiz-card');
  box.querySelectorAll('button').forEach(b=>b.classList.remove('selected-good','selected-bad'));
  btn.classList.add(correct?'selected-good':'selected-bad');
  if(correct){window.__variableAnswers[key]=value}else{delete window.__variableAnswers[key]}
  const ok=['x','y','xu','yu'].every(k=>window.__variableAnswers[k]);
  const next=document.getElementById('toAxesBtn');
  if(next) next.disabled=!ok;
  const msg=document.getElementById('variableQuizMsg');
  if(msg) msg.innerHTML=correct?'<div class="feedback-good compact-feedback">נכון ✓</div>':'<div class="feedback-try compact-feedback">נסו שוב — חשבו מה אנחנו משנים ומה אנחנו מודדים.</div>';
}

function showAxisBuilder(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  const state=window.__brixModelState||{};
  const stateStage=Number(state.current_stage ?? 1);
  window.__axisPlacement={x:null,y:null};
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל · שלב 2</span><h1>מקמו את המשתנים על הצירים</h1><p class="model-lead">גררו כל כרטיס לציר המתאים. במובייל אפשר גם להקיש על הכרטיס ואז על הציר.</p><div class="axis-chips"><button class="axis-chip" draggable="true" data-var="concentration" ondragstart="axisDrag(event)" onclick="selectAxisChip(this)">ריכוז הסוכר<br><small>גרם/100 מ״ל</small></button><button class="axis-chip" draggable="true" data-var="brix" ondragstart="axisDrag(event)" onclick="selectAxisChip(this)">ריכוז המומסים<br><small>°Brix</small></button></div><div class="axis-board"><div class="axis-zone y-zone" data-axis="y" ondragover="event.preventDefault()" ondrop="axisDrop(event,'y')" onclick="axisTapDrop('y')"><span>ציר Y</span><strong id="axisYLabel">הניחו כאן משתנה</strong></div><div class="plot-placeholder"><div class="fake-y"></div><div class="fake-x"></div><span>כאן ייבנה הגרף</span></div><div class="axis-zone x-zone" data-axis="x" ondragover="event.preventDefault()" ondrop="axisDrop(event,'x')" onclick="axisTapDrop('x')"><span>ציר X</span><strong id="axisXLabel">הניחו כאן משתנה</strong></div></div><div id="axisMsg"></div><button id="buildPointsBtn" class="btn primary experiment-main-btn" onclick="showCalibrationPoints()" disabled>בנו את נקודות הכיול</button></section></main></div>');
}

window.__selectedAxisChip=null;
function selectAxisChip(btn){
  document.querySelectorAll('.axis-chip').forEach(x=>x.classList.remove('selected'));
  btn.classList.add('selected');
  window.__selectedAxisChip=btn.dataset.var;
}
function axisDrag(e){e.dataTransfer.setData('text/plain',e.currentTarget.dataset.var)}
function axisDrop(e,axis){e.preventDefault();placeAxis(e.dataTransfer.getData('text/plain'),axis)}
function axisTapDrop(axis){if(window.__selectedAxisChip)placeAxis(window.__selectedAxisChip,axis)}
function placeAxis(variable,axis){
  const correct=(axis==='x'&&variable==='concentration')||(axis==='y'&&variable==='brix');
  const msg=document.getElementById('axisMsg');
  if(!correct){
    if(msg) msg.innerHTML='<div class="feedback-try">כמעט. זכרו: בציר X שמים את מה ששינינו, ובציר Y את מה שמדדנו בעקבות השינוי.</div>';
    return;
  }
  window.__axisPlacement[axis]=variable;
  const label=axis==='x'?'ריכוז הסוכר · גרם/100 מ״ל':'ריכוז המומסים · °Brix';
  const el=document.getElementById(axis==='x'?'axisXLabel':'axisYLabel');
  if(el) el.textContent=label;
  document.querySelector('.axis-chip[data-var="'+variable+'"]')?.classList.add('placed');
  const ok=window.__axisPlacement.x&&window.__axisPlacement.y;
  document.getElementById('buildPointsBtn').disabled=!ok;
  if(msg) msg.innerHTML=ok?'<div class="feedback-good">מעולה. הצירים מוכנים ✓</div>':'';
}

function classCalibrationPoints(){
  const rows=(window.__brixModelState?.class_calibration||[])
    .filter(r=>r.average_concentration!=null && r.average_brix!=null)
    .map(r=>({x:Number(r.average_concentration),y:Number(r.average_brix),n:Number(r.solution_number),groups:Number(r.reported_groups||0)}));
  return rows.sort((a,b)=>a.x-b.x);
}

function showCalibrationPoints(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  const state=window.__brixModelState||{};
  const stateStage=Number(state.current_stage ?? 1);
  const pts=classCalibrationPoints();
  if(pts.length<2){
    shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל</span><h1>עוד רגע בונים את הגרף</h1><p class="model-lead">עדיין אין מספיק נתונים כיתתיים כדי ליצור נקודות כיול. הנתונים יתעדכנו כשקבוצות נוספות ישמרו את המדידות.</p><button class="btn primary" onclick="refreshModelState()">בדקו שוב</button></section></main></div>');
    return;
  }
  const graph=calibrationSvg(pts,false,false);
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(stateStage,1,true)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל · שלב 3</span><h1>הנקודות נוצרות מהמדידות של הכיתה</h1><p class="model-lead">כל נקודה מחברת בין ריכוז סוכר ידוע לבין ממוצע ה־Brix שנמדד עבורו.</p><div class="class-data-strip">'+pts.map(p=>'<span><b>'+p.x+'</b> g/100mL → <b>'+p.y+'</b> °Brix</span>').join('')+'</div><div id="calibrationGraph" class="calibration-graph">'+graph+'</div><div class="pattern-question"><h3>מה אתם מזהים?</h3><div class="pattern-options"><button onclick="patternAnswer(this,true)">ככל שריכוז הסוכר עולה, גם ערך ה־Brix עולה</button><button onclick="patternAnswer(this,false)">אין קשר בין המשתנים</button><button onclick="patternAnswer(this,false)">ככל שריכוז הסוכר עולה, ערך ה־Brix יורד</button></div><div id="patternMsg"></div></div><button id="trendBtn" class="btn primary experiment-main-btn" onclick="addTrendLine()" disabled>הוספת קו מגמה</button><button id="equationBtn" class="btn ghost experiment-main-btn" onclick="showTrendEquation()" disabled>הצגת משוואת הישר</button><div id="equationBox"></div></section></main></div>');
  window.__modelPoints=pts;
}
async function refreshModelState(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  try{window.__brixModelState=await api("student_state",{student_id:s.student_id});showCalibrationPoints()}catch(e){}
}
function patternAnswer(btn,correct){
  document.querySelectorAll('.pattern-options button').forEach(b=>b.classList.remove('selected-good','selected-bad'));
  btn.classList.add(correct?'selected-good':'selected-bad');
  document.getElementById('patternMsg').innerHTML=correct?'<div class="feedback-good">בדיוק. זהו קשר חיובי בין המשתנים.</div>':'<div class="feedback-try">נסו להתבונן שוב בכיוון הכללי של הנקודות.</div>';
  if(correct)document.getElementById('trendBtn').disabled=false;
}
function linearModel(pts){
  const n=pts.length;
  const sx=pts.reduce((a,p)=>a+p.x,0), sy=pts.reduce((a,p)=>a+p.y,0);
  const sxy=pts.reduce((a,p)=>a+p.x*p.y,0), sxx=pts.reduce((a,p)=>a+p.x*p.x,0);
  const den=n*sxx-sx*sx;
  const a=den===0?0:(n*sxy-sx*sy)/den;
  const b=(sy-a*sx)/n;
  return {a,b};
}
function addTrendLine(){
  document.getElementById('calibrationGraph').innerHTML=calibrationSvg(window.__modelPoints,true,false);
  document.getElementById('trendBtn').disabled=true;
  document.getElementById('equationBtn').disabled=false;
}
function showTrendEquation(){
  const m=linearModel(window.__modelPoints);
  document.getElementById('calibrationGraph').innerHTML=calibrationSvg(window.__modelPoints,true,true);
  const sign=m.b<0?'−':'+';
  document.getElementById('equationBox').innerHTML='<div class="equation-card"><span>משוואת קו הכיול</span><strong>y = '+m.a.toFixed(2)+'x '+sign+' '+Math.abs(m.b).toFixed(2)+'</strong><div class="equation-legend"><span><b>x</b> = ריכוז הסוכר</span><span><b>y</b> = °Brix</span></div><p>עכשיו נוכל למדוד Brix של דגימה לא ידועה, להציב את הערך במקום y ולחשב את x — ריכוז הסוכר המשוער.</p><button class="btn primary" onclick="showEquationUse()">איך המשוואה עוזרת לנו?</button></div>';
  document.getElementById('equationBtn').disabled=true;
}
function showEquationUse(){
  const m=linearModel(window.__modelPoints);
  const sampleY=Math.max(1,Math.round(window.__modelPoints.reduce((a,p)=>a+p.y,0)/window.__modelPoints.length*10)/10);
  const x=m.a===0?0:(sampleY-m.b)/m.a;
  document.getElementById('equationBox').innerHTML+='<div class="equation-use"><h3>מהמדידה אל הריכוז</h3><p>נניח שמדדנו דגימה וקיבלנו <strong>'+sampleY+'° Brix</strong>.</p><div class="solve-line"><span>y = '+m.a.toFixed(2)+'x '+(m.b<0?'−':'+' )+' '+Math.abs(m.b).toFixed(2)+'</span><span>'+sampleY+' = '+m.a.toFixed(2)+'x '+(m.b<0?'−':'+' )+' '+Math.abs(m.b).toFixed(2)+'</span><span>x ≈ <strong>'+x.toFixed(2)+' גרם/100 מ״ל</strong></span></div><p class="science-note">כך מודל שנבנה מנתוני הכיול מאפשר לנו לאמוד את ריכוז הסוכר בדגימה שאיננו יודעים את ריכוזה מראש.</p></div>';
}
function calibrationSvg(pts,trend,equation){
  const W=640,H=360,L=62,R=24,T=24,B=58;
  const maxX=Math.max(...pts.map(p=>p.x),1)*1.12;
  const maxY=Math.max(...pts.map(p=>p.y),1)*1.12;
  const sx=x=>L+(x/maxX)*(W-L-R);
  const sy=y=>H-B-(y/maxY)*(H-T-B);
  let grid='';
  for(let i=0;i<=5;i++){const gx=L+i*(W-L-R)/5, gy=T+i*(H-T-B)/5;grid+='<line x1="'+gx+'" y1="'+T+'" x2="'+gx+'" y2="'+(H-B)+'" class="gridline"/><line x1="'+L+'" y1="'+gy+'" x2="'+(W-R)+'" y2="'+gy+'" class="gridline"/>'}
  let marks=pts.map((p,i)=>'<g class="plot-point" style="animation-delay:'+(i*.16)+'s"><circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="6"/><title>תמיסה '+p.n+': '+p.x+' g/100mL, '+p.y+' Brix</title></g>').join('');
  let line='';
  if(trend){const m=linearModel(pts);const y0=m.b,y1=m.a*maxX+m.b;line='<line x1="'+sx(0)+'" y1="'+sy(Math.max(0,y0))+'" x2="'+sx(maxX)+'" y2="'+sy(Math.max(0,y1))+'" class="trend-line"/>'}
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="גרף כיול"><g>'+grid+'</g><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" class="axis-line"/><line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" class="axis-line"/><text x="'+(W/2)+'" y="'+(H-15)+'" class="axis-title">ריכוז הסוכר (גרם/100 מ״ל)</text><text x="18" y="'+(H/2)+'" transform="rotate(-90 18 '+(H/2)+')" class="axis-title">ריכוז המומסים (°Brix)</text>'+line+marks+'</svg>';
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
async function copyJoinLink(url){
  try{
    await navigator.clipboard.writeText(url);
  }catch(e){
    const ta=document.createElement("textarea");
    ta.value=url;
    ta.style.position="fixed";
    ta.style.opacity="0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  const el=document.getElementById("copyJoinLinkBtn");
  if(el){
    const old=el.textContent;
    el.textContent="הקישור הועתק ✓";
    setTimeout(()=>{el.textContent=old},1600);
  }
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

function teacherGroupProgress(g){
  const students=Number(g.student_count||0);
  const opening=Number(g.opening_completed||0);
  const step=Number(g.max_experiment_step||0);
  const cal=Number(g.calibration_count||0);
  let status="ממתינה להתחלה";
  if(opening>0 && opening<students) status="משלימה פתיחה";
  if(students>0 && opening===students) status="פתיחה הושלמה";
  if(step===1) status="בדיקת אפס ברפרקטומטר";
  if(step===2) status="מודדת תמיסות כיול";
  if(step>=3 || cal===6) status="מדידות כיול הושלמו";
  return {students,opening,step,cal,status};
}

async function dashboard(){
 const t=JSON.parse(localStorage.getItem("brix_teacher")||"null");
 if(!t){go("new-session");return}
 let data;
 try{data=await api("dashboard",{session_id:t.session_id,teacher_token:t.teacher_token})}
 catch(e){shell('<div class="card"><div class="error">לא הצלחתי לטעון את הדשבורד.</div></div>');return}
 const s=data.session;
 const joinUrl=location.origin+location.pathname+'#student?code='+encodeURIComponent(s.class_code);
 window.__brixJoinUrl=joinUrl;
 const qr='https://quickchart.io/qr?size=180&text='+encodeURIComponent(joinUrl);
 const projecting=document.body.classList.contains("projection-mode");
 const stageNames=["פתיחה","ניסוי עצמאי","סיכום כיתתי","רפלקציה"];
 const actionHtml=s.current_stage===0
   ? '<button class="btn primary" onclick="setStage(1)">פתחו את הניסוי</button>'
   : s.current_stage===1
   ? '<button class="btn primary" onclick="setStage(2)">עברו לסיכום</button>'
   : s.current_stage===2
   ? '<button class="btn primary" onclick="setStage(3)">פתחו רפלקציה</button>'
   : '<span class="phase-done">השיעור בשלב הרפלקציה</span>';

 const calibrationRows=(data.calibration_summary||[]).map(r=>{
   const avg=r.average_brix==null?'—':Number(r.average_brix).toFixed(2);
   const range=r.min_brix==null?'—':(Number(r.min_brix)===Number(r.max_brix)?Number(r.min_brix).toFixed(1):Number(r.min_brix).toFixed(1)+'–'+Number(r.max_brix).toFixed(1));
   const conc=r.average_concentration==null?'—':Number(r.average_concentration).toFixed(2); return '<tr><td data-label="תמיסה"><strong>תמיסה '+r.solution_number+'</strong></td><td data-label="ריכוז סוכר">'+conc+'</td><td data-label="קבוצות שדיווחו">'+r.reported_groups+' / '+s.group_count+'</td><td data-label="ממוצע Brix" class="avg-cell">'+avg+'</td><td data-label="טווח">'+range+'</td></tr>';
 }).join("");

 const groupCards=(data.groups||[]).map(g=>{
   const p=teacherGroupProgress(g);
   const openingDone=p.students>0 && p.opening===p.students;
   const zeroDone=p.step>=2;
   const calDone=p.cal===6 || p.step>=3;
   return '<article class="progress-group-card"><div class="group-progress-head"><div><h3>'+esc(g.group_name)+'</h3><span>'+esc(p.status)+'</span></div><strong>'+p.students+' תלמידים</strong></div><div class="group-task-grid"><div class="'+(openingDone?'done':'pending')+'"><span>פתיחה</span><b>'+p.opening+'/'+p.students+'</b></div><div class="'+(zeroDone?'done':p.step===1?'doing':'pending')+'"><span>בדיקת אפס</span><b>'+(zeroDone?'✓':p.step===1?'כעת':'—')+'</b></div><div class="'+(calDone?'done':p.step===2?'doing':'pending')+'"><span>מדידות כיול</span><b>'+p.cal+'/6</b></div><div class="pending"><span>גרף כיול</span><b>—</b></div></div></article>';
 }).join("");

 shell(
 '<div class="topbar"><button class="btn ghost top-exit" onclick="localStorage.removeItem(\'brix_teacher\');document.body.classList.remove(\'projection-mode\');go(\'home\')">יציאה</button><div class="top-brand">'+brand()+'</div><button class="btn projection-btn" onclick="toggleProjection()">'+(projecting?'יציאה מהקרנה':'מצב הקרנה')+'</button></div>'+
 lessonProgress(s.current_stage,s.current_stage,false)+
 '<div class="teacher-dashboard">'+
   '<aside class="teacher-side">'+
     '<div class="card qr-card compact-qr-card"><h3>כניסת תלמידים</h3><div class="compact-qr-body"><img src="'+qr+'" width="150" height="150" alt="QR לכניסת תלמידים"><div class="qr-meta"><div class="code">'+s.class_code+'</div><button id="copyJoinLinkBtn" class="copy-link-btn" onclick="copyJoinLink(window.__brixJoinUrl)">העתקת קישור</button><p>סריקה או קוד כיתה</p></div></div></div>'+
     '<div class="card teacher-control-card"><span class="student-kicker">השלב הנוכחי</span><h3>'+stageNames[s.current_stage]+'</h3><p>שלבים שכבר נפתחו נשארים זמינים. המורה שולטת רק במעברים הכיתתיים.</p>'+actionHtml+'</div>'+
   '</aside>'+
   '<main class="teacher-main">'+
     '<div class="card dashboard-summary"><div><span>פתיחה הושלמה</span><strong>'+data.opening.submitted_count+' / '+data.student_count+'</strong></div><div><span>קבוצות שסיימו כיול</span><strong>'+data.groups_calibration_done+' / '+s.group_count+'</strong></div><div><span>שלב כיתתי</span><strong>'+stageNames[s.current_stage]+'</strong></div></div>'+
     '<section class="card class-calibration-card"><div class="section-title-row"><div><span class="student-kicker">לפני בניית הגרף</span><h2>ממוצעי הכיול של הכיתה</h2></div><p>הטבלה מתעדכנת אוטומטית מכל קבוצה. הגרף הכיתתי ייבנה מהממוצעים.</p></div><div class="table-wrap"><table class="calibration-table"><thead><tr><th>תמיסה</th><th>ריכוז סוכר<br><small>g/100mL</small></th><th>קבוצות שדיווחו</th><th>ממוצע Brix</th><th>טווח</th></tr></thead><tbody>'+calibrationRows+'</tbody></table></div></section>'+
     '<section class="card groups-progress-card"><div class="section-title-row"><div><span class="student-kicker">ביצוע בפועל</span><h2>התקדמות הקבוצות</h2></div><p>כאן רואים מה כל קבוצה כבר ביצעה — לא מי מחובר.</p></div><div class="groups-progress-grid">'+groupCards+'</div></section>'+
     '<section class="card opening-live-card compact-opening-results"><div class="opening-live-head"><div><span class="student-kicker">פתיחה כיתתית</span><h2>תוצאות הסקר והניחושים</h2></div><strong>'+data.opening.submitted_count+' / '+data.student_count+' ענו</strong></div><div class="teacher-survey"><div><span>פעם ביום</span><b>'+data.opening.survey.daily+'</b></div><div><span>פעם בשבוע</span><b>'+data.opening.survey.weekly+'</b></div><div><span>רק באירועים</span><b>'+data.opening.survey.events+'</b></div><div><span>לא שותה ממותק</span><b>'+data.opening.survey.never+'</b></div></div><div class="guess-averages"><h3>ממוצע ניחושי הכיתה — כפיות ב־500 מ״ל</h3><div><span>קולה <b>'+data.opening.guess_averages.cola+'</b></span><span>תפוזים <b>'+data.opening.guess_averages.orange+'</b></span><span>תה קר <b>'+data.opening.guess_averages.iced_tea+'</b></span><span>אנרגיה <b>'+data.opening.guess_averages.energy+'</b></span></div></div></section>'+
   '</main>'+
 '</div>',
 "teacher-dashboard-shell "+(s.current_stage===0?"teacher-opening-shell":"")
 );
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