const APP = Object.freeze({
  VERSION: '2.0.0',
  SPREADSHEET_ID: '1TiopIT7NAMZ0wvXs20f7tCCGp74U_bH4Bn_peJjNadM',
  TIMEZONE: 'Asia/Bangkok',
  PASS_SCORE: 60,
  STUDENT_SESSION_SECONDS: 21600,
  SHEETS: {
    STUDENTS: 'Students',
    MISSIONS: 'Missions',
    CONTENT: 'LearningContent',
    QUESTIONS: 'QuestionBank',
    PROGRESS: 'Progress',
    RESPONSES: 'Responses',
    REFLECTIONS: 'Reflections',
    BADGES: 'Badges',
    SETTINGS: 'Settings',
    ASSESSMENT_ITEMS: 'AssessmentItems',
    RESEARCH_RESPONSES: 'ResearchResponses',
    RESEARCH_SCORES: 'ResearchScores',
    ACTIVITY_LOG: 'ActivityLog'
  }
});

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'health').trim();
    if (action === 'health') {
      return json_({ ok: true, service: 'LAUDATO QUEST API', version: APP.VERSION, time: nowIso_() });
    }
    return json_({ ok: false, error: 'POST_REQUIRED', message: 'กรุณาเรียก API ผ่าน POST' });
  } catch (err) {
    return errorJson_(err);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').trim();
    switch (action) {
      case 'login': return json_(login_(body));
      case 'bootstrap': return json_(bootstrap_(body));
      case 'mission': return json_(getMission_(body));
      case 'progress': return json_(getStudentProgress_(body));
      case 'startMission': return json_(startMission_(body));
      case 'submitAnswer': return json_(submitAnswer_(body));
      case 'saveReflection': return json_(saveReflection_(body));
      case 'completeMission': return json_(completeMission_(body));
      case 'startAssessment': return json_(startAssessment_(body));
      case 'submitAssessment': return json_(submitAssessment_(body));
      case 'certificate': return json_(certificate_(body));
      case 'teacherLogin': return json_(teacherLogin_(body));
      case 'teacherLogout': return json_(teacherLogout_(body));
      case 'teacherDashboard': return json_(teacherDashboard_(body));
      case 'teacherStudentDetail': return json_(teacherStudentDetail_(body));
      case 'teacherControl': return json_(teacherControl_(body));
      case 'teacherExportReport': return json_(teacherExportReport_(body));
      case 'teacherCreateBackup': return json_(teacherCreateBackup_(body));
      default: return json_({ ok: false, error: 'UNKNOWN_ACTION', message: 'ไม่พบ action ที่ร้องขอ' });
    }
  } catch (err) {
    return errorJson_(err);
  }
}

function login_(body) {
  const studentId = cleanId_(body.studentId);
  const fullName = cleanText_(body.fullName, 160);
  const device = cleanText_(body.device || '', 220);
  if (!studentId || !fullName) return fail_('MISSING_LOGIN_DATA', 'กรุณากรอกรหัสนักเรียนและชื่อ–นามสกุล');
  const sheet = sheet_(APP.SHEETS.STUDENTS);
  const values = sheet.getDataRange().getValues();
  const idx = headerIndex_(values[0]);
  let rowNumber = -1;
  let row = null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idx.StudentID] || '').trim() === studentId) {
      rowNumber = r + 1; row = values[r]; break;
    }
  }
  if (rowNumber < 0) return fail_('STUDENT_NOT_FOUND', 'ไม่พบรหัสนักเรียนในรายชื่อ กรุณาติดต่อครูผู้สอน');
  if (String(row[idx.Status] || 'Active').toLowerCase() === 'inactive') return fail_('INACTIVE_STUDENT', 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อครูผู้สอน');
  const existingName = String(row[idx.FullName] || '').trim();
  if (existingName && normalizeName_(existingName) !== normalizeName_(fullName)) return fail_('NAME_MISMATCH', 'ชื่อ–นามสกุลไม่ตรงกับรหัสนักเรียน');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sheet.getRange(rowNumber, idx.LastLogin + 1).setValue(new Date()); } finally { lock.releaseLock(); }
  const settings = settingsObject_();
  const seconds = Math.max(3600, Number(settings.STUDENT_SESSION_SECONDS || APP.STUDENT_SESSION_SECONDS));
  const sessionId = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('student:' + sessionId, JSON.stringify({ studentId, createdAt: nowIso_() }), seconds);
  logActivity_('STUDENT', studentId, 'LOGIN', studentId, '', sessionId, device);
  return { ok: true, sessionId, token: sessionId, expiresIn: seconds, student: getStudentSafe_(studentId), progress: getStudentProgressData_(studentId), researchStatus: getResearchStatus_(studentId) };
}

