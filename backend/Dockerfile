# Use official Node.js image as the base
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

RUN npm install bcryptjs jsonwebtoken cors @google/generative-ai

# Install compilers for supported languages (Python, Java, C++)
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i 's|http://deb.debian.org/debian|http://deb.debian.org/debian-security|g' /etc/apt/sources.list || true && \
    apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        openjdk-17-jdk \
        g++ && \
    rm -rf /var/lib/apt/lists/*


# Copy the rest of the project files
COPY . .

# Expose the backend port
EXPOSE 8080

# Command to start the backend
CMD ["node", "index.js"]