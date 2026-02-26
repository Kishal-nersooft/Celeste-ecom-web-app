# Deploy to Cloud Run (from your machine)

Run the deploy from the **project root** (where `cloudbuild.yaml` is).

---

## BEFORE you run the command

### 1. Code / repo
- [ ] Latest changes are committed (Dockerfile, cloudbuild.yaml, etc.).
- [ ] You are in the project root: `cd /path/to/Celeste-ecom-web-app`

### 2. Google Cloud (one-time setup)
- [ ] **gcloud CLI** installed and logged in:
  ```bash
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  ```
  (Use the same project ID as in your Cloud Run URL, e.g. `391514911705` or the project name.)

- [ ] **APIs enabled** (in [Cloud Console](https://console.cloud.google.com/apis/library)):
  - Cloud Build API  
  - Cloud Run Admin API  
  - Container Registry (or Artifact Registry)  

### 3. Get your Google Maps API key
- [ ] Copy the value of `NEXT_PUBLIC_GOOGLE_API_KEY` from your `.env` (or `.env.local`).  
  You will pass it in the deploy command in the next section.

---

## Run the deploy command

From the project root, run (replace `YOUR_GOOGLE_MAPS_API_KEY` with the actual key):

```bash
gcloud builds submit --config=cloudbuild.yaml --substitutions=_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```

Example (use your real key):

```bash
gcloud builds submit --config=cloudbuild.yaml --substitutions=_GOOGLE_MAPS_API_KEY="AIzaSy..."
```

This will:
1. Build the Docker image with the API key baked in.
2. Push the image to Container Registry.
3. Deploy the image to Cloud Run.

Wait until the build and deploy finish (several minutes).

---

## AFTER deploy

### 1. Verify the app
- [ ] Open your Cloud Run URL (e.g. `https://nextjs-web-391514911705.asia-south1.run.app`).
- [ ] Go to a product page and open the **location selector** (search/address bar).
- [ ] Type in the search bar and confirm **address suggestions load** and there are no “API key” or “REQUEST_DENIED” errors in the browser console.

### 2. (Recommended) Restrict the API key
- [ ] In [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), open your **Google Maps API key**.
- [ ] **Application restrictions**: choose “HTTP referrers” and add:
  - `https://nextjs-web-*.asia-south1.run.app/*`
  - Your custom domain(s) if you use any.
- [ ] **API restrictions**: restrict to the APIs you use (e.g. Maps JavaScript API, Places API, Geocoding API).
- [ ] Save.

---

## Quick reference

| What | Value |
|------|--------|
| Config file | `cloudbuild.yaml` |
| Service name | `nextjs-web` |
| Region | `asia-south1` |
| Substitution for Maps key | `_GOOGLE_MAPS_API_KEY` |

If you forget to pass `_GOOGLE_MAPS_API_KEY`, the build still runs but the map/location search will not work in production (same as before).
