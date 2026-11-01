# 🎯 Sarcasm & Irony Detection — Deep Learning & High Accuracy Models

## Notebooks Available
| File | Architecture | Description | Hardware |
|---|---|---|---|
| `Sarcasm_Irony_BiLSTM.ipynb` | **Attention-Enhanced Bi-LSTM** | Bidirectional LSTM with Bahdanau Self-Attention, Spatial Dropout & Class-Weighted Loss | GPU (T4 on Colab) |
| `Sarcasm_Irony_High_Accuracy.ipynb` | **Transformer / DeBERTa-v3** | Fine-tuned DeBERTa-v3 and MPNet embeddings with LightGBM | GPU (T4 on Colab) |

---

## 📋 Quick Start: Attention-Enhanced Bi-LSTM on Google Colab

### Step 1: Open Google Colab
1. Navigate to [colab.research.google.com](https://colab.research.google.com).
2. Click **File** → **Upload notebook**.
3. Select `colab_highaccuracy/Sarcasm_Irony_BiLSTM.ipynb` (or from `model_training/Sarcasm_Irony_BiLSTM.ipynb`).

### Step 2: Enable GPU Accelerator
1. In Colab, click **Runtime** → **Change runtime type**.
2. Under *Hardware accelerator*, select **T4 GPU**.
3. Click **Save**.

### Step 3: Run the Cells
1. Execute the notebook step by step (or click **Runtime** → **Run all**).
2. In **Step 2**, upload your `Dataset/train.csv` and `Dataset/test.csv`.
3. The notebook will automatically:
   - Clean the text and build a 40,000-word vocabulary.
   - Load pre-trained GloVe vectors or initialize embeddings.
   - Train the 2-layer Bidirectional LSTM with Self-Attention.
   - Evaluate test accuracy, macro F1, and render a confusion matrix.
   - Package all model artifacts into `sarcasm_irony_bilstm_artifacts.zip` and download it to your browser.

---

## ⚙️ Backend Integration (Drop-in Ready)
Once `sarcasm_irony_bilstm_artifacts.zip` is downloaded:
1. Extract the files (`bilstm_model.pt`, `bilstm_vocab.json`, `metrics.json`).
2. Copy them directly into:
   ```
   backend/analysis/Models/
   ```
3. Your Django backend (`backend/analysis/utils.py`) has already been configured to automatically detect and load `bilstm_model.pt` as the primary inference engine!
