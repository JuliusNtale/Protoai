

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
```

Then start the app:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Current Auth UI (Frontend)

The authentication pages currently behave as follows:

- **Sign In (`/`)**
	- Uses **User Name** and **Password**.
	- Role selection (Student / Lecturer / Administrator) is removed.
	- Successful sign-in routes directly to the student dashboard.

- **Sign Up (`/register`)**
	- Uses **Full Name**, **User Name**, and **Password**.
	- Email field is removed.
	- After successful registration, user is logged in and routed to the dashboard.

## Face Capture & Camera Access

On the sign-up page, face registration uses real browser camera access:

- Click **Enable Camera** to request webcam permission.
- Click **Capture Face** to take a snapshot from the live camera stream.
- If camera permission is blocked, the UI shows an error message and prompts retry.

Make sure your browser has camera permission enabled for `http://localhost:3000`.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.


