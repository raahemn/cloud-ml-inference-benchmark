FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py .
COPY ml-models ./ml-models

ENV LOCAL_MODEL_PATH=/app/ml-models/resnet18_cifar10.pth
ENV PORT=8080

EXPOSE 8080

CMD ["python", "run.py"]
