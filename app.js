const API_URL = 'https://script.google.com/macros/s/AKfycbzWimhfRTHSPucVbss7ZgyktRmrXv1Zs8CiW02-PUH6e7BLwmDmR_ytJI64oPVDUIXG/exec';

const LEVELS = [
  { min: 0, name: 'Eco Explorer', th: 'ผู้เริ่มสำรวจ' },
  { min: 100, name: 'Eco Learner', th: 'ผู้เรียนรู้บ้านส่วนรวม' },
  { min: 200, name: 'Eco Thinker', th: 'ผู้คิดเชื่อมโยง' },
  { min: 300, name: 'Eco Changemaker', th: 'ผู้เริ่มเปลี่ยนแปลง' },
  { min: 400, name: 'Guardian of Our Common Home', th: 'ผู้พิทักษ์บ้านส่วนรวม' }
];

const state = {
  student: null,
  sessionId: '',
  missions: [],
  badges: [],
  progress: [],
  currentMission: null,
  questionIndex: 0,
  answerLocked: false
};

const $ = (id) => document.getElementById(id);
const loginScreen = $('loginScreen');
const appShell = $('appShell');
const loginForm = $('loginForm');
const missionJourney = $('missionJourney');
const missionModal = $('missionModal');
const missionModalContent = $('missionModalContent');
const modalProgressBar = $('modalProgressBar');
const howToModal = $('howToModal');
const toast = $('toast');

injectRuntimeStyles();
prefillIdentity();

loginForm.addEventListener('submit', handleLogin);
$('missionClose').addEventListener('click', () => missionModal.close());
$('howToClose').addEventListener('click', () => howToModal.close());
$('howToPlayButton').addEventListener('click', () => howToModal.showModal());
$('continueButton').addEventListener('click', openNextMission);
$('profileButton').addEventListener('click', () => {
  if (!state.student) return;
  showToast(`${state.student.fullName} · ${state.student.currentLevel || 'Eco Explorer'}`);
});

async function handleLogin(event) {
  event.preventDefault();
  const studentId = $('studentId').value.trim();
  const fullName = $('studentName').value.trim();
  if (!studentId || !fullName) return showToast('กรุณากรอกรหัสนักเรียนและชื่อ–นามสกุล');

  setLoginBusy(true);
  try {
    const login = await apiPost({
      action: 'login',
      studentId,
      fullName,
      className: 'ม.6/5',
      device: navigator.userAgent
    });
    if (!login.ok) throw new Error(login.message || 'เข้าสู่ระบบไม่สำเร็จ');

    state.student = login.student;
    state.sessionId = login.sessionId || cryptoRandomId();
    state.progress = Array.isArray(login.progress) ? login.progress : [];
    localStorage.setItem('lqIdentity', JSON.stringify({ studentId, fullName }));

    await loadBootstrap(studentId);
    enterApp();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'ไม่สามารถเชื่อมต่อระบบได้');
  } finally {
    setLoginBusy(false);
  }
}

async function loadBootstrap(studentId) {
  const data = await apiGet('bootstrap', { studentId });
  if (!data.ok) throw new Error(data.message || 'โหลดข้อมูลเกมไม่สำเร็จ');
  if (String(data.gameStatus || 'OPEN').toUpperCase() !== 'OPEN') {
    throw new Error('ขณะนี้ครูผู้สอนปิดระบบเกมชั่วคราว');
  }
  state.missions = Array.isArray(data.missions) ? data.missions : [];
  state.badges = Array.isArray(data.badges) ? data.badges : [];
  state.progress = Array.isArray(data.progress) ? data.progress : state.progress;
  if (data.student) state.student = data.student;
}

