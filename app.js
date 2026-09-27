import { allGrades, grades, subjects, lessons, slideDeck, stats, getAllLessons, getGrade, getLesson, getSubject } from './data.js';
import { authConfig, getProfile, getSession, getSharedLessons, initializeAuth, localProfile, saveOnboarding, saveSharedLesson, signInWithGoogle, signOut, uploadLessonVideo } from './js/auth.js?v=20260921-auth4';

const page = document.body.dataset.page;
const app = document.querySelector('#app');
const params = new URLSearchParams(window.location.search);
let currentUser = null;
let currentProfile = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const subjectName = (id) => getSubject(id).name;
const icon = (symbol) => `<span class="side-icon">${symbol}</span>`;
const userName = () => currentProfile?.full_name || currentUser?.displayName || 'Learner';
const userInitials = () => userName().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

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
  return `<main class="onboarding-screen"><div class="onboarding-wrap"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 1 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">Welcome, ${escapeHtml(userName())}</div><h1>How will you use Learn With Fola?</h1><p>Choose your role to continue.</p></div><div class="role-grid">${roles.map(([id, symbol, title, description]) => `<button class="role-card" data-role="${id}"><span class="role-icon">${symbol}</span><strong>${title}</strong><span>${description}</span><b>Continue <i>→</i></b></button>`).join('')}</div><button class="text-button" id="auth-sign-out">Sign out</button></div></main>`;
}

function roleOnboarding(role) {
  if (role === 'student') return `<main class="onboarding-screen"><div class="onboarding-wrap narrow"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 2 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">Student setup</div><h1>What class are you in?</h1><p>Choose your grade so we can shape your learning space.</p></div><div class="grade-choice-grid">${allGrades.map((grade) => `<button class="grade-choice" data-grade="${grade.id}"><strong>${grade.label}</strong><span>${grade.description}</span><i>→</i></button>`).join('')}</div><button class="text-button" id="back-to-roles">← Back to roles</button></div></main>`;
  const copy = { teacher: ['Teacher setup', 'Ready to make learning clearer?', 'Your teacher access will be reviewed by an administrator before privileged tools are enabled.'], parent: ['Parent setup', 'Stay close to their learning.', 'Your parent access request will be reviewed before family tools are enabled.'], principal: ['Principal setup', 'Lead learning with a clearer view.', 'Your principal access request will be reviewed before management tools are enabled.'] }[role];
  return `<main class="onboarding-screen"><div class="onboarding-wrap narrow"><div class="onboarding-top"><a class="brand" href="index.html"><img class="brand-logo" src="${authLogo()}" alt="Learn With Fola logo">Learn With Fola</a><span>Step 2 of 2</span></div><div class="onboarding-heading"><div class="eyebrow">${copy[0]}</div><h1>${copy[1]}</h1><p>${copy[2]}</p></div><section class="request-card"><span class="role-icon">${role === 'teacher' ? '✎' : role === 'parent' ? '♡' : '▦'}</span><h2>Request ${role} access</h2><p>Your selected role is saved as an onboarding request. Actual permissions are controlled securely by the Learn With Fola administration team.</p><button class="btn btn-primary" id="finish-onboarding">Continue to dashboard →</button></section><button class="text-button" id="back-to-roles">← Back to roles</button></div></main>`;
}

