'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        registration_number: 'T22-03-04321',
        full_name: 'Demo Student',
        email: 'student@test.com',
        password_hash: passwordHash,
        role: 'student',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        registration_number: 'T22-03-11759',
        full_name: 'Demo Lecturer',
        email: 'lecturer@test.com',
        password_hash: passwordHash,
        role: 'lecturer',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        registration_number: 'T22-03-00001',
        full_name: 'Demo Admin',
        email: 'admin@test.com',
        password_hash: passwordHash,
        role: 'administrator',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    const [users] = await queryInterface.sequelize.query(
      "SELECT id, role FROM users WHERE email IN ('lecturer@test.com') LIMIT 1"
    );
    const lecturerId = users[0].id;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);

    await queryInterface.bulkInsert('examinations', [
      {
        title: 'Introduction to Computer Science — Demo Exam',
        description: 'A sample exam for system demonstration and testing purposes.',
        created_by: lecturerId,
        scheduled_at: scheduledAt,
        duration_minutes: 60,
        status: 'active',
        created_at: now,
        updated_at: now
      }
    ]);

    const [exams] = await queryInterface.sequelize.query(
      "SELECT id FROM examinations LIMIT 1"
    );
    const examId = exams[0].id;

    await queryInterface.bulkInsert('questions', [
      {
        exam_id: examId,
        question_text: 'What does CPU stand for?',
        question_type: 'mcq',
        options: JSON.stringify(['Central Processing Unit', 'Computer Personal Unit', 'Core Processing Utility', 'Central Program Unit']),
        correct_answer: 'Central Processing Unit',
        marks: 2,
        created_at: now,
        updated_at: now
      },
      {
        exam_id: examId,
        question_text: 'A binary number uses only the digits 0 and 1.',
        question_type: 'true_false',
        options: JSON.stringify(['True', 'False']),
        correct_answer: 'True',
        marks: 1,
        created_at: now,
        updated_at: now
      },
      {
        exam_id: examId,
        question_text: 'Which programming paradigm does Java primarily follow?',
        question_type: 'mcq',
        options: JSON.stringify(['Functional', 'Object-Oriented', 'Procedural', 'Logic']),
        correct_answer: 'Object-Oriented',
        marks: 2,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('questions', null, {});
    await queryInterface.bulkDelete('examinations', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