function requireStudent_(token, claimedStudentId) {
  token = cleanText_(token || '', 180);
  if (!token) return fail_('UNAUTHORIZED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  const cached = CacheService.getScriptCache().get('student:' + token);
  if (!cached) return fail_('UNAUTHORIZED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  try {
    const session = JSON.parse(cached);
    const studentId = cleanId_(session.studentId);
    if (!studentId) return fail_('UNAUTHORIZED', 'Session ไม่ถูกต้อง');
    if (claimedStudentId && cleanId_(claimedStudentId) !== studentId) return fail_('FORBIDDEN', 'ไม่สามารถเข้าถึงข้อมูลของนักเรียนคนอื่นได้');
    return { ok: true, studentId };
  } catch (_) { return fail_('UNAUTHORIZED', 'Session ไม่ถูกต้อง'); }
}

function bootstrap_(body) {
  const auth = requireStudent_(body.sessionId || body.token, body.studentId);
  if (!auth.ok) return auth;
  const studentId = auth.studentId;
  const settings = settingsObject_();
  const researchStatus = getResearchStatus_(studentId);
  const progress = getStudentProgressData_(studentId);
  const activeMission = String(settings.ACTIVE_MISSION || 'ALL').toUpperCase();
  const missions = readObjects_(APP.SHEETS.MISSIONS).filter(r => isTrue_(r.IsActive)).sort((a,b)=>Number(a.Order||0)-Number(b.Order||0)).map(r => {
    const id = String(r.MissionID || ''); const access = missionAccess_(studentId, r, settings, researchStatus, progress);
    return { missionId:id, order:Number(r.Order||0), title:String(r.TitleTH||''), topic:String(r.LaudatoTopic||''), laudatoSiRef:String(r.LaudatoSiRef||''), learningGoal:String(r.LearningGoal||''), maxPoints:Number(r.MaxPoints||100), badgeId:String(r.BadgeID||''), requiredMission:String(r.RequiredMission||''), teacherOpen:isTrue_(r.TeacherOpen), acceptAnswers:isTrue_(r.AcceptAnswers), access:access.ok, accessReason:access.message||'' };
  });
  const badges = readObjects_(APP.SHEETS.BADGES).filter(r=>isTrue_(r.IsActive)).map(r=>({badgeId:String(r.BadgeID||''),missionId:String(r.MissionID||''),nameTh:String(r.BadgeNameTH||''),nameEn:String(r.BadgeNameEN||''),description:String(r.Description||''),iconKey:String(r.IconKey||'')}));
  return {
    ok:true, version:APP.VERSION, gameStatus:String(settings.GAME_STATUS||'OPEN').toUpperCase(), answerSubmissionEnabled:isTrue_(settings.ANSWER_SUBMISSION_ENABLED), activeMission,
    pretestEnabled:isTrue_(settings.PRETEST_ENABLED), posttestEnabled:isTrue_(settings.POSTTEST_ENABLED), pretestRequired:isTrue_(settings.PRETEST_REQUIRED), posttestRequired:isTrue_(settings.POSTTEST_REQUIRED), certificateEnabled:isTrue_(settings.CERTIFICATE_ENABLED),
    passScore:Number(settings.PASS_SCORE||APP.PASS_SCORE), title:String(settings.GAME_TITLE||'LAUDATO QUEST'), student:getStudentSafe_(studentId), progress,
    researchStatus:{pretestCompleted:researchStatus.pretestCompleted,pretestCompletedAt:researchStatus.pretestCompletedAt,posttestCompleted:researchStatus.posttestCompleted,posttestCompletedAt:researchStatus.posttestCompletedAt,pretest:{completed:researchStatus.pretestCompleted,completedAt:researchStatus.pretestCompletedAt},posttest:{completed:researchStatus.posttestCompleted,completedAt:researchStatus.posttestCompletedAt}},
    controls:{gameStatus:String(settings.GAME_STATUS||'OPEN').toUpperCase(),answerSubmissionEnabled:isTrue_(settings.ANSWER_SUBMISSION_ENABLED),activeMission,pretestEnabled:isTrue_(settings.PRETEST_ENABLED),posttestEnabled:isTrue_(settings.POSTTEST_ENABLED),pretestRequired:isTrue_(settings.PRETEST_REQUIRED),posttestRequired:isTrue_(settings.POSTTEST_REQUIRED),certificateEnabled:isTrue_(settings.CERTIFICATE_ENABLED)},
    missions,badges,workflowStage:workflowStage_(settings,researchStatus,progress,missions.length)
  };
}

function workflowStage_(settings,researchStatus,progress,missionCount){
  if(isTrue_(settings.PRETEST_ENABLED)&&isTrue_(settings.PRETEST_REQUIRED)&&!researchStatus.pretestCompleted)return 'PRETEST';
  const completed=new Set(progress.filter(p=>p.status==='Completed').map(p=>p.missionId)).size;
  if(completed<missionCount)return 'MISSIONS';
  if(isTrue_(settings.POSTTEST_ENABLED)&&!researchStatus.posttestCompleted)return 'POSTTEST';
  return 'COMPLETE';
}

function getMission_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;
  const studentId=auth.studentId,missionId=cleanText_(body.missionId,20);if(!missionId)return fail_('MISSING_DATA','ไม่พบรหัสภารกิจ');
  const settings=settingsObject_(),researchStatus=getResearchStatus_(studentId),progress=getStudentProgressData_(studentId);
  const mission=readObjects_(APP.SHEETS.MISSIONS).find(r=>String(r.MissionID||'')===missionId&&isTrue_(r.IsActive));if(!mission)return fail_('MISSION_NOT_FOUND','ไม่พบภารกิจ');
  const access=missionAccess_(studentId,mission,settings,researchStatus,progress);if(!access.ok)return access;
  const content=readObjects_(APP.SHEETS.CONTENT).filter(r=>String(r.MissionID||'')===missionId&&isTrue_(r.IsActive)).sort((a,b)=>Number(a.CardOrder||0)-Number(b.CardOrder||0)).map(r=>({contentId:String(r.ContentID||''),order:Number(r.CardOrder||0),title:String(r.Title||''),body:String(r.Body||''),laudatoSiRef:String(r.LaudatoSiRef||''),mediaType:String(r.MediaType||'TEXT_CARD')}));
  const questions=readObjects_(APP.SHEETS.QUESTIONS).filter(r=>String(r.MissionID||'')===missionId).map(r=>({questionId:String(r.QuestionID||''),type:String(r.QuestionType||'MCQ'),prompt:String(r.Prompt||''),options:[r.OptionA,r.OptionB,r.OptionC,r.OptionD].map(v=>String(v||'')),points:Number(r.Points||0)}));
  return {ok:true,mission:{missionId,order:Number(mission.Order||0),title:String(mission.TitleTH||''),topic:String(mission.LaudatoTopic||''),laudatoSiRef:String(mission.LaudatoSiRef||''),learningGoal:String(mission.LearningGoal||''),maxPoints:Number(mission.MaxPoints||100),badgeId:String(mission.BadgeID||''),acceptAnswers:isTrue_(mission.AcceptAnswers)},content,questions};
}