function renderAuthFlow() {
  if (!currentUser) app.innerHTML = authScreen(authConfig.configured ? '' : 'Supabase is not configured yet. Add your project URL and anon key to enable Google sign-in.');
  else if (!currentProfile?.requested_role) app.innerHTML = roleSelection();
  else if (currentProfile.requested_role === 'student' && !currentProfile.grade_id) app.innerHTML = roleOnboarding('student');
  else render();
  applyBranding();
  bindAuthEvents();
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
    currentProfile = { ...currentProfile, requested_role: role };
    localStorage.setItem(`opta-profile:${currentProfile.id}`, JSON.stringify(currentProfile));
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: role }).catch((error) => console.error('Role preference could not be saved', error));
  }));
  document.querySelectorAll('[data-grade]').forEach((card) => card.addEventListener('click', async () => {
    const grade = Number(card.dataset.grade);
    currentProfile = { ...currentProfile, grade_id: grade, onboarding_complete: true };
    localStorage.setItem(`opta-profile:${currentProfile.id}`, JSON.stringify(currentProfile));
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: 'student', grade_id: grade }).catch((error) => console.error('Grade preference could not be saved', error));
  }));
  document.querySelector('#finish-onboarding')?.addEventListener('click', async () => {
    currentProfile = { ...currentProfile, onboarding_complete: true };
    localStorage.setItem(`opta-profile:${currentProfile.id}`, JSON.stringify(currentProfile));
    if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile));
    renderAuthFlow();
    if (currentProfile.id !== 'onboarding-preview') saveOnboarding({ id: currentProfile.id, requested_role: currentProfile.requested_role }).catch((error) => console.error('Role request could not be saved', error));
  });
  document.querySelector('#back-to-roles')?.addEventListener('click', () => { currentProfile = { ...currentProfile, requested_role: null, grade_id: null }; if (currentProfile.id === 'onboarding-preview') sessionStorage.setItem('opta-preview-profile', JSON.stringify(currentProfile)); renderAuthFlow(); });
}

function navLink(href, label, symbol, active = false) { return `<a class="side-link ${active ? 'active' : ''}" href="${href}">${icon(symbol)}${label}</a>`; }

function shell(content, title = 'Overview') {
  const isTeacher = page === 'teacher' || page === 'slides';
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="index.html"><span class="brand-mark">X</span>OPTA X EDU</a>
      <div class="side-label">Learn</div>
      ${navLink('dashboard.html', 'My dashboard', '⌂', page === 'dashboard')}
      ${navLink('grades.html', 'Browse grades', '▦', page === 'grades' || page === 'subjects')}
      ${navLink('subjects.html', 'Subjects', '✦', page === 'subjects')}
      <div class="side-label">Workspace</div>
      ${navLink('teacher.html', 'Teacher studio', '✎', isTeacher)}
      ${navLink('slides.html', 'Slide creator', '▤', page === 'slides')}
      <div class="side-label">Your space</div>
      ${navLink('dashboard.html#saved', 'Saved lessons', '♡')}
      ${navLink('dashboard.html#progress', 'My progress', '◔')}
      <div class="sidebar-footer"><strong>Learning streak</strong>3 days in a row. Keep the momentum going.</div>
    </aside>
    <main class="app-main">
      <header class="app-topbar"><div class="breadcrumb"><span>OPTA X EDU</span> <b>/</b> <strong>${title}</strong></div><div class="search-box">⌕ <input id="global-search" placeholder="Search lessons, topics..." aria-label="Search lessons" /></div><div class="top-actions"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open menu">☰</button><div class="avatar">${currentProfile?.avatar_url ? `<img src="${escapeHtml(currentProfile.avatar_url)}" alt="${escapeHtml(userName())}" />` : userInitials()}</div></div></header>
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
  return `<header class="site-header"><a class="brand" href="index.html"><span class="brand-mark">X</span>OPTA X EDU</a><nav class="top-nav"><a class="active" href="index.html">Home</a><a href="grades.html">Explore</a><a href="dashboard.html">My learning</a><a href="teacher.html">For teachers</a></nav><div class="top-actions"><a class="btn btn-ghost btn-small" href="teacher.html">Teacher portal</a><div class="avatar">OX</div><button class="icon-button mobile-menu" id="mobile-menu">☰</button></div></header>
  <main><section class="hero"><div class="hero-inner"><div class="reveal"><div class="eyebrow">A smarter way to learn</div><h1>Learn. Watch.<br>Understand. Grow.</h1><p class="hero-copy">Explore educational videos, lesson notes and interactive learning materials from Grade 1 to Grade 12.</p><div class="hero-actions"><a class="btn btn-primary" href="grades.html">Start learning <span>→</span></a><a class="btn btn-ghost" href="grades.html">Explore grades</a></div></div><div class="hero-visual"><div class="floating-label label-one">12 grades · one place</div><img class="hero-logo" src="ChatGPT%20Image%20Sep%2021,%202026,%2003_34_29%20PM.png" alt="OPTA X EDU logo"><div class="floating-label label-two">+ 18 min of progress</div></div></div></section>
  <section class="section"><div class="section-head"><div><div class="eyebrow">Picked for you</div><h2>Popular lessons</h2><p>Short, clear lessons for curious minds.</p></div><a class="text-link" href="grades.html">View all lessons →</a></div><div class="content-grid lesson-grid">${featured.map(lessonCard).join('')}</div></section>
  <section class="section tinted"><div class="section-head"><div><div class="eyebrow">Find your level</div><h2>Browse by grade</h2><p>Every learner has a next step.</p></div><a class="text-link" href="grades.html">See all 12 grades →</a></div><div class="content-grid grade-strip">${grades.map(gradeCard).join('')}</div></section>
  <section class="section"><div class="section-head"><div><div class="eyebrow">Explore your curiosity</div><h2>Browse by subject</h2></div></div><div class="content-grid subject-grid">${subjects.slice(0, 6).map((subject) => `<a class="subject-card reveal" href="subjects.html?subject=${subject.id}"><div class="subject-icon color-${subject.color}">${subject.icon}</div><h3>${subject.name}</h3><p>${subject.description}</p></a>`).join('')}</div></section></main><footer class="footer"><span><strong>OPTA X EDU</strong> · Learning with momentum.</span><span>Built for students, teachers and what comes next.</span></footer>`;
}

