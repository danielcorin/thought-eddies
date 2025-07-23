---
title: 'Practical Deep Learning, Lesson 5, Pricing Iowa Houses with Random Forests'
createdAt: 2024-11-14T13:27:45.000Z
updatedAt: 2024-11-14T13:27:45.000Z
publishedAt: 2024-11-14T13:27:45.000Z
tags:
  - course.fast.ai
  - language_models
draft: false
githubUrl: 'https://github.com/danielcorin/fastbook_projects/tree/main/iowa_housing_prices'
series: Fast.ai Course
toc: true
---

Having completed [lesson 5](https://course.fast.ai/Lessons/lesson5.html) of the FastAI course, I prompted Claude to give me some good datasets upon which to train a random forest model.
[This housing dataset](https://www.kaggle.com/datasets/emurphy/ames-iowa-housing-prices-dataset) from Kaggle seemed like a nice option, so I decided to give it a try.
I am also going to try something that Jeremy Howard recommended for this notebook/post, which is to not refine or edit my process very much.
I am mostly going to try things out and if they don't work, I'll try and write up why and continue, rather than finding a working path and adding commentary at the end.

To start, let's turn off warnings (for a cleaner notebook) and get the dataset from Kaggle.

```python
import warnings
warnings.simplefilter('ignore', FutureWarning)
```

```python
!pip install kagglehub
!pip install --upgrade pip
!pip install fastai scikit-learn
```

```python
import kagglehub

path = kagglehub.dataset_download("emurphy/ames-iowa-housing-prices-dataset")

print("Path to dataset files:", path)
```

    Path to dataset files: /Users/danielcorin/.cache/kagglehub/datasets/emurphy/ames-iowa-housing-prices-dataset/versions/1

## Look at the data

We're going to look at the data first to try and understand it a bit better

```python
import pandas as pd

df = pd.read_csv(str(path) + '/train1.csv', low_memory=False)
```

```python
df.columns
```

    Index(['Id', 'MSSubClass', 'MSZoning', 'LotFrontage', 'LotArea', 'Street',
           'Alley', 'LotShape', 'LandContour', 'Utilities', 'LotConfig',
           'LandSlope', 'Neighborhood', 'Condition1', 'Condition2', 'BldgType',
           'HouseStyle', 'OverallQual', 'OverallCond', 'YearBuilt', 'YearRemodAdd',
           'RoofStyle', 'RoofMatl', 'Exterior1st', 'Exterior2nd', 'MasVnrType',
           'MasVnrArea', 'ExterQual', 'ExterCond', 'Foundation', 'BsmtQual',
           'BsmtCond', 'BsmtExposure', 'BsmtFinType1', 'BsmtFinSF1',
           'BsmtFinType2', 'BsmtFinSF2', 'BsmtUnfSF', 'TotalBsmtSF', 'Heating',
           'HeatingQC', 'CentralAir', 'Electrical', '1stFlrSF', '2ndFlrSF',
           'LowQualFinSF', 'GrLivArea', 'BsmtFullBath', 'BsmtHalfBath', 'FullBath',
           'HalfBath', 'BedroomAbvGr', 'KitchenAbvGr', 'KitchenQual',
           'TotRmsAbvGrd', 'Functional', 'Fireplaces', 'FireplaceQu', 'GarageType',
           'GarageYrBlt', 'GarageFinish', 'GarageCars', 'GarageArea', 'GarageQual',
           'GarageCond', 'PavedDrive', 'WoodDeckSF', 'OpenPorchSF',
           'EnclosedPorch', '3SsnPorch', 'ScreenPorch', 'PoolArea', 'PoolQC',
           'Fence', 'MiscFeature', 'MiscVal', 'MoSold', 'YrSold', 'SaleType',
           'SaleCondition', 'SalePrice'],
          dtype='object')

Lots of categorical variables.
Here are a few examples:

```python
df['Fence'].unique()
```

    array([nan, 'MnPrv', 'GdWo', 'GdPrv', 'MnWw'], dtype=object)

```python
df['LandSlope'].unique()
```

    array(['Gtl', 'Mod', 'Sev'], dtype=object)

```python
df['HouseStyle'].unique()
```

    array(['2Story', '1Story', '1.5Fin', '1.5Unf', 'SFoyer', 'SLvl', '2.5Unf',
           '2.5Fin'], dtype=object)

But also several continuous variables

```python
df['GarageArea'].hist()
```

    <Axes: >

![png](images/notebook_14_1.png)

```python
df['GrLivArea'].hist()
```

    <Axes: >

![png](images/notebook_15_1.png)

```python
df[['1stFlrSF', '2ndFlrSF']].hist()
```

    array([[<Axes: title={'center': '1stFlrSF'}>,
            <Axes: title={'center': '2ndFlrSF'}>]], dtype=object)

![png](images/notebook_16_1.png)

Since I'm not familiar with other approaches yet, I am going to use root mean square log error because that is what the [Chapter 9](https://github.com/fastai/fastbook/blob/master/09_tabular.ipynb) notebook uses.
If this approach doesn't produce an effective model, I'll investigate other approaches.

```python
dep_var = 'SalePrice'
df[dep_var]
```

    0       208500
    1       181500
    2       223500
    3       140000
    4       250000
             ...
    1455    175000
    1456    210000
    1457    266500
    1458    142125
    1459    147500
    Name: SalePrice, Length: 1460, dtype: int64

```python
import numpy as np

df[dep_var] = np.log(df[dep_var])
df[dep_var]
```

    0       12.247694
    1       12.109011
    2       12.317167
    3       11.849398
    4       12.429216
              ...
    1455    12.072541
    1456    12.254863
    1457    12.493130
    1458    11.864462
    1459    11.901583
    Name: SalePrice, Length: 1460, dtype: float64

Since we're aiming to predict home sale prices in the future, we should split our training and validation data by date.
Let's look at the range of the training set to figure out how it would make sense to do that.

```python
df[['YrSold', 'MoSold']].hist()
print(f"Year range: {df['YrSold'].min()} - {df['YrSold'].max()}")
```

    Year range: 2006 - 2010

![png](images/notebook_21_1.png)

## Create test and validation sets

I asked Claude how I might split these into training and validation sets (we'll see if this is helpful or even a good idea I guess).
It recommended a 75%-25% split between test and validation, so let's loosely do that.

```python
cond = ((df['YrSold'] < 2009) | ((df['YrSold'] == 2009) & (df['MoSold'] >= 8))).values
train_idx = np.where(cond)[0]
valid_idx = np.where(~cond)[0]

splits = (list(train_idx),list(valid_idx))
print(f"Training set size: {len(train_idx)} ({len(train_idx)/len(df):.1%})")
print(f"Validation set size: {len(valid_idx)} ({len(valid_idx)/len(df):.1%})")
```

    Training set size: 1061 (72.7%)
    Validation set size: 399 (27.3%)

```python
from fastai.tabular.all import *

cont, cat = cont_cat_split(df, 1, dep_var=dep_var)
```

```python
procs = [Categorify, FillMissing]
to = TabularPandas(df, procs, cat, cont, y_names=dep_var, splits=splits)
```

After this data pre-processing, we validate the split is still approximately 75%-25%.

```python
print(f"Training: {len(to.train)} ({len(to.train)/len(df):.1%})")
print(f"Validation: {len(to.valid)} ({len(to.valid)/len(df):.1%})")
```

    Training: 1061 (72.7%)
    Validation: 399 (27.3%)

## Create a decision tree

Following a similar approach to chapter 9, we're going to create a simple decision tree with a maximum of 4 leaf nodes so we can learn a bit about which features influence house sale prices the most.

```python
xs, y = to.train.xs, to.train.y
valid_xs, valid_y = to.valid.xs, to.valid.y
```

```python
from sklearn.tree import DecisionTreeRegressor

m0 = DecisionTreeRegressor(max_leaf_nodes=4)
m0.fit(xs, y);
```

```python
from sklearn.tree import plot_tree
import matplotlib.pyplot as plt

plt.figure(figsize=(40,20))
plot_tree(m0, feature_names=xs.columns, filled=True, rounded=True, precision=2, fontsize=30)
plt.show()
```

![png](images/notebook_31_0.png)

The `squared_error` looks a bit small but could be because we took the log of the sales prices.

```python
!pip install dtreeviz
```

```python
import dtreeviz
warnings.filterwarnings('ignore', 'X does not have valid feature names')


samp_idx = np.random.permutation(len(y))[:500]
viz_model = dtreeviz.model(
    m0,
    X_train=xs.iloc[samp_idx],
    y_train=y.iloc[samp_idx],
    feature_names=xs.columns,
    target_name=dep_var,
)

viz_model.view(
    fontname='DejaVu Sans',
    label_fontsize=10,
    orientation='LR',
)
```

<img src="images/notebook_34_0.svg" alt="Decision tree visualization">

Let's do the same experimentation in Chapter 9.
We'll build a bigger tree with no stopping criteria.

```python
m1 = DecisionTreeRegressor()
m1.fit(xs, y);
```

```python
def r_mse(pred,y): return round(math.sqrt(((pred-y)**2).mean()), 6)
def m_rmse(m, xs, y): return r_mse(m.predict(xs), y)
```

```python
m_rmse(m1, xs, y)
```

    0.0

A "perfect" model fit on the train data -- suspicious.

```python
m_rmse(m1, valid_xs, valid_y)
```

    0.223525

A pretty poor relative fit on the validation set

```python
m1.get_n_leaves(), len(xs)
```

    (np.int64(1019), 1061)

We're seeing almost as many leaves as training data points.
Let's try and build a smaller tree.

```python
m2 = DecisionTreeRegressor(min_samples_leaf=25)
m2.fit(to.train.xs, to.train.y)
m_rmse(m2, xs, y), m_rmse(m2, valid_xs, valid_y)
```

    (0.166169, 0.192442)

The root mean square error is a bit improved.

```python
m2.get_n_leaves()
```

    np.int64(33)

And with far fewer leaves!
Can a random forest improve our error rate further?

```python
from sklearn.ensemble import RandomForestRegressor

def rf(xs, y, n_estimators, max_samples,
       max_features, min_samples_leaf, **kwargs):
    return RandomForestRegressor(
        n_jobs=-1,
        n_estimators=n_estimators,
        max_samples=max_samples,
        max_features=max_features,
        min_samples_leaf=min_samples_leaf,
        oob_score=True,
    ).fit(xs, y)
```

Let's inspect `xs` to figure out reasonable values for `n_estimators`, `max_samples`, `max_features` and `min_samples_leaf`.

```python
print(f"n_samples: {len(xs)}")
print(f"n_features: {xs.shape[1]}")
```

    n_samples: 1061
    n_features: 83

Given these, I asked Claude for some reasonable values for these hyperparameters.

> n_estimators=100: Sweet spot between performance and training time
>
> max_samples=33 (sqrt(1061))
>
> max_features=9 (sqrt(83))
>
> min_samples_leaf=11 (~1% of 1061)

I briefly looked to corroborate these suggestions in papers, but wasn't able to quickly do so.
I recognize these recommendations may be bad or wrong, but for learning purposes, I am going to proceed and we will see how it goes.

```python
m3 = rf(xs, y, n_estimators=100,
        max_samples=33, max_features=9,
        min_samples_leaf=11)
```

```python
m_rmse(m3, xs, y), m_rmse(m3, valid_xs, valid_y)
```

    (0.279821, 0.302108)

Interesting. Worse results than our trees.

As the chapter does, let's plot `r_mse` as `n_estimators` varies in our model up to 125 to see if there is anything we can do to improve.

```python
preds = np.stack([t.predict(valid_xs) for t in m3.estimators_])
```

```python
plt.plot([r_mse(preds[:i+1].mean(0), valid_y) for i in range(125)]);
```

![png](images/notebook_56_0.png)

I am going to chose 20 `n_estimators` because that looks like something close to the minimum.

```python
m4 = rf(xs, y, n_estimators=20,
        max_samples=33, max_features=9,
        min_samples_leaf=11)
```

```python
m_rmse(m4, xs, y), m_rmse(m4, valid_xs, valid_y)
```

    (0.280595, 0.303637)

This hyperparameter change doesn't seem to improve the random forest model too much though.
Let's plot feature importance to see if we can learn more.

```python
def rf_feat_importance(m, df):
    return pd.DataFrame(
        {'cols':df.columns, 'imp':m.feature_importances_}
    ).sort_values('imp', ascending=False)
```

```python
fi = rf_feat_importance(m1, xs)
fi[:10]
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
      <th>cols</th>
      <th>imp</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>50</th>
      <td>OverallQual</td>
      <td>0.550081</td>
    </tr>
    <tr>
      <th>62</th>
      <td>GrLivArea</td>
      <td>0.150868</td>
    </tr>
    <tr>
      <th>58</th>
      <td>TotalBsmtSF</td>
      <td>0.081219</td>
    </tr>
    <tr>
      <th>72</th>
      <td>GarageCars</td>
      <td>0.018286</td>
    </tr>
    <tr>
      <th>52</th>
      <td>YearBuilt</td>
      <td>0.015654</td>
    </tr>
    <tr>
      <th>57</th>
      <td>BsmtUnfSF</td>
      <td>0.013133</td>
    </tr>
    <tr>
      <th>59</th>
      <td>1stFlrSF</td>
      <td>0.011235</td>
    </tr>
    <tr>
      <th>55</th>
      <td>BsmtFinSF1</td>
      <td>0.011091</td>
    </tr>
    <tr>
      <th>60</th>
      <td>2ndFlrSF</td>
      <td>0.010260</td>
    </tr>
    <tr>
      <th>8</th>
      <td>Neighborhood</td>
      <td>0.009380</td>
    </tr>
  </tbody>
</table>
</div>

```python
def plot_fi(fi):
    return fi.plot('cols', 'imp', 'barh', figsize=(12,7), legend=False)

plot_fi(fi[:30]);
```

![png](images/notebook_63_0.png)

It's interesting to see what I would guess is a subjective measure in `OverallQual` show up as the most impactful feature.

Following the chapter, let's remove the lower importance features and retrain the model with the pruned feature list.

```python
to_keep = fi[fi.imp>0.005].cols
len(to_keep)
```

    17

```python
xs_imp = xs[to_keep]
valid_xs_imp = valid_xs[to_keep]
```

```python
m5 = rf(xs_imp, y, n_estimators=15,
        max_samples=33, max_features=9,
        min_samples_leaf=11)
```

Now, let's train a model with the (supposedly) most important 18 features.

```python
m_rmse(m5, xs_imp, y), m_rmse(m5, valid_xs_imp, valid_y)
```

    (0.260041, 0.280743)

This turns out to be a bit of improvement with many fewer columns.

Let's look at the feature importance again and now and potentially redundant features.

```python
len(xs.columns), len(xs_imp.columns)
```

    (83, 17)

```python
plot_fi(rf_feat_importance(m5, xs_imp));
```

![png](images/notebook_72_0.png)

It looks like maybe we could remove even more features?
I didn't expect to see so many features with such low importance.

```python
from scipy.cluster import hierarchy as hc

def cluster_columns(df, figsize=(10,6), font_size=12):
    corr = np.round(scipy.stats.spearmanr(df).correlation, 4)
    corr_condensed = hc.distance.squareform(1-corr)
    z = hc.linkage(corr_condensed, method='average')
    fig = plt.figure(figsize=figsize)
    hc.dendrogram(z, labels=df.columns, orientation='left', leaf_font_size=font_size)
    plt.show()

cluster_columns(xs_imp)
```

![png](images/notebook_74_0.png)

Nothing seems obviously duplicative.
Let's drop the remaining features with low importance seen in the feature importance plot, then train another model.

```python
to_drop = [
    'Fence', 'BsmtFinSF1', 'Neighborhood', 'Alley', 'GarageType',
    '2ndFlrSF', 'OverallCond', 'Electrical', 'PavedDrive',
    'LotArea', 'BsmtUnfSF',
]
xs_final = xs_imp.drop(to_drop, axis=1)
valid_xs_final = valid_xs_imp.drop(to_drop, axis=1)
```

```python
m6 = rf(xs_final, y, n_estimators=15,
        max_samples=33, max_features=9,
        min_samples_leaf=11)
m_rmse(m6, xs_final, y), m_rmse(m6, valid_xs_final, valid_y)
```

    (0.254607, 0.271229)

Dropping these does not seem to make the model much worse.

## Run model on the test set

Let's load the test set and run our model to see if we're generally building the right direction.

```python
test_df = pd.read_csv(str(path) + '/test1.csv', low_memory=False)
test_df[dep_var] = np.log(test_df[dep_var])
```

```python
procs = [Categorify, FillMissing]
test_cont, test_cat = cont_cat_split(test_df, 1, dep_var=dep_var)
test_to = TabularPandas(test_df, procs, test_cat, test_cont, splits=None, y_names=None)

to_keep = xs_final.columns
test_xs = test_to.train.xs[to_keep]
preds = m6.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.22978, 6)

I think this result looks promising.
The error is a bit better than what we've seen during training.

I had some concerns removing so many of the features, but it does seemed to have improve the model at each turn, at least in training.
We can run a few of the older models against the test set to validate we're actually made improvements.

## Comparing to past models

On a limb, I decided to run the test set through all the models that I trained over the course of this notebook.

First, we run our random forest model after the first round of dropped features.

```python
to_keep = xs_imp.columns
test_xs = test_to.train.xs[to_keep]
preds = m5.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.190995, 17)

Next, we run our random forest with `n_estimators` hyperparameter tuning

```python
to_keep = xs.columns
test_xs = test_to.train.xs[to_keep]
preds = m4.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.175185, 83)

After, we run our first random forest.

```python
to_keep = xs.columns
test_xs = test_to.train.xs[to_keep]
preds = m3.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.175589, 83)

And finally, we run our first three tree models of varied `max_leaf_nodes` counts.

```python
to_keep = xs.columns
test_xs = test_to.train.xs[to_keep]
preds = m2.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.359379, 83)

