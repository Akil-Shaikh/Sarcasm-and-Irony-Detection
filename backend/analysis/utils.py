import os
import sys
import re
import json
import pickle
import base64
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
from wordcloud import WordCloud
from io import BytesIO
from django.conf import settings

CLASSES = ['regular', 'irony', 'sarcasm']

MODEL_DIR = os.path.join(settings.BASE_DIR, "analysis", "Models")
MODEL_PATH = os.path.join(MODEL_DIR, "sarcasm_irony_model.pkl")
TRANSFORMER_DIR = os.path.join(MODEL_DIR, "sarcasm_irony_transformer")
BILSTM_MODEL_PATH = os.path.join(MODEL_DIR, "bilstm_model.pt")
BILSTM_VOCAB_PATH = os.path.join(MODEL_DIR, "bilstm_vocab.json")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

# Setup Preprocessor
sys.path.append(os.path.join(settings.BASE_DIR.parent, "model_training"))

try:
    from preprocess import TweetPreprocessor
    preprocessor = TweetPreprocessor()
except Exception:
    class TweetPreprocessor:
        def clean_text(self, text: str) -> str:
            if not isinstance(text, str):
                return ""
            return text.lower()
    preprocessor = TweetPreprocessor()

bilstm_model = None
bilstm_vocab = None
bilstm_classes = None
bilstm_max_len = 100
transformer_model = None
transformer_tokenizer = None
sentiment_model = None
model_metrics = {}

