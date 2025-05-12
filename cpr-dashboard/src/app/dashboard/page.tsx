// // src/app/dashboard/page.tsx
// "use client";

// import { useSession, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { getDatabase, ref, onValue, query, limitToLast, orderByChild } from "firebase/database";
// import { initializeApp } from "firebase/app";

// // Basic chart component for data visualization
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer
// } from 'recharts';

// // Firebase configuration
// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const database = getDatabase(app);

// export default function DashboardPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [currentData, setCurrentData] = useState<any>(null);
//   const [historicalData, setHistoricalData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedSensor, setSelectedSensor] = useState("temperature"); // Default selected sensor

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/login");
//     }
//   }, [status, router]);

//   useEffect(() => {
//     if (status === "authenticated") {
//       // Subscribe to latest data
//       const latestDataRef = ref(database, 'sensors/latest');
//       const unsubscribe = onValue(latestDataRef, (snapshot) => {
//         const data = snapshot.val();
//         setCurrentData(data);
//         setLoading(false);
//       });

//       // Get historical data
//       const historyRef = query(
//         ref(database, 'sensors/history'),
//         orderByChild('timestamp'),
//         limitToLast(20)
//       );
      
//       onValue(historyRef, (snapshot) => {
//         const data = snapshot.val();
//         if (data) {
//           // Convert object to array and sort by timestamp
//           const dataArray = Object.keys(data).map(key => ({
//             id: key,
//             ...data[key],
//             // Convert timestamp to readable date/time
//             time: new Date(data[key].timestamp).toLocaleTimeString()
//           }));
          
//           // Sort by timestamp
//           dataArray.sort((a, b) => a.timestamp - b.timestamp);
          
//           setHistoricalData(dataArray);
//         } else {
//           setHistoricalData([]);
//         }
//       });

//       return () => {
//         unsubscribe();
//       };
//     }
//   }, [status, database]);

//   const handleSignOut = () => {
//     signOut({ callbackUrl: "/login" });
//   };

//   if (status === "loading" || loading) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center">
//         <p className="text-xl">Loading dashboard...</p>
//       </div>
//     );
//   }

//   // Format the current time
//   const currentTime = new Date().toLocaleString();

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between h-16 items-center">
//             <h1 className="text-xl font-bold">CPR Data Dashboard</h1>
//             <div className="flex items-center space-x-4">
//               <span className="text-sm text-gray-700">
//                 {session?.user?.email}
//               </span>
//               <button
//                 onClick={handleSignOut}
//                 className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
//               >
//                 Sign Out
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
//         {/* Dashboard Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
//           {/* Current Data Panel */}
//           <div className="md:col-span-2 bg-white rounded-lg shadow">
//             <div className="p-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-xl font-semibold text-gray-800">Current Sensor Data</h2>
//                 <p className="text-sm text-gray-500">Last updated: {currentTime}</p>
//               </div>
              
//               {currentData ? (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {/* Temperature Card */}
//                   <div className="bg-blue-50 rounded-lg p-4">
//                     <p className="text-sm text-blue-700 font-medium">Distance</p>
//                     <p className="text-3xl font-bold mt-2">
//                       {currentData.distance ? `${currentData.temperature}°C` : "N/A"}
//                     </p>
//                   </div>
                  
//                   {/* Humidity Card */}
//                   <div className="bg-green-50 rounded-lg p-4">
//                     <p className="text-sm text-green-700 font-medium">Humidity</p>
//                     <p className="text-3xl font-bold mt-2">
//                       {currentData.humidity ? `${currentData.humidity}%` : "N/A"}
//                     </p>
//                   </div>
                  
//                   {/* Light Card */}
//                   <div className="bg-yellow-50 rounded-lg p-4">
//                     <p className="text-sm text-yellow-700 font-medium">Light</p>
//                     <p className="text-3xl font-bold mt-2">
//                       {currentData.light ? `${currentData.light} lux` : "N/A"}
//                     </p>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-center h-48">
//                   <p className="text-gray-500 text-lg">No sensor data available</p>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Historical Data Panel */}
//           <div className="bg-white rounded-lg shadow">
//             <div className="p-6">
//               <h2 className="text-xl font-semibold text-gray-800 mb-4">Historical Data</h2>
              
//               {/* Sensor Type Selector */}
//               <div className="mb-4">
//                 <label htmlFor="sensor-select" className="block text-sm font-medium text-gray-700 mb-1">
//                   Select Sensor
//                 </label>
//                 <select
//                   id="sensor-select"
//                   value={selectedSensor}
//                   onChange={(e) => setSelectedSensor(e.target.value)}
//                   className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                 >
//                   <option value="temperature">Temperature</option>
//                   <option value="humidity">Humidity</option>
//                   <option value="light">Light</option>
//                 </select>
//               </div>
              
//               {/* History List */}
//               <div className="overflow-y-auto h-[400px]">
//                 {historicalData.length > 0 ? (
//                   <ul className="divide-y divide-gray-200">
//                     {historicalData.map((item) => (
//                       <li key={item.id} className="py-3">
//                         <div className="flex justify-between">
//                           <p className="text-sm font-medium text-gray-900">
//                             {new Date(item.timestamp).toLocaleString()}
//                           </p>
//                           <p className="text-sm text-gray-500">
//                             {selectedSensor === "temperature" && `${item.temperature}°C`}
//                             {selectedSensor === "humidity" && `${item.humidity}%`}
//                             {selectedSensor === "light" && `${item.light} lux`}
//                           </p>
//                         </div>
//                       </li>
//                     ))}
//                   </ul>
//                 ) : (
//                   <div className="flex items-center justify-center h-full">
//                     <p className="text-gray-500">No historical data available</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
        