```python
to_keep = xs.columns
test_xs = test_to.train.xs[to_keep]
preds = m1.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.412504, 83)

```python
to_keep = xs.columns
test_xs = test_to.train.xs[to_keep]
preds = m0.predict(test_xs)
r_mse(preds, test_df[dep_var]), len(to_keep)
```

    (0.315114, 83)

It looks like the fourth model (`m3`) we trained (our first random forest), which still considers all 83 of the original columns actually performs a bit better than our seventh model (`m6`) where we pruned many columns that didn't seem to have much importance.
However, given the number of columns we managed to prune, maybe it could make sense use the model with fewer considerations -- I'm not quite sure.
Maybe we could learn more by monitoring the model and retraining with new data in the future.

## Takeaways

I'm quite glad I kept a running log in the notebook as I experimented.
It made it very easy to go back and check my test set against previous model iterations.

So much experimentation is involved in building models and a notebook is a very useful tool that empowers the experimentation.
I'm not sure how I could do ML without them.

Claude continues to be an invaluable assistant for answering questions about my approach and writing little snippets of pandas to help me validate I am (hopefully) on the right track.

I'm still not really sure what my results mean!
My model seemed to perform reasonably well against the test set.
This (again) is where a Kaggle competition could help with a leaderboard so I could have some relative sense of how good my approach is.
Right now, I just don't know.
I've been told this feeling may never go away 🫠.
