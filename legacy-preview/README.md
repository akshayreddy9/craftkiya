# Craftkiya website

This is a no-install website preview. You do not need to know how to code to open it.

## Open the website

1. In File Explorer, open this project folder.
2. Double-click `index.html` to open the storefront in your browser.
3. Choose **Studio orders (demo)** in the footer to open the sample order dashboard.

An internet connection is needed for the hosted product photography and fonts. The pages themselves are local files.

## What you can try

- Upload a reference photo in the custom portrait section. The image preview stays in your browser.
- Change the frame size and finish to see the price update.
- Add a portrait to the bag, close the page, then reopen it. The demo bag is saved in this browser.
- In `studio.html`, open a sample order to change its progress or add a courier tracking number. Updates are saved in this browser.

## Important before real sales

This is a visual and interaction demo, not a live shop. Checkout, payment collection, customer accounts, email notifications, secure image uploads, shipping integrations, and protected admin access are not connected. Do not enter real customer information or use the sample admin page for actual orders. The studio page is deliberately not password-protected.

The existing `supabase_schema.sql` is kept as a starting point for a future Supabase backend. A production launch will need a developer to connect and secure that backend, configure a payment provider, set up private file storage and email, and deploy the site to your domain. JavaScript tooling such as Node.js is not installed in this environment, so this first version is intentionally built to run without setup.
