ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}
WORKDIR /app
ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_INDEX_URL=${PIP_INDEX_URL}
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
COPY apps/crawler/requirements.txt ./
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt
RUN useradd --system --uid 10001 --create-home appuser
COPY --chown=appuser:appuser apps/crawler/app ./app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