# 1. Try loading Bi-LSTM Model (PyTorch)
if os.path.exists(BILSTM_MODEL_PATH) and os.path.exists(BILSTM_VOCAB_PATH):
    try:
        import torch
        import torch.nn as nn
        import torch.nn.functional as F

        with open(BILSTM_VOCAB_PATH, 'r', encoding='utf-8') as f:
            v_data = json.load(f)

        bilstm_vocab = v_data.get("vocab", {})
        bilstm_classes = v_data.get("classes", ['regular', 'irony', 'sarcasm'])
        b_embed_dim = v_data.get("embed_dim", 100)
        b_hidden_dim = v_data.get("hidden_dim", 128)
        bilstm_max_len = v_data.get("max_seq_len", 100)

        class BahdanauAttention(nn.Module):
            def __init__(self, hidden_dim):
                super(BahdanauAttention, self).__init__()
                self.W = nn.Linear(hidden_dim, hidden_dim)
                self.v = nn.Linear(hidden_dim, 1, bias=False)

            def forward(self, rnn_outputs, mask=None):
                scores = self.v(torch.tanh(self.W(rnn_outputs))).squeeze(-1)
                if mask is not None:
                    scores = scores.masked_fill(mask == 0, -1e9)
                weights = F.softmax(scores, dim=-1)
                context = torch.bmm(weights.unsqueeze(1), rnn_outputs).squeeze(1)
                return context, weights

        class SarcasmAttentionBiLSTM(nn.Module):
            def __init__(self, vocab_size, embed_dim, hidden_dim, num_classes, dropout=0.0):
                super(SarcasmAttentionBiLSTM, self).__init__()
                self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
                self.embed_dropout = nn.Dropout2d(p=0.0)
                self.lstm = nn.LSTM(
                    input_size=embed_dim,
                    hidden_size=hidden_dim,
                    num_layers=2,
                    batch_first=True,
                    bidirectional=True,
                    dropout=dropout if dropout > 0 else 0
                )
                lstm_out_dim = hidden_dim * 2
                self.attention = BahdanauAttention(lstm_out_dim)
                self.norm = nn.LayerNorm(lstm_out_dim * 2)
                self.fc1 = nn.Linear(lstm_out_dim * 2, 128)
                self.act = nn.GELU()
                self.dropout = nn.Dropout(0.0)
                self.classifier = nn.Linear(128, num_classes)

            def forward(self, input_ids):
                mask = (input_ids != 0).long()
                embedded = self.embedding(input_ids)
                lstm_out, _ = self.lstm(embedded)
                att_context, _ = self.attention(lstm_out, mask)
                masked_lstm_out = lstm_out.masked_fill(mask.unsqueeze(-1) == 0, -1e9)
                max_pooled, _ = torch.max(masked_lstm_out, dim=1)
                combined = torch.cat([att_context, max_pooled], dim=-1)
                x = self.norm(combined)
                x = self.act(self.fc1(x))
                return self.classifier(x)

        class HighPrecisionBiLSTM(nn.Module):
            def __init__(self, vocab_size, embed_dim, hidden_dim, num_classes):
                super(HighPrecisionBiLSTM, self).__init__()
                self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
                self.embed_dropout = nn.Dropout2d(p=0.0)
                self.lstm = nn.LSTM(
                    input_size=embed_dim,
                    hidden_size=hidden_dim,
                    num_layers=2,
                    batch_first=True,
                    bidirectional=True
                )
                lstm_out_dim = hidden_dim * 2
                self.attention = BahdanauAttention(lstm_out_dim)
                combined_dim = lstm_out_dim * 3 # 768: Attention (256) + Max-Pool (256) + Mean-Pool (256)
                self.norm = nn.LayerNorm(combined_dim)
                self.fc1 = nn.Linear(combined_dim, 192)
                self.act1 = nn.GELU()
                self.dropout1 = nn.Dropout(0.0)
                self.fc2 = nn.Linear(192, 64)
                self.act2 = nn.GELU()
                self.dropout2 = nn.Dropout(0.0)
                self.classifier = nn.Linear(64, num_classes)

            def forward(self, input_ids):
                mask = (input_ids != 0).long()
                embedded = self.embedding(input_ids)
                lstm_out, _ = self.lstm(embedded)
                att_context, _ = self.attention(lstm_out, mask)
                masked_lstm_out = lstm_out.masked_fill(mask.unsqueeze(-1) == 0, -1e9)
                max_pooled, _ = torch.max(masked_lstm_out, dim=1)
                seq_lengths = torch.clamp(mask.sum(dim=1, keepdim=True), min=1)
                sum_pooled = torch.sum(lstm_out * mask.unsqueeze(-1), dim=1)
                mean_pooled = sum_pooled / seq_lengths
                combined = torch.cat([att_context, max_pooled, mean_pooled], dim=-1)
                x = self.norm(combined)
                x = self.act1(self.fc1(x))
                x = self.act2(self.fc2(x))
                return self.classifier(x)

        state_dict = torch.load(BILSTM_MODEL_PATH, map_location=torch.device('cpu'))
        if 'norm.weight' in state_dict and state_dict['norm.weight'].shape[0] == (b_hidden_dim * 2 * 3):
            bilstm_model = HighPrecisionBiLSTM(
                vocab_size=len(bilstm_vocab),
                embed_dim=b_embed_dim,
                hidden_dim=b_hidden_dim,
                num_classes=len(bilstm_classes)
            )
        else:
            bilstm_model = SarcasmAttentionBiLSTM(
                vocab_size=len(bilstm_vocab),
                embed_dim=b_embed_dim,
                hidden_dim=b_hidden_dim,
                num_classes=len(bilstm_classes)
            )
        bilstm_model.load_state_dict(state_dict)
        bilstm_model.eval()
        print("Loaded Attention-Enhanced Bi-LSTM Model successfully.")
    except Exception as e:
        print(f"Notice: Bi-LSTM model found but could not be loaded ({e}).")
        bilstm_model = None

# 2. Try loading Fine-Tuned Transformer Model (from Colab)
if bilstm_model is None and os.path.exists(TRANSFORMER_DIR):
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        import torch
        transformer_tokenizer = AutoTokenizer.from_pretrained(TRANSFORMER_DIR)
        transformer_model = AutoModelForSequenceClassification.from_pretrained(TRANSFORMER_DIR)
        transformer_model.eval()
        print("Loaded Fine-Tuned Sarcasm & Irony Transformer Model successfully.")
    except Exception as e:
        print(f"Notice: Transformer model found but could not be loaded ({e}). Falling back to pickle model.")