//         {/* Chart Section */}
//         <div className="mt-6 bg-white rounded-lg shadow p-6">
//           <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Trends</h2>
          
//           {historicalData.length > 0 ? (
//             <div className="h-80">
//               <ResponsiveContainer width="100%" height="100%">
//                 <LineChart
//                   data={historicalData}
//                   margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
//                 >
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="time" />
//                   <YAxis />
//                   <Tooltip />
//                   <Legend />
//                   {selectedSensor === "temperature" && (
//                     <Line 
//                       type="monotone" 
//                       dataKey="temperature" 
//                       stroke="#3B82F6" 
//                       name="Temperature (°C)" 
//                     />
//                   )}
//                   {selectedSensor === "humidity" && (
//                     <Line 
//                       type="monotone" 
//                       dataKey="humidity" 
//                       stroke="#10B981" 
//                       name="Humidity (%)" 
//                     />
//                   )}
//                   {selectedSensor === "light" && (
//                     <Line 
//                       type="monotone" 
//                       dataKey="light" 
//                       stroke="#F59E0B" 
//                       name="Light (lux)" 
//                     />
//                   )}
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
//           ) : (
//             <div className="flex items-center justify-center h-80">
//               <p className="text-gray-500">No data available for chart</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// src/app/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { initializeApp } from "firebase/app";
import ForceVisualization from "./force-visualization";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentData, setCurrentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      console.log("Connecting to Firebase database...");
      
      try {
        // Subscribe to latest data
        const latestDataRef = ref(database, 'sensors/latest');
        const unsubscribe = onValue(latestDataRef, (snapshot) => {
          const data = snapshot.val();
          console.log("Latest data received:", data);
          setCurrentData(data);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching latest data:", error);
          setError("Failed to fetch sensor data: " + error.message);
          setLoading(false);
        });

        return () => {
          unsubscribe();
        };
      } catch (err) {
        console.error("Error setting up Firebase listeners:", err);
        setError("Failed to connect to database");
        setLoading(false);
      }
    }
  }, [status, database]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  // Calculate average distance if data is available
  const calculateAverage = () => {
    if (!currentData) return "N/A";
    
    const { distance1, distance2, distance3, distance4 } = currentData;
    if (distance1 === undefined || distance2 === undefined || 
        distance3 === undefined || distance4 === undefined) {
      return "N/A";
    }
    
    const avg = (distance1 + distance2 + distance3 + distance4) / 4;
    return avg.toFixed(2) + " cm";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-xl">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 w-full max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <p className="mt-2 text-xs text-red-600">
                Please check your Firebase configuration and try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format the current time
  const currentTime = new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">CPR Data Monitor</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session?.user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:flex md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold text-gray-800">CPR Data Dashboard</h2>
            <p className="text-gray-600 mt-1">Monitor pressure distribution across sensors</p>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="-ml-1 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Live Data
            </span>
            <p className="text-sm text-gray-500 ml-4">Last updated: {currentTime}</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Visualization Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <ForceVisualization sensorData={currentData} />
          </div>
          
          {/* Sensor Data Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Sensor Readings</h3>
            
            {currentData ? (
              <div className="space-y-4">
                {/* Sensor Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Distance 1 */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Sensor 1</p>
                        <p className="text-2xl font-bold mt-1">
                          {currentData.distance1 !== undefined ? `${currentData.distance1} cm` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Top Left Corner</p>
                  </div>

                  {/* Distance 2 */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Sensor 2</p>
                        <p className="text-2xl font-bold mt-1">
                          {currentData.distance2 !== undefined ? `${currentData.distance2} cm` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Top Right Corner</p>
                  </div>

                  {/* Distance 3 */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Sensor 3</p>
                        <p className="text-2xl font-bold mt-1">
                          {currentData.distance3 !== undefined ? `${currentData.distance3} cm` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Bottom Left Corner</p>
                  </div>

                  {/* Distance 4 */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Sensor 4</p>
                        <p className="text-2xl font-bold mt-1">
                          {currentData.distance4 !== undefined ? `${currentData.distance4} cm` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Bottom Right Corner</p>
                  </div>
                </div>

                {/* Average and Force Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Average Distance */}
                  <div className="border rounded-lg p-4 bg-purple-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Average Distance</p>
                        <p className="text-2xl font-bold mt-1">{calculateAverage()}</p>
                      </div>
                      <div className="bg-purple-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">All Sensors</p>
                  </div>

                  {/* Force Sensor */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-green-700">Force</p>
                        <p className="text-2xl font-bold mt-1">
                          {currentData.force !== undefined ? `${currentData.force} N` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-green-100 p-2 rounded-full">
                        <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Pressure Sensor</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sensor data</h3>
                  <p className="mt-1 text-sm text-gray-500">Connect your ESP32 or check Firebase configuration.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}