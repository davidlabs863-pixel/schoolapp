import { academyRoleData, allGrades, grades, subjects, lessons, slideDeck, stats, getAllLessons, getGrade, getLesson, getSubject } from './data.js?v=20260928-live-refresh';
import { authConfig, extractSessionFromUrl, getProfile, getSession, getSharedLessons, initializeAuth, localProfile, saveOnboarding, saveSharedLesson, signInWithGoogle, signOut, uploadLessonVideo } from './js/auth.js?v=20260928-live-refresh';

const page = document.body.dataset.page;
const app = document.querySelector('#app');
const params = new URLSearchParams(window.location.search);
const protectedPages = new Set(['dashboard', 'grades', 'subjects', 'lesson', 'teacher', 'slides']);
let currentUser = null;
let currentProfile = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const getUserRole = () => (currentProfile?.requested_role || currentUser?.requested_role || getLastKnownProfile()?.requested_role || 'student').toLowerCase();
const subjectName = (id) => getSubject(id).name;
const icon = (symbol) => `<span class="side-icon">${symbol}</span>`;
const getStoredProfile = (userId) => {
  if (!userId) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(`opta-profile:${userId}`) || 'null');
    return stored || null;
  } catch (error) {
    return null;
  }
};
const getLastKnownProfile = () => {
  const activeId = localStorage.getItem('opta-active-profile-id');
  if (!activeId) return null;
  return getStoredProfile(activeId);
};
const persistActiveProfile = (profile) => {
  if (!profile?.id) return;
  localStorage.setItem('opta-active-profile-id', profile.id);
  localStorage.setItem(`opta-profile:${profile.id}`, JSON.stringify(profile));
};
const getGoogleDisplayName = () => currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.user_metadata?.given_name || currentUser?.displayName || currentUser?.full_name || currentProfile?.full_name || getLastKnownProfile()?.full_name || '';
const getAccountAvatar = () => currentUser?.photoURL || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || currentUser?.user_metadata?.image_url || currentUser?.avatar_url || currentProfile?.avatar_url || currentProfile?.picture || getLastKnownProfile()?.avatar_url || getLastKnownProfile()?.picture || '';
const userName = () => getGoogleDisplayName() || 'Learner';
const userInitials = () => userName().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function getDurationMinutes(value = '0 min') {
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getLiveClasses() {
  const defaults = [
    { id: 'class-1', title: 'Grade 7 Mathematics Clinic', grade: 7, subject: 'math', teacher: 'Amaka Okoye', time: 'Today · 3:00 PM', students: 18, status: 'Live', teacherId: 'default-teacher' },
    { id: 'class-2', title: 'Grade 5 Reading Circle', grade: 5, subject: 'english', teacher: 'Sarah Bello', time: 'Tomorrow · 4:30 PM', students: 12, status: 'Scheduled', teacherId: 'default-teacher' },
    { id: 'class-3', title: 'Grade 9 Science Lab', grade: 9, subject: 'science', teacher: 'David Mensah', time: 'Friday · 9:00 AM', students: 21, status: 'Planned', teacherId: 'default-teacher' }
  ];
  try {
    const stored = JSON.parse(localStorage.getItem('learn-fola-live-classes') || '[]');
    return Array.isArray(stored) && stored.length ? [...defaults, ...stored] : defaults;
  } catch (error) {
    return defaults;
  }
}

function pairLiveClassesForRole(profileRole) {
  const gradeId = Number(currentProfile?.grade_id || currentUser?.grade_id || 7);
  const teacherId = currentUser?.id || currentUser?.uid || 'default-teacher';
  const selectedClasses = Array.isArray(currentProfile?.class_ids) ? currentProfile.class_ids : [];

  if (profileRole === 'teacher') {
    if (selectedClasses.includes('all')) return getLiveClasses();
    const allowedGrades = selectedClasses.filter((value) => value !== 'all').map((value) => Number(value));
    if (allowedGrades.length) {
      return getLiveClasses().filter((entry) => allowedGrades.includes(Number(entry.grade)) || entry.teacherId === teacherId || entry.teacherId === 'default-teacher');
    }
    return getLiveClasses().filter((entry) => entry.teacherId === teacherId || entry.teacherId === 'default-teacher');
  }

  return getLiveClasses().filter((entry) => Number(entry.grade) === gradeId);
}

function getTeacherClassOptions() {
  const currentClasses = Array.isArray(currentProfile?.class_ids) ? currentProfile.class_ids : [];
  if (!currentClasses.length) return allGrades.map((grade) => String(grade.id));
  if (currentClasses.includes('all')) return ['all', ...allGrades.map((grade) => String(grade.id))];
  return [...new Set(currentClasses.map((value) => String(value)))];
}

function getTeacherAssessments() {
  const defaults = [
    { id: 'assessment-1', title: 'Grade 7 Mathematics Exit Quiz', classId: '7', subject: 'math', due: 'Tomorrow · 2:00 PM', status: 'Ready', questions: 12 },
    { id: 'assessment-2', title: 'Grade 5 Reading Checkpoint', classId: '5', subject: 'english', due: 'Friday · 11:30 AM', status: 'Draft', questions: 8 }
  ];

  try {
    const stored = JSON.parse(localStorage.getItem('learn-fola-assessments') || '[]');
    return Array.isArray(stored) && stored.length ? [...defaults, ...stored] : defaults;
  } catch (error) {
    return defaults;
  }
}

function getStudentAssessments() {
  const studentGrade = String(Number(currentProfile?.grade_id || currentUser?.grade_id || 7));
  const selectedClasses = Array.isArray(currentProfile?.class_ids) ? currentProfile.class_ids.map(String) : [];

  return getTeacherAssessments().filter((assessment) => {
    const targetClass = String(assessment.classId || '');
    if (!targetClass) return false;
    if (selectedClasses.includes('all')) return true;
    return targetClass === studentGrade || selectedClasses.includes(targetClass);
  });
}

function getAssessmentResults() {
  try {
    return JSON.parse(localStorage.getItem('learn-fola-assessment-results') || '[]');
  } catch (error) {
    return [];
  }
}

function buildAssessmentQuestionBlock(index) {
  return `
    <div class="assessment-question" data-question-index="${index}">
      <div class="form-group full"><label>Question ${index + 1}</label><input class="field" name="assessment-question" placeholder="Type your question" required /></div>
      <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:10px;">
        <div class="form-group"><label>Option A</label><input class="field" name="assessment-option-a" placeholder="Answer A" required /></div>
        <div class="form-group"><label>Option B</label><input class="field" name="assessment-option-b" placeholder="Answer B" required /></div>
        <div class="form-group"><label>Option C</label><input class="field" name="assessment-option-c" placeholder="Answer C" required /></div>
        <div class="form-group"><label>Option D</label><input class="field" name="assessment-option-d" placeholder="Answer D" required /></div>
      </div>
      <div class="form-group"><label>Correct answer</label><select class="select-field" name="assessment-correct">
        <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
      </select></div>
    </div>
  `;
}

function getStudentDashboardData() {
  const gradeId = Number(currentProfile?.grade_id || currentUser?.grade_id || 7);
  const catalog = getLessonCatalog();
  const relevantLessons = catalog.filter((lesson) => (!lesson.grade || lesson.grade === gradeId) || lesson.className === 'General Knowledge');
  const subjectMap = ['math', 'english', 'science', 'history', 'computer', 'geography'];
  const progress = subjectMap.map((subjectId) => {
    const subjectLessons = relevantLessons.filter((lesson) => lesson.subject === subjectId);
    const value = subjectLessons.length ? Math.min(96, 35 + subjectLessons.length * 12) : 18 + Math.random() * 18;
    return { label: getSubject(subjectId).name, value: Math.round(value), tone: subjectId === 'math' ? 'coral' : subjectId === 'english' ? 'mint' : subjectId === 'science' ? 'amber' : 'coral' };
  });

  const recent = relevantLessons.slice(0, 3).map((lesson) => ({
    title: lesson.title,
    detail: `${lesson.topic} · ${lesson.difficulty}`,
    badge: lesson.videoType === 'upload' ? '▣' : '▶'
  }));

  const liveClasses = pairLiveClassesForRole('student').slice(0, 2);
  const totalMinutes = relevantLessons.reduce((sum, lesson) => sum + getDurationMinutes(lesson.duration), 0);
  const completed = Math.max(6, relevantLessons.length + 10);
  const savedCount = getLessonHistory().length + Math.max(0, relevantLessons.length - 2);

  return {
    dateLabel: 'Today',
    name: userName(),
    liveClasses,
    metrics: [
      { label: 'Learning streak', value: `${Math.min(12, 3 + Math.max(0, Math.floor(relevantLessons.length / 2)))} days`, delta: '+1 from last week' },
      { label: 'Lessons completed', value: String(completed), delta: `+${Math.max(3, Math.floor(relevantLessons.length / 2))} this month` },
      { label: 'Watch time', value: `${(totalMinutes / 60).toFixed(1)}h`, delta: '+12% this month' },
      { label: 'Saved for later', value: String(savedCount), delta: `${Math.max(1, Math.floor(savedCount / 3))} new this week` }
    ],
    progress,
    recent
  };
}

function authLogo() { return 'learn%20with%20fola.jpeg'; }

function applyBranding() {
  document.querySelectorAll('.brand').forEach((brand) => {
    brand.innerHTML = `<img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola`;
  });
  document.querySelectorAll('.breadcrumb span').forEach((item) => { item.textContent = 'Learn With Fola'; });
  document.querySelectorAll('.hero-logo').forEach((logo) => {
    logo.src = authLogo();
    logo.alt = 'Learn With Fola logo';
  });
  document.querySelectorAll('.footer strong').forEach((item) => { item.textContent = 'Learn With Fola'; });
  document.querySelectorAll('.footer span').forEach((item) => { item.innerHTML = item.innerHTML.replaceAll('OPTA X EDU', 'Learn With Fola').replaceAll('Learning with momentum.', 'Educate · Inspire · Empower.'); });
  document.querySelectorAll('.onboarding-heading h1').forEach((heading) => { heading.textContent = heading.textContent.replaceAll('OPTA X EDU', 'Learn With Fola'); });
}

function authScreen(message = '') {
  return `<main class="auth-screen"><section class="auth-card reveal"><img class="auth-logo" src="${authLogo()}" alt="Learn With Fola logo"><div class="auth-kicker">Your digital classroom</div><h1>Learn with Fola.</h1><p>Your digital classroom for learning, teaching and connecting.</p><button class="google-button" id="google-sign-in"><svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z"/><path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.6Z"/><path fill="#FBBC05" d="M6.53 13.7A5.86 5.86 0 0 1 6.22 12c0-.59.11-1.17.31-1.7V7.77H3.28A9.73 9.73 0 0 0 2.25 12c0 1.53.37 2.98 1.03 4.23l3.25-2.53Z"/><path fill="#EA4335" d="M12 6.27c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.34 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.72 5.37l3.25 2.53C7.3 7.99 9.46 6.27 12 6.27Z"/></svg>Continue with Google</button>${message ? `<div class="auth-message" role="alert">${escapeHtml(message)}</div>` : ''}<small>By continuing, you agree to use Learn With Fola for education and learning.</small></section></main>`;
}

function preloaderScreen() {
  return `<main class="preloader-screen"><div class="preloader-content"><img src="${authLogo()}" alt="Learn With Fola logo"><div class="loader-ring"></div><p>LOADING...</p></div></main>`;
}

function roleSelection() {
  const roles = [
    ['student', '⌘', 'STUDENT', 'Learn, watch lessons, catch up and connect with your classmates.'],
    ['teacher', '✎', 'TEACHER', 'Create lessons, organize educational videos and communicate with students.'],
    ['parent', '♡', 'PARENT', "Follow your child's learning progress and communicate with teachers."],
    ['principal', '▦', 'PRINCIPAL', 'Oversee teaching, learning and school communication.']
  ];
  return `<main class="onboarding-screen"><div class="onboarding-wrap"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 1 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">Welcome, ${escapeHtml(userName())}</div><h1>How will you use Learn With Fola?</h1><p>Choose your role to continue.</p><div class="role-lock-note">One account, one role at a time.</div></div><div class="role-grid">${roles.map(([id, symbol, title, description]) => `<button class="role-card" data-role="${id}"><span class="role-icon">${symbol}</span><strong>${title}</strong><span>${description}</span><b>Continue <i>→</i></b></button>`).join('')}</div><button class="text-button" id="auth-sign-out">Sign out</button></div></main>`;
}

function roleOnboarding(role) {
  if (role === 'student') return `<main class="onboarding-screen"><div class="onboarding-wrap narrow"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 2 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">Student setup</div><h1>What class are you in?</h1><p>Choose your grade so we can shape your learning space.</p></div><div class="grade-choice-grid">${allGrades.map((grade) => `<button class="grade-choice" data-grade="${grade.id}"><strong>${grade.label}</strong><span>${grade.description}</span><i>→</i></button>`).join('')}</div><button class="text-button" id="back-to-roles">← Back to roles</button></div></main>`;

  const selectedClasses = Array.isArray(currentProfile?.class_ids) ? currentProfile.class_ids : [];
  const gradeChoices = allGrades.map((grade) => {
    const isSelected = selectedClasses.includes(String(grade.id));
    return `<button class="grade-choice ${isSelected ? 'selected' : ''}" data-class-choice="${grade.id}" type="button"><strong>${grade.label}</strong><span>${grade.description}</span><i>→</i></button>`;
  }).join('');
  const allClassesChoice = role === 'principal' ? `<button class="grade-choice ${selectedClasses.includes('all') ? 'selected' : ''}" data-class-choice="all" type="button"><strong>All classes</strong><span>Manage every class in the school.</span><i>→</i></button>` : '';

  const copy = { teacher: ['Teacher setup', 'Which classes do you teach?', 'Choose the classes you teach and then continue to your workspace.'], parent: ['Parent setup', 'Stay close to their learning.', 'Your parent access request will be reviewed before family tools are enabled.'], principal: ['Principal setup', 'Which classes do you oversee?', 'Only the principal can select all classes. Use this to manage school-wide access and reports.'] }[role];

  return `<main class="onboarding-screen"><div class="onboarding-wrap narrow"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 2 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">${copy[0]}</div><h1>${copy[1]}</h1><p>${copy[2]}</p></div><div class="grade-choice-grid">${gradeChoices}${allClassesChoice}</div><button class="btn btn-primary" id="finish-onboarding">Continue to dashboard →</button><button class="text-button" id="back-to-roles">← Back to roles</button></div></main>`;
}

function renderAuthFlow() {
  const storedProfile = getLastKnownProfile();
  if (!currentUser && storedProfile) currentProfile = storedProfile;

  if (!currentUser && !storedProfile) {
    if (protectedPages.has(page)) {
      window.location.href = 'index.html';
      return;
    }
    if (page === 'home') {
      app.innerHTML = home();
      applyBranding();
      bindEvents();
      return;
    }
    app.innerHTML = authScreen(authConfig.configured ? '' : 'Supabase is not configured yet. Add your project URL and anon key to enable Google sign-in.');
    applyBranding();
    bindAuthEvents();
    return;
  }

  if (!currentUser && currentProfile?.requested_role) {
    render();
    return;
  }

  if (!currentProfile?.requested_role) {
    app.innerHTML = roleSelection();
    applyBranding();
    bindAuthEvents();
    return;
  }

  if (currentProfile.requested_role === 'student' && !currentProfile.grade_id) {
    app.innerHTML = roleOnboarding('student');
    applyBranding();
    bindAuthEvents();
    return;
  }

  if (['teacher', 'principal'].includes(currentProfile.requested_role) && !Array.isArray(currentProfile.class_ids) || (Array.isArray(currentProfile.class_ids) && currentProfile.class_ids.length === 0)) {
    app.innerHTML = roleOnboarding(currentProfile.requested_role);
    applyBranding();
    bindAuthEvents();
    return;
  }

  render();
}

function bindAuthEvents() {
  document.querySelector('#google-sign-in')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    app.innerHTML = preloaderScreen();

    const result = await signInWithGoogle();
    if (result.error) {
      app.innerHTML = authScreen(result.error.message || 'Google sign-in could not start.');
      event.currentTarget.disabled = false;
      return;
    }

    if (result.redirecting) {
      return;
    }

    app.innerHTML = authScreen('Google sign-in was started. Complete the redirect in your browser.');
    event.currentTarget.disabled = false;
  });
  document.querySelector('#auth-sign-out')?.addEventListener('click', signOut);
  document.querySelectorAll('[data-role]').forEach((card) => card.addEventListener('click', async () => {
    const role = card.dataset.role;
    if (currentProfile?.requested_role && currentProfile.requested_role !== role) {
      showToast('One account can only have one role at a time.');
      return;
    }
    currentProfile = { ...(currentProfile || {}), requested_role: role, id: currentProfile?.id || currentUser?.uid || 'guest', class_ids: role === 'teacher' || role === 'principal' ? [] : currentProfile?.class_ids || [] };
    persistActiveProfile(currentProfile);
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: role }).catch((error) => console.error('Role preference could not be saved', error));
  }));
  document.querySelectorAll('[data-grade]').forEach((card) => card.addEventListener('click', async () => {
    const grade = Number(card.dataset.grade);
    currentProfile = { ...(currentProfile || {}), id: currentProfile?.id || currentUser?.uid || 'guest', grade_id: grade, onboarding_complete: true };
    persistActiveProfile(currentProfile);
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: 'student', grade_id: grade }).catch((error) => console.error('Grade preference could not be saved', error));
  }));
  document.querySelectorAll('[data-class-choice]').forEach((card) => {
    const choice = card.dataset.classChoice;
    const selected = Array.isArray(currentProfile?.class_ids) && currentProfile.class_ids.includes(choice);
    card.classList.toggle('selected', Boolean(selected));
    card.addEventListener('click', () => {
      if (choice === 'all' && currentProfile?.requested_role !== 'principal') {
        showToast('Only principals can choose all classes.');
        return;
      }

      const nextClasses = new Set(Array.isArray(currentProfile?.class_ids) ? currentProfile.class_ids : []);
      if (choice === 'all') {
        if (nextClasses.has('all')) {
          nextClasses.delete('all');
        } else {
          nextClasses.clear();
          nextClasses.add('all');
        }
      } else {
        if (nextClasses.has('all')) nextClasses.delete('all');
        if (nextClasses.has(choice)) nextClasses.delete(choice);
        else nextClasses.add(choice);
      }

      currentProfile = { ...(currentProfile || {}), id: currentProfile?.id || currentUser?.uid || 'guest', class_ids: [...nextClasses] };
      persistActiveProfile(currentProfile);
      card.classList.toggle('selected', nextClasses.has(choice));
    });
  });
  document.querySelector('#finish-onboarding')?.addEventListener('click', async () => {
    const role = currentProfile?.requested_role;
    if (['teacher', 'principal'].includes(role) && (!Array.isArray(currentProfile?.class_ids) || currentProfile.class_ids.length === 0)) {
      showToast('Please select at least one class before continuing.');
      return;
    }
    if (role === 'teacher' && currentProfile?.class_ids?.includes('all')) {
      showToast('Teachers cannot select all classes. Choose the classes you teach.');
      return;
    }

    currentProfile = { ...(currentProfile || {}), id: currentProfile?.id || currentUser?.uid || 'guest', onboarding_complete: true };
    persistActiveProfile(currentProfile);
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: currentProfile.requested_role, class_ids: currentProfile.class_ids || [] }).catch((error) => console.error('Role request could not be saved', error));
  });
  document.querySelector('#back-to-roles')?.addEventListener('click', () => { currentProfile = { ...(currentProfile || {}), id: currentProfile?.id || currentUser?.uid || 'guest', requested_role: null, grade_id: null, class_ids: [] }; if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile)); persistActiveProfile(currentProfile); renderAuthFlow(); });
}