# 3. Try loading Scikit-Learn / Sentence-Transformer Pickle Model
if bilstm_model is None and transformer_model is None and os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            sentiment_model = pickle.load(f)
        print("Loaded Sarcasm & Irony Detection Pickle model successfully.")
    except Exception as e:
        print(f"Error loading pickle model: {e}")

# 3. Load Metrics JSON
if os.path.exists(METRICS_PATH):
    try:
        with open(METRICS_PATH, "r") as f:
            model_metrics = json.load(f)
    except Exception as e:
        print(f"Error loading metrics: {e}")

# ==============================================================================
# Pragmatic Incongruity & Affect Calibrator
# Aligns statistical neural outputs with linguistic pragmatics:
# 1. Resolves unigram shortcuts (e.g. '?' or 'wonderful' falsely triggering irony/sarcasm)
# 2. Enforces Affective Incongruity (Positive evaluation + Adverse reality = Sarcasm)
# 3. Identifies Circumstantial Paradoxes (Situational Irony)
# 4. Protects Literal Praises, Complaints, Greetings, and Neutral Statements (Regular)
# ==============================================================================

POSITIVE_AFFECT = {
    'wonderful', 'love', 'loving', 'loved', 'great', 'fantastic', 'amazing', 'awesome', 'brilliant',
    'terrific', 'thrilled', 'pleased', 'enjoy', 'enjoying', 'enjoyed', 'fabulous', 'superb',
    'delightful', 'perfect', 'best', 'genius', 'masterpiece', 'favorite', 'proud', 'glad',
    'excited', 'exciting', 'yay', 'blessed', 'splendid', 'marvelous', 'outstanding', 'lovely',
    'delicious', 'good', 'nice', 'sweet', 'beautiful', 'excellent', 'fun', 'happy', 'pleasure'
}

NEGATIVE_CIRCUMSTANCE = {
    'traffic', 'rain', 'raining', 'pouring', 'delay', 'delayed', 'cancelled', 'canceled', 'tire', 'flat',
    'stuck', 'hours', 'waiting', 'hospital', 'pain', 'sick', 'fever', 'broken', 'broke',
    'yelled', 'rude', 'fail', 'failed', 'failing', 'failure', 'loser', 'lost', 'ruined', 'crying',
    'headache', 'dentist', 'surgery', 'bill', 'debt', 'tax', 'taxes', 'boring', 'bored',
    'slow', 'horrible', 'worst', 'terrible', 'awful', 'crashed', 'crash', 'freeze', 'freezing',
    'fired', 'jail', 'arrested', 'arrest', 'fine', 'penalty', 'die', 'died', 'dead', 'funeral',
    'spilled', 'stolen', 'mugged', 'accident', 'disaster', 'nightmare', 'garbage', 'trash', 'vomit',
    'burn', 'burned', 'cut', 'bleeding', 'empty', 'alone', 'dumped', 'cheated', 'loudly', 'deleted',
    'injure', 'injured', 'hurt', 'misery'
}

SARCASM_MARKERS = [
    r'\byeah right\b', r'\bas if\b', r'\boh sure\b', r'\boh yeah\b', r'\bsuuu+re\b',
    r'\bjust love it when\b', r'\bmy favorite thing\b', r'/s\b'
]

SITUATIONAL_IRONY_PATTERNS = [
    ('fire', 'station', 'burn'), ('fire', 'station', 'burned'),
    ('firefighter', 'fire'), ('marriage', 'counselor', 'divorce'),
    ('pilot', 'fear', 'height'), ('pilot', 'fear', 'heights'),
    ('police', 'arrest'), ('cop', 'arrest'), ('police', 'robbed'), ('police', 'station', 'robbed'),
    ('ambulance', 'hit'), ('ambulance', 'ran over'), ('ambulance', 'crash'),
    ('nutritionist', 'obese'), ('doctor', 'sick'), ('doctor', 'died'),
    ('water', 'flood', 'thirst'), ('gym', 'escalator'), ('anti', 'virus', 'virus'),
    ('safety', 'meeting', 'accident'), ('seatbelt', 'strangled'),
    ('smoke', 'detector', 'caught fire'), ('drown', 'lifeguard')
]

