FROM python:3.8
# FROM public.ecr.aws/bitnami/python:3.6

# Create app directory
WORKDIR /usr/src/eval

# Copy the requirements file
COPY requirements.txt .

# Install app dependencies
RUN pip install -r requirements.txt

# start the virtual environment

# Copy the whole folder inside the Image filesystem
COPY . .

EXPOSE 5000

