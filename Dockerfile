# Use the official Node.js image as the base image
FROM golang:alpine

# install logrotate
# RUN apt-get update && apt-get install -y logrotate

# create directories
RUN mkdir -p /tmp/loki/index
RUN mkdir -p /tmp/loki/chunks
RUN mkdir -p /data/loki/storage && \
    chown -R 10001:10001 /data/loki && \
    chmod -R 755 /data/loki

RUN mkdir -p /var/loki/compactor && \
    chown -R 10001:10001 /var/loki && \
    chmod -R 755 /var/loki

# Copy the entire application to the working directory
#COPY . /app

# Set the working directory inside the container
#WORKDIR /app

# install pnpm
#RUN npm install -g pnpm

# install nest
#RUN npm i -g @nestjs/cli

# Install dependencies
#RUN pnpm i

# Expose the port your app runs on
#EXPOSE 3020

# Start the application
#CMD ["pnpm", "start:dev"]
CMD ["./loki", "-config.file=/app/loki-config.yml"]
