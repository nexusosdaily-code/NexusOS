# NexusOS Web3 Wallet - Docker Image
# ====================================

FROM python:3.11-slim

LABEL maintainer="NexusOS Team <support@nexusos.io>"
LABEL description="Quantum-resistant Web3 wallet with wavelength encryption"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY . /app/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV DATABASE_URL=sqlite:////data/nexus_wallet.db
ENV STREAMLIT_SERVER_PORT=5000
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/_stcore/health || exit 1

# Default command (UI mode)
CMD ["nexus-wallet-ui"]

# Alternative commands:
# CLI mode: docker run nexus-wallet nexus-wallet-cli --help
# Custom: docker run nexus-wallet python -m nexus_wallet.cli create
