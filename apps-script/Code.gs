const APP = Object.freeze({
  VERSION: '1.0.0',
  SPREADSHEET_ID: '1TiopIT7NAMZ0wvXs20f7tCCGp74U_bH4Bn_peJjNadM',
  TIMEZONE: 'Asia/Bangkok',
  PASS_SCORE: 60,
  SHEETS: {
    STUDENTS: 'Students',
    MISSIONS: 'Missions',
    CONTENT: 'LearningContent',
    QUESTIONS: 'QuestionBank',
    PROGRESS: 'Progress',
    RESPONSES: 'Responses',
    REFLECTIONS: 'Reflections',
    BADGES: 'Badges',
    SETTINGS: 'Settings'
  }
});

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'health').trim();
    if (action === 'health') {
      return json_({ ok: true, service: 'LAUDATO QUEST API', version: APP.VERSION, time: nowIso_() });
    }
    if (action === 'bootstrap') {
      return json_(bootstrap_(String((e.parameter.studentId || '')).trim()));
    }
    if (action === 'mission') {
      const studentId = String(e.parameter.studentId || '').trim();
      const missionId = String(e.parameter.missionId || '').trim();
      return json_(getMission_(studentId, missionId));
    }
    if (action === 'progress') {
      return json_(getStudentProgress_(String(e.parameter.studentId || '').trim()));
    }
    return json_({ ok: false, error: 'UNKNOWN_ACTION', message: 'ไม่พบ action ที่ร้องขอ' });
  } catch (err) {
    return errorJson_(err);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').trim();

    switch (action) {
      case 'login':
        return json_(login_(body));
      case 'submitAnswer':
        return json_(submitAnswer_(body));
      case 'completeMission':
        return json_(completeMission_(body));
      case 'saveReflection':
        return json_(saveReflection_(body));
      case 'startMission':
        return json_(startMission_(body));
      default:
        return json_({ ok: false, error: 'UNKNOWN_ACTION', message: 'ไม่พบ action ที่ร้องขอ' });
    }
  } catch (err) {
    return errorJson_(err);
  }
}

function bootstrap_(studentId) {
  const settings = settingsObject_();
  const gameStatus = String(settings.GAME_STATUS || 'OPEN').toUpperCase();
  const missions = readObjects_(APP.SHEETS.MISSIONS)
    .filter(r => isTrue_(r.IsActive))
    .sort((a, b) => Number(a.Order || 0) - Number(b.Order || 0))
    .map(r => ({
      missionId: String(r.MissionID),
      order: Number(r.Order || 0),
      title: String(r.TitleTH || ''),
      topic: String(r.LaudatoTopic || ''),
      laudatoSiRef: String(r.LaudatoSiRef || ''),
      learningGoal: String(r.LearningGoal || ''),
      maxPoints: Number(r.MaxPoints || 100),
      badgeId: String(r.BadgeID || ''),
      requiredMission: String(r.RequiredMission || '')
    }));

  const badges = readObjects_(APP.SHEETS.BADGES)
    .filter(r => isTrue_(r.IsActive))
    .map(r => ({
      badgeId: String(r.BadgeID),
      missionId: String(r.MissionID || ''),
      nameTh: String(r.BadgeNameTH || ''),
      nameEn: String(r.BadgeNameEN || ''),
      description: String(r.Description || ''),
      iconKey: String(r.IconKey || '')
    }));

  const progress = studentId ? getStudentProgressData_(studentId) : [];
  return {
    ok: true,
    version: APP.VERSION,
    gameStatus,
    title: String(settings.GAME_TITLE || 'LAUDATO QUEST'),
    passScore: Number(settings.PASS_SCORE || APP.PASS_SCORE),
    missions,
    badges,
    progress,
    student: studentId ? getStudentSafe_(studentId) : null
  };
}

