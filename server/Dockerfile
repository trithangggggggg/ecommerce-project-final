# syntax=docker/dockerfile:1
# =============================================================================
#  Dockerfile Backend - Multi-stage build (Spring Boot 4 / Java 21 / Gradle)
# =============================================================================

# ---------- Stage 1: build - biên dịch & đóng gói bằng Gradle + JDK 21 ----------
FROM gradle:8.14-jdk21-alpine AS build
WORKDIR /workspace

# Copy build.gradle và settings.gradle trước để tận dụng cache layer
COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon -q

# Copy mã nguồn và đóng gói file JAR (bỏ qua unit test khi build image để tối ưu thời gian)
COPY src ./src
RUN gradle bootJar -x test --no-daemon -q

# ---------- Stage 2: runtime - chỉ chứa JRE 21 + file JAR ----------
FROM eclipse-temurin:21-jre-alpine AS runtime

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

WORKDIR /app

# Chạy ứng dụng bằng user thường spring, bảo mật không dùng root
RUN addgroup -S spring && adduser -S spring -G spring

# Copy file JAR từ stage build
COPY --from=build --chown=spring:spring /workspace/build/libs/*.jar /app/app.jar
USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
