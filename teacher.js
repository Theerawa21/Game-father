const API_URL='https://script.google.com/macros/s/AKfycbzWimhfRTHSPucVbss7ZgyktRmrXv1Zs8CiW02-PUH6e7BLwmDmR_ytJI64oPVDUIXG/exec';
const state={token:'',teacher:null,students:[],missions:[],summary:null};
const $=id=>document.getElementById(id);
const loginView=$('teacherLoginView');
const dashboard=$('teacherDashboard');
const form=$('teacherLoginForm');
const tbody=$('studentsTableBody');
const detailDialog=$('studentDetailDialog');

form.addEventListener('submit',loginTeacher);
$('teacherLogoutButton').addEventListener('click',logoutTeacher);
$('refreshButton').addEventListener('click',loadDashboard);
$('studentSearch').addEventListener('input',renderStudents);
$('statusFilter').addEventListener('change',renderStudents);
$('detailCloseButton').addEventListener('click',()=>detailDialog.close());

restoreSession();

async function restoreSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem('lqTeacherSession')||'null');
    if(!saved?.token)return;
    state.token=saved.token; state.teacher=saved.teacher||null;
    await loadDashboard();
    enterDashboard();
  }catch(_){sessionStorage.removeItem('lqTeacherSession');}
}

async function loginTeacher(e){
  e.preventDefault();
  const username=$('teacherUsername').value.trim();
  const pin=$('teacherPin').value.trim();
  const btn=$('teacherLoginButton');
  btn.disabled=true; btn.textContent='กำลังตรวจสอบ...';
  try{
    const data=await apiPost({action:'teacherLogin',username,pin});
    if(!data.ok)throw new Error(data.message||'เข้าสู่ระบบไม่สำเร็จ');
    state.token=data.token; state.teacher=data.teacher;
    sessionStorage.setItem('lqTeacherSession',JSON.stringify({token:state.token,teacher:state.teacher}));
    await loadDashboard(); enterDashboard();
  }catch(err){showToast(err.message||'ไม่สามารถเข้าสู่ระบบได้');}
  finally{btn.disabled=false;btn.textContent='เข้าสู่ระบบครู';}
}

function enterDashboard(){
  loginView.classList.add('hidden'); dashboard.classList.remove('hidden');
  $('teacherName').textContent=state.teacher?.name||'ครูผู้สอน';
}

function logoutTeacher(){
  sessionStorage.removeItem('lqTeacherSession');
  state.token='';state.teacher=null;state.students=[];
  dashboard.classList.add('hidden');loginView.classList.remove('hidden');
  form.reset();
}

async function loadDashboard(){
  if(!state.token)return;
  $('refreshButton').disabled=true;
  try{
    const data=await apiPost({action:'teacherDashboard',token:state.token});
    if(!data.ok){if(data.error==='UNAUTHORIZED')logoutTeacher();throw new Error(data.message||'โหลดข้อมูลไม่สำเร็จ');}
    state.students=data.students||[];state.missions=data.missions||[];state.summary=data.summary||{};
    renderSummary(data);renderMissions(data);renderStudents();
  }catch(err){showToast(err.message||'โหลดข้อมูลไม่สำเร็จ');}
  finally{$('refreshButton').disabled=false;}
}

function renderSummary(data){
  const s=data.summary||{};
  $('metricStudents').textContent=s.totalStudents??0;
  $('metricLoggedIn').textContent=s.loggedInStudents??0;
  $('metricStarted').textContent=s.startedStudents??0;
  $('metricCompleted').textContent=s.completedStudents??0;
  $('metricAverage').textContent=Number(s.averagePoints||0).toFixed(1).replace('.0','');
  const open=String(data.gameStatus||'OPEN').toUpperCase()==='OPEN';
  $('gameStatusDot').className=open?'open':'closed';
  $('gameStatusText').textContent=open?'เปิดให้นักเรียนใช้งาน':'ปิดระบบนักเรียน';
  $('lastUpdated').textContent=`อัปเดตล่าสุด ${formatDateTime(data.generatedAt)}`;
}

function renderMissions(data){
  const box=$('missionBars');box.innerHTML='';
  const total=Math.max(1,Number(data.summary?.totalStudents||0));
  (data.missionStats||[]).forEach((m,i)=>{
    const percent=Math.round((Number(m.completed||0)/total)*100);
    const row=document.createElement('div');row.className='mission-row';
    row.innerHTML=`<span class="mission-index">${String(i+1).padStart(2,'0')}</span><div class="mission-label"><strong>${esc(m.title)}</strong><small>${esc(m.topic||'')}</small></div><div class="bar-track"><span style="width:${percent}%"></span></div><div class="mission-count"><strong>${m.completed||0}</strong> ผ่าน · ${m.started||0} เริ่ม</div>`;
    box.appendChild(row);
  });
}

