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
    distance: { min: 40, max: 60 },
    accelX: { min: -0.2, max: 0.2 },
    accelY: { min: -0.2, max: 0.2 },
    accelZ: { min: -1.5, max: 1.5 },
};



// 箭头SVG
const Arrow = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path
      d={direction === 'left'
        ? 'M15 19l-7-7 7-7'
        : 'M9 5l7 7-7 7'}
      stroke="red"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    
    // 训练控制状态
    const [isTraining, setIsTraining] = useState(false);
    const [trainingData, setTrainingData] = useState<any[]>([]);
    const [trainingStartTime, setTrainingStartTime] = useState<number | null>(null);
    const [trainingResults, setTrainingResults] = useState<any | null>(null);
    const [showResults, setShowResults] = useState(false);
    
    // 历史数据展开状态
    const [expandedItems, setExpandedItems] = useState<boolean[]>([]);

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
                    
                    // 如果正在训练，记录数据
                    if (isTraining && data && data.weight !== undefined) {
                        setTrainingData(prev => [...prev, {
                            timestamp: Date.now(),
                            weight: data.weight,
                            accelX: data.accelX,
                            accelY: data.accelY,
                            accelZ: data.accelZ
                        }]);
                    }
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
    }, [status, database, isTraining]);

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
        if (!data) return { accel: "N/A"};

        const accel = data.accelX !== undefined && data.accelY !== undefined && data.accelZ !== undefined
            ? `X: ${data.accelX.toFixed(2)}, Y: ${data.accelY.toFixed(2)}, Z: ${data.accelZ.toFixed(2)}`
            : "N/A";


        return { accel };
    };

    // Check if MPU values are in range for coloring
    const getMpuSensorStatus = (data: any, type: 'accel' ) => {
        if (!data) return { bg: "bg-gray-50", text: "text-gray-700", indicator: "bg-gray-100" };

        // Check each axis for the specified type
        let allInRange = true;

        if (type === 'accel') {
            if (data.accelX !== undefined) allInRange = allInRange && isInRange('accelX', data.accelX);
            if (data.accelY !== undefined) allInRange = allInRange && isInRange('accelY', data.accelY);
            if (data.accelZ !== undefined) allInRange = allInRange && isInRange('accelZ', data.accelZ);
        } 

        return allInRange
            ? { bg: "bg-green-50", text: "text-gray-700", indicator: "bg-green-100" }  // 文本改为黑色
            : { bg: "bg-red-50", text: "text-gray-700", indicator: "bg-red-100" };
    };

    // 加速度可视化卡片背景色判断
    const accelZInRange =
        currentData &&
        currentData.accelZ !== undefined &&
        currentData.accelZ >= sensorRanges.accelZ.min &&
        currentData.accelZ <= sensorRanges.accelZ.max;

    
    // 优化的加速度提示逻辑
    const getAccelerationTip = (data: any) => {
        if (!data || data.accelX === undefined || data.accelY === undefined || data.accelZ === undefined) {
            return { message: "No data", color: "text-gray-500", priority: 0 };
        }

        const tips = [];
        
        // X轴检查 (左右倾斜)
        if (data.accelX < sensorRanges.accelX.min) {
            tips.push({ message: "Leaning left - adjust position", color: "text-red-600", priority: 3 });
        } else if (data.accelX > sensorRanges.accelX.max) {
            tips.push({ message: "Leaning right - adjust position", color: "text-red-600", priority: 3 });
        }
        
        // Y轴检查 (前后偏移)
        if (data.accelY < sensorRanges.accelY.min) {
            tips.push({ message: "Leaning backward too much", color: "text-orange-600", priority: 2 });
        } else if (data.accelY > sensorRanges.accelY.max) {
            tips.push({ message: "Leaning forward too much", color: "text-orange-600", priority: 2 });
        }
        
        // Z轴检查 (垂直加速度)
        if (data.accelZ < sensorRanges.accelZ.min) {
            tips.push({ message: "Insufficient vertical force", color: "text-yellow-600", priority: 1 });
        } else if (data.accelZ > sensorRanges.accelZ.max) {
            tips.push({ message: "Excessive vertical force", color: "text-yellow-600", priority: 1 });
        }
        
        // 如果所有值都在范围内
        if (tips.length === 0) {
            return { message: "Position optimal", color: "text-green-600", priority: 4 };
        }
        
        // 返回优先级最高的提示（优先级数字越大越重要）
        return tips.sort((a, b) => b.priority - a.priority)[0];
    };

    const accelerationTip = getAccelerationTip(currentData);

    // 训练控制函数
    const startTraining = () => {
        setIsTraining(true);
        setTrainingData([]);
        setTrainingStartTime(Date.now());
        setTrainingResults(null);
        setShowResults(false);
        console.log("Training started");
    };

    const endTraining = () => {
        setIsTraining(false);
        analyzeTrainingData();
        console.log("Training ended");
    };

    // 训练数据分析
    const analyzeTrainingData = () => {
        if (trainingData.length === 0) {
            setTrainingResults({
                totalCompressions: 0,
                inRangePercentage: 0,
                duration: 0,
                averageWeight: 0,
                message: "No training data recorded"
            });
            setShowResults(true);
            return;
        }

        const duration = trainingStartTime ? (Date.now() - trainingStartTime) / 1000 : 0;
        const weights = trainingData.map(d => d.weight).filter(w => w !== undefined);
        const inRangeCount = weights.filter(w => w >= 45 && w <= 55).length;
        const inRangePercentage = weights.length > 0 ? (inRangeCount / weights.length) * 100 : 0;
        const averageWeight = weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 0;
        
        // 简单的按压次数估算（基于重量变化）
        let compressions = 0;
        let wasInRange = false;
        for (let i = 1; i < weights.length; i++) {
            const currentInRange = weights[i] >= 45;
            const previousInRange = weights[i-1] >= 45;
            if (currentInRange && !previousInRange) {
                compressions++;
            }
        }

        const results = {
            totalCompressions: compressions,
            inRangePercentage: Math.round(inRangePercentage),
            duration: Math.round(duration),
            averageWeight: Math.round(averageWeight * 100) / 100,
            totalDataPoints: weights.length,
            message: `Training completed! ${compressions} compressions detected, ${Math.round(inRangePercentage)}% of pressure readings were in target range.`
        };

        setTrainingResults(results);
        setShowResults(true);
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
                        ["weights", "accelX", "accelY", "accelZ"].map(sensor => (
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Header - 更现代的头部设计 */}
            <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                    CPR Training Monitor
                                </h1>
                                <p className="text-sm text-gray-500">Professional Training Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-full">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-700">{session?.user?.email}</span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
                {/* 主标题和控制区域 */}
                <div className="mb-8">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                            CPR Training Dashboard
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Advanced CPR performance monitoring with real-time feedback and comprehensive analytics
                        </p>
                    </div>

                    {/* 训练控制和状态区域 */}
                    <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 mb-8">
                        {/* 训练控制按钮 */}
                        <div className="flex items-center space-x-4">
                            {!isTraining ? (
                                <button
                                    onClick={startTraining}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
                                >
                                    <span className="flex items-center space-x-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Start Training</span>
                                    </span>
                                    <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                </button>
                            ) : (
                                <button
                                    onClick={endTraining}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
                                >
                                    <span className="flex items-center space-x-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                                        </svg>
                                        <span>End Training</span>
                                    </span>
                                    <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                </button>
                            )}
                        </div>

                        {/* 状态指示器 */}
                        <div className="flex items-center space-x-4">
                            {isTraining && (
                                <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-2xl shadow-md">
                                    <div className="relative">
                                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                                        <div className="absolute inset-0 w-4 h-4 bg-red-400 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="font-semibold text-blue-800">Recording Session</span>
                                </div>
                            )}
                            
                            <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 rounded-2xl shadow-md">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="font-semibold text-emerald-800">Live Data</span>
                            </div>
                            
                            <div className="text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                                Updated: {currentTime}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 训练结果显示 - 重新设计 */}
                {showResults && trainingResults && (
                    <div className="mb-10 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl opacity-5"></div>
                        <div className="relative bg-white/90 backdrop-blur-md border border-blue-100 rounded-3xl p-8 shadow-2xl">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                    Training Performance Report
                                </h3>
                                <p className="text-gray-600">Comprehensive analysis of your CPR training session</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-4 right-4">
                                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-blue-600 mb-2">{trainingResults.totalCompressions}</p>
                                        <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Compressions</p>
                                    </div>
                                </div>

                                <div className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-4 right-4">
                                        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-emerald-600 mb-2">{trainingResults.inRangePercentage}%</p>
                                        <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">In Target Range</p>
                                    </div>
                                </div>

                                <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-4 right-4">
                                        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-purple-600 mb-2">{trainingResults.duration}s</p>
                                        <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Duration</p>
                                    </div>
                                </div>

                                <div className="group relative bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200 hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-4 right-4">
                                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-amber-600 mb-2">{trainingResults.averageWeight}</p>
                                        <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Avg Weight (kg)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200 mb-6">
                                <p className="text-lg text-gray-800 font-medium mb-2">{trainingResults.message}</p>
                                <p className="text-sm text-gray-600">
                                    Total data points analyzed: <span className="font-semibold">{trainingResults.totalDataPoints}</span>
                                </p>
                            </div>

                            <div className="text-center">
                                <button
                                    onClick={() => setShowResults(false)}
                                    className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                                >
                                    Close Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 历史数据部分 */}
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Historical Data Analysis</h3>
                                    <p className="text-gray-300">Comprehensive sensor data archive and trends</p>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-white">Live Archive</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="space-y-6">
                            {collapseItems.map((item, index) => (
                                <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                    <div 
                                        className="p-6 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                                        onClick={() => {
                                            const newExpandedItems = [...expandedItems];
                                            newExpandedItems[index] = !newExpandedItems[index];
                                            setExpandedItems(newExpandedItems);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    index === 0 ? 'bg-blue-100 text-blue-600' :
                                                    index === 1 ? 'bg-purple-100 text-purple-600' :
                                                    'bg-teal-100 text-teal-600'
                                                }`}>
                                                    {index === 0 ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 5.25l-7.5 7.5-4.5-4.5m0 0l-6.75 6.75a.75.75 0 01-1.06-1.06L10.94 8.19a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06z" />
                                                        </svg>
                                                    ) : index === 1 ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-800">{item.label}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        {index === 0 ? 'Force measurement records' :
                                                         index === 1 ? 'Motion and position data' :
                                                         'Distance measurement logs'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-gray-600">
                                                        {collapseItems.length > 0 ? `${grouped[item.key]?.length || 0} records` : '0 records'}
                                                    </p>
                                                    <p className="text-xs text-gray-400">Total entries</p>
                                                </div>
                                                <svg 
                                                    className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                                                        expandedItems[index] ? 'rotate-180' : ''
                                                    }`} 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedItems[index] && (
                                        <div className="border-t border-gray-200 bg-white p-6">
                                            <div className="max-h-96 overflow-y-auto">
                                                {/* 这里显示具体的数据内容 */}
                                                <div dangerouslySetInnerHTML={{ __html: item.children }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* 如果没有数据的话显示空状态 */}
                        {(!historicalData || historicalData.length === 0) && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Historical Data Available</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    Start a training session to begin collecting sensor data. Historical data will appear here once you complete your first session.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}