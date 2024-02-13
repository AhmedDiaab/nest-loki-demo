# Use the official Node.js image as the base image
FROM node:18-slim

# Copy the entire application to the working directory
COPY . /app

# Set the working directory inside the container
WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Expose the port your app runs on
EXPOSE 3030

# Start the application
CMD ["npm", "run", "start:dev"]
