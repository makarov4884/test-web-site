# Use official Playwright image (includes Node.js & Browsers) - Essential for Crawler
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# Set working directory
WORKDIR /app

# Copy package files first to leverage cache
COPY package.json package-lock.json ./

# Install dependencies (Clean install)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Set environment variable for port (Hugging Face uses 7860)
ENV PORT=7860
# Allow external access
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
