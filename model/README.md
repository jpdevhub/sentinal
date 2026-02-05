# 🤖 AI/ML Model Documentation - FedEx Debt Collection

## 📋 Overview

This folder contains the machine learning models and analysis notebooks for the FedEx Debt Collection Management system. The primary model is a **Random Forest Classifier** trained to predict debt recovery outcomes and optimize collection strategies.

---

## 📊 Dataset Information

### Source Data
- **File**: `fedex_dca_enriched_dataset.csv`
- **Total Records**: 20,010 debt collection cases
- **Data Generation**: Synthetic dataset based on real-world debt collection patterns
- **Time Period**: 2024-2026

### Data Enrichment Process
The original synthetic dataset was enriched with the following features:
1. **Customer Information**: IDs, names (individuals/companies), customer types (Enterprise/SME)
2. **Financial Metrics**: Invoice amounts, recovered amounts, payment dates
3. **Temporal Data**: Case creation dates, assigned dates, action dates, payment dates
4. **Risk & Priority**: AI-calculated risk scores (0-100), priority levels (HIGH/MEDIUM/LOW)
5. **Actions & Compliance**: Action counts, types (Call, Email, SMS, WhatsApp, etc.), SLA breaches
6. **Escalations**: Escalation flags and reasons (customer unresponsive, dispute, etc.)

---

## 🎯 Random Forest Classifier Model

### Model Purpose
Predict the likelihood of debt recovery (`recovered` = 1/0) to:
- Prioritize cases for collection agents
- Optimize resource allocation across DCAs
- Improve recovery rates through AI-driven insights

### Model Architecture

```python
from sklearn.ensemble import RandomForestClassifier

# Model Configuration
rf_model = RandomForestClassifier(
    random_state=42,
    # Default sklearn parameters:
    n_estimators=100,        # Number of trees in the forest
    criterion='gini',        # Split quality measure
    max_depth=None,          # Unlimited tree depth
    min_samples_split=2,     # Min samples to split internal node
    min_samples_leaf=1,      # Min samples at leaf node
    max_features='sqrt',     # Number of features for best split
    bootstrap=True,          # Bootstrap samples for trees
    oob_score=False,        # Out-of-bag score calculation
    n_jobs=None,            # Number of parallel jobs
    class_weight=None       # Class balance weights
)
```

### Training Features (X)

The model was trained on the following features from the dataset:

#### 1. **Customer Profile Features**
- `customer_type`: Enterprise vs SME (One-hot encoded)
- `credit_score`: Customer creditworthiness (300-850 scale)
- `past_recovery_rate`: Historical payment success rate (0-100%)
- `dispute_history`: Number of previous disputes

#### 2. **Case Financial Features**
- `invoice_amount`: Total debt owed (USD)
- `days_overdue`: Days since payment due date
- `amount_recovered`: Current recovered amount (may be 0)

#### 3. **Risk & Priority Indicators**
- `risk_score`: AI-calculated risk (0-100)
  - Formula: `((850 - credit_score) / 550) * 50 + (days_overdue / 180) * 40 + (dispute_history * 10)`
- `priority_level`: HIGH/MEDIUM/LOW (One-hot encoded)

#### 4. **Operational Features**
- `dca_id`: Assigned debt collection agency (One-hot encoded)
- `sla_breach_count`: Number of SLA violations
- `action_count`: Number of collection attempts made
- `last_action_type`: Most recent action (Call/Email/SMS/etc.)
- `case_status`: Current status (OPEN/IN_PROGRESS/PAID/DISPUTE)

#### 5. **DCA Performance Features**
- `dca_performance_score`: Agency performance rating (0-100)

### Target Variable (y)
- `recovered`: Binary outcome (1 = payment received, 0 = not recovered)

### Feature Engineering Steps

```python
# 1. Categorical Encoding
from sklearn.preprocessing import OneHotEncoder

categorical_features = ['customer_type', 'priority_level', 'dca_id', 'case_status', 'last_action_type']
# One-hot encode categorical variables

# 2. Numerical Scaling (Optional for Random Forest)
from sklearn.preprocessing import StandardScaler

numerical_features = ['credit_score', 'invoice_amount', 'days_overdue', 'risk_score', 
                      'action_count', 'sla_breach_count', 'past_recovery_rate']
# Scaling may improve convergence but not required for tree-based models

# 3. Train/Test Split
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2,      # 20% for testing
    random_state=42,     # Reproducibility
    stratify=y           # Maintain class balance
)
```

---

## 📈 Model Performance Metrics

### Evaluation Metrics
The model is evaluated using:

```python
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# Performance Metrics
accuracy = accuracy_score(y_test, y_pred)      # Overall correctness
precision = precision_score(y_test, y_pred)    # True positive rate
recall = recall_score(y_test, y_pred)          # Sensitivity
f1_score = f1_score(y_test, y_pred)            # Harmonic mean of precision & recall
```

### Interpretation

