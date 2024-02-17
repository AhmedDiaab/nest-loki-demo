# Use the official Node.js image as the base image
FROM node:18-slim

# install logrotate
RUN apt-get update && apt-get install -y logrotate

# Copy the entire application to the working directory
COPY . /app

# Set the working directory inside the container
WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# install nest
RUN npm i -g @nestjs/cli

# Install dependencies
RUN pnpm i

# Expose the port your app runs on
EXPOSE 3020

# Start the application
CMD ["pnpm", "start:dev"]
