const API_URL = 'https://script.google.com/macros/s/AKfycbzWimhfRTHSPucVbss7ZgyktRmrXv1Zs8CiW02-PUH6e7BLwmDmR_ytJI64oPVDUIXG/exec';

const LEVELS = [
  { min: 0, name: 'Eco Explorer', th: 'ผู้เริ่มสำรวจ' },
  { min: 100, name: 'Eco Learner', th: 'ผู้เรียนรู้บ้านส่วนรวม' },
  { min: 200, name: 'Eco Thinker', th: 'ผู้คิดเชื่อมโยง' },
  { min: 300, name: 'Eco Changemaker', th: 'ผู้เริ่มเปลี่ยนแปลง' },
  { min: 400, name: 'Guardian of Our Common Home', th: 'ผู้พิทักษ์บ้านส่วนรวม' }
];

const state = {
  token: '', student: null, missions: [], badges: [], progress: [], controls: {}, researchStatus: {}, workflowStage: 'PRETEST',
  currentMission: null, questionIndex: 0, answerLocked: false, assessment: null
};

const $ = id => document.getElementById(id);
const loginScreen = $('loginScreen');
const appShell = $('appShell');
const loginForm = $('loginForm');
const missionJourney = $('missionJourney');
const missionModal = $('missionModal');
const missionModalContent = $('missionModalContent');
const modalProgressBar = $('modalProgressBar');
const howToModal = $('howToModal');
const assessmentModal = $('assessmentModal');
const assessmentContent = $('assessmentContent');
const toast = $('toast');

prefillIdentity();
loginForm.addEventListener('submit', handleLogin);
$('missionClose').addEventListener('click', () => missionModal.close());
$('howToClose').addEventListener('click', () => howToModal.close());
$('assessmentClose').addEventListener('click', () => assessmentModal.close());
$('howToPlayButton').addEventListener('click', () => howToModal.showModal());
$('continueButton').addEventListener('click', continueWorkflow);
$('pretestButton').addEventListener('click', () => startAssessment('PRETEST'));
$('posttestButton').addEventListener('click', () => startAssessment('POSTTEST'));
$('certificateButton').addEventListener('click', openCertificate);
$('profileButton').addEventListener('click', () => state.student && showToast(`${state.student.fullName} · ${state.student.currentLevel || 'Eco Explorer'}`));
$('logoutButton').addEventListener('click', logoutStudent);
restoreSession();