function navLink(href, label, symbol, active = false) { return `<a class="side-link ${active ? 'active' : ''}" href="${href}">${icon(symbol)}${label}</a>`; }

function shell(content, title = 'Overview') {
  const role = getUserRole();
  const isTeacher = page === 'teacher' || page === 'slides';
  const showDashboard = !['teacher', 'principal'].includes(role);
  const showGrades = !['teacher', 'principal'].includes(role);
  const showSubjects = !['teacher', 'principal'].includes(role);
  const showTeacherStudio = ['teacher', 'principal'].includes(role) || isTeacher;
  const showSlides = ['teacher', 'principal'].includes(role) || page === 'slides';
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="index.html"><span class="brand-mark">X</span>Learn With Fola</a>
      <div class="side-label">Learn</div>
      ${showDashboard ? navLink('dashboard.html', 'My dashboard', '⌂', page === 'dashboard') : ''}
      ${showGrades ? navLink('grades.html', 'Browse grades', '▦', page === 'grades' || page === 'subjects') : ''}
      ${showSubjects ? navLink('subjects.html', 'Subjects', '✦', page === 'subjects') : ''}
      <div class="side-label">Workspace</div>
      ${showTeacherStudio ? navLink('teacher.html', 'Teacher studio', '✎', isTeacher) : ''}
      ${showSlides ? navLink('slides.html', 'Slide creator', '▤', page === 'slides') : ''}
      <div class="side-label">Your space</div>
      ${showDashboard ? navLink('dashboard.html#saved', 'Saved lessons', '♡') : ''}
      ${showDashboard ? navLink('dashboard.html#progress', 'My progress', '◔') : ''}
      <div class="sidebar-footer"><strong>Learning streak</strong>3 days in a row. Keep the momentum going.</div>
    </aside>
    <main class="app-main">
      <header class="app-topbar"><div class="breadcrumb"><span>Learn With Fola</span> <b>/</b> <strong>${title}</strong></div><div class="search-box">⌕ <input id="global-search" placeholder="Search lessons, topics..." aria-label="Search lessons" /></div><div class="top-actions"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open menu">☰</button><div class="avatar">${getAccountAvatar() ? `<img src="${escapeHtml(getAccountAvatar())}" alt="${escapeHtml(userName())}" />` : userInitials()}</div></div></header>
      ${content}
    </main>
  </div><div class="toast" id="toast"></div>`;
}

function lessonCard(lesson) {
  const classLabel = lesson.className || (lesson.grade ? `Grade ${lesson.grade}` : 'General Knowledge');
  return `<article class="lesson-card reveal"><div class="lesson-thumb"><img src="${lesson.thumbnail}" alt="${escapeHtml(lesson.title)} thumbnail" loading="lazy"><span class="lesson-tag">${classLabel} · ${subjectName(lesson.subject)}</span><span class="play">▶</span></div><div class="lesson-body"><div class="lesson-meta"><span>${lesson.topic}</span><span>·</span><span>${lesson.difficulty}</span></div><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description)}</p><div class="lesson-bottom"><small>${lesson.duration} · ${lesson.teacher}</small><a class="text-link" href="lesson.html?id=${lesson.id}">Watch lesson →</a></div></div></article>`;
}

function gradeCard(grade) { return `<a class="grade-card reveal" href="subjects.html?grade=${grade.id}"><div><strong>${grade.label.replace('Grade ', 'G')}</strong><p>${grade.description}</p></div><div class="grade-stats"><span><b>${grade.subjects}</b> subjects</span><span><b>${grade.lessons}</b> lessons</span></div></a>`; }

function getLessonHistory() {
  try { return JSON.parse(localStorage.getItem('learn-fola-lesson-history') || '[]'); }
  catch { return []; }
}

function getLessonCatalog() {
  const sharedLessons = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('learn-fola-shared-lessons') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      return [];
    }
  })();
  const all = [...lessons, ...getLessonHistory(), ...sharedLessons];
  const deduped = new Map();
  all.forEach((lesson) => {
    if (lesson && lesson.id && !deduped.has(lesson.id)) deduped.set(lesson.id, lesson);
  });
  return [...deduped.values()];
}

function generalKnowledgeLessons() {
  return getLessonCatalog().filter((lesson) => lesson.className === 'General Knowledge');
}

function generalKnowledgePage() {
  const history = generalKnowledgeLessons();
  return shell(`<div class="page"><div class="grade-hero"><div><div class="kicker">Independent class</div><h1>General Knowledge</h1><p>A grade-free class for lessons that help learners understand the world around them.</p></div><a class="btn btn-primary" href="teacher.html">Add class lesson</a></div><div class="section-head"><div><div class="eyebrow">Lesson history</div><h2>${history.length} lessons in General Knowledge</h2><p>New videos published to this class will appear here.</p></div></div><div class="content-grid lesson-grid">${history.length ? history.map(lessonCard).join('') : '<div class="empty-state">No General Knowledge lessons yet. Add the first one from Teacher Studio.</div>'}</div></div>`, 'General Knowledge');
}

function hydrateLessonHistory() {
  getLessonHistory().forEach((lesson) => {
    if (!lessons.some((existing) => existing.id === lesson.id)) lessons.push(lesson);
  });
}

function bindLessonHistoryEvents() {
  const liveForm = document.querySelector('#create-live-class-form');
  if (liveForm && !liveForm.dataset.bound) {
    liveForm.dataset.bound = 'true';
    liveForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = document.querySelector('#live-class-title')?.value?.trim();
      const classValue = document.querySelector('#live-class-class')?.value || '';
      const grade = classValue && classValue !== 'all' ? Number(classValue) : Number(document.querySelector('#live-class-grade')?.value || 7);
      const subject = document.querySelector('#live-class-subject')?.value || 'math';
      const time = document.querySelector('#live-class-time')?.value?.trim() || 'Today · 3:00 PM';
      const students = Number(document.querySelector('#live-class-students')?.value || 18);
      const classEntry = {
        id: `live-${Date.now()}`,
        title: title || `Grade ${grade} ${getSubject(subject).name}`,
        grade,
        subject,
        teacher: userName(),
        time,
        students,
        status: 'Live',
        teacherId: currentUser?.id || currentUser?.uid || 'default-teacher',
        classId: String(classValue || grade)
      };
      const existing = getLiveClasses();
      const updated = [classEntry, ...existing.filter((item) => item.id !== classEntry.id)];
      localStorage.setItem('learn-fola-live-classes', JSON.stringify(updated));
      showToast('Live class scheduled for your students.');
      liveForm.reset();
      document.querySelector('#live-class-form')?.style.setProperty('display', 'none');
      render();
    });
  }

  const assessmentForm = document.querySelector('#create-assessment-form');
  if (assessmentForm && !assessmentForm.dataset.bound) {
    assessmentForm.dataset.bound = 'true';
    const questionList = document.querySelector('#assessment-question-list');
    const addQuestionButton = document.querySelector('#add-assessment-question');
    const ensureQuestionBlocks = () => {
      if (!questionList) return;
      if (!questionList.children.length) {
        questionList.insertAdjacentHTML('beforeend', buildAssessmentQuestionBlock(0));
      }
    };
    ensureQuestionBlocks();

    addQuestionButton?.addEventListener('click', () => {
      if (!questionList) return;
      const nextIndex = questionList.children.length;
      questionList.insertAdjacentHTML('beforeend', buildAssessmentQuestionBlock(nextIndex));
    });

    assessmentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = document.querySelector('#assessment-title')?.value?.trim() || 'New class test';
      const classId = document.querySelector('#assessment-class')?.value || '7';
      const subject = document.querySelector('#assessment-subject')?.value || 'math';
      const due = document.querySelector('#assessment-due')?.value?.trim() || 'Soon';
      const blocks = [...document.querySelectorAll('.assessment-question')];

      const questions = blocks.map((block) => {
        const prompt = block.querySelector('[name="assessment-question"]')?.value?.trim() || '';
        const options = ['A', 'B', 'C', 'D'].map((label) => ({
          label,
          value: block.querySelector(`[name="assessment-option-${label.toLowerCase()}"]`)?.value?.trim() || ''
        }));
        const correct = block.querySelector('[name="assessment-correct"]')?.value || 'A';

        return { prompt, options, correctAnswer: correct };
      }).filter((question) => question.prompt && question.options.every((option) => option.value));

      if (!questions.length) {
        showToast('Add at least one valid question before saving the assessment.');
        return;
      }

      const assessment = {
        id: `assessment-${Date.now()}`,
        title,
        classId: String(classId),
        subject,
        due,
        status: 'Ready',
        questions: questions.length,
        questionBank: questions
      };

      const existing = getTeacherAssessments();
      const updated = [assessment, ...existing.filter((item) => item.id !== assessment.id)];
      localStorage.setItem('learn-fola-assessments', JSON.stringify(updated));
      showToast('Assessment created for this class.');
      assessmentForm.reset();
      if (questionList) questionList.innerHTML = buildAssessmentQuestionBlock(0);
      document.querySelector('#assessment-form')?.style.setProperty('display', 'none');
      render();
    });
  }

  const form = document.querySelector('#create-form');
  if (!form) return;
  const fileInput = document.querySelector('#teacher-video-file');
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = 'true';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      const label = document.querySelector('#teacher-video-file-label');
      if (label) label.textContent = file ? file.name : 'Choose a video file';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = document.querySelector('#teacher-video-file')?.files?.[0];
    const urlInput = document.querySelector('#video');
    const classValue = document.querySelector('#grade')?.value || '';
    const isGeneralKnowledge = classValue === 'general-knowledge';
    const grade = isGeneralKnowledge ? null : Number(classValue.replace('Grade ', ''));
    const subjectValue = document.querySelector('#subject')?.value || '';
    const subject = subjects.find((item) => item.name === subjectValue);

    let uploadResult = { url: '', error: null };
    if (file) {
      uploadResult = await uploadLessonVideo(file);
      if (uploadResult.error || !uploadResult.url) {
        showToast('Your uploaded video could not be saved. Please try another file.');
        return;
      }
    } else {
      const videoId = youtubeId(urlInput?.value || '');
      if (!videoId) {
        showToast('Please add a valid YouTube URL or upload a video file.');
        return;
      }
      uploadResult = { url: `https://www.youtube.com/watch?v=${videoId}`, error: null };
    }

    const lesson = {
      id: `published-${Date.now()}`,
      ownerUid: currentUser?.uid || 'guest',
      grade,
      className: isGeneralKnowledge ? 'General Knowledge' : `Grade ${grade}`,
      subject: subject?.id || 'math',
      unit: 'Teacher library',
      topic: document.querySelector('#topic')?.value || 'New lesson',
      title: document.querySelector('#title')?.value || 'Untitled lesson',
      teacher: document.querySelector('#teacher-name')?.value || userName(),
      duration: document.querySelector('#duration')?.value || 'Video lesson',
      difficulty: document.querySelector('#difficulty')?.value || 'Core',
      description: document.querySelector('#description')?.value || 'A new lesson added to this class history.',
      videoType: file ? 'upload' : 'youtube',
      videoId: file ? null : youtubeId(urlInput?.value || ''),
      videoUrl: file ? uploadResult.url : '',
      thumbnail: file ? 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80' : `https://img.youtube.com/vi/${youtubeId(urlInput?.value || '')}/hqdefault.jpg`,
      status: 'published',
      shared: true,
      featured: false,
      addedAt: new Date().toISOString()
    };

    const history = getLessonHistory();
    history.push(lesson);
    localStorage.setItem('learn-fola-lesson-history', JSON.stringify(history));
    lessons.push(lesson);
    await saveSharedLesson(lesson);
    event.target.reset();
    const teacherFileLabel = document.querySelector('#teacher-video-file-label');
    if (teacherFileLabel) teacherFileLabel.textContent = 'Choose a video file';
    event.target.dataset.historySaved = 'true';
    showToast('Lesson added and shared for all learners.');
  });
}

