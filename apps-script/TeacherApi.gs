const TEACHER_SESSION_SECONDS = 21600;

function teacherLogin_(body) {
  const settings = settingsObject_();
  const username = cleanText_(body.username || '', 80);
  const pin = String(body.pin || '').trim();
  const expectedUser = String(settings.TEACHER_USERNAME || 'teacher').trim();
  const expectedHash = String(settings.TEACHER_PIN_HASH || '').trim().toLowerCase();
  const teacherName = String(settings.TEACHER_NAME || 'ครูผู้สอน').trim();
  if (!username || !pin) return fail_('MISSING_TEACHER_LOGIN', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  if (!expectedHash) return fail_('TEACHER_LOGIN_NOT_CONFIGURED', 'ยังไม่ได้กำหนดรหัสผ่านครูใน Settings');
  if (username !== expectedUser || sha256_(pin) !== expectedHash) return fail_('INVALID_TEACHER_LOGIN', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('teacher:' + token, JSON.stringify({ username: expectedUser, name: teacherName, createdAt: nowIso_() }), TEACHER_SESSION_SECONDS);
  logActivity_('TEACHER', expectedUser, 'TEACHER_LOGIN', 'DASHBOARD', '', token, body.device);
  return { ok: true, token, expiresIn: TEACHER_SESSION_SECONDS, teacher: { username: expectedUser, name: teacherName } };
}

function teacherLogout_(body) {
  const auth = requireTeacher_(body.token);
  if (auth.ok) {
    CacheService.getScriptCache().remove('teacher:' + cleanText_(body.token || '', 180));
    logActivity_('TEACHER', auth.teacher.username, 'TEACHER_LOGOUT', 'DASHBOARD', '', body.token, body.device);
  }
  return { ok: true };
}

function requireTeacher_(token) {
  token = cleanText_(token || '', 180);
  if (!token) return fail_('UNAUTHORIZED', 'กรุณาเข้าสู่ระบบครูอีกครั้ง');
  const cached = CacheService.getScriptCache().get('teacher:' + token);
  if (!cached) return fail_('UNAUTHORIZED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  try { return { ok: true, teacher: JSON.parse(cached) }; }
  catch (_) { return fail_('UNAUTHORIZED', 'Session ไม่ถูกต้อง'); }
}

function teacherDashboard_(body) {
  const auth = requireTeacher_(body.token);
  if (!auth.ok) return auth;
  const settings = settingsObject_();
  const studentsRaw = readObjects_(APP.SHEETS.STUDENTS).filter(r => String(r.Status || 'Active').toLowerCase() !== 'inactive');
  const missionsRaw = readObjects_(APP.SHEETS.MISSIONS).filter(r => isTrue_(r.IsActive)).sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0));
  const progressRaw = readObjects_(APP.SHEETS.PROGRESS);
  const scoresRaw = readObjects_(APP.SHEETS.RESEARCH_SCORES).filter(r => String(r.Status || '') === 'Completed');
  const realStudents = studentsRaw.filter(r => String(r.Nickname || '').toUpperCase() !== 'TEST' && String(r.StudentID || '').trim() !== '12345');
  const realIds = new Set(realStudents.map(s => String(s.StudentID || '').trim()));

  const students = studentsRaw.map(s => {
    const studentId = String(s.StudentID || '').trim();
    const p = progressRaw.filter(x => String(x.StudentID || '').trim() === studentId);
    const startedMissions = new Set(p.map(x => String(x.MissionID || '')).filter(Boolean)).size;
    const completedMissions = new Set(p.filter(x => String(x.Status || '') === 'Completed').map(x => String(x.MissionID || ''))).size;
    const pre = latestScoreFromRows_(scoresRaw, studentId, 'PRE');
    const post = latestScoreFromRows_(scoresRaw, studentId, 'POST');
    const isTest = String(s.Nickname || '').toUpperCase() === 'TEST' || studentId === '12345';
    const missingMissions = missionsRaw.filter(m => !p.some(x => String(x.MissionID || '') === String(m.MissionID || '') && String(x.Status || '') === 'Completed')).map(m => String(m.MissionID || ''));
    const statusCode = isTest ? 'test' : post ? 'completed' : (completedMissions >= missionsRaw.length && missionsRaw.length ? 'waiting-posttest' : (startedMissions > 0 || pre || s.LastLogin ? 'started' : 'not-started'));
    return {
      studentId, fullName: String(s.FullName || ''), className: String(s.Class || ''), nickname: String(s.Nickname || ''),
      lastLogin: dateIso_(s.LastLogin), totalEcoPoints: Number(s.TotalEcoPoints || 0), currentLevel: String(s.CurrentLevel || 'Eco Explorer'),
      startedMissions, completedMissions, missingMissions, pretestCompleted: Boolean(pre), posttestCompleted: Boolean(post),
      pretestOverall: pre ? Number(pre.OverallScore || 0) : null, posttestOverall: post ? Number(post.OverallScore || 0) : null,
      statusCode, isTest
    };
  }).sort((a,b) => a.studentId.localeCompare(b.studentId, 'th'));

  const realRows = students.filter(s => realIds.has(s.studentId));
  const summary = {
    totalStudents: realRows.length,
    loggedInStudents: realRows.filter(s => Boolean(s.lastLogin)).length,
    pretestCompleted: realRows.filter(s => s.pretestCompleted).length,
    startedStudents: realRows.filter(s => s.startedMissions > 0).length,
    waitingPosttest: realRows.filter(s => s.statusCode === 'waiting-posttest').length,
    completedStudents: realRows.filter(s => s.statusCode === 'completed').length,
    averagePoints: realRows.length ? Math.round(realRows.reduce((sum,s) => sum + Number(s.totalEcoPoints || 0),0) / realRows.length * 10) / 10 : 0
  };

  const missionStats = missionsRaw.map(m => {
    const missionId = String(m.MissionID || '');
    const rows = progressRaw.filter(p => realIds.has(String(p.StudentID || '').trim()) && String(p.MissionID || '') === missionId);
    return {
      missionId, title: String(m.TitleTH || ''), topic: String(m.LaudatoTopic || ''),
      started: new Set(rows.map(r => String(r.StudentID || '')).filter(Boolean)).size,
      completed: new Set(rows.filter(r => String(r.Status || '') === 'Completed').map(r => String(r.StudentID || '')).filter(Boolean)).size,
      teacherOpen: isTrue_(m.TeacherOpen), acceptAnswers: isTrue_(m.AcceptAnswers)
    };
  });

  return {
    ok: true,
    teacher: auth.teacher,
    generatedAt: nowIso_(),
    controls: {
      gameStatus: String(settings.GAME_STATUS || 'OPEN').toUpperCase(),
      answerSubmissionEnabled: isTrue_(settings.ANSWER_SUBMISSION_ENABLED),
      activeMission: String(settings.ACTIVE_MISSION || 'ALL').toUpperCase(),
      pretestEnabled: isTrue_(settings.PRETEST_ENABLED),
      posttestEnabled: isTrue_(settings.POSTTEST_ENABLED)
    },
    summary,
    missions: missionsRaw.map(m => ({ missionId: String(m.MissionID || ''), title: String(m.TitleTH || ''), teacherOpen: isTrue_(m.TeacherOpen), acceptAnswers: isTrue_(m.AcceptAnswers) })),
    missionStats,
    students
  };
}

function teacherControl_(body) {
  const auth = requireTeacher_(body.token);
  if (!auth.ok) return auth;
  const command = cleanText_(body.command || '', 60);
  const missionId = cleanText_(body.missionId || '', 20);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    switch (command) {
      case 'SET_GAME_STATUS':
        setSetting_('GAME_STATUS', String(body.value || '').toUpperCase() === 'OPEN' ? 'OPEN' : 'CLOSED');
        break;
      case 'SET_ANSWER_SUBMISSION':
        setSetting_('ANSWER_SUBMISSION_ENABLED', body.value ? 'TRUE' : 'FALSE');
        break;
      case 'SET_ACTIVE_MISSION':
        setSetting_('ACTIVE_MISSION', String(body.value || 'ALL').toUpperCase());
        break;
      case 'SET_MISSION_OPEN':
        if (!missionId) return fail_('MISSING_MISSION', 'ไม่พบ Mission');
        setMissionField_(missionId, 'TeacherOpen', Boolean(body.value));
        break;
      case 'SET_MISSION_ANSWERS':
        if (!missionId) return fail_('MISSING_MISSION', 'ไม่พบ Mission');
        setMissionField_(missionId, 'AcceptAnswers', Boolean(body.value));
        break;
      case 'SET_PRETEST_ENABLED':
        setSetting_('PRETEST_ENABLED', body.value ? 'TRUE' : 'FALSE');
        break;
      case 'SET_POSTTEST_ENABLED':
        setSetting_('POSTTEST_ENABLED', body.value ? 'TRUE' : 'FALSE');
        break;
      default:
        return fail_('UNKNOWN_CONTROL', 'ไม่พบคำสั่งควบคุม');
    }
  } finally { lock.releaseLock(); }
  logActivity_('TEACHER', auth.teacher.username, 'TEACHER_CONTROL', command, JSON.stringify({ missionId, value: body.value }), body.token, body.device);
  return { ok: true, controls: teacherDashboard_({ token: body.token }).controls };
}