function missionAccess_(studentId,mission,settings,researchStatus,progress){
  if(String(settings.GAME_STATUS||'OPEN').toUpperCase()!=='OPEN')return fail_('GAME_CLOSED','ขณะนี้ครูผู้สอนปิดระบบนักเรียน');
  if(isTrue_(settings.PRETEST_ENABLED)&&isTrue_(settings.PRETEST_REQUIRED)&&!researchStatus.pretestCompleted)return fail_('PRETEST_REQUIRED','กรุณาทำแบบวัดก่อนเรียนให้เสร็จก่อนเริ่มภารกิจ');
  if(!isTrue_(mission.TeacherOpen))return fail_('MISSION_TEACHER_LOCKED','ครูผู้สอนยังไม่เปิดภารกิจนี้');
  const activeMission=String(settings.ACTIVE_MISSION||'ALL').toUpperCase();if(activeMission!=='ALL'&&activeMission!==String(mission.MissionID||'').toUpperCase())return fail_('MISSION_NOT_ACTIVE','ภารกิจนี้ยังไม่ใช่ภารกิจที่กำลังใช้งาน');
  const required=String(mission.RequiredMission||'').trim();if(required){const prev=progress.find(p=>p.missionId===required);if(!prev||prev.status!=='Completed')return fail_('MISSION_LOCKED','กรุณาผ่านภารกิจก่อนหน้าเพื่อปลดล็อกภารกิจนี้');}
  return {ok:true};
}

function startMission_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;
  const missionId=cleanText_(body.missionId,20),mission=readObjects_(APP.SHEETS.MISSIONS).find(r=>String(r.MissionID||'')===missionId&&isTrue_(r.IsActive));if(!mission)return fail_('MISSION_NOT_FOUND','ไม่พบภารกิจ');
  const access=missionAccess_(auth.studentId,mission,settingsObject_(),getResearchStatus_(auth.studentId),getStudentProgressData_(auth.studentId));if(!access.ok)return access;
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{upsertProgress_({studentId:auth.studentId,missionId,startOnly:true});}finally{lock.releaseLock();}
  logActivity_('STUDENT',auth.studentId,'MISSION_START',missionId,'',body.sessionId||body.token,body.device);return {ok:true};
}

