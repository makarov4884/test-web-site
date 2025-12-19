# Playwright base image (includes browsers)
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (ignoring scripts to avoid redundant browser download if possible, but safely running it is fine)
# Setting PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 because base image has them
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port (Hugging Face uses 7860 by default, but Next.js defaults to 3000. 
# We should configure Next.js or redirect. HF expects app on port 7860!)
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["npm", "run", "start"]