function home() {
  const featured = getLessonCatalog().filter((lesson) => lesson.featured);
  const role = getUserRole();
  const signedIn = Boolean(currentUser || currentProfile);
  const showExplore = !['teacher', 'principal'].includes(role);
  const showMyLearning = !['teacher', 'principal'].includes(role);
  const showTeacherPortal = !['student', 'parent'].includes(role);
  const accountBadge = getAccountAvatar() ? `<img src="${escapeHtml(getAccountAvatar())}" alt="${escapeHtml(userName())}" />` : `<span>${userInitials()}</span>`;
  const signInButton = signedIn ? `<button class="btn btn-primary btn-small premium-cta profile-button" id="home-profile-button" type="button">${accountBadge}</button>` : `<button class="btn btn-primary btn-small premium-cta" id="home-sign-in">Sign in</button>`;
  const mainCtaHref = signedIn ? (showMyLearning ? 'dashboard.html' : 'teacher.html') : 'grades.html';
  const mainCtaLabel = signedIn ? (showMyLearning ? 'Open dashboard' : 'Open workspace') : 'Start learning';
  return `<header class="site-header premium-header"><a class="brand" href="index.html"><span class="brand-mark">X</span>Learn With Fola</a><nav class="top-nav"><a class="active" href="index.html">Home</a>${showExplore ? '<a href="grades.html">Explore</a>' : ''}${showMyLearning ? '<a href="dashboard.html">My learning</a>' : ''}${showTeacherPortal ? '<a href="teacher.html">For teachers</a>' : ''}</nav><div class="top-actions">${signInButton}${showTeacherPortal && !signedIn ? '<a class="btn btn-ghost btn-small" href="teacher.html">Teacher portal</a>' : ''}<button class="icon-button mobile-menu" id="mobile-menu">☰</button></div></header>
  <main><section class="hero premium-hero"><div class="hero-inner"><div class="reveal"><div class="eyebrow">A smarter way to learn</div><h1>Learn. Watch.<br>Understand. Grow.</h1><p class="hero-copy">Explore educational videos, lesson notes and interactive learning materials from Grade 1 to Grade 12.</p><div class="hero-actions"><a class="btn btn-primary premium-action" href="${mainCtaHref}">${mainCtaLabel} <span>→</span></a>${signedIn ? '<button class="btn btn-ghost premium-action" id="hero-profile-button" type="button">My profile</button>' : '<button class="btn btn-ghost premium-action" id="hero-sign-in" type="button">Sign in</button>'}</div></div><div class="hero-visual"><div class="floating-label label-one">12 grades · one place</div><img class="hero-logo" src="ChatGPT%20Image%20Sep%2021,%202026,%2003_34_29%20PM.png" alt="Learn With Fola logo"><div class="floating-label label-two">+ 18 min of progress</div></div></div></section>
  <section class="section"><div class="section-head"><div><div class="eyebrow">Picked for you</div><h2>Popular lessons</h2><p>Short, clear lessons for curious minds.</p></div><a class="text-link" href="grades.html">View all lessons →</a></div><div class="content-grid lesson-grid">${featured.map(lessonCard).join('')}</div></section>
  <section class="section tinted"><div class="section-head"><div><div class="eyebrow">Find your level</div><h2>Browse by grade</h2><p>Every learner has a next step.</p></div><a class="text-link" href="grades.html">See all 12 grades →</a></div><div class="content-grid grade-strip">${grades.map(gradeCard).join('')}</div></section>
  <section class="section"><div class="section-head"><div><div class="eyebrow">Explore your curiosity</div><h2>Browse by subject</h2></div></div><div class="content-grid subject-grid">${subjects.slice(0, 6).map((subject) => `<a class="subject-card reveal" href="subjects.html?subject=${subject.id}"><div class="subject-icon color-${subject.color}">${subject.icon}</div><h3>${subject.name}</h3><p>${subject.description}</p></a>`).join('')}</div></section></main><footer class="footer"><span><strong>Learn With Fola</strong> · Educate · Inspire · Empower.</span><span>Built for students, teachers and what comes next.</span></footer>`;
}

