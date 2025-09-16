`Prompt`: Use Sentry to debug

`npm install --save @sentry/react`

Initialize Sentry as early as possible in your application's lifecycle.

```JavaScript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://c9c670e4a82008eb7f2d7bcbc3741f50@o4510028336922624.ingest.us.sentry.io/4510028338429952",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

const container = document.getElementById(“app”);
const root = createRoot(container);
root.render(<App />);
```