FROM maven:3.9.9-eclipse-temurin-17 AS backend-build
WORKDIR /backend
COPY backend/src ./src
COPY backend/pom.xml .
RUN mvn clean package -DskipTests

FROM maven:3.9.9-eclipse-temurin-17 AS spark-build
WORKDIR /spark
COPY Spark-Engine/src ./src
COPY Spark-Engine/pom.xml .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17.0.15_6-jre
WORKDIR /app
COPY --from=backend-build /backend/target/*.jar app.jar
COPY --from=spark-build /spark/target/spark-engine.jar spark-engine.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]