function submitAnswer_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;
  const studentId=auth.studentId,missionId=cleanText_(body.missionId,20),questionId=cleanText_(body.questionId,30),selectedOption=String(body.selectedOption||'').trim().toUpperCase(),submissionKey=cleanText_(body.submissionKey||'',120),device=cleanText_(body.device||'',220);
  if(!missionId||!questionId||!submissionKey||!['A','B','C','D'].includes(selectedOption))return fail_('MISSING_ANSWER_DATA','ข้อมูลคำตอบไม่ครบถ้วน');
  const settings=settingsObject_();if(!isTrue_(settings.ANSWER_SUBMISSION_ENABLED))return fail_('ANSWER_SUBMISSION_CLOSED','ครูผู้สอนปิดการส่งคำตอบชั่วคราว');
  const mission=readObjects_(APP.SHEETS.MISSIONS).find(r=>String(r.MissionID||'')===missionId&&isTrue_(r.IsActive));if(!mission)return fail_('MISSION_NOT_FOUND','ไม่พบภารกิจ');if(!isTrue_(mission.AcceptAnswers))return fail_('MISSION_ANSWER_CLOSED','ครูผู้สอนปิดการส่งคำตอบของภารกิจนี้');
  const access=missionAccess_(studentId,mission,settings,getResearchStatus_(studentId),getStudentProgressData_(studentId));if(!access.ok)return access;
  const previous=readObjects_(APP.SHEETS.RESPONSES).find(r=>String(r.SubmissionKey||'')===submissionKey&&String(r.StudentID||'')===studentId);if(previous)return {ok:true,duplicate:true,isCorrect:isTrue_(previous.IsCorrect),pointsEarned:Number(previous.PointsEarned||0),feedback:String(previous.FeedbackShown||''),attemptNo:Number(previous.AttemptNo||1)};
  const q=readObjects_(APP.SHEETS.QUESTIONS).find(r=>String(r.QuestionID||'')===questionId&&String(r.MissionID||'')===missionId);if(!q)return fail_('QUESTION_NOT_FOUND','ไม่พบคำถาม');
  const isCorrect=String(q.CorrectOption||'').trim().toUpperCase()===selectedOption,points=isCorrect?Number(q.Points||0):0,feedback=String(isCorrect?q.FeedbackCorrect:q.FeedbackIncorrect||''),attemptNo=nextQuestionAttempt_(studentId,missionId,questionId);
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{appendByHeader_(APP.SHEETS.RESPONSES,{ResponseID:Utilities.getUuid(),Timestamp:new Date(),StudentID:studentId,MissionID:missionId,QuestionID:questionId,SelectedOption:selectedOption,IsCorrect:isCorrect,PointsEarned:points,AttemptNo:attemptNo,FeedbackShown:feedback,SessionID:body.sessionId||body.token,Device:device,SubmissionKey:submissionKey});}finally{lock.releaseLock();}
  logActivity_('STUDENT',studentId,'ANSWER_SUBMIT',missionId+':'+questionId,JSON.stringify({isCorrect,attemptNo}),body.sessionId||body.token,device);return {ok:true,isCorrect,pointsEarned:points,feedback,attemptNo};
}

function saveReflection_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;const studentId=auth.studentId,missionId=cleanText_(body.missionId,20),reflectionText=cleanText_(body.reflectionText||'',3000),ecoCommitment=cleanText_(body.ecoCommitment||'',1200),submissionKey=cleanText_(body.submissionKey||'',120);
  if(!missionId||(!reflectionText&&!ecoCommitment)||!submissionKey)return fail_('MISSING_REFLECTION_DATA','กรุณากรอก Reflection ก่อนบันทึก');
  const existing=readObjects_(APP.SHEETS.REFLECTIONS).find(r=>String(r.SubmissionKey||'')===submissionKey&&String(r.StudentID||'')===studentId);if(existing)return {ok:true,duplicate:true};
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{appendByHeader_(APP.SHEETS.REFLECTIONS,{ReflectionID:Utilities.getUuid(),Timestamp:new Date(),StudentID:studentId,MissionID:missionId,PromptType:cleanText_(body.promptType||'MISSION_REFLECTION',80),ReflectionText:reflectionText,EcoCommitment:ecoCommitment,TeacherNote:'',Reviewed:false,SubmissionKey:submissionKey});}finally{lock.releaseLock();}
  logActivity_('STUDENT',studentId,'REFLECTION_SAVE',missionId,'',body.sessionId||body.token,body.device);return {ok:true};
}

function completeMission_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;const studentId=auth.studentId,missionId=cleanText_(body.missionId,20),mission=readObjects_(APP.SHEETS.MISSIONS).find(r=>String(r.MissionID||'')===missionId&&isTrue_(r.IsActive));if(!mission)return fail_('MISSION_NOT_FOUND','ไม่พบภารกิจ');
  const existingProgress=getStudentProgressData_(studentId).find(p=>p.missionId===missionId);if(existingProgress&&existingProgress.status==='Completed')return {ok:true,duplicate:true,completed:true,score:existingProgress.score,passScore:Number(settingsObject_().PASS_SCORE||APP.PASS_SCORE),badgeId:existingProgress.badgeId,progress:getStudentProgressData_(studentId),student:getStudentSafe_(studentId),researchStatus:getResearchStatus_(studentId)};
  const access=missionAccess_(studentId,mission,settingsObject_(),getResearchStatus_(studentId),getStudentProgressData_(studentId));if(!access.ok)return access;
  const questions=readObjects_(APP.SHEETS.QUESTIONS).filter(r=>String(r.MissionID||'')===missionId),maxRaw=questions.reduce((sum,q)=>sum+Number(q.Points||0),0),responses=readObjects_(APP.SHEETS.RESPONSES).filter(r=>String(r.StudentID||'')===studentId&&String(r.MissionID||'')===missionId),bestByQuestion={};
  responses.forEach(r=>{const qid=String(r.QuestionID||'');bestByQuestion[qid]=Math.max(Number(bestByQuestion[qid]||0),Number(r.PointsEarned||0));});const earnedRaw=Object.values(bestByQuestion).reduce((a,b)=>a+Number(b||0),0),score100=maxRaw>0?Math.round((earnedRaw/maxRaw)*Number(mission.MaxPoints||100)):0,passScore=Number(settingsObject_().PASS_SCORE||APP.PASS_SCORE),completed=score100>=passScore,badgeId=completed?String(mission.BadgeID||''):'';
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{upsertProgress_({studentId,missionId,score:score100,completed,badgeId});updateStudentTotals_(studentId);}finally{lock.releaseLock();}
  logActivity_('STUDENT',studentId,'MISSION_COMPLETE',missionId,JSON.stringify({score:score100,completed}),body.sessionId||body.token,body.device);return {ok:true,completed,score:score100,passScore,badgeId,progress:getStudentProgressData_(studentId),student:getStudentSafe_(studentId),researchStatus:getResearchStatus_(studentId)};
}

