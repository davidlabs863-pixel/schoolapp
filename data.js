export const grades = [
  { id: 1, label: 'Grade 1', description: 'Build bright foundations', subjects: 5, lessons: 28, videos: 18, color: 'coral' },
  { id: 5, label: 'Grade 5', description: 'Discover how things connect', subjects: 7, lessons: 42, videos: 31, color: 'mint' },
  { id: 7, label: 'Grade 7', description: 'Think deeper, go further', subjects: 10, lessons: 64, videos: 46, color: 'blue' },
  { id: 9, label: 'Grade 9', description: 'Prepare for what is next', subjects: 9, lessons: 57, videos: 39, color: 'amber' },
  { id: 12, label: 'Grade 12', description: 'Make your next move', subjects: 8, lessons: 52, videos: 34, color: 'violet' }
];

export const allGrades = Array.from({ length: 12 }, (_, index) => {
  const found = grades.find((grade) => grade.id === index + 1);
  return found || { id: index + 1, label: `Grade ${index + 1}`, description: 'Explore and grow every day', subjects: 6, lessons: 36, videos: 24, color: 'blue' };
});

export const subjects = [
  { id: 'math', name: 'Mathematics', icon: '∑', color: 'blue', description: 'Patterns, logic and problem solving' },
  { id: 'science', name: 'Basic Science', icon: '✦', color: 'mint', description: 'Curiosity meets the world around us' },
  { id: 'english', name: 'English Language', icon: 'Aa', color: 'coral', description: 'Read, write and express yourself' },
  { id: 'history', name: 'History', icon: '◒', color: 'amber', description: 'Learn from the stories that shaped us' },
  { id: 'computer', name: 'Computer Studies', icon: '</>', color: 'violet', description: 'Create with digital confidence' },
  { id: 'geography', name: 'Geography', icon: '◎', color: 'teal', description: 'See the world in new ways' }
];