| Metric | Description | Business Impact |
|--------|-------------|-----------------|
| **Accuracy** | Percentage of correct predictions | Overall model reliability |
| **Precision** | Of cases predicted as recoverable, what % actually recovered | Avoid wasting effort on hopeless cases |
| **Recall** | Of all recoverable cases, what % did we identify | Don't miss high-potential cases |
| **F1-Score** | Balance between precision and recall | Overall model effectiveness |

---

## 🔄 Model Reuse & Integration

### Saving the Trained Model

```python
import pickle

# Save the trained model
with open('rf_debt_recovery_model.pkl', 'wb') as file:
    pickle.dump(rf_model, self)

# Save feature encoder (if used)
with open('feature_encoder.pkl', 'wb') as file:
    pickle.dump(encoder, file)
```

### Loading & Using the Model in Web Application

```python
import pickle
import pandas as pd

# Load the trained model
with open('model/rf_debt_recovery_model.pkl', 'rb') as file:
    model = pickle.load(file)

# Load encoder (if applicable)
with open('model/feature_encoder.pkl', 'rb') as file:
    encoder = pickle.load(file)

# Prepare new case data
new_case = pd.DataFrame({
    'customer_type': ['Enterprise'],
    'credit_score': [650],
    'invoice_amount': [50000],
    'days_overdue': [45],
    'risk_score': [72],
    'priority_level': ['HIGH'],
    'dca_id': ['DCA_A'],
    'action_count': [5],
    'sla_breach_count': [1],
    'past_recovery_rate': [0.65],
    'dca_performance_score': [85],
    'case_status': ['IN_PROGRESS'],
    'last_action_type': ['Email']
})

# Encode categorical features
encoded_features = encoder.transform(new_case[categorical_features])

# Make prediction
recovery_probability = model.predict_proba(prepared_features)[:, 1]
recovery_prediction = model.predict(prepared_features)

print(f"Recovery Probability: {recovery_probability[0]:.2%}")
print(f"Predicted Outcome: {'Recoverable' if recovery_prediction[0] == 1 else 'Not Recoverable'}")
```

### API Integration Example

```javascript
// Frontend API call to get ML predictions
const getPrediction = async (caseData) => {
  const response = await fetch('/api/predict-recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caseData)
  });
  
  const prediction = await response.json();
  return prediction; // { probability: 0.75, recommendation: 'HIGH_PRIORITY' }
};
```

---

## 📁 File Structure

```
model/
├── FedEX.ipynb                      # Main analysis & training notebook
├── README.md                        # This file
├── rf_debt_recovery_model.pkl       # Trained Random Forest model (to be saved)
├── feature_encoder.pkl              # Categorical feature encoder (to be saved)
└── model_performance_report.json    # Model metrics & evaluation (to be saved)
```

---

## 🎓 Key Insights from Analysis

### 1. Recovery Rate Analysis
- **Current Recovery Rate**: ~35% across all cases
- **Target with AI**: 60-75% recovery rate
- **High-Value Cases**: Invoice > $100K with >90 days overdue require immediate attention

### 2. DCA Performance Patterns
- **Top Performers**: DCAs with >30% recovery rate and <20% SLA breach
- **Underperformers**: Agencies with high breach counts need intervention
- **Meritocratic Allocation**: Cases should be assigned based on DCA performance scores

### 3. Risk Concentration
- **Pareto Principle**: 20% of cases account for 80% of total outstanding debt
- **Priority Focus**: High-risk Enterprise customers with dispute history

### 4. Action Effectiveness
- **Optimal Frequency**: 5-10 actions per case show best results
- **Best Channels**: Email and Phone calls more effective than SMS
- **Timing**: Cases resolved within 30-60 days have highest recovery rates

---

## 🚀 Future Enhancements

### Model Improvements
1. **Hyperparameter Tuning**: Use GridSearchCV or RandomizedSearchCV
2. **Feature Selection**: Identify most important features using `feature_importances_`
3. **Ensemble Methods**: Combine Random Forest with XGBoost or LightGBM
4. **Deep Learning**: LSTM for time-series prediction of payment patterns
5. **NLP Integration**: Sentiment analysis from customer interactions

### Additional Models
1. **Regression Model**: Predict exact recovery amount (not just binary outcome)
2. **Time-to-Recovery**: Estimate days until payment using survival analysis
3. **DCA Recommendation**: Multi-class classifier for optimal agency assignment
4. **Churn Prediction**: Identify customers likely to default permanently

---

## 📞 Contact & Support

**Model Development Team:**
- Karan Singh - Frontend Development & AI/ML
- Harsh Sharma - Backend Development
- Ankit Kumar Jha - Research & Analytics

**Last Updated**: February 1, 2026

---

## 🔗 References

- [Scikit-learn Random Forest Documentation](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html)
- [Feature Engineering Best Practices](https://scikit-learn.org/stable/modules/preprocessing.html)
- [Model Evaluation Metrics](https://scikit-learn.org/stable/modules/model_evaluation.html)