function examPage(examId) {
  const assessment = getTeacherAssessments().find((item) => item.id === examId);
  if (!assessment) {
    return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Assessment</div><h1>Test not found</h1><p>This assessment is no longer available.</p></div><a class="btn btn-primary" href="dashboard.html">Back to dashboard →</a></div></div>`, 'Assessment');
  }

  const questions = Array.isArray(assessment.questionBank) && assessment.questionBank.length ? assessment.questionBank : Array.from({ length: Math.max(1, Number(assessment.questions || 1)) }, (_, index) => ({
    prompt: `Sample question ${index + 1}`,
    options: [
      { label: 'A', value: 'Option A' },
      { label: 'B', value: 'Option B' },
      { label: 'C', value: 'Option C' },
      { label: 'D', value: 'Option D' }
    ],
    correctAnswer: 'A'
  }));

  const questionMarkup = questions.map((question, index) => `
    <div class="exam-question">
      <h3>Question ${index + 1}: ${escapeHtml(question.prompt)}</h3>
      ${question.options.map((option) => `
        <label class="exam-option">
          <input type="radio" name="question-${index}" value="${option.label}" required />
          <span>${option.label}. ${escapeHtml(option.value)}</span>
        </label>
      `).join('')}
    </div>
  `).join('');

  return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Assessment</div><h1>${escapeHtml(assessment.title)}</h1><p>Grade ${assessment.classId} · ${assessment.subject} · ${assessment.due}</p></div><a class="btn btn-ghost" href="dashboard.html">Exit test</a></div><form id="assessment-attempt-form" data-assessment-id="${assessment.id}"><div class="exam-wrapper">${questionMarkup}</div><div class="form-actions" style="margin-top:20px"><button class="btn btn-primary" type="submit">Submit test</button></div></form></div>`, assessment.title);
}

