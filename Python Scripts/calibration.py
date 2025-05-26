import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

# Raw data
adc_values = np.array([
    650.45, 943.7, 1097.35, 1209.1,
    1677.5, 1814.85, 1995.5, 2110.3, 2081.85, 2200.1
])
weights = np.array([
    8,  14, 16, 22, 
    30, 38, 43, 48.5, 53.5, 61.5
])


adc_values = adc_values.reshape(-1, 1)
weights = weights.reshape(-1, 1)


# Linear regression
lin_reg = LinearRegression()
lin_reg.fit(adc_values, weights)
weight_pred_linear = lin_reg.predict(adc_values)
r2_linear = r2_score(weights, weight_pred_linear)
print(f"Linear regression R²: {r2_linear:.3f}")
print(f"Linear regression coefficients: {lin_reg.coef_[0][0]:.3f}, intercept: {lin_reg.intercept_[0]:.3f}")
print(f"Linear regression equation: y = {lin_reg.coef_[0][0]:.3f} * x + {lin_reg.intercept_[0]:.3f}")

# Logarithmic regression: log(x)
log_adc = np.log(adc_values)
log_reg = LinearRegression()
log_reg.fit(log_adc, weights)
weight_pred_log = log_reg.predict(log_adc)
r2_log = r2_score(weights, weight_pred_log)

print(f"Logarithmic regression R²: {r2_log:.3f}")
print(f"Logarithmic regression coefficients: {log_reg.coef_[0][0]:.3f}, intercept: {log_reg.intercept_[0]:.3f}")
print(f"Logarithmic regression equation: y = {log_reg.coef_[0][0]:.3f} * log(x) + {log_reg.intercept_[0]:.3f}")
# Plot
plt.figure(figsize=(10, 6))
plt.scatter(adc_values, weights, label="Data", color='black')
plt.plot(adc_values, weight_pred_linear, label=f"Linear fit (R²={r2_linear:.3f})")
plt.plot(adc_values, weight_pred_log, label=f"Log fit (R²={r2_log:.3f})")
plt.xlabel("ADC Value")
plt.ylabel("Weight (kg)")
plt.title("FSR Calibration Curve Fit")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