async function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('lqStudentSession') || 'null');
    if (!saved?.token) return;
    state.token = saved.token;
    await loadBootstrap();
    enterApp();
  } catch (_) {
    clearSession();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const studentId = $('studentId').value.trim();
  const fullName = $('studentName').value.trim();
  if (!studentId || !fullName) return showToast('กรุณากรอกรหัสนักเรียนและชื่อ–นามสกุล');
  setLoginBusy(true);
  try {
    const data = await apiPost({ action: 'login', studentId, fullName, device: navigator.userAgent });
    if (!data.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
    state.token = data.token;
    state.student = data.student;
    sessionStorage.setItem('lqStudentSession', JSON.stringify({ token: state.token }));
    localStorage.setItem('lqIdentity', JSON.stringify({ studentId, fullName }));
    await loadBootstrap();
    enterApp();
  } catch (error) {
    showToast(error.message || 'ไม่สามารถเชื่อมต่อระบบได้');
  } finally { setLoginBusy(false); }
}

async function loadBootstrap() {
  const data = await apiPost({ action: 'bootstrap', token: state.token });
  if (!data.ok) {
    if (data.error === 'UNAUTHORIZED') clearSession();
    throw new Error(data.message || 'โหลดข้อมูลเกมไม่สำเร็จ');
  }
  state.student = data.student;
  state.missions = data.missions || [];
  state.badges = data.badges || [];
  state.progress = data.progress || [];
  state.controls = data.controls || {};
  state.researchStatus = data.researchStatus || {};
  state.workflowStage = data.workflowStage || 'PRETEST';
}

function enterApp() {
  loginScreen.classList.add('is-hidden');
  appShell.classList.remove('is-hidden');
  syncHeader(); renderResearchFlow(); renderJourney(); syncStats(); syncSystemNotice();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncHeader() {
  const name = state.student?.fullName || 'นักเรียน';
  const points = Number(state.student?.totalEcoPoints || 0);
  const level = getLevel(points, state.student?.currentLevel);
  $('profileName').textContent = name; $('profileLevel').textContent = level.name; $('avatarInitial').textContent = name.trim().charAt(0) || 'L';
  $('heroLevel').textContent = level.name; $('heroLevelThai').textContent = level.th;
}

function syncSystemNotice() {
  const box = $('systemNotice');
  const closed = String(state.controls.gameStatus || 'OPEN').toUpperCase() !== 'OPEN';
  if (closed) { box.textContent = 'ขณะนี้ครูผู้สอนปิดระบบเกมชั่วคราว คุณยังสามารถตรวจสอบความก้าวหน้าของตนเองได้'; box.classList.remove('is-hidden'); }
  else box.classList.add('is-hidden');
}

function renderResearchFlow() {
  const pre = state.researchStatus.pretest || {};
  const post = state.researchStatus.posttest || {};
  const completed = completedMissionCount();
  setResearchStep('pretestStep', pre.completed ? 'completed' : 'active', pre.completed ? `เสร็จแล้ว · ${formatDateTime(pre.completedAt)}` : 'รอดำเนินการ');
  $('pretestButton').disabled = !!pre.completed || state.controls.pretestEnabled === false;
  $('pretestButton').textContent = pre.completed ? 'ทำแบบวัดก่อนเรียนแล้ว' : state.controls.pretestEnabled === false ? 'ครูปิดแบบวัดก่อนเรียน' : 'ทำแบบวัดก่อนเรียน';
  setResearchStep('missionsStep', completed >= state.missions.length && state.missions.length ? 'completed' : (pre.completed || !state.controls.pretestRequired ? 'active' : 'pending'), `${completed}/${state.missions.length || 5} Mission`);
  const postUnlocked = completed >= state.missions.length && state.missions.length > 0;
  setResearchStep('posttestStep', post.completed ? 'completed' : postUnlocked ? 'active blue' : 'pending', post.completed ? `เสร็จแล้ว · ${formatDateTime(post.completedAt)}` : postUnlocked ? 'พร้อมทำแบบวัดหลังเรียน' : 'รอผ่านครบทุก Mission');
  $('posttestButton').disabled = !!post.completed || !postUnlocked || state.controls.posttestEnabled === false;
  $('posttestButton').textContent = post.completed ? 'ทำแบบวัดหลังเรียนแล้ว' : state.controls.posttestEnabled === false ? 'ครูปิดแบบวัดหลังเรียน' : postUnlocked ? 'ทำแบบวัดหลังเรียน' : 'ผ่าน 5 Mission เพื่อปลดล็อก';
  const allDone = post.completed && completed >= state.missions.length && state.missions.length > 0;
  $('certificateButton').classList.toggle('is-hidden', !(allDone && state.controls.certificateEnabled !== false));
}

function setResearchStep(id, cls, status) {
  const el = $(id); el.className = `research-step ${cls}`; el.querySelector('.research-step-status').textContent = status;
}

function syncStats() {
  const completed = state.progress.filter(p => p.status === 'Completed');
  const points = Number(state.student?.totalEcoPoints || 0);
  const badgeCount = new Set(completed.map(p => p.badgeId).filter(Boolean)).size;
  const percent = state.missions.length ? Math.round((completed.length / state.missions.length) * 100) : 0;
  $('ecoPoints').textContent = points; $('completedCount').textContent = `${completed.length}/${state.missions.length || 5}`; $('badgeCount').textContent = badgeCount; $('progressPercent').textContent = `${percent}%`; $('progressRing').style.setProperty('--progress', String(percent));
  const next = LEVELS.find(l => l.min > points); $('nextTarget').textContent = next ? Math.max(0, next.min - points) : 'MAX';
  const btn = $('continueButton');
  if (state.workflowStage === 'PRETEST') btn.innerHTML = 'ทำแบบวัดก่อนเรียน <span>→</span>';
  else if (state.workflowStage === 'POSTTEST') btn.innerHTML = 'ทำแบบวัดหลังเรียน <span>→</span>';
  else if (state.workflowStage === 'COMPLETE') btn.innerHTML = 'ดูใบประกาศ <span>✓</span>';
  else { const m = state.missions.find(x => missionStatus(x) === 'available'); btn.innerHTML = m ? `ไป Mission ${m.order} <span>→</span>` : 'ดูภารกิจ <span>→</span>'; }
}

function completedMissionCount() { return state.progress.filter(p => p.status === 'Completed').length; }
function progressFor(id) { return state.progress.find(p => p.missionId === id); }
function missionStatus(m) { if (progressFor(m.missionId)?.status === 'Completed') return 'completed'; return m.access ? 'available' : 'locked'; }

function renderJourney() {
  missionJourney.innerHTML = '';
  state.missions.forEach(m => {
    const status = missionStatus(m), p = progressFor(m.missionId);
    const card = document.createElement('article'); card.className = `mission-card ${status}`;
    const label = status === 'completed' ? `${Number(p?.score || 0)} / ${Number(m.maxPoints || 100)}` : status === 'available' ? 'พร้อมเล่น' : 'ยังไม่ปลดล็อก';
    card.innerHTML = `<div class="mission-number">${status === 'completed' ? '✓' : String(m.order).padStart(2,'0')}</div><div class="mission-copy"><h3>${esc(m.title)}</h3><p>${esc(m.learningGoal || m.topic)}</p><div class="mission-meta"><span>${esc(m.topic)}</span><span>${esc(m.laudatoSiRef || '')}</span><span>${Number(m.maxPoints || 100)} Eco Points</span></div>${status === 'locked' && m.accessReason ? `<small class="mission-lock-reason">${esc(m.accessReason)}</small>` : ''}</div><div class="mission-action"><strong>${esc(label)}</strong><button type="button" ${status === 'locked' ? 'disabled' : ''}>${status === 'completed' ? '↻' : status === 'available' ? '→' : '⌒'}</button></div>`;
    if (status !== 'locked') card.querySelector('button').addEventListener('click', () => openMission(m.missionId));
    missionJourney.appendChild(card);
  });
}

async function continueWorkflow() {
  if (state.workflowStage === 'PRETEST') return startAssessment('PRETEST');
  if (state.workflowStage === 'POSTTEST') return startAssessment('POSTTEST');
  if (state.workflowStage === 'COMPLETE') return openCertificate();
  const m = state.missions.find(x => missionStatus(x) === 'available');
  if (m) return openMission(m.missionId);
  document.querySelector('#missions')?.scrollIntoView({ behavior: 'smooth' });
}

async function openMission(missionId) {
  try {
    const started = await apiPost({ action:'startMission', token:state.token, missionId });
    if (!started.ok) throw new Error(started.message || 'ยังไม่สามารถเปิดภารกิจนี้ได้');
    const data = await apiPost({ action:'mission', token:state.token, missionId });
    if (!data.ok) throw new Error(data.message || 'เปิดภารกิจไม่สำเร็จ');
    state.currentMission = data; state.questionIndex = 0; state.answerLocked = false; renderMissionIntro(); missionModal.showModal();
  } catch (e) { showToast(e.message || 'ไม่สามารถเปิดภารกิจได้'); }
}

function renderMissionIntro() {
  const d=state.currentMission,m=d.mission; setModalProgress(8);
  missionModalContent.innerHTML=`<div class="runtime-modal-content"><p class="section-label">MISSION ${String(m.order).padStart(2,'0')}</p><h2>${esc(m.title)}</h2><p class="runtime-topic">${esc(m.topic)} · ${esc(m.laudatoSiRef||'')}</p><div class="runtime-goal"><strong>เป้าหมายการเรียนรู้</strong><p>${esc(m.learningGoal||'')}</p></div><div class="runtime-learning-cards">${(d.content||[]).map(c=>`<article><small>LEARNING CARD ${Number(c.order||0)}</small><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p>${c.laudatoSiRef?`<span>${esc(c.laudatoSiRef)}</span>`:''}</article>`).join('')}</div><button class="btn btn-primary runtime-full" id="beginChallenge" type="button">เริ่ม Situation Challenge <span>→</span></button></div>`;
  $('beginChallenge').addEventListener('click',()=>{state.questionIndex=0;renderQuestion();});
}

function renderQuestion() {
  const qs=state.currentMission.questions||[]; if(state.questionIndex>=qs.length)return renderReflection();
  const q=qs[state.questionIndex];state.answerLocked=false;setModalProgress(20+Math.round((state.questionIndex/Math.max(1,qs.length))*55));
  missionModalContent.innerHTML=`<div class="runtime-modal-content"><div class="runtime-question-head"><p class="section-label">SITUATION CHALLENGE</p><span>ข้อ ${state.questionIndex+1} / ${qs.length}</span></div><h2 class="runtime-question">${esc(q.prompt)}</h2><div class="runtime-options">${q.options.map((o,i)=>`<button type="button" data-option="${letter(i)}"><span>${letter(i)}</span><strong>${esc(o)}</strong></button>`).join('')}</div><div id="answerFeedback" class="runtime-feedback is-hidden"></div></div>`;
  document.querySelectorAll('.runtime-options button').forEach(b=>b.addEventListener('click',()=>submitAnswer(q,b)));
}

async function submitAnswer(q, button) {
  if(state.answerLocked)return; state.answerLocked=true; const buttons=[...document.querySelectorAll('.runtime-options button')];buttons.forEach(b=>b.disabled=true);
  try{
    const r=await apiPost({action:'submitAnswer',token:state.token,missionId:state.currentMission.mission.missionId,questionId:q.questionId,selectedOption:button.dataset.option,submissionKey:randomId(),device:navigator.userAgent});
    if(!r.ok)throw new Error(r.message||'บันทึกคำตอบไม่สำเร็จ'); button.classList.add(r.isCorrect?'answer-correct':'answer-wrong');
    const f=$('answerFeedback');f.classList.remove('is-hidden');f.innerHTML=`<strong>${r.isCorrect?'✓ คำตอบนี้เหมาะสม':'ลองพิจารณาอีกครั้ง'}</strong><p>${esc(r.feedback||'')}</p><small>ได้รับ ${Number(r.pointsEarned||0)} คะแนนจากข้อนี้</small><div class="feedback-actions">${!r.isCorrect?'<button class="btn btn-ghost" id="retryQuestion" type="button">ลองตอบอีกครั้ง</button>':''}<button class="btn btn-primary" id="nextQuestion" type="button">${state.questionIndex+1<(state.currentMission.questions||[]).length?'ข้อต่อไป':'ไปสู่การสะท้อนคิด'} →</button></div>`;
    if($('retryQuestion'))$('retryQuestion').addEventListener('click',renderQuestion);
    $('nextQuestion').addEventListener('click',()=>{state.questionIndex++;renderQuestion();});
  }catch(e){state.answerLocked=false;buttons.forEach(b=>b.disabled=false);showToast(e.message||'ส่งคำตอบไม่สำเร็จ');}
}

function renderReflection(){
  const m=state.currentMission.mission;setModalProgress(82);const req=['M04','M05'].includes(m.missionId);
  missionModalContent.innerHTML=`<div class="runtime-modal-content"><p class="section-label">REFLECTION</p><h2>จากภารกิจนี้ คุณมองเห็นอะไร?</h2><p class="runtime-topic">เชื่อมสิ่งที่เรียนรู้กับการตัดสินใจและชีวิตประจำวัน</p><form id="reflectionForm" class="runtime-reflection-form"><label><span>สิ่งสำคัญที่ฉันได้เรียนรู้</span><textarea id="reflectionText" rows="4" maxlength="3000" required></textarea></label><label><span>Eco Commitment ${req?'':'(ไม่บังคับ)'}</span><textarea id="ecoCommitment" rows="3" maxlength="1200" ${req?'required':''}></textarea></label><button class="btn btn-primary runtime-full" type="submit">บันทึกและสรุปภารกิจ →</button></form></div>`;
  $('reflectionForm').addEventListener('submit',saveReflectionAndComplete);
}

async function saveReflectionAndComplete(e){e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const missionId=state.currentMission.mission.missionId;const sr=await apiPost({action:'saveReflection',token:state.token,missionId,reflectionText:$('reflectionText').value.trim(),ecoCommitment:$('ecoCommitment').value.trim(),submissionKey:randomId()});if(!sr.ok)throw new Error(sr.message||'บันทึก Reflection ไม่สำเร็จ');const r=await apiPost({action:'completeMission',token:state.token,missionId});if(!r.ok)throw new Error(r.message||'สรุปภารกิจไม่สำเร็จ');await loadBootstrap();syncHeader();renderResearchFlow();renderJourney();syncStats();renderMissionResult(r);}catch(err){btn.disabled=false;showToast(err.message||'บันทึกข้อมูลไม่สำเร็จ');}}

function renderMissionResult(r){const m=state.currentMission.mission,b=state.badges.find(x=>x.badgeId===r.badgeId);setModalProgress(100);missionModalContent.innerHTML=`<div class="runtime-modal-content runtime-result"><div class="runtime-result-icon">${r.completed?'✓':'↻'}</div><p class="section-label">MISSION RESULT</p><h2>${r.completed?'ภารกิจสำเร็จ!':'ยังไม่ผ่านภารกิจ'}</h2><p>${esc(m.title)}</p><div class="runtime-score"><strong>${Number(r.score||0)}</strong><span>/ 100 Eco Points</span></div>${r.completed&&b?`<div class="runtime-badge"><small>BADGE UNLOCKED</small><strong>${esc(b.nameTh)}</strong><span>${esc(b.nameEn)}</span></div>`:''}<p class="runtime-result-note">${r.completed?'ระบบบันทึกความก้าวหน้าแล้ว':'คุณสามารถกลับไปลอง Challenge อีกครั้งได้'}</p><button class="btn btn-primary runtime-full" id="resultAction" type="button">${r.completed?'กลับสู่ Mission Journey':'ลอง Challenge อีกครั้ง'}</button></div>`;$('resultAction').addEventListener('click',()=>{if(r.completed){missionModal.close();document.querySelector('#researchFlow')?.scrollIntoView({behavior:'smooth'});}else{state.questionIndex=0;renderQuestion();}});}

async function startAssessment(phase){
  try{const r=await apiPost({action:'startAssessment',token:state.token,phase,device:navigator.userAgent});if(!r.ok)throw new Error(r.message||'ไม่สามารถเปิดแบบวัดได้');state.assessment={phase:r.phase,sessionId:r.assessmentSessionId,items:r.items||[],index:0,answers:{},startedAt:r.startedAt};renderAssessment();assessmentModal.showModal();}catch(e){showToast(e.message||'ไม่สามารถเปิดแบบวัดได้');}}

function renderAssessment(){const a=state.assessment;if(!a)return;const item=a.items[a.index];if(!item)return;const pct=Math.round(((a.index+1)/a.items.length)*100);const phaseTh=a.phase==='PRETEST'?'แบบวัดก่อนเรียน':'แบบวัดหลังเรียน';let options='';if(item.itemType==='MCQ'){options=`<div class="assessment-options">${item.options.map((o,i)=>`<button class="assessment-choice ${a.answers[item.itemId]===letter(i)?'selected':''}" data-value="${letter(i)}" type="button"><span>${letter(i)}</span><strong>${esc(o)}</strong></button>`).join('')}</div>`;}else{const labels=['ไม่เห็นด้วยอย่างยิ่ง','ไม่เห็นด้วย','ไม่แน่ใจ','เห็นด้วย','เห็นด้วยอย่างยิ่ง'];options=`<div class="likert-grid">${labels.map((x,i)=>`<button class="likert-choice ${String(a.answers[item.itemId])===String(i+1)?'selected':''}" data-value="${i+1}" type="button"><strong>${i+1}</strong><span>${x}</span></button>`).join('')}</div>`;}assessmentContent.innerHTML=`<div class="assessment-head"><div><p>${phaseTh.toUpperCase()} · ด้านที่ ${item.domainNo}</p><h2>${phaseTh}</h2></div><span>${a.index+1}/${a.items.length}</span></div><div class="assessment-progress"><span style="width:${pct}%"></span></div><div class="assessment-question"><h3>${esc(item.prompt)}</h3>${options}</div><div class="assessment-note">ตอบตามความรู้หรือความคิดเห็นของคุณ ข้อมูลส่วนนี้ใช้เพื่อการวิจัยและไม่รวมกับ Eco Points</div><div class="assessment-actions"><button class="btn btn-ghost" id="assessmentPrev" type="button" ${a.index===0?'disabled':''}>← ย้อนกลับ</button><button class="btn btn-primary" id="assessmentNext" type="button">${a.index===a.items.length-1?'ส่งแบบวัด':'ข้อต่อไป →'}</button></div>`;document.querySelectorAll('.assessment-choice,.likert-choice').forEach(b=>b.addEventListener('click',()=>{a.answers[item.itemId]=b.dataset.value;renderAssessment();}));$('assessmentPrev').addEventListener('click',()=>{a.index--;renderAssessment();});$('assessmentNext').addEventListener('click',()=>{if(a.answers[item.itemId]==null)return showToast('กรุณาเลือกคำตอบก่อนดำเนินการต่อ');if(a.index<a.items.length-1){a.index++;renderAssessment();}else submitAssessment();});}

async function submitAssessment(){const a=state.assessment;if(!a)return;const answers=a.items.map(i=>({itemId:i.itemId,answer:a.answers[i.itemId]}));try{const r=await apiPost({action:'submitAssessment',token:state.token,phase:a.phase,assessmentSessionId:a.sessionId,answers,submissionKey:randomId(),device:navigator.userAgent});if(!r.ok)throw new Error(r.message||'ส่งแบบวัดไม่สำเร็จ');const phase=a.phase;state.assessment=null;assessmentModal.close();await loadBootstrap();renderResearchFlow();renderJourney();syncStats();showToast(phase==='PRETEST'?'บันทึกแบบวัดก่อนเรียนเรียบร้อย':'บันทึกแบบวัดหลังเรียนเรียบร้อย');}catch(e){showToast(e.message||'ส่งแบบวัดไม่สำเร็จ');}}

async function openCertificate(){let win=window.open('','_blank');try{const r=await apiPost({action:'certificate',token:state.token});if(!r.ok)throw new Error(r.message||'ยังไม่สามารถออกใบประกาศได้');const badges=(r.badges||[]).map(b=>`<span>${esc(b.nameTh||b.nameEn)}</span>`).join('');win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Certificate - ${esc(r.student.fullName)}</title><link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet"><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Sarabun;background:#eef5f0}.cert{width:297mm;height:210mm;background:#fff;padding:14mm;position:relative}.frame{height:100%;border:2px solid #0b7454;padding:12mm;text-align:center;display:flex;flex-direction:column;justify-content:center;position:relative}.frame:before{content:'LQ';position:absolute;top:12mm;left:14mm;width:17mm;height:17mm;border-radius:5mm;background:#0b7454;color:#fff;display:grid;place-items:center;font:700 16px Kanit}.kicker{font:600 12px Kanit;letter-spacing:.18em;color:#0b7454}.title{font:700 31px Kanit;color:#073f31;margin:6mm 0 3mm}.name{font:700 27px Kanit;color:#0b7454;border-bottom:1px solid #a8c8b9;display:inline-block;padding:0 15mm 2mm}.desc{font-size:15px;line-height:1.8;color:#4f665d;margin:5mm auto;max-width:220mm}.badges{display:flex;justify-content:center;flex-wrap:wrap;gap:2mm;margin:4mm 0}.badges span{background:#edf8f3;border:1px solid #cbe3d7;border-radius:999px;padding:2mm 4mm;font-size:10px}.meta{font-size:11px;color:#718279;margin-top:4mm}.print{position:fixed;right:16px;top:16px;border:0;background:#0b7454;color:#fff;padding:10px 16px;border-radius:10px;font-weight:700}@media print{.print{display:none}}</style></head><body><button class="print" onclick="print()">พิมพ์ / บันทึก PDF</button><section class="cert"><div class="frame"><div class="kicker">CERTIFICATE OF COMPLETION</div><div class="title">Guardian of Our Common Home</div><p>ขอมอบใบประกาศนี้ให้แก่</p><div class="name">${esc(r.student.fullName)}</div><div class="desc">ผู้สำเร็จภารกิจการเรียนรู้ <strong>LAUDATO QUEST: ภารกิจพิทักษ์บ้านส่วนรวม</strong> ครบทั้ง 5 Mission และแสดงความมุ่งมั่นในการดูแลบ้านส่วนรวมตามแนวคิด <em>Laudato Si’</em></div><div class="badges">${badges}</div><div class="meta">รหัสนักเรียน ${esc(r.student.studentId)} · วันที่สำเร็จ ${esc(formatDateTime(r.completedAt))} · โรงเรียนเซนต์เทเรซา</div></div></section></body></html>`);win.document.close();}catch(e){if(win)win.close();showToast(e.message||'ไม่สามารถสร้างใบประกาศได้');}}

function logoutStudent(){if(!confirm('ต้องการออกจากระบบใช่หรือไม่?\nความก้าวหน้าที่บันทึกไว้จะไม่หาย'))return;clearSession();location.reload();}
function clearSession(){sessionStorage.removeItem('lqStudentSession');state.token='';}
async function apiPost(payload){const r=await fetch(API_URL,{method:'POST',redirect:'follow',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(`API HTTP ${r.status}`);return r.json();}
function setModalProgress(v){modalProgressBar.style.width=`${Math.max(0,Math.min(100,v))}%`;}
function setLoginBusy(b){const btn=loginForm.querySelector('button[type="submit"]');[...loginForm.elements].forEach(el=>el.disabled=b);if(btn)btn.innerHTML=b?'กำลังเชื่อมต่อระบบ...':'เข้าสู่บ้านส่วนรวม <span>→</span>';}
function prefillIdentity(){try{const s=JSON.parse(localStorage.getItem('lqIdentity')||'null');if(s?.studentId)$('studentId').value=s.studentId;if(s?.fullName)$('studentName').value=s.fullName;}catch(_){}}
function getLevel(points,server){let c=LEVELS[0];LEVELS.forEach(l=>{if(points>=l.min)c=l});return LEVELS.find(l=>l.name===server)||c;}
function letter(i){return ['A','B','C','D'][i]||'';}
function randomId(){return crypto?.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function formatDateTime(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return v;return new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(d);}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),3000);}
