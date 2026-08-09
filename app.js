const missions = [
  {
    id:'M01', title:'บ้านของเรากำลังเปลี่ยนไป', topic:'โลกคือบ้านส่วนรวม', ref:'LS 1, 13',
    summary:'สำรวจปัญหาสิ่งแวดล้อมใกล้ตัวและมองโลกในฐานะบ้านที่เราทุกคนร่วมกันดูแล',
    lesson:'โลกไม่ได้เป็นเพียงทรัพยากรที่มนุษย์ใช้ประโยชน์ แต่เป็นบ้านส่วนรวมที่มนุษย์ สิ่งมีชีวิต และธรรมชาติอาศัยอยู่ร่วมกัน การดูแลสิ่งแวดล้อมจึงเป็นความรับผิดชอบร่วม ไม่ใช่หน้าที่ของคนใดคนหนึ่ง',
    questions:[
      {q:'ข้อใดสะท้อนแนวคิด “บ้านส่วนรวม” ได้ดีที่สุด', options:['สิ่งแวดล้อมเป็นหน้าที่ของหน่วยงานรัฐเท่านั้น','โลกเป็นพื้นที่ร่วมที่ทุกคนมีส่วนรับผิดชอบ','ผู้ที่มีทรัพยากรมากควรเป็นผู้รับผิดชอบทั้งหมด','ปัญหาสิ่งแวดล้อมไม่เกี่ยวกับชีวิตประจำวัน'], correct:1, feedback:'แนวคิดบ้านส่วนรวมเน้นความรับผิดชอบร่วมของทุกคน เพราะผลจากการกระทำของเราเชื่อมโยงถึงผู้อื่นและสิ่งแวดล้อม'},
      {q:'คุณเห็นไฟในห้องเรียนเปิดทิ้งไว้ทั้งที่ไม่มีคนอยู่ ควรทำอย่างไร', options:['ปล่อยไว้ เพราะไม่ใช่หน้าที่ของตน','ปิดไฟและชวนเพื่อนช่วยกันตรวจสอบ','ถ่ายรูปไว้แต่ไม่ทำอะไร','รอให้ครูมาปิด'], correct:1, feedback:'การลงมือทำและชวนผู้อื่นรับผิดชอบร่วมเป็นตัวอย่างของการดูแลบ้านส่วนรวมในชีวิตประจำวัน'}
    ]
  },
  {
    id:'M02', title:'ทุกสิ่งเชื่อมโยงกัน', topic:'ทุกสิ่งสัมพันธ์กัน', ref:'LS 91, 117, 137–139',
    summary:'มองเห็นห่วงโซ่ความสัมพันธ์ระหว่างพฤติกรรม การใช้ทรัพยากร สังคม และสิ่งแวดล้อม',
    lesson:'การใช้ทรัพยากรหนึ่งอย่างไม่ได้จบลงที่ผู้ใช้ เช่น การเปิดเครื่องปรับอากาศสัมพันธ์กับการใช้พลังงาน การผลิตไฟฟ้า ทรัพยากร และผลกระทบต่อสิ่งแวดล้อม การคิดเชื่อมโยงช่วยให้เราเห็นผลที่ไกลกว่าสิ่งที่อยู่ตรงหน้า',
    questions:[
      {q:'เหตุใดการเปิดเครื่องปรับอากาศทิ้งไว้จึงไม่ใช่เรื่องของค่าไฟเพียงอย่างเดียว', options:['เพราะทำให้ห้องเย็นเกินไปเท่านั้น','เพราะเชื่อมโยงกับการใช้พลังงาน ทรัพยากร และผลกระทบต่อสิ่งแวดล้อม','เพราะเครื่องปรับอากาศมีราคาแพง','เพราะทำให้ผู้เรียนง่วง'], correct:1, feedback:'การคิดแบบเชื่อมโยงทำให้เห็นเส้นทางตั้งแต่การใช้ไฟฟ้าไปจนถึงทรัพยากรและผลกระทบที่เกี่ยวข้อง'},
      {q:'โรงเรียนมีอาหารเหลือจำนวนมากทุกวัน แนวทางใดมองปัญหาแบบ “ทุกสิ่งสัมพันธ์กัน” มากที่สุด', options:['เพิ่มถังขยะให้มากขึ้นอย่างเดียว','พิจารณาทั้งการสั่งซื้อ ปริมาณอาหาร พฤติกรรมการกิน และการจัดการเศษอาหาร','ให้แม่บ้านจัดการทั้งหมด','นำอาหารทั้งหมดไปทิ้งนอกโรงเรียน'], correct:1, feedback:'การแก้ปัญหาแบบเชื่อมโยงต้องมองทั้งต้นเหตุ พฤติกรรม และปลายทางของปัญหา'}
    ]
  },
  {
    id:'M03', title:'หยุดวงจรทิ้งขว้าง', topic:'วัฒนธรรมการทิ้งขว้าง', ref:'LS 20–22',
    summary:'ทบทวนการบริโภค การใช้บรรจุภัณฑ์ และทางเลือกที่ช่วยลดของเสียตั้งแต่ต้นทาง',
    lesson:'วัฒนธรรมการทิ้งขว้างเกิดเมื่อเรามองสิ่งของและทรัพยากรว่าใช้แล้วทิ้งได้ง่าย การลดของเสียจึงเริ่มได้ตั้งแต่ก่อนซื้อ เลือกใช้ซ้ำ เลือกสิ่งจำเป็น และจัดการวัสดุให้กลับเข้าสู่การใช้ประโยชน์ได้มากที่สุด',
    questions:[
      {q:'หลังเลิกเรียน คุณต้องซื้อเครื่องดื่ม ทางเลือกใดลดการใช้ทรัพยากรใหม่ได้มากที่สุด', options:['รับแก้วและหลอดพลาสติกใหม่ทุกครั้ง','นำแก้วส่วนตัวมาใช้','ซื้อสองแก้วเผื่อหิว','ทิ้งแก้วเดิมก่อนซื้อใหม่'], correct:1, feedback:'การใช้ภาชนะซ้ำช่วยลดความต้องการใช้วัสดุใหม่และลดของเสียจากการใช้ครั้งเดียว'},
      {q:'ถ้ามีอาหารเหลือจากกิจกรรมโรงเรียน สิ่งใดควรทำก่อนเป็นอันดับแรก', options:['ทิ้งทั้งหมดเพื่อให้พื้นที่สะอาด','พิจารณาป้องกันอาหารเหลือตั้งแต่การวางแผนปริมาณ','เพิ่มถุงขยะให้มากขึ้น','นำไปกองรวมกับขยะทั่วไป'], correct:1, feedback:'การลดขยะที่ต้นทางมีประสิทธิภาพกว่าการจัดการเฉพาะเมื่อขยะเกิดขึ้นแล้ว'}
    ]
  },
  {
    id:'M04', title:'เปลี่ยนฉัน เปลี่ยนโลก', topic:'การกลับใจทางนิเวศวิทยา', ref:'LS 216–221',
    summary:'สะท้อนพฤติกรรมของตนเองและเลือกสิ่งเล็ก ๆ ที่พร้อมเปลี่ยนอย่างต่อเนื่อง',
    lesson:'การกลับใจทางนิเวศวิทยาหมายถึงการเปลี่ยนวิธีคิด คุณค่า และวิถีปฏิบัติให้สัมพันธ์กับการดูแลโลกมากขึ้น การเปลี่ยนแปลงไม่จำเป็นต้องเริ่มจากสิ่งใหญ่ แต่ต้องเป็นการเปลี่ยนที่มีความหมายและเกิดขึ้นจริงในชีวิตประจำวัน',
    questions:[
      {q:'ข้อใดสะท้อน “การกลับใจทางนิเวศวิทยา” ได้ชัดเจนที่สุด', options:['รู้ว่าขยะเป็นปัญหาแต่ไม่เปลี่ยนพฤติกรรม','เปลี่ยนพฤติกรรมของตนและชวนชุมชนร่วมดูแลสิ่งแวดล้อม','รอให้มีรางวัลก่อนจึงค่อยลงมือ','สนใจเฉพาะปัญหาที่กระทบตนเอง'], correct:1, feedback:'การกลับใจทางนิเวศวิทยาเชื่อมการเปลี่ยนแปลงภายในกับการปฏิบัติและความรับผิดชอบต่อส่วนรวม'},
      {q:'หากต้องเลือกหนึ่งสิ่งที่ทำต่อเนื่องในโรงเรียน ข้อใดเหมาะสมที่สุด', options:['ทำกิจกรรมครั้งเดียวแล้วจบ','เลือกพฤติกรรมที่ทำได้จริง เช่น ปิดไฟเมื่อไม่ใช้และทำต่อเนื่อง','รอให้เพื่อนเริ่มก่อน','เลือกสิ่งที่ดูดีแต่ทำจริงไม่ได้'], correct:1, feedback:'ความเปลี่ยนแปลงที่ยั่งยืนควรเป็นพฤติกรรมที่ทำได้จริง สม่ำเสมอ และเชื่อมกับความรับผิดชอบของตน'}
    ]
  },
  {
    id:'M05', title:'Guardian Challenge', topic:'ความรับผิดชอบต่อบ้านส่วนรวม', ref:'LS 209–211, 216–221',
    summary:'ภารกิจสรุปที่ให้คุณใช้ความรู้ คุณค่า ความรับผิดชอบ และการตัดสินใจร่วมกัน',
    lesson:'การดูแลบ้านส่วนรวมต้องเชื่อมความรู้กับการตัดสินใจและการปฏิบัติ ภารกิจสุดท้ายจึงให้คุณคิดแบบบูรณาการ ไม่เลือกคำตอบเพราะสะดวกที่สุด แต่พิจารณาผลต่อทรัพยากร ขยะ ผู้คน และสิ่งแวดล้อมร่วมกัน',
    questions:[
      {q:'โรงเรียนจะจัดงานใหญ่ 1,000 คน แนวทางใดเหมาะสมที่สุด', options:['ใช้ภาชนะใช้ครั้งเดียวทั้งหมดเพราะสะดวก','วางแผนอาหารพอดี ลดบรรจุภัณฑ์ แยกขยะ และใช้พลังงานเท่าที่จำเป็น','เปิดไฟและแอร์ทุกพื้นที่ตลอดงาน','ซื้อวัสดุประชาสัมพันธ์ให้มากที่สุด'], correct:1, feedback:'การตัดสินใจที่ดีต้องพิจารณาหลายมิติพร้อมกัน ทั้งทรัพยากร ของเสีย พลังงาน และการมีส่วนร่วม'},
      {q:'เมื่อเห็นเพื่อนทิ้งขวดรีไซเคิลลงถังทั่วไป คุณควรทำอย่างไร', options:['ไม่สนใจเพราะเป็นเรื่องส่วนตัว','ชวนเพื่อนแยกให้ถูกและอธิบายเหตุผลอย่างสุภาพ','ถ่ายคลิปลงโซเชียล','หยิบขวดไปทิ้งเองโดยไม่สื่อสาร'], correct:1, feedback:'ความรับผิดชอบต่อบ้านส่วนรวมรวมทั้งการลงมือทำและสร้างความเข้าใจกับผู้อื่นอย่างเหมาะสม'}
    ]
  }
];