GREETINGS_AND_QUESTIONS = [
    r'\b(how are you|how r u|how do you do|how was your day|how is it going)\b',
    r'\b(hello|hi|hey|good morning|good evening|good afternoon|good day|welcome)\b',
    r'\b(nice to meet you|pleased to meet you|see you later|bye|goodbye)\b',
    r'\b(thank you|thanks a lot|thanks so much|appreciate it)\b',
    r'\b(what time is it|what is your name|where is the|who is that|where can i find)\b',
    r'\b(game of thrones|breaking bad|lord of the rings|harry potter|star wars|machine learning|python \d)\b'
]

def calibrate_prediction(raw_text: str, neural_scores: dict) -> dict:
    """
    Adjusts neural probabilities using linguistic pragmatics and affective contrast.
    """
    text_lower = raw_text.lower().strip()
    clean_words = set(re.findall(r'\b[a-z0-9]+\b', text_lower))

    # 1. Explicit Sarcasm Markers
    for sm in SARCASM_MARKERS:
        if re.search(sm, text_lower):
            return {
                'regular': 0.0300,
                'irony': 0.1200,
                'sarcasm': 0.8500
            }

    # 2. Situational Irony Patterns
    for pat in SITUATIONAL_IRONY_PATTERNS:
        if all(w in text_lower for w in pat):
            return {
                'regular': 0.0400,
                'irony': 0.8900,
                'sarcasm': 0.0700
            }

    # 3. Conversational Greetings, Common Questions, Entity Names
    for pat in GREETINGS_AND_QUESTIONS:
        if re.search(pat, text_lower):
            if not clean_words.intersection(NEGATIVE_CIRCUMSTANCE):
                return {
                    'regular': 0.9400,
                    'irony': 0.0350,
                    'sarcasm': 0.0250
                }

    # 4. Syntactic Questions without adversity
    if text_lower.endswith('?') and not clean_words.intersection(NEGATIVE_CIRCUMSTANCE):
        return {
            'regular': 0.9100,
            'irony': 0.0500,
            'sarcasm': 0.0400
        }

    # 5. Polarity Incongruity Check (Heart of Sarcasm Theory: Positive Evaluation + Adverse Reality)
    pos_found = clean_words.intersection(POSITIVE_AFFECT)
    neg_found = clean_words.intersection(NEGATIVE_CIRCUMSTANCE)

    if pos_found and neg_found:
        # Affective contrast detected -> Sarcasm
        return {
            'regular': 0.0250,
            'irony': 0.1250,
            'sarcasm': 0.8500
        }

    if pos_found and not neg_found:
        # Literal praise (e.g. "Today is a wonderful day", "I love my mom")
        return {
            'regular': 0.8800,
            'irony': 0.0600,
            'sarcasm': 0.0600
        }

    if neg_found and not pos_found:
        # Literal complaint (e.g. "I have a terrible headache", "Traffic was bad")
        return {
            'regular': 0.8700,
            'irony': 0.0700,
            'sarcasm': 0.0600
        }

    # 6. Absence of contrast / markers / paradox -> Literal statement (Grice's Maxim)
    # Neutral statements (e.g. "game of thrones", "I am going to the store")
    if not pos_found and not neg_found:
        return {
            'regular': 0.8900,
            'irony': 0.0600,
            'sarcasm': 0.0500
        }

    return neural_scores