function getStudentProgress_(body){const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;return {ok:true,student:getStudentSafe_(auth.studentId),progress:getStudentProgressData_(auth.studentId),researchStatus:getResearchStatus_(auth.studentId)};}

function startAssessment_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;const studentId=auth.studentId,phase=normalizePhase_(body.phase);if(!phase)return fail_('INVALID_PHASE','phase ต้องเป็น PRE หรือ POST');const settings=settingsObject_();
  if(String(settings.GAME_STATUS||'OPEN').toUpperCase()!=='OPEN')return fail_('GAME_CLOSED','ขณะนี้ครูผู้สอนปิดระบบนักเรียน');if(phase==='PRE'&&!isTrue_(settings.PRETEST_ENABLED))return fail_('ASSESSMENT_CLOSED','แบบวัดก่อนเรียนยังไม่เปิด');if(phase==='POST'&&!isTrue_(settings.POSTTEST_ENABLED))return fail_('ASSESSMENT_CLOSED','แบบวัดหลังเรียนยังไม่เปิด');
  const researchStatus=getResearchStatus_(studentId);if(phase==='PRE'&&researchStatus.pretestCompleted)return {ok:true,alreadyCompleted:true,phase};if(phase==='POST'){if(researchStatus.posttestCompleted)return {ok:true,alreadyCompleted:true,phase};if(isTrue_(settings.POSTTEST_REQUIRED)&&!allMissionsCompleted_(studentId))return fail_('MISSIONS_REQUIRED','กรุณาผ่านทั้ง 5 Mission ก่อนทำแบบวัดหลังเรียน');}
  const items=readObjects_(APP.SHEETS.ASSESSMENT_ITEMS).filter(r=>isTrue_(r.IsActive)).sort((a,b)=>Number(a.Order||0)-Number(b.Order||0));if(!items.length)return fail_('ASSESSMENT_NOT_READY','ยังไม่มีข้อคำถามใน AssessmentItems');
  const assessmentSessionId=Utilities.getUuid()+Utilities.getUuid(),payload={studentId,phase,startedAt:nowIso_(),version:String(settings.RESEARCH_ITEMS_VERSION||'1')};CacheService.getScriptCache().put('assessment:'+assessmentSessionId,JSON.stringify(payload),7200);logActivity_('STUDENT',studentId,'ASSESSMENT_START',phase,'',body.sessionId||body.token,body.device);
  return {ok:true,phase:phase==='PRE'?'PRETEST':'POSTTEST',assessmentSessionId,startedAt:payload.startedAt,title:phase==='PRE'?'แบบวัดก่อนเรียน':'แบบวัดหลังเรียน',itemCount:items.length,items:items.map(r=>({itemId:String(r.ItemID||''),order:Number(r.Order||0),domainNo:Number(r.DomainNo||0),type:String(r.ItemType||''),itemType:String(r.ItemType||''),prompt:String(r.Prompt||''),options:String(r.ItemType||'')==='MCQ'?[r.OptionA,r.OptionB,r.OptionC,r.OptionD].map(v=>String(v||'')):[]}))};
}

