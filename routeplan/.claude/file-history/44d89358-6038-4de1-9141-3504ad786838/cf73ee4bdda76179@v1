FROM openjdk:24-slim-bookworm AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apt-get update && apt-get install -y maven && \
    mvn clean package -DskipTests -q && \
    mv target/*.jar app.jar

FROM openjdk:24-slim-bookworm
WORKDIR /app
COPY --from=builder /app/app.jar .
EXPOSE 8080
ENTRYPOINT ["java", "--enable-preview", "-jar", "app.jar"]
