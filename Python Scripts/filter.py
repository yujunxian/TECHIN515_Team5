import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt

fs = 50.0       # 每秒采集 50 次
cutoff = 4.0    # 截止频率，保留节奏和形状，压制噪声

data_df = pd.read_csv("data.csv")
# data = {data_df.columns[i]: data_df.iloc[:, i].tolist() for i in range(len(data_df.columns))}
data = {row[0]: row[1:].tolist() for row in data_df.values}
# 将每组 FSR 值平均

b, a = butter(N=2, Wn=2/(0.5*fs), btype='low')  # 二阶低通滤波器，cutoff=2Hz
# filtered = filtfilt(b, a, data) 

plt.figure(figsize=(12, 8))
print("Data columns:", data_df.columns)
# 第一列是 weights，第二到倒数第二列是 values
weights = data_df.iloc[:, 0].tolist()
fsr_values = data_df.iloc[:, 1:-1].values.tolist()


for idx, w in enumerate(weights):
    # 假设每个 fsr_values 是一个字符串形式的列表，需要转换
    if isinstance(fsr_values[idx], str):
        raw = np.array(eval(fsr_values[idx]))
    else:
        raw = np.array(fsr_values[idx])
    filtered_signal = filtfilt(b, a, raw)
    plt.subplot(6, 2, idx + 1)
    plt.plot(raw, label='Raw', color='orange')
    plt.plot(filtered_signal, label='Filtered', linestyle='--', color='brown')
    plt.title(f"Weight: {w} kg")
    plt.xlabel("Sample Index")
    plt.ylabel("FSR Value")
    plt.grid(True)
    # 在最后一个子图后添加图例到空白区域
    if idx == len(weights) - 1:
        plt.legend(loc='lower right')
        # plt.legend(loc='center left', bbox_to_anchor=(1.02, 3), borderaxespad=0.)

plt.tight_layout()
plt.show()
