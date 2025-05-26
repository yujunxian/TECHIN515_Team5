import serial
import re
import matplotlib.pyplot as plt
from collections import deque

# 配置串口
PORT = '/dev/cu.usbmodem14301'  
BAUD = 115200

# 初始化缓冲区
N = 100  # 显示的历史点数
weights = deque([0]*N, maxlen=N)

# 打开串口
ser = serial.Serial(PORT, BAUD)
plt.ion()
fig, ax = plt.subplots()
line, = ax.plot(range(N), list(weights))
ax.set_ylim(0, 100)
ax.set_title("Real-time Weight")


ax.set_ylabel("kg")
ax.set_xlabel("Sample Index")

while True:
    try:
        raw = ser.readline().decode()
        match = re.search(r"WEIGHT:([\d\.]+)", raw)
        if match:
            w = float(match.group(1))
            weights.append(w)

            line.set_ydata(list(weights))
            print("weight:", w)
            ax.set_ylim(min(weights)-5, max(weights)+5)
            plt.pause(0.01)
    except Exception as e:
        print("Error:", e)