function login_(body) {
  const studentId = cleanId_(body.studentId);
  const fullName = cleanText_(body.fullName, 160);
  const className = cleanText_(body.className || 'ม.6/5', 50);
  const nickname = cleanText_(body.nickname || '', 80);

  if (!studentId || !fullName) {
    return { ok: false, error: 'MISSING_LOGIN_DATA', message: 'กรุณากรอกรหัสนักเรียนและชื่อ–นามสกุล' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_(APP.SHEETS.STUDENTS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const idx = headerIndex_(headers);
    let rowNumber = -1;

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idx.StudentID] || '').trim() === studentId) {
        rowNumber = r + 1;
        const status = String(values[r][idx.Status] || 'Active').trim();
        if (status.toLowerCase() === 'inactive') {
          return { ok: false, error: 'INACTIVE_STUDENT', message: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อครูผู้สอน' };
        }
        const existingName = String(values[r][idx.FullName] || '').trim();
        if (existingName && normalizeName_(existingName) !== normalizeName_(fullName)) {
          return { ok: false, error: 'NAME_MISMATCH', message: 'ชื่อ–นามสกุลไม่ตรงกับรหัสนักเรียน' };
        }
        if (!existingName) sheet.getRange(rowNumber, idx.FullName + 1).setValue(fullName);
        if (!values[r][idx.Class]) sheet.getRange(rowNumber, idx.Class + 1).setValue(className);
        if (!values[r][idx.Nickname] && nickname) sheet.getRange(rowNumber, idx.Nickname + 1).setValue(nickname);
        sheet.getRange(rowNumber, idx.LastLogin + 1).setValue(new Date());
        break;
      }
    }

    if (rowNumber < 0) {
      const row = new Array(headers.length).fill('');
      row[idx.StudentID] = studentId;
      row[idx.FullName] = fullName;
      row[idx.Class] = className;
      row[idx.Nickname] = nickname;
      row[idx.Status] = 'Active';
      row[idx.CreatedAt] = new Date();
      row[idx.LastLogin] = new Date();
      row[idx.TotalEcoPoints] = 0;
      row[idx.CurrentLevel] = 'Eco Explorer';
      sheet.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }

  const sessionId = Utilities.getUuid();
  return {
    ok: true,
    sessionId,
    student: getStudentSafe_(studentId),
    progress: getStudentProgressData_(studentId)
  };
}

function getMission_(studentId, missionId) {
  studentId = cleanId_(studentId);
  missionId = cleanText_(missionId, 20);
  if (!studentId || !missionId) return { ok: false, error: 'MISSING_DATA' };

  const student = getStudentSafe_(studentId);
  if (!student) return { ok: false, error: 'STUDENT_NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' };

  const missions = readObjects_(APP.SHEETS.MISSIONS);
  const mission = missions.find(r => String(r.MissionID) === missionId && isTrue_(r.IsActive));
  if (!mission) return { ok: false, error: 'MISSION_NOT_FOUND' };

  if (!isMissionUnlocked_(studentId, mission)) {
    return { ok: false, error: 'MISSION_LOCKED', message: 'กรุณาผ่านภารกิจก่อนหน้าเพื่อปลดล็อกภารกิจนี้' };
  }

  const content = readObjects_(APP.SHEETS.CONTENT)
    .filter(r => String(r.MissionID) === missionId && isTrue_(r.IsActive))
    .sort((a, b) => Number(a.CardOrder || 0) - Number(b.CardOrder || 0))
    .map(r => ({
      contentId: String(r.ContentID),
      order: Number(r.CardOrder || 0),
      title: String(r.Title || ''),
      body: String(r.Body || ''),
      laudatoSiRef: String(r.LaudatoSiRef || ''),
      mediaType: String(r.MediaType || 'TEXT_CARD')
    }));

  const questions = readObjects_(APP.SHEETS.QUESTIONS)
    .filter(r => String(r.MissionID) === missionId)
    .map(r => ({
      questionId: String(r.QuestionID),
      type: String(r.QuestionType || 'MCQ'),
      prompt: String(r.Prompt || ''),
      options: [r.OptionA, r.OptionB, r.OptionC, r.OptionD].map(v => String(v || '')),
      points: Number(r.Points || 0)
    }));

  return {
    ok: true,
    mission: {
      missionId: String(mission.MissionID),
      order: Number(mission.Order || 0),
      title: String(mission.TitleTH || ''),
      topic: String(mission.LaudatoTopic || ''),
      laudatoSiRef: String(mission.LaudatoSiRef || ''),
      learningGoal: String(mission.LearningGoal || ''),
      maxPoints: Number(mission.MaxPoints || 100),
      badgeId: String(mission.BadgeID || '')
    },
    content,
    questions
  };
}

