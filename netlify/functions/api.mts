import serverless from "serverless-http";
import { createApp } from "../../server/app";

// Wrap the existing Express app so all of its API routes run inside a single
// Netlify Function. Netlify's Lambda-compatible event format is handled by
// serverless-http's default `aws` provider. Routing to friendly paths
// (/api/*, /manus-storage/*) is configured via redirects in netlify.toml.
const app = createApp();

export const handler = serverless(app, {
  binary: ["application/octet-stream", "video/*", "image/*", "multipart/form-data"],
});
