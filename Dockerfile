# Keep the image tag in sync with the @playwright/test version in package.json
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV TZ="Europe/London"

USER root

RUN apt-get update -qq \
    && apt-get install -qqy curl zip openjdk-17-jre-headless \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip -q awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json .npmrc ./
RUN npm ci

COPY . .

# Install BrowserStack Local binary to avoid needing to download it at runtime through the CDP proxy
RUN mkdir -p /root/.browserstack \
    && curl -fsSL https://www.browserstack.com/browserstack-local/BrowserStackLocal-linux-x64.zip -o /tmp/bs.zip \
    && unzip -q /tmp/bs.zip -d /root/.browserstack \
    && chmod +x /root/.browserstack/BrowserStackLocal \
    && rm /tmp/bs.zip

ENTRYPOINT [ "./entrypoint.sh" ]

# This is downloading the linux amd64 aws cli. For M1 macs build and run with the --platform=linux/amd64 argument. eg docker build . --platform=linux/amd64
