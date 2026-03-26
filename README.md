# cloud-ml-inference-benchmark
This repository is for our CMPT756 project at SFU. In this project, we will be comparing serverless and serverful deployments of an image classification model to compare their benefits and disadvantages.

## Backend:

#### Create virtual environment
python3 -m venv venv

#### Activate virtual environment
source venv/bin/activate

#### Install dependencies
pip install -r requirements.txt

#### Run the backend
python -m uvicorn app.main:app --reload

## Frontend:

#### Install dependencies:
npm install

#### Run the frontend:
npm run dev