# Cloudflare R2 CORS Configuration Guide for Direct Browser Uploads

To allow browsers to upload recording chunks directly to Cloudflare R2 using presigned PUT URLs, your Cloudflare R2 bucket MUST be configured with Cross-Origin Resource Sharing (CORS) rules.

Without CORS enabled on R2, browser `OPTIONS` preflight requests will return **HTTP 403 Forbidden**, preventing the `PUT` upload from executing.

---

## 🛠️ Step-by-Step CORS Configuration in Cloudflare Dashboard

1. Log into your **Cloudflare Dashboard** at [dash.cloudflare.com](https://dash.cloudflare.com).
2. In the left navigation sidebar, select **R2 Object Storage**.
3. Click on your bucket name (`riverside-clone`).
4. Select the **Settings** tab.
5. Scroll down to **CORS Policy** and click **Add CORS Policy** (or **Edit CORS Policy**).
6. Paste the following JSON policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "ETag",
      "Authorization",
      "x-amz-*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

7. Click **Save**.

---

## 🔒 Presigned URL Header Matching

When `getPresignedUploadUrl` generates a presigned PUT URL:
- **Client Header**: The browser MUST send `headers: { 'Content-Type': 'video/webm' }`.
- **Exposed Header**: R2 returns the `ETag` header in the response, which the client sends to `/api/upload/chunk-confirm` for multipart / integrity tracking.
