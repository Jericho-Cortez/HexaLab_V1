FROM python:3.11-slim

WORKDIR /app

# install syft + grype
RUN apt-get update && apt-get install -y curl
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | \
    bash -s -- -b /usr/local/bin

RUN curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | \
    bash -s -- -b /usr/local/bin


COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "run_api.py"]