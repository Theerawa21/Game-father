const TEACHER_SESSION_SECONDS = 21600;

function teacherLogin_(body) {
  const settings = settingsObject_();
  const username = cleanText_(body.username || '', 80);
  const pin = String(body.pin || '').trim();
  const expectedUser = String(settings.TEACHER_USERNAME || 'teacher').trim();
  const expectedHash = String(settings.TEACHER_PIN_HASH || '').trim().toLowerCase();

  if (!username || !pin) {
    return { ok: false, error: 'MISSING_TEACHER_LOGIN', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  }
  if (username !== expectedUser || sha256_(pin) !== expectedHash) {
    return { ok: false, error: 'INVALID_TEACHER_LOGIN', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }

  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('teacher:' + token, JSON.stringify({
    username: expectedUser,
    name: String(settings.TEACHER_NAME || 'ครูผู้สอน'),
    createdAt: nowIso_()
  }), TEACHER_SESSION_SECONDS);

  return {
    ok: true,
    token,
    expiresIn: TEACHER_SESSION_SECONDS,
    teacher: { username: expectedUser, name: String(settings.TEACHER_NAME || 'ครูผู้สอน') }
  };
}

function teacherDashboard_(body) {
  const teacher = requireTeacher_(body.token);
  if (!teacher.ok) return teacher;

  const settings = settingsObject_();
  const studentsRaw = readObjects_(APP.SHEETS.STUDENTS).filter(r => String(r.Status || 'Active').toLowerCase() !== 'inactive');
  const missionsRaw = readObjects_(APP.SHEETS.MISSIONS)
    .filter(r => isTrue_(r.IsActive))
    .sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0));
  const progressRaw = readObjects_(APP.SHEETS.PROGRESS);

  const realStudents = studentsRaw.filter(r => String(r.Nickname || '').toUpperCase() !== 'TEST' && String(r.StudentID || '') !== '12345');
  const studentRows = studentsRaw.map(s => {
    const sid = String(s.StudentID || '').trim();
    const p = progressRaw.filter(x => String(x.StudentID || '').trim() === sid);
    const started = new Set(p.map(x => String(x.MissionID || '')).filter(Boolean)).size;
    const completed = new Set(p.filter(x => String(x.Status || '') === 'Completed').map(x => String(x.MissionID || ''))).size;
    return {
      studentId: sid,
      fullName: String(s.FullName || ''),
      className: String(s.Class || ''),
      nickname: String(s.Nickname || ''),
      lastLogin: dateIso_(s.LastLogin),
      totalEcoPoints: Number(s.TotalEcoPoints || 0),
      currentLevel: String(s.CurrentLevel || 'Eco Explorer'),
      startedMissions: started,
      completedMissions: completed,
      isTest: String(s.Nickname || '').toUpperCase() === 'TEST' || sid === '12345'
    };
  }).sort((a,b) => a.studentId.localeCompare(b.studentId, 'th'));

  const realIds = new Set(realStudents.map(s => String(s.StudentID || '').trim()));
  const realRows = studentRows.filter(s => realIds.has(s.studentId));
  const loggedInStudents = realRows.filter(s => Boolean(s.lastLogin)).length;
  const startedStudents = realRows.filter(s => s.startedMissions > 0).length;
  const completedStudents = realRows.filter(s => s.completedMissions >= missionsRaw.length && missionsRaw.length > 0).length;
  const averagePoints = realRows.length ? realRows.reduce((sum,s) => sum + Number(s.totalEcoPoints || 0), 0) / realRows.length : 0;

  const missionStats = missionsRaw.map(m => {
    const mid = String(m.MissionID || '');
    const rows = progressRaw.filter(p => realIds.has(String(p.StudentID || '').trim()) && String(p.MissionID || '') === mid);
    return {
      missionId: mid,
      title: String(m.TitleTH || ''),
      topic: String(m.LaudatoTopic || ''),
      started: new Set(rows.map(r => String(r.StudentID || ''))).size,
      completed: new Set(rows.filter(r => String(r.Status || '') === 'Completed').map(r => String(r.StudentID || ''))).size
    };
  });

  return {
    ok: true,
    teacher: teacher.teacher,
    gameStatus: String(settings.GAME_STATUS || 'OPEN'),
    generatedAt: nowIso_(),
    summary: {
      totalStudents: realRows.length,
      loggedInStudents,
      startedStudents,
      completedStudents,
      averagePoints: Math.round(averagePoints * 10) / 10
    },
    missions: missionsRaw.map(m => ({ missionId: String(m.MissionID || ''), title: String(m.TitleTH || ''), topic: String(m.LaudatoTopic || '') })),
    missionStats,
    students: studentRows
  };
}

function teacherStudentDetail_(body) {
  const teacher = requireTeacher_(body.token);
  if (!teacher.ok) return teacher;

  const studentId = cleanId_(body.studentId);
  if (!studentId) return { ok: false, error: 'MISSING_STUDENT_ID', message: 'ไม่พบรหัสนักเรียน' };
  const student = getStudentSafe_(studentId);
  if (!student) return { ok: false, error: 'STUDENT_NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' };

  const missionMap = {};
  readObjects_(APP.SHEETS.MISSIONS).forEach(m => { missionMap[String(m.MissionID || '')] = String(m.TitleTH || ''); });
  const progress = getStudentProgressData_(studentId).map(p => ({
    ...p,
    missionTitle: missionMap[p.missionId] || p.missionId
  })).sort((a,b) => String(a.missionId).localeCompare(String(b.missionId)));

  const responses = readObjects_(APP.SHEETS.RESPONSES).filter(r => String(r.StudentID || '').trim() === studentId);
  const reflections = readObjects_(APP.SHEETS.REFLECTIONS)
    .filter(r => String(r.StudentID || '').trim() === studentId)
    .map(r => ({
      reflectionId: String(r.ReflectionID || ''),
      timestamp: dateIso_(r.Timestamp),
      missionId: String(r.MissionID || ''),
      missionTitle: missionMap[String(r.MissionID || '')] || String(r.MissionID || ''),
      reflectionText: String(r.ReflectionText || ''),
      ecoCommitment: String(r.EcoCommitment || ''),
      reviewed: isTrue_(r.Reviewed)
    })).sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  return {
    ok: true,
    student,
    completedMissions: progress.filter(p => p.status === 'Completed').length,
    responseCount: responses.length,
    progress,
    reflections
  };
}

function requireTeacher_(token) {
  token = cleanText_(token || '', 160);
  if (!token) return { ok: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบครูอีกครั้ง' };
  const cached = CacheService.getScriptCache().get('teacher:' + token);
  if (!cached) return { ok: false, error: 'UNAUTHORIZED', message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' };
  try { return { ok: true, teacher: JSON.parse(cached) }; }
  catch (_) { return { ok: false, error: 'UNAUTHORIZED', message: 'Session ไม่ถูกต้อง' }; }
}

function sha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}