function dashboard() {
  const studentData = getStudentDashboardData();
  const progressRows = studentData.progress.map((item) => `
    <div class="progress-row">
      <div class="progress-info">${item.label} <span>${item.value}%</span></div>
      <div class="progress-track"><div class="progress-fill ${item.tone === 'mint' ? 'mint' : item.tone === 'amber' ? 'amber' : ''}" style="width:${item.value}%"></div></div>
    </div>
  `).join('');
  const recentRows = studentData.recent.map((item) => `
    <div class="activity">
      <div class="activity-dot">${item.badge}</div>
      <div>
        <p>${item.title}</p>
        <small>${item.detail}</small>
      </div>
    </div>
  `).join('');
  const liveClassRows = (studentData.liveClasses || []).map((liveClass) => `
    <div class="activity">
      <div class="activity-dot">◎</div>
      <div>
        <p>${liveClass.title}</p>
        <small>${liveClass.time} · ${liveClass.teacher} · ${liveClass.status}</small>
      </div>
    </div>
  `).join('') || '<div class="empty-state">No live classes for your grade yet.</div>';
  const metricCards = studentData.metrics.map((item, index) => `
    <div class="metric reveal" style="animation-delay:${index * 90}ms">
      <span class="metric-label">${item.label}</span>
      <div class="stat-number">${item.value}</div>
      <span class="delta">${item.delta}</span>
    </div>
  `).join('');
  const assessmentRows = getStudentAssessments().slice(0, 3).map((assessment) => `
    <div class="activity">
      <div class="activity-dot">✓</div>
      <div style="flex:1">
        <p>${assessment.title}</p>
        <small>${assessment.subject} · Due ${assessment.due}</small>
      </div>
      <a class="btn btn-ghost btn-small" href="dashboard.html?exam=${assessment.id}">Start</a>
    </div>
  `).join('') || '<div class="empty-state">No assessments for your class yet.</div>';
  const resultRows = getAssessmentResults().slice(0, 4).map((result) => `
    <div class="activity">
      <div class="activity-dot">◎</div>
      <div style="flex:1">
        <p>${escapeHtml(result.title)}</p>
        <small>${result.percent}% · ${result.score}/${result.total} correct</small>
      </div>
      <a class="btn btn-ghost btn-small" href="dashboard.html?exam=${result.assessmentId}">Review</a>
    </div>
  `).join('') || '<div class="empty-state">No scores yet. Your latest attempts will appear here.</div>';

  return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">${studentData.dateLabel}</div><h1>Welcome back, ${escapeHtml(studentData.name)}.</h1><p>Pick up where you left off and keep your curiosity moving.</p></div><a class="btn btn-primary" href="grades.html">Find a lesson →</a></div><div class="metrics">${metricCards}</div><div class="dashboard-grid"><section class="panel" id="progress"><div class="panel-heading"><h2>Your progress</h2><span>Across your subjects</span></div>${progressRows}</section><section class="panel"><div class="panel-heading"><h2>Recently watched</h2><span>See all →</span></div>${recentRows}</section></div><div class="panel" style="margin-top:18px"><div class="panel-heading"><h2>Live classes for your grade</h2><span>Join now</span></div>${liveClassRows}</div><div class="panel" style="margin-top:18px"><div class="panel-heading"><h2>Available assessments</h2><span>Class tests</span></div>${assessmentRows}</div><div class="panel" style="margin-top:18px"><div class="panel-heading"><h2>Results history</h2><span>Latest scores</span></div>${resultRows}</div></div>`, 'Dashboard');
}