function teacherStudentDetail_(body) {
  const auth = requireTeacher_(body.token);
  if (!auth.ok) return auth;
  const studentId = cleanId_(body.studentId);
  if (!studentId) return fail_('MISSING_STUDENT_ID', 'ไม่พบรหัสนักเรียน');
  const student = getStudentSafe_(studentId);
  if (!student) return fail_('STUDENT_NOT_FOUND', 'ไม่พบข้อมูลนักเรียน');

  const missions = readObjects_(APP.SHEETS.MISSIONS).filter(r => isTrue_(r.IsActive)).sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0));
  const missionMap = {}; missions.forEach(m => { missionMap[String(m.MissionID || '')] = String(m.TitleTH || ''); });
  const progress = getStudentProgressData_(studentId).map(p => ({ ...p, missionTitle: missionMap[p.missionId] || p.missionId })).sort((a,b) => String(a.missionId).localeCompare(String(b.missionId)));
  const responses = readObjects_(APP.SHEETS.RESPONSES).filter(r => String(r.StudentID || '').trim() === studentId);
  const reflections = readObjects_(APP.SHEETS.REFLECTIONS).filter(r => String(r.StudentID || '').trim() === studentId).map(r => ({
    reflectionId: String(r.ReflectionID || ''), timestamp: dateIso_(r.Timestamp), missionId: String(r.MissionID || ''), missionTitle: missionMap[String(r.MissionID || '')] || String(r.MissionID || ''),
    reflectionText: String(r.ReflectionText || ''), ecoCommitment: String(r.EcoCommitment || ''), reviewed: isTrue_(r.Reviewed)
  })).sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  const researchScores = readObjects_(APP.SHEETS.RESEARCH_SCORES).filter(r => String(r.StudentID || '').trim() === studentId && String(r.Status || '') === 'Completed').map(r => ({
    phase: String(r.Phase || ''), startedAt: dateIso_(r.StartedAt), completedAt: dateIso_(r.CompletedAt),
    domain1Score: Number(r.Domain1Score || 0), domain2Score: Number(r.Domain2Score || 0), domain3Score: Number(r.Domain3Score || 0), domain4Score: Number(r.Domain4Score || 0), overallScore: Number(r.OverallScore || 0)
  }));

  const pre = researchScores.filter(r => r.phase === 'PRE').sort((a,b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0] || null;
  const post = researchScores.filter(r => r.phase === 'POST').sort((a,b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0] || null;
  const timeline = [];
  timeline.push({ key: 'LOGIN', label: 'Login', status: student.lastLogin ? 'completed' : 'pending', timestamp: student.lastLogin || '', score: null, attempts: student.lastLogin ? 1 : 0 });
  timeline.push({ key: 'PRE', label: 'Pretest', status: pre ? 'completed' : 'pending', timestamp: pre ? pre.completedAt : '', score: pre ? pre.overallScore : null, attempts: pre ? 1 : 0 });
  missions.forEach(m => {
    const id = String(m.MissionID || ''); const p = progress.find(x => x.missionId === id);
    timeline.push({ key: id, label: id + ' · ' + String(m.TitleTH || ''), status: p ? (p.status === 'Completed' ? 'completed' : 'in-progress') : 'pending', timestamp: p ? (p.completedAt || p.startedAt || '') : '', score: p ? p.score : null, attempts: p ? p.attempts : 0 });
  });
  timeline.push({ key: 'POST', label: 'Posttest', status: post ? 'completed' : (progress.filter(p => p.status === 'Completed').length >= missions.length ? 'waiting' : 'pending'), timestamp: post ? post.completedAt : '', score: post ? post.overallScore : null, attempts: post ? 1 : 0 });

  return {
    ok: true,
    student,
    completedMissions: progress.filter(p => p.status === 'Completed').length,
    responseCount: responses.length,
    progress,
    reflections,
    researchScores,
    timeline
  };
}

function teacherExportReport_(body) {
  const auth = requireTeacher_(body.token);
  if (!auth.ok) return auth;
  const format = String(body.format || 'CSV').toUpperCase();
  const report = buildResearchReport_();
  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMdd_HHmmss');
  if (format === 'CSV') {
    const csv = rowsToCsv_(report.rows);
    logActivity_('TEACHER', auth.teacher.username, 'EXPORT_CSV', 'REPORT', '', body.token, body.device);
    return { ok: true, format: 'CSV', filename: 'LAUDATO_QUEST_Report_' + stamp + '.csv', content: '\ufeff' + csv };
  }
  if (format === 'XLSX') {
    const temp = SpreadsheetApp.create('LAUDATO_QUEST_Report_' + stamp);
    const first = temp.getSheets()[0]; first.setName('StudentReport');
    writeMatrix_(first, report.rows);
    const scoreSheet = temp.insertSheet('ResearchScores'); writeMatrix_(scoreSheet, report.scoreRows);
    const progressSheet = temp.insertSheet('Progress'); writeMatrix_(progressSheet, report.progressRows);
    const reflectionSheet = temp.insertSheet('Reflections'); writeMatrix_(reflectionSheet, report.reflectionRows);
    [first,scoreSheet,progressSheet,reflectionSheet].forEach(sh => { sh.setFrozenRows(1); if (sh.getLastColumn()) sh.autoResizeColumns(1, sh.getLastColumn()); });
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=xlsx';
    const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
    DriveApp.getFileById(temp.getId()).setTrashed(true);
    logActivity_('TEACHER', auth.teacher.username, 'EXPORT_XLSX', 'REPORT', '', body.token, body.device);
    return { ok: true, format: 'XLSX', filename: 'LAUDATO_QUEST_Report_' + stamp + '.xlsx', base64: Utilities.base64Encode(blob.getBytes()), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  return fail_('INVALID_EXPORT_FORMAT', 'รองรับ CSV หรือ XLSX');
}

function buildResearchReport_() {
  const students = readObjects_(APP.SHEETS.STUDENTS).filter(s => String(s.Status || 'Active').toLowerCase() !== 'inactive');
  const missions = readObjects_(APP.SHEETS.MISSIONS).filter(r => isTrue_(r.IsActive)).sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0));
  const progress = readObjects_(APP.SHEETS.PROGRESS);
  const scores = readObjects_(APP.SHEETS.RESEARCH_SCORES).filter(r => String(r.Status || '') === 'Completed');
  const reflections = readObjects_(APP.SHEETS.REFLECTIONS);
  const header = ['StudentID','FullName','Class','LastLogin','Pre_D1','Pre_D2','Pre_D3','Pre_D4','Pre_Overall'].concat(missions.map(m => String(m.MissionID || '') + '_Score')).concat(['CompletedMissions','TotalEcoPoints','Post_D1','Post_D2','Post_D3','Post_D4','Post_Overall','Status']);
  const rows = [header];
  students.forEach(s => {
    const sid = String(s.StudentID || '').trim();
    const pre = latestScoreFromRows_(scores, sid, 'PRE'); const post = latestScoreFromRows_(scores, sid, 'POST');
    const p = progress.filter(x => String(x.StudentID || '').trim() === sid);
    const missionScores = missions.map(m => { const x = p.find(z => String(z.MissionID || '') === String(m.MissionID || '')); return x ? Number(x.Score || 0) : ''; });
    const completed = p.filter(x => String(x.Status || '') === 'Completed').length;
    const status = post ? 'Completed' : (completed >= missions.length && missions.length ? 'Waiting Posttest' : (p.length || pre || s.LastLogin ? 'In Progress' : 'Not Started'));
    rows.push([sid,String(s.FullName || ''),String(s.Class || ''),dateIso_(s.LastLogin), pre ? Number(pre.Domain1Score || 0) : '', pre ? Number(pre.Domain2Score || 0) : '', pre ? Number(pre.Domain3Score || 0) : '', pre ? Number(pre.Domain4Score || 0) : '', pre ? Number(pre.OverallScore || 0) : ''].concat(missionScores).concat([completed,Number(s.TotalEcoPoints || 0),post ? Number(post.Domain1Score || 0) : '',post ? Number(post.Domain2Score || 0) : '',post ? Number(post.Domain3Score || 0) : '',post ? Number(post.Domain4Score || 0) : '',post ? Number(post.OverallScore || 0) : '',status]));
  });
  const scoreRows = [['StudentID','Phase','StartedAt','CompletedAt','Domain1','Domain2','Domain3','Domain4','Overall','ItemCount']].concat(scores.map(r => [String(r.StudentID || ''),String(r.Phase || ''),dateIso_(r.StartedAt),dateIso_(r.CompletedAt),Number(r.Domain1Score || 0),Number(r.Domain2Score || 0),Number(r.Domain3Score || 0),Number(r.Domain4Score || 0),Number(r.OverallScore || 0),Number(r.ItemCount || 0)]));
  const progressRows = [['StudentID','MissionID','Status','Score','Attempts','StartedAt','CompletedAt','BadgeID']].concat(progress.map(r => [String(r.StudentID || ''),String(r.MissionID || ''),String(r.Status || ''),Number(r.Score || 0),Number(r.Attempts || 0),dateIso_(r.StartedAt),dateIso_(r.CompletedAt),String(r.BadgeID || '')]));
  const reflectionRows = [['Timestamp','StudentID','MissionID','ReflectionText','EcoCommitment','Reviewed']].concat(reflections.map(r => [dateIso_(r.Timestamp),String(r.StudentID || ''),String(r.MissionID || ''),String(r.ReflectionText || ''),String(r.EcoCommitment || ''),isTrue_(r.Reviewed)]));
  return { rows, scoreRows, progressRows, reflectionRows };
}

function teacherCreateBackup_(body) {
  const auth = requireTeacher_(body.token);
  if (!auth.ok) return auth;
  const result = createBackupCopy_('MANUAL');
  logActivity_('TEACHER', auth.teacher.username, 'BACKUP_CREATE', result.name, '', body.token, body.device);
  return { ok: true, backup: result };
}

function createBackupCopy_(source) {
  const settings = settingsObject_();
  if (!isTrue_(settings.BACKUP_ENABLED)) throw new Error('ระบบสำรองข้อมูลถูกปิด');
  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd_HHmmss');
  const name = 'LAUDATO_QUEST_BACKUP_' + stamp + '_' + source;
  const file = DriveApp.getFileById(APP.SPREADSHEET_ID);
  const folderId = String(settings.BACKUP_FOLDER_ID || '').trim();
  const copy = folderId ? file.makeCopy(name, DriveApp.getFolderById(folderId)) : file.makeCopy(name);
  return { id: copy.getId(), name: copy.getName(), url: copy.getUrl(), createdAt: nowIso_() };
}

function scheduledDailyBackup() {
  try { const result = createBackupCopy_('DAILY'); logActivity_('SYSTEM', 'SYSTEM', 'BACKUP_DAILY', result.name, '', '', ''); }
  catch (err) { console.error(err); }
}

function setupDailyBackup() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'scheduledDailyBackup').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('scheduledDailyBackup').timeBased().everyDays(1).atHour(2).create();
  return 'Daily backup trigger created';
}

function latestScoreFromRows_(rows, studentId, phase) {
  return rows.filter(r => String(r.StudentID || '').trim() === studentId && String(r.Phase || '').toUpperCase() === phase).sort((a,b) => new Date(b.CompletedAt || 0) - new Date(a.CompletedAt || 0))[0] || null;
}

function rowsToCsv_(rows) {
  return rows.map(row => row.map(v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"').join(',')).join('\r\n');
}

function writeMatrix_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(1,1,rows.length,rows[0].length).setValues(rows);
}

function sha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}
