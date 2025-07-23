---
title: >-
  Practical Deep Learning, Lesson 3, Stochastic Gradient Descent on the Titanic
  Dataset
createdAt: 2024-10-18T00:00:00.000Z
updatedAt: 2024-10-18T00:00:00.000Z
publishedAt: 2024-10-18T00:00:00.000Z
tags:
  - course.fast.ai
draft: false
githubUrl: 'https://github.com/danielcorin/fastbook_projects/tree/main/sgd_titanic'
series: Fast.ai Course
toc: true
---

In this notebook, we train two similar neural nets on the classic [Titanic dataset](https://www.kaggle.com/competitions/titanic/data) using techniques from `fastbook` [chapter 1](https://github.com/fastai/fastbook/blob/master/01_intro.ipynb) and [chapter 4](https://github.com/fastai/fastbook/blob/master/04_mnist_basics.ipynb).

The first, we train using mostly PyTorch APIs.
The second, with FastAI APIs.
There are a few cells that output warnings.
I kept those because I wanted to preserve print outs of the models' accuracy.

The Titanic data set can be downloaded from the link above or with:


```python
!kaggle competitions download -c titanic
```

To start, we install and import the dependencies we'll need:


```python
%pip install torch pandas scikit-learn fastai
```


```python
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim

from fastai.tabular.all import *
from sklearn.preprocessing import StandardScaler
```

Next, we import the training data 


```python
df = pd.read_csv('titanic/train.csv')

features = ['Pclass', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare']
X = df[features].copy()
y = df['Survived'].copy()
X.head(5)
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Pclass</th>
      <th>Sex</th>
      <th>Age</th>
      <th>SibSp</th>
      <th>Parch</th>
      <th>Fare</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>3</td>
      <td>male</td>
      <td>22.0</td>
      <td>1</td>
      <td>0</td>
      <td>7.2500</td>
    </tr>
    <tr>
      <th>1</th>
      <td>1</td>
      <td>female</td>
      <td>38.0</td>
      <td>1</td>
      <td>0</td>
      <td>71.2833</td>
    </tr>
    <tr>
      <th>2</th>
      <td>3</td>
      <td>female</td>
      <td>26.0</td>
      <td>0</td>
      <td>0</td>
      <td>7.9250</td>
    </tr>
    <tr>
      <th>3</th>
      <td>1</td>
      <td>female</td>
      <td>35.0</td>
      <td>1</td>
      <td>0</td>
      <td>53.1000</td>
    </tr>
    <tr>
      <th>4</th>
      <td>3</td>
      <td>male</td>
      <td>35.0</td>
      <td>0</td>
      <td>0</td>
      <td>8.0500</td>
    </tr>
  </tbody>
</table>
</div>



Now, we define two functions to normalize and fill in holes in the data so we can train on it.


```python
def process_training_data(X):
    X['Sex'] = X['Sex'].map({'male': 0, 'female': 1})
    X['Age'] = X['Age'].fillna(X['Age'].median())
    X['Fare'] = X['Fare'].fillna(X['Fare'].median())

    return X


def process_test_data(X):
    X['Sex'] = X['Sex'].map({'male': 0, 'female': 1})

    return X
```


```python
X = process_training_data(X)
X.head(5)
```




<div>
<style scoped>
    .dataframe tbody tr th:only-of-type {
        vertical-align: middle;
    }

    .dataframe tbody tr th {
        vertical-align: top;
    }

    .dataframe thead th {
        text-align: right;
    }
</style>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>Pclass</th>
      <th>Sex</th>
      <th>Age</th>
      <th>SibSp</th>
      <th>Parch</th>
      <th>Fare</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>3</td>
      <td>0</td>
      <td>22.0</td>
      <td>1</td>
      <td>0</td>
      <td>7.2500</td>
    </tr>
    <tr>
      <th>1</th>
      <td>1</td>
      <td>1</td>
      <td>38.0</td>
      <td>1</td>
      <td>0</td>
      <td>71.2833</td>
    </tr>
    <tr>
      <th>2</th>
      <td>3</td>
      <td>1</td>
      <td>26.0</td>
      <td>0</td>
      <td>0</td>
      <td>7.9250</td>
    </tr>
    <tr>
      <th>3</th>
      <td>1</td>
      <td>1</td>
      <td>35.0</td>
      <td>1</td>
      <td>0</td>
      <td>53.1000</td>
    </tr>
    <tr>
      <th>4</th>
      <td>3</td>
      <td>0</td>
      <td>35.0</td>
      <td>0</td>
      <td>0</td>
      <td>8.0500</td>
    </tr>
  </tbody>
</table>
</div>



We need to scale the numeric values to be between 0 and 1, otherwise we'll get

```
RuntimeError: all elements of input should be between 0 and 1
```

We'll do this with `StandardScaler` for the both the training and test data, per Sonnet's recommendation.
`StandardScaler` doesn't actually constrain the data between 0 and 1 but it seems to get the job done for the needs of the model architecture I selected.


```python
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

test_df = pd.read_csv('titanic/test.csv')
X_test = test_df[features].copy()
X_test = process_test_data(X_test)
X_test_scaled = scaler.transform(X_test)
y_test_df = pd.read_csv('titanic/gender_submission.csv')
y_test = y_test_df['Survived']
```

Turn these `numpy` arrays into PyTorch tensors and define the model architecture.


```python
X_train_tensor = torch.FloatTensor(X_scaled)
y_train_tensor = torch.FloatTensor(y.values)
X_test_tensor = torch.FloatTensor(X_test_scaled)
y_test_tensor = torch.FloatTensor(y_test.values)

model = nn.Sequential(
    nn.Linear(6, 8),
    nn.ReLU(),
    nn.Linear(8, 1),
    nn.Sigmoid()
)
```

Also, define a loss function and an optimizer:


```python
criterion = nn.BCELoss()
optimizer = optim.SGD(model.parameters(), lr=0.01)
```

Finally, we can train the model.
Sonnet wrote this code.


```python
num_epochs = 1000
batch_size = 64

for epoch in range(num_epochs):
    for i in range(0, len(X_train_tensor), batch_size):
        batch_X = X_train_tensor[i:i+batch_size]
        batch_y = y_train_tensor[i:i+batch_size]

        outputs = model(batch_X)
        loss = criterion(outputs, batch_y.unsqueeze(1))

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    if (epoch + 1) % 100 == 0:
        print(f'Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}')
```

    Epoch [100/1000], Loss: 0.3562
    Epoch [200/1000], Loss: 0.3216
    Epoch [300/1000], Loss: 0.3113
    Epoch [400/1000], Loss: 0.3065
    Epoch [500/1000], Loss: 0.3038
    Epoch [600/1000], Loss: 0.3024
    Epoch [700/1000], Loss: 0.2996
    Epoch [800/1000], Loss: 0.2975
    Epoch [900/1000], Loss: 0.2955
    Epoch [1000/1000], Loss: 0.2937


With the model trained, we can run inference on the test set and compare the results to the "Survived" column in the test set from `gender_submission.csv`.


```python
model.eval()
with torch.no_grad():
    y_pred = model(X_test_tensor)
    y_pred_class = (y_pred > 0.5).float()
    correct_predictions = (y_pred_class == y_test_tensor.unsqueeze(1)).sum().item()
    total_predictions = len(y_test_tensor)
    acc = correct_predictions / total_predictions
    print(f"Correct predictions: {correct_predictions} out of {total_predictions}")
    print(f"Accuracy: {acc:.2%}")
```

    Correct predictions: 368 out of 418
    Accuracy: 88.04%


Now, let's build what I think is a similar model with `fastai` primitives.
Load the data again to avoid any unintentional contamination.


```python
train_df = pd.read_csv('titanic/train.csv')
test_df = pd.read_csv('titanic/test.csv')
```

The `TabularDataLoaders` from `fastai` needs the following configuration to create `DataLoaders`.

- `cat_names`: the names of the categorical variables
- `cont_names`: the names of the continuous variables
- `y_names`: the names of the dependent variables


```python
cat_names = ['Pclass', 'Sex']
cont_names = ['Age', 'SibSp', 'Parch', 'Fare']
dep_var = 'Survived'
```

Following a pattern similar to the one used in [chapter 1](https://github.com/fastai/fastbook/blob/master/01_intro.ipynb), we train the model:


```python
procs = [Categorify, FillMissing, Normalize]
dls = TabularDataLoaders.from_df(
    train_df,
    path='.',
    procs=procs,
    cat_names=cat_names,
    cont_names=cont_names,
    y_names=dep_var,
    valid_pct=0.2,
    seed=42,
    bs=64,
)

learn = tabular_learner(dls, metrics=accuracy)
learn.fit_one_cycle(5, 1e-2)
```

    /Users/danielcorin/dev/lab/fastbook_projects/sgd_titanic/.venv/lib/python3.12/site-packages/fastai/tabular/core.py:314: FutureWarning: A value is trying to be set on a copy of a DataFrame or Series through chained assignment using an inplace method.
    The behavior will change in pandas 3.0. This inplace method will never work because the intermediate object on which we are setting values always behaves as a copy.
    
    For example, when doing 'df[col].method(value, inplace=True)', try using 'df.method({col: value}, inplace=True)' or df[col] = df[col].method(value) instead, to perform the operation inplace on the original object.
    
    
      to[n].fillna(self.na_dict[n], inplace=True)




<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>




<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: left;">
      <th>epoch</th>
      <th>train_loss</th>
      <th>valid_loss</th>
      <th>accuracy</th>
      <th>time</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>0.486258</td>
      <td>0.233690</td>
      <td>0.662921</td>
      <td>00:02</td>
    </tr>
    <tr>
      <td>1</td>
      <td>0.378460</td>
      <td>0.192642</td>
      <td>0.662921</td>
      <td>00:00</td>
    </tr>
    <tr>
      <td>2</td>
      <td>0.294309</td>
      <td>0.132269</td>
      <td>0.662921</td>
      <td>00:00</td>
    </tr>
    <tr>
      <td>3</td>
      <td>0.248516</td>
      <td>0.140377</td>
      <td>0.662921</td>
      <td>00:00</td>
    </tr>
    <tr>
      <td>4</td>
      <td>0.220335</td>
      <td>0.132353</td>
      <td>0.662921</td>
      <td>00:00</td>
    </tr>
  </tbody>
</table>


For some reason, `learn.dls.test_dl` does not apply `FillMissing`, for the 'Fare` column of the test data, so we do that manually here.


```python
test_df['Fare'] = test_df['Fare'].fillna(test_df['Fare'].median())
```

We run the test set through the model, then compare the results to the ground truth labels and calculate the model accuracy.


```python
test_dl = learn.dls.test_dl(test_df)
preds, _ = learn.get_preds(dl=test_dl)

binary_preds = (preds > 0.5).float()

y_test = pd.read_csv('titanic/gender_submission.csv')
correct_predictions = (binary_preds.numpy().flatten() == y_test['Survived']).sum()
total_predictions = len(y_test)

acc = correct_predictions / total_predictions

print(f"Correct predictions: {correct_predictions} out of {total_predictions}")
print(f"Accuracy: {acc:.2%}")
```

    /Users/danielcorin/dev/lab/fastbook_projects/sgd_titanic/.venv/lib/python3.12/site-packages/fastai/tabular/core.py:314: FutureWarning: A value is trying to be set on a copy of a DataFrame or Series through chained assignment using an inplace method.
    The behavior will change in pandas 3.0. This inplace method will never work because the intermediate object on which we are setting values always behaves as a copy.
    
    For example, when doing 'df[col].method(value, inplace=True)', try using 'df.method({col: value}, inplace=True)' or df[col] = df[col].method(value) instead, to perform the operation inplace on the original object.
    
    
      to[n].fillna(self.na_dict[n], inplace=True)




<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>







    Correct predictions: 377 out of 418
    Accuracy: 90.19%


The accuracies of the two models are about the same!
For a first pass at training neural networks (with plenty of help from Sonnet), I think this went pretty well.
If you know things about deep learning, let me know if I made any major mistakes.
It's a bit tough to know if you're doing things correctly in isolation.
I suppose that's why Kaggle competitions can be useful for learning.

