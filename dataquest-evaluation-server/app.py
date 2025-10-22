# from flask import Flask, request
# import os
# import pandas as pd
# from sklearn.metrics import accuracy_score, f1_score, mean_squared_error,r2_score
# import numpy as np
# from flask_cors import CORS

# app = Flask(__name__)
# CORS(app)

# @app.route('/dataquest-round-1', methods=['POST'])
# def eval1():
#     if request.method == 'POST':
#         private_acc = 0
#         public_acc = 0
#         try:
#             file_url = request.json['file_url']
#             seniority = request.json['seniority']
#             attempt = pd.read_csv(file_url)
#             soln = pd.read_csv('dataquest-evaluation-server/Static/solution.csv')

#             print(soln)

#             private_acc = 0
#             public_acc = 0

#             if attempt.shape == soln.shape:
#                 print("Fine till here")
#                 attempt = attempt.iloc[:, 1].values
#                 soln = soln.iloc[:, 1].values
            
#                 public_soln = soln[:1000]
#                 public_att = attempt[:1000]

#                 private_soln = soln[1000:]
#                 private_att = attempt[1000:]
#                 if(seniority == "FE" or seniority == "SE"):
#                     public_acc = accuracy_score(public_soln, public_att)
#                     private_acc = accuracy_score(private_soln, private_att)
#                 else:
#                     public_acc = f1_score(public_soln, public_att)
#                     private_acc = f1_score(private_soln, private_att)
                

#             return {'private': private_acc,'public': public_acc}
    
#         except:

#             return{
#                 'private': -1,
#                 'public': -1
#             }
# @app.route('/dataquest-round-1', methods=['POST'])
# def eval1():
#     if request.method == 'POST':
#         private_acc = 0
#         public_acc = 0
#         try:
#             file_url = request.json['file_url']
#             # seniority = request.json['seniority']
#             attempt = pd.read_csv(file_url)
#             soln = pd.read_csv("Static/round1.csv")

#             print(soln)

#             private_acc = 0
#             public_acc = 0

#             if attempt.shape == soln.shape:
#                 print("Fine till here")
#                 attempt = attempt.iloc[:, 1].values
#                 soln = soln.iloc[:, 1].values
            
#                 public_soln = soln[:1000]
#                 public_att = attempt[:1000]

#                 private_soln = soln[1000:]
#                 private_att = attempt[1000:]

#                 # print("Public Solution:", public_soln)
#                 # print("Public Attempt:", public_att)
#                 # print("Private Solution:", private_soln)
#                 # print("Private Attempt:", private_att)

#                 # if seniority in ["FE", "SE"]:
#                 print("accuracy score")
#                 public_acc = mean_squared_error(public_soln, public_att)
#                 print(public_acc)
#                 private_acc = mean_squared_error(private_soln, private_att)
#                 print(private_acc)
#                 # else:
#                     # print("f1_score")
#                     # public_acc = mean_squared_error(public_soln, public_att) # Adjust based on your classes
#                     # private_acc = mean_squared_error(private_soln, private_att) # Adjust as needed

#             return {'private': private_acc, 'public': public_acc}
    
#         except Exception as e:
#             print(f"An error occurred: {e}")
#             return {'private': -1, 'public': -1}


from flask import Flask, request
import os
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ----------------------------
# ✅ Health Check Route
# ----------------------------
@app.route('/')
def health_check():
    return {"status": "ok"}, 200


