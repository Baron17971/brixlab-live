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

window.__brixDraft={};
window.__brixDraftTimers={};

function saveStudentDraftPatch(patch,delay=300){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s||!patch||typeof patch!=="object")return;
  window.__brixDraft={...(window.__brixDraft||{}),...patch};
  const key=Object.keys(patch).sort().join("|")||"draft";
  clearTimeout(window.__brixDraftTimers[key]);
  window.__brixDraftTimers[key]=setTimeout(()=>{
    api("save_student_draft",{student_id:s.student_id,patch}).catch(()=>{});
  },delay);
}
function saveDraftNow(patch){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return Promise.resolve();
  window.__brixDraft={...(window.__brixDraft||{}),...patch};
  return api("save_student_draft",{student_id:s.student_id,patch}).catch(()=>null);
}
function mergeNestedDraft(key,patch,delay=300){
  const next={...((window.__brixDraft||{})[key]||{}),...patch};
  saveStudentDraftPatch({[key]:next},delay);
}

function studentGroupIdentity(s,state={}){
  const members=(state.group_members||[]).filter(Boolean);
  const names=members.length?members:[s.first_name].filter(Boolean);
  return '<div class="student-group-identity"><strong>'+esc(s.group_name)+'</strong><span>'+names.map(esc).join(' · ')+'</span></div>';
}

function studentUnlockedThrough(fallback=0){
  const saved=Number(sessionStorage.getItem("brix_student_max_stage"));
  return Number.isFinite(saved)?Math.max(saved,Number(fallback||0)):Number(fallback||0);
}

