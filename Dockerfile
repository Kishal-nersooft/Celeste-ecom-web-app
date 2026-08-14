# ---------- deps ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci
    
    
    # ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Firebase + public env (build-time only)
ARG NEXT_PUBLIC_GOOGLE_API_KEY

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_OTP_FUNCTIONS_BASE_URL

# Fail fast instead of producing a broken build.
# Empty values mean the Cloud Build trigger did not pass --build-arg (runtime
# Cloud Run secrets are not visible here).
RUN missing="" && \
    [ -n "$NEXT_PUBLIC_FIREBASE_API_KEY" ] || missing="$missing NEXT_PUBLIC_FIREBASE_API_KEY" && \
    [ -n "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" ] || missing="$missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" && \
    [ -n "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ] || missing="$missing NEXT_PUBLIC_FIREBASE_PROJECT_ID" && \
    [ -n "$NEXT_PUBLIC_FIREBASE_APP_ID" ] || missing="$missing NEXT_PUBLIC_FIREBASE_APP_ID" && \
    [ -n "$NEXT_PUBLIC_API_BASE_URL" ] || missing="$missing NEXT_PUBLIC_API_BASE_URL" && \
    if [ -n "$missing" ]; then \
      echo "Missing Docker build-args:$missing" >&2; \
      echo "Cloud Run runtime secrets are not available during docker build. The trigger must use cloudbuild.yaml and pass --build-arg from Secret Manager." >&2; \
      exit 1; \
    fi

ENV NEXT_PUBLIC_GOOGLE_API_KEY=$NEXT_PUBLIC_GOOGLE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_OTP_FUNCTIONS_BASE_URL=$NEXT_PUBLIC_OTP_FUNCTIONS_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build
    
    
    # ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system nodejs
RUN adduser --system nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]