from flask import Flask, request
import os
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error,r2_score
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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
from flask import request
import pandas as pd
from sklearn.metrics import mean_squared_error

@app.route('/dataquest-round-1', methods=['POST'])
def eval1():
    if request.method == 'POST':
        private_acc = 0
        public_acc = 0
        try:
            file_url = request.json['file_url']
            attempt = pd.read_csv(file_url)
            soln = pd.read_csv("Static/round1.csv")
            print(attempt.shape)
            print(soln.shape)

            if attempt.shape == soln.shape:
                attempt = attempt.iloc[:, 1].values
                soln = soln.iloc[:, 1].values
            
                public_soln = soln[:1000]
                public_att = attempt[:1000]

                private_soln = soln[1000:]
                private_att = attempt[1000:]

                # Calculate accuracy scores (MSE in this case)
                public_acc = mean_squared_error(public_soln, public_att)
                private_acc = mean_squared_error(private_soln, private_att)
            else:
                # If the shapes do not match, set accuracies to infinity
                public_acc = 100000.00
                private_acc = 100000.00

            return {'private': private_acc, 'public': public_acc}
    
        except Exception as e:
            print(f"An error occurred: {e}")
            # If any error occurs, set accuracies to infinity
            return {'private': 100000.00, 'public': 10000.00}

def rmse_tp(reg_soln, reg_att):                                 ## rmse true positives
    mse = mean_squared_error(reg_soln, reg_att)
    print(mse)
    return mse
@app.route('/is_up', methods=['GET'])
def dummy():
    print("eval_called")
    return {
        "message":"hello world!!",
        'private': -1, 
        'public': -1
    }
@app.route('/te-be-round-2', methods=['POST'])
def eval2():
    if request.method == 'POST':
        private_f1 = 0
        public_f1 = 0
        exec_stage = 0  # Tracks the stage of execution for debugging
        try:
            # Step 1: Retrieve the file URL
            file_url = request.json.get('file_url')
            exec_stage = 1

            # Step 2: Read the attempt and solution CSV files
            attempt = pd.read_csv(file_url)
            exec_stage = 2
            soln = pd.read_csv('Static/new_ans.csv')
            exec_stage = 3

            # Step 3: Ensure the shape of both dataframes is the same
            if attempt.shape == soln.shape:
                print("Shapes match. Proceeding further.")

                # Step 4: Extract the second column (assumed to be the relevant data)
                attempt_values = attempt.iloc[:, 1].values
                soln_values = soln.iloc[:, 1].values

                # Split data into public and private sets
                public_soln = soln_values[:1000]
                public_att = attempt_values[:1000]

                private_soln = soln_values[1000:]
                private_att = attempt_values[1000:]

                print("Public Solution:", public_soln)
                print("Public Attempt:", public_att)
                print("Private Solution:", private_soln)
                print("Private Attempt:", private_att)

                # Step 5: Calculate F1 scores for public and private datasets
                public_f1 = f1_score(public_soln, public_att, average='weighted')
                private_f1 = f1_score(private_soln, private_att, average='weighted')

            return {
                'private': private_f1,
                'public': public_f1,
                'except': exec_stage  # Return the stage of execution for debugging
            }

        except Exception as e:
            print(f"Error encountered at stage {exec_stage}: {e}")
            return {
                'private': 0,
                'public': 0,
                'except': exec_stage  # Return the stage where the error occurred
            }

      
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