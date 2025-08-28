import React from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

const defaultData = [
  { day: "Mon", activity: 4, performance: 30, attendance: 2 },
  { day: "Tue", activity: 3, performance: 45, attendance: 3 },
  { day: "Wed", activity: 5, performance: 60, attendance: 3 },
  { day: "Thu", activity: 7, performance: 80, attendance: 4 },
  { day: "Fri", activity: 6, performance: 75, attendance: 3 },
  { day: "Sat", activity: 4, performance: 65, attendance: 2 },
  { day: "Sun", activity: 2, performance: 50, attendance: 1 },
];

interface ChartData {
  day?: string;
  activity?: number;
  performance?: number;
  attendance?: number;
  date?: string;
  activity_count?: number;
}

interface UserPerformanceChartProps {
  data?: ChartData[];
}

const UserPerformanceChart: React.FC<UserPerformanceChartProps> = ({ data }) => {
  // If data is provided in weekly_progress format, map it to chart format
  let chartData: ChartData[] = defaultData;
  if (data && data.length > 0 && data[0].date && typeof data[0].activity_count === "number") {
    chartData = data.map((item) => ({
      day: item.date,
      activity: item.activity_count,
    }));
  } else if (data) {
    chartData = data;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 10,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "#fff", 
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "none" 
          }} 
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="performance"
          name="Performance"
          stroke="#8154eb"
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        <Line
          type="monotone"
          dataKey="activity"
          name="Activities"
          stroke="#e91e63"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="attendance"
          name="Attendance"
          stroke="#03a9f4"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default UserPerformanceChart;