# ----------------------------
# 🧩 ROUND 1 (Classification)
# ----------------------------
@app.route('/dataquest-round-1', methods=['POST'])
def eval1():
    print("=== STARTING EVAL1 FUNCTION ===")
    try:
        print("=== STEP 1: Getting request data ===")
        file_url = request.json['file_url']
        print(f"file_url: {file_url}")
        
        print("=== STEP 2: Loading attempt CSV ===")
        attempt = pd.read_csv(file_url)
        print(f"Attempt loaded successfully. Shape: {attempt.shape}")
        print(f"Attempt columns: {list(attempt.columns)}")
        print(f"First 3 rows of attempt:\n{attempt.head(3)}")
        
        print("=== STEP 3: Loading solution CSV ===")
        soln = pd.read_csv('/usr/src/eval/Static/round1Final.csv')
        print(f"Solution loaded successfully. Shape: {soln.shape}")
        print(f"Solution columns: {list(soln.columns)}")
        print(f"First 3 rows of solution:\n{soln.head(3)}")
        
        print("=== STEP 4: Shape comparison ===")
        print(f"Attempt shape: {attempt.shape}")
        print(f"Solution shape: {soln.shape}")
        
        if attempt.shape != soln.shape:
            print("=== ERROR: Shape mismatch ===")
            return {
                'public': {'f1_score': 0.0},
                'private': {'f1_score': 0.0},
                'error': 'Shape mismatch'
            }
        
        print("=== STEP 5: Extracting values ===")
        attempt_values = attempt.iloc[:, 1].values
        true_values = soln.iloc[:, 1].values
        print(f"Attempt values sample: {attempt_values[:5]}")
        print(f"True values sample: {true_values[:5]}")
        
        print("=== STEP 6: Creating public/private splits ===")
        public_soln = true_values[:1000]
        public_att = attempt_values[:1000]
        private_soln = true_values[1000:]
        private_att = attempt_values[1000:]
        
        print(f"Public split - Solution: {len(public_soln)}, Attempt: {len(public_att)}")
        print(f"Private split - Solution: {len(private_soln)}, Attempt: {len(private_att)}")
        
        print("=== STEP 7: Calculating F1 scores ===")
        from sklearn.metrics import f1_score
        public_f1 = f1_score(public_soln, public_att, average='macro')
        private_f1 = f1_score(private_soln, private_att, average='macro')
        
        print(f"Public F1: {public_f1}")
        print(f"Private F1: {private_f1}")
        
        result = {
            'public': {'f1_score': float(public_f1)},
            'private': {'f1_score': float(private_f1)}
        }
        print(f"=== FINAL RESULT: {result} ===")
        return result

    except Exception as e:
        print(f"=== EXCEPTION OCCURRED: {str(e)} ===")
        import traceback
        print(f"=== FULL TRACEBACK: ===")
        traceback.print_exc()
        return {
            'public': {'f1_score': 0.0},
            'private': {'f1_score': 0.0},
            'error': str(e)
        }


@app.route('/te-be-round-2', methods=['POST'])
def eval2():
    try:
        file_url = request.json['file_url']
        attempt = pd.read_csv(file_url)
        soln = pd.read_csv('Static/round2Final.csv')

        print(f"[ROUND2] Attempt shape: {attempt.shape}")
        print(f"[ROUND2] Solution shape: {soln.shape}")

        # shape check
        if attempt.shape != soln.shape:
            return {
                'public': {'f1_score': 0.0},
                'private': {'f1_score': 0.0},
                'error': 'Shape mismatch'
            }

        attempt_values = attempt.iloc[:, 1].values
        soln_values = soln.iloc[:, 1].values

        # 70%-30% public-private split
        pr_mark = int(soln.shape[0] * 0.7)
        public_soln = soln_values[:pr_mark]
        public_att = attempt_values[:pr_mark]
        private_soln = soln_values[pr_mark:]
        private_att = attempt_values[pr_mark:]

        # Metrics (macro F1 only, to match Round 1)
        public_f1 = f1_score(public_soln, public_att, average='macro')
        private_f1 = f1_score(private_soln, private_att, average='macro')

        return {
            'public': {'f1_score': float(public_f1)},
            'private': {'f1_score': float(private_f1)}
        }

    except Exception as e:
        print(f"[ERROR ROUND2] {e}")
        return {
            'public': {'f1_score': 0.0},
            'private': {'f1_score': 0.0},
            'error': str(e)
        }


# ----------------------------
# 🚀 Run App
# ----------------------------
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)


      
# if _name_ == "_main_":
#     port = int(os.environ.get('PORT', 5000))
#     app.run(debug=True, host='0.0.0.0', port=port)


#   if request.method == 'POST':

#             try:

#                 file_url = request.json['file_url']
#                 attempt = pd.read_csv(file_url)
#                 soln = pd.read_csv('Static/test_data_round2_server.csv')

#                 print(attempt.shape)
#                 print(soln.shape)

#                 private_acc = 0
#                 public_acc = 0

#                 if attempt.shape == soln.shape:

#                     print("shape equal")

#                     attempt_reg = attempt.iloc[:, -1].values
#                     soln_reg = soln.iloc[:, -1].values

#                     pr_mark = int(soln.shape[0]*0.7)

#                     print(pr_mark)
                    
#                     public_soln_reg = soln_reg[:pr_mark]
#                     public_att_reg = attempt_reg[:pr_mark]

#                     private_soln_reg = soln_reg[pr_mark:]
#                     private_att_reg = attempt_reg[pr_mark:]

#                     public_acc = rmse_tp(public_soln_reg, public_att_reg)

#                     print(public_acc)

#                     private_acc = rmse_tp(private_soln_reg, private_att_reg)

#                     print(private_acc)

#                 return {'private': private_acc,
#                 'public': public_acc}
            
#             except:
#                 return {
#                     'private': 200000000,
#                     'public': 200000000
#                 }