function enterApp() {
  loginScreen.classList.add('is-hidden');
  appShell.classList.remove('is-hidden');
  syncHeader();
  renderJourney();
  syncStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncHeader() {
  const name = state.student?.fullName || 'นักเรียน';
  const points = Number(state.student?.totalEcoPoints || 0);
  const level = getLevel(points, state.student?.currentLevel);
  $('profileName').textContent = name;
  $('profileLevel').textContent = level.name;
  $('avatarInitial').textContent = name.trim().charAt(0) || 'L';
  $('heroLevel').textContent = level.name;
  $('heroLevelThai').textContent = level.th;
}

function syncStats() {
  const completed = state.progress.filter(p => p.status === 'Completed');
  const points = Number(state.student?.totalEcoPoints || completed.reduce((sum, p) => sum + Number(p.score || 0), 0));
  const badgeCount = new Set(completed.map(p => p.badgeId).filter(Boolean)).size;
  const percent = state.missions.length ? Math.round((completed.length / state.missions.length) * 100) : 0;

  $('ecoPoints').textContent = points;
  $('completedCount').textContent = `${completed.length}/${state.missions.length || 5}`;
  $('badgeCount').textContent = badgeCount;
  $('progressPercent').textContent = `${percent}%`;
  $('progressRing').style.setProperty('--progress', String(percent));

  const next = LEVELS.find(l => l.min > points);
  $('nextTarget').textContent = next ? Math.max(0, next.min - points) : 'MAX';

  const firstOpen = state.missions.find(m => missionStatus(m) === 'available');
  const allDone = state.missions.length > 0 && completed.length === state.missions.length;
  $('continueButton').innerHTML = allDone
    ? 'ผ่านครบทุกภารกิจ <span>✓</span>'
    : firstOpen
      ? `ไป Mission ${firstOpen.order} <span>→</span>`
      : 'เริ่มภารกิจแรก <span>→</span>';
}

function renderJourney() {
  missionJourney.innerHTML = '';
  state.missions.forEach(mission => {
    const status = missionStatus(mission);
    const progress = progressFor(mission.missionId);
    const card = document.createElement('article');
    card.className = `mission-card ${status}`;

    const actionLabel = status === 'completed'
      ? `${Number(progress?.score || 0)} / ${Number(mission.maxPoints || 100)}`
      : status === 'available' ? 'พร้อมเล่น' : 'ยังไม่ปลดล็อก';
    const buttonIcon = status === 'completed' ? '↻' : status === 'available' ? '→' : '⌒';

    card.innerHTML = `
      <div class="mission-number">${status === 'completed' ? '✓' : String(mission.order).padStart(2, '0')}</div>
      <div class="mission-copy">
        <h3>${escapeHtml(mission.title)}</h3>
        <p>${escapeHtml(mission.learningGoal || mission.topic)}</p>
        <div class="mission-meta">
          <span>${escapeHtml(mission.topic)}</span>
          <span>${escapeHtml(mission.laudatoSiRef || '')}</span>
          <span>${Number(mission.maxPoints || 100)} Eco Points</span>
        </div>
      </div>
      <div class="mission-action">
        <strong>${escapeHtml(actionLabel)}</strong>
        <button type="button" aria-label="เปิด ${escapeHtml(mission.title)}" ${status === 'locked' ? 'disabled' : ''}>${buttonIcon}</button>
      </div>`;

    if (status !== 'locked') {
      card.querySelector('button').addEventListener('click', () => openMission(mission.missionId));
    }
    missionJourney.appendChild(card);
  });
}

function missionStatus(mission) {
  const current = progressFor(mission.missionId);
  if (current?.status === 'Completed') return 'completed';
  if (!mission.requiredMission) return 'available';
  return progressFor(mission.requiredMission)?.status === 'Completed' ? 'available' : 'locked';
}

function progressFor(missionId) {
  return state.progress.find(p => p.missionId === missionId);
}

async function openNextMission() {
  const mission = state.missions.find(m => missionStatus(m) === 'available') || state.missions[0];
  if (!mission) return showToast('ยังไม่มีภารกิจในระบบ');
  await openMission(mission.missionId);
}

async function openMission(missionId) {
  try {
    showToast('กำลังโหลดภารกิจ...');
    await apiPost({ action: 'startMission', studentId: state.student.studentId, missionId });
    const data = await apiGet('mission', { studentId: state.student.studentId, missionId });
    if (!data.ok) throw new Error(data.message || 'เปิดภารกิจไม่สำเร็จ');
    state.currentMission = data;
    state.questionIndex = 0;
    state.answerLocked = false;
    renderMissionIntro();
    missionModal.showModal();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'ไม่สามารถเปิดภารกิจได้');
  }
}

