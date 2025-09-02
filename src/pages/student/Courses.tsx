import React from 'react';

const StudentCourses: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-purple-700">Student Courses</h1>
      <p className="text-gray-600">This is a placeholder for the student's courses page.</p>
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-sm text-gray-500">No courses to show yet.</p>
      </div>
    </div>
  );
};

export default StudentCourses;
