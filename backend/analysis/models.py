from django.db import models
from django.contrib.auth.models import User

class BatchComment(models.Model):
    COMMENT_TYPE_CHOICES = [
        ('CSV File', 'CSV'),
        ('Excel File', 'Excel'),
        ('Youtube', 'YouTube'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    batchname = models.CharField(max_length=100)
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPE_CHOICES, default='CSV File')
    date_created = models.DateTimeField(auto_now_add=True)
    overall_sentiment = models.CharField(max_length=20, default='regular')  # Primary/dominant class
    irony_count = models.IntegerField(default=0)
    sarcasm_count = models.IntegerField(default=0)
    regular_count = models.IntegerField(default=0)
    figurative_count = models.IntegerField(default=0)
    total_comments = models.IntegerField(default=0)

    def __str__(self):
        user_str = self.user.username if self.user else "Anonymous"
        return f"{user_str} - {self.batchname} ({self.comment_type})"

class Comment(models.Model):
    CLASS_CHOICES = [
        ('irony', 'Irony'),
        ('sarcasm', 'Sarcasm'),
        ('regular', 'Regular'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    batch = models.ForeignKey(BatchComment, null=True, blank=True, on_delete=models.CASCADE, related_name="comments")
    comment = models.TextField()
    cleaned_text = models.TextField(blank=True, null=True)
    sentiment = models.CharField(max_length=20, choices=CLASS_CHOICES, default='regular') # Class name
    score = models.FloatField(default=0.0) # Highest probability score
    irony_score = models.FloatField(default=0.0)
    sarcasm_score = models.FloatField(default=0.0)
    regular_score = models.FloatField(default=0.0)
    figurative_score = models.FloatField(default=0.0)
    date_created = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_updated = models.BooleanField(default=False)
    comment_type = models.CharField(max_length=20, choices=[('single', 'Single'), ('batch', 'Batch'), ('youtube', 'YouTube')], default='single')

    def __str__(self):
        return f"{self.comment_type} - {self.sentiment} ({self.score:.2f})"

class CorrectedSentiment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="corrections")
    comment_text = models.TextField()
    predicted_sentiment = models.CharField(max_length=20)
    corrected_sentiment = models.CharField(max_length=20)
    corrected_at = models.DateTimeField(auto_now_add=True)
    feedback_verified = models.BooleanField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.feedback_verified is not None:
            if self.feedback_verified:
                self.comment.sentiment = self.corrected_sentiment
                self.comment.is_updated = True
            else:
                self.comment.sentiment = self.predicted_sentiment
            self.comment.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Correction: {self.predicted_sentiment} -> {self.corrected_sentiment}"