function submitAssessment_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;const studentId=auth.studentId,phase=normalizePhase_(body.phase),assessmentSessionId=cleanText_(body.assessmentSessionId||'',180),submissionKey=cleanText_(body.submissionKey||'',120),device=cleanText_(body.device||'',220);if(!phase||!assessmentSessionId||!submissionKey||!Array.isArray(body.answers))return fail_('MISSING_ASSESSMENT_DATA','ข้อมูลแบบวัดไม่ครบถ้วน');
  const existingScore=getCompletedResearchScore_(studentId,phase);if(existingScore)return {ok:true,duplicate:true,completed:true,phase};const cached=CacheService.getScriptCache().get('assessment:'+assessmentSessionId);if(!cached)return fail_('ASSESSMENT_SESSION_EXPIRED','แบบวัดหมดเวลา กรุณาเปิดใหม่อีกครั้ง');const aSession=JSON.parse(cached);if(aSession.studentId!==studentId||aSession.phase!==phase)return fail_('FORBIDDEN','Session แบบวัดไม่ตรงกับผู้ใช้งาน');
  const items=readObjects_(APP.SHEETS.ASSESSMENT_ITEMS).filter(r=>isTrue_(r.IsActive)).sort((a,b)=>Number(a.Order||0)-Number(b.Order||0)),answerMap={};body.answers.forEach(a=>{answerMap[String(a.itemId||'')]=a.answer;});if(items.some(i=>answerMap[String(i.ItemID||'')]===undefined||answerMap[String(i.ItemID||'')]===null||String(answerMap[String(i.ItemID||'')]).trim()===''))return fail_('INCOMPLETE_ASSESSMENT','กรุณาตอบแบบวัดให้ครบทุกข้อ');
  const domainRaw={1:0,2:0,3:0,4:0},domainCounts={1:0,2:0,3:0,4:0},responseRows=[];
  items.forEach(item=>{const itemId=String(item.ItemID||''),domain=Number(item.DomainNo||0),type=String(item.ItemType||'');let answer=answerMap[itemId],raw=0;if(type==='MCQ'){answer=String(answer||'').trim().toUpperCase();if(!['A','B','C','D'].includes(answer))throw new Error('คำตอบข้อ '+itemId+' ไม่ถูกต้อง');raw=answer===String(item.CorrectOption||'').trim().toUpperCase()?1:0;}else{answer=Number(answer);if(![1,2,3,4,5].includes(answer))throw new Error('คำตอบข้อ '+itemId+' ไม่ถูกต้อง');raw=isTrue_(item.IsReverse)?6-answer:answer;}domainRaw[domain]+=raw;domainCounts[domain]+=1;responseRows.push({ResponseID:Utilities.getUuid(),Timestamp:new Date(),StudentID:studentId,Phase:phase,ItemID:itemId,Answer:answer,RawScore:raw,DomainNo:domain,AssessmentSessionID:assessmentSessionId,SubmissionKey:submissionKey,Device:device,Version:String(item.Version||aSession.version||'1')});});
  const scores={};scores[1]=domainCounts[1]?(domainRaw[1]/domainCounts[1])*100:0;[2,3,4].forEach(d=>{const n=domainCounts[d];scores[d]=n?((domainRaw[d]-n)/(4*n))*100:0;});Object.keys(scores).forEach(k=>{scores[k]=Math.round(scores[k]*100)/100;});const overall=Math.round(((scores[1]+scores[2]+scores[3]+scores[4])/4)*100)/100;
  const lock=LockService.getScriptLock();lock.waitLock(15000);let duplicateCompleted=false;try{const scoreAlready=getCompletedResearchScore_(studentId,phase);if(scoreAlready){duplicateCompleted=true;}else{const duplicate=readObjects_(APP.SHEETS.RESEARCH_RESPONSES).some(r=>String(r.SubmissionKey||'')===submissionKey&&String(r.StudentID||'')===studentId);if(!duplicate)responseRows.forEach(r=>appendByHeader_(APP.SHEETS.RESEARCH_RESPONSES,r));appendByHeader_(APP.SHEETS.RESEARCH_SCORES,{ScoreID:Utilities.getUuid(),StudentID:studentId,Phase:phase,StartedAt:new Date(aSession.startedAt),CompletedAt:new Date(),Domain1Score:scores[1],Domain2Score:scores[2],Domain3Score:scores[3],Domain4Score:scores[4],OverallScore:overall,ItemCount:items.length,Status:'Completed',AssessmentSessionID:assessmentSessionId,Version:String(aSession.version||'1')});}}finally{lock.releaseLock();}
  if(duplicateCompleted)return {ok:true,duplicate:true,completed:true,phase:phase==='PRE'?'PRETEST':'POSTTEST'};CacheService.getScriptCache().remove('assessment:'+assessmentSessionId);logActivity_('STUDENT',studentId,'ASSESSMENT_SUBMIT',phase,JSON.stringify({itemCount:items.length,overallStored:true}),body.sessionId||body.token,device);return {ok:true,completed:true,phase,itemCount:items.length,message:'บันทึกแบบวัดเรียบร้อยแล้ว'};
}

function normalizePhase_(phase){const p=String(phase||'').trim().toUpperCase();if(p==='PRE'||p==='PRETEST')return 'PRE';if(p==='POST'||p==='POSTTEST')return 'POST';return '';}
function getResearchStatus_(studentId){const pre=getCompletedResearchScore_(studentId,'PRE'),post=getCompletedResearchScore_(studentId,'POST');return {pretestCompleted:Boolean(pre),pretestCompletedAt:pre?dateIso_(pre.CompletedAt):'',posttestCompleted:Boolean(post),posttestCompletedAt:post?dateIso_(post.CompletedAt):''};}
function getCompletedResearchScore_(studentId,phase){return readObjects_(APP.SHEETS.RESEARCH_SCORES).filter(r=>String(r.StudentID||'').trim()===studentId&&String(r.Phase||'').toUpperCase()===phase&&String(r.Status||'')==='Completed').sort((a,b)=>new Date(b.CompletedAt||0)-new Date(a.CompletedAt||0))[0]||null;}

