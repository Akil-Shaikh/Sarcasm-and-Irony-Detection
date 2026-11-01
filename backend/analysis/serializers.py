from rest_framework import serializers
from .models import BatchComment, Comment, CorrectedSentiment

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'

class BatchCommentSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    batch_name = serializers.CharField(source='batchname', read_only=True)
    created_at = serializers.DateTimeField(source='date_created', read_only=True)

    class Meta:
        model = BatchComment
        fields = '__all__'

class CorrectedSentimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectedSentiment
        fields = '__all__'
