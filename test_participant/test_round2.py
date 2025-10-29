import pandas as pd
import numpy as np
import boto3
import requests
import json
from datetime import datetime

print("🧪 Testing Round 2 Submission")
print("="*50)

# Load ground truth
ground_truth = pd.read_csv('/home/ubuntu/submission22-backend/dataquest-evaluation-server/Static/round2Final.csv')

# Get structure
ids = ground_truth.iloc[:, 0].values
classes = ground_truth.iloc[:, 1].unique()

print(f"📊 Ground Truth Info:")
print(f"   Total samples: {len(ids)}")
print(f"   Classes: {classes}")

# Create random predictions
np.random.seed(42)
predictions = np.random.choice(classes, size=len(ids))

# Create submission
submission = pd.DataFrame({
    'ID': ids,
    'ASI_category': predictions
})

# Save locally
local_file = 'test_submission_round2.csv'
submission.to_csv(local_file, index=False)
print(f"\n✅ Generated: {local_file}")
print(f"   Shape: {submission.shape}")

# Upload to S3
s3_client = boto3.client('s3')
bucket_name = 'submission-platform-files-2025'
s3_key = f'test_submissions/test_submission_round2_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'

try:
    print(f"\n📤 Uploading to S3...")
    s3_client.upload_file(local_file, bucket_name, s3_key)
    s3_url = f'https://{bucket_name}.s3.amazonaws.com/{s3_key}'
    print(f"✅ Uploaded successfully")
    
    # Call backend API
    print(f"\n🌐 Calling Backend API...")
    api_url = 'http://api.submission.pictacm.in:5000/te-be-round-2'
    payload = {'file_url': s3_url}
    
    response = requests.post(api_url, json=payload, timeout=30)
    
    print(f"\n📊 Backend Response:")
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n   📈 Results:")
        print(f"      Public F1:  {result.get('public', {}).get('f1_score', 'N/A')}")
        print(f"      Private F1: {result.get('private', {}).get('f1_score', 'N/A')}")
        print("\n✅ TEST SUCCESSFUL!")
    else:
        print(f"   Error: {response.text}")
        print("\n❌ TEST FAILED")
        
except Exception as e:
    print(f"\n❌ Error: {str(e)}")

print("="*50)
