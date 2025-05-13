#!/usr/bin/env python3
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import random
import time
import json
import os
from datetime import datetime

# 请替换为您的Firebase服务账号密钥文件路径
# 可以从Firebase控制台 -> 项目设置 -> 服务账号 -> 生成新的私钥下载
CREDENTIAL_PATH = "techin515-5e18e-firebase-adminsdk-fbsvc-2a98a979c5.json"

# 请替换为您的Firebase数据库URL
DATABASE_URL = "https://techin515-5e18e-default-rtdb.firebaseio.com/"

def initialize_firebase():
    """初始化Firebase连接"""
    try:
        # 检查是否已初始化
        firebase_admin.get_app()
    except ValueError:
        # 如果尚未初始化，则初始化
        cred = credentials.Certificate(CREDENTIAL_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': DATABASE_URL
        })
    
    print("Firebase已初始化")

def random_in_range(min_val, max_val):
    """生成范围内的随机浮点数"""
    return random.uniform(min_val, max_val)

def generate_mock_data(in_range=True):
    """生成模拟传感器数据"""
    # 定义范围 - 与仪表板中的范围匹配
    ranges = {
        "distance": {"min": 4, "max": 6},         # 理想CPR深度范围
        "accelX": {"min": -0.5, "max": 0.5},      # 加速度计X轴范围
        "accelY": {"min": -0.5, "max": 0.5},      # 加速度计Y轴范围
        "accelZ": {"min": -1.5, "max": -0.5},     # 加速度计Z轴范围
        "gyroX": {"min": -5, "max": 5},           # 陀螺仪X轴范围
        "gyroY": {"min": -5, "max": 5},           # 陀螺仪Y轴范围
        "gyroZ": {"min": -5, "max": 5}            # 陀螺仪Z轴范围
    }
    
    # 如果需要超出范围的值
    if not in_range:
        # 修改部分范围，使值超出
        ranges["distance"] = {"min": 2, "max": 3}     # 太浅
        ranges["accelX"] = {"min": 0.8, "max": 1.2}   # 太大
        ranges["gyroZ"] = {"min": 8, "max": 10}       # 太大
    
    # 生成数据
    return {
        "distance": random_in_range(ranges["distance"]["min"], ranges["distance"]["max"]),
        "accelX": random_in_range(ranges["accelX"]["min"], ranges["accelX"]["max"]),
        "accelY": random_in_range(ranges["accelY"]["min"], ranges["accelY"]["max"]),
        "accelZ": random_in_range(ranges["accelZ"]["min"], ranges["accelZ"]["max"]),
        "gyroX": random_in_range(ranges["gyroX"]["min"], ranges["gyroX"]["max"]),
        "gyroY": random_in_range(ranges["gyroY"]["min"], ranges["gyroY"]["max"]),
        "gyroZ": random_in_range(ranges["gyroZ"]["min"], ranges["gyroZ"]["max"]),
        "timestamp": int(time.time() * 1000)  # 当前时间戳（毫秒）
    }

def generate_historical_data(count=20):
    """生成历史数据"""
    data = {}
    
    # 获取当前时间
    current_time = int(time.time() * 1000)
    timestamp = current_time - (count * 30000)  # 每30秒一条数据
    
    for i in range(count):
        # 随机决定是否在范围内 (70%的概率在范围内)
        in_range = random.random() < 0.7
        
        # 创建数据点
        data_point = generate_mock_data(in_range)
        data_point["timestamp"] = timestamp
        
        # 添加到历史数据中
        data_id = f"data-{i}-{timestamp}"
        data[data_id] = data_point
        
        # 增加时间戳 (10-60秒的随机间隔)
        timestamp += random.randint(10000, 60000)
    
    return data

def upload_mock_data():
    """上传模拟数据到Firebase"""
    try:
        print("开始上传模拟数据到Firebase...")
        
        # 生成本次批次唯一sessionId
        session_id = f"batch-{int(time.time())}"
        
        # 生成并上传当前数据（50%概率在范围内，50%概率不在范围内）
        in_range = random.random() < 0.5
        current_data = generate_mock_data(in_range)
        current_data["sessionId"] = session_id
        
        # 上传当前数据
        ref = db.reference('sensors/latest')
        ref.set(current_data)
        print("当前数据上传成功:", json.dumps(current_data, indent=2))
        
        # 生成并上传历史数据 (20条)
        history_data = generate_historical_data(20)
        # 给每条历史数据加上同一个sessionId
        for v in history_data.values():
            v["sessionId"] = session_id
        
        # 上传历史数据（每条为一个节点，便于前端分组）
        ref = db.reference('sensors/history')
        ref.update(history_data)
        print(f"历史数据上传成功: {len(history_data)}条记录")
        
        return {
            "success": True,
            "message": "模拟数据已成功上传到Firebase",
            "current_data": current_data,
            "history_count": len(history_data)
        }
    
    except Exception as e:
        print(f"上传数据时出错: {str(e)}")
        return {
            "success": False,
            "message": f"上传失败: {str(e)}",
            "error": str(e)
        }

if __name__ == "__main__":
    print("CPR训练模拟数据生成器")
    print("=====================")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 初始化Firebase
    initialize_firebase()
    
    # 上传数据
    result = upload_mock_data()
    
    # 显示结果
    if result["success"]:
        print("\n✅ 成功!")
        print(f"当前数据状态: {'在范围内' if result['current_data']['distance'] >= 5 and result['current_data']['distance'] <= 6 else '超出范围'}")
        print(f"历史数据数量: {result['history_count']}条")
    else:
        print("\n❌ 失败!")
        print(f"错误: {result['message']}")
    
    print("\n现在可以查看您的仪表板以查看更新的数据。")