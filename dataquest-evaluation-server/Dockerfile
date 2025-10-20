FROM python:3.11-slim

WORKDIR /usr/src/eval

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends build-essential wget \
  && rm -rf /var/lib/apt/lists/*

# Copy the requirements file
COPY requirements.txt .

# Install app dependencies (include gunicorn)
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy app code
COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