function gradesPage() {
  return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Your learning map</div><h1>Choose a grade.</h1><p>Start with where you are, then go wherever your questions lead.</p></div><div class="filter-bar"><input class="field" id="grade-search" placeholder="Search a grade..." /></div></div><div class="grade-grid" id="grade-grid">${allGrades.map((grade, index) => gradeCard(grade).replace('class="grade-card reveal"', `class="grade-card reveal" style="animation-delay:${index * 90}ms"`)).join('')}</div></div>`, 'Browse grades');
}

function subjectsPage() {
  const grade = getGrade(params.get('grade') || 7);
  const selectedSubject = params.get('subject');
  const search = (params.get('search') || '').toLowerCase();
  const catalog = getLessonCatalog();
  const filtered = catalog.filter((lesson) => (!params.get('grade') || lesson.grade === grade.id) && (!selectedSubject || lesson.subject === selectedSubject) && (!search || `${lesson.title} ${lesson.topic} ${lesson.description}`.toLowerCase().includes(search)));
  return shell(`<div class="page"><div class="grade-hero"><div><div class="kicker">Grade path</div><h1>${search ? `Search: ${escapeHtml(search)}` : grade.label}</h1><p>${search ? 'Here are the lessons that match your search.' : `${grade.description}. Choose a subject to see its lessons, videos and notes.`}</p></div><a class="btn btn-primary" href="grades.html">Change grade</a></div><div class="section-head"><div><div class="eyebrow">Subjects in this grade</div><h2>Find your next subject</h2></div></div><div class="subjects-grid" style="margin-bottom:40px">${subjects.map((subject, index) => `<a class="subject-card reveal" href="subjects.html?grade=${grade.id}&subject=${subject.id}" style="animation-delay:${index * 90}ms"><div class="subject-icon color-${subject.color}">${subject.icon}</div><h3>${subject.name}</h3><p>${subject.description}</p></a>`).join('')}</div><div class="section-head"><div><div class="eyebrow">${selectedSubject ? subjectName(selectedSubject) : search ? 'Search results' : 'Curated for you'}</div><h2>${selectedSubject ? 'Lessons in this subject' : search ? `${filtered.length} matching lessons` : 'Featured lessons'}</h2></div><div class="filter-bar"><select class="select-field" id="difficulty-filter"><option value="all">All difficulty</option><option value="Core">Core</option><option value="Stretch">Stretch</option></select></div></div><div class="content-grid lesson-grid" id="lesson-results">${filtered.length ? filtered.map((lesson, index) => `${lessonCard(lesson).replace('class="lesson-card reveal"', `class="lesson-card reveal" style="animation-delay:${index * 80}ms"`)}`).join('') : '<div class="empty-state">No lessons found for this selection yet.</div>'}</div></div>`, `${search ? 'Search' : `${grade.label} subjects`}`); }

function lessonPage() { const lesson = getLesson(params.get('id')); return shell(`<div class="page"><div class="video-layout"><div><div class="video-frame">${lesson.videoType === 'upload' && lesson.videoUrl ? `<video class="lesson-video" controls preload="metadata" src="${lesson.videoUrl}"></video>` : `<iframe src="https://www.youtube.com/embed/${lesson.videoId}" title="${escapeHtml(lesson.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`}</div><div class="kicker" style="margin-top:27px">${subjectName(lesson.subject)} · ${lesson.topic}</div><h1 class="lesson-title">${lesson.title}</h1><p class="lesson-subtitle">${lesson.description}</p><div class="lesson-facts"><span class="fact">Grade ${lesson.grade}</span><span class="fact">${lesson.teacher}</span><span class="fact">${lesson.duration}</span><span class="fact">${lesson.difficulty}</span></div><div class="notes"><h2>Lesson notes</h2><section><h3>Introduction</h3><p>Today we are making ${lesson.topic.toLowerCase()} easier to see, talk about and use. Start with the big idea, then use the examples to test your understanding.</p></section><section><h3>Learning objectives</h3><ul><li>Explain the main idea in your own words.</li><li>Recognize the pattern in a new example.</li><li>Use the method to solve a practice question.</li></ul></section><section><h3>Main explanation</h3><p>Good learning is built in small steps. Watch the video once for the story, then pause and replay the worked example. Write down what changes, what stays the same and why the answer makes sense.</p></section><section><h3>Key points</h3><ul><li>Look for the information the question gives you.</li><li>Choose one clear method and show your thinking.</li><li>Check the result against the original question.</li></ul></section><section><h3>Summary</h3><p>You have the building blocks. Next, try the practice questions and explain one answer to someone else.</p></section></div></div><aside><div class="panel"><div class="panel-heading"><h2>Lesson resources</h2></div><div class="resource-list"><a class="resource" href="slides.html">▤ Lesson slides <span>Open →</span></a><a class="resource" href="#notes">▣ Lesson notes <span>Read below</span></a><a class="resource" href="grades.html">▶ Related videos <span>Browse →</span></a><a class="resource" href="#practice">✎ Practice questions <span>Start →</span></a></div><button class="btn btn-soft" style="width:100%;margin-top:16px" id="save-lesson">♡ Save lesson</button></div></aside></div></div>`, `${subjectName(lesson.subject)} / ${lesson.title}`); }

function teacherPage() {
  const teacherData = academyRoleData.teacher || academyRoleData.student;
  const teacherRosters = pairLiveClassesForRole('teacher');
  const teacherClassOptions = getTeacherClassOptions().filter((value) => value !== 'all');
  const assessmentRows = getTeacherAssessments().filter((assessment) => {
    if (teacherClassOptions.length === 0) return true;
    if (teacherClassOptions.includes('all')) return true;
    return teacherClassOptions.includes(String(assessment.classId));
  }).slice(0, 4).map((assessment) => {
    const totalQuestions = Array.isArray(assessment.questionBank) ? assessment.questionBank.length : Number(assessment.questions || 0);
    return `
      <div class="activity">
        <div class="activity-dot">✓</div>
        <div>
          <p>${assessment.title}</p>
          <small>Grade ${assessment.classId} · ${assessment.subject} · ${assessment.due} · ${totalQuestions} questions</small>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state">No assessments created for your class yet.</div>';
  const liveClassRows = teacherRosters.map((classItem) => `
    <div class="activity">
      <div class="activity-dot">◎</div>
      <div>
        <p>${classItem.title}</p>
        <small>${classItem.time} · ${classItem.students} students · ${classItem.status}</small>
      </div>
    </div>
  `).join('') || '<div class="empty-state">No live classes yet. Start one for your class.</div>';
  const supportRows = (teacherData.support || []).map((student) => `
    <div class="activity">
      <div class="activity-dot">${student.name.split(' ')[0][0]}</div>
      <div>
        <p>${student.name}</p>
        <small>${student.subject} · ${student.need}</small>
      </div>
    </div>
  `).join('');
  const assignmentRows = (teacherData.assignments || []).map((item) => `
    <div class="activity">
      <div class="activity-dot">✓</div>
      <div>
        <p>${item.title}</p>
        <small>${item.due} · ${item.status}</small>
      </div>
    </div>
  `).join('');
  const resultSummaryRows = getAssessmentResults().filter((result) => {
    const matchingAssessment = getTeacherAssessments().find((assessment) => assessment.id === result.assessmentId);
    if (!matchingAssessment) return false;
    if (teacherClassOptions.includes('all')) return true;
    return teacherClassOptions.includes(String(matchingAssessment.classId));
  }).slice(0, 4).map((result) => `
    <div class="activity">
      <div class="activity-dot">◎</div>
      <div>
        <p>${escapeHtml(result.title)}</p>
        <small>${result.percent}% scored · ${result.score}/${result.total} correct</small>
      </div>
    </div>
  `).join('') || '<div class="empty-state">No scores yet for your classes.</div>';
  const metricCards = (teacherData.metrics || []).map((item, index) => `
    <div class="metric reveal" style="animation-delay:${index * 90}ms">
      <span class="metric-label">${item.label}</span>
      <div class="stat-number">${item.value}</div>
      <span class="delta">${item.delta}</span>
    </div>
  `).join('');
  const publishedLessons = getLessonCatalog().slice(0, 3).map((lesson, index) => `
    <article class="lesson-card reveal" style="animation-delay:${index * 120}ms">
      <div class="lesson-thumb">
        <img src="${lesson.thumbnail}" alt="${escapeHtml(lesson.title)} thumbnail" loading="lazy">
        <span class="lesson-tag">Grade ${lesson.grade} · ${subjectName(lesson.subject)}</span>
        <span class="play">▶</span>
      </div>
      <div class="lesson-body">
        <div class="lesson-meta"><span>${lesson.topic}</span><span>·</span><span>${lesson.difficulty}</span></div>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.description)}</p>
        <div class="lesson-bottom"><small>${lesson.duration} · ${lesson.teacher}</small><a class="text-link" href="lesson.html?id=${lesson.id}">Open lesson →</a></div>
      </div>
    </article>
  `).join('');
  const classOptionsMarkup = teacherClassOptions.length ? teacherClassOptions.map((gradeId) => `<option value="${gradeId}">${gradeId === 'all' ? 'All classes' : `Grade ${gradeId}`}</option>`).join('') : '<option value="7">Grade 7</option>';

  return shell(`<div class="page">
    <div class="page-heading">
      <div>
        <div class="kicker">Teacher studio</div>
        <h1>Lead learning with clarity.</h1>
        <p>${teacherData.summary}</p>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <button class="btn btn-primary" id="new-live-class">＋ Start live class</button>
        <button class="btn btn-ghost" id="new-assessment">＋ Create test</button>
        <button class="btn btn-ghost" id="new-lesson">＋ Create lesson</button>
      </div>
    </div>
    <div class="metrics">${metricCards}</div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Students needing attention</h2><span>Support next</span></div>
        ${supportRows}
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Live classes</h2><span>Classroom now</span></div>
        ${liveClassRows}
      </section>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-heading"><h2>Upcoming classroom work</h2><span>Live plan</span></div>
      ${assignmentRows}
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-heading"><h2>Class assessments</h2><span>Tests and quizzes</span></div>
      ${assessmentRows}
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-heading"><h2>Results overview</h2><span>Class score history</span></div>
      ${resultSummaryRows}
    </div>
    <div class="panel" id="live-class-form" style="display:none;margin-top:18px;margin-bottom:20px">
      <div class="panel-heading"><h2>Create a live class</h2><span>Start classroom time in one click</span></div>
      <form class="form-grid" id="create-live-class-form">
        <div class="form-group"><label for="live-class-title">Class title</label><input class="field" id="live-class-title" placeholder="Grade 7 Mathematics Clinic" required /></div>
        <div class="form-group"><label for="live-class-class">Class</label><select class="select-field" id="live-class-class" required>${classOptionsMarkup}</select></div>
        <div class="form-group"><label for="live-class-subject">Subject</label><select class="select-field" id="live-class-subject" required>${subjects.map((subject) => `<option value="${subject.id}">${subject.name}</option>`).join('')}</select></div>
        <div class="form-group"><label for="live-class-time">Schedule</label><input class="field" id="live-class-time" placeholder="Today · 3:00 PM" required /></div>
        <div class="form-group"><label for="live-class-students">Students</label><input class="field" id="live-class-students" type="number" min="1" value="18" /></div>
        <div class="form-actions" style="grid-column:1 / -1; display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn-primary" type="submit">Start class</button>
          <button class="btn btn-ghost" type="button" data-close-live-class>Cancel</button>
        </div>
      </form>
    </div>
    <div class="panel" id="assessment-form" style="display:none;margin-top:18px;margin-bottom:20px">
      <div class="panel-heading"><h2>Create a test</h2><span>Make an assessment for your class</span></div>
      <form class="form-grid" id="create-assessment-form">
        <div class="form-group"><label for="assessment-title">Assessment title</label><input class="field" id="assessment-title" placeholder="Mid-term revision quiz" required /></div>
        <div class="form-group"><label for="assessment-class">Class</label><select class="select-field" id="assessment-class" required>${classOptionsMarkup}</select></div>
        <div class="form-group"><label for="assessment-subject">Subject</label><select class="select-field" id="assessment-subject" required>${subjects.map((subject) => `<option value="${subject.id}">${subject.name}</option>`).join('')}</select></div>
        <div class="form-group"><label for="assessment-due">Due date</label><input class="field" id="assessment-due" placeholder="Tomorrow · 2:00 PM" required /></div>
        <div class="form-group full" style="margin-bottom:0">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px;">
            <label style="margin:0;">Questions</label>
            <button class="btn btn-ghost btn-small" type="button" id="add-assessment-question">＋ Add question</button>
          </div>
          <div id="assessment-question-list"></div>
        </div>
        <div class="form-actions" style="grid-column:1 / -1; display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn-primary" type="submit">Create assessment</button>
          <button class="btn btn-ghost" type="button" data-close-assessment>Cancel</button>
        </div>
      </form>
    </div>
    <div class="panel" id="lesson-form" style="display:none;margin-bottom:20px">
      <div class="panel-heading"><h2>Create a lesson</h2><span>Saved locally for your classroom</span></div>
      <form class="form-grid" id="create-form">
        <div class="form-group"><label for="grade">Grade</label><select class="select-field" id="grade" required><option value="">Choose grade</option>${allGrades.map((grade) => `<option value="${grade.label}">${grade.label}</option>`).join('')}</select></div>
        <div class="form-group"><label for="subject">Subject</label><select class="select-field" id="subject" required><option value="">Choose subject</option>${subjects.map((subject) => `<option value="${subject.name}">${subject.name}</option>`).join('')}</select></div>
        <div class="form-group"><label for="topic">Topic</label><input class="field" id="topic" placeholder="e.g. Linear equations" required /></div>
        <div class="form-group"><label for="title">Lesson title</label><input class="field" id="title" placeholder="Give this lesson a clear name" required /></div>
        <div class="form-group full"><label for="description">Description</label><textarea id="description" placeholder="What will learners be able to do after this lesson?" required></textarea></div>
        <div class="form-group"><label for="teacher-name">Teacher</label><input class="field" id="teacher-name" value="${escapeHtml(userName())}" /></div>
        <div class="form-group"><label for="duration">Duration</label><input class="field" id="duration" placeholder="e.g. 18 min" /></div>
        <div class="form-group"><label for="difficulty">Difficulty</label><select class="select-field" id="difficulty"><option value="Core">Core</option><option value="Stretch">Stretch</option></select></div>
        <div class="form-group full"><label for="video">Video link</label><input class="field" id="video" placeholder="https://youtu.be/..." /></div>
        <div class="form-actions" style="grid-column:1 / -1; display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn-primary" type="submit">Publish lesson</button>
          <button class="btn btn-ghost" type="button" data-save="draft">Save draft</button>
        </div>
      </form>
    </div>
    <section class="section" style="padding:38px 0 0">
      <div class="section-head">
        <div>
          <div class="eyebrow">Recently published</div>
          <h2>Latest lessons in your library</h2>
        </div>
        <a class="text-link" href="grades.html">Browse all lessons →</a>
      </div>
      <div class="content-grid lesson-grid">${publishedLessons}</div>
    </section>
  </div>`, 'Teacher studio');
}
function slidesPage() { return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Lesson slide creator</div><h1>Tell the story, slide by slide.</h1><p>Grade 8 Mathematics · Algebra · 7 slides</p></div><div class="hero-actions"><button class="btn btn-ghost" id="preview-slides">Preview</button><button class="btn btn-primary" id="save-slides">Save presentation</button></div></div><div class="slide-workspace"><aside class="slide-sidebar" id="slide-list">${slideDeck.map((slide, index) => `<div class="slide-thumb ${index === 0 ? 'active' : ''}" data-slide="${index}"><div class="slide-thumb-preview">${slide.title}</div><small>Slide ${index + 1}</small></div>`).join('')}</aside><section><div class="slide-canvas" id="slide-canvas"><div class="eyebrow">Grade 8 · Mathematics</div><h2 id="slide-title">${slideDeck[0].title}</h2><p id="slide-body">${slideDeck[0].body}</p></div><div class="slide-actions"><button class="btn btn-ghost btn-small" id="add-slide">＋ Add slide</button><button class="btn btn-ghost btn-small" id="duplicate-slide">▣ Duplicate</button><button class="btn btn-ghost btn-small" id="delete-slide">Delete</button></div></section><aside class="slide-inspector"><h3 class="inspector-title">Slide tools</h3><div class="stack"><button class="btn btn-ghost btn-small">T Add title</button><button class="btn btn-ghost btn-small">≡ Add text</button><button class="btn btn-ghost btn-small">• Add bullet points</button><button class="btn btn-ghost btn-small">▧ Add image</button><button class="btn btn-ghost btn-small">▶ Add YouTube video</button><button class="btn btn-ghost btn-small">◇ Add shape</button></div><div style="border-top:1px solid var(--line);margin-top:20px;padding-top:17px"><h3 class="inspector-title">Speaker notes</h3><textarea style="width:100%;min-height:120px" placeholder="Add a note for this slide..."></textarea></div></aside></div></div>`, 'Slide creator'); }

function parentPage() {
  const parentData = academyRoleData.parent || academyRoleData.student;
  const metricCards = (parentData.metrics || []).map((item) => `
    <div class="metric">
      <span class="metric-label">${item.label}</span>
      <div class="stat-number">${item.value}</div>
      <span class="delta">${item.delta}</span>
    </div>
  `).join('');
  const childRows = (parentData.children || []).map((child) => `
    <div class="activity">
      <div class="activity-dot">${child.name.split(' ')[0][0]}</div>
      <div>
        <p>${child.name}</p>
        <small>${child.grade} · ${child.status} · ${child.focus}</small>
      </div>
    </div>
  `).join('');
  const activityRows = (parentData.activities || []).map((activity) => `
    <div class="activity">
      <div class="activity-dot">✓</div>
      <div>
        <p>${activity.title}</p>
        <small>${activity.detail} · ${activity.status}</small>
      </div>
    </div>
  `).join('');

  return shell(`<div class="page">
    <div class="page-heading">
      <div>
        <div class="kicker">Family dashboard</div>
        <h1>Keep your child moving forward.</h1>
        <p>${parentData.summary}</p>
      </div>
      <a class="btn btn-primary" href="grades.html">Explore lessons →</a>
    </div>
    <div class="metrics">${metricCards}</div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Your children</h2><span>Overview</span></div>
        ${childRows}
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Latest updates</h2><span>Home support</span></div>
        ${activityRows}
      </section>
    </div>
  </div>`, 'Family dashboard');
}

function principalPage() {
  const adminData = academyRoleData.admin || academyRoleData.student;
  const metricCards = (adminData.metrics || []).map((item) => `
    <div class="metric">
      <span class="metric-label">${item.label}</span>
      <div class="stat-number">${item.value}</div>
      <span class="delta">${item.delta}</span>
    </div>
  `).join('');
  const schoolRows = (adminData.school || []).map((item) => `
    <div class="progress-row">
      <div class="progress-info">${item.title} <span>${item.value}</span></div>
      <div class="progress-track"><div class="progress-fill ${item.color === 'mint' ? 'mint' : item.color === 'amber' ? 'amber' : item.color === 'violet' ? 'violet' : ''}" style="width:${item.value}"></div></div>
    </div>
  `).join('');
  const reportRows = (adminData.reports || []).map((report) => `
    <div class="activity">
      <div class="activity-dot">◎</div>
      <div>
        <p>${report.name}</p>
        <small>${report.detail} · ${report.status}</small>
      </div>
    </div>
  `).join('');

  return shell(`<div class="page">
    <div class="page-heading">
      <div>
        <div class="kicker">School dashboard</div>
        <h1>Track academy performance.</h1>
        <p>${adminData.summary}</p>
      </div>
      <button class="btn btn-primary" type="button">Export report</button>
    </div>
    <div class="metrics">${metricCards}</div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Subject health</h2><span>School view</span></div>
        ${schoolRows}
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Latest school reports</h2><span>Actions</span></div>
        ${reportRows}
      </section>
    </div>
  </div>`, 'School dashboard');
}

function render() {
  const role = (currentProfile?.requested_role || currentUser?.requested_role || 'student').toLowerCase();
  if (page === 'home') app.innerHTML = home();
  if (page === 'dashboard') {
    if (params.get('exam')) {
      app.innerHTML = examPage(params.get('exam'));
    } else if (role === 'teacher') {
      app.innerHTML = teacherPage();
    } else if (role === 'parent') {
      app.innerHTML = parentPage();
    } else if (role === 'principal') {
      app.innerHTML = principalPage();
    } else {
      app.innerHTML = dashboard();
    }
  }
  if (page === 'grades' && !['teacher', 'principal'].includes(role)) app.innerHTML = gradesPage();
  if (page === 'grades' && ['teacher', 'principal'].includes(role)) app.innerHTML = (role === 'teacher' ? teacherPage() : principalPage());
  if (page === 'subjects') app.innerHTML = ['teacher', 'principal'].includes(role) ? (role === 'teacher' ? teacherPage() : principalPage()) : (params.get('class') === 'general-knowledge' ? generalKnowledgePage() : subjectsPage());
  if (page === 'lesson') app.innerHTML = ['teacher', 'principal'].includes(role) ? (role === 'teacher' ? teacherPage() : principalPage()) : lessonPage();
  if (page === 'teacher') app.innerHTML = ['teacher', 'principal'].includes(role) ? teacherPage() : dashboard();
  if (page === 'slides') app.innerHTML = ['teacher', 'principal'].includes(role) ? slidesPage() : dashboard();
  applyBranding();
  bindEvents();
}

async function recoverHashSession() {
  const { accessToken, refreshToken, code, error: queryError } = extractSessionFromUrl();
  const hashHasSession = Boolean(accessToken && refreshToken);
  const queryHasCode = Boolean(code);

  if (!hashHasSession && !queryHasCode && !queryError) return false;

  try {
    const { auth } = await initializeAuth();
    if (!auth) return false;

    if (queryHasCode) {
      const { data, error } = await auth.exchangeCodeForSession(code);
      if (error) {
        console.error('OAuth code exchange failed', error);
        return false;
      }
      if (data?.session?.user) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error');
        url.hash = '';
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
        return true;
      }
    }

    if (!accessToken || !refreshToken) return false;
    const { data, error } = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) {
      console.error('OAuth session restore failed', error);
      return false;
    }

    if (data?.session?.user) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      return true;
    }
  } catch (error) {
    console.error('OAuth session recovery failed', error);
  }

  return false;
}

async function bootstrap() {
  hydrateLessonHistory();
  sessionStorage.removeItem('opta-preview-session');
  sessionStorage.removeItem('opta-preview-profile');
  const { lessons: sharedLessons } = await getSharedLessons();
  if (sharedLessons.length) {
    const saved = JSON.parse(localStorage.getItem('learn-fola-shared-lessons') || '[]');
    const merged = [...saved, ...sharedLessons].filter((lesson, index, all) => all.findIndex((entry) => entry.id === lesson.id) === index);
    localStorage.setItem('learn-fola-shared-lessons', JSON.stringify(merged));
  }

  await recoverHashSession();
  renderAuthFlow();
  initializeAuth().then(async () => {
    const { session } = await getSession();
    if (!session?.user) {
      const restoredProfile = getLastKnownProfile();
      if (restoredProfile) {
        currentProfile = restoredProfile;
        renderAuthFlow();
      }
      return;
    }
    currentUser = session.user;
    const lastKnownProfile = getStoredProfile(currentUser.id || currentUser.uid);
    const result = await getProfile(currentUser.id || currentUser.uid);
    const liveProfile = localProfile(currentUser);
    const blendedProfile = {
      ...(lastKnownProfile || {}),
      ...(result.profile || {}),
      ...liveProfile,
      id: currentUser.id || currentUser.uid,
      full_name: liveProfile.full_name || result.profile?.full_name || lastKnownProfile?.full_name || getGoogleDisplayName() || 'Learner',
      email: currentUser.email || liveProfile.email || result.profile?.email || lastKnownProfile?.email || '',
      avatar_url: liveProfile.avatar_url || result.profile?.avatar_url || lastKnownProfile?.avatar_url || getAccountAvatar() || ''
    };
    currentProfile = blendedProfile;
    persistActiveProfile(currentProfile);
    if (authConfig.configured) {
      const saved = await saveOnboarding({
        id: currentProfile.id,
        full_name: currentProfile.full_name,
        email: currentProfile.email,
        avatar_url: currentProfile.avatar_url || '',
        requested_role: currentProfile.requested_role || null,
        grade_id: currentProfile.grade_id || null
      });
      currentProfile = saved.profile || currentProfile;
      persistActiveProfile(currentProfile);
    }
    renderAuthFlow();
  }).catch((error) => console.error('Supabase session restore failed', error));
}

function showToast(message) { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 2400); }
function youtubeId(url) { const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/); return match ? match[1] : null; }
function bindEvents() {
  const openAuth = () => {
    app.innerHTML = authScreen(authConfig.configured ? '' : 'Supabase is not configured yet. Add your project URL and anon key to enable Google sign-in.');
    applyBranding();
    bindAuthEvents();
  };

  document.querySelector('#home-sign-in')?.addEventListener('click', openAuth);
  document.querySelector('#hero-sign-in')?.addEventListener('click', openAuth);

  const greeting = document.querySelector('.page-heading h1');
  if (greeting && page === 'dashboard') greeting.textContent = `Welcome, ${userName()}.`;
  const classSelect = document.querySelector('#grade');
  if (classSelect && !classSelect.querySelector('option[value="general-knowledge"]')) {
    const option = document.createElement('option');
    option.value = 'general-knowledge';
    option.textContent = 'General Knowledge';
    classSelect.insertBefore(option, classSelect.options[1] || null);
    const label = document.querySelector('label[for="grade"]');
    if (label) label.textContent = 'Class';
  }
  if (page === 'teacher' && !document.querySelector('#general-knowledge-history-link')) {
    const link = document.createElement('a');
    link.id = 'general-knowledge-history-link';
    link.className = 'text-link';
    link.href = 'subjects.html?class=general-knowledge';
    link.textContent = 'Open General Knowledge history →';
    document.querySelector('#lesson-form')?.before(link);
  }
  if (page === 'teacher' && !document.querySelector('#teacher-video-file')) {
    const form = document.querySelector('#create-form');
    const sourceField = document.querySelector('#video');
    if (form && sourceField) {
      const fileRow = document.createElement('div');
      fileRow.className = 'form-group';
      fileRow.innerHTML = '<label for="teacher-video-file" id="teacher-video-file-label">Choose a video file</label><input class="field" id="teacher-video-file" type="file" accept="video/*" />';
      sourceField.closest('.form-group').insertAdjacentElement('afterend', fileRow);
    }
  }
  if (page === 'dashboard') {
    const avatar = document.querySelector('.avatar img') || document.querySelector('.avatar');
    if (avatar && getAccountAvatar()) {
      avatar.src = getAccountAvatar();
      avatar.alt = userName();
    }
  }
  bindLessonHistoryEvents();
  document.querySelector('#mobile-menu')?.addEventListener('click', () => document.querySelector('#sidebar')?.classList.toggle('open'));
  document.querySelector('#save-lesson')?.addEventListener('click', (event) => { event.currentTarget.textContent = '✓ Saved to your lessons'; event.currentTarget.classList.add('btn-primary'); showToast('Lesson saved to your learning space.'); });
  document.querySelector('#new-lesson')?.addEventListener('click', () => { const form = document.querySelector('#lesson-form'); form.style.display = form.style.display === 'none' ? 'block' : 'none'; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelector('#new-assessment')?.addEventListener('click', () => { const form = document.querySelector('#assessment-form'); if (form) { form.style.display = form.style.display === 'none' ? 'block' : 'none'; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  document.querySelector('[data-close-live-class]')?.addEventListener('click', () => { const form = document.querySelector('#live-class-form'); if (form) form.style.display = 'none'; });
  document.querySelector('[data-close-assessment]')?.addEventListener('click', () => { const form = document.querySelector('#assessment-form'); if (form) form.style.display = 'none'; });
  document.querySelector('#new-live-class')?.addEventListener('click', () => { const form = document.querySelector('#live-class-form'); if (form) { form.style.display = form.style.display === 'none' ? 'block' : 'none'; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  document.querySelector('#assessment-attempt-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const assessmentId = form.dataset.assessmentId;
    const assessment = getTeacherAssessments().find((item) => item.id === assessmentId);
    if (!assessment) return;

    const totalQuestions = Array.isArray(assessment.questionBank) && assessment.questionBank.length ? assessment.questionBank.length : Math.max(1, Number(assessment.questions || 1));
    let correct = 0;

    for (let index = 0; index < totalQuestions; index += 1) {
      const selected = form.querySelector(`input[name="question-${index}"]:checked`);
      const question = (assessment.questionBank || [])[index] || { correctAnswer: 'A' };
      if (selected && selected.value === question.correctAnswer) correct += 1;
    }

    const percent = Math.round((correct / totalQuestions) * 100);
    const results = getAssessmentResults();
    results.push({ assessmentId, title: assessment.title, score: correct, total: totalQuestions, percent, submittedAt: new Date().toISOString() });
    localStorage.setItem('learn-fola-assessment-results', JSON.stringify(results));

    const resultMarkup = `
      <div class="panel" style="margin-top:18px">
        <div class="panel-heading"><h2>Assessment submitted</h2><span>Results</span></div>
        <div class="activity">
          <div class="activity-dot">✓</div>
          <div>
            <p>${escapeHtml(assessment.title)}</p>
            <small>You scored ${correct}/${totalQuestions} (${percent}%).</small>
          </div>
        </div>
        <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap">
          <a class="btn btn-primary" href="dashboard.html">Back to dashboard</a>
          <button class="btn btn-ghost" type="button" onclick="window.location.href='dashboard.html'">Try again later</button>
        </div>
      </div>
    `;
    form.replaceWith(resultMarkup);
    showToast(`Assessment complete: ${percent}%`);
  });
  document.querySelector('[data-save="draft"]')?.addEventListener('click', () => { localStorage.setItem('opta-draft', 'saved'); showToast('Draft saved locally.'); });
  document.querySelector('#grade-search')?.addEventListener('input', (event) => { document.querySelectorAll('#grade-grid .grade-card').forEach((card) => { card.style.display = card.textContent.toLowerCase().includes(event.target.value.toLowerCase()) ? '' : 'none'; }); });
  document.querySelector('#difficulty-filter')?.addEventListener('change', (event) => { document.querySelectorAll('#lesson-results .lesson-card').forEach((card) => { card.style.display = event.target.value === 'all' || card.textContent.includes(event.target.value) ? '' : 'none'; }); });
  document.querySelector('#global-search')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.value.trim()) { const query = event.target.value.trim(); const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' '); window.location.href = normalizedQuery === 'general knowledge' ? 'subjects.html?class=general-knowledge' : `subjects.html?search=${encodeURIComponent(query)}`; } });
  const slideList = document.querySelector('#slide-list'); if (slideList) { let current = 0; let slides = [...slideDeck]; const paint = () => { const slide = slides[current]; document.querySelector('#slide-title').textContent = slide.title; document.querySelector('#slide-body').textContent = slide.body; slideList.innerHTML = slides.map((item, index) => `<div class="slide-thumb ${index === current ? 'active' : ''}" data-slide="${index}"><div class="slide-thumb-preview">${item.title}</div><small>Slide ${index + 1}</small></div>`).join(''); slideList.querySelectorAll('.slide-thumb').forEach((thumb) => thumb.addEventListener('click', () => { current = Number(thumb.dataset.slide); paint(); })); }; paint(); document.querySelector('#add-slide').addEventListener('click', () => { slides.push({ title: 'New lesson idea', body: 'Add the key idea for this slide.', accent: 'blue' }); current = slides.length - 1; paint(); showToast('New slide added.'); }); document.querySelector('#duplicate-slide').addEventListener('click', () => { slides.splice(current + 1, 0, { ...slides[current], title: `${slides[current].title} copy` }); current += 1; paint(); showToast('Slide duplicated.'); }); document.querySelector('#delete-slide').addEventListener('click', () => { if (slides.length === 1) return; slides.splice(current, 1); current = Math.max(0, current - 1); paint(); showToast('Slide deleted.'); }); document.querySelector('#save-slides').addEventListener('click', () => { localStorage.setItem('opta-slides', JSON.stringify(slides)); showToast('Presentation saved locally.'); }); document.querySelector('#preview-slides').addEventListener('click', () => showToast('Preview mode is ready for the next lesson run.')); }
}

bootstrap();