function renderMissionIntro() {
  const payload = state.currentMission;
  const mission = payload.mission;
  setModalProgress(8);
  missionModalContent.innerHTML = `
    <div class="runtime-modal-content">
      <p class="section-label">MISSION ${String(mission.order).padStart(2, '0')}</p>
      <h2>${escapeHtml(mission.title)}</h2>
      <p class="runtime-topic">${escapeHtml(mission.topic)} · ${escapeHtml(mission.laudatoSiRef || '')}</p>
      <div class="runtime-goal"><strong>เป้าหมายการเรียนรู้</strong><p>${escapeHtml(mission.learningGoal || '')}</p></div>
      <div class="runtime-learning-cards">
        ${(payload.content || []).map(card => `
          <article>
            <small>LEARNING CARD ${Number(card.order || 0)}</small>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.body)}</p>
            ${card.laudatoSiRef ? `<span>${escapeHtml(card.laudatoSiRef)}</span>` : ''}
          </article>`).join('') || '<p>อ่านแนวคิดของภารกิจและเตรียมเข้าสู่สถานการณ์ท้าทาย</p>'}
      </div>
      <button class="btn btn-primary runtime-full" id="beginChallenge" type="button">เริ่ม Situation Challenge <span>→</span></button>
    </div>`;
  $('beginChallenge').addEventListener('click', () => {
    state.questionIndex = 0;
    renderQuestion();
  });
}

function renderQuestion() {
  const questions = state.currentMission.questions || [];
  if (!questions.length) return renderReflection();
  if (state.questionIndex >= questions.length) return renderReflection();

  const q = questions[state.questionIndex];
  state.answerLocked = false;
  const progress = 20 + Math.round((state.questionIndex / questions.length) * 55);
  setModalProgress(progress);
  missionModalContent.innerHTML = `
    <div class="runtime-modal-content">
      <div class="runtime-question-head">
        <p class="section-label">SITUATION CHALLENGE</p>
        <span>ข้อ ${state.questionIndex + 1} / ${questions.length}</span>
      </div>
      <h2 class="runtime-question">${escapeHtml(q.prompt)}</h2>
      <div class="runtime-options">
        ${q.options.map((opt, index) => `
          <button type="button" data-option="${indexToLetter(index)}">
            <span>${indexToLetter(index)}</span><strong>${escapeHtml(opt)}</strong>
          </button>`).join('')}
      </div>
      <div id="answerFeedback" class="runtime-feedback is-hidden"></div>
    </div>`;

  missionModalContent.querySelectorAll('.runtime-options button').forEach(button => {
    button.addEventListener('click', () => submitAnswer(q, button));
  });
}