const levels = [
  {min:0,name:'Eco Explorer',thai:'ผู้เริ่มสำรวจ'},
  {min:100,name:'Eco Learner',thai:'ผู้เรียนรู้บ้านส่วนรวม'},
  {min:200,name:'Eco Thinker',thai:'ผู้คิดเชื่อมโยง'},
  {min:300,name:'Eco Changemaker',thai:'ผู้เริ่มเปลี่ยนแปลง'},
  {min:400,name:'Guardian of Our Common Home',thai:'ผู้พิทักษ์บ้านส่วนรวม'}
];

const stateKey = 'laudatoQuestState';
let state = JSON.parse(localStorage.getItem(stateKey) || 'null') || {student:null, completed:{}, points:0};
let activeMissionIndex = 0;
let activeQuestionIndex = 0;
let activeScore = 0;
let questionLocked = false;

const $ = (id)=>document.getElementById(id);
const loginScreen = $('loginScreen');
const appShell = $('appShell');
const missionModal = $('missionModal');
const howToModal = $('howToModal');

function save(){ localStorage.setItem(stateKey, JSON.stringify(state)); }
function currentLevel(){ return [...levels].reverse().find(l=>state.points>=l.min) || levels[0]; }
function completedCount(){ return Object.keys(state.completed).length; }
function progressPercent(){ return Math.round((completedCount()/missions.length)*100); }
function nextLevelTarget(){ const level=levels.find(l=>l.min>state.points); return level ? level.min-state.points : 0; }
function isUnlocked(index){ return index===0 || Boolean(state.completed[missions[index-1].id]); }

