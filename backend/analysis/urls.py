from django.urls import path
from .views import (
    SingleCommentAnalysis,
    BatchCommentAnalysis,
    YoutubeCommentAnalysis,
    CorrectedSentimentView,
    DashboardStatsView,
    BatchListView,
    BatchDetailView,
    ModelMetricsView,
    ExportBatchReportView
)

urlpatterns = [
    path('predict/', SingleCommentAnalysis.as_view(), name='single_predict'),
    path('batch-predict/', BatchCommentAnalysis.as_view(), name='batch_predict'),
    path('youtube-predict/', YoutubeCommentAnalysis.as_view(), name='youtube_predict'),
    path('feedback/<int:pk>/', CorrectedSentimentView.as_view(), name='feedback'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('batches/', BatchListView.as_view(), name='batch_list'),
    path('batches/<int:pk>/', BatchDetailView.as_view(), name='batch_detail'),
    path('model-metrics/', ModelMetricsView.as_view(), name='model_metrics'),
    path('export/<int:pk>/', ExportBatchReportView.as_view(), name='export_report'),
]
