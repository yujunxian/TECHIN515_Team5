import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

# Raw data
adc_values = np.array([
    979, 654.95, 450, 247.7,
    221.4, 211.9, 210.9
])
weights = np.array([
    8,  16, 24, 35, 
    43, 51, 61.5
])

# Reshape for sklearn
adc_values = adc_values.reshape(-1, 1)
weights = weights.reshape(-1, 1)

# ========== Linear regression ==========
lin_reg = LinearRegression()
lin_reg.fit(adc_values, weights)
weight_pred_linear = lin_reg.predict(adc_values)
r2_linear = r2_score(weights, weight_pred_linear)
print(f"[Linear] R² = {r2_linear:.3f}")
print(f"[Linear] Equation: y = {lin_reg.coef_[0][0]:.3f} * x + {lin_reg.intercept_[0]:.3f}")

# ========== Logarithmic regression ==========
log_adc = np.log(adc_values)
log_reg = LinearRegression()
log_reg.fit(log_adc, weights)
weight_pred_log = log_reg.predict(log_adc)
r2_log = r2_score(weights, weight_pred_log)
print(f"[Log] R² = {r2_log:.3f}")
print(f"[Log] Equation: y = {log_reg.coef_[0][0]:.3f} * log(x) + {log_reg.intercept_[0]:.3f}")

# ========== Exponential regression ==========
# Only use data where weights > 0 (log-safe)
non_zero_indices = weights.flatten() > 0
x_exp = adc_values[non_zero_indices]
y_exp = weights[non_zero_indices]
log_y = np.log(y_exp)

exp_reg = LinearRegression()
exp_reg.fit(x_exp, log_y)
b_exp = exp_reg.coef_[0][0]
a_exp = np.exp(exp_reg.intercept_[0])
weight_pred_exp = a_exp * np.exp(b_exp * adc_values)
r2_exp = r2_score(weights, weight_pred_exp)
print(f"[Exp] R² = {r2_exp:.3f}")
print(f"[Exp] Equation: y = {a_exp:.3f} * exp({b_exp:.3f} * x)")

# ========== Plot ==========
plt.figure(figsize=(10, 6))
plt.scatter(adc_values, weights, label="Data", color='black')
plt.plot(adc_values, weight_pred_linear, label=f"Linear (R²={r2_linear:.3f})", color='blue')
plt.plot(adc_values, weight_pred_log, label=f"Log (R²={r2_log:.3f})", color='orange')
plt.plot(adc_values, weight_pred_exp, label=f"Exp (R²={r2_exp:.3f})", color='green')
plt.xlabel("ADC Value")
plt.ylabel("Weight (kg)")
plt.title("FSR Calibration Curve Fit")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