function renderStudents(){
  const q=$('studentSearch').value.trim().toLowerCase();
  const filter=$('statusFilter').value;
  const rows=state.students.filter(s=>{
    const match=!q||`${s.studentId} ${s.fullName}`.toLowerCase().includes(q);
    const status=studentStatus(s);
    const filterOk=filter==='all'||filter===status||(filter==='test'&&s.isTest);
    return match&&filterOk;
  });
  tbody.innerHTML='';
  rows.forEach(s=>{
    const status=studentStatus(s);const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(s.studentId)}</td><td><span class="student-name">${esc(s.fullName)}</span>${s.isTest?'<div class="subtle">บัญชีทดสอบ</div>':''}</td><td>${s.lastLogin?formatDateTime(s.lastLogin):'<span class="subtle">ยังไม่เคยเข้า</span>'}</td><td>${s.completedMissions||0}/5</td><td>${Number(s.totalEcoPoints||0)}</td><td>${esc(s.currentLevel||'Eco Explorer')}</td><td><span class="status-pill ${status}">${statusText(status)}</span></td><td><button class="view-btn" type="button">ดูรายละเอียด</button></td>`;
    tr.addEventListener('click',()=>openStudent(s.studentId));
    tr.querySelector('.view-btn').addEventListener('click',e=>{e.stopPropagation();openStudent(s.studentId);});
    tbody.appendChild(tr);
  });
  $('emptyStudents').classList.toggle('hidden',rows.length!==0);
}

function studentStatus(s){if(s.isTest)return'test';if(Number(s.completedMissions||0)>=5)return'completed';if(Number(s.startedMissions||0)>0)return'started';return'not-started';}
function statusText(s){return s==='completed'?'ผ่านครบ':s==='started'?'กำลังทำ':s==='test'?'ทดสอบ':'ยังไม่เริ่ม';}

async function openStudent(studentId){
  try{
    showToast('กำลังโหลดรายละเอียด...');
    const data=await apiPost({action:'teacherStudentDetail',token:state.token,studentId});
    if(!data.ok)throw new Error(data.message||'โหลดรายละเอียดไม่สำเร็จ');
    renderStudentDetail(data);detailDialog.showModal();
  }catch(err){showToast(err.message||'โหลดรายละเอียดไม่สำเร็จ');}
}

function renderStudentDetail(data){
  const s=data.student||{};const content=$('studentDetailContent');
  const progress=(data.progress||[]).map(p=>`<div class="progress-item"><span><strong>${esc(p.missionTitle||p.missionId)}</strong><br><small class="subtle">${esc(p.status||'')}</small></span><span>${Number(p.score||0)} คะแนน</span><span>${Number(p.attempts||0)} ครั้ง</span></div>`).join('')||'<p class="subtle">ยังไม่มีข้อมูลภารกิจ</p>';
  const reflections=(data.reflections||[]).map(r=>`<article class="reflection-card"><small>${esc(r.missionTitle||r.missionId)} · ${formatDateTime(r.timestamp)}</small><p>${esc(r.reflectionText||'—')}</p>${r.ecoCommitment?`<strong>Eco Commitment</strong><p>${esc(r.ecoCommitment)}</p>`:''}</article>`).join('')||'<p class="subtle">ยังไม่มี Reflection</p>';
  content.innerHTML=`<div class="detail-head"><h2>${esc(s.fullName||'')}</h2><p>รหัส ${esc(s.studentId||'')} · ${esc(s.className||'')}</p></div><div class="detail-metrics"><div><small>Eco Points</small><strong>${Number(s.totalEcoPoints||0)}</strong></div><div><small>ภารกิจผ่าน</small><strong>${data.completedMissions||0}/5</strong></div><div><small>คำตอบที่บันทึก</small><strong>${data.responseCount||0}</strong></div></div><section class="detail-section"><h3>ความก้าวหน้าแต่ละ Mission</h3><div class="progress-list">${progress}</div></section><section class="detail-section"><h3>Reflection และ Eco Commitment</h3>${reflections}</section>`;
}

async function apiPost(payload){
  const r=await fetch(API_URL,{method:'POST',redirect:'follow',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(`API HTTP ${r.status}`);return r.json();
}
function formatDateTime(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return v;return new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(d);}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function showToast(msg){const t=$('teacherToast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2800);}
