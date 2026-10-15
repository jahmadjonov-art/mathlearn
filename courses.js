(function (root) {
  'use strict';

  root.COURSES = [
    {
      id: 'math',
      category: 'foundations',
      icon: '∑',
      label: 'Start anywhere',
      title: 'Math, from the beginning',
      description: 'Build confidence with numbers, algebra, geometry, and the math behind everyday life.',
      meta: ['13 learning levels', '236 written lessons'],
      href: 'src/index.html',
      cta: 'Explore the math course',
      search: 'math mathematics arithmetic algebra fractions geometry'
    },
    {
      id: 'english',
      category: 'foundations',
      icon: 'Aa',
      label: 'Full course',
      title: 'English, from the first letter',
      description: 'Learn to read and write, from the alphabet and phonics to essays, the SAT and ACT, and the language of law, finance and accounting.',
      meta: ['12 stages', '404 lessons'],
      href: 'english/index.html',
      cta: 'Start learning English',
      search: 'english reading writing grammar phonics sentences words essay vocabulary sat act law finance accounting'
    },
    {
      id: 'sql',
      category: 'technology',
      icon: '</>',
      label: 'Full course',
      title: 'SQL, with a real database',
      description: 'Learn SQL from your first query to joins, window functions and query plans, running every query on a real database in your browser.',
      meta: ['12 modules', '43 lessons'],
      href: 'sql/index.html',
      cta: 'Start learning SQL',
      search: 'sql database data coding technology query select join window sqlite analytics'
    }
  ];

  /* Lesson data for short classes shown on course.html. Both starter classes
     grew into full courses with their own pages, so none is listed now; the
     page still sends old links for them on to the full course. */
  root.LESSONS = {};
})(typeof window !== 'undefined' ? window : globalThis);
