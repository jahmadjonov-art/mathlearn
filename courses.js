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
      label: '2 starter lessons',
      title: 'Everyday English',
      description: 'Make sentences clearer, choose stronger words, and feel more at home with grammar.',
      meta: ['2 short lessons', 'Beginner friendly'],
      href: 'course.html?course=english',
      cta: 'Start learning English',
      search: 'english writing grammar sentences words reading'
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
    english: {
      title: 'Everyday English',
      eyebrow: 'English · Writing foundations',
      intro: 'Small, practical lessons for writing sentences that say exactly what you mean.',
      lessons: [
        {
          title: 'Build a clear sentence',
          duration: '4 min',
          paragraphs: [
            'A sentence is a complete thought. At its simplest, it tells us who or what we are talking about and what that person or thing does.',
            'The subject names the person, place, or thing. The predicate tells us something about it. Put them together and your reader has a clear idea.'
          ],
          example: 'The curious student opened the book.',
          callout: 'A quick check: ask “who or what?” to find the subject, then ask “did what?” to find the predicate.',
          quiz: {
            question: 'In “The curious student opened the book,” which words are the subject?',
            options: ['opened the book', 'The curious student', 'the book'],
            answer: 1,
            explanation: '“The curious student” is who the sentence is about. “Opened the book” tells what that student did.'
          }
        },
        {
          title: 'Make verbs agree',
          duration: '5 min',
          paragraphs: [
            'A verb should match its subject. A singular subject takes a singular verb; a plural subject takes a plural verb.',
            'Do not let extra words between the subject and verb distract you. Find the real subject first, then make the verb agree with it.'
          ],
          example: 'The list of books is on the desk.\nThe books are on the desk.',
          callout: 'In the first sentence, the subject is “list,” not “books.” The phrase “of books” adds detail but does not change the subject.',
          quiz: {
            question: 'Choose the verb that agrees: “A box of old letters ___ in the attic.”',
            options: ['are', 'is', 'were'],
            answer: 1,
            explanation: '“Box” is the singular subject, so “is” is the matching verb. The plural word “letters” is inside a describing phrase.'
          }
        }
      ]
    },
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