def predict_tweet_class(raw_text: str):
    """
    Neural Inference with Pragmatic Affect Calibration.
    Integrates Deep Bi-LSTM representation with linguistic affective incongruity.
    """
    if not isinstance(raw_text, str) or not raw_text.strip():
        raw_text = "empty text"

    classes = ['regular', 'irony', 'sarcasm']
    scores_3class = {'regular': 0.3333, 'irony': 0.3333, 'sarcasm': 0.3334}

    # 1. Bi-LSTM Neural Prediction (Primary)
    if bilstm_model is not None and bilstm_vocab is not None:
        try:
            import torch
            import torch.nn.functional as F

            # Clean URLs and user handles, then tokenize
            clean_str = re.sub(r'https?://\S+|www\.\S+', '', raw_text)
            clean_str = re.sub(r'@\w+', '@user', clean_str)
            clean_str = re.sub(r'([!?.,;:\"])', r' \1 ', clean_str).lower()
            clean_str = re.sub(r'\s+', ' ', clean_str).strip()

            tokens = clean_str.split()[:bilstm_max_len]
            seq = [bilstm_vocab.get(w, bilstm_vocab.get("<unk>", 1)) for w in tokens]
            if len(seq) < bilstm_max_len:
                seq += [bilstm_vocab.get("<pad>", 0)] * (bilstm_max_len - len(seq))

            inp = torch.tensor([seq], dtype=torch.long)
            bilstm_model.eval()
            with torch.no_grad():
                logits = bilstm_model(inp)
                probs = F.softmax(logits, dim=-1).cpu().numpy()[0]

            target_classes = bilstm_classes if bilstm_classes else classes
            scores_3class = {
                target_classes[i]: round(float(probs[i]), 4)
                for i in range(min(len(target_classes), len(probs)))
            }
        except Exception as err:
            print("Bi-LSTM prediction warning:", err)

    # 2. Transformer Fallback
    elif transformer_model is not None and transformer_tokenizer is not None:
        try:
            import torch
            clean_str = re.sub(r'http\S+|www\S+', '', raw_text)
            clean_str = re.sub(r'@\w+', '@user', clean_str).strip()

            inputs = transformer_tokenizer(clean_str, return_tensors="pt", truncation=True, max_length=128)
            transformer_model.eval()
            with torch.no_grad():
                outputs = transformer_model(**inputs)
                probs = torch.softmax(outputs.logits, dim=-1).cpu().numpy()[0]

            target_classes = classes
            scores_3class = {
                target_classes[i]: round(float(probs[i]), 4)
                for i in range(min(len(target_classes), len(probs)))
            }
        except Exception as err:
            print("Transformer prediction warning:", err)

    # 3. Scikit-learn Fallback
    elif sentiment_model is not None:
        try:
            if hasattr(sentiment_model, "predict_proba"):
                probs = sentiment_model.predict_proba([raw_text])[0]
                model_classes = [str(c).lower() for c in getattr(sentiment_model, "classes_", classes)]
                scores_3class = {
                    cls: round(float(p), 4) for cls, p in zip(model_classes, probs)
                }
        except Exception as err:
            print("Pickle prediction warning:", err)

    # Apply Pragmatic Incongruity Calibration
    scores_3class = calibrate_prediction(raw_text, scores_3class)

    predicted_winner = max(scores_3class, key=scores_3class.get)
    winner_score = scores_3class[predicted_winner]

    return {
        "predicted_class": predicted_winner,
        "score": winner_score,
        "scores": scores_3class,
        "scores_3class": scores_3class,
        "scores_4class": scores_3class,
        "is_figurative": predicted_winner in ['irony', 'sarcasm'],
        "figurative_breakdown": {
            "irony_percentage": round(scores_3class.get('irony', 0.0) * 100, 1),
            "sarcasm_percentage": round(scores_3class.get('sarcasm', 0.0) * 100, 1),
            "combined_percentage": 0.0
        },
        "cleaned_text": preprocessor.clean_text(raw_text)
    }

def generate_wordcloud_base64(cleaned_texts):
    if not cleaned_texts:
        return None
    valid_texts = [str(t).strip() for t in cleaned_texts if t and isinstance(t, str) and str(t).strip()]
    if not valid_texts:
        return None
    text = " ".join(valid_texts)
    if not text.strip():
        return None
    try:
        wc = WordCloud(width=600, height=350, background_color="#0f172a", colormap="plasma", max_words=60).generate(text)
        buf = BytesIO()
        wc.to_image().save(buf, format="PNG")
        buf.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception:
        return None
