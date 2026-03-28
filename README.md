# cloud-ml-inference-benchmark
This repository is for our CMPT756 project at SFU. In this project, we will be comparing serverless and serverful deployments of an image classification model to compare their benefits and disadvantages.

## ML gRPC Service:
cd ml-grpc-service

#### Create virtual environment
python3 -m venv venv

#### Activate virtual environment
source venv/bin/activate

#### Install dependencies
pip install -r requirements.txt

#### Add .env file
GCS_BUCKET=<bucket name>
GCS_MODEL_PATH=<model path>
LOCAL_MODEL_PATH=./ml-models/<model name>

#### Run the gRPC server
python run.py

#### Test the gRPC server
python tests/test_client.py


## Frontend:

#### Install dependencies:
npm install

#### Run the frontend:
npm run dev