async function submitAnswer(question, selectedButton) {
  if (state.answerLocked) return;
  state.answerLocked = true;
  const buttons = [...missionModalContent.querySelectorAll('.runtime-options button')];
  buttons.forEach(b => b.disabled = true);
  selectedButton.classList.add('selected');

  try {
    const result = await apiPost({
      action: 'submitAnswer',
      studentId: state.student.studentId,
      missionId: state.currentMission.mission.missionId,
      questionId: question.questionId,
      selectedOption: selectedButton.dataset.option,
      sessionId: state.sessionId,
      device: navigator.userAgent
    });
    if (!result.ok) throw new Error(result.message || 'บันทึกคำตอบไม่สำเร็จ');

    selectedButton.classList.add(result.isCorrect ? 'answer-correct' : 'answer-wrong');
    const feedback = $('answerFeedback');
    feedback.classList.remove('is-hidden');
    feedback.innerHTML = `
      <strong>${result.isCorrect ? '✓ คำตอบนี้เหมาะสม' : 'ลองพิจารณาอีกครั้ง'}</strong>
      <p>${escapeHtml(result.feedback || '')}</p>
      <small>ได้รับ ${Number(result.pointsEarned || 0)} คะแนนจากข้อนี้</small>
      <button class="btn btn-primary runtime-full" id="nextQuestion" type="button">
        ${state.questionIndex + 1 < (state.currentMission.questions || []).length ? 'ข้อต่อไป' : 'ไปสู่การสะท้อนคิด'} <span>→</span>
      </button>`;
    $('nextQuestion').addEventListener('click', () => {
      state.questionIndex += 1;
      renderQuestion();
    });
  } catch (error) {
    state.answerLocked = false;
    buttons.forEach(b => b.disabled = false);
    showToast(error.message || 'ส่งคำตอบไม่สำเร็จ');
  }
}

function renderReflection() {
  const mission = state.currentMission.mission;
  setModalProgress(82);
  const commitmentRequired = ['M04', 'M05'].includes(mission.missionId);
  missionModalContent.innerHTML = `
    <div class="runtime-modal-content">
      <p class="section-label">REFLECTION</p>
      <h2>จากภารกิจนี้ คุณมองเห็นอะไร?</h2>
      <p class="runtime-topic">การสะท้อนคิดช่วยเชื่อมสิ่งที่เรียนรู้กับการตัดสินใจและชีวิตประจำวัน</p>
      <form id="reflectionForm" class="runtime-reflection-form">
        <label><span>สิ่งสำคัญที่ฉันได้เรียนรู้</span>
          <textarea id="reflectionText" rows="4" maxlength="3000" placeholder="เขียนสั้น ๆ จากสิ่งที่คุณคิดหรือค้นพบ..." required></textarea>
        </label>
        <label><span>Eco Commitment ${commitmentRequired ? '' : '(ไม่บังคับ)'}</span>
          <textarea id="ecoCommitment" rows="3" maxlength="1200" placeholder="หนึ่งสิ่งที่ฉันจะลองเปลี่ยนหรือทำต่อจากนี้..." ${commitmentRequired ? 'required' : ''}></textarea>
        </label>
        <button class="btn btn-primary runtime-full" type="submit">บันทึกและสรุปภารกิจ <span>→</span></button>
      </form>
    </div>`;
  $('reflectionForm').addEventListener('submit', saveReflectionAndComplete);
}

async function saveReflectionAndComplete(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const reflectionText = $('reflectionText').value.trim();
  const ecoCommitment = $('ecoCommitment').value.trim();
  const missionId = state.currentMission.mission.missionId;
  button.disabled = true;
  button.textContent = 'กำลังบันทึก...';

  try {
    const saved = await apiPost({
      action: 'saveReflection',
      studentId: state.student.studentId,
      missionId,
      promptType: 'MISSION_REFLECTION',
      reflectionText,
      ecoCommitment
    });
    if (!saved.ok) throw new Error(saved.message || 'บันทึก Reflection ไม่สำเร็จ');

    const result = await apiPost({ action: 'completeMission', studentId: state.student.studentId, missionId });
    if (!result.ok) throw new Error(result.message || 'สรุปภารกิจไม่สำเร็จ');

    state.progress = Array.isArray(result.progress) ? result.progress : state.progress;
    if (result.student) state.student = result.student;
    await loadBootstrap(state.student.studentId);
    syncHeader();
    renderJourney();
    syncStats();
    renderMissionResult(result);
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.innerHTML = 'บันทึกและสรุปภารกิจ <span>→</span>';
    showToast(error.message || 'บันทึกข้อมูลไม่สำเร็จ');
  }
}

