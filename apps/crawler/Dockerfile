ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY apps/crawler/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/crawler/app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
