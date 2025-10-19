# Use official Node.js image as the base
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

RUN npm install bcryptjs jsonwebtoken cors

# Install compilers for supported languages (Python, Java, C++)
RUN apt-get update && \
    apt-get install -y python3 python3-pip openjdk-17-jdk g++ && \
    rm -rf /var/lib/apt/lists/*


# Copy the rest of the project files
COPY . .

# Expose the backend port
EXPOSE 8080

# Command to start the backend
CMD ["node", "index.js"]