function showApp(){
  loginScreen.classList.add('is-hidden');
  appShell.classList.remove('is-hidden');
  renderAll();
}
function showLogin(){
  loginScreen.classList.remove('is-hidden');
  appShell.classList.add('is-hidden');
}

$('loginForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const studentId=$('studentId').value.trim();
  const name=$('studentName').value.trim();
  if(!studentId || !name) return;
  state.student={id:studentId,name}; save(); showApp(); toast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่บ้านส่วนรวม');
});

function renderAll(){ renderProfile(); renderStats(); renderMissions(); }
function renderProfile(){
  const level=currentLevel();
  const name=state.student?.name || 'นักเรียน';
  $('profileName').textContent=name;
  $('profileLevel').textContent=level.name;
  $('avatarInitial').textContent=name.trim().charAt(0).toUpperCase() || 'L';
  $('heroLevel').textContent=level.name;
  $('heroLevelThai').textContent=level.thai;
}
function renderStats(){
  const percent=progressPercent();
  $('ecoPoints').textContent=state.points;
  $('completedCount').textContent=`${completedCount()}/5`;
  $('badgeCount').textContent=completedCount();
  $('nextTarget').textContent=nextLevelTarget() || 'MAX';
  $('progressPercent').textContent=`${percent}%`;
  $('progressRing').style.setProperty('--progress',percent);
  const nextIndex=missions.findIndex((_,i)=>isUnlocked(i)&&!state.completed[missions[i].id]);
  $('continueButton').textContent= nextIndex===-1 ? 'ดูผลความสำเร็จ →' : `${nextIndex===0?'เริ่ม':'เล่น'} ${missions[nextIndex].id} →`;
}