function dashboard() { return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Tuesday, September 21</div><h1>Welcome back, Alex.</h1><p>Pick up where you left off and keep your curiosity moving.</p></div><a class="btn btn-primary" href="grades.html">Find a lesson →</a></div><div class="metrics"><div class="metric"><span class="metric-label">Learning streak</span><div class="stat-number">3 days</div><span class="delta">+1 from last week</span></div><div class="metric"><span class="metric-label">Lessons completed</span><div class="stat-number">24</div><span class="delta">+6 this month</span></div><div class="metric"><span class="metric-label">Watch time</span><div class="stat-number">8.4h</div><span class="delta">+18% this month</span></div><div class="metric"><span class="metric-label">Saved for later</span><div class="stat-number">12</div><span class="delta">3 new this week</span></div></div><div class="dashboard-grid"><section class="panel" id="progress"><div class="panel-heading"><h2>Your progress</h2><span>Across your subjects</span></div><div class="progress-row"><div class="progress-info">Mathematics <span>80%</span></div><div class="progress-track"><div class="progress-fill" style="width:80%"></div></div></div><div class="progress-row"><div class="progress-info">English Language <span>60%</span></div><div class="progress-track"><div class="progress-fill mint" style="width:60%"></div></div></div><div class="progress-row"><div class="progress-info">Basic Science <span>70%</span></div><div class="progress-track"><div class="progress-fill amber" style="width:70%"></div></div></div><div class="progress-row"><div class="progress-info">History <span>42%</span></div><div class="progress-track"><div class="progress-fill" style="width:42%"></div></div></div></section><section class="panel"><div class="panel-heading"><h2>Recently watched</h2><span>See all →</span></div><div class="activity"><div class="activity-dot">▶</div><div><p>Fractions made visual</p><small>Watched 12 minutes ago</small></div></div><div class="activity"><div class="activity-dot">✦</div><div><p>How plants make food</p><small>Watched yesterday</small></div></div><div class="activity"><div class="activity-dot">Aa</div><div><p>Build stronger sentences</p><small>Watched 2 days ago</small></div></div></section></div><section class="section" style="padding:38px 0 0"><div class="section-head"><div><div class="eyebrow">Keep exploring</div><h2>Recommended lessons</h2></div><a class="text-link" href="grades.html">Browse library →</a></div><div class="content-grid lesson-grid">${lessons.slice(0, 3).map(lessonCard).join('')}</div></section></div>`, 'My dashboard'); }

function gradesPage() { return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Your learning map</div><h1>Choose a grade.</h1><p>Start with where you are, then go wherever your questions lead.</p></div><div class="filter-bar"><input class="field" id="grade-search" placeholder="Search a grade..." /></div></div><div class="grade-grid" id="grade-grid">${allGrades.map(gradeCard).join('')}</div></div>`, 'Browse grades'); }