function renderMissionResult(result) {
  const mission = state.currentMission.mission;
  const badge = state.badges.find(b => b.badgeId === result.badgeId);
  setModalProgress(100);
  missionModalContent.innerHTML = `
    <div class="runtime-modal-content runtime-result">
      <div class="runtime-result-icon">${result.completed ? '✓' : '↻'}</div>
      <p class="section-label">MISSION RESULT</p>
      <h2>${result.completed ? 'ภารกิจสำเร็จ!' : 'ยังไม่ผ่านภารกิจ'}</h2>
      <p>${escapeHtml(mission.title)}</p>
      <div class="runtime-score"><strong>${Number(result.score || 0)}</strong><span>/ 100 Eco Points</span></div>
      ${result.completed && badge ? `<div class="runtime-badge"><small>BADGE UNLOCKED</small><strong>${escapeHtml(badge.nameTh)}</strong><span>${escapeHtml(badge.nameEn)}</span></div>` : ''}
      <p class="runtime-result-note">${result.completed
        ? 'ระบบบันทึกความก้าวหน้าของคุณลงฐานข้อมูลแล้ว และภารกิจถัดไปได้รับการปลดล็อก'
        : `เกณฑ์ผ่านคือ ${Number(result.passScore || 60)} คะแนน คุณสามารถกลับไปลอง Challenge อีกครั้งได้`}</p>
      <button class="btn btn-primary runtime-full" id="resultAction" type="button">${result.completed ? 'กลับสู่ Mission Journey' : 'ลอง Challenge อีกครั้ง'}</button>
    </div>`;
  $('resultAction').addEventListener('click', () => {
    if (result.completed) {
      missionModal.close();
      document.querySelector('#missions')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      state.questionIndex = 0;
      renderQuestion();
    }
  });
}

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`API ตอบกลับ HTTP ${response.status}`);
  return response.json();
}

async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    cache: 'no-store',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`API ตอบกลับ HTTP ${response.status}`);
  return response.json();
}

function getLevel(points, serverName) {
  let current = LEVELS[0];
  LEVELS.forEach(level => { if (points >= level.min) current = level; });
  if (serverName) {
    const matched = LEVELS.find(l => l.name === serverName);
    if (matched) return matched;
  }
  return current;
}