function startMission_(body) {
  const studentId = cleanId_(body.studentId);
  const missionId = cleanText_(body.missionId, 20);
  if (!studentId || !missionId) return { ok: false, error: 'MISSING_DATA' };

  const mission = readObjects_(APP.SHEETS.MISSIONS).find(r => String(r.MissionID) === missionId);
  if (!mission || !isMissionUnlocked_(studentId, mission)) {
    return { ok: false, error: 'MISSION_LOCKED' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    upsertProgress_({ studentId, missionId, startOnly: true });
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function submitAnswer_(body) {
  const studentId = cleanId_(body.studentId);
  const missionId = cleanText_(body.missionId, 20);
  const questionId = cleanText_(body.questionId, 30);
  const selectedOption = String(body.selectedOption || '').trim().toUpperCase();
  const sessionId = cleanText_(body.sessionId || '', 100);
  const device = cleanText_(body.device || '', 220);

  if (!studentId || !missionId || !questionId || !selectedOption) {
    return { ok: false, error: 'MISSING_ANSWER_DATA' };
  }
  if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
    return { ok: false, error: 'INVALID_OPTION' };
  }

  const q = readObjects_(APP.SHEETS.QUESTIONS).find(r =>
    String(r.QuestionID) === questionId && String(r.MissionID) === missionId
  );
  if (!q) return { ok: false, error: 'QUESTION_NOT_FOUND' };

  const isCorrect = String(q.CorrectOption || '').trim().toUpperCase() === selectedOption;
  const points = isCorrect ? Number(q.Points || 0) : 0;
  const feedback = String(isCorrect ? q.FeedbackCorrect : q.FeedbackIncorrect || '');
  const attemptNo = nextQuestionAttempt_(studentId, missionId, questionId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    appendByHeader_(APP.SHEETS.RESPONSES, {
      ResponseID: Utilities.getUuid(),
      Timestamp: new Date(),
      StudentID: studentId,
      MissionID: missionId,
      QuestionID: questionId,
      SelectedOption: selectedOption,
      IsCorrect: isCorrect,
      PointsEarned: points,
      AttemptNo: attemptNo,
      FeedbackShown: feedback,
      SessionID: sessionId,
      Device: device
    });
  } finally {
    lock.releaseLock();
  }

  return { ok: true, isCorrect, pointsEarned: points, feedback, attemptNo };
}

function completeMission_(body) {
  const studentId = cleanId_(body.studentId);
  const missionId = cleanText_(body.missionId, 20);
  if (!studentId || !missionId) return { ok: false, error: 'MISSING_DATA' };

  const mission = readObjects_(APP.SHEETS.MISSIONS).find(r => String(r.MissionID) === missionId);
  if (!mission) return { ok: false, error: 'MISSION_NOT_FOUND' };

  const questions = readObjects_(APP.SHEETS.QUESTIONS).filter(r => String(r.MissionID) === missionId);
  const maxRaw = questions.reduce((sum, q) => sum + Number(q.Points || 0), 0);
  const responses = readObjects_(APP.SHEETS.RESPONSES).filter(r =>
    String(r.StudentID) === studentId && String(r.MissionID) === missionId
  );

  const bestByQuestion = {};
  responses.forEach(r => {
    const qid = String(r.QuestionID || '');
    const pts = Number(r.PointsEarned || 0);
    bestByQuestion[qid] = Math.max(Number(bestByQuestion[qid] || 0), pts);
  });
  const earnedRaw = Object.values(bestByQuestion).reduce((a, b) => a + Number(b || 0), 0);
  const score100 = maxRaw > 0 ? Math.round((earnedRaw / maxRaw) * Number(mission.MaxPoints || 100)) : 0;
  const passScore = Number(settingsObject_().PASS_SCORE || APP.PASS_SCORE);
  const completed = score100 >= passScore;
  const badgeId = completed ? String(mission.BadgeID || '') : '';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    upsertProgress_({ studentId, missionId, score: score100, completed, badgeId });
    updateStudentTotals_(studentId);
  } finally {
    lock.releaseLock();
  }

  const progress = getStudentProgressData_(studentId);
  return {
    ok: true,
    completed,
    score: score100,
    passScore,
    badgeId,
    progress,
    student: getStudentSafe_(studentId)
  };
}

function saveReflection_(body) {
  const studentId = cleanId_(body.studentId);
  const missionId = cleanText_(body.missionId, 20);
  const reflectionText = cleanText_(body.reflectionText || '', 3000);
  const ecoCommitment = cleanText_(body.ecoCommitment || '', 1200);
  const promptType = cleanText_(body.promptType || 'MISSION_REFLECTION', 80);

  if (!studentId || !missionId || (!reflectionText && !ecoCommitment)) {
    return { ok: false, error: 'MISSING_REFLECTION_DATA' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    appendByHeader_(APP.SHEETS.REFLECTIONS, {
      ReflectionID: Utilities.getUuid(),
      Timestamp: new Date(),
      StudentID: studentId,
      MissionID: missionId,
      PromptType: promptType,
      ReflectionText: reflectionText,
      EcoCommitment: ecoCommitment,
      TeacherNote: '',
      Reviewed: false
    });
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function getStudentProgress_(studentId) {
  studentId = cleanId_(studentId);
  if (!studentId) return { ok: false, error: 'MISSING_STUDENT_ID' };
  return { ok: true, student: getStudentSafe_(studentId), progress: getStudentProgressData_(studentId) };
}

function getStudentProgressData_(studentId) {
  return readObjects_(APP.SHEETS.PROGRESS)
    .filter(r => String(r.StudentID || '').trim() === studentId)
    .map(r => ({
      progressId: String(r.ProgressID || ''),
      missionId: String(r.MissionID || ''),
      status: String(r.Status || ''),
      score: Number(r.Score || 0),
      attempts: Number(r.Attempts || 0),
      startedAt: dateIso_(r.StartedAt),
      completedAt: dateIso_(r.CompletedAt),
      badgeId: String(r.BadgeID || ''),
      lastUpdated: dateIso_(r.LastUpdated)
    }));
}

function upsertProgress_(data) {
  const sheet = sheet_(APP.SHEETS.PROGRESS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = headerIndex_(headers);
  let rowNumber = -1;
  let rowValues = null;

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idx.StudentID] || '') === data.studentId && String(values[r][idx.MissionID] || '') === data.missionId) {
      rowNumber = r + 1;
      rowValues = values[r].slice();
      break;
    }
  }

  if (!rowValues) {
    rowValues = new Array(headers.length).fill('');
    rowValues[idx.ProgressID] = Utilities.getUuid();
    rowValues[idx.StudentID] = data.studentId;
    rowValues[idx.MissionID] = data.missionId;
    rowValues[idx.Status] = 'In Progress';
    rowValues[idx.Score] = 0;
    rowValues[idx.Attempts] = 1;
    rowValues[idx.StartedAt] = new Date();
    rowValues[idx.LastUpdated] = new Date();
    sheet.appendRow(rowValues);
    rowNumber = sheet.getLastRow();
  }

  if (data.startOnly) {
    sheet.getRange(rowNumber, idx.LastUpdated + 1).setValue(new Date());
    return;
  }

  rowValues[idx.Score] = Number(data.score || 0);
  rowValues[idx.Status] = data.completed ? 'Completed' : 'In Progress';
  rowValues[idx.Attempts] = Number(rowValues[idx.Attempts] || 0) + 1;
  if (data.completed && !rowValues[idx.CompletedAt]) rowValues[idx.CompletedAt] = new Date();
  rowValues[idx.BadgeID] = data.badgeId || rowValues[idx.BadgeID] || '';
  rowValues[idx.LastUpdated] = new Date();
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([rowValues]);
}

function updateStudentTotals_(studentId) {
  const progress = getStudentProgressData_(studentId);
  const total = progress.filter(p => p.status === 'Completed').reduce((sum, p) => sum + Number(p.score || 0), 0);
  const level = levelFromPoints_(total);

  const sheet = sheet_(APP.SHEETS.STUDENTS);
  const values = sheet.getDataRange().getValues();
  const idx = headerIndex_(values[0]);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idx.StudentID] || '') === studentId) {
      sheet.getRange(r + 1, idx.TotalEcoPoints + 1).setValue(total);
      sheet.getRange(r + 1, idx.CurrentLevel + 1).setValue(level.name);
      return;
    }
  }
}

