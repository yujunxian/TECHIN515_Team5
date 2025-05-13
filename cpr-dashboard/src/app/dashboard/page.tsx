"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDatabase, ref, onValue, query, limitToLast, orderByChild } from "firebase/database";
import { initializeApp } from "firebase/app";
import { Collapse } from 'antd';
import 'antd/dist/reset.css';

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

// Define sensor ranges for valid values
const sensorRanges = {
    distance: { min: 4.8, max: 6.2 },
    accelX: { min: -0.2, max: 0.2 },
    accelY: { min: -0.2, max: 0.2 },
    accelZ: { min: -1.5, max: -0.5 },
    gyroX: { min: -5, max: 5 },
    gyroY: { min: -5, max: 5 },
    gyroZ: { min: -5, max: 5 }
};

// 替换历史数据区域为按sessionId分组的折叠面板
// 分组函数
function groupBySessionId(data: any[]) {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
        const sessionId = item.sessionId || 'unknown';
        if (!groups[sessionId]) groups[sessionId] = [];
        groups[sessionId].push(item);
    });
    return groups;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [currentData, setCurrentData] = useState<any>(null);
    const [historicalData, setHistoricalData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSensor, setSelectedSensor] = useState("distance"); // Default selected sensor

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

                // Get historical data
                const historyRef = query(
                    ref(database, 'sensors/history'),
                    orderByChild('timestamp'),
                    // limitToLast(20)
                );

                onValue(historyRef, (snapshot) => {
                    const data = snapshot.val();
                    console.log("Historical data received:", data);
                    if (data) {
                        // Convert object to array and sort by timestamp
                        const dataArray = Object.keys(data).map(key => ({
                            id: key,
                            ...data[key],
                            // Convert timestamp to readable date/time
                            time: new Date(data[key].timestamp*1000).toLocaleTimeString()
                        }));

                        // Sort by timestamp (descending - newest first)
                        dataArray.sort((a, b) => b.timestamp - a.timestamp);

                        setHistoricalData(dataArray);
                    } else {
                        setHistoricalData([]);
                    }
                }, (error) => {
                    console.error("Error fetching historical data:", error);
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

    // Check if a value is within the specified range
    const isInRange = (sensor: string, value: number): boolean => {
        if (!sensorRanges[sensor as keyof typeof sensorRanges]) return true; // Default to true if range not defined
        const range = sensorRanges[sensor as keyof typeof sensorRanges];
        return value >= range.min && value <= range.max;
    };

    // Get background and text colors based on range check
    const getSensorBoxColors = (sensor: string, value: number | undefined) => {
        if (value === undefined) return { bg: "bg-gray-50", text: "text-gray-700", indicator: "bg-gray-100" };

        return isInRange(sensor, value)
            ? { bg: "bg-green-50", text: "text-gray-700", indicator: "bg-green-100" }  // 文本改为黑色
            : { bg: "bg-red-50", text: "text-gray-700", indicator: "bg-red-100" };
    };

    // Format MPU data for display
    const formatMpuData = (data: any) => {
        if (!data) return { accel: "N/A", gyro: "N/A" };

        const accel = data.accelX !== undefined && data.accelY !== undefined && data.accelZ !== undefined
            ? `X: ${data.accelX.toFixed(2)}, Y: ${data.accelY.toFixed(2)}, Z: ${data.accelZ.toFixed(2)}`
            : "N/A";

        const gyro = data.gyroX !== undefined && data.gyroY !== undefined && data.gyroZ !== undefined
            ? `X: ${data.gyroX.toFixed(2)}, Y: ${data.gyroY.toFixed(2)}, Z: ${data.gyroZ.toFixed(2)}`
            : "N/A";

        return { accel, gyro };
    };

    // Check if MPU values are in range for coloring
    const getMpuSensorStatus = (data: any, type: 'accel' | 'gyro') => {
        if (!data) return { bg: "bg-gray-50", text: "text-gray-700", indicator: "bg-gray-100" };

        // Check each axis for the specified type
        let allInRange = true;

        if (type === 'accel') {
            if (data.accelX !== undefined) allInRange = allInRange && isInRange('accelX', data.accelX);
            if (data.accelY !== undefined) allInRange = allInRange && isInRange('accelY', data.accelY);
            if (data.accelZ !== undefined) allInRange = allInRange && isInRange('accelZ', data.accelZ);
        } else if (type === 'gyro') {
            if (data.gyroX !== undefined) allInRange = allInRange && isInRange('gyroX', data.gyroX);
            if (data.gyroY !== undefined) allInRange = allInRange && isInRange('gyroY', data.gyroY);
            if (data.gyroZ !== undefined) allInRange = allInRange && isInRange('gyroZ', data.gyroZ);
        }

        return allInRange
            ? { bg: "bg-green-50", text: "text-gray-700", indicator: "bg-green-100" }  // 文本改为黑色
            : { bg: "bg-red-50", text: "text-gray-700", indicator: "bg-red-100" };
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
    const mpuData = formatMpuData(currentData);

    // Get color classes for each sensor box
    const distanceColors = getSensorBoxColors('distance', currentData?.distance);
    const accelColors = getMpuSensorStatus(currentData, 'accel');
    const gyroColors = getMpuSensorStatus(currentData, 'gyro');
    
    // 在组件内部，替换历史数据渲染部分
    const grouped = groupBySessionId(historicalData);

    // 构建Collapse的items数组
    const collapseItems = Object.entries(grouped).map(([sessionId, readings]) => ({
        key: sessionId,
        label: `Batch: ${sessionId}(${readings.length} pieces, Start Time: ${readings[0]?.timestamp ? new Date(readings[0].timestamp * 1000).toLocaleString() : 'N/A'})`,
        children: (
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {readings.map((item: any, idx: number) =>
                        ['distance','accelX','accelY','accelZ','gyroX','gyroY','gyroZ'].map(sensor => (
                            <tr
                                key={`${item.sessionId || 'unknown'}-${item.timestamp || idx}-${sensor}`}
                                className="hover:bg-gray-50"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{sensor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {item[sensor] !== undefined ? (typeof item[sensor] === 'number' ? item[sensor].toFixed(2) : item[sensor]) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {typeof item[sensor] === 'number' ? (
                                        isInRange(sensor, item[sensor]) ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">In Range</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Range</span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">N/A</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        )
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <h1 className="text-xl font-bold">CPR Training Monitor</h1>
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
                        <h2 className="text-2xl font-bold text-gray-800">CPR Training Dashboard</h2>
                        <p className="text-gray-600 mt-1">Monitor CPR performance with MPU and TOF sensors</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <svg className="-ml-1 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                            </svg>
                            Live Data
                        </span>
                        <p className="text-sm text-gray-500">Last updated: {currentTime}</p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Left Panel - Current Sensor Readings */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Current Sensor Readings</h3>
                            <p className="text-sm text-gray-500 mt-1">Green indicates values within normal range</p>
                        </div>

                        <div className="p-6">
                            {currentData ? (
                                <div className="space-y-6">
                                    {/* TOF Distance Sensor */}
                                    <div className={`rounded-lg p-5 ${distanceColors.bg}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`text-sm font-medium ${distanceColors.text}`}>TOF Distance</p>
                                                <p className="text-3xl font-bold mt-2">
                                                    {currentData.distance !== undefined ? `${currentData.distance.toFixed(1)} cm` : "N/A"}
                                                </p>
                                            </div>
                                            <div className={`p-3 rounded-full ${distanceColors.indicator}`}>
                                                <svg className={`h-6 w-6 ${distanceColors.text}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className={`text-sm ${distanceColors.text} mt-3`}>Compression depth measurement</p>
                                    </div>

                                    {/* MPU Sensor - Accelerometer */}
                                    <div className={`rounded-lg p-5 ${accelColors.bg}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`text-sm font-medium ${accelColors.text}`}>Accelerometer</p>
                                                <p className="text-xl font-bold mt-2">{mpuData.accel}</p>
                                            </div>
                                            <div className={`p-3 rounded-full ${accelColors.indicator}`}>
                                                <svg className={`h-6 w-6 ${accelColors.text}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className={`text-sm ${accelColors.text} mt-3`}>Motion tracking (g)</p>
                                    </div>

                                    {/* MPU Sensor - Gyroscope */}
                                    <div className={`rounded-lg p-5 ${gyroColors.bg}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`text-sm font-medium ${gyroColors.text}`}>Gyroscope</p>
                                                <p className="text-xl font-bold mt-2">{mpuData.gyro}</p>
                                            </div>
                                            <div className={`p-3 rounded-full ${gyroColors.indicator}`}>
                                                <svg className={`h-6 w-6 ${gyroColors.text}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className={`text-sm ${gyroColors.text} mt-3`}>Rotation rate (deg/s)</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No sensor data</h3>
                                        <p className="mt-1 text-sm text-gray-500">Connect your sensors or check your Firebase configuration.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Historical Data */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Historical Data</h3>
                        </div>

                        <div className="p-6">
                            <Collapse accordion items={collapseItems} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}