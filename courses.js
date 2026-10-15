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
      label: '2 starter lessons',
      title: 'SQL, made simple',
      description: 'Learn to ask a database useful questions and find exactly the rows you need.',
      meta: ['2 short lessons', 'No setup needed'],
      href: 'course.html?course=sql',
      cta: 'Start learning SQL',
      search: 'sql database data coding technology query'
    }
  ];

  root.LESSONS = {
    sql: {
      title: 'SQL, made simple',
      eyebrow: 'Technology · Working with data',
      intro: 'Learn the building blocks of database queries with examples you can read right away.',
      lessons: [
        {
          title: 'Ask a table for data',
          duration: '4 min',
          paragraphs: [
            'A database stores information in tables. Each table has columns, such as a customer’s name and email, and rows that hold one record each.',
            'In SQL, SELECT names the columns you want to see. FROM tells the database which table to look in.'
          ],
          example: 'SELECT name, email\nFROM customers;',
          callout: 'The semicolon marks the end of a query. SQL keywords are often written in capitals for readability, but the database does not require that.',
          quiz: {
            question: 'Which query asks for the name and email columns from the customers table?',
            options: [
              'SELECT name, email FROM customers;',
              'SELECT customers FROM name, email;',
              'FROM customers SELECT email;'
            ],
            answer: 0,
            explanation: 'SELECT lists the columns first; FROM names the table they come from.'
          }
        },
        {
          title: 'Filter and sort results',
          duration: '5 min',
          paragraphs: [
            'A table may contain more rows than you need. WHERE keeps only rows that match a condition, such as customers on a particular plan.',
            'ORDER BY arranges the matching rows. Add DESC for descending order; otherwise results are sorted in ascending order.'
          ],
          example: "SELECT name, plan\nFROM customers\nWHERE plan = 'free'\nORDER BY name;",
          callout: 'Text values in SQL are usually written in single quotes. The condition above keeps only rows where the plan is exactly “free.”',
          quiz: {
            question: 'Which condition keeps only rows where plan is “free”?',
            options: ["WHERE plan = 'free'", 'WHERE plan IS ALL', 'ORDER BY plan = free'],
            answer: 0,
            explanation: 'WHERE filters rows by a condition, and the text value is written in single quotes.'
          }
        }
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