export const lessons = [
  { id: 'fractions', grade: 7, subject: 'math', unit: 'Number Sense', topic: 'Fractions', title: 'Fractions made visual', teacher: 'Amaka Okoye', duration: '18 min', difficulty: 'Core', description: 'See fractions as parts of a whole, compare them with confidence and solve everyday problems.', videoId: 'Kp2bYWRQylk', thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80', status: 'published', featured: true },
  { id: 'photosynthesis', grade: 7, subject: 'science', unit: 'Living Systems', topic: 'Plants', title: 'How plants make food', teacher: 'David Mensah', duration: '24 min', difficulty: 'Core', description: 'Follow the journey from sunlight to sugar in this visual introduction to photosynthesis.', videoId: 'UPBMG5fCjbI', thumbnail: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80', status: 'published', featured: true },
  { id: 'algebra', grade: 8, subject: 'math', unit: 'Algebra', topic: 'Linear Equations', title: 'Solve for the unknown', teacher: 'Maya Adeyemi', duration: '21 min', difficulty: 'Stretch', description: 'Build a clear method for solving one-step and two-step linear equations.', videoId: 'NybHckSEQBI', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80', status: 'published', featured: true },
  { id: 'grammar', grade: 5, subject: 'english', unit: 'Writing Well', topic: 'Grammar', title: 'Build stronger sentences', teacher: 'Sarah Bello', duration: '16 min', difficulty: 'Core', description: 'Use sentence structure, punctuation and rhythm to make your writing clearer.', videoId: 'pD1g2tJ8ZqI', thumbnail: 'https://images.unsplash.com/photo-1455885666463-3c0d6b9a5a5b?auto=format&fit=crop&w=900&q=80', status: 'published', featured: false },
  { id: 'world-war-ii', grade: 9, subject: 'history', unit: 'Modern History', topic: 'World War II', title: 'A world in conflict', teacher: 'Jon Bell', duration: '29 min', difficulty: 'Core', description: 'Map the major turning points and understand how the conflict reshaped the modern world.', videoId: 'fo2Rb9h784s', thumbnail: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=80', status: 'published', featured: false },
  { id: 'coding-basics', grade: 12, subject: 'computer', unit: 'Digital Creation', topic: 'Programming', title: 'Your first web page', teacher: 'Nneka Ibe', duration: '32 min', difficulty: 'Stretch', description: 'Meet HTML, CSS and JavaScript by making a tiny page from scratch.', videoId: 'qz0aGYrrlhU', thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', status: 'published', featured: false },
  { id: 'water-cycle', grade: 5, subject: 'science', unit: 'Earth Systems', topic: 'Water Cycle', title: 'The water cycle', teacher: 'David Mensah', duration: '14 min', difficulty: 'Core', description: 'Trace water as it moves through evaporation, condensation, precipitation and collection.', videoId: 'al-do-HGuIkY', thumbnail: 'https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=900&q=80', status: 'published', featured: false }
];

export const slideDeck = [
  { id: 1, title: 'Introduction to Algebra', body: 'Algebra helps us describe unknown values and relationships.', accent: 'blue' },
  { id: 2, title: 'What is Algebra?', body: 'An equation is a statement that two expressions are equal.', accent: 'mint' },
  { id: 3, title: 'Understanding Variables', body: 'A variable is a letter or symbol that represents a value.', accent: 'coral' },
  { id: 4, title: 'Solving Simple Equations', body: 'Use inverse operations to keep the equation balanced.', accent: 'amber' },
  { id: 5, title: 'Worked Examples', body: 'x + 4 = 10  →  x = 6', accent: 'violet' },
  { id: 6, title: 'Practice Questions', body: 'Try: 2x + 3 = 11. What is x?', accent: 'teal' },
  { id: 7, title: 'Lesson Summary', body: 'Balance both sides. Undo operations. Check your answer.', accent: 'blue' }
];

export const stats = { lessons: 248, videos: 186, teachers: 42, students: '2.4k' };

export const academyRoleData = {
  student: {
    summary: 'Keep building momentum with targeted learning and support.',
    metrics: [
      { label: 'Learning streak', value: '3 days', delta: '+1 from last week' },
      { label: 'Lessons completed', value: '24', delta: '+6 this month' },
      { label: 'Watch time', value: '8.4h', delta: '+18% this month' },
      { label: 'Saved for later', value: '12', delta: '3 new this week' }
    ],
    progress: [
      { label: 'Mathematics', value: 80, tone: 'coral' },
      { label: 'English Language', value: 60, tone: 'mint' },
      { label: 'Basic Science', value: 70, tone: 'amber' },
      { label: 'History', value: 42, tone: 'coral' }
    ],
    recommendations: [
      { title: 'Fractions fluency', subject: 'Mathematics', reason: 'Build confidence with equivalent fractions before your next checkpoint.', progress: 68, difficulty: 'Core' },
      { title: 'Paragraph structure', subject: 'English', reason: 'Strengthen topic sentences and evidence before the writing task.', progress: 54, difficulty: 'Stretch' },
      { title: 'The water cycle', subject: 'Science', reason: 'Review the stages of evaporation and condensation to improve retention.', progress: 76, difficulty: 'Core' }
    ],
    assignments: [
      { title: 'Decimals check-in', due: 'Due tomorrow', status: 'In progress' },
      { title: 'Reading reflection', due: 'Due Friday', status: 'Assigned' },
      { title: 'Plant investigation', due: 'Due next week', status: 'Assigned' }
    ],
    achievements: [
      { title: 'First lesson completed', unlocked: true },
      { title: 'Perfect session', unlocked: false },
      { title: 'Consistency award', unlocked: true }
    ],
    activity: [
      { label: 'Fractions made visual', detail: 'Completed 18 min lesson', badge: '▶' },
      { label: 'Science quiz review', detail: 'Scored 87%', badge: '✓' },
      { label: 'Reading check-in', detail: 'Practiced 2 new skills', badge: '✎' }
    ]
  },
  teacher: {
    summary: 'Track class performance, identify growth areas, and support students who need attention.',
    metrics: [
      { label: 'Students', value: '286', delta: '+14 this term' },
      { label: 'Questions answered', value: '4,280', delta: '+18% this month' },
      { label: 'Skills mastered', value: '132', delta: '+9 this week' },
      { label: 'Assignments complete', value: '78%', delta: '+11% from last cycle' }
    ],
    support: [
      { name: 'Aisha O.', subject: 'Mathematics', need: 'Needs support with fractions', progress: 46 },
      { name: 'Daniel K.', subject: 'English', need: 'Needs stronger comprehension tasks', progress: 58 },
      { name: 'Tariq Y.', subject: 'Science', need: 'Needs reinforcement in ecosystems', progress: 52 }
    ],
    assignments: [
      { title: 'Review and revise', due: 'Today', status: 'Assigned' },
      { title: 'Diagnostic check-in', due: 'Tomorrow', status: 'In progress' },
      { title: 'Class challenge', due: 'This Friday', status: 'Draft' }
    ],
    activity: [
      { label: 'Fractions mastery tracker', detail: 'Updated for Grade 7', badge: '◎' },
      { label: 'Reading support plan', detail: 'Assigned to 4 learners', badge: '✦' },
      { label: 'Live classroom', detail: '6 students currently active', badge: '◔' }
    ]
  },
  parent: {
    summary: 'See your child’s progress, assignments, and areas to support at home.',
    metrics: [
      { label: 'Child progress', value: '76%', delta: '+8% this month' },
      { label: 'Assignments', value: '5', delta: '2 due this week' },
      { label: 'Time online', value: '6.2h', delta: '+1.4h this week' },
      { label: 'Achievements', value: '9', delta: '2 unlocked recently' }
    ],
    children: [
      { name: 'Tosin A.', grade: 'Grade 7', status: 'Steady progress', focus: 'Fractions and reading' },
      { name: 'Mira A.', grade: 'Grade 5', status: 'Strong growth', focus: 'Science experiments' }
    ],
    activities: [
      { title: 'Reading task due', detail: 'Submit by Friday', status: 'Due soon' },
      { title: 'Science quiz complete', detail: '87% score achieved', status: 'Good work' },
      { title: 'Recommendation', detail: 'Try another fractions activity', status: 'Suggested' }
    ]
  },
  admin: {
    summary: 'Monitor schoolwide learning, teacher activity, and progress trends across the academy.',
    metrics: [
      { label: 'Active students', value: '1,824', delta: '+12% this term' },
      { label: 'Active teachers', value: '42', delta: '+4 this term' },
      { label: 'Assignments tracked', value: '469', delta: '78% completion' },
      { label: 'School progress', value: '74%', delta: '+6% vs last cycle' }
    ],
    school: [
      { title: 'Mathematics', value: '81%', color: 'coral' },
      { title: 'English', value: '76%', color: 'mint' },
      { title: 'Science', value: '79%', color: 'amber' },
      { title: 'History', value: '68%', color: 'violet' }
    ],
    reports: [
      { name: 'Grade 7 proficiency', detail: 'Mathematics rising by 8%', status: 'Healthy' },
      { name: 'Teacher workload', detail: 'Support needed in English team', status: 'Monitor' },
      { name: 'Diagnostic insights', detail: 'New intervention plan ready', status: 'Action needed' }
    ]
  }
};

export const academySearchIndex = [
  'Fractions practice',
  'Mathematics grade 7',
  'English reading strategies',
  'Science water cycle',
  'Teacher assignments',
  'Student progress dashboard',
  'Diagnostics results',
  'Recommendations',
  'Assignments due this week',
  'Class challenge',
  'School analytics',
  'Parent progress summary'
];

function getStoredSharedLessons() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem('learn-fola-shared-lessons') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function getLocalLessonHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem('learn-fola-lesson-history') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

export function getAllLessons() {
  return [...lessons, ...getLocalLessonHistory(), ...getStoredSharedLessons()];
}

export function getLesson(id) { return getAllLessons().find((lesson) => lesson.id === id) || lessons[0]; }
export function getSubject(id) { return subjects.find((subject) => subject.id === id) || subjects[0]; }
export function getGrade(id) { return allGrades.find((grade) => grade.id === Number(id)) || allGrades[0]; }
