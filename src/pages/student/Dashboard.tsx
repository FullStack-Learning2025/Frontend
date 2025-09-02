import React from 'react';

const StudentDashboard: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-purple-700">Student Dashboard</h1>
      <p className="text-gray-600">Welcome to your dashboard. Here you will find your courses, exams, and updates.</p>
      {/* TODO: Add widgets for enrolled courses, upcoming exams, recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Enrolled Courses</h2>
          <p className="text-sm text-gray-500">You are not enrolled in any courses yet.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Upcoming Exams</h2>
          <p className="text-sm text-gray-500">No upcoming exams.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Recent Activity</h2>
          <p className="text-sm text-gray-500">No recent activity.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
