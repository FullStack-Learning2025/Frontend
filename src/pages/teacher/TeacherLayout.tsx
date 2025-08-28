
import React from "react";
import { Outlet } from "react-router-dom";

// This is a placeholder component - the actual TeacherLayout is in src/layouts/TeacherLayout.tsx
const TeacherLayout = () => {
  return (
    <div>
      <p>This layout is not used. Please use the one in src/layouts/TeacherLayout.tsx</p>
      <Outlet />
    </div>
  );
};

export default TeacherLayout;
