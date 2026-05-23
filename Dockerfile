FROM openjdk:21-slim-bookworm AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apt-get update && apt-get install -y maven && \
    mvn clean package -DskipTests -q && \
    mv target/*.jar app.jar

FROM openjdk:21-slim-bookworm
WORKDIR /app
COPY --from=builder /app/app.jar .
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