function levelFromPoints_(points) {
  const settings = settingsObject_();
  const levels = [1, 2, 3, 4, 5].map(n => {
    const raw = String(settings['LEVEL_' + n] || '');
    const parts = raw.split('|');
    return { name: parts[0] || 'Eco Explorer', threshold: Number(parts[1] || 0) };
  }).sort((a, b) => a.threshold - b.threshold);
  let current = levels[0];
  levels.forEach(l => { if (points >= l.threshold) current = l; });
  return current;
}

function isMissionUnlocked_(studentId, mission) {
  const required = String(mission.RequiredMission || '').trim();
  if (!required) return true;
  const p = getStudentProgressData_(studentId).find(x => x.missionId === required);
  return Boolean(p && p.status === 'Completed');
}

function nextQuestionAttempt_(studentId, missionId, questionId) {
  const rows = readObjects_(APP.SHEETS.RESPONSES).filter(r =>
    String(r.StudentID) === studentId && String(r.MissionID) === missionId && String(r.QuestionID) === questionId
  );
  return rows.length + 1;
}

function getStudentSafe_(studentId) {
  const row = readObjects_(APP.SHEETS.STUDENTS).find(r => String(r.StudentID || '').trim() === studentId);
  if (!row) return null;
  return {
    studentId: String(row.StudentID || ''),
    fullName: String(row.FullName || ''),
    className: String(row.Class || ''),
    nickname: String(row.Nickname || ''),
    status: String(row.Status || ''),
    totalEcoPoints: Number(row.TotalEcoPoints || 0),
    currentLevel: String(row.CurrentLevel || 'Eco Explorer'),
    lastLogin: dateIso_(row.LastLogin)
  };
}