function lessonProgress(current,active,onStudent=false){
  const labels=["פתיחה","ניסוי","בדיקת ידע","מסקנות וחקר"];
  const steps=labels.map((label,i)=>{
    const unlocked=i<=current;
    const cls=['lesson-step',unlocked?'unlocked':'locked',i===active?'active':''].filter(Boolean).join(' ');
    const action=unlocked
      ? (onStudent
          ? (i===0?' onclick="showStudentOpeningReview()"':i===1?' onclick="showStudentExperiment()"':i===2?' onclick="studentQuiz()"':i===3?' onclick="studentGroupWrap(renderGroupConclusions)"':'')
          : ' onclick="setStage('+i+')"')
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
const BRIX_QUIZ_QUESTIONS=[
  {q:"מה מודד הרפרקטומטר בניסוי שלנו?",options:{A:"את מסת הסוכר בלבד",B:"את ריכוז החומרים המומסים בתמיסה",C:"את נפח המשקה",D:"את צפיפות המשקה בלבד"},correct:"B",note:"הרפרקטומטר מגיב לכלל החומרים המומסים. לכן במשקה אמיתי ערך Brix אינו מדידה ישירה של סוכר בלבד."},
  {q:"למה בדקנו מים לפני תחילת המדידות?",options:{A:"כדי לבדוק שהמכשיר מראה ערך קרוב ל־0",B:"כדי לדלל את תמיסות הסוכר",C:"כדי לחשב את מסת הסוכר",D:"כדי למצוא את ערך ה־Brix המרבי"},correct:"A",note:"המים משמשים לבדיקת האפס של הרפרקטומטר לפני המדידות."},
  {q:"בשלב הכיול, מה היה המשתנה הבלתי־תלוי?",options:{A:"ערך ה־Brix",B:"סוג הרפרקטומטר",C:"ריכוז הסוכר בתמיסה",D:"צבע התמיסה"},correct:"C",note:"ריכוז הסוכר הוא המשתנה ששינינו באופן מכוון בין תמיסות הכיול."},
  {q:"ומה היה המשתנה התלוי?",options:{A:"ריכוז הסוכר שהכנו",B:"ריכוז המומסים שנמדד ב־°Brix",C:"מספר התמיסה",D:"נפח התמיסה"},correct:"B",note:"ערך ה־Brix הוא המדידה שהתקבלה בעקבות שינוי ריכוז הסוכר."},
  {q:"מה אנו מצפים שיקרה לערך ה־Brix ככל שריכוז הסוכר בתמיסה עולה?",options:{A:"בדרך כלל יעלה",B:"תמיד ירד",C:"יישאר קבוע",D:"אין שום קשר ביניהם"},correct:"A",note:"בתמיסות הכיול שלנו צפויה מגמה עולה: יותר סוכר מומס מוביל בדרך כלל לערך Brix גבוה יותר."},
  {q:"למה בנינו גרף כיול לפני שבדקנו משקאות לא ידועים?",options:{A:"כדי להשוות בין צבעי המשקאות",B:"כדי ליצור קשר בין ערך Brix לבין ריכוז סוכר ידוע",C:"כדי לחשב את נפח המשקה",D:"כדי לבדוק אם הרפרקטומטר עובד מהר יותר"},correct:"B",note:"גרף הכיול מאפשר להשתמש במדידת Brix של דגימה לא ידועה כדי לאמוד את ריכוז הסוכר שלה."},
  {q:"במשוואה y = ax + b, מה מייצג y בניסוי שלנו?",options:{A:"ריכוז הסוכר המשוער",B:"ערך ה־Brix שנמדד",C:"מספר הדגימה",D:"נפח המשקה"},correct:"B",note:"במודל שלנו y הוא ערך ה־Brix הנמדד, ואילו x הוא ריכוז הסוכר."},
  {q:"מדדנו משקה לא ידוע וקיבלנו ערך Brix. מה אנחנו רוצים לחשב באמצעות משוואת הכיול?",options:{A:"את y מחדש",B:"את x — ריכוז הסוכר המשוער",C:"את נפח המשקה",D:"את טמפרטורת המשקה"},correct:"B",note:"מציבים את ערך ה־Brix במקום y ומבודדים את x כדי לקבל אומדן לריכוז הסוכר."},
  {q:"למה מתאים גרף עמודות להשוואה בין הדגימות שבדקנו?",options:{A:"כי סוג הדגימה הוא משתנה בדיד",B:"כי Brix תמיד חייב להיות מספר שלם",C:"כי כל המדידות זהות",D:"כי אי אפשר להשתמש בציר y"},correct:"A",note:"סוג הדגימה הוא קטגוריה בדידה, ולכן גרף עמודות מתאים להשוואה בין הקטגוריות."},
  {q:"דגימה מסוימת נתנה ערך Brix גבוה. מה אפשר להסיק בביטחון?",options:{A:"שיש בו בהכרח רק הרבה סוכר",B:"שיש בו ריכוז גבוה יחסית של חומרים מומסים",C:"שאין בו סוכר בכלל",D:"שכל החומרים המומסים בו הם גלוקוז"},correct:"B",note:"הרפרקטומטר מודד את כלל החומרים המומסים, ולכן אי אפשר להסיק שכל האות הוא סוכר בלבד."}
];

function quizQuestion(n){return BRIX_QUIZ_QUESTIONS[Math.max(0,Number(n)-1)]||null}

async function studentQuiz(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let qs;
  try{qs=await api("quiz_state",{student_id:s.student_id})}catch(e){return}
  const n=Number(qs.question||0), item=quizQuestion(n), phase=qs.phase||"closed";
  let body="";
  if(phase==="finished"){
    body='<div class="quiz-finished"><div class="done-mark">✓</div><h1>סיימנו את בדיקת הידע</h1><p>התשובות האישיות נשמרו. ממתינים להמשך מהמורה.</p></div>';
  }else if(!item || phase==="closed"){
    body='<div class="quiz-wait"><span class="student-kicker">בדיקת ידע אישית</span><h1>ממתינים לשאלה הבאה</h1><p>המורה שולטת בקצב. כשהשאלה תיפתח היא תופיע כאן אוטומטית.</p><div class="wait-pulse"><span></span><span></span><span></span></div></div>';
  }else{
    const answered=qs.my_answer||"";
    const revealed=phase==="revealed";
    const options=Object.entries(item.options).map(([k,v])=>{
      const cls=["quiz-option",answered===k?"my-answer":"",revealed&&k===item.correct?"correct-answer":"",revealed&&answered===k&&k!==item.correct?"wrong-answer":""].filter(Boolean).join(" ");
      const disabled=answered||phase!=="answering"?"disabled":"";
      return '<button class="'+cls+'" '+disabled+' onclick="submitQuizAnswer('+n+',\''+k+'\')"><b>'+k+'</b><span>'+esc(v)+'</span></button>';
    }).join("");
    body='<div class="quiz-question-head"><span class="student-kicker">שאלה '+n+' מתוך 10 · מענה אישי</span><h1>'+esc(item.q)+'</h1></div><div class="quiz-options">'+options+'</div>'+
      (answered&&!revealed?'<div class="quiz-sent">התשובה נשלחה ✓<span>ממתינים לחשיפת התשובה ולדיון הכיתתי.</span></div>':'')+
      (revealed?'<div class="quiz-reveal '+(answered===item.correct?'good':'review')+'"><strong>'+(answered===item.correct?'ענית נכון ✓':'כדאי לעבור שוב על הרעיון')+'</strong><p>'+esc(item.note)+'</p></div>':'');
  }
  shell('<div class="student-lab-shell quiz-student-shell"><div class="student-lab-top">'+brand()+'</div>'+lessonProgress(studentUnlockedThrough(2),2,true)+'<main class="quiz-main card">'+body+'</main></div>');
  clearTimeout(window.__studentTimer);
  window.__studentTimer=setTimeout(()=>{if(location.hash.startsWith("#student-room"))studentQuiz()},2200);
}

async function submitQuizAnswer(question,answerKey){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  document.querySelectorAll(".quiz-option").forEach(b=>b.disabled=true);
  try{await api("quiz_submit",{student_id:s.student_id,question,answer_key:answerKey})}catch(e){}
  studentQuiz();
}

function quizDistributionHtml(current,item,total,projection=false){
  const answered=Number(current?.answered||0);
  const max=Math.max(answered,1);
  return '<div class="quiz-live-distribution">'+Object.entries(item.options).map(([k,v])=>{
    const count=Number(current?.[k]||0), pct=Math.round(count/max*100);
    const correct=current?.phase==="revealed"&&k===item.correct;
    return '<div class="quiz-dist-row '+(correct?'is-correct':'')+'"><div class="quiz-dist-label"><b>'+k+'</b><span>'+esc(v)+'</span><strong>'+count+'</strong></div><div class="quiz-dist-track"><i style="width:'+pct+'%"></i></div></div>';
  }).join("")+'</div><div class="quiz-answer-count">'+answered+' מתוך '+total+' תלמידים ענו</div>';
}

function teacherQuizHtml(qd,currentStage=2){
  if(!qd)return "";
  const n=Number(qd.question||0), phase=qd.phase||"closed", item=quizQuestion(n), total=Number(qd.student_count||0), cur=qd.current||{};
  if(phase==="finished"){
    const rows=(qd.summary||[]).map(r=>{
      const q=quizQuestion(r.question), correct=Number(r[q.correct]||0), answered=Number(r.answered||0), pct=answered?Math.round(correct/answered*100):0;
      return '<div class="quiz-summary-row"><span>שאלה '+r.question+'</span><div><i style="width:'+pct+'%"></i></div><strong>'+correct+' / '+answered+' נכון</strong></div>';
    }).join("");
    return '<section class="card teacher-quiz-card"><span class="student-kicker">בדיקת ידע · הושלמה</span><h2>תמונת מצב כיתתית</h2><div class="quiz-summary-list">'+rows+'</div><button class="btn primary" onclick="setStage(3)">פתיחת מסקנות וחקר</button></section>';
  }
  if(!item){
    return '<section class="card teacher-quiz-card"><span class="student-kicker">שלב 3 · בודקים מה הבנו</span><h2>10 שאלות · שאלה אחת בכל פעם</h2><p>כל תלמיד עונה באופן אישי. לאחר מכן חושפים את ההתפלגות והתשובה ומקיימים דיון קצר.</p><button class="btn primary" onclick="controlQuiz(1,\'answering\')">פתיחת שאלה 1</button></section>';
  }
  const dist=quizDistributionHtml(cur,item,total);
  const actions=Number(currentStage)!==2
    ? '<button class="btn primary" onclick="setStage(2)">חזרה לבדיקת הידע</button>'
    : phase==="answering"
      ? '<button class="btn primary" onclick="controlQuiz('+n+',\'revealed\')">סגירת המענה וחשיפת התשובה</button>'
      : n<10
        ? '<button class="btn primary" onclick="controlQuiz('+(n+1)+',\'answering\')">פתיחת שאלה '+(n+1)+'</button>'
        : '<button class="btn primary" onclick="controlQuiz(10,\'finished\')">סיום בדיקת הידע</button>';
  return '<section class="card teacher-quiz-card"><div class="section-title-row"><div><span class="student-kicker">שלב 3 · שאלה '+n+' מתוך 10</span><h2>'+esc(item.q)+'</h2></div><span class="quiz-phase-badge">'+(phase==="answering"?'המענה פתוח':'התשובה נחשפה')+'</span></div>'+dist+(phase==="revealed"?'<div class="teacher-quiz-explanation"><strong>התשובה הנכונה: '+item.correct+' · '+esc(item.options[item.correct])+'</strong><p>'+esc(item.note)+'</p></div>':'')+'<div class="teacher-quiz-actions">'+actions+'</div></section>';
}

async function controlQuiz(question,phase){
  const t=JSON.parse(localStorage.getItem("brix_teacher")||"null");
  if(!t)return;
  try{await api("quiz_control",{session_id:t.session_id,teacher_token:t.teacher_token,question,phase});dashboard()}catch(e){}
}

function projectionQuizHtml(qd){
  if(!qd || !qd.question || qd.phase==="closed" || qd.phase==="finished")return "";
  const item=quizQuestion(qd.question), cur=qd.current||{}, total=Number(qd.student_count||0);
  const head='<div class="section-title-row"><div><span class="student-kicker">בדיקת ידע · שאלה '+qd.question+' מתוך 10</span><h2>'+esc(item.q)+'</h2></div><strong>'+Number(cur.answered||0)+' / '+total+' ענו</strong></div>';
  if(qd.phase==="answering"){
    return '<section id="projection-quiz" class="projection-section card projection-quiz-card">'+head+'<div class="quiz-projection-wait"><strong>חושבים ועונים באופן אישי</strong><span>ההתפלגות תיחשף רק אחרי סגירת המענה, כדי לא להשפיע על התשובות.</span></div></section>';
  }
  return '<section id="projection-quiz" class="projection-section card projection-quiz-card">'+head+quizDistributionHtml(cur,item,total,true)+'<div class="teacher-quiz-explanation"><strong>התשובה הנכונה: '+item.correct+' · '+esc(item.options[item.correct])+'</strong><p>'+esc(item.note)+'</p></div></section>';
}

function groupWorkFieldsMap(state){
  return Object.fromEntries((state?.fields||[]).map(f=>[f.section+":"+f.field_key,f]));
}

function groupWorkField(section,key,label,placeholder,state,kind="textarea"){
  const map=groupWorkFieldsMap(state);
  const row=map[section+":"+key]||{};
  const locked=!!row.recorded_by && !row.owned_by_me;
  const owner=row.recorded_by_name||"חבר/ת קבוצה";
  const tag=kind==="input"?"input":"textarea";
  const value=esc(row.field_value||"");
  const attr=tag==="input"?' value="'+value+'"':'';
  const inner=tag==="textarea"?value:"";
  return '<label class="group-work-field '+(locked?'locked-by-member':'')+'"><span>'+label+'</span>'+
    '<'+tag+' id="gw_'+section+'_'+key+'" '+(locked?'disabled':'')+' placeholder="'+esc(placeholder)+'"'+attr+' oninput="queueGroupWorkSave(\''+section+'\',\''+key+'\',this.value)" onblur="clearTimeout(window.__groupWorkTimers[\''+section+':'+key+'\']);saveGroupWorkField(\''+section+'\',\''+key+'\',this.value)">'+inner+'</'+tag+'>'+
    (locked?'<small class="group-field-lock">נכתב על ידי '+esc(owner)+' · השדה נעול לעריכה</small>':row.recorded_by?'<small class="group-field-owner">נכתב על ידך · אפשר לעדכן</small>':'<small>השדה פנוי — כל אחד מחברי הקבוצה יכול לקחת עליו אחריות</small>')+
  '</label>';
}

window.__groupWorkTimers={};
function queueGroupWorkSave(section,key,value,delay=650){
  const timerKey=section+":"+key;
  clearTimeout(window.__groupWorkTimers[timerKey]);
  window.__groupWorkTimers[timerKey]=setTimeout(()=>saveGroupWorkField(section,key,value),delay);
}

async function saveGroupWorkField(section,key,value){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  try{
    await api("group_work_save",{student_id:s.student_id,section,field_key:key,field_value:value});
  }catch(e){
    if(String(e?.message||e).includes("locked")){
      alert("חבר/ת קבוצה אחר/ת כבר שמר/ה את השדה הזה. הנתון לא נדרס.");
    }
  }
}

async function studentGroupWrap(renderFn){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let gs;
  try{gs=await api("group_work_state",{student_id:s.student_id})}catch(e){gs={fields:[]}}
  renderFn(s,gs);
}

function renderGroupConclusions(s,gs){
  shell('<div class="student-lab-shell group-work-shell"><div class="student-lab-top">'+brand()+studentGroupIdentity(s,gs)+'</div>'+lessonProgress(studentUnlockedThrough(3),3,true)+
    '<main class="group-work-main"><section class="card group-work-card"><span class="student-kicker">שלב מסכם · עבודה קבוצתית</span><h1>מה מצאנו?</h1><p class="group-work-lead">עוברים מהנתונים למסקנות. אפשר לחלק את הכתיבה בין חברי הקבוצה — כל שדה שנשמר נשאר שייך למי שמילא אותו ולא ניתן לדרוס אותו.</p>'+
    '<div class="group-work-grid">'+
      groupWorkField("conclusions","findings","1. התוצאות המרכזיות שלנו","מה בלט במדידות? אילו דגימות היו גבוהות או נמוכות במיוחד?",gs)+
      groupWorkField("conclusions","comparison","2. מה אפשר להשוות בין הדגימות?","תארו דפוס, הבדל או קשר שראיתם בגרף העמודות.",gs)+
      groupWorkField("conclusions","limitations","3. מה מגבלת המדידה?","זכרו: הרפרקטומטר מודד את כלל החומרים המומסים, ולכן ריכוז הסוכר שחישבנו הוא אומדן.",gs)+
      groupWorkField("conclusions","recommendation","4. מסקנה או המלצה לצריכה נבונה","נסחו מסקנה אחת או המלצה אחת שעולה מן הנתונים שלכם.",gs)+
    '</div><div class="group-work-actions"><button class="btn primary" onclick="studentGroupWrap(renderResearchPlan)">לתכנון חקר המשך</button></div></section></main></div>');
}

function renderResearchPlan(s,gs){
  shell('<div class="student-lab-shell group-work-shell"><div class="student-lab-top">'+brand()+studentGroupIdentity(s,gs)+'</div>'+lessonProgress(studentUnlockedThrough(3),3,true)+
    '<main class="group-work-main"><section class="card group-work-card research-plan-card"><span class="student-kicker">חקר המשך · תכנון בלבד</span><h1>אם היינו ממשיכים לחקור...</h1><p class="group-work-lead">לא מבצעים ניסוי נוסף עכשיו. מתכננים חקר המשך אפשרי שמבוסס על מה שלמדתם בניסוי.</p>'+
    '<div class="research-idea-strip"><strong>רעיונות אפשריים:</strong><span>דרגת הבשלה של פרי · מיץ טבעי לעומת משקה תעשייתי · השוואה בין זנים · השפעת דילול</span></div>'+
    '<div class="group-work-grid">'+
      groupWorkField("research_plan","question","1. שאלת החקר","למשל: כיצד דרגת ההבשלה של בננה משפיעה על ערך ה־Brix שלה?",gs)+
      groupWorkField("research_plan","hypothesis","2. השערה","מה אתם מצפים שיקרה? נסחו גם הסבר קצר.",gs)+
      groupWorkField("research_plan","independent","3. המשתנה הבלתי־תלוי","מה תשנו באופן מכוון?",gs,"input")+
      groupWorkField("research_plan","dependent","4. המשתנה התלוי","מה תמדדו בעקבות השינוי?",gs,"input")+
      groupWorkField("research_plan","controls","5. גורמים שנשמור קבועים","אילו תנאים צריכים להיות זהים בכל המדידות?",gs)+
      groupWorkField("research_plan","equipment","6. חומרים וציוד","מה תצטרכו כדי לבצע את החקר?",gs)+
      groupWorkField("research_plan","procedure","7. מהלך הניסוי","תארו בקצרה את שלבי העבודה המתוכננים.",gs)+
      groupWorkField("research_plan","data_plan","8. אילו נתונים נאסוף ואיך נציג אותם?","איזו טבלה או איזה גרף יתאימו לתוצאות?",gs)+
    '</div><div class="group-work-actions"><button class="btn ghost" onclick="studentGroupWrap(renderGroupConclusions)">חזרה למסקנות</button><button class="btn primary" onclick="showGroupWorkDone()">סיום התכנון</button></div></section></main></div>');
}

async function showGroupWorkDone(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let gs={fields:[]};
  try{gs=await api("group_work_state",{student_id:s.student_id})}catch(e){}
  const map=Object.fromEntries((gs.fields||[]).map(f=>[f.section+":"+f.field_key,f]));
  const needed=["question","hypothesis","independent","dependent","controls","equipment","procedure","data_plan"];
  const missing=needed.filter(k=>!String(map["research_plan:"+k]?.field_value||"").trim());
  if(missing.length){
    alert("כדי לסיים, השלימו את כל שמונת רכיבי תכנון החקר.");
    renderResearchPlan(s,gs);
    return;
  }
  shell('<div class="student-lab-shell group-work-shell"><div class="student-lab-top">'+brand()+studentGroupIdentity(s,gs)+'</div>'+lessonProgress(studentUnlockedThrough(3),3,true)+'<main class="group-work-main"><section class="card group-work-card group-work-done"><div class="done-mark">✓</div><h1>סיימתם את העבודה הקבוצתית</h1><p>המסקנות ותכנון חקר ההמשך נשמרו לקבוצה. אפשר לחזור ולעדכן שדות שכתבתם בעצמכם.</p><div class="group-work-actions"><button class="btn ghost" onclick="studentGroupWrap(renderGroupConclusions)">צפייה במסקנות</button><button class="btn ghost" onclick="studentGroupWrap(renderResearchPlan)">צפייה בתכנון החקר</button></div></section></main></div>');
}

function teacherGroupWorkHtml(gwd){
  if(!gwd)return "";
  const conclusionKeys=["findings","comparison","limitations","recommendation"];
  const researchKeys=["question","hypothesis","independent","dependent","controls","equipment","procedure","data_plan"];
  const labels={
    findings:"תוצאות מרכזיות",comparison:"השוואה בין דגימות",limitations:"מגבלת המדידה",recommendation:"מסקנה/המלצה",
    question:"שאלת חקר",hypothesis:"השערה",independent:"בלתי־תלוי",dependent:"תלוי",controls:"גורמים קבועים",equipment:"ציוד",procedure:"מהלך",data_plan:"נתונים וייצוג"
  };
  const cards=(gwd.groups||[]).map(g=>{
    const map=Object.fromEntries((g.fields||[]).map(f=>[f.section+":"+f.field_key,f]));
    const cDone=conclusionKeys.filter(k=>String(map["conclusions:"+k]?.field_value||"").trim()).length;
    const rDone=researchKeys.filter(k=>String(map["research_plan:"+k]?.field_value||"").trim()).length;
    const detail=[...conclusionKeys.map(k=>["conclusions",k]),...researchKeys.map(k=>["research_plan",k])]
      .filter(([sec,k])=>String(map[sec+":"+k]?.field_value||"").trim())
      .map(([sec,k])=>'<details><summary>'+labels[k]+' <small>'+esc(map[sec+":"+k].recorded_by_name||"")+'</small></summary><p>'+esc(map[sec+":"+k].field_value)+'</p></details>').join("");
    return '<article class="group-work-teacher-card"><div class="group-progress-head"><div><h3>'+esc(g.group_name)+'</h3><div class="group-student-names">'+((g.students||[]).map(esc).join(" · ")||"טרם הצטרפו")+'</div></div><strong>'+cDone+'/4 · '+rDone+'/8</strong></div><div class="group-work-status"><span class="'+(cDone===4?'done':'pending')+'">מסקנות '+cDone+'/4</span><span class="'+(rDone===8?'done':'pending')+'">חקר המשך '+rDone+'/8</span></div>'+detail+'</article>';
  }).join("");
  return '<section class="card teacher-group-work-section"><div class="section-title-row"><div><span class="student-kicker">שלב מסכם · קבוצתי</span><h2>מסקנות ותכנון חקר המשך</h2></div><p>כל שדה מציג גם מי מחברי הקבוצה כתב אותו.</p></div><div class="teacher-group-work-grid">'+cards+'</div></section>';
}

async function studentRoom(){
 const s=JSON.parse(localStorage.getItem("brix_student")||"null");
 if(!s){go("student");return}
 let state;
 try{
   state=await api("student_state",{student_id:s.student_id});
   try{
     const si=await api("student_stage_info",{student_id:s.student_id});
     state.max_stage_opened=Number(si.max_stage_opened??state.current_stage??0);
     state.current_stage=Number(si.current_stage??state.current_stage??0);
   }catch(e){
     state.max_stage_opened=studentUnlockedThrough(state.current_stage||0);
   }
   window.__brixDraft=state.draft||{};
   sessionStorage.setItem("brix_student_stage",String(state.current_stage||0));
   sessionStorage.setItem("brix_student_max_stage",String(state.max_stage_opened||0));
 }
 catch(e){go("student");return}

 if(state.current_stage===0 && !state.opening_submitted){
   studentOpening(s,state);
   return;
 }

 if(state.current_stage===0 && state.opening_submitted){
   imageScreen(
     "student-room-screen clean-login-screen",
     "/public/screens/brixlab-desktop.png",
     "/public/screens/brixlab-mobile.png",
     '<div class="auth-wrap"><div class="auth-card waiting-card opening-wait"><h1>סיימנו את הפתיחה ✓</h1><p class="room-meta">'+esc(s.class_name)+' · '+esc(s.group_name)+'</p><div class="room-note">'+(studentUnlockedThrough(state.max_stage_opened)>=1?'המורה חזרה לפתיחה. כל שלב שכבר נפתח נשאר זמין לכם.':'התשובות נקלטו. ממתינים לפתיחת הניסוי.')+'</div>'+(studentUnlockedThrough(state.max_stage_opened)>=1?'<div class="opened-stage-links"><button class="auth-primary" onclick="showStudentExperiment()">ניסוי</button>'+(studentUnlockedThrough(state.max_stage_opened)>=2?'<button class="auth-secondary" onclick="studentQuiz()">בדיקת ידע</button>':'')+(studentUnlockedThrough(state.max_stage_opened)>=3?'<button class="auth-secondary" onclick="studentGroupWrap(renderGroupConclusions)">מסקנות וחקר</button>':'')+'</div>':'<div class="wait-pulse"><span></span><span></span><span></span></div>')+'<button class="auth-link exit-link" onclick="localStorage.removeItem(\'brix_student\');go(\'home\')">יציאה</button></div></div>'
   );
   clearTimeout(window.__studentTimer);
   window.__studentTimer=setTimeout(()=>{if(location.hash.startsWith("#student-room"))studentRoom()},3000);
   return;
 }

 if(state.current_stage===1){
   studentExperiment(s,state);
   return;
 }

 if(state.current_stage===2){
   studentQuiz();
   return;
 }

 if(state.current_stage===3){
   studentGroupWrap(renderGroupConclusions);
   return;
 }

 shell('<div class="student-lab-shell"><div class="student-lab-top">'+brand()+'</div>'+lessonProgress(studentUnlockedThrough(state.max_stage_opened??state.current_stage),state.current_stage,true)+'<div class="card student-next-card"><span class="student-kicker">השלב הכיתתי הבא</span><h1>ממתינים להנחיית המורה</h1><p>הניסוי העצמאי הסתיים. כל שלב שכבר נפתח נשאר זמין בסרגל ההתקדמות.</p></div></div>');
}

async function showStudentExperiment(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let state;
  try{
    state=await api("student_state",{student_id:s.student_id});
    window.__brixDraft=state.draft||{};
    sessionStorage.setItem("brix_student_stage",String(state.current_stage||0));
  }catch(e){return}
  let unlocked=studentUnlockedThrough(state.current_stage||0);
  try{
    const si=await api("student_stage_info",{student_id:s.student_id});
    unlocked=Number(si.max_stage_opened??unlocked);
    sessionStorage.setItem("brix_student_max_stage",String(unlocked));
  }catch(e){}
  if(unlocked<1)return;
  state.max_stage_opened=unlocked;
  studentExperiment(s,state);
}

async function showStudentOpeningReview(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  let state;
  try{state=await api("student_state",{student_id:s.student_id});window.__brixDraft=state.draft||{}}catch(e){return}
  sessionStorage.setItem("brix_student_stage",String(state.current_stage||0));
  const a=state.opening_answer||{};
  const labels={daily:"פעם ביום",weekly:"פעם בשבוע",events:"רק באירועים מיוחדים",never:"לא שותה ממותק"};
  const g=a.guesses||{};
  shell('<div class="student-opening-shell"><header class="student-opening-head">'+brand()+'<div><strong>'+esc(s.first_name)+'</strong><span>'+esc(s.group_name)+'</span></div></header>'+lessonProgress(studentUnlockedThrough(state.max_stage_opened??state.current_stage),0,true)+'<main class="student-opening-main review-main"><section class="opening-card review-card"><span class="student-kicker">שלב פתיחה · נשאר פתוח</span><h1>התשובות שלכם</h1><div class="review-answer"><span>תדירות שתיית משקאות ממותקים</span><strong>'+esc(labels[a.survey_option]||"—")+'</strong></div><div class="review-guesses"><h3>הניחושים שלכם</h3><div><span>קולה <b>'+esc(g.cola??"—")+'</b></span><span>תפוזים <b>'+esc(g.orange??"—")+'</b></span><span>תה קר <b>'+esc(g.iced_tea??"—")+'</b></span><span>אנרגיה <b>'+esc(g.energy??"—")+'</b></span></div></div>'+(studentUnlockedThrough(state.max_stage_opened??state.current_stage)>=1?'<button class="btn primary" onclick="showStudentExperiment()">חזרה לניסוי</button>':'')+'</section></main></div>');
}

function studentOpening(s,state={}){
 const d=state.draft||window.__brixDraft||{};
 const od=d.opening||{};
 const survey=od.survey_option||"";
 const guesses=od.guesses||{};
 shell('<div class="student-opening-shell"><header class="student-opening-head">'+brand()+'<div><strong>'+esc(s.first_name)+'</strong><span>'+esc(s.group_name)+'</span></div></header><main class="student-opening-main"><section class="opening-card"><div class="opening-step">1 מתוך 2</div><h1>מה שותים אצלכם בבית?</h1><p>באיזו תדירות שותים משקאות ממותקים אצלך בבית?</p><div class="survey-options">'+[
   ["daily","פעם ביום"],
   ["weekly","פעם בשבוע"],
   ["events","רק באירועים מיוחדים"],
   ["never","לא שותה ממותק"]
 ].map(([v,l])=>'<label class="survey-choice"><input type="radio" name="survey" value="'+v+'" '+(survey===v?'checked':'')+' onchange="saveOpeningDraft()"><span>'+l+'</span></label>').join("")+'</div></section><section class="opening-card guess-card"><div class="opening-step">2 מתוך 2</div><h2>ניחוש מתוק</h2><p>כמה כפיות סוכר לדעתכם יש ב־500 מ״ל? זה רק ניחוש — אין תשובה נכונה בשלב הזה.</p><div class="guess-grid">'+[
   ["cola","משקה קולה"],
   ["orange","משקה תפוזים"],
   ["iced_tea","תה קר"],
   ["energy","משקה אנרגיה"]
 ].map(([k,l])=>{const val=Number(guesses[k]??8);return '<label class="guess-item"><span>'+l+'</span><div><input id="guess_'+k+'" type="range" min="0" max="20" step="1" value="'+val+'" oninput="document.getElementById(\'val_'+k+'\').textContent=this.value;saveOpeningDraft()"><b id="val_'+k+'">'+val+'</b><small> כפיות</small></div></label>'}).join("")+'</div><div id="openingMsg"></div><button class="btn primary opening-submit" onclick="submitOpening()">שליחת התשובות</button></section></main></div>');
}
function saveOpeningDraft(){
  const survey=document.querySelector('input[name="survey"]:checked')?.value||"";
  const guesses={
    cola:Number(document.getElementById("guess_cola")?.value??8),
    orange:Number(document.getElementById("guess_orange")?.value??8),
    iced_tea:Number(document.getElementById("guess_iced_tea")?.value??8),
    energy:Number(document.getElementById("guess_energy")?.value??8)
  };
  saveStudentDraftPatch({opening:{survey_option:survey,guesses}});
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
 saveStudentDraftPatch({opening:{survey_option:survey,guesses}},0);
 msg.innerHTML='<div class="inline-error neutral">שולח...</div>';
 try{
   await api("submit_opening",{student_id:s.student_id,survey_option:survey,guesses});
   studentRoom();
 }catch(e){
   msg.innerHTML='<div class="inline-error">לא הצלחנו לשמור. נסו שוב.</div>';
 }
}

function studentExperimentProgress(current){
  const steps=[
    ['1','מכירים את המכשיר'],
    ['2','מדידות כיול'],
    ['3','בונים מודל'],
    ['4','בודקים דגימות'],
    ['5','משווים תוצאות']
  ];
  return '<div class="student-experiment-progress"><div class="student-exp-line"></div>'+steps.map(([n,label],i)=>{
    const step=i+1;
    const cls=step<current?'done':step===current?'current':'future';
    return '<div class="student-exp-step '+cls+'"><span>'+(step<current?'✓':n)+'</span><b>'+label+'</b></div>';
  }).join('')+'</div>';
}

function studentExperiment(s,state){
  const step=Number(state.experiment_step||0);
  if(step>=4){
    renderSampleStage(s,state);
    return;
  }
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

  shell('<div class="student-experiment-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(state.max_stage_opened??state.current_stage),1,true)+studentExperimentProgress(1)+'<main class="experiment-intro"><section class="experiment-hero card"><span class="student-kicker">שלב 1 · מכירים את המכשיר</span><h1>רפרקטומטר — מה בעצם מודדים?</h1><p class="experiment-lead">הרפרקטומטר מודד את <strong>ריכוז כלל החומרים המומסים</strong> בתמיסה באמצעות שבירת אור. בתמיסות הסוכר שלנו ערך הקריאה יוצג ביחידות <strong>Brix</strong>.</p><div class="science-note"><strong>חשוב:</strong> המכשיר אינו “מזהה סוכר”. בפירות ובמשקאות הוא מגיב לכלל המומסים.</div></section><section class="how-grid"><article class="how-card"><b>1</b><h3>מניחים טיפות</h3><p>פותחים את המכסה ומניחים כמה טיפות על לוח הזכוכית.</p></article><article class="how-card"><b>2</b><h3>סוגרים</h3><p>סוגרים את המכסה כך שהנוזל יתפזר על פני המשטח.</p></article><article class="how-card"><b>3</b><h3>מול האור</h3><p>מביטים דרך העינית כשהמכשיר מופנה אל מקור אור.</p></article><article class="how-card"><b>4</b><h3>קוראים Brix</h3><p>קוראים את הערך במקום שבו נפגשים האזור הכחול והאזור הבהיר.</p></article></section><section class="cleaning-tip card"><div>🧻</div><div><strong>בין מדידה למדידה:</strong><br>מנגבים היטב את לוח הזכוכית לפני שמניחים דגימה חדשה.</div></section><button class="btn primary experiment-main-btn" onclick="startBrixPractice()">לתרגול עם המכשיר האמיתי</button></main></div>');
}

async function startBrixPractice(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  try{await api("update_student_progress",{student_id:s.student_id,experiment_step:1});}catch(e){}
  renderBrixPractice(s);
}

function renderBrixPractice(s){
  const stateStage=Number(sessionStorage.getItem("brix_student_stage")||1);
  shell('<div class="student-experiment-shell practice-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(1)+'<main class="practice-main"><section class="practice-card card real-device-card"><span class="student-kicker">שלב 2 · תרגול עם המכשיר האמיתי</span><h1>בדיקת מים</h1><p>קחו את הרפרקטומטר של הקבוצה. הניחו כמה טיפות מים, סגרו את המכסה, הביטו מול האור וקראו את ערך ה־Brix.</p><div class="real-device-steps"><span><b>1</b> טיפות מים</span><span><b>2</b> סוגרים</span><span><b>3</b> מול האור</span><span><b>4</b> קוראים</span></div><label class="real-reading"><span>מה קראתם?</span><div><input id="realBrixReading" type="number" inputmode="decimal" step="0.1" min="0" max="5" placeholder="0.0" value="'+esc((window.__brixDraft||{}).zero_brix??"")+'" oninput="saveStudentDraftPatch({zero_brix:this.value})"><strong>°Brix</strong></div></label><div id="practiceFeedback" class="practice-feedback"></div><button class="btn primary experiment-main-btn" onclick="checkRealBrixReading()">בדיקת הקריאה</button><p class="micro-note">במים נקיים הקריאה צפויה להיות סביב 0° Brix. סטייה קטנה אפשרית; אם הקריאה גבוהה, נקו את המשטח ומדדו שוב.</p></section></main></div>');
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

function saveCalibrationDraftField(n,key,value){
  const all={...((window.__brixDraft||{}).calibration_inputs||{})};
  all[n]={...(all[n]||{}),[key]:value};
  saveStudentDraftPatch({calibration_inputs:all});
}
function renderCalibration(s,state){
  window.__brixCalibrationState=state||{};
  const stateStage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  const draftCal=(state?.draft||window.__brixDraft||{}).calibration_inputs||{};
  const rows=state?.calibration||[];
  const byNum=Object.fromEntries(rows.map(x=>[Number(x.solution_number),x]));
  const cards=[1,2,3,4,5,6].map(n=>{
    const row=byNum[n]||{};
    const locked=!!row.recorded_by && !row.owned_by_me;
    const owner=row.recorded_by_name||'חבר/ת קבוצה';
    const lockNote=locked?'<div class="group-field-lock">נשמר על ידי '+esc(owner)+' · לא ניתן לדרוס את הנתון</div>':row.recorded_by?'<div class="group-field-owner">הנתון הזה נשמר על ידך וניתן לעדכון</div>':'';
    const disabled=locked?' disabled':'';
    return '<div class="calibration-input '+(locked?'locked-by-member':'')+'"><span>תמיסה '+n+'</span>'+
      '<label class="mini-field"><small>ריכוז סוכר</small><div><input id="conc_'+n+'" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="'+esc(row.sugar_concentration??draftCal[n]?.sugar_concentration??"")+'" placeholder="גרם/100 מ״ל" '+disabled+' oninput="saveCalibrationDraftField('+n+',\'sugar_concentration\',this.value)"><strong>g/100mL</strong></div></label>'+
      '<label class="mini-field"><small>מדידת מומסים</small><div><input id="cal_'+n+'" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="'+esc(row.brix_value??draftCal[n]?.brix_value??"")+'" placeholder="Brix" '+disabled+' oninput="saveCalibrationDraftField('+n+',\'brix_value\',this.value)"><strong>°Brix</strong></div></label>'+
      lockNote+'</div>';
  }).join("");
  shell('<div class="student-experiment-shell calibration-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(2)+'<main class="calibration-main"><section class="calibration-card card"><span class="student-kicker">חלק א׳ · גרף כיול</span><h1>מדידת 6 תמיסות הכיול</h1><p class="calibration-lead">כל חברי הקבוצה עובדים על אותו מאגר נתונים. נתון שכבר נשמר על ידי חבר קבוצה אחר נעול לעריכה, כדי שאף אחד לא ידרוס אותו.</p><div class="science-note"><strong>בין כל שתי מדידות:</strong> נגבו היטב את לוח הזכוכית לפני שמניחים את התמיסה הבאה.</div><div class="calibration-grid">'+cards+'</div><div id="calibrationMsg"></div><button class="btn primary experiment-main-btn" onclick="saveCalibration()">שמירת המדידות</button></section></main></div>');
}

function calibrationQualityCheck(measurements){
  const pts=measurements
    .map(m=>({n:Number(m.solution_number),x:Number(m.sugar_concentration),y:Number(m.brix_value)}))
    .sort((a,b)=>a.x-b.x);

  for(let i=1;i<pts.length;i++){
    if(pts[i].x<=pts[i-1].x){
      return {
        ok:false,
        type:'concentration',
        message:'ריכוזי הסוכר צריכים לעלות מתמיסה לתמיסה. בדקו את ערכי הריכוז שהזנתם.'
      };
    }
  }

  const model=linearModel(pts);
  const meanY=pts.reduce((a,p)=>a+p.y,0)/pts.length;
  const ssTot=pts.reduce((a,p)=>a+Math.pow(p.y-meanY,2),0);
  const ssRes=pts.reduce((a,p)=>a+Math.pow(p.y-(model.a*p.x+model.b),2),0);
  const r2=ssTot===0?0:1-(ssRes/ssTot);
  const drops=[];
  for(let i=1;i<pts.length;i++){
    if(pts[i].y < pts[i-1].y-0.8){
      drops.push([pts[i-1].n,pts[i].n]);
    }
  }

  if(model.a<=0){
    return {
      ok:false,
      type:'descending',
      message:'עקומת הכיול יוצאת יורדת, וזה לא מתאים לניסוי. ככל שריכוז הסוכר עולה, ערך ה־Brix אמור בדרך כלל לעלות. נקו את הרפרקטומטר, בדקו את התמיסות ומדדו שוב.'
    };
  }

  if(r2<0.75 || drops.length>=2){
    return {
      ok:false,
      type:'poor',
      message:'המדידות אינן יוצרות מגמה עולה מספיק עקבית. כנראה יש מדידה אחת או יותר שדורשת בדיקה חוזרת לפני בניית הגרף.'
    };
  }

  return {
    ok:true,
    r2,
    slope:model.a,
    warning:(r2<0.9 || drops.length===1)
      ? 'הנתונים עולים באופן כללי, אבל יש מעט פיזור. אפשר להמשיך, אך מומלץ לבדוק שוב ערך חריג אם הוא נראה לא סביר.'
      : ''
  };
}

async function saveCalibration(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  const msg=document.getElementById("calibrationMsg");
  const state=window.__brixCalibrationState||{};
  const existing=Object.fromEntries((state.calibration||[]).map(x=>[Number(x.solution_number),x]));
  const allMeasurements=[];
  const myMeasurements=[];
  for(let n=1;n<=6;n++){
    const rawBrix=document.getElementById("cal_"+n)?.value;
    const rawConc=document.getElementById("conc_"+n)?.value;
    const value=Number(rawBrix);
    const concentration=Number(rawConc);
    if(rawBrix==="" || rawConc==="" || !Number.isFinite(value) || !Number.isFinite(concentration) || value<0 || value>100 || concentration<0 || concentration>100){
      msg.innerHTML='<div class="feedback-try">כדי לבנות עקום כיול צריך שלקבוצה יהיו כל שש המדידות. אפשר לחלק את ההזנה בין חברי הקבוצה.</div>';
      return;
    }
    const item={solution_number:n,sugar_concentration:concentration,brix_value:value};
    allMeasurements.push(item);
    const row=existing[n];
    if(!row?.recorded_by || row.owned_by_me) myMeasurements.push(item);
  }

  const quality=calibrationQualityCheck(allMeasurements);
  if(!quality.ok){
    msg.innerHTML='<div class="calibration-quality-stop"><strong>עצרו רגע — כדאי למדוד שוב</strong><p>'+quality.message+'</p><span>המערכת לא תבנה גרף כיול מנתונים שאינם מתאימים למגמה הצפויה.</span></div>';
    return;
  }

  msg.innerHTML='<div class="inline-error neutral">'+(myMeasurements.length?'שומר את המדידות שהזנת...':'כל המדידות כבר נשמרו על ידי הקבוצה.')+'</div>';
  try{
    if(myMeasurements.length) await api("save_calibration",{student_id:s.student_id,measurements:myMeasurements});
    let fresh=await api("student_state",{student_id:s.student_id});
    window.__brixCalibrationState=fresh;
    renderCalibrationDone(s,fresh);
  }catch(e){
    const text=String(e?.message||e);
    msg.innerHTML='<div class="feedback-try">'+(text.includes('locked')?'אחד הנתונים נשמר בינתיים על ידי חבר קבוצה אחר. רעננו את המסך כדי לראות אותו.':'לא הצלחנו לשמור את המדידות. נסו שוב.')+'</div>';
  }
}

function variableOptionButtons(key,options){
  return options
    .map(o=>({o,sort:Math.random()}))
    .sort((a,b)=>a.sort-b.sort)
    .map(({o})=>'<button data-key="'+key+'" data-value="'+esc(o.value)+'" data-correct="'+o.correct+'" onclick="answerVariable(this,&quot;'+key+'&quot;,&quot;'+o.value+'&quot;,'+o.correct+')">'+o.label+'</button>')
    .join('');
}

function renderCalibrationDone(s,state){
  const stateStage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  window.__brixModelState=state;
  const q1=variableOptionButtons('x',[
    {label:'ריכוז הסוכר בתמיסה',value:'ריכוז הסוכר בתמיסה',correct:true},
    {label:'ריכוז המומסים ב־Brix',value:'ריכוז המומסים ב־Brix',correct:false}
  ]);
  const q2=variableOptionButtons('y',[
    {label:'ריכוז המומסים הנמדד ברפרקטומטר',value:'ריכוז המומסים הנמדד ברפרקטומטר',correct:true},
    {label:'ריכוז הסוכר שהכנו',value:'ריכוז הסוכר שהכנו',correct:false}
  ]);
  const q3=variableOptionButtons('xu',[
    {label:'גרם סוכר ל־100 מ״ל',value:'גרם סוכר ל־100 מ״ל',correct:true},
    {label:'°Brix',value:'°Brix',correct:false}
  ]);
  const q4=variableOptionButtons('yu',[
    {label:'°Brix',value:'°Brix',correct:true},
    {label:'גרם/100 מ״ל',value:'גרם/100 מ״ל',correct:false}
  ]);
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(3)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל</span><h1>לפני שבונים גרף — מה באמת בדקנו?</h1><p class="model-lead">בכיול שינינו דבר אחד ובדקנו כיצד המדידה משתנה בעקבותיו.</p><div class="variable-quiz"><div class="quiz-card"><h3>מהו המשתנה הבלתי־תלוי?</h3>'+q1+'</div><div class="quiz-card"><h3>מהו המשתנה התלוי?</h3>'+q2+'</div><div class="quiz-card"><h3>מה היחידות של ריכוז הסוכר?</h3>'+q3+'</div><div class="quiz-card"><h3>מה היחידות של מדידת המומסים?</h3>'+q4+'</div></div><div id="variableQuizMsg"></div><button id="toAxesBtn" class="btn primary experiment-main-btn" onclick="showCalibrationTable()" disabled>הצגת טבלת הנתונים</button></section></main></div>');
  const savedDraft=state?.draft||window.__brixDraft||{};
  const savedAnswers=savedDraft.variable_answers||{};
  const savedSelections=savedDraft.variable_selections||{};
  window.__variableAnswers={};
  Object.entries(savedSelections).forEach(([key,item])=>{
    const btn=[...document.querySelectorAll('.quiz-card button')].find(b=>b.dataset.key===key&&b.dataset.value===String(item.value));
    if(btn)btn.classList.add(item.correct?'selected-good':'selected-bad');
  });
  Object.entries(savedAnswers).forEach(([key,value])=>{window.__variableAnswers[key]=value});
  const next=document.getElementById('toAxesBtn');
  if(next)next.disabled=!['x','y','xu','yu'].every(k=>window.__variableAnswers[k]);
}

window.__variableAnswers={};
function answerVariable(btn,key,value,correct){
  const box=btn.closest('.quiz-card');
  box.querySelectorAll('button').forEach(b=>b.classList.remove('selected-good','selected-bad'));
  btn.classList.add(correct?'selected-good':'selected-bad');
  if(correct){window.__variableAnswers[key]=value}else{delete window.__variableAnswers[key]}
  const selections={...((window.__brixDraft||{}).variable_selections||{}),[key]:{value,correct}};
  saveStudentDraftPatch({variable_answers:{...window.__variableAnswers},variable_selections:selections});
  const ok=['x','y','xu','yu'].every(k=>window.__variableAnswers[k]);
  const next=document.getElementById('toAxesBtn');
  if(next) next.disabled=!ok;
  const msg=document.getElementById('variableQuizMsg');
  if(msg) msg.innerHTML=correct?'<div class="feedback-good compact-feedback">נכון ✓</div>':'<div class="feedback-try compact-feedback">נסו שוב — חשבו מה אנחנו משנים ומה אנחנו מודדים.</div>';
}


function showCalibrationTable(){
  saveStudentDraftPatch({model_step:"table"});
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  const state=window.__brixModelState||{};
  const stateStage=Number(state.current_stage ?? 1);
  const rows=(state.calibration||[])
    .slice()
    .sort((a,b)=>Number(a.solution_number)-Number(b.solution_number));

  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(3)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל · שלב 2</span><h1>הנתונים של הקבוצה שלכם</h1><p class="model-lead">לפני שבונים גרף, מרכזים את המדידות בטבלה ומוודאים איזה משתנה הוא בלתי־תלוי ואיזה משתנה תלוי.</p><div class="student-calibration-table-wrap"><table class="student-calibration-table"><thead><tr><th>תמיסה</th><th><span class="var-badge independent">משתנה בלתי־תלוי</span><strong>ריכוז הסוכר</strong><small>גרם סוכר ל־100 מ״ל</small></th><th><span class="var-badge dependent">משתנה תלוי</span><strong>ריכוז המומסים</strong><small>°Brix</small></th></tr></thead><tbody>'+rows.map(r=>'<tr><td data-label="תמיסה"><b>תמיסה '+r.solution_number+'</b></td><td data-label="ריכוז הסוכר">'+Number(r.sugar_concentration).toFixed(2)+'</td><td data-label="°Brix">'+Number(r.brix_value).toFixed(1)+'</td></tr>').join('')+'</tbody></table></div><div class="science-note"><strong>שימו לב:</strong> הגרף הבא ייבנה מהמדידות של הקבוצה שלכם בלבד. הנתונים הכיתתיים נשמרים למסך המורה.</div><button class="btn primary experiment-main-btn" onclick="showAxisBuilder()">בניית הגרף</button></section></main></div>');
}

function showAxisBuilder(){
  saveStudentDraftPatch({model_step:"axes"});
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  const state=window.__brixModelState||{};
  const stateStage=Number(state.current_stage ?? 1);
  window.__axisPlacement={...(((window.__brixDraft||{}).axis_placement)||{x:null,y:null})};
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(3)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל · שלב 3</span><h1>מקמו את המשתנים על הצירים</h1><p class="model-lead">גררו כל כרטיס לציר המתאים. במובייל אפשר גם להקיש על הכרטיס ואז על הציר.</p><div class="axis-chips"><button class="axis-chip" draggable="true" data-var="concentration" ondragstart="axisDrag(event)" onclick="selectAxisChip(this)">ריכוז הסוכר<br><small>גרם/100 מ״ל</small></button><button class="axis-chip" draggable="true" data-var="brix" ondragstart="axisDrag(event)" onclick="selectAxisChip(this)">ריכוז המומסים<br><small>°Brix</small></button></div><div class="axis-board"><div class="axis-zone y-zone" data-axis="y" ondragover="event.preventDefault()" ondrop="axisDrop(event,&quot;y&quot;)" onclick="axisTapDrop(&quot;y&quot;)"><span>ציר Y</span><strong id="axisYLabel">הניחו כאן משתנה</strong></div><div class="plot-placeholder"><div class="fake-y"></div><div class="fake-x"></div><span>כאן ייבנה הגרף</span></div><div class="axis-zone x-zone" data-axis="x" ondragover="event.preventDefault()" ondrop="axisDrop(event,&quot;x&quot;)" onclick="axisTapDrop(&quot;x&quot;)"><span>ציר X</span><strong id="axisXLabel">הניחו כאן משתנה</strong></div></div><div id="axisMsg"></div><button id="buildPointsBtn" class="btn primary experiment-main-btn" onclick="showCalibrationPoints()" disabled>בנו את נקודות הכיול</button></section></main></div>');
  if(window.__axisPlacement.x==='concentration'){
    const el=document.getElementById('axisXLabel'); if(el)el.textContent='ריכוז הסוכר · גרם/100 מ״ל';
    document.querySelector('.axis-chip[data-var="concentration"]')?.classList.add('placed');
  }
  if(window.__axisPlacement.y==='brix'){
    const el=document.getElementById('axisYLabel'); if(el)el.textContent='ריכוז המומסים · °Brix';
    document.querySelector('.axis-chip[data-var="brix"]')?.classList.add('placed');
  }
  document.getElementById('buildPointsBtn').disabled=!(window.__axisPlacement.x&&window.__axisPlacement.y);
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
  saveStudentDraftPatch({axis_placement:{...window.__axisPlacement}});
  const label=axis==='x'?'ריכוז הסוכר · גרם/100 מ״ל':'ריכוז המומסים · °Brix';
  const el=document.getElementById(axis==='x'?'axisXLabel':'axisYLabel');
  if(el) el.textContent=label;
  document.querySelector('.axis-chip[data-var="'+variable+'"]')?.classList.add('placed');
  const ok=window.__axisPlacement.x&&window.__axisPlacement.y;
  document.getElementById('buildPointsBtn').disabled=!ok;
  if(msg) msg.innerHTML=ok?'<div class="feedback-good">מעולה. הצירים מוכנים ✓</div>':'';
}

function groupCalibrationPoints(){
  const rows=(window.__brixModelState?.calibration||[])
    .filter(r=>r.sugar_concentration!=null && r.brix_value!=null)
    .map(r=>({x:Number(r.sugar_concentration),y:Number(r.brix_value),n:Number(r.solution_number)}));
  return rows.sort((a,b)=>a.x-b.x);
}

function showCalibrationPoints(){
  saveStudentDraftPatch({model_step:"points"});
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  const state=window.__brixModelState||{};
  const stateStage=Number(state.current_stage ?? 1);
  const pts=groupCalibrationPoints();
  if(pts.length<2){
    shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(3)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל</span><h1>עוד רגע בונים את הגרף</h1><p class="model-lead">אין עדיין מספיק מדידות של הקבוצה כדי ליצור גרף כיול. חזרו למדידות והשלימו את הנתונים.</p><button class="btn primary" onclick="renderCalibration(JSON.parse(localStorage.getItem(&quot;brix_student&quot;)),window.__brixModelState)">חזרה למדידות</button></section></main></div>');
    return;
  }
  const graph=calibrationSvg(pts,false,false);
  shell('<div class="student-experiment-shell model-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stateStage),1,true)+studentExperimentProgress(3)+'<main class="model-main"><section class="model-card card"><span class="student-kicker">מהמדידה למודל · שלב 4</span><h1>גרף הכיול של הקבוצה שלכם</h1><p class="model-lead">כל נקודה מחברת בין ריכוז הסוכר שהכנתם לבין ערך ה־Brix שאתם מדדתם.</p><div class="class-data-strip group-data-strip">'+pts.map(p=>'<span><b>'+p.x+'</b> g/100mL → <b>'+p.y+'</b> °Brix</span>').join('')+'</div><div id="calibrationGraph" class="calibration-graph">'+graph+'</div><div class="pattern-question"><h3>מה אתם מזהים?</h3><div class="pattern-options"><button onclick="patternAnswer(this,true)">ככל שריכוז הסוכר עולה, גם ערך ה־Brix עולה</button><button onclick="patternAnswer(this,false)">אין קשר בין המשתנים</button><button onclick="patternAnswer(this,false)">ככל שריכוז הסוכר עולה, ערך ה־Brix יורד</button></div><div id="patternMsg"></div></div><button id="trendBtn" class="btn primary experiment-main-btn" onclick="addTrendLine()" disabled>הוספת קו מגמה</button><button id="equationBtn" class="btn ghost experiment-main-btn" onclick="showTrendEquation()" disabled>הצגת משוואת הישר</button><div id="equationBox"></div></section></main></div>');
  window.__modelPoints=pts;
  const savedPattern=(window.__brixDraft||{}).pattern_answer;
  if(savedPattern){
    const btn=[...document.querySelectorAll('.pattern-options button')].find(b=>b.textContent.trim()===String(savedPattern.label||''));
    if(btn){
      btn.classList.add(savedPattern.correct?'selected-good':'selected-bad');
      const pm=document.getElementById('patternMsg');
      if(pm)pm.innerHTML=savedPattern.correct?'<div class="feedback-good">בדיוק. זהו קשר חיובי בין המשתנים.</div>':'<div class="feedback-try">נסו להתבונן שוב בכיוון הכללי של הנקודות.</div>';
      if(savedPattern.correct)document.getElementById('trendBtn').disabled=false;
    }
  }
}
async function refreshModelState(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  try{window.__brixModelState=await api("student_state",{student_id:s.student_id});showCalibrationPoints()}catch(e){}
}
function patternAnswer(btn,correct){
  saveStudentDraftPatch({pattern_answer:{label:btn.textContent.trim(),correct}});
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
  saveStudentDraftPatch({model_step:"trend"});
  document.getElementById('calibrationGraph').innerHTML=calibrationSvg(window.__modelPoints,true,false);
  document.getElementById('trendBtn').disabled=true;
  document.getElementById('equationBtn').disabled=false;
}
function showTrendEquation(){
  saveStudentDraftPatch({model_step:"equation"});
  const m=linearModel(window.__modelPoints);
  document.getElementById('calibrationGraph').innerHTML=calibrationSvg(window.__modelPoints,true,true);
  const sign=m.b<0?'−':'+';
  document.getElementById('equationBox').innerHTML='<div class="equation-card"><span>משוואת קו הכיול</span><strong>y = '+m.a.toFixed(2)+'x '+sign+' '+Math.abs(m.b).toFixed(2)+'</strong><div class="equation-legend"><span><b>x</b> = ריכוז הסוכר</span><span><b>y</b> = °Brix</span></div><p>סיימתם לבנות את מודל הכיול של הקבוצה. בשלב הבא תשתמשו במשוואה הזו כדי לחשב את ריכוז הסוכר בדגימות לא ידועות.</p><div class="equation-next-actions"><button class="btn ghost" onclick="showEquationUse()">ראו דוגמה לחישוב</button><button class="btn primary" onclick="startSampleStage()">ממשיכים לבדיקת דגימות ←</button></div></div>';
  document.getElementById('equationBtn').disabled=true;
}
function showEquationUse(){
  const m=linearModel(window.__modelPoints);
  const sampleY=Math.max(1,Math.round(window.__modelPoints.reduce((a,p)=>a+p.y,0)/window.__modelPoints.length*10)/10);
  const x=m.a===0?0:(sampleY-m.b)/m.a;
  document.getElementById('equationBox').innerHTML+='<div class="equation-use"><h3>מהמדידה אל הריכוז</h3><p>נניח שמדדנו דגימה וקיבלנו <strong>'+sampleY+'° Brix</strong>.</p><div class="solve-line"><span>y = '+m.a.toFixed(2)+'x '+(m.b<0?'−':'+' )+' '+Math.abs(m.b).toFixed(2)+'</span><span>'+sampleY+' = '+m.a.toFixed(2)+'x '+(m.b<0?'−':'+' )+' '+Math.abs(m.b).toFixed(2)+'</span><span>x ≈ <strong>'+x.toFixed(2)+' גרם/100 מ״ל</strong></span></div><p class="science-note">כך מודל שנבנה מנתוני הכיול מאפשר לנו לאמוד את ריכוז הסוכר בדגימה שאיננו יודעים את ריכוזה מראש.</p><button class="btn primary experiment-main-btn" onclick="startSampleStage()">הבנתי — ממשיכים לשלב 4: בדיקת דגימות</button></div>';
}

async function startSampleStage(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  try{await api("update_student_progress",{student_id:s.student_id,experiment_step:4,practice_score:0});}catch(e){}
  let state;
  try{state=await api("student_state",{student_id:s.student_id})}catch(e){state=window.__brixModelState||{}}
  renderSampleStage(s,state);
}

function sampleModelFromState(state){
  const pts=(state?.calibration||[])
    .filter(r=>r.sugar_concentration!=null && r.brix_value!=null)
    .map(r=>({x:Number(r.sugar_concentration),y:Number(r.brix_value)}));
  return pts.length>=2?linearModel(pts):null;
}

function saveSampleDraftField(n,key,value){
  const all={...((window.__brixDraft||{}).sample_inputs||{})};
  all[n]={...(all[n]||{}),[key]:value};
  saveStudentDraftPatch({sample_inputs:all});
}
function renderSampleStage(s,state){
  window.__brixSampleState=state||{};
  window.__manualSampleChecks=window.__manualSampleChecks||{};
  const stage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  const saved=Object.fromEntries((state?.samples||[]).map(x=>[Number(x.sample_slot),x]));
  const draft=state?.draft||window.__brixDraft||{};
  const draftSamples=draft.sample_inputs||{};
  window.__manualSampleChecks={...(draft.sample_checks||{}),...(window.__manualSampleChecks||{})};
  [1,2].forEach(n=>{ if(saved[n]?.estimated_sugar!=null) window.__manualSampleChecks[n]=true; });
  const model=sampleModelFromState(state);
  const modelBox=model
    ? '<div class="sample-model-strip"><span>משוואת הכיול של הקבוצה</span><strong>y = '+model.a.toFixed(2)+'x '+(model.b<0?'−':'+')+' '+Math.abs(model.b).toFixed(2)+'</strong><small>x = ריכוז סוכר · y = °Brix</small></div>'
    : '<div class="feedback-try">עדיין אין מספיק נתוני כיול של הקבוצה לחישוב ריכוז הסוכר.</div>';

  const manualCards=[1,2].map(n=>{
    const row=saved[n]||{};
    const locked=!!row.recorded_by && !row.owned_by_me;
    const owner=row.recorded_by_name||'חבר/ת קבוצה';
    const disabled=locked?' disabled':'';
    const checked=!!window.__manualSampleChecks[n];
    return '<article class="sample-card manual-sample-card '+(locked?'locked-by-member':'')+'"><div class="sample-title"><strong>דגימה '+n+'</strong><span class="manual-badge">'+(locked?'נשמר ע״י '+esc(owner):'חישוב עצמאי')+'</span></div>'+
      '<label><span>שם הדגימה</span><input id="sample_name_'+n+'" '+disabled+' value="'+esc(row.sample_name??draftSamples[n]?.sample_name??"")+'" placeholder="למשל: תפוח / מיץ תפוזים / קולה" oninput="saveSampleDraftField('+n+',\'sample_name\',this.value)"></label>'+
      '<label><span>1. כתבו את y — ערך ה־Brix שמדדתם</span><div class="sample-brix-input"><input id="sample_brix_'+n+'" '+disabled+' type="number" inputmode="decimal" min="0" max="100" step="0.1" value="'+esc(row.brix_value??draftSamples[n]?.brix_value??"")+'" placeholder="0.0" oninput="saveSampleDraftField('+n+',\'brix_value\',this.value)"><strong>°Brix</strong></div></label>'+
      '<div class="manual-equation-guide"><span>2. הציבו את y במשוואת הכיול וחשבו את x</span><code>y = ax + b</code><small>x הוא ריכוז הסוכר המשוער</small></div>'+
      '<label><span>3. מה קיבלתם עבור x?</span><div class="sample-brix-input"><input id="sample_x_'+n+'" '+disabled+' type="number" inputmode="decimal" min="0" max="100" step="0.01" value="'+esc(row.estimated_sugar??draftSamples[n]?.estimated_sugar??"")+'" placeholder="0.00" oninput="saveSampleDraftField('+n+',\'estimated_sugar\',this.value)"><strong>g/100mL</strong></div></label>'+
      (locked?'<div class="group-field-lock">הדגימה כבר נשמרה על ידי '+esc(owner)+' ולכן היא נעולה לעריכה.</div>':'<button class="btn '+(checked?'ghost':'primary')+' sample-check-btn" onclick="checkManualSample('+n+')">'+(checked?'החישוב אושר ✓':'בדיקת החישוב')+'</button>')+
      '<div id="sample_check_'+n+'" class="sample-check-msg">'+(checked?'<div class="feedback-good compact-feedback">החישוב שמור בקבוצה.</div>':'')+'</div></article>';
  }).join("");

  const unlocked=!!window.__manualSampleChecks[1] && !!window.__manualSampleChecks[2];
  const autoCards=[3,4,5,6].map(n=>{
    const row=saved[n]||{};
    const locked=!!row.recorded_by && !row.owned_by_me;
    const owner=row.recorded_by_name||'חבר/ת קבוצה';
    const disabled=(!unlocked||locked)?' disabled':'';
    return '<article class="sample-card auto-sample-card '+(unlocked?'':'sample-locked')+' '+(locked?'locked-by-member':'')+'"><div class="sample-title"><strong>דגימה '+n+'</strong><span>'+(locked?'נשמר ע״י '+esc(owner):(unlocked?'חישוב אוטומטי':'נפתח אחרי 2 חישובים נכונים'))+'</span></div>'+
      '<label><span>שם הדגימה</span><input id="sample_name_'+n+'" '+disabled+' value="'+esc(row.sample_name??draftSamples[n]?.sample_name??"")+'" placeholder="למשל: ענבים / תה קר / משקה אנרגיה" oninput="saveSampleDraftField('+n+',\'sample_name\',this.value)"></label>'+
      '<label><span>מדידת Brix</span><div class="sample-brix-input"><input id="sample_brix_'+n+'" '+disabled+' type="number" inputmode="decimal" min="0" max="100" step="0.1" value="'+esc(row.brix_value??draftSamples[n]?.brix_value??"")+'" placeholder="0.0" oninput="saveSampleDraftField('+n+',\'brix_value\',this.value);updateSampleEstimate('+n+')"><strong>°Brix</strong></div></label>'+
      '<div id="sample_est_'+n+'" class="sample-estimate">'+(row.estimated_sugar!=null?'<span>ריכוז סוכר משוער</span><strong>'+Number(row.estimated_sugar).toFixed(2)+' g/100mL</strong>':'<span>'+(unlocked?'החישוב יופיע כאן':'נעול')+'</span>')+'</div>'+
      (locked?'<div class="group-field-lock">הדגימה נעולה כדי שלא תידרס.</div>':'')+'</article>';
  }).join("");

  shell('<div class="student-experiment-shell samples-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stage),1,true)+studentExperimentProgress(4)+'<main class="samples-main"><section class="samples-card card"><span class="student-kicker">מהמודל לדגימה</span><h1>בודקים דגימות לא ידועות</h1><p class="samples-lead">זהו מרחב קבוצתי משותף. כל תלמיד יכול להזין דגימות אחרות; דגימה שכבר נשמרה על ידי חבר קבוצה אחר תופיע לכולם אך תהיה נעולה לעריכה.</p>'+modelBox+'<div class="manual-learning-note"><strong>איך עובדים?</strong><span>מודדים Brix → זהו y → מציבים במשוואה → פותרים עבור x → מקבלים את ריכוז הסוכר המשוער.</span></div><div class="sample-grid">'+manualCards+autoCards+'</div><div id="samplesMsg"></div><button class="btn primary experiment-main-btn" onclick="saveSamples()">שמירת הדגימות שלי</button></section></main></div>');
}

function unlockAutoSamplesInPlace(){
  [3,4,5,6].forEach(n=>{
    const card=document.getElementById('sample_name_'+n)?.closest('.sample-card');
    if(card)card.classList.remove('sample-locked');
    const name=document.getElementById('sample_name_'+n);
    const brix=document.getElementById('sample_brix_'+n);
    if(name)name.disabled=false;
    if(brix)brix.disabled=false;
    const status=card?.querySelector('.sample-title span');
    if(status)status.textContent='חישוב אוטומטי';
    const est=document.getElementById('sample_est_'+n);
    if(est && est.textContent.trim()==='נעול') est.innerHTML='<span>החישוב יופיע כאן</span>';
  });
}

function checkManualSample(n){
  const model=sampleModelFromState(window.__brixSampleState||{});
  const msg=document.getElementById('sample_check_'+n);
  const name=(document.getElementById('sample_name_'+n)?.value||'').trim();
  const rawY=(document.getElementById('sample_brix_'+n)?.value||'').trim();
  const rawX=(document.getElementById('sample_x_'+n)?.value||'').trim();
  if(!model || model.a===0){
    if(msg)msg.innerHTML='<div class="feedback-try compact-feedback">אין עדיין משוואת כיול תקינה.</div>';
    return;
  }
  const y=Number(rawY), x=Number(rawX);
  if(!name || rawY==='' || rawX==='' || !Number.isFinite(y) || !Number.isFinite(x)){
    if(msg)msg.innerHTML='<div class="feedback-try compact-feedback">השלימו שם משקה, ערך y (Brix) ותוצאת x.</div>';
    return;
  }
  const expected=Math.max(0,(y-model.b)/model.a);
  const tolerance=Math.max(.15,Math.abs(expected)*.03);
  if(Math.abs(x-expected)<=tolerance){
    window.__manualSampleChecks[n]=true;
    if(msg)msg.innerHTML='<div class="feedback-good compact-feedback">נכון ✓ הצבתם את y וחישבתם נכון את x.</div>';
    if(window.__manualSampleChecks[1]&&window.__manualSampleChecks[2]){
      unlockAutoSamplesInPlace();
    }
  }else{
    window.__manualSampleChecks[n]=false;
    saveStudentDraftPatch({sample_checks:{...window.__manualSampleChecks}});
    if(msg)msg.innerHTML='<div class="feedback-try compact-feedback">בדקו שוב את ההצבה. זכרו: y הוא ערך ה־Brix שמדדתם, ואנחנו מחפשים את x.</div>';
  }
}

function updateSampleEstimate(n){
  if(n<=2)return;
  const model=sampleModelFromState(window.__brixSampleState||{});
  const out=document.getElementById('sample_est_'+n);
  const raw=document.getElementById('sample_brix_'+n)?.value;
  if(!out)return;
  if(!model || raw==='' || !Number.isFinite(Number(raw)) || model.a===0){
    out.innerHTML='<span>החישוב יופיע כאן</span>';
    return;
  }
  const y=Number(raw);
  const x=(y-model.b)/model.a;
  const est=Math.max(0,x).toFixed(2);
  out.innerHTML='<span>ריכוז סוכר משוער</span><strong>'+est+' g/100mL</strong>';
  saveSampleDraftField(n,'estimated_sugar',est);
}

async function saveSamples(){
  const s=JSON.parse(localStorage.getItem("brix_student")||"null");
  if(!s)return;
  const state=window.__brixSampleState||{};
  const model=sampleModelFromState(state);
  const msg=document.getElementById('samplesMsg');
  if(!model || model.a===0){
    msg.innerHTML='<div class="feedback-try">אין עדיין משוואת כיול תקינה של הקבוצה.</div>';
    return;
  }

  const saved=Object.fromEntries((state.samples||[]).map(x=>[Number(x.sample_slot),x]));
  const samples=[];
  for(let n=1;n<=6;n++){
    const row=saved[n];
    if(row?.recorded_by && !row.owned_by_me) continue;
    const name=(document.getElementById('sample_name_'+n)?.value||'').trim();
    const rawY=(document.getElementById('sample_brix_'+n)?.value||'').trim();
    if(!name && !rawY)continue;
    const brix=Number(rawY);
    if(!name || rawY==='' || !Number.isFinite(brix) || brix<0 || brix>100){
      msg.innerHTML='<div class="feedback-try">בדגימה '+n+' יש להשלים גם שם דגימה וגם ערך Brix.</div>';
      return;
    }

    let est;
    if(n<=2){
      const rawX=(document.getElementById('sample_x_'+n)?.value||'').trim();
      if(!window.__manualSampleChecks[n] || rawX==='' || !Number.isFinite(Number(rawX))){
        msg.innerHTML='<div class="feedback-try">יש לבצע ולאשר את החישוב העצמאי בדגימה '+n+'.</div>';
        return;
      }
      est=Math.max(0,Number(rawX));
    }else{
      if(!(window.__manualSampleChecks[1]&&window.__manualSampleChecks[2])){
        msg.innerHTML='<div class="feedback-try">לפני יתר הדגימות הקבוצה צריכה להשלים שני חישובים עצמאיים נכונים.</div>';
        return;
      }
      est=Math.max(0,(brix-model.b)/model.a);
    }
    samples.push({sample_slot:n,sample_name:name,brix_value:brix,estimated_sugar:Number(est.toFixed(2))});
  }

  const groupHasFirstTwo=!!saved[1]?.estimated_sugar && !!saved[2]?.estimated_sugar;
  if(!samples.length){
    msg.innerHTML='<div class="inline-error neutral">אין נתונים חדשים לשמירה. הנתונים שכבר הוזנו על ידי חברי הקבוצה מוגנים.</div>';
    return;
  }
  if(!groupHasFirstTwo && (!window.__manualSampleChecks[1] || !window.__manualSampleChecks[2])){
    msg.innerHTML='<div class="feedback-try">הקבוצה צריכה להשלים תחילה שתי דגימות עם חישוב עצמאי.</div>';
    return;
  }

  msg.innerHTML='<div class="inline-error neutral">שומר את הדגימות שהזנת...</div>';
  try{
    await api("save_samples",{student_id:s.student_id,samples});
    const fresh=await api("student_state",{student_id:s.student_id});
    window.__brixSampleState=fresh;
    renderSampleSummary(s,fresh);
  }catch(e){
    const text=String(e?.message||e);
    msg.innerHTML='<div class="feedback-try">'+(text.includes('locked')?'אחת הדגימות נשמרה בינתיים על ידי חבר קבוצה אחר. רעננו את המסך כדי לראות את הנתון המעודכן.':'לא הצלחנו לשמור את הדגימות. נסו שוב.')+'</div>';
  }
}


function sampleBarChartSvg(rows){
  const data=(rows||[]).filter(r=>r.estimated_sugar!=null);
  const W=700,H=390,L=70,R=24,T=28,B=92;
  const maxY=Math.max(...data.map(r=>Number(r.estimated_sugar)||0),1)*1.15;
  const plotW=W-L-R, plotH=H-T-B;
  const step=plotW/Math.max(data.length,1);
  let grid='';
  for(let i=0;i<=5;i++){
    const y=T+i*plotH/5;
    const val=maxY*(1-i/5);
    grid+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" class="gridline"/><text x="'+(L-10)+'" y="'+(y+4)+'" class="tick-label">'+val.toFixed(1)+'</text>';
  }
  const bars=data.map((r,i)=>{
    const v=Number(r.estimated_sugar)||0;
    const bw=Math.min(62,step*.56);
    const x=L+i*step+(step-bw)/2;
    const h=(v/maxY)*plotH;
    const y=T+plotH-h;
    const label=String(r.sample_name||('דגימה '+(i+1)));
    return '<g class="bar-item"><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="8"/><text x="'+(x+bw/2)+'" y="'+(y-8)+'" class="bar-value">'+v.toFixed(2)+'</text><text x="'+(x+bw/2)+'" y="'+(H-B+24)+'" class="bar-label">'+esc(label)+'</text></g>';
  }).join('');
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="גרף עמודות של ריכוז הסוכר המשוער במשקאות">'+grid+'<line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" class="axis-line"/><line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" class="axis-line"/><text x="'+(W/2)+'" y="'+(H-22)+'" class="axis-title">סוג הדגימה</text><text x="18" y="'+(H/2)+'" transform="rotate(-90 18 '+(H/2)+')" class="axis-title">ריכוז סוכר משוער (גרם/100 מ״ל)</text>'+bars+'</svg>';
}

function showSampleBarChart(){
  const state=window.__brixSampleState||{};
  const rows=state.samples||[];
  const el=document.getElementById('sampleBarChartWrap');
  if(!el)return;
  el.innerHTML='<div class="bar-chart-card"><div class="section-title-row"><div><span class="student-kicker">גרף עמודות</span><h2>משווים בין הדגימות</h2></div><p>כאן המשתנה הבלתי־תלוי הוא סוג הדגימה — משתנה בדיד ולא רציף — ולכן גרף עמודות מתאים להשוואה.</p></div><div class="sample-bar-chart">'+sampleBarChartSvg(rows)+'</div></div>';
  const btn=document.getElementById('buildSampleBarBtn');
  if(btn)btn.disabled=true;
}

function teacherSampleGraphsHtml(data){
  const groups=(data.groups||[]).filter(g=>(g.samples||[]).length);
  if(!groups.length)return '';

  const groupGraphs=groups.map(g=>
    '<article class="teacher-group-sample-graph"><div class="group-sample-head"><h3>'+esc(g.group_name)+'</h3><span>'+(g.samples||[]).length+' דגימות</span></div><div class="sample-bar-chart">'+sampleBarChartSvg(g.samples||[])+'</div></article>'
  ).join('');

  const agg=(data.sample_aggregate||[]).filter(x=>x.comparable);
  const allGroupsComparable=agg.length>0 && agg.every(x=>Number(x.groups_reporting)===Number(data.session.group_count));
  const aggregateGraph=allGroupsComparable
    ? '<div class="teacher-summary-sample-graph"><div class="section-title-row"><div><span class="student-kicker">סיכום כיתתי</span><h2>ממוצע ריכוז הסוכר בין הקבוצות</h2></div><p>הגרף מוצג רק לדגימות שבהן כל הקבוצות הזינו אותו שם משקה באותו מספר דגימה.</p></div><div class="sample-bar-chart">'+sampleBarChartSvg(agg.map(x=>({sample_name:x.sample_name,estimated_sugar:x.average_estimated_sugar})))+'</div></div>'
    : '<div class="sample-compare-note"><strong>עדיין אין גרף כיתתי מסכם.</strong><span>כדי לחשב ממוצע אמין, כל הקבוצות צריכות להזין את אותו משקה באותו מספר דגימה ובאותו שם.</span></div>';

  return '<section class="card teacher-sample-section"><div class="section-title-row"><div><span class="student-kicker">בדיקת דגימות</span><h2>גרפי העמודות של הקבוצות</h2></div><p>כל גרף מבוסס על נתוני אותה קבוצה בלבד.</p></div><div class="teacher-group-sample-grid">'+groupGraphs+'</div>'+aggregateGraph+'</section>';
}

function renderSampleSummary(s,state){
  const stage=Number(state?.current_stage ?? sessionStorage.getItem("brix_student_stage") ?? 1);
  const rows=(state?.samples||[]);
  window.__brixSampleState=state;
  shell('<div class="student-experiment-shell samples-shell"><header class="student-experiment-head">'+brand()+'<div class="student-chip">'+esc(s.first_name)+' · '+esc(s.group_name)+'</div></header>'+lessonProgress(studentUnlockedThrough(stage),1,true)+studentExperimentProgress(5)+'<main class="samples-main"><section class="samples-card card"><div class="done-mark">✓</div><span class="student-kicker">מהמודל לדגימה</span><h1>המדידות נשמרו</h1><p class="samples-lead">עכשיו נרצה להשוות בין הדגימות בצורה חזותית.</p><div class="sample-summary-grid">'+rows.map(r=>'<div><span>'+esc(r.sample_name)+'</span><b>'+Number(r.brix_value).toFixed(1)+'° Brix</b><strong>'+Number(r.estimated_sugar).toFixed(2)+' g/100mL</strong></div>').join('')+'</div><div class="graph-choice-explain"><span class="student-kicker">איזה גרף מתאים?</span><h2>כאן נבחר גרף עמודות</h2><p><strong>המשתנה הבלתי־תלוי הוא סוג הדגימה.</strong> זהו משתנה בדיד ולא רציף: קולה, מיץ תפוזים, תה קר וכדומה. לכן לא מחברים בין הערכים בקו רציף — משווים ביניהם באמצעות עמודות.</p><p><strong>המשתנה התלוי:</strong> ריכוז הסוכר המשוער, בגרם ל־100 מ״ל.</p></div><button id="buildSampleBarBtn" class="btn primary experiment-main-btn" onclick="showSampleBarChart()">בניית גרף עמודות</button><div id="sampleBarChartWrap"></div><div class="science-note"><strong>חשוב:</strong> הרפרקטומטר מודד את כלל החומרים המומסים. במשקאות אמיתיים החישוב הוא אומדן לריכוז הסוכר.</div><button class="btn ghost experiment-main-btn" onclick="renderSampleStage(JSON.parse(localStorage.getItem(&quot;brix_student&quot;)),window.__brixSampleState)">עריכת הדגימות</button></section></main></div>');
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
  const samples=Number(g.sample_count||0);
  let status="ממתינה להתחלה";
  if(opening>0 && opening<students) status="משלימה פתיחה";
  if(students>0 && opening===students) status="פתיחה הושלמה";
  if(step===1) status="בדיקת אפס ברפרקטומטר";
  if(step===2) status="מודדת תמיסות כיול";
  if(step>=3 || cal===6) status="מדידות כיול הושלמו";
  if(samples>0) status="בודקת דגימות ("+samples+")";
  return {students,opening,step,cal,samples,status};
}


window.__teacherTrendVisible=false;
window.__teacherEquationVisible=false;

function teacherCalibrationPoints(data){
  return (data?.calibration_summary||[])
    .filter(r=>r.average_concentration!=null && r.average_brix!=null)
    .map(r=>({
      x:Number(r.average_concentration),
      y:Number(r.average_brix),
      n:Number(r.solution_number),
      groups:Number(r.reported_groups||0)
    }))
    .sort((a,b)=>a.x-b.x);
}

function teacherCalibrationGraphHtml(data){
  const pts=teacherCalibrationPoints(data);
  window.__teacherCalibrationPoints=pts;
  if(pts.length<2){
    return '<section class="card teacher-graph-card"><div class="section-title-row"><div><span class="student-kicker">הגרף הכיתתי</span><h2>גרף הכיול נבנה בזמן אמת</h2></div><p>ככל שהקבוצות שומרות מדידות, ממוצעי הכיתה הופכים לנקודות על הגרף.</p></div><div class="graph-waiting"><strong>עדיין אין מספיק נקודות</strong><span>נדרשות לפחות שתי תמיסות עם נתונים כדי להתחיל לראות את הקשר.</span></div></section>';
  }

  const graph=calibrationSvg(pts,window.__teacherTrendVisible,window.__teacherEquationVisible);
  const m=linearModel(pts);
  const eq=window.__teacherEquationVisible
    ? '<div class="teacher-equation-reveal"><span>משוואת קו הכיול</span><strong>y = '+m.a.toFixed(2)+'x '+(m.b<0?'−':'+')+' '+Math.abs(m.b).toFixed(2)+'</strong><p><b>x</b> = ריכוז הסוכר · <b>y</b> = ריכוז המומסים ב־°Brix</p><p class="equation-teach-note">בשלב הבא, כשנמדוד מיצים ומשקאות, נציב את ערך ה־Brix במקום y ונחשב את x — ריכוז הסוכר המשוער.</p></div>'
    : '';

  return '<section class="card teacher-graph-card">'+
    '<div class="section-title-row"><div><span class="student-kicker">הגרף הכיתתי</span><h2>מממוצעי הכיתה לגרף כיול</h2></div><p>הנקודות מתעדכנות אוטומטית לפי ממוצעי המדידות של הקבוצות. קו המגמה והמשוואה נחשפים רק כשהמורה בוחרת.</p></div>'+
    '<div class="teacher-live-points">'+pts.map(p=>'<span>תמיסה '+p.n+' · <b>'+p.x.toFixed(2)+'</b> g/100mL → <b>'+p.y.toFixed(2)+'</b> °Brix</span>').join('')+'</div>'+
    '<div class="calibration-graph teacher-calibration-graph">'+graph+'</div>'+
    '<div class="teacher-graph-actions">'+
      '<button class="btn '+(window.__teacherTrendVisible?'ghost':'primary')+'" onclick="toggleTeacherTrend()">'+(window.__teacherTrendVisible?'הסתרת קו מגמה':'הוספת קו מגמה')+'</button>'+
      '<button class="btn '+(window.__teacherEquationVisible?'ghost':'primary')+'" onclick="toggleTeacherEquation()" '+(!window.__teacherTrendVisible?'disabled':'')+'>'+(window.__teacherEquationVisible?'הסתרת המשוואה':'הצגת משוואת הישר')+'</button>'+
    '</div>'+eq+
  '</section>';
}

function toggleTeacherTrend(){
  window.__teacherTrendVisible=!window.__teacherTrendVisible;
  if(!window.__teacherTrendVisible) window.__teacherEquationVisible=false;
  dashboard();
}

function toggleTeacherEquation(){
  if(!window.__teacherTrendVisible)return;
  window.__teacherEquationVisible=!window.__teacherEquationVisible;
  dashboard();
}

function projectionSampleSummaryHtml(data){
  const agg=(data.sample_aggregate||[]).filter(x=>x.comparable);
  if(!agg.length){
    return '<section id="projection-samples" class="projection-section card"><span class="student-kicker">שלב 2ב · בדיקת דגימות</span><h2>תוצאות כיתתיות</h2><div class="graph-waiting"><strong>עדיין אין נתונים משותפים להצגה</strong><span>גרף כיתתי יוצג רק כאשר הקבוצות מדדו את אותן דגימות באופן שניתן להשוואה.</span></div></section>';
  }
  const rows=agg.map(x=>({sample_name:x.sample_name,estimated_sugar:x.average_estimated_sugar}));
  return '<section id="projection-samples" class="projection-section card"><div class="section-title-row"><div><span class="student-kicker">שלב 2ב · בדיקת דגימות</span><h2>השוואת הדגימות — ממוצע כיתתי</h2></div><p>מוצגים רק נתונים מצרפיים של הכיתה, ללא שמות קבוצות או תלמידים.</p></div><div class="sample-bar-chart projection-bar-chart">'+sampleBarChartSvg(rows)+'</div></section>';
}

function projectionGroupWorkHtml(gwd){
  if(!gwd)return "";
  const groups=gwd.groups||[];
  if(!groups.length)return "";
  const cKeys=["findings","comparison","limitations","recommendation"];
  const rKeys=["question","hypothesis","independent","dependent","controls","equipment","procedure","data_plan"];
  const counts=groups.map(g=>{
    const map=Object.fromEntries((g.fields||[]).map(f=>[f.section+":"+f.field_key,f]));
    const cDone=cKeys.filter(k=>String(map["conclusions:"+k]?.field_value||"").trim()).length;
    const rDone=rKeys.filter(k=>String(map["research_plan:"+k]?.field_value||"").trim()).length;
    return {name:g.group_name,cDone,rDone};
  });
  const conclusionsDone=counts.filter(x=>x.cDone===4).length;
  const researchDone=counts.filter(x=>x.rDone===8).length;
  return '<section id="projection-group-work" class="projection-section card projection-group-work-card"><div class="section-title-row"><div><span class="student-kicker">שלב 4 · מסקנות וחקר</span><h2>הכיתה מסכמת ומתכננת חקר המשך</h2></div></div><div class="projection-group-progress"><div><span>קבוצות שסיימו מסקנות</span><strong>'+conclusionsDone+' / '+groups.length+'</strong></div><div><span>קבוצות שסיימו תכנון חקר</span><strong>'+researchDone+' / '+groups.length+'</strong></div></div><div class="projection-group-list">'+counts.map(x=>'<div><strong>'+esc(x.name)+'</strong><span>מסקנות '+x.cDone+'/4 · חקר '+x.rDone+'/8</span></div>').join("")+'</div></section>';
}

function teacherProjectionHtml(data,quizData=null,groupWorkData=null){
  const s=data.session;
  const pts=teacherCalibrationPoints(data);
  const graph=pts.length>=2
    ? calibrationSvg(pts,window.__teacherTrendVisible,window.__teacherEquationVisible)
    : '';
  const model=pts.length>=2?linearModel(pts):null;
  const survey=data.opening||{};
  const surveyData=survey.survey||{};
  const guesses=survey.guess_averages||{};
  const calibrationBlock=pts.length>=2
    ? '<div class="calibration-graph projection-calibration-graph">'+graph+'</div><div class="teacher-graph-actions projection-actions"><button class="btn '+(window.__teacherTrendVisible?'ghost':'primary')+'" onclick="toggleTeacherTrend()">'+(window.__teacherTrendVisible?'הסתרת קו מגמה':'הוספת קו מגמה')+'</button><button class="btn '+(window.__teacherEquationVisible?'ghost':'primary')+'" onclick="toggleTeacherEquation()" '+(!window.__teacherTrendVisible?'disabled':'')+'>'+(window.__teacherEquationVisible?'הסתרת המשוואה':'הצגת משוואת הישר')+'</button></div>'+(window.__teacherEquationVisible&&model?'<div class="projection-equation">y = '+model.a.toFixed(2)+'x '+(model.b<0?'−':'+')+' '+Math.abs(model.b).toFixed(2)+'</div>':'')
    : '<div class="graph-waiting"><strong>הגרף הכיתתי עדיין נבנה</strong><span>ככל שהקבוצות שומרות מדידות, הנתונים הכיתתיים יתעדכנו כאן.</span></div>';

  return '<div class="projection-shell">'+
    '<header class="projection-header"><button class="btn ghost projection-exit" onclick="toggleProjection()">יציאה מהקרנה</button>'+brand()+'<div class="projection-class">'+esc(s.class_name||'')+'</div></header>'+
    '<nav class="projection-nav projection-nav-dynamic">'+
      '<button onclick="document.getElementById(\'projection-opening\').scrollIntoView({behavior:\'smooth\'})">1 · פתיחה</button>'+
      (Number(s.max_stage_opened||0)>=1?'<button onclick="document.getElementById(\'projection-calibration\')?.scrollIntoView({behavior:\'smooth\'})">2א · כיול</button><button onclick="document.getElementById(\'projection-samples\')?.scrollIntoView({behavior:\'smooth\'})">2ב · דגימות</button>':'')+
      (Number(s.max_stage_opened||0)>=2&&quizData&&quizData.question?'<button onclick="document.getElementById(\'projection-quiz\')?.scrollIntoView({behavior:\'smooth\'})">3 · בדיקת ידע</button>':'')+
      (Number(s.max_stage_opened||0)>=3&&groupWorkData?'<button onclick="document.getElementById(\'projection-group-work\')?.scrollIntoView({behavior:\'smooth\'})">4 · מסקנות וחקר</button>':'')+
    '</nav>'+
    '<main class="projection-main">'+
      '<section id="projection-opening" class="projection-section card"><div class="section-title-row"><div><span class="student-kicker">שלב 1 · פתיחה</span><h2>מה חשבה הכיתה?</h2></div><strong class="projection-count">'+Number(survey.submitted_count||0)+' ענו</strong></div><div class="teacher-survey projection-survey"><div><span>פעם ביום</span><b>'+Number(surveyData.daily||0)+'</b></div><div><span>פעם בשבוע</span><b>'+Number(surveyData.weekly||0)+'</b></div><div><span>רק באירועים</span><b>'+Number(surveyData.events||0)+'</b></div><div><span>לא שותה ממותק</span><b>'+Number(surveyData.never||0)+'</b></div></div><div class="guess-averages projection-guesses"><h3>ממוצע ניחושי הכיתה — כפיות ב־500 מ״ל</h3><div><span>קולה <b>'+esc(guesses.cola??'—')+'</b></span><span>תפוזים <b>'+esc(guesses.orange??'—')+'</b></span><span>תה קר <b>'+esc(guesses.iced_tea??'—')+'</b></span><span>אנרגיה <b>'+esc(guesses.energy??'—')+'</b></span></div></div></section>'+
      (Number(s.max_stage_opened||0)>=1?'<section id="projection-calibration" class="projection-section card"><div class="section-title-row"><div><span class="student-kicker">שלב 2א · כיול</span><h2>גרף הכיול הכיתתי</h2></div><p>הגרף מבוסס על ממוצעי הכיתה בלבד.</p></div>'+calibrationBlock+'</section>'+projectionSampleSummaryHtml(data):'')+
      (Number(s.max_stage_opened||0)>=2?projectionQuizHtml(quizData):'')+
      (Number(s.max_stage_opened||0)>=3?projectionGroupWorkHtml(groupWorkData):'')+
    '</main>'+
  '</div>';
}

function renderTeacherProjection(data,quizData=null,groupWorkData=null){
  shell(teacherProjectionHtml(data,quizData,groupWorkData),"teacher-projection-shell");
}

async function dashboard(){
 const t=JSON.parse(localStorage.getItem("brix_teacher")||"null");
 if(!t){go("new-session");return}
 let data;
 try{data=await api("dashboard",{session_id:t.session_id,teacher_token:t.teacher_token})}
 catch(e){shell('<div class="card"><div class="error">לא הצלחתי לטעון את הדשבורד.</div></div>');return}
 const s=data.session;
 let stageInfo={current_stage:Number(s.current_stage||0),max_stage_opened:Number(s.current_stage||0)};
 try{
   stageInfo=await api("teacher_stage_info",{session_id:t.session_id,teacher_token:t.teacher_token});
 }catch(e){}
 s.current_stage=Number(stageInfo.current_stage??s.current_stage??0);
 s.max_stage_opened=Number(stageInfo.max_stage_opened??s.current_stage??0);
 const maxStage=s.max_stage_opened;
 let quizData=null;
 let groupWorkData=null;
 if(maxStage>=2){
   try{quizData=await api("quiz_dashboard",{session_id:t.session_id,teacher_token:t.teacher_token})}catch(e){}
 }
 if(maxStage>=3){
   try{groupWorkData=await api("group_work_dashboard",{session_id:t.session_id,teacher_token:t.teacher_token})}catch(e){}
 }
 const projecting=document.body.classList.contains("projection-mode");
 if(projecting){
   renderTeacherProjection(data,quizData,groupWorkData);
   clearTimeout(window.__brixTimer);
   window.__brixTimer=setTimeout(()=>{if(location.hash.startsWith("#dashboard")&&document.body.classList.contains("projection-mode")) dashboard();},5000);
   return;
 }
 const joinUrl=location.origin+location.pathname+'#student?code='+encodeURIComponent(s.class_code);
 window.__brixJoinUrl=joinUrl;
 const qr='https://quickchart.io/qr?size=180&text='+encodeURIComponent(joinUrl);
 const stageNames=["פתיחה","ניסוי עצמאי","בדיקת ידע","מסקנות וחקר"];
 const actionHtml=s.current_stage===0
   ? '<button class="btn primary" onclick="setStage(1)">'+(s.max_stage_opened>=1?'מעבר לניסוי':'פתיחת הניסוי')+'</button>'
   : s.current_stage===1
   ? '<button class="btn primary" onclick="setStage(2)">'+(s.max_stage_opened>=2?'מעבר לבדיקת הידע':'פתיחת בדיקת הידע')+'</button>'
   : s.current_stage===2
   ? '<span class="phase-done">התקדמות השאלות נשלטת בכרטיס בדיקת הידע · אפשר לחזור לכל שלב שכבר נפתח דרך הסרגל</span>'
   : '<span class="phase-done">הכיתה עובדת על מסקנות ותכנון חקר המשך · אפשר לחזור לכל שלב שכבר נפתח דרך הסרגל</span>';

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
   return '<article class="progress-group-card"><div class="group-progress-head"><div><h3>'+esc(g.group_name)+'</h3><span>'+esc(p.status)+'</span><div class="group-student-names">'+((g.students||[]).length?(g.students||[]).map(esc).join(' · '):'טרם הצטרפו תלמידים')+'</div></div><strong>'+p.students+' תלמידים</strong></div><div class="group-task-grid"><div class="'+(openingDone?'done':'pending')+'"><span>פתיחה</span><b>'+p.opening+'/'+p.students+'</b></div><div class="'+(zeroDone?'done':p.step===1?'doing':'pending')+'"><span>בדיקת אפס</span><b>'+(zeroDone?'✓':p.step===1?'כעת':'—')+'</b></div><div class="'+(calDone?'done':p.step===2?'doing':'pending')+'"><span>מדידות כיול</span><b>'+p.cal+'/6</b></div><div class="'+(calDone?'done':'pending')+'"><span>גרף כיתתי</span><b>'+(calDone?'✓':'—')+'</b></div><div class="'+(p.samples>0?'doing':'pending')+'"><span>דגימות</span><b>'+(p.samples>0?p.samples+' דגימות':'—')+'</b></div></div></article>';
 }).join("");

 shell(
 '<div class="topbar"><button class="btn ghost top-exit" onclick="localStorage.removeItem(\'brix_teacher\');document.body.classList.remove(\'projection-mode\');go(\'home\')">יציאה</button><div class="top-brand">'+brand()+'</div><button class="btn projection-btn" onclick="toggleProjection()">'+(projecting?'יציאה מהקרנה':'מצב הקרנה')+'</button></div>'+
 lessonProgress(s.max_stage_opened,s.current_stage,false)+
 '<div class="teacher-dashboard">'+
   '<aside class="teacher-side">'+
     '<div class="card qr-card compact-qr-card"><h3>כניסת תלמידים</h3><div class="compact-qr-body"><img src="'+qr+'" width="150" height="150" alt="QR לכניסת תלמידים"><div class="qr-meta"><div class="code">'+s.class_code+'</div><button id="copyJoinLinkBtn" class="copy-link-btn" onclick="copyJoinLink(window.__brixJoinUrl)">העתקת קישור</button><p>סריקה או קוד כיתה</p></div></div></div>'+
     '<div class="card teacher-control-card"><span class="student-kicker">השלב הנוכחי</span><h3>'+stageNames[s.current_stage]+'</h3><p>שלבים שכבר נפתחו נשארים זמינים. המורה שולטת רק במעברים הכיתתיים.</p>'+actionHtml+'</div>'+
   '</aside>'+
   '<main class="teacher-main">'+
     '<section class="card opening-live-card compact-opening-results stage-section stage-section-opening"><div class="opening-live-head"><div><span class="student-kicker">שלב 1 · פתיחה</span><h2>תוצאות הסקר והניחושים</h2></div><strong>'+data.opening.submitted_count+' / '+data.student_count+' ענו</strong></div><div class="teacher-survey"><div><span>פעם ביום</span><b>'+data.opening.survey.daily+'</b></div><div><span>פעם בשבוע</span><b>'+data.opening.survey.weekly+'</b></div><div><span>רק באירועים</span><b>'+data.opening.survey.events+'</b></div><div><span>לא שותה ממותק</span><b>'+data.opening.survey.never+'</b></div></div><div class="guess-averages"><h3>ממוצע ניחושי הכיתה — כפיות ב־500 מ״ל</h3><div><span>קולה <b>'+data.opening.guess_averages.cola+'</b></span><span>תפוזים <b>'+data.opening.guess_averages.orange+'</b></span><span>תה קר <b>'+data.opening.guess_averages.iced_tea+'</b></span><span>אנרגיה <b>'+data.opening.guess_averages.energy+'</b></span></div></div></section>'+
     '<section class="card class-calibration-card stage-section stage-section-calibration"><div class="section-title-row"><div><span class="student-kicker">שלב 2 · כיול</span><h2>ממוצעי הכיול של הכיתה</h2></div><p>הטבלה מתעדכנת אוטומטית מכל קבוצה. כל שורה הופכת לנקודה בגרף הכיתתי.</p></div><div class="table-wrap"><table class="calibration-table"><thead><tr><th>תמיסה</th><th>ריכוז סוכר<br><small>g/100mL</small></th><th>קבוצות שדיווחו</th><th>ממוצע Brix</th><th>טווח</th></tr></thead><tbody>'+calibrationRows+'</tbody></table></div></section>'+teacherCalibrationGraphHtml(data)+
     teacherSampleGraphsHtml(data)+
     (Number(s.max_stage_opened)>=2?teacherQuizHtml(quizData,s.current_stage):'')+
     (Number(s.max_stage_opened)>=3?teacherGroupWorkHtml(groupWorkData):'')+
     '<div class="card dashboard-summary progress-summary"><div><span>פתיחה הושלמה</span><strong>'+data.opening.submitted_count+' / '+data.student_count+'</strong></div><div><span>קבוצות שסיימו כיול</span><strong>'+data.groups_calibration_done+' / '+s.group_count+'</strong></div><div><span>שלב כיתתי</span><strong>'+stageNames[s.current_stage]+'</strong></div></div>'+
     '<section class="card groups-progress-card"><div class="section-title-row"><div><span class="student-kicker">בסוף · התקדמות הכיתה</span><h2>התקדמות הקבוצות</h2></div><p>כאן רואים מה כל קבוצה כבר ביצעה — לא מי מחובר.</p></div><div class="groups-progress-grid">'+groupCards+'</div></section>'+
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