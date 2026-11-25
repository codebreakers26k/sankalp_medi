FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine

RUN addgroup -S mediqueue && adduser -S mediqueue -G mediqueue
WORKDIR /app
COPY --from=build /workspace/target/mediqueue-backend-0.1.0-SNAPSHOT.jar ./app.jar

USER mediqueue
EXPOSE 10000

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