function subjectsPage() {
  const grade = getGrade(params.get('grade') || 7);
  const selectedSubject = params.get('subject');
  const search = (params.get('search') || '').toLowerCase();
  const catalog = getLessonCatalog();
  const filtered = catalog.filter((lesson) => (!params.get('grade') || lesson.grade === grade.id) && (!selectedSubject || lesson.subject === selectedSubject) && (!search || `${lesson.title} ${lesson.topic} ${lesson.description}`.toLowerCase().includes(search)));
  return shell(`<div class="page"><div class="grade-hero"><div><div class="kicker">Grade path</div><h1>${search ? `Search: ${escapeHtml(search)}` : grade.label}</h1><p>${search ? 'Here are the lessons that match your search.' : `${grade.description}. Choose a subject to see its lessons, videos and notes.`}</p></div><a class="btn btn-primary" href="grades.html">Change grade</a></div><div class="section-head"><div><div class="eyebrow">Subjects in this grade</div><h2>Find your next subject</h2></div></div><div class="subjects-grid" style="margin-bottom:40px">${subjects.map((subject) => `<a class="subject-card" href="subjects.html?grade=${grade.id}&subject=${subject.id}"><div class="subject-icon color-${subject.color}">${subject.icon}</div><h3>${subject.name}</h3><p>${subject.description}</p></a>`).join('')}</div><div class="section-head"><div><div class="eyebrow">${selectedSubject ? subjectName(selectedSubject) : search ? 'Search results' : 'Curated for you'}</div><h2>${selectedSubject ? 'Lessons in this subject' : search ? `${filtered.length} matching lessons` : 'Featured lessons'}</h2></div><div class="filter-bar"><select class="select-field" id="difficulty-filter"><option value="all">All difficulty</option><option value="Core">Core</option><option value="Stretch">Stretch</option></select></div></div><div class="content-grid lesson-grid" id="lesson-results">${filtered.length ? filtered.map(lessonCard).join('') : '<div class="empty-state">No lessons found for this selection yet.</div>'}</div></div>`, `${search ? 'Search' : `${grade.label} subjects`}`); }