function setModalProgress(value) {
  modalProgressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function setLoginBusy(busy) {
  const button = loginForm.querySelector('button[type="submit"]');
  [...loginForm.elements].forEach(el => el.disabled = busy);
  if (button) button.innerHTML = busy ? 'กำลังเชื่อมต่อระบบ...' : 'เข้าสู่บ้านส่วนรวม <span>→</span>';
}

function prefillIdentity() {
  try {
    const saved = JSON.parse(localStorage.getItem('lqIdentity') || 'null');
    if (saved?.studentId) $('studentId').value = saved.studentId;
    if (saved?.fullName) $('studentName').value = saved.fullName;
  } catch (_) {}
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function indexToLetter(index) {
  return ['A', 'B', 'C', 'D'][index] || '';
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function injectRuntimeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .runtime-modal-content{padding:48px 44px 42px}.runtime-modal-content h2{font:700 clamp(26px,4vw,38px) "Kanit";color:var(--green-950);margin:0 0 8px;line-height:1.25}.runtime-topic{color:var(--muted);line-height:1.7;margin:0 0 24px}.runtime-goal{padding:16px 18px;border-radius:16px;background:var(--mint-50);border:1px solid var(--line);margin:0 0 18px}.runtime-goal strong{font-family:"Kanit";color:var(--green-900)}.runtime-goal p{margin:5px 0 0;color:var(--muted);line-height:1.7}.runtime-learning-cards{display:grid;gap:12px;margin:18px 0 26px}.runtime-learning-cards article{padding:18px 20px;border:1px solid var(--line);border-radius:18px;background:#fff}.runtime-learning-cards small{font:700 10px "Kanit";letter-spacing:.12em;color:var(--green-600)}.runtime-learning-cards h3{font:600 18px "Kanit";color:var(--green-950);margin:8px 0 6px}.runtime-learning-cards p{margin:0;color:var(--muted);line-height:1.8}.runtime-learning-cards article>span{display:inline-block;margin-top:10px;font-size:10px;color:var(--green-700);background:var(--mint-100);padding:4px 8px;border-radius:999px}.runtime-full{width:100%;margin-top:14px}.runtime-question-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.runtime-question-head>span{font-size:11px;color:var(--muted)}.runtime-question{margin-top:16px!important}.runtime-options{display:grid;gap:11px;margin-top:24px}.runtime-options button{width:100%;text-align:left;display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:center;padding:13px 15px;border:1px solid var(--line);background:#fff;border-radius:15px;color:var(--ink);transition:.18s}.runtime-options button:hover:not(:disabled){border-color:#8ac5aa;background:var(--mint-50);transform:translateY(-1px)}.runtime-options button>span{width:34px;height:34px;border-radius:11px;background:#eef7f3;display:grid;place-items:center;color:var(--green-800);font:700 13px "Kanit"}.runtime-options button>strong{font-weight:600;line-height:1.55}.runtime-options button.selected{border-color:#86bca5}.runtime-options button.answer-correct{background:#edf9f2;border-color:#55aa7f}.runtime-options button.answer-wrong{background:#fff5f1;border-color:#db9b83}.runtime-feedback{margin-top:18px;padding:17px 18px;border-radius:17px;background:#f6faf8;border:1px solid var(--line)}.runtime-feedback>strong{font:600 16px "Kanit";color:var(--green-900)}.runtime-feedback p{color:var(--muted);line-height:1.7;margin:6px 0}.runtime-feedback small{color:#8b9893}.runtime-reflection-form{display:grid;gap:16px;margin-top:22px}.runtime-reflection-form label>span{display:block;font-weight:700;margin-bottom:7px}.runtime-reflection-form textarea{width:100%;resize:vertical;border:1px solid var(--line);border-radius:15px;padding:13px 14px;font:inherit;color:var(--ink);background:#fbfefc;outline:none}.runtime-reflection-form textarea:focus{border-color:#59a988;box-shadow:0 0 0 4px rgba(34,160,107,.1)}.runtime-result{text-align:center}.runtime-result-icon{width:76px;height:76px;border-radius:24px;display:grid;place-items:center;margin:0 auto 18px;background:var(--green-700);color:#fff;font:700 34px "Kanit";box-shadow:0 15px 32px rgba(11,116,84,.2)}.runtime-score{display:flex;align-items:baseline;justify-content:center;gap:8px;margin:18px 0}.runtime-score strong{font:700 56px "Kanit";color:var(--green-800)}.runtime-score span{color:var(--muted)}.runtime-badge{max-width:360px;margin:0 auto 18px;padding:16px;border-radius:18px;background:#fff8e7;border:1px solid #ead49b}.runtime-badge small,.runtime-badge strong,.runtime-badge span{display:block}.runtime-badge small{font:700 9px "Kanit";letter-spacing:.14em;color:#a47b1d}.runtime-badge strong{font:600 18px "Kanit";color:#775815;margin:4px 0}.runtime-badge span{font-size:11px;color:#9c7a2f}.runtime-result-note{color:var(--muted);line-height:1.7;max-width:520px;margin:0 auto 18px}@media(max-width:640px){.runtime-modal-content{padding:42px 20px 26px}.runtime-modal-content h2{font-size:27px}.runtime-options button{grid-template-columns:34px 1fr;padding:11px}.runtime-learning-cards article{padding:15px}}
  `;
  document.head.appendChild(style);
}