function certificate_(body){
  const auth=requireStudent_(body.sessionId||body.token,body.studentId);if(!auth.ok)return auth;const settings=settingsObject_();if(!isTrue_(settings.CERTIFICATE_ENABLED))return fail_('CERTIFICATE_DISABLED','ขณะนี้ยังไม่เปิดใบประกาศ');const progress=getStudentProgressData_(auth.studentId),missions=readObjects_(APP.SHEETS.MISSIONS).filter(r=>isTrue_(r.IsActive)),completed=progress.filter(p=>p.status==='Completed');if(new Set(completed.map(p=>p.missionId)).size<missions.length)return fail_('CERTIFICATE_NOT_READY','ต้องผ่านครบทุก Mission ก่อนรับใบประกาศ');const badgeMap={};readObjects_(APP.SHEETS.BADGES).forEach(b=>{badgeMap[String(b.BadgeID||'')]=b;});const completionDate=completed.map(p=>p.completedAt).filter(Boolean).sort().slice(-1)[0]||nowIso_(),badges=completed.map(p=>badgeMap[p.badgeId]).filter(Boolean).map(b=>({nameTh:String(b.BadgeNameTH||''),nameEn:String(b.BadgeNameEN||'')}));logActivity_('STUDENT',auth.studentId,'CERTIFICATE_VIEW','CERTIFICATE','',body.sessionId||body.token,body.device);return {ok:true,student:getStudentSafe_(auth.studentId),completionDate,completedAt:completionDate,badges};
}

function getStudentProgressData_(studentId){return readObjects_(APP.SHEETS.PROGRESS).filter(r=>String(r.StudentID||'').trim()===studentId).map(r=>({progressId:String(r.ProgressID||''),missionId:String(r.MissionID||''),status:String(r.Status||''),score:Number(r.Score||0),attempts:Number(r.Attempts||0),startedAt:dateIso_(r.StartedAt),completedAt:dateIso_(r.CompletedAt),badgeId:String(r.BadgeID||''),lastUpdated:dateIso_(r.LastUpdated)}));}
function upsertProgress_(data){const sheet=sheet_(APP.SHEETS.PROGRESS),values=sheet.getDataRange().getValues(),headers=values[0],idx=headerIndex_(headers);let rowNumber=-1,rowValues=null;for(let r=1;r<values.length;r++){if(String(values[r][idx.StudentID]||'')===data.studentId&&String(values[r][idx.MissionID]||'')===data.missionId){rowNumber=r+1;rowValues=values[r].slice();break;}}if(!rowValues){rowValues=new Array(headers.length).fill('');rowValues[idx.ProgressID]=Utilities.getUuid();rowValues[idx.StudentID]=data.studentId;rowValues[idx.MissionID]=data.missionId;rowValues[idx.Status]='In Progress';rowValues[idx.Score]=0;rowValues[idx.Attempts]=1;rowValues[idx.StartedAt]=new Date();rowValues[idx.LastUpdated]=new Date();sheet.appendRow(rowValues);rowNumber=sheet.getLastRow();}if(data.startOnly){sheet.getRange(rowNumber,idx.LastUpdated+1).setValue(new Date());return;}rowValues[idx.Score]=Number(data.score||0);rowValues[idx.Status]=data.completed?'Completed':'In Progress';rowValues[idx.Attempts]=Number(rowValues[idx.Attempts]||0)+1;if(data.completed&&!rowValues[idx.CompletedAt])rowValues[idx.CompletedAt]=new Date();rowValues[idx.BadgeID]=data.badgeId||rowValues[idx.BadgeID]||'';rowValues[idx.LastUpdated]=new Date();sheet.getRange(rowNumber,1,1,headers.length).setValues([rowValues]);}
function updateStudentTotals_(studentId){const progress=getStudentProgressData_(studentId),total=progress.filter(p=>p.status==='Completed').reduce((sum,p)=>sum+Number(p.score||0),0),level=levelFromPoints_(total),sheet=sheet_(APP.SHEETS.STUDENTS),values=sheet.getDataRange().getValues(),idx=headerIndex_(values[0]);for(let r=1;r<values.length;r++){if(String(values[r][idx.StudentID]||'')===studentId){sheet.getRange(r+1,idx.TotalEcoPoints+1).setValue(total);sheet.getRange(r+1,idx.CurrentLevel+1).setValue(level.name);return;}}}
function allMissionsCompleted_(studentId){const missions=readObjects_(APP.SHEETS.MISSIONS).filter(r=>isTrue_(r.IsActive)),completed=new Set(getStudentProgressData_(studentId).filter(p=>p.status==='Completed').map(p=>p.missionId));return missions.length>0&&missions.every(m=>completed.has(String(m.MissionID||'')));}
function levelFromPoints_(points){const settings=settingsObject_(),levels=[1,2,3,4,5].map(n=>{const parts=String(settings['LEVEL_'+n]||'').split('|');return {name:parts[0]||'Eco Explorer',threshold:Number(parts[1]||0)};}).sort((a,b)=>a.threshold-b.threshold);let current=levels[0];levels.forEach(l=>{if(points>=l.threshold)current=l;});return current;}
function nextQuestionAttempt_(studentId,missionId,questionId){return readObjects_(APP.SHEETS.RESPONSES).filter(r=>String(r.StudentID||'')===studentId&&String(r.MissionID||'')===missionId&&String(r.QuestionID||'')===questionId).length+1;}