function renderMissions(){
  $('missionJourney').innerHTML=missions.map((m,i)=>{
    const completed=state.completed[m.id];
    const unlocked=isUnlocked(i);
    const status=completed?'completed':unlocked?'available':'locked';
    const score=completed?.score ?? 0;
    return `<article class="mission-card ${status}">
      <div class="mission-number">${completed?'✓':String(i+1).padStart(2,'0')}</div>
      <div class="mission-copy">
        <h3>${m.title}</h3>
        <p>${m.summary}</p>
        <div class="mission-meta"><span>${m.topic}</span><span>${m.ref}</span></div>
      </div>
      <div class="mission-action">
        <strong>${completed?`${score}/100`:unlocked?'พร้อมเล่น':'ยังไม่ปลดล็อก'}</strong>
        <button type="button" data-mission="${i}" ${unlocked?'':'disabled'} aria-label="เปิด ${m.title}">${completed?'↻':unlocked?'→':'⌕'}</button>
      </div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-mission]').forEach(btn=>btn.addEventListener('click',()=>openMission(Number(btn.dataset.mission))));
}

function openMission(index){
  if(!isUnlocked(index)){toast('ต้องผ่านภารกิจก่อนหน้าเพื่อปลดล็อก'); return;}
  activeMissionIndex=index; activeQuestionIndex=-1; activeScore=0; questionLocked=false;
  renderMissionIntro(); missionModal.showModal();
}

function renderMissionIntro(){
  const m=missions[activeMissionIndex]; $('modalProgressBar').style.width='12%';
  $('missionModalContent').innerHTML=`<div class="mission-modal-body">
    <div class="mission-kicker">${m.id} · ${m.ref}</div>
    <h2>${m.title}</h2><p class="lead">${m.summary}</p>
    <div class="learning-card-box"><strong>${m.topic}</strong><p>${m.lesson}</p></div>
    <div class="modal-actions"><button class="btn btn-primary" id="startChallenge" type="button">เริ่ม Situation Challenge →</button></div>
  </div>`;
  $('startChallenge').addEventListener('click',()=>{activeQuestionIndex=0; renderQuestion();});
}

function renderQuestion(){
  const m=missions[activeMissionIndex]; const item=m.questions[activeQuestionIndex]; questionLocked=false;
  const pct=30+((activeQuestionIndex/m.questions.length)*50); $('modalProgressBar').style.width=`${pct}%`;
  $('missionModalContent').innerHTML=`<div class="mission-modal-body">
    <div class="mission-kicker">${m.id} · CHALLENGE ${activeQuestionIndex+1}/${m.questions.length}</div>
    <h2>${m.title}</h2>
    <div class="question-box"><h3>${item.q}</h3><div class="option-list">${item.options.map((o,i)=>`<button class="option-btn" type="button" data-option="${i}">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div><div id="feedbackArea"></div></div>
  </div>`;
  document.querySelectorAll('[data-option]').forEach(btn=>btn.addEventListener('click',()=>answerQuestion(Number(btn.dataset.option),btn)));
}

function answerQuestion(choice,btn){
  if(questionLocked)return; questionLocked=true;
  const item=missions[activeMissionIndex].questions[activeQuestionIndex];
  document.querySelectorAll('[data-option]').forEach(b=>b.disabled=true); btn.classList.add('selected');
  const correct=choice===item.correct; if(correct)activeScore+=40;
  const feedback=correct?item.feedback:`ลองพิจารณาใหม่: ${item.feedback}`;
  $('feedbackArea').innerHTML=`<div class="feedback-box ${correct?'correct':'incorrect'}"><strong>${correct?'ตัดสินใจได้เหมาะสม':'ยังไม่ใช่ทางเลือกที่เหมาะที่สุด'}</strong><br>${feedback}</div><div class="modal-actions"><button class="btn btn-primary" id="nextQuestion" type="button">${activeQuestionIndex<missions[activeMissionIndex].questions.length-1?'คำถามถัดไป →':'สรุปภารกิจ →'}</button></div>`;
  $('nextQuestion').addEventListener('click',()=>{ if(activeQuestionIndex<missions[activeMissionIndex].questions.length-1){activeQuestionIndex++;renderQuestion();} else finishMission(); });
}

function finishMission(){
  const m=missions[activeMissionIndex];
  const existing=state.completed[m.id]?.score || 0;
  const score=Math.min(100, activeScore+20); // 20 points for completing lesson/reflection loop
  const passed=score>=60;
  $('modalProgressBar').style.width='100%';
  if(passed && score>existing){
    state.completed[m.id]={score,completedAt:new Date().toISOString()};
    state.points=Object.values(state.completed).reduce((sum,x)=>sum+x.score,0); save(); renderAll();
  }
  $('missionModalContent').innerHTML=`<div class="mission-modal-body"><div class="result-panel">
    <div class="result-medal">${passed?'★':'↻'}</div>
    <h3>${passed?'ภารกิจสำเร็จ':'ลองอีกครั้งได้'}</h3><div class="result-score">${score}/100</div>
    <p>${passed?`คุณได้รับ Badge ของ “${m.topic}” และ${activeMissionIndex<missions.length-1?'ปลดล็อกภารกิจถัดไปแล้ว':'ผ่านเส้นทางผู้พิทักษ์บ้านส่วนรวมครบแล้ว'}`:'เกณฑ์ผ่านคือ 60 คะแนน อ่าน Feedback แล้วกลับมาลองใหม่ได้'}</p>
    <div class="modal-actions"><button class="btn btn-ghost" id="closeResult" type="button">กลับหน้าหลัก</button>${passed&&activeMissionIndex<missions.length-1?'<button class="btn btn-primary" id="nextMissionNow" type="button">ไปภารกิจถัดไป →</button>':''}</div>
  </div></div>`;
  $('closeResult').addEventListener('click',()=>missionModal.close());
  const next=$('nextMissionNow'); if(next)next.addEventListener('click',()=>{missionModal.close();openMission(activeMissionIndex+1);});
  if(passed) toast(`ได้รับ Badge: ${m.topic}`);
}

$('continueButton').addEventListener('click',()=>{
  const i=missions.findIndex((m,idx)=>isUnlocked(idx)&&!state.completed[m.id]);
  if(i===-1){document.getElementById('missions').scrollIntoView({behavior:'smooth'});toast('คุณผ่านครบทั้ง 5 ภารกิจแล้ว');}
  else openMission(i);
});
$('howToPlayButton').addEventListener('click',()=>howToModal.showModal());
$('howToClose').addEventListener('click',()=>howToModal.close());
$('missionClose').addEventListener('click',()=>missionModal.close());
$('profileButton').addEventListener('click',()=>{ if(confirm('ต้องการออกจากผู้เล่นปัจจุบันหรือไม่?')){state={student:null,completed:{},points:0};save();showLogin();} });

function toast(message){ const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }

document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-links a').forEach(x=>x.classList.remove('active'));a.classList.add('active');}));

if(state.student) showApp(); else showLogin();
