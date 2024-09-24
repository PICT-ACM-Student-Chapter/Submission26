FROM python:3.8

# Create app directory
WORKDIR /usr/src/eval

# Copy the requirements file
COPY requirements.txt .

# Install app dependencies
RUN pip install -r requirements.txt

# Copy the whole folder inside the Image filesystem
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the app using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
