import re
import os
import json
import base64
import pandas as pd
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings
from django.db.models import Count

from .models import BatchComment, Comment, CorrectedSentiment
from .serializers import BatchCommentSerializer, CommentSerializer, CorrectedSentimentSerializer
from .utils import (
    predict_tweet_class,
    generate_wordcloud_base64,
    model_metrics,
    CLASSES
)

class SingleCommentAnalysis(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = request.data
            text = data.get("text", "")
            if not text or not text.strip():
                return Response({"error": "Text to analyze is empty"}, status=status.HTTP_400_BAD_REQUEST)

            res = predict_tweet_class(text)
            predicted_class = res.get("predicted_class", "regular")
            score = res.get("score", 0.9)
            scores = res.get("scores") or res.get("scores_3class") or res.get("scores_4class") or {}
            cleaned_text = res.get("cleaned_text", "")

            user = request.user if request.user.is_authenticated else None
            comment_obj = Comment.objects.create(
                user=user,
                comment=text,
                cleaned_text=cleaned_text,
                sentiment=predicted_class,
                score=score,
                irony_score=scores.get("irony", 0.0),
                sarcasm_score=scores.get("sarcasm", 0.0),
                regular_score=scores.get("regular", 0.0),
                comment_type='single'
            )

            return Response({
                "id": comment_obj.id if comment_obj else None,
                "text": text,
                "cleaned_text": cleaned_text,
                "predicted_class": predicted_class,
                "score": score,
                "scores": scores,
                "scores_3class": scores,
                "scores_4class": scores,
                "is_figurative": res.get("is_figurative", predicted_class in ['irony', 'sarcasm']),
                "figurative_breakdown": res.get("figurative_breakdown", {}),
                "message": "Analysis successful"
            }, status=status.HTTP_200_OK if not comment_obj else status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Error generating analysis: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BatchCommentAnalysis(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            batchname = request.data.get('batchname') or request.data.get('batch_name') or 'Untitled Batch'
            requested_col = request.data.get('column_name') or request.data.get('column') or request.data.get('target_col')

            if not file_obj:
                return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

            filename = file_obj.name.lower()
            if filename.endswith('.csv'):
                df = pd.read_csv(file_obj)
                comment_type = 'CSV File'
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file_obj)
                comment_type = 'Excel File'
            else:
                return Response({"error": "Unsupported file format. Upload CSV or Excel."}, status=status.HTTP_400_BAD_REQUEST)

            # Determine the target column for text analysis
            target_col = None
            if requested_col and str(requested_col).strip():
                req_clean = str(requested_col).strip().lower()
                for col in df.columns:
                    if str(col).strip().lower() == req_clean:
                        target_col = col
                        break
                if not target_col:
                    available = [f"'{str(c)}'" for c in df.columns]
                    return Response({
                        "error": f"Column '{requested_col}' not found. Available columns in your file: {', '.join(available)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Automatic fallback search
                for col in df.columns:
                    if str(col).strip().lower() in ['tweets', 'tweet', 'comment', 'comments', 'text', 'content', 'sentence', 'statement']:
                        target_col = col
                        break
                if not target_col:
                    target_col = df.columns[0] # Fallback to first column

            comments_list = df[target_col].dropna().astype(str).tolist()
            if not comments_list:
                return Response({"error": "No valid text data found in file"}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user if request.user.is_authenticated else None
            batch = BatchComment.objects.create(
                user=user,
                batchname=batchname,
                comment_type=comment_type
            )

            counts = {'regular': 0, 'irony': 0, 'sarcasm': 0}
            created_comments = []

            for text in comments_list[:5000]: # Limit max 5000 per batch for speed
                res = predict_tweet_class(text)
                cls = res.get("predicted_class", "regular")
                counts[cls] = counts.get(cls, 0) + 1
                scores = res.get("scores") or res.get("scores_3class") or res.get("scores_4class") or {}

                c = Comment(
                    user=user,
                    batch=batch,
                    comment=text,
                    cleaned_text=res.get("cleaned_text", ""),
                    sentiment=cls,
                    score=res.get("score", 0.9),
                    irony_score=scores.get("irony", 0.0),
                    sarcasm_score=scores.get("sarcasm", 0.0),
                    regular_score=scores.get("regular", 0.0),
                    comment_type='batch'
                )
                created_comments.append(c)

            Comment.objects.bulk_create(created_comments)

            # Overall primary sentiment
            overall = max(counts, key=counts.get) if counts else 'regular'
            batch.overall_sentiment = overall
            batch.irony_count = counts.get('irony', 0)
            batch.sarcasm_count = counts.get('sarcasm', 0)
            batch.regular_count = counts.get('regular', 0)
            batch.total_comments = len(created_comments)
            batch.save()

            # Return serialized list of comments directly so the frontend has immediate access
            serialized_comments = [
                {
                    "id": c.id,
                    "text": c.comment,
                    "comment": c.comment,
                    "predicted_class": c.sentiment,
                    "predicted_sentiment": c.sentiment,
                    "sentiment": c.sentiment,
                    "score": round(float(c.score), 4),
                    "confidence_score": round(float(c.score), 4),
                    "irony_score": round(float(c.irony_score), 4),
                    "sarcasm_score": round(float(c.sarcasm_score), 4),
                    "regular_score": round(float(c.regular_score), 4),
                }
                for c in created_comments
            ]

            return Response({
                "id": batch.id,
                "batch_id": batch.id,
                "batchname": batch.batchname,
                "batch_name": batch.batchname,
                "date_created": batch.date_created.isoformat(),
                "created_at": batch.date_created.isoformat(),
                "comment_type": batch.comment_type,
                "target_column": target_col,
                "available_columns": [str(c) for c in df.columns],
                "total_comments": batch.total_comments,
                "overall_sentiment": overall,
                "counts": counts,
                "regular_count": batch.regular_count,
                "irony_count": batch.irony_count,
                "sarcasm_count": batch.sarcasm_count,
                "comments": serialized_comments,
                "message": "Batch processed successfully"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YoutubeCommentAnalysis(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            raw_url = str(request.data.get('url', '')).strip()
            api_key = request.data.get('api_key') or settings.YOUTUBE_API_KEY
            
            # Robust extraction of 11-char YouTube Video ID
            video_id = None
            if re.fullmatch(r'[0-9A-Za-z_-]{11}', raw_url):
                video_id = raw_url
            else:
                m = re.search(r'(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|watch\?v=|\/e\/)([0-9A-Za-z_-]{11})', raw_url)
                if not m:
                    m = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})', raw_url)
                if m:
                    video_id = m.group(1)

            if not video_id:
                return Response({"error": "Invalid YouTube URL format. Please provide a valid YouTube link or 11-character video ID."}, status=status.HTTP_400_BAD_REQUEST)

            if not api_key:
                return Response({
                    "error": "A Google YouTube Data API v3 key is required to fetch real comments from YouTube. Please enter your API key in the 'Custom YouTube API Key' field above."
                }, status=status.HTTP_400_BAD_REQUEST)

            fetched_comments = []
            try:
                youtube = build('youtube', 'v3', developerKey=api_key)
                response = youtube.commentThreads().list(
                    part='snippet',
                    videoId=video_id,
                    maxResults=100,
                    textFormat='plainText'
                ).execute()

                for item in response.get('items', []):
                    c = item['snippet']['topLevelComment']['snippet']['textDisplay']
                    if c and isinstance(c, str) and c.strip():
                        fetched_comments.append(c.strip())

            except HttpError as http_err:
                error_str = str(http_err)
                if 'commentsDisabled' in error_str:
                    return Response({"error": "Comments are disabled on this YouTube video."}, status=status.HTTP_400_BAD_REQUEST)
                elif 'quotaExceeded' in error_str:
                    return Response({"error": "YouTube Data API quota exceeded for this key. Please use another API key."}, status=status.HTTP_400_BAD_REQUEST)
                elif 'API_KEY_INVALID' in error_str or 'keyInvalid' in error_str:
                    return Response({"error": "The provided YouTube API key is invalid or not enabled for YouTube Data API v3."}, status=status.HTTP_400_BAD_REQUEST)
                elif 'videoNotFound' in error_str:
                    return Response({"error": f"YouTube video with ID '{video_id}' was not found."}, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response({"error": f"YouTube API error: {error_str}"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as yt_err:
                return Response({"error": f"Failed to fetch YouTube comments: {str(yt_err)}"}, status=status.HTTP_400_BAD_REQUEST)

            if not fetched_comments:
                return Response({
                    "error": "No comments found on this YouTube video (comments may be empty or restricted)."
                }, status=status.HTTP_400_BAD_REQUEST)

            user = request.user if request.user.is_authenticated else None
            batch = BatchComment.objects.create(
                user=user,
                batchname=f"YouTube Video ({video_id})",
                comment_type='Youtube'
            )

            counts = {'regular': 0, 'irony': 0, 'sarcasm': 0}
            created_comments = []

            for text in fetched_comments:
                res = predict_tweet_class(text)
                cls = res.get("predicted_class", "regular")
                counts[cls] = counts.get(cls, 0) + 1
                scores = res.get("scores") or res.get("scores_3class") or res.get("scores_4class") or {}

                c = Comment(
                    user=user,
                    batch=batch,
                    comment=text,
                    cleaned_text=res.get("cleaned_text", ""),
                    sentiment=cls,
                    score=res.get("score", 0.9),
                    irony_score=scores.get("irony", 0.0),
                    sarcasm_score=scores.get("sarcasm", 0.0),
                    regular_score=scores.get("regular", 0.0),
                    comment_type='youtube'
                )
                created_comments.append(c)

            Comment.objects.bulk_create(created_comments)

            overall = max(counts, key=counts.get) if fetched_comments else 'regular'
            batch.overall_sentiment = overall
            batch.irony_count = counts.get('irony', 0)
            batch.sarcasm_count = counts.get('sarcasm', 0)
            batch.regular_count = counts.get('regular', 0)
            batch.total_comments = len(created_comments)
            batch.save()

            serialized_yt_comments = [
                {
                    "id": c.id,
                    "text": c.comment,
                    "comment": c.comment,
                    "predicted_class": c.sentiment,
                    "predicted_sentiment": c.sentiment,
                    "sentiment": c.sentiment,
                    "score": round(float(c.score), 4),
                    "confidence_score": round(float(c.score), 4),
                    "irony_score": round(float(c.irony_score), 4),
                    "sarcasm_score": round(float(c.sarcasm_score), 4),
                    "regular_score": round(float(c.regular_score), 4),
                }
                for c in created_comments
            ]

            return Response({
                "id": batch.id,
                "batch_id": batch.id,
                "batchname": batch.batchname,
                "batch_name": batch.batchname,
                "comment_type": batch.comment_type,
                "date_created": batch.date_created.isoformat(),
                "created_at": batch.date_created.isoformat(),
                "video_id": video_id,
                "total_comments": batch.total_comments,
                "overall_sentiment": overall,
                "counts": counts,
                "regular_count": batch.regular_count,
                "irony_count": batch.irony_count,
                "sarcasm_count": batch.sarcasm_count,
                "comments": serialized_yt_comments,
                "message": "YouTube analysis complete"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"YouTube analysis error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CorrectedSentimentView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            try:
                comment = Comment.objects.get(pk=pk)
            except Comment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

            corrected_sentiment = request.data.get("sentiment", "").lower().strip()
            if corrected_sentiment not in ['irony', 'sarcasm', 'regular']:
                return Response({"error": "Invalid target class. Must be irony, sarcasm, or regular"}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user if request.user.is_authenticated else None
            correction = CorrectedSentiment.objects.create(
                user=user,
                comment=comment,
                comment_text=comment.comment,
                predicted_sentiment=comment.sentiment,
                corrected_sentiment=corrected_sentiment,
                feedback_verified=True
            )

            comment.sentiment = corrected_sentiment
            comment.is_updated = True
            comment.save()

            return Response({
                "id": comment.id,
                "previous_sentiment": correction.predicted_sentiment,
                "updated_sentiment": comment.sentiment,
                "message": "Feedback submitted and sentiment updated successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            user_comments = Comment.objects.filter(user=request.user)
        else:
            user_comments = Comment.objects.all()

        total_predictions = user_comments.count()
        class_distribution = {
            'regular': user_comments.filter(sentiment='regular').count(),
            'irony': user_comments.filter(sentiment='irony').count(),
            'sarcasm': user_comments.filter(sentiment='sarcasm').count(),
        }
        recent_predictions = user_comments.order_by('-date_created')[:10]
        recent_data = CommentSerializer(recent_predictions, many=True).data

        cleaned_texts = user_comments.exclude(cleaned_text='').values_list('cleaned_text', flat=True)[:1000]
        wordcloud_img = generate_wordcloud_base64(list(cleaned_texts)) if cleaned_texts.exists() else None

        return Response({
            "is_authenticated": request.user.is_authenticated,
            "total_predictions": total_predictions,
            "class_distribution": class_distribution,
            "recent_predictions": recent_data,
            "wordcloud_image": wordcloud_img,
            "model_summary": model_metrics.get("best_model", "Optimized 3-Class Attention Bi-LSTM"),
            "model_accuracy": model_metrics.get("accuracy", 0.8213)
        }, status=status.HTTP_200_OK)

class BatchDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            batch = BatchComment.objects.get(pk=pk)
            serializer = BatchCommentSerializer(batch)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except BatchComment.DoesNotExist:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            batch = BatchComment.objects.get(pk=pk)
            batch.delete()
            return Response({"message": "Batch deleted successfully"}, status=status.HTTP_200_OK)
        except BatchComment.DoesNotExist:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)

class BatchListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            batches = BatchComment.objects.filter(user=request.user).order_by('-date_created')[:50]
        else:
            batches = BatchComment.objects.all().order_by('-date_created')[:50]
        serializer = BatchCommentSerializer(batches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ModelMetricsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(model_metrics, status=status.HTTP_200_OK)

class ExportBatchReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            batch = BatchComment.objects.get(pk=pk)
            comments = batch.comments.all()

            wb = Workbook()
            ws = wb.active
            ws.title = "Sarcasm Irony Report"

            # Header styles
            header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
            header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

            headers = ["ID", "Original Text", "Cleaned Text", "Predicted Class", "Confidence", "Irony Prob", "Sarcasm Prob", "Regular Prob"]
            ws.append(headers)

            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=1, column=col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center")

            for c in comments:
                ws.append([
                    c.id,
                    c.comment,
                    c.cleaned_text,
                    c.sentiment.upper(),
                    f"{c.score*100:.1f}%",
                    f"{c.irony_score*100:.1f}%",
                    f"{c.sarcasm_score*100:.1f}%",
                    f"{c.regular_score*100:.1f}%",
                ])

            # Auto column width
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)

            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename=Sarcasm_Irony_Batch_{batch.id}.xlsx'
            wb.save(response)
            return response

        except BatchComment.DoesNotExist:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)
