from flask import Flask, request, jsonify
import os
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score
import numpy as np
from flask_cors import CORS

app = Flask(__name__)

# ✅ Enhanced CORS Configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "https://pulzion25-submission.vercel.app",
            "https://submission.pulzion.co.in",
            "https://pulzion.co.in",
            "https://submission.pulzion.pictacm.in",
            "https://webapp:1"
        ],
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# ✅ Handle preflight OPTIONS requests globally
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        headers = response.headers
        headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        headers['Access-Control-Max-Age'] = '3600'
        return response

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

# ----------------------------
# ✅ Health Check Route
# ----------------------------
@app.route('/')
def health_check():
    return {"status": "ok", "message": "Backend is running"}, 200

@app.route('/health')
def health():
    return {"status": "healthy"}, 200


# ----------------------------
# 🧩 ROUND 1 (Classification) - SENIOR STYLE
# ----------------------------
@app.route('/dataquest-round-1', methods=['POST', 'OPTIONS'])
def eval1():
    if request.method == 'OPTIONS':
        return '', 204

    if request.method == 'POST':
        private_acc = 0
        public_acc = 0
        try:
            file_url = request.json['file_url']
            attempt = pd.read_csv(file_url)
            soln = pd.read_csv('/usr/src/eval/Static/round1Final.csv')

            print(attempt.head)

            private_acc = 0
            public_acc = 0

            if attempt.shape == soln.shape:
                print("Fine till here")
                attempt = attempt.iloc[:, 1].values
                soln = soln.iloc[:, 1].values
            
                public_soln = soln[:1000]
                public_att = attempt[:1000]

                private_soln = soln[1000:]
                private_att = attempt[1000:]
                
                # Your metric: F1 Score with macro averaging
                public_acc = f1_score(public_soln, public_att, average='macro')
                private_acc = f1_score(private_soln, private_att, average='macro')

            return jsonify({
                'private': {'f1_score': float(private_acc)},
                'public': {'f1_score': float(public_acc)}
            }), 200
    
        except:
            return jsonify({
                'private': {'f1_score': 0.0},
                'public': {'f1_score': 0.0}
            }), 200


# ----------------------------
# 🧩 ROUND 2 (TE-BE Category) - SENIOR STYLE
# ----------------------------
@app.route('/te-be-round-2', methods=['POST', 'OPTIONS'])
def eval2():
    if request.method == 'OPTIONS':
        return '', 204

    if request.method == 'POST':
        private_mse = 0
        public_mse = 0
        exec = 0
        try:
            file_url = request.json['file_url']
            exec = 1
            attempt = pd.read_csv(file_url)
            exec = 2
            soln = pd.read_csv('/usr/src/eval/Static/round2Final.csv')
            exec = 3

            exec = attempt.shape
            if attempt.shape == soln.shape:
                
                print("Fine till here")
                attempt = attempt.iloc[:, 1].values
                soln = soln.iloc[:, 1].values
                
                public_soln = soln[:1000]
                public_att = attempt[:1000]
                
                private_soln = soln[1000:]
                private_att = attempt[1000:]
                
                # Your metric: F1 Score with macro averaging
                public_mse = f1_score(public_soln, public_att, average='macro')
                private_mse = f1_score(private_soln, private_att, average='macro')
                
            return jsonify({
                'private': {'f1_score': float(private_mse)},
                'public': {'f1_score': float(public_mse)},
                'except': exec
            }), 200
    
        except:
            return jsonify({
                'private': {'f1_score': 0.0},
                'public': {'f1_score': 0.0},
                'except': exec
            }), 200


# ----------------------------
# 🚀 Run App
# ----------------------------
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Flask server on port {port}...")
    app.run(debug=True, host='0.0.0.0', port=port)