function lessonPage() { const lesson = getLesson(params.get('id')); return shell(`<div class="page"><div class="video-layout"><div><div class="video-frame">${lesson.videoType === 'upload' && lesson.videoUrl ? `<video class="lesson-video" controls preload="metadata" src="${lesson.videoUrl}"></video>` : `<iframe src="https://www.youtube.com/embed/${lesson.videoId}" title="${escapeHtml(lesson.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`}</div><div class="kicker" style="margin-top:27px">${subjectName(lesson.subject)} · ${lesson.topic}</div><h1 class="lesson-title">${lesson.title}</h1><p class="lesson-subtitle">${lesson.description}</p><div class="lesson-facts"><span class="fact">Grade ${lesson.grade}</span><span class="fact">${lesson.teacher}</span><span class="fact">${lesson.duration}</span><span class="fact">${lesson.difficulty}</span></div><div class="notes"><h2>Lesson notes</h2><section><h3>Introduction</h3><p>Today we are making ${lesson.topic.toLowerCase()} easier to see, talk about and use. Start with the big idea, then use the examples to test your understanding.</p></section><section><h3>Learning objectives</h3><ul><li>Explain the main idea in your own words.</li><li>Recognize the pattern in a new example.</li><li>Use the method to solve a practice question.</li></ul></section><section><h3>Main explanation</h3><p>Good learning is built in small steps. Watch the video once for the story, then pause and replay the worked example. Write down what changes, what stays the same and why the answer makes sense.</p></section><section><h3>Key points</h3><ul><li>Look for the information the question gives you.</li><li>Choose one clear method and show your thinking.</li><li>Check the result against the original question.</li></ul></section><section><h3>Summary</h3><p>You have the building blocks. Next, try the practice questions and explain one answer to someone else.</p></section></div></div><aside><div class="panel"><div class="panel-heading"><h2>Lesson resources</h2></div><div class="resource-list"><a class="resource" href="slides.html">▤ Lesson slides <span>Open →</span></a><a class="resource" href="#notes">▣ Lesson notes <span>Read below</span></a><a class="resource" href="grades.html">▶ Related videos <span>Browse →</span></a><a class="resource" href="#practice">✎ Practice questions <span>Start →</span></a></div><button class="btn btn-soft" style="width:100%;margin-top:16px" id="save-lesson">♡ Save lesson</button></div></aside></div></div>`, `${subjectName(lesson.subject)} / ${lesson.title}`); }

function teacherPage() { return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Teacher workspace</div><h1>Make learning clearer.</h1><p>Curate videos, write notes and publish lessons your students can return to.</p></div><button class="btn btn-primary" id="new-lesson">＋ Create lesson</button></div><div class="metrics"><div class="metric"><span class="metric-label">My lessons</span><div class="stat-number">18</div><span class="delta">4 published this month</span></div><div class="metric"><span class="metric-label">Video library</span><div class="stat-number">42</div><span class="delta">8 ready to review</span></div><div class="metric"><span class="metric-label">Drafts</span><div class="stat-number">6</div><span class="delta">Keep shaping them</span></div><div class="metric"><span class="metric-label">Total learners</span><div class="stat-number">286</div><span class="delta">Across your lessons</span></div></div><div class="studio-tabs"><button class="tab active">My lessons</button><button class="tab">Video library</button><button class="tab">Lesson notes</button><button class="tab">Published</button><button class="tab">Drafts</button></div><div class="panel" id="lesson-form" style="display:none;margin-bottom:20px"><div class="panel-heading"><h2>Create a lesson</h2><span>Saved locally until Supabase is connected</span></div><form class="form-grid" id="create-form"><div class="form-group"><label for="grade">Grade</label><select class="select-field" id="grade" required><option value="">Choose grade</option>${allGrades.map((grade) => `<option>${grade.label}</option>`).join('')}</select></div><div class="form-group"><label for="subject">Subject</label><select class="select-field" id="subject" required><option value="">Choose subject</option>${subjects.map((subject) => `<option>${subject.name}</option>`).join('')}</select></div><div class="form-group"><label for="topic">Topic</label><input class="field" id="topic" placeholder="e.g. Linear equations" required></div><div class="form-group"><label for="title">Lesson title</label><input class="field" id="title" placeholder="Give this lesson a clear name" required></div><div class="form-group full"><label for="description">Description</label><textarea id="description" placeholder="What will learners be able to do after this lesson?" required></textarea></div><div class="form-group full"><label for="objectives">Learning objectives</label><textarea id="objectives" placeholder="One objective per line"></textarea></div><div class="form-group"><label for="video">YouTube video URL</label><input class="field" id="video" placeholder="https://youtube.com/watch?v=..." required></div><div class="form-group"><label for="teacher-name">Teacher name</label><input class="field" id="teacher-name" placeholder="Your name" required></div><div class="form-group"><label for="duration">Lesson duration</label><input class="field" id="duration" placeholder="18 min"></div><div class="form-group"><label for="difficulty">Difficulty</label><select class="select-field" id="difficulty"><option>Core</option><option>Stretch</option><option>Foundation</option></select></div><div class="form-actions full"><button type="button" class="btn btn-ghost" data-save="draft">Save draft</button><button class="btn btn-primary" type="submit">Publish lesson</button></div></form></div><div class="panel"><div class="table-row table-header"><span>Lesson</span><span>Subject</span><span>Status</span><span>Updated</span></div>${lessons.slice(0, 5).map((lesson) => `<div class="table-row"><span><strong>${lesson.title}</strong><br><small style="color:var(--muted)">Grade ${lesson.grade} · ${lesson.topic}</small></span><span>${subjectName(lesson.subject)}</span><span><b class="status ${lesson.status === 'draft' ? 'draft' : ''}">${lesson.status}</b></span><span style="color:var(--muted)">Today</span></div>`).join('')}</div></div>`, 'Teacher studio'); }

function slidesPage() { return shell(`<div class="page"><div class="page-heading"><div><div class="kicker">Lesson slide creator</div><h1>Tell the story, slide by slide.</h1><p>Grade 8 Mathematics · Algebra · 7 slides</p></div><div class="hero-actions"><button class="btn btn-ghost" id="preview-slides">Preview</button><button class="btn btn-primary" id="save-slides">Save presentation</button></div></div><div class="slide-workspace"><aside class="slide-sidebar" id="slide-list">${slideDeck.map((slide, index) => `<div class="slide-thumb ${index === 0 ? 'active' : ''}" data-slide="${index}"><div class="slide-thumb-preview">${slide.title}</div><small>Slide ${index + 1}</small></div>`).join('')}</aside><section><div class="slide-canvas" id="slide-canvas"><div class="eyebrow">Grade 8 · Mathematics</div><h2 id="slide-title">${slideDeck[0].title}</h2><p id="slide-body">${slideDeck[0].body}</p></div><div class="slide-actions"><button class="btn btn-ghost btn-small" id="add-slide">＋ Add slide</button><button class="btn btn-ghost btn-small" id="duplicate-slide">▣ Duplicate</button><button class="btn btn-ghost btn-small" id="delete-slide">Delete</button></div></section><aside class="slide-inspector"><h3 class="inspector-title">Slide tools</h3><div class="stack"><button class="btn btn-ghost btn-small">T Add title</button><button class="btn btn-ghost btn-small">≡ Add text</button><button class="btn btn-ghost btn-small">• Add bullet points</button><button class="btn btn-ghost btn-small">▧ Add image</button><button class="btn btn-ghost btn-small">▶ Add YouTube video</button><button class="btn btn-ghost btn-small">◇ Add shape</button></div><div style="border-top:1px solid var(--line);margin-top:20px;padding-top:17px"><h3 class="inspector-title">Speaker notes</h3><textarea style="width:100%;min-height:120px" placeholder="Add a note for this slide..."></textarea></div></aside></div></div>`, 'Slide creator'); }

function render() { if (page === 'home') app.innerHTML = home(); if (page === 'dashboard') app.innerHTML = dashboard(); if (page === 'grades') app.innerHTML = gradesPage(); if (page === 'subjects') app.innerHTML = params.get('class') === 'general-knowledge' ? generalKnowledgePage() : subjectsPage(); if (page === 'lesson') app.innerHTML = lessonPage(); if (page === 'teacher') app.innerHTML = teacherPage(); if (page === 'slides') app.innerHTML = slidesPage(); applyBranding(); bindEvents(); }

async function bootstrap() {
  hydrateLessonHistory();
  const { lessons: sharedLessons } = await getSharedLessons();
  if (sharedLessons.length) {
    const saved = JSON.parse(localStorage.getItem('learn-fola-shared-lessons') || '[]');
    const merged = [...saved, ...sharedLessons].filter((lesson, index, all) => all.findIndex((entry) => entry.id === lesson.id) === index);
    localStorage.setItem('learn-fola-shared-lessons', JSON.stringify(merged));
  }
  if (sessionStorage.getItem('opta-preview-session') === 'true') {
    currentUser = { uid: 'onboarding-preview', displayName: 'Learner', email: '' };
    currentProfile = JSON.parse(sessionStorage.getItem('opta-preview-profile') || '{"id":"onboarding-preview","requested_role":"student","grade_id":7,"onboarding_complete":true}');
    renderAuthFlow();
    return;
  }
  renderAuthFlow();
  initializeAuth().then(async () => {
    const { session } = await getSession();
    if (!session?.user) return;
    currentUser = session.user;
    const result = await getProfile(currentUser.uid);
    currentProfile = result.profile || localProfile(currentUser);
    if (!result.profile && authConfig.configured) {
      const saved = await saveOnboarding({ id: currentUser.uid, full_name: userName(), email: currentUser.email, avatar_url: currentUser.photoURL || '' });
      currentProfile = saved.profile || currentProfile;
    }
    renderAuthFlow();
  }).catch((error) => console.error('Supabase session restore failed', error));
}

function showToast(message) { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 2400); }
function youtubeId(url) { const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/); return match ? match[1] : null; }
function bindEvents() {
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
  bindLessonHistoryEvents();
  document.querySelector('#mobile-menu')?.addEventListener('click', () => document.querySelector('#sidebar')?.classList.toggle('open'));
  document.querySelector('#save-lesson')?.addEventListener('click', (event) => { event.currentTarget.textContent = '✓ Saved to your lessons'; event.currentTarget.classList.add('btn-primary'); showToast('Lesson saved to your learning space.'); });
  document.querySelector('#new-lesson')?.addEventListener('click', () => { const form = document.querySelector('#lesson-form'); form.style.display = form.style.display === 'none' ? 'block' : 'none'; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelector('[data-save="draft"]')?.addEventListener('click', () => { localStorage.setItem('opta-draft', 'saved'); showToast('Draft saved locally.'); });
  document.querySelector('#grade-search')?.addEventListener('input', (event) => { document.querySelectorAll('#grade-grid .grade-card').forEach((card) => { card.style.display = card.textContent.toLowerCase().includes(event.target.value.toLowerCase()) ? '' : 'none'; }); });
  document.querySelector('#difficulty-filter')?.addEventListener('change', (event) => { document.querySelectorAll('#lesson-results .lesson-card').forEach((card) => { card.style.display = event.target.value === 'all' || card.textContent.includes(event.target.value) ? '' : 'none'; }); });
  document.querySelector('#global-search')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.value.trim()) { const query = event.target.value.trim(); const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' '); window.location.href = normalizedQuery === 'general knowledge' ? 'subjects.html?class=general-knowledge' : `subjects.html?search=${encodeURIComponent(query)}`; } });
  const slideList = document.querySelector('#slide-list'); if (slideList) { let current = 0; let slides = [...slideDeck]; const paint = () => { const slide = slides[current]; document.querySelector('#slide-title').textContent = slide.title; document.querySelector('#slide-body').textContent = slide.body; slideList.innerHTML = slides.map((item, index) => `<div class="slide-thumb ${index === current ? 'active' : ''}" data-slide="${index}"><div class="slide-thumb-preview">${item.title}</div><small>Slide ${index + 1}</small></div>`).join(''); slideList.querySelectorAll('.slide-thumb').forEach((thumb) => thumb.addEventListener('click', () => { current = Number(thumb.dataset.slide); paint(); })); }; paint(); document.querySelector('#add-slide').addEventListener('click', () => { slides.push({ title: 'New lesson idea', body: 'Add the key idea for this slide.', accent: 'blue' }); current = slides.length - 1; paint(); showToast('New slide added.'); }); document.querySelector('#duplicate-slide').addEventListener('click', () => { slides.splice(current + 1, 0, { ...slides[current], title: `${slides[current].title} copy` }); current += 1; paint(); showToast('Slide duplicated.'); }); document.querySelector('#delete-slide').addEventListener('click', () => { if (slides.length === 1) return; slides.splice(current, 1); current = Math.max(0, current - 1); paint(); showToast('Slide deleted.'); }); document.querySelector('#save-slides').addEventListener('click', () => { localStorage.setItem('opta-slides', JSON.stringify(slides)); showToast('Presentation saved locally.'); }); document.querySelector('#preview-slides').addEventListener('click', () => showToast('Preview mode is ready for the next lesson run.')); }
}

bootstrap();
