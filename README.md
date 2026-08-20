# Mood Check-In

A simple React + Vite app for recording mood check-ins. Data and admin
authentication use Appwrite.

## Setup

1. Create an Appwrite Cloud project at https://cloud.appwrite.io.
2. Add a Web platform for `localhost` and your deployed domain.
3. Create a database and collection, then put their IDs in `frontend/.env`.
4. Add optional string attributes: `what_happened`, `anger_level`,
   `what_wants`, and `created_at`.
5. Allow **Any** to create and update documents. Allow **Users** to read and
   delete documents.
6. Enable Email/Password authentication and create the admin user.

Create `frontend/.env` from `.env.example`:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_COLLECTION_ID=your-collection-id
```

## Run locally

```
cd frontend
npm install
npm run dev
```

Check-ins save automatically as answers are selected. Anyone can submit a
check-in; only authenticated Appwrite users can view or delete records.

## Build and deploy

```
cd frontend
npm run build
```

Deploy `frontend/dist` to a static host and add that host as an Appwrite Web
platform. Keep collection permissions restricted as described above.

## Troubleshooting

- A 401/403 response usually means the Appwrite Web platform or collection
  permissions are missing.
- A failed login means Email/Password authentication is disabled or the user
  does not exist in Appwrite.
- Confirm all four `VITE_APPWRITE_*` values match the Appwrite Console.