function settingsObject_() {
  const out = {};
  readObjects_(APP.SHEETS.SETTINGS).forEach(r => { out[String(r.Key || '').trim()] = r.Value; });
  return out;
}

function readObjects_(sheetName) {
  const sheet = sheet_(sheetName);
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (!values.length || values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function appendByHeader_(sheetName, obj) {
  const sheet = sheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '');
  sheet.appendRow(row);
}

function headerIndex_(headers) {
  const out = {};
  headers.forEach((h, i) => { out[String(h)] = i; });
  return out;
}

function sheet_(name) {
  const ss = SpreadsheetApp.openById(APP.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีต: ' + name);
  return sheet;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = e.postData.contents;
  try { return JSON.parse(text); } catch (err) { return {}; }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorJson_(err) {
  console.error(err && err.stack ? err.stack : err);
  return json_({ ok: false, error: 'SERVER_ERROR', message: err && err.message ? err.message : String(err) });
}

function cleanId_(value) {
  return String(value == null ? '' : value).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
}

function cleanText_(value, maxLen) {
  return String(value == null ? '' : value).trim().slice(0, maxLen || 500);
}

function normalizeName_(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').trim();
}

function isTrue_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE' || String(value) === '1';
}

function nowIso_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function dateIso_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return Utilities.formatDate(d, APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