function getStudentSafe_(studentId){const row=readObjects_(APP.SHEETS.STUDENTS).find(r=>String(r.StudentID||'').trim()===studentId);if(!row)return null;return {studentId:String(row.StudentID||''),fullName:String(row.FullName||''),className:String(row.Class||''),nickname:String(row.Nickname||''),status:String(row.Status||''),totalEcoPoints:Number(row.TotalEcoPoints||0),currentLevel:String(row.CurrentLevel||'Eco Explorer'),lastLogin:dateIso_(row.LastLogin)};}
function settingsObject_(){const out={};readObjects_(APP.SHEETS.SETTINGS).forEach(r=>{out[String(r.Key||'').trim()]=r.Value;});return out;}
function setSetting_(key,value){const sheet=sheet_(APP.SHEETS.SETTINGS),values=sheet.getDataRange().getValues(),idx=headerIndex_(values[0]);for(let r=1;r<values.length;r++){if(String(values[r][idx.Key]||'').trim()===key){sheet.getRange(r+1,idx.Value+1).setValue(value);return;}}appendByHeader_(APP.SHEETS.SETTINGS,{Key:key,Value:value,DataType:'TEXT',Description:'สร้างโดยระบบ'});}
function setMissionField_(missionId,field,value){const sheet=sheet_(APP.SHEETS.MISSIONS),values=sheet.getDataRange().getValues(),idx=headerIndex_(values[0]);if(idx[field]===undefined)throw new Error('ไม่พบคอลัมน์ '+field+' ใน Missions');for(let r=1;r<values.length;r++){if(String(values[r][idx.MissionID]||'').trim()===missionId){sheet.getRange(r+1,idx[field]+1).setValue(value);return;}}throw new Error('ไม่พบ Mission '+missionId);}
function logActivity_(actorType,actorId,action,targetId,details,sessionId,device){try{appendByHeader_(APP.SHEETS.ACTIVITY_LOG,{LogID:Utilities.getUuid(),Timestamp:new Date(),ActorType:actorType,ActorID:cleanText_(actorId,80),Action:cleanText_(action,80),TargetID:cleanText_(targetId,120),Details:cleanText_(details||'',1500),SessionID:cleanText_(sessionId||'',180),Device:cleanText_(device||'',220),AppVersion:APP.VERSION});}catch(err){console.error('ActivityLog:',err);}}
function readObjects_(sheetName){const sheet=sheet_(sheetName),values=sheet.getDataRange().getValues();if(!values.length||values.length<2)return [];const headers=values[0].map(String);return values.slice(1).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>{const obj={};headers.forEach((h,i)=>{if(h)obj[h]=row[i];});return obj;});}
function appendByHeader_(sheetName,obj){const sheet=sheet_(sheetName),headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],row=headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'');sheet.appendRow(row);}
function headerIndex_(headers){const out={};headers.forEach((h,i)=>{out[String(h)]=i;});return out;}
function sheet_(name){const sh=SpreadsheetApp.openById(APP.SPREADSHEET_ID).getSheetByName(name);if(!sh)throw new Error('ไม่พบชีต: '+name);return sh;}
function parseBody_(e){if(!e||!e.postData||!e.postData.contents)return {};try{return JSON.parse(e.postData.contents);}catch(_){return {};}}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function errorJson_(err){console.error(err&&err.stack?err.stack:err);return json_({ok:false,error:'SERVER_ERROR',message:err&&err.message?err.message:String(err)});}
function fail_(error,message){return {ok:false,error,message};}
function cleanId_(value){return String(value==null?'':value).replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);}
function cleanText_(value,maxLen){return String(value==null?'':value).trim().slice(0,maxLen||500);}
function normalizeName_(value){return String(value||'').toLowerCase().replace(/\s+/g,'').trim();}
function isTrue_(value){return value===true||String(value).toUpperCase()==='TRUE'||String(value)==='1';}
function nowIso_(){return Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX");}
function dateIso_(value){if(!value)return '';const d=value instanceof Date?value:new Date(value);if(isNaN(d.getTime()))return String(value);return Utilities.formatDate(d,APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX");}
