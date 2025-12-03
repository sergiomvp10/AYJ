FROM python:3.12-slim

WORKDIR /code

# Install poetry
RUN pip install poetry

# Copy poetry files
COPY pyproject.toml poetry.lock* /code/

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy application code
COPY ./app /code/app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
